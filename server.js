var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server);

app.get("/", function(req, res) {
    res.sendFile("client.html");
});

// Constants
let RED_ID = 0;
let BLUE_ID = 1;
let START_X_BLUE = 0.0;         // meters
let START_Y_BLUE = 0.0;         // meters
let START_X_RED = 0.0;          // meters
let START_Y_RED = 5.0;          // meters
let START_HEADING_BLUE = 0.0;   // degrees
let START_HEADING_RED = 180.0;  // degrees
let TIMESTEP = 100.0 / 6.0;     // milliseconds
let PORT = 4000;

var players = {};

/*var world = new p2.World({
    gravity: [0.0, 0.0]
});*/

// ** params:
// id: player id
// command: string text of command
// when_done: callback for when running is done
function run(id, command, when_done) {
    // CODE TO HANDLE RUN COMMMANDS HERE


    when_done();
}

function addplayer(id) {
    player = { id: id };

    var red = 0, blue = 0;

    for(play in players) {
        if(play.color == RED_ID)
            red++;
        else if(play.color == BLUE_ID)
            blue++;
    }

    if(red == blue) {
        var id = (Math.random() >= 0.5);
    
        if(id)
            player.color = RED_ID;
        else
            player.color = BLUE_ID;
    }
    else if(red > blue) {
        player.color = BLUE_ID;
    }
    else {
        player.color = RED_ID;
    }

    if(player.color == BLUE_ID) {
        player.x = START_X_BLUE;
        player.y = START_Y_BLUE;
        player.heading = START_HEADING_BLUE;
    }
    else {
        player.x = START_X_RED;
        player.y = START_Y_RED;
        player.heading = START_HEADING_RED;
    }

    players[id] = player; 
}

function removeplayer(id) {
    delete players[id];
}

io.on("connection", function(socket) {
    addplayer(socket.id);
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
}, TIMESTEP);

server.listen(PORT);
console.log("Listening at port " + PORT)
