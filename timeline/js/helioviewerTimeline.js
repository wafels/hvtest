/**
 * HelioviewerTimeline Class Definition
 *
 * @author Jeff Stys <jeff.stys@nasa.gov>
 *
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true,
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $, window, helioviewerTimeline */

"use strict";

    var _colors  = [
                '#030380', // SOHO EIT 171
                '#035F03', // SOHO EIT 195
                '#796102', // SOHO EIT 284
                '#890303', // SOHO EIT 304
                '#8F0000', // SOHO LASCO C2
                '#0027AF', // SOHO LASCO C3
                '#8F8F8F', // SOHO MDI Mag
                '#6F6F6F', // SOHO MDI Int
                '#3E8C80', // SDO AIA 94
                '#07B8B8', // SDO AIA 131
                '#B77F00', // SDO AIA 171
                '#B37F3E', // SDO AIA 191
                '#B37F8D', // SDO AIA 211
                '#B70B00', // SDO AIA 304
                '#3E7FB3', // SDO AIA 335
                '#8C8C3E', // SDO AIA 1600
                '#B27F7F', // SDO AIA 1700
                '#FFFF7E', // SDO AIA 4500
                '#8F8F8F', // SDO MDI Int
                '#6F6F6F', // SDO MDI Mag
                '#32AC00', // STEREO A EUVI 171
                '#A06800', // STEREO A EUVI 195
                '#8A6F01', // STEREO A EUVI 284
                '#8D0000', // STEREO A EUVI 304
                '#32AC00', // STEREO B EUVI 171
                '#A06800', // STEREO B EUVI 195
                '#8A6F01', // STEREO B EUVI 284
                '#8D0000', // STEREO B EUVI 304
                '#3F8900', // STEREO A COR1
                '#C41D00', // STEREO A COR2
                '#3F8900', // STEREO B COR1
                '#C41D00', // STEREO B COR2
                '#B77E00', // PROBA-2 SWAP 174
                '#F29F00', // Yohkoh SXT AlMgMn
                '#F29F00', // Yohkoh SXT thin-Al
                '#7F7F7F'  // Yohkoh SXT white-light
            ];

