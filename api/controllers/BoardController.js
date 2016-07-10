/**
 * BoardController
 *
 * @module BoardController ボードコントローラー
 * @description :: Server-side logic for managing Boards
 * @help :: See http://links.sailsjs.org/docs/controllers
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
// id: req.param("boardId"),
// loginInfo: loginInfo,
// category: req.param("category"),
// categories: [],
// title: req.param("title"),
// description: req.param('description')

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

	// REST結果に加工
	data = u.extend(data, {
		success: data["type"] === "success" ? true : false,
		message: data["contents"]});

	// 結果として利用しない項目の削除
	delete(data.type);
	delete(data.contents);
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
				contents: "ボードを作成しました。［カテゴリ：" + req.param("category") + ", タイトル：" + req.param("title") + "］",
				board: created
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

	// タイトルが空文字の場合には、エラーとする。
	var title = req.param("title");

	if(title != null && title.trim() === ""){
		cb(req, res, {
			type: "main",
			data: {
				type: "danger",
				contents: "空のタイトルに変更することはできません。]"
			}
		});
		return;
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
		if(err){
			cb(req, res, {
				type: "main",
				data: {
					type: "danger",
					contents: "ボード情報の更新に失敗しました: " + JSON.stringify(err)
				}
			});
			return;
	   	}
		if(loginInfo["projectId"] != found["projectId"]){
			cb(req, res, {
				type: "main",
				data: {
					type: "danger",
					contents: "ボード情報の更新に失敗しました（プロジェクトID不一致）"
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
 * ボード削除処理
 */
function deleteBoardInner(req, res, cb) {
	logger.trace(req, "deleteBoardInner start");
	var loginInfo = Utility.getLoginInfo(req, res);

	// 管理者ロールでない場合にはボードを更新できない。
	if(!adminCheck(req, res, cb, loginInfo, "一般ユーザーはボード情報を更新できません。")){
		return;
	};

	// ボードIDが指定されていない場合にはエラーとする。
	var requiredKeys = [
	                    {key: "boardId", name: "ボードＩＤ"}
	                    ];

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

	var boardId = req.param('boardId');

	// 同一プロジェクトＩＤでない場合にはエラーとする。
	Board.find({projectId: loginInfo["projectId"], id: boardId}).exec(function(err, found){
		var loginInfo = Utility.getLoginInfo(req, res);
		if(err) {
			cb(req, res, {
				type: "main",
				data: {
					type: "danger",
					contents: "ボード情報の削除に失敗しました: " + JSON.stringify(err)
				}
			});
			return;
	   	}

		Board.destroy(boardId).exec(function(err, found2){
			if(err || (found2 && found2.length === 0)) {
				logger.error(req, "ボード削除処理 失敗: [" + boardId + ","+ JSON.stringify(err) + "]");
				cb(req, res, {
					type: "main",
					data: {
						type: "danger",
						contents: "ボード削除に失敗しました[" + boardId + "]"
					}
				});
				return;
			} else {
				logger.info(req, "ボード削除処理 成功: [" + boardId + "]");
				cb(req, res, {
					type: "main",
					data: {
						type: "success",
						contents: "ボードを削除しました: [" + found2[0]["title"] + "]"
					}
				});
				return;
			}

		});
   });
}


/**
 * ボード一覧取得処理
 */
