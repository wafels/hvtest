<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Image_JPEG2000_JP2ImageXMLBox class definition
 *
 * PHP version 5
 *
 * @category Image
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
/**
 * JPEG 2000 Image XML Box parser class
 *
 * @category Image
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
class Image_JPEG2000_JP2ImageXMLBox
{
    private $_file;
    private $_xml;

    /**
     * Create an instance of Image_JPEG2000_JP2Image_XMLBox
     *
     * @param string $file JPEG 2000 Image location
     * @param string $root Where the data is coming from
     */
    public function __construct($file, $root = "fits")
    {
        $this->_file = $file;
        $this->getXMLBox($root);
    }

    /**
     * Given a filename and the name of the root node, extracts
     * the XML header box from a JP2 image
     *
     * @param string $root Name of the XMLBox root node (if known)
     *
     * @return void
     */
    public function getXMLBox ($root)
    {
        if (!file_exists($this->_file)) {
        	// NOTE 02/02/2011: This error may also be thrown if web server cannot write to cache dir
            $msg = "Unable to access file. Do you have the proper permissions?";
            throw new Exception($msg, 50);
        }

        $fp = fopen($this->_file, "rb");

        $xml  = "";

        // Read file until header has been retrieved
        while (!feof($fp)) {
            $line = fgets($fp);
            $xml .= $line;

            if (strpos($line, "</$root>") !== false) {
                break;
            }
        }
        $start = strpos($xml, "<$root>");
        $end   = strpos($xml, "</$root>") + strlen("</$root>");

        $xml = substr($xml, $start, $end - $start);

        fclose($fp);
        
        // Work-around Feb 24, 2012: escape < and >
        $xml = str_replace(" < ", " &lt; ", str_replace(" > ", " &gt; ", $xml));
        
        $this->_xmlString = '<?xml version="1.0" encoding="utf-8"?>' . "\n" . $xml;

        $this->_xml = new DOMDocument();

        $this->_xml->loadXML($this->_xmlString);
    }
    
    /**
     * Returns the XML header as a string
     */
    public function getXMLString()
    {
        return $this->_xmlString;
    }
    
    /**
     * Prints xml information
     * 
     * @return void
     */
    public function printXMLBox ()
    {
        header('Content-type: text/xml');
        echo $this->_xmlString;
    }
    
    /**
     * Returns the distance to the sun in meters
     * 
     * For images where dsun is not specified it can be determined using:
     * 
     *    dsun = (rsun_1au / rsun_image) * dsun_1au
     */
    public function getDSun()
    {
        $maxDSUN = 2.25e11; // A reasonable max for solar observatories, ~1.5 AU
        
        try {
            // AIA, EUVI, COR, SWAP, SXT, XRT
            $dsun = $this->_getElementValue("DSUN_OBS");
        } catch (Exception $e) {
            try {
                // EIT
                $rsun = $this->_getElementValue("SOLAR_R");
            } catch (Exception $e) {
                try {
                    // MDI
                    $rsun = $this->_getElementValue("RADIUS");
                } catch (Exception $e) {
                }
            }
            if (isset($rsun)) {
                $scale = $this->_getElementValue("CDELT1");
                $dsun = (HV_CONSTANT_RSUN / ($rsun * $scale)) * HV_CONSTANT_AU;
            }
        }
        
        // HMI continuum images may have DSUN = 0.00
        // LASCO/MDI may have rsun=0.00
        if (!isset($dsun) || $dsun <= 0) {
            $dsun = HV_CONSTANT_AU;
        }
        
        // Check to make sure header information is valid
        if ((filter_var($dsun, FILTER_VALIDATE_FLOAT) === false) || ($dsun <= 0) || ($dsun >= $maxDSUN)) {
            throw new Exception("Invalid value for DSUN: $dsun", 15);
        }
        
        return $dsun;
    }

    /**
     * Returns the dimensions for a given image
     *
     * @return array JP2 width and height
     */
    public function getImageDimensions()
    {
        try {
            $width  = $this->_getElementValue("NAXIS1");
            $height = $this->_getElementValue("NAXIS2");
        } catch (Exception $e) {
            throw new Exception('Unable to locate image dimensions in header tags!', 15);
        }
        
        return array($width, $height);
    }

    /**
     * Returns the plate scale for a given image
     *
     * @return string JP2 image scale
     */
    public function getImagePlateScale()
    {
        try {
            $scale = $this->_getElementValue("CDELT1");
        } catch (Exception $e) {
            throw new Exception("Unable to locate image scale in header tags!");            
        }
        
        // Check to make sure header information is valid
        if ((filter_var($scale, FILTER_VALIDATE_FLOAT) === false) || ($scale <= 0)) {
            throw new Exception("Invalid value for CDELT1: $scale", 15);
        }
        
        return $scale;
    }

    /**
     * Returns the coordinates for the image's reference pixel.
     * 
     * NOTE: The values for CRPIX1 and CRPIX2 reflect the x and y coordinates with the origin
     * at the bottom-left corner of the image, not the top-left corner.
     *
     * @return array Pixel coordinates of the reference pixel
     */
    public function getRefPixelCoords()
    {
        try {
            $x = $this->_getElementValue("CRPIX1");
            $y = $this->_getElementValue("CRPIX2");
        } catch (Exception $e) {
            throw new Exception('Unable to locate reference pixel coordinates in header tags!', 15);
        }
        return array($x, $y);
    }

    /**
     * Returns the Header keywords containing any Sun-center location information
     *
     * @return array Header keyword/value pairs from JP2 file XML 
     */
    public function getSunCenterOffsetParams()
    {
        $sunCenterOffsetParams = array();
        
        try {
            if ( $this->_getElementValue('INSTRUME') == 'XRT' ) {
                $sunCenterOffsetParams['XCEN'] = $this->_getElementValue('XCEN');
                $sunCenterOffsetParams['YCEN'] = $this->_getElementValue('YCEN');
                $sunCenterOffsetParams['OSLO_XCEN_DELTA'] = $this->_getElementValue('OSLO_XCEN_DELTA');
                $sunCenterOffsetParams['OSLO_YCEN_DELTA'] = $this->_getElementValue('OSLO_YCEN_DELTA');
                $sunCenterOffsetParams['CDELT1'] = $this->_getElementValue('CDELT1');
                $sunCenterOffsetParams['CDELT2'] = $this->_getElementValue('CDELT2');
            }
        } catch (Exception $e) {
            throw new Exception('Unable to locate Sun center offset parameters in header tags!', 15);
        }

        return $sunCenterOffsetParams;
    }

    /**
     * Returns layering order based on data source
     *
     * NOTE: In the case of Hinode XRT, layering order is decided on an image-by-image basis
     *
     * @return integer layering order
     */
    public function getLayeringOrder()
    {
        try {
            switch ($this->_getElementValue('TELESCOP')) {
                case 'SOHO':
                    $layeringOrder = 2;     // SOHO LASCO C2
                    if ( $this->_getElementValue('INSTRUME') == 'EIT' ) {
                        $layeringOrder = 1;  // SOHO EIT
                    }
                    elseif ( $this->_getElementValue('INSTRUME') == 'MDI' ) {
                        $layeringOrder = 1;  // SOHO MDI
                    }
                    elseif ( $this->_getElementValue('DETECTOR') == 'C3' ) {
                        $layeringOrder = 3; // SOHO LASCO C3
                    }
                    break;
                case 'STEREO':
                    $layeringOrder = 2;     // STEREO_A/B SECCHI COR1
                    if ( $this->_getElementValue('DETECTOR') == 'COR2' ) {
                        $layeringOrder = 3; // STEREO_A/B SECCHI COR2
                    }
                    break;
                case 'HINODE':
                    $layeringOrder = 1;     // Hinode XRT full disk
                    if ( $this->_getElementValue('NAXIS1') * $this->_getElementValue("CDELT1") < 2048.0 &&
                         $this->_getElementValue('NAXIS2') * $this->_getElementValue("CDELT2") < 2048.0 ) {
                     
                        $layeringOrder = 2; // Hinode XRT sub-field
                    }
                    break;
                default:
                    // All other data sources
                    $layeringOrder = 1;
            }
        } catch (Exception $e) {
            throw new Exception('Unable to determine layeringOrder from header tags!', 15);
        }

        return $layeringOrder;
    }
    
    /**
     * Returns true if the image was rotated 180 degrees
     * 
     * Note that while the image data may have been rotated to make it easier to line
     * up different data sources, the meta-information regarding the sun center, etc. are
     * not adjusted, and thus must be manually adjusted to account for any rotation.
     *
     * @return boolean True if the image has been rotated
     */
    public function getImageRotationStatus()
    {
        try {
            $rotation = $this->_getElementValue("CROTA1");
            if (abs($rotation) > 170) {
                return true;
            }
        } catch (Exception $e) {
            // AIA, EIT, and MDI do their own rotation
            return false;
        }        
    }

    /**
     * Retrieves the value of a unique dom-node element or returns false if element is not found, or more
     * than one is found.
     *
     * @param string $name The name of the XML element whose value should be return
     *
     * @return string the value for the specified element
     */
    private function _getElementValue($name)
    {
        $element = $this->_xml->getElementsByTagName($name);

        if ($element) {
            if (!is_null($element->item(0))) {
                return $element->item(0)->childNodes->item(0)->nodeValue;
            }
        }
        throw new Exception('Element not found', 15);
    }
}