var gulp = require('gulp');
var ts = require('gulp-typescript');
var tsProject = ts.createProject('tsconfig.json');
var esp = require("espruino");

gulp.task("compile-ts", function () {
    var tsResult =
        tsProject.src()
            .pipe(tsProject());
            

    return tsResult.js.pipe(gulp.dest('./dist'));
});

gulp.task("copy-to-dist", () => {
    return gulp
        .src("src/**/*.js", { base: 'src' })
        .pipe(gulp.dest('./dist'));
});

gulp.task("app-to-dist",  ['compile-ts', 'copy-to-dist']);