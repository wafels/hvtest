/**
 * MovieManagerUI class definition
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, 
eqeqeq: true, plusplus: true, bitwise: true, regexp: false, strict: true,
newcap: true, immed: true, maxlen: 80, sub: true */
/*global $, window, MovieManager, MediaManagerUI, Helioviewer, helioviewer,
  layerStringToLayerArray, humanReadableNumSeconds, addthis */
"use strict";
var MovieManagerUI = MediaManagerUI.extend(
    /** @lends MovieManagerUI */
    {
    /**
     * @constructs
     * Creates a new MovieManagerUI instance
     * 
     * @param {MovieManager} model MovieManager instance
     */    
    init: function (movieManager) {
        var movies = Helioviewer.userSettings.get('history.movies');
        this._manager = new MovieManager(movies);
        this._super("movie");
        this._settingsDialog   = $("#movie-settings-container");
        this._advancedSettings = $("#movie-settings-advanced");
        this._settingsHelp     = $("#movie-settings-help");
        this._settingsForm     = $("#movie-settings-form-container");
        this._settingsConsole  = $("#movie-settings-validation-console");
        this._movieScale = null;
        this._movieROI = null;
        this._movieLayers = null;
        this._movieEvents = null;
        this._movieEventsLabels = null;
        this._initEvents();
        this._initSettings();
    },
    
    /**
     * Plays the movie with the specified id if it is ready
     */
    playMovie: function (id) {
        var movie = this._manager.get(id);
        
        // If the movie is ready, open movie player
        if (movie.status === 2) {
            this._createMoviePlayerDialog(movie);
        } else {
            return;
        }
    },
    
    /**
     * Uses the layers passed in to send an Ajax request to api.php, to have it 
     * build a movie. Upon completion, it displays a notification that lets the
     * user click to view it in a popup. 
     */
    _buildMovieRequest: function (serializedFormParams) {
        var formParams, baseParams, params, frameRate;
        
        // Convert to an associative array for easier processing
        formParams = {};
        
        $.each(serializedFormParams, function (i, field) {
            formParams[field.name] = field.value;
        });
        
        this.building = true;
        
        // Movie request parameters
        baseParams = {
            action       : "queueMovie",
            imageScale   : this._movieScale,
            layers       : this._movieLayers,
            events       : this._movieEvents,
            eventsLabels : this._movieEventsLabels,
            format       : this._manager.format
        };
       
        // Add ROI and start and end dates
        params = $.extend(baseParams, this._movieROI, 
                          this._getMovieTimeWindow());

        // (Optional) Frame-rate or movie-length
        if (formParams['speed-method'] === "framerate") {
            frameRate = parseInt(formParams['framerate'], 10);
            if (frameRate < 1 || frameRate > 30) {
                throw "Frame-rate must be between 1 and 30.";
            }
            baseParams['frameRate'] = formParams['framerate'];
        }
        else {
            if (formParams['movie-length'] < 5 || 
                formParams['movie-length'] > 100) {
                throw "Movie length must be between 5 and 100 seconds.";
            }
            baseParams['movieLength'] = formParams['movie-length'];
        }
        
        //console.dir(params);
        //return false;
        
        // Submit request
        this._queueMovie(params);
        
        this._advancedSettings.hide();
        this._settingsDialog.hide();
        
        //this.hideDialogs();
        this.building = false;
    },
    
    /**
     * Determines the start and end dates to use when requesting a movie
     */
    _getMovieTimeWindow: function () {
        var movieLength, currentTime, endTime, startTimeStr, endTimeStr, 
            now, diff; 
        
        movieLength = Helioviewer.userSettings.get("options.movies.duration");
        
        // Webkit doesn't like new Date("2010-07-27T12:00:00.000Z")
        currentTime = helioviewer.getDate();
        
        // We want shift start and end time if needed to ensure that entire
        // duration will be used. For now, we will assume that the most
        // recent data available is close to now() to make things simple
        endTime = helioviewer.getDate().addSeconds(movieLength / 2);

        now = new Date();
        diff = endTime.getTime() - now.getTime();
        currentTime.addSeconds(Math.min(0, -diff / 1000));
        
        // Start and end datetime strings
        return {
            "startTime": currentTime.addSeconds(-movieLength / 2).toISOString(),
            "endTime"  : currentTime.addSeconds(movieLength).toISOString()
        };
    },
    
    /**
     * Displays movie settings dialog
     */
    _showMovieSettings: function (roi) {
        if (typeof roi === "undefined") {
            roi = helioviewer.getViewportRegionOfInterest();
        }

        var layers = helioviewer.getVisibleLayers(roi);
        var events = helioviewer.getEvents();

        // Make sure selection region and number of layers are acceptible
        if (!this._validateRequest(roi, layers)) {
            return;
        }
        
        // Store chosen ROI and layers
        this._movieScale  = helioviewer.getImageScale();
        this._movieROI    = this._toArcsecCoords(roi, this._movieScale);
        this._movieLayers = layers;
        this._movieEvents = events;
        this._movieEventsLabels = helioviewer.getEventsLabels();
        
        this.hide();
        this._settingsConsole.hide();
        this._settingsDialog.show();
    },
    
    /**
     * Queues a movie request
     */
    _queueMovie: function (params) {
        var callback, self = this;
        
        // AJAX Responder
        callback = function (response) {
            var msg, movie, waitTime;

            if ((response === null) || response.error) {
                // Queue full
                if (response.errno === 40) {
                    msg = response.error;
                } else {
                    // Other error
                    msg = "We are unable to create a movie for the time you " +
                        "requested. Please select a different time range " +
                        "and try again.";
                }
                $(document).trigger("message-console-info", msg);
                return;
            } else if (response.warning) {
                $(document).trigger("message-console-info", response.warning);
                return;
            }

            movie = self._manager.queue(
                response.id, response.eta, response.token, 
                params.imageScale, params.layers, params.events, params.eventsLabels, 
                new Date().toISOString(), params.startTime, params.endTime, 
                params.x1, params.x2, params.y1, params.y2
            );
            self._addItem(movie);
            
            waitTime = humanReadableNumSeconds(response.eta);
            msg = "Your video is processing and will be available in " + 
                  "approximately " + waitTime + ". You may view it at any " +
                  "time after it is ready by clicking the 'Movie' button";
            $(document).trigger("message-console-info", msg);
        };
        
        // Make request
        $.get(Helioviewer.api, params, callback, Helioviewer.dataType);
    },
    
    
    /**
     * Initializes MovieManager-related event handlers
     */
    _initEvents: function () {
        var timer, self = this;
       
        this._super();
        
        // ROI selection buttons
        this._fullViewportBtn.click(function () {
            self.hide();
            self._showMovieSettings();
        });
        
        this._selectAreaBtn.click(function () {
            self.hide();
            $(document).trigger("enable-select-tool", 
                                $.proxy(self._showMovieSettings, self));
        });
        
        // Setup hover and click handlers for movie history items
        $("#movie-history .history-entry")
           .live('click', $.proxy(this._onMovieClick, this))
           .live('mouseover mouseout', $.proxy(this._onMovieHover, this));
           
        
        // Download completion notification link
        $(".message-console-movie-ready").live('click', function (event) {
            var movie = $(event.currentTarget).data('movie');            
            self._createMoviePlayerDialog(movie);
        });
        
        // Update tooltip when movie is finished downloading
        $(document).bind("movie-ready", function (event, movie) {
            $("#" + self._type + "-" + movie.id).qtip("destroy");
            self._buildPreviewTooltip(movie);
        });
        
        // Upload form submission
        $("#youtube-video-info").submit(function () {
            self.submitVideoUploadForm();
            return false;
        });
        
        // Toggle advanced settings display
        $("#movie-settings-toggle-advanced").click(function () {
            // If help is visible, simply hide
            if (self._settingsHelp.is(":visible")) {
                self._settingsHelp.hide();
                self._settingsForm.show();
                return;
            }
            
            // Otherwise, toggle advanced settings visibility
            if (self._advancedSettings.is(":visible")) {
                self._advancedSettings.animate({"height": 0}, function () {
                    self._advancedSettings.hide();
                });
            } else {
                self._advancedSettings.css('height', 0).show();
                self._advancedSettings.animate({"height": 85}, function () {
                });
            }
        });
        
        // Toggle help display
        $("#movie-settings-toggle-help").click(function () {
            self._settingsForm.toggle();
            self._settingsHelp.toggle();
        });
    },
    
    /**
     * Initializes movie settings events
     */
    _initSettings: function () {
        var length, lengthInput, duration, durationSelect,  
            frameRateInput, settingsForm, self = this;

        // Advanced movie settings
        frameRateInput = $("#frame-rate");
        lengthInput    = $("#movie-length");
        durationSelect = $("#movie-duration");
        
        // Speed method enable/disable
        $("#speed-method-f").change(function () {
            lengthInput.attr("disabled", true);
            frameRateInput.attr("disabled", false);
        }).attr("checked", "checked").change();
                
        $("#speed-method-l").change(function () {
            frameRateInput.attr("disabled", true);
            lengthInput.attr("disabled", false);            
        });
        
        // Cancel button
        $("#movie-settings-cancel-btn").button().click(function (e) {
            self._advancedSettings.hide();
            self._settingsDialog.hide();
            self.show();
        });
        
        // Submit button
        settingsForm = $("#movie-settings-form");

        $("#movie-settings-submit-btn").button().click(function (e) {
            // Validate and submit movie request
            try {
                self._buildMovieRequest(settingsForm.serializeArray());
            } catch (ex) {
                // Display an error message if invalid values are specified 
                // for movie settings
                self._settingsConsole.text(ex).fadeIn(1000, function () {
                    setTimeout(function () {
                        self._settingsConsole.text(ex).fadeOut(1000);
                    }, 10000);
                });
            }
            return false;
        });

        // Movie duration
        duration = Helioviewer.userSettings.get("options.movies.duration"),
        
        // Duration event listener
        durationSelect.bind('change', function (e) {
            Helioviewer.userSettings.set("options.movies.duration",
            parseInt(this.value, 10));
        });
        
        // Reset to default values
        frameRateInput.val(15);
        lengthInput.val(20);
        durationSelect.find("[value=" + duration + "]").attr("selected", "selected");        
    },
    
    /**
     * If the movie is ready, play the movie in a popup dialog. Otherwise do
     * nothing.
     */
    _onMovieClick: function (event) {
        var id, movie, dialog, action;
        
        id    = $(event.currentTarget).data('id');
        movie = this._manager.get(id);
        
        // If the movie is ready, open movie player
        if (movie.status === 2) {
            dialog = $("movie-player-" + id);

            // If the dialog has already been created, toggle display
            if (dialog.length > 0) {
                action = dialog.dialog('isOpen') ? "close" : "open";
                dialog.dialog(action);
                
            // Otherwise create and display the movie player dialog
            } else {
                this._createMoviePlayerDialog(movie);
            }
        }
        return false;
    },
   
   /**
    * Shows movie details and preview.
    */
    _onMovieHover: function (event) {
        if (event.type === 'mouseover') {
            //console.log('hover on'); 
        } else {
            //console.log('hover off'); 
        }
    },
    
    /**
     * Creates HTML for a preview tooltip with a preview thumbnail, 
     * if available, and some basic information about the screenshot or movie
     */
    _buildPreviewTooltipHTML: function (movie) {
        var width, height, thumbnail, html = "";
        
        if (movie.status === 2) {
            // Use relative paths for thumbnails (helps with debugging in VM)
            if (Helioviewer.api === "api/index.php") {
                thumbnail = movie.thumbnail.substr(
                                movie.thumbnail.search("cache")
                            );    
            } else {
                thumbnail = movie.thumbnail;
            }            

            html += "<div style='text-align: center;'>" + 
                "<img src='" + thumbnail +
                "' width='95%' alt='preview thumbnail' /></div>";
                
            width  = movie.width;
            height = movie.height;
        } else {
            width  = Math.round(movie.x2 - movie.x1);
            height = Math.round(movie.y2 - movie.y1);
        }

        html += "<table class='preview-tooltip'>" +
            "<tr><td><b>Start:</b></td><td>" + movie.startDate + "</td></tr>" +
            "<tr><td><b>End:</b></td><td>" + movie.endDate + "</td></tr>" +
            "<tr><td><b>Scale:</b></td><td>" + movie.imageScale.toFixed(2) + 
            " arcsec/px</td></tr>" +
            "<tr><td><b>Dimensions:</b></td><td>" + width + 
            "x" + height +
            " px</td></tr>" +
            "</table>";

        return html;
    },
   
    /**
     * @description Opens a pop-up with the movie player in it.
     */
    _createMoviePlayerDialog: function (movie) {
        var dimensions, title, uploadURL, flvURL, swfURL, html, dialog, 
            screenshot, callback, self = this;
        
        // Make sure dialog fits nicely inside the browser window
        dimensions = this.getVideoPlayerDimensions(movie.width, movie.height);
        
        // Movie player HTML
        html = self.getVideoPlayerHTML(movie, dimensions.width, 
                                       dimensions.height);
        
        // Movie player dialog
        dialog = $(
            "<div id='movie-player-" + movie.id + "' " + 
            "class='movie-player-dialog'></div>"
        ).append(html);
        
        dialog.find(".video-download-icon").click(function () {
            // Google analytics event
            if (typeof(_gaq) != "undefined") {
                _gaq.push(['_trackEvent', 'Movies', 'Download']);
            } 
        });
        
        // Movie dialog title
        title = movie.name + " (" + movie.startDate + " - " + 
                movie.endDate + " UTC)";
        
        // Have to append the video player here, otherwise adding it to the div
        // beforehand results in the browser attempting to download it. 
        dialog.dialog({
            title     : "Movie Player: " + title,
            width     : dimensions.width  + 34,
            height    : dimensions.height + 104,
            resizable : $.support.h264 || $.support.vp8,
            close     : function () {
                            $(this).empty();
                        },
            zIndex    : 9999,
            show      : 'fade'
        });
        
        // TODO 2011/01/04: Disable keyboard shortcuts when in text fields! 
        // (already done for input fields...)
       
        // Initialize YouTube upload button
        $('#youtube-upload-' + movie.id).click(function () {
            self.showYouTubeUploadDialog(movie);
            return false;
        });
        
        // Initialize video link button
        $('#video-link-' + movie.id).click(function () {
            // Hide flash movies to prevent blocking
            if (!($.support.h264 || $.support.vp8)) {
                $(".movie-player-dialog").dialog("close");
            }
            helioviewer.displayMovieURL(movie.id);
            return false;
        });
        
        // BBCode link
        $("#bbcode-" + movie.id).click(function () {
            // Hide flash movies to prevent blocking
            if (!($.support.h264 || $.support.vp8)) {
                $(".movie-player-dialog").dialog("close");
            }
            self._showBBCode(movie.id, dimensions.width, dimensions.height);
            return false;
        });
        
        // Flash video URL
        flvURL = Helioviewer.api + 
                "/?action=downloadMovie&format=flv&id=" + movie.id;
                 
        // SWF URL (The flowplayer SWF directly provides best Facebook support)
        swfURL = Helioviewer.root + 
                 "/lib/flowplayer/flowplayer-3.2.8.swf?config=" + 
                 encodeURIComponent("{'clip':{'url': '../../" + flvURL + "'}}");
                 
        screenshot = movie.thumbnail.substr(0, movie.thumbnail.length - 9) + 
                     "full.png";
                     
        // If AddThis is not supported, skip toolbox initialization
        if (typeof(addthis) == "undefined") {
            return;
        }
        
        // First get a shortened version of the movie URL
        callback = function (response) {
            // Then initialize AddThis toolbox
            addthis.toolbox('#add-this-' + movie.id, {}, {
                url: response.data.url,
                title: "Helioviewer.org",
                description: title,
                screenshot: screenshot,
                swfurl: swfURL,
                width: movie.width,
                height: movie.height
            });
        };

        // Initialize AddThis toolbox once a shortened URL has been requested
        $.ajax({
            url: Helioviewer.api,
            dataType: Helioviewer.dataType,
            data: {
                "action": "shortenURL",
                "queryString": "movieId=" + movie.id 
            },
            success: callback
        });
    },
       
    /**
     * Opens YouTube uploader either in a separate tab or in a dialog
     */
    showYouTubeUploadDialog: function (movie) {
        var title, tags, url1, url2, description;
        
        // Suggested movie title
        title = movie.name + " (" + movie.startDate + " - " + 
                movie.endDate + " UTC)";

        // Suggested YouTube tags  
        tags = [];

        $.each(movie.layers.split("],["), function (i, layerStr) {
            var parts = layerStr.replace(']', "").replace('[', "")
                        .split(",").slice(0, 4);
            
            // Add observatories, instruments, detectors and measurements
            $.each(parts, function (i, item) {
                if ($.inArray(item, tags) === -1) {
                    tags.push(item);
                }                
            });
        });
        
        // URLs
        url1 = Helioviewer.root + "/?movieId=" + movie.id;
        url2 = Helioviewer.root + "/api/?action=downloadMovie&id=" + movie.id + 
               "&format=mp4&hq=true"; 
               
        // Suggested Description
        description = "This movie was produced by Helioviewer.org. See the " + 
                      "original at " + url1 + " or download a high-quality " + 
                      "version from " + url2;
                     
        // Update form defaults
        $("#youtube-title").val(title);
        $("#youtube-tags").val(tags);
        $("#youtube-desc").val(description);
        $("#youtube-movie-id").val(movie.id);

        // Hide movie dialogs (Flash player blocks upload form)
        $(".movie-player-dialog").dialog("close");

        // Open upload dialog
        $("#upload-dialog").dialog({
            "title" : "Upload video to YouTube",
            "width" : 550,
            "height": 440
        });
    },
    
    /**
     * Processes form and submits video upload request to YouTube
     */
    submitVideoUploadForm: function (event) {
        var params, successMsg, uploadDialog, url, form, loader, callback, 
            self = this;
            
        // Validate and submit form
        try {
            this._validateVideoUploadForm();
        } catch (ex) {
            this._displayValidationErrorMsg(ex);
            return false;
        }
        
        // Clear any remaining error messages before continuing
        $("#upload-error-console").hide();

        form = $("#upload-form").hide();
        loader = $("#youtube-auth-loading-indicator").show();

        // Callback function
        callback = function (auth) {
            loader.hide();
            form.show();
    
            // Base URL
            url = Helioviewer.api + "?" + $("#youtube-video-info").serialize();
    
            // If the user has already authorized Helioviewer, upload the movie
            if (auth) {
                $.get(url, {"action": "uploadMovieToYouTube"}, 
                    function (response) {
                        if (response.error) {
                            self.hide();
                            $(document).trigger("message-console-warn", 
                                                [response.error]);
                        }
                }, "json");
            } else {
                // Otherwise open an authorization page in a new tab/window
                window.open(url + "&action=getYouTubeAuth", "_blank");
            }
            
            // Close the dialog
            $("#upload-dialog").dialog("close");
            return false;
        }

        // Check YouTube authorization
        $.ajax({
            url : Helioviewer.api + "?action=checkYouTubeAuth",
            dataType: Helioviewer.dataType,
            success: callback
        });
    },
    
    /**
     * Displays an error message in the YouTube upload dialog
     * 
     * @param string Error message
     */
    _displayValidationErrorMsg: function (ex) {
        var errorConsole = $("#upload-error-console");
        
        errorConsole.html("<b>Error:</b> " + ex).fadeIn(function () {
            window.setTimeout(function () {
                errorConsole.fadeOut();
            }, 15000);
        });
    },
    
    /**
     * Validates title, description and keyword fields for YouTube upload.
     * 
     * @see http://code.google.com/apis/youtube/2.0/reference.html
     *      #Media_RSS_elements_reference
     */
    _validateVideoUploadForm: function () {
        var keywords         = $("#youtube-tags").val(),
            keywordMinLength = 2,
            keywordMaxLength = 30;
            
        // Make sure the title field is not empty
        if ($("#youtube-title").val().length === 0) {
            throw "Please specify a title for the movie.";
        }
        
        // User must specify at least one keyword
        if (keywords.length === 0) {
            throw "You must specifiy at least one tag for your video.";
        }
        
        // Make sure each keywords are between 2 and 30 characters each
        $.each(keywords.split(","), function (i, keyword) {
            var len = $.trim(keyword).length;
    
            if (len > keywordMaxLength) {
                throw "YouTube tags must not be longer than " + 
                      keywordMaxLength + " characters each.";
            } else if (len < keywordMinLength) {
                throw "YouTube tags must be at least " + keywordMinLength + 
                      " characters each.";
            }
            return;                     
        });
    
        // < and > are not allowed in title, description or keywords
        $.each($("#youtube-video-info input[type='text'], " + 
                 "#youtube-video-info textarea"), function (i, input) {
            if ($(input).val().match(/[<>]/)) {
                throw "< and > characters are not allowed";
            }
            return;
        });
    },
    
    /**
     * Adds a movie to the history using it's id
     */
    addMovieUsingId: function (id) {
        var callback, params, movie, self = this;
        
        callback = function (response) {
            if (response.status === 2) {
                // id, duration, imageScale, layers, dateRequested, startDate, 
                //  endDate, frameRate, numFrames, x1, x2, y1, y2, width, height
                movie = self._manager.add(
                    id,
                    response.duration,
                    response.imageScale,
                    response.layers,
                    response.events,
                    response.eventsLabels,
                    response.timestamp.replace(" ", "T") + ".000Z",
                    response.startDate,
                    response.endDate,
                    response.frameRate,
                    response.numFrames,
                    response.x1,
                    response.x2,
                    response.y1,
                    response.y2,
                    response.width,
                    response.height,
                    response.thumbnails.small,
                    response.url
                );
                
                self._addItem(movie);
                self._createMoviePlayerDialog(movie);
            }
        };
        
        params = {
            "action" : "getMovieStatus", 
            "id"     : id,
            "format" : self._manager.format,
            "verbose": true
        };
        $.get(Helioviewer.api, params, callback, Helioviewer.dataType);
    },
    
    /**
     * Determines dimensions for which movie should be displayed
     */
    getVideoPlayerDimensions: function (width, height) {
        var maxWidth    = $(window).width() * 0.80,
            maxHeight   = $(window).height() * 0.80,
            scaleFactor = Math.max(1, width / maxWidth, height / maxHeight);
        
        return {
            "width"  : Math.floor(width  / scaleFactor),
            "height" : Math.floor(height / scaleFactor)
        };
    },
    
    /**
     * Decides how to display video and returns HTML corresponding to that 
     * method
     */
    getVideoPlayerHTML: function (movie, width, height) {
        var downloadURL, downloadLink, youtubeBtn, bbcodeBtn, 
            hekBtn, sswBtn, addthisBtn, linkBtn, linkURL;
        
        // Download
        downloadURL = Helioviewer.api + "?action=downloadMovie&id=" + movie.id + 
                      "&format=mp4&hq=true";

        downloadLink = "<a target='_parent' href='" + downloadURL + 
            "' title='Download high-quality video'>" + 
            "<img class='video-download-icon' " + 
            "src='resources/images/Tango/1321375855_go-bottom.png' /></a>";
        
        // Upload to YouTube
        youtubeBtn = "<a id='youtube-upload-" + movie.id + "' href='#' " + 
            "target='_blank'><img class='youtube-icon' " + 
            "title='Upload video to YouTube' " + 
            "src='resources/images/Social.me/48 " + 
            "by 48 pixels/youtube.png' /></a>";
            
        // Link
        linkURL = helioviewer.serverSettings.rootURL + "/?movieId=" + movie.id;
            
        linkBtn = "<a id='video-link-" + movie.id + "' href='" + linkURL + 
            "' title='Get a link to the movie' " + 
            "target='_blank'><img class='video-link-icon' " + 
            "style='margin-left: 3px' " + 
            "src='resources/images/berlin/32x32/link.png' /></a>";
            
        // BBcode
        bbcodeBtn = "<img class='bbcode-btn' id='bbcode-" + movie.id + 
                    "' src='resources/images/codefisher/bbcode_32.png' " + 
                    "alt='Helioviewer.org Community Forums BBCode " + 
                    "link string' />";
                    
        // SDO Cut-out service (AIA only)
        if (movie.layers.search("SDO,AIA") !== -1) {
            hekBtn = this._generateHEKLink(movie);
        } else {
            hekBtn = "";
        }
        
        // SSW Download Script
        sswBtn = "<img style='margin:0 4px;' src='resources/images/iPhone/ssw_idl_32x32.png' " + 
                 "alt='SolarSoft (SSW) download script />"

        // AddThis
        addthisBtn = "<div style='display:inline; " + 
            "float: right;' id='add-this-" + movie.id + 
            "' class='addthis_default_style addthis_32x32_style'>" +
            "<a class='addthis_button_facebook addthis_32x32_style'></a>" +
            "<a class='addthis_button_twitter addthis_32x32_style'></a>" +
            "<a class='addthis_button_email addthis_32x32_style'></a>" +
            "<a class='addthis_button_google addthis_32x32_style'></a>" +
            "<a class='addthis_button_compact addthis_32x32_style'></a>" +
            "</div>";
        
        // HTML5 Video (H.264 or WebM)
        if ($.support.vp8 || $.support.h264) {
            // Work-around: use relative paths to simplify debugging
            url = movie.url.substr(movie.url.search("cache"));
            
            // IE9 only supports relative dimensions specified using CSS
            return "<video id='movie-player-" + movie.id + "' src='" + url +
                   "' controls preload autoplay" + 
                   " style='width:100%; height: 90%;'></video>" + 
                   "<span class='video-links'>" + downloadLink + youtubeBtn +
                   linkBtn + addthisBtn + "</span>";
        }

        // Fallback (flash player)
        else {
            var url = Helioviewer.api + '?action=playMovie&id=' + movie.id +
                  '&width=' + width + "&height=" + height + 
                  '&format=flv';
            
            return "<div id='movie-player-" + movie.id + "'>" + 
                   "<iframe src=" + url + " width='" + width +  
                   "' height='" + height + "' marginheight=0 marginwidth=0 " +
                   "scrolling=no frameborder=0 style='margin-bottom: 2px;' />" +
                   "<br />" + 
                   "<span class='video-links'>" + downloadLink + youtubeBtn +
                   linkBtn + bbcodeBtn + /*hekBtn + sswBtn + */ addthisBtn + "</span></div>";
        }
    },
    
    /**
     * Generates a link to the HEK cutout service
     * 
     * @todo: Add HMI support
     */
    _generateHEKLink: function (movie) {
        // wavelengths
        var regex, indices = [], wavelengths = [], hekParams,
            baseURL = "http://www.lmsal.com/get_aia_data/?";
        
        regex = new RegExp('SDO,AIA,AIA,', 'g');

        while (regex.exec(movie.layers)){
          indices.push(regex.lastIndex);
        }
        $.each(indices, function(i, index) {
            wavelengths.push(movie.layers.substr(index, 3));
        });

        // query parameters
        hekParams = {
            "startDate" : movie.startDate.substr(0,10),
            "startTime" : movie.startDate.substring(11,16),
            "stopDate"  : movie.endDate.substr(0,10),
            "stopTime"  : movie.endDate.substring(11,16),
            "wavelengths": wavelengths.join(","),
            "width": parseInt(movie.width * movie.imageScale, 10),
            "height": parseInt(movie.height * movie.imageScale, 10),
            "xCen": parseInt((movie.x1 + movie.x2) / 2, 10),
            "yCen": -parseInt((movie.y1 + movie.y2) / 2, 10)
        };
        
        return "<a href='" + baseURL + $.param(hekParams) + 
               "' alt='Download original data from the HEK'>" + 
               "<img style='margin:0 4px;' src='resources/images/iPhone/sdo_cutout_32x32.png' title='HEK Cutout Service' /></a>";
    },
    
    _showBBCode: function(id, width, height) {
            var bbcode = "[hvmovie width=" + width + " height=" + height + 
                         "]" + id + "[/hvmovie]";             
            
            // Display BBCode
            $("#bbcode-dialog").dialog({
                //dialogClass: 'helioviewer-modal-dialog',
                height    : 100,
                width     : $('html').width() * 0.5,
                modal     : true,
                resizable : false,
                title     : "Helioviewer.org Movie BBCode",
                open      : function (e) {
                    //$('.ui-widget-overlay').hide().fadeIn();
                    $(this).find('input').attr('value', bbcode).select();
                }
            });
    },
    
    /**
     * Refreshes status information for movies in the history
     */
    _refresh: function () {
        var status, elapsedTime;
        
        // Update the status information for each row in the history
        $.each(this._manager.toArray(), function (i, item) {
            status = $("#movie-" + item.id).find(".status");

            // For completed entries, display elapsed time
            if (item.status === 2) {
                elapsedTime = Date.parseUTCDate(item.dateRequested)
                                  .getElapsedTime();
                status.html(elapsedTime);                
            // For failed movie requests, display an error
            } else if (item.status === 3) {
                status.html("<span style='color:LightCoral;'>Error</span>");
            // Otherwise show the item as processing
            } else {
                status.html("<span class='processing'>Processing</span>");
            }
        });
    },
    
    /**
     * Validates the request and returns false if any of the requirements are 
     * not met
     */
    _validateRequest: function (roi, layerString) {
        var layers, visibleLayers, message;
        
        layers = layerStringToLayerArray(layerString);
        visibleLayers = $.grep(layers, function (layer, i) {
            var parts = layer.split(",");
            return (parts[4] === "1" && parts[5] !== "0");
        });

        if (visibleLayers.length > 3) {
            message = "Movies cannot have more than three layers. " +
                      "Please hide/remove layers until there are no more " +
                      "than three layers visible.";

            $(document).trigger("message-console-warn", [message]);

            return false;
        }
        return this._super(roi, layerString);
    }
});
