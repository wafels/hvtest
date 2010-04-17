/**
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a> 
 * @fileOverview This class handles the management of all date and time related
 * components in Helioviewer including the input fields, datepicker, and time-forward and
 * backward buttons.
 * 
 * @see ui.datepicker.js, TimeControls
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $, window */
"use strict";
var Time = Class.extend(
    /** @lends Time.prototype */
    {
    /**
     * @description Creates a new Time. 
     * @param {Object} controller Reference to the controller class (Helioviewer).
     * @constructs 
     */ 
    init: function (controller) {
        this.controller = controller;
        this._date = new Date(this.controller.userSettings.get('date'));
    },
    
    /**
     * @description Returns the current observation date as a JavaScript Date object
     */    
    getDate: function () {
        return this._date; 
    },
    
    /**
     * @description Sets the desired viewing date and time.
     * @param {Date} date A JavaScript Date object with the new time to use
     */
    setDate: function (date) {
        this._date = date;
        var ts = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
                          date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
        $(document).trigger("save-setting", ["date", parseInt(ts, 10)]);
        this.controller.tileLayers.reloadLayers();
        this.controller.eventLayers.reloadLayers();
    },
    
    /**
     * @description Increments the current time by the specified number of seconds
     * @param {Integer} seconds
     */
    addSeconds: function (seconds) {
        return this._date.addSeconds(seconds);
    },
    
    /**
     * @description Returns a unix timestamp for the current observation time
     */
    getTime: function () {
        return this._date.getTime();  
    },
    
    /**
     * @description Gets an ISO 8601 string representation of the current observation time
     */
    toISOString: function () {
        // Work-around: In Firefox 3.1+ (and Webkit), Date.toISOString() Returns single-quoted strings
        // http://code.google.com/p/datejs/issues/detail?id=54
        var isoString = this._date.toISOString().replace(/"/g, '');
        return isoString;
    },
    

    
    /**
     * @description Updates the observation date
     * @param {Object} dateStr
     */
    updateDate: function (dateStr) {
        var date, time, hours, minutes, seconds, utcDate;
        
        //Check to see if the input is a valid time
        if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}?/) && (dateStr.length === 10)) {
            date = Date.parse(dateStr);
            time = this.controller.timeControls.getTimeField();
            
            //Factor in time portion of timestamp
            hours = parseInt(time.substring(0, 2), 10);
            minutes = parseInt(time.substring(3, 5), 10);
            seconds = parseInt(time.substring(6, 8), 10);
            
            //Convert to UTC
            utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds));
            
            this.setDate(utcDate);
        }
        else {
            $(document).trigger("message-console-warn", ["Invalid date. Please enter a date of the form YYYY/MM/DD."]); 
        }
    },

    
    /**
     * @description takes a string of the form "hh:mm:ss" and after validating it, sets the
     * new application time to it.
     * @param {String} time - The new time to use
     */
    updateTime: function (time) {
        var newTime, hours, mins, secs;
        
        //Check to see if the input is a valid time
        if (time.match(/^\d{2}:\d{2}:\d{2}?/) && (time.length === 8)) {
        
            //Get the difference in times and add to this.date
            newTime = time.split(':');
            hours = parseInt(newTime[0], 10) - this._date.getUTCHours();
            mins = parseInt(newTime[1], 10) - this._date.getUTCMinutes();
            secs = parseInt(newTime[2], 10) - this._date.getUTCSeconds();
            
            this._date.addHours(hours);
            this._date.addMinutes(mins);
            this._date.addSeconds(secs);
            
            this.setDate(this._date);
        }
        else {
            $(document).trigger("message-console-warn", ["Invalid time. Please enter a time of the form HH:MM:SS."]);
        }
    }
});
