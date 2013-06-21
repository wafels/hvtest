/**
 * @fileOverview Contains the main application class and controller for Helioviewer.
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
  bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global document, window, $, HelioviewerClient, ImageSelectTool, MovieBuilder, 
  TooltipHelper, HelioviewerViewport, ScreenshotBuilder, ScreenshotHistory,
  MovieHistory, UserVideoGallery, MessageConsole, Helioviewer,
  KeyboardManager, SettingsLoader, TimeControls, FullscreenControl, addthis,
  ZoomControls, ScreenshotManagerUI, MovieManagerUI, assignTouchHandlers, 
  TileLayerAccordion, VisualGlossary, _gaq */
"use strict";
var HelioviewerWebClient = HelioviewerClient.extend(
    /** @lends HelioviewerWebClient.prototype */
    {
    /**
     * Creates a new Helioviewer.org instance.
     * @constructs
     * 
     * @param {Object} urlSettings Client-specified settings to load.
     *  Includes imageLayers, date, and imageScale. May be empty.
     * @param {Object} serverSettings Server settings loaded from Config.ini
     */
    init: function (urlSettings, serverSettings, zoomLevels) {
        var urlDate, imageScale, paddingHeight;
      
        this._super(urlSettings, serverSettings, zoomLevels);

        // Debugging helpers
        if (urlSettings.debug) {
            this._showDebugHelpers();
        }
        
        this._initLoadingIndicator();
        this._initTooltips();
        
        // Determine image scale to use
        imageScale = this._chooseInitialImageScale(Helioviewer.userSettings.get('state.imageScale'), zoomLevels);
        
        // Use URL date if specified
        urlDate = urlSettings.date ? Date.parseUTCDate(urlSettings.date) : false;

        this.timeControls = new TimeControls('#date', '#time', 
            '#timestep-select', '#timeBackBtn', '#timeForwardBtn', urlDate);

        // Get available data sources and initialize viewport
        this._initViewport(this.timeControls.getDate(), $("#header").height() + 1, $("#footer").height() + 1);

        this.messageConsole = new MessageConsole();
        this.keyboard       = new KeyboardManager();
        
        // User Interface components
        this.zoomControls   = new ZoomControls('#zoomControls', imageScale, zoomLevels,
                                               this.serverSettings.minImageScale,
                                               this.serverSettings.maxImageScale);

        this.earthScale     = new EarthScale('#earth-scale-container', imageScale); 

        this.fullScreenMode = new FullscreenControl("#fullscreen-btn", 500);
        
        this.displayBlogFeed(3, false);
        
        this._userVideos = new UserVideoGallery(this.serverSettings.videoFeed);
        
        this.imageSelectTool = new ImageSelectTool();
        
        this._screenshotManagerUI = new ScreenshotManagerUI();
        this._movieManagerUI      = new MovieManagerUI();

        this._glossary = new VisualGlossary(this._setupDialog);

        this._setupDialogs();
        this._initEventHandlers();
        this._setupSettingsUI();
        
        this._displayGreeting();

        // Initialize AddThis
        if (typeof(addthis) !== "undefined") {
            addthis.init();            
        }
    },
    
    /**
     * @description Sets up a simple AJAX-request loading indicator
     */
    _initLoadingIndicator: function () {
        $(document).ajaxStart(function () {
            $('#loading').show();
        })
        .ajaxStop(function () {
            $('#loading').hide();
        });  
    },
    
    /**
     * Add tooltips to static HTML buttons and elements
     */
    _initTooltips: function () {
        // Overide qTip defaults
        $.fn.qtip.defaults = $.extend(true, {}, $.fn.qtip.defaults, {
            show: {
                delay: 1000
            },
            style: {
                classes: 'ui-tooltip-light ui-tooltip-shadow ui-tooltip-rounded'
            }
        });
        
        // Bottom-right tooltips
        $("*[title]:not(.qtip-left)").qtip();
        
        // Bottom-left tooltips
        $(".qtip-left").qtip({
            position: {
                my: "top right",
                at: "bottom middle"
            }
        });
        
        // Top-left tooltips
        $(".qtip-topleft").qtip({
            position: {
                my: "bottom right",
                at: "top middle"
            }
        });
    },
    
    /**
     * Initializes the viewport
     */
    _initViewport: function (date, marginTop, marginBottom) {
        var shadow, updateShadow, self = this;
        
        $(document).bind("datasources-initialized", function (e, dataSources) {
            var tileLayerAccordion = new TileLayerAccordion('#tileLayerAccordion', dataSources, date);
        });
        
        $(document).bind("event-types-initialized", function (e, eventTypes, date) {
            var eventLayerAccordion = new EventLayerAccordion('#eventLayerAccordion', eventTypes, date);
        });
        
        this._super("#helioviewer-viewport-container-outer", date, marginTop, marginBottom);
        
        // Viewport shadow
        shadow = $('#helioviewer-viewport-container-shadow');
        
        // IE shadows don't behave properly during resizing/fullscreen (tested: IE9)
        if ($.browser.msie) {
            shadow.css("box-shadow", "none");
            return;
        }
        
        shadow.show();
        
        updateShadow = function () {
            shadow.width(self.viewport.outerNode.width())
                  .height(self.viewport.outerNode.height()); 
        };
        
        updateShadow();

        // Update shadow when viewport is resized
        $(document).bind("viewport-resized", updateShadow);
    },
    
    /**
     * Adds a movie to the user's history and displays the movie
     * 
     * @param string movieId Identifier of the movie to be shown
     */
    loadMovie: function (movieId) {
        if (!this._movieManagerUI.has(movieId)) {
            this._movieManagerUI.addMovieUsingId(movieId);
        } else {
            this._movieManagerUI.playMovie(movieId);            
        }
    },
    
    /**
     * @description Sets up event-handlers for dialog components
     */
    _setupDialogs: function () {
        var self = this;
        
        // About dialog
        this._setupDialog("#helioviewer-about", "#about-dialog", {
            "title": "Helioviewer - About",
            height : 300
        });

        // Keyboard shortcuts dialog
        this._setupDialog("#helioviewer-usage", "#usage-dialog", {
            "title": "Helioviewer - Usage Tips"
        });
        
        // Settings dialog
        this._setupDialog("#settings-button", "#settings-dialog", {
            "buttons": {
                "Ok": function () {
                    $(this).dialog("close");
                }
            },
            "title": "Helioviewer - Settings",
            "width": 400,
            "height": 'auto',
            "resizable": false,
            "create": function (e) {

            }
        });
    },
    
    /**
     * Sets up event handlers for a single dialog
     */
    _setupDialog: function (btn, dialog, options, onLoad) {
        // Default options
        var defaults = {
            title     : "Helioviewer.org",
            autoOpen  : true,
            draggable : true,
            width     : 480,
            height    : 480
        };
        
        // Button click handler
        $(btn).click(function () {
            var d   = $(dialog),
                btn = $(this);

            if (btn.hasClass("dialog-loaded")) {
                if (d.dialog('isOpen')) {
                    d.dialog('close');
                }
                else {
                    d.dialog('open');
                }
            } else {
                d.load(this.href, onLoad).dialog($.extend(defaults, options));
                btn.addClass("dialog-loaded");
            }
            return false; 
        });
    },
    
    /**
     * Enables some debugging helpers that display extra information to help
     * during development
     */
    _showDebugHelpers: function () {
        var dimensions, win = $(window);
        
        dimensions = $("<div id='debug-dimensions'></div>").appendTo("body");

        win.resize(function (e) {
            dimensions.html(win.width() + "x" + win.height());
        });
    },
    
    /**
     * Configures the user settings form to match the stored values and
     * initializes event-handlers
     */
    _setupSettingsUI: function () {
        var form, dateLatest, datePrevious, autorefresh, self = this;
        
        form         = $("#helioviewer-settings");
        dateLatest   = $("#settings-date-latest");
        datePrevious = $("#settings-date-previous");
        autorefresh  = $("#settings-latest-image");        
        
        // Starting date
        if (Helioviewer.userSettings.get("options.date") === "latest") {
            dateLatest.attr("checked", "checked");    
        } else {
            datePrevious.attr("checked", "checked");
        }
        
        // Auto-refresh
        if (Helioviewer.userSettings.get("options.autorefresh")) {
            autorefresh.attr("checked", "checked");
            this.timeControls.enableAutoRefresh();
        } else {
            autorefresh.removeAttr("checked");
            this.timeControls.disableAutoRefresh();
        }
        
        // Event-handlers
        dateLatest.change(function (e) {
            Helioviewer.userSettings.set("options.date", "latest");
        });
        datePrevious.change(function (e) {
            Helioviewer.userSettings.set("options.date", "previous");
        });
        autorefresh.change(function (e) {
            Helioviewer.userSettings.set("options.autorefresh", e.target.checked);
            if (e.target.checked) {
                self.timeControls.enableAutoRefresh();
            } else {
                self.timeControls.disableAutoRefresh();
            }
        });
        
    },

    /**
     * @description Initialize event-handlers for UI components controlled by the Helioviewer class
     */
    _initEventHandlers: function () {
        var self = this, 
            msg  = "Use the following link to refer to current page:";
        
        $('#link-button').click(function (e) {
            // Google analytics event
            if (typeof(_gaq) !== "undefined") {
                _gaq.push(['_trackEvent', 'Shares', 'Homepage - URL']);
            } 
            self.displayURL(self.toURL(), msg);
        });
        //$('#email-button').click($.proxy(this.displayMailForm, this));
        
        // 12/08/2010: Disabling JHelioviewer JNLP launching until better support is added
        //$('#jhelioviewer-button').click($.proxy(this.launchJHelioviewer, this));

        // Highlight both text and icons for text buttons
        $("#social-buttons .text-btn, #movie-manager-container .text-btn, #image-area-select-buttons > .text-btn, " + 
          "#screenshot-manager-container .text-btn").hover(
            function () {
                $(this).find(".ui-icon").addClass("ui-icon-hover");
            },
            function () {
                $(this).find(".ui-icon").removeClass("ui-icon-hover");
            }
        );
        
        // Fix drag and drop for mobile browsers
        $("#helioviewer-viewport, .ui-slider-handle").each(function () {
            assignTouchHandlers(this);
        });
        
        $("#helioviewer-url-shorten").click(function (e) {
            var url;

            if (e.target.checked) {
                url = $("#helioviewer-short-url").attr("value");   
            } else {
                url = $("#helioviewer-long-url").attr("value");
            }
            
            $("#helioviewer-url-input-box").attr('value', url).select();
        });
    },
    
    /**
     * displays a dialog containing a link to the current page
     * @param {Object} url
     */
    displayURL: function (url, msg) {
        // Get short URL before displaying
        var callback = function (response) {
            $("#helioviewer-long-url").attr("value", url);
            $("#helioviewer-short-url").attr("value", response.data.url);
            
            // Display URL
            $("#helioviewer-url-box-msg").text(msg);
            $("#url-dialog").dialog({
                dialogClass: 'helioviewer-modal-dialog',
                height    : 110,
                width     : $('html').width() * 0.7,
                modal     : true,
                resizable : false,
                title     : "URL",
                open      : function (e) {
                    $("#helioviewer-url-shorten").removeAttr("checked");
                    $('.ui-widget-overlay').hide().fadeIn();
                    $("#helioviewer-url-input-box").attr('value', url).select();
                }
            });
        };
        
        // Get short version of URL and open dialog
        $.ajax({
            url: Helioviewer.api,
            dataType: Helioviewer.dataType,
            data: {
                "action": "shortenURL",
                "queryString": url.substr(this.serverSettings.rootURL.length + 2) 
            },
            success: callback
        });
    },
    
    
    /**
     * Displays a URL to a Helioviewer.org movie
     * 
     * @param string Id of the movie to be linked to
     */
    displayMovieURL: function (movieId) {
        var msg = "Use the following link to refer to this movie:",
            url = this.serverSettings.rootURL + "/?movieId=" + movieId;

        // Google analytics event
        if (typeof(_gaq) !== "undefined") {
            _gaq.push(['_trackEvent', 'Shares', 'Movie - URL']);
        } 
        this.displayURL(url, msg);           
    },
    
    /**
     * @description Displays a form to allow the user to mail the current view to someone
     * 
     * http://www.w3schools.com/php/php_secure_mail.asp
     * http://www.datahelper.com/mailform_demo.phtml
     */
    displayMailForm: function () {
        // Get URL
        var html, url = this.toURL();
        
        html = '<div id="helioviewer-url-box">' +
               'Who would you like to send this page to?<br>' + 
               '<form style="margin-top:15px;">' +
               '<label>From:</label>' +
               '<input type="email" placeholder="from@example.com" class="email-input-field" ' +
               'id="email-from" value="Your Email Address"></input><br>' +
               '<label>To:</label>' +
               '<input type="email" placeholder="to@example.com" class="email-input-field" id="email-from" ' + 
               'value="Recipient\'s Email Address"></input>' +
               '<label style="float:none; margin-top: 10px;">Message: </label>' + 
               '<textarea style="width: 370px; height: 270px; margin-top: 8px;">Check this out:\n\n' + url +
               '</textarea>' + 
               '<span style="float: right; margin-top:8px;">' + 
               '<input type="submit" value="Send"></input>' +
               '</span></form>' +
               '</div>';
        
    },
    
    /**
     * Displays recent news from the Helioviewer Project blog
     */
    displayBlogFeed: function (n, showDescription, descriptionWordLength) {
        var url, dtype, html = "";
        
        url = this.serverSettings.newsURL;
        
        // For remote queries, retrieve XML using JSONP
        if (Helioviewer.dataType === "jsonp") {
            dtype = "jsonp text xml";
        } else {
            dtype = "xml";
        }
        
        $.getFeed({
            url: Helioviewer.api,
            data: {"action": "getNewsFeed"},
            dataType: dtype,
            success: function (feed) {
                var link, date, more, description;
                
                // Display message if there was an error retrieving the feed
                if (!feed.items) {
                    $("#social-panel").append("Unable to retrieve news feed...");
                    return;
                }

                // Grab the n most recent articles
                $.each(feed.items.slice(0, n), function (i, a) {
                    link = "<a href='" + a.link + "' alt='" + a.title + "' target='_blank'>" + a.title + "</a><br />";
                    date = "<div class='article-date'>" + a.updated.slice(0, 26) + "UTC</div>";
                    html += "<div class='blog-entry'>" + link + date;
                    
                    // Include description?
                    if (showDescription) {
                        description = a.description;

                        // Shorten if requested
                        if (typeof descriptionWordLength === "number") {
                            description = description.split(" ").slice(0, descriptionWordLength).join(" ") + " [...]";
                        }
                        html += "<div class='article-desc'>" + description + "</div>";
                    }
                    
                    html += "</div>";
                });
                
                more = "<div id='more-articles'><a href='" + url +
                       "' alt='The Helioviewer Project Blog'>More...</a></div>";
                
                $("#social-panel").append(html + more);
            }
        });
    },
    
    /**
     * Launches an instance of JHelioviewer
     * 
     * Helioviewer attempts to choose a 24-hour window around the current observation time. If the user is
     * currently browsing near the end of the available data then the window for which the movie is created
     * is shifted backward to maintain it's size.
     */
    launchJHelioviewer: function () {
        var endDate, params;
        
        // If currently near the end of available data, shift window back
        endDate = new Date(Math.min(this.timeControls.getDate().addHours(12), new Date()));

        params = {
            "action"    : "launchJHelioviewer",
            "endTime"   : endDate.toISOString(),
            "startTime" : endDate.addHours(-24).toISOString(),
            "imageScale": this.viewport.getImageScaleInKilometersPerPixel(),
            "layers"    : this.viewport.serialize()
        };
        window.open(Helioviewer.api + "?" + $.param(params), "_blank");
    },

    /**
     * Displays welcome message on user's first visit
     */
    _displayGreeting: function () {
        if (!Helioviewer.userSettings.get("notifications.welcome")) {
            return;
        }

        $(document).trigger("message-console-info", 
            ["<b>Welcome to Helioviewer.org</b>, a solar data browser. First time here? Be sure to check out our " +
             "<a href=\"http://wiki.helioviewer.org/wiki/Helioviewer.org_User_Guide_2.4.0\" " +
             "class=\"message-console-link\" target=\"_blank\"> User Guide</a>.", {sticky: true}]
        );
        
        Helioviewer.userSettings.set("notifications.welcome", false);
    },
    
    /**
     * Returns the current observation date
     * 
     * @return {Date} observation date
     */
    getDate: function () {
        return this.timeControls.getDate();
    },
    
    /**
     * Returns the currently loaded layers
     * 
     * @return {String} Serialized layer string
     */
    getLayers: function () {
        return this.viewport.serialize();
    },
    
    /**
     * Returns the currently selected event layers
     * 
     * @return {String} Serialized event layer string
     */
    getEvents: function () {
        return this.viewport.serializeEvents();
    },
    
    /**
     * Returns the currently selected event layers
     * 
     * @return {String} Serialized event layer string
     */
    getEventsLabels: function () {
        return Helioviewer.userSettings.get("state.eventLabels");
    },
    
    /**
     * Returns a string representation of the layers which are visible and
     * overlap the specified region of interest
     */
    getVisibleLayers: function (roi) {
        return this.viewport.getVisibleLayers(roi);
    },
    
    /**
     * Returns the currently displayed image scale
     *
     * @return {Float} image scale in arc-seconds/pixel
     */
    getImageScale: function () {
        return this.viewport.getImageScale();
    },
    
    /**
     * Returns the top-left and bottom-right coordinates for the viewport region of interest
     * 
     * @return {Object} Current ROI 
     */
    getViewportRegionOfInterest: function () {
        return this.viewport.getRegionOfInterest();
    },
    
    /**
     * Builds a URL for the current view
     *
     * @TODO: Add support for viewport offset, event layers, opacity
     * 
     * @returns {String} A URL representing the current state of Helioviewer.org.
     */
    toURL: function (shorten) {
        // URL parameters
        var params = {
            "date"        : this.viewport.getMiddleObservationTime().toISOString(),
            "imageScale"  : this.viewport.getImageScale(),
            "centerX"     : Helioviewer.userSettings.get("state.centerX"),
            "centerY"     : Helioviewer.userSettings.get("state.centerY"), 
            "imageLayers" : encodeURI(this.viewport.serialize()), 
            "eventLayers" : encodeURI(this.viewport.serializeEvents()),
            "eventLabels" : Helioviewer.userSettings.get("state.eventLabels")
        };
        
        return this.serverSettings.rootURL + "/?" + decodeURIComponent($.param(params));
    },
    
    /**
     * Sun-related Constants
     */
    constants: {
        au: 149597870700, // 1 au in meters (http://maia.usno.navy.mil/NSFA/IAU2009_consts.html)
        rsun: 695700000  // radius of the sun in meters (JHelioviewer)
    }
});
