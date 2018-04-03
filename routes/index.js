var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});



router.get('/login', function(req, res, next) {
  res.locals.layout = 'loginlayout';
  res.render('login');
});

module.exports = router;
