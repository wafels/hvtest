/**
 * @fileOverview Contains the class definition for a HelioviewerTileLayer class.
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 * @author <a href="mailto:patrick.schmiedel@gmx.net">Patrick Schmiedel</a>
 * @see TileLayerAccordion, Layer
 * @requires Layer
 * 
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, Layer, $, JP2Image, Image, console, getUTCTimestamp, TileLayer, 
    TileLoader, tileCoordinatesToArcseconds, Helioviewer */
"use strict";
var HelioviewerEventLayer = Class.extend( 
    /** @lends HelioviewerEventLayer.prototype */
    {    
    /**
     * @constructs
     * @description 
     * @param {Object} viewport Viewport to place the events in
     * <br>
     * <br><div style='font-size:16px'>Options:</div><br>
     * <div style='margin-left:15px'>
     *      <b>type</b>        - The type of the layer (used by layer manager to differentiate event vs.
     *                           tile layers)<br>
     *      <b>tileSize</b>    - Tilesize to use<br>
     *      <b>source</b>      - Tile source ["database" | "filesystem"]<br>
     *      <b>opacity</b>     - Default opacity<br>
     * </div>
     */
    init: function (index, date, viewportScale, name, visible) {
console.warn([index, date, viewportScale, name, visible]);

        ///this._super(index, date, tileSize, viewportScale, tileVisibilityRange, name, visible, opacity);
        
        // Create a random id which can be used to link event layer with its corresponding event layer accordion entry
        this.id = "event-layer-" + new Date().getTime();

        this._setupEventHandlers();

        $(document).trigger("create-event-layer-accordion-entry", 
            [index, this.id, name, date, false, visible]
        );
/*        
        this.tileLoader = new TileLoader(this.domNode, tileSize, tileVisibilityRange);
        this.image = new JP2Image(observatory, instrument, detector, measurement, sourceId, 
                                  date, $.proxy(this.onLoadImage, this));
*/
    },
    
    /**
     * onLoadImage
     */
    onLoadImage: function () {
/*
        this.loaded = true;
        
        this.layeringOrder = this.image.layeringOrder;

        this._loadStaticProperties();

        this._updateDimensions();
        
        if (this.visible) {
            this.tileLoader.reloadTiles(false);

            // Update viewport sandbox if necessary
            $(document).trigger("tile-layer-finished-loading", [this.getDimensions()]);
        }
        $(document).trigger("update-event-layer-accordion-entry", 
                            [this.id, this.name, this.opacity, new Date(getUTCTimestamp(this.image.date)), 
                                this.image.id]);
*/
    },
    
    /**
     * Returns a formatted string representing a query for a single tile
     */
    getTileURL: function (x, y) {
/*
        var params = {
            "action"      : "getTile",
            "id"          : this.image.id,
            "imageScale"  : this.viewportScale,
            "x"           : x,
            "y"           : y
        };

        return Helioviewer.api + "?" + $.param(params);
*/
    },

    /**
     * @description Returns a JSON representation of the tile layer for use by the UserSettings manager
     * @return JSON A JSON representation of the tile layer     
     */
    toJSON: function () {
/*
        return {
            "observatory": this.image.observatory,
            "instrument" : this.image.instrument,
            "detector"   : this.image.detector,
            "measurement": this.image.measurement,
            "visible"    : this.visible,
            "opacity"    : this.opacity
        };
*/
    },
    
    /**
     * @description Sets up event-handlers to deal with viewport motion
     */
    _setupEventHandlers: function () {

///        $(this.domNode).bind('get-tile', $.proxy(this.getTile, this));
        $(document).bind('toggle-event-visibility', $.proxy(this.toggleVisibility, this));
    }
});
