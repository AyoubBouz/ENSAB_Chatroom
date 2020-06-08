var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	fs = require('fs');
	app.listen(process.env.PORT || 3001); 
	
	function handler(req, res) {
		fs.readFile(__dirname + '/index.html',
			function (err, data) {
				if (err) {
					res.writeHead(500);
					return res.end('Error loading index.html');
				}
				
				res.writeHead(200);
				res.end(data);
			});
	}

	io.sockets.on('connection', function (socket) { 
		socket.on('chat', function (data) {
			var msg = JSON.parse(data);
			var reply = JSON.stringify({action: 'message', user: msg.user, msg: msg.msg });
			socket.emit('chat', reply);
			socket.broadcast.emit('chat', reply);
		});

		socket.on('join', function(data) {
			var msg = JSON.parse(data);
			var reply = JSON.stringify({action: 'control', user: msg.user, msg: 'joined the channel' });
			socket.emit('chat', reply);
			socket.broadcast.emit('chat', reply);
		});
	});