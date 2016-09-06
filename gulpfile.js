"use strict";

var gulp = require('gulp');
var uglify = require('gulp-uglifyjs');
var watch = require('gulp-watch');
var plumber = require('gulp-plumber');
var browserify = require('gulp-browserify');
var qunit = require('gulp-qunit');

gulp.task('scripts', function() {
    // Single entry point to browserify
    gulp.src('src/koextensions.js')
        .pipe(browserify({
          standalone: 'koextensions'
        }))
        .pipe(gulp.dest('./build'));
      });

gulp.task('uglify', function() {
    gulp.src('build/koextensions.js')
        .pipe(uglify('koextensions.min.js'))
        .pipe(gulp.dest('build'));
});

gulp.task('test', ['scripts', 'uglify'], function() {
    return gulp.src('./tests/tests.html')
        .pipe(qunit());
});

gulp.task('build', ['scripts','uglify'], function () {
  console.log("Default task");
});

gulp.task("default", ["build"], function () {
    gulp.watch('src/*.js', ['build']);
});
