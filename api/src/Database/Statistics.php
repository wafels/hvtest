<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Statistics Class definition
 *
 * PHP version 5
 *
 * @category Database
 * @package  Helioviewer
 * @author   Jeff Stys <jeff.stys@nasa.gov>
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
/**
 * A simple module for recording query statistics
 *
 * @category Database
 * @package  Helioviewer
 * @author   Jeff Stys <jeff.stys@nasa.gov>
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
class Database_Statistics
{
    private $_dbConnection;

    /**
     * Creates an Statistics instance
     *
     * @return void
     */
    public function __construct() {
        include_once 'DbConnection.php';
        $this->_dbConnection = new Database_DbConnection();
    }

    /**
     * Adds a new entry to the statistics table
     *
     * param $type string The action type associated with the query
     */
    public function log($type) {
    	$this->_dbConnection->query("INSERT INTO statistics VALUES (NULL, NULL, '$type');");
    	return true;
    }

    /**
     * Gets latest usage statistics and returns them as JSON
     */
    public function getUsageStatistics($resolution) {
        require_once HV_API_DIR.'/src/Helper/DateTimeConversions.php';

        // Determine time intervals to query
        $interval = $this->_getQueryIntervals($resolution);

        // Array to keep track of counts for each action
        $counts = array(
            "buildMovie"           => array(),
            "getClosestImage"      => array(),
            "getJPX"               => array(),
            "takeScreenshot"       => array(),
            "uploadMovieToYouTube" => array(),
            "embed"                => array()
        );

        // Summary array
        $summary = array(
            "buildMovie"           => 0,
            "getClosestImage"      => 0,
            "getJPX"               => 0,
            "takeScreenshot"       => 0,
            "uploadMovieToYouTube" => 0,
            "embed"                => 0
        );

        // Format to use for displaying dates
        $dateFormat = $this->_getDateFormat($resolution);

        // Start date
        $date = $interval['startDate'];

        // Query each time interval
        for ($i = 0; $i < $interval["numSteps"]; $i++) {
            $dateIndex = $date->format($dateFormat); // Format date for array index
            $dateStart = toMySQLDateString($date);   // MySQL-formatted date string

            // Move to end date for the current interval
            $date->add($interval['timestep']);

            // Fill with zeros to begin with
            foreach ($counts as $action => $arr) {
                array_push($counts[$action], array($dateIndex => 0));
            }
            $dateEnd = toMySQLDateString($date);

            $sql = "SELECT action, COUNT(*) as count FROM statistics " .
                   "WHERE timestamp BETWEEN '$dateStart' AND '$dateEnd' GROUP BY action;";

            $result = $this->_dbConnection->query($sql);

            // And append counts for each action during that interval to the relevant array
            while ($count = $result->fetch_array(MYSQLI_ASSOC)) {
                $num = (int) $count['count'];

                $counts[$count['action']][$i][$dateIndex] = $num;
                $summary[$count['action']] += $num;
            }
        }

        // Include summary info
        $counts['summary'] = $summary;

        return json_encode($counts);
    }

    /**
     * Gets latest datasource coverage and return as JSON
     */
    public function getDataCoverage($layers) {

        // Get list of layer sourceIds
        $layerArray = $layers->toArray();
        $requestedLayerIds = array();
        foreach ($layerArray as $layer) {
            $requestedLayerIds[] = $layer['sourceId'];
        }
        $requestedLayerIds = implode(',', $requestedLayerIds);

        require_once 'src/Helper/DateTimeConversions.php';

        $sql = 'SELECT id, name, description FROM datasources WHERE id IN ('
             . $requestedLayerIds .') ORDER BY description';
        $result = $this->_dbConnection->query($sql);

        $output = array();

        while ($row = $result->fetch_array(MYSQLI_ASSOC)) {
            $sourceId = $row['id'];

            $output[$sourceId] = array();
            $output[$sourceId]['sourceId'] = $sourceId;
            $output[$sourceId]['label'] = $row['description'];
            $output[$sourceId]['data'] = array();
        }


        $sql = "SELECT sourceId, UNIX_TIMESTAMP(date) as timestamp, SUM(count) as count FROM data_coverage_5_min WHERE sourceId in (".$requestedLayerIds.") GROUP BY sourceId, timestamp ORDER BY timestamp;";
        $result = $this->_dbConnection->query($sql);

        while ( $row = $result->fetch_array(MYSQLI_ASSOC) ) {
            $output[$row['sourceId']]['data'][] = array((int)$row['timestamp']*1000, (int)$row['count']);
        }

        return json_encode($output);
    }

    /**
     * Update data source coverage data for the last 7 Days
     * (or specified time period).
     */
    public function updateDataCoverage($period=null) {

        if ( gettype($period) != 'string' ||
             preg_match('/^([0-9]+)([mhDMY])$/', $period, $matches) !== 1 ) {

            $magnitude   =  7;
            $period_abbr = 'D';
        }
        else {
            $magnitude   = $matches[1];
            $period_abbr = $matches[2];
        }

        switch ($period_abbr) {
        case 'm':
            $interval = 'INTERVAL '.$magnitude.' MINUTE';
            break;
        case 'h':
            $interval = 'INTERVAL '.$magnitude.' HOUR';
            break;
        case 'D':
            $interval = 'INTERVAL '.$magnitude.' DAY';
            break;
        case 'M':
            $interval = 'INTERVAL '.$magnitude.' MONTH';
            break;
        case 'Y':
            $interval = 'INTERVAL '.$magnitude.' YEAR';
            break;
        default:
            $interval = 'INTERVAL 7 DAY';
        }

        $sql = 'REPLACE INTO ' .
                    'data_coverage_5_min ' .
                '(date, sourceId, count) ' .
                'SELECT ' .
                    'SQL_BIG_RESULT SQL_BUFFER_RESULT SQL_NO_CACHE ' .
                    'CONCAT( ' .
                        'DATE_FORMAT(date, "%Y-%m-%d %H:"), '    .
                        'LPAD((MINUTE(date) DIV 5)*5, 2, "0"), ' .
                        '":00") AS "bin", ' .
                    'sourceId, ' .
                    'COUNT(id) ' .
                'FROM ' .
                    'images ' .
                'WHERE ' .
                    'date >= DATE_SUB(NOW(),'.$interval.') ' .
                'GROUP BY ' .
                    'bin, ' .
                    'sourceId;';
        $result = $this->_dbConnection->query($sql);


        $output = array(
            'result'     => $result,
            'interval'     => $interval
        );

        return json_encode($output);
    }

    /**
     * Determines date format to use for the x-axis of the requested resolution
     */
    private function _getDateFormat($resolution)
    {
        switch($resolution) {
            case "hourly":
                return "ga"; // 4pm
                break;
            case "daily":
                return "D";   // Tues
                break;
            case "weekly":
                return "M j"; // Feb 3
                break;
            case "monthly":
                return "M y"; // Feb 09
                break;
            case "yearly":
                return "Y";    // 2009
        }
    }

    /**
     * Determines time inverals to collect statistics for
     */
    private function _getQueryIntervals($resolution)
    {
        date_default_timezone_set('UTC');

        // Variables
        $date     = new DateTime();
        $timestep = null;
        $numSteps = null;

        // For hourly resolution, keep the hours value, otherwise set to zero
        $hour = ($resolution == "hourly") ? (int) $date->format("H") : 0;

        // Round end time to nearest hour or day to begin with (may round other units later)
        $date->setTime($hour, 0, 0);

        // Hourly
        if ($resolution == "hourly") {
            $timestep = new DateInterval("PT1H");
            $numSteps = 24;

            $date->add($timestep);

            // Subtract 24 hours
            $date->sub(new DateInterval("P1D"));
        }

        // Daily
        else if ($resolution == "daily") {
            $timestep = new DateInterval("P1D");
            $numSteps = 28;

            $date->add($timestep);

            // Subtract 4 weeks
            $date->sub(new DateInterval("P4W"));
        }

        // Weekly
        else if ($resolution == "weekly") {
            $timestep = new DateInterval("P1W");
            $numSteps = 26;

            $date->add(new DateInterval("P1D"));

            // Subtract 25 weeks
            $date->sub(new DateInterval("P25W"));
        }

        // Monthly
        else if ($resolution == "monthly") {
            $timestep = new DateInterval("P1M");
            $numSteps = 24;

            $date->modify('first day of next month');
            $date->sub(new DateInterval("P24M"));
        }

        // Yearly
        else if ($resolution == "yearly") {
            $timestep = new DateInterval("P1Y");
            $numSteps = 8;

            $year = (int) $date->format("Y");
            $date->setDate($year - $numSteps + 1, 1, 1);
        }

        // Array to store time intervals
        $intervals = array(
            "startDate" => $date,
            "timestep"  => $timestep,
            "numSteps"  => $numSteps
        );
//        $intervals = array();

//        for ($i=0; $i < $numSteps; $i++) {
//            $startDate = $date;
//            $date->add($timestep);
//            $endDate   = $date;
//
//            array_push($intervals, array("start" => $startDate, "end" => $endDate));
//        }

        return $intervals;
    }
}
?>
