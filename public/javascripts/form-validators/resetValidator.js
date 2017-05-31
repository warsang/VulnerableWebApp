
function ResetValidator(){

// modal window to allow users to reset their password //
    this.setPassword = $('#set-password');
    this.setPassword.modal({ show : false, keyboard : false, backdrop : 'static' });
    this.setPasswordAlert = $('#set-password .alert');
}

ResetValidator.prototype.validatePassword = function(s)
{
	if (s.length >= 6){
    var re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).{4,15}$/;
		return re.test(s);
	}	else{
		this.showAlert('Password requires at least one lower case letter, one upper case letter, one digit, 6-20 length, and no spaces');
		return false;
	}
}

ResetValidator.prototype.showAlert = function(m)
{
	this.setPasswordAlert.attr('class', 'alert alert-error');
	this.setPasswordAlert.html(m);
	this.setPasswordAlert.show();
}

ResetValidator.prototype.hideAlert = function()
{
    this.setPasswordAlert.hide();
}

ResetValidator.prototype.showSuccess = function(m)
{
	this.setPasswordAlert.attr('class', 'alert alert-success');
	this.setPasswordAlert.html(m);
	this.setPasswordAlert.fadeIn(500);
}
