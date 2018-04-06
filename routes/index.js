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

    if(results.length > 0){
      if(results[0].passwd == req.body.passwd){
        // if correct credentials, set cookie,
        res.cookie("auth", results[0].ID, {maxAge: 12000000});
      }
      res.redirect('/');
    } else {
      res.locals.login_error = "Incorrect login information. Try again.";
      res.locals.layout = 'loginlayout';
      res.render('login');
    }
  });

  
  //else send error


  
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
  res.locals.infoPage = true;
  

  connection.query(`select * from person join mentor on ID=person_id where ID=${req.cookies.auth}`, (err, results, fields)=>{
    
    res.locals.info = results[0];

    res.render('index');
  });
});

router.get('/updateinfo', (req, res, next) => {
  connection.query(`select * from person join mentor on ID=person_id where ID=${req.cookies.auth}`, (err, results, fields)=>{
    
    res.locals.info = results[0];

    res.render('updateinfo');
  });
});

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

router.post('/hours/total/add', (req, res, next) => {
  connection.query(`update mentor set hours_worked=hours_worked+${req.body.total} where person_id=${req.cookies.auth}`, (err, results, fields) => {
    if(err) throw err;
    res.redirect('/schedule');
  });
});


router.post('/hours/studytable/add', (req, res, next) => {
  connection.query(`update mentor set study_tables_hours=study_tables_hours+${req.body.study_table}, hours_worked=hours_worked+${req.body.study_table} where person_id=${req.cookies.auth}`, (err, results, fields) => {
    if(err) throw err;
    res.redirect('/schedule');
  });
});

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
      console.log(res.locals.classes['COSC 211'].notes);
      res.render('classes');
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


router.get('/logout', (req, res, next)=>{
  res.clearCookie('auth');
  res.redirect('/');
});




module.exports = router;
