var express = require('express');
var app = express();

app.get('/test', function(req, res) {
  return res.send('test: ' + require('./test'));
})

module.exports = app;