'use strict';

var fs = require('fs');
var path = require('path');
var touch = require('touch');
var connect = require('connect');


exports.touchFile = function touchFile(path) {
  touch.sync(path);
}

exports.makeServerTaskName = function makeServerTaskName(serverName, kind) {
  return 'express_' + serverName + '_' + kind;
}

exports.watchModule = function watchModule(watcher) {
  // hijack each module extension handler, and watch the file
  function injectWatcher(handler) {
    return function(module, filename) {
      fs.watchFile(filename, watcher);
      handler(module, filename);
    };
  }

  for (var ext in require.extensions) {
    var handler = require.extensions[ext];
    require.extensions[ext] = injectWatcher(handler);
  }
}

function insertMiddleware(server, index, middlewares) {
  if (middlewares.length == 0) {
    return; // nothing to do
  }
  var stackHolder = server._router || server;
  var stackCount = stackHolder.stack.length;
  middlewares.each(function (mw) {
    server.use(mw);
  });
  if (0 <= index && index < stackCount) { // need to reposition inserted items
    var insertedMiddleware = stackHolder.stack.splice(stackCount);
    [].splice.apply(stackHolder.stack, [index, 0].concat(insertedMiddleware));
  }
}

function findPlaceholder(server, placeholderName) {
  var stackHolder = server._router || server;
  return stackHolder.stack.findIndex(function (mw) {
    return mw.handle.name === placeholderName;
  });
}

function dumpStack(label, server) {
  var stackHolder = server._router || server;
  console.log(label);
  var items = [];
  stackHolder.stack.each(function (item) {
    var obj = {
      handle: item.handle,
      path: item.route && item.route.path
    };
    items.push(obj);
  });
  console.log(items);
}

exports.runServer = function runServer(grunt, options) {
  options = Object.merge({
    port: 3000,
    // hostname: 'localhost',
    bases: null, // string|array of each static folders
    server: null,
    showStack: false
    // (optional) filepath that points to a module that exportss a 'server' object that provides
    // 1. a 'listen' function act like http.Server.listen (which connect.listen does)
    // 2. a 'use' function act like connect.use
  }, options);

  var middlewares = options.middleware || [];

  var statics = [];
  if (options.bases) {
    // wrap each path in connect.static middleware
    options.bases.each(function(b) {
      statics.push(connect.static(b));
    });
  }

  var server;
  if (options.server) {
    try {
      server = require(path.resolve(options.server));
      if (typeof server.listen !== 'function') {
        grunt.fatal('Server should provide a function called "listen" that acts as http.Server.listen');
      }
      if (typeof server.use !== 'function') {
        grunt.fatal('Server should provide a function called "use" that acts as connect.use');
      }
    } catch (e) {
      var errorMessage = options.showStack ? '\n' + e.stack : e;
      grunt.fatal('Server ["' + options.server + '"] -  ' + errorMessage);
    }
  } else {
    server = connect();
  }

//  dumpStack('BEFORE', server);
  insertMiddleware(server, findPlaceholder(server, 'middlewarePlaceholder'), middlewares);
//  dumpStack('AFTER middleware', server);
  insertMiddleware(server, findPlaceholder(server, 'staticsPlaceholder'), statics);
//  dumpStack('AFTER statics', server);

  if (options.livereload && options.insertConnectLivereload !== false) {
    var lr = require('connect-livereload')({
      port: options.livereload
    });
    insertMiddleware(server, 0, [lr]);
//    dumpStack('AFTER livereload', server);
  }

  if (options.hostname === '*') {
    delete options.hostname;
  }

  // Start server.
  (function startServer (port) {

    // grunt.config.set(
    var args = [port,
      function() {
        server.emit('startListening', this);
        grunt.log.writeln('Web server started on port:' + port + (options.hostname ? ', hostname: ' + options.hostname : ', no hostname specified') + ' [pid: ' + process.pid + ']');
      }
    ];

    // always default hostname to 'localhost' would prevent access using IP address
    if (options.hostname) {
      args.splice(1, 0, options.hostname);
    }

    server.listen.apply(server, args)
      .on('error', function(err) {
        if (err.code === 'EADDRINUSE') {
          grunt.log.writeln('Port ' + port + ' in use');
          startServer(++port);
        } else {
          grunt.fatal(err);
        }
      });
    })(options.port);

  return server;
}
