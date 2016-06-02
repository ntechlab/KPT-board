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
				cb();
			});
		} else {
			// It's very important to trigger this callback method when you are finished
			// with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
			cb();
		}
	});
};
