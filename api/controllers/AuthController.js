/**
 * AuthController
 *
 * @description :: Server-side logic for managing Auths
 * @help :: See http://links.sailsjs.org/docs/controllers
 */

var passport = require("passport");
var logger = require('../Log.js').getLogger("AuthController");

function openLoginPage(req, res, message){
	var loginInfo = {
			userId :"",
			userName :"",
			roleName:"",
			roleDesc:""
		};
	if(message){
		loginInfo.message = message;
	}

	res.view("auth/login", {
		loginInfo: loginInfo
	});
}


module.exports = {
	login : function(req, res) {
		logger.trace("login called");
		openLoginPage(req, res, null);
	},

	process : function(req, res) {
		logger.trace("process called");
		var datetime = Utility.getDateTime();
		passport.authenticate('local', function(err, user, info) {
			if ((err) || (!user)) {
				logger.info("*** login NG[" + err + "]");
				openLoginPage(req, res, {type: "warn", contents: "ログインに失敗しました。"});
				return;
			}
			// 無効ユーザーのアカウントが利用された場合には、ログイン画面に再度遷移する。
			if(user[0]["flag1"] !== 0){
				logger.info("*** login NG: invalid user account[" + JSON.stringify(user[0]) + "]");
				openLoginPage(req, res, {type: "warn", contents: "ログインに失敗しました。"});
				return;
			}
			req.logIn(user, function(err) {

				// エラーが発生した場合には、ログイン画面に再度遷移する。
				if (err) {
					logger.info("*** login ERR[" + JSON.stringify(user[0]) + "]");
					openLoginPage(req, res, {type: "danger", contents: "ログインに失敗しました。"});
					return;
				}
				logger.info("*** login OK[" + JSON.stringify(user[0]) + "]");
				req.session.passport["userId"] = user[0]["username"];
				req.session.passport["name"] = user[0]["nickname"];
				req.session.passport["role"] = user[0]["role"];
				req.session.passport["modelId"] = user[0]["id"];
				return res.redirect('/dashboard');
			});
		})(req, res);
	},

	logout : function(req, res) {
		var datetime = Utility.getDateTime();
		logger.trace("logout called");
		req.logout();
		if (req.session && req.session.passport) {
			logger.info("*** logout[" + JSON.stringify(req.session.passport) + "]");
			req.session.passport["userId"] = "";
			req.session.passport["name"] = "";
			req.session.passport["role"] = "";
			req.session.passport["modelId"] = "";
		}
		openLoginPage(req, res, {type: "success", contents: "ログアウトしました。"});
	},
	_config : {}
};
