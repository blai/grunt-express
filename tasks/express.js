'use strict';

var path = require('path');
var temp = require('temp');
var open = require('open');

var util = require('../lib/util');

require('sugar');

module.exports = function (grunt) {
  var DefaultLiveReloadPort = 35729;
  var watchDir = temp.mkdirSync('express');
  var serverMap = {};
  var parentcwd = process.cwd();

  // get npmTasks from grunt-express, not the parent Gruntfile
  process.chdir(path.join(__dirname, '../'));

  if (!grunt.task._tasks['watch']) {
    grunt.loadNpmTasks('grunt-contrib-watch');
  }

  if (!grunt.task._tasks['parallel']) {
    grunt.loadNpmTasks('grunt-parallel');
  }

  process.chdir(parentcwd);

  grunt.registerMultiTask('express', function () {
    var thisTarget = this.target;
    var options = this.options({
      serverreload: false,
      livereload: false,
      open: false
    });

    serverMap[thisTarget] = options.serverKey = path.resolve(watchDir, thisTarget + '.server');
    util.touchFile(options.serverKey);

    if (options.bases) {
      if (!Array.isArray(options.bases)) {
        grunt.config.set('express.' + thisTarget + '.options.bases', [options.bases]);
        options.bases = [options.bases];
      }

      // wrap each path in connect.static middleware
      options.bases = options.bases.map(function (b) {
        return path.resolve(b);
      });
    }

    if (options.livereload === true) {
      options.livereload = DefaultLiveReloadPort;
    }
    if (options.livereload) {
      // dynamically add `grunt-contrib-watch` task to manage livereload of static `bases`
      grunt.config.set('watch.' + util.makeServerTaskName(thisTarget, 'livereload'), {
        files: options.bases.map(function (base) {
          return base + '/**/*.*';
        }),
        options: {
          livereload: options.livereload
        }
      });
    }

    if (options.serverreload) {
      var watcherOptions = {
        interrupt: true,
        atBegin: true,
        event: ['added', 'changed']
      };

      // dynamically add `grunt-contrib-watch` task to manage `grunt-express` sub task
      grunt.config.set('watch.' + util.makeServerTaskName(thisTarget, 'server'), {
        files: options.serverKey,
        tasks: [
          ['express-server', thisTarget, options.serverKey].join(':'), 'express-keepalive'
        ],
        options: Object.merge(options.watch || {}, watcherOptions)
      });

      if (grunt.task._queue.filter(function (task) {
        return !task.placeholder && task.task.name === 'watch';
      }).length === 0) {
        grunt.task.run('watch');
      }
    } else {
      grunt.task.run(['express-server', thisTarget].join(':'));
    }
  });


  grunt.registerTask('express-start', 'Start the server (or restart if already started)', function (target) {
    util.touchFile(serverMap[target]);
  });
  // alias, backward compatibility
  grunt.registerTask('express-restart', 'Restart the server (or start if not already started)', ['express-start']);

  grunt.registerTask('express-server', function (target) {
    var self = this;
    var options = Object.merge(grunt.config.get('express.options') || {}, grunt.config.get('express.' + target + '.options'));
    if (options.livereload === true) {
      options.livereload = DefaultLiveReloadPort;
    }

    if (options.serverreload) {
      util.watchModule(function (oldStat, newStat) {
        if (newStat.mtime.getTime() !== oldStat.mtime.getTime()) {
          util.touchFile(self.args[1]);
        }
      });
    }

    var done = this.async();

    util.runServer(grunt, options).on('startListening', function (server) {
      var address = server.address();
      var serverPort = address.port;
      if (serverPort !== options.port) {
        grunt.config.set('express.' + target + '.options.port', serverPort);
      }

      if (options.open === true) {
        // https://github.com/joyent/node/blob/master/lib/_tls_wrap.js#L464
        var protocol = (!server.pfx && (!server.cert || !server.key)) ? 'http' : 'https';
        var hostname = address.address || 'localhost';
        if (hostname === '0.0.0.0') {
          hostname = 'localhost';
        }
        open(protocol + '://' + hostname + ':' + address.port);
      } else if (typeof options.open === 'string') {
        open(options.open);
      }

      grunt.event.emit('express:' + target + ':started');
      done();
    });
  });

  grunt.registerTask('express-keepalive', 'Keep grunt running', function () {
    this.async();
  });
};
