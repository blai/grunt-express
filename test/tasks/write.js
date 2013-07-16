'use strict';

var path = require('path');

module.exports = function (grunt) {
  grunt.registerTask('write', function() {
    console.log('here')
    var file = path.resolve(require.main.dirname, this.args[0]);
    gruntfile.write(file, this.args[1]);
  });
}