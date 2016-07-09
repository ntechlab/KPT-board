/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `config/404.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
  * etc. depending on your default view engine) your home page.              *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

	'post /api/getToken': 'RESTController.getToken',
	'post /api/ticket': 'RESTController.createTicket',
	'put /api/ticket': 'RESTController.updateTicket',
	'delete /api/ticket': 'RESTController.deleteTicket',
	'get /api/ticket': 'RESTController.listTicket',
	'put /api/ticketMove': 'RESTController.moveTicket',
	'get /api/board': 'RESTController.listBoard',
	'post /api/board': 'RESTController.createBoard',
	'put /api/board': 'RESTController.updateBoard',
	'delete /api/board': 'RESTController.deleteBoard',

	'/': 'DashboardController.index',
	'get /login': "AuthController.login",
	'post /login': 'AuthController.process',
	'get /logout': 'AuthController.logout',
	'post /dashboard/uploadImageFile': 'DashboardController.uploadImageFile',
	'get /dashboard/openBoard2/:selectedId': 'DashboardController.openBoard2',
	'get /dashboard/editBoard/:selectedId': 'DashboardController.editBoard',
	'post /dashboard/deleteBoard/:boardId': 'BoardController.deleteBoard',
	'get /usermanage/destroyUser/:target': 'UsermanageController.destroyUser', // �b��B���p���Ȃ��\��iURL�ɍ폜��̃��[�U�[ID���c�������Ȃ��j
	'post /usermanage/destroyUser/:target': 'UsermanageController.destroyUser', // �b��B
	'get /usermanage/updateUser/:target': 'UsermanageController.updateUser', // �b��
	'get /usermanage/openUpdateUser/:target': 'UsermanageController.openUpdateUser', // OK
	//'post /usermanage/openUpdateUser/:target': 'UsermanageController.openUpdateUser' // ���p���Ȃ�(URL�Ŏ��ʂł���`�ɂ��Ă����j

  /***************************************************************************
  *                                                                          *
  * Custom routes here...                                                    *
  *                                                                          *
  *  If a request to a URL doesn't match any of the custom routes above, it  *
  * is matched against Sails route blueprints. See `config/blueprints.js`    *
  * for configuration options and examples.                                  *
  *                                                                          *
  ***************************************************************************/

};
