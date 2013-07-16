'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    express: {
      defaults: {}
    }
  });

  // Load helper tasks
  grunt.loadTasks('../../tasks');
  // Load this express task
  grunt.loadTasks('../../../tasks');
  grunt.registerTask('default', ['express']);
};