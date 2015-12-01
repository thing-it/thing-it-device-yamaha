module.exports = {
    metadata: {
        family: "yamaha",
        plugin: "yamaha",
        label: "Yamaha",
        tangible: true,
        discoverable: true,
        state: [{
            id: "name",
            label: "Name",
            type: {
                id: "string"
            }
        }, {
            id: "modelName",
            label: "Model Name",
            type: {
                id: "string"
            }
        }, {
            id: "on",
            label: "On",
            type: {
                id: "boolean"
            }
        }, {
            id: "input",
            label: "Input",
            type: {
                id: "string"
            }
        }, {
            id: "inputName",
            label: "Input Name",
            type: {
                id: "string"
            }
        }, {
            id: "volume",
            label: "Volume",
            type: {
                id: "integer"
            }
        }, {
            id: "muted",
            label: "Muted",
            type: {
                id: "boolean"
            }
        }, {
            id: "direct",
            label: "Direct",
            type: {
                id: "boolean"
            }
        }, {
            id: "availableInputs",
            label: "Available Inputs",
            type: {
                id: "Object"
            }
        }],
        actorTypes: [],
        sensorTypes: [],
        services: [{
            id: "powerOn",
            label: "Power On"
        }, {
            id: "powerOff",
            label: "Power Off"
        }, {
            id: "power",
            label: "power"
        }, {
            id: "mute",
            label: "Mute"
        }, {
            id: "mute",
            label: "Mute"
        }, {
            id: "direct",
            label: "Direct"
        }, {
            id: "setInput",
            label: "Set Input"
        }, {
            id: "setVolume",
            label: "Set Volume"
        }],
        configuration: [{
            id: "simulated",
            label: "Simulated",
            type: {
                id: "boolean"
            }
        }, {
            id: "host",
            label: "Host",
            type: {
                id: "string"
            }
        }, {
            id: "name",
            label: "Name",
            type: {
                id: "string"
            }
        }, {
            id: "updateInterval",
            label: "Update Interval",
            type: {
                id: "integer"
            },
            defaultValue: 1000
        }]
    },

    create: function (device) {
        return new Yamaha();
    },
    discovery: function (options) {
        var discovery = new YamahaDiscovery();

        discovery.options = options;

        return discovery;
    }
};

var YamahaNodeJs;
var q = require('q');

function YamahaDiscovery() {
    /**
     *
     * @param options
     */
    YamahaDiscovery.prototype.start = function () {
    };

    /**
     *
     * @param options
     */
    YamahaDiscovery.prototype.stop = function () {
    };
}

/**
 *
 */
