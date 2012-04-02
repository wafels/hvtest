/**
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

var EventManager = LayerManager.extend({
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
    init: function (date, searchWindowSizeInSecs, rsun) {
        this._eventTypes   = {};
        this._timelineData = {};
        this._jsTreeData   = [];
        
        this._rsun       = rsun;
        this._date       = date;
        this._windowSize = searchWindowSizeInSecs;
        
        this._queryEventFRMs();
    },
    
    /**
     * Queries data to build the EventType and EventFeatureRecognitionMethod
     * classes.
     *
     */
    _queryEventFRMs: function () {
        var params = {
            "action"     : "getEventFRMs",
            "startTime"  : new Date(this._date.getTime()).addSeconds(-this._windowSize / 2).toISOString(),
            "endTime"    : new Date(this._date.getTime()).addSeconds(this._windowSize / 2).toISOString()
        };
        
        $.get("api/index.php", params, $.proxy(this._parseEventFRMs, this), "json");
    },
    
    /**
     * Handles data returned from _querySearchData, parsing the HEK search and
     * creating the EventTypes and EventFeatureRecognitionMethods from the JSON
     * data and then calling generateTreeData to build the jsTree.
     *
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
                    self._eventTypes[eventType]._eventFRMs[frmName] = 
                        new EventFeatureRecognitionMethod(frmName, this._rsun);
                    self._eventTypes[eventType]._eventFRMs[frmName].domNode = 
                        $('<div class="event-layer"></div>').appendTo("#moving-container");                    
                } else {
                    // TODO: Update count information
                }
            });
        });
        //this._generateTreeData(data);
    },
    
    /**
     * Generates jsTree structure from HEK search data and then constructs
     * a new tree if one does not exist, or reloads the existing one if
     * it does.
     *
     */
    _generateTreeData: function (data) {
        var jsTreeData, self = this;
        jsTreeData = [];
        
        $.each(data.result, function (i, event) {
            var eventTypeExists, frmNameExists, children;
            eventTypeExists = false;
            frmNameExists = false;
            
            $.each(jsTreeData, function (j, event_type) {
                if (event.event_type === event_type.data) {
                    eventTypeExists = true;
                
                    $.each(event_type.children, function (k, child) {
                        if (event.frm_name === child.data) {
                            frmNameExists = true;
                        }
                    });
                }
            });
            
            children = [];
            
            if (!frmNameExists) {     
                children.push({
                    "data": event.frm_name,
                    "attr": {"name": event.frm_name, "type": "frm"}
                });        
            }
                    
            if (!eventTypeExists) {
                jsTreeData.push({
                    "data": event.event_type,
                    "attr": {"id": event.event_type, "name": event.event_type, "type": "type"},
                    "children": children
                });
            }
   
            else if (children.length > 0)
            {
                $.each(jsTreeData, function (i, event_type) {
                    if (event.event_type === event_type.data) {
                        $.each(children, function (i, child) {
                            event_type.children.push(child);
                        });
                    }
                });
            }
            
        });
        self._jsTree = jsTreeData;
        
        //We only want to create the new class if it hasn't already been created
        if (!self._eventTree) {
            self._eventTree = new EventTree(this._jsTree, this);
        }
        //Otherwise we just want to reload the tree
        else {
            self._eventTree.reload(this._jsTree);
        }
        
//        if (!self._eventTimeline) {
//            self._formatTimelineData();
//            self._eventTimeline = new EventTimeline(this._timelineData, this);
//        }
//        else {
//            self._formatTimelineData();
//            self._eventTimeline.reload(this._timelineData);
//        }
        
        this._eventTimeline = new EventTimeline(data);
        
    },
    
    /**
     * Reloads the windowSize, and queries new tree structure data.
     *
     */
    updateRequestTime: function (date) {
        var managerStartDate, managerEndDate, eventStartDate, eventEndDate, self = this;
        //this._windowSize = this.controller.timeControls.getTimeIncrement();
        this._date = date;
        
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
        this._querySearchData();
    },
    
    /**
     * 
     *
     */
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
    
    query: function (queryType, queryName) {
        var queryStartTime, params, queryRange, queryEndTime, largestQuery, resultFRM, first, self = this;
        queryStartTime = new Date(this._date.getDate()).addSeconds(-this._windowSize / 2).getTime();
        queryEndTime = new Date(this._date.getDate()).addSeconds(this._windowSize / 2).getTime();
        
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
    }
});
