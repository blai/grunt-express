# grunt-express [![Build Status](https://secure.travis-ci.org/blai/grunt-express.png?branch=master)](http://travis-ci.org/blai/grunt-express)

## grunt-express v1.0 beta
v1.0 is nearly a complete re-done, it acts as a higher-level grunt task that depends on (and consumes) `grunt-contrib-watch`. It will dynamically configure `watch` tasks based on your `express` task setup at runtime, and it will run `watch` if necessary. Here's the list of high level changes

1. use `grunt-contrib-watch` to manage reloading express server, instead of `forever-monitor` 
2. support both `livereload` and `serverreload`
3. if `serverreload` is set to `false` in `options`, then the following are true:
    * server will be started in the same process as your `grunt` (so developers can run debugger using Webstorm or other tools)
    * server will be run WITHOUT the `this.async()` call (you can optionally append the task `express-keepalive` to keep the server running), this allows you to run tests using grunt-express
4. if `serverreload` i
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

_note: `express` task will generate `static` and `directory` middleware for each of the `bases` you specified, and load them onto your server (or the generated server) object by calling `use()` function_

[project Gruntfile]: Gruntfile.js
[project unit tests]: test/express_test.js

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

#### middlewares (experimental)
Type: `Array`
Default: `null`

Try to mimic `grunt-contrib-connect`'s `middleware` options (and should work the same way). Like `bases` options, you can control the insertion point of your `middlewares` by adding a `middlewarePlaceholder`, like so:

```js
app.use(function middlewarePlaceholder(req, res, next) {
  return next();
});
```

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
In this example, `grunt express` (or more verbosely, `grunt express:server`) will start a static web server at `http://localhost:9001/`, with its base path set to the `www-root` directory relative to the gruntfile, and any tasks run afterwards will be able to access it.

```javascript
// Project configuration.
grunt.initConfig({
  express: {
    server: {
      options: {
        port: 9001,
        bases: 'www-root'
      }
    }
  }
});
```

You may specify more than one `bases` like so. Enhancing the above example, now your server will server static content from both `www-root` folder and `app/public` folder (both are relative path to the `Gruntfile.js`)

```javascript
// Project configuration.
grunt.initConfig({
  express: {
    server: {
      options: {
        port: 9001,
        bases: ['www-root', 'app/public']
      }
    }
  }
});
```

If you want your web server to use the default options, just omit the `options` object. You still need to specify a target (`uses_defaults` in this example), but the target's configuration object can otherwise be empty or nonexistent. In this example, `grunt express` (or more verbosely, `grunt express:uses_defaults`) will start a static web server using the default options.

```javascript
// Project configuration.
grunt.initConfig({
  connect: {
    uses_defaults: {}
  }
});
```

#### Multiple Servers
You can specify multiple servers to be run alone or simultaneously by creating a target for each server. In this example, running either `grunt connect:site1` or `grunt connect:site2` will  start the appropriate web server, but running `grunt connect` will run _both_. Note that any server for which the [keepalive](#keepalive) option is specified will prevent _any_ task or target from running after it.

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