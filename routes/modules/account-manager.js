
var crypto 		= require('crypto');
var MongoDB 		= require('mongodb').Db;
var Server 		= require('mongodb').Server;
var moment 		= require('moment');
var md5 		= require('MD5');
var ObjectID 		= require('mongodb').ObjectID;


var CF = require('../config.js');

/* establish the database connection */


var db = new MongoDB(CF.dbName, new Server(CF.dbHost, CF.dbPort, {auto_reconnect: true}), {w: 1});
	db.open(function(e, d){
	if (e) {
		console.log(e);
	}	else{
		console.log('connected to database :: ' + CF.dbName);
	}
});


var accounts = db.collection('accounts');
var forfait  = db.collection('forfait');
var logs     = db.collection('logs');
var folder   = db.collection('folder');
var files    = db.collection('files'),
		mails		 = db.collection('mails'),
		adminMails = db.collection('adminMails');

/* login validation methods */

exports.autoLogin = function(user, pass, callback)
{
	accounts.findOne({user:user}, function(e, o) {
		if (o){
			o.pass == pass ? callback(o) : callback(null);
		}	else{
			callback(null);
		}
	});
}

exports.manualLogin = function(user, pass, callback)
{
	accounts.findOne({user:user}, function(e, o) {
		if (o == null){
			callback('user-not-found');
		}	else{
			validatePassword(pass, o.pass, function(err, res) {
				if (res){
					callback(null, o);
				}	else{
					callback('invalid-password');
				}
			});
		}
	});
}

/* record insertion, update & deletion methods */

exports.addNewMail = function(newData, callback)
{
	if( newData.isAdminMail == 0 )
	{
		mails.save(newData,{safe : true},callback);
	}
	else
	{
		adminMails.save(newData,{safe : true},callback);
	}
}

exports.updateMailStatus = function(id)
{
	console.log('ok');
	mails.update(
					{_id:ObjectID(id)},
					 {$set:{'read': CF.answered

				}});
}

exports.deleteMail = function(id, callback)
{
	mails.remove({_id: ObjectID(id)}, callback);
}

exports.addNewProspect = function(newData, callback)
{
	console.log('infunction');
newData.clientType = CF.prospect;
accounts.findOne({email:newData.email},function(e,o){
	if(o)
	{
		console.log('email already in DB');
	}
	else
	{
		accounts.findOne({name:newData.name}, function(e, o) {
			if (o)
			{
							accounts.findOne({surname:newData.surname}, function(e, o) {
									if (o)
									{
													console.log('person already in DB');
									}
									else
									{
										accounts.save(newData,{safe : true},callback);
									}
								});
			}
			else
			{
				accounts.save(newData,{safe : true},callback);
			}
		});
	}
	});
}

exports.deleteProspect = function(id, callback)
{
	accounts.remove({_id: ObjectID(id)}, callback);
}

exports.updateProspect = function(newData, callback)
{

		accounts.update(
						{_id:ObjectID(newData.id)},
						 {$set:{'Statut': newData.Statut,
					'TypeDeContrat': newData.TypeDeContrat,
	        'Secteur' : newData.Secteur,
	        'institution' : newData.institution,
	        'Fonction': newData.Fonction,
	        'Civilité': newData.Civilité,
	        'name'     : newData.name,
	        'surname'  : newData.surname,
	        'Mobile'  : newData.Mobile,
	        'Fixe'    :	newData.Fixe,
	        'email'   : newData.email,
	        'Adresse1': newData.Adresse1,
	        'Adresse2': newData.Adresse2,
	        'CodePostal':newData.Codepostal,
	        'Ville'   : newData.Ville,
	        'country' : newData.country,
	        'Meeting' : newData.Meeting,
	        'Contact1': newData.Contact1,
	        'Contact2': newData.Contact2,
	        'Relation': newData.Relation}},
						callback);
}
exports.addNewAccount = function(newData, callback)
{
	newData.clientType = CF.prospect;
	accounts.findOne({user:newData.user}, function(e, o) {
        if (o){
                callback('username-taken');
        } else{
            accounts.findOne({email:newData.email}, function(e, o) {
                if (o){
                        callback('email-taken');
                } else{
                    saltAndHash(newData.pass, function(hash){
                        newData.forfait.end = moment(newData.forfait.start).add(CF.days_nr,'day').format('YYYY-MM-DD');
                        newData.pass = hash;
                        // append date stamp when record was created //
                        newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
                        accounts.insertOne(newData, {safe: true}, callback);
                    });
                }
            });
        }
    });
}

