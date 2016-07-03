var log4js = require('log4js');
var loggers = {};
var initDone = false;

// log4jsのデフォルト
var DEFAULT_LOG4JS_CONF = 'log4js_setting.json';

function init(){
	var logConfig = sails.config["log_config"];
	var conf = DEFAULT_LOG4JS_CONF;
	if(logConfig != null){
		conf = logConfig;
	}
	log4js.configure(conf);
	initDone = true;
}

function MyLogger(logger0){
	var logger = logger0;
	function getUserName(req){
//		var id = "";
		var userId = "";
		if(req != null && req.session != null && req.session.passport != null){
//		    id = req.session.passport.user || "";
		    userId = req.session.passport.userId || "";
		}
//		return userId+"("+id+")";
		return "[" + userId + "] ";
	};

	this.trace = function(req, message){
		logger.trace(getUserName(req) + message);
	};
	this.debug = function(req, message){
		logger.debug(getUserName(req) + message);
	};
	this.error = function(req, message){
		logger.error(getUserName(req) + message);
	};
	this.warn = function(req, message){
		logger.warn(getUserName(req) + message);
	};
	this.info = function(req, message){
		logger.info(getUserName(req) + message);
	};
}

module.exports = {

	getLogger: function(name){
		if(!initDone){
			init();
		}
		var logger = loggers[name];
		if(!logger){
			logger = log4js.getLogger(name);
			loggers[name] = logger;
		}
		return logger;
	},
	getLoggerWrapper: function(name){
		if(!initDone){
			init();
		}
		var logger = loggers[name];
		if(!logger){
			logger = new MyLogger(log4js.getLogger(name));
			loggers[name] = logger;
		}
		return logger;
	}
}