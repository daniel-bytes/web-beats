// TODO: Break out sequencer/position parts into a Sequencer type.
//       There should be only *1* clock every, running at 1/96th notes.
//       Each step should just notify all connected sequencers, which will push out events to connected clients.
//       NOTE: Sequencers must do a quick send/no-send event check and then return, so as to not block anyone else.

// Ctor
function Clock(bpm, stepsPerBar, bars, socket, log) {
	this._bpm = bpm;
	this._bars = bars;
	this._stepsPerBar = stepsPerBar;
	this._pos = 0;
	this._states = [];
	this._socket = socket;
	this._instanceid = null;
	this._log = log;
	
	for (var i = 0; i < (this._bars * this._stepsPerBar); i++) {
		this._states.push(0);
	}
}

// Properties
Clock.prototype.setBpm = function(bpm) {
	this._bpm = bpm;
}

Clock.prototype.getBpm = function() {
	return this._bpm;
}

Clock.prototype.setStepsPerBar = function(stepsPerBar) {
	this._stepsPerBar = stepsPerBar;
}

Clock.prototype.getBars = function() {
	return this._stepsPerBar;
}

Clock.prototype.setBars = function(bars) {
	this._bars = bars;
}

Clock.prototype.getBars = function() {
	return this._bars;
}

Clock.prototype.getPosition = function() {
	return this._pos;
}

Clock.prototype.setPosition = function(pos) {
	if (pos < 0) pos = 0;
	if (pos >= (this._bars * 16)) pos = (this._bars * 16) - 1;
	this._pos = pos;
}

Clock.prototype.getState = function(pos) {
	if (arguments.length === 0) pos = this._pos;
	return this._states[pos];
}

Clock.prototype.setState = function(pos, value) {
	if (arguments.length === 0) {
		pos = this._pos;
		value = 0;
	}
	else if (arguments.length === 1) {
		value = 0;
	}

	this._states[pos] = value;
}

Clock.prototype.getStates = function() {
	return this._states;
}

Clock.prototype.getInstanceId = function() {
	return this._instanceid;
}

Clock.prototype.getInterval = function() {
	// ms per clock tick
	var msPerBeat = ( 1000.0 / (this._bpm / 60.0) );
	var beatDiv = ( this._stepsPerBar / 4 ); // 1/4 note yields 1, 16th note yields 4, etc
	return (msPerBeat / beatDiv);
}

// Methods
Clock.prototype.sendMessage = function(name, value, toClient, toPeers) {
	toClient = arguments.length < 3 ? true : toClient;
	toPeers = arguments.length < 4 ? true : toPeers;

	if (toClient == true) {
		this._socket.emit(name, value);
	}

	if (toPeers == true) {
		this._socket.broadcast.emit(name, value);
	}
}

Clock.prototype.sendResponse = function(method, value) {
	this.sendMessage(method + "_response", value);
}

Clock.prototype.start = function() {
	if (!this._instanceid) {
		var _self = this;
		var max_ticks = (this._bars * this._stepsPerBar);
		this._log("Clock.start: max_ticks = " + max_ticks)
		
		this._instanceid = setInterval(function() {
			// timer func
			_self.sendMessage("clock", _self._pos);
			
			if (++(_self._pos) >= max_ticks) {
				_self._pos = 0;
			}
		}, 
		this.getInterval());
	}
	
	return this._instanceid;
}

Clock.prototype.stop = function() {
	if (this._instanceid) {
		clearInterval(this._instanceid);
		this._instanceid = null;
	}
}

Clock.prototype.reset = function() {
	this.setPosition(0);
}

Clock.prototype.clear = function() {
	for (var i = 0; i < this._states.length; i++) {
		this._states[i] = 0;
	}
}


exports.Clock = Clock;