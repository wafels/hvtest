/**
 * EventFeatureRecognitionMethod Class Definition 
 * 
 * @author Keith Hughitt <keith.hughitt@nasa.gov>
 * @author Jonathan Harper
 *
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $, window, EventMarker */

"use strict";

var EventFeatureRecognitionMethod = Class.extend({

    init: function (name, rsun) {
        this._events  = [];
        this._name    = name;
        this._visible = false;
    },
    
    getName: function () {
        return this._name;
    },
    
    addEvent: function (newEvent) {
        this._events.push(
            new EventMarker(this, newEvent, newEvent.event_starttime, this._rsun, {offset: {top : 10, left : 0}})
        );
    },
    
    refreshEvents: function () {
        $.each(this._events, function (i, event) {
            event.refresh(this._rsun);
        });
    },
    
    setDomNode: function (domNode) {
        this.domNode = domNode;
    },
    
    setVisibility: function (visible) {
        this._visible = visible;
        
        if (visible) {
            this.domNode.show();
        }
        else {
            this.domNode.hide();
        }
    },
    
    toggleVisibility: function () {
        this._visible = !this._visible;
        if (this._visible) {
            this.domNode.show();
        }
        else {
            this.domNode.hide();
        }
    }
});
