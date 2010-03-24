/**
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 * @fileOverview Contains the class definition for an EventLayer class.
 * @see Layer, TileLayer
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Layer, $, EventMarker, navigator */
"use strict";
var EventLayer = Layer.extend(
    /** @lends EventLayer.prototype */
    {
    /**
     * @description Default EventLayer options<br><br>
     * <strong>Notes:</strong><br><br>
     * "windowSize" refers to the size of the window (in seconds) from which events should be displayed.<br>
     */
    defaultOptions: {
        type: 'EventLayer',
        layeringOrder: -1,
        displayLabels: false,
        windowSize: 43200,
        eventMarkerOffset: {
            top: 10,
            left: 0
        }
    },

    /**
     * @constructs
     * @description Creates a new EventLayer.
     * @param {Object} viewport A reference to Helioviewer's viewport.
     * @param {Object} options The event layer settings.
     */
    init: function (controller, options) {
        $.extend(this, this.defaultOptions);
        $.extend(this, options);
        
        this._super(controller);

        this.id = 'eventlayer' + new Date().getTime();

        this.events = [];

        this.domNode = $('<div class="event-layer"></div>').appendTo(this.viewport.movingContainer);
    
        // Add to eventLayer Accordion (if is not already there).
        this.eventAccordion.addLayer(this);
        
        this.queryEvents();
    },

    /**
     * @description Sends an AJAX request to get a list of events.
     */
    queryEvents: function () {
        var params, callback, self = this;
        
        params = {
            action     : 'getEvents',
            date       : this.viewport.controller.date.toISOString(),
            windowSize : this.windowSize,
            catalogs   : this.catalog
        };
        
        callback = function (data) {
            if (data) {
                self.displayEvents(data);
            }
        };
        
        $.post(this.viewport.controller.api, params, callback, "json");
    },

    /**
     * @description Place-holder for an event-handler which will handle viewportMove events.
     */
    viewportMove: function () {

    },
    
    /**
     * @description Removes all events from the screen and clears event container
     */
    clear: function () {
        $.each(this.events, function () {
            this.remove(); 
        });
        this.events = [];
    },

    /**
     * @description Draws events to screen
     * @param {JSON} jsonEvents An JSON array of event meta-information
     */
    displayEvents: function (jsonEvents) {
        var self = this,
            date = this.viewport.controller.getDate(),
            rsun = this.viewport.getRSun();
        
        // Stylize each event marker based on it's the event type
        $.each(jsonEvents, function () {
            self.events.push(new EventMarker(self, this, date, rsun, {offset: self.eventMarkerOffset}));
        });
    },
    
    /**
     * @description Updates the icon associated with the EventLayer.
     * @param {String} newIcon New icon to use.
     */
    updateIcon: function (newIcon) {
        var type, url;
        
        type = this.eventAccordion.eventCatalogs[this.catalog].eventType.replace(/ /g, "_");

        url = 'url(resources/images/events/small-' + newIcon + '-' + type + '.png)';
        
        this.icon = "small-" + newIcon;
        
        // Update event markers
        $.each(this.events, function () {
            this.marker.css('background', url);
        });
        
        // Update event accordion icon
        $('#event-icon-' + this.id).css('background', url);
        
        // Update user's stored settings
        this.eventAccordion.eventIcons[this.catalog] = "small-" + newIcon;
        this.viewport.controller.userSettings.set('eventIcons', this.eventAccordion.eventIcons);
    },

    /**
     * @description Toggle event label visibility
     */
    toggleLabelVisibility: function () {
        this.displayLabels = !this.displayLabels;
        $.each(this.events, function () {
            this.toggleLabel(); 
        });
    },

    /**
     * @description Reload event-layer
     */
    reload: function () {
        this.clear();
        this.queryEvents();
    },

    /**
     * @description Reset event-layer
     */
    reset: function () {
        var rsun = this.viewport.getRSun();

        $.each(this.events, function () {
            this.refresh(rsun);
        });
    },
    
    // 2009/07/06 TODO
    toString: function () {
    },    
    toJSON: function () {
    }
});
