"use strict";
exports.__esModule = true;
exports.VGen = exports.Dpad = exports.Buttons = void 0;
var elevate = require("windows-elevate");
var ffi = require("ffi-napi");
var ref = require("ref-napi");
var assert = require("assert");
var Buttons;
(function (Buttons) {
    Buttons[Buttons["START"] = 16] = "START";
    Buttons[Buttons["BACK"] = 32] = "BACK";
    Buttons[Buttons["LEFT_THUMB"] = 64] = "LEFT_THUMB";
    Buttons[Buttons["RIGHT_THUMB"] = 128] = "RIGHT_THUMB";
    Buttons[Buttons["LEFT_SHOULDER"] = 256] = "LEFT_SHOULDER";
    Buttons[Buttons["RIGHT_SHOULDER"] = 512] = "RIGHT_SHOULDER";
    Buttons[Buttons["A"] = 4096] = "A";
    Buttons[Buttons["B"] = 8192] = "B";
    Buttons[Buttons["X"] = 16384] = "X";
    Buttons[Buttons["Y"] = 32768] = "Y";
})(Buttons = exports.Buttons || (exports.Buttons = {}));
;
var Dpad;
(function (Dpad) {
    Dpad[Dpad["NONE"] = 0] = "NONE";
    Dpad[Dpad["UP"] = 1] = "UP";
    Dpad[Dpad["UP_LEFT"] = 5] = "UP_LEFT";
    Dpad[Dpad["UP_RIGHT"] = 9] = "UP_RIGHT";
    Dpad[Dpad["DOWN"] = 2] = "DOWN";
    Dpad[Dpad["DOWN_LEFT"] = 6] = "DOWN_LEFT";
    Dpad[Dpad["DOWN_RIGHT"] = 10] = "DOWN_RIGHT";
    Dpad[Dpad["LEFT"] = 4] = "LEFT";
    Dpad[Dpad["RIGHT"] = 8] = "RIGHT";
})(Dpad = exports.Dpad || (exports.Dpad = {}));
var VGen = /** @class */ (function () {
    function VGen() {
        // this.vgen = {};
        try {
            this.vgen = this._initffi(__dirname + "/lib/vGenInterface_x86.dll");
        }
        catch (e) {
            try {
                this.vgen = this._initffi(__dirname + "/lib/vGenInterface_x64.dll");
            }
            catch (e) {
                throw new Error("Could not initialize ffi: " + e);
            }
        }
    }
    /**
     * Helper function for intializing ffi
     */
    VGen.prototype._initffi = function (dllName) {
        return ffi.Library(dllName, {
            "isVBusExist": ["ulong", []],
            "GetNumEmptyBusSlots": ["ulong", [ref.refType("uchar")]],
            "PlugIn": ["ulong", ["uint"]],
            "PlugInNext": ["ulong", [ref.refType("uint")]],
            "UnPlug": ["ulong", ["uint"]],
            "SetAxisLx": ["ulong", ["uint", "short"]],
            "SetAxisLy": ["ulong", ["uint", "short"]],
            "SetAxisRx": ["ulong", ["uint", "short"]],
            "SetAxisRy": ["ulong", ["uint", "short"]],
            "SetTriggerL": ["ulong", ["uint", "byte"]],
            "SetTriggerR": ["ulong", ["uint", "byte"]],
            "SetButton": ["ulong", ["uint", "uint16", "int"]],
            "SetDpad": ["ulong", ["uint", "uchar"]],
            "ResetController": ["ulong", ["uint"]],
            "isControllerPluggedIn": ["ulong", ["uint", ref.refType("int")]],
            "isControllerOwned": ["ulong", ["uint", ref.refType("int")]]
        });
    };
    /**
     * Helper function for asserting correct controller state
     */
    VGen.prototype._inputInvariant = function (id) {
        if (this.vgen.isVBusExist() !== 0)
            throw new Error("VBus does not exist. Install ScpVBus and try again");
        assert(this.isPluggedIn(id) === true, "Controller ".concat(id, " is not plugged in"));
        assert(this.isOwned(id) === true, "Controller ".concat(id, " is not owned"));
    };
    /**
     * Installs ScpVBus (required for vGenInterface)
     * @param {Function} cb Called on finish
     */
    VGen.prototype.installDriver = function (cb) {
        var df = __dirname + "\\drivers\\x86\\";
        if (process.config.variables.host_arch === "x64")
            df = __dirname + "\\drivers\\x64\\";
        elevate.exec(df + "devcon.exe", ["install", df + "\\ScpVBus.inf", "Root\\ScpVBus"], function (error, stdout, stderr) {
            if (error !== null) {
                console.log("driver install error: " + error);
            }
            if (cb !== undefined)
                cb();
        });
    };
    /**
     * Uninstalls ScpVBus
     * @param {Function} cb Called on finish
     */
    VGen.prototype.uninstallDriver = function (cb) {
        var df = __dirname + "\\drivers\\x86\\";
        if (process.config.variables.host_arch === "x64")
            df = __dirname + "\\drivers\\x64\\";
        elevate.exec(df + "devcon.exe", ["remove", "Root\\ScpVBus"], function (error, stdout, stderr) {
            if (error !== null) {
                console.log('driver uninstall error: ' + error);
            }
            if (cb !== undefined)
                cb();
        });
    };
    /**
     * Plugs in controller with specified ID
     * @param {Number} id Controller ID
     */
    VGen.prototype.plugin = function (id) {
        assert(id !== undefined, "Id is undefined");
        assert(id >= 1 && id <= 4, "Id is outside available range");
        if (this.vgen.PlugIn(id) !== 0)
            throw new Error("PlugIn return value equal to STATUS_SUCCESS");
    };
    /**
     * Unplugs controller with specified ID
     * @param {Number} id Controller ID
     */
    VGen.prototype.unplug = function (id) {
        assert(id !== undefined, "Id is undefined");
        assert(id >= 1 && id <= 4, "Id is outside available range");
        if (this.vgen.UnPlug(id) !== 0)
            throw new Error("UnPlug return value equal to STATUS_SUCCESS");
    };
    /**
     * Plugs in next available controller. Returns the new controllers ID
     * @param {Number} id Controller ID
     * @return {Number}
     */
    VGen.prototype.pluginNext = function () {
        var o = ref.alloc("uint");
        if (this.vgen.PlugInNext(o) !== 0)
            throw new Error("PluginNext return value equal to STATUS_SUCCESS");
        return o.deref();
    };
    /**
     * Gets number of empty controller slots
     * @param {Number} id Controller ID
     * @return {Number}
     */
    VGen.prototype.getNumEmptySlots = function () {
        var o = ref.alloc("uchar");
        if (this.vgen.GetNumEmptyBusSlots(o) !== 0)
            throw new Error("GetNumEmptyBusSlots return value equal to STATUS_SUCCESS");
        return o.deref();
    };
    /**
     * Returns true if the specified controller is plugged in
     * @param {Number} id Controller ID
     * @return {boolean}
     */
    VGen.prototype.isPluggedIn = function (id) {
        assert(id !== undefined, "Id is undefined");
        assert(id >= 1 && id <= 4, "Id is outside available range");
        var o = ref.alloc("int");
        if (this.vgen.isControllerPluggedIn(id, o) !== 0)
            throw Error("isControllerPluggedIn return value equal to STATUS_SUCCESS");
        return o.deref() === 1;
    };
    /**
    * Returns true if this application owns the controller
    * @param {Number} id Controller ID
    * @return {boolean}
    */
    VGen.prototype.isOwned = function (id) {
        assert(id !== undefined, "Id is undefined");
        assert(id >= 1 && id <= 4, "Id is outside available range");
        var o = ref.alloc("int");
        if (this.vgen.isControllerOwned(id, o) !== 0)
            throw Error("isControllerOwned return value equal to STATUS_SUCCESS");
        return o.deref() === 1;
    };
    /**
     * Applies axis values [-1..1] to specified controller left stick
     * @param {Number} id Controller ID
     * @param {Number} x
     * @param {Number} y
     */
    VGen.prototype.setAxisL = function (id, x, y) {
        this._inputInvariant(id);
        this.vgen.SetAxisLx(id, x * 32766);
        this.vgen.SetAxisLy(id, y * 32766);
    };
    /**
     * Applies axis values [-1..1] to specified controller right stick
     * @param {Number} id Controller ID
     * @param {Number} x
     * @param {Number} y
     */
    VGen.prototype.setAxisR = function (id, x, y) {
        this._inputInvariant(id);
        this.vgen.SetAxisRx(id, x * 32766);
        this.vgen.SetAxisRy(id, y * 32766);
    };
    /**
     * Applies trigger values [0..1] to specified controller left trigger
     * @param {Number} id Controller ID
     * @param {Number} value
     */
    VGen.prototype.setTriggerL = function (id, value) {
        this._inputInvariant(id);
        this.vgen.SetTriggerL(id, value * 255);
    };
    /**
    * Applies trigger values [0..1] to specified controller left trigger
    * @param {Number} id Controller ID
    * @param {Number} value
    */
    VGen.prototype.setTriggerR = function (id, value) {
        this._inputInvariant(id);
        this.vgen.SetTriggerR(id, value * 255);
    };
    /**
     * Sets button for specified controller
     * @param {Number} id Controller ID
     * @param {Buttons} button
     * @param {Bool}   pressed
     */
    VGen.prototype.setButton = function (id, button, pressed) {
        this._inputInvariant(id);
        this.vgen.SetButton(id, button, Number(pressed));
    };
    /**
     * Sets dpad for specified controller
     * @param {Number} id Controller ID
     * @param {Dpad} dpad
     * @param {Bool}   pressed
     */
    VGen.prototype.setDpad = function (id, dpad) {
        this._inputInvariant(id);
        this.vgen.SetDpad(id, dpad);
    };
    return VGen;
}());
exports.VGen = VGen;
