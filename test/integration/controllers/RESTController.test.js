var request = require('supertest');

describe('RESTController', function() {

	var TOKEN_ADMIN1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
		+ ".eyJ1c2VyIjoiYWRtaW4xIiwidXNlcklkIjoyLCJpYXQiOjE0Njc1MzY0MDAsImV4cCI6MTQ2NzU0NzIwMH0"
		+ ".pzhmc0v_b4oy8PhNlVH9oq7ujQ3HsGuMccOtf1eRrlA";


	var TOKEN_USER1A = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
			".eyJ1c2VyIjoidXNlcjFBIiwidXNlcklkIjo0LCJpYXQiOjE0Njc1Mzg3NjYsImV4cCI6MTQ2NzU0OTU2Nn0" +
			".c83unmSPme1h5TmrufNviC7TKtMQmOR1XcKrwkemH_U";

	var BOARDID_BOARD1A = "1";
	var BOARDID_BOARD2A = "3";

	function execTestGetToken(name){
		return function(done){
			var list = { projectId: "P01", user: 'admin1', password: 'password' };
			list[name] = null;
			request(sails.hooks.http.app)
			.post('/api/getToken')
			.send(list)
			.expect('Content-Type', 'application/json; charset=utf-8')
			.expect(200, done)
			.expect(function(res){
//				console.log(res.body);
				var json = res.body;
				json.should.have.property('success', false);
				json.should.have.property('message', 'projectId, user, passwordが指定されていません');
			})
		}
	}

  describe('#getToken(req, res)', function() {
	  it('管理者ユーザーでの認証トークン取得に成功', function (done) {
	      request(sails.hooks.http.app)
	        .post('/api/getToken')
	        .send({ projectId: 'P01', user: 'admin1', password: 'password' })
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
//	        	console.log(res.body);
	        	var json = res.body;
	        	json.should.have.property('success', true);
	        	json.should.have.property('message', 'OK');
	        	// トークンの内容は見ていない。
	        })
	    });
	  it('管理者ユーザーでの認証トークン取得に失敗（projectId未設定）', execTestGetToken("projectId"));
	  it('管理者ユーザーでの認証トークン取得に失敗（user未設定）', execTestGetToken("user"));
	  it('管理者ユーザーでの認証トークン取得に失敗（password未設定）', execTestGetToken("password"));
	  it('管理者ユーザーでの認証トークン取得に失敗（projectId不一致）', function (done) {
	      request(sails.hooks.http.app)
	        .post('/api/getToken')
	        .send({ projectId: 'PNG', user: 'admin1', password: 'password' })
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', '認証に失敗しました。');
	        })
	    });
	  it('管理者ユーザーでの認証トークン取得に失敗（パスワード不一致）', function (done) {
	      request(sails.hooks.http.app)
	        .post('/api/getToken')
	        .send({ projectId: 'P01', user: 'admin1', password: 'passwordNG' })
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'パスワードが正しくありません[admin1]');
	        })
	    });
	  it('管理者ユーザーでの認証トークン取得に失敗（ユーザーが存在しない）', function (done) {
	      request(sails.hooks.http.app)
	        .post('/api/getToken')
	        .send({ projectId: 'P01', user: 'adminNG', password: 'password' })
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'ユーザー[adminNG]は存在しません');
	        })
	    });

  });


  describe('#createBoard(req, res)', function() {

	  it('管理者ユーザーでのボード作成に失敗（token未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .post('/api/board')
	        .send({ projectId: 'P01', user: 'admin1', password: 'password' })
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'ボード作成失敗');
	        })
	    });
	  it('管理者ユーザーでのボード作成に失敗（token不正）', function (done) {
	      request(sails.hooks.http.app)
	        .post('/api/board')
	        .send({ token: "NG"})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'ボード作成失敗');
	        })
	    });
	  it('管理者ユーザーでのボード作成に失敗（タイトル未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .post('/api/board')
	        .send({ token: TOKEN_ADMIN1})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', '必須項目が未入力です：[タイトル]');
	        })
	    });

	  it('管理者ユーザーでのボード作成に成功（タイトルのみ）', function (done) {
	      request(sails.hooks.http.app)
	        .post('/api/board')
	        .send({ token: TOKEN_ADMIN1,
	        		title: "TITLE01"})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
//	        	console.log(JSON.stringify(json));
	        	json.should.have.property('success', true);
	        	json.should.have.property('message', 'ボードを作成しました。［カテゴリ：, タイトル：TITLE01］');
	        	var board = json["board"];
	        	board.should.have.property('title', "TITLE01");
	        	// TODO: 単項目もアサートする。
	        })
	    });
	  //it('一般ユーザーはボードを作成できないこと', function (done) { throw new Error('テスト未作成'); });
  });


  describe('#updateBoard(req, res)', function() {

	  it('管理者ユーザーでのボード更新に失敗（token未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .put('/api/board')
	        .send({ projectId: 'P01', user: 'admin1', password: 'password' })
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'ボード更新失敗');
	        })
	    });
	  it('管理者ユーザーでのボード更新に失敗（boardId未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .put('/api/board')
	        .send({ token: TOKEN_ADMIN1})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', '必須項目が未入力です：[ボードＩＤ]');
	        })
	    });
	  it('管理者ユーザーでのボード更新に成功（説明を\"DESCRIPTION\"に変更）', function (done) {
	      request(sails.hooks.http.app)
	        .put('/api/board')
	        .send({ token: TOKEN_ADMIN1, boardId: BOARDID_BOARD1A, description: "DESCRIPTION"})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', true);
	        	json.should.have.property('message', 'ボード情報を更新しました。');
	        })
	    });
	  it('管理者ユーザーでのボード更新に失敗（プロジェクトＩＤが異なるため）', function (done) {
	      request(sails.hooks.http.app)
	        .put('/api/board')
	        .send({ token: TOKEN_ADMIN1, boardId: BOARDID_BOARD2A})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'ボード情報の更新に失敗しました（プロジェクトID不一致）');
	        })
	    });
	  it('管理者ユーザーでのボード更新に失敗（タイトルが\"\": タイトルを空にすることはできない）', function (done) {
	      request(sails.hooks.http.app)
	        .put('/api/board')
	        .send({ token: TOKEN_ADMIN1, boardId: BOARDID_BOARD1A, title: ""})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', '空のタイトルに変更することはできません。]');
	        })
	    });
	  it('管理者ユーザーでのボード更新に失敗（タイトルが\"    \": タイトルを空にすることはできない）', function (done) {
	      request(sails.hooks.http.app)
	        .put('/api/board')
	        .send({ token: TOKEN_ADMIN1, boardId: BOARDID_BOARD1A, title: ""})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', '空のタイトルに変更することはできません。]');
	        })
	    });
	  //it('一般ユーザーはボードを作成できないこと', function (done) { throw new Error('テスト未作成'); });
  });


  describe('#deleteBoard(req, res)', function() {

	  it('管理者ユーザーでのボード削除に失敗（token未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .delete('/api/board')
	        .send({ boardId: 'P01'})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'ボード削除失敗');
	        })
	    });

	  it('管理者ユーザーでのボード削除に失敗（boardId未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .delete('/api/board')
	        .send({ token: TOKEN_ADMIN1})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', '必須項目が未入力です：[ボードＩＤ]');
	        })
	    });

	  it('管理者ユーザーでのボード削除に成功', function (done) {
		  var boardIdToDelete = 5;
	      request(sails.hooks.http.app)
	        .delete('/api/board')
	        .send({ token: TOKEN_ADMIN1, boardId: boardIdToDelete})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', true);
	        	json.should.have.property('message', 'ボードを削除しました: [board1C]');
	        })
	    });
  });

  describe('#listBoard(req, res)', function() {

	  it('一般ユーザーでのボード一覧取得に失敗（token未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .get('/api/board')
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
//	        	console.log(JSON.stringify(json));
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'ボード一覧取得失敗:トークンが不正です');
	        })
	    });

	  it('一般ユーザーでのボード一覧取得に成功', function (done) {
	      request(sails.hooks.http.app)
	        .get('/api/board?token='+TOKEN_USER1A+"&projectId=P01")
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
//	        	console.log(JSON.stringify(json));
	        	json.should.have.property('success', true);
	        	json.should.have.property('message', 'ボード一覧を取得しました');
	        	var boards = json["board"];
//	        	console.log(JSON.stringify(boards));
	        })
	    });
  })

