# KPTボード
###【利用方法】
1. 必要なアプリケーションの準備  
プロダクションモードで起動する場合にはmongodbをインストールする。  
下記【mongodbの準備と利用方法】参照。  
動作確認環境の例）  
Windows 7 32bit, node.js v.0.10.26, mongodb v.2.6.3

2. パッケージインストール  
適宜必要なパッケージをインストールする。  
dashboard直下で、npm installを実行する。
（もしくは、既にダウンロードしたnode_modulesディレクトリをアプリルートディレクトリ直下にコピー。）

3. デフォルト管理アカウントの設定  
config/bootstrap.js内のデフォルト管理アカウントを適宜修正。  
▲パスワードを平文として含むため取扱に注意。  
Sails.js起動時、指定したデフォルト管理アカウントが存在しない場合に作成する。

4. Sails起動  
アプリルートディレクトリ直下で以下のコマンドを実行：  
    - developmentモードで起動する場合：  
      sails lift  
     （.tmpディレクトリ内にDBデータが格納されます。）  
    - productionモードで起動する場合：  
      sails lift --prod  
      （この場合、別途mongodbが起動している必要があります。
       下記、【mongodbの準備と利用方法】を参照。）  
   - ポートを変更したい場合（例：1338ポートで起動する）  
      sails lift --port 1338  
   - 利用するmongodbのデータベース名を変更したい場合（例：testを利用する）プロジェクト直下のconfigフォルダに、local.jsファイルを作成する。
        内容は以下：  
        module.exports.connections = {  
	      mongodbServer : {  
          database : 'test'  
	   }  
     }

5. ログイン  
http://localhost:1337/login  
にアクセスしてログインして、ボード作成、チケット作成などの機能を利用する。  
項目２で定義した値が管理アカウントの初期値となる。  
 - id=username
 - パスワード=password  

----

###【mongodbの準備と利用方法】###
#### 準備（productionモードで実行する場合にのみ必要）####
KPT-Bordでは、必要に応じてmongodbと組み合わせて利用できます。  

1. mongodbのzip版をダウンロードして適当な場所に展開し、binフォルダをPATHに追加する。

2. mongodbのデータ格納フォルダを作成する。

3. 以下のコマンドでmongodbを起動する：  
   mongod --dbpath （データ格納フォルダパス）

#### mongodb 利用方法 ####
1. mongodbクライアントを起動する。  
   mongo
2. 利用するDBを選択：  
   use sails
3. コマンドの例  
    - 以下のコマンドでticketコレクションのリストを表示  
      db.ticket.find()  
    - 以下のコマンドでticketコレクションにデータをインサート：  
      db.ticket.insert({name:'name01', message:'MESSAGE01', ...});

----

###ライセンス####
Copyright &copy; 2014 New Technology Workshop<br>
Licensed under the MIT License.<br>
http://www.opensource.org/licenses/mit-license.php
