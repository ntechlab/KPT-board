
var log4js = require('log4js');

var loggers = {};

var initDone = false;

function init(){
	log4js.configure('log4js_setting.json');
}

module.exports = {

	getLogger: function(name){
		if(!initDone){
			init();
			initDone = true;
		}
		var logger = loggers[name];
		if(!logger){
			logger = log4js.getLogger(name);
			loggers[name] = logger;
		}
		return logger;
	}

}