<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * SunPy Science Data Download Script Generator
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
 
require_once "SciScript.php";
 
class Helper_SunPy extends Helper_SciScript {

    function __construct($params, $roi=null) {
        $this->_localPath = '~/';
        
        parent::__construct($params, $roi);
    }
    
    function buildScript() {
    
        $filename   = $this->_getScriptFilename();
        $provenance = $this->_getProvenanceComment();
        
        $DataSnippet  = $this->_getSDOSnippet();
        $DataSnippet .= $this->_getEITSnippet();
        $DataSnippet .= $this->_getLASCOSnippet();
        $DataSnippet .= $this->_getMDISnippet();
        $DataSnippet .= $this->_getSTEREOSnippet();
        $DataSnippet .= $this->_getSWAPSnippet();
        $DataSnippet .= $this->_getYohkohSnippet();
        $DataSnippet .= $this->_getHEKSnippet();

        $code = <<<EOD
# SunPy data download script
#
#    {$filename}
#
#
# (1) Helioviewer provenance information
# --------------------------------------
#
{$provenance}
#
#
# (2) The SunPy environment and commands used to find and acquire data
# ------------------------------------------------------------------------
#
# This script requires an up-to-date installation of SunPy (version 0.3 or
# higher).  To install SunPy, please follow the instructions at www.sunpy.org.
#
# This script is provided AS-IS. NOTE: It may require editing for it to
# work on your local system. Also, many of the commands included here
# have more sophisticated options that can be used to optimize your ability
# to acquire the relevant data. Please consult the relevant documentation
# for further information.
#
# IMPORTANT NOTE
# These scripts query the VSO for the records they have access to.  Data
# relevant to your request may be available elsewhere.  Likewise, the HEK
# provides only the feature and event information they have access to.
# Other features and events relevant to your request may be available
# elsewhere.
#
#
# (3) Executing the script
# ------------------------
#
# To run this script, type the following at your shell prompt
#
# python {$filename}
#
# or preprend the script with a path to the script, for example,
#
# python path/to/script/{$filename}
#
# By default, data will be downloaded to your home directory ('~/') 
# unless you modify the value of the 'localPath' variable below. 
#
#
# (4) Script
# ----------

import sunpy

from sunpy.net import vso
from sunpy.net import hek

vso_client = vso.VSOClient()
hek_client = hek.HEKClient()

EOD;

        if ( is_null($this->_tend) ) {
            $this->_tend = $this->_tstart;
        }
        
        $code .= <<<EOD

#
# Search for data in the following date time range
#

tstart = '{$this->_tstart}'
tend   = '{$this->_tend}'
EOD;
        
        $code .= <<<EOD


#
# Save data to the following path
#

localPath = '{$this->_localPath}'
{$DataSnippet}
#
# (5) End of Script
# -----------------
EOD;

        $this->_printScript($filename, $code);
    }

    private function _getScriptFilename() {
        date_default_timezone_set('UTC');
        
        $temp = str_replace( Array('-', ':', ' UTC', ' '),
                             Array(',', ',', '',     ','),
                             $this->_tstart );
        list($Y,$m,$d,$H,$i,$s) = explode(',',$temp);
        $str = date('Ymd_His', mktime($H,$i,$s,$m,$d,$Y) );
        
        if ( !is_null($this->_tend) ) {
        
            $temp = str_replace( Array('-', ':', ' UTC', ' '),
                                 Array(',', ',', '',     ','),
                                 $this->_tend );
            list($Y,$m,$d,$H,$i,$s) = explode(',',$temp);
            $end   = date('Ymd_His', mktime($H,$i,$s,$m,$d,$Y) );
            
            $str .= '__'.$end;
        }
    
        return 'helioviewer_sunpy_'.$str.'.py';
    }

    private function _getProvenanceComment() {
        require_once "src/Helper/DateTimeConversions.php";

        $now = str_replace(Array('T','.000Z'), 
                           Array(' ',' UTC'), 
                           getUTCDateString());
    
        $comment = "# Automatically generated by Helioviewer.org on ".$now.".\n"
                 . "# This script uses the Virtual Solar Observatory (VSO; www.virtualsolar.org)\n"
                 . "# and/or the Heliophysics Event Knowledgebase (HEK; www.lmsal.com/hek)\n"
                 . "# service ";
               
        // Movie id?
        if ( array_key_exists('movieId',$this->_params) && !is_null($this->_params['movieId']) ) {
            $comment .= "to download the original science data used to generate\n" 
                     .  "# the ßHelioviewer.org movie: http://helioviewer.org/?movieId="
                     .   $this->_params['movieId'] . "\n;";
        } else {
            $comment .= "to download original science data.\n#";
        }

        return $comment;
    }

