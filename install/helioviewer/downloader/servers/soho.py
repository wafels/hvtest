"""SOHO DataServer"""
from helioviewer.downloader.servers import DataServer
import datetime

class SOHODataServer(DataServer):
    def __init__(self):
        """EXPLAIN"""
        DataServer.__init__(self, "/home/ireland/download_test", "JSOC")
        self.pause = datetime.timedelta(minutes=30)
    
    def get_starttime(self):
        """Default start time to use when retrieving data"""
        return datetime.datetime.utcnow() - datetime.timedelta(days=3)