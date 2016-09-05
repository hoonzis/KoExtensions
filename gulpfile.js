"use strict";

var gulp = require('gulp');
var uglify = require('gulp-uglifyjs');
var watch = require('gulp-watch');
var plumber = require('gulp-plumber');
var browserify = require('gulp-browserify');

gulp.task('scripts', function() {
    // Single entry point to browserify
    gulp.src('src/koextensions.js')
        .pipe(browserify({
          insertGlobals : true
        }))
        .pipe(gulp.dest('./build'))
      });

gulp.task('uglify', function() {
    gulp.src('build/koextensions.js')
        .pipe(uglify('koextensions.min.js'))
        .pipe(gulp.dest('build'));
});


gulp.task('build', ['scripts','uglify'], function () {

});
gulp.task("default", ["build"], function () {
    gulp.watch('src/*.js', ['build']);
});
