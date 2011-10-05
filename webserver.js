function log(message){}

function WebServer(port, express, fs, log_function) {
	this._express = express;
	this._fs = fs;
	this._port = port;
	this._app = this._express.createServer();
	this._log_function = log_function;
	log = function(message,data) { log_function("WebServer", message,data) }

	log("new WebServer created");

	// begin listening
	log("begin listening on port " + this._port);
	this._app.listen(this._port);
	
	// define all routes:
	var _self = this;
	
	this._app.get('/', function(request, response) {
		log("received request for route '/'", request.params);
		_self.serveFile(request, response, __dirname + '/views/test.html', 'text/html');
	});

	this._app.get('/*.html', function(request, response) {
		log("received request for route '/*': ", request.params)
		_self.serveFile(request, response, __dirname + '/views/' + request.params[0] + ".html", 'text/html');
	});

	this._app.get("/js/*", function(request, response) {
		log("received request for route '/js/*' : ", request.params)
		var contentType = request.params[0].toLowerCase().indexOf('.swf') > 0 ? 'application/x-shockwave-flash' : 'application/javascript';
		_self.serveFile(request, response, __dirname + '/views/js/' + request.params[0], 'text/javascript');
	});
}

// Properties
WebServer.prototype.getApplication = function() {
	return this._app;
}

WebServer.prototype.getPort = function() {
	return this._port;
}

// Methods
WebServer.prototype.serveFile = function(request, response, filePath, contentType) {
	log("serving file '" + filePath + "' (content-type = '" + contentType + "')");
	
	this._fs.readFile(filePath, function(error, content) {
        if (error) {
            response.writeHead(500);
			response.write('internal server error');
// TODO : remove when going to production (can we detect where we are running?)
			response.write('<!-- ' + error + ' -->')
// ---------
	    	response.end();
	    }
	    else {
	        response.writeHead(200, { 'Content-Type': contentType });
	    	response.end(content, 'utf-8');
		}
	});
}

exports.WebServer = WebServer;