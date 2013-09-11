# grunt-express [![Build Status](https://secure.travis-ci.org/blai/grunt-express.png?branch=master)](http://travis-ci.org/blai/grunt-express) [![Dependency Status](https://gemnasium.com/blai/grunt-express.png)](https://gemnasium.com/blai/grunt-express)

## grunt-express v1.0
v1.0 is nearly a complete re-done, it acts as a higher-level grunt task that depends on (and consumes) `grunt-contrib-watch`. It will dynamically configure `watch` tasks based on your `express` task setup at runtime, and it will run `watch` if necessary. Here's the list of high level changes

1. use `grunt-contrib-watch` to manage reloading express server, instead of `forever-monitor` 
2. support both `livereload` and `serverreload` (pre-v1.0 users: `grunt-express` will no longer manage to restart your server by default, you would have to set `serverreload` to `true` to regain the old behavior)
3. if `serverreload` is set to `false` in `options`, then the following are true:
    * server will be started in the same process as your `grunt` (so developers can run debugger using Webstorm or other tools)
    * server will be run WITHOUT the `this.async()` call (you can optionally append the task `express-keepalive` to keep the server running), this allows you to run tests using grunt-express
4. continue to support `socket.io` + `express` use cases
5. discontinue support of `express-stop`

> I am in process to add more test cases to cover all use cases



