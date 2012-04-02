<?php
/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/**
 * Helioviewer InputValidator Bad Input Tests
 *
 * PHP version 5
 *
 * @category Helper
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
require_once 'src/Validation/InputValidator.php';
/**
 * Helioviewer InputValidator Tests
 *
 * PHP version 5
 *
 * @category Helper
 * @package  Helioviewer
 * @author   Keith Hughitt <keith.hughitt@nasa.gov>
 * @license  http://www.mozilla.org/MPL/MPL-1.1.html Mozilla Public License 1.1
 * @link     http://launchpad.net/helioviewer.org
 */
class InputValidator_BadInputTest extends PHPUnit_Framework_TestCase
{
    /**
     * Tests method which checks for required parameters
     *
     * @param array $required A list of the required parameters for a given action
     * @param array $params   The parameters that were passed in
     *
     * @test
     * @covers Validation_InputValidator::checkForMissingParams
     * @dataProvider missingParameterProvider
     * @expectedException InvalidArgumentException
     *
     * @return void
     */
    public function checkForMissingParams($required, $params)
    {
        Validation_InputValidator::checkForMissingParams($required, $params);
    }

    /**
     * Data provider for checkForMissingParams
     *
     * @return array Input with some required parameters missing
     */
    public function missingParameterProvider()
    {
        return array(
            array(
                array("required", "zero", "bool"),
                array("required" => "string", "zero" => "0", "forgot" => "boolean")
            ),
            array(
                array("required", "zero", "bool"),
                array()
            )
        );
    }
    /**
     * @test
     * @covers Validation_InputValidator::checkDates
     * @dataProvider checkDatesProvider
     * @expectedException InvalidArgumentException
     */
    public function checkDates($dates, $params)
    {
        Validation_InputValidator::checkDates($dates, $params);
    }

    /**
     * Data provider for checkDates
     * 
     * Since any failure will trigger exception, invalid dates much be checked
     * individually to ensure expected failure.
     */
    public function checkDatesProvider()
    {
        return array(
            array(
                array("date"),
                array("date" => "2011-02-21T19:08:00.")
            ),
            array(
                array("date"),
                array("date" => "2011-02-21 19:08:00.000Z")
            )
        );
    }
}
?>