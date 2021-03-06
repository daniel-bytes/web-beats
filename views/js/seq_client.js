// NOTE: Requires socket.io and jquery libraries
function Sequencer(host, sessionId, clientId, bpm, stepsPerBar, bars, canvas, samples) {
	log("Sequencer.ctor - begin")
	if (!host) throw new Error("Missing host");
	if (!sessionId) throw new Error("Missing sessionId");
	if (!clientId) throw new Error("Missing clientId");
	if (!bpm) throw new Error("Missing bpm");
	if (!stepsPerBar) throw new Error("Missing stepsPerBar");
	if (!bars) throw new Error("Missing bars");
	if (!canvas) throw new Error("Missing canvas");
	if (!samples) throw new Error("Missing samples");
	
	this._host = host;
	this._sessionId = sessionId;
	this._clientId = clientId;
	this._bpm = bpm;
	this._stepsPerBar = stepsPerBar;
	this._bars = bars;
	this._socket = io.connect(host);
	this._canvas = canvas;
	this._draw_context = this._canvas.getContext("2d");
	this._states = null;
	this._padding_xy = 2;
	this._padding_hw = 5;
	this._bufferSize = 65536;
	this._sampleRate = 44100;
	this._latency = 1000 * this._bufferSize / this._sampleRate;
	this._audiolet = new Audiolet(this._sampleRate, 2, this._bufferSize);
	this._audio_objects = [];
    this._durations = [1 / (stepsPerBar / 4)];
	this._transport_state = TransportStates.stopped;
	this._position = 0;
	this._sequencer_events = [];
	this._audiolet.scheduler.setTempo(this._bpm);
	
	for (var i = 0; i < samples.length; i++) {
		this._audio_objects.push(
			new SampleChannel(this._audiolet, samples[i]));
			
		this._sequencer_events.push(null);
	}
	
	// setup
	this.initializeState(true);
	
	// event handlers
	var _self = this;
	var _ticks = 0;
	var _double_click_ms = 250;
	var _click_pos = { x_cell: 0, 
					   y_cell: 0,
					   x_pos: 0,
					   y_pos: 0,
					   toggle_count: 0,
					   on: new Date(),
					   active: false };
	
	
	// -- canvas/UI event handlers
	this._canvas.addEventListener('mousedown', function(evt) {
		var temp_pos = _self.getCanvasCellPosition(evt);
		
		if (temp_pos == null) return;
		
		temp_pos.active = true;
		temp_pos.initial_value = _self._states[temp_pos.y_cell][temp_pos.x_cell];
		temp_pos.toggle_count = _click_pos.toggle_count;
		
		if (temp_pos.x_cell === _click_pos.x_cell && temp_pos.y_cell === _click_pos.y_cell ) {
			if ( (temp_pos.on.getTime() - _click_pos.on.getTime()) <= _double_click_ms ) {
				var value = 0;
				
				if (temp_pos.initial_value === 1.0) value = .5;
				else if (temp_pos.initial_value === 0.0) value = 1.0;
				else if (temp_pos.initial_value <= .5) value = 0.0;
				else value = 1.0
				
				_self.set_state(temp_pos.y_cell, temp_pos.x_cell, value);
			}
		}
		
		_click_pos = temp_pos;
	});

	get_parent_of_type(this._canvas, "html").addEventListener("mouseup", function(evt) {
		// NOTE: we are attaching to the outer-most object's mouseup event to ensure we always trap it even if mouse is outside the canvas
		if (_click_pos.active === true) {
			_click_pos.active = false;
			_click_pos.on = new Date();
		}
	});
	
    this._canvas.addEventListener('mousemove', function(evt) {
		if (_click_pos == null || _click_pos.active !== true) return;

		var current_pos = _self.getCanvasCellPosition(evt);
		
		if (current_pos == null || current_pos.y_cell !== _click_pos.y_cell) return;
		
		// TODO: delta should be based on initial click position
		var value = (1.0 - current_pos.y_pos);
		
		if (value !== _click_pos.initial_value) {
			_self.set_state( _click_pos.y_cell, _click_pos.x_cell, value );
			_click_pos.initial_value = value;
		}
	});
	
	
	// -- socket message handlers
	this._socket.on('start_response', function (x) {
		log("Sequencer.socket => start_response callback : transport state = " + _self._transport_state)
		if (_self._transport_state === TransportStates.running) return;
	
		_self.setup_patterns();
		_self.refreshCanvas();
		_self._transport_state = TransportStates.running;
	});

	this._socket.on('stop_response', function (x) {
		log("Sequencer.socket => stop_response callback : transport state = " + _self._transport_state)
		if (_self._transport_state !== TransportStates.running) return;
		
		_self.teardown_patterns();
		_self.refreshCanvas();
		_self._transport_state = TransportStates.stopped;
  	});

	this._socket.on('client_init_response', function (x) {
		log("Sequencer.socket => init_response callback")
		
		_self.init_states_from_server(x.states);
		_self.refreshCanvas();
		
		if (x.transport_state === TransportStates.running) _self.start();
  	});

	this._socket.on('state_change_response', function(x) {
		log("Sequencer.socket => state_change_response callback : " + x.seq_track + " / " + x.seq_pos + " / " + x.seq_val)
		_self._states[x.seq_track][x.seq_pos] = x.seq_val;
		_self.refreshCanvas();
	});
	
	this._socket.on('clear_response', function(x) {
		log("Sequencer.socket => clear_response callback")
		_self.clear_states();
		_self.refreshCanvas();
	});
	
	this._socket.on('query_states_response', function(x) {
		log("Sequencer.socket => query_states_response callback")
		_self.init_states_from_server(x.states);
		_self.refreshCanvas();
	});	
	
	this._socket.on('connect', function (x) {
		log("Sequencer.socket => connect");
		_self.init();
	});

	log("Sequencer.ctor - end")
}

