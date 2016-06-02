/**
 * UserManageController
 *
 * @description :: Server-side logic for managing Usermanages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var crypto = require('crypto');
var u = require('underscore');
var logger = require('../Log.js').getLoggerWrapper("UserManageController");

/**
 * ユーザー管理画面を開く
 */
function openUserManageIndexPage(req, res, message){
	// 管理者はユーザー管理画面を開くことができる。
	// 管理者以外がユーザー管理画面を開こうとした場合には、メッセージを表示して、メイン画面に遷移する。
	var loginInfo = Utility.getLoginInfo(req, res);
	if(message){
		loginInfo.message = message;
	}
	if(loginInfo["roleName"] === "admin"){
		User.find({projectId: loginInfo["projectId"]}).sort('username').exec(function(err, usersFound) {
			if(err || !usersFound){
				logger.error(req, "ユーザー管理画面オープン 失敗: [" + JSON.stringify(err) + "]");
				loginInfo.message = {type: "danger", contents: "システムエラーが発生しました。"};
				usersFound = [];
			}
			var userNames = u.pluck(usersFound, "username");
			logger.debug(req, "ユーザー管理画面オープン 成功: [" + userNames + "]");
	        res.view("usermanage/index", {
	        	users: usersFound,
	        	loginInfo: loginInfo
			});
		});
	} else {
		logger.warn(req, "ユーザー管理画面オープン 失敗: [管理者権限なし]");
		Utility.openMainPage(req, res, {type: "warn", contents:"ユーザー管理画面にアクセスできません。"});
	}
};