function listBoardInner(req, res, cb) {
	logger.trace(req, "listBoardInner start");
	var loginInfo = Utility.getLoginInfo(req, res);

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

	// クエリ条件
	var queryCondition = {projectId: loginInfo["projectId"]};

	// ボードID, タイトルが指定されている場合、条件に追加する。
	var conditionKeys = ["id", "title"];
	_.each(conditionKeys, function(key){
		var value = req.param(key);
		if(value != null){
			queryCondition[key] = value;
		}
	});

	Board.find(queryCondition).exec(function(err, found){
		var loginInfo = Utility.getLoginInfo(req, res);
		if(err) {
			cb(req, res, {
				type: "main",
				data: {
					type: "danger",
					contents: "ボード一覧取得に失敗しました: " + JSON.stringify(err)
				}
			});
			return;
	   	}

		logger.info(req, "ボード一覧取得処理 成功");
		cb(req, res, {
			type: "main",
			data: {
				type: "success",
				contents: "ボード一覧を取得しました",
				board: found
			}
		});
		return;

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
						contents: "チケット作成に成功しました。",
						ticket: ticket
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
				contents: "チケットを更新しました。",
				ticket: updated[0]
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

	// チケットID
	var id = req.param('id');

	// ユーザー名
	var nickname = loginInfo["userName"]

	// 移動先ボード
	var destBoardId = req.param('destBoardId');

	var projectId = loginInfo["projectId"];

	// 移動先ボードのプロジェクトＩＤがユーザーのプロジェクトＩＤに一致していない場合にはエラーとする。
	Board.findOne({projectId: projectId, id: destBoardId}).exec(function(err, found){
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
		logger.debug(req, "チケット移動先ボード取得成功:"+JSON.stringify(found));

		Ticket.update({id: id}, {boardId : destBoardId}).exec(function update(err, updated){
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
			io.sockets.in("room_" + destBoardId).emit('message', {
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
					contents: "チケットを移動しました:[" + boardId + "]->[" + destBoardId + "]"
				}
			});
		})
	})
}

/**
 * チケット一覧取得処理
 */
function listTicketInner(req, res, cb) {
	logger.trace(req, "listTicketInner start");
	var loginInfo = Utility.getLoginInfo(req, res);



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

	// ボードID、もしくは、ボードタイトルが指定されていない場合にはエラーとする。
	var boardId = req.param("boardId");
	var boardTitle = req.param("boardTitle");
	if(boardId == null && boardTitle == null){
		cb(req, res, {
			type: "main",
			data: {
				type: "danger",
				contents: "ボードＩＤ(boardId)、もしくは、ボードタイトル(boardTitle)の入力が必要です"
			}
		});
	}

	// クエリ条件
	var queryCondition = {projectId: loginInfo["projectId"]};

	// ボードID, タイトルが指定されている場合、条件に追加する。
	if(boardId != null){
		queryCondition["id"] = boardId;
	}
	if(boardTitle != null){
		queryCondition["title"] = boardTitle;
	}

	logger.debug(req, "チケット取得条件:"+JSON.stringify(queryCondition));
	Board.find(queryCondition).exec(function(err, found){
		var loginInfo = Utility.getLoginInfo(req, res);
		if(err) {
			cb(req, res, {
				type: "main",
				data: {
					type: "danger",
					contents: "ボード取得に失敗しました: " + JSON.stringify(err)
				}
			});
			return;
	   	}

		if(found.length == 0){
			cb(req, res, {
				type: "main",
				data: {
					type: "danger",
					contents: "指定したボードは存在しません"
				}
			});
			return;
		}
		// チケット一覧取得元ボード
		// チケットタイトルを条件とした場合には、複数のボードが取得される可能性があるが、先頭のものと対象とする。
		var targetBoard = found[0];

		logger.info(req, "ボード取得処理 成功");
		Ticket.find({boardId: targetBoard["id"]}).exec(function(err2, found2){
			if(err2) {
				cb(req, res, {
					type: "main",
					data: {
						type: "danger",
						contents: "チケット一覧の取得に失敗しました: " + JSON.stringify(err2)
					}
				});
				return;
		   	}

			cb(req, res, {
				type: "main",
				data: {
					type: "success",
					contents: "チケット一覧を取得しました",
					ticket: found2
				}
			});
			return;
		});

   });
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
	 * ボード情報削除
	 */
    deleteBoard : function(req, res) {
     	var cb = getCallback(req, res);
     	deleteBoardInner(req, res, cb);
    },

    /**
	 * ボード一覧取得
	 */
    listBoard : function(req, res) {
     	var cb = getCallback(req, res);
     	listBoardInner(req, res, cb);
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

		var projectId = loginInfo["projectId"];
		var actionType = req.param('actionType');
		var boardId = req.param('boardId');
		var id = req.param('id');

		if(actionType === "create"){
			// チケット新規作成の場合には、ボードIDの必須チェックを行う。
			if(boardId == null || boardId === ""){
				cb(req, res, {
					type: "main",
					data:{
						type: "danger",
						contents: "ボードID(boardId)が指定されていません"
					}
				});
				return;
			}
		} else {
			// チケット新規作成以外の場合には、チケットIDの必須チェックを行う。
			if(id == null){
				cb(req, res, {
					type: "main",
					data:{
						type: "danger",
						contents: "チケットID(id)が指定されていません。"
					}
				});
				return;
			}
		}

		if(actionType === "create"){
			// チケット作成の場合には、ボードのプロジェクトIDがユーザーのプロジェクトIDに一致していることを確認し、
			// 一致していない場合には、エラーとする。
			Board.findOne({projectId: projectId, id: boardId}).exec(function(err, found){
				if(err){
					cb(req, res, {
						type: "main",
						data:{
							type: "danger",
							contents: "操作対象ボードの取得に失敗しました。"+JSON.stringify(err)
						}
					});
					return
				}

				logger.debug(req, "チケット処理:["+actionType+"]["+id+"]["+boardId+"]");

				// チケット作成
				createTicket(req, res, cb, loginInfo, boardId);
			});

		} else {
			// チケット作成以外の場合には、操作対象チケットが同一プロジェクトのボードに属していることを確認し、
			// 属していない場合にはエラーとする。
			Ticket.findOne(id).exec(function(err3, found3){
				if(err3){
					cb(req, res, {
						type: "main",
						data:{
							type: "danger",
							contents: "チケットの取得に失敗しました。" + JSON.stringify(err3)
						}
					});
					return;
				}
				logger.debug(req, "移動対象チケット取得成功:"+JSON.stringify(found3));

				// 操作対象ボード
				var srcBoardId = found3["boardId"];
				logger.debug(req, "操作対象チケットのボードID取得成功:["+srcBoardId+"]");
				Board.findOne({projectId: projectId, id: srcBoardId}).exec(function update(err4, found4){
					if(err4){
						cb(req, res, {
							type: "main",
							data:{
								type: "danger",
								contents: "操作対象ボードの取得に失敗しました。" + JSON.stringify(err4)
							}
						});
						return;
					}

					switch(actionType){
					case "destroy":
						deleteTicket(req, res, cb, loginInfo, srcBoardId);
						break;
					case "update":
						updateTicket(req, res, cb, loginInfo, srcBoardId);
						break;
					case "move":
						moveTicket(req, res, cb, loginInfo, srcBoardId);
						break;
					default:
						logger.error(req, "チケット処理 想定外のアクション:[" + actionType + "]");
					}
				})
			})
		}
	},

    /**
	 * チケット一覧取得
	 */
    listTicket : function(req, res) {
     	var cb = getCallback(req, res);
     	listTicketInner(req, res, cb);
    }

}

