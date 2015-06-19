/**
 * DashboardController
 *
 * @description :: Server-side logic for managing dashboards
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

// underscore利用準備
var u = require('underscore');
var fs = require('fs');

var BACKGROUND_REL_PATH = "/images/background/";
var BACKGROUND_DIR = './upload' + BACKGROUND_REL_PATH;

// 資産フォルダ
var ASSETS = "assets";

// ファイルアップロードと同時に背景画像を変更したい場合にはtrueにする。
var flagChangeBackgroundImage = false;

// 背景情報のデフォルト値
var BOARD_DEFAULT_VALUES = {
	version : '1.1',
 	width : 1600,
    height : 800,
    bgType : 'image',
    bgColor : '',
    bgImage : BACKGROUND_REL_PATH + 'background02.gif',
    bgRepeatType :  'repeat',
    bgSepV : 1,
    bgSepH : 1,
    bgSepLineWidth : 3,
    bgSepLineColor : '#000000'
};

var logger = require('../Log.js').getLoggerWrapper("DashboardController");

function showEditView(req, res, id, loginInfo){
	logger.trace(req, "showEditView called: [" + id + "]");
	Board.findOne(id).exec(function(err,found){
	    if(err || !found) {
			logger.error(req, "ボード編集時 ボード取得失敗: エラー発生: [" + JSON.stringify(err) + "]");
			Utility.openMainPage(req, res, {type: "danger", contents: "エラーが発生しました:"+JSON.stringify(err)});
			return;
		} else {
			logger.debug(req, "編集対象ボード取得[" + JSON.stringify(found) + "]");
			fs.readdir(BACKGROUND_DIR, function(err, files){
				if (err) {
					throw err;
				}
				var backgroundFileList = [];
				files.filter(function(file){
					return fs.statSync(BACKGROUND_DIR + file).isFile();
				}).forEach(function (file) {
					backgroundFileList.push(BACKGROUND_REL_PATH + file);
				});
				logger.debug(req, backgroundFileList);
				var successCb = function(categories){
					res.view('dashboard/editBoard', { id: id,
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
						images: backgroundFileList,
						category: found["category"] || "",
						categories: categories,
						loginInfo: loginInfo
					});
				}
				var errorCb = function(err){
					logger.error(req, "ボード情報の取得に失敗しました。"+JSON.stringify(err));
				    message = {type: "danger", contents: "ボード情報の取得に失敗しました。"};
					Utility.openMainPage(req, res, message);
				};
				Utility.getCategoryList(successCb, errorCb);
			});
		}
	});
}

module.exports = {

	/**
	 * ボード一覧画面を開く
	 */
    index : function(req, res) {
	    logger.trace(req, "index called");
		var loginInfo = Utility.getLoginInfo(req, res);
		var message;
		Board.find({}).sort({"title":-1}).exec(function(err, found) {
			// ボードリストの取得に失敗した場合にはエラーメッセージを表示する。
			if(err){
				logger.error(req, "ボード一覧画面オープン時にエラー発生[" + JSON.stringify(err) +"]");
				found = [];
				message = {type: "danger", contents: "ボード一覧画面の表示に失敗しました。"};
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
							logger.info(req, "マイグレーション処理 開始");
							var board = found[num];
							var boardId = board["id"];
							logger.info(req, "マイグレーション対象ボード[" + boardId + "]");
							logger.info(req, "マイグレーション前[" + JSON.stringify(board) + "]");

							// 値が未指定の場合にはデフォルト値を設定する。
							var newBoard = u.defaults(_.clone(board), BOARD_DEFAULT_VALUES);
							delete newBoard["id"];
							delete newBoard["createdAt"];
							delete newBoard["updatedAt"];
							logger.info(req, "マイグレーション後[" + JSON.stringify(newBoard) + "]");

							// テーブル内容の更新
							Board.update(boardId, newBoard).exec(function(err2, updated) {
								if(err2) {
									logger.error(req, "ボード情報のマイグレーションに失敗しました:[" + boardId + "]: " + JSON.stringify(err2));
									ngIds.push(boardId);
								} else {
									logger.info(req, "ボード情報のマイグレーションに成功[" + boardId + "]");
								}
								logger.info(req, "マイグレーション処理 終了");
								next();
							});
						})
					})(i);
				}
			};

			// 第２段階処理
			var done = function() {
				logger.trace(req, "ボード一覧画面表示処理 開始");
				if(ngIds.length > 0){
					loginInfo.message = {type: "danger", contents: "ボード情報のマイグレーションに失敗しました：[" + ngIds + "]"};
				}
				var categoryData = Utility.getCategoryMap(found);
				res.view({
					categoryData: JSON.stringify(categoryData),
					loginInfo: loginInfo
				});
				logger.trace(req, "ボード一覧画面表示処理 終了");
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
    logger.trace(req, "openBoard2 called: ["+boardId+"]");
	var loginInfo = Utility.getLoginInfo(req, res);
    var message = null;

	 //コンボボックスメニューHTML
	 var comboMenu;

	 // コンテクストメニューHTML
	 var contextMenu = "";

	if(!boardId){
	    logger.warn(req, "ボードIDが存在しないためボード選択画面に遷移。");
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
			logger.error(req, "エラー発生: [" + JSON.stringify(err) + "]");
		    message = {type: "danger", contents: "エラーが発生しました[" + boardId + "]"};
			Utility.openMainPage(req, res, message);
			return;
		}
		if(!found) {
			logger.error(req, "指定されたボードIDが存在しないため、ボード選択画面に遷移[" + boardId + "]");
			message = {type: "warn", contents: "指定したボードIDが存在しません[" + boardId + "]"};
			Utility.openMainPage(req, res, message);
			return;
	    }
	    Ticket.find({boardId : boardId}).exec(function(err2, tickets) {

		// 第1段階で終了すべき関数を格納する。
		var prerequisite = [];

		// ニックネーム対応マップ（ユーザーIDとニックネームを対応させる）
		var userIdToNicknameMap = {};

		// 全ユーザーリストを取得しニックネーム対応マップを作成する。
		prerequisite.push(function(next) {
			 User.find().exec(function(err3, usersFound) {
				if(err3){
					logger.error(req, "チケットのユーザーIDの検索: エラー発生:" + JSON.stringify(err3));
				} else {
					u.each(usersFound, function(user){
						userIdToNicknameMap[user["id"]] = user["nickname"];
					});
				}
				next();
			});
		});

		var boardList;

		// ボードリスト取得処理関数を追加（移動先ボードリストとして利用）
		prerequisite.push(function(next) {
			    Board.find().where({ id: { 'not': boardId }}).sort({"title":-1}).exec(function(err4, boards) {
				if(err4) {
					logger.error(req, "ボードリストの取得: エラー発生: [" + JSON.stringify(err4) + "]");
					boardList = [];
					message = {type: "danger", contents: "エラーが発生しました。"};
					Utility.openMainPage(req, res, message);
					return;
				} else {
					boardList = boards || [];
				}

			// コールバック関数終了時にnext()を呼び出す。
			next();
		    });
		})

		// 前提とするすべての処理が完了した後で実行する関数（ビュー生成関数のラッパー生成）
		var done = function (){

			// TODO: ボードごとに利用可能付箋情報を持つ予定。一旦、色指定ができるようにしてみる
			var ticketToUse = [
				{name: "ticket_blue_small", display: "Keep(S)"},
				{name: "ticket_blue_big", display: "Keep(L)"},
				{name: "ticket_pink_small", display: "Problem(S)"},
				{name: "ticket_pink_big", display: "Plobrem(L)"},
				{name: "ticket_yellow_small", display: "Try(S)"},
				{name: "ticket_yellow_big", display: "Try(L)"},
				{name: "ticket_blue_small", display: "color-blue(S)"},
				{name: "ticket_blue_big", display: "color-blue(L)"},
				{name: "ticket_brown_small", display: "color-brown(S)"},
				{name: "ticket_brown_big", display: "color-brown(L)"},
				{name: "ticket_gray_small", display: "color-gray(S)"},
				{name: "ticket_gray_big", display: "color-gray(L)"},
				{name: "ticket_green_small", display: "color-green(S)"},
				{name: "ticket_green_big", display: "color-green(L)"},
				{name: "ticket_orange_small", display: "color-orange(S)"},
				{name: "ticket_orange_big", display: "color-orange(L)"},
				{name: "ticket_pink_small", display: "color-pink(S)"},
				{name: "ticket_pink_big", display: "color-pink(L)"},
				{name: "ticket_purple_small", display: "color-purple(S)"},
				{name: "ticket_purple_big", display: "color-purple(L)"},
				{name: "ticket_white_small", display: "color-white(S)"},
				{name: "ticket_white_big", display: "color-white(L)"},
				{name: "ticket_yellow_small", display: "color-yellow(S)"},
				{name: "ticket_yellow_big", display: "color-yellow(L)"}
				];

			// プルダウンメニューHTML設定
			comboMenu = createComboMenu(ticketToUse);

			// コンテクストメニューHTML設定
			contextMenu = createContextMenu(ticketToUse);

			// 各チケットにユーザーのニックネームを追加
			u.each(tickets, function(ticket){
				var createUser = ticket["createUser"];
				var nickname = userIdToNicknameMap[createUser];
				ticket["nickname"] = nickname ? nickname : "none";
			});

		    var obj = {
				comboMenu: comboMenu, // プルダウンメニューHTML
				contextMenu: contextMenu, // コンテクストメニューHTML
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
		wait(prerequisite, done);
	    });
    	});
    },

	/**
	 * ボード情報変更画面を開く
	 */
    editBoard : function(req, res) {
		var id = req.param("selectedId");
	    logger.trace(req, "editBoard: [" + id + "]");
	    var loginInfo = Utility.getLoginInfo(req, res);
		showEditView(req, res, id, loginInfo);
	},

	/**
	 * ボード削除処理
	 */
    deleteBoard : function(req, res) {
    	var id = req.param("selectedId");
		logger.trace(req, "deleteBoard: [" + id + "]");
		// 削除対象ボードIDが設定されていない場合には、処理を行わずメイン画面に遷移。
		var message = null;
		if(id != null){
			logger.debug(req, "ボード削除処理 削除対象[" + id + "]");
			Board.destroy(id).exec(function(err, found){
				if(err || (found && found.length === 0)) {
					logger.error(req, "ボード削除処理 失敗: [" + id + ","+ JSON.stringify(err) + "]");
					message = {type: "danger", contents: "ボード削除に失敗しました[" + id + "]"};
				} else {
					logger.info(req, "ボード削除処理 成功: [" + id + "]");
					message = {type: "success", contents: "ボードを削除しました: [" + found[0]["title"] + "]"};
				}
				Utility.openMainPage(req, res, message);
			});
		} else {
			logger.error(req, "ボード削除処理 ボードID未設定");
			message = {type: "danger", contents: "ボードIDが設定されていません。"};
			Utility.openMainPage(req, res, message);
		}
    },

    /**
     * ボード作成画面を開く
     */
    createBoard : function(req, res) {
    	logger.trace(req, "createBoard");
    	res.redirect('/newboard/index');
    },

    /**
     * ファイルのアップロード
     */
	uploadImageFile: function  (req, res) {
		logger.trace(req, "uploadImageFile");

		// GET経由でのアップロードは許可しない。
		if(req.method === 'GET'){
			logger.warn(req, "GETによるファイルアップロード要求が送られました。");
			return res.json({status: 'error', message : "処理が不正です。"});
		}
		var uploadFile = req.file('uploadFile');

		// TODO: ファイル名のチェックロジックを実装する。jpg,png,gif以外の場合にはエラーにするなど。

		var boardId = req.param("selectedId");
		logger.info(req, "ファイルアップロード処理: [" + boardId + "][" + uploadFile + "]");

		// ファイルのアップロード処理
		uploadFile.upload({dirname: BACKGROUND_DIR}, function onUploadComplete (err, files) {
			if (err) {
				logger.error(req, "ファイルアップロード処理 失敗[" + JSON.stringify(err) + "]");
				return res.json({status: 'error', message : "ファイルのアップロードに失敗しました。", error: err});
			}

			// アップロードしたファイル名の取得
			var filename = "";
			if(files && files.length > 0){
				filename = files[0].filename;
			}
			logger.info(req, "ファイルアップロード処理 成功: [" + filename + "]");
			return res.json({status: 'success', src : BACKGROUND_REL_PATH + filename});
		});
	},

	/**
	 * ファイル削除処理
	 */
	deleteImageFile: function  (req, res) {
		logger.trace(req, "deleteImageFile");

		// GET経由での削除は許可しない。
		if(req.method === 'GET'){
			logger.warn(req, "GETによるファイル削除要求が送られました。");
			return res.json({status: 'error', message : "処理が不正です。"});
		}

		var path = req.param("deleteImage");
		var fileName = "";
		if(path){
			var items = path.split("/");
			fileName = items[items.length - 1];
		}

		logger.debug(req, "ファイル削除処理: [" + path + "][" + fileName + "]");

		// 指定された画像ファイルを削除する。
		var deletePath = BACKGROUND_DIR + fileName;
		var ret;
		fs.unlink(deletePath, function (err) {
			if (err) {
				logger.error(req, "ファイル削除処理 失敗: [" + JSON.stringify(err) + "]");
				ret = {status: 'error', message : "画像の削除に失敗しました。", error: err};
			 } else {
				logger.info(req, "ファイル削除処理 成功: [" + deletePath + "]");
				ret = {status: 'success', src : BACKGROUND_REL_PATH + fileName};
			}
			return res.json(ret);
		});
	},

	getImageFileList : function  (req, res) {
		logger.trace(req, "getImageFileList");
		fs.readdir(BACKGROUND_DIR, function(err, files){
			if (err) {
				logger.error(req, "画像ファイルリスト取得処理 失敗: [" + JSON.stringify(err) + "]");
				return res.json({status: 'error', error: err});
			}
			var backgroundFileList = [];
			files.filter(function(file){
				// .で始まるファイルは表示対象外とする。
				return fs.statSync(BACKGROUND_DIR + file).isFile() && /^[^\.]/.test(file);
			}).forEach(function (file) {
				backgroundFileList.push(BACKGROUND_REL_PATH + file);
			});
			logger.debug(req, "画像ファイルリスト取得処理 成功: [" + backgroundFileList + "]");
			return res.json({status: 'success', images: backgroundFileList});
		});
	}
};