var ticketId = null;

describe('#createTicket(req, res)', function() {

	  it('一般ユーザーでのチケット作成に失敗（boardId未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .post('/api/ticket')
	        .send({ token: TOKEN_USER1A})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'ボードIDが指定されていません');
	        })
	    });

	  it('一般ユーザーでのチケット作成に成功（すべてデフォルト値）', function (done) {
	      request(sails.hooks.http.app)
	        .post('/api/ticket')
	        .send({ token: TOKEN_USER1A, boardId: BOARDID_BOARD1A})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
//	        	console.log(JSON.stringify(json));
	        	json.should.have.property('success', true);
	        	json.should.have.property('message', 'チケット作成に成功しました。');
	        	var ticket = json.ticket;
	        	ticket.should.have.property('positionX', '0');
	        	ticket.should.have.property('positionY', '0');

	        	// 作成したチケットＩＤを保持
	        	ticketId = ticket.id;

	        	// TODO: 他の値もアサートすること。
	        })
	    });

});

// ここでチケット更新テスト

describe('#updateTicket(req, res)', function() {

	it('一般ユーザーでのチケット更新に失敗（boardId未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .put('/api/ticket')
	        .send({ token: TOKEN_USER1A, id: ticketId})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'ボードIDが指定されていません');
	        })
	    });

	it('一般ユーザーでのチケット更新に失敗（id未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .put('/api/ticket')
	        .send({ token: TOKEN_USER1A, boardId: BOARDID_BOARD1A})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'チケットＩＤが指定されていません。');
	        })
	    });

	  it('一般ユーザーでのチケット更新に成功', function (done) {
	      request(sails.hooks.http.app)
	        .put('/api/ticket')
	        .send({
	        	token: TOKEN_USER1A,
	        	boardId: BOARDID_BOARD1A,
	        	id: ticketId,
	        	positionX: '10',
	        	positionY: '20'
	        })
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
//	        	console.log(JSON.stringify(json));
	        	json.should.have.property('success', true);
	        	json.should.have.property('message', 'チケットを更新しました。');
	        	var ticket = json.ticket;
	        	ticket.should.have.property('positionX', '10');
	        	ticket.should.have.property('positionY', '20');
	        	// TODO: 他の値もアサートすること。
	        })
	    });

});


describe('#deleteTicket(req, res)', function() {

	it('一般ユーザーでのチケット削除に失敗（id未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .delete('/api/ticket')
	        .send({ token: TOKEN_USER1A})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'チケットＩＤが指定されていません。');
	        })
	    });
	it('一般ユーザーでのチケット削除に失敗（boardId未設定）', function (done) {
	      request(sails.hooks.http.app)
	        .delete('/api/ticket')
	        .send({ token: TOKEN_USER1A, id: ticketId})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', false);
	        	json.should.have.property('message', 'ボードIDが指定されていません');
	        })
	    });
	  it('一般ユーザーでのチケット削除に成功', function (done) {
	      request(sails.hooks.http.app)
	        .delete('/api/ticket')
	        .send({ token: TOKEN_USER1A, id: ticketId, boardId: BOARDID_BOARD1A})
	        .expect('Content-Type', 'application/json; charset=utf-8')
	        .expect(200, done)
	        .expect(function(res){
	        	var json = res.body;
	        	json.should.have.property('success', true);
	        	json.should.have.property('message', 'チケットを削除しました。');
	        })
	    });
});

});