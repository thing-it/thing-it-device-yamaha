# thing-it-device-yamaha

[![NPM](https://nodei.co/npm/thing-it-device-yamaha.png)](https://nodei.co/npm/thing-it-device-yamaha/)
[![NPM](https://nodei.co/npm-dl/thing-it-device-yamaha.png)](https://nodei.co/npm/thing-it-device-yamaha/)

[thing-it-node](https://github.com/marcgille/thing-it-node) Device Plugin for [Yamaha amps](www.yamaha.com).

This allows you to

* Remote control your Yamaha amp (input, volume, etc.).
* Include the Yamaha amp into scenarios together with other devices (universal remote) in a Mesh.
* See the current status of your amp.
* Do all of the above from any place in the world with an internet connection if your
  [thing-it-node](https://github.com/marcgille/thing-it-node) is connected to [thing-it.com](http://www.thing-it.com)


## Installation

Prerequesites:

* [Set up](http://www.thing-it.com/thing-it/index.html?document=gettingStarted#/documentationPanel) your [thing-it] Node Box and
* Connect the Node Box to the same network your Yamaha is connected to.


Installation:

* Configure or copy a [thing-it] Mesh
* Add a Yamaha device
* Configure the Yamaha device by providing the IP address of the Yamaha amp you want to control
    * You can find the Yamaha amp's IP address in the "Device Select" screen of the Yamaha app


## Mobile UI

The UI display's the connected Yamaha' state and allows to control it.

<p align="center"><a href="./documentation/images/thing-it-mobile-sonos-yamaha.png"><img src="./documentation/images/thing-it-mobile-sonos-yamaha-.png" width="70%" height="70%"></a></p>

## Where to go from here ...

After completing the above, you may be interested in

* Configuring additional [Devices](https://www.thing-it.com/thing-it/#/documentationPanel/mobileClient/deviceConfiguration), 
[Groups](https://www.thing-it.com/thing-it/#/documentationPanel/mobileClient/groupConfiguration), 
[Services](https://www.thing-it.com/thing-it/#/documentationPanel/mobileClient/serviceConfiguration), 
[Event Processing](https://www.thing-it.com/thing-it/#/documentationPanel/mobileClient/eventConfiguration), 
[Storyboards](https://www.thing-it.com/thing-it/#/documentationPanel/mobileClient/storyboardConfiguration) and 
[Jobs](https://www.thing-it.com/thing-it/#/documentationPanel/mobileClient/jobConfiguration) via your **[thing-it] Mobile App**.
* Use [thing-it.com](https://www.thing-it.com) to safely connect your Node Box from everywhere, manage complex configurations, store and analyze historical data 
and offer your configurations to others on the **[thing-it] Mesh Market**.
* Explore other Device Plugins like [Texas Instruments Sensor Tag](https://www.npmjs.com/package/thing-it-device-ti-sensortag), [Plugwise Smart Switches](https://www.npmjs.com/package/thing-it-device-plugwise) and many more. For a full set of 
Device Plugins search for **thing-it-device** on [npm](https://www.npmjs.com/). Or [write your own Plugins](https://github.com/marcgille/thing-it-node/wiki/Plugin-Development-Concepts).
