# -*- coding: utf-8 -*-
"""Helioviewer.org installer database functions"""
import sys
import os

def setup_database_schema(adminuser, adminpass, dbname, dbuser, dbpass, mysql):
    """Sets up Helioviewer.org database schema"""
    if mysql:
        import MySQLdb
        adaptor = MySQLdb
    else:
        import pgdb
        adaptor = pgdb

    create_db(adminuser, adminpass, dbname, dbuser, dbpass, mysql, adaptor)

    # connect to helioviewer database
    cursor = get_db_cursor(dbname, dbuser, dbpass, mysql)

    create_datasource_table(cursor)
    create_observatory_table(cursor)
    create_instrument_table(cursor)
    create_detector_table(cursor)
    create_measurement_table(cursor)
    create_image_table(cursor)
    create_screenshots_table(cursor)
    create_movies_table(cursor)
    create_movie_formats_table(cursor)
    create_youtube_table(cursor)
    create_statistics_table(cursor)
    update_image_table_index(cursor)

    return cursor

def get_db_cursor(dbname, dbuser, dbpass, mysql=True):
    """Creates a database connection"""
    if mysql:
        import MySQLdb
    else:
        import pgdb
    
    if mysql:
        db = MySQLdb.connect(use_unicode=True, charset = "utf8", 
                             host="localhost", db=dbname, user=dbuser, 
                             passwd=dbpass)
    else:
        db = pgdb.connect(use_unicode=True, charset = "utf8", database=dbname, 
                          user=dbuser, password=dbpass)
    
    db.autocommit(True)
    return db.cursor()

def check_db_info(adminuser, adminpass, mysql):
    """Validate database login information"""
    try:
        if mysql:
            try:
                import MySQLdb
            except ImportError as e:
                print(e)
                return False
            db = MySQLdb.connect(user=adminuser, passwd=adminpass)
        else:
            import pgdb
            db = pgdb.connect(database="postgres", user=adminuser, 
                              password=adminpass)
    except MySQLdb.Error as e:
        print(e)
        return False

    db.close()
    return True

def create_db(adminuser, adminpass, dbname, dbuser, dbpass, mysql, adaptor):
    """Creates Helioviewer database
    
    TODO (2009/08/18) Catch error when db already exists and gracefully exit
    """
    
    create_str = "CREATE DATABASE IF NOT EXISTS %s;" % dbname
    grant_str = "GRANT ALL ON %s.* TO '%s'@'localhost' IDENTIFIED BY '%s';" % (
                dbname, dbuser, dbpass)
    
    if mysql:
        try:
           db = adaptor.connect(user=adminuser, passwd=adminpass)
           cursor = db.cursor()
           cursor.execute(create_str)
           cursor.execute(grant_str)
        except adaptor.Error as e:
            print("Error: " + e.args[1])
            sys.exit(2)
    else:
        try:
            db = adaptor.connect(database="postgres", user=adminuser, 
                                 password=adminpass)
            cursor = db.cursor()
            cursor.execute(create_str)
            cursor.execute(grant_str)
        except Exception as e:
            print("Error: " + e.args[1])
            sys.exit(2)

    cursor.close()

def create_image_table(cursor):
    """Creates table to store image information"""
    sql = \
    """CREATE TABLE `images` (
      `id`            INT unsigned NOT NULL auto_increment,
      `filepath`      VARCHAR(255) NOT NULL,
      `filename`      VARCHAR(255) NOT NULL,
      `date`          datetime NOT NULL,
      `sourceId`    SMALLINT unsigned NOT NULL,
      PRIMARY KEY  (`id`),
      KEY `date_index` (`sourceId`,`date`) USING BTREE,
      UNIQUE INDEX filename_idx(filename)
    ) DEFAULT CHARSET=ascii;"""
    cursor.execute(sql)
    
def create_corrupt_table(cursor):
    """Creates table to store corrupt image information"""
    sql = \
    """CREATE TABLE `corrupt` (
      `id`            INT unsigned NOT NULL auto_increment,
      `timestamp`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `filename`      VARCHAR(255) NOT NULL,      
      `note`        VARCHAR(255) DEFAULT '',
      PRIMARY KEY  (`id`),
      KEY `timestamp_index` (`filename`,`timestamp`) USING BTREE,
      UNIQUE INDEX filename_idx(filename)
    ) DEFAULT CHARSET=ascii;"""
    cursor.execute(sql)

