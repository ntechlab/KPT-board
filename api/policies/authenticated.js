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
		var loginInfo = Utility.getLoginInfo(req, res);
		var message = {type: "danger", contents: "ログインが必要です。"};
		loginInfo.message = message;
		res.view("auth/login", {
			loginInfo: loginInfo
		});
	};
    }
}