/**
 * チケット個別スタイルを生成
 * @param list チケットタイプリスト
 * @returns {String} スタイル文字列
 */
function createCss(ticketTypeList){
	var ret = "";
	u.each(ticketTypeList, function(ticketType){
		ret += createCssOfImage(ticketType);
	});
	return ret;
}

/**
 * チケット個別スタイル情報ファイルの内容からスタイルHTMLを作成する。
 *
 * 各行の先頭にクラス名を追加する。空行は無視する。
 */
function addMainClassName(mainClassName, contents){
	var lines = contents.replace(/\r/g, "").split("\n");
	var ret = u.map(lines, function(line){
		if(/^\s*$/.test(line)){
			//チケット空行のためスキップ
			return "";
		} else {
			return mainClassName + line;
		}
	}).join('\r\n');
	return ret;
}

/**
 * チケット単位の個別スタイル生成
 * @param ticketType チケットタイプ
 * @returns {String} スタイル文字列
 */
function createCssOfImage(ticketType){
	var imageFileName = ticketType["imageFileName"];
	var contents = ticketType["contents"];
	var className = imageFileName.substring(0, imageFileName.indexOf("."));
	var ret = "";
	if(contents){
		ret += addMainClassName("." + className, contents);
	}
	return ret;
}

/**
 * コンボボックスメニューHTML作成
 * @param displayTickets 対象ボードで利用可能なチケットタイプのリスト
 * @returns HTML文字列
 */
function createComboMenu(displayTickets){
	var ret = u.map(displayTickets, function(displayTicket){
	   return '<option value="'+ displayTicket.name + '">'+ displayTicket.display + '</option>';
    }).join("\r\n");
	return ret + "\r\n";
}

/**
 * コンテクストメニューHTML作成
 * @param displayTickets 対象ボードで利用可能なチケットタイプのリスト
 * @returns HTML文字列
 */
function createContextMenu(displayTickets){
	var ret = u.map(displayTickets, function(item){
	   return '{title: "'+item.display+'", cmd: "'+item.name+'"}';
    }).join("\r\n,");
	return ret;
}
