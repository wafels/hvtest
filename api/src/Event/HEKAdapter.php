<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * HEKAdapter Class Definition
 * 
 * PHP version 5
 * 
 * @category Event
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
define("HEK_BASE_URL", "http://www.lmsal.com/hek/her");
define("HEK_CACHE_DIR", HV_CACHE_DIR."/events");
define("HEK_CACHE_WINDOW_HOURS", 24);  // 1,2,3,4,6,8,12,24 are valid

/**
 * An Adapter to the HEK to allow AJAX requests to be made to the event service
 * 
 * @category Event
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 * @see      http://www.lmsal.com/helio-informatics/hpkb/
 */
class Event_HEKAdapter
{
    private $_baseURL;
    private $_proxy;
    
    /**
     * Creates a new HEKAdapter instance
     *  
     * @return void
     */
    public function __construct()
    {
        $this->_baseURL = HEK_BASE_URL . '?cosec=2&cmd=search&type=column' 
                                       . '&event_coordsys=helioprojective&x1=-30000&x2=30000&y1=-30000&y2=30000&';
        $this->_defaultEventTypesJSONPath = HV_API_ROOT_DIR.'/resources/JSON/defaultEventTypes.json';

        include_once 'src/Net/Proxy.php';
        $this->_proxy = new Net_Proxy($this->_baseURL);
    }

    /**
     * Return a list of event FRMs sorted by event type
     * 
     * @param string $startTime Query start date
     * @param string $endTime   Query end date 
     * 
     * @return JSON List of event FRMs sorted by event type 
     */
    public function getFRMs($startTime, $endTime)
    {
        $params = array(
            "event_starttime" => $startTime,
            "event_endtime"   => $endTime,
            "event_type"      => "**",
            "result_limit"    => 200,
            "return"          => "frm_name,frm_url,frm_contact,event_type,concept"
        );
        
        $decoded = json_decode($this->_proxy->query($params, true), true);

        // create an array to keep track of which FRMs have been added
        $names = array();

        $unsorted = array();
        
        // remove redundant entries
        foreach ($decoded['result'] as $row) {
            $name = $row["frm_name"];
            if (!array_key_exists($name, $names)) {
                $names[$name] = 1;
                array_push($unsorted, $row);
            } else { 
                $names[$name]++;
            }
        }

        $sorted = array();
        
        // sort by event type
        foreach ($unsorted as $frm) {
            $eventType = $frm['concept'].'/'.$frm['event_type'];
            $name      = $frm["frm_name"];
            
            if (!isset($sorted[$eventType]))
                $sorted[$eventType] = array();

            // remove redundant event_type and frm_parameters and add count
            unset($frm["event_type"]);
            //unset($frm["frm_name"]);
            $frm["count"] = $names[$name];
            
            $sorted[$eventType][$name] = $frm;
        }
        
        return json_encode($sorted);
    }

    /**
     * Return a JSON string containing an object pre-populated with event types
     * 
     * @return JSON string 
     */
    public function getDefaultEventTypes()
    {
        $handle = @fopen($this->_defaultEventTypesJSONPath, 'r');
        $json   = @fread($handle, @filesize($this->_defaultEventTypesJSONPath));
        @fclose($handle);
        
        return $json;
    }


