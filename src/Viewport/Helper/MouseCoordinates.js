/**
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global $, Helioviewer, Class */
"use strict";
var MouseCoordinates = Class.extend(
    /** @lends MouseCoordinates.prototype */
    {
    enabled : true,
    visible : false,

    /**
     * @constructs
     */
    init: function (imageScale, showMouseCoordsWarning) {
        this.imageScale      = imageScale;
        this.warnMouseCoords = showMouseCoordsWarning;
        
        this.container       = $('#mouse-coords');
        this.innerViewport   = $('#helioviewer-viewport-container-inner');
        this.sandbox         = $("#sandbox");
        this.movingContainer = $("#moving-container");

        this.mouseCoords  = "disabled";
        this.mouseCoordsX = $('#mouse-coords-x');
        this.mouseCoordsY = $('#mouse-coords-y');
        
        this._initEventHandlers();
    },
    
    _initEventHandlers: function () {
        $(document).bind('toggle-mouse-coords', $.proxy(this.toggleMouseCoords, this));
    },
    
    enable: function () {
        this.enabled = true;
    },
    
    disable: function () {
        this.enabled = false;
    },
    
    updateImageScale: function (imageScale) {
        this.imageScale = imageScale;
    },
    
    /**
     * @description Get the mouse-coords relative to top-left of the viewport frame
     * @param {Int} screenx X-dimensions of the user's screen
     * @param {Int} screeny Y-dimensions of the user's screen
     */
    getRelativeCoords: function (screenx, screeny) {
        var offset = this.innerViewport.offset();
        
        return {
            x: screenx - offset.left - 1,
            y: screeny - offset.top - 1
        };
    },
     
    /**
     * @description Toggles mouse-coords visibility
     * 
     * TODO (2009/07/27) Disable mouse-coords display during drag & drop
     */
    toggleMouseCoords: function () {
        // Case 1: Disabled -> Enabled
        if (this.mouseCoords === "disabled") {
            this.mouseCoords = "enabled";
            this.container.toggle();
        }

        // Case 3: Polar Coords -> Disabled
        else {
            this.container.toggle();
            this.mouseCoords = "disabled";
        }
        
        this._checkWarning();
        this._reassignEventHandlers();
    },
    
    /**
     * Determines which event handler should be used, if any, to display mouse coordinates to the user
     */
    _reassignEventHandlers: function () {
        // Cartesian & Polar coords
        if (this.mouseCoords !== "disabled") {

            // Clear old values
            this.mouseCoordsX.empty();
            this.mouseCoordsY.empty();
               
            $(document).bind('mousemove', $.proxy(this.updateMouseCoords, this));
            //this.movingContainer.bind('mousemove', $.proxy(this.updateMouseCoords, this));  
               
            // TODO: Execute handler once immediately if mouse is over viewport to show new coords     
            // Use trigger to fire mouse move event and then check to make sure mouse is within viewport?         
        } else {
            $(document).unbind('mousemove', this.updateMouseCoords);
            //this.movingContainer.unbind('mousemove', this.updateMouseCoords);
        }
    },
    
    /**
     * Checks to see whether a warning message should be displayed to the user
     */
    _checkWarning: function () {
        // Warn once
        if (this.warnMouseCoords === true) {
            var warning = "<b>Note:</b> Mouse-coordinates should not be used " +
                          "for science operations!";
            $(document).trigger("message-console-log", [warning]);
            Helioviewer.userSettings.set("notifications.coordinates", false);
            this.warnMouseCoords = false;
        }
    },
    
    /**
     * updateMouseCoords. Displays cartesian coordinates by default.
     */
    updateMouseCoords: function (event) {
        var cartesian;
        
        if (!this.enabled) {
            return;
        }
            
        // Compute coordinates relative to top-left corner of the viewport
        cartesian = this.computeMouseCoords(event.pageX, event.pageY);
        this.mouseCoordsX.html("x: " + cartesian.x + " &prime;&prime;"); 
        this.mouseCoordsY.html("y: " + cartesian.y + " &prime;&prime;");
    },
    
    /**
     * @description Computes the scaled mouse coordinates relative to the size and center of the Sun.
     * 
     *  Explanation:
     * 
     *    X = location of mouse-pointer
     *    V = viewport top-left corner
     *    S = sandbox top-left corner
     *    M = moving container top-let corner
     *    
     *  Each of the two-letter abbreviations represents the vector <x,y> going from one
     *  location to the other. See wiki documentation below for more details.
     * 
     * @see http://helioviewer.org/wiki/Co-ordinate_System_I
     */
    computeMouseCoords: function (screenX, screenY) {
        var VX, negSV, SV, SM, MX, scale, x, y;
        
        // Coordinates realtive to viewport top-left corner
        VX = this.getRelativeCoords(screenX, screenY);
        negSV = this.sandbox.position();
        SV = {
            x: -negSV.left,
            y: -negSV.top
        };
        SM = this.movingContainer.position();                    
        MX = {
            x: VX.x + (SV.x - SM.left),
            y: VX.y + (SV.y - SM.top)
        };
          
        //scale
        scale = this.imageScale;
        x = Math.round((scale * MX.x));
        y = - Math.round((scale * MX.y));

        // Return scaled coords
        return {
            x: x,
            y: y
        };
    }
});