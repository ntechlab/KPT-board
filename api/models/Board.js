/**
* Board.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    title : {type : 'string', required : true},
    description : {type : 'string'},
    category : {type : 'string'},
    version : {type : 'string', defaultsTo: '1.1'},
    width : {type : 'integer', defaultsTo: 1600},
    height : {type : 'integer', defaultsTo: 800},
    bgType : {type : 'string', defaultsTo: 'image'},
    bgColor : {type : 'string', defaultsTo: ''},
    bgImage : {type : 'string', defaultsTo: '/images/background/background02.gif'},
    bgRepeatType : {type : 'string', defaultsTo: 'repeat'},
    bgSepV : {type : 'integer', defaultsTo: 1},
    bgSepH : {type : 'integer', defaultsTo: 1},
    bgSepLineWidth : {type : 'integer', defaultsTo: 3},
    bgSepLineColor : {type : 'string', defaultsTo: '#000000'},
    ticketData : {type : 'string', defaultsTo: 'ticket_blue_small:Keep:true,ticket_pink_small:Problem:true,ticket_yellow_small:Try:true,ticket_white_small:Memo:true'},
  }
};

