/**
 * @fileOverview Contains the class definition for an TileLayerManager class.
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 * @see LayerManager, TileLayer
 * @requires LayerManager
 * 
 * TODO (12/3/2009): Provide support for cases where solar center isn't the best
 * sandbox-center, e.g. sub-field images.
 * 
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global LayerManager, TileLayer, Layer, $ */
"use strict";
var TileLayerManager = LayerManager.extend(
/** @lends TileLayerManager.prototype */
{
    /**
     * @constructs
     * @description Creates a new TileLayerManager instance
     */
    init: function (api, observationDate, dataSources, tileSize, viewportScale, maxTileLayers, 
                    servers, savedLayers, urlLayers) {
        this._super();

        this.api           = api;
        this.dataSources   = dataSources;
        this.tileSize      = tileSize;
        this.viewportScale = viewportScale;
        this.maxTileLayers = maxTileLayers;
        this.servers       = servers;        
     
        this.tileVisibilityRange  = {xStart: 0, xEnd: 0, yStart: 0, yEnd: 0};
      
        this._observationDate = observationDate;

        $(document).bind("tile-layer-finished-loading", $.proxy(this.updateMaxDimensions, this))
                   .bind("save-tile-layers",            $.proxy(this.save, this))
                   .bind("add-new-tile-layer",          $.proxy(this.addNewLayer, this))
                   .bind("remove-tile-layer",           $.proxy(this._onLayerRemove, this))
                   .bind("observation-time-changed",    $.proxy(this.updateRequestTime, this));
    },

    /**
     * @description Updates the list of loaded tile layers stored in
     *              cookies
     */
    save: function () {
        var layers = this.toJSON();
        $(document).trigger("save-setting", [ "tileLayers", layers ]);
    },
    
    /**
     * 
     */
    updateTileVisibilityRange: function (vpCoords) {
        var old, ts, self, vp;
        old = this.tileVisibilityRange;
        // Expand to fit tile increment
        ts = this.tileSize;
        vp = {
            top:    vpCoords.top    - ts - (vpCoords.top    % ts),
            left:   vpCoords.left   - ts - (vpCoords.left   % ts),
            bottom: vpCoords.bottom + ts - (vpCoords.bottom % ts),
            right:  vpCoords.right  + ts - (vpCoords.right  % ts)
        };

        // Indices to display (one subtracted from ends to account for "0th" tiles).
        this.tileVisibilityRange = {
            xStart : vp.left / ts,
            yStart : vp.top  / ts,
            xEnd   : (vp.right  / ts) - 1,
            yEnd   : (vp.bottom / ts) - 1
        };

        self = this;
        if (this.tileVisibilityRange !== old) {
            $.each(this._layers, function () {
                this.updateTileVisibilityRange(self.tileVisibilityRange); 
            });
        }
    },
    
    /**
     * 
     */
    adjustImageScale: function (scale) {
        if (this.viewportScale === scale) {
            return; 
        }
        
        this.viewportScale = scale;
        var self = this;
        
        $.each(this._layers, function () {
            this.updateImageScale(scale, self.tileVisibilityRange);
        });
    },

    /**
     * Determines initial opacity to use for a new layer based on which
     * layers are currently loaded
     */
    /**
     * @description Sets the opacity for the layer, taking into account
     *              layers which overlap one another.
     */
    _computeLayerStartingOpacity: function (layeringOrder) {
        var counter = 1;

        $.each(this._layers, function () {
            if (this.layeringOrder === layeringOrder) {
                counter += 1;
            }
        });

        return 100 / counter;
    },

    /**
     * Loads initial layers either from URL parameters, saved user settings, or the defaults.
     */
    _loadStartingLayers: function (layers) {
        var layer, self = this;

        $.each(layers, function (index, params) {
            layer = new TileLayer(index, self._observationDate, self.tileSize, self.viewportScale, 
                                  self.tileVisibilityRange, self.api, params.nickname, params.visible, 
                                  params.opacity, params.server, true);

            self.addLayer(layer);
        });
    },
    
    /**
     * Remove a specified layer
     */
    _onLayerRemove: function (event, id) {
        this.removeLayer(id);
    },
    
    /**
     * Handles observation time changes
     */
    updateRequestTime: function (event, date) {
        this._observationDate = date;
        $.each(this._layers, function (i, layer) {
            this.updateRequestTime(date);
        });
    },
    
    getRequestDateAsISOString: function () {
        return this._observationDate.toISOString();
    }
});