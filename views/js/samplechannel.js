function SampleChannel(audiolet, path) {
	this._audiolet = audiolet;
	this._path = path;
	this._buffer = new AudioletBuffer(1, 0);
	
	this._buffer.load(this._path, false);
	
	this._player = new BufferPlayer(this._audiolet, this._buffer, 1, 0, 0);
	this._trigger = new TriggerControl(this._audiolet);
	this._gain = new Gain(this._audiolet, 1.00);

	this._trigger.connect(this._player, 0, 1);
	this._player.connect(this._gain);
	this._gain.connect(this._audiolet.output);
}

SampleChannel.prototype.getAudiolet = function() {
	return this._audiolet;
}

SampleChannel.prototype.getPath = function() {
	return this._path;
}

SampleChannel.prototype.getBuffer = function() {
	return this._buffer;
}

SampleChannel.prototype.getPlayer = function() {
	return this._player;
}

SampleChannel.prototype.getTrigger = function() {
	return this._trigger;
}

SampleChannel.prototype.getGain = function() {
	return this._gain;
}
