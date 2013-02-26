/**
 * @author Jonathan Harper
 * @fileOverview TO BE ADDED
 *
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $, window */

"use strict";

var EventTree = Class.extend({
    
    init: function (data, container) {
        this._container = container;
        this._build(data);
    },
    
    destroy: function (data) {
        this._container.empty();
    },
    
    reload: function (newData) {
        this.destroy();
        this._build(newData);
    },
    
    close_all: function () {
        this._container.jstree("close_all",null,true);
    },
    
    open_all: function () {
        this._container.jstree("open_all",null,true);
    },
    
    jstreeFunc: function (name, args) {
        this._container.jstree(name, args);
    },
    
    _build: function (jsTreeData) {
        var self = this, saved, node;

        this._container.jstree({
            "json_data" : { "data": jsTreeData },
            "themes"    : { "theme":"default", "dots":true, "icons":false },
            "plugins"   : [ "json_data", "themes", "ui", "checkbox" ],
        });

        saved = Helioviewer.userSettings.get("state.eventLayers");
        $.each(saved, function(i,eventLayer) {
            if (eventLayer.frms[0] == 'all') {
                node = "#"+eventLayer.event_type;
                self.jstreeFunc("check_node", node);
            }
            else {
                $.each(eventLayer.frms, function(j,frm) {
                    node = "#"+eventLayer.event_type+"--"+frm;
                    self.jstreeFunc("check_node", node);
                });   
            }   
        });
        
        this._container.bind("change_state.jstree", $.proxy(this._treeChangedState, this));
    },
    
    _treeChangedState: function (event, data) {
        var checked = [], event_types = [], index;
        
        this._container.jstree("get_checked",null,false).each( 
            function () {
                var eventLayer, event_type, frm;
                event_type = this.id.split("--");
                if (event_type.length > 1) {
                    frm = event_type[1];
                }
                else {
                    frm = 'all';
                }
                event_type = event_type[0];
                                
                // Determine if an entry for this event type already exists
                index = $.inArray(event_type, event_types)
                
                // New event type to add to array
                if ( index == -1 ) {
                    eventLayer = { 'event_type' : event_type,
                                         'frms' : [frm],
                                         'open' : 1};
                    checked.push(eventLayer);   
                    event_types.push(event_type);           
                }
                // Append FRM to existing event type in array
                else {
                    checked[index].frms.push(frm);
                }
            }
        ); 
        
        // Save eventLayers state to localStorage        
        Helioviewer.userSettings.set("state.eventLayers", checked);
            
        // Fetch/display the events related to the event types and frm_names that are selected
        $(document).trigger("fetch-events");
    }
});