var HelioviewerTimeline = Class.extend({

    init: function (container) {
        this._seriesOptions = [];
        this._yAxisOptions  = [];
        this._container = container;
        this._viewportPlotline = false;

        Highcharts.setOptions({
            global: {
                useUTC: true,
                timezoneOffset: 0 * 60
            },
            lang: {
                loading: 'Loading Timeline Data...',
                rangeSelectorZoom: 'Range:',
                rangeSelectorFrom: 'View:  '
            }
        });

        this.setTimelineOptions();
        this._setupEventHandlers();
    },


    btnZoomIn: function (event, params) {
        var extremes, newMin, newMax, span, scaleFactor = 0.2;

        this._timeline = $('#data-coverage-timeline').highcharts();

        if ( params === undefined ) {
            extremes = this._timeline.xAxis[0].getExtremes();
            span = extremes.max - extremes.min;
            newMin = extremes.min+(span*scaleFactor);
            newMax = extremes.max-(span*scaleFactor);
        }
        else {
            newMin = new Date(params['binStart']);
            newMin = newMin.getTime();
            newMax = new Date(params['binEnd']);
            newMax = newMax.getTime();
        }

        this._timeline.xAxis[0].setExtremes(newMin, newMax);
    },


    btnZoomOut: function () {
        var extremes, newMin, newMax, span, scaleFactor = 0.2;

        this._timeline = $('#data-coverage-timeline').highcharts();

        extremes = this._timeline.xAxis[0].getExtremes();

        span   = extremes.max - extremes.min;

        newMin = extremes.min-(span*scaleFactor);
        newMin = newMin < extremes.dataMin ? extremes.dataMin : newMin;

        newMax = extremes.max+(span*scaleFactor);
        newMax = newMax > extremes.dataMax ? extremes.dataMax : newMax;

        this._timeline.xAxis[0].setExtremes(newMin, newMax);
    },


    btnBack: function () {
        var chart = new HelioviewerTimeline(container),
            url, startDate, endDate, imageLayers;

        this._timeline = $('#data-coverage-timeline').highcharts();

        $('#btn-back').hide();
        $('#btn-prev').show();
        $('#btn-next').show();
        $('#btn-zoom-in').show();
        $('#btn-zoom-out').show();
        $('#btn-plotline').show();

        chart.renderPlaceholder();
        chart.loadingIndicator(true);

        imageLayers = '[12,1,100],[13,1,100],[14,1,100],[15,1,100],[16,1,100]';
        startDate = new Date(chart._timeline.xAxis[0].getExtremes().dataMin).toISOString();
        endDate = new Date(chart._timeline.xAxis[0].getExtremes().dataMax).toISOString();

        url  = 'http://dev4.helioviewer.org/api/v1/getDataCoverage/';
        url += '?imageLayers='+imageLayers;
        url += '&startDate='+startDate;
        url += '&endDate='+endDate;

        chart.loadIntoTimeline(url);
    },


    btnPrev: function () {
        var self = this, url, month, date;

        this._timeline = $('#data-coverage-timeline').highcharts();
        this._timeline.showLoading('Loading data from server...');

        date = Date.parse(startDate);
        date = new Date(date);
        month = date.getMonth();
        date.setMonth(month-3);
        startDate = date.toISOString();

        date = Date.parse(endDate);
        date = new Date(date);
        month = date.getMonth();
        date.setMonth(month-3);
        endDate = date.toISOString();

        url='http://dev4.helioviewer.org/api/v1/getDataCoverage/?';
        url += 'imageLayers=' + imageLayers;
        url += '&startDate=' + startDate;
        url += '&endDate=' + endDate;

        $.getJSON(url, function(data) {
            var count = 0;

            while(self._timeline.series.length > 0) {
                self._timeline.series[0].remove(false);
            }
            self._timeline.redraw();

            $.each(data, function (sourceId, series) {
                self._timeline.addSeries({
                    name: series['label'],
                    data: series['data'],
                    color: _colors[sourceId]
                }, true, false);
                count++;
            });

            self._timeline.xAxis[0].setExtremes(
                self._timeline.xAxis[0].getExtremes().dataMin,
                self._timeline.xAxis[0].getExtremes().dataMax
            );

            self._timeline.redraw();
            self._timeline.hideLoading();
        });
    },


    btnNext: function () {
        var self = this, url, month, date;

        this._timeline = $('#data-coverage-timeline').highcharts();
        this._timeline.showLoading('Loading data from server...');

        date = Date.parse(startDate);
        date = new Date(date);
        month = date.getMonth();
        date.setMonth(month+3);
        startDate = date.toISOString();

        date = Date.parse(endDate);
        date = new Date(date);
        month = date.getMonth();
        date.setMonth(month+3);
        endDate = date.toISOString();

        url='http://dev4.helioviewer.org/api/v1/getDataCoverage/?';
        url += 'imageLayers=' + imageLayers;
        url += '&startDate=' + startDate;
        url += '&endDate=' + endDate;

        $.getJSON(url, function(data) {
            var count = 0;

            while(self._timeline.series.length > 0) {
                self._timeline.series[0].remove(false);
            }
            self._timeline.redraw();

            $.each(data, function (sourceId, series) {
                self._timeline.addSeries({
                    name: series['label'],
                    data: series['data'],
                    color: _colors[sourceId]
                }, true, false);
                count++;
            });

            self._timeline.xAxis[0].setExtremes(
                self._timeline.xAxis[0].getExtremes().dataMin,
                self._timeline.xAxis[0].getExtremes().dataMax
            );

            self._timeline.redraw();
            self._timeline.hideLoading();
        });
    },


    btnPlotline: function () {
        if ( !this._viewportPlotline ) {
            this._timeline.xAxis[0].addPlotLine({
                value: 1396000000000,
                width: 2,
                color: 'black',
                dashStyle: 'solid',
                zIndex: 5,
                id: 'viewport-plotline',
                label: {
                    text: 'Viewport',
                    verticalAlign: 'top',
                    align: 'center',
                    y: 30,
                    x: -5,
                    rotation: 270
                }
            });
            $('#btn-plotline').html('Remove plot line');
        }
        else {
            this._timeline.xAxis[0].removePlotLine('viewport-plotline');
            $('#btn-plotline').html('Add plot line');
        }

        this._viewportPlotline = !this._viewportPlotline;
    },


    _setupEventHandlers: function () {
        var self = this;

        $('#btn-zoom-in').bind('click', $.proxy(this.btnZoomIn, this));
        $('#btn-zoom-out').bind('click', $.proxy(this.btnZoomOut, this));
        $('#btn-plotline').bind('click', $.proxy(this.btnPlotline, this));

        $('#btn-prev').bind(
            'click',
            {
                'imageLayers' : imageLayers,
                'startDate'   : startDate,
                'endDate'     : endDate,
                'colors'      : _colors
            },
            $.proxy(this.btnPrev, this)
        );

        $('#btn-next').bind(
            'click',
            {   'imageLayers' : imageLayers,
                'startDate'   : startDate,
                'endDate'     : endDate,
                'colors'      : _colors
            },
            $.proxy(this.btnNext, this)
        );

        $('#btn-back').bind('click', $.proxy(this.btnBack, this));
    },


    renderPlaceholder: function () {
        var self = this, count = 0, startTimestamp, endTimestamp,
            chartOptions, data, dateObj = new Date();

        // Set endTimestamp to the beginning of next month
        dateObj.setMonth(dateObj.getMonth() + 1);
        dateObj.setDate(1);
        dateObj.setHours(0);
        dateObj.setMinutes(0);
        dateObj.setSeconds(0);
        dateObj.setMilliseconds(0);
        endTimestamp = dateObj.getTime();

        // Set startTimestamp to 3 months before endTimestamp
        dateObj.setMonth(dateObj.getMonth() - 3);
        startTimestamp = dateObj.getTime();

        data = { "0": {
                        "sourceId" : "0",
                        "label"    : "Loading...",
                        "data"     : [ [startTimestamp, null],
                                       [endTimestamp, null] ]
                      }
                   };
        count = 0;
        $.each(data, function (sourceId, series) {
            self._seriesOptions[count] = {
                name  : series['label'],
                data  : series['data'],
                color : _colors[sourceId],
                id    : count
            };
            count++;
        });

        this.createTimeline();
    },


    createTimeline: function () {
        $('#data-coverage-timeline').highcharts(
            'StockChart', this._timelineOptions);

        this._timeline = $('#data-coverage-timeline').highcharts();
    },

    getTimelineOptions: function () {
        return this._timelineOptions;
    },


    setTimelineOptions: function (options) {
        if ( options !== undefined ) {
            this._timelineOptions = options;
            return true;
        }

        this._timelineOptions = {
            title: {
                text: 'Image Data Coverage',
                align: 'center',
                style: {
                    color: '#000'
                }
            },

            subtitle: {
                text: 'Number of Images per Layer',
                align: 'center',
                style: {
                    color: '#ccc'
                }
            },

            chart: {
                type: 'column',
                stacking: 'normal',
                zoomType: 'x',
                height: 400,
                events: {
                    click: function(event) {
                        var date = new Date(event.xAxis[0].value);
                    }
                }
            },

            credits: {
                enabled: false
            },

            rangeSelector: {
                selected: 2,
                buttons: [{
                    type: 'hour',
                    count: 1,
                    text: '1h'
                }, {
                    type: 'day',
                    count: 1,
                    text: '1d'
                }, {
                    type: 'week',
                    count: 1,
                    text: '1w'
                }, {
                    type: 'month',
                    count: 1,
                    text: '1m'
                // }, {
                //     type: 'year',
                //     count: 1,
                //     text: '1y'
                }, {
                    type: 'all',
                    text: 'All'
                }]
            },

            scrollbar: {
                liveRedraw: false
            },

            xAxis: {
                plotLines: [],
                ordinal: false,
                events: {
                    afterSetExtremes:
                        function () {
                            //console.warn(['Viewing: ',new Date(this.min), new Date(this.max)]);
                        }
                }
            },

            yAxis: {
                allowDecimals: false,
                labels: {}
            },

            loading: {
                style: {
                    position: 'absolute',
                    backgroundColor: 'white',
                    opacity: 0.5,
                    textAlign: 'center'
                }
            },

            plotOptions: {
                column: {
                    animation: true,
                    stacking: 'normal',
                    pointPadding: 0,
                    borderWidth: 1,
                    groupPadding: 0,
                    shadow: false,
                    dataLabels: {
                        enabled: false,
                        color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'black'
                    },
                    dataGrouping: {
                        groupPixelWidth: 20
                    },
                    point: {
                        events: {
                            dblclick: this.dataCoverageScatterPlot,
                            click: function(event) {
                                var date = new Date(this.x);
                            }
                        }
                    }
                }
            },

            tooltip: {
                pointFormat: '<span style="color:{series.color}; font-weight: bold;">{series.name}:</span> {point.y} images<br/>',
                valueDecimals: 0,
                crosshairs: true,
                followPointer: false,
                shared: true,
                xDateFormat: "%A, %b %e, %H:%M UTC"
            },

            navigator: {
                baseSeries: 0,
                maskFill: 'rgba(180, 198, 220, 0.5)',
                series: {
                    type: 'column',
                    color: '#ddd',
                    fillOpacity: 0.4
                },
                xAxis: {
                    dateTimeLabelFormats: {
                        millisecond: '%H:%M:%S.%L',
                        second: '%H:%M:%S',
                        minute: '%H:%M',
                        hour: '%H:%M',
                        day: '%e. %b',
                        week: '%e. %b',
                        month: '%b %Y',
                        year: '%Y'
                    },
                    ordinal: false
                }
            },

            legend: {
                enabled: true,
                itemDistance: 12,
            },

            series: this._seriesOptions
        };

        return true;
    },

    loadIntoTimeline: function (url) {
        var self = this;

        $.getJSON(url, function(data) {
            while(self._timeline.series.length > 0) {
                self._timeline.series[0].remove(false);
            }
            self._timeline.redraw();

            var count = 0;
            $.each(data, function (sourceId, series) {
                self._timeline.addSeries({
                    name: series['label'],
                    data: series['data'],
                    color: _colors[sourceId]
                }, true, false);
                count++;
            });

            self._timeline.xAxis[0].setExtremes(
                self._timeline.xAxis[0].getExtremes().dataMin,
                self._timeline.xAxis[0].getExtremes().dataMax
            );

            self._timeline.redraw();
            self._timeline.hideLoading();
        });
    },


    loadingIndicator: function (show) {
        if ( show || show === undefined ) {
            this._timeline.showLoading('Fetching data from server...');
        }
        else {
            this._timeline.hideLoading();
        }
    },


    dataCoverageScatterPlot: function (event) {

        var binSize = this.series.closestPointRange,
            chart = $('#data-coverage-timeline').highcharts(),
            url, startDate, endDate, count;

        startDate = new Date(this.x).toISOString();
        endDate   = new Date(this.x + binSize).toISOString();

        if ( binSize > 60*60*1000 ) {
            $('#btn-zoom-in').trigger(
                'click',
                {   'binStart' : startDate,
                    'binEnd'   : endDate    }
            );
            return true;
        }

        $('#btn-prev').hide();
        $('#btn-next').hide();
        $('#btn-zoom-in').hide();
        $('#btn-zoom-out').hide();
        $('#btn-plotline').hide();


        url  = 'http://dev4.helioviewer.org/api/v1/getDataCoverageDetail/';
        url += '?imageLayers='+'[12,1,100],[13,1,100],[14,1,100],[15,1,100],[16,1,100]';
        url += '&startDate='+startDate;
        url += '&endDate='+endDate;

        $.getJSON(url, function(data) {

            var seriesOptions = [];

            count = 0;
            $.each(data, function (sourceId, series) {222
                seriesOptions[count] = {
                    name  : series['label'],
                    data  : series['data'],
                    id    : count,
                    color : _colors[sourceId]
                };
                count++;
            });

            // Create the chart
            $('#data-coverage-timeline').highcharts('StockChart', {

                title : {
                    text : 'Individual Images'
                },

                chart : {
                    type: 'scatter',
                    zoomType: 'x'
                },

                tooltip: {
                    pointFormat: '<span style="color:{series.color}; font-weight: bold;">{point.x}</span><br/>',
                    valueDecimals: 0,
                    crosshairs: true,
                    followPointer: false,
                    shared: false,
                    dateTimeLabelFormats: {
                        millisecond:"%A, %b %e, %H:%M:%S.%L",
                        second:"%A, %b %e, %H:%M:%S",
                        minute:"%A, %b %e, %H:%M",
                        hour:"%A, %b %e, %H:%M",
                        day:"%A, %b %e, %Y",
                        week:"Week from %A, %b %e, %Y",
                        month:"%B %Y",
                        year:"%Y"
                    },
                    xDateFormat: "%A, %b %e, %H:%M UTC"
                },

                credits: {
                    enabled: false
                },

                rangeSelector: {
                    selected: 3,
                    buttons: [{
                        type: 'minute',
                        count: 5,
                        text: '5m'
                    },
                    {
                        type: 'minute',
                        count: 10,
                        text: '10m'
                    },
                    {
                        type: 'minute',
                        count: 15,
                        text: '15m'
                    },
                    {
                        type: 'minute',
                        count: 30,
                        text: '30m'
                    },
                    {
                        type: 'all',
                        text: 'All'
                    }]
                },

                yAxis: {
                    floor: 0,
                    ceiling: 6,
                    allowDecimals: false,
                    labels: {
                        enabled: false,
                        formatter: function () {
                            return this.value;
                        }
                    }

                },

                plotOptions: {
                    series: {
                        marker: {
                            symbol: 'circle'
                        }
                    }
                },

                legend: {
                    enabled: true,
                    itemDistance: 12,
                },

                series : seriesOptions
            });
        });

        $('#btn-back').show();
    }

});
