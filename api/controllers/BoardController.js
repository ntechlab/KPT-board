/**
 * BoardController
 *
 * @description :: Server-side logic for managing Boards
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var logger = require('../Log.js').getLoggerWrapper("BoardController");

var u = require('underscore');
var us = require('underscore.string');

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
	if(loginInfo["roleName"] !== "admin"){
	  cb(req, res, {
		  type: "main",
		  data: {
			  type: "danger",
			  contents: "一般ユーザーはボードを作成できません。"
		  }
	  });
	  return;
	}

	// タイトルとカテゴリをトリムする。
	var title = req.param('title');
	var category = req.param('category');
	logger.trace(req, "createBoard called:[" + title + "," + category + "]");
	title = Utility.trim(req, title);
	category = Utility.trim(req, category);

	if(!title || title.length == 0){
	  cb(req, res, {
		  type: "main",
		  data: {
			  type: "danger",
			  contents: "トリム後のタイトルが空のため処理を中断"
		  }
	  });
	  return;
	}
	Board.create({
	    title: title,
	    description : req.param('description'),
	    projectId: loginInfo["projectId"], // 作成者のプロジェクトＩＤを引き継ぐ
	    category: category
	}).exec(function(err, created){
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
				contents: "ボードを作成しました。［カテゴリ：" + category + "　タイトル：" + title + "］"
				}
		});
	});
}

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
		res.view("newboard/index", {
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
			id: req.param("boardId"),
			loginInfo: loginInfo,
			title: req.param("title"),
			description: req.param('description')
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
	if(loginInfo["roleName"] !== "admin"){
		cb(req, res, {
			type: main,
			data: {
				type: "danger",
				contents: "一般ユーザーはボード情報を更新できません。"
			}
		});
		return;
	}

	// ボードIDが指定されていない場合にはエラーとする。
	var boardId = req.param('id');
	if(boardId == null){
		cb(req, res, {
			type: "main",
			data: {
				type: "danger",
				contents: "ボードIDが指定されていません。"
			}
		});
		return;
	}

	// 同一プロジェクトＩＤでない場合にはエラーとする。
	Board.findOne(boardId).exec(function(err, found){
		var loginInfo = Utility.getLoginInfo(req, res);
		if(err || loginInfo["projectId"] != found["projectId"]){
			cb(req, res, {
				type: "stay2",
				data: {
					type: "danger",
					contents: "BoardController.js ボード情報の更新に失敗しました（プロジェクトID不一致）: " + JSON.stringify(err)
				}
			});
			return;
	   	}

		// カテゴリ文字列をトリムする。
		var category = req.param('category');
		req.params["category"] = Utility.trim(req, category);

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
					'bgRepeatType'
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
					type: "stay2",
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

module.exports = {

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
	 * チケットの作成、削除、更新処理アクション
	 */
	process : function(req, res) {
		var loginInfo = Utility.getLoginInfo(req, res);

    var socket = req.socket;
    var io = sails.io;
    var actionType = req.param('actionType');
    var id = req.param('id');
    var boardId = req.param('boardId');
    var roomName = "room_"+boardId+"_";
    logger.debug(req, "チケット処理:["+actionType+"]["+id+"]["+boardId+"]["+roomName+"]");
    if (actionType == "create") {
      var userId = req.param('userId');
      User.findOne(userId).exec(function(err, foundUser) {
	    Ticket.create({
		boardId : boardId,
		createUser : userId,
		contents : req.param('contents'),
		positionX : req.param('positionX'),
		positionY : req.param('positionY'),
		ticketHeight : req.param('ticketHeight'),
		ticketWidth : req.param('ticketWidth'),
		color : req.param('color')
	    }).exec(function(err, ticket) {
		if (err) {
			// TODO: エラー通知方法検討
			logger.error(req, "チケット作成 失敗: ["+err+"]");
		} else {
		    logger.info(req, "チケット作成 成功: ["+ JSON.stringify(ticket));
		    io.sockets.in(roomName).emit('message',
		    {
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
		}
	    });
	});
    } else if (actionType == "destroy") {
      Ticket.findOne({
        id : id
      }).exec(function(err, found) {
        Ticket.destroy({id: id}).exec(function destroy(err2){
          if(found){
        	  logger.info(req, "チケット削除 成功: ["+JSON.stringify(found)+"]");
            io.sockets.in(roomName).emit('message',{action: "destroyed", id : found.id});
          }
        });
      });
    } else if (actionType == "update") {
        var x = req.param('positionX');
        var y = req.param('positionY');
        var ticketHeight = req.param('ticketHeight');
        var ticketWidth = req.param('ticketWidth');
        var contents = req.param('contents');
        Ticket.update({
          id : id
        }, {
          positionX   : x,
          positionY   : y,
          ticketHeight: ticketHeight,
          ticketWidth : ticketWidth,
          contents    : contents
      }).exec(function update(err, updated) {
         if(updated && updated[0]){
           logger.info(req, "チケット更新 成功: ["+JSON.stringify(updated[0])+"]");
           io.sockets.in(roomName).emit('message',
             {
               action : "updated",
               id : updated[0].id,
               positionX: updated[0].positionX,
               positionY: updated[0].positionY,
               ticketHeight: updated[0].ticketHeight,
               ticketWidth : updated[0].ticketWidth,
               contents: updated[0].contents });
         }
      });
    } else if (actionType == "move") {
      var dstBoardId = req.param('dstBoardId');
      var ticketId = req.param('id');
      var nickname = req.param('nickname');
      Ticket.update({
        id: id
      }, {
        boardId : dstBoardId
      }).exec(function update(err, updated){
        if(updated && updated[0]){
           var ticket = updated[0];
           logger.debug(req, "チケット移動 成功: ["+JSON.stringify(updated[0])+"]");
           io.sockets.in(roomName).emit('message',{action: "destroyed", id : id});
           io.sockets.in("room_" + dstBoardId).emit('message',
		    {
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
		}
      })
    } else {
    	logger.error(req, "チケット処理 想定外のアクション:[" + actionType + "]");
    }
  }

};

