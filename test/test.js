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
    simulated: true,
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
    console.log("State Change", this.getState());
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


/* Tested successfully
setTimeout(function(){
    yamaha.mute();
}, 10000);

setTimeout(function(){
    yamaha.mute();
}, 14000);

setTimeout(function(){
    yamaha.setVolume(-31);
}, 10000);

setTimeout(function(){
    yamaha.setVolume(-30);
}, 14000);

 setTimeout(function(){
 yamaha.powerOff();
 }, 6000);

 setTimeout(function(){
 yamaha.powerOn();
 }, 12000);

 setTimeout(function(){
 yamaha.setInput("HDMI1");
 }, 20000);
*/

setTimeout(function(){
    yamaha.setInput("AUDIO");
}, 10000);


