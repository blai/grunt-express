'use strict';

var path = require('path');
var temp = require('temp');
var _ = require('lodash');

var util = require('../lib/util');

function monitorChildProcess(child, callback) {
	child.child.stdout.on('data', function(data) {
		if (new RegExp('\\[pid: ' + child.child.pid + '\\][\\n\\r]*$').test(data.toString())) {
			callback();
		}
	});
}

module.exports = function(grunt) {
  var DefaultLiveReloadPort = 35729;
  var watchDir = temp.mkdirSync('express');
  var serverMap = {};

  if (!grunt.task._tasks['watch']) {
    grunt.loadNpmTasks('grunt-contrib-watch');
  }

  grunt.registerMultiTask('express', function() {
    var thisTarget = this.target;
    var options = this.options({
      serverreload: false,
      livereload: false
    });

    serverMap[thisTarget] = options.serverKey = path.resolve(watchDir, thisTarget + '.server');
    util.touchFile(options.serverKey);

    if (options.bases) {
      if (!Array.isArray(options.bases)) {
        grunt.config.set('express.' + thisTarget + '.options.bases', [options.bases]);
        options.bases = [options.bases];
      }

      // wrap each path in connect.static middleware
      options.bases =_.map(options.bases, function(b) {
        return path.resolve(b);
      });
    }

    if (options.livereload === true) {
      options.livereload = DefaultLiveReloadPort;
    }
    if (options.livereload) {
      // dynamically add `grunt-contrib-watch` task to manage livereload of static `bases`
      grunt.config.set('watch.' + util.makeServerTaskName(thisTarget, 'livereload'), {
        files: _.map(options.bases, function(base) {
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

      var watching = 'undefined' !== typeof grunt.task._tasks.watch || 'undefined' !== typeof grunt.config.data.watch;
      // make sure `grunt-contrib-watch` task is loaded
      if (!watching) {
        grunt.loadNpmTasks('grunt-contrib-watch');
      }

      // dynamically add `grunt-contrib-watch` task to manage `grunt-express` sub task
      grunt.config.set('watch.' + util.makeServerTaskName(thisTarget, 'server'), {
        files: options.serverKey,
        tasks: [['express-server', thisTarget, options.serverKey].join(':'), 'express-keepalive'],
        options: _.extend({}, options.watch, watcherOptions)
      });

      if (_.filter(grunt.task._queue, function(task) {
        return !task.placeholder && task.task.name === 'watch';
      }).length === 0) {
        grunt.task.run('watch');
      }
    } else {
      grunt.task.run(['express-server', thisTarget].join(':'));
    }
  });

  grunt.registerTask('express-start', 'Start the server (or restart if already started)', function(target) {
    util.touchFile(serverMap[target]);
  });
  // alias, backward compatibility
  grunt.registerTask('express-restart', 'Restart the server (or start if not already started)' ['express-start']);

  grunt.registerTask('express-server', function(target) {
    var self = this;
    var options = _.extend({}, grunt.config.get('express.options'), grunt.config.get('express.' + target + '.options'));
    if (options.livereload === true) {
      options.livereload = DefaultLiveReloadPort;
    }

    util.watchModule(function(oldStat, newStat) {
      if (newStat.mtime.getTime() !== oldStat.mtime.getTime()) {
        util.touchFile(self.args[1]);
      }
    });

    var done = this.async();

    util.runServer(grunt, options).on('startListening', function (server) {
      var serverPort = server.address().port;
      if (serverPort !== options.port) {
        grunt.config.set('express.' + target + '.options.port', serverPort);
      }
      grunt.event.emit('express:' + target + ':started');
      done();
    });
  });

  grunt.registerTask('express-keepalive', 'Keep grunt running', function() {
    this.async();
  });
};
