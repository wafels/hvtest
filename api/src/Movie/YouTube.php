<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Movie_YouTube Class Definition
 * 
 * TODO 2011/01/09 Check for other restricted characters (e.g. '<' and '>')
 * word limits (e.g. keywords), etc. See reference below. 
 *       
 * 
 * PHP version 5
 *
 * @category Movie
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
/**
 * Uploads user-created movies to YouTube
 *
 * @category Movie
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
class Movie_YouTube
{
    private $_appId;
    private $_clientId;
    private $_testURL;
    private $_uploadURL;
    private $_httpClient;
    private $_youTube;
    
    /**
     * Creates a new YouTube instance
     *
     * @return void
     */
    public function __construct()
    {
        include_once 'Zend/Loader.php';

        Zend_Loader::loadClass('Zend_Gdata_AuthSub');
        
        $this->_appId     = "Helioviewer.org User Video Uploader";
        $this->_clientId  = "Helioviewer.org (2.3.0)";

        $this->_testURL   = "http://gdata.youtube.com/feeds/api/users/default/uploads?max-results=1";
        $this->_uploadURL = "http://uploads.gdata.youtube.com/feeds/api/users/default/uploads";

        if(!isset($_SESSION)) {
            # Note: If same user begins upload, and then shortly after tried
            # to upload a video again, PHP may hang when attempting to call
            # session_start(). May need a better way to make sure nothing else
            # is going on? (e.g. check for video entry in YouTube)
            session_start();
        }
        
    }
    
    /**
     * Authenticates user and uploads video to YouTube
     * 
     * @param Helioviewer_Movie A Movie object
     * 
     * @return void
     */
    public function uploadVideo($movie, $id, $title, $description, $tags, $share, $html)
    {
        // Re-confirm authorization and convert single-use token to session 
        // token if applicable
        $this->_checkAuthorization();
        
        // Once we have a session token get an AuthSubHttpClient
        $this->_httpClient = Zend_Gdata_AuthSub::getHttpClient($_SESSION['sessionToken']);
        
        // Increase timeout time to prevent client from timing out during uploads
        $this->_httpClient->setConfig(array( 'timeout' => 600 ));
        
        // Creates an instance of the Youtube GData object
        $this->_youTube = $this->_getYoutubeInstance();
        
        // If authorization is expired, reauthorize
        if (!$this->_authorizationIsValid()) {
            $this->getYouTubeAuth($movie->id);
        }
        
        $filepath = $movie->getFilepath(true);

        $videoEntry = $this->_createGDataVideoEntry($filepath, $title, $description, $tags, $share);
        
        $this->_uploadVideoToYouTube($videoEntry, $id, $title, $description, $tags, $share, $html);
    }
    
    /**
     * Checks to see if a user is Helioveiwer.org is currently authorized to interact with a user's YouTube account.
     * 
     * @return bool Returns true if the user has been authenticated by YouTube
     */
    public function checkYouTubeAuth()
    {
        if (!isset($_SESSION['sessionToken'])) {
            return false;
        }

        $this->_httpClient = Zend_Gdata_AuthSub::getHttpClient($_SESSION['sessionToken']);
        $this->_youTube    = $this->_getYoutubeInstance();

        return $this->_authorizationIsValid();
    }
    
    /**
     * Requests authorization for Helioviewer.org to upload videos on behalf
     * of the user.
     */
    public function getYouTubeAuth($id)
    {
        // Post-auth upload URL
        $uploadURL = HV_API_ROOT_URL . "?action=uploadMovieToYouTube&id=$id&html=true";
        
        // Get URL for authorization
        $authURL = Zend_Gdata_AuthSub::getAuthSubTokenUri(
            $uploadURL, "http://gdata.youtube.com", false, true
        );
        
        // Redirect user to YouTube authorization page
        header("Location: $authURL");
    }
    
    /**
     * Authorizes Helioviewer to upload videos to the user's account.
     * 
     * Function first checks to see if a session token already exists. If none
     * is found, the user is either redirected to an authentication URL, or
     * if stores sessions token if it was just retrieved. 
     * 
     * @param string $url Upload query URL
     * 
     * @return void
     */
    private function _checkAuthorization()
    {
        if (!isset($_SESSION['sessionToken'])) {
            // If no session token exists, check for single-use URL token
            if (isset($_GET['token'])) {
                $_SESSION['sessionToken'] = Zend_Gdata_AuthSub::getAuthSubSessionToken($_GET['token']);
            } else {
                // Otherwise, send user to authorization page
                throw new Exception("Authorization required before movie can be uploaded.");
            }
        }
    }
    
    /**
     * Checks to see if the user is currently authenticated, and that any previous authentication is not expired
     * 
     * @return bool Returns true if the user is authenticated and that 
     * authentication is still good, and false otherwise
     */
    private function _authorizationIsValid()
    {
        // Attempt a simple query to make sure session token has not expired
        try {
            $this->_youTube->getVideoFeed($this->_testURL);
        } catch (Exception $e) {
            //Zend_Gdata_App_HttpException
            include_once "src/Helper/ErrorHandler.php";
            logErrorMsg($msg, "Youtube_");
                        
            unset($_SESSION['sessionToken']); // Discard expired authorization
            return false;
        }
        return true;
    }
    
    /**
     * Creates an instance of a Zend_Gdata_YouTube_VideoEntry using the user-submitted values
     * 
     * @param string $filepath  Path to the video
     * 
     * @return Zend_Gdata_YouTube_VideoEntry Video entry
     */
    private function _createGDataVideoEntry($filepath, $title, $description, $tags, $share)
    {
        // Create a new VideoEntry object
        $videoEntry = new Zend_Gdata_YouTube_VideoEntry();
        
        // Create a new FileSource object
        $fileSource = $this->_createMediaFileSource($filepath);
        
        // add the filesource to the video entry
        $videoEntry->setMediaSource($fileSource);
    
        $videoEntry->setVideoTitle($title);
        $videoEntry->setVideoDescription($description);
        $videoEntry->setVideoCategory('Tech');
    
        // Set keywords. Please note that this must be a comma-separated string
        // and that individual keywords cannot contain whitespace
        $videoEntry->SetVideoTags($tags);
    
        // Add Helioviewer.org developer tag
        $videoEntry->setVideoDeveloperTags(array('Helioviewer.org'));    

        return $videoEntry;
    }
    
    /**
     * Creates an instance of a Zend_Gdata_App_MediaFileSource
     * 
     * @param string $filepath Path of the video file
     * 
     * @return Zend_Gdata_App_MediaFileSource media source associated with the video to be uploaded
     */
    private function _createMediaFileSource($filepath)
    {
        // Create a new Zend_Gdata_App_MediaFileSource object
        $filesource = $this->_youTube->newMediaFileSource($filepath);
        $filesource->setContentType('video/mp4');
    
        // Set slug header
        // http://code.google.com/apis/youtube/2.0/developers_guide_protocol_captions.html#Create_Caption_Track
        $filesource->setSlug($filepath);
        
        return $filesource;
    }
    
    /**
     * Initializes a YouTube GData object instance
     * 
     * @return Zend_Gdata_YouTube A YouTube object instance
     */
    private function _getYoutubeInstance()
    {
        // Load YouTube class
        Zend_Loader::loadClass('Zend_Gdata_YouTube');
        
        // Instantiate Youtube object
        $yt = new Zend_Gdata_YouTube(
            $this->_httpClient, $this->_appId, $this->_clientId, 
            HV_YOUTUBE_DEVELOPER_KEY
        );
        $yt->setMajorProtocolVersion(2); // Use API version 2
        
        return $yt;
    }
    
    /**
     * Uploads a single video to YouTube
     * 
     * @param int                           $id         Movie id
     * @param array                         $options    Movie options
     * @param Zend_Gdata_YouTube_VideoEntry $videoEntry A video entry object 
     * describing the video to be uploaded
     * 
     * Note: Content-length and Connection: close headers are sent so that
     * process can be run in the background without the user having to wait,
     * and the database entry will be updated even if the user closes the
     * browser window.
     * 
     * See: http://www.zulius.com/how-to/close-browser-connection-continue-execution/
     * 
     * @return Zend_Gdata_YouTube_VideoEntry
     */
    private function _uploadVideoToYouTube ($videoEntry, $id, $title, $description, $tags, $share, $html)
    {
        include_once 'src/Database/MovieDatabase.php';
        include_once 'lib/alphaID/alphaID.php';
        
        $movies = new Database_MovieDatabase();
        
        // Add movie entry to YouTube table if entry does not already exist
        $movieId = alphaID($id, true, 5, HV_MOVIE_ID_PASS);
     
        if (!$movies->insertYouTubeMovie($movieId, $title, $description, $tags, $share)) {
            throw new Exception("Movie has already been uploaded. Please allow several minutes for your video to appear on YouTube.", 1);
            // 12/14/2011: Tracking down upload error
            // $log = HV_LOG_DIR . "/upload-" . date("Ymd_His") . ".log";
            // $msg = "id: $movieId\n" . "title: $title\n". "desc: $description\n" . 
                   // "tags: $tags\n" .  "share: $share\n\n" .
                   // "REQUEST: " . print_r($_REQUEST, true) . "\n\n" . 
                   // "SESSION: " . print_r($_SESSION, true);
            // file_put_contents($log, $msg);

        }
        
        // buffer all upcoming output
        ob_start();
        
        // let user know that upload is in progress
        if ($html) {
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Helioviewer.org - YouTube Upload In Progress</title>
    <link rel="shortcut icon" href="../favicon.ico">
    <meta charset="utf-8" />
</head>
<body style='text-align: center;'>
    <div style='margin-top: 200px;'>
        <span style='font-size: 32px;'>Upload processing</span><br />
        Your video should appear on YouTube in 1-2 minutes.
    </div>
</body>
<?php
        } else {
            header('Content-type: application/json');
            echo json_encode(array("status" => "upload in progress."));
        }
        
        // get the size of the output
        $size = ob_get_length();
        
        // send headers to tell the browser to close the connection
        header("Content-Length: $size");
        header('Connection: close');
        
        // flush all output
        ob_end_flush();
        ob_flush();
        flush();
        
        // close current session
        if (session_id()) session_write_close();
        
        // Begin upload
        try {
            $newEntry = $this->_youTube->insertEntry(
                $videoEntry, $this->_uploadURL, 'Zend_Gdata_YouTube_VideoEntry'
            );
        } catch (Zend_Gdata_App_HttpException $httpException) {
            throw($httpException);
        } catch (Zend_Gdata_App_Exception $e) {
            throw($e);
        }

        // When upload finishes, get youtube id
        $newEntry->setMajorProtocolVersion(2);
        $youtubeId = $newEntry->getVideoId();
        
        // Update database entry and return result
        $movies->updateYouTubeMovie($movieId, $youtubeId);

        return $newEntry;
    }
}
?>
