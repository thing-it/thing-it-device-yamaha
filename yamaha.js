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
        this.logInfo("Scanning for Yamaha Host " + this.configuration.name + " started.");

        var yamaha = new YamahaNodeJs(this.configuration.name);

        yamaha.getBasicInfo().done(function(basicInfo){
            basicInfo.getVolume();
            basicInfo.isMuted();
            basicInfo.isOn();
            basicInfo.isOff();
            basicInfo.getCurrentInput();
            basicInfo.isPartyModeEnabled();
            basicInfo.isPureDirectEnabled();
        })
    };

    /**
     *
     */
    Yamaha.prototype.readStatus = function () {
        var deferred = q.defer();
        this.yamaha.getCurrentState(function (err, state) {
            this.state.currentState = state;
            this.logDebug("Current State: " + this.state.currentState);
        }.bind(this));

        this.yamaha.getMuted(function (err, muted) {
            this.state.muted = muted;
            this.logDebug("Muted: " + this.state.muted);
        }.bind(this))

        this.yamaha.currentTrack(function (err, track) {
            this.state.currentTrack = track.title,
            this.state.artist = track.artist,
            this.state.album = track.album,
            this.state.albumArtURI = track.albumArtURI
            this.logDebug("Current State: ", this.state);
        }.bind(this));

        this.yamaha.getVolume(function (err, volume) {
            this.state.volume = volume;
            this.logDebug("Current Volume: " + this.state.volume);
        }.bind(this));

        this.logDebug("Current Track: ", this.state.currentTrack, " Volume: ", this.state.volume, " State: ", this.state.currentState);
        this.publishStateChange();
        deferred.resolve();
        return deferred.promise;
    }

    /**
     *
     */
    Yamaha.prototype.registerEvents = function () {
        this.logDebug("Registering for zone events.");
        var Listener = require('yamaha/lib/events/listener');
        var listener = new Listener(this.yamaha);
        this.logDebug("Initiated the listener.");

        listener.listen(function (err) {
            if (err) throw err;

            /**
             * TODO: Add services for:
             * - /MediaServer/ConnectionManager/Event
             *      UPnP standard connection manager service for the media server.
             * - /MediaRenderer/ConnectionManager/Event
             *      UPnP standard connection manager service for the media renderer.
             * - /MediaRenderer/Queue/Event
             *      Yamaha queue service, for functions relating to queue management, saving
             *      queues etc.
             * - /MediaRenderer/GroupRenderingControl/Control
             *      Yamaha group rendering control service, for functions relating to
             *      group volume etc.
             * - /ZoneGroupTopology/Event
             *      Notification about zone changes
             */

                // Register for play, pause, etc.
            listener.addService('/MediaRenderer/AVTransport/Event', function (error, sid) {
                if (error) {
                    this.logInfo("Error: " + JSON.stringify(error));
                    throw error;
                }
                this.logInfo('Successfully subscribed, with subscription id', sid);
            }.bind(this));

            // register for playback rendering, eg bass, treble, volume and EQ.
            listener.addService('/MediaRenderer/RenderingControl/Event', function (error, sid) {
                if (error) {
                    this.logError("Error: " + JSON.stringify(error));
                    throw error;
                }
                this.logInfo('Successfully subscribed, with subscription id', sid);
            }.bind(this));

            listener.on('serviceEvent', function (endpoint, sid, data) {
                this.logDebug('Received event from', endpoint, '(' + sid + ').');

                this.readStatus();
                /* The following code only works for AVTransport events
                 xml2js = require('yamaha/node_modules/xml2js');

                 xml2js.parseString(data.LastChange, function (err, avTransportEvent) {

                 try {
                 var currentTrackMetaDataXML = avTransportEvent.Event.InstanceID[0].CurrentTrackMetaData[0].$.val;
                 } catch (e) {
                 this.logError("Could not handle event from", endpoint, '(' + sid + ').');
                 }

                 xml2js.parseString(currentTrackMetaDataXML, function (err, trackMetaData) {
                 if(!err){
                 this.logInfo("Notified about current track: " + trackMetaData["DIDL-Lite"].item[0]["dc:title"][0]);
                 this.state.currentTrack = trackMetaData["DIDL-Lite"].item[0]["dc:title"][0];
                 this.publishStateChange();
                 }
                 else {
                 this.logError("Error parsing event from", endpoint, '(' + sid + ').');
                 }
                 }.bind(this));
                 }.bind(this));
                 */
            }.bind(this));
        }.bind(this));

        this.logInfo("Done registering events.");
        setInterval(Yamaha.prototype.readStatus.bind(this), 1000);
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
     *
     *
     */
    Yamaha.prototype.play = function () {
        this.logInfo("Yamaha play called");//@TODO remove

        if (!this.isSimulated()) {
            this.yamaha.play(function (err, data) {
                // no need to do anything, really.
            }.bind(this));
        }
        else {
            this.state.currentState = "playing";
        }

        this.publishStateChange();
    };

    /**
     *
     *
     */
    Yamaha.prototype.pause = function () {
        this.logInfo("Yamaha pause called");//@TODO remove

        if (!this.isSimulated()) {
            this.yamaha.pause(function (err, data) {
                // no need to do anything, really.
            }.bind(this));
        }
        else {
            this.state.currentState = "paused";
        }

        this.publishStateChange();
    };

    /**
     *
     *
     */
    Yamaha.prototype.stop = function () {
        this.logInfo("Yamaha stop called");//@TODO remove

        if (!this.isSimulated()) {
            this.yamaha.stop(function (err, data) {
                // no need to do anything, really.
            }.bind(this));
        }
        else {
            this.state.currentState = "stopped";
        }

        this.publishStateChange();
    };

    /**
     *
     *
     */
    Yamaha.prototype.next = function () {
        this.logInfo("Yamaha next called");//@TODO remove

        if (!this.isSimulated()) {
            this.yamaha.next(function (err, data) {
                // no need to do anything, really.
            }.bind(this));

            this.publishStateChange();
        }
        else {
            this.simulateNextSong();
        }


    };

    /**
     *
     *
     */
    Yamaha.prototype.previous = function () {
        this.logInfo("Yamaha previous called");//@TODO remove

        if (!this.isSimulated()) {
            this.yamaha.previous(function (err, data) {
                // no need to do anything
            }.bind(this));

            this.publishStateChange();
        }
        else{
            this.simulatePreviousSong()
        }

    };

    /**
     *
     *
     */
    Yamaha.prototype.mute = function () {
        this.logDebug("Yamaha mute called");

        if (!this.isSimulated()) {
            this.yamaha.getMuted(function (err, muted) {
                var muteOpposite = !muted;
                this.logInfo("Setting mute to " + muteOpposite);
                this.yamaha.setMuted(muteOpposite, function (err, data) {
                });
            }.bind(this))
        }
        else{
            this.state.muted = !this.state.muted;
        }

        this.publishStateChange();
    };

    /**
     *
     *
     */
    Yamaha.prototype.isPlaying = function(){
        return ((this.state.currentState == "playing") || (this.state.currentState == "transitioning"));
    }

    /**
     *
     *
     */
    Yamaha.prototype.isPaused = function(){
        return (this.state.currentState == "paused");
    }

    /**
     *
     *
     */
    Yamaha.prototype.isStopped = function(){
        return (this.state.currentState == "stopped");
    }

    /**
     *
     *
     */
    Yamaha.prototype.isMuted = function(){
        return this.state.muted;
    }

    /**
     *
     *
     */
    Yamaha.prototype.changeVolume = function (parameters) {
        this.logDebug("Yamaha changeVolume called");

        this.state.volume = parameters.level;

        if (!this.isSimulated()) {
            this.yamaha.setVolume(this.state.volume, function (err, data) {
                // no need to do anything, really.
            }.bind(this));
        }

        this.publishStateChange();
    };

    /**
     *
     *
     */
    Yamaha.prototype.initiateSimulation = function(){
        this.state = {
            currentTrack: null,
            currentState: "playing",
            volume: 23,
            muted: false,
            artist: null,
            album: null,
            albumArtURI: null
        };

        this.simulationData = {
            songNr: 0,
            songs: [{
                currentTrack: "My Other Love",
                artist: "Pretty Lights",
                album: "Filling Up The City Skies",
                albumArtURI: "http://cont-sv5-1.pandora.com/images/public/amz/8/0/1/6/900006108_500W_500H.jpg"
            }, {
                currentTrack: "Rainy Streets",
                artist: "Blue In Green",
                album: "The Break Of Dawn",
                albumArtURI: "http://cont-sjl-1.pandora.com/images/public/amz/8/0/1/0/885007210108_500W_500H.jpg"
            }, {
                currentTrack: "Ike's Mood I",
                artist: "Visioneers",
                album: "Dirty Old Hip-Hop",
                albumArtURI: "http://cont-2.p-cdn.com/images/public/amz/2/2/1/7/730003107122_500W_500H.jpg"
            }]
        };

        this.simulateSong(0);

        // Simulating song changes every 15 seconds, but only if playing
        setInterval(function () {
            if (this.isPlaying()){
                this.simulateNextSong();
            }
        }.bind(this), 15000);
    }

    /**
     *
     *
     */
    Yamaha.prototype.simulatePreviousSong = function() {
        this.logInfo("Simulating previous song.");

        if (this.simulationData.songNr == 0) {
            this.simulationData.songNr = (this.simulationData.songs.length - 1);
        }
        else {
            this.simulationData.songNr--;
        }

        this.simulateSong(this.simulationData.songNr);
    }

    /**
     *
     *
     */
    Yamaha.prototype.simulateNextSong = function() {
        this.logInfo("Simulating next song.");

        if (this.simulationData.songNr < (this.simulationData.songs.length - 1)) {
            this.simulationData.songNr++;
        }
        else {
            this.simulationData.songNr = 0;
        }

        this.simulateSong(this.simulationData.songNr);
    }

    /**
     *
     *
     */
    Yamaha.prototype.simulateSong = function(index){
        this.logInfo("Simulating song change to ", this.simulationData.songs[index]);
        this.state.currentTrack = this.simulationData.songs[index].currentTrack;
        this.state.artist = this.simulationData.songs[index].artist;
        this.state.album = this.simulationData.songs[index].album;
        this.state.albumArtURI = this.simulationData.songs[index].albumArtURI;
        this.publishStateChange();
    }

}
