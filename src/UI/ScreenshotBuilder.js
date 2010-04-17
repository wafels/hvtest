/**
 * @author Jaclyn Beck
 * @fileoverview Contains the code for the Screenshot Builder class. Handles event listeners for the screenshot button and
 *                  screenshot creation.
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global document, $, Class, window */
"use strict";
var ScreenshotBuilder = Class.extend(
    /** @lends ScreenshotBuilder.prototype */
    {

    /**
     * @constructs
     * @description Loads default options, grabs mediaSettings, sets up event listener for the screenshot button
     * @param {Object} controller -- the helioviewer class 
     */    
    init: function (controller) {
        $.extend(this); //?
        this.button        = $("#screenshot-button");
        this.building     = false;
        this.viewport    = controller.viewport;
        this.controller = controller;
        
        this.mediaSettings = this.controller.mediaSettings;
        
        var self = this, visibleCoords;
        this.button.click(function () {
            if (self.building) {
                $(document).trigger("message-console-log", ["A link to your screenshot will be available shortly."]);
            }
            else {
                visibleCoords = self.viewport.getHCViewportPixelCoords();
                self.takeScreenshot(visibleCoords);
            }
        });
    },
    
    /**
     * @description Gathers all necessary information to generate a screenshot, and then displays the
     *              image when it is ready.
     * @param {Object} visibleCoords -- array containing the heliocentric top, left, bottom, and right 
     *                 coordinates of the visible region 
     */
    takeScreenshot: function (visibleCoords) {
        var self, callback, params, imgWidth, imgHeight, url, mediaSettings, download, options, filename,        
        helioviewer = this.controller;
        
        // Refresh the settings in case something has changed.
        mediaSettings     = this.mediaSettings;
        mediaSettings.getSettings(visibleCoords);

        this.building = true;

        imgWidth  = mediaSettings.width; 
        imgHeight = mediaSettings.height; 

        self = this;
        
        params = {
            action     : "takeScreenshot",
            layers     : (mediaSettings.layerNames).join("/"),
            obsDate    : mediaSettings.startTime,
            imageScale : mediaSettings.imageScale,
            edges      : mediaSettings.edgeEnhance,
            sharpen    : mediaSettings.sharpen,
            imageSize  : imgWidth + "," + imgHeight,
            filename   : mediaSettings.filename,
            quality    : mediaSettings.quality
        };
        
        callback = function (url) {
            self.building = false;

            // If the response is an error message instead of a url, show the message
            if (url === null) {
                //mediaSettings.shadowboxWarn(transport.responseText);
            }
            
            else {        
                // Options for the jGrowl notification. Clicking on the notification will 
                // let the user download the file.                        
                options = {
                    sticky: true,
                    header: "Your screenshot is ready!",
                    open:    function (e, m) {
                        download = $('#screenshot-' + filename);
                        
                        download.click(function () {
                            window.open('api/index.php?action=downloadFile&url=' + url, '_parent');
                        });
                    }
                };

                // Create the jGrowl notification.
                $(document).trigger("message-console-info", ["<div id='screenshot-" + filename +
                "' style='cursor: pointer'>Click here to download. </div>", options]);
            }
        };

        $.post('api/index.php', params, callback, 'json');
    }
});