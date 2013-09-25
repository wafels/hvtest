/**
 * @fileOverview Contains the main application class and controller for Helioviewer.
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
  bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global document, window, $, HelioviewerClient, ImageSelectTool, MovieBuilder, 
  TooltipHelper, HelioviewerViewport, ScreenshotBuilder, ScreenshotHistory,
  MovieHistory, UserVideoGallery, MessageConsole, Helioviewer,
  KeyboardManager, SettingsLoader, TimeControls, FullscreenControl,
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

        this.earthScale     = new ImageScale(); 

        this.fullScreenMode = new FullscreenControl("#fullscreen-btn", 500);
        this.moreScreenMode = new MorescreenControl("#morescreen-btn", 500);
        
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
            "title"  : "Helioviewer - About",
            "height" : 400
        });

        // Keyboard shortcuts dialog
        this._setupDialog("#helioviewer-usage", "#usage-dialog", {
            "title": "Helioviewer - Usage Tips"
        });
        
        // Science Data Script Download dialog
        this._scienceDialog("#science-data-button", "#science-data-dialog", {
            "buttons": {
                "Generate Script": function () {
                    self.getSciDownloadScript($('form#helioviewer-science-data-script'));
                    $(this).dialog("close");
                }
            },
            "title": "Science Data Download Script Generation",
            "width": 400,
            "height": 'auto',
            "resizable": false,
            "create": function (e) {

            }
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
            height    : 400
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
     * Sets up event handlers for a single dialog
     */
    _scienceDialog: function (btn, dialog, options, onLoad) {
        // Default options
        var defaults = {
            title     : "Helioviewer.org",
            autoOpen  : true,
            draggable : true,
            width     : 480,
            height    : 400,
            position  : ['top',80]
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
            msg  = "Use the following link to refer to current page:",
            btns;
        
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
        
        btns = $("#social-buttons .text-btn, " +
                 "#movie-manager-container .text-btn, " + 
                 "#image-area-select-buttons > .text-btn, " + 
                 "#screenshot-manager-container .text-btn, " + 
                 "#event-container .text-btn");
        btns.live("mouseover",
            function () {
                $(this).find(".ui-icon").addClass("ui-icon-hover");
            });
        btns.live("mouseout",
            function () {
                $(this).find(".ui-icon").removeClass("ui-icon-hover");
            });
        
        $('#science-data-button').click($.proxy(this.sciDataForm, this));
             
        
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
    
    sciDataForm: function (e, params) {
        var contents, html, tileLayers, tileAccordions, subDates=false, 
            subDate, subTime, subDate, subTime, source='', self=this;
        
        if ( typeof params == 'undefined' ) {
            params = {
                "fovType"     :'viewport',
                "startDate"   : self.timeControls.getDate(),
                "endDate"     : self.timeControls.getDate(),
                "imageLayers" : Helioviewer.userSettings.get("state.tileLayers"), // array
                "eventLayers" : this.viewport.serializeEvents(),  // string
                "eventLayersVisible" : Helioviewer.userSettings.get("state.eventLayerVisible"),
                "imageScale"  : Helioviewer.userSettings.get("state.imageScale"), 
                "x0"          : Helioviewer.userSettings.get("state.centerX"), 
                "y0"          :-Helioviewer.userSettings.get("state.centerY"), 
                "width"       : this.viewport.dimensions['width'], 
                "height"      : this.viewport.dimensions['height']
            };
        }
        
        switch (params['fovType']) {
            case 'viewport':
                source = ' - Current View';
                break;
            case 'movie':
                source = ' - Movie';
                break;
            case 'hek':
                source = ' - Feature/Event';
                break;
        }
        $('#ui-dialog-title-science-data-dialog').html('Science Data Download Script'+source);
              
        if ( typeof params.imageLayers == 'string' ) {
            tileLayers = Array();
            $.each(params.imageLayers.split('],['), function(i,layer) {
                layer = layer.replace(/[\[\]]/g,'');
                tileLayers.push(parseLayerString(layer));
            });
            params.imageLayers = tileLayers;
        }
        
        if ( params.startDate.toUTCString() == params.endDate.toUTCString() ) {
            subDates = true;
        }
        
        tileAccordions = $('#TileLayerAccordion-Container').find('.dynaccordion-section .timestamp');
        
        $('#helioviewer-script-contents').html('<legend>Datasets to Include:</legend><div id="helioviewer-script-data-sources" style="padding: 2px 0 12px 0;"></div>');
            
        $.each(params.imageLayers, function(i,layer) {
            var cssname='', nickname='', valname='', prev='';
            
            $.each(Array(layer.observatory,layer.instrument,layer.detector,layer.measurement), function(i,l) {
                if ( prev != l ) {
                    nickname += l + ' ';
                }
                cssname += l + '-';
                valname += l + ',';
                prev = l;
            });
            
            cssname  = cssname.substring(0, cssname.length - 1);
            nickname = nickname.substring(0, nickname.length - 1);
            valname  = valname.substring(0, valname.length - 1);
                       
            html = '<div style="clear:both;">' + 
                       '<div style="float: left; padding-top: 4px;">' +
                           '<input type="checkbox" name="'+valname+'" id="'+cssname+'" value="true" />' +
                       '</div>' +
                       '<div style="float: left;">' +
                           '<div><label for="'+cssname+'">'+nickname+'</label></div>';

            if ( subDates ) {
                subDate = $(tileAccordions[i]).html().split(' ');
                subTime = subDate[1];
                subDate = subDate[0];
            
                html +=    '<div>' + 
                               '<span class="sub-date" style="font-size: 10px;">' + 
                                   subDate + ' ' + subTime + ' UTC' + 
                               '</span>' + 
                               '<input type="hidden" id="'+cssname+'-startDate" name="'+cssname+'-startDate" value="'+subDate+'" />' + 
                               '<input type="hidden" id="'+cssname+'-startTime" name="'+cssname+'-startTime" value="'+subTime+'" />' + 
                           '</div>';
            }
            
            html+=     '</div>' +
                   '</div>';
                             
            $('#helioviewer-script-data-sources').append(html);
            if ( layer.visible ) {
                $('#'+cssname).attr('checked','checked');
            }
        });
        
        
        if ( params.eventLayers.length > 0 ) {
            html = '<div style="clear:both;">' + 
                       '<div style="float: left; padding-top: 4px;">' +
                           '<input type="checkbox" name="hek" id="science-data-source-hek" value="true" />' +
                       '</div>' +
                       '<div style="float: left;">' +
                           '<label for="science-data-source-hek">Heliophysics Event Knowledgebase (HEK)</label>';
            
            if ( subDates ) { 
                html +=    '<div class="sub-date">' +
                               '<span style="font-size: 10px;">' + 
                                   params.startDate.toUTCDateString() + ' ' + 
                                   params.startDate.toUTCTimeString() + ' UTC' +
                               '</span>' + 
                               '<input type="hidden" name="hek-startDate" value="'+params.startDate.toUTCDateString()+'" />' +
                               '<input type="hidden" name="hek-startTime" value="'+params.startDate.toUTCTimeString()+'" />' +
                           '</div>';
            }
            
            html +=    '</div>' +
                   '</div>';
        
            $('#helioviewer-script-data-sources').append(html);
            if ( params.eventLayersVisible == true ) {
                $('#science-data-source-hek').attr('checked','checked');
                $('#helioviewer-script-data-sources').append(
                    $('<input type="hidden" name="eventLayers" value="'+params.eventLayers+'" />')
                );
            }
        }
        
        $('#helioviewer-script-data-sources').append('<br />');
        
        contents = $('#helioviewer-script-contents');
        
        contents.append(
            $('<input type="hidden" name="fovType" value="'+params.fovType+'" />')
        );
        
        if ( "x0" in params && "y0" in params && "width" in params && "height" in params ) {
            contents.append(
                $('<input type="hidden" name="x0" value="'+params.x0+'" />')
            );
            contents.append(
                $('<input type="hidden" name="y0" value="'+params.y0+'" />')
            );
            contents.append(
                $('<input type="hidden" name="width" value="'+params.width+'" />')
            );
            contents.append(
                $('<input type="hidden" name="height" value="'+params.height+'" />')
            );
        }
        else if ( "x1" in params && "y1" in params && "x2" in params && "y2" in params ) {
            contents.append(
                $('<input type="hidden" name="x1" value="'+params.x1+'" />')
            );
            contents.append(
                $('<input type="hidden" name="y1" value="'+params.y1+'" />')
            );
            contents.append(
                $('<input type="hidden" name="x2" value="'+params.x2+'" />')
            );
            contents.append(
                $('<input type="hidden" name="y2" value="'+params.y2+'" />')
            );
        }
        // HEK data to be used to determine SDO cutout service parameters
        else if ( "hpc_x"         in params && "hpc_y"         in params && 
                  "hpc_bbox_ll_x" in params && "hpc_bbox_ll_y" in params &&
                  "hpc_bbox_ur_x" in params && "hpc_bbox_ur_y" in params &&
                  "rot_from_time" in params && "kb_archivid"   in params ) {
            
            contents.append(
                $('<input type="hidden" name="hpc_x" value="'+params.hpc_x+'" />')
            );
            contents.append(
                $('<input type="hidden" name="hpc_y" value="'+params.hpc_y+'" />')
            );
            contents.append(
                $('<input type="hidden" name="hpc_bbox_ll_x" value="'+params.hpc_bbox_ll_x+'" />')
            );
            contents.append(
                $('<input type="hidden" name="hpc_bbox_ll_y" value="'+params.hpc_bbox_ll_y+'" />')
            );
            contents.append(
                $('<input type="hidden" name="hpc_bbox_ur_x" value="'+params.hpc_bbox_ur_x+'" />')
            );
            contents.append(
                $('<input type="hidden" name="hpc_bbox_ur_y" value="'+params.hpc_bbox_ur_y+'" />')
            );
            contents.append(
                $('<input type="hidden" name="rot_from_time" value="'+params.rot_from_time+'" />')
            );
            contents.append(
                $('<input type="hidden" name="kb_archivid" value="'+params.kb_archivid+'" />')
            );
        }
        
        if ( "movieId" in params ) {
            contents.append(
                $('<input type="hidden" name="movieId" value="'+params.movieId+'" />')
            );
        }
        
        if ( subDates ) {
            $('#helioviewer-script-dates span').css('margin-left','19px');
            
            $('#science-data-dates-custom').show();
            $('#science-data-dates-checkbox').prop('checked',false);
            $.each( $('#dates-custom .dimmable'), function(i,n) {
                $(n).addClass('form-disabled');
            });
            
            $('#helioviewer-script-dates #startDate').val(params.startDate.toUTCDateString()).prop('disabled',true);
            $('#helioviewer-script-dates #startTime').val(params.startDate.toUTCTimeString()).prop('disabled',true);
            
            $('#helioviewer-script-dates #endDate').val(params.startDate.toUTCDateString()).prop('disabled',true);
            $('#helioviewer-script-dates #endTime').val(params.startDate.toUTCTimeString()).prop('disabled',true);
            
            $('#science-data-dates-checkbox').click(function(e,i) {
                
                if ( $('#science-data-dates-checkbox').attr('checked') ) {           
                    $('.sub-date').hide(200);
                    
                    $('#helioviewer-script-dates #startDate').prop('disabled',false);
                    $('#helioviewer-script-dates #startTime').prop('disabled',false);
            
                    $('#helioviewer-script-dates #endDate').prop('disabled',false);
                    $('#helioviewer-script-dates #endTime').prop('disabled',false);
                    
                    $.each( $('#dates-custom .dimmable'), function(i,n) {
                        $(n).removeClass('form-disabled');
                    });
                }
                else {
                    $('.sub-date').show(200);
                
                    $('#helioviewer-script-dates #startDate').prop('disabled',true);
                    $('#helioviewer-script-dates #startTime').prop('disabled',true);
            
                    $('#helioviewer-script-dates #endDate').prop('disabled',true);
                    $('#helioviewer-script-dates #endTime').prop('disabled',true);
                    
                    $.each( $('#dates-custom .dimmable'), function(i,n) {
                        $(n).addClass('form-disabled');
                    });

                }
            });
        }
        else {
            $('#helioviewer-script-dates span').css('margin-left','0');
            
            $('#helioviewer-script-dates #startDate').val(params.startDate.toUTCDateString()).prop('disabled',false);
            $('#helioviewer-script-dates #startTime').val(params.startDate.toUTCTimeString()).prop('disabled',false);
            
            $('#helioviewer-script-dates #endDate').val(params.endDate.toUTCDateString()).prop('disabled',false);
            $('#helioviewer-script-dates #endTime').val(params.endDate.toUTCTimeString()).prop('disabled',false);
            
            $('#science-data-dates-custom').hide();
            $('#science-data-dates-checkbox').prop('checked',true);
            $.each( $('#dates-custom .dimmable'), function(i,n) {
                $(n).removeClass('form-disabled');
            });
            
            $('#helioviewer-script-dates').show();
        }
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
     * Download science data associated with the current Viewport
     */
    getSciDownloadScript: function (form) {     
        
        var ///jGrowlOpts, 
            ///body, 
            self = this, 
            endDate, 
            imageLayers='', eventLayers='',
            endTime='', startTime='',
            apiRequest;     
        
        $.each(form.find('#helioviewer-script-contents input:checkbox:checked'), function(i,layer) {
            var imageLayer = $(layer).attr('name');
            if ( imageLayer == 'hek' ) {
                eventLayers = form.find("input[name*='eventLayers']").val();
            }
            else {
                imageLayers += '['+
                                   $(layer).attr('name')+','+
                                   form.find('#'+$(layer).attr('id')+'-startDate').val()+','+
                                   form.find('#'+$(layer).attr('id')+'-startTime').val()+
                               ']';
            }
        });
        imageLayers = imageLayers.replace(/\]\[/g,'],[');
                
        startTime = form.find('input#startDate').val()+'T'+form.find('input#startTime').val()+'Z';
        startTime = startTime.replace(/\//g,'-');
        
        // Download link
        apiRequest = Helioviewer.api + 
            "?action=getSciDataScript" +
            "&fovType="    +encodeURIComponent(form.find("input[name*='fovType']").val()) +
            "&lang="       +encodeURIComponent(form.find('input:radio:checked').val()) +
            "&imageLayers="+encodeURIComponent(imageLayers) +
            "&eventLayers="+encodeURIComponent(eventLayers) +
            "&imageScale=" +encodeURIComponent(this.viewport.getImageScale()) +  // arcsec/pixel
            "&startTime="  +encodeURIComponent(startTime);
                
        if ( form.find('#science-data-dates-checkbox').attr('checked') == 'checked' && 
             form.find('input#endDate').val() != '' && 
             form.find('input#endTime').val() != '' ) {
            
            endTime   = form.find('input#endDate').val()+'T'+form.find('input#endTime').val()+'Z';
            endTime   = endTime.replace(/\//g,'-');
            
            apiRequest += "&endTime="+encodeURIComponent(endTime);  // arcsec/pixel
        }   
        
        if ( form.find("input[name*='x0']").val() ) {
            apiRequest += "&x0="    +encodeURIComponent(form.find("input[name*='x0']").val())+  
                          "&y0="    +encodeURIComponent(form.find("input[name*='y0']").val())+
                          "&width=" +encodeURIComponent(form.find("input[name*='width']").val())+
                          "&height="+encodeURIComponent(form.find("input[name*='height']").val()); // pixels
        }
        else if ( form.find("input[name*='x1']").val() ) {
            apiRequest += "&x1="+encodeURIComponent(form.find("input[name*='x1']").val())+
                          "&y1="+encodeURIComponent(form.find("input[name*='y1']").val())+
                          "&x2="+encodeURIComponent(form.find("input[name*='x2']").val())+
                          "&y2="+encodeURIComponent(form.find("input[name*='y2']").val()); // arcsec
        }
        else if ( form.find("input[name*='fovType']").val().toLowerCase() == 'hek' ) {
            apiRequest += "&hpc_x="        +encodeURIComponent(form.find("input[name*='hpc_x']").val())+  
                          "&hpc_y="        +encodeURIComponent(form.find("input[name*='hpc_y']").val())+
                          "&hpc_bbox_ll_x="+encodeURIComponent(form.find("input[name*='hpc_bbox_ll_x']").val())+
                          "&hpc_bbox_ll_y="+encodeURIComponent(form.find("input[name*='hpc_bbox_ll_y']").val())+
                          "&hpc_bbox_ur_x="+encodeURIComponent(form.find("input[name*='hpc_bbox_ur_x']").val())+
                          "&hpc_bbox_ur_y="+encodeURIComponent(form.find("input[name*='hpc_bbox_ur_y']").val())+
                          "&rot_from_time="+encodeURIComponent(form.find("input[name*='rot_from_time']").val())+
                          "&kb_archivid="  +encodeURIComponent(form.find("input[name*='kb_archivid']").val());
        }

        if ( form.find("input[name*='movieId']").length == 1 ) {
            apiRequest += "&movieId="+encodeURIComponent(form.find("input[name*='movieId']").val());
        }
                       
        location.href = apiRequest;
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