def create_datasource_table(cursor):
    """Creates a table with the known datasources"""
    cursor.execute(
    """CREATE TABLE `datasources` (
        `id`            SMALLINT unsigned NOT NULL,
        `name`          VARCHAR(127) NOT NULL,
        `description`   VARCHAR(255),
        `observatoryId` SMALLINT UNSIGNED NOT NULL,
        `instrumentId`  SMALLINT UNSIGNED NOT NULL,
        `detectorId`    SMALLINT UNSIGNED NOT NULL,
        `measurementId` SMALLINT UNSIGNED NOT NULL,
        `layeringOrder` TINYINT UNSIGNED NOT NULL,
        `enabled`       TINYINT(1) UNSIGNED NOT NULL,
      PRIMARY KEY  (`id`)
    ) DEFAULT CHARSET=utf8;""")

    cursor.execute("""
    INSERT INTO `datasources` VALUES
        (0, 'EIT 171', 'SOHO EIT 171', 0, 0, 0, 2, 1, 0),
        (1, 'EIT 195', 'SOHO EIT 195', 0, 0, 0, 4, 1, 0),
        (2, 'EIT 284', 'SOHO EIT 284', 0, 0, 0, 6, 1, 0),
        (3, 'EIT 304', 'SOHO EIT 304', 0, 0, 0, 7, 1, 0),
        (4, 'LASCO C2', 'SOHO LASCO C2', 0, 1, 1, 14, 2, 0),
        (5, 'LASCO C3', 'SOHO LASCO C3', 0, 1, 2, 14, 3, 0),
        (6, 'MDI Mag', 'SOHO MDI Mag', 0, 2, 3, 13, 1, 0),
        (7, 'MDI Int', 'SOHO MDI Int', 0, 2, 3, 12, 1, 0),
        (8, 'AIA 94', 'SDO AIA 94',  2, 4, 5, 0, 1, 0),
        (9, 'AIA 131', 'SDO AIA 131',  2, 4, 5, 1, 1, 0),
        (10, 'AIA 171', 'SDO AIA 171',  2, 4, 5, 2, 1, 0),
        (11, 'AIA 193', 'SDO AIA 193',  2, 4, 5, 3, 1, 0),
        (12, 'AIA 211', 'SDO AIA 211',  2, 4, 5, 5, 1, 0),
        (13, 'AIA 304', 'SDO AIA 304',  2, 4, 5, 7, 1, 0),        
        (14, 'AIA 335', 'SDO AIA 335',  2, 4, 5, 8, 1, 0),
        (15, 'AIA 1600', 'SDO AIA 1600',  2, 4, 5, 9, 1, 0),
        (16, 'AIA 1700', 'SDO AIA 1700',  2, 4, 5, 10, 1, 0),
        (17, 'AIA 4500', 'SDO AIA 4500',  2, 4, 5, 11, 1, 0),
        (18, 'HMI Int', 'SDO HMI Int', 2, 5, 6, 12, 1, 0),
        (19, 'HMI Mag', 'SDO HMI Mag', 2, 5, 6, 13, 1, 0),
        (20, 'EUVI-A 171', 'STEREO A EUVI 171', 3, 6, 7, 2, 1, 0),
        (21, 'EUVI-A 195', 'STEREO A EUVI 195', 3, 6, 7, 4, 1, 0),
        (22, 'EUVI-A 284', 'STEREO A EUVI 284', 3, 6, 7, 6, 1, 0),
        (23, 'EUVI-A 304', 'STEREO A EUVI 304', 3, 6, 7, 7, 1, 0),
        (24, 'EUVI-B 171', 'STEREO B EUVI 171', 4, 6, 7, 2, 1, 0),
        (25, 'EUVI-B 195', 'STEREO B EUVI 195', 4, 6, 7, 4, 1, 0),
        (26, 'EUVI-B 284', 'STEREO B EUVI 284', 4, 6, 7, 6, 1, 0),
        (27, 'EUVI-B 304', 'STEREO B EUVI 304', 4, 6, 7, 7, 1, 0),
        (28, 'COR1-A', 'STEREO A COR1', 3, 6, 8, 14, 2, 0),
        (29, 'COR2-A', 'STEREO A COR2', 3, 6, 9, 14, 3, 0),
        (30, 'COR1-B', 'STEREO B COR1', 4, 6, 8, 14, 2, 0),
        (31, 'COR2-B', 'STEREO B COR2', 4, 6, 9, 14, 3, 0),
        (32, 'SWAP 174', 'PROBA-2 SWAP 174', 5, 7, 10, 15, 1, 0),
        (33, 'SXT AlMg', 'Yohkoh SXT AlMg', 6, 8, 11, 16, 1, 1),
        (34, 'SXT Al.1', 'Yohkoh SXT Al.1', 6, 8, 11, 17, 1, 1),
        (35, 'SXT Open', 'Yohkoh SXT Open', 6, 8, 11, 18, 1, 1),
        (36, 'XRT Al_med-Open', 'Hinode XRT Al_med-Open', 7, 9, 12, 19, 1, 1),
        (37, 'XRT Al_med-Al_mesh', 'Hinode XRT Al_med-Al_mesh', 7, 9, 12, 20, 1, 1),
        (38, 'XRT Al_med-Al_thick', 'Hinode XRT Al_med-Al_thick', 7, 9, 12, 21, 1, 1),
        (39, 'XRT Al_med-Be_thick', 'Hinode XRT Al_med-Be_thick', 7, 9, 12, 22, 1, 1),
        (40, 'XRT Al_med-Gband', 'Hinode XRT Al_med-Gband', 7, 9, 12, 23, 1, 1),
        (41, 'XRT Al_med-Ti_poly', 'Hinode XRT Al_med-Ti_poly', 7, 9, 12, 24, 1, 1),
        (42, 'XRT Al_poly-Open', 'Hinode XRT Al_poly-Open', 7, 9, 12, 25, 1, 1),
        (43, 'XRT Al_poly-Al_mesh', 'Hinode XRT Al_poly-Al_mesh', 7, 9, 12, 26, 1, 1),
        (44, 'XRT Al_poly-Al_thick', 'Hinode XRT Al_poly-Al_thick', 7, 9, 12, 27, 1, 1),
        (45, 'XRT Al_poly-Be_thick', 'Hinode XRT Al_poly-Be_thick', 7, 9, 12, 28, 1, 1),
        (46, 'XRT Al_poly-Gband', 'Hinode XRT Al_poly-Gband', 7, 9, 12, 29, 1, 1),
        (47, 'XRT Al_poly-Ti_poly', 'Hinode XRT Al_poly-Ti_poly', 7, 9, 12, 30, 1, 1),
        (48, 'XRT Be_med-Open', 'Hinode XRT Be_med-Open', 7, 9, 12, 31, 1, 1),
        (49, 'XRT Be_med-Al_mesh', 'Hinode XRT Be_med-Al_mesh', 7, 9, 12, 32, 1, 1),
        (50, 'XRT Be_med-Al_thick', 'Hinode XRT Be_med-Al_thick', 7, 9, 12, 33, 1, 1),
        (51, 'XRT Be_med-Be_thick', 'Hinode XRT Be_med-Be_thick', 7, 9, 12, 34, 1, 1),
        (52, 'XRT Be_med-Gband', 'Hinode XRT Be_med-Gband', 7, 9, 12, 35, 1, 1),
        (53, 'XRT Be_med-Ti_poly', 'Hinode XRT Be_med-Ti_poly', 7, 9, 12, 36, 1, 1),
        (54, 'XRT Be_thin-Open', 'Hinode XRT Be_thin-Open', 7, 9, 12, 37, 1, 1),
        (55, 'XRT Be_thin-Al_mesh', 'Hinode XRT Be_thin-Al_mesh', 7, 9, 12, 38, 1, 1),
        (56, 'XRT Be_thin-Al_thick', 'Hinode XRT Be_thin-Al_thick', 7, 9, 12, 39, 1, 1),
        (57, 'XRT Be_thin-Be_thick', 'Hinode XRT Be_thin-Be_thick', 7, 9, 12, 40, 1, 1),
        (58, 'XRT Be_thin-Gband', 'Hinode XRT Be_thin-Gband', 7, 9, 12, 41, 1, 1),
        (59, 'XRT Be_thin-Ti_poly', 'Hinode XRT Be_thin-Ti_poly', 7, 9, 12, 42, 1, 1),
        (60, 'XRT C_poly-Open', 'Hinode XRT C_poly-Open', 7, 9, 12, 43, 1, 1),
        (61, 'XRT C_poly-Al_mesh', 'Hinode XRT C_poly-Al_mesh', 7, 9, 12, 44, 1, 1),
        (62, 'XRT C_poly-Al_thick', 'Hinode XRT C_poly-Al_thick', 7, 9, 12, 45, 1, 1),
        (63, 'XRT C_poly-Be_thick', 'Hinode XRT C_poly-Be_thick', 7, 9, 12, 46, 1, 1),
        (64, 'XRT C_poly-Gband', 'Hinode XRT C_poly-Gband', 7, 9, 12, 47, 1, 1),
        (65, 'XRT C_poly-Ti_poly', 'Hinode XRT C_poly-Ti_poly', 7, 9, 12, 48, 1, 1),
        (66, 'XRT Open-Open', 'Hinode XRT Open-Open', 7, 9, 12, 49, 1, 1),
        (67, 'XRT Open-Al_mesh', 'Hinode XRT Open-Al_mesh', 7, 9, 12, 50, 1, 1),
        (68, 'XRT Open-Al_thick', 'Hinode XRT Open-Al_thick', 7, 9, 12, 51, 1, 1),
        (69, 'XRT Open-Be_thick', 'Hinode XRT Open-Be_thick', 7, 9, 12, 52, 1, 1),
        (70, 'XRT Open-Gband', 'Hinode XRT Open-Gband', 7, 9, 12, 53, 1, 1),
        (71, 'XRT Open-Ti_poly', 'Hinode XRT Open-Ti_poly', 7, 9, 12, 54, 1, 1);
    """)

