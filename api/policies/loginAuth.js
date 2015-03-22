var logger = require('../Log.js').getLogger("loginAuth");

module.exports = function(req, res, next) {
	logger.trace("loginAuth: auth status["+req.isAuthenticated() + "]");
	if (req.isAuthenticated()) {
		return next();
	} else {
		return res.redirect("/login");
	}
};
