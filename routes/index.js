
var express = require('express');
var router = express.Router();
var sys = require('sys');
var md5 = require('MD5');
var dateFormat = require('dateformat');
var dd = require('date-utils');


var CT = require('./modules/country-list');
var AM = require('./modules/account-manager');
var EM = require('./modules/email-dispatcher');
var CF = require('./config.js');

var sweetcaptcha = new require('sweetcaptcha')(CF.appId,CF.appKey,CF.appSecret);

var formidable = require('formidable'),
        http = require('http'),
        util = require('util');

var fs = require('fs');
var rmdir = require('rimraf');

var uploadPath = "upload";
// main login page //
var pzedpfd;



//External mailCounter
var mailId =0,
    mailCounter = 0;


//Mail Handler that stores email of client so admin can respond
var mailHandler = '';


var nodemailer = require('nodemailer'),
    bodyParser = require('body-parser'),
    logger = require('morgan'),
    serveStatic = require('serve-static'),
    jade =require('jade'),
    path = require('path');

router.use(logger());
router.use(bodyParser());
router.use(serveStatic(path.join(__dirname, 'views')));


var transporter = nodemailer.createTransport({
    service: CF.service,
    auth: {
        user: CF.Mailuser,
        pass: CF.Mailpass
    }
});

router.get('/resources', function(req, res){
    res.render('resources');
});

var sessionId;
router.route('/contact')
  .get( function(req, res){

    var captcha = req.query["isCaptcha"];

  if (req.session.user == null) {
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
  } else {

    if(captcha ==='true')
    {
      sweetcaptcha.api('get_html',function(err,html){
      res.render('contact',{captcha : html,
      captchaError: captcha});
      sessionId = req.session.user._id;
    })
    }
    else{
    sweetcaptcha.api('get_html',function(err,html){
    res.render('contact',{captcha : html});
    sessionId = req.session.user._id;
    });
    }

}
})

  .post( function(req, res, next) {

    sweetcaptcha.api('check', {sckey: req.body["sckey"], scvalue: req.body["scvalue"]}, function(err, response){
      if (err) return console.log(err);

      if (response === 'true') {

    var mailOptions = {
        from: req.session.user.username , // sender address
        to: CF.to, //list of receivers
        subject: "[Ittention][" + req.body.subject + "]", // Subject line
        text: 'email: ' + req.session.user.email +'\n' + req.body.message, // plaintext body
        html: 'email: ' + req.session.user.email +'<br><b>' + req.body.message +'</b>' // html body
    };

    var now = new Date();
    var datenow = dateFormat(now, "yyyy-mm-dd, h:MM:ss TT");

    mailId +=1;

      AM.addNewMail({

        clientID : sessionId,
        from : req.session.user.email,
        subject : req.body.subject,
        text : req.body.message,
        date: datenow,
        mailId : mailId,
        isAdminMail : CF.regularUserType,
        read : CF.notAnswered
      });

      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          return console.log(error);
        }
        console.log('Message sent: ' + info.response);
      });
      res.redirect('/messageSent');
      next();

    }
    if (response === 'false') {
      // invalid captcha
      console.log("Invalid Captcha");
      res.redirect('/contact?isCaptcha=true');
    }
});
});

router.get('/messageSent', function(req, res){
  console.log(req.session.user);
  if(!req.session.user)
  {
    res.render('messageSentHorsCo');
  }
  else{
      res.render('messageSent');
    }
});

router.get('/messageSentAdmin',function(req,res)
{
  if (req.session.user == null || req.session.user.type == CF.regularUserType) {
      res.redirect('/');
  } else {

  var result = AM.find_AllUsers(CF.regularUserType, function(data){
    res.render('messageSentAdmin', {
      title: 'Admin Users',
      udata: req.session.user,
            countries: CT,
      users: data
    });
  });

  }
});

/*router.get('/messageSentHorsCo',function(req,res)
{})
*/
router.route('/contacthorsco')
  .get(function(req,res,next){
    var captcha = req.query["isCaptcha"];
    if(captcha ==='true')
    {
      sweetcaptcha.api('get_html',function(err,html){
      res.render('contacthorsco',{captcha : html,
      captchaError: captcha});
    })
  }
    else{
    sweetcaptcha.api('get_html',function(err,html){
    res.render('contacthorsco',{captcha : html});
    });
  }
  })

  .post(function(req,res,next){
    sweetcaptcha.api('check', {sckey: req.body["sckey"], scvalue: req.body["scvalue"]}, function(err, response){
      if (err) return console.log(err);

      if (response === 'true') {
        // valid captcha
        var mailOptions = {
            from: req.body.adresseMail , // sender address
            to: CF.to, //list of receivers
            subject: "[Ittention][" + req.body.subject + "]", // Subject line
            text: 'email: ' + req.body.adresseMail +'\n' + req.body.message, // plaintext body
            html: 'email: ' + req.body.adresseMail +'<br><b>' + req.body.message +'</b>' // html body
        };

        var now = new Date();
        var datenow = dateFormat(now, "yyyy-mm-dd, h:MM:ss TT");

        mailId +=1;

          AM.addNewMail({
            from : req.body.adresseMail,
            subject : req.body.subject,
            text : req.body.message,
            date: datenow,
            mailId : mailId,
            isAdminMail : CF.regularUserType,
            read : CF.notAnswered

          });
          AM.addNewProspect(
            {
              email : req.body.adresseMail
            }
          );

          transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
              return console.log(error);
            }
            console.log('Message sent: ' + info.response);
          });
          res.redirect('/messageSent');
          next();
      }
      if (response === 'false') {
        // invalid captcha
        console.log("Invalid Captcha");
        res.redirect('/contacthorsco?isCaptcha=true');
      }


    });

  });


