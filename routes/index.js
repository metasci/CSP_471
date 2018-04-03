var express = require('express');
var router = express.Router();

/**
 * MY INFO
 */
router.get('/', function(req, res, next) {
  res.render('index');
});




/**
 * MY STUDENTS
 */
router.get('/students', function(req, res, next) {
  res.render('students');
});




/**
 * MY SCHEDULE
 */
router.get('/schedule', function(req, res, next) {
  res.render('schedule');
});




/**
 * CONTACT
 */
router.get('/contact', function(req, res, next) {
  res.render('contact');
});





/**
 * LOGIN
 */
router.get('/login', function(req, res, next) {
  res.locals.layout = 'loginlayout';
  res.render('login');
});



/** 
 * LOGIN PAGE
 */
router.post('/login', function(req, res, next) {

  res.redirect('/');
});

module.exports = router;
