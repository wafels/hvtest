/**
 * @fileOverview Contains the class definition for the Sandbox class.
 * @author <a href="mailto:keith.hughitt@nasa.gov">Keith Hughitt</a>
 * @author <a href="mailto:jaclyn.r.beck@gmail.com">Jaclyn Beck</a>
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $, document, window */
"use strict";
var SandboxHelper = Class.extend(
    /** @lends Sandbox.prototype */
    {
    init: function (x, y) {
        this.domNode = $("#sandbox");
        this.movingContainer = $("#moving-container");
        this.domNode.css({"left": x, "top": y});
    },

    /**
     * Find the center of the sandbox and put the movingContainer there
     */
    center: function () {
        var top, left;
        left = 0.5 * this.domNode.width();
        top  = 0.5 * this.domNode.height();

        this.moveContainerTo(left, top);
    },
        
    /**
     * Find the center of the sandbox
     */
    getCenter: function () {
        return {
            x: 0.5 * this.domNode.width(), 
            y: 0.5 * this.domNode.height()
        };
    },
        
    /**
     * Called when the viewport has moved or resized. Calculates the difference 
     * between current sandbox's size and position and desired sandbox size,
     * and updates the css accordingly. Also repositions the movingContainer.
     */
    updateSandbox: function (viewportCenter, desiredSandboxSize) {
        var change, oldCenter, newCenter, newHCLeft, newHCTop, containerPos;

        oldCenter = this.getCenter();
        
        // Update sandbox dimensions
        this.domNode.css({
            width  : desiredSandboxSize.width  + 'px',
            height : desiredSandboxSize.height + 'px',
            left   : viewportCenter.x - (0.5 * desiredSandboxSize.width) + 'px',
            top    : viewportCenter.y - (0.5 * desiredSandboxSize.height) + 'px'            
        });

        newCenter = this.getCenter();

        // Difference
        change = {
            x: newCenter.x - oldCenter.x,
            y: newCenter.y - oldCenter.y
        };

        if (Math.abs(change.x) < 0.01 && Math.abs(change.y) < 0.01) {
            return;
        }
        containerPos = this.movingContainer.position();

        // Update moving container position
        newHCLeft = Math.max(0, Math.min(desiredSandboxSize.width,  containerPos.left + change.x));
        newHCTop  = Math.max(0, Math.min(desiredSandboxSize.height, containerPos.top  + change.y));
 
        this.moveContainerTo(newHCLeft, newHCTop);
    },
        
    moveContainerTo: function (x, y) {
        this.movingContainer.css({left: x, top: y});
    }
});