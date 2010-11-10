/**
 * @fileOverview Contains the class definition for an TileLayerAccordion class.
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 * @see TileLayerManager, TileLayer
 * @requires ui.dynaccordion.js
 * 
 * TODO (2009/08/03) Create a TreeSelect object to handle hierarchical select fields? 
 * (can pass in a single tree during init)
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $, Layer, TreeSelect, TileLayer, getUTCTimestamp */
"use strict";
var TileLayerAccordion = Layer.extend(
    /** @lends TileLayerAccordion.prototype */
    {
    /**
     * @constructs
     * @description Creates a new TileLayerAccordion
     * @param {Object} tileLayers Reference to the application layer manager
     * @param {String} containerId ID for the outermost continer where the layer 
     * manager user interface should be constructed
     */
    init: function (containerId, dataSources, observationDate) {
        this.container        = $(containerId);
        this._dataSources     = dataSources;
        this._observationDate = observationDate;
        this._maximumTimeDiff = 12 * 60 * 60 * 1000; // 12 hours in miliseconds

        this.options = {};

        //Setup menu UI components
        this._setupUI();

        //Initialize accordion
        this.domNode = $('#TileLayerAccordion-Container');
        this.domNode.dynaccordion({startClosed: true});
        
        // Event-handlers
        $(document).bind("create-tile-layer-accordion-entry", $.proxy(this.addLayer, this))
                   .bind("update-tile-layer-accordion-entry", $.proxy(this._updateAccordionEntry, this))
                   .bind("observation-time-changed", $.proxy(this._onObservationTimeChange, this));
    },

    /**
     * @description Adds a new entry to the tile layer accordion
     * @param {Object} layer The new layer to add
     */
    addLayer: function (event, index, id, name, observatory, instrument, detector, measurement, date, 
                        startOpened, opacity, visible, onOpacityChange) {
        if (typeof(index) === "undefined") {
            index = 1000;
        }

        this._createAccordionEntry(index, id, name, visible, startOpened);
        this._initTreeSelect(id, observatory, instrument, detector, measurement);
        this._initOpacitySlider(id, opacity, onOpacityChange);        
        this._setupEventHandlers(id);
        this._updateTimeStamp(id, date);
        this._setupTooltips(id);
    },

    /**
     *
     */
    _createAccordionEntry: function (index, id, name, visible, startOpened) {
        var visibilityBtn, removeBtn, hidden, head, body;
        
        // initial visibility
        hidden = (visible ? "" : " hidden");
        
        visibilityBtn = "<span class='layerManagerBtn visible" + hidden + "' id='visibilityBtn-" + id +
                        "' title='Toggle layer visibility'></span>";
        removeBtn = "<span class='ui-icon ui-icon-closethick removeBtn' id='removeBtn-" + id +
                    "' title='Remove layer'></span>";
        head = "<div class='layer-Head ui-accordion-header ui-helper-reset ui-state-default ui-corner-all'>" + 
               "<span class=tile-accordion-header-left>" + name +
               "</span><span class=tile-accordion-header-right><span class=timestamp></span>" + 
               "<span class=accordion-header-divider>|</span>" + visibilityBtn + removeBtn + "</span></div>";
        
        // Create accordion entry body
        body = this._buildEntryBody(id);
        
        //Add to accordion
        this.domNode.dynaccordion("addSection", {
            id:     id,
            header: head,
            cell:   body,
            index:  index,
            open:   startOpened
        });  
    },
    
    /**
     * 
     */
    _initTreeSelect: function (id, observatory, instrument, detector, measurement) {
        var ids, selected, obs, inst, det, meas;
        
        // SELECT id's
        obs  = "#observatory-select-" + id;
        inst = "#instrument-select-"  + id;
        det  = "#detector-select-"    + id;
        meas = "#measurement-select-" + id;

        ids       = [obs, inst, det, meas];
        selected  = [observatory, instrument, detector, measurement];
        
        this.selectMenus = new TreeSelect(ids, this._dataSources, selected, function (leaf) {
            $(document).trigger("tile-layer-data-source-changed",
                [id, $(obs).attr("value"), $(inst).attr("value"), $(det).attr("value"), $(meas).attr("value"), 
                leaf.sourceId, leaf.nickname, leaf.layeringOrder]
             );
        });
    },
    
    /**
     * 
     */
    _initOpacitySlider: function (id, opacity, onOpacityChange) {
        $("#opacity-slider-track-" + id).slider({
            value: opacity,
            min  : 0,
            max  : 100,
            slide: function (e, ui) {
                if ((ui.value % 2) === 0) {
                    onOpacityChange(ui.value);
                }
            },
            change: function (e, ui) {
                onOpacityChange(ui.value);
                $(document).trigger("save-tile-layers");
            }
        });
    },

    /**
     * @description Builds the body section of a single TileLayerAccordion entry. NOTE: width and height 
     * must be hardcoded for slider to function properly.
     * @param {Object} layer The new layer to add
     * @see <a href="http://groups.google.com/group/Prototypejs/browse_thread/thread/60a2676a0d62cf4f">
     * This discussion thread</a> for explanation.
     */
    _buildEntryBody: function (id) {
        var opacitySlide, obs, inst, det, meas, fits;
        
        // Opacity slider placeholder
        opacitySlide = "<div class='layer-select-label'>Opacity: </div>";
        opacitySlide += "<div class='opacity-slider-track' id='opacity-slider-track-" + id;
        opacitySlide += "' style='width: 120px; height: 8px;'>";
        opacitySlide += "</div>";
                
        // Populate list of available observatories
        obs = "<div class=layer-select-label>Observatory: </div> ";
        obs += "<select name=observatory class=layer-select id='observatory-select-" + id + "'></select>";
       
        // Populate list of available instruments
        inst = "<div class=layer-select-label>Instrument: </div> ";
        inst += "<select name=instrument class=layer-select id='instrument-select-" + id + "'></select>";

        // Populate list of available Detectors
        det = "<div class=layer-select-label>Detector: </div> ";
        det += "<select name=detector class=layer-select id='detector-select-" + id + "'></select>";
        
        // Populate list of available Detectors
        meas = "<div class=layer-select-label>Measurement: </div> ";
        meas += "<select name=measurement class=layer-select id='measurement-select-" + id + "'>";
        meas += "</select><br><br>";
        
        fits = "<a href='#' id='showFITSBtn-" + id +
               "' style='margin-left:170px; color: white; text-decoration: none;'>FITS Header</a><br>";
        
        return (opacitySlide + obs + inst + det + meas + fits);
    },

    /**
     * @description Handles setting up an empty tile layer accordion.
     */
    _setupUI: function () {
        var title, addLayerBtn;
        
        // Create a top-level header and an "add layer" button
        title = $('<span class="section-header">Images</span>').css({'float': 'left'});
        addLayerBtn = $('<a href=# class=dark>[Add]</a>').css({'margin-right': '14px'});
        this.container.append($('<div></div>').css('text-align', 'right').append(title).append(addLayerBtn));
        this.container.append($('<div id="TileLayerAccordion-Container"></div>'));
        
        // Event-handlers
        addLayerBtn.click(function () {
            $(document).trigger("add-new-tile-layer");
        });
    },

    /**
     * @description Sets up event-handlers for a TileLayerAccordion entry
     * @param {Object} layer The layer being added
     */
    _setupEventHandlers: function (id) {
        var toggleVisibility, removeLayer, ids, self = this,
            visibilityBtn = $("#visibilityBtn-" + id),
            removeBtn     = $("#removeBtn-" + id);

        // Function for toggling layer visibility
        toggleVisibility = function (e) {
            $(document).trigger("toggle-layer-visibility", [id]);
            $("#visibilityBtn-" + id).toggleClass('hidden');
            e.stopPropagation();
        };

        // Function for handling layer remove button
        removeLayer = function (e) {
            $(document).trigger("remove-tile-layer", [id]);
            self._removeTooltips(id);
            self.domNode.dynaccordion('removeSection', {id: id});
            $(document).trigger("save-tile-layers");
            e.stopPropagation();
        };
        
        ids = ["#observatory-select-" + id, "#instrument-select-" + id, "#detector-select-" +
              id, "#measurement-select-" + id];

        visibilityBtn.bind('click', this, toggleVisibility);
        removeBtn.bind('click', removeLayer);
    },
    
    /**
     * @description Displays the FITS header information associated with a given image
     * @param {Object} layer
     */
    _showFITS: function (id, name, filepath, filename, server) {
        var params, self = this, dialog = $("#fits-header-" + id);
        
        // Check to see if a dialog already exists
        if (dialog.length !== 0) {
            if (!dialog.dialog("isOpen")) {
                dialog.dialog("open");
            }
            else {
                dialog.dialog("close");
            }
            return;
        }
        
        // Request parameters
        params = {
            action : "getJP2Header",
            file   : filepath + "/" + filename            
        };
        
        if (server > 0) {
            params.server = server;
        }
        
        $.get("api/index.php", params, function (response) {
            self._buildFITSHeaderDialog(name, id, response);
        });
    },
    
    /**
     * Creates a dialog to display a JP2 image XML Box/FITS header
     */
    _buildFITSHeaderDialog: function (name, id, response) {
        var sortBtn, unsorted, sorted, tags, tag, dialog, json = $.xml2json(response);
    
        // Format results
        dialog =  $("<div id='fits-header-" + id + "' class='fits-header-dialog' />");
        
        tags = [];
        
        // Unsorted list
        unsorted = "<div class='fits-regular'>";
        $.each(json, function (key, value) {
            tag = key + ": " + value;
            tags.push(tag);
            unsorted += tag + "<br>";
        });
        unsorted += "</div>";
        
        // Sorted list
        sorted = "<div class='fits-sorted' style='display: none;'>";
        $.each(tags.sort(), function () {
            sorted += this + "<br>";
        });
        sorted += "</div>";
        
        // Button to toggle sorting
        sortBtn = $("<span class='fits-sort-btn'>Abc</span>").click(function () {
            $(this).toggleClass("italic");
            dialog.find(".fits-sorted").toggle();
            dialog.find(".fits-regular").toggle();
        });
        
        dialog.append(unsorted + sorted).append(sortBtn).appendTo("body").dialog({
            autoOpen: true,
            title: "FITS Header: " + name,
            width: 400,
            height: 350,
            draggable: true
        });        
    },
    /**
     * @description Initialize custom tooltips for each icon in the accordion
     */
    _setupTooltips: function (id) {
        $(document).trigger('create-tooltip', ["#visibilityBtn-tile-" + id + ", #removeBtn-tile-" + id]);
    },
    
    /**
     * @description Unbinds event-handlers relating to accordion header tooltips
     * @param {String} id
     */
    _removeTooltips: function (id) {
        $("#visibilityBtn-" + id).qtip("destroy");
        $("#removeBtn-"     + id).qtip("destroy");
    },

    /**
     * Keeps track of requested date to use when styling timestamps
     */
    _onObservationTimeChange: function (event, requestDate) {
        var actualDate, weight, domNode, self = this;
        
        this._observationDate = requestDate;
        
        // Update timestamp colors
        $("#TileLayerAccordion-Container .timestamp").each(function (i, item) {
            domNode    = $(this);
            actualDate = new Date(getUTCTimestamp(domNode.text()));
                        
            weight = self._getScaledTimeDifference(actualDate, requestDate);

            domNode.css("color", self._chooseTimeStampColor(weight, 0, 0, 0));
        });
    },
    
    /**
     * 
     */
    _updateAccordionEntry: function (event, id, name, opacity, date, filepath, filename, server) {
        var entry = $("#" + id), self = this;
        
        this._updateTimeStamp(id, date);
        
        entry.find(".tile-accordion-header-left").html(name);

        // Refresh FITS header event listeners
        $("#fits-header-" + id).remove();
        
        entry.find("#showFITSBtn-" + id).unbind().bind('click', function () {
            self._showFITS(id, name, filepath, filename, server);
        });
    },
    
    /**
     * @description Updates the displayed timestamp for a given tile layer
     * @param {Object} layer The layer being updated
     */
    _updateTimeStamp: function (id, date) {
        var weight = this._getScaledTimeDifference(date, this._observationDate);
        
        $("#" + id).find('.timestamp').html(date.toUTCDateString() + " " + date.toUTCTimeString())
                   .css("color", this._chooseTimeStampColor(weight, 0, 0, 0));
    },
    
    /**
     * Returns a value from 0 to 1 representing the amount of deviation from the requested time
     */
    _getScaledTimeDifference: function (t1, t2) {
        return Math.min(1, Math.abs(t1.getTime() - t2.getTime()) / this._maximumTimeDiff);
    },
    
    /**
     * Returns a CSS RGB triplet ranging from green (close to requested time) to yellow (some deviation from requested
     * time) to red (requested time differs strongly from actual time).
     * 
     * @param float weight  Numeric ranging from 0.0 (green) to 1.0 (red)
     * @param int   rOffset Offset to add to red value
     * @param int   gOffset Offset to add to green value
     * @param int   bOffset Offset to add to blue value
     */
    _chooseTimeStampColor: function (w, rOffset, gOffset, bOffset) {
        var r = Math.min(255, rOffset + parseInt(2 * w * 255, 10)),
            g = Math.min(255, gOffset + parseInt(2 * 255 * (1 - w), 10)),
            b = bOffset + 0;
        
        return "rgb(" + r + "," + g + "," + b + ")";
    }
});

