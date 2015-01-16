
module.exports = function(req, res, next) {
	sails.log.verbose("loginAuth: auth status["+req.isAuthenticated() + "]");
	if (req.isAuthenticated()) {
		return next();
	} else {
		return res.redirect("/login");
	}
};
