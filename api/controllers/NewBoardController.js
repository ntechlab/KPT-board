/**
 * NewBoardController
 *
 * @description :: Server-side logic for managing Newboards
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

    index : function(req, res) {
		var loginInfo = Utility.getLoginInfo(req, res);
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
			sails.log.error("ボード情報の取得に失敗しました。" + JSON.stringify(err));
		    message = {type: "danger", contents: "ボード情報の取得に失敗しました。"};
			Utility.openMainPage(req, res, message);
		};
		Utility.getCategoryList(successCb, errorCb);
    }
};

