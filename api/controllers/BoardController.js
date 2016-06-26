/**
 * BoardController
 *
 * @module BoardController ボードコントローラー
 * @description :: Server-side logic for managing Boards
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var logger = require('../Log.js').getLoggerWrapper("BoardController");

var u = require('underscore');
var us = require('underscore.string');


/**
 * ブラウザから呼び出された場合に利用するコールバック関数.
 *
 * @param req リクエスト
 * @param res レスポンス
 * @param params パラメータ
 */
function getBrowserCallback(req, res, params){
	logger.trace(req, "getCreateBoardCallbackUI start");
	var type = params.type;
	var data = params.data;
	logger.trace(req, "結果処理コールバック関数呼び出し（ブラウザ）:" + JSON.stringify(data));
	switch(type){
	case "main":
		Utility.openMainPage(req, res, data);
		break;
	case "stay":
		var loginInfo = Utility.getLoginInfo(req, res);
		loginInfo.message = data;
		return res.view("newboard/index", {
			loginInfo: loginInfo,
			title: req.param("title"),
			category : req.param("category"),
			selectedId : req.param("selectedId"),
			desc: req.param('description')
		});
		break;
	case "stay2":
		var loginInfo = Utility.getLoginInfo(req, res);
		loginInfo.message = data;
		res.view("dashboard/editBoard", {
//			id: req.param("boardId"),
//			loginInfo: loginInfo,
//			category: req.param("category"),
//			categories: [],
//			title: req.param("title"),
//			description: req.param('description')

			id: id,
			title :found["title"],
			description:found["description"],
			width: found["width"],
			height: found["height"],
			bgType:found["bgType"],
			bgColor:found["bgColor"],
			bgImage:found["bgImage"],
			bgRepeatType: found["bgRepeatType"],
			bgSepV: found["bgSepV"],
			bgSepH: found["bgSepH"],
			bgSepLineWidth: found["bgSepLineWidth"],
			bgSepLineColor: found["bgSepLineColor"],
			images: backgroundFileList,
			category: found["category"] || "",
			categories: categories,
			selectedId : req.param("selectedId"),
			ticketTypeList : ticketTypeList,
			loginInfo: loginInfo

		});



		break;
	default:
		logger.error(req, "結果処理コールバックに与えられたタイプが想定外:[" + type + "]");
	}
	logger.trace(req, "getCreateBoardCallbackUI end");
}

/**
 * RESTから呼び出された場合に利用するコールバック関数.
 *
 * @param req リクエスト
 * @param res レスポンス
 * @param params パラメータ
 */
function getRESTCallback(req, res, params){
	logger.trace(req, "getCreateBoardCallbackREST start");
	var type = params.type;
	var data = params.data;
	logger.trace(req, "結果処理コールバック関数呼び出し（REST）:" + JSON.stringify(data));
	res.json(data);
	logger.trace(req, "getCreateBoardCallbackREST end");
}

/**
 * 結果処理コールバック関数取得.<br>
 *
 * ブラウザからの呼び出しか、RESTからの呼び出し化を判断し、適切なコールバック関数を返却する。
 *
 * @param req リクエスト
 * @param res レスポンス
 * @returns 結果処理コールバック関数
 */
function getCallback(req, res){
	logger.trace(req, "getCallback start");
	var loginInfo = Utility.getLoginInfo(req, res);

	// 処理実行がブラウザかRESTかに応じてコールバック関数を選択する。
	logger.trace(req, "アクセスモード:"+loginInfo.mode);
	var cb;
	if(loginInfo.mode == "browser"){
		cb = getBrowserCallback;
	} else {
		cb = getRESTCallback;
	}
	logger.trace(req, "getCallback end");
	return cb;
}


function trim(req, trimKeys){
	u.each(trimKeys, function(key){
		var value = req.param(key);
		req.params[key] = Utility.trim(req, value);
	});
}

function requiredItemCheck(req, res, requiredKeys, errorCb){
	var nullKeys = [];
	u.each(requiredKeys, function(obj){
		logger.debug(req, "必須チェック:"+obj.key+","+obj.name);
		var value = req.param(obj.key);
		logger.debug(req, "値["+value+"]");
		if(value == null || value === ""){
			nullKeys.push(obj.name);
		}
	});
	logger.debug(req, "数["+JSON.stringify(nullKeys)+"->"+nullKeys.length+"]");
	if(nullKeys.length > 0){
		// エラー用コールバックの実行
		errorCb(req, res, nullKeys);
		return false;
	}
	return true;
}

