/**
 * NewBoardController
 *
 * @description :: Server-side logic for managing Newboards
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var logger = require('../Log.js').getLoggerWrapper("NewBoardController");

module.exports = {

    index : function(req, res) {
    	logger.trace(req, "index");
		var loginInfo = Utility.getLoginInfo(req, res);

		// 管理者ロールでない場合には、ボード作成画面を表示しない。
		if(loginInfo["roleName"] !== "admin"){
			logger.error(req, "一般ユーザーは新規作成画面を表示できません。");
		    message = {type: "danger", contents: "画面の表示に失敗しました。"};
			Utility.openMainPage(req, res, message);
			return;
		}
		var successCb = function(categories){
			res.view("newboard/index", {
				loginInfo: loginInfo,
				title: "",
				desc: "",
				category: "",
				categories: categories
			});
		}
		var errorCb = function(err){
			logger.error(req, "ボード情報の取得に失敗しました。" + JSON.stringify(err));
		    message = {type: "danger", contents: "ボード情報の取得に失敗しました。"};
			Utility.openMainPage(req, res, message);
		};
		Utility.getCategoryList(successCb, errorCb);
    }
};

