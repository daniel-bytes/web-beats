/*
 * server.js : main Node WebSocket server for the MidiBearCollab messaging/chat/realtime features
 */

// globals / imports
var port = process.env.PORT || 8080
, application_server = null
, messaging_server = null
, express = require("express")
, fs = require("fs")
, socket_io = require('socket.io')
, webserver = require("./webserver")
, websocket = require("./websocket")
, seq = require("./seq");

// functions
var LOG_DISABLE = ["WebServer"];
function log(source, message, data) {
	if (LOG_DISABLE.indexOf(source) > -1) return;
	var str = "** " + source;
	
	if (arguments.length > 1) {
		 str += ": " + message
		
		if (arguments.length > 2 && !!data) {
			str += "\n   => data = ";

			if (typeof data === "function") {
				var func = data.toString();
				var idx = func.indexOf("{");
				str += func.substr(0, idx - 1) + "...";
			}
			else if (typeof data === "object") {
				// unroll object 1 level deep only
				str += ""
				var count = 0;
				for (var prop in data) {
					if (count++ === 0) str += "{ ";
					else str += ", ";
					str += prop + ": " + data[prop];
				}
			
				if (count > 0) str += " }";
			}
			else {
				str += data;
			}
		}
	}
	
	console.log(str);
}

// create servers, run application
application_server = new webserver.WebServer(port, express, fs, log);
messaging_server = new websocket.WebSocket(socket_io, fs, seq, application_server, log);

