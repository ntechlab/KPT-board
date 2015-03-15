<script>
  var newCategoryString = "[新規作成]";

  // プルダウンの値変更前に設定されていたカテゴリーを保持する。
  // カテゴリー対以下ダイアログで、キャンセルボタンを押した際に、前回の選択状態を設定するために利用。
  var previousSelectedCategory = "<%= category %>";

  var categories = [
     <% for(var i = 0; i < categories.length; i++){ %>
       "<%= categories[i] %>"<% if(i < categories.length - 1){%>,<%}%>
     <% } %>]

  function setUpCategory(){

    // カテゴリー要素の追加
    addCategory(categories);

	// カテゴリーの設定
	$('#category').val(previousSelectedCategory);

    var dialog = $("#dialog-form").dialog({
      autoOpen: false,
      height: 200,
      width: 450,
      modal: true,
      buttons: {
        "追加": function(){
          var newCategory = $('#newCategory').val();
          $('#newCategory').val("");

          // 既存のプルダウン要素リストを取得。
          var values = getPulldownOptionValues();

          // カテゴリー要素の追加
          addCategory(values, newCategory);

          $('#category').val(newCategory);

          dialog.dialog("close");
        },
        "キャンセル": function() {
          $('#newCategory').val("");
          $('#category').val(previousSelectedCategory);
          dialog.dialog("close");
        }
      }
    });

    $('#category').change(function (){
    	if($(this).val() === "[新規作成]"){
    		dialog.dialog("open");
    	} else {
    		previousSelectedCategory = $(this).val();
    	}
    });
  }

  function getPulldownOptionValues(newCategory){
	  // 既存のプルダウン要素リストを取得。
      var options = $('#category option');
      var values = $.map(options, function(option){
        var item = option["value"];
        if(item !== "" && item !== newCategoryString){
          ret = item;
        } else {
          ret = undefined;
        }
        return ret;
      });
      return values;
  }

  function addCategory(values, newCategory){

	  if(newCategory){
	      // 新規要素の場合にはリストに追加。
	      if(!_.contains(values, newCategory)){
	      	values.push(newCategory);
	      }
	  }
      // 要素リストをソートする。
      values = _.sortBy(values);

      // プルダウンの内容を空にする
      $('#category').empty();

      // プルダウン要素の追加
      values = ["", newCategoryString].concat(values);
      _.each(values, function(value){
        var $option = $('<option/>').val(value).text(value);
        $('#category').append($option);
      });
  }
</script>