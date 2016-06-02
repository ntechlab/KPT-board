require('date-utils');
var u = require("underscore");
var logger = require('../Log.js').getLoggerWrapper("Utility");

exports.getLoginInfo = function(req, res){
	var id = "";
	var nickname = "";
	var modelId = "";
	var projectId = "";
	if(req.session != null && req.session.passport != null){
	    id = req.session.passport.user || "";
	    nickname = req.session.passport.name || "";
	    modelId = req.session.passport.modelId || "";
	    role = req.session.passport.role || "";
	    projectId = req.session.passport.projectId || "";
	}
	var roleDesc = "";
	if(role === 'admin') {
		roleDesc = "&nbsp;（管理者）";
	}
	return {
		id: modelId,
		userId: id,
		userName: nickname,
		roleName: role,
		roleDesc : roleDesc,
		projectId: projectId
	};
};

exports.openMainPage = function(req, res, message){
	logger.trace(req, "Utility.js openMainPage[" + message + "]");
	var loginInfo = Utility.getLoginInfo(req, res);
	if(message){
		loginInfo.message = message;
	}
	Board.find({}).sort({"title":-1}).exec(function(err,found){
		if(err){
			logger.error(req, "メイン画面オープン時にエラー発生[" + JSON.stringify(err) +"]");
			found = [];
			loginInfo.message = {type: "danger", contents: "エラー発生:"+JSON.stringify(err)};
		}
		var categoryData = getCategoryMap(found);
		if( req.param("category") != null && req.param("selectedId") != null ){
			res.view("dashboard/index", {
				categoryData: JSON.stringify(categoryData),
				category : req.param("category"),
				selectedId : req.param("selectedId"),
//				title : req.param("title"),
				loginInfo: loginInfo
			});
		} else {
			res.view("dashboard/index", {
				categoryData: JSON.stringify(categoryData),
				category : req.param("category"),
				selectedId : req.param("selectedId"),
				loginInfo: loginInfo
			});
		}
	});
};

exports.getCanvasAppearance = function(boardData){
	var ret = "";
	var bgType = boardData["bgType"];
	var repeatType = boardData["bgRepeatType"];
	if(bgType === "color"){
		ret += "background-color: #"+boardData["bgColor"]+";\r\n";
	} else if(bgType === "image"){
		if(repeatType !== "cover"){
			ret += "background-repeat: " + repeatType + ";\r\n";
		} else {
			ret += "background-size: cover;\r\n";
		}
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

// 現在時刻を取得
exports.getDateTime = function(){
	var dt = new Date();
	var fmtDateTame = dt.toFormat("YYYY/MM/DD HH24:MI:SS");
	return fmtDateTame;
}

// カテゴリーのリストを取得する。
exports.getCategoryList = function(successCb, errorCb){
	Board.find({}).exec(function(err, found) {
		// ボードリストの取得に失敗した場合にはエラー処理コールバック関数を実行。
		if(err){
			if(errorCb){
				errorCb(err);
			}
			return;
		}
		var categories = getUniqueCategoryList(found);
		successCb(categories);
	});
}

// カテゴリ情報マップ（カテゴリリストとカテゴリごとのボードリスト）を取得する。
function getCategoryMap(boardsFound){
	var categories = getUniqueCategoryList(boardsFound);
	var boardInfos = _.map(boardsFound, function(item){
		return {id: item["id"], desc: item["description"], title: item["title"], category: item["category"] || ""};
	});
	var map = u.groupBy(boardInfos, function(item){
		return item["category"];
	});
	return {categories: categories, map: map};
}

// ソートし重複と空文字列を取り除いたカテゴリのリストを取得する。
function getUniqueCategoryList(boardsFound){
	var categories = u.pluck(boardsFound, 'category');
	categories = u.filter(categories, function(category){
		return category != null && category !== "";
	});
	categories = u.sortBy(categories);
	categories = u.uniq(categories, true);
	return categories;
}

function trim(req, input){
	var work = input || "";
	var ret = work.trim();
	if(input !== ret){
		logger.debug(req, "文字列トリム処理: [" + input + "]->[" + ret + "]");
	}
	return ret;
}

exports.getUniqueCategoryList = getUniqueCategoryList;
exports.getCategoryMap = getCategoryMap;
exports.trim = trim;