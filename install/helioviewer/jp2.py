# -*- coding: utf-8 -*-
"""Helioviewer.org JPEG 2000 processing functions"""
import os
from datetime import datetime
from xml.dom.minidom import parseString
from helioviewer.db import get_datasources, enable_datasource

__INSERTS_PER_QUERY__ = 500
__STEP_FXN_THROTTLE__ = 50

def find_images(path):
    '''Searches a directory for JPEG 2000 images.
    
    Traverses file-tree starting with the specified path and builds a list of
    the available images.
    '''
    images = []
    
    for root, dirs, files in os.walk(path):
        for file_ in files:
            if file_.endswith('.jp2'):
                images.append(os.path.join(root, file_))

    return images

def parse_header(img):
    '''Gets required information from an image's header tags.
    
     Extracts useful meta-information from a given JP2 image and returns a
     dictionary of that information.
    '''

    # Get XMLBox as DOM
    try:
        dom = parseString(read_xmlbox(img, "meta"))
        fits = dom.getElementsByTagName("fits")[0]
    except Exception as e:
        print("Error retrieving JP2 XML Box.")
        raise e
        
    # Detect image type and fetch require meta information
    telescop = get_element_value(fits, "TELESCOP")
    detector = get_element_value(fits, "DETECTOR")
    instrume = get_element_value(fits, "INSTRUME")
    
    if instrume and instrume.startswith('AIA'):
        datatype = "aia"
    elif instrume and instrume.startswith('HMI'):
        datatype = "hmi"
    elif detector == 'EUVI':
        datatype = "euvi"
    elif detector and detector.startswith("COR"):
        datatype = "cor"
    elif instrume == 'EIT':
        datatype = "eit"
    elif instrume == 'LASCO':
        datatype = "lasco"
    elif instrume == 'MDI':
        datatype = "mdi"
    elif instrume == 'SWAP':
        datatype = "swap"
        
    try:
        info = _get_header_tags(fits, datatype)
    except Exception as e:
        print("Error parsing JP2 header")
        raise e 

    return info

def _get_header_tags(fits, type_):
    """Returns a normalized dictionary of header values
    
    A normalized mapping of important header values is created and returned.
    Not all of the header values are used, but instead only those that are
    required for the Map class to function are included. Note that some values
    may be cast to new types in the process.
    
    Parameters
    ----------
    fits : dict
        A dictionary container the header keywords from the file being read in
    type_ : str
        A short string describing the type of data being mapped
    
    Returns
    -------
    out : dict
        A new mapped dictionary of useful header values
    """
    date_fmt1 = "%Y-%m-%dT%H:%M:%S.%f"
    date_fmt2 = "%Y/%m/%dT%H:%M:%S.%f"
    date_fmt3 = "%Y-%m-%dT%H:%M:%S.%fZ"
    
    
    if type_ == "aia":
        # Note: Trailing "Z" in date was dropped on 2010/12/07 
        return {
            "date": datetime.strptime(
                get_element_value(fits, "DATE-OBS")[0:22], date_fmt1),
            "detector": "AIA",
            "instrument": "AIA",
            "measurement": get_element_value(fits, "WAVELNTH"),
            "observatory": "SDO"
        }
    elif type_ == "hmi":
        # Note: Trailing "Z" in date was dropped on 2010/12/07
        meas = get_element_value(fits, "CONTENT").split(" ")[0].lower()
        return {
            "date": datetime.strptime(
                get_element_value(fits, "DATE_OBS")[0:22], date_fmt1),
            "detector": "HMI",
            "instrument": "HMI",
            "measurement": meas,
            "observatory": "SDO"
        }
    elif type_ == "euvi":
        return {
            "date": datetime.strptime(
                get_element_value(fits, "DATE_OBS"), date_fmt1),
            "detector": "EUVI",
            "instrument": "SECCHI",
            "measurement": get_element_value(fits, "WAVELNTH"),
            "observatory": get_element_value(fits, "OBSRVTRY")
        }
    elif type_ == "cor":
        return {
            "date": datetime.strptime(
                get_element_value(fits, "DATE_OBS"), date_fmt1),
            "detector": get_element_value(fits, "DETECTOR"),
            "instrument": "SECCHI",
            "measurement": "white-light",
            "observatory": get_element_value(fits, "OBSRVTRY")
        }
    elif type_ == "eit":
        return {
            "date": datetime.strptime(
                get_element_value(fits, "DATE_OBS"), date_fmt3),
            "detector": "EIT",
            "instrument": "EIT",
            "measurement": get_element_value(fits, "WAVELNTH"),
            "observatory": "SOHO"
        }
    elif type_ == "lasco":
        datestr = "%sT%s" % (get_element_value(fits, "DATE_OBS"), get_element_value(fits, "TIME_OBS"))
        return {
            "date": datetime.strptime(datestr, date_fmt2),
            "detector": get_element_value(fits, "DETECTOR"),
            "instrument": "LASCO",
            "measurement": "white-light",
            "observatory": "SOHO"
        }
    elif type_ == "mdi":
        datestr = get_element_value(fits, "DATE_OBS")
            
        # MDI sometimes has an "60" in seconds field
        if datestr[17:19] == "60":
            datestr = datestr[:17] + "30" + datestr[19:]
        
        # Measurement
        dpcobsr = get_element_value(fits, "DPC_OBSR")
        meas = "magnetogram" if dpcobsr.find('Mag') != -1 else "continuum"
        
        return {
            "date": datetime.strptime(datestr, date_fmt3),
            "detector": "MDI",
            "instrument": "MDI",
            "measurement": meas,
            "observatory": "SOHO"
        }
    elif type_ == "swap":
        return {
            "date": datetime.strptime(
                get_element_value(fits, "DATE-OBS"), date_fmt1),
            "detector": "SWAP",
            "instrument": "SWAP",
            "measurement": get_element_value(fits, "WAVELNTH"),
            "observatory": "PROBA2"
        }

