<!DOCTYPE HTML>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Data Coverage Stacked Histogram</title>

        <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js"></script>
        <script type="text/javascript">
$(function() {
    var imageLayers = '[15,1,100],[16,1,100]',
        startDate, endDate;
<?php

    if ( array_key_exists('imageLayers', $_GET) &&
        preg_match('/^[\[\],A-Za-z0-9]+$/', $_GET['imageLayers']) ) {

        echo 'imageLayers = "'.$_GET['imageLayers'].'";';
    }

    if ( array_key_exists('endDate', $_GET) &&
        preg_match('/^[-:TZ0-9\.]+$/', $_GET['endDate']) ) {

        echo 'endDate = "'.$_GET['endDate'].'";';
    }
    else {
        $endDate = new DateTime();
        echo 'endDate = "'.$endDate->format('Y-m-d\TH:i:s\Z').'";';
    }

    if ( array_key_exists('startDate', $_GET) &&
        preg_match('/^[-:TZ0-9\.]+$/', $_GET['startDate']) ) {

        echo 'startDate = "'.$_GET['startDate'].'";';
    }
    else {
        $startDate = clone $endDate;
        $startDate->sub(new DateInterval('P1Y'));
        echo 'startDate = "'.$startDate->format('Y-m-d\TH:i:s\Z').'";';
    }

?>

    var toISOString = Date.prototype.toISOString;
    Date.prototype.toISOString = function () {
        var date = toISOString.call(this).replace(/"/g, '');

        if (date.length === 20) {
            date = date.substring(0, 19) + ".000Z";
        }

        return date;
    };


    var seriesOptions = [],
        yAxisOptions = [],
        count = 0, baseSeriesIndex,
        colors = Highcharts.getOptions().colors;


    Highcharts.setOptions({
        global: {
            useUTC: true,
            timezoneOffset: 0 * 60
        },
        lang: {
            contextButtonTitle: 'Chart save & print options...',
            downloadJPEG: 'Download JPG image',
            loading: 'Loading Timeline Data...',
            rangeSelectorZoom: 'Range:',
            rangeSelectorFrom: 'View:  '
        }
    });

    data = {"0":{"sourceId":"0","label":"Loading...","data":[[1366719000000, null], [1398252600000, null]]}};

    count = 0;
    $.each(data, function (sourceId, series) {
        seriesOptions[count] = {
            name: series['label'],
            data: series['data']
        };
        count++;
    });

    baseSeriesIndex = count - 1;
    createChart(baseSeriesIndex);


    var chart = $('#data-coverage-timeline').highcharts();

    chart.showLoading('Loading data from server...');

    $.getJSON('http://dev4.helioviewer.org/api/v1/getDataCoverage/?imageLayers='+imageLayers, function(data) {

        while(chart.series.length > 0) {
            chart.series[0].remove(false);
        }
        chart.redraw();

        var count = 0;
        $.each(data, function (sourceId, series) {
            chart.addSeries({
                name: series['label'],
                data: series['data']
            }, true, false);
            count++;
        });

        chart.redraw();
        chart.hideLoading();
    });


    // create the chart when all data is loaded
    function createChart(baseSeriesIndex) {

        $('#data-coverage-timeline').highcharts('StockChart', {


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
                height: 500,
                events: {
                    click: function(event) {
                        var date = new Date(event.xAxis[0].value);
                        console.warn(date.toISOString());
                    }
                }
            },

            credits: {
                enabled: false
            },

            rangeSelector: {
                selected: 3,
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
                }, {
                    type: 'ytd',
                    text: 'YTD'
                }, {
                    type: 'year',
                    count: 1,
                    text: '1y'
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
                            console.warn(['Viewing: ',new Date(this.min), new Date(this.max)]);
                        }
                }
            },

            yAxis: {
                allowDecimals: false,
                labels: {

                }
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
                    animation: false,
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
                            click: function(event) {
                                var date = new Date(this.x);
                                console.warn(date.toISOString());
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
                baseSeries: baseSeriesIndex,
                maskFill: 'rgba(180, 198, 220, 0.5)',
                series: {
                    type: 'column',
                    color: '#ddd',
                    fillOpacity: 0.4
                }
            },

            legend: {
                enabled: true,
                itemDistance: 12,
            },

            series: seriesOptions
        });

        var chart = $('#data-coverage-timeline').highcharts();
        // chart.showLoading('Loading, please wait...');
        // chart.series[0].addPoint([1396029600000, 5000], false);
        // chart.series[0].addPoint([1396137600000, 3000], false);
        // chart.redraw();
        // chart.hideLoading();

        $('#btn-zoom-in').click({'chart':chart}, function(e){
            var extremes = chart.xAxis[0].getExtremes(),
                newMin, newMax, span, scaleFactor = 0.2;

            span = extremes.max - extremes.min;
            newMin = extremes.min+(span*scaleFactor);
            newMax = extremes.max-(span*scaleFactor);

            chart.xAxis[0].setExtremes(newMin, newMax);
        });

        $('#btn-zoom-out').click({'chart':chart}, function(e){
            var extremes = chart.xAxis[0].getExtremes(),
                newMin, newMax, span, scaleFactor = 0.2;

            span   = extremes.max - extremes.min;

            newMin = extremes.min-(span*scaleFactor);
            newMin = newMin < extremes.dataMin ? extremes.dataMin : newMin;

            newMax = extremes.max+(span*scaleFactor);
            newMax = newMax > extremes.dataMax ? extremes.dataMax : newMax;

            chart.xAxis[0].setExtremes(newMin, newMax);
        });


        var hasPlotLine = false;
        $('#btn-plotline').click({'chart':chart, 'hasPlotLine':hasPlotLine}, function(e){
            if (!hasPlotLine) {
                chart.xAxis[0].addPlotLine({
                    value: 1396000000000,
                    width: 2,
                    color: 'black',
                    dashStyle: 'solid',
                    zIndex: 5,
                    id: 'plot-line-1',
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
            } else {
                chart.xAxis[0].removePlotLine('plot-line-1');
                $('#btn-plotline').html('Add plot line');
            }
            hasPlotLine = !hasPlotLine;
        });


        $('#btn-prev').click(
            {   'chart'       : chart,
                'imageLayers' : imageLayers,
                'startDate'   : startDate,
                'endDate'     : endDate
            },
            function (e) {
                chart.showLoading('Loading data from server...');

                var date;

                date = Date.parse(startDate);
                date = new Date(date);
                var year = date.getFullYear();
                date.setYear(year-1);
                startDate = date.toISOString();

                date = Date.parse(endDate);
                date = new Date(date);
                var year = date.getFullYear();
                date.setYear(year-1);
                endDate = date.toISOString();

                var url='http://dev4.helioviewer.org/api/v1/getDataCoverage/?';
                url += 'imageLayers=' + imageLayers;
                url += '&startDate=' + startDate;
                url += '&endDate=' + endDate;

                console.warn(url);

                $.getJSON(url, function(data) {

                    while(chart.series.length > 0) {
                        chart.series[0].remove(false);
                    }
                    chart.redraw();

                    var count = 0;
                    $.each(data, function (sourceId, series) {
                        chart.addSeries({
                            name: series['label'],
                            data: series['data']
                        }, true, false);
                        count++;
                    });

                    chart.xAxis[0].setExtremes(
                        chart.xAxis[0].getExtremes().dataMin,
                        chart.xAxis[0].getExtremes().dataMax
                    );

                    chart.redraw();
                    chart.hideLoading();
                });
            }
        );


        $('#btn-next').click(
            {   'chart'       : chart,
                'imageLayers' : imageLayers,
                'startDate'   : startDate,
                'endDate'     : endDate
            },
            function (e) {
                chart.showLoading('Loading data from server...');

                var date;

                date = Date.parse(startDate);
                date = new Date(date);
                var year = date.getFullYear();
                date.setYear(year+1);
                startDate = date.toISOString();

                date = Date.parse(endDate);
                date = new Date(date);
                var year = date.getFullYear();
                date.setYear(year+1);
                endDate = date.toISOString();

                var url='http://dev4.helioviewer.org/api/v1/getDataCoverage/?';
                url += 'imageLayers=' + imageLayers;
                url += '&startDate=' + startDate;
                url += '&endDate=' + endDate;

                console.warn(url);

                $.getJSON(url, function(data) {

                    while(chart.series.length > 0) {
                        chart.series[0].remove(false);
                    }
                    chart.redraw();

                    var count = 0;
                    $.each(data, function (sourceId, series) {
                        chart.addSeries({
                            name: series['label'],
                            data: series['data']
                        }, true, false);
                        count++;
                    });

                    chart.xAxis[0].setExtremes(
                        chart.xAxis[0].getExtremes().dataMin,
                        chart.xAxis[0].getExtremes().dataMax
                    );

                    chart.redraw();
                    chart.hideLoading();
                });
            }
        );




        $('#btn-load').click({'chart':chart}, function (e) {

            var chart = $('#data-coverage-timeline').highcharts();
            chart.showLoading('Loading data from server...');
            $.getJSON('http://dev4.helioviewer.org/api/v1/getDataCoverage/?imageLayers=[14,1,100],[9,1,100]&endDate=2013-01-01T00:00:00.000Z', function(data) {

                while(chart.series.length > 0) {
                    chart.series[0].remove(false);
                }
                chart.redraw();

                var count = 0;
                $.each(data, function (sourceId, series) {
                    chart.addSeries({
                        name: series['label'],
                        data: series['data']
                    }, true, false);
                    count++;
                });

                chart.xAxis[0].setExtremes( 1328400000000,  1345161600000);

                chart.redraw();
                chart.hideLoading();
            });
        });

        $('#btn-jump').click({'chart':chart}, function (e) {
                chart.xAxis[0].setExtremes(
                    1395913600000,
                    1396086400000
                );
        });

    }

});
        </script>
    </head>
    <body>
        <script src="js/highstock.js"></script>
        <script src="js/modules/exporting.js"></script>

        <button id="btn-zoom-out">Zoom Out</button>
        <button id="btn-zoom-in">Zoom In</button>
        <button id="btn-jump">Jump to Timestamp</button>
        <button id="btn-plotline">Add PlotLine</button>
        <button id="btn-load">Load Data</button>

        <div id="data-coverage-timeline" style="min-height: 500px;"></div>

        <button id="btn-prev" style="float: left;"><- Previous</button>
        <button id="btn-next" style="float: right;">Next -></button>
    </body>
</html>
