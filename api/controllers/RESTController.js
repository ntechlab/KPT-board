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
	 *
	 * <b>REST API利用方法</b>
	 * <pre>
	 * URL: http://(IPアドレス):(ポート番号)/api/getToken
	 *
	 * アクション: POST
	 *
	 * 管理者権限要否: 不要
	 *
	 * 入力項目
	 * <table border=1>
	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>必須</td><td>デフォルト値</td><td>備考</td></tr>
	 * <tr><td>user</td><td>アカウント</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>password</td><td>パスワード</td><td>○</td><td></td><td></td></tr>
	 * </table>
	 * 出力項目
	 * <table border=1>
 	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>備考</td></tr>
	 * <tr><td>success</td><td>処理結果。処理に成功した場合はtrue、それ以外の場合はfalse.</td><td></td></tr>
	 * <tr><td>message</td><td>結果メッセージ</td><td></td></tr>
	 * <tr><td>token</td><td>認証トークン</td><td></td></tr>
	 * </table>
	 *
	 * 実行例
	 * curl http://localhost:1337/api/getToken -X POST -d "user=admin1" -d "password=password" -d "projectId=P01"
	 *
	 * 実行結果
	 * {
	 *   "success": true,
	 *   "message": "OK",
	 *   "token": "（認証トークン文字列）"
	 * }
	 * </pre>
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
	 *
 	 *<pre>
	 * URL: http://(IPアドレス):(ポート番号)/api/ticket
	 *
	 * アクション: POST
	 *
	 * 管理者権限要否: 不要
	 *
	 * 入力必須項目
	 * <table border=1>
	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>必須</td><td>デフォルト値</td><td>備考</td></tr>
	 * <tr><td>token</td><td>認証トークン</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>boardId</td><td>ボードID</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>contents</td><td>チケット内容</td><td></td><td>""</td><td></td></tr>
	 * <tr><td>positionX</td><td>Ｘ座標</td><td></td><td>0</td><td></td></tr>
	 * <tr><td>positionY</td><td>Ｙ座標</td><td></td><td>0</td><td></td></tr>
	 * <tr><td>color</td><td>スタイル</td><td></td><td>ticket_blue_small</td><td></td></tr>
	 * <tr><td>ticketHeight</td><td>高さ</td><td></td><td>170</td><td></td></tr>
	 * <tr><td>ticketWidth</td><td>幅</td><td></td><td>244</td><td></td></tr>
	 * </table>
	 * 出力項目
	 * <table border=1>
 	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>備考</td></tr>
	 * <tr><td>success</td><td>処理結果。処理に成功した場合はtrue、それ以外の場合はfalse.</td><td></td></tr>
	 * <tr><td>message</td><td>結果メッセージ</td><td></td></tr>
	 * <tr><td>ticket</td><td>作成したチケット情報</td><td></td></tr>
	 * </table>
	 * 実行例
	 * curl "http://localhost:1337/api/board?token=(認証トークン文字列)&projectId=P01"
	 * </pre>
	 */
	createTicket : function(req, res) {
		logger.info(req, "createTicket called");
		var cb = getTicketProcessCallback(req, res, "create");
		authenticateToken(req, cb);
	},

	/**
	 * チケット削除API.
	 *
 	 *<pre>
	 * URL: http://(IPアドレス):(ポート番号)/api/ticket
	 *
	 * アクション: DELETE
	 *
	 * 管理者権限要否: 不要
	 *
	 * 入力必須項目
	 * <table border=1>
	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>必須</td><td>デフォルト値</td><td>備考</td></tr>
	 * <tr><td>token</td><td>認証トークン</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>id</td><td>チケットID</td><td>○</td><td></td><td></td></tr>
	 * </table>
	 * 出力項目
	 * <table border=1>
 	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>備考</td></tr>
	 * <tr><td>success</td><td>処理結果。処理に成功した場合はtrue、それ以外の場合はfalse.</td><td></td></tr>
	 * <tr><td>message</td><td>結果メッセージ</td><td></td></tr>
	 * </table>
	 * 実行例
	 * curl "http://localhost:1337/api/board?token=(認証トークン文字列)&projectId=P01"
	 * </pre>
	 */
	deleteTicket : function(req, res) {
		logger.info(req, "deleteTicket called");
		var cb = getTicketProcessCallback(req, res, "destroy");
		authenticateToken(req, cb);
	},

	/**
	 * チケット更新API.
	 *
 	 *<pre>
	 * URL: http://(IPアドレス):(ポート番号)/api/ticket
	 *
	 * アクション: PUT
	 *
	 * 管理者権限要否: 不要
	 *
	 * 入力必須項目
	 * <table border=1>
	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>必須</td><td>デフォルト値</td><td>備考</td></tr>
	 * <tr><td>token</td><td>認証トークン</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>id</td><td>更新対象チケットID</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>contents</td><td>チケット内容</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>positionX</td><td>Ｘ座標</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>positionY</td><td>Ｙ座標</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>color</td><td>スタイル</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>ticketHeight</td><td>高さ</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>ticketWidth</td><td>幅</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * </table>
	 * 出力項目
	 * <table border=1>
 	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>備考</td></tr>
	 * <tr><td>success</td><td>処理結果。処理に成功した場合はtrue、それ以外の場合はfalse.</td><td></td></tr>
	 * <tr><td>message</td><td>結果メッセージ</td><td></td></tr>
	 * <tr><td>ticket</td><td>更新したチケット情報</td><td></td></tr>
	 * </table>
	 * 実行例
	 * curl "http://localhost:1337/api/board?token=(認証トークン文字列)&projectId=P01"
	 * </pre>
	 */
	updateTicket : function(req, res) {
		logger.info(req, "updateTicket called");
		var cb = getTicketProcessCallback(req, res, "update");
		authenticateToken(req, cb);
	},

	/**
	 * チケット移動API.
	 *
   	 *<pre>
	 * URL: http://(IPアドレス):(ポート番号)/api/ticketMove
	 *
	 * アクション: PUT
	 *
	 * 管理者権限要否: 要
	 *
	 * 入力必須項目
	 * <table border=1>
	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>必須</td><td>デフォルト値</td><td>備考</td></tr>
	 * <tr><td>token</td><td>認証トークン</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>id</td><td>移動対象チケットID</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>destBoardId</td><td>移動先ボードID</td><td>○</td><td></td><td></td></tr>
	 * </table>
	 * 出力項目
	 * <table border=1>
 	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>備考</td></tr>
	 * <tr><td>success</td><td>処理結果。処理に成功した場合はtrue、それ以外の場合はfalse.</td><td></td></tr>
	 * <tr><td>message</td><td>結果メッセージ</td><td></td></tr>
	 * </table>
	 * 実行例
	 * curl http://localhost:1337/api/ticketMove -X PUT -d "id=1" -d "boardId=8" -d "destBoardId=1" -d "token=(認証トークン文字列)"
	 *
	 * 実行結果
	 * {
	 *   "success": true,
	 *   "message": "チケットを移動しました。"
	 * }
	 *
	 * </pre>
	 */
	moveTicket : function(req, res) {
		logger.info(req, "moveTicket called");
		var cb = getTicketProcessCallback(req, res, "move");
		authenticateToken(req, cb);
	},

	/**
	 * ボード作成API.
	 *
 	 *<pre>
	 * URL: http://(IPアドレス):(ポート番号)/api/board
	 *
	 * アクション: POST
	 *
	 * 管理者権限要否: 要
	 *
	 * 入力必須項目
	 * <table border=1>
	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>必須</td><td>デフォルト値</td><td>備考</td></tr>
	 * <tr><td>token</td><td>認証トークン</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>title</td><td>タイトル</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>description</td><td>説明</td><td></td><td>""</td><td></td></tr>
	 * <tr><td>category</td><td>カテゴリ</td><td></td><td></td><td></td></tr>
	 * <tr><td>width</td><td>ボード幅</td><td></td><td>3840</td><td></td></tr>
	 * <tr><td>height</td><td>ボード高さ</td><td></td><td>2160</td><td></td></tr>
	 * <tr><td>bgType</td><td>背景タイプ</td><td></td><td>image</td><td></td></tr>
	 * <tr><td>bgColor</td><td>背景色</td><td></td><td>""</td><td></td></tr>
	 * <tr><td>bgImage</td><td>背景画像</td><td></td><td>/images/background/common/background02.gif</td><td></td></tr>
	 * <tr><td>bgRepeatType</td><td>繰り返しタイプ</td><td></td><td>repeat</td><td></td></tr>
	 * <tr><td>bgSepV</td><td>垂直分割数</td><td></td><td>1</td><td></td></tr>
	 * <tr><td>bgSepH</td><td>水平分割数</td><td></td><td>1</td><td></td></tr>
	 * <tr><td>bgSepLineWidth</td><td>分割線幅</td><td></td><td>3</td><td></td></tr>
	 * <tr><td>bgSepLineColor</td><td>分割線色</td><td></td><td>#000000</td><td></td></tr>
	 * <tr><td>ticketData</td><td>利用可能チケット情報</td><td></td><td>ticket_blue_small:Keep:true,
	 * ticket_pink_small:Problem:true,
	 * ticket_yellow_small:Try:true,
	 * ticket_white_small:Memo:true</td><td></td></tr>
	 * </table>
	 * 出力項目
	 * <table border=1>
 	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>備考</td></tr>
	 * <tr><td>success</td><td>処理結果。処理に成功した場合はtrue、それ以外の場合はfalse.</td><td></td></tr>
	 * <tr><td>message</td><td>結果メッセージ</td><td></td></tr>
	 * <tr><td>board</td><td>作成したボード情報</td><td></td></tr>
	 * </table>
	 * 実行例
	 * curl "http://localhost:1337/api/board?token=(認証トークン文字列)&projectId=P01"
	 * </pre>
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
	 *
  	 *<pre>
	 * URL: http://(IPアドレス):(ポート番号)/api/board
	 *
	 * アクション: PUT
	 *
	 * 管理者権限要否: 要
	 *
	 * 入力必須項目
	 * <table border=1>
	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>必須</td><td>デフォルト値</td><td>備考</td></tr>
	 * <tr><td>token</td><td>認証トークン</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>id</td><td>更新対象ボードID</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>title</td><td>タイトル</td><td>○</td><td></td><td>空文字への変更不可</td></tr>
	 * <tr><td>description</td><td>説明</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>category</td><td>カテゴリ</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>width</td><td>ボード幅</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>height</td><td>ボード高さ</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>bgType</td><td>背景タイプ</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>bgColor</td><td>背景色</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>bgImage</td><td>背景画像</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>bgRepeatType</td><td>繰り返しタイプ</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>bgSepV</td><td>垂直分割数</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>bgSepH</td><td>水平分割数</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>bgSepLineWidth</td><td>分割線幅</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>bgSepLineColor</td><td>分割線色</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * <tr><td>ticketData</td><td>利用可能チケット情報</td><td></td><td></td><td>未設定の場合、変更しない</td></tr>
	 * </table>
	 * 出力項目
	 * <table border=1>
 	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>備考</td></tr>
	 * <tr><td>success</td><td>処理結果。処理に成功した場合はtrue、それ以外の場合はfalse.</td><td></td></tr>
	 * <tr><td>message</td><td>結果メッセージ</td><td></td></tr>
	 * <tr><td>board</td><td>作成したボード情報</td><td></td></tr>
	 * </table>
	 * 実行例
	 * curl "http://localhost:1337/api/board?token=(認証トークン文字列)&projectId=P01"
	 * </pre>
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

	/**
	 * ボード削除API.
	 *
  	 *<pre>
	 * URL: http://(IPアドレス):(ポート番号)/api/board
	 *
	 * アクション: DELETE
	 *
	 * 管理者権限要否: 要
	 *
	 * 入力必須項目
	 * <table border=1>
	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>必須</td><td>デフォルト値</td><td>備考</td></tr>
	 * <tr><td>token</td><td>認証トークン</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>boardId</td><td>ボードID</td><td>○</td><td></td><td></td></tr>
	 * </table>
	 * 出力項目
	 * <table border=1>
 	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>備考</td></tr>
	 * <tr><td>success</td><td>処理結果。処理に成功した場合はtrue、それ以外の場合はfalse.</td><td></td></tr>
	 * <tr><td>message</td><td>結果メッセージ</td><td></td></tr>
	 * </table>
	 * 実行例
	 * curl "http://localhost:1337/api/board?token=(認証トークン文字列)&projectId=P01"
	 * </pre>
	 */
	deleteBoard : function(req, res) {
		logger.info(req, "deleteBoard called");
		var cb = function(err, data){
			logger.info(req, "err:"+JSON.stringify(err));
			logger.info(req, "data:"+JSON.stringify(data));
			if(err){
				return res.json({
					success: false,
					message : "ボード削除失敗"
				});
			}
			req.rest = data.info;
			BoardController.deleteBoard(req, res);
		};
		authenticateToken(req, cb);
	},

	/**
	 * ボード一覧取得API.
	 *
	 * <b>REST API利用方法</b>
	 * <pre>
	 * URL: http://(IPアドレス):(ポート番号)/api/board
	 *
	 * アクション: GET
	 *
 	 * 管理者権限要否: 要
	 *
	 * 入力項目
	 * <table border=1>
	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>必須</td><td>デフォルト値</td><td>備考</td></tr>
	 * <tr><td>token</td><td>認証トークン</td><td>○</td><td></td><td></td></tr>
	 * <tr><td>id</td><td>ボードID</td><td></td><td></td><td>指定したボードIDをもつボードのみ取得</td></tr>
	 * <tr><td>title</td><td>ボードタイトル</td><td></td><td></td><td>指定したタイトルをもつボードのみ取得</td></tr>
	 * </table>
	 * 出力項目
	 * <table border=1>
 	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>備考</td></tr>
	 * <tr><td>success</td><td>処理結果。処理に成功した場合はtrue、それ以外の場合はfalse.</td><td></td></tr>
	 * <tr><td>message</td><td>結果メッセージ</td><td></td></tr>
	 * <tr><td>board</td><td>指定したプロジェクトに存在するボード情報リスト</td><td></td></tr>
	 * </table>
	 * </pre>
	 */
	listBoard : function(req, res) {
		logger.info(req, "listBoard called");
		var cb = function(err, data){
			logger.info(req, "err:"+JSON.stringify(err));
			logger.info(req, "data:"+JSON.stringify(data));
			if(err){
				return res.json({
					success: false,
					message : "ボード一覧取得失敗:"+err.message
				});
			}
			req.rest = data.info;
			BoardController.listBoard(req, res);
		};
		authenticateToken(req, cb);
	},

	/**
	 * チケット一覧取得API.
	 *<pre>
	 * URL: http://(IPアドレス):(ポート番号)/api/ticket
	 *
	 * アクション: GET
	 *
	 * 管理者権限要否: 不要
	 *
	 * 入力必須項目
	 * <table border=1>
	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>必須</td><td>デフォルト値</td><td>備考</td></tr>
	 * <tr><td>token</td><td>認証トークン</td><td>○</td><td></td></tr>
	 * <tr><td>boardId</td><td>ボードID</td><td>＊１</td><td></td><td rowspan=2>＊１: ボードID、もしくは、ボードタイトルのいずれかが必要</td></tr>
	 * <tr><td>boardTitle</td><td>ボードタイトル</td><td>＊１</td><td></td></tr>
	 * </table>
	 * 出力項目
	 * <table border=1>
 	 * <tr style="background-color: #dfd"><td>キー</td><td>説明</td><td>備考</td></tr>
	 * <tr><td>success</td><td>処理結果。処理に成功した場合はtrue、それ以外の場合はfalse.</td><td></td></tr>
	 * <tr><td>message</td><td>結果メッセージ</td><td></td></tr>
	 * <tr><td>ticket</td><td>指定したボードに存在するチケット情報リスト</td><td></td></tr>
	 * </table>
	 * 実行例
	 * curl "http://localhost:1337/api/board?token=(認証トークン文字列)&projectId=P01"
	 * </pre>
	 */
	listTicket : function(req, res) {
		logger.info(req, "listTicket called");
		var cb = function(err, data){
			logger.info(req, "err:"+JSON.stringify(err));
			logger.info(req, "data:"+JSON.stringify(data));
			if(err){
				return res.json({
					success: false,
					message : "チケット一覧取得失敗:"+err.message
				});
			}
			req.rest = data.info;
			BoardController.listTicket(req, res);
		};
		authenticateToken(req, cb);
	}

};