exports.addfile = function(newData, callback)
{
    accounts.findOne({user:newData.user}, function(e, o){
            o.name 		= newData.name;
            o.email 	= newData.email;
            o.institution 	= newData.institution;
            o.country 	= newData.country;
            if (newData.pass == ''){
                    accounts.save(o, {safe: true}, function(err) {
                            if (err) callback(err);
                            else callback(null, o);
                    });
            }	else{
                    saltAndHash(newData.pass, function(hash){
                            o.pass = hash;
                            accounts.save(o, {safe: true}, function(err) {
                                    if (err) callback(err);
                                    else callback(null, o);
                            });
                    });
            }
    });
}
exports.updateAccount = function(newData, callback)
{
	accounts.findOne({user:newData.user}, function(e, o){
		o.name 		= newData.name;
		o.email 	= newData.email;
		o.institution 	= newData.institution;
		o.country 	= newData.country;
		if (newData.pass == ''){
			accounts.save(o, {safe: true}, function(err) {
				if (err) callback(err);
				else callback(null, o);
			});
		}	else{
			saltAndHash(newData.pass, function(hash){
				o.pass = hash;
				accounts.save(o, {safe: true}, function(err) {
					if (err) callback(err);
					else callback(null, o);
				});
			});
		}
	});
}

exports.updateAccountForfaits = function(newData, callback)
{
	for (var key in newData.data) {
		var id = newData.data[key][0];
		var type = newData.data[key][1];
		//remove quotes
		id = id.substr(1,id.length -2);
		accounts.update(
						{_id:ObjectID(id)},
						{$set: {'forfait.type': type}},
						callback);

	}
}


exports.getAccount_NSSresults = function(id,callback)
{
	accounts.findOne({_id:ObjectID(id)}, function(e, o){
	if (e){
                console.log("nss not found"+id);
		callback(e, null);
	}else{
		console.log("nss found"+id);
		var db_nss=o.nss_data;
		console.log(db_nss);
		callback(db_nss)
	}
	});
}

exports.find_AllUsers  = function(utype, callback)
{
    accounts.find({type:utype}, {name: 1, user: 1, email: 1, institution: 1, country: 1, date: 1, forfait: 1}).toArray(function(e, files){
        if (e){
			console.log(e);
            callback(e, null);
        }else{
            callback(files);
        };
    });

}

exports.find_AllMails = function(callback)
{
    mails.find().toArray(function(e, files){
        if (e){
			console.log(e);
            callback(e, null);
        }else{
            callback(files);
        };
    });

}

exports.find_OneMailById = function(id,callback)
{
	mails.find({_id:ObjectID(id)}).toArray(function(e,files){
		if(e){
			console.log(e);
				callback(e,null);
			}
		else
		{

			callback(files);
		}
	});
}

exports.find_OneProspectById = function(id,callback)
{
	accounts.find({_id:ObjectID(id)}).toArray(function(e,files){
		if(e){
			console.log(e);
				callback(e,null);
			}
		else
		{
			callback(files);
		}
	});
}



exports.find_AllProspects = function(callback)
{
    accounts.find({clientType : CF.prospect}).toArray(function(e, files){
        if (e){
			console.log(e);
            callback(e, null);
        }else{
            callback(files);
        };
    });

}


exports.find_Superrare  = function(id,callback)
{
	accounts.findOne({_id:ObjectID(id)}, function(e, o){
	if (e){
            callback(e, null);
	}else{
            var db_table = o.superrare_files;
            callback(db_table);
        };
    });
}

exports.find_UserInfo  = function(id,callback)
{
    accounts.findOne({_id:ObjectID(id)}, function(e, db_table){
        if (e){
            callback(e, null);
        }else{
            callback(db_table);
        };
    });
}

exports.find_UserFiles = function(id, fid, callback)
{
	// convert id to string! otherwise fid is an object!!
    files.find({ $and: [{clientID:id,folderID:ObjectID(fid)}] }, {_id: 0, filename: 1}).toArray(function(e, files){
		var file_names = [];
        for(x=0;x<files.length;x++)  {
            file_names.push(files[x].filename);
        }
        if (e){
            callback(e, null);
        }else{
            callback(file_names);
        };
    });
}

exports.find_UserFilesByFolder = function(cid, fid, callback)
{
    files.find({clientID:cid, folderID:ObjectID(fid)}).toArray(function(e, files){
       var file_names = [];

        for(x=0;x<files.length;x++)  {
            file_names.push(files[x].filename);
        }
        if (e){
            callback(e, null);
        }else{
            callback(file_names);
        };
    });
}