// properties
Sequencer.prototype.getSessionId = function() {
	return this._sessionId;
}

Sequencer.prototype.getClientId = function() {
	return this._clientId;
}

Sequencer.prototype.getCanvas = function() {
	return this._canvas;
}

Sequencer.prototype.getSocket = function() {
	return this._socket;
}

Sequencer.prototype.getBpm = function() {
	return this._bpm;
}

Sequencer.prototype.setBpm = function(bpm) {
	this._bpm = bpm;
	this._audiolet.scheduler.setTempo(this._bpm);
}

Sequencer.prototype.getStepsPerBar = function() {
	return this._stepsPerBar;
}

Sequencer.prototype.getBars = function() {
	return this._bars;
}

Sequencer.prototype.getPosition = function() {
	return this._position;
}

Sequencer.prototype.getNumColumns = function() {
	// all bars on same row
	return ( this._stepsPerBar * this._bars );
}

Sequencer.prototype.getNumRows = function() {
	// all bars on same row
	return this._audio_objects.length;
}

Sequencer.prototype.getNumCells = function() {
	return this.getNumColumns() * this.getNumRows();
}

// remote methods
Sequencer.prototype.start = function() {
	this.send_message("start", { sessionId: this._sessionId, clientId: this._clientId });
}

Sequencer.prototype.stop = function() {
	this.send_message("stop", { sessionId: this._sessionId, clientId: this._clientId });
}

Sequencer.prototype.clear = function() {
	this.send_message("clear", { sessionId: this._sessionId, clientId: this._clientId });
}

Sequencer.prototype.set_state = function(track, pos, state) {
	this.send_message("set_state", { sessionId: this._sessionId, clientId: this._clientId, track: track, pos: pos, state: state });
}

Sequencer.prototype.set_states = function(track, states) {
	for (var i = 0; i < states.length; i++) {
		this.send_message("set_state", { sessionId: this._sessionId, clientId: this._clientId, track: track, pos: i, state: states[i] });
	}
}

Sequencer.prototype.query_states = function() {
	this.send_message("query_states", { sessionId: this._sessionId, clientId: this._clientId });
}

Sequencer.prototype.init = function() {
	var data = { 
		sessionId: this._sessionId, 
	 	clientId: this._clientId,
	 	bpm: this.getBpm(), 
	 	stepsPerBar: this.getStepsPerBar(), 
	 	bars: this.getBars(),
	 	tracks: this._audio_objects.length };
	
	this.send_message("client_init", data);
}

// local methods
Sequencer.prototype.init_states_from_server = function(server_states) {
	this._states = [];

	for (var i = 0; i < server_states.length; i++) {
		var arr = [];
		for (var j = 0; j < server_states[i].length; j++) {
			arr.push(server_states[i][j])
		}
		this._states.push(arr);
	}
}

Sequencer.prototype.clear_states = function() {
	for (var i = 0; i < this._states.length; i++) {
		for (var j = 0; j < this._states[i].length; j++) {
			this._states[i][j] = 0;
		}
	}
}