module.exports = {

	/**
	 * ユーザー管理画面を開く。
	 */
    index : function(req, res) {
        logger.trace(req, "index called");
		openUserManageIndexPage(req, res, null);
    },

	/**
	 * ユーザー作成画面を開く
	 */
	openCreate : function(req, res) {
		logger.trace(req, "openCreate called");
		var loginInfo = Utility.getLoginInfo(req, res);

		// 管理者のみはユーザー作成画面を開くことができる。
		if(loginInfo["roleName"] !== "admin"){
			logger.warn(req, "ユーザー作成画面オープン 失敗: [管理者権限なし]");
			Utility.openMainPage(req, res, {type: "warn", contents: "ユーザーを作成できません。"});
			return;
		}
		logger.debug(req, "ユーザー作成画面オープン 成功");
		res.view({
			username: "",
			nickname: "",
			password: "",
			password_confirm : "",
			loginInfo: loginInfo,
			valid: "",
			role: ""
		});
	},

	/**
	 * ユーザー作成処理
	 */
    createUser : function(req, res) {
        logger.trace(req, "createUser called");
		var loginInfo = Utility.getLoginInfo(req, res);

		// 管理者のみユーザーを作成できる。
		if(loginInfo["roleName"] !== "admin"){
			logger.warn(req, "ユーザー作成処理 失敗: [管理者権限なし]");
			Utility.openMainPage(req, res, {type: "warn", contents: "ユーザーを作成できません。"});
			return;
		}

		// ユーザー作成処理
		User.create({
		    username: req.param('username'),
		    password: req.param('password'),
		    nickname: req.param('nickname'),
		    role: req.param('role'),
		    projectId: loginInfo["projectId"], // 当該ユーザーを作成した管理者のプロジェクトＩＤを引き継ぐ
		    flag1: req.param('valid')
		}).exec(function(err, obj) {
			if(err){
				// エラー発生時には入力値を保持したまま、ユーザー作成画面を再表示する。
				logger.error(req, "ユーザー作成処理 失敗: [" + JSON.stringify(err) + "]");
				loginInfo.message = {type : "danger", contents : "システムエラーが発生しました。"};
				res.view("usermanage/openCreate", {
					username: req.param('username'),
					nickname: req.param('nickname'),
					password: req.param('password'),
					password_confirm : req.param('password_confirm'),
					loginInfo: loginInfo,
					valid: req.param('valid'),
					role: req.param('role')
				});
				return;
			}
			logger.info(req, "ユーザー作成処理 成功: [" + JSON.stringify(obj) + "]");
			// 正常終了の場合、ユーザー管理画面に遷移する。
			openUserManageIndexPage(req, res, {type: "success", contents: "ユーザーを作成しました。"});
		});
    },

	/**
	 * ユーザー削除処理
	 */
    destroyUser : function(req, res) {
		var target = req.param('target');
		logger.trace(req, "destroyUser called: [" + target+ "]");
		logger.info(req, "ユーザー削除処理: 対象ユーザー[" + target+ "]");
		var loginInfo = Utility.getLoginInfo(req, res);

		// 管理者のみユーザーを削除することができる。
		if(loginInfo["roleName"] !== "admin"){
			logger.warn(req, "ユーザー削除処理 失敗: [管理者権限なし]");
			Utility.openMainPage(req, res, {type: "warn", contents: "ユーザーを削除できません。"});
			return;
		}

		// 指定されたユーザーIDを持つユーザーを削除する。
		// 削除対象ユーザーIDが指定されていない場合には、処理を行わずにユーザー一覧画面に遷移する。
		if(target){
			// 同一プロジェクトＩＤのユーザーでない場合には処理を中断する
			User.findOne(target).exec(function(err, obj) {
				if(err || !obj || obj.length === 0 || loginInfo["projectId"] !== obj["projectId"]){
					// 削除処理に失敗した場合には、ユーザ一覧画面に遷移する。
					logger.error(req, "ユーザー削除処理 失敗(同一プロジェクトＩＤ判定): [" + JSON.stringify(err) + "]");
					openUserManageIndexPage(req, res, {type:"danger", contents:"ユーザー削除処理に失敗しました。"});
					return;
				}
				User.destroy(target).exec(function(err, obj) {
					// 以下、ハッシュ化したパスワードが表示されるため通常コメントアウト。
					// logger.info("ユーザー削除結果[" + JSON.stringify(obj) + "]");

					if(err || !obj || obj.length === 0){
						// 削除処理に失敗した場合には、ユーザ一覧画面に遷移する。
						logger.error(req, "ユーザー削除処理 失敗: [" + JSON.stringify(err) + "]");
						openUserManageIndexPage(req, res, {type:"danger", contents:"ユーザー削除処理に失敗しました。"});
						return;
					}
					logger.info(req, "ユーザー削除処理 成功: [" + JSON.stringify(obj) + "]");
					openUserManageIndexPage(req, res, {type: "success", contents: "ユーザー" + obj[0]["username"] + "(" + obj[0]["nickname"] + ")を削除しました。"});
				});
			});
		} else {
			logger.warn(req, "ユーザー削除処理 失敗: [削除ユーザーIDが未設定]");
			// 通常操作で発生しないため、メッセージを表示せずユーザー管理画面に遷移。。
			res.redirect('/usermanage/index');
		}
    },

	/**
	 * ユーザー更新処理
	 */
	updateUser : function(req, res) {
	    // ユーザー一覧で指定されたID
		var target = req.param('target');
		logger.trace(req, "updateUser called: [" + target + "]");
		logger.info(req, "ユーザー更新処理: 対象ユーザー[" + target+ "]");
		var loginInfo = Utility.getLoginInfo(req, res);

		// ユーザーIDが未設定、もしくは、管理者以外が自分以外のユーザー情報の更新を試みた場合にはエラーとする。
		// (利用するDBによってはIDが数値となるため、いったん文字列に変換してから判定する。)
		if(!target || (loginInfo["roleName"] !== "admin" && String(target) != String(loginInfo["id"]))){
			logger.warn(req, "ユーザー更新処理 失敗: [権限不適合:" + target + "," + JSON.stringify(loginInfo) + "]");
			Utility.openMainPage(req, res, {type: "warn", contents: "更新対象ユーザーIDが不正です"});
			return;
		}

		User.findOne(target).exec(function(err, oldUser) {
			// 以下、ハッシュ化したパスワードが表示されるため通常コメントアウト。
			// logger.info("更新ユーザー検索結果[" + JSON.stringify(oldUser) + "]");

			// エラー発生、更新対象ユーザーが存在しない場合、プロジェクトＩＤが異なる場合、
			// ユーザー管理画面に遷移し、メッセージを表示する。
			// （検索結果が存在しない場合には、targetはundefinedが設定される。）
			if(err || !oldUser || loginInfo["projectId"] != oldUser["projectId"]){
				logger.error(req, "ユーザー更新処理 ユーザー情報取得 失敗: [" + JSON.stringify(err) + "]");
				openUserManageIndexPage(req, res, {type:"danger", contents: "ユーザの更新に失敗しました。"});
				return;
			}

			// 更新対象ユーザーが存在する場合には、更新用データを作成。
		    var newData = {};
		    var newUsername = req.param('username');
		    var newPassword = req.param('password');
		    var newNickname = req.param('nickname');
		    var role = req.param('role');
		    var valid = req.param('valid');

		    // 変更された項目に値を設定する。
		    if(oldUser["username"] !== newUsername){
				newData["username"] = newUsername;
		    }

		    if(newPassword){
				var shasum = crypto.createHash('sha1');
				shasum.update(newPassword);
				var hashed = shasum.digest('hex');
				newData["password"] = hashed;
		    }

		    if(oldUser["nickname"] !== newNickname){
				newData["nickname"] = newNickname;
		    }

		    if(role != null) {
		    	newData["role"] = role;
		    }
		    if(valid != null) {
		    	newData["flag1"] = valid;
		    }
			// 以下、ハッシュ化したパスワードが表示されるため通常コメントアウト。
			// logger.debug("更新ユーザー情報[" + JSON.stringify(newData));
		    User.update({id:target}, newData).exec(function(err, obj) {
				// 以下、ハッシュ化したパスワードが表示されるため通常コメントアウト。
				// logger.debug("ユーザー更新結果[" + JSON.stringify(obj) +"]");
				if(err) {
					logger.error(req, "ユーザー情報更新 更新処理 失敗: [" + JSON.stringify(err) +"]");
					// TODO: エラーメッセージの内容を検討する。
					loginInfo.message = {type: "danger", contents: "システムエラーが発生しました。"+JSON.stringify(err)};
					res.view("usermanage/openCreate", {
						username: req.param('username'),
						nickname: req.param('nickname'),
						password: req.param('password'),
						password_confirm : req.param('password_confirm'),
						loginInfo: loginInfo,
						valid: req.param('valid'),
						role: req.param('role')
					});
					return;
				}
				logger.info(req, "ユーザー情報更新 成功: [" + JSON.stringify(obj) +"]");
				var message = {type:"success", contents: "ユーザー情報を更新しました。"};
				var role = loginInfo["roleName"];
				var next;
				if(role === 'admin') {
					openUserManageIndexPage(req, res, message);
				} else {
					Utility.openMainPage(req, res, message);
				}
		    });
		});
    },

	/**
	 * ユーザー情報更新画面を開く
	 */
    openUpdateUser : function(req, res) {
		var id = req.param("target");
		logger.trace(req, "openUpdateUser called: [" + id + "]");
		var loginInfo = Utility.getLoginInfo(req, res);

		// ユーザーIDが未設定、もしくは、管理者以外が自分以外のユーザー情報の更新を試みた場合にはエラーとする。
		// (利用するDBによってはIDが数値となるため、いったん文字列に変換してから判定する。)
		if(!id || (loginInfo["roleName"] !== "admin" && String(id) !== String(loginInfo["id"]))){
			// 管理者以外は他ユーザーのユーザー情報を更新することができない。
			logger.warn(req, "ユーザー情報画面オープン 失敗: [権限不適合:" + id + "," + JSON.stringify(loginInfo) + "]");
			Utility.openMainPage(req, res, {type: "warn", contents: "更新対象ユーザーIDが不正です"});
			return;
		}

		User.findOne(id).exec(function(err, found){
			// 同一プロジェクトＩＤでない場合にはエラーとする。
			if(err || !found || loginInfo["projectId"] != found["projectId"]) {
				logger.error(req, "ユーザー情報更新画面オープン 失敗: [" + JSON.stringify(err) +"]");
				Utility.openMainPage(req, res, {type: "danger", contents: "ユーザー情報更新画面の表示に失敗"});
				return;
			}
			logger.debug(req, "ユーザー情報更新画面オープン 成功");
			res.view({username: found["username"],
				nickname: found["nickname"],
				target: id,
				loginInfo: loginInfo,
				valid: found["flag1"],
				role: found["role"]
			});
		});
    },
};

