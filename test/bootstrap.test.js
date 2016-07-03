var sails = require('sails');
var fs = require('fs');


before(function(done) {

  // Increase the Mocha timeout so that Sails has enough time to lift.
  this.timeout(10000);

  // sails起動前にテストデータを配置する。
  var testDataSrc = './test/data/localDiskDbTest.db';
  var testDataDest = './.tmp/localDiskDbTest.db';
  fs.unlink(testDataDest, function (err) {
  	  if (err) throw err;
  	});
	  fs.createReadStream(testDataSrc)
	  .pipe(fs.createWriteStream(testDataDest));

  sails.lift({
	  // テスト用のログ設定ファイルを指定
	  log_config: "test/log4js_setting.json",

	  // sails.logの出力を抑止
	  log: {
	      level: 'silent'
	    },

	  // テスト用のデータファイルを利用
	  models: {
		  connection: 'localDiskDbTest'
	  }
  }, function(err, server) {
    if (err) return done(err);
    // here you can load fixtures, etc.
    done(err, sails);
  });
});

after(function(done) {
  // here you can clear fixtures, etc.
  sails.lower(done);
});