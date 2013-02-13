/**
 * @fileOverview Contains the class definition for a HelioviewerEventLayerManager class.
 * @author <a href="mailto:jeffrey.stys@nasa.gov">Jeff Stys</a>
 * @see EventLayerManager, EventManager
 * @requires EventLayerManager
 * 
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Helioviewer, HelioviewerEventLayer, EventLayerManager, parseLayerString, $ */
"use strict";
var HelioviewerEventLayerManager = EventLayerManager.extend(
/** @lends HelioviewerEventLayerManager.prototype */
{
    /**
     * @constructs
     * @description Creates a new TileLayerManager instance
     */
    init: function (requestDate, defaultEventTypes, viewportScale, rsun, 
                    savedEventLayers, urlEventLayers) {

        this._super(requestDate, defaultEventTypes, viewportScale, rsun, 
                    savedEventLayers, urlEventLayers);
// Currently the default layer types are fetched/loaded in EventManager._queryDefaultEventTypes()
// Not here.
        this._loadStartingLayers(defaultEventTypes);
    },

    /**
     * @description Adds a layer that is not already displayed
     */
    addNewLayer: function () {

        // Add the event layer
        this.addEventLayer(
            new HelioviewerEventLayer(this._eventLayers.length, this._requestDate, this.viewportScale, 
                'HEK', true)
        );

        // Don't save the event layer here.  We're just adding the accordion stuff, 
        // not checking checkboxes.  Differs from how tile layers are managed.
        /// this.save();
    },
    
    /**
     * Loads initial layers either from URL parameters, saved user settings, or the defaults.
     */
    _loadStartingLayers: function (layers) {
// Currently the default layer types are fetched/loaded in EventManager._queryDefaultEventTypes()
// Not here.
console.warn(["HelioviewerEventLayerManager._loadStartingLayers()", layers]);
        var eventLayer, basicParams, self = this;
        
        // Add the event layer
        this.addEventLayer(
            new HelioviewerEventLayer(this._eventLayers.length, this._requestDate, this.viewportScale, 
                'HEK', true)
        );
/*

        $.each(layers, function (index, params) {
            basicParams = self.dataSources[params.observatory][params.instrument][params.detector][params.measurement];
            $.extend(params, basicParams);

            eventLayer = new HelioviewerEventLayer(this._eventLayers.length, this._requestDate, this.viewportScale, 'HEK', true);

            self.addEventLayer(eventLayer);
        });
*/
    },
    
    /**
     * Checks to see if all of the layers have finished loading for the first time,
     * and if so, loads centering information from previous session
     */
    _onViewportUpdated: function () {
/*
        var numLayers = Helioviewer.userSettings.get("state.tileLayers").length;
        this._layersLoaded += 1;
        
        if (!this._finishedLoading && this._layersLoaded === numLayers) {
            $(document).trigger("load-saved-roi-position");
        }
*/
    },

    /**
     * Updates the data source for a tile layer after the user changes one
     * of its properties (e.g. observatory or instrument)
     */
    /**
     * Changes data source and fetches image for new source
     */
    _updateDataSource: function (
        event, id, observatory, instrument, detector, measurement, sourceId, name, layeringOrder
    ) {
/*
        var opacity, layer;
        
        // Find layer that is being acted on
        $.each(this._layers, function () {
            if (this.id === id) {
                layer = this; 
            }
        });

        // Update name
        layer.name = name;
        
        // Update layering order and z-index
        layer.layeringOrder = layeringOrder;
        layer.domNode.css("z-index", parseInt(layer.layeringOrder, 10) - 10);
        
        // Update associated JPEG 2000 image
        layer.image.updateDataSource(observatory, instrument, detector, measurement, sourceId );
   
        // Update opacity (also triggers save-tile-layers event)
        opacity = this._computeLayerStartingOpacity(layer.layeringOrder, true);
        $("#opacity-slider-track-" + id).slider("value", opacity);
*/
    },

    /**
     * Checks to make sure requested data source exists
     * 
     * Note: Once defaults provided by getDataSource are used, this function will
     * no longer be necessary.
     */
    checkDataSource: function (obs, inst, det, meas) {
/*
        if (this.dataSources[obs] !== undefined) {
            if (this.dataSources[obs][inst] !== undefined) {
                if (this.dataSources[obs][inst][det] !== undefined) {
                    if (this.dataSources[obs][inst][det][meas] !== undefined) {
                        return true;
                    }
                }
            }
        }
        
        return false;
*/
    },
    
    /**
     * @description Generate a string of URIs for use by JHelioviewer
     */
    toURIString: function () {
        var str = "";

        $.each(this._eventLayers, function () {
            str += this.uri + ",";
        });

        // Remove trailing comma
        str = str.slice(0, -1);
alert('HeliviewerEventLayerManager.toURIString(): '+str);    
        return str;
    }
});