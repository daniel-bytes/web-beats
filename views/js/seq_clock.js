function SequencerClock(bpm, stepsPerBar, bars, clockCallback, propertyChangedCallback, stateChangedCallback) {
	this._bpm = bpm;
	this._stepsPerBar = stepsPerBar;
	this._bars = bars;
	this._interval = 0;
	this._position = 0;
	this._maxPosition;
	this._id = null;
	this._clockCallback = clockCallback;
	this._propertyChangedCallback = propertyChangedCallback;
	this._stateChangedCallback = stateChangedCallback;
	this._transport_state = TransportStates.stopped;
	
	// setup
	this._calculateInterval();
}

// Properties
SequencerClock.prototype.getBpm = function() {
	return this._bpm;
}

SequencerClock.prototype.setBpm = function(bpm) {
	log("SequencerClock.setBpm: " + bpm);
	this._bpm = value;
	this._calculateInterval();
	if (this._propertyChangedCallback) this._propertyChangedCallback(this, "bpm");
}

SequencerClock.prototype.getStepsPerBar = function() {
	return this._stepsPerBar;
}

SequencerClock.prototype.setStepsPerBar = function(stepsPerBar) {
	log("SequencerClock.setStepsPerBar: " + stepsPerBar);
	this._stepsPerBar = stepsPerBar;
	this._calculateInterval();
	if (this._propertyChangedCallback) this._propertyChangedCallback(this, "stepsPerBar");
}

SequencerClock.prototype.getBars = function() {
	return this._bars;
}

SequencerClock.prototype.setBars = function(bars) {
	log("SequencerClock.setBars: " + bars);
	this._bars = bars;
	this._calculateInterval();
	if (this._propertyChangedCallback) this._propertyChangedCallback(this, "bars");
}

SequencerClock.prototype.getPosition = function() {
	return this._position;
}

SequencerClock.prototype.setPosition = function(position) {
	log("SequencerClock.setPosition: " + position);
	this._position = position;
	if (this._position >= this._maxPosition) this._position = 0;
	if (this._propertyChangedCallback) this._propertyChangedCallback(this, "position");
}

SequencerClock.prototype.getClockCallback = function() {
	return this._clockCallback;
}

SequencerClock.prototype.setClockCallback = function(callback) {
	log("SequencerClock.setClockCallback: " + callback);
	if (callback == null || typeof callback === "function") this._clockCallback = callback;
}

SequencerClock.prototype.getPropertyChangedCallback = function() {
	return this._propertyChangedCallback;
}

SequencerClock.prototype.setPropertyChangedCallback = function(callback) {
	log("SequencerClock.setPropertyChangedCallback: " + callback);
	if (callback == null || typeof callback === "function") this._propertyChangedCallback = callback;
}

SequencerClock.prototype.getStateChangedCallback = function() {
	return this._stateChangedCallback;
}

SequencerClock.prototype.setStateChangedCallback = function(callback) {
	log("SequencerClock.setStateChangedCallback: " + callback);
	if (callback == null || typeof callback === "function") this._stateChangedCallback = callback;
}

SequencerClock.prototype.getTotalSteps = function() {
	return this._maxPosition;
}

SequencerClock.prototype.getTransportState = function() {
	return this._transport_state;
}

// Methods
SequencerClock.prototype.start = function() {
	log("SequencerClock.start");
	
	if (this._start()) {
		this._changeTransportState(TransportStates.running);
	}
}

SequencerClock.prototype.restart = function() {
	log("SequencerClock.restart");
	
	if (this._pause()) {
		this._position = 0;
		
		if (this._start()) {
			this._changeTransportState(TransportStates.running);
		}
	}
}

SequencerClock.prototype.pause = function() {
	log("SequencerClock.pause");
	
	if (this._pause()) {
		this._changeTransportState(TransportStates.paused);
	}
}

SequencerClock.prototype.stop = function() {
	log("SequencerClock.stop");
	
	if (this._pause()) {
		this._position = 0;
	
		this._changeTransportState(TransportStates.stopped);
	}
}

// private functions
SequencerClock.prototype._start = function() {
	log("SequencerClock._start - _id = " + this._id);
	if (this._id != null) return false;
	
	var self = this;
	this._id = setInterval(
		function() {
			if (self._clockCallback) self._clockCallback(self);
			if (++self._position >= self._maxPosition) self._position = 0;
		},
		this._interval);
		
	return true;
}

SequencerClock.prototype._pause = function() {
	log("SequencerClock._pause - _id = " + this._id);
	if (this._id == null) return false;

	clearInterval(this._id);
	this._id = null;
	
	return true;
}

SequencerClock.prototype._changeTransportState = function(state) {
	if (this._transport_state !== state) {
		this._transport_state = state;
		if (this._stateChangedCallback) this._stateChangedCallback(this);
	}
}

SequencerClock.prototype._calculateInterval = function() {
	// ms per clock tick
	var msPerBeat = ( 1000.0 / (this._bpm / 60.0) );
	var beatDiv = ( this._stepsPerBar / 4 ); // 1/4 note yields 1, 16th note yields 4, etc
	this._interval = (msPerBeat / beatDiv);
	this._maxPosition = (this._stepsPerBar * this._bars);
	
	if (this._pos >= this._maxPosition) this._position = 0;
}