def create_observatory_table(cursor):
    """Creates table to store observatory information"""

    cursor.execute("""
    CREATE TABLE `observatories` (
      `id`          SMALLINT unsigned NOT NULL,
      `name`        VARCHAR(255) NOT NULL,
      `description` VARCHAR(255) NOT NULL,
       PRIMARY KEY (`id`)
    ) DEFAULT CHARSET=utf8;""")

    cursor.execute("""
    INSERT INTO `observatories` VALUES
        (0, 'SOHO', 'Solar and Heliospheric Observatory'),
        (1, 'TRACE', 'The Transition Region and Coronal Explorer'),
        (2, 'SDO', 'Solar Dynamics Observatory'),
        (3, 'STEREO_A', 'Solar Terrestrial Relations Observatory Ahead'),
        (4, 'STEREO_B', 'Solar Terrestrial Relations Observatory Behind'),
        (5, 'PROBA2', 'Project for OnBoard Autonomy 2'),
        (6, 'Yohkoh', 'Yohkoh (Solar-A)'),
        (7, 'Hinode', 'Hinode (Solar-B)');
    """)

def create_instrument_table(cursor):
    """Creates table to store instrument information"""

    cursor.execute("""
    CREATE TABLE `instruments` (
      `id`          SMALLINT unsigned NOT NULL,
      `name`        VARCHAR(255) NOT NULL,
      `description` VARCHAR(255) NOT NULL,
       PRIMARY KEY (`id`)
    ) DEFAULT CHARSET=utf8;""")

    cursor.execute("""
    INSERT INTO `instruments` VALUES
        (0, 'EIT',    'Extreme ultraviolet Imaging Telescope'),
        (1, 'LASCO',  'The Large Angle Spectrometric Coronagraph'),
        (2, 'MDI',    'Michelson Doppler Imager'),
        (3, 'TRACE',  'The Transition Region and Coronal Explorer'),
        (4, 'AIA',    'Atmospheric Imaging Assembly'),
        (5, 'HMI',    'Helioseismic and Magnetic Imager'),
        (6, 'SECCHI', 'Sun Earth Connection Coronal and Heliospheric Investigation'),
        (7, 'SWAP',   'Sun watcher using APS detectors and image processing'),
        (8, 'SXT',    'Soft X-ray Telescope'),
        (9, 'XRT',    'X-Ray Telescope');
    """)



