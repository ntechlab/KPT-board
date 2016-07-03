/**
 * RESTController
 *
 * @module RESTController RESTコントローラー
 * @description :: Server-side logic for managing Auths
 * @help :: See http://links.sailsjs.org/docs/controllers
 */

var logger = require('../Log.js').getLoggerWrapper("RESTController");

var jwt = require('jsonwebtoken');
var passport = require('passport');
var crypto = require('crypto');
var u = require('underscore');
var us = require('underscore.string');
var BoardController = require('./BoardController');

var tokenSecret = "secretissecet"; // TODO: どのように持つか？

/**
 * REST認証処理.<br>
 *
 * ユーザーID, パスワード認証を行う。
 *
 * @param username ユーザーID
 * @param password パスワード
 * @param cb コールバック処理
 */
function authenticate(username, password, cb){

	// ユーザー名でユーザオブジェクトを検索し、パスワードが一致するか確認する。
	User.findByUsername(username).exec(function(err, user) {
		var result = {};
		if (err) {
		    result.success = false;
		    result.message = "認証時にエラーが発生しました[" + err + "]";
			cb(result);
			return;
		}
		if (!user || user.length < 1) {
		    result.success = false;
		    result.message = "ユーザー["+username+"]は存在しません";
			cb(result);
			return;
		}
		var shasum = crypto.createHash('sha1');
		shasum.update(password);
		var hashed = shasum.digest('hex');
		if (hashed === user[0].password) {
			sails.log.debug("user[0]="+JSON.stringify(user[0]));
			// ユーザーが無効の場合、エラーを返す。
			if(user[0].flag1 !== 0){
				result.success = false;
				result.message = "ユーザー["+username+"]は無効です。";
			} else {
				result.success = true;
				result.projectId = user[0].projectId;
				result.userId = user[0].id;
				result.message = "認証成功["+username+"]";
			}
		} else {
			result.success = false;
			result.message = "パスワードが正しくありません["+username+"]";
		}
		cb(result);
	});
}

/**
 * 認証トークンの妥当性検証.<br>
 *
 * 認証トークンをデコードし、妥当性を検証する。
 * エラーが発生した場合には、第１引数にエラー内容を設定してコールバック関数を実行。
 * 妥当である場合には、第２引数にデコード結果を設定してコールバック関数を実行。
 *
 * @param req リクエスト
 * @param cb コールバック関数
 */
function authenticateToken(req, cb){
	var token = req.param("token");
	if(token){
		// TODO: 暫定的に有効期限をチェックしないようにしている。
		jwt.verify(token, tokenSecret, {ignoreExpiration: true}, function(err, decoded){
			if(err){
				cb({message: "認証に失敗しました"}, null);
				return;
			}
			// 認証に成功した場合には、ユーザーの情報を取得する。
			var username = decoded["user"];
			User.findByUsername(username).exec(function(err, user) {
				if(err || user == null || user.length < 1){
					cb({message: "ユーザー情報の取得に失敗しました"}, null);
					return;
				}
				var userInfo = user[0];

				var info = {
					id: "",
					userId: userInfo.id,
					userName: userInfo.nickname,
					roleName: userInfo.role,
					roleDesc : "",
					projectId: userInfo.projectId,
					mode: "rest"
				};
				decoded["info"] = info;
				cb(null, decoded);
				return;
			});
		});
	} else {
		cb({message: "トークンが不正です"}, null);
	}
}

function getTicketProcessCallback(req, res, actionType){
	return function(err, data){
		logger.info(req, "err:"+JSON.stringify(err));
		logger.info(req, "data:"+JSON.stringify(data));
		if(err){
			return res.json({message : "チケット処理失敗"});
		}

		// アクションタイプを設定する
		req.params.actionType = actionType;

		// トークンデータからuserIdを取得する。
		req.params.userId = data.info.userId;

		// トークデータから取得したユーザー情報をリクエストに追加
		req.rest = data.info;

		// チケット関連処理
		BoardController.process(req, res);
	};
}

module.exports = {

	/**
	 * 認証トークン生成.<br>
	 *
	 * POSTで送られたユーザー名、パスワードから認証トークンを生成する。
	 *
	 */
	getToken : function(req, res) {
		logger.trace(req, "getToken start");
		var projectId = req.param("projectId");
		var user = req.param("user");
		var password = req.param("password");

		// projectId, user, passwordのいずれかが未設定の場合、エラーを返却。
		if(projectId == null || user == null || password == null){
			return res.json({
				success: false,
				message: "projectId, user, passwordが指定されていません"
			});
		}

		// 認証処理に渡すコールバック関数
		var cb = function(result){
			logger.trace(req, "パスワード認証結果:" + JSON.stringify(result));

			// 認証失敗の場合、エラーを返却
			if(!result || !result["success"]){
				return res.json(result);
			}

			// プロジェクトＩＤが一致しない場合には、エラーとする。
			if(result["projectId"] !== projectId){
				return res.json({
					success: false,
					message: "認証に失敗しました。"
				})
			}

			// 認証トーク作成
			var token = jwt.sign(
					{
						user: user,
						userId: result["userId"]
					},
					tokenSecret, {
						expiresIn: '180m' // TODO: 暫定的な設定値
					});
			logger.trace(req, "getToken end:"+ JSON.stringify(token));
			res.json({
				success: true,
				message: "OK",
				token: token});
		};
		logger.trace(req, "ユーザーID:[" + user + "]");
		authenticate(user, password, cb);
	},

	/**
	 * チケット作成API.
	 */
	createTicket : function(req, res) {
		logger.info(req, "createTicket called");
		var cb = getTicketProcessCallback(req, res, "create");
		authenticateToken(req, cb);
	},

	/**
	 * チケット削除API.
	 */
	deleteTicket : function(req, res) {
		logger.info(req, "deleteTicket called");
		var cb = getTicketProcessCallback(req, res, "destroy");
		authenticateToken(req, cb);
	},

	/**
	 * チケット更新API.
	 */
	updateTicket : function(req, res) {
		logger.info(req, "updateTicket called");
		var cb = getTicketProcessCallback(req, res, "update");
		authenticateToken(req, cb);
	},

	/**
	 * チケット移動API.
	 */
	moveTicket : function(req, res) {
		logger.info(req, "moveTicket called");
		var cb = getTicketProcessCallback(req, res, "move");
		authenticateToken(req, cb);
	},

	/**
	 * ボード作成API.
	 */
	createBoard : function(req, res) {
		logger.info(req, "createBoard called");
		var cb = function(err, data){
			logger.info(req, "err:"+JSON.stringify(err));
			logger.info(req, "data:"+JSON.stringify(data));
			if(err){
				return res.json({
					success: false,
					message : "ボード作成失敗"
				});
			}
			req.rest = data.info;
			BoardController.createBoard(req, res);
		};
		authenticateToken(req, cb);
	},

	/**
	 * ボード更新API.
	 */
	updateBoard : function(req, res) {
		logger.info(req, "updateBoard called");
		var cb = function(err, data){
			logger.info(req, "err:"+JSON.stringify(err));
			logger.info(req, "data:"+JSON.stringify(data));
			if(err){
				return res.json({
					success: false,
					message : "ボード更新失敗"
				});
			}
			req.rest = data.info;

			BoardController.updateBoard(req, res);
		};
		authenticateToken(req, cb);
	},

	getTicket : function(req, res) {
		logger.info(req, "★★チケット取得 開始");
		// 未実装
		logger.info(req, "★★チケット取 終了");
		res.json({hello:435});
	}

};
