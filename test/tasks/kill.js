'use strict';

var path = require('path');
var request = require('request');

module.exports = function (grunt) {
  grunt.registerTask('kill', function(delay) {
    this.async();
    setTimeout(function() {
      process.kill('SIGINT');
    }, delay || 0);
  });
}