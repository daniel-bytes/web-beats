var TransportStates = {
	stopped: 0,
	paused: 1,
	running: 2
};

function log(str) {
	console.log(str);
}

function log_if(str, cond) {
	if (cond) {
		log(str);
	}
}

function log_obj(obj) {
	if (obj == null) return "null";
	else if (typeof obj === "undefined") return "undefined";
	else if (typeof obj !== "object") return obj;
	
	var arr = [];
	for (var prop in obj) {
		arr.push(prop + ": " + obj[prop]);
	}
	console.log(arr.join(", "));
}

if (!console || !console.log) { 
	log = function(str) {} 
	log_if = function(str, cond) {}
	log_obj = function(obj) {}
}

function get_parent_of_type(obj, tagName) {
	var obj = obj.parentElement;
	while(obj != null) {
		if (obj.nodeName.toUpperCase() == tagName.toUpperCase()) return obj;
		obj = obj.parentElement;
	}
	
	return null;
}