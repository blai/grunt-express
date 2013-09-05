'use strict';

var fs = require('fs');
var path = require('path');
var grunt = require('grunt');
var request = require('request');
var http = require('http');
var helper = require('./helper');
var fixtures = path.join(__dirname, 'fixtures');

var useFixtures = ['defaults', 'statics', 'express', 'serverrl'];

function cleanUp() {
  useFixtures.forEach(function (fixture) {
    var files = fixture + '/node_modules';
    if (typeof files === 'string') {
      files = [files];
    }
    files.forEach(function (filepath) {
      filepath = path.join(fixtures, filepath);
      if (grunt.file.exists(filepath)) {
        grunt.file.delete(filepath);
      }
    });
  });
}

function setupFixture(fixture) {
  fs.symlinkSync(path.join(__dirname, '../node_modules'), path.join(fixtures, fixture, 'node_modules'));
}

exports.simple = {
  setUp: function (done) {
    cleanUp();
    useFixtures.forEach(setupFixture);
    done();
  },
  tearDown: function (done) {
    cleanUp();
    done();
  },

  defaults: function (test) {
    test.expect(1);
    var cwd = path.resolve(fixtures, 'defaults');
    var assertExpress = helper.assertTask([
      'express',
      'request:http://localhost:3000'
    ], {
      cwd: cwd
    });

    assertExpress(null,
      function (result) {
        helper.verboseLog(result);
        test.ok(result.match(/Web server started on port:3000/), 'Default server should start');
        test.done();
      });
  },

  statics: function (test) {
    test.expect(1);
    var cwd = path.resolve(fixtures, 'statics');
    var assertExpress = helper.assertTask([
      'express:statics',
      'request:http://localhost:3000/test.html'
    ], {
      cwd: cwd
    });

    assertExpress(null,
      function (result) {
        helper.verboseLog(result);
        test.ok(result.match(/Test Static/gm), 'Server should serve static folder');
        test.done();
      });
  },

  multipleStatics: function (test) {
    test.expect(2);
    var cwd = path.resolve(fixtures, 'statics');
    var assertExpress = helper.assertTask([
      'express:multiStatics',
      'request:http://localhost:4000/test.html',
      'request:http://localhost:4000/test2.html'
    ], {
      cwd: cwd
    });

    assertExpress(null,
      function (result) {
        helper.verboseLog(result);
        test.ok(result.match(/Test Static/gm).length === 2, 'Server should serve static folder');
        test.ok(result.match(/Test Static 2/gm).length === 1, 'Server should serve more than one static folder');
        test.done();
      });
  },

  express: function (test) {
    test.expect(1);
    var cwd = path.resolve(fixtures, 'express');
    var assertExpress = helper.assertTask([
      'express:express',
      'request:http://localhost:3000/test'
    ], {
      cwd: cwd
    });

    assertExpress(null,
      function (result) {
        helper.verboseLog(result);
        test.ok(result.match(/Path: \/test/gm).length === 1, 'Express server should work');
        test.done();
      });
  },

  serverrl: function (test) {
    test.expect(2);
    var cwd = path.resolve(fixtures, 'serverrl');
    var assertExpress = helper.assertTask([
      'express',
      'watch'
    ], {
      cwd: cwd,
      trigger: 'Web server started on port:3000'
    });

    grunt.file.write(path.resolve(cwd, 'lib', 'test.js'), 'module.exports = 1;');

    assertExpress([
        function () {
          request.get('http://localhost:3000/test', function (err, res, body) {
            test.ok(body.match(/test: 1/gm).length === 1, 'Express server should start');
            grunt.file.write(path.resolve(cwd, 'lib', 'test.js'), 'module.exports = 2;');
          });
        },
        function () {
          request.get('http://localhost:3000/test', function (err, res, body) {
            test.ok(body.match(/test: 2/gm).length === 1, 'Express server should reload');
            grunt.file.write(path.resolve(cwd, 'lib', 'test.js'), 'module.exports = 3;');
          });
        }
      ],
      function (result) {
        helper.verboseLog(result);
        test.done();
      });
  }
};
