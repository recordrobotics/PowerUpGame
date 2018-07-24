
var browserSync = require('browser-sync').create();
var gulp        = require('gulp');
var reload      = browserSync.reload;

// Static server
gulp.task('default', function() {
    browserSync.init({
        server: {
            baseDir: "./"
        }
    });
	gulp.watch("*.html", [reload]);
	gulp.watch("./html/**", [reload]);
	gulp.watch("./posters/**", [reload]);
	gulp.watch("css/*.css", [reload]);
	gulp.watch("js/*.js", ['js-watch']);

});

gulp.task('js-watch', ['js'], function (done) {
		browserSync.reload();
		done();
});

// process JS files and return the stream.
gulp.task('js', function () {
		return gulp.src('js/*js')
});


