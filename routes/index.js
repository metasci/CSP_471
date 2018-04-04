const express   = require('express');
const router    = express.Router();
const mysql     = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: '471DB'
});



/**
 * LOGIN
 */
router.get('/login', (req, res, next) => {
  res.locals.layout = 'loginlayout';
  res.render('login');
});

/** 
 * LOGIN PAGE
 */
router.post('/login', (req, res, next) => {

  // check for username/password combo
  // if correct creds, set cookie,
  res.cookie("auth", true, {maxAge: 120000});
  //else send error


  res.redirect('/');
});




/**
 * MIDDLEWARE - CHECK AUTHENTICATION
 */
router.use('/', (req, res, next)=>{
    if(req.cookies.auth){
      next();
    } else {
      res.redirect('/login');
    }
});

// res.cookie(name, 'value', {expire: 360000 + Date.now()});

/**
 * MY INFO
 */
router.get('/', (req, res, next) => {

  connection.query('select * from person', (err, results, fields)=>{
    console.log(results);
  });


  res.locals.infoPage = true;

  res.render('index');
});




/**
 * MY STUDENTS
 */
router.get('/students', (req, res, next) => {
  res.locals.studentPage = true;

  res.render('students');
});




/**
 * MY SCHEDULE
 */
router.get('/schedule', (req, res, next) => {
  res.locals.schedulePage = true;

  res.render('schedule');
});


/**
 * CLASSES
 */
router.get('/classes', (req, res, next) => {
  res.locals.classPage = true;

  res.render('classes');
});



/**
 * CONTACT
 */
router.get('/contact', (req, res, next) => {
  res.locals.contactPage = true;

  res.render('contact');
});


router.get('/logout', (req, res, next)=>{
  res.clearCookie('auth');
  res.redirect('/');
});




module.exports = router;