def create_detector_table(cursor):
    """ Creates table to store detector information """

    cursor.execute("""
    CREATE TABLE `detectors` (
      `id`          SMALLINT unsigned NOT NULL,
      `name`        VARCHAR(255) NOT NULL,
      `description` VARCHAR(255) NOT NULL,
       PRIMARY KEY (`id`)
    ) DEFAULT CHARSET=utf8;""")

    cursor.execute("""
    INSERT INTO `detectors` VALUES
        (0,  'EIT',   'Extreme ultraviolet Imaging Telescope'),
        (1,  'C2',    'Coronograph 2'),
        (2,  'C3',    'Coronograph 3'),
        (3,  'MDI',   'Michelson Doppler Imager'),
        (4,  'TRACE', 'The Transition Region and Coronal Explorer'),
        (5,  'AIA',   'Atmospheric Imaging Assembly'),
        (6,  'HMI',   'Helioseismic and Magnetic Imager'),
        (7,  'EUVI',  'Extreme Ultraviolet Imager'),
        (8,  'COR1',  'Coronograph 1'),
        (9,  'COR2',  'Coronograph 2'),
        (10, 'SWAP',  'Sun watcher using APS detectors and image processing'),
        (11, 'SXT',   'Soft X-ray Telescope'),
        (12, 'XRT',   'X-Ray Telescope');
    """)


