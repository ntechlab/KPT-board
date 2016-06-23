/**
 * RESTController
 *
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

module.exports = {

	/**
	 * 認証トークン生成.<br>
	 *
	 * POSTで送られたユーザー名、パスワードから認証トークンを生成する。
	 *
	 */
	getToken : function(req, res) {
		logger.trace(req, "getToken start");
		var user = req.param("user");
		var password = req.param("password");

		// user, passwordのいずれかが未設定の場合、エラーを返却。
		if(user == null || password == null){
			return res.json({
				success: false,
				message: "user, passwordが指定されていません"
			});
		}

		// 認証処理に渡すコールバック関数
		var cb = function(result){
			logger.trace(req, "パスワード認証結果:" + JSON.stringify(result));

			// 認証失敗の場合、エラーを返却
			if(!result || !result["success"]){
				return res.json(result);
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
		var cb = function(err, data){
			logger.info(req, "err:"+JSON.stringify(err));
			logger.info(req, "data:"+JSON.stringify(data));
			if(err){
				return res.json({message : "チケット作成失敗"});
			}

			// トークンデータからuserIdを取得する。
			var userId = data.info.userId;

			var boardId = req.param("boardId");
			// TODO: ここにボードの存在チェックを行う。

			// TODO: 同一プロジェクトIDに属しているボードしか操作できない。
			// RESTapi用のデータチェックを行う。

			// 必須チェック

			// ボードID未指定の場合はエラーとする。
			// TODO: ボード名でも指定できるようにするかもしれない。
			if(boardId == null){
				return res.json({
					success: false,
					message: "ボードIDが指定されていません"
				});
			}

			// デフォルト値データ
			var defaultValues = [
					{contents: ""},
					{positionX: 0},
					{positionY: 0},
					{color: "ticket_blue_small"},
					{ticketHeight: 170},
					{ticketWidth: 244}
				];

			// 値が未設定の場合には、デフォルト値を設定する。
			u.each(defaultValues, function(value, key){
				if(req.param(key) == null){
					req.params[key] = value;
				}
			});

			req.params.actionType = "create";
			req.params.userId = userId;

			// TODO: チケット作成処理に失敗した場合にどのように結果を取得するか？
			BoardController.process(req, res);

			// RESTで処理する場合にはここで結果を返す。
			return res.json({
				success: true,
				message: "OK"});
		};
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
				return res.json({message : "ボード作成失敗"});
			}
			req.rest = data.info;

			// 必須チェック
			var title = req.param("title");
			if(title == null || title.trim() === ""){
				return res.json({success: false, message: "タイトルが設定されていません。"});
			}
			var category = req.param("category");
			if(category == null){
				return res.json({success: false, message: "カテゴリが設定されていません。"});
			}

			var defaultValues = {
//					"title": "board1a",// 必須
					"description": "",
//					"projectId": "P00", // ユーザーのプロジェクトIDを自動設定。
//					"category": "cat1",// 必須
					"version": "1.1",
					"width": 3840,
					"height": 2160,
					"bgType": "image",
					"bgColor": "",
					"bgImage": "/images/background/P00/l_101.png",
					"bgRepeatType": "repeat",
					"bgSepV": 1,
					"bgSepH": 1,
					"bgSepLineWidth": 3,
					"bgSepLineColor": "#000000",
					"ticketData": "ticket_blue_small:Keep:true,ticket_pink_small:Problem:true,ticket_yellow_small:Try:true,ticket_white_small:Memo:true",
//					"id": 1,
//					"selectedId": "1"
			};

			// 値が未設定の場合には、デフォルト値を設定する。
			u.each(defaultValues, function(value, key){
				if(req.param(key) == null){
					req.params[key] = value;
				}
			});

			// TODO: チケット作成処理に失敗した場合にどのように結果を取得するか？
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
				return res.json({message : "ボード更新失敗"});
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
