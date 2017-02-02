var express = require('express');
var auth = require('./auth.js');
var path = require('path');
var router = express.Router();
var app = express();

/* GET Secure resource */
router.get('/', function(req, res, next) {
  //console.log('Accessing the secure section ...'+path.join(__dirname + '/secure.html'))
  res.sendFile(path.join(__dirname + '/../public/secure.html'));
});

router.get('/token_data', function(req, res, next) {
  res.json({"authToken":auth.getUserToken(req)});
});

/* GET Secure resource for data */
router.get('/data', function(req, res, next) {
  console.log('Accessing the secure section ...'+path.join(__dirname + '/secure.html'));
  res.json(req.app.get('connectedDeviceConfig'));
});

module.exports = router;
