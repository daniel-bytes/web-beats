function log(message){}

var TransportStates = {
	stopped: 0,
	paused: 1,
	running: 2
};

function Sequencer(bpm, stepsPerBar, bars, tracks, socket, log_function) {
	if (bpm == null || typeof bpm === "undefined") throw new Error("Sequencer.ctor - bpm is null or undefined.");
	if (stepsPerBar == null || typeof stepsPerBar === "undefined") throw new Error("Sequencer.ctor - stepsPerBar is null or undefined.");
	if (bars == null || typeof bars === "undefined") throw new Error("Sequencer.ctor - bars is null or undefined.");
	if (tracks == null || typeof tracks === "undefined") throw new Error("Sequencer.ctor - tracks is null or undefined.");
	if (socket == null || typeof socket === "undefined") throw new Error("Sequencer.ctor - socket is null or undefined.");
	
	this._bpm = bpm;
	this._bars = bars;
	this._tracks = tracks;
	this._stepsPerBar = stepsPerBar;
	this._pos = 0;
	this._states = [];
	this._socket = socket;
	this._instanceid = null;
	this._transport_state = TransportStates.stopped;
	this._log_function = log_function;
	
	log = function(message,data) { log_function("Sequencer", message,data); }
	
	log("new Sequencer created");
	
	for (var o = 0; o < this._tracks; o++) {
		var arr = [];
		for (var i = 0; i < (this._bars * this._stepsPerBar); i++) {
			arr.push(i % 4 === 0 ? 1 : 0);
		}
		this._states.push(arr);
	}
}

// Properties
Sequencer.prototype.getBpm = function() {
	return this._bpm;
}

Sequencer.prototype.setBpm = function(bpm) {
	this._bpm = bpm;
}

Sequencer.prototype.getTracks = function() {
	return this._tracks;
}

Sequencer.prototype.setTracks = function(tracks) {
	this._tracks = tracks;
}

Sequencer.prototype.getStepsPerBar = function(stepsPerBar) {
	return this._stepsPerBar;
}

Sequencer.prototype.setStepsPerBar = function(stepsPerBar) {
	this._stepsPerBar = stepsPerBar;
}

Sequencer.prototype.getBars = function() {
	return this._bars;
}

Sequencer.prototype.setBars = function(bars) {
	this._bars = bars;
}

Sequencer.prototype.getPosition = function() {
	return this._pos;
}

Sequencer.prototype.setPosition = function(pos) {
	if (pos < 0) pos = 0;
	if (pos >= (this._bars * 16)) pos = (this._bars * 16) - 1;
	this._pos = pos;
}

Sequencer.prototype.getTransportState = function() {
	return this._transport_state;
}

Sequencer.prototype.getState = function(track, pos) {
	return this._states[track][pos];
}

Sequencer.prototype.setState = function(track, pos, value) {	
	this._states[track][pos] = value;
	return { track: track, pos: pos, state: value };
}

Sequencer.prototype.getStates = function() {
	return this._states;
}

// Methods
Sequencer.prototype.sendMessage = function(name, value, toClient, toPeers) {
	toClient = arguments.length < 3 ? true : toClient;
	toPeers = arguments.length < 4 ? true : toPeers;

	try {
		if (toClient == true) {
			log("socket.emit - " + name, value);
			this._socket.emit(name, value);
		}

		if (toPeers == true) {
			this._socket.broadcast.emit(name, value);
		}
	}
	catch(e) {
		log("sendMessage failed: " + e);
	}
}

Sequencer.prototype.sendResponse = function(method, value) {
	this.sendMessage(method + "_response", value);
}

Sequencer.prototype.start = function() {
	this._transport_state = TransportStates.running;
}

Sequencer.prototype.restart = function() {
	this._pos = 0;
	this._transport_state = TransportStates.running;
}

Sequencer.prototype.pause = function() {
	this._transport_state = TransportStates.paused;
}

Sequencer.prototype.stop = function() {
	this._pos = 0;
	this._transport_state = TransportStates.stopped;
}

Sequencer.prototype.clear = function() {
	for (var o = 0; o < this._states.length; o++) {
		var len = this._states[o].length;
		
		for (var i = 0; i < len; i++) {
			this._states[o][i] = 0;
		}
	}
}

exports.Sequencer = Sequencer;