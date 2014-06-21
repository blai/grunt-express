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

exports.rearrangeMiddleware = function rearrangeMiddleware(stackHolder) {
  stackHolder.stack = (stackHolder.stack || []).sortBy(function(mw) {
    return mw.handle.middlewarePriority || 99;
  });
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

exports.assignMiddlewaresPriority = function assignMiddlewaresPriority(main, statics, additionals) {
  var staticsPlaceholderIndex = -1;
  // find the `staticsPlaceholder` index from the group of middlewares injected by grunt config
  additionals.each(function(mw, index) {
    if (mw.name === 'staticsPlaceholder') {
      staticsPlaceholderIndex = index;
    }
  });

  var globalStaticsPlaceholderIndex = main.findIndex(function(mw) {
    return mw.handle.name === 'staticsPlaceholder';
  });
  var middlewarePlaceholderIndex = main.findIndex(function(mw) {
    return mw.handle.name === 'middlewarePlaceholder';
  });

  var mainStackPriorities = [1, 3, 5];
  var dynamicStack = [];
  var markers = [];
  if (globalStaticsPlaceholderIndex === -1) {
    if (staticsPlaceholderIndex !== -1) {
      [].splice.apply(additionals, [staticsPlaceholder, 0].concat(statics));

      dynamicStack.push(additionals.map(function(mw) {
        mw.middlewarePriority = 2;
      }));
    } else {
      dynamicStack.push(statics.concat(additionals).map(function(mw) {
        mw.middlewarePriority = 2;
      }));
    }

    if (middlewarePlaceholderIndex !== -1) {
      markers = [middlewarePlaceholderIndex];
    } else {
      markers = [main.length - 1];
    }
  } else {
    var temp;
    if (globalStaticsPlaceholderIndex < middlewarePlaceholderIndex) {
      temp = [statics, additionals];
      markers = [globalStaticsPlaceholderIndex, middlewarePlaceholderIndex];
    } else if (middlewarePlaceholderIndex !== -1) {
      temp = [additionals, statics];
      markers = [middlewarePlaceholderIndex, globalStaticsPlaceholderIndex];
    } else {
      temp = [statics, additionals];
      markers = [globalStaticsPlaceholderIndex, main.length - 1];
    }

    dynamicStack.push(temp[0].map(function(mw) {
      mw.middlewarePriority = 2;
    }));
    dynamicStack.push(temp[1].map(function(mw) {
      mw.middlewarePriority = 4;
    }));
  }

  var i = 0;
  var j = 0;
  while (j < markers.length) {
    while (i < markers[j]) {
      main[i++].handle.middlewarePriority = mainStackPriorities[j];
    }
    j++;
  }
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

  var server, stackHolder;
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

    stackHolder = server._router || server;
    if(stackHolder.stack) {
      this.assignMiddlewaresPriority(stackHolder.stack, statics, middlewares);
    }

    middlewares.concat(statics).each(function(mw) {
      server.use(mw);
    })
  } else {
    server = connect.apply(null, statics.concat(middlewares));
    stackHolder = server._router || server;
  }

  if (options.livereload && options.insertConnectLivereload !== false) {
    var lr = require('connect-livereload')({
      port: options.livereload
    });
    lr.middlewarePriority = -1;
    server.use(lr);
  }

  this.rearrangeMiddleware(stackHolder);
  // console.log(stackHolder.stack)

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
