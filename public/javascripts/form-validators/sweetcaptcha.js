$(document).ready(function() {
    $("#contact-form-submit").click(function (e) {
         e.preventDefault(); // prevent page reload
        $.ajax({
            type: "POST",
            url: '/contacthorsco',
            data: $("#form1").serialize(),
            success: function (response) {
                $("#submitResponse").html(response);
            }
        });
    });


});
