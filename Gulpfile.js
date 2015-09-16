var gulp = require('gulp');
var less = require('gulp-less');
var watch = require('gulp-watch');

gulp.task('less', function() {
    return gulp.src('less/style.less')
        .pipe(less({ paths : [ './less' ] }))
        .pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    gulp.watch('./less/*.less', ['less']);
});

gulp.task('default', ['less', 'watch']);