Sequencer.prototype.setup_patterns = function() {
	var _self = this;
	_self._sequencer_events[0] = _self._audiolet.scheduler.play(
		[new PSequence(_self._states[0], Infinity)],
		new PSequence(_self._durations, Infinity),
		function(p) {
			if (p > 0) {
				_self._audio_objects[0].getGain().gain.setValue(p * p);
		    	_self._audio_objects[0].getTrigger().trigger.setValue(1);
			}

			_self.refreshCanvas();
			if (++_self._position >= _self._states[0].length) _self._position = 0;
		}
    );

	_self._sequencer_events[1] = _self._audiolet.scheduler.play(
		[new PSequence(_self._states[1], Infinity)],
		new PSequence(_self._durations, Infinity),
		function(p) {
			if (p > 0) {
				_self._audio_objects[1].getGain().gain.setValue(p * p);
		    	_self._audio_objects[1].getTrigger().trigger.setValue(1);
			}
		}
    );

	_self._sequencer_events[2] = _self._audiolet.scheduler.play(
		[new PSequence(_self._states[2], Infinity)],
		new PSequence(_self._durations, Infinity),
		function(p) {
			if (p > 0) {
				_self._audio_objects[2].getGain().gain.setValue(p * p);
		    	_self._audio_objects[2].getTrigger().trigger.setValue(1);
			}
		}
    );

	_self._sequencer_events[3] = _self._audiolet.scheduler.play(
		[new PSequence(_self._states[3], Infinity)],
		new PSequence(_self._durations, Infinity),
		function(p) {
			if (p > 0) {
				_self._audio_objects[3].getGain().gain.setValue(p * p);
		    	_self._audio_objects[3].getTrigger().trigger.setValue(1);
			}
		}
    );
}

Sequencer.prototype.teardown_patterns = function() {
	for (var i = 0; i < this._sequencer_events.length; i++) {
		this._audiolet.scheduler.stop(this._sequencer_events[i]);
	}
}

Sequencer.prototype.send_message = function(name, data) {
	log("Sequencer.send_message: " + name);

	try {
		this._socket.emit(name, data);
	}
	catch(e) {
		alert("server connecton error on message '" + name + "': " + e);
	}
}

Sequencer.prototype.initializeState = function(reset) {
	log("Sequencer.initializeState");
	var temp_states = (reset || !this._states ? null : this._states);
	var steps = this.getNumColumns();
	
	this._states = []; // reset current state
	
	for (var o = 0; o < this._audio_objects.length; o++) {
		var arr = [];
		for (var i = 0; i < steps; i++) {
//			var value = ( temp_states != null && i < temp_states[o].length ? temp_states[o][i] : 0 );
			var value = 0;
			arr.push(value);
		}
		this._states.push(arr);
	}
}

Sequencer.prototype.refreshCanvas = function() {
	var canv = $(this._canvas);
	var cols = this.getNumColumns();
	var rows = this.getNumRows();
	var pos = this.getPosition();
	var width = parseInt(canv.width() / cols);
	var height = parseInt(canv.height() / rows);
	
	var ctxt = this._draw_context;
	
	ctxt.clearRect(0, 0, canv.width(), canv.height());
	for (var row = 0; row < rows; row++) {
		for (var col = 0; col < cols; col++) {
			
			if ( col === pos ) {
				ctxt.fillStyle = "#e00";
			}
			else {
				ctxt.fillStyle = "#0e0";
			}						

			var value = this._states[row][col];
			var w = parseInt(width - this._padding_hw)
			var h = parseInt(height - this._padding_hw)
			var x = parseInt(col * width) + this._padding_xy
			var y = parseInt(row * height) + this._padding_xy
			
			var mult = (value * .8) + .2;
			var shift = (1.0 - mult) * .5;
			
			var w1 = parseInt(w * mult)
			var h1 = parseInt(h * mult)
			var x1 = parseInt(x + (w * shift))
			var y1 = parseInt(y + (h * shift))
			
			ctxt.fillRect(x1, y1, w1, h1);
			
			ctxt.lineWidth = (col % 4 == 0 ? 1 : .2);
			ctxt.strokeRect(x1, y1, w1, h1)
			
			/*// TEST ONLY : show cell #
			if ((cell % 4) == 0) {
				ctxt.fillText((row * document.cols) + col + 1, x + 2, y + 5)
			}
			*/
		}
	}
}

Sequencer.prototype.getCanvasCellPosition = function(evt) {
	var canv = $(this._canvas);
	var cols = this.getNumColumns();
	var rows = this.getNumRows();

	var offset = canv.offset();
	var pad = (this._padding_xy * 2);
	var x_click = parseInt(evt.pageX - offset.left - pad);
	var y_click = parseInt(evt.pageY - offset.top - pad);
	var width = canv.width();
	var height = canv.height();
	var cell_width = parseInt(width / cols);
	var cell_height = parseInt(height / rows);
	
	if (x_click < 0 || y_click < 0) return null; // is padding click
	
	var x = ( x_click / cell_width )
	var y = ( y_click / cell_height )
	var x_int = parseInt(x)
	var y_int = parseInt(y)

	var x_diff = (x - x_int);
	var y_diff = (y - y_int);
	
	if (x_diff >= .9) return null; // is whitespace click
	if (y_diff >= .9) return null; // ""     ""      ""
	
	return { x_cell: x_int,
			 y_cell: y_int,
			 x_pos: (x_diff / .9),
			 y_pos: (y_diff / .9),
			 on: new Date() 
		   };
}

Sequencer.prototype.triggerAudio = function() {

}