exports.find_UserFolders = function(id,callback)
{
    folder.find({clientID:ObjectID(id)}).toArray(function(e, folders){
        if (e){
            callback(e, null);
        }else{
            callback(folders);
        };
    });
}

exports.find_ForfaitData = function(id,callback)
{
    var result_data = [];
    accounts.findOne({_id:ObjectID(id)}, function(e, o){
    if (e){
        callback(e, null);
    }else{
        result_data.ftype  = o.forfait.type;
        result_data.fstart = o.forfait.start;
        result_data.fend   = o.forfait.end;
        forfait.findOne({"type": result_data.ftype}, function(e, ob){
        if (e){
            callback(e, null);
        }else{
            result_data.nr_files = ob.nr_files;
            result_data.total_sz = ob.size;
        }
        });
        callback(result_data)
    };
    });
}

exports.find_currentFiles = function(id, start, end, callback)
{
    files.find({clientID:id, date: {"$gte": start, "$lt": end}}).toArray(function(e, files){
        if (e){
            callback(e, null);
        }else{
            callback(files);
        };
    });
}


exports.find_SuperrareData = function(id,callback)
{
	accounts.findOne({_id:ObjectID(id)}, function(e, o){
	if (e){
            callback(e, null);
	}else{
            var db_table = o.superrare_data;
            db_table.nr_files = o.superrare_files.filename.length;
            callback(db_table)
        };
    });
}

exports.updateAccount_NSSresults = function(id,nssdata, callback)
{
	accounts.findOne({_id:ObjectID(id)}, function(e, o){
	if (e){
		callback(e, null);
	}else{
		console.log("account found"+id);
		var db_filename=o.data;
		var db_files=db_nss.files;
		var db_filescrypt=db_nss.filescrypt;
		var db_scores=db_nss.scores;
		var db_times=db_nss.times;

		//console.log(db_files);
		//console.log(db_scores);

		db_filename.push(data.file);
		db_filescrypt.push(nssdata.filecrypt);
		db_scores.push(nssdata.score);
		db_times.push(moment().format('MMMM Do YYYY, h:mm:ss a'));

		db_file_name.filename=db_files;
		db_nss.filescrypt=db_filescrypt;
		db_nss.scores=db_scores;
		db_nss.times=db_times;

		//console.log(db_nss);

		accounts.update({_id:ObjectID(id)}, {$set: {'nss_data': db_nss}}, function(err) {if (err) console.warn(err.message);else console.log('successfully updated');
    });
	}
	});
}

exports.file_number = function(id,nssdata, callback)
{
    accounts.findOne({_id:ObjectID(id)}, function(e, o){
    if (e){
            callback(e, null);
    }else{
        console.log("account found"+id);
        var db_filename=o.superrare_data;
        var db_files=db_nss.files;
        var db_filescrypt=db_nss.filescrypt;
        var db_scores=db_nss.scores;
        var db_times=db_nss.times;

        //console.log(db_files);
        //console.log(db_scores);

        db_filename.push(data.file);
        db_filescrypt.push(nssdata.filecrypt);
        db_scores.push(nssdata.score);
        db_times.push(moment().format('MMMM Do YYYY, h:mm:ss a'));

        db_file_name.filename=db_files;
        db_nss.filescrypt=db_filescrypt;
        db_nss.scores=db_scores;
        db_nss.times=db_times;

        accounts.update({_id:ObjectID(id)}, {$set: {'nss_data': db_nss}}, function(err) {if (err) console.warn(err.message);else console.log('successfully updated');
        });
    }
    });
}

exports.addNewFile = function(newData, callback)
{
    files.insertOne(newData, {safe: true}, callback);
}

exports.deleteFile = function(data, callback)
{
		//files.remove({_id: ObjectID(id), ''}, callback);
		files.remove(data, callback);
}

/**
exports.update_Superrare = function(id, crypt_name_withoutextension, callback)
{
    //var ObjectID = require('mongodb').ObjectID;
    //accounts.findOne({_id:ObjectID(id)}, function(e, o){
    accounts.findOne({ "_id": ObjectID(id) }, function(e, o){
	if (e){
		callback(e, null);
	}else{
            var db_superrare_files=o.superrare_files.filename;
            db_superrare_files.push( crypt_name_withoutextension);
            accounts.update(
                    {_id:ObjectID(id)},
                    {$set: {'superrare_files.filename': db_superrare_files}},
                    function(err) {if (err) console.warn(err.message);else console.log('successfully updated');
            });
	}
    });
}
**/

