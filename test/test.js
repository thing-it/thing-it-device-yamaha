/**
 * This test file allows to run the basic initiation of the
 * HellowWorld class. It does not, however, simulate full
 * interaction with the node.
 */

var Yamaha = require('../Yamaha');

var yamaha = Yamaha.create({});

yamaha.isSimulated = function () {
    return false;
};
yamaha.configuration = {
    simulated: false,
    host: "10.0.1.10",
    name: "Livingroom V573",
    updateInterval: "1000"
};

yamaha.isSimulated = function (){
    return yamaha.configuration.simulated;
}

yamaha.publishEvent = function(event, data){
    console.log("Event", event);
};
yamaha.publishStateChange = function(){
    //console.log("State Change", this.getState());
    console.log("State Change");
};
yamaha.logInfo = function(){
    if (arguments.length == 1 ) {
        console.log(arguments[0]);
    }
    else{
        console.log(arguments);
    }
}
yamaha.logDebug = function(){
    //yamaha.logInfo(arguments);
}
yamaha.logError = function(){
    yamaha.logInfo(arguments);
}

console.log("About to start");
yamaha.start();


setTimeout(function(){
    yamaha.powerOff();
}, 5000);

setTimeout(function(){
    yamaha.powerOn();
}, 8000);

setTimeout(function(){
    yamaha.mute();
}, 10000);

setTimeout(function(){
    yamaha.mute();
}, 13000);

setTimeout(function(){
    yamaha.setVolume(-31);
}, 15000);

setTimeout(function(){
    yamaha.setVolume(-38);
}, 18000);

 setTimeout(function(){
 yamaha.setInput("HDMI1");
 }, 20000);

setTimeout(function(){
    yamaha.pureDirect();
}, 23000);

setTimeout(function(){
    yamaha.pureDirect();
}, 26000);

setTimeout((function(){
    yamaha.stop();
}), 30000);