def create_measurement_table(cursor):
    """Creates table to store measurement information"""

    cursor.execute("""
    CREATE TABLE `measurements` (
      `id`          SMALLINT unsigned NOT NULL,
      `name`        VARCHAR(255) NOT NULL,
      `description` VARCHAR(255) NOT NULL,
      `units`       VARCHAR(20)  NOT NULL,
       PRIMARY KEY (`id`)
    ) DEFAULT CHARSET=utf8;""")

    # 2011/05/03: changed from u""" string for Python 3 compatability
    cursor.execute("""
    INSERT INTO `measurements` VALUES
        (0, '94', '94 Ångström extreme ultraviolet', 'Å'),
        (1, '131', '131 Ångström extreme ultraviolet', 'Å'),
        (2, '171', '171 Ångström extreme ultraviolet', 'Å'),
        (3, '193', '193 Ångström extreme ultraviolet', 'Å'),
        (4, '195', '195 Ångström extreme ultraviolet', 'Å'),
        (5, '211', '211 Ångström extreme ultraviolet', 'Å'),        
        (6, '284', '284 Ångström extreme ultraviolet', 'Å'),
        (7, '304', '304 Ångström extreme ultraviolet', 'Å'),
        (8, '335', '335 Ångström extreme ultraviolet', 'Å'),
        (9, '1600', '1600 Ångström extreme ultraviolet', 'Å'),
        (10, '1700', '1700 Ångström extreme ultraviolet', 'Å'),
        (11, '4500', '4500 Ångström extreme ultraviolet', 'Å'),
        (12, 'continuum', 'Intensitygram', 'DN'),
        (13, 'magnetogram', 'Magnetogram', 'Mx'),
        (14, 'white-light', 'White Light', 'DN'),
        (15, '174', '174 Ångström extreme ultraviolet', 'Å'),
        (16, 'AlMg', 'Al/Mg/Mn filter (2.4 Å - 32 Å pass band)', 'Å'),
        (17, 'Al.1', '11.6 μm Al filter (2.4 Å - 13 Å pass band)', 'Å'),
        (18, 'Open', 'No filter', ''),
        (19, 'Al_med-Open', '', ''),
        (20, 'Al_med-Al_mesh', '', ''),
        (21, 'Al_med-Al_thick', '', ''),
        (22, 'Al_med-Be_thick', '', ''),
        (23, 'Al_med-Gband', '', ''),
        (24, 'Al_med-Ti_poly', '', ''),
        (25, 'Al_poly-Open', '', ''),
        (26, 'Al_poly-Al_mesh', '', ''),
        (27, 'Al_poly-Al_thick', '', ''),
        (28, 'Al_poly-Be_thick', '', ''),
        (29, 'Al_poly-Gband', '', ''),
        (30, 'Al_poly-Ti_poly', '', ''),
        (31, 'Be_med-Open', '', ''),
        (32, 'Be_med-Al_mesh', '', ''),
        (33, 'Be_med-Al_thick', '', ''),
        (34, 'Be_med-Be_thick', '', ''),
        (35, 'Be_med-Gband', '', ''),
        (36, 'Be_med-Ti_poly', '', ''),
        (37, 'Be_thin-Open', '', ''),
        (38, 'Be_thin-Al_mesh', '', ''),
        (39, 'Be_thin-Al_thick', '', ''),
        (40, 'Be_thin-Be_thick', '', ''),
        (41, 'Be_thin-Gband', '', ''),
        (42, 'Be_thin-Ti_poly', '', ''),
        (43, 'C_poly-Open', '', ''),
        (44, 'C_poly-Al_mesh', '', ''),
        (45, 'C_poly-Al_thick', '', ''),
        (46, 'C_poly-Be_thick', '', ''),
        (47, 'C_poly-Gband', '', ''),
        (48, 'C_poly-Ti_poly', '', ''),
        (49, 'Open-Open', '', ''),
        (50, 'Open-Al_mesh', '', ''),
        (51, 'Open-Al_thick', '', ''),
        (52, 'Open-Be_thick', '', ''),
        (53, 'Open-Gband', '', ''),
        (54, 'Open-Ti_poly', '', '');""")
    
