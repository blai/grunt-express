'use strict';

var path = require('path');

module.exports = function(grunt) {
  grunt.initConfig({
    express: {
      express: {
        options: {
          server: path.resolve('./lib/server')
        }
      }
    }
  });

  // Load helper tasks
  grunt.loadTasks('../../tasks');
  // Load this express task
  grunt.loadTasks('../../../tasks');
  grunt.registerTask('default', ['express']);
};