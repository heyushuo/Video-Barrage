let express = require('express')
let app = express();
let http = require('http').Server(app)
let io = require('socket.io')(http)

// 倒入path模块
var path = require('path');
console.log(path.resolve('./'));

//1、 倒入自動打開浏览器模块
var opn = require('opn');
let port = 3000;
var uri = 'http://localhost:' + port;

// 1、指定服務器服务器根目录
app.use(express.static("../frontend/projects/hellosocket/dist"));

// console.log(__dirname+"../frontend/projects/hellosocket/dist");

app.get('/', function(req, res) {
    // 服務器默認index
    res.sendFile('../frontend/projects/hellosocket/dist/index.html');
    
});


io.on('connection', function(socket) {
    console.log('a user connected')
    socket.on('chat message', function(msg) {
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    });
})


http.listen(port, function() {
    // 2 、自动打开浏览器
    opn(uri);
    console.log('server started on ' + port);
})