    private function _getEITSnippet() {
        $string = <<<EOD

#
# EIT data - downloadable via the VSO
#
EOD;
        $count = 0;
        foreach ( $this->_imageLayers as $i=>$layer) {
            if ( $layer['instrument'] == 'EIT' ) {
                $count++;
                
                if ( is_null($this->_tend) ) {
                    $tstart = $tend = str_replace('/','-',$layer['subDate']).' '.$layer['subTime'];
                    $string .= <<<EOD
                    
tstart = '{$tstart}'
tend   = '{$tend}'

EOD;
                }
                
                $string .= <<<EOD

vso_result_eit_{$layer['measurement']} = vso_client.query(vso.attrs.Time(tstart, tend), \
    vso.attrs.Instrument('eit'), vso.attrs.Wave('{$layer['measurement']}','{$layer['measurement']}'))
vso_data_eit_{$layer['measurement']}   = vso_client.get(vso_result_eit_{$layer['measurement']}, path=localPath)

EOD;
            }
        }
        if ($count == 0) {
            $string = '';
        }

        return $string;
    }

    private function _getLASCOSnippet() {
        $string = <<<EOD

#
# LASCO data - downloadable via the VSO
#

EOD;
        $count = 0;
        foreach ( $this->_imageLayers as $i=>$layer ) {
            if ( $layer['instrument'] == 'LASCO' ) {
                $count++;
                
                if ( is_null($this->_tend) ) {
                    $tstart = $tend = str_replace('/','-',$layer['subDate']).' '.$layer['subTime'];
                    $string .= <<<EOD
                    
tstart = '{$tstart}'
tend   = '{$tend}'

EOD;
                }
                
                $detector = strtolower($layer['detector']);
                $string .= <<<EOD

vso_result_lasco_{$detector} = vso_client.query(vso.attrs.Time(tstart, tend), \
    vso.attrs.Instrument('lasco-{$detector}'))
vso_data_lasco_{$detector}   = vso_client.get(vso_result_lasco_{$detector}, path=localPath)

EOD;
            }
        }
        if ( $count == 0 ) {
            $string = '';
        }

        return $string;
    }

    private function _getMDISnippet() {
        $string = <<<EOD

#
# MDI data - downloadable via the VSO
#

EOD;
        $count = 0;
        foreach ( $this->_imageLayers as $i=>$layer) {
            if ( $layer['instrument'] == 'MDI' ) {
                $count++;
                
                if ( is_null($this->_tend) ) {
                    $tstart = $tend = str_replace('/','-',$layer['subDate']).' '.$layer['subTime'];
                    $string .= <<<EOD
                    
tstart = '{$tstart}'
tend   = '{$tend}'

EOD;
                }
                
                
                if ( $layer['measurement'] == 'continuum' ) {
                    $physobs_str = ", vso.attrs.Physobs('intensity')";
                }
                else if ( $layer['measurement'] == 'magnetogram' ) {
                    $physobs_str = ", vso.attrs.Physobs('LOS_magnetic_field')";
                }
                
                $string .= <<<EOD

vso_result_mdi = vso_client.query(vso.attrs.Time(tstart, tend), \
    vso.attrs.Instrument('mdi'){$physobs_str})
vso_data_mdi   = vso_client.get(vso_result_mdi, path=localPath)

EOD;
            }
        }
        if ($count == 0) {
            $string = '';
        }

        return $string;
    }

