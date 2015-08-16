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

var q = require('q');
var YamahaNodeJs;

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
    /**
     *
     */
    Yamaha.prototype.start = function () {
        var deferred = q.defer();

        this.state = {
            name: null,
            modelName: null,
            on: false,
            input: null,
            volume: 0,
            muted: false,
            availableInputs: []
        };

        this.configuration.updateInterval = (1000 > this.configuration.updateInterval ? 1000 : this.configuration.updateInterval);
        this.ignoreUpdate = false;

        this.logDebug("Yamaha state: ", this.state);
        this.logDebug("Yamaha configuration: ", this.configuration);

        if (!this.isSimulated()) {
            this.logInfo("Starting up Yamaha.");
            this.started = true;

            if (!YamahaNodeJs) {
                YamahaNodeJs = require("yamaha-nodejs");
            }

            this.scan();
            deferred.resolve();
        } else {
            this.logInfo("Starting up simulated Yamaha.");
            deferred.resolve();
            this.initiateSimulation();
        }

        return deferred.promise;
    };

    /**
     *
     */
    Yamaha.prototype.scan = function () {
        this.logInfo("Scanning for Yamaha Host " + this.configuration.host + " started.");
        var deferred = q.defer();
        this.yamaha = new YamahaNodeJs(this.configuration.host);
        this.logInfo("Connected to host " + this.configuration.name + " (" + this.configuration.host + ").");
        this.state.name = this.configuration.name;
        deferred.resolve();
        this.connect();
        return deferred.promise;
    };

    /**
     *
     */
    Yamaha.prototype.readStatus = function () {
        this.logDebug("Reading status, ignore flag set to ", this.ignoreUpdate);

        if (!this.isSimulated()) {
            if (!this.ignoreUpdate) {
                this.yamaha.getBasicInfo().done(function (basicInfo) {
                    this.state.volume = Math.round(basicInfo.getVolume() / 10);
                    this.state.muted = Boolean(basicInfo.isMuted());
                    this.state.on = Boolean(basicInfo.isOn());
                    this.state.input = basicInfo.getCurrentInput();

                    this.publishStateChange();
                }.bind(this));
            }
        }
        else {
            this.logDebug("Current state - on:" + this.state.on + ", input: " + this.state.input
                + ", volume: " + this.state.volume + ", muted: " + this.state.muted);
            this.publishStateChange();
        }
    }

    /**
     *
     */
    Yamaha.prototype.registerEvents = function () {
        this.logDebug("Initiating updates with interval", this.configuration.updateInterval);
        setInterval(Yamaha.prototype.readStatus.bind(this), this.configuration.updateInterval);
    }

    /**
     *
     */
    Yamaha.prototype.connect = function () {
        this.readStatus();

        this.yamaha.getSystemConfig().done(function(config){
            try {
                this.state.modelName = config.YAMAHA_AV.System[0].Config[0].Model_Name[0];
            } catch (e) {
                this.logError("Error reading model name", e);
            }

            this.state.availableInputs = [];
            this.logInfo("Type: " + (typeof this.state.availableInputs));
            var count = 0;

            // doesnt return AUDIO in the list, though it is available.
            this.state.availableInputs[count++] = {displayName: "AUDIO", id: "AUDIO"};

            try {
                for (var n in config.YAMAHA_AV.System[0].Config[0].Name[0].Input[0]) {
                    this.state.availableInputs[count++] = {
                        displayName: config.YAMAHA_AV.System[0].Config[0].Name[0].Input[0][n][0].trim(),
                        id: n.replace("_", "")
                    };
                }

                this.logInfo("Found available inputs", this.state.availableInputs);
                this.publishStateChange();
            } catch (e) {
                this.logError("Error reading inputs", e);
            }
        }.bind(this));

        // kills sonos devices on the same network!
        /*
        this.yamaha.getAvailableInputs().done(function(inputs){
            this.logInfo(config);
        }.bind(this));
        */

        this.registerEvents();
    }

    /**
     *
     */
    Yamaha.prototype.setState = function (state) {
        this.state = state;

        this.publishStateChange();
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
    Yamaha.prototype.powerOn = function(){
        this.logInfo("Switching on");
        this.state.on = true;
        this.ignoreUpdate = true;
        setInterval(function(){
            this.ignoreUpdate = false;
        }.bind(this), 2500);
        this.publishStateChange();

        if (!this.isSimulated()){
            this.yamaha.powerOn();
        }
    }

    /**
     * Switch Off
     */
    Yamaha.prototype.powerOff = function(){
        this.logDebug("Switching off");
        this.state.on = false;
        this.ignoreUpdate = true;
        setInterval(function(){
            this.ignoreUpdate = false;
        }.bind(this), 2500);
        this.publishStateChange();

        if (!this.isSimulated()){
            this.yamaha.powerOff();
        }
    }

    /**
     * Power (toggles power)
     */
    Yamaha.prototype.power = function(){
        /*
        @TODO figure out UI issue where the toggle switches back and forth
         */
        this.logDebug("Power On", this.state.on);
        if (this.state.on){
            this.powerOff();
        }
        else {
            this.powerOn();
        }

        this.publishStateChange();
    }

    /**
     * Set input. Only allow inputs that are in the availableInputs state
     */
    Yamaha.prototype.setInput = function(input){
        this.logDebug("Checking if  " + input + " is in input Array with length of "
            + this.state.availableInputs.length);

        for	(index = 0; index < this.state.availableInputs.length; index++) {
            if (input == this.state.availableInputs[index].id){
                this.logInfo("Setting input to " + this.state.availableInputs[index].displayName
                    + " (" + this.state.availableInputs[index].id + ").");
                this.state.input = this.state.availableInputs[index].id;
                this.readStatus();

                if (!this.isSimulated()) {
                    this.yamaha.setMainInputTo(this.state.availableInputs[index].id);
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
        this.state.muted = !this.state.muted;

        if (!this.isSimulated()) {
            var yamahamutedState;

            if (this.state.muted){
                yamahamutedState = "On";
            }
            else{
                yamahamutedState = "Off";
            }

            var xml = '<YAMAHA_AV cmd="PUT"><Main_Zone><Volume><Mute>' + yamahamutedState
                + '</Mute></Volume></Main_Zone></YAMAHA_AV>'
            this.yamaha.SendXMLToReceiver(xml);
        }

        this.readStatus();
    };

    /**
     *
     *
     */
    Yamaha.prototype.isMuted = function(){
        return this.state.muted;
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
    Yamaha.prototype.setVolume = function(volume){
        if (typeof volume === 'string' || volume instanceof String){
            this.state.volume = parseInt(volume);
        }
        else
            this.state.volume = volume;

        if (!this.isSimulated()) {
            this.yamaha.setVolumeTo(this.state.volume * 10);
        }

        this.logDebug("Volume", this.state.volume, (typeof this.state.volume), volume);
        this.publishStateChange();
    }

    /**
     *
     *
     */
    Yamaha.prototype.initiateSimulation = function(){
        this.state = {
            name: this.configuration.name,
            modelName: "RX-V573",
            on: true,
            input: "HDMI1",
            volume: -25,
            muted: false,
            availableInputs: [
                { displayName: 'AUDIO', id: 'AUDIO' },
                { displayName: 'CABLE', id: 'HDMI1' },
                { displayName: 'RASPBMC', id: 'HDMI2' },
                { displayName: 'DVD', id: 'HDMI3' },
                { displayName: 'HDMI4', id: 'HDMI4' },
                { displayName: 'AV1', id: 'AV1' },
                { displayName: 'AV2', id: 'AV2' },
                { displayName: 'AV3', id: 'AV3' },
                { displayName: 'AV4', id: 'AV4' },
                { displayName: 'AV5', id: 'AV5' },
                { displayName: 'AV6', id: 'AV6' },
                { displayName: 'V-AUX', id: 'VAUX' },
                { displayName: 'USB', id: 'USB' }]
        };

        this.registerEvents();

        // toggle mute every 15 seconds
        setInterval(function (){
            this.logInfo("Simulated mute toggle.");
            this.mute();
        }.bind(this), 15000);

        // toggle it back 3 seconds later
        setInterval(function (){
            this.logInfo("Simulated mute toggle.");
            this.mute();
        }.bind(this), 18000);

        // switch input every 25 seconds
        setInterval(function (){
            this.logInfo("Simulated switch from " + this.state.input + " to AV5.");
            this.lastInput = this.state.input;
            this.setInput("AV5");
        }.bind(this), 25000);

        // toggle it back 3 seconds later
        setInterval(function (){
            this.logInfo("Simulated switch back to " + this.lastInput +".");
            this.setInput(this.lastInput);
        }.bind(this), 28000);
    }
}