## Sample app
[grunt-express-angular-example](https://github.com/blai/grunt-express-angular-example) is a minimal example that shows how you can use `grunt-express` to run a basic `express` server that hosts an Angular app, it is based on @bford's Yeoman generator `generator-angular`.



## Getting Started
This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-express --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-express');
```


## Express task

### express (main task, Multi Tasks)
_Run this task with the `grunt express` command._

Configure one or more servers for grunt to start, the minimal config would be:

```javascript
  grunt.initConfig({
    express: {
      default_option: {}
    }
  });

  grunt.loadNpmTasks('grunt-express');

  grunt.registerTask('default', ['express']);
```

### express-start
### express-restart

Start your express server (or restart a server if it is already started).

### express-keepalive

Note that when `serverreload` is false, this server only runs as long as grunt is running. Once grunt's tasks have completed, the web server stops. This behavior can be changed by appending a `express-keepalive` task at the end of your task list like so

```javascript
grunt.registerTask('myServer', ['express', 'express-keepalive']);
```
Now when you run `grunt myServer`, your express server will be kept alive until you manually terminate it.

 Such feature can also be enabled ad-hoc by running the command like `grunt express express-keepalive`.

This design gives you the flexibility to use `grunt-express` in conjunction with another task that is run immediately afterwards, like the [grunt-contrib-qunit plugin](https://github.com/gruntjs/grunt-contrib-qunit) `qunit` task. If we force `express` task to be always async, such use case can no longer happen.



## Options

All options of `grunt-express` are optional, if you specify nothing, it will start a `connect` server using port 3000 (which serves nothing).

#### port
Type: `Integer`
Default: `3000`

The port on which the webserver will respond. The task will fail if the specified port is already in use.

#### hostname
Type: `String`
Default: `'localhost'`

The hostname the webserver will use. If set to `'*'`, server could be accessed from ip (e.g. 127.0.0.1) as well as `localhost`

#### bases
Type: `String|Array`
Default: `null`

The bases (or root) directories from which static files will be served. A `connect.static()` will be generated for each entry of `bases`. When `livereload` is set to `true` (or set to a specific port number), a `watch` task will be created for you (at runtime) to watch your `basePath/**/*.*`.

You may optionally define a placeholder middleware named `staticsPlaceholder` in your server's list of middlewares, and when one is defined, every `connect.static()` middleware generated from your `bases` will be inserted before your `staticsPlaceholder` middleware. If you do not define a `staticsPlaceholder`, your `connect.static()` will be appended at the end of the middleware stack.

##### `staticsPlaceholder` example
```js
app.use(function staticsPlaceholder(req, res, next) {
  return next();
});
```

#### server
Type: `String`
Default: null

This option allows you to specify a path to a Node.js module that exports a "connect-like" object. Such object should have the following two functions:

1. `use(route, fn)` (https://github.com/senchalabs/connect/blob/master/lib/proto.js#L62)
2. `listen()` (https://github.com/senchalabs/connect/blob/master/lib/proto.js#L227)
_note: you DO NOT want to call the listen() from within your server module, `express` task will take care of that for you_

The simplest example would be:
```js
var connect = require('connect');
module.exports = connect();
```

or if you prefer express.js
```js
var express = require('express');
var app = express();
app.get('/', function(req, res) {
  res.send('hello!');
});
module.exports = app;
```

or if you want to use both express and socket.io
```js
var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

exports = module.exports = server;
// delegates user() function
exports.use = function() {
  app.use.apply(app, arguments);
};
```

When `server` option is not set, `express` task will generate a plain `connect` object for you.

_note: `express` task will generate `static` middleware for each of the `bases` you specified, and load them onto your server (or the generated server) object by calling `use()` function_

#### livereload
Type: `Boolean|Number`
Default: `false`

This options allows you to define the livereload port (or if you set it to `true`, it will use the default livereload port: `35729`), and when you also define `bases` options, then the livereload server will be watching all contents under your `bases` folder, and perform livereload when those contents change.

When livereload is set, a [connect-livereload](https://github.com/intesso/connect-livereload) middleware will be inserted at the top of your server's middleware stack (so you don't have to do the extra step as intructed by [grunt-contrib-connnect's documentation](https://github.com/gruntjs/grunt-contrib-watch#enabling-live-reload-in-your-html))

#### serverreload
Type: `Boolean`
Default: `false`

Setting this option to `true` will tell `express` task to start a forever running server in a child process, and if any of your server scripts change, the server will be restarted (using a dynamically generated `watch` task)

When this options is not set (or set to `false`), the server will be running in the same process as grunt, and will only live as long as the grunt process is running. You may optionally use `express-keepalive` task to keep it alive.

#### showStack
Type: `Boolean`
Default: `false`

Setting this option to `true` will tell `express` task to show the full error stack, if an error occurs in your `express` server.

#### watch (experimental)
Type: `Object`

If you set `serverreload` (to `true`), a `grunt-contrib-watch` task config would be generated for you to manage the express server. In which case, you can optionally define a `watch` option to control the configuration of such `watch` task. There are, however, a few settings (that `grunt-express` is relying on) you may not change, they are as follow:

```js
var watcherOptions = {
  interrupt: true,
  atBegin: true,
  event: ['added', 'changed']
}
```

#### middleware (experimental)
Type: `Array`
Default: `null`

Try to mimic `grunt-contrib-connect`'s `middleware` options (and should work the same way). Like `bases` options, you can control the insertion point of your `middleware` by adding a `middlewarePlaceholder`, like so:

```js
app.use(function middlewarePlaceholder(req, res, next) {
  return next();
});
```

#### open (mimics [grunt-contrib-connect#open](https://github.com/gruntjs/grunt-contrib-connect#open))
Type: `Boolean` or `String`
Default: `false`

Open the served page in your default browser. Specifying `true` opens the default server URL, while specifying a URL opens that URL.

#### monitor (WARN: no longer availabe in 1.0+)
#### Please use a trailing `serverreload` option instead
Type: `Object`
Default: `null`

Under the hood `grunt-express` uses [forever-monitor](https://github.com/nodejitsu/forever-monitor) to manage individual servers in separate child processes. This makes restarting the server automatically possible. This property allow you to pass in the `forever-monitor` options. When specified, the object will be used as the options hash when creating the forever monitor to manage the server in child process.

#### keepalive (WARN: no longer availabe in 0.20+)
#### Please use a trailing `express-keepalive` task instead
Type: `Boolean`
Default: `false`

Keep the server alive indefinitely. Note that if this option is enabled, any tasks specified after this task will _never run_. By default, once grunt's tasks have completed, the web server stops. This option changes that behavior.

#### monitor (WARN: no longer availabe in 1.0+)
#### debug (WARN: no longer availabe in 1.0+)
Type: `Boolean`
Default: `false`

Turning this option on will make the "supervised" express|connect instance output more debugging messages.



### Usage examples

#### Basic Use
In this example, `grunt express` (or more verbosely, `grunt express:server`) will start a static web server at `http://localhost:9000/`, with its base path set to the `public` directory relative to the gruntfile, and any tasks run afterwards will be able to access it.

```javascript
// Project configuration.
grunt.initConfig({
  express: {
    server: {
      options: {
        port: 9000,
        bases: 'public'
      }
    }
  }
});
```

You may specify more than one `bases` like so. Enhancing the above example, now your server will server static content from both `public` folder and `dist` folder (both are relative path to the `Gruntfile.js`)

```javascript
// Project configuration.
grunt.initConfig({
  express: {
    server: {
      options: {
        port: 9001,
        bases: ['public', 'dist']
      }
    }
  }
});
```

If you want your web server to use the default options, just omit the `options` object. You still need to specify a target (`uses_defaults` in this example), but the target's configuration object can otherwise be empty or nonexistent. In this example, `grunt express` (or more verbosely, `grunt express:uses_defaults`) will start a static web server using the default options.

```javascript
// Project configuration.
grunt.initConfig({
  express: {
    uses_defaults: {}
  }
});
```

But usually, you want to start an express server using your own express application script, like so:

```javascript
// Project configuration.
grunt.initConfig({
  express: {
    myServer: {
      server: path.resolve(__dirname, 'server.js')
      // if you do not define a port it will start your server at port 3000
    }
  }
});
```

#### Livereload (both server and browser)

`grunt-express` leaves the control on your hands to perform livereload for your express server and the browser contents (e.g. html, javascript, css). You can set the `livereload` and `serverreload` respectively like following:

```js
grunt.initConfig({
  express: {
    livereloadServer: {
      server: path.resolve(__dirname, 'server'),
      bases: path.resolve(__dirname, 'public'),
      livereload: true, // if you just specify `true`, default port `35729` will be used
      serverreload: true
    }
  }
});
```

If all you have are the browser side static contents, you can omit the `server` option (and of course, you would not set `serverreload` to `true` in this case, although it would not hurt to set it):

```js
grunt.initConfig({
  express: {
    myLivereloadServer: {
      bases: path.resolve(__dirname, 'public'),
      livereload: true
    }
  }
});
```
The above example is equivalent to the following:

```js
var LIVERELOAD_PORT = 35729;
var lrSnippet = require('connect-livereload')({ port: LIVERELOAD_PORT });
var mountFolder = function (connect, dir) {
  return connect.static(require('path').resolve(dir));
};

grunt.initConfig({
  watch: {
    options: {
      livereload: LIVERELOAD_PORT
    },
    files: [
      path.resolve(__dirname, 'public') + '/{,*/}*.*'
    ]
  },
  connect: {
    livereload: {
      options: {
        port: 3000,
        middleware: function (connect) {
          return [
            lrSnippet,
            mountFolder(connect, path.resolve(__dirname, 'public')),
            mountFolder(connect, yeomanConfig.app)
          ];
        }
      }
    }
  }
});
```

#### Managing static content and dynamic middlewares

Noted that `grunt-exress` translates each of your static folders (defined as `bases` option) into an instance of express.static() middleware. And in the case of `livereload` is `true` (or a port number), `grunt-express` will also insert a [connect-livereload](https://github.com/intesso/connect-livereload) middleware for you. This is unlike `grunt-contrib-connect`, where you have to define your own middleware to do so (which has the up side of having full flexibility). Also noted that `grunt-express` will rearrange your middlewares (at runtime) to make sure `connect-livereload` is at the top of your server's middleware stack (like `connect-livereload`'s documentation has suggested).

Starting v1.0, `grunt-express` also allow a dynamic list of middlewares to be passed in as option `middleware`, this is to mimic the popular `grunt-contrib-connect` [middleware feature](https://github.com/gruntjs/grunt-contrib-connect#middleware). There are some limitations on enabling this, and may not be fully funtional in all cases.

Usually, we also want to control the order of loading express middlewares, because sometimes they would only function with a particular loading order. `grunt-express` tries to give you such freedom with the introduction of `placeholder` middleware. Let's see an example. Say, you have the following express script:

```js
var express = require('express');
var passport = require('passport');
var app = express();


app.use(express.logger('dev'));

// I want to place any static content here
// but I want to define the location of these static content in `grunt-express` options like so:
//
// grunt.initConfig({
//  express: {
//    livereloadServer: {
//      server: path.resolve(__dirname, 'server'),
//      bases: [path.resolve(__dirname, 'public'), path.resolve(__dirname, '.tmp')],
//      livereload: true,
//      serverreload: true
//    },
//    productionServer: {
//      server: path.resolve(__dirname, 'server'),
//      bases: path.resolve(__dirname, 'dist')
//    }
//  }
// });
// Notice the name of the following middleware function
app.use(function staticsPlaceholder(req, res, next) {
  return next();
});

app.use(express.cookieParser());
app.use(express.session({ secret: 'i am not telling you' }));
app.use(express.bodyParser());

app.use(passport.initialize());
app.use(passport.session());

// here is where I want my dynamic middlewares be loaded
app.use(function middlewarePlaceholder(req, res, next) {
  return next();
});

app.use(myOtherMiddlewares);

…

```

`grunt-exress` also support an edge case where you put the `staticsPlaceholder` middleware as part of the `middlewares` being passed in as part of the options.


#### Multiple Servers
You can specify multiple servers to be run alone or simultaneously by creating a target for each server. In this example, running either `grunt express:site1` or `grunt express:site2` will  start the appropriate web server, but running `grunt connect` will run _both_. Note that any server for which the [keepalive](#keepalive) option is specified will prevent _any_ task or target from running after it.

```javascript
// Project configuration.
grunt.initConfig({
  express: {
    site1: {
      options: {
        port: 9000,
        bases: 'www-roots/site1'
      }
    },
    site2: {
      options: {
        port: 9001,
        bases: 'www-roots/site2'
      }
    }
  }
});
```

#### Custom express
Like the [Basic Use](#basic-use) example, this example will start a static web server at `http://localhost:9001/`, with its base path set to the `www-root` directory relative to the gruntfile. Unlike the other example, this will use your custom server script as referred to by `server`! We also set `keepalive` and `watchChanges` to true, so the server will run forever (until you terminate the command), also the server will restart when you apply any changes to your server script.

```javascript
// Project configuration.
grunt.initConfig({
  express: {
    custom: {
      options: {
        port: 9001,
        bases: 'www-root',
        server: path.resolve('./server/main')
      }
    }
  }
});
```

any in your `server/main.js`, we reuse the previous sample server script
```javascript
var express = require('express');
var app = express();
app.get('/', function(req, res) {
  res.send('hello!');
});
module.exports = app;
```
(open [localhost:9001](http://localhost:9001) and you should see "hello!")

Now let's change `server/main.js`'s content to:
```javascript
var express = require('express');
var app = express();
app.get('/', function(req, res) {
  res.send('bonjour!');
});
module.exports = app;
```
(refresh browser and you should see "bonjour!")


## Release History
 * 2013-07-16 `v1.0.0-beta` use grunt-contrib-watch, support both serverreload and livereload
 * 2013-04-25 `v0.3.3` use forever-monitor npm v1.2.1
 * 2013-03-24 `v0.3.2` fixed npm v1.2.15 compatibility issue
 * 2013-03-14 `v0.3.0` support 'debug-brk' option for launching server in child process (so it can be linked to a remote debugger); also point forever-monitor dependency to its github verion (has fix for accepting 'debug-brk' options)
 * 2013-03-13 `v0.2.2` do not defalt hostname to "localhost" when none is provided as that will prevent access to the server through IP addres
 * 2013-03-11 `v0.2.1` Make static directories not browsable as it breaks twitter bootstrap (suggested by @hmalphettes)
 * 2013-02-28 `v0.2.0` Switch to use forever-monitor (instead of node-supervisor). Removed "keepalive" option, instead enable the feature using "express-keepalive" task.
 * 2013-02-25 `v0.1.3` Fixes #1, changing option "watchChanges" to "supervisor".
 * 2013-02-24 `v0.1.1` Added missing "connect" dependency, factored out some logic to util.js.
 * 2013-02-23 `v0.1.0` first draft.

## [License-MIT](https://github.com/blai/grunt-express/blob/master/LICENSE-MIT)
