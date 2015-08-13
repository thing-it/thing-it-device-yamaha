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


## User Interface

The UI display's the connected Yamaha' state and allows to control it.

<img src="./documentation/images/yamaha-mobile-screenshot.png">