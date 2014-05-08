<!DOCTYPE HTML>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Helioviewer Timeline</title>
    </head>
    <body>

        <button id="btn-zoom-out">Zoom Out</button>
        <button id="btn-zoom-in">Zoom In</button>
        <button id="btn-plotline">Add PlotLine</button>

        <div id="data-coverage-timeline" style="min-height: 500px;"></div>

        <button id="btn-prev" style="float: left;"><- Prev Year</button>
        <button id="btn-next" style="float: right;">Next Year -></button>


        <!-- Library JavaScript -->
        <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js" type="text/javascript"></script>
        <script src="../lib/jquery.class/jquery.class.min.js" type="text/javascript"></script>
        <script src="js/highstock.js"></script>
        <script src="custom_events-master/customEvents.js"></script>
        <script src="js/helioviewerTimeline.js"></script>

        <script>
            var container = $('#data-coverage-timeline'),
                chart = new HelioviewerTimeline(container),
                url, startDate, endDate, imageLayers;

                chart.renderPlaceholder();
                chart.loadingIndicator(true);

                imageLayers = '[14,1,100],[15,1,100]';
                startDate = new Date(chart._timeline.xAxis[0].getExtremes().dataMin).toISOString();
                endDate = new Date(chart._timeline.xAxis[0].getExtremes().dataMax).toISOString();

                url  = 'http://dev4.helioviewer.org/api/v1/getDataCoverage/';
                url += '?imageLayers='+imageLayers;
                url += '&startDate='+startDate;
                url += '&endDate='+endDate;

                chart.loadIntoTimeline(url);
        </script>
    </body>
</html>
