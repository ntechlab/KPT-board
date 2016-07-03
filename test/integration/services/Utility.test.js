describe('Utility', function() {


  describe('#find()', function() {
    it('trim', function (done) {
    	sails.log.debug("jjjjjjjjjjjjjj");
    	//var util = require('./services/Utility.js');
    	var res = Utility.trim(null, "JJJJJ  ");
    	console.log("res:"+res);
    	done();
    });
  });

});