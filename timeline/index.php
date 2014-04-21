<!DOCTYPE HTML>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Data Coverage Stacked Histogram</title>

        <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js"></script>
        <script type="text/javascript">
$(function() {

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


    $.getJSON('http://dev4.helioviewer.org/api/v1/getDataCoverage/?imageLayers=[SDO,AIA,AIA,211,1,100],[SDO,AIA,AIA,304,1,100],[SDO,AIA,AIA,335,1,100]', function(data) {

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
    });


    // create the chart when all data is loaded
    function createChart(baseSeriesIndex) {

        $('#data-coverage-timeline').highcharts('StockChart', {
            colors: [
                '#FF8F97',
            //    '#FFB294',
            //    '#FFD391',
                '#FEF38E',
            //    '#E8FF8C',
            //    '#C8FF8D',
                '#A3FF8D',
            //    '#7BFF8E',
            //    '#7AFFAE',
                '#7CFFC9',
                // '#81FFFC',
                // '#8CE6FF',
                '#95C6FF',
                // '#9DA4FF',
                // '#AB8CFF',
                '#CA89FF',
                // '#E986FF',
                // '#FF82FF',
                '#FF85FF',
                // '#FF8ACC',
                // '#FF8DAD'
            ],

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
                height: 900,
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

            xAxis: {
                plotLines: [{
                    value: 1396000000000,
                    width: 2,
                    color: 'black',
                    dashStyle: 'solid',
                    zIndex: 5,
                    label: {
                        text: 'Viewport',
                        verticalAlign: 'top',
                        align: 'center',
                        y: 30,
                        x: -5,
                        rotation: 270
                    }
                }]
            },

            yAxis: {
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
        chart.series[0].addPoint([1396029600000, 5000], false);
        chart.series[0].addPoint([1396137600000, 3000], false);
        chart.redraw();

        $('#btn-zoom-in').click({'chart':chart}, function(e){
            var min = chart.xAxis[0].getExtremes().min,
                max = chart.xAxis[0].getExtremes().max;

            chart.xAxis[0].setExtremes((min + 100 * 3600 * 1000), (max - 48 * 3600 * 1000));

        });

        $('#btn-zoom-out').click({'chart':chart}, function(e){
            var min = chart.xAxis[0].getExtremes().min,
                max = chart.xAxis[0].getExtremes().max;

            chart.xAxis[0].setExtremes((min - 100 * 3600 * 1000), (max + 48 * 3600 * 1000));

        });

    }

});
        </script>
    </head>
    <body>
<script src="js/highstock.js"></script>
<script src="js/modules/exporting.js"></script>

<button id="btn-zoom-in">Zoom In</button>
<button id="btn-zoom-out">Zoom Out</button>
<div id="data-coverage-timeline" style="height: 500px; min-width: 600px"></div>
    </body>
</html>
