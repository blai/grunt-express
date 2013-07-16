'use strict';

module.exports = function (grunt) {
  grunt.registerTask('delay', function(target) {
    setTimeout(this.async(), target || 3000);
  });
}