function setDefaultValues(req, newObj, defaultValues){
	u.each(defaultValues, function(v, k){
		var value = req.param(k)
		if(value == null){
			logger.debug(req, "デフォルト値の補完:" + k+" -> "+ v);
			value = v;
		}
		newObj[k] = value;
	});
}

function adminCheck(req, res, cb, loginInfo, message){
	logger.debug(req, "管理者権限チェック 開始");
	if(loginInfo["roleName"] !== "admin"){
		logger.debug(req, "管理者権限がないためエラーとする。");
		cb(req, res, {
			type: "main",
			data: {
				type: "danger",
				contents: message
			}
		});
		return false;
	}
	logger.debug(req, "管理者権限チェック 終了");
	return true;
}

/**
 * ボード作成内部処理.<br>
 *
 * @param req リクエスト
 * @param res レスポンス
 * @param cb 呼び出し方式（ブラウザ/REST）に応じて処理を分岐するためのコールバック関数
 */
function createBoardInner(req, res, cb) {
	var loginInfo = Utility.getLoginInfo(req, res);

	// 管理者ロールでない場合にはボードを作成できない。
	if(!adminCheck(req, res, cb, loginInfo, "一般ユーザーはボードを作成できません。")){
		return;
	};

	// タイトルとカテゴリをトリムする。
	var trimKeys = ["title", "category"];

	var requiredKeys = [{key: "title", name: "タイトル"}];

	var defaultValues = {
			"description": "",
			"category": "",
			"version": "1.1",
			"width": 3840,
			"height": 2160,
			"bgType": "image",
			"bgColor": "",
			"bgImage": "/images/background/common/background02.gif",
			"bgRepeatType": "repeat",
			"bgSepV": 1,
			"bgSepH": 1,
			"bgSepLineWidth": 3,
			"bgSepLineColor": "#000000",
			"ticketData": "ticket_blue_small:Keep:true,ticket_pink_small:Problem:true,ticket_yellow_small:Try:true,ticket_white_small:Memo:true",
	};

	trim(req, trimKeys);

	// 必須チェックエラーコールバック
	var errorCb = function(req, res, nullKeys){
		cb(req, res, {
			type: "main",
			data: {
				type: "danger",
				contents: "必須項目が未入力です：[" + nullKeys + "]"
			}
		});
	};

	if(!requiredItemCheck(req, res, requiredKeys, errorCb)){
		return;
	}

	// 値が未設定の場合には、デフォルト値を設定する。
	var newObj = {};
	setDefaultValues(req, newObj, defaultValues);

	// 内部設定項目
	newObj["title"] = req.param("title");
	newObj["projectId"] = loginInfo["projectId"], // 作成者のプロジェクトＩＤを引き継ぐ

	logger.debug(req, "★オブジェクト："+JSON.stringify(newObj));
	Board.create(newObj).exec(function(err, created){
		if(err) {
			cb(req, res, {
		    	  type: "stay",
		    	  data: {
		    		  type: "danger",
		    		  contents: "ボードの作成に失敗しました: " + JSON.stringify(err)
		    	  }
		      });
		    return;
		}
		cb(req, res, {
			type: "main",
			data: {
				type: "success",
				contents: "ボードを作成しました。［カテゴリ：" + req.param("category") + "　タイトル：" + req.param("title") + "］"
				}
		});
	});
}

/**
 * ボード更新内部処理.<br>
 *
 * @param req リクエスト
 * @param res レスポンス
 * @param cb 呼び出し方式（ブラウザ/REST）に応じて処理を分岐するためのコールバック関数
 */
