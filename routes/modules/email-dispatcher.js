

var CF = require('../config.js');
var EM = {};
module.exports = EM;

EM.server = require("emailjs/email").server.connect({

	host 	    : CF.host,
	user 	    : CF.Mailuser,
	password    : CF.Mailpass,
	ssl		    : CF.ssl

});

EM.dispatchResetPasswordLink = function(account, callback)
{
	EM.server.send({
		from         : CF.sender,
		to           : account.email,
		subject      : 'Password Reset',
		text         : 'Hi' + account.name + '\n' + 'Your username is: ' + account.user + '\nPlease click this link to reset your password: \n'
+		'http://'+CF.appHost+':'+CF.appPort+'/reset-password?e='+account.email+'&p='+account.pass,
		attachment   : EM.composeEmail(account)
	}, callback );
}

EM.composeEmail = function(o)
{
	var link = 'http://'+CF.appHost+':'+CF.appPort+'/reset-password?e='+o.email+'&p='+o.pass;
	var html = "<html><body>";
		html += "Hello "+o.name+",<br><br>";
		html += "Your username is : <b>"+o.user+"</b><br><br>";
		html += "<a href='"+link+"'>Please click here to reset your password</a><br><br>";
		html += "Regards,<br>";
		html += "<a href='http://"+CF.appHost+":"+CF.appPort+">Predator help-support</a><br><br>";
		html += "</body></html>";
	return  [{data:html, alternative:true}];
}
