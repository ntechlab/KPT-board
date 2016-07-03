/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on how policies work, see:
 * http://sailsjs.org/#/documentation/concepts/Policies
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.policies.html
 */


module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions (`true` allows public     *
  * access)                                                                  *
  *                                                                          *
  ***************************************************************************/

	// デフォルトではすべてのアクセスに認証が必要。
	'*': "authenticated",
	RESTController: {
		"getToken": true,
		"createTicket": true,
		"getTicket": true,
		"updateTicket": true,
		"deleteTicket": true,
		"moveTicket": true,
		"createBoard": true,
		"deleteBoard": true,
		"updateBoard": true,
		"listBoard": true
	},
	UserController: {
		// 暫定的に、ログインしていない場合にも、
		// ユーザー作成できるようにしている。
		"create": true,
	},
	AuthController: {
		// 認証コントローラーには常にアクセス可能。
		'*': true,
	},
	DashboardController: {
		// ダッシュボードコントローラーに対するアクセスは、
		// loginAuthで決定する。処理は、api/policies/loginAuth.js
		// に記述。
		'*':"loginAuth"
	}



  /***************************************************************************
  *                                                                          *
  * Here's an example of mapping some policies to run before a controller    *
  * and its actions                                                          *
  *                                                                          *
  ***************************************************************************/
	// RabbitController: {

		// Apply the `false` policy as the default for all of RabbitController's actions
		// (`false` prevents all access, which ensures that nothing bad happens to our rabbits)
		// '*': false,

		// For the action `nurture`, apply the 'isRabbitMother' policy
		// (this overrides `false` above)
		// nurture	: 'isRabbitMother',

		// Apply the `isNiceToAnimals` AND `hasRabbitFood` policies
		// before letting any users feed our rabbits
		// feed : ['isNiceToAnimals', 'hasRabbitFood']
	// }

};
