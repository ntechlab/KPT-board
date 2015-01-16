module.exports = function(req, res, next) {
    
    if (req.isSocket) {
	if(req.session &&
	   req.session.passport &&
	   req.session.passport.user) {
	    return next();
	}
	res.json(401);
    }
    // HTTP
    else {
	if (req.isAuthenticated()) {
	    return next();
	} else {
	    return res.send(403, {
		message : 'Not Authorized'
	    });
	};
    }
}
