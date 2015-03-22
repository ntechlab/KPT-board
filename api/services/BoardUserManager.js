var userIds = {};
var u = require('underscore');
var logger = require('../Log.js').getLogger("BoardUserManager");

exports.addBoardUser = function(roomName, userId){
	logger.trace("addBoardUser called: ["+roomName+", "+userId+"]");
	if(userIds[roomName] === undefined){
		userIds[roomName] = [];
	}
	var users = userIds[roomName];
	if(!u.contains(users, userId)){
		userIds[roomName].push(userId);
	}
	logger.trace("ルーム内情報（追加後）: [" + JSON.stringify(userIds) + "]");
}

exports.removeBoardUser = function(userId){
	logger.trace("removeBoardUser called: ["+userId+"]");
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
	//logger.debug("ルーム内:inRoom["+inRoom+"]["+roomId+"]["+userIds+"]");
	logger.trace("ルーム内情報（削除後）: [" + JSON.stringify(userIds) + "]");
	return roomId;
}

exports.getBoardUserInfo = function(roomName){
	var ret = userIds[roomName] || [];
	ret = u.sortBy(ret);
	return ret;
}

