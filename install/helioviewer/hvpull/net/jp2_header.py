#
# Get the JP2 meta data out of the JP2 header.  
#

# SunPy time module is slated to use the Astropy time module at some point in
# the future.  If we continue to use SunPy to interpret times, we might need
# to revisit how time is handled in the downloader
from sunpy.time import parse_time

# The SunPy XML interpreter seems to have been copied from somewhere else.
from sunpy.util.xml import xml_to_dict

def get_image_params(self, filepath):
    """Get the image parameters out of the JP2 file"""
    xmlstring = _read_xmlbox(filepath, "fits")
    pydict = xml_to_dict(xmlstring)["fits"]

    #Fix types
    for k, v in pydict.items():
        if v.isdigit():
            pydict[k] = int(v)
        elif is_float(v):
            pydict[k] = float(v)
            
    # Remove newlines from comment
    if 'comment' in pydict:
        pydict['comment'] = pydict['comment'].replace("\n", "")
        
        

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
return image_params





def _read_xmlbox(self, filepath, root):
    """Extracts the XML box from a JPEG 2000 image.
    Given a filename and the name of the root node, extracts the XML header
    box from a JP2 image."""
    with open(filepath, 'rb') as fp:

        xmlstr = ""
        for line in fp:
            xmlstr += line
            if line.find("</%s>" % root) != -1:
                break

        start = xmlstr.find("<%s>" % root)
        end = xmlstr.find("</%s>" % root) + len("</%s>" % root)
        
        xmlstr = xmlstr[start : end]

# Fix any malformed XML (e.g. in older AIA data)
return xmlstr.replace("&", "&amp;")