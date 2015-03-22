var logger = require('../Log.js').getLoggerWrapper("loginAuth");

module.exports = function(req, res, next) {
	logger.trace(req, "loginAuth: auth status["+req.isAuthenticated() + "]");
	if (req.isAuthenticated()) {
		return next();
	} else {
		return res.redirect("/login");
	}
};
