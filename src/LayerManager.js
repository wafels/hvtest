/**
 * @fileOverview Contains class definition for a simple layer manager
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $ */
"use strict";
var LayerManager = Class.extend(
    /** @lends LayerManager.prototype */
    {
    /**
     * @constructs
     * @description Creates a new LayerManager
     * @param {Object} A Rseference to the main application controller
     */
    init: function (controller) {
        this.controller = controller;
        this._layers    = [];
    },

    /**
     * @description Add a new layer
     */
    addLayer: function (layer) {
        this._layers.push(layer);
    },
   
    /**
     * @description Gets the number of layers currently loaded 
     * @return {Integer} Number of layers present.
     */
    size: function () {
        return this._layers.length;
    },

    /**
     * @description Removes a layer
     * @param {Object} The layer to remove
     * TODO: update sandbox dimensions
     */
    removeLayer: function (layer) {
        layer.domNode.remove();
        this._layers = $.grep(this._layers, function (e, i) {
            return (e.id !== layer.id);
        });
    },
    
    /**
     * @description Reload layers (For tile layers, finds closest image)
     */
    reloadLayers: function () {
        $.each(this._layers, function () {
            this.reload();
        });
    },

    /**
     * @description Resets each of the layers
     */
    resetLayers: function () {
        $.each(this._layers, function () {
            this.reset(true);
        });
    },
    
    /**
     * @description Iterates through layers
     */
    each: function (fn) {
        $.each(this._layers, fn);
    },
    
    /**
     * @description Returns a string representation of the layers currently being displayed
     */
    toString: function () {
        var layers = "";

        $.each(this._layers, function () {
            layers += "[" + this.toString() + "],";
        });
        
        // Remove trailing comma
        layers = layers.slice(0, -1);
        
        return layers;
    },
    
    /**
     * @description Returns a JSON representation of the layers currently being displayed
     */
    toJSON: function () {
        var layers = [];
        
        $.each(this._layers, function () {
            layers.push(this.toJSON());
        });
        
        return layers;       
    }
});
