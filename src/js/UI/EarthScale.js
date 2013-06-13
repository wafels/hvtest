/**
 * @fileOverview Contains the class definition for an EarthScale class.
 * @author <a href="mailto:jeffrey.stys@nasa.gov">Jeff Stys</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, 
eqeqeq: true, plusplus: true, bitwise: true, regexp: false, strict: true,
newcap: true, immed: true, maxlen: 80, sub: true */
/*globals $, Class */
"use strict";
var EarthScale = Class.extend(
    /** @lends EarthScale.prototype */
    {
    /**
     * @constructs
     * 
     * Creates a new EarthScale
     */
    init: function (id, imageScale) {
        this.id                     = id;
        this.imageScale             = imageScale;
        this.rsunInArcseconds       = 959.705;
        this.earthSunRadiusFraction = 6367.5 / 695500.;  // km
        this.earthDiameterInPixels  = 2 * this.earthSunRadiusFraction * (this.rsunInArcseconds / this.imageScale);
                
        this._initScale();
        this._initEventHandlers();
    },
  
    

    /**
     * @description Initializes earth scale indicator
     */
    _initScale: function () {
        /*
        var domNode, self = this;
            
        if ( $('#earth-container').length > 0 ) {
           return;
        }
        
        $('<div id="earth-container"></div>').appendTo("#helioviewer-viewport-container-inner");
        
        domNode = $('#earth-container');
        domNode.css({
            'position': 'absolute', 
            'bottom':'0',
            'z-index' :  999,
            'width' : '60px',
            'height': '60px',
            'background-color':'black',
            'border-top': '1px solid #333',
            'border-right': '1px solid #333',
            'border-top-right-radius' : '6px',
            'box-shadow':'0px 0px 5px black'
            // Move these to style.css
        });
        $('<img id="earthScale" src="resources/images/earth.png" style="width: '+earthScaleInPixels+'px;height: '+earthScaleInPixels+'px;position: absolute;left: 50%;   top: 50%;margin-left: -'+earthScaleInPixels/2+'px;   margin-top: -'+earthScaleInPixels/2+'px;" />').appendTo("#earth-container");
        $('<div style="color: white; text-align: center; font-size: 10px; padding: 3px 0 0 0;">Earth Scale</div>').appendTo("#earth-container");
        $(document).bind("earth-scale",   $.proxy(this.earthRescale, this));
       */
    },

    /**
     * @description Responds to click of Earth scale indicator
     */    
    _onEarthBtnClick: function () {
        
        alert('_onEarthBtnClick');
        /*
        var index = this.zoomSlider.slider("value") + 1;
        
        if (this.increments[index] >= this.minImageScale) {
            this.zoomSlider.slider("value", index);
            this._setImageScale(index);
        }
        */
    },
    
    /**
     * @description Initializes earth scale control-related event-handlers
     */
    _initEventHandlers: function () {
        
        this.EarthBtn = $('#dne');
        
        this.EarthBtn.click($.proxy(this._onEarthBtnClick, this));
    }
    
});
