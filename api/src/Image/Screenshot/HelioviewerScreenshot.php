<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Image_HelioviewerScreenshot class definition
 *
 * PHP version 5
 *
 * @category Image
 * @package  Helioviewer
 * @author   Jaclyn Beck <jaclyn.r.beck@gmail.com>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
require_once 'src/Image/Composite/CompositeImage.php';
require_once 'src/Image/JPEG2000/JP2Image.php';
require_once 'src/Image/HelioviewerImageLayer.php';
/**
 * Image_HelioviewerScreenshot class definition
 *
 * PHP version 5
 *
 * @category Image
 * @package  Helioviewer
 * @author   Jaclyn Beck <jaclyn.r.beck@gmail.com>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
class Image_Screenshot_HelioviewerScreenshot extends Image_Composite_CompositeImage
{
    protected $outputFile;
    protected $layerImages;
    protected $date;
    protected $imageSize;
    protected $offsetLeft;
    protected $offsetRight;
    protected $offsetBottom;
    protected $offsetTop;
    protected $watermarkOn;
    protected $buildFilename;
    protected $compress;
    protected $format;
    protected $interlace;

    /**
     * Create an instance of Image_Screenshot
     *
     * @param int    $date        observation date string
     * @param int    $width       Screenshot width
     * @param int    $height      Screenshot height
     * @param float  $scale       Screenshot scale
     * @param string $filename    Location where the screenshot will be stored
     * @param int    $quality     Screenshot compression quality
     * @param bool   $watermarkOn Whether to watermark the image or not
     * @param array  $offsets     The offsets of the top-left and bottom-right corners of the image
     *                            from the center of the sun.
     * @param string $outputDir   The directory where the screenshot will be stored
     * @param bool   $compress    Whether to compress the image after extracting or not (true for tiles)
     */
    public function __construct($date, $width, $height, $imageScale, $filename, $quality, $watermarkOn, $offsets, $outputDir, 
                                $compress, $format="png", $interlace=true)
    {
        $this->date          = $date;
        $this->quality       = $quality;
        $this->offsetLeft	 = $offsets['left'];
        $this->offsetTop	 = $offsets['top'];
        $this->offsetBottom	 = $offsets['bottom'];
        $this->offsetRight	 = $offsets['right'];
        $this->watermarkOn   = $watermarkOn;
        $this->buildFilename = !$filename;
        $this->compress      = $compress;
        $this->format        = $format;
        $this->interlace     = $interlace;

        //parent::__construct($meta, $outputDir, $filename . ".$format");
        parent::__construct($width, $height, $imageScale, $outputDir, $filename . ".jpg");
    }

    /**
     * Builds the screenshot.
     *
     * @param {Array} $layerInfoArray -- An associative array of 
     * 	sourceId,width,height,imageScale,roi,offsetX,offsetY for each layer
     *
     * @return void
     */
    public function buildImages($layerInfoArray)
    {
        $filenameInfo = "";
        $this->layerImages = array();

        // Find the closest image for each layer, add the layer information string to it
        foreach ($layerInfoArray as $layer) {
            if (!$layer['closestImage']) {
                $closestImage = $this->_getClosestImage($layer['sourceId']);
            } else {
                $closestImage = $layer['closestImage'];
            }

            $obsInfo 	   = $this->_getObservatoryInformation($layer['sourceId']);
            $filenameInfo .= "_" . $obsInfo['instrument'] . "_" . $obsInfo['detector'] . "_" . $obsInfo['measurement'] . "_";
            
            $roi = array(
                'top'    => $this->offsetTop,
                'left'   => $this->offsetLeft,
                'bottom' => $this->offsetBottom,
                'right'  => $this->offsetRight
            );
            
            // Instantiate a JP2Image
            $jp2Filepath = $this->_getJP2Path($closestImage);
          
            $jp2 = new Image_JPEG2000_JP2Image(
                $jp2Filepath, $closestImage['width'], $closestImage['height'], $closestImage['scale']
            );       

            $tmpOutputFile  = $this->_getTmpOutputPath($closestImage, $roi, $layer['opacity']);

            $offsetX = $closestImage['sunCenterX'] - $closestImage['width'] /2;
            $offsetY = $closestImage['height']/2   - $closestImage['sunCenterY'];
            
            $image = new Image_HelioviewerImageLayer(
                $jp2, $tmpOutputFile, 
                $layer['width'], $layer['height'], $layer['imageScale'], 
                $roi, $obsInfo['instrument'], $obsInfo['detector'],
                $obsInfo['measurement'], $obsInfo['layeringOrder'], 
                $offsetX, $offsetY, $layer['opacity'], $closestImage['date'], $this->compress
            );
            array_push($this->layerImages, $image);
        }

        if ($this->buildFilename) {
            $time = str_replace(array(":", "-", "T", "Z"), "_", $this->date);
            //$this->setOutputFile($time . $filenameInfo . time() . "." . $this->format);
            $this->setOutputFile($time . $filenameInfo . time() . ".jpg");
        }

        $this->compileImages();
    }
    
    /**
     * Gets the path to the JP2 image on disk
     * 
     * @param array $closestImage An array containing image meta information, obtained from the database
     * 
     * @return string the filepath to the JP2 image
     */
    private function _getJP2Path($closestImage)
    {
        return HV_JP2_DIR . $closestImage['filepath'] . "/" . $closestImage['filename'];
    }
    
    /**
     * Builds a temporary output path where the extracted image will be stored
     * 
     * @param array $closestImage An array containing image meta information, obtained from the database
     * @param array $roi          The region of interest in arcseconds
     * @param int   $opacity      The opacity of the image from 0 to 100
     * 
     * @return string a string containing the image's temporary output path
     */
    private function _getTmpOutputPath($closestImage, $roi, $opacity)
    {
        $cacheDir = HV_CACHE_DIR . $closestImage['filepath'];

        if (!file_exists($cacheDir)) {
            mkdir($cacheDir, 0777, true);
            chmod($cacheDir, 0777);
        }

        return $cacheDir . "/" . substr($closestImage['filename'], 0, -4) . "_" . 
            $this->scale . "_" . round($roi['left']) . "_" . round($roi['right']) . "x_" . 
            round($roi['top']) . "_" . round($roi['bottom']) . "y-op$opacity.png";
    }

    /**
     * Queries the database to find the closest image to a given timestamp.
     *
     * @param int $sourceId The source ID of the image
     *
     * @return array closestImg, an array with the image's id, filepath, filename, date
     */
    private function _getClosestImage($sourceId)
    {
        include_once HV_ROOT_DIR . '/api/src/Database/ImgIndex.php';
        $imgIndex = new Database_ImgIndex();
        
        $closestImg = $imgIndex->getClosestImage($this->date, $sourceId);
        return $closestImg;
    }
    
    /**
     * If a source ID is passed in as a parameter, the database is queried to get the
     * image's observatory, instrument, detector, measurement
     * 
     * @param int $sourceId the source ID of the image
     * 
     * @return array an array with the image's obs, inst, det, meas info
     */
    private function _getObservatoryInformation($sourceId)
    {
        include_once HV_ROOT_DIR . '/api/src/Database/ImgIndex.php';
        $imgIndex = new Database_ImgIndex();
        $result = $imgIndex->getDatasourceInformationFromSourceId($sourceId);
        return $result;    	
    }
    
    /**
     * Builds an imagemagick command to composite watermark text onto the image
     * 
     * @param Object $imagickImage An initialized IMagick object
     * 
     * @return void
     */
    protected function addWaterMarkText($imagickImage)
    {
        $nameCmd = "";
        $timeCmd = "";
        $height  = $imagickImage->getImageHeight();
        
        $lowerPad = $height - 8; 
        // Put the names on first, then put the times on as a separate layer so the times are nicely aligned.
        foreach ($this->layerImages as $layer) {
            $lowerPad -= 12;
            $nameCmd  .= $layer->getWaterMarkName();
            $timeCmd  .= $layer->getWaterMarkDateString();
        }
        
        $black = new IMagickPixel("#000C");
        $white = new IMagickPixel("white");
        
        // Outline words in black
        $underText = new IMagickDraw();
        $underText->setStrokeColor($black);
        $underText->setStrokeWidth(2);
        $imagickImage->annotateImage($underText, 20, $lowerPad, 0, $nameCmd);
        $imagickImage->annotateImage($underText, 125, $lowerPad, 0, $timeCmd);
        
        // Write words in white over outline
        $text = new IMagickDraw();
        $text->setFillColor($white);
        $text->setStrokeWidth(0);
        $imagickImage->annotateImage($text, 20, $lowerPad, 0, $nameCmd);
        $imagickImage->annotateImage($text, 125, $lowerPad, 0, $timeCmd);
        
        $black->destroy();
        $white->destroy();
        $underText->destroy();
        $text->destroy();
    }
    
    /**
     * Does the same thing as addWaterMarkText but with no imagick.
     * returns a string, as it is assumed that this is called from addWatermarkNoImagick()
     * 
     * @return string
     */
    protected function addWaterMarkTextNoImagick()
    {
        $cmd     = "";
        $nameCmd = "";
        $timeCmd = "";

        // Put the names on first, then put the times on as a separate layer so the times are nicely aligned.
        foreach ($this->layerImages as $layer) {
            $nameCmd .= $layer->getWaterMarkName();
            $timeCmd .= $layer->getWaterMarkDateString();
        }

        // Outline words in black
        $cmd .= " -stroke #000C -strokewidth 2 -annotate +20+0 '$nameCmd'";
        // Write words in white over outline
        $cmd .= " -stroke none -fill white -annotate +20+0 '$nameCmd'";
        // Outline words in black
        $cmd .= " -stroke #000C -strokewidth 2 -annotate +125+0 '$timeCmd'";
        // Write words in white
        $cmd .= " -stroke none -fill white -annotate +125+0 '$timeCmd'";

        return $cmd;
    }
}
?>