    /**
     * Return a JSON string containing an object of event type parameters
	 *    containing an array of FRMs
     * 
     * @param string $startTime Query start date
     * 
     * @return JSON List of event FRMs sorted by event type 
     */
    public function getEventFRMs($startTime)
    {
        $defaultEventTypes = json_decode($this->getDefaultEventTypes());
		
        $events = $this->getEvents($startTime, Array());
        //return json_encode($events);
        

		foreach ($defaultEventTypes as $eventType => $eventTypeObject) {
			foreach ($events as $eventIndex => $event) {
				if ( $eventType == trim($event['concept']).'/'.$event['event_type'] ) {
					if ( property_exists($eventTypeObject, $event['frm_name']) ) {
						$eventTypeObject->{$event['frm_name']}->count++;
					}
					else {
						$newFRM = new stdClass;
						$newFRM->frm_name    = $event['frm_name'];
						$newFRM->frm_url     = $event['frm_url'];
						$newFRM->frm_contact = $event['frm_contact'];
						$newFRM->concept     = $event['concept'];
						$newFRM->count       = 1;
						$eventTypeObject->{$event['frm_name']}= $newFRM;
					}
				}
			}
		}
		return json_encode($defaultEventTypes);
    }
    

    
    /**
     * Returns an array of event objects as a JSON string
     * 
     * @param date   $startTime Start time for which events should be retrieved
     * @param string $options   Optional parameters
     * 
     * @return JSON string
     */
    public function getEvents($startTime, $options)
    {
        include_once "src/Helper/DateTimeConversions.php";
		$events = Array();
         
        // Default options
        $defaults = array(
            'eventType' => '**',
            'cacheOnly' => false
        );
        $options = array_replace($defaults, $options);
        if ( $options['eventType'] == '' ) {
        	$options['eventType'] = '**';
        }
		
		$dateArray = date_parse($startTime);

		
		// Determine JSON cache filename
		
		$hourOffset = floor($dateArray['hour']/HEK_CACHE_WINDOW_HOURS)*HEK_CACHE_WINDOW_HOURS;
		
		$externalAPIStartTime = implode('-', Array($dateArray['year'],
		                                           str_pad($dateArray['month'],2,'0',STR_PAD_LEFT),
		                                           str_pad($dateArray['day'],  2,'0',STR_PAD_LEFT)))
		                      . 'T' 
		                      . implode(':', Array($hourOffset,'00:00.000Z'));

		$externalAPIEndTime   = implode('-', Array($dateArray['year'],
		                                           str_pad($dateArray['month'],2,'0',STR_PAD_LEFT),
		                                           str_pad($dateArray['day'],  2,'0',STR_PAD_LEFT)))
		                      . 'T' 
		                      . str_pad($hourOffset+HEK_CACHE_WINDOW_HOURS-1,  2,'0',STR_PAD_LEFT)
		                      . ':59:59.999Z';
		
		$cache_base_dir = HV_CACHE_DIR.'/events/'.$dateArray['year'];
		$cache_filename = $cache_base_dir.'/'
		                     . str_pad($dateArray['month'],2,'0',STR_PAD_LEFT).'-'
		                     . str_pad($dateArray['day'],2,'0',STR_PAD_LEFT)  .'_'
		                     . str_pad($hourOffset,2,'0',STR_PAD_LEFT).':00:00.000Z-'
		                     . str_pad($hourOffset+HEK_CACHE_WINDOW_HOURS-1,2,'0',STR_PAD_LEFT)
		                     . ':59:59.999Z.json';


		// Fetch data from cache or live external API query

		$handle = @fopen($cache_filename, 'r');
		if ( $handle !== false ) {
			$data = json_decode(fread($handle, @filesize($cache_filename)));
			fclose($handle);
		}
		else {
			// Fetch data from live external API and write to local JSON cache
 			// HEK query parameters
			$params = array(
				"event_starttime" => $externalAPIStartTime, 
				"event_endtime"   => $externalAPIEndTime, 
				"event_type"      => $options['eventType'], 
				"result_limit"    => 1000, 
				"return" => "kb_archivid,concept,event_starttime,event_endtime,"
				          . "frm_name,frm_institute,frm_url,frm_contact,obs_observatory,obs_channelid,"
						  . "event_type,hpc_x,hpc_y,hpc_bbox,event_MaskURL,event_CoordSys,"
						  . "event_CoordUnit,event_TestFlag"
			);
			$response = JSON_decode($this->_proxy->query($params, true), true);
			$data = $response['result'];

			if ( $response['overmax'] === true ) {
				// TODO handle case where there are more results to fetch
				// ...
				$error = new stdClass;
				$error->overmax = $response['overmax'];
				return($error);
			}
			
			// Only cache if results exist
			if ( count($data) > 0 ) {		
				// Check existence of cache directory
				if ( !file_exists($cache_base_dir) ) {
       		     	mkdir($cache_base_dir, 0777, true);
    	   	     	chmod($cache_base_dir, 0777);      
				}
				
				// Write cache file
				$handle = @fopen($cache_filename, 'w');
				if ( $handle !== false ) {
					@fwrite($handle, json_encode($data));
				}
			}
			
		}

		// No output is desired for cacheOnly requests.  No need to filter either.
		if ( $options['cacheOnly'] == true ) {
			return;
		}
		
		// Only save and output data that is relevent to this request
		$obs_time = new DateTime($startTime);
		foreach( (array)$data as $index => $event ) {
			if ( gettype($event) == 'object') {
				$event = (array) $event;
			}
			
			$event_starttime = new DateTime($event['event_starttime'].'Z');
			$event_endtime   = new DateTime($event['event_endtime']  .'Z');
			
			// Skip over any undesired or non-requested event types
			$eventTypesToIgnore  = Array('OT','NR');
			$eventTypesToAllow   = explode(',',$options['eventType']);
			if ( ($options['eventType']!='**' && !in_array($event['event_type'],$eventTypesToAllow)) 
			     || in_array($event['event_type'],$eventTypesToIgnore) 
			     || $event['event_testflag']===true) {

				continue;
			}
			
			// Save any remaining events whose duration spans (or matches) obs_time
			if ($event_endtime >= $obs_time && $event_starttime <= $obs_time) {
				$events[] = $event;
			}
		}
		unset($data);
				
		return $events;
	}
    

