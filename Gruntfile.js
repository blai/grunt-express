'use strict';
var path = require('path');

module.exports = function(grunt) {

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    nodeunit: {
      tests: ['test/*_test.js']
    },

    watch: {
      options: {},
      express: {}
    },

    express: {
      defaults: {
        options: {
          server: path.resolve('./test/fixtures/express/lib/server'),
          serverreload: true
        }
      }
    }
  });

  grunt.loadTasks('test/tasks');
  grunt.loadTasks('tasks');

  grunt.registerTask('test', ['nodeunit']);
  grunt.registerTask('default', ['jshint', 'test']);
};