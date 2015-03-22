/**
 * UpdateBoardController
 *
 * @description :: Server-side logic for managing Updateboards
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var logger = require('../Log.js').getLogger("UpdateBoardController");

module.exports = {

    index : function(req, res) {
    	logger.trace(req, "index");
	res.view();
    }

};