    /**
     * Returns an two-dimensional array of event types and associated frm_names
     * 
     * @param string $eventLayers   Query-string representation of selected event layers
     * 
     * @return array
     */
    public function parseEventLayersString($eventLayers) {
        $eventLayers = trim($eventLayers,'[]');
        if ( $eventLayers == '' ) {
            return false;
        }
        $eventLayersArray  = explode('],[', $eventLayers);
       
        $layersArray = Array();
        foreach ($eventLayersArray as $eventTypeString) {
            $temp  = explode(',', $eventTypeString);
            $temp2 = explode(';', $temp[1]);
            $layersArray[$temp[0]] = $temp2;
        }
        
        return $layersArray;
    }


    /**
     * Return a JSON string containing an array of event objects filtered by 
     * eventLayer URL query-string parameter
     * 
     * @param string $startTime Query start date
     * @param string $eventLayers   Query-string representation of selected event layers
     * 
     * @return JSON array of event objects 
     */
    public function getEventsByEventLayers($startTime, $eventLayers)
    {   
        $eventLayersArray = $this->parseEventLayersString($eventLayers);
        if ( !$eventLayersArray ) {
            // Invalid $eventLayers string, return an empty array
            return json_encode(Array());
        }
        
        // Generate list of selected event types
        $eventType = implode(',', array_keys($eventLayersArray));
        
        // Fetch events for this startTime matching list of selected event types
        $events = $this->getEvents($startTime, Array('eventType' => $eventType));        

        // Filter out events whose associated frm_name was not explicitely or implicitly selected
        foreach ($events as $eventIndex => $event) {
                
            // Don't discard if 'all' frm_names for that event type were selected
            if ( strtolower($eventLayersArray[$event['event_type']][0]) == 'all') {
                continue;
            }
            // Discard event if it isn't in the list of selected frm_names for it's (selected) event type
            else if ( !in_array($event['frm_name'], $eventLayersArray[$event['event_type']]) ) {
                unset($events[$eventIndex]);
            }
        }
        
        // Re-index the array
        $events = array_values($events);
        
        return json_encode($events);
    }


    /**
     * Queries HEK for a single event's information
     * 
     * @param string $eventId The ID of the event
     * 
     * @return string
     */
    public function getEventById($eventId)
    {
        $params = array(
            "event_starttime" => "0001-01-01T00:00:00Z",
            "event_endtime"   => "9999-01-01T00:00:00Z",
            "event_type"      => "**",
            "result_limit"    => 1,
            "param0"          => "kb_archivid",
            "op0"             => "=",
            "value0"          => "ivo://helio-informatics.org/" . $eventId,
            "return"          => "kb_archivid,concept,event_starttime,event_endtime,frm_name,frm_institute," . 
                                 "obs_observatory,event_type,hpc_x,hpc_y,hpc_bbox,obs_instrument,obs_channelid"
        );
        
        // Decode response
        $response = JSON_decode($this->_proxy->query($params, true), true);

        return $response["result"][0];
    }
    
    /**
     * Add links to any screenshots and movies that have been generated for the requested event
     * 
     * @param array   &$originalEvents The original response object
     * @param boolean $ipod            Whether to look in the ipod folders or not
     * 
     * @return void
     */
    private function _extendHEKResponse(&$originalEvents, $ipod)
    {
        // Movie type to return
        $movieType = $ipod ? "iPod" : "regular";
        
        /**
         * Function to convert filepaths to URLs
         * 
         * @param string &$value Resource filepath
         * 
         * @return void
         */
        function convertFilepaths(&$value)
        {
            $value = str_replace(HV_ROOT_DIR, HV_WEB_ROOT_URL, $value);
        }

        $i = 0;
        
        // Loop through events
        foreach ($originalEvents as $event) {
            // Get event Id
            $hekId = explode("/", $event['kb_archivid']);
            $id    = end($hekId);            
            
            $eventDir = HV_CACHE_DIR . "/events/" . $id;
            
            // Empty arrays to store matches
            $screenshots = array();
            $movies      = array();
            
            // Get screenshots
            if (file_exists("$eventDir/screenshots")) {
                $screenshots = glob("$eventDir/screenshots/*.*");
                array_walk($screenshots, "convertFilepaths");
            }
            
            // Get movies            
            if (file_exists("$eventDir/movies/$movieType")) {
                $movies = glob("$eventDir/movies/$movieType/*.*");
                array_walk($movies, "convertFilepaths");
            }

            // Add screenshots and movies arrays to the result
            $originalEvents[$i]["screenshots"] = $screenshots;
            $originalEvents[$i]["movies"]      = $movies;
            
            $i++;
        }
    }

}