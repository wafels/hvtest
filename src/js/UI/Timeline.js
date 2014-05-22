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
        var url, startDate, endDate, imageLayers, layers=[],
            dateObj = new Date(), self = this;

        if ( $('#timeline-drawer').length > 0 ) {
           $('#timeline-drawer').remove();
        }

        this.timeline_drawer = $('<section id="helioviewer_timeline" class="drawer"><header class="clickme"> Data Coverage Timeline</header><div class="drawer-content"><div class="drawer-items"><div id="data-coverage-timeline"></div><button id="btn-prev">&larr; Prev 3 Months</button><button id="btn-zoom-in">&#10133; Zoom In</button><button id="btn-zoom-out">&#10134; Zoom Out</button><button id="btn-plotline">Add PlotLine</button><button id="btn-back">&larr; Go Back</button><button id="btn-next">Next 3 Months &rarr;</button></div></div></div></section>').appendTo("#helioviewer-viewport");

        this.timeline_drawer.bind('mousedown',
            function (event) {
                return false;
            }
        );

        this.timeline_drawer.bind('dblclick',
            function (event) {
                return false;
            }
        );
        this.timeline_drawer.bind('click',
            function (event) {
                return false;
            }
        );

        this.timeline_drawer.slideDrawer({
            showDrawer: true,
            slideTimeout: true,
            slideSpeed: 500,
            slideTimeoutCount: 2000,
            drawerHiddenHeight: -10,
        });

        imageLayers = Helioviewer.userSettings.get("state.tileLayers");
        $.each(imageLayers, function (i, obj) {
            layers.push('[' + obj.sourceId + ',1,100]');
        });
        layers = layers.join(',');

        // Set endDate to the beginning of next month
        dateObj.setMonth(dateObj.getMonth() + 1);
        dateObj.setDate(1);
        dateObj.setUTCHours(0);
        dateObj.setMinutes(0);
        dateObj.setSeconds(0);
        dateObj.setMilliseconds(0);
        endDate = dateObj.toISOString();

        // Set startDate to 3 months before endDate
        dateObj.setMonth(dateObj.getMonth() - 3);
        startDate = dateObj.toISOString();

        // Render the Data Coverage Timeline
        this._chart = new HelioviewerTimeline(
            $('#data-coverage-timeline'),
            imageLayers,
            startDate,
            endDate
        );
        this._chart.render();

        // Event Bindings
        $("header.clickme").bind('click', function (e) {
            var a = this, b = self;
            $("div#earth-button.minimize").click();
            $("#morescreen-btn").click();
            setTimeout(function () { self._chart._timeline.reflow(); }, 501);
        });
    },
});
