
function connect_socket (token) {
  var socket = io.connect('', {
    query: 'token=' + token
  });

  socket.on('connect', function () {
    console.log('authenticated');
  }).on('disconnect', function () {
    console.log('disconnected');
  });
}

$('#login-form').submit(function (e) {
  e.preventDefault();
  $.post('/', {
    user: $('#user-tf').val(),
    pass: $('#pass-tf').val()
  }).done(function (result) {
    connect_socket(result.token);
  });
});
