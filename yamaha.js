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
            }
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
            on: false,
            input: null,
            volume: 0,
            muted: false
        };

        this.ignoreUpdate = false;

        this.logDebug("Yamaha state: " + JSON.stringify(this.state));

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
            //this.initiateSimulation();
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
        this.logInfo("Connected to host " + this.configuration.host + ".");
        deferred.resolve();
        this.connect();
        return deferred.promise;
    };

    /**
     *
     */
    Yamaha.prototype.readStatus = function () {
        this.logDebug("Reading status, ignore flag set to ", this.ignoreUpdate);
        if (!this.ignoreUpdate){
            this.yamaha.getBasicInfo().done(function(basicInfo) {
                this.state.volume = Math.round(basicInfo.getVolume() / 10);
                this.state.muted = Boolean(basicInfo.isMuted());
                this.state.on = Boolean(basicInfo.isOn());
                this.state.input = basicInfo.getCurrentInput();

                this.publishStateChange();
            }.bind(this));
        }
    }

    /**
     *
     */
    Yamaha.prototype.registerEvents = function () {
        this.logDebug("Registering for zone events.");
        setInterval(Yamaha.prototype.readStatus.bind(this), this.configuration.updateInterval);
        this.logInfo("Done registering events.");
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
     * Switch Off
     */
    Yamaha.prototype.setInput = function(input){
        this.yamaha.setMainInputTo(input);
        this.readStatus();
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
        this.logInfo("Yamaha changeVolume called: ", parameters);
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
            this.logInfo("Volume", this.state.volume, (typeof this.state.volume), volume);
            this.yamaha.setVolumeTo(this.state.volume * 10);
        }

        this.publishStateChange();
    }

    /**
     *
     *
     */
    Yamaha.prototype.initiateSimulation = function(){
    }


}
