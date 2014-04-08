/**
 * SciDataManagerUI class definition
 * @author <a href="mailto:jeff.stys@nasa.gov">Jeff Stys</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false,
eqeqeq: true, plusplus: true, bitwise: true, regexp: false, strict: true,
newcap: true, immed: true, maxlen: 80, sub: true */
/*global $, window, Helioviewer, helioviewer, MediaManagerUI, SciDataManager
*/
"use strict";
var SciDataManagerUI = MediaManagerUI.extend(
    /** @lends SciDataManagerUI */
    {
    /**
     * @constructs
     * Creates a new SciDataManagerUI instance
     *
     * @param {SciDataManager} model SciDataManager instance
     */
    init: function () {
console.info('SciDataManagerUI.init()');

        this._super("scidata");

        this._initEvents();
    },

    /**
     * Returns a URL to generate a screenshot of the current viewport
     *
     * Used to generate thumbnails for the current page
     */
/*
    getScreenshotURL: function () {
        var roi, imageScale, layers, params;

        imageScale = helioviewer.getImageScale();
        roi        = helioviewer.getViewportRegionOfInterest();

        // Remove any layers which do not lie in the reguested region
        layers = this._checkLayers(helioviewer.getLayers());

        // Make sure selection region and number of layers are acceptible
        if (!this._validateRequest(roi, layers)) {
            return;
        }

        params = $.extend({
            action        : "takeScreenshot",
            imageScale    : imageScale,
            layers        : layers,
            date          : helioviewer.getDate().toISOString(),
            display       : true
        }, this._toArcsecCoords(roi, imageScale));

        return Helioviewer.api + "?" + $.param(params);
    },
*/

    /**
     * Displays a jGrowl notification to the user informing them that their
     * download has completed
     */
    _displayDownloadNotification: function (screenshot) {
console.info('SciDataManagerUI._displayDownloadNotification()');
        var jGrowlOpts, body, self = this;

        // Options for the jGrowl notification
        jGrowlOpts = {
            sticky: true,
            header: "Just now"
        };

        // Download link
        body = "<a href='" + Helioviewer.api +
               "?action=downloadScreenshot&id=" +
               screenshot.id + "'>Your " + screenshot.name +
               " screenshot is ready! Click here to download. </a>";

        // Create the jGrowl notification.
        $(document).trigger("message-console-log",
                            [body, jGrowlOpts, true, true]);
    },

    /**
     * Initializes SciDataManager-related event handlers
     */
    _initEvents: function () {
console.info('SciDataManagerUI._initEvents()');
        var self = this;

        this._super();

        // SciData ROI selection buttons
        this._fullViewportBtn.click(function () {
            self.hide();
            self._dialog();
        });

        this._selectAreaBtn.click(function () {
            self.hide();
            $(document).trigger("enable-select-tool",
                                $.proxy(self._dialog, self));
        });

        $('#scidata-button').click( function () {
            $('#scidata-button').dialog("close");
        });

        $(document).bind("bind-scidata-form-to-viewport", function (e) {
            alert('bind');
            $(document).bind('observation-time-changed', $.proxy(self._updateDialog, self));
            $(document).bind('add-new-tile-layer', $.proxy(self._updateDialog, self));
            $(document).bind('save-tile-layers', $.proxy(self._updateDialog, self));
            $(document).bind('toggle-events', $.proxy(self._updateDialog, self));
            $(document).bind('toggle-event-labels', $.proxy(self._updateDialog, self));
        });
        $(document).bind("unbind-scidata-form-from-viewport", function (e) {
            alert('unbind');
            $(document).unbind('observation-time-changed');
            $(document).unbind('add-new-tile-layer');
            $(document).unbind('save-tile-layers');
            $(document).unbind('toggle-events');
            $(document).unbind('toggle-event-labels');
        });
    },

    _updateDialog: function () {
        var contents, html, tileLayers, tileAccordions, subDates=false,
            subDate, subTime, source='', self=this, tempDate,
            screenshotStart, screenshotEnd, params;

        alert('_updateDialog');

        params = {
            "fovType"     :'viewport',
            "startDate"   : helioviewer.timeControls.getDate(),
            "endDate"     : helioviewer.timeControls.getDate(),
            "imageLayers" : Helioviewer.userSettings.get("state.tileLayers"), // array
            "eventLayers" : helioviewer.viewport.serializeEvents(),  // string
            "eventLayersVisible" : Helioviewer.userSettings.get("state.eventLayerVisible"),
            "imageScale"  : Helioviewer.userSettings.get("state.imageScale")
        };

        if ( this.roi === undefined ) {
            params['x0'] = Helioviewer.userSettings.get("state.centerX"),
            params['y0'] = -Helioviewer.userSettings.get("state.centerY");
            params['width'] = helioviewer.viewport.dimensions['width'];
            params['height'] = helioviewer.viewport.dimensions['height'];
        }
        else {
            params['x1'] = this.roi['left'] * Helioviewer.userSettings.get("state.imageScale");
            params['y1'] = this.roi['top'] * Helioviewer.userSettings.get("state.imageScale");
            params['x2'] = this.roi['right'] * Helioviewer.userSettings.get("state.imageScale");
            params['y2'] = this.roi['bottom'] * Helioviewer.userSettings.get("state.imageScale");
        }

        switch (params['fovType']) {
            case 'viewport':
                source = ' - Current View';
                break;
            case 'movie':
                source = ' - Movie';
                break;
            case 'hek':
                source = ' - Feature/Event';
                break;
        }
        $('#ui-dialog-title-science-data-dialog').html('Science Data Download Script'+source);

        if ( typeof params.imageLayers == 'string' ) {
            tileLayers = Array();
            $.each(params.imageLayers.split('],['), function(i,layer) {
                layer = layer.replace(/[\[\]]/g,'');
                tileLayers.push(parseLayerString(layer));
            });
            params.imageLayers = tileLayers;
        }

        if ( params.startDate.toUTCString() == params.endDate.toUTCString() ) {
            subDates = true;
        }

        tileAccordions = $('#TileLayerAccordion-Container').find('.dynaccordion-section .timestamp');


        $('#helioviewer-script-contents').html('<legend>Datasets to Request:</legend><div id="helioviewer-script-data-sources" style="padding: 2px 0 12px 0;"></div>');

        $.each(params.imageLayers, function(i,layer) {
            var cssname='', nickname='', valname='', prev='';

            if ( layer.nickname === undefined ) {
                layer.nickname = layer.detector + ' ' + layer.measurement;
            }

            cssname  = layer.nickname.replace(/ /g,'-');
            nickname = layer.nickname;
            valname  = layer.nickname.replace(/ /g,',');

            html = '<div style="clear:both;">' +
                       '<div style="float: left; padding-top: 4px;">' +
                           '<input type="checkbox" name="'+valname+'" id="'+cssname+'" value="true" />' +
                       '</div>' +
                       '<div style="float: left;">' +
                           '<div><label for="'+cssname+'">'+nickname+'</label></div>';

            if ( subDates ) {
                subDate = $(tileAccordions[i]).html().split(' ');
                subTime = subDate[1];
                subDate = subDate[0];

                html +=    '<div>' +
                               '<span class="sub-date" style="font-size: 10px;">' +
                                   subDate + ' ' + subTime + ' UTC' +
                               '</span>' +
                               '<input type="hidden" id="'+cssname+'-startDate" name="'+cssname+'-startDate" value="'+subDate+'" />' +
                               '<input type="hidden" id="'+cssname+'-startTime" name="'+cssname+'-startTime" value="'+subTime+'" />' +
                           '</div>';
            }

            html+=     '</div>' +
                   '</div>';

            $('#helioviewer-script-data-sources').append(html);
            if ( layer.visible ) {
                $('#'+cssname).attr('checked','checked');
            }
        });


        if ( params.eventLayers.length > 0 ) {
            html = '<div style="clear:both;">' +
                       '<div style="float: left; padding-top: 4px;">' +
                           '<input type="checkbox" name="hek" id="science-data-source-hek" value="true" />' +
                       '</div>' +
                       '<div style="float: left;">' +
                           '<label for="science-data-source-hek">Heliophysics Event Knowledgebase (HEK)</label>';

            if ( subDates ) {
                html +=    '<div class="sub-date">' +
                               '<span style="font-size: 10px;">' +
                                   params.startDate.toUTCDateString() + ' ' +
                                   params.startDate.toUTCTimeString() + ' UTC' +
                               '</span>' +
                               '<input type="hidden" name="hek-startDate" value="'+params.startDate.toUTCDateString()+'" />' +
                               '<input type="hidden" name="hek-startTime" value="'+params.startDate.toUTCTimeString()+'" />' +
                           '</div>';
            }

            html +=    '</div>' +
                   '</div>';

            $('#helioviewer-script-data-sources').append(html);
            if ( params.eventLayersVisible == true ) {
                $('#science-data-source-hek').attr('checked','checked');
                $('#helioviewer-script-data-sources').append(
                    $('<input type="hidden" name="eventLayers" value="'+params.eventLayers+'" />')
                );
            }
        }

        $('#helioviewer-script-data-sources').append('<br />');

        contents = $('#helioviewer-script-contents');

        contents.append(
            $('<input type="hidden" name="fovType" value="'+params.fovType+'" />')
        );

        tempDate = params.startDate.toUTCDateString() + 'T'
                 + params.startDate.toUTCTimeString() + 'Z';
        tempDate = tempDate.replace(/\//g,'-');
        screenshotStart = '?action=takeScreenshot'
                        + '&date=' + encodeURIComponent(tempDate)
                        + '&imageScale=' + encodeURIComponent(helioviewer.viewport.getImageScale())
                        + '&layers=' + encodeURIComponent(helioviewer.getLayers())
                        + '&events=' + encodeURIComponent(helioviewer.getEvents())
                        + '&eventLabels=' + encodeURIComponent(helioviewer.getEventsLabels())
                        + '&watermark=false';

        tempDate = params.endDate.toUTCDateString() + 'T'
                 + params.endDate.toUTCTimeString() + 'Z';
        tempDate = tempDate.replace(/\//g,'-');
        screenshotEnd   = '?action=takeScreenshot'
                        + '&date=' + encodeURIComponent(tempDate)
                        + '&imageScale=' + encodeURIComponent(helioviewer.viewport.getImageScale())
                        + '&layers=' + encodeURIComponent(helioviewer.getLayers())
                        + '&events=' + encodeURIComponent(helioviewer.getEvents())
                        + '&eventLabels=' + encodeURIComponent(helioviewer.getEventsLabels())
                        + '&watermark=false';

        if ( "x0" in params && "y0" in params &&
             "width" in params && "height" in params ) {

            screenshotStart += '&x0=' + params.x0 + '&y0=' + params.y0;
            screenshotStart += '&width=' + params.width;
            screenshotStart += '&height=' + params.height;

            screenshotEnd   += '&x0=' + params.x0 + '&y0=' + params.y0;
            screenshotEnd   += '&width=' + params.width;
            screenshotEnd   += '&height=' + params.height;

            contents.append(
                $('<input type="hidden" name="x0" value="'+params.x0+'" />')
            );
            contents.append(
                $('<input type="hidden" name="y0" value="'+params.y0+'" />')
            );
            contents.append(
                $('<input type="hidden" name="width" value="'+params.width+'" />')
            );
            contents.append(
                $('<input type="hidden" name="height" value="'+params.height+'" />')
            );
        }
        else if ( "x1" in params && "y1" in params &&
                  "x2" in params && "y2" in params ) {

            screenshotStart += '&x1=' + params.x1 + '&y1=' + params.y1;
            screenshotStart += '&x2=' + params.x2 + '&y2=' + params.y2;

            screenshotEnd   += '&x1=' + params.x1 + '&y1=' + params.y1;
            screenshotEnd   += '&x2=' + params.x2 + '&y2=' + params.y2;

            contents.append(
                $('<input type="hidden" name="x1" value="'+params.x1+'" />')
            );
            contents.append(
                $('<input type="hidden" name="y1" value="'+params.y1+'" />')
            );
            contents.append(
                $('<input type="hidden" name="x2" value="'+params.x2+'" />')
            );
            contents.append(
                $('<input type="hidden" name="y2" value="'+params.y2+'" />')
            );
        }
        // HEK data to be used to determine SDO cutout service parameters
        else if ( "hpc_x"         in params && "hpc_y"         in params &&
                  "hpc_bbox_ll_x" in params && "hpc_bbox_ll_y" in params &&
                  "hpc_bbox_ur_x" in params && "hpc_bbox_ur_y" in params &&
                  "rot_from_time" in params && "kb_archivid"   in params ) {

            contents.append(
                $('<input type="hidden" name="hpc_x" value="'+params.hpc_x+'" />')
            );
            contents.append(
                $('<input type="hidden" name="hpc_y" value="'+params.hpc_y+'" />')
            );
            contents.append(
                $('<input type="hidden" name="hpc_bbox_ll_x" value="'+params.hpc_bbox_ll_x+'" />')
            );
            contents.append(
                $('<input type="hidden" name="hpc_bbox_ll_y" value="'+params.hpc_bbox_ll_y+'" />')
            );
            contents.append(
                $('<input type="hidden" name="hpc_bbox_ur_x" value="'+params.hpc_bbox_ur_x+'" />')
            );
            contents.append(
                $('<input type="hidden" name="hpc_bbox_ur_y" value="'+params.hpc_bbox_ur_y+'" />')
            );
            contents.append(
                $('<input type="hidden" name="rot_from_time" value="'+params.rot_from_time+'" />')
            );
            contents.append(
                $('<input type="hidden" name="kb_archivid" value="'+params.kb_archivid+'" />')
            );
        }

        $.ajax({
            url: Helioviewer.api + screenshotStart,
            dataType: Helioviewer.dataType,
            success: function (response) {
                $('#helioviewer-script-dates #startThumb').attr('src',Helioviewer.api+'?action=downloadScreenshot&id='+response.id);
            }
        });

        $.ajax({
            url: Helioviewer.api + screenshotEnd,
            dataType: Helioviewer.dataType,
            success: function (response) {
                $('#helioviewer-script-dates #endThumb').attr('src',Helioviewer.api+'?action=downloadScreenshot&id='+response.id);
            }
        });

/*
        if ( "movieId" in params ) {
            contents.append(
                $('<input type="hidden" name="movieId" value="'+params.movieId+'" />')
            );
        }
*/

        if ( subDates ) {
            $('#helioviewer-script-dates span').css('margin-left','19px');

            $('#science-data-dates-custom').show();
            $('#science-data-dates-checkbox').prop('checked',false);
            $.each( $('#dates-custom .dimmable'), function(i,n) {
                $(n).addClass('form-disabled');
            });

            $('#helioviewer-script-dates #startDate').val(params.startDate.toUTCDateString()+' '+params.startDate.toUTCTimeString()).prop('disabled',true);

            $('#helioviewer-script-dates #endDate').val(params.endDate.toUTCDateString()+' '+params.endDate.toUTCTimeString()).prop('disabled',true);

            $('#science-data-dates-checkbox').click(function(e,i) {

                if ( $('#science-data-dates-checkbox').attr('checked') ) {
                    $('.sub-date').hide(200);

                    $('#helioviewer-script-dates #startDate').prop('disabled',false);
                    $('#helioviewer-script-dates #startTime').prop('disabled',false);

                    $('#helioviewer-script-dates #endDate').prop('disabled',false);
                    $('#helioviewer-script-dates #endTime').prop('disabled',false);

                    $.each( $('#dates-custom .dimmable'), function(i,n) {
                        $(n).removeClass('form-disabled');
                    });
                }
                else {
                    $('.sub-date').show(200);

                    $('#helioviewer-script-dates #startDate').prop('disabled',true);
                    $('#helioviewer-script-dates #startTime').prop('disabled',true);

                    $('#helioviewer-script-dates #endDate').prop('disabled',true);
                    $('#helioviewer-script-dates #endTime').prop('disabled',true);

                    $.each( $('#dates-custom .dimmable'), function(i,n) {
                        $(n).addClass('form-disabled');
                    });

                }
            });
        }
        else {
            $('#helioviewer-script-dates span').css('margin-left','0');

            $('#helioviewer-script-dates #startDate').val(params.startDate.toUTCDateString()).prop('disabled',false);
            $('#helioviewer-script-dates #startTime').val(params.startDate.toUTCTimeString()).prop('disabled',false);

            $('#helioviewer-script-dates #endDate').val(params.endDate.toUTCDateString()).prop('disabled',false);
            $('#helioviewer-script-dates #endTime').val(params.endDate.toUTCTimeString()).prop('disabled',false);

            $('#science-data-dates-custom').hide();
            $('#science-data-dates-checkbox').prop('checked',true);
            $.each( $('#dates-custom .dimmable'), function(i,n) {
                $(n).removeClass('form-disabled');
            });

            $('#helioviewer-script-dates').show();
        }
    },


    _dialog: function (roi) {
        this.roi = roi;

        $("#scidata-button").trigger('toggle-scidata-dialog');
        this.sciDataForm();
    },


    sciDataForm: function () {
        this._updateDialog();
        $(document).trigger("bind-scidata-form-to-viewport");
    },


    /**
     * Gathers all necessary information to generate a science data download
     * script, and then downloads the script when it is ready.
     *
     * @param {Object} roi Region of interest to use in place of the current \
     * viewport roi
     */
    _takeSciData: function (roi) {
console.info('SciDataManagerUI._takeSciData()');
        var params, dataType, imageScale, layers, events, eventLabels, scale, scaleType, scaleX, scaleY, scidata, lang, self = this;

        if (typeof roi === "undefined") {
            roi = helioviewer.getViewportRegionOfInterest();
        }

        imageScale  = helioviewer.getImageScale();
        layers      = helioviewer.getVisibleLayers(roi);
        events      = helioviewer.getEvents();

        if (Helioviewer.userSettings.get("state.eventLayerVisible") === false){
            events = '';
            eventLabels = false;
        }

        // Make sure selection region and number of layers are acceptible
        if (!this._validateRequest(roi, layers)) {
            return;
        }

        params = $.extend({
            action        : "getSciDataScript",
            imageScale    : imageScale,
            imageLayers   : layers,
            eventLayers   : events,
            startTime     : helioviewer.getDate().toISOString(),
            lang          : 'sswidl',
            fovType       : 'viewport'
        }, this._toArcsecCoords(roi, imageScale));

        // AJAX Responder
        $.get(Helioviewer.api, params, function (response) {
            if ((response === null) || response.error) {
                $(document).trigger("message-console-info",
                    "Unable to create science data download script. Please try again later.");
                return;
            }

            self._displayDownloadNotification(scidata);
        }, Helioviewer.dataType);
    }
});
