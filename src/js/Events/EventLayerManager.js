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

        this._eventLayers   = [];
        this._events        = [];
        this._eventMarkers  = [];
        this._treeContainer = $("#eventJSTree");
        this._eventTypes    = {};
        this._jsTreeData    = [];
        this._date          = date;

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
    },

    /**
     * Loads initial layers either from URL parameters, saved user settings, or the defaults.
     */
    _loadStartingLayers: function (eventLayers) {
        var eventLayer, self = this;

        $.each(eventLayers, function (index, params) {
/// This interface needs updating...
            eventLayer = new EventLayer(index, self._requestDate, self.tileSize, self.viewportScale, 
                                  self.tileVisibilityRange, params.nickname, params.visible, 
                                  params.opacity, true);

            self.addEventLayer(eventLayer);
        });
    },
    
    /**
     * Remove a specified layer
     */
    _onLayerRemove: function (event, id) {
        this.removeLayer(id);
    },
    
    getRequestDateAsISOString: function () {
        return this._requestDate.toISOString();
    }
});