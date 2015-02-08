exports.getLoginInfo = function(req, res){
	var id = "";
	var nickname = "";
	var modelId = "";
	if(req.session != null && req.session.passport != null){
	    id = req.session.passport.user || "";
	    nickname = req.session.passport.name || "";
	    modelId = req.session.passport.modelId || "";
	    role = req.session.passport.role || "";
	}
	var roleDesc = "";
	if(role === 'admin') {
		roleDesc = "&nbsp;（管理者）";
	}
	return {id: modelId, userId: id, userName: nickname, roleName: role, roleDesc : roleDesc};
};

exports.openMainPage = function(req, res, message){
	sails.log.debug("Utility.openMainPage[" + message + "]");
	var loginInfo = Utility.getLoginInfo(req, res);
	if(message){
		loginInfo.message = message;
	}
	Board.find({}).exec(function(err,found){
		if(err){
			sails.log.error("メイン画面オープン時にエラー発生[" + JSON.stringify(err) +"]");
			found = [];
			loginInfo.message = {type: "danger", contents: "エラー発生:"+JSON.stringify(err)};
		}
		res.view("dashboard/index", {
			list: found,
			loginInfo: loginInfo
		});
	});
};

exports.getCanvasAppearance = function(boardData){
	var ret = "";
	var bgType = boardData["bgType"];
	if(bgType === "color"){
		ret += "background-color: #"+boardData["bgColor"]+";\r\n";
	} else if(bgType === "image"){
		ret += "background-repeat: "+boardData["bgRepeatType"]+";\r\n";
		ret += "background-image:url("+boardData["bgImage"]+");\r\n";
	}
	ret += "width: "+boardData["width"]+";\r\n";
	ret += "height: "+boardData["height"]+";\r\n";
	return ret;
}

exports.getBoardAppearance = function(boardData){
	var ret = "";
	ret += "width: "+boardData["width"]+"px;\r\n";
	ret += "height: "+boardData["height"]+"px;\r\n";
	ret += "position:relative;";
	return ret;
}
