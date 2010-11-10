<?php
$ini = "settings/Config.ini";
if ((!file_exists($ini)) || (!$config = parse_ini_file($ini)))
    die("Missing config file!");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php printf("<!-- Helioviewer 2.1.0 (rev. %s), %s -->\n", $config["build_num"], $config["last_update"]);?>
    <title>Helioviewer - Solar and heliospheric image visualization tool</title>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="ie=9" />
    <meta http-equiv="X-UA-Compatible" content="ie=8" />
    <meta http-equiv="X-UA-Compatible" content="chrome=1" />
    <meta name="description" content="Helioviewer - Solar and heliospheric image visualization tool" />
    <meta name="keywords" content="Helioviewer, jpeg 2000, jp2, solar image viewer, sun, solar, heliosphere, solar physics, viewer, visualization, space, astronomy, SOHO, EIT, LASCO, SDO, MDI, coronagraph, " />
    
    <?php if ($config["disable_cache"]) echo "<meta http-equiv=\"Cache-Control\" content=\"No-Cache\" />\n"; ?>
    
    <link rel="shortcut icon" href="favicon.ico" />
        
    <!--[if IE]>
    <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/chrome-frame/1/CFInstall.min.js"></script>
    <script type="text/javascript" src="http://html5shiv.googlecode.com/svn/trunk/html5.js"></script>
    <![endif]-->

    <!-- YUI CSS Reset -->
    <link rel="stylesheet" href="lib/yui-2.8.2r1/reset-fonts.css" />

    <!-- Plugin Styles -->
    <link rel="stylesheet" href="lib/jquery.ui-1.8/css/dot-luv-modified/jquery-ui-1.8.custom.css" />  
    <link rel="stylesheet" href="lib/jquery.jgrowl/jquery.jgrowl.css" />
    <link rel="stylesheet" href="lib/jquery.imgareaselect-0.9.2/css/imgareaselect-default.css" />
    <link rel="stylesheet" href="lib/shadowbox-3.0.3/shadowbox.css">

    <!-- Helioviewer-Specific Styles -->
    <?php

        if ($config['disable_cache']) {
            $signature = time();
        } else {
            $signature = $config['build_num'];
        }
        $version = "rev=$signature";

        // CSS
        if ($config["compress_css"]) {
            echo "<link rel=\"stylesheet\" href=\"build/css/helioviewer.min.css?$version\" />\n\t";
        }
        else {
            $css = array("main.css", "layout.css", "accordions.css", "dialogs.css", "sliders.css", "timenav.css", "tooltips.css", "viewport.css");
            foreach($css as $file)
                printf("<link rel=\"stylesheet\" href=\"resources/css/%s?$version\" />\n\t", $file);
        }
    ?>

    <!-- Theme Modifications -->
    <link rel="stylesheet" href="resources/css/dot-luv.css">

</head>
<body>

<!-- Header -->
<div id="header"></div>

