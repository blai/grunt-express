'use strict';

var request = require('request');

module.exports = function (grunt) {
  grunt.registerTask('request', function(target) {
    var done = this.async();
    var url = this.args.join(':');

    request.get(url, function(err, res, body) {
      grunt.log.writeln('\nRequest URL: ' + url);
      if (err) {
        grunt.fatal(err);
      } else {
        grunt.log.writeln(body);
      }
      done();
    });
  });
}