<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Science Data Download Script Generator
 *
 * PHP version 5
 *
 * @category Helper
 * @package  Helioviewer
 * @author   Jeff Stys <jeff.stys@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 *
 */
class Helper_SciScript {

    protected $_params;
    protected $_imageLayers;
    protected $_eventLayers;
    protected $_fovType;
    protected $_tstart;
    protected $_tend;
    protected $_kb_archivid;
    
    public function __construct($params) {        
        $this->_params  = $params;
        
        // Parse data source strings into arrays
        $this->_imageLayers = $this->_parseImageLayers($this->_params['imageLayers']);
        $this->_eventLayers = $this->_parseEventLayers($this->_params['eventLayers']);
        
        // Verify required parameters by type
        $this->_fovType = strtolower($this->_params['fovType']);
        $fovTypeArray = Array('viewport','movie','hek');
        if ( !in_array($this->_fovType, $fovTypeArray) ) {
            throw new Exception("fovType must be one of: ".implode(', ',$fovTypeArray), 23);
        }
        
        // Handle date format
        $this->_tstart = str_replace(Array('T','Z'), Array(' ',''), $this->_params['startTime']);
        if ( array_key_exists('endTime',$this->_params) && $this->_params['endTime'] != '' ) {
            $this->_tend = str_replace(Array('T','Z'), Array(' ',''), $this->_params['endTime']);
        }
        
        if ( array_key_exists('kb_archivid',$this->_params) ) {
            $this->_kb_archivid = $this->_params['kb_archivid'];
        }
    }
    
    protected function _parseImageLayers($imageLayers) {
        $imageLayers = trim($imageLayers, ' []');

        $imageLayersArray = explode('],[', $imageLayers);

        if ( count($imageLayersArray)>0 && $imageLayersArray[0]!='' ) {
        
            foreach ($imageLayersArray as $i => $layer) {
                list($obs,$ins,$det,$mea,$sD,$sT) = explode(',',$layer);
                $imageLayersArray[$i] = Array("observatory" => $obs,
                                              "instrument"  => $ins,
                                              "detector"    => $det,
                                              "measurement" => $mea,
                                              "subDate"     => $sD,
                                              "subTime"     => $sT);
            }
        }
        else {
            $imageLayersArray = Array(Array("observatory" => '',
                                            "instrument"  => '',
                                            "detector"    => '',
                                            "measurement" => '',
                                            "subDate"     => '',
                                            "subTime"     => ''));
        }
    
        return $imageLayersArray;
    }
    