///////////////////////////////////////////////////////////////////////////////
// login to system "/"//
///////////////////////////////////////////////////////////////////////////////
// manage user login or check the credentials //
router.get('/', function(req, res) {
	// check if the user's credentials are saved in a cookie //
	// if not call page login //
    if (req.cookies.user == undefined || req.cookies.pass == undefined) {
        res.render('login', {title: 'Hello - Please Login To Your Account'});
    } else {
	// if yes attempt automatic login //
        AM.autoLogin(req.cookies.user, req.cookies.pass, function(o) {
            if (o != null) {
                req.session.user = o;
                res.redirect('/home');

            } else {
                res.render('login', {title: 'Hello - Please Login To Your Account'});
            }
        });
    }
});


// get user login and pass and log if the user/pass are correct //
router.post('/', function(req, res) {
    AM.manualLogin(req.param('user'), req.param('pass'), function(e, o) {
        if (!o) {
            res.send(e, 400);
        } else {
            req.session.user = o;
            if (req.param('remember-me') == 'true') {
                res.cookie('user', o.user, {maxAge: 900000});
                res.cookie('pass', o.pass, {maxAge: 900000});
		console.log('bonjour');

		console.log(req.param('user'));

            }
            res.send(o, 200);
        }
    });
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// /home page ... account management //
/////////////////////////////////////////////////////////////////////////////////////////////////////////

// logged-in user homepage //
router.get('/home', function(req, res) {
    if (req.session.user == null) {
	// if user is not logged-in redirect back to login page //
        res.redirect('/');
    } else {
			  var result = AM.find_ForfaitData(req.session.user._id, function(e) {
					AM.find_currentFiles(req.session.user._id, e.fstart, e.fend, function(files) {
							var x;
							var max_files = 10;

							var total_weight  = 0;
							var allowed_size  = e.total_sz;
							var diff_file_size;
							var total_files   = files.length;
							var allowed_files = e.nr_files;
							var diff_files    = allowed_files-total_files;

							res.render('home', {
									title: 'Control Panel',
									countries: CT,
									nrfiles: diff_files,
									username: req.session.user.name,
									udata: req.session.user
							});
					});
				});
    }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// /account page ... account management //
/////////////////////////////////////////////////////////////////////////////////////////////////////////

// logged-in user homepage //
router.get('/account', function(req, res) {
    if (req.session.user == null) {
	// if user is not logged-in redirect back to login page //
        res.redirect('/');
    } else {
        res.render('general_account', {
            title: 'Control Panel',
            countries: CT,
            udata: req.session.user
        });
    }
});


// get data to update account and logout if asked for //
router.post('/account', function(req, res) {
    if (req.param('user') != undefined) {

	AM.updateAccount({
            user: req.param('user'),
            name: req.param('name'),
            email: req.param('email'),
            institution: req.param('institution'),
            country: req.param('country'),
            pass: req.param('pass'),

        }, function(e, o) {
            if (e) {
                res.send('error-updating-account', 400);
            } else {
                req.session.user = o;
                // update the user's login cookies if they exists //
                if (req.cookies.user != undefined && req.cookies.pass != undefined) {
                    res.cookie('user', o.user, {maxAge: 900000});
                    res.cookie('pass', o.pass, {maxAge: 900000});
                }
                res.send('ok', 200);
            }
        });
    } else if (req.param('logout') == 'true') {
        res.clearCookie('user');
        res.clearCookie('pass');
        req.session.destroy(function(e) {
            res.send('ok', 200);
        });
    }
});



///////////////////////////////////////////////////////////////////////////////////
// /result page: main processing //
//////////////////////////////////////////////////////////////////////////////////
// get account infos (data, crypted name...) //
router.get('/result', function(req, res) {

    var crypt = req.param('user');

    if (req.session.user == null) {
        res.redirect('/');
    } else {

      var result = AM.find_UserInfo(req.session.user._id, function(e) {
	    var data=[];
	    var cryptname;
	    cryptname = e.file_crypt;

            var result = AM.find_UserFiles(req.session.user._id, function(data) {
                res.render('result', {
                    data_in: data,
                    crypt_in: cryptname
                });
							console.log(data+"---"+cryptname);
            });

        });
    }
});

router.get('/analyse_rois_ajax', function(req, res){

    if (req.session.user == null) {
        res.json({"status":"403"});
    } else {
			var ImageLink = "";
			var monsh = "./result.sh ";
			var crypt = req.param('user');
			var roi = [];
			roi = req.cookies.ROI;
			var url = req.cookies.url;
			var split_url = url.split("superrare");

			var imgName = 'superrare'+split_url[1];

			var roi_nr = roi.split(",").length;

//	var resI = check_image_validity(imgName);
//	if (resI == true)
//	{
			console.log('image not corrupt' + roi_nr);
			// call the bash script which launches image analysis on the saliency map given the ROIs provided by the user //
			var spawn = require('child_process').spawn;
			var deploySh = spawn('./result.sh' , [roi, url]);

			deploySh.stdout.on('data', function(data) {    // register one or more handlers
					console.log('Stdout: ' + data);
			});
			deploySh.stderr.on('data', function(data) {
					console.log('stderr: ' + data);
			});
			deploySh.on('exit', function(code,req2,res2)
			{
				console.log('ANALYSIS DONE :)');
				var result = AM.find_UserInfo(req.session.user._id, function(e) {
					var contenu;
					var decoupe_url = url.split("/");
					var decoupe_urlLength = decoupe_url.length;
					var url_racine= "";
					for (var i = 0; i < (decoupe_urlLength - 1); i++) {
						url_racine = url_racine + decoupe_url[i] + "/";
					}
					ImageLink = url_racine + "analyse.jpg";
					console.log("IMAGE LINK" + ImageLink);

					// update the cookie with the url of the abalyse image
					var data=[];
					var cryptname;
					cryptname = e.file_crypt;
					var result = AM.find_UserFiles(req.session.user._id, function(data) {
						res.json({"data": url, "data_in": data, "crypt_in": cryptname, "ResultImage": ImageLink, "status":"200", "roiNr":roi_nr});
					});
				});
			});
/*	}
		else
		{
			console.log('image corrupt');
		}
*/
		}
});

router.post('/create_pdf', function(req, res) {
	if (req.session.user == null) {
		res.json({"status":"403"});
	} else {
		var fold_crypt = req.session.user.file_crypt;
		var url = req.cookies.url;
		//var roi = req.cookies.ROI;
		var roi_nr = req.body.roi_nr; //roi.split(",").length;
		var image_name = req.body.image_name; //roi.split(",").length;

		var url_ = url.split(fold_crypt);

		var image_path = url_[0] + fold_crypt + '/' + image_name + '/';

		var obj = {};
		var arr = [];
		for (var i = 1; i <= roi_nr; i++) {
			//obj.i = image_path + 'analyse' + i + '.jpg';
			arr.push(image_path + 'analyse' + i + '.jpg');
		}
		obj.analysis = arr;
		obj.saliency = image_path + image_name + 'saliency.jpg';
		obj.original = image_path + image_name + '.jpg';

		var request = require('request').defaults({ encoding: null });
		var async = require('async');

		//var states = obj;

		var asyncTasks = [];
		var results = [];

		asyncTasks.push(function(callback){
			var key = 'original';
			var url = obj[key];//baseUrl + state.name;
			console.log(obj[key]);
			request(url, function(err, res, body){
				data = "data:" + res.headers["content-type"] + ";base64," + new Buffer(body).toString('base64');
				results.push(data);
				//results[key] = data;
				callback();
			});
		});
		asyncTasks.push(function(callback){
			var key = 'saliency';
			var url = obj[key];//baseUrl + state.name;
			console.log(obj[key]);
			request(url, function(err, res, body){
				data = "data:" + res.headers["content-type"] + ";base64," + new Buffer(body).toString('base64');
				results.push(data);
				//results[key] = data;
				callback();
			});
		});
		var obj_arr = obj['analysis'];
		obj_arr.forEach(function(state, key){
			asyncTasks.push(function(callback){
				var url = state;//baseUrl + state.name;
				console.log(state);
				request(url, function(err, res, body){
					data = "data:" + res.headers["content-type"] + ";base64," + new Buffer(body).toString('base64');
					results.push(data);
					//results[key] = data;
					callback();
				});
			});
		});

		// Execute tasks simultaneously
		async.series(asyncTasks, function(){
			//done, now save results.
			//store.save(results);
			console.log(results.original);
			res.json(results);
		});
	}
});
////////////////////////////////////////////////////////////////////////////////////
// /superrare -> print pdf //
//////////////////////////////////////////////////////
// check the login
router.post('/analysis_2_pdf', function(req, res) {
    if (req.session.user == null) {
			res.json({"status":"403"});
    } else {
console.log('req'+req.body.email);
console.log('res'+res);
			var roi = [];
			roi = req.cookies.ROI;
			var roi_nr = roi.split(",").length;
			var url = req.cookies.url;
console.log('url'+url);

			var request = require('request').defaults({ encoding: null });
			request.get('http://'+CF.appHost+':'+CF.appPort+'/superrare/4f0113f6b71eb5cee02e52a509281417/7785b814b09c076605733d81d3453797/7785b814b09c076605733d81d3453797.jpg', function (error, response, body) {
				if (!error && response.statusCode == 200) {
					data = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString('base64');
					res.json({"data": data+' '+data});
					//console.log(data);
				}
			});
		}
});

////////////////////////////////////////////////////////////////////////////////////
// /superrare -> file upload //
//////////////////////////////////////////////////////
// check the login
router.get('/admin', function(req, res) {

    if (req.session.user == null || req.session.user.type == CF.regularUserType) {
        res.redirect('/');
    } else {

		var result = AM.find_AllUsers(CF.regularUserType, function(data){
			res.render('admin', {
				title: 'Admin Users',
				udata: req.session.user,
	            countries: CT,
				users: data
			});
		});

    }
});

router.post('/update_forfait', function(req, res) {
    if (req.session.user == null || req.session.user.type == CF.regularUserType) {
      res.redirect('/');
			res.send('error-user-has-no-rights', 400);
    } else {
			//console.log(req.body);
        var forfait_test_number_files = 3000;
        var forfait_test_total_size = 1000000000000;
        var forfait_test_type = 1;
			//res.send('ok', 200);
        AM.checkForfait(
        {
        nr_files: forfait_test_number_files,
        size: forfait_test_total_size,
        type: forfait_test_type
        // error manaement //
        }, function(e, newObj) {
            if (e != 'forfait-type-taken') {
              res.send(e, 400);
            } else
            {
                  AM.updateAccountForfaits({
                      data: req.body,
                  }, function(e, o) {
                      if (e) {
                        res.send('error-updating-accounts-forfait', 400);
                      } else {
                        res.send('ok', 200);
                      }
                  });
            }
        });

		}
});

router.post('/admin', function(req, res) {
	console.log(req.param('forfait.type'));
	res.send('ok', 200);
/**
	if (req.param('user') != undefined && req.session.user.type == CF.adminUserType) {
		res.send('ok', 200);
		AM.updateAccountForfaits({
				data: req,
			}, function(e, o) {
				if (e) {
					res.send('error-updating-accounts-forfait', 400);
				} else {
					res.send('ok', 200);
				}
			});
    } else {
        res.redirect('/');
    }
**/
});

///////////////////////////////////////////////////////////////////////////////////
////////////////////////admin mail back office/////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
router.route('/adminMails')
  .get( function(req, res){
    if (req.session.user == null || req.session.user.type == CF.regularUserType) {
        res.redirect('/');
    } else {

    var result = AM.find_AllMails(function(data){
      res.render('adminMails', {
        title: 'Admin Mails',
        udata: req.session.user,
              countries: CT,
        mails: data
      });
    });

    }
  })
  .post(function(req,res){
    mailHandler=req.body.email;
    console.log(mailHandler);
    var mailIdt=req.body.emailId;
    res.redirect('/answer?e='+mailIdt);
});

router.route('/deleteMail')
  .post(function(req,res){
    var mailId = req.query["m"];
    AM.deleteMail(mailId,function(e,o){
      if (e)
      {
        console.log(e);
      }
      else
      {
        res.redirect('/adminMails');
      }
    })
  });

  router.route('/answer')
  .get(function(req,res)
  {
    if (req.session.user == null || req.session.user.type == CF.regularUserType)
    {
        res.redirect('/');
    }
    else
    {
        var id = req.query["e"];
        var result = AM.find_OneMailById(id,function(data)
        {
          res.render('answer',{
            title: 'Admin Answers',
            udata: req.session.user,
                  countries: CT,
            mail: data
          });
        });
    }
  })
  .post(function(req,res)
  {

    var mailOptions = {
        from: 'Predator help-support'  , // sender address
        to: mailHandler , // list of receivers
        subject: "[Ittention][Answer]", // Subject line
        text:  req.body.message, // plaintext body
    };

    var now = new Date();
    var datenow = dateFormat(now, "yyyy-mm-dd, h:MM:ss TT");
    var id = req.body.id;
    mailId +=1;

      AM.addNewMail({

        clientID : sessionId,
        from : 'Admin',
        to : mailHandler,
        subject : 'Admin answer to conversation ID:',
        text : req.body.message,
        date: datenow,
        mailId : mailId,
        isAdminMail: CF.adminUserType


      });

    AM.updateMailStatus(id);
console.log('still ok');
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          return console.log(error);
        }
        console.log('Message sent: ' + info.response);
      });
      res.redirect('/messageSentAdmin');
      next();

  });

  router.route('/adminProspects')
    .get( function(req, res){
      if (req.session.user == null || req.session.user.type == CF.regularUserType) {
          res.redirect('/');
      } else {

      var result = AM.find_AllProspects(function(data){
        res.render('adminProspects', {
          title: 'Admin Prospects',
          udata: req.session.user,
                countries: CT,
          prospects: data
        });
      });

      }
    })
    .post(function(req,res){
      prospectId=req.body.prospectId;
      res.redirect('/editProspect?p='+prospectId);
  });

  router.route('/deleteProspect')
    .post(function(req,res){
      var prospectId = req.query["p"];
      AM.deleteProspect(prospectId,function(e,o){
        if (e)
        {
          console.log(e);
        }
        else
        {
          res.redirect('/adminProspects');
        }
      })
    });


  router.route('/editProspect')
    .get( function(req, res){
      if (req.session.user == null || req.session.user.type == CF.regularUserType) {
          res.redirect('/');
      } else   {
            var id = req.query["p"];
            var result = AM.find_OneProspectById(id,function(data)
            {
              res.render('editprospect',{
                title: 'Admin Prospect edit',
                udata: req.session.user,
                      countries: CT,
                prospect: data
              });
            });
        }
    })
    .post(function(req,res){

      var contract =  req.body.abonnemento1 + ' ' + req.body.abonnemento2 + ' ' +  req.body.abonnemento3 +' ' +req.body.abonnemento4;
      contract=contract.replace(/undefined/g,'');
      AM.updateProspect({
        id : req.body.id,
        Statut : req.body.typeOfClient,
        TypeDeContrat: contract,
        Secteur : req.body.sector,
        institution : req.body.company,
        Fonction: req.body.function,
        Civilité: req.body.optradio,
        name     : req.body.name,
        surname  : req.body.surname,
        Mobile  : req.body.mobile,
        Fixe    : req.body.phone,
        email   : req.body.email,
        Adresse1: req.body.adress1,
        Adresse2: req.body.adress2,
        CodePostal:req.body.codepostal,
        Ville   : req.body.city,
        country : req.body.country,
        Meeting : req.body.meeting,
        Contact1: req.body.meeting1,
        Contact2: req.body.meeting2,
        Relation: req.body.relation
      },function(e,o){
        if(e){
          res.status(400).send(e);
        }
        else{
        res.redirect('/clientSavedToDb');
        }
      });
    });



router.route('/clientprospectform')
    .get( function(req, res){
      if (req.session.user == null || req.session.user.type == CF.regularUserType) {
          res.redirect('/');
      } else {

        res.render('clientprospectform');
      }
    })

    .post(function(req,res,next){
        var contract =  req.body.abonnemento1 + ' ' + req.body.abonnemento2 + ' ' +  req.body.abonnemento3;
        contract=contract.replace(/undefined/g,'');
        console.log(contract);

        AM.addNewProspect({

          Statut : req.body.typeOfClient,
          TypeDeContrat: contract,
          Secteur : req.body.sector,
          institution : req.body.company,
          Fonction: req.body.function,
          Civilité: req.body.optradio,
          name     : req.body.name,
          surname  : req.body.surname,
          Mobile  : req.body.mobile,
          Fixe    : req.body.phone,
          email   : req.body.email,
          Adresse1: req.body.adress1,
          Adresse2: req.body.adress2,
          CodePostal:req.body.codepostal,
          Ville   : req.body.city,
          country : req.body.country,
          Meeting : req.body.meeting,
          Contact1: req.body.meeting1,
          Contact2: req.body.meeting2,
          Relation: req.body.relation

        });
        res.redirect('/clientSavedToDb');
    });

    router.get('/clientSavedToDb',function(req,res)
    {
      res.render('clientSavedToDb');
    });



////////////////////////////////////////////////////////////////////////////////////
// app block /superrare -> file upload & analyse rois
//////////////////////////////////////////////////////
// check the login
router.get('/app', function(req, res) {
    if (req.session.user == null) {
        res.redirect('/');
    } else {

    var result = AM.find_ForfaitData(req.session.user._id, function(e) {
        AM.find_currentFiles(req.session.user._id, e.fstart, e.fend, function(files) {
            var x;
            var max_files = 10;

            var total_weight  = 0;
            var allowed_size  = e.total_sz;
            var diff_file_size;
            var total_files   = files.length;
            var allowed_files = e.nr_files;
            var diff_files    = allowed_files-total_files;

            for(x=0;x<total_files;x++)  {
                total_weight = total_weight + files[x].weight;
            }
            diff_file_size = allowed_size - total_weight;

            if (diff_file_size<=0)
            {
                message_alert = 'You reached the maximum of uploaded files size ['+allowed_size/1000000000+'] GB for this month. Please contact the administrator!';

                res.render('nomorefiles', {
                    udata: req.session.user,
                    saliencymap: '',
                    messageAlert: message_alert,
                    maxFiles: max_files
                });
                console.log('you reached the maximum of uploaded files size', (allowed_size/1000000000), 'GB');

                return;
            }

            if (diff_files<=0)
            {
                message_alert = 'You reached the maximum number of uploaded files ['+allowed_files+'] for this month. Please contact the administrator!';
                res.render('nomorefiles', {
                    udata: req.session.user,
                    saliencymap: '',
                    messageAlert: message_alert,
                    maxFiles: max_files
                });
                console.log('you reached maximum files number', (allowed_files), 'photos');
            } else {
							if (diff_files > 3)
							{
									message_alert = 'On this page, you can upload your data by clicking or droping your images bellow (max 3 images at a time).';
							}
							else
							{
									message_alert = 'On this page, you can upload your data by clicking or droping your images bellow. You can still upload ['+ diff_files +'] files this month! Please contact the administrator!';
									max_files = diff_files;
							}

							var result = AM.find_UserInfo(req.session.user._id, function(e) {
								var data=[];
								var cryptname;
								cryptname = e.file_crypt;
								var result = AM.find_UserFolders(req.session.user._id, function(folder) {
									// prepare for select box
									var folders = {};//[];
									for(x=0;x<folder.length;x++)  {
										folders[x] = {id_: folder[x]._id, folderName: folder[x].folderName}
									}
									var result = AM.find_UserFiles(req.session.user._id, folder[0]._id, function(data) {
										res.render('application', {
												data_in: data,
												crypt_in: cryptname,
												udata: req.session.user,
												saliencymap:'',
												messageAlert: message_alert,
												maxFiles: max_files,
												folders: folders
										});
										console.log('you can still upload', diff_files, 'photos');
									});
								});
							});
            }
        });
    });
    }
});
router.get('/apptest', function(req, res) {

    if (req.session.user == null) {
        res.redirect('/');
    } else {

    var result = AM.find_ForfaitData(req.session.user._id, function(e) {
        AM.find_currentFiles(req.session.user._id, e.fstart, e.fend, function(files) {
            var x;
            var max_files = 10;

            var total_weight  = 0;
            var allowed_size  = e.total_sz;
            var diff_file_size;
            var total_files   = files.length;
            var allowed_files = e.nr_files;
            var diff_files    = allowed_files-total_files;
						var status_del = '0';
						if (allowed_files > 5)
						{
							status_del = '1';
						}


            for(x=0;x<total_files;x++)  {
                total_weight = total_weight + files[x].weight;
            }
            diff_file_size = allowed_size - total_weight;

            if (diff_file_size<=0)
            {
                message_alert = 'You reached the maximum of uploaded files size ['+allowed_size/1000000000+'] GB for this month. Please contact the administrator!';

                res.render('nomorefiles', {
                    udata: req.session.user,
                    saliencymap: '',
                    messageAlert: message_alert,
                    maxFiles: max_files
                });
                console.log('you reached the maximum of uploaded files size', (allowed_size/1000000000), 'GB');

                return;
            }

            if (diff_files<=0)
            {
                message_alert = 'You reached the maximum number of uploaded files ['+allowed_files+'] for this month. Please contact the administrator!';
                res.render('nomorefiles', {
                    udata: req.session.user,
                    saliencymap: '',
                    messageAlert: message_alert,
                    maxFiles: max_files
                });
                console.log('you reached maximum files number', (allowed_files), 'photos');
            } else {
							if (diff_files > 3)
							{
									message_alert = 'On this page, you can upload your data by clicking or droping your images bellow (max 3 images at a time).';
							}
							else
							{
									message_alert = 'On this page, you can upload your data by clicking or droping your images bellow. You can still upload ['+ diff_files +'] files this month! Please contact the administrator!';
									max_files = diff_files;
							}

							var result = AM.find_UserInfo(req.session.user._id, function(e) {
							var data=[];
							var cryptname;
							cryptname = e.file_crypt;
							var result = AM.find_UserFiles(req.session.user._id, function(data) {
							res.render('applicationtest', {
									data_in: data,
									crypt_in: cryptname,
									udata: req.session.user,
									saliencymap:'',
									messageAlert: message_alert,
									maxFiles: max_files,
									statusDel: status_del
							});
							console.log('you can still upload', diff_files, 'photos');
							});
							});
            }
        });
    });
    }
});

router.get('/delete_picture', function(req, res) {

    if (req.session.user == null) {
        res.redirect('/');
    } else {
			//console.log(req.session.user);
			//console.log(req.cookies);
			var status = "200";
			var url = req.cookies.url;
			var fold_crypt = req.session.user.file_crypt;
			var split_url_ = url.split(fold_crypt);
			var split_url = split_url_[1].split('/');
			var crypt_name_withoutextension = split_url[1];
			var folder_path_for_delete = 'public/superrare/'+fold_crypt+'/'+crypt_name_withoutextension;//public/superarre/b0../e3..
			var temp_path_for_delete = 'public/superrare/'+fold_crypt+'/'+crypt_name_withoutextension+'.~1~';//public/superarre/b0../e3..
			//var folder_path_for_delete = "public/superrare/b004421de079bb2531cc5cd6346d202d/42f5631431f6c839707cac8e67baeb30.~1~";
			//var crypt_name_withoutextension = '42f5631431f6c839707cac8e67baeb30.~1~';
			try {
				AM.deleteFile(
				{
						clientID: req.session.user._id,
						filename: crypt_name_withoutextension,
				// error manaement //
				}, function (e){
						if (e) {
							console.log('db: files can not be deleted');
							status = "403";
						} else
						{
							console.log('db: file deleted with success');

							rmdir(folder_path_for_delete, function(error){
								if (error) {
									throw error;
								} else
								{
									console.log('successfully deleted '+folder_path_for_delete);
									status = "200";
								}
							});

							rmdir(temp_path_for_delete, function(error){
								if (error) {
									throw error;
								} else
								{
									console.log('temp successfully deleted '+temp_path_for_delete);
									status = "200";
								}
							});
						}
				});
				res.json({"status":status});
			}
			catch(error) {
					res.json({"status":"403"});
			}
		}

});

router.get('/deleteall', function(req, res) {

    if (req.session.user == null) {
        res.redirect('/');
    } else {
			/*
			AM.deleteFile(
			{
					clientID: req.session.user._id,
					filename: crypt_name_withoutextension,
			// error manaement //
			}, function (e){
					if (e) {
						console.log('db: files can not be deleted');
					} else
					{

						console.log('db: file deleted with success');
						var folder_path_for_delete = 'superrare/'+req.session.user.file_crypt+'/';//public/superarre/b0../e3..
						rmdir(folder_path_for_delete, function(error){
							if (err) throw err;
							console.log('successfully deleted '+folder_path_for_delete);
						});
					}
			});
			*/
			console.log(req.session.user);
			//var id = "5583d28b56067847af24ef5e";
			//var filename = "380e2de374ac74d5c47390464d046a3e";
			//db.files.remove({"clientID":"5583d28b56067847af24ef5e"}) //req.session.user._id
			//rm -rfv public/superare/b004421de079bb2531cc5cd6346d202d/* //req.session.user.file_crypt
    }
});

////////////////////////////////////////////////////////////////////////////////////
// /superrare -> file upload //
//////////////////////////////////////////////////////
// check the login
router.get('/superrare', function(req, res) {

    if (req.session.user == null) {
        res.redirect('/contact');
    } else {

			var result = AM.find_ForfaitData(req.session.user._id, function(e) {
					AM.find_currentFiles(req.session.user._id, e.fstart, e.fend, function(files) {
							var x;
							var max_files = 3;

							var total_weight  = 0;
							var allowed_size  = e.total_sz;
							var diff_file_size;
							var total_files   = files.length;
							var allowed_files = e.nr_files;
							var diff_files    = allowed_files-total_files;

							for(x=0;x<total_files;x++)  {
									total_weight = total_weight + files[x].weight;
							}
							diff_file_size = allowed_size - total_weight;

							if (diff_file_size<=0)
							{
									message_alert = 'You reached the maximum of uploaded files size ['+allowed_size/1000000000+'] GB for this month. Please contact the administrator!';
									res.render('nomorefiles', {
											udata: req.session.user,
											saliencymap: '',
											messageAlert: message_alert,
											maxFiles: max_files
									});
									console.log('you reached the maximum of uploaded files size', (allowed_size/1000000000), 'GB');
									return;
							}

							if (diff_files<=0)
							{
									message_alert = 'You reached the maximum number of uploaded files ['+allowed_files+'] for this month. Please contact the administrator!';
									res.render('nomorefiles', {
											udata: req.session.user,
											saliencymap: '',
											messageAlert: message_alert,
											maxFiles: max_files
									});
									console.log('you reached maximum files number', (allowed_files), 'photos');
							} else {
									if (diff_files > 3)
									{
											message_alert = 'On this page, you can upload your data by clicking or droping your images bellow (max 3 images at a time).';
									}
									else
									{
											message_alert = 'On this page, you can upload your data by clicking or droping your images bellow. You can still upload ['+ diff_files +'] files this month! Please contact the administrator!';
											max_files = diff_files;
									}

									res.render('superrare', {
											udata: req.session.user,
											saliencymap:'',
											messageAlert: message_alert,
											maxFiles: max_files
									});
									console.log('you can still upload', diff_files, 'photos');
							}
					});
			});
    }
});

function check_image_validity(fileName)
{
	result = true;
	fs.exists(fileName, function(exists) {
		// check if image exists!
		if (exists) {
			var readChunk = require('read-chunk');
			var fileType = require('file-type');
			var buffer = readChunk.sync(fileName, 0, 262);
			var fileTy = fileType(buffer);

			// check if image type is jpg, png or gif
			if ((fileTy.ext=='jpg' || 'png' || 'gif') && (fileTy.mime=='image/jpeg'||'image/gif'||'image/png'))
			{
				result = true;
			}
			else
			{
				result = false;
			}
		}
		else
		{
			result = false;
		}
	});

	return result;
}

router.post('/get_pictures_by_folder_id', function(req, res) {
	var foldername = req.session.user.user;
	var foldername_crypt = md5(foldername);
	var result = AM.find_UserFilesByFolder(req.session.user._id, req.body.folderID, function(data) {
		res.json({"data_in": data, "crypt_in": foldername_crypt, "status":"200"});
	});
});


// get the files tu upload and ... upload //
router.post('/superrare', function(req, res) {
    if (req.session.user == null) {
				res.json({"status":"403"});
    } else {
			var form = new formidable.IncomingForm(), files = [], fields = [];
			form.keepExtensions = true;
			form.uploadDir = "upload";

			form.parse(req);
			var filename;
			var fileinfo;
			var pathname;
			var pathinfo;
			var nss_mean;
			var crypt_path;
			var crypt_name;
			var crypt;
			var crypt_name_withoutextension;
			var file_size;
			var webinfo=req;
			var foldername;
			var foldername_crypt;
			var k;
			var nom;
			var document;

			form
			.on('field', function(field, value)  {
						fields.push([field, value]);
			})
			.on('file', function(field, file) {
					//rename the incoming file to the file's name
					fs.rename(file.path, file.path.toLowerCase());

					files.push([field, file]);
          			//console.log('TEST---', field, file);
					//console.log('REQ', req);
					filename = file.name.toLowerCase();
					fileinfo = filename.split(".");
					pathname = file.path.toLowerCase();
					pathinfo = pathname.split("/");
					crypt_name = pathinfo[1];
					crypt = crypt_name;
					crypt_name_withoutextension = crypt_name.split(".");
					crypt_name_withoutextension = crypt_name_withoutextension[0];
					file_size = file.size;
					foldername = req.session.user.user;
					foldername_crypt = md5(foldername);
			})
			.on('end', function() {
					var imgName = 'superrare/'+foldername_crypt +'/'+crypt_name_withoutextension+'/'+crypt_name;
					var resI = check_image_validity(imgName);
					if (resI == true)
					{
				    // DB update
						var now = new Date();
						var datenow = dateFormat(now, "yyyy-mm-dd");
						AM.addNewFile(
						{
								clientID: req.session.user._id,
								filename: crypt_name_withoutextension,
								date: datenow,
								weight: file_size,
                				folderID: req.cookies.image_folder
						// error management //
						}, function (e){
								if (e) {
									console.log('............eroare');
										//res.send(e, 400);
								} else
								{
										//res.send('ok', 200);
									console.log('............succes');
								}
						});

						var testreq = req;
						var testres = res;
						var couleur = req.cookies.mysuperrare;

						var table = [];
						table = couleur.split("%2C");
						var trip = [];
						trip = couleur.split(",");
						console.log("START SALIENCY COMPUTATION");
						// call bash to compute saliency //
						var spawn = require('child_process').spawn;

						var deploySh = spawn('./superrare.sh' , [crypt_name, crypt_name_withoutextension, foldername_crypt, trip[0], trip[1], trip[2]]);
						deploySh.stdout.on('data', function(data) {    // register one or more handlers
								console.log('stdout: ' + data);
						});
						deploySh.stderr.on('data', function(data) {
								console.log('stderr: ' + data);
						});
						deploySh.on('exit', function(code,req2,res2)
						{
								console.log('SALIENCY COMPUTATION DONE' + code);
								var result = AM.find_UserInfo(req.session.user._id, function(e) {
									res.json({"data_in": crypt_name_withoutextension, "crypt_in": foldername_crypt, "status":"200"});
								});
						});
				}
				else {
					console.log('image corrupt');
					res.json({"status":"403"});
				}

			})
			.on('error', function (err) {
				console.log('form upload error:', err);
				res.json({"status":"403"});
			});
		}
});

// function called in superrare post //
function executeSuperRare(req,res, foldername_crypt,crypt_name, crypt_name_withoutextension,callback)
{
    var testreq = req;
    var testres = res;

    setTimeout(function()
	{
	var couleur = req.cookies.superrare;

    var table = [];
    table = couleur.split("%2C");
    var trip = [];
    trip = couleur.split(",");
    console.log("START SALIENCY COMPUTATION");
    // call bash to compute saliency //
    var spawn = require('child_process').spawn;
    var deploySh = spawn('./superrare.sh' , [crypt_name, crypt_name_withoutextension,foldername_crypt, trip[0], trip[1], trip[2]]);
    deploySh.stdout.on('data', function(data) {    // register one or more handlers
        console.log('stdout: ' + data);
    });
    deploySh.stderr.on('data', function(data) {
        console.log('stderr: ' + data);
    });
    deploySh.on('exit', function(code,req,res)
    {
        console.log('SALIENCY COMPUTATION DONE' + code);
    });
  },parseInt(CF.appPort,10));
}


////////////////////////////////////////////////////////////////////
// /signup backend account creation //
////////////////////////////////////////////////////////////////////
// creating new accounts //
router.get('/signup', function(req, res) {
    res.render('signup', {title: 'Signup', countries: CT});
});

// create folder, crypt the user, create accoutn in DB ... //
router.post('/signup',
 function(req, res) {

    console.log("CREATE FOLDER");
    var d;
    var folder = req.param('user');
    var monsh = "./folder.sh ";

    var now = new Date();
    var datest = dateFormat(now, "yyyy-mm-dd");
    var datend = dateFormat(now, "yyyy-mm-dd");
    var forfait_default_number_files = 6;
		var forfait_default_total_size = 1000000000;
    var etatentredates = Date.compare(datest, datend);
    var tab=[];
    var crypt = req.param('user');
    cryptage1 = md5(crypt);

    var forfait_default_type = 0;


    AM.checkForfait(
    {
        nr_files: forfait_default_number_files,
        size: forfait_default_total_size,
		type: forfait_default_type
    // error manaement //
    }, function(e, newObj) {
        if (e != 'forfait-type-taken') {
        	res.send(e, 400);
        } else
        {
            res.send('ok', 200);
						// create table in DB //
						AM.addNewAccount(
						{
								name: req.param('name'),
								email: req.param('email'),
								institution: req.param('institution'),
								user: req.param('user'),
								pass: req.param('pass'),
								country: req.param('country'),
								folder: req.param('name'),
								file_crypt: cryptage1,
								forfait: {type: forfait_default_type, start: datest, end: datend},
								type: CF.regularUserType
						// error manaement //
						}, function(e, newObj) {
								if (e) {
                  console.log(e);
                  res.render('signup',{
                    errors : e
                  });
									res.send(e, 400);
								} else
								{
                  console.log('account added successfully');
										res.send('ok', 200);

										var insertID = newObj.insertedId;
										// create log doc
										AM.addNewLogs(
										{
												clientID: insertID
												// error manaement //
										}, function (e){
												if (e) {
                          console.log('issue there');
												res.send(e, 400);
												} else
												{
														res.send('ok', 200);
														console.log("LOG REGISTERED");
												}
										});
										// add default folder
										AM.addNewFolder(
										{
												clientID: insertID,
                        						folderName: 'Default'
												// error manaement //
										}, function (e){
												if (e) {
                          console.log(e);
												    res.send(e, 400);
												} else
												{
														res.send('ok', 200);
														console.log("FOLDER CREATED");
												}
										});

										var folder = req.param('user');
										var exec = require('child_process').exec;
										function puts(hash, stdout, stderr) { sys.puts(stdout) }
										cryptage = md5(folder);
										exec(monsh + cryptage, puts);
										console.log("ACCOUNT CREATED");

								}
						});
				}
    });

});
/**
router.get('/add_default_folder_to_all',function(req,res){


	  var result = AM.find_AllUsersWithoutX(function(data){
		  for (var key in data) {
				// need this closure because otherwise the for loop is ASYNC!!! and the fct is running at the end of the for
			  	(function() {
					var clientID = data[key]._id;
					process.nextTick(function() {
						AM.addNewFolder(
						{
								clientID: clientID,
								folderName: 'Default',
								// error manaement //
						}, function (e, newObj){
								if (e) {
									console.log(e, 400);
								} else
								{
									var folderID = newObj.insertedId;
									// add to folderID to all files with an update
									AM.updateFilesWithFolder( clientID, folderID
									// error management
									, function (e, newObj){
											if (e) {
												console.log(e, 400);
											} else
											{
												console.log("FOLDER ATTACHED TO THE FILES"+clientID);
											}
									});
								}
						});
					});
				})();
		  }
	  });

	res.render('404');
})
**/

///////////////////////////////////////////////////////////////////////
// pass management //
//////////////////////////////////////////////////////////////////////
// password reset //
router.get('/lost-password',function(req,res){
  res.render('forgot');
})

router.post('/lost-password', function(req, res) {
// look up the user's account via their email //
    AM.getAccountByEmail(req.param('email'), function(o) {
        if (o) {
            res.send('ok', 200);
            EM.dispatchResetPasswordLink(o, function(e, m) {
                // this callback takes a moment to return //
                // should add an ajax loader to give user feedback //
                if (!e) {
                      res.redirect('passwordResetOk');
                } else {
                    res.send('email-server-error', 400);
                    for (k in e)
                        console.log('error : ', k, e[k]);
                }
            });
        } else {
            res.send('email-not-found', 400);
        }
    });
});

router.get('/reset-password', function(req, res) {
    var email = req.query["e"];
    var passH = req.query["p"];
    AM.validateResetLink(email, passH, function(e) {
        if (e != 'ok') {
            res.redirect('/');
        } else {
// save the user's email in a session instead of sending to the client //
            req.session.reset = {email: email, passHash: passH};
            res.render('reset', {title: 'Reset Password'});
        }
    })
});

router.post('/reset-password', function(req, res) {
    var nPass = req.param('pass');
// retrieve the user's email from the session to lookup their account and reset password //
    var email = req.session.reset.email;
// destory the session immediately after retrieving the stored email //
    req.session.destroy();
    AM.updatePassword(email, nPass, function(e, o) {
        if (o) {
            res.send('ok', 200);
        } else {
            res.send('unable to update password', 400);
        }
    })
});


/////////////////////////////////////////////////////////////////////////
// view & delete accounts //
////////////////////////////////////////////////////////////////////////
router.get('/print', function(req, res) {
    AM.getAllRecords(function(e, accounts) {
        res.render('print', {title: 'Account List', accts: accounts});
    })
});


//router.get('/reset', function(req, res) {
//    AM.delAllRecords(function() {
//        res.redirect('/print');
//    });
//});



router.get('*', function(req, res) {
    res.render('404', {title: 'Page Not Found'});
});


module.exports = router;


/**
    AM.addNewForfait(
    {
        type: ['0'],
        nr_files: ['15'],
        size: ['1000000000'],
    // error manaement //
    }, function (e){
        if (e) {
        res.send(e, 400);
        } else
        {
            res.send('ok', 200);
            console.log("FORFAIT CREATED");
        }
    });
 **/