def create_movies_table(cursor):
    """Creates movie table
    
    Creates a simple table for storing information about movies built on
    Helioviewer.org.
    
    Note: Region of interest coordinates are stored in arc-seconds even though
    request is done in pixels in order to make it easier to find screenshots
    with similar ROIs regardless of scale.
    """
    cursor.execute("""
    CREATE TABLE `movies` (
      `id`                INT unsigned NOT NULL auto_increment,
      `timestamp`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
      `reqStartDate`      datetime NOT NULL,
      `reqEndDate`        datetime NOT NULL,
      `imageScale`        FLOAT NOT NULL,
      `regionOfInterest`  POLYGON NOT NULL,
      `maxFrames`         SMALLINT NOT NULL,
      `watermark`         TINYINT(1) UNSIGNED NOT NULL,
      `dataSourceString`  VARCHAR(255) NOT NULL,
      `dataSourceBitMask` BIGINT UNSIGNED,
      `eventSourceString` VARCHAR(1024) DEFAULT NULL,
      `eventsLabels`      TINYINT(1) UNSIGNED NOT NULL,
      `earthScale`        TINYINT(1) UNSIGNED NOT NULL,
      `numLayers`         TINYINT UNSIGNED,
      `queueNum`          SMALLINT UNSIGNED,
      `frameRate`         FLOAT UNSIGNED,
      `movieLength`       FLOAT UNSIGNED,
      `startDate`         datetime,
      `endDate`           datetime,
      `numFrames`         SMALLINT UNSIGNED,
      `width`             SMALLINT UNSIGNED,
      `height`            SMALLINT UNSIGNED,
      `buildTimeStart`    TIMESTAMP,
      `buildTimeEnd`      TIMESTAMP,
       PRIMARY KEY (`id`)
    ) DEFAULT CHARSET=utf8;""")
    
def create_movie_formats_table(cursor):
    """Creates movie formats table
    
    Creates a table to keep track of the processing status for each format 
    (mp4, web, etc) movie that needsto be created for a given movie request.
    """
    cursor.execute("""
    CREATE TABLE `movieFormats` (
      `id`                INT unsigned NOT NULL auto_increment,
      `movieId`           INT unsigned NOT NULL,
      `format`            VARCHAR(255) NOT NULL,
      `status`            VARCHAR(255) NOT NULL,
      `procTime`          SMALLINT UNSIGNED,
       PRIMARY KEY (`id`)
    ) DEFAULT CHARSET=utf8;""")
    
def create_youtube_table(cursor):
    """Creates a table to track shared movie uploads.
    
    Creates table to keep track of movies that have been uploaded to YouTube 
    and shared with other Helioviewer users.
    """
    cursor.execute("""
    CREATE TABLE `youtube` (
      `id`          INT unsigned NOT NULL auto_increment,
      `movieId`     INT unsigned NOT NULL,
      `youtubeId`   VARCHAR(16),
      `timestamp`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `title`       VARCHAR(100) NOT NULL,
      `description` VARCHAR(5000) NOT NULL,
      `keywords`    VARCHAR(500) NOT NULL,
      `shared`      TINYINT(1) UNSIGNED NOT NULL,
       PRIMARY KEY (`id`),
       UNIQUE INDEX movieid_idx(movieId)
    ) DEFAULT CHARSET=utf8;""")
    