    protected function _parseEventLayers($eventLayers) {
        $eventLayers = trim($eventLayers, ' []');
        $eventLayersArray = explode('],[', $eventLayers);

        if ( count($eventLayersArray) >= 1 && $eventLayersArray[0] != '' ) {
            foreach ($eventLayersArray as $i => $layer) {
                list($event_type, $frms, $state) = explode(',',$layer);
                $eventLayersArray[$i] = Array("event_type" => $event_type,
                                              "frms"       => $frms,
                                              "state"      => $state);
            }
        }
        else {
            $eventLayersArray[0] = Array("event_type" => null,
                                        "frms"       => null,
                                        "state"      => null);
        }
    
        return $eventLayersArray;
    }
    
    
    /** 
     * Returns parameters for SDO cut-out service 
     */
    protected function _getCutoutParams() {
  
        if ( array_key_exists('x0',$this->_params) && 
             array_key_exists('y0',$this->_params) && 
             array_key_exists('width',$this->_params) && 
             array_key_exists('height',$this->_params) &&
             array_key_exists('imageScale',$this->_params)) {
            
            // arcsec
            $xcen = $this->_params['x0'];
            $ycen = $this->_params['y0'];
            $fovx = $this->_params['width'] *$this->_params['imageScale'];
            $fovy = $this->_params['height']*$this->_params['imageScale'];
        }
        else if ( array_key_exists('x1',$this->_params) && 
                  array_key_exists('y1',$this->_params) && 
                  array_key_exists('x2',$this->_params) && 
                  array_key_exists('y2',$this->_params) ) {
        
            // arcsec
            $xcen = ($this->_params['x1']+$this->_params['x2'])/2.0;
            $ycen = ($this->_params['y1']+$this->_params['y2'])/2.0;
            $fovx = ($this->_params['x2']-$this->_params['x1']);
            $fovy = ($this->_params['y2']-$this->_params['y1']);
        }
        else if ( array_key_exists('hpc_y',$this->_params) && 
                  array_key_exists('hpc_x',$this->_params) && 
                  array_key_exists('hpc_bbox_ll_x',$this->_params) && 
                  array_key_exists('hpc_bbox_ll_y',$this->_params) && 
                  array_key_exists('hpc_bbox_ur_x',$this->_params) && 
                  array_key_exists('hpc_bbox_ur_y',$this->_params) && 
                  array_key_exists('rot_from_time',$this->_params) ) {
                       
            // Calculate radial distance for determining whether or not to 
            // apply differential rotation.
            include_once $_SERVER['DOCUMENT_ROOT'].'/api/scripts/rot_hpc.php';
            $au_scalar = sunearth_distance($this->_params['rot_from_time']);
            $hpc_r_scaled = sqrt( pow($this->_params['hpc_x'],2) + 
                                  pow($this->_params['hpc_y'],2)
                                ) * $au_scalar;
            
            // Solar rotation
            if ( $hpc_r_scaled < 961.07064 ) {
                
                // Calculate feature/event marker position at event Start Time.
                // Note: 'rot_from_time' is usually the same as 'startTime', but
                //       CAN be the peak time or the end time, depending on the
                //       Frequency Recognition Method (FRM).
                list($hpc_x_scaled_rot_start, $hpc_y_scaled_rot_start) 
                    = rot_hpc( $this->_params['hpc_x']*$au_scalar, 
                               $this->_params['hpc_y']*$au_scalar, 
                               $this->_params['rot_from_time'], 
                               $this->_params['startTime'], 
                               $spacecraft=null, $vstart=null, $vend=null);
                
                // Calculate feature/event marker position at event End Time.
                list($hpc_x_scaled_rot_end, $hpc_y_scaled_rot_end) 
                    = rot_hpc( $this->_params['hpc_x']*$au_scalar, 
                               $this->_params['hpc_y']*$au_scalar, 
                               $this->_params['rot_from_time'], 
                               $this->_params['endTime'], 
                               $spacecraft=null, $vstart=null, $vend=null);
                
                // Calculate the width of the bounding box (HPC, scaled).
                $delta_x = ($this->_params['hpc_bbox_ur_x']*$au_scalar) - 
                           ($this->_params['hpc_bbox_ll_x']*$au_scalar);
                $delta_y = ($this->_params['hpc_bbox_ur_y']*$au_scalar) - 
                           ($this->_params['hpc_bbox_ll_y']*$au_scalar);
                
                // Calculate the lower left coordinate of the cutout box
                // as the position of the feature/event marker at it's **startTime**
                // minus half the x,y dimension of the bounding box.
                $cutout_ll_x = $hpc_x_scaled_rot_start - ($delta_x/2.);
                $cutout_ll_y = $hpc_y_scaled_rot_start - ($delta_y/2.);
                
                // Calculate the upper right coordinate of the cutout box
                // as the position of the feature/event marker at it's **endTime**
                // minus half the x,y dimension of the bounding box.
                $cutout_ur_x = $hpc_x_scaled_rot_end + ($delta_x/2.);
                $cutout_ur_y = $hpc_y_scaled_rot_end + ($delta_y/2.);
                
                // Calculate the center x,y coordinate of the cutout box and the
                // (total) width and height of the cutout box.
                $xcen = ($cutout_ll_x + $cutout_ur_x)/2.;
                $ycen = ($cutout_ll_y + $cutout_ur_y)/2.;
                $fovx = abs($cutout_ur_x-$cutout_ll_x)+20; // 20 arcsec padding
                $fovy = abs($cutout_ur_y-$cutout_ll_y)+20; // 20 arcsec padding
                
            }
            // No solar rotation
            else {
                // arcsec
                $xcen = ($this->_params['hpc_bbox_ll_x']+$this->_params['hpc_bbox_ur_x'])/2.;
                $ycen = ($this->_params['hpc_bbox_ll_y']+$this->_params['hpc_bbox_ur_y'])/2.;
                $fovx = abs($this->_params['hpc_bbox_ur_x']-$this->_params['hpc_bbox_ll_x']);
                $fovy = abs($this->_params['hpc_bbox_ur_y']-$this->_params['hpc_bbox_ll_y']);
            }
        }
        else {
            throw new Exception(
                "Region of interest not defined: you must specify values for " . 
                "either [x1, x2, y1, y2] or [imageScale, x0, y0, width, height] ".
                "or [hpc_x, hpc_y, hpc_bbox_ll_x, hpc_bbox_ll_y, hpc_bbox_ur_x, hpc_bbox_ur_y, ".
                "rot_from_time].", 23);
        }
        
        // Enforce minimum cut-out size
        $fovx = (($fovx < 240) ? 240 : $fovx);
        $fovy = (($fovy < 240) ? 240 : $fovy);
        
        return Array($xcen,$ycen,$fovx,$fovy);
    }
    

    /**
     * Returns generated script as a file attachment
     */
    protected function _printScript($filename, $body) {
        $file_extension = pathinfo($filename, PATHINFO_EXTENSION);
    
        // Set HTTP headers
        header("Pragma: public");
        header("Expires: 0");
        header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
        header("Cache-Control: private", false); // required for certain browsers
        header("Content-Disposition: attachment; filename=\"" . $filename . "\"");
        header("Content-Transfer-Encoding: binary");
        header("Content-Length: " . mb_strlen($body));
        switch ($file_extension) {
            case 'pro': 
                header("Content-type: text/x-rsiidl-src");
                break;
            case 'py':
                header("Content-type: text/x-script.python");
                break;
            default:
                header("Content-type: text/plain");
        }
        
        echo $body;
    }
}
?>
