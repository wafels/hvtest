/**
 * @author Jeff Stys <jeffrey.stys@nasa.gov>
 * @author Keith Hughitt <keith.hughitt@nasa.gov>
 * @author Jonathan Harper
 * @fileOverview Handles event queries, data formatting, and storage
 * 
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global $, window, LayerManager, EventType, EventFeatureRecognitionMethod, Event, 
  EventTimeline, EventTree, getUTCTimestamp */

"use strict";

//var EventManager = LayerManager.extend({
var EventManager = Class.extend({
    /**
     * Class to manage event queries and data storage.<br><br>
     * 
     * Creates a class which queries the HEK API for event data as the 
     * application date and time step changes.  This data is stored in
     * the EventType, EventFeatureRecognitionMethod, and Event classes.
     * Queries are optimized to minimize first the number of queries and
     * second the time window/filesize.<br><br>
     *    
     * @constructs
     */
    init: function (defaultEventTypes, date, rsun) {
        this._eventLayers = [];
        this._events = [];
        this._maxLayerDimensions = {width: 0, height: 0};
        
        this._treeContainer = $("#eventJSTree");
        this._eventTypes   = {};
        ///this._timelineData = {};
        this._jsTreeData   = [];
        
        this._rsun       = rsun;
        this._date       = date;
 
        // Populate initial Event Type checkbox hierarchy with local defaults (fast)
        this._queryDefaultEventTypes();        
        
        // Update Event Type checkbox hierarchy with actual data 
        this._queryEventFRMs();
        // Temporarily hack to work around un-clickable jsTree issue
        // "TypeError: obj.find is not a function" needs to be investigated...
        this._queryEventFRMs();
        
        // Event-handlers
        $(document).bind("fetch-events", $.proxy(this._queryEvents, this));
    },
    
    /**
     * Queries data to build the EventType and EventFeatureRecognitionMethod
     * classes.
     *
     */
    _queryDefaultEventTypes: function () {
        var params = {
            "action"     : "getDefaultEventTypes"
        };
        $.get("api/index.php", params, $.proxy(this._parseEventFRMs, this), "json");
    },
    
    /**
     * Queries data to build the EventType and EventFeatureRecognitionMethod
     * classes.
     *
     */
    _queryEventFRMs: function () {
        var params = {
            "action"     : "getEventFRMs",
            "startTime"  : new Date(this._date.getTime()).addSeconds(-2 / 2).toISOString()
        };
        $.get("api/index.php", params, $.proxy(this._parseEventFRMs, this), "json");
    },
    
    /**
     * Handles data returned from _queryEventFRMs, parsing the HEK search and
     * creating the EventTypes and EventFeatureRecognitionMethods from the JSON
     * data and then calling generateTreeData to build the jsTree.
     */
    _parseEventFRMs: function (result) {
        var self = this;

        $.each(result, function (eventType, eventFRMs) {
            // Create new EventType if it doesn't exist
            if (!self._eventTypes[eventType]) {
               self._eventTypes[eventType] = new EventType(eventType);
            }

            // Process event FRMs
            $.each(eventFRMs, function (frmName, eventFRM) {
                // Add FRM if it does not already exist
                if (!self._eventTypes[eventType]._eventFRMs[frmName]) {
                   ///self._eventTypes[eventType]._eventFRMs[frmName] = 
                   ///     new EventFeatureRecognitionMethod(frmName, self._rsun);
                   /// self._eventTypes[eventType]._eventFRMs[frmName].domNode = 
                   ///     $('<div class="event-layer" style="position:absolute;top:-40px;left:90px;width:15px; height: 15px; background-image:url(\'/hek-dev/resources/images/events/activeregion.png\');" title="jeff" onClick="javascript:alert(\'hi jeff!\');">..</div>').appendTo("#moving-container");                    
                } else {
                    // TODO: Update count information
                }
            });
        });

        this._generateTreeData(result);
        
        // Fetch events for any selected event_type/frm_name pairs
        this._queryEvents();
    },
    
    /**
     * Queries event data from API
     *
     */
    _queryEvents: function () {
        var params;
        if ( helioviewer.viewport.serializeEvents() == '' ) {
            return;
        }
        params = {
            "action"     : "getEventsByEventLayers",
            "startTime"  : new Date(this._date.getTime()).toISOString(), 
            "eventLayers": helioviewer.viewport.serializeEvents()
        };
        $.get("api/index.php", params, $.proxy(this._parseEvents, this), "json");
    },
    
    /**
     * Save data returned from _queryEvents
     */
    _parseEvents: function (result) {
        this._events = result;
        
        // Create EventMarker objects...
        // ...
    },
    
    /**
     * Generates jsTree structure from HEK search data and then constructs
     * a new tree if one does not exist, or reloads the existing one if
     * it does.
     *
     */
    _generateTreeData: function (data) {
      
        var self = this, obj, index=0, event_type_arr, type_count=0;
        
        // Re-initialize _jsTreeData in case it contains old values
        self._jsTreeData = [];
        
        $.each(data, function (event_type, event_type_obj) {

            // Split event_type into a text label and an abbreviation
            event_type_arr = event_type.split('/');
            
            // Remove trailing space from "concept" property, if necessary
            if (event_type_arr[0].charAt(event_type_arr[0].length-1) == " ") {
                event_type_arr[0] = event_type_arr[0].slice(0,-1);
            }
            
            // Pluralize event type text label
            // TODO move this to a generic helper function
            switch (event_type_arr[0].charAt(event_type_arr[0].length-1)) {
                case 'x':
                    event_type_arr[0] += 'es';
                    break;
                case 'y':
                    event_type_arr[0] = event_type_arr[0].slice(0,-1) + 'ies';
                    break;
                default:
                    event_type_arr[0] += 's';
            }
 
            obj = Object();
            obj['data']     = event_type_arr[0];
            obj['attr']     = { 'id' : event_type_arr[1] };
            obj['state']    = 'open';
            obj['children'] = [];
            
            self._jsTreeData.push(obj);

            type_count = 0;
            $.each(event_type_obj, function(frm_name, frm_obj) {
                type_count += frm_obj['count'];
                self._jsTreeData[index].children.push( { 'data' : frm_name+" ("+frm_obj['count']+")", 
                                                         'attr' : { 'id' : event_type_arr[1]+'--'+frm_name.replace(/ /g,"_"),
                                                                    //'data-event-type' : event_type_arr[1] 
                                                                  }
                                                       } );
            });
            obj['data'] = obj['data']+' ('+type_count+')';
            
            
            index++;
        });


        // Create a new EventTree object only if one hasn't already been created
        if (!self._eventTree) {
            self._eventTree = new EventTree(this._jsTreeData, this._treeContainer);
        }
        // Otherwise call it's reload method to update the existing tree with new data
        else {
            self._eventTree.reload(this._jsTreeData);
        }        
    },
    
    /**
     * Reloads the windowSize, and queries new tree structure data.
     *
     */
    updateRequestTime: function () {
        var managerStartDate, managerEndDate, eventStartDate, eventEndDate, self = this;
        this._date = new Date($("#date").val().replace(/\//g,"-") +"T"+ $("#time").val()+"Z");
 
/*    
        $.each(this._eventTypes, function (typeName, eventType) {
            $.each(eventType.getEventFRMs(), function (frmName, FRM) {
                $.each(FRM._events, function (i, event) {
                    eventStartDate = new Date(event.event_starttime);
                    eventEndDate = new Date(event.event_endtime);
                    managerStartDate = new Date(self._date.getDate()).addSeconds(-self._windowSize / 2);
                    managerEndDate = new Date(self._date.getDate()).addSeconds(self._windowSize / 2);
                    if (eventEndDate < managerStartDate || eventStartDate > managerEndDate) {
                        event.setVisibility(false);
                    }
                    else {
                        event.setVisibility(true);
                    }
                });
            });
        });
*/
        this._queryEventFRMs();

    },
    
    /**
     * 
     *
     */
/*
    _formatTimelineData: function () {
        var timelineEvents = [];
        $.each(this._eventTypes, function (typeName, eventType) {
            $.each(eventType.getEventFRMs(), function (frmName, eventFRM) {
                $.each(eventFRM._events, function (i, event) {
                    timelineEvents.push({
                        'title' : event.frm_name + " " + event.event_type,
                        'start' : event.event_starttime,
                        'end' : event.event_endtime,
                        'durationEvent' : false
                    });
                });
            });
        });
        
        this._timelineData = {
            'dateTimeFormat' : 'iso8601',
            'events' : timelineEvents
        };
    },
*/
    
    query: function (queryType, queryName) {
        var queryStartTime, params, queryRange, queryEndTime, largestQuery, resultFRM, first, self = this;
        queryStartTime = new Date(this._date.getDate()).addSeconds(-2 / 2).getTime();
        queryEndTime = new Date(this._date.getDate()).addSeconds(2 / 2).getTime();
        
        if (queryType === "frm") {
            $.each(self._eventTypes, function (eventTypeName, eventType) {
                if (eventType._eventFRMs[queryName]) {
                    if (!eventType._eventFRMs[queryName].isQueried(queryStartTime, queryEndTime)) {
                        queryRange = eventType._eventFRMs[queryName].rangeToQuery(queryStartTime, queryEndTime);
                        params = {
                            "action"     : "queryHEK",
                            "eventTypes" : eventType.getName(),
                            "startTime"  : new Date(queryRange[0]).toHEKISOString(),
                            "endTime"    : new Date(queryRange[1]).toHEKISOString(),
                            "frmFilter"  : queryName
                        };
                    
                        $.get("api/index.php" + $.param(params), function (data) {
                            $.each(data.result, function (i, result) {
                                resultFRM = self._eventTypes[result.event_type]._eventFRMs[result.frm_name];
                                if (!resultFRM.contains(new Date(getUTCTimestamp(result.event_starttime)).getTime())) {
                                    resultFRM.addEvent(result);
                                }
                            });
                            eventType._eventFRMs[queryName].addRange(queryRange[0], queryRange[1]);
                            eventType._eventFRMs[queryName].setVisibility(true);
                        });
                    }
                    else {
                        eventType._eventFRMs[queryName].toggleVisibility();
                    }
                }
                
            });         
        }
        else if (queryType === "type" && !self._eventTypes[queryName].isQueried(queryStartTime, queryEndTime)) {
            $.each(self._eventTypes, function (i, eventType) {
                if (eventType.getName() === queryName) {
                    largestQuery = [0, 0];
                    if (eventType._eventFRMs.length === 0) {
                        largestQuery = [queryStartTime, queryEndTime];
                    }
                    first = false;
                    $.each(eventType._eventFRMs, function (frmName, FRM) {
                        queryRange = FRM.rangeToQuery(queryStartTime, queryEndTime);
                        if (first === false) {
                            first = true;
                            largestQuery = queryRange;
                        }
                        if (queryRange[0] < largestQuery[0]) {
                            largestQuery[0] = queryRange[0];
                        }
                        if (queryRange[1] > largestQuery[1]) {
                            largestQuery[1] = queryRange[1];
                        }
                    });
                    
                    if (largestQuery.toString() !== [0, 0].toString()) {
/*params = {
    
    "cmd"             : "search",
    "type"            : "column",
    "result_limit"    : "200",
    "event_type"      : queryName,
    "event_starttime" : new Date(largestQuery[0]).toUTCDateString() + "T" + new Date(largestQuery[0]).toUTCTimeString(),
    "event_endtime"   : new Date(largestQuery[1]).toUTCDateString() + "T" + new Date(largestQuery[1]).toUTCTimeString(),
    "event_coordsys"  : "helioprojective",
    "x1"              : "-1800",
    "x2"              : "1800",
    "y1"              : "-1800",
    "y2"              : "1800",
    "return"          : "required",
    "cosec"           : "2"
}
$.get("http://www.lmsal.com/her/dev/search-hpkb/hek?" + $.param(params), $.proxy(self._displayEvents, self));
*/
                        params = {
                            "action"     : "queryHEK",
                            "eventTypes" : queryName,
                            "startTime"  : new Date(largestQuery[0]).toHEKISOString(),
                            "endTime"    : new Date(largestQuery[1]).toHEKISOString()
                        };
                    
                        $.get("api/index.php" + $.param(params), function (data) {
                            $.each(data.result, function (i, result) {
                                resultFRM = self._eventTypes[result.event_type]._eventFRMs[result.frm_name];
                                if (!resultFRM.contains(new Date(getUTCTimestamp(result.event_starttime)).getTime())) {
                                    resultFRM.addEvent(result);
                                    resultFRM.setVisibility(true);
                                }
                            });
                            $.each(data.result, function (i, result) {
                                resultFRM = self._eventTypes[result.event_type]._eventFRMs[result.frm_name];
                                resultFRM.addRange(largestQuery[0], largestQuery[1]);
                            });                    
                        });
                        
                    }
                }
            });
        }
        else if (queryType === "type" && self._eventTypes[queryName].isQueried(queryStartTime, queryEndTime)) {
            $.each(self._eventTypes, function (typeName, eventType) {
                if (eventType.getName() === queryName) {
                    $.each(eventType.getEventFRMs(), function (frmName, FRM) {
                        FRM.toggleVisibility();
                    });
                }
            });
        }
    },
    
    _displayEvents: function (data) {
        var resultFRM, self = this;
        $.each(data.result, function (i, result) {
            resultFRM = self._eventTypes[result.event_type]._eventFRMs[result.frm_name];
            if (!resultFRM.contains(new Date(getUTCTimestamp(result.event_starttime)).getTime())) {
                resultFRM._events.push(result);
            }
        });
        
    },
    
    refreshEvents: function () {
        $.each(this._eventTypes, function (typeName, eventType) {
            $.each(eventType.getEventFRMs(), function (frmName, FRM) {
                FRM.refreshEvents();
            });
        });
    },
    
    

    /**
     * @description Add a new event layer
     */
    addEventLayer: function (eventLayer) {
        this._eventLayers.push(eventLayer);
    },
   
    /**
     * @description Gets the number of event layers currently loaded 
     * @return {Integer} Number of event layers present.
     */
    size: function () {
        return this._eventLayers.length;
    },
    
    /**
     * Returns the index of the given layer if it exists, and -1 otherwise
     */
    indexOf: function (id) {
        var index = -1;
        
        $.each(this._eventLayers, function (i, item) {
            if (item.id === id) {
                index = i;
            }
        });
        
        return index;
    },
    
    /**
     * Updates the stored maximum dimensions. If the specified dimensions for updated are {0,0}, e.g. after
     * a layer is removed, then all layers will be checked
     */
    updateMaxDimensions: function (event) {
/*
        var type = event.type.split("-")[0];
        this.refreshMaxDimensions(type);
        
        $(document).trigger("viewport-max-dimensions-updated");
*/
    },
    
    /**
     * Rechecks maximum dimensions after a layer is removed
     */
    refreshMaxDimensions: function (type) {
/*
        var maxLeft   = 0,
            maxTop    = 0,
            maxBottom = 0,
            maxRight  = 0,
            old       = this._maxLayerDimensions;

        $.each(this._layers, function () {
            var d = this.getDimensions();

            maxLeft   = Math.max(maxLeft, d.left);
            maxTop    = Math.max(maxTop, d.top);
            maxBottom = Math.max(maxBottom, d.bottom);
            maxRight  = Math.max(maxRight, d.right);

        });
        
        this._maxLayerDimensions = {width: maxLeft + maxRight, height: maxTop + maxBottom};

        if ((this._maxLayerDimensions.width !== old.width) || (this._maxLayerDimensions.height !== old.height)) {
            $(document).trigger("layer-max-dimensions-changed", [type, this._maxLayerDimensions]);
        }
*/
    },
    
    /**
     * @description Returns the largest width and height of any layers (does not have to be from same layer)
     * @return {Object} The width and height of the largest layer
     * 
     */
    getMaxDimensions: function () {
/*
        return this._maxLayerDimensions;
*/
    },

    /**
     * @description Removes an event layer
     * @param {string} The id of the event layer to remove
     */
    removeEventLayer: function (id) {
        var type  = id.split("-")[0],
            index = this.indexOf(id), 
            eventLayer = this._eventLayers[index];
        
        eventLayer.domNode.remove();
        this._eventLayers = $.grep(this._eventLayers, function (e, i) {
            return (e.id !== eventLayer.id);
        });
        eventLayer = null;
        
        this.refreshMaxDimensions(type);
    },
    
    /**
     * @description Iterates through event layers
     */
    each: function (fn) {
        $.each(this._eventLayers, fn);
    },
    
    /**
     * @description Returns a JSON representation of the event layers currently being displayed
     */
    toJSON: function () {
        var eventLayers = [];
        
        $.each(this._eventLayers, function () {
            eventLayers.push(this.toJSON());
        });
        
        return eventLayers;       
    }
    
});
