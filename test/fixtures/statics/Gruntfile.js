'use strict';

var path = require('path');

module.exports = function(grunt) {
  grunt.initConfig({
    express: {
      statics: {
        options: {
          bases: path.resolve('./public')
        }
      },
      multiStatics: {
        options: {
          bases: [path.resolve('./public'), path.resolve('./public2')],
          port: 4000
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