    private function _getSTEREOSnippet() {
        $string = <<<EOD

#
# STEREO data - downloadable via the VSO
#

EOD;
        $count = 0;
        foreach ( $this->_imageLayers as $i=>$layer ) {
            $observatory = strtolower(str_replace('-','',$layer['observatory']));
            $instrument  = strtolower($layer['instrument']);
            $detector    = strtolower($layer['detector']);
            
            if ( $layer['detector'] == 'EUVI' ) {
                $count++;
                
                if ( is_null($this->_tend) ) {
                    $tstart = $tend = str_replace('/','-',$layer['subDate']).' '.$layer['subTime'];
                    $string .= <<<EOD
                    
tstart = '{$tstart}'
tend   = '{$tend}'

EOD;
                }
                
                $string .= <<<EOD

vso_result_{$observatory}_{$instrument}_{$detector}_{$layer['meD=1asurement']} = vso_client.query(vso.attrs.Time(tstart, tend), \
    vso.attrs.Instrument('euvi'), vso.attrs.Wave('{$layer['measurement']}','{$layer['measurement']}'))
vso_data_{$observatory}_{$instrument}_{$detector}_{$layer['measurement']}   = vso_client.get(vso_result_{$observatory}_{$instrument}_{$detector}_{$layer['measurement']}, \
    path=localPath)

EOD;
            }
            else if ( $layer['detector'] == 'COR1' || 
                      $layer['detector'] == 'COR2' ) {
                      
                $count++;
                
                if ( is_null($this->_tend) ) {
                    $tstart = $tend = str_replace('/','-',$layer['subDate']).' '.$layer['subTime'];
                    $string .= <<<EOD
                    
tstart = '{$tstart}'
tend   = '{$tend}'

EOD;
                }
                
                $string .= <<<EOD

vso_result_{$observatory}_{$instrument}_{$detector} = vso_client.query(vso.attrs.Time(tstart, tend), \
    vso.attrs.Instrument('{$instrument}'), vso.attrs.Detector('{$detector}'))
vso_data_{$observatory}_{$instrument}_{$detector}   = vso_client.get(vso_result_{$observatory}_{$instrument}_{$detector}, \
    path=localPath)

EOD;
            }
        }
        if ($count == 0) {
            $string = '';
        }

        return $string;
    }

    private function _getSWAPSnippet() {
        $string = <<<EOD

#
# SWAP data - downloadable via the VSO
#

EOD;
        $count = 0;
        foreach ( $this->_imageLayers as $i=>$layer) {
            if ( $layer['instrument'] == 'SWAP' ) {
                $count++;
                
                if ( is_null($this->_tend) ) {
                    $tstart = $tend = str_replace('/','-',$layer['subDate']).' '.$layer['subTime'];
                    $string .= <<<EOD
                    
tstart = '{$tstart}'
tend   = '{$tend}'

EOD;
                }
                
                $string .= <<<EOD

vso_result_swap_{$layer['measurement']} = vso_client.query(vso.attrs.Time(tstart, tend), \
    vso.attrs.Instrument('swap'), vso.attrs.Wave('{$layer['measurement']}','{$layer['measurement']}'))
vso_data_swap_{$layer['measurement']}   = vso_client.get(vso_result_swap_{$layer['measurement']}, path=localPath)

EOD;
            }
        }
        if ($count == 0) {
            $string = '';
        }

        return $string;
    }

    private function _getYohkohSnippet() {
        $string = <<<EOD

#
# Yohkoh data - downloadable via the VSO
#

EOD;
        $count = 0;
        foreach ( $this->_imageLayers as $i=>$layer) {
            if ( $layer['instrument'] == 'SXT' ) {
                $count++;
                
                if ( is_null($this->_tend) ) {
                    $tstart = $tend = str_replace('/','-',$layer['subDate']).' '.$layer['subTime'];
                    $string .= <<<EOD
                    
tstart = '{$tstart}'
tend   = '{$tend}'

EOD;
                }
                
                $string .= <<<EOD

vso_result_sxt = vso_client.query(vso.attrs.Time(tstart, tend), vso.attrs.Instrument('yohkoh'))
vso_data_sxt   = vso_client.get(vso_result_sxt, path=localPath)

EOD;
                break;
            }
        }
        if ($count == 0) {
            $string = '';
        }

        return $string;
    }

