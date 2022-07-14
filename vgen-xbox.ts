import * as elevate from "windows-elevate";
import * as ffi from 'ffi-napi';
import * as ref from "ref-napi";
import assert = require("assert")

export enum Buttons {
    START = 0x0010,
    BACK = 0x0020,
    LEFT_THUMB = 0x0040,
    RIGHT_THUMB = 0x0080,
    LEFT_SHOULDER = 0x0100,
    RIGHT_SHOULDER = 0x0200,
    A = 0x1000,
    B = 0x2000,
    X = 0x4000,
    Y = 0x8000,
};

export enum Dpad {
    NONE = 0x0000,
    UP = 0x0001,
    UP_LEFT = 0x0001 | 0x0004,
    UP_RIGHT = 0x0001 | 0x0008,
    DOWN = 0x0002,
    DOWN_LEFT = 0x0002 | 0x0004,
    DOWN_RIGHT = 0x0002 | 0x0008,
    LEFT = 0x0004,
    RIGHT = 0x0008,
}

export class VGen {
    readonly vgen;
    constructor() {
        // this.vgen = {};
        try { this.vgen = this._initffi(__dirname + "/lib/vGenInterface_x86.dll"); }
        catch (e) {
            try { this.vgen = this._initffi(__dirname + "/lib/vGenInterface_x64.dll"); }
            catch (e) { throw new Error("Could not initialize ffi: " + e); }
        }
    }

    /**
     * Helper function for intializing ffi
     */
    _initffi(dllName: string) {
        return ffi.Library(dllName,
            {
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
            })
    }

    /**
     * Helper function for asserting correct controller state 
     */
    _inputInvariant(id: number) {
        if (this.vgen.isVBusExist() !== 0)
            throw new Error("VBus does not exist. Install ScpVBus and try again");

        assert(this.isPluggedIn(id) === true, `Controller ${id} is not plugged in`);
        assert(this.isOwned(id) === true, `Controller ${id} is not owned`);
    }

    /**
     * Installs ScpVBus (required for vGenInterface)
     * @param {Function} cb Called on finish
     */
    installDriver(cb: any) {
        var df = __dirname + "\\drivers\\x86\\"
        if (process.config.variables.host_arch === "x64")
            df = __dirname + "\\drivers\\x64\\"

        elevate.exec(df + "devcon.exe", ["install", df + "\\ScpVBus.inf", "Root\\ScpVBus"],
            function (error, stdout, stderr) {
                if (error !== null) {
                    console.log("driver install error: " + error);
                }
                if (cb !== undefined)
                    cb();
            });
    }

    /**
     * Uninstalls ScpVBus
     * @param {Function} cb Called on finish
     */
    uninstallDriver(cb: any) {
        var df = __dirname + "\\drivers\\x86\\"
        if (process.config.variables.host_arch === "x64")
            df = __dirname + "\\drivers\\x64\\"

        elevate.exec(df + "devcon.exe", ["remove", "Root\\ScpVBus"],
            function (error, stdout, stderr) {
                if (error !== null) {
                    console.log('driver uninstall error: ' + error);
                }
                if (cb !== undefined)
                    cb();
            });
    }

    /**
     * Plugs in controller with specified ID
     * @param {Number} id Controller ID
     */
    plugin(id: number) {
        assert(id !== undefined, "Id is undefined");
        assert(id >= 1 && id <= 4, "Id is outside available range");
        if (this.vgen.PlugIn(id) !== 0)
            throw new Error("PlugIn return value equal to STATUS_SUCCESS");
    }

    /**
     * Unplugs controller with specified ID
     * @param {Number} id Controller ID
     */
    unplug(id: number) {
        assert(id !== undefined, "Id is undefined");
        assert(id >= 1 && id <= 4, "Id is outside available range");
        if (this.vgen.UnPlug(id) !== 0)
            throw new Error("UnPlug return value equal to STATUS_SUCCESS");
    }

    /**
     * Plugs in next available controller. Returns the new controllers ID
     * @param {Number} id Controller ID
     * @return {Number}
     */
    pluginNext() {
        var o = ref.alloc("uint") as any;
        if (this.vgen.PlugInNext(o) !== 0)
            throw new Error("PluginNext return value equal to STATUS_SUCCESS");
        return o.deref();
    }

    /**
     * Gets number of empty controller slots
     * @param {Number} id Controller ID
     * @return {Number}
     */
    getNumEmptySlots() {
        var o = ref.alloc("uchar") as any;
        if (this.vgen.GetNumEmptyBusSlots(o) !== 0)
            throw new Error("GetNumEmptyBusSlots return value equal to STATUS_SUCCESS");
        return o.deref();
    }

    /**
     * Returns true if the specified controller is plugged in
     * @param {Number} id Controller ID
     * @return {boolean}
     */
    isPluggedIn(id: number) {
        assert(id !== undefined, "Id is undefined");
        assert(id >= 1 && id <= 4, "Id is outside available range");
        var o = ref.alloc("int") as any;
        if (this.vgen.isControllerPluggedIn(id, o) !== 0)
            throw Error("isControllerPluggedIn return value equal to STATUS_SUCCESS");
        return o.deref() === 1;
    }

    /**
    * Returns true if this application owns the controller
    * @param {Number} id Controller ID
    * @return {boolean}
    */
    isOwned(id: number) {
        assert(id !== undefined, "Id is undefined");
        assert(id >= 1 && id <= 4, "Id is outside available range");
        var o = ref.alloc("int") as any;
        if (this.vgen.isControllerOwned(id, o) !== 0)
            throw Error("isControllerOwned return value equal to STATUS_SUCCESS");
        return o.deref() === 1;
    }

    /**
     * Applies axis values [-1..1] to specified controller left stick
     * @param {Number} id Controller ID
     * @param {Number} x
     * @param {Number} y
     */
    setAxisL(id: number, x: number, y: number) {
        this._inputInvariant(id);
        this.vgen.SetAxisLx(id, x * 32766)
        this.vgen.SetAxisLy(id, y * 32766)
    }

    /**
     * Applies axis values [-1..1] to specified controller right stick
     * @param {Number} id Controller ID
     * @param {Number} x
     * @param {Number} y
     */
    setAxisR(id: number, x: number, y: number) {
        this._inputInvariant(id);
        this.vgen.SetAxisRx(id, x * 32766)
        this.vgen.SetAxisRy(id, y * 32766)
    }

    /**
     * Applies trigger values [0..1] to specified controller left trigger
     * @param {Number} id Controller ID
     * @param {Number} value
     */
    setTriggerL(id: number, value: number) {
        this._inputInvariant(id);
        this.vgen.SetTriggerL(id, value * 255);
    }

    /**
    * Applies trigger values [0..1] to specified controller left trigger
    * @param {Number} id Controller ID
    * @param {Number} value
    */
    setTriggerR(id: number, value: number) {
        this._inputInvariant(id);
        this.vgen.SetTriggerR(id, value * 255);
    }

    /**
     * Sets button for specified controller
     * @param {Number} id Controller ID
     * @param {Buttons} button
     * @param {Bool}   pressed
     */
    setButton(id: number, button: Buttons, pressed: boolean) {
        this._inputInvariant(id);
        this.vgen.SetButton(id, button, Number(pressed));
    }

    /**
     * Sets dpad for specified controller
     * @param {Number} id Controller ID
     * @param {Dpad} dpad
     * @param {Bool}   pressed
     */
    setDpad(id: number, dpad: Dpad) {
        this._inputInvariant(id);
        this.vgen.SetDpad(id, dpad);
    }
}
