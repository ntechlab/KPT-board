# KPTボード
###【利用方法】
０．必要なアプリケーションの準備<br/>
プロダクションモードで起動する場合にはmongodbをインストールする。下記【mongodbの準備と利用方法】参照。

１．パッケージインストール<br/>
適宜必要なパッケージをインストールする。<br/>
dashboard直下で、npm installを実行する。
（もしくは、既にダウンロードしたnode_modulesディレクトリをdashboard直下にコピー。）

２．デフォルト管理アカウントの設定<br/>
config/bootstrap.js内のデフォルト管理アカウントを適宜修正。<br/>
▲パスワードを平文として含むため取扱に注意。<br/>
Sails.js起動時、指定したデフォルト管理アカウントが存在しない場合に作成する。<br/>

３．Sails起動<br/>
dashboard直下で以下のコマンドを実行：<br/>

developmentモードで起動する場合：<br/>
sails lift<br/>
（.tmpディレクトリ内にDBデータが格納されます。）<br/>

productionモードで起動する場合：<br/>
sails lift --prod<br/>
（この場合、別途mongodbが起動している必要があります。下記、【mongodbの準備と利用方法】を参照。）<br/>

４．ログイン<br/>
localhost:1337/login<br/>
にアクセスしてログインして、ボード作成、チケット作成などの機能を利用する。<br/>
項目２で定義した値が管理アカウントの初期値となる。<br/>
usernameがアカウント、passwordがパスワードに対応。<br/>

###【mongodbの準備と利用方法】

#### 準備（productionモードで実行する場合にのみ必要）
１．mongodbのzip版をダウンロードして適当な場所に展開し、binフォルダをPATHに追加する。

２．mongodbのデータ格納フォルダを作成する。

３．以下のコマンドでmongodbを起動する：<br/>
mongod --dbpath （データ格納フォルダパス）

#### 利用方法

１．mongodbクライアントを起動する。<br/>
mongo

２．利用するDBを選択：<br/>
use sails

３．コマンドの例<br/>
以下のコマンドでticketコレクションのリストを表示<br/>
db.ticket.find()<br/>

以下のコマンドでticketコレクションにデータをインサート：<br/>
db.ticket.insert({name:'name01', message:'MESSAGE01', ...});

###ライセンス
Copyright &copy; 2014 New Technology Workshop<br>
Licensed under the MIT License.<br>
http://www.opensource.org/licenses/mit-license.php
