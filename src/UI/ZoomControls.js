/**
 * @fileOverview Contains the class definition for an ZoomControls class.
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 * @author <a href="mailto:patrick.schmiedel@gmx.net">Patrick Schmiedel</a>
 * @see  The <a href="http://helioviewer.org/mediawiki-1.11.1/index.php?title=Zoom_Levels_and_Observations">HelioViewer Wiki</a>
 *       for more information on zoom levels.
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $ */
"use strict";
var ZoomControls = Class.extend(
    /** @lends ZoomControls.prototype */
    {
    /**
     * @constructs
     * @description Creates a new ZoomControl
     */
    init: function (id, imageScale, minImageScale, maxImageScale) {       
        this.id            = id;
        this.imageScale    = imageScale;
        this.minImageScale = minImageScale;
        this.maxImageScale = maxImageScale;

        this._buildUI();
        this._initSlider();
        this._setupTooltips();
        this._initEventHandlers();
    },

    /**
     * @description Sets up tooltips for zoom controls
     */
    _setupTooltips: function () {
        var description, targets;
        
        description = "Drag this handle up and down to zoom in and out of the displayed image.";
        $("#zoomControlSlider > .ui-slider-handle").attr("title", description);
        
        targets = "#zoomControlZoomOut, #zoomControlZoomIn, #zoomControlHandle, #zoomControlSlider > .ui-slider-handle";
        $(document).trigger('create-tooltip', [targets]);
    },
  
    /**
     * @description Adjusts the zoom-control slider
     * @param {Integer} v The new zoom value.
     */
    _onSlide: function (v) {
        this._setImageScale(v);
    },
    
    /**
     * @description Translates from jQuery slider values to zoom-levels, and updates the zoom-level.
     * @param {Object} v jQuery slider value
     */
    _setImageScale: function (v) {
        $(document).trigger('image-scale-changed', [this.increments[v]]);
    },
    
    /**
     * @description sets up zoom control UI element
     */
    _buildUI: function () {
        this.zoomInBtn  = $('<div id="zoomControlZoomIn" title="Zoom in.">+</div>');
        this.zoomSlider = $('<div id="zoomControlSlider"></div>');
        this.zoomOutBtn = $('<div id="zoomControlZoomOut" title="Zoom out.">-</div>');

        var sliderContainer = $('<div id="zoomSliderContainer"></div>').append(this.zoomSlider);

        $(this.id).append(this.zoomInBtn).append(sliderContainer).append(this.zoomOutBtn);
    },
    
    /**
     * @description Initializes zoom level slider
     */
    _initSlider: function () {
        var i, self = this;
        
        // Zoom-level steps
        this. increments = [];
        for (i = this.minImageScale; i <= this.maxImageScale; i = i * 2) {
            this.increments.push(i);
        }

        // Reverse orientation so that moving slider up zooms in
        this.increments.reverse();
       
        // Initialize slider
        this.zoomSlider.slider({
            slide: function (event, slider) {
                self._onSlide(slider.value);
            },
            min: 0,
            max: this.increments.length - 1,
            orientation: 'vertical',
            value: $.inArray(this.imageScale, this.increments)
        });
    },

    /**
     * @description Responds to zoom in button click
     */    
    _onZoomInBtnClick: function () {
        var index = this.zoomSlider.slider("value") + 1;
        
        if (this.increments[index] >= this.minImageScale) {
            this.zoomSlider.slider("value", index);
            this._setImageScale(index);
        }
    },
    
    /**
     * @description Responds to zoom out button click
     */        
    _onZoomOutBtnClick: function () {
        var index = this.zoomSlider.slider("value") - 1;
        
        if (this.increments[index] <= this.maxImageScale) {
            this.zoomSlider.slider("value", index);
            this._setImageScale(index);
        }
    },
    
    /**
     * Handles mouse-wheel movements
     * 
     * @param {Event} event Event class
     */
    _onMouseWheelMove: function (e, delta) {
        if (delta > 0) {
            this.zoomInBtn.click();
        } else {
            this.zoomOutBtn.click();
        }
        return false;
    },
    
    /**
     * @description Initializes zoom control-related event-handlers
     */
    _initEventHandlers: function () {
        this.zoomInBtn.click($.proxy(this._onZoomInBtnClick, this));
        this.zoomOutBtn.click($.proxy(this._onZoomOutBtnClick, this));
        $("#helioviewer-viewport").mousewheel($.proxy(this._onMouseWheelMove, this));
        
    }
});

/**
 * Helper function to hide the zoom controls
 */
var hideZoomControls = function () {
    $("#zoomSliderContainer").hide("fast");
    $("#zoomControlZoomIn").hide("fast");
    $("#zoomControlZoomOut").hide("fast");
};

/**
 * Helper function to show the zoom controls
 */
var showZoomControls = function () {
    $("#zoomSliderContainer").show("fast");
    $("#zoomControlZoomIn").show("fast");
    $("#zoomControlZoomOut").show("fast");
};