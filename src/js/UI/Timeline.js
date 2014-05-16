/**
 * @fileOverview Contains the class definition for an Timeline class.
 * @author <a href="mailto:jeff.stys@nasa.gov">Jeff Stys</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false,
eqeqeq: true, plusplus: true, bitwise: true, regexp: false, strict: true,
newcap: true, immed: true, maxlen: 80, sub: true */
/*globals $, Class */
"use strict";
var Timeline = Class.extend(
    /** @lends Timeline.prototype */
    {
    /**
     * @constructs
     *
     * Creates a new Timeline
     */
    init: function () {
        this._initTimeline();
    },


    _initTimeline: function() {

        if ( $('#timeline-drawer').length > 0 ) {
           $('#timeline-drawer').remove();
        }

        this.timeline_container = $('<section class="drawer" style=""><header class="clickme" style="font-size: 0.67em; padding-top: 0; margin-top: 0; width: 8em; background-color: rgba(0,0,0,0.75); border-bottom: 0; padding: 0 auto; margin: -19px auto 0 auto;"><div class="ui-icon ui-icon-arrow-1-n" style="display: inline-block;"></div>Timeline<div class="ui-icon ui-icon-arrow-1-n" style="display: inline-block;"></div></header><div class="drawer-content"><div class="drawer-items"></div></div></section>').appendTo("#helioviewer-viewport");
        this.timeline_container.css({
            'position'    : 'absolute',
            'bottom'      : '0',
            'z-index'     : '999',
            'width'       : '100%',
            'height'      : '40%',
            'text-align'  : 'center',
            'background-color':'rgba(0,0,0,0.5)',
            //'border-top'  : '1px solid #333'
        });

        this.timeline_container.bind("mousedown", function () { return false; });
        this.timeline_container.bind('dblclick',  function () { return false; });
        this.timeline_container.bind('click',     function () { return false; });

        this.timeline_container.slideDrawer({
            showDrawer: true,
            slideTimeout: true,
            slideSpeed: 500,
            slideTimeoutCount: 1500,
            drawerHiddenHeight: -10,
        });
    },
});
