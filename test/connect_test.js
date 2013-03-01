'use strict';

var grunt = require('grunt');
var http = require('http');

function get(url, done) {
  http.get(url, function(res) {
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    }).on('end', function() {
      done(res, body);
    });
  });
}

exports.express = {
  default_option: function(test) {
    test.expect(1);
    get('http://localhost:3000/test/fixtures/hello.txt', function(res, body) {
      test.equal(res.statusCode, 200, 'should return 200');
      test.done();
    });
  },

  custom_base: function(test) {
     test.expect(2);
     get('http://localhost:4000/fixtures/hello.txt', function(res, body) {
       test.equal(res.statusCode, 200, 'should return 200');
       test.equal(body, 'Hello world', 'should return static page');
       test.done();
     });
  },

  custom_bases: function(test) {
     test.expect(4);
     var count = 2;
     function done() {
       if (count === 0) {
         test.done();
       }
     }
     get('http://localhost:5000/fixtures/hello.txt', function(res, body) {
       test.equal(res.statusCode, 200, 'should return 200');
       test.equal(body, 'Hello world', 'should return static page');
       count--;
       done();
     });
     get('http://localhost:5000/hello2.txt', function(res, body) {
       test.equal(res.statusCode, 200, 'should return 200');
       test.equal(body, 'hello2', 'should return static page');
       count--;
       done();
     });
  },

  custom_express: function(test) {
     test.expect(2);
     get('http://localhost:7000/', function(res, body) {
       test.equal(res.statusCode, 200, 'should return 200');
       test.equal(body, 'hello!', 'should return "hello!"');
       test.done();
     });
  }
};
