var userIds = {};
var u = require('underscore');
var logger = require('../Log.js').getLoggerWrapper("BoardUserManager");

exports.addBoardUser = function(req, roomName, userId){
	logger.trace(req, "addBoardUser called: ["+roomName+", "+userId+"]");
	if(userIds[roomName] === undefined){
		userIds[roomName] = [];
	}
	var users = userIds[roomName];
	if(!u.contains(users, userId)){
		userIds[roomName].push(userId);
	}
	logger.trace(req, "ルーム内情報（追加後）: [" + JSON.stringify(userIds) + "]");
}

exports.removeBoardUser = function(req, userId){
	logger.trace(req, "removeBoardUser called: ["+userId+"]");
	var inRoom = false;
	var roomId;
	u.each(userIds, function(v, k){
		var users = v;
		if(u.contains(users, userId)){
			roomId = k;
			var newUsers = u.filter(users, function(user){
				return user !== userId;
			});
			userIds[k] = newUsers;
		}
	});

	// TODO: ボードを利用しているユーザーが削除された場合には、特定の値を返すようにする。
	//logger.debug(req, "ルーム内:inRoom["+inRoom+"]["+roomId+"]["+userIds+"]");
	logger.trace(req, "ルーム内情報（削除後）: [" + JSON.stringify(userIds) + "]");
	return roomId;
}

exports.getBoardUserInfo = function(req, roomName){
	var ret = userIds[roomName] || [];
	ret = u.sortBy(ret);
	return ret;
}

