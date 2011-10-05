function log(message){}

function WebSocket(socket_io, fs, seq, application_server, log_function) {
	this._socket_io = socket_io;
	this._fs = fs;
	this._seq = seq;
	this._application_server = application_server;
	this._sequencers = {};
	this._log_function = log_function;
	log = function(message,data) { log_function("WebSocket", message,data); }

	log("new WebSocket created");

	// begin listening
	
	log("messaging server begin listening on port " + this._application_server.getPort());
	this._io = this._socket_io.listen(this._application_server.getApplication());
	
	var _self = this;
	
	this._io.configure(function () { 
	  _self._io.set("transports", ["xhr-polling"]); 
	  _self._io.set("polling duration", 10); 
	});
	
	// define all messages
	this._io.sockets.on('disconnect', function(socket) {
		log("'disconnect' message received");
	});
	
	this._io.sockets.on('connection', function (socket) {
		log("'connection' message received");
		var bpm = 120;
		var bars = 4;
		var stepsPerBar = 16;

		// Handle messages from client here
		socket.on('client_init', function(value) {
			log("'client_init' message received", value);
			var sq = _self.createSeq(value.sessionId, value.clientId, socket, value.bpm, value.stepsPerBar, value.bars, value.tracks);
			log("'client_init' - sendr response...");
			sq.sendResponse("client_init", { pos: sq.getPosition(), states: sq.getStates(), transport_state: sq.getTransportState() });
		})

		socket.on('start', function(value) {
			log("'start' message received", value);
			var sq = _self.getSeq(value.sessionId, value.clientId);

			if (sq) {
				sq.start();
				sq.sendResponse("start", sq.getPosition());	
			}
		});

		socket.on('stop', function(value) {
			log("'pause' message received", value);
			var sq = _self.getSeq(value.sessionId, value.clientId);

			if (sq) {
				sq.stop();
				sq.sendResponse("stop", sq.getPosition());
			}
		});

		socket.on('clear', function(value) {
			log("'clear' message received", value);

			var sq = _self.getSeq(value.sessionId, value.clientId);

			if (sq) {
				sq.clear();
				sq.sendResponse("clear", 0);
			}
		});

		socket.on('set_state', function(value) {
			log("'set_state' message received", value);
			var sq = _self.getSeq(value.sessionId, value.clientId);

			if (sq) {
				var actual_values = sq.setState(value.track, value.pos, value.state);
				sq.sendResponse("state_change", { seq_track: actual_values.track, seq_pos: actual_values.pos, seq_val: actual_values.state } );
			}
		});
		
		socket.on('query_states', function(value) {
			log("'query_states' message received", value);
			var sq = _self.getSeq(value.clientId);

			if (sq) {
				sq.sendResponse("query_states", { states: sq.getStates() });
			}
		});

		socket.on('set_tempo', function (value) {
			log("'set_tempo' message received", value);
		});
	});
}

// Methods
WebSocket.prototype.createSeq = function (sessionId, clientId, socket, bpm, stepsPerBar, bars, tracks) {
	var key = sessionId + ":" + clientId;
	
	if (!this._sequencers[key]) {
		log("sequencers['" + key + "'] = new Sequencer(bpm = " + bpm + ", stepsPerBar = " + stepsPerBar + ", bars = " + bars + ", tracks = " + tracks + ")");
		this._sequencers[key] = new this._seq.Sequencer(bpm, stepsPerBar, bars, tracks, socket, this._log_function);
	}
	
	return this._sequencers[key];
}

WebSocket.prototype.getSeq = function(sessionId, clientId) {
	var key = sessionId + ":" + clientId;
	return this._sequencers[key];
}

exports.WebSocket = WebSocket;