<!-- Body -->
<div id="colmask">
    <div id="colmid">
        <div id="colright">

        <!-- Middle Column -->
        <div id="col1wrap">
            <div id="col1pad">
                <div id="col1">
                    <!-- Viewport -->
                    <div id="helioviewer-viewport-container-outer" class="ui-widget ui-widget-content ui-corner-all">
                        <div id="helioviewer-viewport-container-inner" style="top:3%; width:97%; height:94%">
                            <div id="helioviewer-viewport">
                                <div id="sandbox" style="position: absolute;">
                                    <div id="moving-container" style="left: 0; top: 0"></div>
                                </div>
                                <div id="message-console"></div>
                            </div>

                            <!-- UI COMPONENTS -->

                            <!--  Zoom Controls -->
                            <div id="zoomControls"></div>

                            <!-- Center button -->
                            <div id="center-button" title="Center the image on the screen.">
                               <span>center</span>
                            </div>

                            <!--Social buttons -->
                            <div id="social-buttons">
                                <!-- Link button -->
                                <div id="link-button" class="text-btn">
                                    <span class="ui-icon ui-icon-link" style="float: left;"></span>
                                    <span style="line-height: 1.6em">Link</span>
                                </div>

                                <!-- Email button -->
                                <!--<div id="email-button" class="text-btn">
                                    <span class="ui-icon ui-icon-mail-closed" style="float: left;"></span>
                                    <span style="line-height: 1.6em">Email</span>
                                </div>-->
                        <?php 
                            if ($config["enable_movie_button"])
                            {
                        ?>
                                <!-- Movie button -->
                                <div id="movie-button" class="text-btn">
                                    <span class="ui-icon ui-icon-video" style="float: left;"></span>
                                    <span style="line-height: 1.6em">Movie</span>
                                </div>
                        <?php 
                            }
                            
                            if ($config["enable_screenshot_button"])
                            {
                        ?>                      
                                <!-- Screenshot button -->
                                <div id="screenshot-button" class="text-btn">
                                    <span class="ui-icon ui-icon-image" style="float: left;"></span>
                                    <span style="line-height: 1.6em">Screenshot</span>
                                </div>
                        <?php 
                            }
                        ?>
                                <!-- Select region button -->
                                <!--<div id="select-region-button" class="text-btn">
                                    <span class='ui-icon ui-icon-scissors' style="float: left;"></span>
                                    <span style="line-height: 1.6em">Select Region</span>
                                </div>-->

                                <!-- Media settings button -->
                                <!--<div id="settings-button" class="text-btn">
                                    <span class='ui-icon ui-icon-gear' style="float: left;"></span>
                                    <span style="line-height: 1.6em">Media Settings</span>
                                </div>-->

                                <!-- JHelioviewer -->
                                <div id="jhelioviewer-button" class="text-btn">
                                    <span class="ui-icon ui-icon-arrowthickstop-1-s" style="float: left;"></span>
                                    <span style="line-height: 1.6em">JHelioviewer</span>
                                </div>
                            </div>

                            <!-- Fullscreen toggle -->
                            <div id='fullscreen-btn' title="Toggle fullscreen display.">
                                <span class='ui-icon ui-icon-arrow-4-diag'></span>
                            </div>

                            <!-- Mouse coordinates display -->
                            <div id="mouse-coords" style="display: none;">
                                <div id="mouse-coords-x"></div>
                                <div id="mouse-coords-y"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Left Column -->
        <div id="col2">
            <div id="left-col-header">
                <img src="resources/images/logos/simple.png" id="helioviewer-logo-main" alt="Helioviewer.org Logo" style="margin-top:24px; margin-left: 9px;">
            </div>
            <br><br>
            <div class="section-header" style="margin-left:5px; margin-top: 15px;">Time</div>
            <div id="observation-controls" class="ui-widget ui-widget-content ui-corner-all">
                <!--  Observation Date -->
                <div style="margin-bottom: 4px; position: relative;">
                    <div style="width: 78px; margin-top:3px; float: left; font-weight: 600;">Date:</div>
                    <input type="text" id="date" name="date" value="">
                    <span id="timeNowBtn" title="Move the  Observation Date/Time to the present time.">now</span>
                </div>

                <!-- Observation Time -->
                <div style="margin-bottom: 8px;">
                    <div style="float: left; width: 78px; font-weight: 600;">Time:</div>
                    <input type="text" id="time" name="time" value="" style="width:80px">
                </div>

                <!-- Time Navigation Buttons & Time Increment selector -->
                <div>
                    <div style="float: left; width: 78px; font-weight: 600;">Time-step:</div>
                    <select id="timestep-select" name="time-step"></select>
                    <span id="timeBackBtn" class="ui-icon ui-icon-circle-arrow-w" title="Move the Observation Date/Time backward one time-step"></span>
                    <span id="timeForwardBtn" class="ui-icon ui-icon-circle-arrow-e" title="Move the Observation Date/Time forward one time-step"></span>
                </div>
            </div>

            <br><br>
            <div id="tileLayerAccordion"></div>
            <br><br>

        </div>

        <!-- Right Column -->
        <div id="col3">
            <div id="right-col-header"></div>
        </div>
        </div>
    </div>
</div>
<!-- end Body -->

