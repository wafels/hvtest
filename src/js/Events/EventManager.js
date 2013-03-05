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
    init: function (defaultEventTypes, date) {
        this._eventLayers   = [];
        this._events        = [];
        this._eventMarkers  = [];
        this._treeContainer = $("#eventJSTree");
        this._eventTypes    = {};
        this._jsTreeData    = [];
        this._date          = date;
 
        $('<div id="event-container"></div>').appendTo("#moving-container");
         

        // Populate event_type/frm_name checkbox hierarchy with actual data 
        this._queryEventFRMs();

        // Set up javascript event handlers
        $(document).bind("fetch-eventFRMs", $.proxy(this._queryEventFRMs, this));
        $(document).bind("toggle-events", $.proxy(this._toggleEvents, this));
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
        var self = this, domNode, eventAbbr;
        
        $("#event-container").empty();
        
        self._eventTypes = {};
        $.each(result, function (eventType, eventFRMs) {
            eventAbbr = eventType.split('/');
            eventAbbr = eventAbbr[1];
            
            // Create and store an EventType
            self._eventTypes[eventAbbr] = new EventType(eventAbbr);
            
            // Process event FRMs
            $.each(eventFRMs, function (frmName, eventFRM) {
                self._eventTypes[eventAbbr]._eventFRMs[frmName] = new EventFeatureRecognitionMethod(frmName, self._rsun);
                domNode = '<div class="event-layer" id="'+eventAbbr+'__'+frmName.replace(/ /g,'_')+'" style="border: 1px solid blue; position: absolute;">';
                self._eventTypes[eventAbbr]._eventFRMs[frmName].setDomNode( $(domNode).appendTo("#event-container") );
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
            "action"     : "getEvents",
            "startTime"  : new Date(this._date.getTime()).toISOString(), 
            "eventType"  : '**'
        };
        $.get("api/index.php", params, $.proxy(this._parseEvents, this), "json");
    },
    
    /**
     * Save data returned from _queryEvents
     */
    _parseEvents: function (result) {
        var eventMarker, self=this, parentDomNode;
      
        $.each( this._eventMarkers, function(i, eventMarker) {
            eventMarker.remove();
        });
        this._eventMarkers = [];
        this._events = result;
        
        $.each( this._events, function(i, event) {
            self._eventMarkers.push( new EventMarker(self._eventTypes[event['event_type']]._eventFRMs[event['frm_name']], 
                                          event) );        
        });
    },
    
    /**
     * Generates jsTree structure from HEK search data and then constructs
     * a new tree if one does not exist, or reloads the existing one if
     * it does.
     *
     */
    _generateTreeData: function (data) {
      
        var self = this, obj, index=0, event_type_arr, type_count=0, count_str;
        
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
                
                count_str = '';
                if ( frm_obj['count'] > 0 ) {
                    count_str = " ("+frm_obj['count']+")";
                }
                self._jsTreeData[index].children.push( { 'data' : frm_name+count_str, 
                                                         'attr' : { 'id' : event_type_arr[1]+'--'+frm_name.replace(/ /g,"_"),
                                                                    //'data-event-type' : event_type_arr[1] 
                                                                  }
                                                       } );
            });
            
            count_str = '';
            if ( type_count > 0 ) {
                count_str = " ("+type_count+")";
            }
            obj['data'] = obj['data']+count_str;
            
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
     * Queries for new tree structure data and events.
     *
     */
    updateRequestTime: function () {
        var managerStartDate, managerEndDate, eventStartDate, eventEndDate, self = this;
        this._date = new Date($("#date").val().replace(/\//g,"-") +"T"+ $("#time").val()+"Z");
        this._queryEventFRMs();
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
    },
    
    _toggleEvents: function (event) {
        var newState, checkedEventTypes = [], checkedFRMs = {}, self = this;
        
        newState = Helioviewer.userSettings.get("state.eventLayers");

        // Populate checkedEventTypes and checkedFRMs to make it easier to 
        // compare the state of the checkbox hierarchy with the all stored 
        // event type / frm DOM nodes.
        $.each( newState, function(i, checkedTypeObj) {
            checkedEventTypes.push(checkedTypeObj['event_type']);
            
            checkedFRMs[checkedTypeObj['event_type']] = [];
            $.each ( checkedTypeObj['frms'], function(j, frmName) {
                checkedFRMs[checkedTypeObj['event_type']].push(frmName);
            });
        });
        
        $.each( this._eventTypes, function(eventTypeName, eventTypeObj) {
            $.each( eventTypeObj._eventFRMs, function(frmName, frmObj) {
                                
                // eventTypeName not found in newState, so this FRMs can't be checked
                // so .hide() this FRM's event layer
                if ( $.inArray(eventTypeName, checkedEventTypes) == -1 ) {
                    self._eventTypes[eventTypeName]._eventFRMs[frmName].domNode.hide();
                }
                else {
                    // eventTypeName/frmName pair is checked
                    // so .show() this FRM's event layer
                    if ( checkedFRMs[eventTypeName][0] == 'all' || 
                          $.inArray(frmName.replace(/ /g,'_'), checkedFRMs[eventTypeName]) != -1 ) {
                    
                        self._eventTypes[eventTypeName]._eventFRMs[frmName].domNode.show();
                    }
                    // eventTypeName/frmName pair is NOT checked
                    // so .hide() this FRM's event layer
                    else {
                        self._eventTypes[eventTypeName]._eventFRMs[frmName].domNode.hide();
                    }
                }
            });
        });        
    }
    
});