function updateBoardInner(req, res, cb) {
	logger.trace(req, "updateBoardInner start");
	var loginInfo = Utility.getLoginInfo(req, res);

	// 管理者ロールでない場合にはボードを更新できない。
	if(!adminCheck(req, res, cb, loginInfo, "一般ユーザーはボード情報を更新できません。")){
		return;
	};

	// ボードIDが指定されていない場合にはエラーとする。
	var requiredKeys = [
	                    {key: "id", name: "ボードＩＤ"}
	                    ];

	// タイトルが空文字の場合には、値をnullに設定することで更新対象から外す。
	if(req.param("title") === ""){
		req.params.title = null;
	};

	// 必須チェックエラーコールバック
	var errorCb = function(req, res, nullKeys){
		cb(req, res, {
			type: "main",
			data: {
				type: "danger",
				contents: "必須項目が未入力です：[" + nullKeys + "]"
			}
		});
	};

	if(!requiredItemCheck(req, res, requiredKeys, errorCb)){
		return;
	}

	var boardId = req.param('id');

	// 同一プロジェクトＩＤでない場合にはエラーとする。
	Board.findOne(boardId).exec(function(err, found){
		var loginInfo = Utility.getLoginInfo(req, res);
		if(err || loginInfo["projectId"] != found["projectId"]){
			cb(req, res, {
				type: "main",
				data: {
					type: "danger",
					contents: "BoardController.js ボード情報の更新に失敗しました（プロジェクトID不一致）: " + JSON.stringify(err)
				}
			});
			return;
	   	}

		// カテゴリ文字列をトリムする。
		var trimKeys = ["category"];
		trim(req, trimKeys);

		// 更新したい値を設定するオブジェクト
		var newObj = {};

		// 変更対象項目キー配列
		var keys = [
					'title',
					'description',
					'category',
					'width',
					'height',
					'bgType',
					'bgColor',
					'bgImage',
					'bgRepeatType',
					'bgSepV',
					'bgSepH',
					'bgSepLineWidth',
					'bgSepLineColor',
					'ticketData'
				];

		// 送信された値を更新する。
		u.each(keys, function(key){
			if(req.param(key)){
				newObj[key] = req.param(key);
			}
		});

		// ボードの更新処理
		Board.update(boardId, newObj).exec(function(err,created){
			if(err) {
				cb(req, res, {
					type: "main",
					data: {
						type: "danger",
						contents: "ボード情報の更新に失敗しました: " + JSON.stringify(err)
					}
				});
			    return;
			}
			cb(req, res, {
				type: "main",
				data: {
					type: "success",
					contents: "ボード情報を更新しました。"
				}
			});
			return;
		});
   });
}

/**
 * チケット作成処理.
 *
 * @param req リクエスト
 * @param res レスポンス
 * @param cb 結果処理コールバック
 * @param loginInfo ログイン情報
 * @param boardId ボードＩＤ
 */
function createTicket(req, res, cb, loginInfo, boardId){
	var userId = req.param('userId');
	var socket = req.socket;
	var io = sails.io;
	var roomName = "room_"+boardId+"_";

	// デフォルト値データ
	var defaultValues = {
		contents: "",
		positionX: 0,
		positionY: 0,
		color: "ticket_blue_small",
		ticketHeight: 170,
		ticketWidth: 244
	};
	var newObj = {};
	setDefaultValues(req, newObj, defaultValues);
	newObj["boardId"] = boardId;
	newObj["createUser"] = userId;

	User.findOne(userId).exec(function(err, foundUser) {
		Ticket.create(newObj).exec(function(err, ticket) {
			if (err) {
				cb(req, res, {
					type: "main",
					data:{
						type: "danger",
						contents: "チケット作成に失敗しました。"+JSON.stringify(err)
					}
				});
			} else {
				io.sockets.in(roomName).emit('message', {
					action: "created",
					id: ticket.id,
					contents: ticket.contents,
					boardId: ticket.boardId,
					createUser : ticket.createUser,
					positionX: ticket.positionX,
					positionY: ticket.positionY,
					ticketHeight: ticket.ticketHeight,
					ticketWidth: ticket.ticketWidth,
					color: ticket.color,
					createdAt: ticket.createdAt,
					nickname : foundUser["nickname"]});
				cb(req, res, {
					type: "main",
					data:{
						type: "success",
						contents: "チケット作成に成功しました。"+JSON.stringify(ticket)
					}
				});
			}
		});
	});
}

/**
 * チケット削除処理.
 *
 * @param req リクエスト
 * @param res レスポンス
 * @param cb 結果処理コールバック
 * @param loginInfo ログイン情報
 * @param boardId ボードＩＤ
 */
