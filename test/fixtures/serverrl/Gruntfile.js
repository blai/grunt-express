'use strict';

var path = require('path');

module.exports = function(grunt) {
  grunt.initConfig({
    watch: {
      options: {},
      express: {
        files: __filename
      }
    },
    express: {
      serverrl: {
        options: {
          server: path.resolve('./lib/server'),
          serverreload: true
        }
      }
    }
  });

  // Load helper tasks
  grunt.loadTasks('../../tasks');
  // Load this express task
  grunt.loadTasks('../../../tasks');
  grunt.registerTask('default', ['express', 'watch']);
};