/**
 * @fileOverview Contains the class definition for an EventLayerManager class.
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 * @see EventManager
 * @requires EventManager
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Helioviewer, LayerManager, TileLayer, Layer, $ */
"use strict";
var EventLayerManager = EventManager.extend(
/** @lends EventLayerManager.prototype */
{
    /**
     * @constructs
     * @description Creates a new EventLayerManager instance
     */
    init: function (requestDate, defaultEventTypes, viewportScale, rsun, 
                    savedEventLayers, urlEventLayers) {


        this._super(defaultEventTypes, requestDate, rsun);

        this._requestDate      = requestDate;
        this.defaultEventTypes = defaultEventTypes;
        this.viewportScale     = viewportScale;

        this.tileVisibilityRange  = {xStart: 0, xEnd: 0, yStart: 0, yEnd: 0};
      

        $(document).bind("event-layer-finished-loading", $.proxy(this.updateMaxDimensions, this))
                   .bind("save-event-layers",            $.proxy(this.save, this))
                   .bind("add-new-event-layer",          $.proxy(this.addNewLayer, this))
                   .bind("remove-event-layer",           $.proxy(this._onLayerRemove, this));
    },

    /**
     * @description Updates the list of loaded event layers stored in
     *              localStorage and cookies
     */
    save: function () {
        var eventLayers = this.toJSON();
        Helioviewer.userSettings.set("state.eventLayers", eventLayers);
console.warn(['EventLayers.save() eventLayers:',eventLayers]);
    },
    
    /**
     * 
     */
    updateTileVisibilityRange: function (vpCoords) {
alert("Worth investigating when/why EventLayerManager.updateTileVisibilityRange() is called...");
/*
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
*/
    },
    
    /**
     * 
     */
    adjustImageScale: function (scale) {
alert("Worth investigating when/why EventLayerManager.adjustImageScale() is called...");
/*
        if (this.viewportScale === scale) {
            return; 
        }
        
        this.viewportScale = scale;
        var self = this;
        
        $.each(this._layers, function () {
            this.updateImageScale(scale, self.tileVisibilityRange);
        });
*/
    },

    /**
     * Determines initial opacity to use for a new layer based on which
     * layers are currently loaded
     */
    /**
     * Sets the opacity for the layer, taking into account layers which overlap 
     * one another.
     * 
     * @param layeringOrder int  The layer's stacking order
     * @param layerExists   bool Whether or not the layer already exists
     */
    _computeLayerStartingOpacity: function (layeringOrder, layerExists) {
alert("EventLayerManager._computeLayerStartingOpacity() is probably not a useful method.");
/*
        var counter;

        // If the layer has not been added yet, start counter at 1 instead of 0
        if (layerExists) {
            counter = 0;    
        } else {
            counter = 1;
        }
        

        $.each(this._layers, function () {
            if (this.layeringOrder === layeringOrder) {
                counter += 1;
            }
        });

        return 100 / counter;
*/
    },
    
    /**
     * Returns a list of the layers which overlap the current viewport ROI
     */
    _getVisibleLayers: function () {
alert("EventLayerManager._getVisibleLayers() may be useful...");        
    },

    /**
     * Loads initial layers either from URL parameters, saved user settings, or the defaults.
     */
    _loadStartingLayers: function (eventLayers) {
alert("BEGIN EventLayerManager._loadStartingLayers()");
        var eventLayer, self = this;

        $.each(eventLayers, function (index, params) {
/// This interface needs updating...
            eventLayer = new EventLayer(index, self._requestDate, self.tileSize, self.viewportScale, 
                                  self.tileVisibilityRange, params.nickname, params.visible, 
                                  params.opacity, true);

            self.addEventLayer(eventLayer);
        });
alert("END EventLayerManager._loadStartingLayers()");
    },
    
    /**
     * Remove a specified layer
     */
    _onLayerRemove: function (event, id) {
        this.removeLayer(id);
    },
    
    getRequestDateAsISOString: function () {
        return this._requestDate.toISOString();
    },
    
    /**
     * Returns a string representation of the event layers
     */
    serialize: function () {
alert("EventLayerManager.serialize() is probably not a useful method.");
//        return this._stringify(this._eventLayers);
    },
    
    /**
     * Creates a string representation of an array of layers
     */
    _stringify: function (eventLayers) {
alert("EventLayerManager._stringify() is probably not a useful method.");
/*
        var eventLayerString = "";
        
        // Get a string representation of each layer that overlaps the ROI
        $.each(eventLayers, function () {
            eventLayerString += "[" + this.serialize() + "],";
        });
        
        // Remove trailing comma and return
        return eventLayerString.slice(0, -1);
*/
    },
    
    /**
     * Tests all four corners of the visible image area to see if they are 
     * within the transparent circle region of LASCO/COR coronagraph images.
     *  
     * Uses the distance formula:
     * 
     *     d = sqrt( (x2 - x1)^2 + (y2 - y1)^2 )
     * 
     * ...to find the distance from the center to each corner, and if that 
     * distance is less than the radius, it is inside the circle region.
     *  
     * @param {Object} radius -- The radius of the circle region in the image
     * @param {Object} top -- Top coordinate of the selected region 
     * @param {Object} left -- Left coordinate of the selected region
     * @param {Object} width -- width of the selected region
     * @param {Object} height -- height of the selected region
     * 
     * @return false as soon as it finds a distance outside the radius, or 
     * true if it doesn't.
     */
    _insideCircle: function (radius, top, left, bottom, right) {
alert("EventLayerManager._insideCircle() is probably not a useful method.");
/*
        var corners, corner, dx2, dy2;
        
        // Corners of region of interest
        corners = {
            topLeft     : {x: left,  y: top},
            topRight    : {x: right, y: top},
            bottomLeft  : {x: left,  y: bottom},
            bottomRight : {x: right, y: bottom}
        };

        // Check each corner to see if it lies within the circle
        for (corner in corners) {
            // dx^2, dy^2
            dx2 = Math.pow(corners[corner].x, 2);
            dy2 = Math.pow(corners[corner].y, 2);
            
            // dist = sqrt(dx^2 + dy^2)
            if (Math.sqrt(dx2 + dy2) > radius) {
                return false;
            }
        }

        return true;
*/
    },
    
    /**
     * Returns a list of layers which are currently visible and overlap the
     * specified region of interest by at least 10px
     * 
     * @param array roi Region of interest in pixels
     */
    getVisibleLayers: function(roi) {
alert("EventLayerManager.getVisibleLayers() may be useful...");
/*
        var rsunAS, rsun, radii, layers = [], threshold = 10, self = this;
        
        // Coronagraph inner circle radii in arc-seconds
        // TODO 2012/04/11: Compute using header info? are hv-tags 
        // (rocc_inner, etc) hard-coded or dynamic? Since COR images vary
        // a lot over time, conservative estimate used for now.
        radii = {
            "LASCO C2": 2.415,
            "LASCO C3": 4.62,
            "COR1-A": 1.45,
            "COR2-A": 2.6,
            "COR1-B": 1.45,
            "COR2-B": 2.6
        };
        
        // Solar radius at 1au (TODO: compute for layer)
        rsunAS = 959.705;
        
        $.each(this._layers, function (i, layer) {
            // Check visibility
            if (!layer.visible || layer.opacity <= 5) {
                return;
            }
            // Check overlap
            if ((roi.right <= -layer.dimensions.left + threshold) ||
                (roi.bottom <= -layer.dimensions.top + threshold) ||
                (roi.left >= layer.dimensions.right - threshold) ||
                (roi.top >= layer.dimensions.bottom - threshold)) {
                return;
            }
            
            // Check coronagraph overlap
            if (layer.name in radii) {
                // radius of outer edge of occulting disk in pixels
                rsun = rsunAS * radii[layer.name] / layer.viewportScale;
                
                if (self._insideCircle(rsun, roi.top, roi.left, roi.bottom, roi.right)) {
                    return;
                }
            }
            layers.push(layer);
        });
        
        return this._stringify(layers);
*/
    }
});