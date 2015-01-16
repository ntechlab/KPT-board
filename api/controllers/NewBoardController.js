/**
 * NewBoardController
 *
 * @description :: Server-side logic for managing Newboards
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
    
    index : function(req, res) {
		var loginInfo = Utility.getLoginInfo(req, res);
		res.view("newboard/index", {
			loginInfo: loginInfo,
			title: "",
			desc: ""
		});
    }
};

