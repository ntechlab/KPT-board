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

// 付箋イメージフォルダ
var TICKET_IMAGE_DIR = "/images/tickets/";

// ファイルアップロードと同時に背景画像を変更したい場合にはtrueにする。
var flagChangeBackgroundImage = false;

// チケット個別スタイル情報リスト
var ticketTypeList;

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

function showEditView(req, res, id, loginInfo){

	Board.findOne(id).exec(function(err,found){
	    if(err || !found) {
			sails.log.error("ボード編集時 ボード取得失敗: エラー発生:[" + found + "]:" + JSON.stringify(err));
			Utility.openMainPage(req, res, {type: "danger", contents: "エラーが発生しました:"+JSON.stringify(err)});
			return;
		} else {
			sails.log.debug("編集対象ボード[" + JSON.stringify(found) + "]");
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
				sails.log.debug(backgroundFileList);
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
					loginInfo: loginInfo
				});
			});
		}
	});
}

module.exports = {

	/**
	 * ボード一覧画面を開く
	 */
    index : function(req, res) {
	    sails.log.debug("action: DashboardController.index");
		var loginInfo = Utility.getLoginInfo(req, res);
		var message;
		Board.find({}).sort({"title":-1}).exec(function(err, found) {
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

	 // チケット個別スタイル
	 var ticketCssString;

	 //コンボボックスメニューHTML
	 var comboMenu;

	 // コンテクストメニューHTML
	 var contextMenu = "";

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

		// 第1段階で終了すべき関数を格納する。
		var prerequisite = [];

		// ニックネーム対応マップ（ユーザーIDとニックネームを対応させる）
		var userIdToNicknameMap = {};

		// 全ユーザーリストを取得しニックネーム対応マップを作成する。
		prerequisite.push(function(next) {
			 User.find().exec(function(err3, usersFound) {
				if(err3){
					sails.log.error("チケットのユーザーIDの検索: エラー発生:" + JSON.stringify(err3));
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

		// チケット画像読み込み処理関数を追加
		prerequisite.push(function(next){
			if(ticketTypeList === undefined) {
				sails.log.info("チケット画像読み込み");
				// チケット個別スタイル情報が存在しない場合のみ処理する。
				fs.readdir(ASSETS + TICKET_IMAGE_DIR, function(err, files){
					if (err) {
						throw err;
					}
					// 個別チケット情報を保持するオブジェクト
					var imageFileTxtMap = {};

					var imageFileList = [];

					files.forEach(function (file) {
						var path = ASSETS + TICKET_IMAGE_DIR + file;
						if(fs.statSync(path).isFile()){
							if(/\.txt$/.test(file)){
								// 画像情報ファイルの場合(txt)
								var contents = fs.readFileSync(path, 'utf-8');
								var imageFileName = file.replace(/\.txt$/, "");
								sails.log.info("チケット個別スタイル追加[" + imageFileName + "]:" + contents);
								imageFileTxtMap[imageFileName] = contents;
							} else {
								// それ以外の場合
								sails.log.info("画像ファイル追加[" + file + "]");
								// テンプレートパラメータ
								imageFileList.push(file);
							}
						}
					});
					ticketTypeList = [];
					u.each(imageFileList, function(imageFileName){
						var newObj = {imageFileName: imageFileName};
						if(imageFileTxtMap[imageFileName]){
							newObj["contents"] = imageFileTxtMap[imageFileName];
						}
						ticketTypeList.push(newObj);
					})
					next();
				});
			} else {
				next();
			}
		});

		// 前提とするすべての処理が完了した後で実行する関数（ビュー生成関数のラッパー生成）
		var done = function (){

			// TODO: ボードごとに利用可能付箋情報を持つ予定。
			var ticketToUse = [
				{name: "ticket_blue_small", display: "キープ(小)"},
				{name: "ticket_blue_big", display: "キープ(大)"},
				{name: "ticket_pink_small", display: "プロブレム(小)"},
				{name: "ticket_pink_big", display: "プロブレム(大)"},
				{name: "ticket_yellow_small", display: "トライ(小)"},
				{name: "ticket_yellow_big", display: "トライ(大)"}
			];

			// プルダウンメニューHTML設定ン
			comboMenu = createComboMenu(ticketToUse);

			// コンテクストメニューHTML設定
			contextMenu = createContextMenu(ticketToUse);

			// チケット個別スタイル
			// TODO: 対象ボードで利用できない付箋タイプに関するスタイルを含まないようにしたい。
			ticketCssString = createCss(ticketTypeList);

			// 各チケットにユーザーのニックネームを追加
			u.each(tickets, function(ticket){
				var createUser = ticket["createUser"];
				var nickname = userIdToNicknameMap[createUser];
				ticket["nickname"] = nickname ? nickname : "none";
			});

		    var obj = {
				ticketCss: ticketCssString, // チケット個別スタイル
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
	    sails.log.debug("action: DashboardController.editBoard["+id+"]");
	    var loginInfo = Utility.getLoginInfo(req, res);
		showEditView(req, res, id, loginInfo);
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
    },

    /**
     * ファイルのアップロード
     */
	uploadImageFile: function  (req, res) {
		sails.log.debug("action: DashboardController.uploadImageFile");

		// GET経由でのアップロードは許可しない。
		if(req.method === 'GET'){
			sails.log.warn("GETによるファイルアップロード要求が送られました。");
			return res.json({status: 'error', message : "処理が不正です。"});
		}
		var uploadFile = req.file('uploadFile');

		// TODO: ファイル名のチェックロジックを実装する。jpg,png,gif以外の場合にはエラーにするなど。

		var boardId = req.param("selectedId");
		sails.log.info("ボードID[" + boardId + "]");
		sails.log.info("アップロードファイル名[" + uploadFile + "]");

		// ファイルのアップロード処理
		uploadFile.upload({dirname: BACKGROUND_DIR}, function onUploadComplete (err, files) {
			sails.log.info("ファイルアップロード処理 開始");
			if (err) {
				sails.log.error(err);
				sails.log.error("ファイルアップロード時に例外発生");
				return res.json({status: 'error', message : "ファイルのアップロードに失敗しました。", error: err});
			}

			// アップロードしたファイル名の取得
			var filename = "";
			if(files && files.length > 0){
				filename = files[0].filename;
			}
			sails.log.info("アップロードファイル名[" + filename + "]");

			sails.log.info("ファイルアップロード処理 終了");
			return res.json({status: 'success', src : BACKGROUND_REL_PATH + filename});
		});
	},

	/**
	 * ファイル削除処理
	 */
	deleteImageFile: function  (req, res) {
		sails.log.debug("action: DashboardController.deleteImageFile");

		// GET経由での削除は許可しない。
		if(req.method === 'GET'){
			sails.log.warn("GETによるファイル削除要求が送られました。");
			return res.json({status: 'error', message : "処理が不正です。"});
		}

		var path = req.param("deleteImage");
		var fileName = "";
		if(path){
			var items = path.split("/");
			fileName = items[items.length - 1];
		}

		sails.log.info("削除ファイル名パス[" + path + "]");
		sails.log.debug("削除ファイル名[" + fileName + "]");

		// 指定された画像ファイルを削除する。
		var deletePath = BACKGROUND_DIR + fileName;
		var ret;
		fs.unlink(deletePath, function (err) {
			if (err) {
				sails.log.error(err);
				ret = {status: 'error', message : "画像の削除に失敗しました。", error: err};
			 } else {
				sails.log.info('画像を削除しました[' + deletePath + "]");
				ret = {status: 'success', src : BACKGROUND_REL_PATH + fileName};
			}
			return res.json(ret);
		});
	},

	getImageFileList : function  (req, res) {
		sails.log.debug("action: DashboardController.getImageFileList");
		fs.readdir(BACKGROUND_DIR, function(err, files){
			if (err) {
				sails.log.error(err);
				return res.json({status: 'error', error: err});
			}
			var backgroundFileList = [];
			files.filter(function(file){
				// .で始まるファイルは表示対象外とする。
				return fs.statSync(BACKGROUND_DIR + file).isFile() && /^[^\.]/.test(file);
			}).forEach(function (file) {
				backgroundFileList.push(BACKGROUND_REL_PATH + file);
			});
			sails.log.debug(backgroundFileList);
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
	ret += "." + className + " {background-image:url(/images/tickets/" + imageFileName + ");}\r\n";
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