function Yamaha() {
    Yamaha.prototype.initializeValues = function () {
        this.state = {
            name: null,
            modelName: null,
            on: false,
            input: null,
            volume: 0,
            muted: false,
            direct: false,
            availableInputs: []
        };

        this.started = true;
        this.intervals = [];
        this.intervalCount = 0;
        this.simulationIntervals = [];
        this.simulationIntervalCount = 0;
        this.state.availableInputs = [];
        this.yamaha = null;
    }

    /**
     *
     */
    Yamaha.prototype.start = function () {
        var deferred = q.defer();
        this.initializeValues();

        this.state.updateInterval = ((this.configuration.updateInterval === undefined || 1000 > this.configuration.updateInterval)
            ? 1000
            : this.configuration.updateInterval);
        this.ignoreUpdate = false;

        this.logDebug("Yamaha state: ", this.state);
        this.logDebug("Yamaha configuration: ", this.configuration);

        if (!this.isSimulated()) {
            this.logInfo("Starting up Yamaha.");

            if (!YamahaNodeJs) {
                YamahaNodeJs = require("yamaha-nodejs");
            }

            this.scan();
        } else {
            this.logInfo("Starting up simulated Yamaha.");
            this.initiateSimulation();
        }

        deferred.resolve();
        return deferred.promise;
    };

    Yamaha.prototype.stop = function () {
        this.started = false;
        this.logInfo("Stopping Yamaha AV Receiver " + this.state.name + " (" + this.configuration.host + ").");

        for (var interval in this.intervals) {
            clearInterval(interval);
        }

        for (var interval in this.simulationIntervals) {
            clearInterval(interval);
        }

        this.initializeValues();
    }

    /**
     *
     */
    Yamaha.prototype.scan = function () {
        this.logInfo("Scanning for Yamaha AV Receiver at host " + this.configuration.host + " started.");

        try {
            this.yamaha = new YamahaNodeJs(this.configuration.host);
            this.logInfo("Connected to host " + this.configuration.name + " (" + this.configuration.host + ").");
            this.state.name = this.configuration.name;
            this.connect();
        } catch (e) {
            this.logError(e);
        }
    };

    /**
     *
     */
    Yamaha.prototype.readStatus = function () {
        this.logDebug("Reading status, ignore flag set to ", this.ignoreUpdate);

        if (this.started) {
            if (!this.isSimulated()) {
                if (!this.ignoreUpdate) {
                    try {
                        this.yamaha.getBasicInfo().done(function (basicInfo) {
                            if (!this.ignoreUpdate) {
                                this.logDebug("Updating status");
                                this.state.volume = Math.round(basicInfo.getVolume() / 10);
                                this.state.muted = Boolean(basicInfo.isMuted());
                                this.state.on = Boolean(basicInfo.isOn());
                                this.state.input = basicInfo.getCurrentInput();

                                // following code possibly specific to RX-V573
                                try {
                                    var rawBasicStatus = basicInfo.YAMAHA_AV.Main_Zone[0].Basic_Status[0];

                                    this.state.inputName = rawBasicStatus.Input[0].Input_Sel_Item_Info[0].Title[0];
                                    this.state.direct = "On" === rawBasicStatus.Sound_Video[0].Direct[0].Mode[0];
                                } catch (e) {
                                    this.logError("Error during status read: " + e.message);
                                    this.logError(e.stack);
                                }

                                this.publishStateChange();
                            } else {
                                this.logDebug("Ignoring status update per flag.");
                            }
                        }.bind(this));
                    } catch (e) {
                        this.logError(e);
                    }
                } else {
                    this.logDebug("Bypassing status update request per flag.");
                }
            }
            else {
                this.logDebug("Current state - on:" + this.state.on + ", input: " + this.state.input
                    + ", volume: " + this.state.volume + ", muted: " + this.state.muted);
            }
        }
    }

    /**
     *
     */
    Yamaha.prototype.registerEvents = function () {
        this.logDebug("Initiating updates with interval", this.state.updateInterval);

        this.intervals.push(setInterval(function () {
            this.logDebug("Requesting periodic status update.");
            this.readStatus();
        }.bind(this), this.state.updateInterval));
    }

    /**
     *
     */
    Yamaha.prototype.connect = function () {
        this.yamaha.getSystemConfig().done(function (config) {
            try {
                // Code possibly specific to RX-V573
                this.state.modelName = config.YAMAHA_AV.System[0].Config[0].Model_Name[0];
            } catch (e) {
                this.logError("Error reading model name", e);
            }

            var count = 0;

            // doesnt return AUDIO in the list, though it is available.
            // Code possibly specific to RX-V573
            this.state.availableInputs[count++] = {displayName: "AUDIO", id: "AUDIO"};

            try {
                // Code possibly specific to RX-V573
                for (var n in config.YAMAHA_AV.System[0].Config[0].Name[0].Input[0]) {
                    this.state.availableInputs[count++] = {
                        // Code possibly specific to RX-V573
                        displayName: config.YAMAHA_AV.System[0].Config[0].Name[0].Input[0][n][0].trim(),
                        id: n.replace("_", "")
                    };
                }

                this.logDebug("Found available inputs", this.state.availableInputs);
            } catch (e) {
                this.logError("Error reading inputs", e);
            }

            this.readStatus();
            this.registerEvents();
        }.bind(this));

        // The following code kills Sonos devices on the same network and is therefore not used.
        /*
         this.yamaha.getAvailableInputs().done(function(inputs){
         this.logInfo(config);
         }.bind(this));
         */
    }

    /**
     *
     */
    Yamaha.prototype.setState = function (state) {
        this.state = state;
    };

    /**
     *
     */
    Yamaha.prototype.getState = function () {
        return this.state;
    };


    /**
     * Switch On
     */
    Yamaha.prototype.powerOn = function () {
        this.logDebug("Switching on");
        this.ignoreUpdate = true;
        this.state.on = true;
        this.publishStateChange();

        if (!this.isSimulated()) {
            try {
                this.yamaha.powerOn().done(function (result) {
                    this.ignoreUpdate = false;
                }.bind(this));
            } catch (e) {
                this.logError(e);
            }
        }
    }

    /**
     * Switch Off
     */
    Yamaha.prototype.powerOff = function () {
        this.logDebug("Switching off");
        this.ignoreUpdate = true;
        this.state.on = false;
        this.publishStateChange();

        if (!this.isSimulated()) {
            try {
                this.yamaha.powerOff().done(function (result) {
                    this.ignoreUpdate = false;
                }.bind(this));
            } catch (e) {
                this.logError(e);
            }
        }
    }

    /**
     * Power (toggles power)
     */
    Yamaha.prototype.power = function () {
        this.logDebug("Power on: ", this.state.on);

        if (this.state.on) {
            this.powerOff();
        }
        else {
            this.powerOn();
        }
    }

    Yamaha.prototype.changeInput = function (parameters) {
        this.logDebug("ChangeInput called: ", parameters);
        this.setInput(parameters.input);
    }

    /**
     * Set input. Only allow inputs that are in the availableInputs state
     */
    Yamaha.prototype.setInput = function (input) {
        this.logDebug("Checking if  " + input + " is in input Array with length of "
            + this.state.availableInputs.length);

        for (index = 0; index < this.state.availableInputs.length; index++) {
            if (input == this.state.availableInputs[index].id) {
                this.logDebug("Setting input to " + this.state.availableInputs[index].displayName
                    + " (" + this.state.availableInputs[index].id + ").");

                if (!this.isSimulated()) {
                    this.yamaha.setMainInputTo(this.state.availableInputs[index].id).done(function (result) {
                        this.state.input = this.state.availableInputs[index].id;
                        this.state.inputName = this.state.availableInputs[index].displayName;
                        this.publishStateChange();
                    }.bind(this));
                } else {
                    this.state.input = this.state.availableInputs[index].id;
                    this.state.inputName = this.state.availableInputs[index].displayName;
                    this.publishStateChange();
                }

                break;
            }
        }
    }

    /**
     *
     *
     */
    Yamaha.prototype.mute = function () {
        this.logDebug("Yamaha mute called");

        if (this.state.muted) {
            this.muteOff();
        } else {
            this.muteOn();
        }
    };

    Yamaha.prototype.muteOn = function () {
        this.setMute(true);
    }

    Yamaha.prototype.muteOff = function () {
        this.setMute(false);
    }

    Yamaha.prototype.setMute = function (muted) {
        var modeString;
        this.ignoreUpdate = true;
        this.state.muted = muted;
        this.publishStateChange();

        if (muted) {
            modeString = "On";
        }
        else {
            modeString = "Off";
        }

        // Code likely specific to RX-V573
        var xml = '<YAMAHA_AV cmd="PUT"><Main_Zone><Volume><Mute>' + modeString
            + '</Mute></Volume></Main_Zone></YAMAHA_AV>';

        try {
            this.yamaha.SendXMLToReceiver(xml).done(function () {
                this.ignoreUpdate = false;
            }.bind(this));
        } catch (e) {
            this.logError(e);
        }
    }

    /**
     *
     *
     */
    Yamaha.prototype.isMuted = function () {
        return this.state.muted;
    }

    /**
     *
     *
     */
    Yamaha.prototype.direct = function () {
        this.logDebug("Yamaha direct called");
        var directTarget = !this.state.direct;

        if (!this.isSimulated()) {
            this.setDirect(directTarget);
        }
    };

    Yamaha.prototype.directOn = function () {
        this.setDirect(true);
    }

    Yamaha.prototype.directOff = function () {
        this.setDirect(false);
    }

    Yamaha.prototype.setDirect = function (direct) {
        var modeString;
        this.ignoreUpdate = true;
        this.state.direct = direct;
        this.publishStateChange();


        if (direct) {
            modeString = "On";
        }
        else {
            modeString = "Off";
        }
        // Code likely specific to RX-V573
        var xml = '<YAMAHA_AV cmd="PUT"><Main_Zone><Sound_Video><Direct><Mode>' + modeString
            + '</Mode></Direct></Sound_Video></Main_Zone></YAMAHA_AV>';

        try {
            this.yamaha.SendXMLToReceiver(xml).done(function () {
                this.ignoreUpdate = false;
            }.bind(this));
        } catch (e) {
            this.logError(e);
        }
    }

    /**
     *
     *
     */
    Yamaha.prototype.isDirect = function () {
        return this.state.direct;
    }

    /**
     * Method to be used in conjunction with UI sliders.
     *
     */
    Yamaha.prototype.changeVolume = function (parameters) {
        this.logDebug("ChangeVolume called: ", parameters);
        this.setVolume(parameters.level);
    };


    /**
     *
     */
    Yamaha.prototype.setVolume = function (volume) {
        var volumeInteger;

        if (typeof volume === 'string' || volume instanceof String) {
            volumeInteger = parseInt(volume);
        }
        else
            volumeInteger = volume;

        this.logDebug("Setting volume to" + volumeInteger);
        this.ignoreUpdate = true;
        this.state.volume = volumeInteger;
        this.publishStateChange();

        if (!this.isSimulated()) {
            try {
                this.yamaha.setVolumeTo(volumeInteger * 10).done(function (result) {
                    this.ignoreUpdate = false;
                }.bind(this));
            } catch (e) {
                this.logError(e);
            }
        }
    }

    /**
     *
     *
     */
    Yamaha.prototype.initiateSimulation = function () {
        this.state = {
            name: this.configuration.name,
            modelName: "RX-V573",
            on: true,
            input: "HDMI1",
            volume: -25,
            muted: false,
            availableInputs: [
                {displayName: 'AUDIO', id: 'AUDIO'},
                {displayName: 'CABLE', id: 'HDMI1'},
                {displayName: 'RASPBMC', id: 'HDMI2'},
                {displayName: 'DVD', id: 'HDMI3'},
                {displayName: 'HDMI4', id: 'HDMI4'},
                {displayName: 'AV1', id: 'AV1'},
                {displayName: 'AV2', id: 'AV2'},
                {displayName: 'AV3', id: 'AV3'},
                {displayName: 'AV4', id: 'AV4'},
                {displayName: 'AV5', id: 'AV5'},
                {displayName: 'AV6', id: 'AV6'},
                {displayName: 'V-AUX', id: 'VAUX'},
                {displayName: 'USB', id: 'USB'}]
        };

        this.registerEvents();

        // toggle mute every 15 seconds
        this.simulationIntervals[this.simulationIntervalCount++] = setInterval(function () {
            this.logInfo("Simulated mute toggle.");
            this.mute();
        }.bind(this), 15000);

        // toggle it back 3 seconds later
        this.simulationIntervals[this.simulationIntervalCount++] = setInterval(function () {
            this.logInfo("Simulated mute toggle.");
            this.mute();
        }.bind(this), 18000);

        // switch input every 25 seconds
        this.simulationIntervals[this.simulationIntervalCount++] = setInterval(function () {
            this.logInfo("Simulated switch from " + this.state.input + " to AV5.");
            this.lastInput = this.state.input;
            this.setInput("AV5");
        }.bind(this), 25000);

        // toggle it back 3 seconds later
        this.simulationIntervals[this.simulationIntervalCount++] = setInterval(function () {
            this.logInfo("Simulated switch back to " + this.lastInput + ".");
            this.setInput(this.lastInput);
        }.bind(this), 28000);
    }
}
