<?php
/**
 * Helioviewer environment for running Resque
 */
# switch to api/
$dir = dirname(dirname(realpath($argv[0])));
chdir($dir); 

require_once "src/Config.php";
$config = new Config("../settings/Config.ini");

require_once 'src/Job/MovieBuilder.php';
?>
