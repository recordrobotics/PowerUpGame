var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server);

app.get("/", function(req, res) {
    res.sendFile("client.html");
});

var players = {};
var timestep = 100 / 6;

function run(id, command, when_done) {
    when_done();
}

function addplayer() {
    return {};
}

function removeplayer(id) {
    delete players[id];
}

io.on("connection", function(socket) {
    players[socket.id] = addplayer();
    socket.emit("begin", players[socket.id]);
    
    socket.on("code", function(data) {
        players[socket.id].code = data;
    });

    socket.on("run", function(data) {
        run(socket.id, data, function() {
            socket.emit("done_run");
        });
    });
    
    socket.on("disconnect", function() {
        removeplayer(socket.id);
        io.emit("left", socket.id);
    });
});

setInterval(function() {
    io.emit("update", players)
}, timestep);

server.listen(4000);