<!-- Footer -->
<div id="footer">
    <div id="footer-container-outer">
        <div id="footer-container-inner">
            <!-- Meta links -->
            <div id="footer-links">
                <a href="http://helioviewer.org/wiki/index.php?title=Helioviewer.org_User_Guide" class="light" target="_blank">Help</a>
                <a id="helioviewer-about" class="light" href="dialogs/about.php">About</a>
                <a id="helioviewer-usage" class="light" href="dialogs/usage.php">Usage Tips</a>
                <a href="http://helioviewer.org/wiki/" class="light" target="_blank">Wiki</a>
                <a href="api/" class="light" target="_blank">API</a>
                <a href="mailto:webmaster@helioviewer.org" class="light">Contact</a>
                <a href="https://bugs.launchpad.net/helioviewer.org/" class="light" style="margin-right:2px;" target="_blank">Report Problem</a>
            </div>
        </div>
    </div>
</div>
<!-- end Footer -->

<!-- TODO: Create dialog and loading indicator nodes on the fly -->

<!-- Loading Indicator -->
<div id="loading" style="display: none">Loading...</div>

<!-- About dialog -->
<div id='about-dialog'></div>

<!-- Usage Dialog -->
<div id='usage-dialog'></div>

<!-- Kaltura HTML5 video player -->
<!-- <script type="text/javascript" src="http://html5.kaltura.org/js"></script> --> 

<!-- jQuery -->
<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js" type="text/javascript"></script>
<script src="http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.6/jquery-ui.min.js" type="text/javascript"></script>
<script src="lib/jquery.class/jquery.class.min.js" type="text/javascript"></script>
<!--<script src="lib/jquery.qtip-2.0-r282/jquery.qtip.js" type="text/javascript"></script>
<script src="lib/jquery.qtip-2.0-r282/jquery.qtip.tips.js" type="text/javascript"></script>-->
<script src="lib/jquery.qtip-1.0-r54/jquery.qtip-1.0.min.js" type="text/javascript"></script>

<!-- Mousewheel support -->
<script src="lib/jquery.mousewheel.3.0.2/jquery.mousewheel.min.js" type="text/javascript"></script>

<!-- jGrowl -->
<script src="lib/jquery.jgrowl/jquery.jgrowl_compressed.js" type="text/javascript"></script>

<!-- imgAreaSelect jQuery plugin -->
<script src="lib/jquery.imgareaselect-0.9.2/scripts/jquery.imgareaselect.pack.js" type="text/javascript"></script>

<!-- jsTree -->
<!--<script src="lib/jquery.jsTree-1.0rc/jquery.jstree.js" type="text/javascript"></script>-->

<!-- CookieJar -->
<script type="text/javascript" src="lib/jquery.json-2.2/jquery.json-2.2.min.js"></script>
<script type="text/javascript" src="lib/jquery.cookie/jquery.cookie.min.js"></script>
<script type="text/javascript" src="lib/Cookiejar/jquery.cookiejar.pack.js"></script>

<!-- date.js -->
<script src="lib/date.js/date-en-US.js" type="text/javascript"></script>

<!-- XML to JSON -->
<script src="lib/jquery.xml2json/jquery.xml2json.pack.js" type="text/javascript" language="javascript"></script>

<!-- Simile -->
<!--<script src="http://static.simile.mit.edu/timeline/api-2.2.0/timeline-api.js" type="text/javascript"></script>-->

<!-- Pixastic -->
<!-- $("img.tile[src!=resources/images/transparent_512.gif]"); -->
<!--<script src="lib/pixastic/pixastic.custom.js" type="text/javascript"></script>-->

<!-- ShadowBox -->
<script type="text/javascript" src="lib/shadowbox-3.0.3/shadowbox.js"></script>

