/**
 * DashboardController
 *
 * @description :: Server-side logic for managing dashboards
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

// underscore利用準備
var u = require('underscore');

// 背景情報のデフォルト値
var BOARD_DEFAULT_VALUES = {
	version : '1.1',
 	width : 1600,
    height : 800,
    bgType : 'image',
    bgColor : '',
    bgImage : '/images/background/background02.gif',
    bgRepeatType :  'repeat',
    bgSepV : 1,
    bgSepH : 1,
    bgSepLineWidth : 3,
    bgSepLineColor : '#000000'
};

module.exports = {

	/**
	 * ボード一覧画面を開く
	 */
    index : function(req, res) {
	    sails.log.debug("action: DashboardController.index");
		var loginInfo = Utility.getLoginInfo(req, res);
		var message;
		Board.find({}).exec(function(err, found) {
			// ボードリストの取得に失敗した場合にはエラーメッセージを表示する。
			if(err){
				sails.log.error("メイン画面オープン時にエラー発生[" + JSON.stringify(err) +"]");
				found = [];
				message = {type: "danger", contents: "メイン画面の表示に失敗しました: "+JSON.stringify(err)};
				loginInfo.message = message;
				res.view({
					list: found,
					loginInfo: loginInfo
				});
				return;
			}

			// 同期処理関数を作成
			var wait = function (callbacks, done) {
				var counter = callbacks.length;
				if(counter > 0){
					var next = function() {
						if (--counter == 0) {
							done();
						}
					};
					for (var i=0; i < callbacks.length; i++) {
						callbacks[i](next);
					};
				} else {
					done();
				}
			};

			// 第1段階で終了すべき関数
			var prerequisite = [];
			
			// ボードリストを取得した場合、必要に応じてボード情報のマイグレーションを行う。
			// 取得したボード情報にバージョンが指定されていない場合にはマイグレーション対象とする。
			var ngIds = [];
			for (var i = 0; i < found.length; i++) {
				if (found[i]["version"] === undefined) {
					// i番目のボードに関する処理を即時評価とクロージャーで作成し、同期実行配列に追加する。
					(function(num){
						prerequisite.push(function(next) {
							sails.log.debug("マイグレーション処理 開始");
							var board = found[num];
							var boardId = board["id"];
							sails.log.info("マイグレーション対象ボード[" + boardId + "]");
							sails.log.info("マイグレーション前[" + JSON.stringify(board) + "]");
	
							// 値が未指定の場合にはデフォルト値を設定する。
							var newBoard = u.defaults(_.clone(board), BOARD_DEFAULT_VALUES);
							delete newBoard["id"];
							delete newBoard["createdAt"];
							delete newBoard["updatedAt"];
							sails.log.info("マイグレーション後[" + JSON.stringify(newBoard) + "]");
							
							// テーブル内容の更新
							Board.update(boardId, newBoard).exec(function(err2, updated) {
								err2 ="dummy" + boardId;
								if(err2) {
									sails.log.error("ボード情報のマイグレーションに失敗しました:[" + boardId + "]: " + JSON.stringify(err2));
									ngIds.push(boardId);
								} else {
									sails.log.info("ボード情報のマイグレーションに成功[" + boardId + "]");
								}
								sails.log.debug("マイグレーション処理 終了");
								next();
							});
						})
					})(i);
				}
			};
			
			// 第２段階処理
			var done = function() {
				sails.log.debug("メイン画面表示処理 開始");
				if(ngIds.length > 0){
					loginInfo.message = {type: "danger", contents: "ボード情報のマイグレーションに失敗しました：[" + ngIds + "]"};
				}
				res.view({
					list: found,
					loginInfo: loginInfo
				});
				sails.log.debug("メイン画面表示処理 終了");
			};

			// 同期処理実行
			wait(prerequisite, done);
		});
    },

    /**
     * ボード画面を開く
     */
    openBoard2 : function(req, res) {
	var boardId = req.param("selectedId");
    sails.log.debug("action: DashboardController.openBoard2["+boardId+"]");
	var loginInfo = Utility.getLoginInfo(req, res);
    var message = null;
	if(!boardId){
	    sails.log.debug("ボードIDが存在しないためボード選択画面に遷移。");
		message = {type: "warn", contents: "ボードIDが指定されていません。"};
		Utility.openMainPage(req, res, message);
	    return;
	}

	var wait = function (callbacks, done) {
		var counter = callbacks.length;
		if(counter > 0){
			var next = function() {
				if (--counter == 0) {
					done();
				}
			};
			for (var i=0; i < callbacks.length; i++) {
				callbacks[i](next);
			};
		} else {
			done();
		}
	}

	Board.findOne(boardId).exec(function(err,found){
		if(err){
			sails.log.error("エラー発生: " + JSON.stringify(err));
		    message = {type: "danger", contents: "エラーが発生しました: " + JSON.stringify(err)};
			Utility.openMainPage(req, res, message);
			return;
		}
		if(!found) {
			sails.log.error("指定されたボードIDが存在しないため、ボード選択画面に遷移[" + boardId + "]");
			message = {type: "warn", contents: "指定したボードIDが存在しません[" + boardId + "]"};
			Utility.openMainPage(req, res, message);
			return;
	    }
	    Ticket.find({boardId : boardId}).exec(function(err2, tickets) {

		// 第1段階で終了すべき関数
		var prerequisite = [];

		// 対象ボード上のチケットにニックネームを追加する。
		for(var i = 0; i < tickets.length; i++) {

		    // インデックス番号を保持するためのクロージャー
		    new function(num){
			var ti = tickets[num];

			// 各チケットに対するニックネーム取得処理のラッパ関数をprerequisiteに格納
			// TODO: チケットごとにユーザー検索を行っており効率が悪い。改良予定。
			prerequisite.push(function(next) {
				var createUser = ti["createUser"];
			    User.findOne(createUser).exec(function(err3, userFound) {
				if(err3){
					sails.log.error("チケットのユーザーIDの検索: エラー発生: " + createUser + "," + JSON.stringify(err3));
				} else {
					if(userFound){
					    // ニックネームをチケットに追加。
					    ti["nickname"] = userFound["nickname"];
					} else {
						sails.log.warn("チケットのユーザーIDの検索: 結果なし[" + createUser + "]");
					}
				}
				// コールバック関数終了時にnext()を呼び出す。
				next();
			    });
			})
		    }(i);
		};
		var boardList;
		prerequisite.push(function(next) {
		    Board.find().where({ id: { 'not': boardId }}).exec(function(err4, boards) {
				if(err4) {
					sails.log.error("ボードリストの取得: エラー発生: " + JSON.stringify(err4));
					boardList = [];
					message = {type: "danger", contents: "エラーが発生しました: " + JSON.stringify(err4)};
					Utility.openMainPage(req, res, message);
					return;
				} else {
					boardList = boards || [];
				}

			// コールバック関数終了時にnext()を呼び出す。
			next();
		    });
		})


		// ビュー生成関数のラッパー生成
		var createViewWrapper = function (){
		    var obj = {
				boardId: boardId,
				loginInfo: loginInfo,
				title : found["title"],
				description: found["description"],
				ticketData : tickets,
				boardList : boardList,
				list : tickets,
				width: found["width"],
				height: found["height"],
				bgImage: found["bgImage"],
				bgRepeatType: found["bgRepeatType"],
				bgSepV: found["bgSepV"],
				bgSepH: found["bgSepH"],
				bgSepLineWidth: found["bgSepLineWidth"],
				bgSepLineColor: found["bgSepLineColor"],
				canvasAppearance: Utility.getCanvasAppearance(found),
				boardAppearance: Utility.getBoardAppearance(found)
			};
			res.view(obj);
		};

		// 同期処理実行
		wait(prerequisite, createViewWrapper);
	    });
    	});
    },

	/**
	 * ボード情報変更画面を開く
	 */
    editBoard : function(req, res) {
		var id = req.param("selectedId");
	    sails.log.debug("action: DashboardController.editBoard["+id+"]");
		var loginInfo = Utility.getLoginInfo(req, res);

		Board.findOne(id).exec(function(err,found){
		    if(err || !found) {
				sails.log.error("ボード編集時 ボード取得失敗: エラー発生:[" + found + "]:" + JSON.stringify(err));
				Utility.openMainPage(req, res, {type: "danger", contents: "エラーが発生しました:"+JSON.stringify(err)});
				return;
			} else {
				sails.log.debug("編集対象ボード[" + JSON.stringify(found) + "]");
				var fs = require('fs');
				var root = "assets";
				var path = "/images/background/";
				fs.readdir(root + path, function(err, files){
					if (err) {
						throw err;
					}
					var fileList = [];
					files.filter(function(file){
						return fs.statSync(root + path + file).isFile();
					}).forEach(function (file) {
						fileList.push(path + file);
					});
					sails.log.debug(fileList);
					res.view({ id: id,
						title :found["title"],
						description:found["description"],
						width: found["width"],
						height: found["height"],
						bgType:found["bgType"],
						bgColor:found["bgColor"],
						bgImage:found["bgImage"],
						bgRepeatType: found["bgRepeatType"],
						bgSepV: found["bgSepV"],
						bgSepH: found["bgSepH"],
						bgSepLineWidth: found["bgSepLineWidth"],
						bgSepLineColor: found["bgSepLineColor"],
						images: fileList,
						loginInfo: loginInfo
					});
				});
			}
		});
	},

	/**
	 * ボード削除処理
	 */
    deleteBoard : function(req, res) {
		var id = req.param("selectedId");
		sails.log.debug("action: DashboardController.deleteBoard["+id+"]");
		// 削除対象ボードIDが設定されていない場合には、処理を行わずメイン画面に遷移。
		var message = null;
		if(id != null){
			Board.destroy(id).exec(function(err, found){
				sails.log.debug("ボード削除 削除対象[" + JSON.stringify(found) + "]");
				if(err || (found && found.length === 0)) {
					sails.log.error("ボード削除時: エラー発生:" + JSON.stringify(err));
					message = {type: "danger", contents: "ボード削除に失敗しました[" + id + "]:" + JSON.stringify(err)};
				} else {
					sails.log.info("ボード削除：正常終了[" + id + "]");
					message = {type: "success", contents: "ボードを削除しました: [" + found[0]["title"] + "]"};
				}
				Utility.openMainPage(req, res, message);
			});
		} else {
			sails.log.info("ボード削除：ボードID未設定");
			message = {type: "danger", contents: "ボードIDが設定されていません。"};
			Utility.openMainPage(req, res, message);
		}
    },

    /**
     * ボード作成画面を開く
     */
    createBoard : function(req, res) {
		sails.log.debug("action: DashboardController.createBoard");
    	res.redirect('/newboard/index');
    }

};