function deleteTicket(req, res, cb, loginInfo, boardId){
	var socket = req.socket;
	var io = sails.io;
	var roomName = "room_"+boardId+"_";
	var id = req.param('id');

	Ticket.findOne({boardId: boardId, id: id}).exec(function(err, found) {
		if(err){
			cb(req, res, {
				type: "main",
				data:{
					type: "danger",
					contents: "削除対象チケット取得に失敗しました。" + JSON.stringify(err)
				}
			});
			return;
		}
		Ticket.destroy({boardId: boardId, id: id}).exec(function(err2){
			if(err2){
				cb(req, res, {
					type: "main",
					data:{
						type: "danger",
						contents: "チケットの削除に失敗しました。" + JSON.stringify(err2)
					}
				});
				return;
			}
			if(found){
				io.sockets.in(roomName).emit('message', {
					action: "destroyed",
					id : found.id
				});
				cb(req, res, {
					type: "main",
					data:{
						type: "success",
						contents: "チケットを削除しました。"
					}
				});
			}
		});
	});
}

/**
 * チケット更新処理.
 *
 * @param req リクエスト
 * @param res レスポンス
 * @param cb 結果処理コールバック
 * @param loginInfo ログイン情報
 * @param boardId ボードＩＤ
 */
function updateTicket(req, res, cb, loginInfo, boardId){
	var socket = req.socket;
	var io = sails.io;
	var roomName = "room_"+boardId+"_";
	var id = req.param('id');

	var x = req.param('positionX');
	var y = req.param('positionY');
	var ticketHeight = req.param('ticketHeight');
	var ticketWidth = req.param('ticketWidth');
	var contents = req.param('contents');

	var newObj = {};
	var keys = ["positionX", "positionY", "ticketHeight", "ticketWidth", "contents"];
	u.each(keys, function(key){
		var value = req.param(key);
		if(value != null){
			newObj[key] = value;
		}
	});
	Ticket.update({boardId: boardId, id : id}, newObj).exec(function update(err, updated) {

		if(err){
			cb(req, res, {
				type: "main",
				data:{
					type: "danger",
					contents: "チケットの更新に失敗しました。" + JSON.stringify(err)
				}
			});
			return;
		}
		logger.info(req, "チケット更新 成功: ["+JSON.stringify(updated[0])+"]");
		io.sockets.in(roomName).emit('message', {
			action : "updated",
			id : updated[0].id,
			positionX: updated[0].positionX,
			positionY: updated[0].positionY,
			ticketHeight: updated[0].ticketHeight,
			ticketWidth : updated[0].ticketWidth,
			contents: updated[0].contents
		});
		cb(req, res, {
			type: "main",
			data:{
				type: "success",
				contents: "チケットを更新しました。"
			}
		});
	});

}

/**
 * チケット移動処理.
 *
 * チケットをボードから別なボードに移動する。
 *
 * @param req リクエスト
 * @param res レスポンス
 * @param cb 結果処理コールバック
 * @param loginInfo ログイン情報
 * @param boardId ボードＩＤ
 */
function moveTicket(req, res, cb, loginInfo, boardId){
	var socket = req.socket;
	var io = sails.io;
	var roomName = "room_"+boardId+"_";
	var id = req.param('id');
	var nickname = req.param('nickname');

	// 移動先ボード
	var dstBoardId = req.param('dstBoardId');

	// 移動先ボードのプロジェクトＩＤがユーザーのプロジェクトＩＤに一致していない場合にはエラーとする。
	Board.findOne(dstBoardId).exec(function(err, found){
		if(err){
			cb(req, res, {
				type: "main",
				data:{
					type: "danger",
					contents: "チケット移動先ボードの取得に失敗しました。"+JSON.stringify(err)
				}
			});
			return
		}
		logger.debug(req, "移動先ボードのプロジェクトＩＤチェック:"+found["projectId"] +","+ loginInfo["projectId"]);
		if(found["projectId"] !== loginInfo["projectId"]){
			cb(req, res, {
				type: "main",
				data:{
					type: "danger",
					contents: "移動先ボードが存在しません。"
				}
			});
			return;
		}
		Ticket.update({boardId: boardId, id: id}, {boardId : dstBoardId}).exec(function update(err, updated){
			if(err){
				cb(req, res, {
					type: "main",
					data:{
						type: "danger",
						contents: "チケットの移動に失敗しました。" + JSON.stringify(err)
					}
				});
				return;
			}
			var ticket = updated[0];
			logger.debug(req, "チケット移動 成功: ["+JSON.stringify(ticket)+"]");

			// 移動元ボードに対してメッセージ通知
			io.sockets.in(roomName).emit('message',{action: "destroyed", id : id});

			// 移動先ボードに対してメッセージ通知
			io.sockets.in("room_" + dstBoardId).emit('message', {
				action: "created",
				id: id,
				contents: ticket.contents,
				boardId: ticket.boardId,
				createUser : ticket.createUser,
				positionX: ticket.positionX,
				positionY: ticket.positionY,
				ticketHeight: ticket.ticketHeight,
				ticketWidth : ticket.ticketWidth,
				color: ticket.color,
				nickname : nickname
			});
			cb(req, res, {
				type: "main",
				data:{
					type: "success",
					contents: "チケットを移動しました。"
				}
			});
		})
	})
}

