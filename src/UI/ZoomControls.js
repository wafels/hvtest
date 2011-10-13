/**
 * @fileOverview Contains the class definition for an ZoomControls class.
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, 
eqeqeq: true, plusplus: true, bitwise: true, regexp: false, strict: true,
newcap: true, immed: true, maxlen: 80, sub: true */
/*globals $, Class */
"use strict";
var ZoomControls = Class.extend(
    /** @lends ZoomControls.prototype */
    {
    /**
     * @constructs
     * 
     * Creates a new ZoomControl
     */
    init: function (id, imageScale, minImageScale, maxImageScale) {       
        this.id            = id;
        this.imageScale    = imageScale;
        this.minImageScale = minImageScale;
        this.maxImageScale = maxImageScale;
        
        this.zoomInBtn  = $('#zoomControlZoomIn');
        this.zoomSlider = $('#zoomControlSlider');
        this.zoomOutBtn = $('#zoomControlZoomOut');

        this._initSlider();
        this._initEventHandlers();
    },
  
    /**
     * Adjusts the zoom-control slider
     * 
     * @param {Integer} v The new zoom value.
     */
    _onSlide: function (v) {
        this._setImageScale(v);
    },
    
    /**
     * Translates from jQuery slider values to zoom-levels, and updates the 
     * zoom-level.
     * 
     * @param {Object} v jQuery slider value
     */
    _setImageScale: function (v) {
        $(document).trigger('image-scale-changed', [this.increments[v]]);
    },

    /**
     * @description Initializes zoom level slider
     */
    _initSlider: function () {
        var i, description, self = this;
        
        // Zoom-level steps
        this. increments = [];
        for (i = this.minImageScale; i <= this.maxImageScale; i = i * 2) {
            this.increments.push(parseFloat(i.toPrecision(8)));
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
        
        // Add tooltip text
        description = "Drag this handle up and down to zoom in and out of " + 
                      "the displayed image.";
        $("#zoomControlSlider > .ui-slider-handle").attr('title', description);
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
        $("#helioviewer-viewport").mousewheel(
            $.proxy(this._onMouseWheelMove, this));
    }
});
