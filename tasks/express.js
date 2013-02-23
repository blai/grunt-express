'use strict';

module.exports = function(grunt) {

  // Nodejs libs.
  var path = require('path');
  var fs = require('fs');

  // External libs.
  var connect = require('connect');
  var nopt = require('nopt');
  var supervisor = require('supervisor');

  function runServer(options, async) {
    var middleware = [];
    if (options.bases) {
      if (grunt.util._.isString(options.bases)) {
        options.bases = [options.bases];
      }
      // Connect requires the bases path to be absolute.
      options.bases = grunt.util._.map(options.bases, function(b) {
        return path.resolve(b);
      });

      grunt.util._.each(options.bases, function(b) {
        middleware = middleware.concat([
          // Serve static files.
          connect.static(b),
          // Make empty directories browsable.
          connect.directory(b)
        ]);
      });
    }

    // If --debug was specified, enable logging.
    if (grunt.option('debug')) {
      connect.logger.format('grunt', ('[D] server :method :url :status ' +
              ':res[content-length] - :response-time ms').magenta);
      middleware.unshift(connect.logger('grunt'));
    }

    var server;
    if (options.server) {
      try {
        server = require(options.server);
        if (typeof server.listen !== 'function') {
          grunt.fatal('Server should provide a function called "listen" which act as http.Server.listen');
        }
        if (typeof server.use !== 'function') {
          grunt.fatal('Server should provide a function called "use" which act as connect.use');
        }
      } catch (e) {
        grunt.fatal('Server "' + options.server + '" not found');
      }
      for (var i = 0; i < middleware.length; i++) {
        server.use(middleware[i]);
      }
    } else {
      server = connect.apply(null, middleware);
    }

    // Start server.
    server.listen(options.port, options.hostname, function() {
        grunt.log.writeln('Web server started on ' + options.hostname + ':' + options.port);
      })
      .on('error', function(err) {
        if (err.code === 'EADDRINUSE') {
          grunt.fatal('Port ' + options.port + ' is already in use by another process.');
        } else {
          grunt.fatal(err);
        }
      });

    if (options.keepalive) {
      async();
    }
  }

  grunt.registerMultiTask('express', 'Start an express web server.', function() {
    // Merge task-specific options with these defaults.
    var options = this.options({
      port: 3000,
      hostname: 'localhost',
      bases: '.', // string|array of each static folders
      keepalive: false,
      watchChanges: false,
      server: null
      // (optional) filepath that points to a module that exports a 'server' object that provides
      // 1. a 'listen' function act like http.Server.listen (which connect.listen does)
      // 2. a 'use' function act like connect.use
    });

    options.keepalive = this.flags.keepalive || options.keepalive;
      
    if (options.watchChanges) {
      delete options.watchChanges;
      var args = [];
      grunt.util._.each(options, function(value, key) {
        if (grunt.util._.isArray(value)) {
          value = value.join(',');
        } else {
          value = String(value);
        }
        args = args.concat('--' + key, value);
      });

      args = ['--', process.argv[1], '_express_'].concat(args);
      if (!grunt.option('debug')) {
        args.unshift('--quiet');
      }
      supervisor.run(args);
    } else {
      runServer(options, this.async);
    }
  });

  grunt.registerTask('_express_', 'Child process to start a connect server', function() {
    function watchFile (filename) {
      fs.watchFile(filename, function(oldStat, newStat) {
        if (newStat.mtime.getTime() !== oldStat.mtime.getTime()) {
          process.exit(0);
        }
      });
    }

    // hijack each module extension handler, and watch the file
    function injectWatcher(handler) {
      return function (module, filename) {
        watchFile(filename);
        handler(module, filename);
      };
    }

    for (var ext in require.extensions) {
      var handler = require.extensions[ext];
      require.extensions[ext] = injectWatcher(handler);
    }

    var options = nopt({
      port: Number,
      hostname: String,
      bases: String,
      keepalive: Boolean,
      server: [String, null]
    }, {
      port: ['--port'],
      hostname: ['--hostname'],
      bases: ['--bases'],
      keepalive: ['--keepalive'],
      server: ['--server']
    }, process.argv, 3);

    runServer(options, this.async);
  });
};