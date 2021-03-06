var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	fs = require('fs'),
	redis = require('redis');

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

function SessionController (user) {

	this.sub = redis.createClient();
	this.pub = redis.createClient();
	
	this.user = user;
}

SessionController.prototype.subscribe = function(socket) {
	this.sub.on('message', function(channel, message) {
		socket.emit(channel, message);
	});
	var current = this;
	this.sub.on('subscribe', function(channel, count) {
		var joinMessage = JSON.stringify({action: 'control', user: current.user, msg: 'joined the channel' });
		current.publish(joinMessage);
	});
	this.sub.subscribe('chat');
};

SessionController.prototype.rejoin = function(socket, message) {
	this.sub.on('message', function(channel, message) {
		socket.emit(channel, message);
	});
	var current = this;
	this.sub.on('subscribe', function(channel, count) {
		var rejoin = JSON.stringify({action: 'control', user: current.user, msg: 'rejoined the channel' });
		current.publish(rejoin);
		var reply = JSON.stringify({action: 'message', user: message.user, msg: message.msg });
		current.publish(reply);
	});
	this.sub.subscribe('chat');
};

SessionController.prototype.unsubscribe = function() {
	this.sub.unsubscribe('chat');
};

SessionController.prototype.publish = function(message) {
	this.pub.publish('chat', message);
};

SessionController.prototype.destroyRedis = function() {
	if (this.sub !== null) this.sub.quit();
	if (this.pub !== null) this.pub.quit();
};

io.sockets.on('connection', function (socket) {
	console.log(socket.id);
	socket.on('chat', function (data) { 
		var msg = JSON.parse(data);
		if (socket.sessionController === null) {
			socket.sessionController = new SessionController(msg.user);
			socket.sessionController.rejoin(socket, msg);
		} else {
			var reply = JSON.stringify({action: 'message', user: msg.user, msg: msg.msg });
			socket.sessionController.publish(reply);
		}
		console.log(data);
	});

	socket.on('join', function(data) {
		var msg = JSON.parse(data);
		socket.sessionController = new SessionController(msg.user);
		socket.sessionController.subscribe(socket);
		console.log(data);
	});

	socket.on('disconnect', function() { 
		if (socket.sessionController === null) return;
		socket.sessionController.unsubscribe();
		var leaveMessage = JSON.stringify({action: 'control', user: socket.sessionController.user, msg: ' left the channel' });
		socket.sessionController.publish(leaveMessage);
		socket.sessionController.destroyRedis();
	});
});