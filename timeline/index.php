<!DOCTYPE HTML>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Data Coverage Stacked Histogram</title>

        <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js"></script>
        <script type="text/javascript">
$(function() {
    var imageLayers = '[9,1,100],[12,1,100]',
        startDate, endDate, startTimestamp, endTimestamp;
<?php

    if ( array_key_exists('imageLayers', $_GET) &&
        preg_match('/^[\[\],A-Za-z0-9\-]+$/', $_GET['imageLayers']) ) {

        echo 'imageLayers = "'.$_GET['imageLayers'].'";';
    }

    if ( array_key_exists('endDate', $_GET) &&
        preg_match('/^[-:TZ0-9\.]+$/', $_GET['endDate']) ) {

        echo 'endDate = "'.$_GET['endDate'].'";';
        $endDate = new DateTime($_GET['endDate']);
    }
    else {
        $endDate = new DateTime();
        echo 'endDate = "'.$endDate->format('Y-m-d\TH:i:s\Z').'";';
    }

    if ( array_key_exists('startDate', $_GET) &&
        preg_match('/^[-:TZ0-9\.]+$/', $_GET['startDate']) ) {

        echo 'startDate = "'.$_GET['startDate'].'";';
        $startDate = new DateTime($_GET['startDate']);
    }
    else {
        $startDate = clone $endDate;
        $startDate->sub(new DateInterval('P1Y'));
        echo 'startDate = "'.$startDate->format('Y-m-d\TH:i:s\Z').'";';
    }

    $startTimestamp = $startDate->getTimestamp() * 1000;
    echo 'startTimestamp = '.$startTimestamp.';';

    $endTimestamp = $endDate->getTimestamp() * 1000;
    echo 'endTimestamp = '.$endTimestamp.';';

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
        colors = [
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

    data = {"0":{"sourceId":"0","label":"Loading...","data":[[startTimestamp, null], [endTimestamp, null]]}};

    count = 0;
    $.each(data, function (sourceId, series) {
        seriesOptions[count] = {
            name: series['label'],
            data: series['data'],
            color: colors[sourceId],
            id: count
        };
        count++;
    });

    baseSeriesIndex = count - 1;
    createChart(baseSeriesIndex);


    var chart = $('#data-coverage-timeline').highcharts();

    chart.showLoading('Loading data from server...');

    var url = 'http://dev4.helioviewer.org/api/v1/getDataCoverage/?';
    url += 'imageLayers='+imageLayers;
    url += '&startDate='+startDate;
    url += '&endDate='+endDate;

    $.getJSON(url, function(data) {

        while(chart.series.length > 0) {
            chart.series[0].remove(false);
        }
        chart.redraw();

        var count = 0;
        $.each(data, function (sourceId, series) {
            chart.addSeries({
                name: series['label'],
                data: series['data'],
                color: colors[sourceId]
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
                height: 400,
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
                            //console.warn(['Viewing: ',new Date(this.min), new Date(this.max)]);
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
                            dblclick: function () {
                                chart.destroy();

                                $(function() {
                                    $.getJSON('http://www.highcharts.com/samples/data/jsonp.php?filename=aapl-c.json&callback=?', function(data) {

                                        // Create the chart
                                        $('#data-coverage-timeline').highcharts('StockChart', {


                                            rangeSelector : {
                                                inputEnabled: $('#container').width() > 480,
                                                selected : 2
                                            },

                                            title : {
                                                text : 'AAPL Stock Price'
                                            },

                                            series : [{
                                                name : 'AAPL Stock Price',
                                                data : data,
                                                lineWidth : 0,
                                                marker : {
                                                    enabled : true,
                                                    radius : 2
                                                },
                                                tooltip: {
                                                    valueDecimals: 2
                                                }
                                            }]
                                        });
                                    });
                                });
                            },
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
                'endDate'     : endDate,
                'colors'      : colors
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
                            data: series['data'],
                            color: colors[sourceId]
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
                'endDate'     : endDate,
                'colors'      : colors
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
                            data: series['data'],
                            color: colors[sourceId]
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

    }

});
        </script>
    </head>
    <body>
        <script src="js/highstock.js"></script>
        <script src="custom_events-master/customEvents.js"></script>

        <button id="btn-zoom-out">Zoom Out</button>
        <button id="btn-zoom-in">Zoom In</button>
        <button id="btn-jump">Jump to Timestamp</button>
        <button id="btn-plotline">Add PlotLine</button>

        <div id="data-coverage-timeline" style="min-height: 500px;"></div>

        <button id="btn-prev" style="float: left;"><- Prev Year</button>
        <button id="btn-next" style="float: right;">Next Year -></button>
    </body>
</html>
