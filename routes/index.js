const express     = require('express');
const router      = express.Router();
const mysql       = require('mysql2');
const formidable  = require('formidable');
const fs          = require('fs');
const bcrypt      = require('bcrypt');


// DB connection
const connection = mysql.createConnection({
  host: process.env.NODE_ENV=='production' ? process.env.DB_HOST : 'localhost',
  user: process.env.NODE_ENV=='production' ? process.env.DB_USER : 'root',
  database: process.env.NODE_ENV=='production' ? process.env.DB : '471DB',
  password: process.env.NODE_ENV=='production' ? process.env.DB_PW : ''
});


/**
 * helper functions
 */
function loginError(res){
  res.locals.login_error = "Incorrect login information. Try again.";
  res.locals.layout = 'loginlayout';
  res.render('login');
}



/**
 * Routes
 */

/**
 * LOGIN
 */
router.get('/login', (req, res, next) => {
  if(!req.cookies.auth){
    res.locals.layout = 'loginlayout';
    res.render('login');
  } else {
    res.redirect('/');
  }
});

/** 
 * LOGIN PAGE
 */
router.post('/login', (req, res, next) => {

  // check for username/password combo
  connection.query(`select passwd, ID from mentor join person on person_id=ID where email="${req.body.email}"`, (err, results, fields)=>{
    if(err) throw err;
    if(results.length > 0){ // email exists
      
      bcrypt.compare(req.body.passwd, results[0].passwd, (err, correct) => {
        if(err) throw err;
        if(correct){ // password correct
          // if correct credentials, set cookie,
          res.cookie("auth", results[0].ID, {maxAge: 12000000});
          res.redirect('/');
        } else { // password incorrect
          loginError(res);
        }
      });
    } else { // email doesn't exist
      loginError(res);
    }
  });  
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


/**
 * MY INFO
 * send the main page to client
 */
router.get('/', (req, res, next) => {
  res.locals.infoPage = true;
  connection.query(`select * from person join mentor on ID=person_id where ID=${req.cookies.auth}`, (err, results, fields)=>{
    res.locals.info = results[0];
    res.render('index');
  });
});

/**
 * send update info page to client
 */
router.get('/updateinfo', (req, res, next) => {
  connection.query(`select * from person join mentor on ID=person_id where ID=${req.cookies.auth}`, (err, results, fields)=>{
    res.locals.info = results[0];
    res.render('updateinfo');
  });
});

/**
 * handle update info request and redirect
 */
router.post('/updateinfo', (req, res, next) => {
  connection.query(`update person join mentor on person_id=ID set address="${req.body.address}", email="${req.body.email}", phone_number="${req.body.phone_number}" where ID=${req.cookies.auth}`, (err, results, fields)=>{
    // update person join mentor on person_id=ID set address="555 stupid rd" where ID=2;
    if(err) throw err;
    console.log(results);
    res.redirect('/');
  });
});




/**
 * MY STUDENTS
 */
router.get('/students', (req, res, next) => {
  res.locals.studentPage = true;
  connection.query(`select EID from mentor where person_id=${req.cookies.auth}`, (err, results, fields) => {
    connection.query(`select * from student s join mentor_relationship  m on m.student_eid=s.EID join person p on p.ID=s.person_id where mentor_eid="${results[0].EID}"`, (err, results, fields) => {
      res.locals.students = results;
      res.render('students');
    });
  });
});

/**
 * Sends us to student specific information page
 */
router.post('/students', (req, res, next) => {
  connection.query(`select *, DATE_FORMAT(DOB, "%b %e %Y") birth from person p join student s on p.ID=s.person_id
  where p.ID=${req.body.person_id}`, (err, results, fields) => {
    res.locals.student = results[0];
    connection.query(`select * from class_relationship natural join classes where student_eid="${results[0].EID}"`, (err, results, fields) => {
      res.locals.classes = results;
      connection.query(`select * from parent join person on person.ID=parent.person_id where parent.student_id="${res.locals.student.EID}"`, (err, results, fields) =>{
        if(err) throw err;
        res.locals.parent = results[0];
        res.render('studentinfo');
      });
    });
  });
});

/**
 * display update student info
 */
router.post("/updatestudentinfo", (req, res, next) => {
  connection.query(`select *, DATE_FORMAT(DOB, "%Y-%m-%d") birth from person join student on ID=person_id
  where ID=${req.body.id}`, (err, results, fields) => {
    res.locals.student = results[0];
    connection.query(`select * from parent join person on ID=person_id where student_id="${res.locals.student.EID}"`, (err, results, fields) => {
      if(err) throw err;
      res.locals.parent = results[0];
      connection.query(`select * from class_relationship natural join classes where student_eid="${res.locals.student.EID}"`, (err, results, fields) => {
        res.locals.classes = results;
        res.render('updatestudentinfo');
      });
    });
  });
});


/**
 * handle submission of updated student info
 */
router.post('/updatestudentinfo/submit', (req, res, next) => {
  connection.query(`update person join student on person_id=ID set address="${req.body.address}", email="${req.body.email}", phone_number="${req.body.phone_number}", class_standing=${req.body.class_standing}, years_in_program=${req.body.years_in_program}, study_tables_hours_attended="${req.body.study_table}", DOB="${req.body.DOB}" where ID=${req.body.id}`, (err, results, fields)=>{
    if(err) throw err;
    connection.query(`update person set phone_number="${req.body.parent_phone_number}" where ID=${req.body.parent_id}`, (err, results, fields) => {
      connection.query(`select *, DATE_FORMAT(DOB, "%b %e %Y") birth from person p join student s on p.ID=s.person_id
        where p.ID=${req.body.id}`, (err, results, fields) => {
          res.locals.student = results[0];
          connection.query(`select * from class_relationship natural join classes where student_eid="${results[0].EID}"`, (err, results, fields) => {
            res.locals.classes = results;
            connection.query(`select * from parent join person on person.ID=parent.person_id where parent.student_id="${res.locals.student.EID}"`, (err, results, fields) =>{
              if(err) throw err;
              res.locals.parent = results[0];
              res.render('studentinfo');
            });
          });
      });
    });
  });
});


/**
 * remove student from class
 */
router.post('/updatestudentinfo/class/delete', (req, res, next) => {
  connection.query(`delete from class_relationship where class_number="${req.body.class_number}" and student_eid="${req.body.EID}"`, (err, results, fields) => {
    if(err) throw err;
    connection.query(`select *, DATE_FORMAT(DOB, "%b %e %Y") birth from person join student on ID=person_id
      where ID=${req.body.id}`, (err, results, fields) => {
        if(err) throw err;
        res.locals.student = results[0];
        connection.query(`select * from class_relationship natural join classes where student_eid="${results[0].EID}"`, (err, results, fields) => {
          res.locals.classes = results;
          connection.query(`select * from parent join person on person.ID=parent.person_id where parent.student_id="${res.locals.student.EID}"`, (err, results, fields) =>{
            if(err) throw err;
            res.locals.parent = results[0];
            res.render('studentinfo');
          });
        });
    });
  });
});


/**
 * add student to class
 */
router.post('/updatestudentinfo/class/add', (req, res, next) => {
  connection.query(`insert into class_relationship values ("${req.body.EID}","${req.body.class_number}")`, (err, results, fields) => {
    connection.query(`select *, DATE_FORMAT(DOB, "%b %e %Y") birth from person join student on ID=person_id
      where ID=${req.body.id}`, (err, results, fields) => {
        if(err) throw err;
        res.locals.student = results[0];
        connection.query(`select * from class_relationship natural join classes where student_eid="${results[0].EID}"`, (err, results, fields) => {
          res.locals.classes = results;
          connection.query(`select * from parent join person on person.ID=parent.person_id where parent.student_id="${res.locals.student.EID}"`, (err, results, fields) =>{
            if(err) throw err;
            res.locals.parent = results[0];
            res.render('studentinfo');
          });
        });
    });
  });
});


/**
 * MY SCHEDULE
 */
router.get('/schedule', (req, res, next) => {
  res.locals.schedulePage = true;
  connection.query(`select hours_worked, study_tables_hours from mentor where person_id=${req.cookies.auth}`, (err, results, fields) => {
    res.locals.hours = results[0];
    res.render('schedule');
  });
});

/**
 * increment total hours worked
 */
router.post('/hours/total/add', (req, res, next) => {
  connection.query(`update mentor set hours_worked=hours_worked+${req.body.total} where person_id=${req.cookies.auth}`, (err, results, fields) => {
    if(err) throw err;
    res.redirect('/schedule');
  });
});

/**
 * increment study table hours worked
 */
router.post('/hours/studytable/add', (req, res, next) => {
  connection.query(`update mentor set study_tables_hours=study_tables_hours+${req.body.study_table}, hours_worked=hours_worked+${req.body.study_table} where person_id=${req.cookies.auth}`, (err, results, fields) => {
    if(err) throw err;
    res.redirect('/schedule');
  });
});

/**
 * set all hours to zero
 */
router.get('/hours/clear', (req, res, next) => {
  connection.query(`update mentor set study_tables_hours=0, hours_worked=0 where person_id=${req.cookies.auth}`, (err, results, fields) => {
    if(err) throw err;
    res.redirect('/schedule');
  });
});


/**
 * CLASSES
 */
router.get('/classes', (req, res, next) => {
  res.locals.classPage = true;
  res.locals.classes = {};

  connection.query('select * from classes', (err, results, fields) => {
  
    results.forEach(aclass => {
      aclass.notes = [];
      res.locals.classes[aclass.class_number] = aclass;
    });
    connection.query(`select * from note_info`, (err, results, fields) => {
      
      results.forEach(doc => {
        res.locals.classes[doc.class_number].notes.push(doc);
      });
      // console.log(res.locals.classes['COSC 211'].notes);
      res.render('classes');
    });
  });
});


/**
 * handle file upload for new mentor class notes
 */
router.post('/classes/upload', (req, res, next) => {
  let classNumber = req.body.class;
  const form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    let classNumber = fields.class;
    let filename = files.notes.name;
    connection.query(`select EID from mentor where person_id=${req.cookies.auth}`, (err, results, fields) => {
      if(err) throw err;
      let EID = results[0].EID;
      connection.query(`insert into documents (date,author_eid,class_number,notes) values (now(), "${EID}", "${classNumber}", "${filename}")`, (err, results, fields) => {
        if(err) throw err;
        // save file to correct directory
        let oldpath = files.notes.path;
        let newpath = `../public/storage/${filename}`;
        fs.copyFile(oldpath, newpath, err => { // save file to storage
          if(err) throw err;
          fs.unlink(oldpath, err => { // delete from temp upload location
            if(err) throw err; 
            res.redirect('/classes');
          });
        })
      });
    });
  });
});


/**
 * CONTACT
 */
router.get('/contact', (req, res, next) => {
  res.locals.contactPage = true;
  connection.query(`select * from person join mentor on ID=person_id`, (err, results, fields) => {
    if(err) throw err;
    res.locals.mentors=results;
    res.render('contact');
  });
});

/**
 * clear cookie that tells server the mentor is logged in
 * this will cause denial of access to rest of application
 */
router.get('/logout', (req, res, next)=>{
  res.clearCookie('auth');
  res.redirect('/');
});




module.exports = router;