def get_element_value(dom, name):
    '''Gets the value for the specified dom-node if it exists.
    
    Retrieves the value of a unique dom-node element or returns false if element
    is not found/ more than one.
    '''
    element = dom.getElementsByTagName(name)

    if element:
        return element[0].childNodes[0].nodeValue
    else:
        return None

def read_xmlbox(file, root):
    '''Extracts the XML box from a JPEG 2000 image.
    
    Given a filename and the name of the root node, extracts the XML header box
    from a JP2 image.
    '''
    fp = open(file, 'rb')

    xml = ""
    for line in fp:
         xml += line
         if line.find("</%s>" % root) != -1:
                 break
             
    start = xml.find("<%s>" % root)
    end = xml.find("</%s>" % root) + len("</%s>" % root)
    
    xml = xml[start : end]
    
    fp.close()

    # 2010/04/12 TEMP Work-around for AIA invalid XML
    return xml.replace("&", "&amp;")

def process_jp2_images (images, rootdir, cursor, mysql, step_function=None):
    '''Processes a collection of JPEG 2000 Images'''
    
    if mysql:
        import MySQLdb
    else:
        import pgdb

    remainder = len(images) % __INSERTS_PER_QUERY__

    # Return tree of known data-sources
    sources = get_datasources(cursor)
    
    # Insert images into database, 500 at a time
    if len(images) >= __INSERTS_PER_QUERY__:
        for x in range(len(images) // __INSERTS_PER_QUERY__):
            insert_n_images(images, __INSERTS_PER_QUERY__, sources,
                          rootdir, cursor, mysql, step_function)
            
    # Update tree of known data-sources
    sources = get_datasources(cursor)
            
    # Process remaining images
    insert_n_images(images, remainder, sources, rootdir, cursor, mysql, step_function)

    
def insert_n_images(images, n, sources, rootdir, cursor, mysql, step_function=None):
    """Inserts multiple images into a database using a single query"""
    
    # 2011/06/27
    # Using IGNORE to avoid accidentally adding the same image twice:
    # There is currently an issue with the hv_fetch code which results in
    # some images being processed multiple times.
    query = "INSERT IGNORE INTO images VALUES "
    
    error = ""
    
    for y in range(n):
        # Grab next image
        img = images.pop()
    
        print("Processing image: " + img)
        
        directory, filename = os.path.split(img)

        path = "/" + os.path.relpath(directory, rootdir)
        
        # Extract header meta information
        try:
            m = parse_header(img)
        except Exception as e:
            print("Error processing %s" % filename)
            error += "Unable to process header for %s (%s)\n" % (filename, e)
        else:
            # Data Source
            source = sources[m["observatory"]][m["instrument"]][m["detector"]][m["measurement"]]
            
            # Enable datasource if it has not already been
            if (not source['enabled']):
                sources[m["observatory"]][m["instrument"]][m["detector"]][m["measurement"]]["enabled"] = True
                enable_datasource(cursor, source['id'])
        
            # Date
            date = m["date"]
    
            # insert into database
            query += "(NULL, '%s', '%s', '%s', %d)," % (path, filename, date, source['id'])
        
            # Progressbar
            if step_function and (y + 1) % __STEP_FXN_THROTTLE__ is 0:
                step_function(filename)
                
    # Log any errors encountered
    if error:
        import time
        f = open('error.log', 'a')
        f.write(time.strftime("%a, %d %b %Y %H:%M:%S", time.localtime()) + "\n" + error)
    
    # Remove trailing comma
    query = query[:-1] + ";"
    
    #print query
        
    # Execute query
    try:
        cursor.execute(query)
    
    except Exception as e:
        print("Error: " + e.args[1])
    
