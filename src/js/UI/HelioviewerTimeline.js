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
                'rgba(   3,   3, 128, 0.75)', // SOHO EIT 171
                'rgba(   3,  95,   3, 0.75)', // SOHO EIT 195
                'rgba( 121,  97,   2, 0.75)', // SOHO EIT 284
                'rgba( 137,   3,   3, 0.75)', // SOHO EIT 304
                'rgba( 143,   0,   0, 0.75)', // SOHO LASCO C2
                'rgba(   0,  39, 175, 0.75)', // SOHO LASCO C3
                'rgba( 143, 143, 143, 0.75)', // SOHO MDI Mag
                'rgba( 111, 111, 111, 0.75)', // SOHO MDI Int
                'rgba(  52, 140, 128, 0.75)', // SDO AIA 94
                'rgba(   7, 184, 184, 0.75)', // SDO AIA 131
                'rgba( 183, 127,   0, 0.75)', // SDO AIA 171
                'rgba( 179, 127,  62, 0.75)', // SDO AIA 191
                'rgba( 179, 127, 141, 0.75)', // SDO AIA 211
                'rgba( 183,  11,   0, 0.75)', // SDO AIA 304
                'rgba(  62, 127, 179, 0.75)', // SDO AIA 335
                'rgba( 140, 140,  62, 0.75)', // SDO AIA 1600
                'rgba( 178, 127, 127, 0.75)', // SDO AIA 1700
                'rgba( 255, 255, 126, 0.75)', // SDO AIA 4500
                'rgba( 143, 143, 143, 0.75)', // SDO MDI Int
                'rgba( 111, 111, 111, 0.75)', // SDO MDI Mag
                'rgba(  50, 172,   0, 0.75)', // STEREO A EUVI 171
                'rgba( 160, 104,   0, 0.75)', // STEREO A EUVI 195
                'rgba( 138, 111,   1, 0.75)', // STEREO A EUVI 284
                'rgba( 141,   0,   0, 0.75)', // STEREO A EUVI 304
                'rgba(  50, 172,   0, 0.75)', // STEREO B EUVI 171
                'rgba( 160, 104,   0, 0.75)', // STEREO B EUVI 195
                'rgba( 138, 111,   1, 0.75)', // STEREO B EUVI 284
                'rgba( 141,   0,   0, 0.75)', // STEREO B EUVI 304
                'rgba(  63, 137,   0, 0.75)', // STEREO A COR1
                'rgba( 196,  29,   0, 0.75)', // STEREO A COR2
                'rgba(  63, 137,   0, 0.75)', // STEREO B COR1
                'rgba( 196,  29,   0, 0.75)', // STEREO B COR2
                'rgba( 183, 126,   0, 0.75)', // PROBA-2 SWAP 174
                'rgba( 242, 159,   0, 0.75)', // Yohkoh SXT AlMgMn
                'rgba( 242, 159,   0, 0.75)', // Yohkoh SXT thin-Al
                'rgba( 127, 127, 127, 0.75)'  // Yohkoh SXT white-light
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
                rangeSelectorZoom: 'Zoom:',
                rangeSelectorFrom: 'Displaying:  ',
                rangeSelectorTo: 'through:  '
            }
        });

        Highcharts.createElement('link', {
           href: 'http://fonts.googleapis.com/css?family=Source+Code+Pro:200,300,400,700',
           rel: 'stylesheet',
           type: 'text/css'
        }, null, document.getElementsByTagName('head')[0]);

        Highcharts.theme = {
           chart: {
              backgroundColor: 'rgba(0,0,0,0)',
              style: {
                 fontFamily: "'Source Code Pro', monospace",
                 fontWeight: '300'
              },
              plotBorderColor: '#606063'
           },
           title: {
              style: {
                 color: '#E0E0E3',
                 //textTransform: 'uppercase',
                 fontSize: '20px',
                 fontFamily: "'Source Code Pro', monospace",
                 fontWeight: '200'
              }
           },
           subtitle: {
              style: {
                 color: '#E0E0E3',
                 //textTransform: 'uppercase'
                 fontFamily: "'Source Code Pro', monospace",
                 fontWeight: '200'
              }
           },
           loading: {
              labelStyle: {
                color: '#fff',
                position: 'relative',
                top: '1em',
                fontSize: '1.5em',
                fontFamily: "'Source Code Pro', monospace",
                fontWeight: '200'
              }
           },
           xAxis: {
              gridLineColor: '#707073',
              labels: {
                 style: {
                    color: '#E0E0E3',
                    fontFamily: "'Source Code Pro', monospace",
                    fontWeight: '200'
                 }
              },
              lineColor: '#707073',
              minorGridLineColor: '#505053',
              tickColor: '#707073',
              title: {
                 style: {
                    color: '#A0A0A3'

                 }
              }
           },
           yAxis: {
              gridLineColor: '#707073',
              labels: {
                 enabled: false,
                 style: {
                    color: '#E0E0E3'
                 }
              },
              lineColor: '#707073',
              minorGridLineColor: '#505053',
              tickColor: '#707073',
              tickWidth: 1,
              title: {
                 style: {
                    color: '#A0A0A3'
                 }
              }
           },
           tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              style: {
                 color: '#F0F0F0'
              }
           },
           plotOptions: {
              series: {
                 dataLabels: {
                    color: '#B0B0B3'
                 },
                 marker: {
                    lineColor: '#333'
                 }
              },
              boxplot: {
                 fillColor: '#505053'
              },
              candlestick: {
                 lineColor: 'white'
              },
              errorbar: {
                 color: 'white'
              }
           },
           legend: {
              itemStyle: {
                 color: '#E0E0E3',
                    fontFamily: "'Source Code Pro', monospace",
                    fontWeight: '200'
              },
              itemHoverStyle: {
                 color: '#FFF'
              },
              itemHiddenStyle: {
                 color: '#606063'
              },
              verticalAlign: 'top'
           },
           credits: {
              style: {
                 color: '#666'
              }
           },
           labels: {
              style: {
                 color: '#707073'
              }
           },

           drilldown: {
              activeAxisLabelStyle: {
                 color: '#F0F0F3'
              },
              activeDataLabelStyle: {
                 color: '#F0F0F3'
              }
           },

           navigation: {
              buttonOptions: {
                 symbolStroke: '#DDDDDD',
                 theme: {
                    fill: '#505053'
                 }
              }
           },

           // scroll charts
           rangeSelector: {
              buttonTheme: {
                 fill: '#505053',
                 stroke: '#000000',
                 style: {
                    color: '#CCC'
                 },
                 states: {
                    hover: {
                       fill: '#707073',
                       stroke: '#000000',
                       style: {
                          color: 'white'
                       }
                    },
                    select: {
                       fill: '#000003',
                       stroke: '#000000',
                       style: {
                          color: 'white'
                       }
                    }
                 }
              },
              inputBoxBorderColor: '#505053',
              inputStyle: {
                 backgroundColor: '#333',
                 color: 'silver'
              },
              labelStyle: {
                 color: 'silver'
              },
              inputBoxWidth: 175,
              inputDateFormat: '%Y-%m-%d %H:%M:%S UTC',
              inputEditDateFormat: '%Y-%m-%d %H:%M:%S UTC'
              //inputEnabled: false
           },

           navigator: {
              handles: {
                 backgroundColor: '#666',
                 borderColor: '#AAA'
              },
              outlineColor: '#CCC',
              maskFill: 'rgba(255,255,255,0.1)',
              series: {
                 color: '#7798BF',
                 lineColor: '#A6C7ED'
              },
              xAxis: {
                 gridLineColor: '#505053'
              }
           },

           scrollbar: {
              barBackgroundColor: '#808083',
              barBorderColor: '#808083',
              buttonArrowColor: '#CCC',
              buttonBackgroundColor: '#606063',
              buttonBorderColor: '#606063',
              rifleColor: '#FFF',
              trackBackgroundColor: '#404043',
              trackBorderColor: '#404043'
           },

           // special colors for some of the
           legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
           background2: '#505053',
           dataLabelsColor: '#B0B0B3',
           textColor: '#C0C0C0',
           contrastTextColor: '#F0F0F3',
           maskColor: 'rgba(255,255,255,0.3)'
        };

        // Apply the theme
        Highcharts.setOptions(Highcharts.theme);

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
        var url, startDate, endDate, imageLayers, layers=[];

        this._timeline = $('#data-coverage-timeline').highcharts();

        $('#btn-back').hide();
        $('#btn-prev').show();
        $('#btn-next').show();
        $('#btn-zoom-in').show();
        $('#btn-zoom-out').show();
        $('#btn-plotline').show();

        this.renderPlaceholder();
        this.loadingIndicator(true);

        imageLayers = Helioviewer.userSettings.get("state.tileLayers");
        $.each(imageLayers, function (i, obj) {
            layers.push('[' + obj.sourceId + ',1,100]');
        });
        layers = layers.join(',');
        console.warn(layers);

        // TODO: Need to fetch real dates that had been saved in properties
        startDate = '2014-01-01T00:00:00Z';
        endDate = '2014-05-01T00:00:00Z';

        url  = 'http://dev4.helioviewer.org/api/v1/getDataCoverage/';
        url += '?imageLayers='+layers;
        url += '&startDate='+startDate;
        url += '&endDate='+endDate;

        this.loadIntoTimeline(url);
    },


    btnPrev: function () {
        var self = this, url, month, date, imageLayers, layers=[];

        this._timeline = $('#data-coverage-timeline').highcharts();
        this._timeline.showLoading('Loading data from server...');

        imageLayers = Helioviewer.userSettings.get("state.tileLayers");
        $.each(imageLayers, function (i, obj) {
            layers.push('[' + obj.sourceId + ',1,100]');
        });
        layers = layers.join(',');
        console.warn(layers);

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
        url += 'imageLayers=' + layers;
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
        url += 'imageLayers=' + layers;
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
                color: '#fff',
                dashStyle: 'solid',
                zIndex: 5,
                id: 'viewport-plotline',
                label: {
                    text: 'Viewport',
                    verticalAlign: 'top',
                    align: 'center',
                    y: 30,
                    x: -5,
                    rotation: 270,
                    style: {
                        color: 'white'
                    }
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
        var self = this, imageLayers;

        $('#btn-zoom-in').bind('click', $.proxy(this.btnZoomIn, this));
        $('#btn-zoom-out').bind('click', $.proxy(this.btnZoomOut, this));
        $('#btn-plotline').bind('click', $.proxy(this.btnPlotline, this));

        $('#btn-prev').bind(
            'click',
            $.proxy(this.btnPrev, this)
        );

        $('#btn-next').bind(
            'click',
            $.proxy(this.btnNext, this)
        );

        $('#btn-back').bind('click', $.proxy(this.btnBack, this));



        this._container.bind('mousedown',
            function (event) {
                return false;
            }
        );

        this._container.bind('dblclick',
            function (event) {
                return false;
            }
        );
        this._container.bind('click',
            function (event) {
                return false;
            }
        );
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
            chart: {
                type: 'column',
                stacking: 'normal',
                zoomType: 'x',
                //height: 360,
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
                    backgroundColor: 'black',
                    color: 'white',
                    opacity: 0.5,
                    textAlign: 'center'
                }
            },

            plotOptions: {
                column: {
                    animation: true,
                    stacking: 'normal',
                    pointPadding: 0,
                    borderWidth: 0.5,
                    borderColor: '#000',
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
                maskFill: 'rgba(100, 100, 100, 0.5)',
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
            this._timeline.showLoading('Loading data from server...');
        }
        else {
            this._timeline.hideLoading();
        }
    },


    dataCoverageScatterPlot: function (event) {

        var binSize = this.series.closestPointRange,
            chart = $('#data-coverage-timeline').highcharts(),
            url, startDate, endDate, count, layers=[], imageLayers;

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

        imageLayers = Helioviewer.userSettings.get("state.tileLayers");
        $.each(imageLayers, function (i, obj) {
            layers.push('[' + obj.sourceId + ',1,100]');
        });
        layers = layers.join(',');
        console.warn(layers);


        url  = 'http://dev4.helioviewer.org/api/v1/getDataCoverageDetail/';
        url += '?imageLayers='+layers;
        url += '&startDate='+startDate;
        url += '&endDate='+endDate;

        $.getJSON(url, function(data) {

            var seriesOptions = [];

            count = 0;
            $.each(data, function (sourceId, series) {
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
                chart : {
                    type: 'scatter',
                    //zoomType: 'x'
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
                    },
                    scatter: {
                        point: {
                            events: {
                                dblclick: function () {
                                    var date = new Date(this.x);
                                    $(document).trigger("observation-time-changed", [date]);
                                },
                            }
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