exports.updatePassword = function(email, newPass, callback)
{
	accounts.findOne({email:email}, function(e, o){
		if (e){
			callback(e, null);
		}	else{
			saltAndHash(newPass, function(hash){
		        o.pass = hash;
		        accounts.save(o, {safe: true}, callback);
			});
		}
	});
}

/* account lookup methods */

exports.deleteAccount = function(id, callback)
{
	accounts.remove({_id: ObjectID(id)}, callback);
}

exports.getAccountByEmail = function(email, callback)
{
	accounts.findOne({email:email}, function(e, o){ callback(o); });
}

exports.getAccountById = function(id, callback)
{
	accounts.findOne({_id:ObjectID(id)}, function(e, o){
		if(e){
			console.log(e);
				callback(e,null);
			}
		else
		{
			callback(o);
		}
		 });
}

exports.validateResetLink = function(email, passHash, callback)
{
	accounts.find({ $and: [{email:email, pass:passHash}] }, function(e, o){
		callback(o ? 'ok' : null);
	});
}

exports.getAllRecords = function(callback)
{
	accounts.find().toArray(
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
};

exports.delAllRecords = function(callback)
{
	accounts.remove({}, callback); // reset accounts collection for testing //
}

/** collection op Forfait, Logs, Files  **/
exports.addNewForfait = function(newData, callback)
{
    forfait.findOne({type:newData.type}, function(e, o) {
        if (o){
            callback('forfait-type-taken');
        } else{
            //newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
            forfait.insertOne(newData, {safe: true}, callback);
        }
    });
}

exports.findForfait  = function(type,callback)
{
	forfait.findOne({type:type}, function(e, o){
	if (e){
            callback(e, null);
	}else{
            callback(o);
        };
    });
}

exports.addNewLogs = function(newData, callback)
{
    //newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
    accounts.findOne({"_id": ObjectID(newData.clientID)}, function(e, o) {
        newData.start = o.forfait.start;
        newData.end   = o.forfait.end;
        newData.type  = o.forfait.type;

        logs.insertOne(newData, {safe: true}, callback);
    });
}

exports.addNewFolder = function(newData, callback)
{
    folder.findOne({"clientID": ObjectID(newData.clientID), "folderName": newData.folderName}, function(e, o) {
        if (o){
            callback('folder-name-taken');
        } else{
            folder.insertOne(newData, {safe: true}, callback);
        }
    });
}

exports.addNewFiles = function(newData, callback)
{
    //newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
    files.insertOne(newData, {safe: true}, callback);
}

exports.checkForfait = function(newData, callback)
{
	forfait.findOne({type:newData.type}, function(e, o) {
	 if (o){
	 	callback('forfait-type-taken');
	 } else{
	 	forfait.insertOne(newData, {safe: true}, callback);
	 }
	});
}

exports.updateFilesWithFolder = function(clientID, folderID, callback)
{
	files.update(
		{clientID:String(clientID)},
		{$set: {'folderID': folderID}},
		{
			multi: true,
	    },
		callback
	);
}

/* private encryption & validation methods */

var generateSalt = function()
{
	var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
	var salt = '';
	for (var i = 0; i < 10; i++) {
		var p = Math.floor(Math.random() * set.length);
		salt += set[p];
	}
	return salt;
}

var md5 = function(str) {
	return crypto.createHash('md5').update(str).digest('hex');
}

var saltAndHash = function(pass, callback)
{
	var salt = generateSalt();
	callback(salt + md5(pass + salt));
}

var validatePassword = function(plainPass, hashedPass, callback)
{
	var salt = hashedPass.substr(0, 10);
	var validHash = salt + md5(plainPass + salt);
	callback(null, hashedPass === validHash);
}

/* auxiliary methods */

var findById = function(id, callback)
{
	accounts.findOne({_id: ObjectID(id)},
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
};

var findByMultipleFields = function(a, callback)
{
// this takes an array of name/val pairs to search against {fieldName : 'value'} //
	accounts.find( { $or : a } ).toArray(
		function(e, results) {
		if (e) callback(e)
		else callback(null, results)
	});
}

exports.find_AllUsersWithoutX  = function(callback)
{
    accounts.find({},{_id: 1}).toArray(function(e, users){
        if (e){
			console.log(e);
            callback(e, null);
        }else{
            callback(users);
        };
    });

}
