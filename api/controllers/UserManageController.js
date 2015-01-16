/**
 * UserManageController
 *
 * @description :: Server-side logic for managing Usermanages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var crypto = require('crypto');

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
		User.find({}).sort('username').exec(function(err, usersFound) {
			if(err || !usersFound){
				sails.log.error("ユーザー管理画面オープン時にエラー発生:" + JSON.stringify(err));
				loginInfo.message = {type: "danger", contents: "システムエラーが発生しました。"};
				usersFound = [];
			}
	        res.view("usermanage/index", {
	        	users: usersFound, 
	        	loginInfo: loginInfo
			});
		});
	} else {
		Utility.openMainPage(req, res, {type: "warn", contents:"ユーザー管理画面にアクセスできません。"});
	}
};

module.exports = {

	/**
	 * ユーザー管理画面を開く。
	 */
    index : function(req, res) {
        sails.log.debug("action: UserManageController.index");
		openUserManageIndexPage(req, res, null);
    },

	/**
	 * ユーザー作成画面を開く
	 */
	openCreate : function(req, res) {
		sails.log.debug("action: UserManageController.openCreate");
		var loginInfo = Utility.getLoginInfo(req, res);
		
		// 管理者のみはユーザー作成画面を開くことができる。
		if(loginInfo["roleName"] !== "admin"){
			Utility.openMainPage(req, res, {type: "warn", contents: "ユーザーを作成できません。"});
			return;
		}
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
        sails.log.debug("action: UserManageController.createUser");
		var loginInfo = Utility.getLoginInfo(req, res);
		
		// 管理者のみユーザーを作成できる。
		if(loginInfo["roleName"] !== "admin"){
			Utility.openMainPage(req, res, {type: "warn", contents: "ユーザーを作成できません。"});
			return;
		}
		
		// ユーザー作成処理
		User.create({
		    username: req.param('username'),
		    password: req.param('password'),
		    nickname: req.param('nickname'),
		    role: req.param('role'),
		    flag1: req.param('valid')
		}).exec(function(err, obj) {
			sails.log.info("ユーザー作成[" + JSON.stringify(obj) + "]");
			if(err){
				// エラー発生時には入力値を保持したまま、ユーザー作成画面を再表示する。
				sails.log.error("エラー発生:" + JSON.stringify(err));
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
			// 正常終了の場合、ユーザー管理画面に遷移する。
			openUserManageIndexPage(req, res, {type: "success", contents: "ユーザーを作成しました。"});
		});
    },

	/**
	 * ユーザー削除処理
	 */
    destroyUser : function(req, res) {
		var target = req.param('target');
		sails.log.debug("action: UserManageController.destroyUser[" + target+ "]");
		var loginInfo = Utility.getLoginInfo(req, res);
		
		// 管理者のみユーザーを削除することができる。
		if(loginInfo["roleName"] !== "admin"){
			Utility.openMainPage(req, res, {type: "warn", contents: "ユーザーを削除できません。"});
			return;
		}
		
		// 指定されたユーザーIDを持つユーザーを削除する。
		// 削除対象ユーザーIDが指定されていない場合には、処理を行わずにユーザー一覧画面に遷移する。
		if(target){
			User.destroy(target).exec(function(err, obj) {
				// 以下、ハッシュ化したパスワードが表示されるため通常コメントアウト。
				// sails.log.info("ユーザー削除結果[" + JSON.stringify(obj) + "]");
				
				if(err || !obj || obj.length === 0){
					// 削除処理に失敗した場合には、ユーザ一覧画面に遷移する。
					sails.log.error("ユーザーの削除処理に失敗[" + JSON.stringify(err) + "]");
					openUserManageIndexPage(req, res, {type:"danger", contents:"ユーザー削除処理に失敗しました。"});
					return;
				}
				openUserManageIndexPage(req, res, {type: "success", contents: "ユーザー" + obj[0]["username"] + "(" + obj[0]["nickname"] + ")を削除しました。"});
			});
		} else {
			sails.log.debug("削除ユーザーIDが未設定のため処理を行わない。");
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
        sails.log.debug("action: UserManageController.updateUser["+target+"]");
		var loginInfo = Utility.getLoginInfo(req, res);
		
		// ユーザーIDが未設定、もしくは、管理者以外が自分以外のユーザー情報の更新を試みた場合にはエラーとする。
		// (利用するDBによってはIDが数値となるため、いったん文字列に変換してから判定する。)
		if(!target || (loginInfo["roleName"] !== "admin" && String(target) != String(loginInfo["id"]))){
			Utility.openMainPage(req, res, {type: "warn", contents: "更新対象ユーザーIDが不正です"});
			return;
		}
		
		User.findOne(target).exec(function(err, oldUser) {
			// 以下、ハッシュ化したパスワードが表示されるため通常コメントアウト。
			// sails.log.info("更新ユーザー検索結果[" + JSON.stringify(oldUser) + "]");
			
			// エラー発生、もしくは、更新対象ユーザーが存在しない場合、ユーザー管理画面に遷移し、メッセージを表示する。
			// （検索結果が存在しない場合には、targetはundefinedが設定される。）
			if(err || !oldUser){
				sails.log.error("ユーザー更新処理に失敗[" + JSON.stringify(err) + "]");
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
			// sails.log.debug("更新ユーザー情報[" + JSON.stringify(newData));
		    User.update({id:target}, newData).exec(function(err, obj) {
				// 以下、ハッシュ化したパスワードが表示されるため通常コメントアウト。
				// sails.log.debug("ユーザー更新結果[" + JSON.stringify(obj) +"]");
				if(err) {
					sails.log.error("ユーザー情報更新時にエラー発生:" + JSON.stringify(err));
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
		sails.log.debug("action: UserManageController.openUpdateUser[" + id + "]");
		var loginInfo = Utility.getLoginInfo(req, res);
		
		// ユーザーIDが未設定、もしくは、管理者以外が自分以外のユーザー情報の更新を試みた場合にはエラーとする。
		// (利用するDBによってはIDが数値となるため、いったん文字列に変換してから判定する。)
		if(!id || (loginInfo["roleName"] !== "admin" && String(id) !== String(loginInfo["id"]))){
			// 管理者以外は他ユーザーのユーザー情報を更新することができない。
			Utility.openMainPage(req, res, {type: "warn", contents: "更新対象ユーザーIDが不正です"});
			return;
		}
		
		User.findOne(id).exec(function(err, found){
			sails.log.debug("ユーザー情報取得結果:" + JSON.stringify(found));
			if(err || !found) {
				sails.log.error("ユーザー情報更新画面オープン失敗:" + JSON.stringify(err));
				Utility.openMainPage(req, res, {type: "danger", contents: "ユーザー情報更新画面の表示に失敗"});
				return;
			}
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