def create_screenshots_table(cursor):
    """Creates screenshot table
    
    Creates a simple table for storing information about screenshots built on
    Helioviewer.org 
    
    Note: Region of interest coordinates are stored in arc-seconds even though
    request is done in pixels in order to make it easier to find screenshots
    with similar ROIs regardless of scale.
    """
    
    cursor.execute("""
    CREATE TABLE `screenshots` (
      `id`                INT unsigned NOT NULL auto_increment,
      `timestamp`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `observationDate`   datetime NOT NULL,
      `imageScale`        FLOAT UNSIGNED,
      `regionOfInterest`  POLYGON NOT NULL,
      `watermark`         TINYINT(1) UNSIGNED DEFAULT TRUE,
      `dataSourceString`  VARCHAR(255) NOT NULL,
      `dataSourceBitMask` BIGINT UNSIGNED,
      `eventSourceString` VARCHAR(1024) DEFAULT NULL,
      `eventsLabels`      TINYINT(1) UNSIGNED NOT NULL,
      `numLayers`         TINYINT UNSIGNED NOT NULL DEFAULT 1,
       PRIMARY KEY (`id`)
    ) DEFAULT CHARSET=utf8;""")

def create_statistics_table(cursor):
    """Creates a table to keep query statistics
    
    Creates a simple table for storing query statistics for selected types of 
    requests
    """
    cursor.execute("""
    CREATE TABLE `statistics` (
      `id`          INT unsigned NOT NULL auto_increment,
      `timestamp`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `action`      VARCHAR(32)  NOT NULL,
       PRIMARY KEY (`id`)
    ) DEFAULT CHARSET=utf8;""")
    

def enable_datasource(cursor, sourceId):
    """Enables datasource
    
    Marks a single datasource as enabled to signal that there is data for that
    source 
    """
    cursor.execute("UPDATE datasources SET enabled=1 WHERE id=%d;" % sourceId)
    
def update_image_table_index(cursor):
    """Updates index on images table"""
    cursor.execute("OPTIMIZE TABLE images;")
    
def mark_as_corrupt(cursor, filename, note):
    """Adds an image to the 'corrupt' database table"""
    sql = "INSERT INTO corrupt VALUES (NULL, NULL, '%s', '%s');" % (filename,
                                                                    note)
    
    cursor.execute(sql)

def get_datasources(cursor):
    """Returns a list of the known datasources"""
    __SOURCE_ID_IDX__ = 0
    __ENABLED_IDX__ = 1
    __OBS_NAME_IDX__ = 2
    __INST_NAME_IDX__ = 3
    __DET_NAME_IDX__ = 4
    __MEAS_NAME_IDX__ = 5
    
    sql = \
    """ SELECT
            datasources.id as id,
            datasources.enabled as enabled,
            observatories.name as observatory,
            instruments.name as instrument,
            detectors.name as detector,
            measurements.name as measurement
        FROM datasources
            LEFT JOIN observatories
            ON datasources.observatoryId=observatories.id 
            LEFT JOIN instruments
            ON datasources.instrumentId=instruments.id 
            LEFT JOIN detectors
            ON datasources.detectorId=detectors.id 
            LEFT JOIN measurements
            ON datasources.measurementId=measurements.id;"""

    # Fetch available data-sources
    cursor.execute(sql)
    results = cursor.fetchall()
    
    # Convert results into a more easily traversable tree structure
    tree = {}
    
    for source in results:
        # Image parameters
        obs = source[__OBS_NAME_IDX__]
        inst = source[__INST_NAME_IDX__]
        det = source[__DET_NAME_IDX__]
        meas = source[__MEAS_NAME_IDX__]
        id = int(source[__SOURCE_ID_IDX__])
        enabled = bool(source[__ENABLED_IDX__])
        
        # Build tree
        if obs not in tree:
            tree[obs] = {}
        if inst not in tree[obs]:
            tree[obs][inst] = {}
        if det not in tree[obs][inst]:
            tree[obs][inst][det] = {}
        if meas not in tree[obs][inst][det]:
            tree[obs][inst][det][meas] = {"id": id, "enabled": enabled}
            
    return tree    
