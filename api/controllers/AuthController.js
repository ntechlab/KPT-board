/**
 * AuthController
 *
 * @description :: Server-side logic for managing Auths
 * @help :: See http://links.sailsjs.org/docs/controllers
 */

var passport = require("passport");

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
		sails.log.debug("action: AuthController.login");
		openLoginPage(req, res, null);
	},

	process : function(req, res) {
		sails.log.debug("action: AuthController.process");
		var datetime = Utility.getDateTime();
		passport.authenticate('local', function(err, user, info) {
			if ((err) || (!user)) {
				sails.log.debug("*** " + datetime + " *** login NG[" + err + "]");
				openLoginPage(req, res, {type: "warn", contents: "ログインに失敗しました。"});
				return;
			}
			// 無効ユーザーのアカウントが利用された場合には、ログイン画面に再度遷移する。
			if(user[0]["flag1"] !== 0){
				sails.log.info("*** " + datetime + " *** login NG: invalid user account[" + JSON.stringify(user[0]) + "]");
				openLoginPage(req, res, {type: "warn", contents: "ログインに失敗しました。"});
				return;
			}
			req.logIn(user, function(err) {
				
				// エラーが発生した場合には、ログイン画面に再度遷移する。
				if (err) {
					sails.log.info("*** " + datetime + " *** login ERR[" + JSON.stringify(user[0]) + "]");
					openLoginPage(req, res, {type: "danger", contents: "ログインに失敗しました。"});
					return;
				}
				sails.log.info("*** " + datetime + " *** login OK[" + JSON.stringify(user[0]) + "]");
				req.session.passport["name"] = user[0]["nickname"];
				req.session.passport["role"] = user[0]["role"];
				req.session.passport["modelId"] = user[0]["id"];
				return res.redirect('/dashboard');
			});
		})(req, res);
	},

	logout : function(req, res) {
		var datetime = Utility.getDateTime();
		sails.log.debug("action: AuthController.logout");
		req.logout();
		if (req.session && req.session.passport) {
			sails.log.info("*** " + datetime + " *** logout[" + JSON.stringify(req.session.passport) + "]");
			req.session.passport["name"] = "";
			req.session.passport["role"] = "";
			req.session.passport["modelId"] = "";
		}
		openLoginPage(req, res, {type: "success", contents: "ログアウトしました。"});
	},
	_config : {}
};
