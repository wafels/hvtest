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
    TileLoader, tileCoordinatesToArcseconds */
"use strict";
var HelioviewerTileLayer = TileLayer.extend( 
    /** @lends HelioviewerTileLayer.prototype */
    {    
    /**
     * @constructs
     * @description Creates a new TileLayer
     * @param {Object} viewport Viewport to place the tiles in
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
    init: function (index, date, tileSize, viewportScale, tileVisibilityRange, api, baseURL, observatory, instrument, 
                    detector, measurement, sourceId, name, visible, opacity, layeringOrder, server) {
        this._super(index, date, tileSize, viewportScale, tileVisibilityRange, api, name, visible, opacity, server);
        
        this.layeringOrder = layeringOrder;
        this.baseURL = baseURL;
        
        // Create a random id which can be used to link tile layer with its corresponding tile layer accordion entry
        this.id = "tile-layer-" + new Date().getTime();
        
        this._setupEventHandlers();
        this._loadStaticProperties();

        $(document).trigger("create-tile-layer-accordion-entry", 
            [index, this.id, name, observatory, instrument, detector, measurement, date, false, opacity, visible,
             $.proxy(this.setOpacity, this)
            ]
        );
        
        this.tileLoader = new TileLoader(this.domNode, tileSize, tileVisibilityRange);
        this.image = new JP2Image(observatory, instrument, detector, measurement, sourceId, 
                                  date, server, api, $.proxy(this.onLoadImage, this));
    },
    
    /**
     * Changes data source and fetches image for new source
     */
    updateDataSource: function (
        event, id, observatory, instrument, detector, measurement, sourceId, name, layeringOrder
    ) {
        if (this.id === id) {
            this.name = name;
        
            this.layeringOrder = layeringOrder;
            this.domNode.css("z-index", parseInt(this.layeringOrder, 10) - 10);
        
            this.image.updateDataSource(observatory, instrument, detector, measurement, sourceId);
            $(document).trigger("save-tile-layers");
        }
    },
    
    /**
     * onLoadImage
     */
    onLoadImage: function () {
        this.loaded = true;
        
        this._updateDimensions();
        
        if (this.visible) {
            this.tileLoader.reloadTiles(false);

            // Update viewport sandbox if necessary

            $(document).trigger("tile-layer-finished-loading", [this.getDimensions()]);
        }
        $(document).trigger("update-tile-layer-accordion-entry", 
                            [this.id, this.name, this.opacity, new Date(getUTCTimestamp(this.image.date)), 
                                this.image.filepath, this.image.filename, this.image.server]);
    },
    
    /**
     * @description Returns a formatted string representing a query for a single tile
     * 
     * TODO 02/25/2010: What would be performance loss from re-fetching meta information on server-side?
     */
    getTileURL: function (x, y) {
        var file, format, coordinates, params;

        file   = this.image.filepath + "/" + this.image.filename;
        format = (this.layeringOrder === 1 ? "jpg" : "png");

        coordinates = tileCoordinatesToArcseconds(
            x, y, this.viewportScale, this.image.scale, this.tileSize, this.image.offsetX, 
            this.image.offsetY
        );
        
        params = {
            "action"      : "getTile",
            "uri"         : file,
            "x1"          : coordinates.x1,
            "x2"          : coordinates.x2,
            "y1"          : coordinates.y1,
            "y2"          : coordinates.y2,
            "format"      : format,
            "date"        : this.image.date,
            "imageScale"  : this.viewportScale,
            "size"        : this.tileSize,
            "jp2Width"    : this.image.width,
            "jp2Height"   : this.image.height,
            "jp2Scale"    : this.image.scale,
            "observatory" : this.image.observatory,
            "instrument"  : this.image.instrument,
            "detector"    : this.image.detector,
            "measurement" : this.image.measurement,
            "offsetX"     : this.image.offsetX,
            "offsetY"     : this.image.offsetY                        
        };

        return this.baseURL + "?" + $.param(params);
    },

    /**
     * @description Tests all four corners of the visible image area to see if they are within the 
     *              transparent circle region of LASCO C2 and LASCO C3 images. It uses the distance
     *              formula: d = sqrt( (x2 - x1)^2 + (y2 - y1)^2 ) to find the distance from the center to 
     *              each corner, and if that distance is less than the radius, it is inside the circle region. 
     * @param {Object} radius -- The radius of the circle region in the jp2 image
     * @param {Object} center -- The center coordinate of the jp2 image (jp2Width / 2). 
     * @param {Object} left -- Left coordinate of the selected region
     * @param {Object} top -- Top coordinate of the selected region
     * @param {Object} width -- width of the selected region
     * @param {Object} height -- height of the selected region
     * @return false as soon as it finds a distance outside the radius, or true if it doesn't.
     */
    insideCircle: function (radius, center, left, top, width, height) {
        var right = left + width, bottom = top + height, distance, distX, distY, corners, c;
        corners = {
            topLeft        : {x: left,  y: top},
            topRight    : {x: right, y: top},
            bottomLeft    : {x: left,  y: bottom},
            bottomRight    : {x: right, y: bottom}
        };

        for (c in corners) {
            // Make JSLint happy...
            if (true) {
                distX = Math.pow(center - corners[c].x, 2);
                distY = Math.pow(center - corners[c].y, 2);
                distance = Math.sqrt(distX + distY);
                if (distance > radius) {
                    return false;
                }
            }
        }

        return true;
    },

    /**
     * @description Returns a JSON representation of the tile layer for use by the UserSettings manager
     * @return JSON A JSON representation of the tile layer     
     */
    toJSON: function () {
        return {
            "server"     : this.image.server,
            "observatory": this.image.observatory,
            "instrument" : this.image.instrument,
            "detector"   : this.image.detector,
            "measurement": this.image.measurement,
            "visible"    : this.visible,
            "opacity"    : this.opacity
        };
    },
    
    /**
     * @description Sets up event-handlers to deal with viewport motion
     */
    _setupEventHandlers: function () {
        $(this.domNode).bind('get-tile', $.proxy(this.getTile, this));
        $(document).bind('toggle-layer-visibility',        $.proxy(this.toggleVisibility, this))
                   .bind('tile-layer-data-source-changed', $.proxy(this.updateDataSource, this));
    }
});
