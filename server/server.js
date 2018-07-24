var express = require("express");
var cp = require("child_process");
var scanf = require("scanf");
var fs = require("fs");
var path = require("path");

var app = express();
var server = require("http").createServer(app);
var io = require("socket.io").listen(server);

app.use(express.static(path.resolve("./../client/")));

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
let PORT = 4040;
let PREDEFINES = __dirname + "/runcode/predefines.h";
let RUN_UPDATE_SIG = "s;[44d";

var players = {};

function clamp(n, l, u) {
    return Math.min(u, Math.max(n, l));
}

function take_data(id, data) {
    var vals = scanf.sscanf(data, RUN_UPDATE_SIG + " %f %f\n");

    if(vals.length == 2) {
        players[id].left_wheel = clamp(vals[0], -1.0, 1.0);
        players[id].right_wheel = clamp(vals[1], -1.0, 1.0);
        return true;
    }

    return false;
}

// Get the path to the file where a player with id's run code will be compiled
// Property: is an absolute path
function runfile(id) {
    return __dirname + "/runcode/" + id;
}

// ** params:
// id: player id
// command: string text of command
// when_done: callback for when running is done
function run(id, command, when_done) {
    // CODE TO HANDLE RUN COMMMANDS HERE
    var contents = "#include " + PREDEFINES + "\n" + players[id].code + "\nint main(){\nstart();\n" + command + "\nreturn 0;}";
    var write = fs.writeFile(runfile(id) + ".c", contents);
    
    write.then(function() {
        cp.exec("gcc -Wall " + runfile(id) + ".c -o " + runfile(id), function(error, stdout, stderr) {
            if(error)
                when_done(null, stderr);
            else
                when_done(cp.spawn(runfile(id)), "");
        });
    }).catch(function(message) {
        when_done(null, message);
    });
}

function addplayer(id) {
    player = { id: id, left_wheel: 0.0, right_wheel: 0.0 };

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

    socket.on("cancel", function() {
        if(players[socket.id].run_p) {
            players[socket.id].run_p.kill();
            players[socket.id].run_p = null;
        }
    });

    socket.on("run", function(data) {
        run(socket.id, data, function(process, error) {
            players[socket.id].run_p = process;
            
            if(players[socket.id].run_p) {
                players[socket.id].run_p = process;

                players[socket.id].run_p.stdout.on("data", function(data) {
                    if(!take_data(socket.id, data))
                        socket.emit("run_output", data);
                });

                players[socket.id].run_p.stderr.on("data", function(data) {
                    socket.emit("run_error", data);
                });

                players[socket.id].run_p.on("close", function() {
                    socket.emit("done_run");
                    players[socket.id].run_p = null;
                });
            }
            else {
                socket.emit("run_error", error);
                socket.emit("done_run");
            }
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
console.log("Listening at port " + PORT);
