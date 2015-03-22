/**
 * BoardController
 *
 * @description :: Server-side logic for managing Boards
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */


var logger = require('../Log.js').getLogger("BoardController");

module.exports = {

    /**
     * ボード作成
     */
    createBoard : function(req, res) {
    var title = req.param('title');
    var category = req.param('category');
    logger.trace("createBoard called:[" + title + "," + category + "]");
    title = Utility.trim(title);
    category = Utility.trim(category);
	if(!title || title.length == 0){
	  logger.warn("トリム後のタイトルが空のため処理を中断");
	  Utility.openMainPage(req, res, {type: "danger", contents: "ボードの作成に失敗しました。"});
	  return;
	}
	Board.create({
	    title: title,
	    description : req.param('description'),
	    category: category
	}).exec(function(err, created){
		if(err) {
			logger.error("ボードの作成に失敗しました: " + JSON.stringify(err));
			var loginInfo = Utility.getLoginInfo(req, res);
			loginInfo.message = {type: "danger", contents: "ボードの作成に失敗しました: " + JSON.stringify(err)};
			res.view("newboard/index", {
				loginInfo: loginInfo,
				title: req.param("title"),
				desc: req.param('description')
			});
		    return;
		}
		logger.info("ボード新規作成:[" + title + "," + category + "]");
		Utility.openMainPage(req, res, {type: "success", contents: "ボードを作成しました。"});
	});
    },

    /**
     * ボード情報更新
     */
    updateBoard : function(req, res) {
	    var boardId = req.param('id');
        var category = req.param('category');
        category = Utility.trim(category);
        var newObj = {
    		    title:req.param('title'),
    		    description : req.param('description'),
    		    width : req.param('width'),
    		    height : req.param('height'),
    		    bgType : req.param('bgType'),
    		    bgImage : req.param('bgImage'),
    		    bgSepV : req.param('bgSepV'),
    		    bgSepH : req.param('bgSepH'),
    		    category: category,
    		    bgSepLineWidth : req.param('bgSepLineWidth'),
    		    bgSepLineColor : req.param('bgSepLineColor')
    		};
        var list = ['bgColor', 'bgRepeatType'];
        for(var i = 0; i < list.length; i++){
        	var key = list[i];
	        if(req.param(key)){
	        	newObj[key] = req.param(key);
	        }
        }
        logger.trace("updateBoard called: [" + JSON.stringify(newObj) + "]");
		Board.update(boardId, newObj).exec(function(err,created){
			if(err) {
				logger.error("ボード情報の更新に失敗しました: [" + JSON.stringify(newObj) + "][" + JSON.stringify(err) + "]");
				var loginInfo = Utility.getLoginInfo(req, res);
				loginInfo.message = {type: "danger", contents: "ボード情報の更新に失敗しました: " + JSON.stringify(err)};
				res.view("dashboard/editBoard", {
					id: boardId,
					loginInfo: loginInfo,
					title: req.param("title"),
					description: req.param('description')
				});
			    return;
			}
			logger.info("ボード情報の更新: ["+JSON.stringify(newObj)+"]");
			Utility.openMainPage(req, res, {type: "success", contents: "ボード情報を更新しました。"});
		});
    },

	/**
	 * リスナ登録
	 */
  register : function(req, res) {
    var boardId = req.param('boardId');
    logger.trace("register called: [" + boardId + "]");
    var socket = req.socket;
    var io = sails.io;

    // リスナ登録
    var roomName = 'room_'+boardId+'_';
    logger.debug("リスナ登録: [" + roomName + "]");
    socket.join(roomName);
    if(req.session.passport){
    	 var userId = req.session.passport.userId;
    	 BoardUserManager.addBoardUser(roomName, userId);
    	 var usersInRoom = BoardUserManager.getBoardUserInfo(roomName);
    	 io.sockets.in(roomName).emit('message', {action : "enter", userId: userId, users: usersInRoom});
    }

  },

	/**
	 * チケットの作成、削除、更新処理アクション
	 */
  process : function(req, res) {
    var socket = req.socket;
    var io = sails.io;
    var actionType = req.param('actionType');
    var id = req.param('id');
    var boardId = req.param('boardId');
    var roomName = "room_"+boardId+"_";
    logger.debug("チケット処理:["+actionType+"]["+id+"]["+boardId+"]["+roomName+"]");
    if (actionType == "create") {
      var userId = req.param('userId');
      User.findOne(userId).exec(function(err, foundUser) {
	    Ticket.create({
		boardId : boardId,
		createUser : userId,
		contents : req.param('contents'),
		positionX : req.param('positionX'),
		positionY : req.param('positionY'),
		color : req.param('color')
	    }).exec(function(err, ticket) {
		if (err) {
			// TODO: エラー通知方法検討
			logger.error("チケット作成 失敗: ["+err+"]");
		} else {
		    logger.info("チケット作成 成功: ["+ JSON.stringify(ticket));
		    io.sockets.in(roomName).emit('message',
		    {
		    action: "created",
			id: ticket.id,
			contents: ticket.contents,
			boardId: ticket.boardId,
			createUser : ticket.createUser,
			positionX: ticket.positionX,
			positionY: ticket.positionY,
			color: ticket.color,
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
        	  logger.info("チケット削除 成功: ["+JSON.stringify(found)+"]");
            io.sockets.in(roomName).emit('message',{action: "destroyed", id : found.id});
          }
        });
      });
    } else if (actionType == "update") {
        var x = req.param('positionX');
        var y = req.param('positionY');
        var contents = req.param('contents');
        Ticket.update({
          id : id
        }, {
          positionX : x,
          positionY : y,
          contents : contents
      }).exec(function update(err, updated) {
         if(updated && updated[0]){
           logger.info("チケット更新 成功: ["+JSON.stringify(updated[0])+"]");
           io.sockets.in(roomName).emit('message',
             {
               action : "updated",
               id : updated[0].id,
               positionX: updated[0].positionX,
               positionY: updated[0].positionY,
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
           logger.debug("チケット移動 成功: ["+JSON.stringify(updated[0])+"]");
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
				color: ticket.color,
				nickname : nickname
			});
		}
      })
    } else {
    	logger.error("チケット処理 想定外のアクション:[" + actionType + "]");
    }
  }

};

