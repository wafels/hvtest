/**
 * @author Jaclyn Beck
 * @fileoverview Contains the code for the Screenshot Builder class. Handles event listeners 
 *                  for the screenshot button and screenshot creation.
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global document, $, Class, window, MediaBuilder, Screenshot */
"use strict";
var ScreenshotBuilder = MediaBuilder.extend(
    /** @lends ScreenshotBuilder.prototype */
    {
    /**
     * @constructs
     * @description Loads default options, grabs mediaSettings, sets up event listener for the screenshot button
     * @param {Object} controller -- the helioviewer class 
     */    
    init: function (viewport, servers, history) {
        this._super(viewport, history);
        
        this.button  = $("#screenshot-button");
        this.id      = "screenshot";
        this.servers = servers;
        
        this._setupDialogAndEventHandlers();
    },

    /**
     * Called after _setupDialogAndEventHandlers is finished initializing the dialog. 
     * Creates event listeners for the "Full Viewport" and "Select Area" buttons in the
     * dialog. "Full Viewport" takes a screenshot immediately, "Select Area" triggers 
     * the ImageSelectTool and provides it with a callback function to takeScreenshot().
     */
    _setupEventListeners: function () {
        var self = this, viewportInfo;
        
        this.fullVPButton     = $("#" + this.id + "-full-viewport");
        this.selectAreaButton = $("#" + this.id + "-select-area");
        
        this._super();
        
        this.fullVPButton.click(function () {
            self.hideDialogs();
            viewportInfo = self.viewport.getViewportInformation();
            self.takeScreenshot(viewportInfo);
        });
        
        this.selectAreaButton.click(function () {
            self.hideDialogs();
            $(document).trigger("enable-select-tool", $.proxy(self.takeScreenshot, self));
        });
        
        // Close any open jGrowl notifications
        this.button.click(function () {
            $(".jGrowl-notification .close").click();
        });
    },
    
    /**
     * @description Gathers all necessary information to generate a screenshot, and then displays the
     *              image when it is ready.
     * @param {Object} visibleCoords -- array containing the heliocentric top, left, bottom, and right 
     *                 coordinates of the visible region 
     */
    takeScreenshot: function (viewportInformation) {
        if (!this.ensureValidArea(viewportInformation)) {
            $(document).trigger("message-console-warn", ["The area you have selected is too small to " +
                    "create a screenshot. Please try again."]);
            return;
        } else if (!this.ensureValidLayers(viewportInformation)) {
            $(document).trigger("message-console-warn", ["You must have at least one layer in your " +
                    "screenshot. Please try again."]);
            return;
        }
        
        var self, callback, params, url, arcsecCoords, id, download, screenshot, server, options;        
        arcsecCoords  = this.toArcsecCoords(viewportInformation.coordinates, viewportInformation.imageScale);
        self = this;

        params = {
            action     : "takeScreenshot",
            layers     : viewportInformation.layers,
            obsDate    : viewportInformation.time,
            imageScale : viewportInformation.imageScale,
            x1         : arcsecCoords.x1,
            x2         : arcsecCoords.x2,
            y1         : arcsecCoords.y1,
            y2         : arcsecCoords.y2,
            display    : false
        };
        
        // Choose server to send request to
        server = Math.floor(Math.random() * (this.servers.length));
        if (server > 0) {
            params.server = server;
        }

        screenshot = new Screenshot(params, (new Date()).getTime());

        // Response handler
        callback = function (response) {
            if (response === null) {
                return;
            } else if (response.error) {
                $(document).trigger("message-console-info", "Unable to create screenshot. Please try again later.");
                return;
            }
            url = response.url;
            
            id = (url).slice(-14, -4);
            // Options for the jGrowl notification. Clicking on the notification will 
            // let the user download the file.                        
            options = {
                sticky: true,
                header: "Your screenshot is ready!",
                open:    function (e, m, o) {
                    screenshot.setURL(url, id);
                    self.hideDialogs();
                    self.history.addToHistory(screenshot);
                    
                    // open callback now called before dom-nodes are added to screen so $.live used
                    $("#screenshot-" + id).live('click', function () {
                        $(".jGrowl-notification .close").click();
                        screenshot.download();
                    });
                }
            };

            // Create the jGrowl notification.
            $(document).trigger("message-console-info", ["<div id='screenshot-" + id +
            "' style='cursor: pointer'>Click here to download. </div>", options]); 
        };
       
        $.get(this.url, params, callback, "json");
    }
});