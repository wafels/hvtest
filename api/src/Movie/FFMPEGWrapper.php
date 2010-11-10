<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Movie_FFMPEGWrapper Class Definition
 * 
 * Detecting problems with FFmpeg encoding:
 *  When using exec to call FFmpeg from the command line no useful return code or output
 *  information is returned. In order to the detect problems then the simplest way is to
 *  check and make sure the filesize is reasonable.
 *
 *
 * PHP version 5
 *
 * @category Movie
 * @package  Helioviewer
 * @author   Jaclyn Beck <jaclyn.r.beck@gmail.com>
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
/**
 * Calls FFMpeg commands
 *
 * @category Movie
 * @package  Helioviewer
 * @author   Jaclyn Beck <jaclyn.r.beck@gmail.com>
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
class Movie_FFMPEGWrapper
{
    private $_macFlags;
    private $_frameRate;
    
    /**
     * Constructor
     * 
     * @param {int} $frameRate The number of frames per second in the movie
     * 
     * @return void
     */
    public function __construct($frameRate)
    {
        $this->_macFlags = "-flags +loop -cmp +chroma -vcodec libx264 -me_method 'hex' -me_range 16 "
                    . "-keyint_min 25 -sc_threshold 40 -i_qfactor 0.71 -b_strategy 1 -qcomp 0.6 -qmin 10 "
                    . "-qmax 51 -qdiff 4 -bf 3 -directpred 1 -trellis 1 -wpredp 2 -y";
        $this->_frameRate = $frameRate;
    }
    
    /**
     * Creates an ipod-compatible mp4 video
     * 
     * @param String $hq_filename the filename of the movie
     * @param String $outputDir   the path where the file will be stored
     * @param String $tmpImageDir The directory where the individual movie frames are stored
     * @param int    $width       the width of the video
     * @param int    $height      the height of the video
     * 
     * @return String the filename of the ipod video
     */
    public function createIpodVideo($hq_filename, $outputDir, $tmpImageDir, $width, $height) 
    {
        $ipodVideoName = $outputDir . "/ipod-$hq_filename";
        $cmd = HV_FFMPEG . " -i " . $tmpImageDir . "/frame%d.jpg -r " . $this->_frameRate
            . " -f mp4 -b 800k -coder 0 -bt 200k -maxrate 96k -bufsize 96k -rc_eq 'blurCplx^(1-qComp)' -level 30 "
            . "-refs 1 -subq 5 -g 30 -s " . $width . "x" . $height . " " 
            . $this->_macFlags . " " . $ipodVideoName;
            
        exec(escapeshellcmd($cmd));

        // Check to ensure that movie size is valid
        if (filesize($ipodVideoName) < 1000)
            throw new Exception("FFmpeg error encountered: Unable to create iPod video.");

        return $ipodVideoName;
    }
    
    /**
     * Creates a flash video by converting it from the high quality file
     * 
     * @param string $hqFile    The name of the high quality file
     * @param string $filename  The name of the flash video file
     * @param string $outputDir The directory where both files are stored
     * 
     * @return void
     */
    public function createFlashVideo($hqFile, $filename, $outputDir)
    {
        $filepath = "$outputDir/$filename";
        $cmd = HV_FFMPEG . " -i $outputDir/$hqFile -vcodec copy -threads " . HV_FFMPEG_MAX_THREADS . " $filepath";
    
        exec(escapeshellcmd($cmd));

        // Check to ensure that movie size is valid
        if (filesize($filepath) < 1000)
            throw new Exception("FFmpeg error encountered: Unable to create flv.");
    }
    
    /**
     * Creates a video in whatever format is given in $filename
     ********* 
     *  NOTE: Frame rate MUST be specified twice in the command, 
     *        before and after the input file, or ffmpeg will start
     *        cutting off frames to adjust for what it thinks is the right
     *        frameRate. 
     *********
     * 
     * @param String $filename    the filename of the movie
     * @param String $outputDir   the path where the file will be stored
     * @param String $tmpImageDir The directory where the individual movie frames are stored
     * @param int    $width       the width of the video
     * @param int    $height      the height of the video
     * 
     * @return String the filename of the video
     */
    public function createVideo($filename, $outputDir, $tmpImageDir, $width, $height)
    {
        // MCMedia player can't play videos with < 1 fps and 1 fps plays oddly. So ensure
        // fps >= 2
        $outputRate = substr($filename, -3) === "flv" ? max($this->_frameRate, 2) : $this->_frameRate;
        
        $filepath = $outputDir . "/" . $filename;

        $cmd = HV_FFMPEG . " -r " . $this->_frameRate . " -i " . $tmpImageDir . "/frame%d.jpg"
            . " -r " . $outputRate . " -vcodec libx264 -vpre hq -threads " . HV_FFMPEG_MAX_THREADS . " -b 2048k -s " 
            . $width . "x" . $height . " -y $filepath";
            
        exec(escapeshellcmd($cmd));
            
        // If FFmpeg segfaults, an empty movie container may still be produced,
        // check to ensure that movie size is valid
        if (filesize($filepath) < 1000)
            throw new Exception("FFmpeg error encountered.");

        return $filename;
    }
}
?>
