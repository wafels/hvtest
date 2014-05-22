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

        this.timeline_container = $('<section id="helioviewer_timeline" class="drawer"><header class="clickme"> Data Coverage Timeline</header><div class="drawer-content"><div class="drawer-items"><div id="data-coverage-timeline"></div><button id="btn-prev">&larr; Prev 3 Months</button><button id="btn-zoom-in">&#10133; Zoom In</button><button id="btn-zoom-out">&#10134; Zoom Out</button><button id="btn-plotline">Add PlotLine</button><button id="btn-back">&larr; Go Back</button><button id="btn-next">Next 3 Months &rarr;</button></div></div></div></section>').appendTo("#helioviewer-viewport");

        this.timeline_container.bind('mousedown',
            function (event) {
                return false;
            }
        );

        this.timeline_container.bind('dblclick',
            function (event) {
                return false;
            }
        );
        this.timeline_container.bind('click',
            function (event) {
                return false;
            }
        );

        this.timeline_container.slideDrawer({
            showDrawer: true,
            slideTimeout: true,
            slideSpeed: 500,
            slideTimeoutCount: 2000,
            drawerHiddenHeight: -10,
        });

        $("header.clickme").bind('click', function () {
            $("div#earth-button.minimize").click();
        });


        var container = $('#data-coverage-timeline'),
            chart = new HelioviewerTimeline(container),
            url, startDate, endDate, imageLayers, layers=[];

        chart.renderPlaceholder();
        chart.loadingIndicator(true);


        imageLayers = Helioviewer.userSettings.get("state.tileLayers");
        $.each(imageLayers, function (i, obj) {
            layers.push('[' + obj.sourceId + ',1,100]');
        });
        layers = layers.join(',');
        console.warn(layers);

        startDate = new Date(chart._timeline.xAxis[0].getExtremes().dataMin).toISOString();
        endDate = new Date(chart._timeline.xAxis[0].getExtremes().dataMax).toISOString();

        url  = 'http://dev4.helioviewer.org/api/v1/getDataCoverage/';
        url += '?imageLayers='+layers;
        url += '&startDate='+startDate;
        url += '&endDate='+endDate;

        chart.loadIntoTimeline(url);
    },
});
