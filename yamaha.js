module.exports = {
    metadata: {
        family: "yamaha",
        plugin: "yamaha",
        label: "Yamaha",
        tangible: true,
        discoverable: true,
        state: [{
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
            id: "mute",
            label: "Mute"
        }, {
            id: "setInput",
            label: "Set Input"
        }, {
            id: "setVaolume",
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
                id: "number"
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
        this.yamaha.getBasicInfo().done(function(basicInfo) {
            this.state.volume = basicInfo.getVolume();
            this.state.muted = basicInfo.isMuted();
            this.state.on = basicInfo.isOn();
            this.state.input = basicInfo.getCurrentInput();

            this.publishStateChange();
        }.bind(this));
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
        this.yamaha.powerOn();
        this.readStatus();
    }

    /**
     * Switch Off
     */
    Yamaha.prototype.powerOff = function(){
        this.yamaha.powerOff();
        this.readStatus();
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
        this.logDebug("Yamaha changeVolume called");
        this.setVolume(parameters.level)
    };


    /**
     *
     */
    Yamaha.prototype.setVolume = function(volume){
        this.state.volume = volume;

        if (!this.isSimulated()) {
            this.yamaha.setVolumeTo(this.state.volume);
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