    private function _getSDOSnippet() {
        $string = '';
        
        $AIAwaves = array();
        $HMIwaves = array();
        foreach ( $this->_imageLayers as $i=>$layer ) {
            if ( $layer['instrument'] == 'AIA' ) {
                $AIAwaves[] = $layer['measurement']; 
            }
            else if ( $layer['instrument'] == 'HMI' ) {
                $HMIwaves[]  = $layer['measurement'];
            }
        }
        
        if ( count($AIAwaves) == 0 && count($HMIwaves) == 0 ) {
            return '';
        }
        
        $count = 0;
        foreach ( $this->_imageLayers as $i=>$layer ) {
            if ( $layer['instrument'] == 'AIA' ) {
                $count++;
            
                if ( $count == 1 ) {
                    $string .= <<<EOD


#
# AIA data - downloadable via the VSO
#    WARNING - Full disk only. This may be a lot of data.

EOD;
                }
            
                if ( is_null($this->_tend) ) {
                    $tstart = $tend = str_replace('/','-',$layer['subDate']).' '.$layer['subTime'];
                    $string .= <<<EOD
                
tstart = '{$tstart}'
tend   = '{$tend}'

EOD;
                }
            
                $string .= <<<EOD

vso_result_aia_{$layer['measurement']} = vso_client.query(vso.attrs.Time(tstart, tend), \
    vso.attrs.Instrument('aia'), vso.attrs.Wave({$layer['measurement']},{$layer['measurement']}))
vso_data_aia_{$layer['measurement']}   = vso_client.get(vso_result_aia_{$layer['measurement']} , path=localPath)

EOD;
            }
        }
        
        $count = 0;
        foreach ( $this->_imageLayers as $i=>$layer ) {
            if ( $layer['instrument'] == 'HMI' ) {
                $count++;
            
                if ( $count == 1 ) {
                    $string .= <<<EOD


#
# HMI data - downloadable via the VSO
#

EOD;
                }
            
                if ( is_null($this->_tend) ) {
                    $tstart = $tend = str_replace('/','-',$layer['subDate']).' '.$layer['subTime'];
                    $string .= <<<EOD
                
tstart = '{$tstart}'
tend   = '{$tend}'

EOD;
                }
            
                if ( $layer['measurement'] == 'continuum' ) {
                    $physobs_str = ", vso.attrs.Physobs('intensity')";
                }
                else if ( $layer['measurement'] == 'magnetogram' ) {
                    $physobs_str = ", vso.attrs.Physobs('LOS_magnetic_field')";
                }
            
                $string .= <<<EOD

vso_result_hmi = vso_client.query(vso.attrs.Time(tstart, tend), \
    vso.attrs.Instrument('hmi'){$physobs_str})
vso_data_hmi   = vso_client.get(vso_result_hmi, path=localPath)

EOD;
            }
        }

        return $string;
    }

    private function _getHEKSnippet() {
        if ( count($this->_eventLayers) == 0 || 
            (count($this->_eventLayers) == 1 && $this->_eventLayers[0]['frms'] == null) ) {
            
            return '';
        }
        
        $string = <<<EOD


#
# Feature/Event data - downloadable via the HEK
#

EOD;

        if ( $this->_kb_archivid != '' ) {
        
            $string .= <<<EOD
if (sunpy.__version__ > 0.3):

    hek_data = hek_client.query( \
        hek.attrs.Misc['KB_Archivid'] == '{$this->_kb_archivid}' )

else:

EOD;
            foreach ( $this->_eventLayers as $i=>$layer ) {
                    
                if ( $layer['frms'] == 'all' ) {
                    $string .= <<<EOD
                
    hek_data_{$layer['event_type']} = hek_client.query(hek.attrs.Time(tstart, tend), hek.attrs.{$layer['event_type']})

EOD;
                }
                else {
                    $frmArray = explode(',', $layer['frms']);
                
                    foreach($frmArray as $j=>$frm) {
                    
                        $frm_decoded = str_replace('_',' ',$frm);
                
                        $string .= <<<EOD
                    
    hek_data_{$layer['event_type']}_{$frm} = hek_client.query(hek.attrs.Time(tstart, tend), \
        hek.attrs.{$layer['event_type']}, hek.attrs.FRM.Name == '{$frm_decoded}')

EOD;
                    }
                }
            }
        
        }
        else {
            $frm_all_array = Array();
                    
            foreach ( $this->_eventLayers as $i=>$layer ) {
                    
                if ( $layer['frms'] == 'all' ) {
                    $frm_all_array[] = 'hek.attrs.'.$layer['event_type'];
                }
                else {
                    $frmArray = explode(',', $layer['frms']);
                
                    foreach($frmArray as $j=>$frm) {
                    
                        $frm_decoded = str_replace('_',' ',$frm);
                
                        $string .= <<<EOD
                    
hek_data_{$layer['event_type']}_{$frm} = hek_client.query(hek.attrs.Time(tstart, tend), \
    hek.attrs.{$layer['event_type']}, hek.attrs.FRM.Name == '{$frm_decoded}')

EOD;
                    }
                }
            }
            
            if ( count($frm_all_array) ) {
                $frm_all_string = implode(' | ', $frm_all_array);
                $string .= <<<EOD

hek_data = hek_client.query(hek.attrs.Time(tstart, tend), {$frm_all_string})                
EOD;
            }
        }

        return $string;
    }
}
?>
