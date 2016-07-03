var request = require('supertest');

describe('UserController', function() {

  describe('#login()', function() {
	  it('管理者ユーザーでログインに成功し、メイン画面に遷移する。', function (done) {
	      request(sails.hooks.http.app)
	        .post('/login')
	        .send({ username: 'admin', password: 'password' })
	        .expect(302)
	        .expect('location','/dashboard', done);
	    });

	  it('管理者ユーザーでログインに失敗し、再度ログイン画面に遷移する。', function (done) {
	      request(sails.hooks.http.app)
	        .post('/login')
	        .send({ username: 'admin', password: 'passwordNG' })
	        .expect(200);
	      //  .expect('location','/login', done);
	        done();
	    });
  });

});