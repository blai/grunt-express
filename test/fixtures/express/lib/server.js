var express = require('express');
var app = express();

app.get('*', function(req, res) {
  return res.send('Path: ' + req.path);
});

module.exports = app;