module.exports = {

	/**
	 * リスナ登録
	 */
	register : function(req, res) {
		var boardId = req.param('boardId');
		logger.trace(req, "register called: [" + boardId + "]");
		var socket = req.socket;
		var io = sails.io;

		// リスナ登録
		var roomName = 'room_'+boardId+'_';
		logger.debug(req, "リスナ登録: [" + roomName + "]");
		socket.join(roomName);
		if(req.session.passport){
			var userId = req.session.passport.userId;
			BoardUserManager.addBoardUser(req, roomName, userId);
			var usersInRoom = BoardUserManager.getBoardUserInfo(req, roomName);
			io.sockets.in(roomName).emit('message', {action : "enter", userId: userId, users: usersInRoom});
		}
	},

    /**
     * ボード作成
     */
    createBoard : function(req, res) {
    	var cb = getCallback(req, res);
    	createBoardInner(req, res, cb);
    },

    /**
     * ボード情報更新
     */
    updateBoard : function(req, res) {
     	var cb = getCallback(req, res);
     	updateBoardInner(req, res, cb);
    },

	/**
	 * チケット共通処理.
	 *
	 * @param req リクエスト
	 * @param res レスポンス
	 */
	process : function(req, res) {
		var loginInfo = Utility.getLoginInfo(req, res);

		// 結果処理コールバックを取得
		var cb;
		logger.debug(req, "モード["+loginInfo.mode+"]");
		if(loginInfo.mode === "rest"){
			cb = getRESTCallback;
		} else {
			cb = function(req, res, params){
				logger.debug(req, "チケット処理:"+JSON.stringify(params));
			};
		}

		var actionType = req.param('actionType');

		// チケット新規作成以外の場合には、チケットＩＤの必須チェックを行う。
		if(actionType !== "create"){
			var id = req.param('id');
			if(id == null){
				cb(req, res, {
					type: "main",
					data:{
						type: "danger",
						contents: "チケットＩＤが指定されていません。"
					}
				});
				return;
			}
		}

		var boardId = req.param('boardId');
		// ボードＩＤの必須チェック
		if(boardId == null || boardId === ""){
			cb(req, res, {
				type: "main",
				data:{
					type: "danger",
					contents: "ボードIDが指定されていません"
				}
			});
			return;
		}

		// ボードのプロジェクトＩＤがユーザーのプロジェクトＩＤに一致していない場合にはエラーとする。
		Board.findOne(boardId).exec(function(err, found){
			if(err){
				cb(req, res, {
					type: "main",
					data:{
						type: "danger",
						contents: "チケット作成ボードの取得に失敗しました。"+JSON.stringify(err)
					}
				});
				return
			}
			logger.debug(req, "プロジェクトＩＤチェック:"+found["projectId"] +","+ loginInfo["projectId"]);
			if(found["projectId"] !== loginInfo["projectId"]){
				cb(req, res, {
					type: "main",
					data:{
						type: "danger",
						contents: "チケット作成ボードが存在しません。"
					}
				});
				return;
			}

			logger.debug(req, "チケット処理:["+actionType+"]["+id+"]["+boardId+"]");

			switch(actionType){
			case "create":
				// チケット作成
				createTicket(req, res, cb, loginInfo, boardId);
				break;
			case "destroy":
				deleteTicket(req, res, cb, loginInfo, boardId);
				break;
			case "update":
				updateTicket(req, res, cb, loginInfo, boardId);
				break;
			case "move":
				moveTicket(req, res, cb, loginInfo, boardId);
				break;
			default:
				logger.error(req, "チケット処理 想定外のアクション:[" + actionType + "]");
			}
		});
	}
}

