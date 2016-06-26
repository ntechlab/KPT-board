/**
 * シンボリックリンク作成
 */
module.exports = function(grunt) {
	grunt.config.set('symlink', {
		prod: {
			dest: './.tmp/public/images/background',
			relativeSrc: '../../../upload/images/background',
			options: {type: 'dir'}
		},
		dev: {
			dest: './.tmp/public/images/background',
			relativeSrc: '../../../upload/images/background',
			options: {type: 'dir'}
		}
	});
	grunt.loadNpmTasks('grunt-symlink');

};
