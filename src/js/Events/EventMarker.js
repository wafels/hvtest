/**
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 * @fileoverview Contains the class definition for an EventMarker class.
 * @see EventLayer
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $, getUTCTimestamp */
"use strict";
var EventMarker = Class.extend(
    /** @lends EventMarker.prototype */
    {
    /**
     * @constructs
     * @description Creates an EventMarker
     * @param {Object} eventLayer EventLayer associated with the EventMarker
     * @param {JSON} event Event details
     */    
    init: function (parentFRM, event) {
        $.extend(this, event);
        this.behindSun = false;
        this.parentFRM  = parentFRM;  
      
        //Create dom-nodes for event marker, details label, and details popup
        this.createMarker();
        //this.createPopup();
        //this.createLabel();
        
        $(document).bind("replot-event-markers", $.proxy(this.refresh, this));
    },
    
    
    /**
     * @description Creates the marker and adds it to the viewport
     */
    createMarker: function () {
        var markerURL;

        // Create container
        this.pos = {
            x:  this.hpc_x / Helioviewer.userSettings.settings.state.imageScale,
            y: -this.hpc_y / Helioviewer.userSettings.settings.state.imageScale
        };
        
        this.container = $('<div class="event" style="position: absolute; left: ' + this.pos.x + 'px; top: ' + this.pos.y + 'px;"></div>');
        this.parentFRM.domNode.append(this.container);
        markerURL = 'resources/images/events/hek/'+this.event_type.toLowerCase()+'_icon.gif';
        this.marker = $('<img class="event-marker" src="'+markerURL+'" style="width: 18px; height: 18px;" title="'+this.concept+'" />');
        this.container.append(this.marker);
    },
    
    /**
     * @description Creates a small block of text which is displayed when the user pressed the "d" key ("details").
     */
/*    createLabel: function () {
        var labelText, eventDate, timeDiff, display;

        display = this.eventLayer.viewport.controller.eventLayers.getLabelVisibility();

        labelText = this.getLabelText(this.type);

        //Determine time difference between desired time and event time
        eventDate = getUTCTimestamp(this.time.startTime);
        timeDiff  = eventDate - this.appDate.getTime();
        
        //Create a hidden node with the events ID to be displayed upon user request
        this.label = $('<div class="event-label" style="display: ' + display + ';">' + labelText + '</div>');
        
        //Adjust style to reflect time difference
        if (timeDiff < 0) {
            this.label.addClass("timeBehind");
        }
        else if (timeDiff > 0) {
            this.label.addClass("timeAhead");
        }
        
        this.container.append(this.label);
    },
*/    
    /**
     * @description Choses the text to display in the details label based on the type of event
     * @param {String} eventType The type of event for which a label is being created
     */
/*    getLabelText: function (eventType) {
        var labelText = null;
        
        switch (eventType) {

        case "Active Region":
            labelText = this.eventId;
            break;
        case "CME":
            labelText = this.time.startTime;
            break;
        case "Type II Radio Burst":
            labelText = this.time.startTime;
            break;
        default:
            labelText = this.time.startTime;
            break;
        }
        
        return labelText;
    },
*/    
    /**
     * @description Creates a popup which is displayed when the event marker is clicked
     */
    createPopup: function () {
        var content/*, tooltips = this.parentFRM.eventManager.controller.tooltips*/;

        // Add required parameters
        content = "<div class='event-popup-container'><strong>" + this.eventId + "</strong><br>" +
                  "<p>" + this.frm_name + "</p><br><strong>start:</strong> " + this.event_starttime + "<br>" +
                  "<strong>end:</strong> " + this.event_endtime + "<br><br>";
        
        
        content += "<strong>event_coord1</strong> " + this.event_coord1 + "<br />";
        content += "<strong>event_coord2</strong> " + this.event_coord2 + "<br />";
        // Add custom parameters
        /*
        $.each(this.event, function (key, value) {
            content += "<strong>" + key + ":</strong> " + value;
            if (key.search(/angle/i) !== -1) {
                content += "&deg;";
            }
            
            content += "<br>";
        });
        */
        // Create popup dialog        
        ///tooltips.createDialog(this.container, this.type, content);
    },
 
    /**
     * @description attempts to select an optimal orientation for the event marker popup
     * (Not yet fully implemented...)
     */
    chooseOrientation: function () {
        var dir, vpCoords, vpWidth, vpHeight, markerCoords, rel, EST_HEIGHT, EST_WIDTH;
        
        vpCoords     = $("#helioviewer-viewport").offset();
        markerCoords = this.container.offset();
        
        rel = {
            top : vpCoords.top  - markerCoords.top,
            left: vpCoords.left - markerCoords.left
        };
        
        // Estimated marker size
        EST_WIDTH  = 250;
        EST_HEIGHT = 250;
        
        vpWidth  = $("#helioviewer-viewport").width();
        vpHeight = $("#helioviewer-viewport").height();
        
        if ((vpHeight - rel.top) < EST_HEIGHT) {
            if ((vpWidth - rel.left) < EST_WIDTH) {
                dir = "bottomRight";
            }
            else { 
                dir = "bottomLeft";
            }
        }
        else {
            if ((vpWidth - rel.left) < EST_WIDTH) {
                dir = "topRight";
            }
            else {
                dir = "topLeft";
            }
        }
        
        return dir;
    },
    
    /**
     * @description Removes the EventMarker
     */
    remove: function () {
        this.container.qtip("destroy");
        this.container.unbind();
        this.container.remove();
    },

     /**
      * @description Redraws event
      */
    refresh: function () {
        this.pos = {
            x:  this.hpc_x / Helioviewer.userSettings.settings.state.imageScale,
            y: -this.hpc_y / Helioviewer.userSettings.settings.state.imageScale
        };
        this.container.css({
            'left': this.pos.x + 'px',
            'top' : this.pos.y + 'px'
        });
    },
    
    setVisibility: function (visible) {
        if (visible) {
            this.marker.show();
        }
        else {
            this.marker.hide();
        }
    }
    
});
