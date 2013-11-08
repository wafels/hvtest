"""ImageRetreivalDaemon"""
# Licensed under MOZILLA PUBLIC LICENSE Version 1.1
# Author: Keith Hughitt <keith.hughitt@nasa.gov>
# Author: Jack Ireland <jack.ireland@nasa.gov>
# pylint: disable=E1121
import sys
import datetime
import time
import logging
import os
import shutil
import sunpy
import Queue
import MySQLdb
from random import shuffle
from helioviewer.jp2 import process_jp2_images, BadImage
from helioviewer.db  import get_db_cursor, mark_as_corrupt
from helioviewer.hvpull.browser.basebrowser import NetworkError
from sunpy.time import parse_time

class ImageRetrievalDaemon:
    """Retrieves images from the server as specified"""
    def __init__(self, servers, browse_method, download_method, conf):
        """Explain."""
        # MySQL/Postgres info
        self.dbname = conf.get('database', 'dbname')
        self.dbuser = conf.get('database', 'user')
        self.dbpass = conf.get('database', 'pass')
        
        self.downloaders = []
        
        try:
            self._db = get_db_cursor(self.dbname, self.dbuser, self.dbpass)
        except MySQLdb.OperationalError:
            logging.error("Unable to access MySQL. Is the database daemon running?")
            self.shutdown()
            self.stop()

        # Email notification
        self.email_server = conf.get('notifications', 'server')
        self.email_from = conf.get('notifications', 'from')
        self.email_to = conf.get('notifications', 'to')
        
        # Warning flags
        self.sent_diskspace_warning = False
        
        # Maximum number of simultaneous downloads
        self.max_downloads = conf.getint('network', 'max_downloads')
        
        # Directories
        self.working_dir = os.path.expanduser(conf.get('directories',
                                                       'working_dir'))
        self.image_archive = os.path.expanduser(conf.get('directories',
                                                         'image_archive'))
        self.incoming = os.path.join(self.working_dir, 'incoming')
        self.quarantine = os.path.join(self.working_dir, 'quarantine')
        
        # Check directory permission
        self._init_directories() 
        
        # Load data server, browser, and downloader
        self.servers = self._load_servers(servers)
        
        self.browsers = []
        self.downloaders = []
        self.queues = []
        
        # For each server instantiate a browser and one or more downloaders
        for server in self.servers:
            self.browsers.append(self._load_browser(browse_method, server))
            queue = Queue.Queue()
            self.queues.append(queue)            
            self.downloaders.append([self._load_downloader(download_method, queue) 
                                     for i in range(self.max_downloads)])

        # Shutdown switch
        self.shutdown_requested = False

    def start(self, starttime=None, endtime=None):
        """Start daemon operation."""
        logging.info("Initializing HVPull")
        
        date_fmt = "%Y-%m-%d %H:%M:%S"
        
        # @TODO: Process urls in batches of ~1-500.. this way images start
        # appearing more quickly when filling in large gaps, etc.
        
        # @TODO: Redo handling of server-specific start time and pause
        # time
        #
        # @TODO: Send email notification when HVpull stops/exits for any reason?
        
        # Determine starttime to use
        if starttime is not None:
            starttime = datetime.datetime.strptime(starttime, date_fmt)
        else:
            starttime = self.servers[0].get_starttime()
            
        # If end time is specified, fill in data from start to end
        if endtime is not None:
            endtime = datetime.datetime.strptime(endtime, date_fmt)
            self.query(starttime, endtime)
            self.sleep()
            
            return None
        else:
        # Otherwise, first query from start -> now
            now = datetime.datetime.utcnow()
            self.query(starttime, now)
            self.sleep()
        
        # Begin main loop
        while not self.shutdown_requested:
            now = datetime.datetime.utcnow()
            starttime = self.servers[0].get_starttime()
            
            # get a list of files available
            self.query(starttime, now)

            self.sleep()
        
        # Shutdown
        self.stop()
        
    def sleep(self):
        """Sleep for some time before checking again for new images"""
        if self.shutdown_requested:
            return

        logging.info("Sleeping for %d minutes." % (self.servers[0].pause.total_seconds() / 60))
        time.sleep(self.servers[0].pause.total_seconds())
        
    def stop(self):
        logging.info("Exiting HVPull")
        sys.exit()
        
    def query(self, starttime, endtime):
        """Query and retrieve data within the specified range.
        
        Checks for data in the specified range and retrieves any new files.
        After execution is completed, the same range is checked again to see
        if any new files have appeared since the first execution. This continues
        until no new files are found (for xxx minutes?)
        """
        urls = []
        
        fmt = '%Y-%m-%d %H:%M:%S'
        
        logging.info("Querying time range %s - %s", starttime.strftime(fmt),
                                                    endtime.strftime(fmt))
        
        for browser in self.browsers:
            matches = self.query_server(browser, starttime, endtime)
            
            if len(matches) > 0:
                urls.append(matches)
        
        # Remove duplicate files, randomizing to spread load across servers
        if len(urls) > 1:
            urls = self._deduplicate(urls)
            
        # Filter out files that are already in the database
        new_urls = []
        
        for url_list in urls:
            filtered = None
            
            while filtered is None:
                try:
                    filtered = filter(self._filter_new, url_list)
                except MySQLdb.OperationalError:
                    # MySQL has gone away -- try again in 5s
                    logging.warning(("Unable to access database to check for file"
                                   " existence. Will try again in 5 seconds."))
                    time.sleep(5)
                    
                    # Try and reconnect
                    
                    # @note: May be a good idea to move the reconnect
                    # functionality to the db module and have it occur
                    # for all queries.
                    try:                        
                        self._db = get_db_cursor(self.dbname, self.dbuser, self.dbpass)
                    except:
                        pass
                
            new_urls.append(filtered)
            
        # check disk space
        if not self.sent_diskspace_warning:
            self._check_free_space()

        # acquire the data files
        self.acquire(new_urls)
    
    def query_server(self, browser, starttime, endtime):
        """Queries a single server for new files"""
        # Get a list of directories which may contain new images
        directories = browser.get_directories(starttime, endtime)

        # Get a sorted list of available JP2 files via browser
        files = []

        # Check each remote directory for new files
        for directory in directories:
            if self.shutdown_requested:
                return []
            
            matches = None
            num_retries = 0
            
            logging.info('(%s) Scanning %s' % (browser.server.name, directory))
            
            # Attempt to read directory contents. Retry up to 10 times
            # if failed and then notify admin
            while matches is None:
                if self.shutdown_requested:
                    return []
            
                try:
                    matches = browser.get_files(directory, "jp2")

                    files.extend(matches)
                except NetworkError:
                    if num_retries >= 100:
                        logging.error("Unable to reach %s. Shutting down HVPull.", 
                                      browser.server.name)
                        msg = "Unable to reach %s. Is the server online?"
                        self.send_email_alert(msg % browser.server.name)
                        self.shutdown()
                    else:
                        msg = "Unable to reach %s. Will try again in 5 seconds."
                        if num_retries > 0:
                            msg += " (retry %d)" % num_retries
                        logging.warning(msg, browser.server.name)
                        time.sleep(5)
                        num_retries += 1
                        
        return files
        
    def acquire(self, urls):
        """Acquires all the available files."""
        # If no new files are available do nothing
        if not urls:
            logging.info("Found no new files.")
            return
        
        n = sum(len(x) for x in urls)
        
        # Keep track of progress
        total = n
        counter = 0
        
        logging.info("Found %d new files", n)
        
        # Download files
        while n > 0:
            finished = []
            
            # Download files 100 at a time to avoid blocking shutdown requests
            # and to allow images to be added to database sooner
            for i, server in enumerate(urls):
                for j in range(100): #pylint: disable=W0612
                    if len(server) > 0:
                        url = server.pop()
                        finished.append(url)
                        
                        counter += 1.
                        
                        self.queues[i].put([self.servers[i].name, 
                                            (counter / total) * 100, url])

                        n -= 1
                
            for q in self.queues:
                q.join()
                
            self.ingest(finished)

            if self.shutdown_requested:
                break
        
    def ingest(self, urls):
        """
        Add images to helioviewer images db.
          (1) Make sure the file exists
          (2) Make sure the file is 'good', and quarantine if it is not.
          (3) Apply the ESA JPIP encoding.
          (4) Ingest
          (5) Update database to say that the file has been successfully 
              'ingested'.
        """
        # Get filepaths
        filepaths = []
        images = []
        corrupt = []
        
        for url in urls:
            path = os.path.join(self.incoming, os.path.basename(url)) # @TODO: Better path computation
            if os.path.isfile(path):
                filepaths.append(path)
            
        # Add to hvpull/Helioviewer.org databases
        for filepath in filepaths:
            filename = os.path.basename(filepath)
            
            # Parse header and validate metadata
            try:
                try:
                    # Read in the full sunpy map, including the image itself.  This is done
                    # since the sunpy map contains the normalizations across multiple
                    # data sources that are required by this download code.  These normalizations
                    # are properties of the main Map object, and are not the Map meta class.
                    # The dictionary image_params is update with the required normalizations
                    # from the Map object.  The code within the enclosing try...except clause
                    # constitutes a translation layer between the SunPy Map object and what
                    # the Helioviewer downloader needs.  As the SunPy Map object changes,
                    # this translation layer may have to change.
                    m = sunpy.Map(filepath)
                    image_params = m.meta
                    # Fix the date in image_params to the normalized one
                    # Since SunPy 0.3, the date is now a unicode string which
                    # requires translating into a normal string
                    image_params['date'] = parse_time(str(m.date))
                    # Add in the nickname
                    image_params['nickname'] = str(m.nickname)
                    # Add in the measurement
                    image_params['measurement'] = str(m.measurement)
                    # Add in the observatory
                    image_params['observatory'] = str(m.observatory)
                except:
                    raise BadImage("HEADER")
                self._validate(image_params)
            except BadImage, e:
                logging.warn("Quarantining invalid image: %s", filename)
                shutil.move(filepath, os.path.join(self.quarantine, filename))
                mark_as_corrupt(self._db, filename, e.get_message())
                corrupt.append(filename)
                continue
            
            # If everything looks good, move to archive and add to database
            date_str = image_params['date'].strftime('%Y/%m/%d')
            
            # Transcode
            try:
                if image_params['instrument'] == "AIA":
                    self._transcode(filepath, cprecincts=[128, 128])
                else:
                    self._transcode(filepath)
            except KduTranscodeError, e:
                logging.warning("kdu_transcode: " + e.get_message())
                continue

            # Move to archive
            directory = os.path.join(self.image_archive, 
                                     image_params['nickname'], date_str, 
                                     str(image_params['measurement']))
            dest = os.path.join(directory, filename)

            image_params['filepath'] = dest

            if not os.path.exists(directory):
                try:
                    os.makedirs(directory)
                except OSError:
                    logging.error("Unable to create the directory '" + 
                                  directory + "'. Please ensure that you "
                                  "have the proper permissions and try again.")
                    self.shutdown_requested = True
                
            try:
                shutil.move(filepath, dest)
            except IOError:
                logging.error("Unable to move files to destination. Is there "
                              "enough free space?")
                self.shutdown_requested = True
                

            # Add to list to send to main database
            images.append(image_params)
            
        # Add valid images to main Database
        if self.shutdown_requested is False:
            process_jp2_images(images, self.image_archive, self._db)
            logging.info("Added %d images to database", len(images))

        if (len(corrupt) > 0):
            logging.info("Marked %d images as corrupt", len(corrupt))
            
    def send_email_alert(self, message):
        """Sends an email notification to the Helioviewer admin(s) when a
        one of the data sources becomes unreachable."""
        # If no server was specified, don't do anything
        if self.email_server is "":
            return

        # import email modules
        import smtplib
        from email.MIMEMultipart import MIMEMultipart
        from email.MIMEText import MIMEText
        from email.Utils import formatdate
        
        msg = MIMEMultipart()
        msg['From'] = self.email_from
        msg['To'] = self.email_to
        msg['Date'] = formatdate()
        msg['Subject'] = "HVPull - Remote Server Inaccessible!"
     
        msg.attach(MIMEText(message))
        
        # Expand email recipient list
        recipients = [x.lstrip().rstrip() for x in self.email_to.split(",")]
     
        smtp = smtplib.SMTP(self.email_server)
        smtp.sendmail(self.email_from, recipients, msg.as_string() )
        smtp.close()        
        

    def shutdown(self):
        print("Stopping HVPull. This may take a few minutes...")
        self.shutdown_requested = True
        
        for server in self.downloaders:
            for downloader in server:
                downloader.stop()
                
    def _transcode(self, filepath, corder='RPCL', orggen_plt='yes', cprecincts=None):
        """Transcodes JPEG 2000 images to allow support for use with JHelioviewer
        and the JPIP server"""
        tmp = filepath + '.tmp.jp2'
        
        # Base command
        
        command ='kdu_transcode -i %s -o %s' % (filepath, tmp)
        
        # Corder
        if corder is not None:
            command += " Corder=%s" % corder
            
        # ORGgen_plt
        if orggen_plt is not None:
            command += " ORGgen_plt=%s" % orggen_plt
            
        # Cprecincts
        if cprecincts is not None:
            command += " Cprecincts=\{%d,%d\}" % (cprecincts[0], cprecincts[1])
            
        # Hide output
        command += " >/dev/null"
        
        # Execute kdu_transcode (retry up to five times)
        num_retries = 0
        
        while not os.path.isfile(tmp) and num_retries <= 5:
            os.system(command)
            num_retries += 1
            
        # If transcode failed, raise an exception
        if not os.path.isfile(tmp):
            raise KduTranscodeError(filepath)
        
        # Remove old version and replace with transcoded one
        # OSError
        os.remove(filepath)
        os.rename(tmp, filepath)
        
    def _check_free_space(self):
        """Checks the amount of free space on the data volume and emails admins
        the first time HVPull detects low disk space"""
        s = os.statvfs(self.image_archive)
        
        # gigabytes available
        gb_avail = (s.f_bsize * s.f_bavail) / 2**30
        
        # if less than 500, alert admins
        if gb_avail < 500:
            msg = "Warning: Running low on disk space! 500 GB remaining"
            self.send_email_alert(msg)
            self.sent_diskspace_warning = True
            
    def _deduplicate(self, urls):
        """When working with multiple files, this function will ensure that
        each file is only downloaded once.
        
        Sorting is preserved and load is distributed evenly across each server.
        """
        # Filenames
        files = [[os.path.basename(url) for url in x] for x in urls]
        
        # Number of servers and total number of remote files matched
        m = len(self.servers)
        n = sum(len(x) for x in files)
        
        # Counters to keep track of sub-list iteration
        counters = [0] * m
        
        # Loop through files, switching between servers on each iteration
        for i in range(n):
            idx = i % m # Server index 
            
            if(len(files[idx]) > counters[idx]):
                value = files[idx][counters[idx]]
                
                # Skip over files that have been set to None
                while value is None:
                    counters[idx] += 1
                    
                    if(len(files[idx]) > counters[idx]):
                        value = files[idx][counters[idx]]
                    else:
                        break

                if value is None:
                    continue
                
                filename = os.path.basename(value)
                
                # Ignore file on other servers if it exists
                for i, file_list in enumerate(files):
                    if i == idx:
                        continue
                    
                    if filename in file_list:
                        j = files[i].index(filename)
                        files[i][j] = None
                        urls[i][j] = None

            counters[idx] += 1
            
        # Remove all entries set to None
        new_list = []
        
        for url_list in urls:
            new_list.append([x for x in url_list if x is not None])
            
        return new_list
    
    def _validate(self, params):
        """Filters out images that are known to have problems using information
        in their metadata"""

        # AIA
        if params['detector'] == "AIA":
            if params['header'].get("IMG_TYPE") == "DARK":
                raise BadImage("DARK")
            if float(params['header'].get('PERCENTD')) < 50:
                raise BadImage("PERCENTD")
            if str(params['header'].get('WAVE_STR')).endswith("_OPEN"):
                raise BadImage("WAVE_STR")
        
        # LASCO
        if params['instrument'] == "LASCO":
            hcomp_sf = params['header'].get('hcomp_sf')
            
            if ((params['detector'] == "C2" and hcomp_sf == 32) or (params['detector'] == "C3" and hcomp_sf == 64)):
                raise BadImage("WrongMask")

    def _init_directories(self):
        """Checks to see if working directories exists and attempts to create
        them if they do not."""
        for d in [self.working_dir, self.image_archive, self.incoming, self.quarantine]:
            if not os.path.exists(d):
                os.makedirs(d)
            elif not (os.path.isdir(d) and os.access(d, os.W_OK)):
                print("Unable to write to specified directories specified in "
                      "settings.cfg.")
                sys.exit()

    def _load_servers(self, names):
        """Loads a data server"""
        servers = []
        
        for name in names:
            server = self._load_class('helioviewer.hvpull.servers', 
                                      name, self.get_servers().get(name))
            servers.append(server())
        
        return servers
            
    def _load_browser(self, browse_method, uri):
        """Loads a data browser"""
        cls = self._load_class('helioviewer.hvpull.browser', browse_method, 
                               self.get_browsers().get(browse_method))
        return cls(uri)
    
    def _load_downloader(self, download_method, queue):
        """Loads a data downloader"""
        cls = self._load_class('helioviewer.hvpull.downloader', download_method, 
                               self.get_downloaders().get(download_method))
        downloader = cls(self.incoming, queue)
        
        downloader.setDaemon(True)
        downloader.start()

        return downloader
    
    def _load_class(self, base_package, packagename, classname):
        """Dynamically loads a class given a set of strings indicating its 
        location"""
        # Import module
        modname = "%s.%s" % (base_package, packagename)
        __import__(modname)
    
        # Instantiate class and return
        return getattr(sys.modules[modname], classname)
    
    def _filter_new(self, url):
        """For a given list of remote files determines which ones have not
        yet been acquired."""
        filename = os.path.basename(url)
        
        # Check to see if image is in images
        self._db.execute("SELECT COUNT(*) FROM images WHERE filename='%s'" % 
                         filename)
        if self._db.fetchone()[0] != 0:
            return False
        
        # Check to see if image is in corrupt
        #print('Remove comments characters to reactivate the code beneath when in production!!!')
        self._db.execute("SELECT COUNT(*) FROM corrupt WHERE filename='%s'" % 
                 filename)
        if self._db.fetchone()[0] != 0:
            return False

        return True
    
    @classmethod
    def get_servers(cls):
        """Returns a list of valid servers to interact with"""
        return {
            "lmsal": "LMSALDataServer",
            "soho": "SOHODataServer",
            "stereo": "STEREODataServer",
            "jsoc": "JSOCDataServer",
            "rob": "ROBDataServer",
            "uio": "UIODataServer",
            "trace": "TRACEDataServer"
        }
        
    @classmethod
    def get_browsers(cls):
        """Returns a list of valid data browsers to interact with"""
        return {
        "httpbrowser": "HTTPDataBrowser",
        "localbrowser": "LocalDataBrowser"
        }

    @classmethod
    def get_downloaders(cls):
        """Returns a list of valid data downloaders to interact with"""
        return {
            "urllib": "URLLibDownloader",
            "localmove": "LocalFileMove"
        }

class KduTranscodeError(RuntimeError):
    """Exception to raise an image cannot be transcoded."""
    def __init__(self, message=""):
        self.message = message
    def get_message(self):
        return self.message
        
