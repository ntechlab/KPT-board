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
 	width : 3840,
    height : 2160,
    bgType : 'image',
    bgColor : '',
    bgImage : BACKGROUND_REL_PATH + 'background02.gif',
    bgRepeatType :  'repeat',
    bgSepV : 1,
    bgSepH : 1,
    bgSepLineWidth : 3,
    bgSepLineColor : '#000000',
    ticketData : 'ticket_blue_small:Keep:true,ticket_pink_small:Problem:true,ticket_yellow_small:Try:true,ticket_white_small:Memo:true'
};

var logger = require('../Log.js').getLoggerWrapper("DashboardController");

var ticketData0 = [
   				{id: "ticket_blue_small", label: "青（小）"},
//				{id: "ticket_blue_big", label: "青（大）"},
				{id: "ticket_pink_small", label: "ピンク（小）"},
//				{id: "ticket_pink_big", label: "ピンク（大）"},
				{id: "ticket_yellow_small", label: "黄（小）"},
//				{id: "ticket_yellow_big", label: "黄（大）"},
				{id: "ticket_white_small", label: "白（小）"}
//				{id: "ticket_white_big", label: "白（大）"},
//				{id: "ticket_brown_small", label: "茶（小）"},
//				{id: "ticket_brown_big", label: "茶（大）"},
//				{id: "ticket_gray_small", label: "灰色（小）"},
//				{id: "ticket_gray_big", label: "灰（大）"},
//				{id: "ticket_green_small", label: "緑（小）"},
//				{id: "ticket_green_big", label: "緑（大）"},
//				{id: "ticket_orange_small", label: "オレンジ（小）"},
//				{id: "ticket_orange_big", label: "オレンジ（大）"},
//				{id: "ticket_purple_small", label: "紫（小）"},
//				{id: "ticket_purple_big", label: "紫（大）"}
			];

/**
 * 利用可能付箋タイプ一覧のデータを作成する。
 * @param req
 * @param ticketData2
 * @returns {String}
 */
function createTicketTypeString(req, ticketData2){
	var ret = "";
	var ticketData = createTicketDataArray(req, ticketData2);
	u.each(ticketData, function(d){
		var id = d["id"];
		ret += '<tr class="ticketDataRow" id="' + id + '">'
		+'<td style="text-align:center;vertical-align:middle;">'
		+'<label for="check_' + id + '" style="width:100%;">'
		+'<input class="ticketDataCheck" id="check_' + id + '" type="checkbox" ' + d["state"] + '/></label></td>'
		+'<td style="vertical-align:middle;" class="ticketDataType">' + d["label"] + '</td>'
		+'<td style="vertical-align:middle;"><input class="ticketDataName" style="width:100%;" value="' + d["name"] + '"/></td>';
		+'</tr>';
	});
	return ret;
}

/**
 * 利用可能付箋データ文字列を配列に変換する。
 * @param ticketData2 利用可能付箋データ文字列
 * @returns {Array} 利用可能付箋データ配列
 */
function createTicketDataArray(req, ticketData2) {
	var ticketData = [];
	var items;
	if(ticketData2){
		if(u.contains(ticketData2, ",")){
			items = ticketData2.split(",");
		} else {
			items = [ticketData2];
		}
	} else {
		items = [];
	}
	var map = {};
	u.each(items, function(item){
		var items2 = item.split(":");
		map[items2[0]] = {name: items2[1], state: items2[2] === "true" ? "checked" : ""};
	});
	u.each(ticketData0, function(d){
		var m = map[d["id"]];
		d["name"] = m ? m["name"] : "";
		d["state"] = m ? m["state"] : "";
		ticketData.push(d);
	});
	return ticketData;
}

function showEditView(req, res, id, loginInfo){
	logger.trace(req, "showEditView called: [" + id + "]");

	// 管理者ロールでない場合には、ボード作成画面を表示しない。
	if(loginInfo["roleName"] !== "admin"){
		logger.error(req, "一般ユーザーは更新画面を表示できません。");
		message = {type: "danger", contents: "画面の表示に失敗しました。"};
		Utility.openMainPage(req, res, message);
		return;
	}

	Board.findOne(id).exec(function(err,found){
	    if(err || !found || loginInfo["projectId"] !== found["projectId"]) {
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
				var ticketData2 = found["ticketData"] || BOARD_DEFAULT_VALUES["ticketData"];
				var ticketTypeList = createTicketTypeString(req, ticketData2);
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
						selectedId : req.param("selectedId"),
						ticketTypeList : ticketTypeList,
						loginInfo: loginInfo
					});
				}
				var errorCb = function(err){
					logger.error(req, "ボード情報の取得に失敗しました。"+JSON.stringify(err));
				    message = {type: "danger", contents: "ボード情報の取得に失敗しました。"};
					Utility.openMainPage(req, res, message);
				};
				Utility.getCategoryList(req, res, successCb, errorCb);
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
		Board.find({projectId: loginInfo["projectId"]}).sort({"title":-1}).exec(function(err, found) {
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
					category : req.param("category"),
					selectedId : req.param("selectedId"),
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
		if(!found || loginInfo["projectId"] !== found["projectId"]) {
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
			// ログインユーザーと同一のプロジェクトＩＤをもつユーザーを取得
			 User.find({projectId: loginInfo["projectId"]}).exec(function(err3, usersFound) {
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
				Board.find({projectId: loginInfo["projectId"]})
				.where({ id: { 'not': boardId }})
				.sort({"title":-1})
				.exec(function(err4, boards) {
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

			// DBから取得した利用可能付箋データから表示用データを抽出する。
			var ticketData = found["ticketData"] || BOARD_DEFAULT_VALUES["ticketData"];
			var ticketToUse = getTicketToUse(req, ticketData);

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
				category : req.param("category"),
				selectedId : req.param("selectedId"),
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

		// 管理者ロールでない場合には、ボードを削除できない。
		var loginInfo = Utility.getLoginInfo(req, res);
		if(loginInfo["roleName"] !== "admin"){
			logger.error(req, "一般ユーザーはボードを削除できません。");
			message = {type: "danger", contents: "処理に失敗しました。"};
			Utility.openMainPage(req, res, message);
			return;
		}

		// 削除対象ボードIDが設定されていない場合には、処理を行わずメイン画面に遷移。
		var message = null;
		if(id != null){
			logger.debug(req, "ボード削除処理 削除対象[" + id + "]");

			Board.findOne(id).exec(function(err2, found2){
				if(err2 || !found2 || found2.length === 0 || loginInfo["projectId"] !== found2["projectId"]) {
					logger.error(req, "ボード削除処理 失敗: [" + id + ","+ JSON.stringify(err2) + "]");
					message = {type: "danger", contents: "ボード削除に失敗しました[" + id + "]"};
					Utility.openMainPage(req, res, message);
					return;
				}
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

function getTicketToUse(req, ticketData){
	var array = createTicketDataArray(req, ticketData);
	// stateが"checked"の要素を抽出する。
	var ret = [];
	u.each(array, function(elem) {
		if(elem["state"] === "checked"){
			ret.push({name: elem["id"], display: elem["name"]});
		}
	});
	return ret;
}
