/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.bootstrap.html
 */

module.exports.bootstrap = function(cb) {
	var u = require('underscore');
	var fs = require('fs');
	var async = require('async');

	var BACKGROUND_REL_PATH = "/images/background/";

	//=========================================
	// デフォルト管理アカウント
	// パスワードを適宜変更してください。
	// ========================================
	var defaultAdmin = {
				username: "admin",
				password: "password",
				nickname: "Administrator",
				role: "admin",
				projectId: "P00", // デフォルトプロジェクトＩＤ
				flag1: 0
			};

	sails.log("初期データセットアップ");
	User.find({username : defaultAdmin["username"]}).exec(function (err, users){
		if(users.length == 0){
			sails.log("デフォルト管理アカウント作成");
			User.create(defaultAdmin).exec(function(err, cb2) {
				if(err){
					sails.log("管理アカウント作成に失敗");
					console.dir(err);
				} else {
					sails.log("管理アカウント作成に成功");
				};
			});
		} else {
			// It's very important to trigger this callback method when you are finished
			// with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
		}
		createImageDirs(cb);
	});


	function createImageDirs(cb){
		User.find().exec(function (err, users){
			var ids = u.unique(u.pluck(users, "projectId"));
			sails.log.info("存在するプロジェクトＩＤリスト:["+ids+"]");

			// 同期処理で各プロジェクトＩＤの画像格納フォルダを作成する。
			var functions = [];
			u.each(ids, function(projectId){
				functions.push(function (callback){
					var path = './upload' + BACKGROUND_REL_PATH+ projectId + "/";
					fs.mkdir(path, function(err) {
						if (err) {
							sails.log.info("画像格納フォルダ作成時しない:[" + path + "]");
						} else {
							sails.log.info("画像格納フォルダ新規作成:[" + path + "]");
						}
						callback(null, projectId);
					});
				});
			});

			async.series(functions, function (err, values) {
				sails.log.info("画像格納フォルダ作成結果:["+values+"]");
				cb();
			});
		});
	}
};
