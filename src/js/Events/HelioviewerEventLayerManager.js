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
                'HEK', true, true)
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
        var eventLayer, basicParams, self = this;
        
        // Add the event layer
        this.addEventLayer(
            new HelioviewerEventLayer(this._eventLayers.length, this._requestDate, this.viewportScale, 
                'HEK', true, Helioviewer.userSettings.get("state.eventLabels"))
        );
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
        return str;
    }
});