<!-- Helioviewer JavaScript -->
<?php 
    // JavaScript
    if ($config["compress_js"]) {
        $compressed = "build/helioviewer.min.js";
        if (!file_exists($compressed)) {
           $error = "<div style='position: absolute; width: 100%; text-align: center; top: 40%; font-size: 14px;'>
                     <img src='resources/images/logos/about.png' alt='helioviewer logo'></img><br>
                     <b>Configuration:</b> Unable to find compressed JavaScript files.
                     If you haven't already, use Apache Ant with the included build.xml file to generate 
                     compressed files.</div></body></html>";
           die($error);
        }
    
        echo "<script src=\"$compressed?$version\" type=\"text/javascript\"></script>\n\t";
    }
    else {
        $js = array("Utility/Config.js", "UIController.js", "Utility/HelperFunctions.js", "UI/IconPicker.js", 
                    "Tiling/Layer/Layer.js", "Tiling/Layer/TileLoader.js", "Tiling/Layer/TileLayer.js", 
                    "Tiling/Layer/HelioviewerTileLayer.js", "UI/TreeSelect.js", "UI/ImageSelectTool.js",  
                    "Utility/KeyboardManager.js", "Tiling/Manager/LayerManager.js", "Events/EventManager.js", 
                    "Tiling/Manager/TileLayerManager.js", "Tiling/Manager/HelioviewerTileLayerManager.js", 
                    "Events/EventType.js", "Events/EventFeatureRecognitionMethod.js",
                    "Media/History/History.js", "Media/History/MovieHistory.js", "Media/History/ScreenshotHistory.js",
                    "Media/Builder/MediaBuilder.js", "UI/MessageConsole.js", "Media/MediaHistoryBar.js",
                    "Media/Media.js", "Media/Screenshot.js", "Media/Movie.js", "Media/Builder/MovieBuilder.js",  
                    "Media/Builder/ScreenshotBuilder.js", "Image/JP2Image.js", "Tiling/Manager/TileLayerAccordion.js",  
                    "UI/TimeControls.js", "UI/TooltipHelper.js", "Utility/SettingsLoader.js", "Utility/UserSettings.js", 
                    "Utility/FullscreenControl.js", "Viewport/Helper/MouseCoordinates.js", "Viewport/Viewport.js", 
                    "Viewport/Helper/HelioviewerMouseCoordinates.js", "Viewport/Helper/SandboxHelper.js",
                    "Viewport/Helper/ViewportMovementHelper.js", "Viewport/HelioviewerViewport.js", 
                    "Viewport/ViewportController.js", "Helioviewer.js", "UI/ZoomControls.js", 
                    "Utility/InputValidator.js", "UI/jquery.ui.dynaccordion.js");
        foreach($js as $file)
            printf("<script src=\"src/%s?$version\" type=\"text/javascript\"></script>\n\t", $file);
    }
?>

<script type="text/javascript">
    var serverSettings, settingsJSON, urlSettings;

    Shadowbox.init({
        overlayOpacity: 0.5,
        troubleElements: ["object", "embed"]
    });

    $(function () {
        if ($.browser.msie && ($.browser.version < 8)) {
            CFInstall.check({mode: "overlay"});
        }

        <?php
            printf("settingsJSON = %s;\n", json_encode($config));

            // Settings specified via URL parameters
            $urlSettings = array();

            //API Example: helioviewer.org/?date=2003-10-05T00:00:00Z&imageScale=2.4&imageLayers=[SOHO,AIA,AIA,171,1,70],[SOHO,LASCO,C2,white light,0,100]
            if (isset($_GET['imageLayers'])) {
                $imageLayersString = ($_GET['imageLayers'][0] == "[") ? substr($_GET['imageLayers'],1,-1) : $_GET['imageLayers'];
                $imageLayers = preg_split("/\],\[/", $imageLayersString);
                $urlSettings['imageLayers'] = $imageLayers;
            }

            if (isset($_GET['date']))
                $urlSettings['date'] = $_GET['date'];

            if (isset($_GET['imageScale']))
                $urlSettings['imageScale'] = $_GET['imageScale'];

            // Convert to JSON
            printf("\t\turlSettings = %s;\n", json_encode($urlSettings));
        ?>
        serverSettings = new Config(settingsJSON).toArray();

        // Catch any exceptions that arise during execution
        try {
            helioviewer = new Helioviewer(urlSettings, serverSettings);
        } catch (e) {
            console.log("Exception: " + e.description);
        }
    });
</script>

</body>
</html>
