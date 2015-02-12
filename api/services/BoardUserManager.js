var userIds = {};
var u = require('underscore');

exports.addBoardUser = function(roomName, userId){
	sails.log.debug("★addBoardUser["+roomName+", "+userId+"]");
	if(userIds[roomName] === undefined){
		userIds[roomName] = [];
	}
	var users = userIds[roomName];
	if(!u.contains(users, userId)){
		userIds[roomName].push(userId);
	}
	sails.log.debug("ルーム内情報（追加後）");
	sails.log.debug(userIds);
}

exports.removeBoardUser = function(userId){
	sails.log.debug("★removeBoardUser["+userId+"]");
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
	//sails.log.debug("ルーム内:inRoom["+inRoom+"]["+roomId+"]["+userIds+"]");
	sails.log.debug("ルーム内情報（削除後）");
	sails.log.debug(userIds);
	return roomId;
}

exports.getBoardUserInfo = function(roomName){
	var ret = userIds[roomName] || [];
	ret = u.sortBy(ret);
	return ret;
}

