var passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy
	crypto = require('crypto');

passport.serializeUser(function(user, done) {
	done(null, user[0].id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

passport.use(new LocalStrategy(function(username, password, done) {

	User.findByUsername(username).exec(function(err, user) {
		if (err) {
		    sails.log.error("passport: auth ERROR[" + err +"]");
			return done(null, err);
		}
		if (!user || user.length < 1) {
		    sails.log.info("passport: auth INCORRECT_USER[" + username +"]");
			return done(null, false, {
				message : 'Incorrect User'
			});
		}
		var shasum = crypto.createHash('sha1');
		shasum.update(password);
		var hashed = shasum.digest('hex');
		if (hashed === user[0].password) {
		    sails.log.info("passport: auth OK[" + username + "]");
		    return done(null, user);
		} else {
		    sails.log.info("passport: auth NG[" + username + "]");
		    return done(null, false, {
			message : 'Invalid Password'
		    });
		}

	});
}));

module.exports = {
	http : {
		customMiddleware : function(app) {
			sails.log.info('express midleware for passport');
			app.use(passport.initialize());
			app.use(passport.session());
		}
	}
};
