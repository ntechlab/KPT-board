/**
 * JSDocの作成
 */
module.exports = function(grunt) {
	grunt.config.set('jsdoc', {
		dist : {
			src: ['api/**/*.js', 'README.md'],
			options: {
				destination: 'doc/jsdoc',
				template : "node_modules/ink-docstrap/template",
				configure : "doc/conf_jsdoc/template/jsdoc.conf.json"
			}
		}
	});
	grunt.loadNpmTasks('grunt-jsdoc');
};
