$(document).ready(function(){

	var ac = new AdminController();
/**
	$('#account-form').ajaxForm({
		beforeSubmit : function(formData, jqForm, options){
			// validate data - before
			// push the disabled username field onto the form data array //
			$('input.forfait-value').each(
				function(index){  
					var input = $(this);
					//!!! validate data -> input.val() - can take values from forfait_ids
					//formData.push({name:'user-id', value: input.attr('data-id'), ftype: input.val()})//value:$('#user-tf').val()})
					formData[index].dataid = input.attr('data-id');
					formData[index].value = input.val();
				}
			);
			return true;
		},
		success	: function(responseText, status, xhr, $form){
			console.log('success');
			if (status == 'success') ac.onUpdateSuccess();
		},
		error : function(e){
			console.log('error');
			if (e.responseText == 'email-taken'){
			    av.showInvalidEmail();
			}	else if (e.responseText == 'username-taken'){
			    av.showInvalidUserName();
			}
		}
	});
**/

		$('#account-form').submit(function(e){
			e.preventDefault();
			var formData = {};
			$('input.forfait-value').each(
					function(index){  
							if (isNaN($(this).val())) 
							{
								alert("Forfait type must be a number!");
								return false;
							}
							formData[index] = [$(this).attr('data-accountid'), $(this).val()];
					}
			);
			$.ajax({
				url: "/update_forfait",
				type: "POST",
				//dataType: "json",
				data: formData,
				cache: false,
				timeout: 5000,
				complete: function() {
					//called when complete
					console.log('process complete');
				},
				success: function(response) {
					if(response=='ok')
					{
						$('.admin-warning').html("<div id='divSuccessMsg'></div>");
            $('#divSuccessMsg').html("<p><strong>Forfait information was updated.</strong></p>")
            .hide()
            .fadeIn(1500, function() { $('#divSuccessMsg'); });
           	setTimeout(resetAll,4000);
					}
					else
					{
						console.log('2');
					}
					console.log('process sucess');
				},
				error: function() {
					console.log('process error');
				},
			});
			return false;
		});

	function resetAll(){
		//$("#contactForm").show();
		$('#divSuccessMsg').remove(); // Removing it as with next form submit you will be adding the div again in your code. 
	}	

	$('#github-banner').css('top', '41px');

// customize the account settings form //
	$('#account-form h1').text('Account Settings');
	$('#account-form #sub1').text('Here are the current settings for your account.');
	$('#user-tf').attr('disabled', 'disabled');
	$('#account-form-btn1').html('Delete');
	$('#account-form-btn1').addClass('btn-danger');

	$('#account-form-btn2').html('Update');
	

// setup the confirm window that displays when the user chooses to delete their account //

// customize the account settings form //
	$('#account-form .sub2').text('The forfait types: 0 - Default; 1 - Intermediare');

})