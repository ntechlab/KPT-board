/**
* Ticket.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

    attributes: {
		boardId : {
		    type : 'integer'
		},
		createUser : {
		    type: 'string'
		},
		contents : {
		    type: 'string'
		},
		positionX : {
			type: 'string'
		},
		positionY : {
			type: 'string'
		},
		color : {
			type: 'string'
		}
    }
};

