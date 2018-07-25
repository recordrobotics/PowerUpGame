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
let START_HEADING_BLUE = 0.0;   // degrees
let START_HEADING_RED = 180.0;  // degrees
let TIMESTEP = 100.0 / 6.0;     // milliseconds
let PORT = 4040;
let PREDEFINES = __dirname + "/runcode/predefines.h";
let RUN_UPDATE_SIG = "s;[44d";
let INVALID_START_DISTANCE_SQUARED = 3.0;
let BLUE_STARTS = [[0.0, 0.0], [2.0, 0.0], [4.0, 0.0], [6.0, 0.0], [8.0, 0.0], [10.0, 0.0]];
let RED_STARTS = [[0.0, 20.0], [2.0, 20.0], [4.0, 20.0], [6.0, 20.0], [8.0, 20.0], [10.0, 20.0]];

// Contains information that will sent with "update"
var players_pack = {};

// Contains other player information
var players = {};

function clamp(n, l, u) {
    return Math.min(u, Math.max(n, l));
}

function take_data(id, data) {
    var vals = scanf.sscanf(data, RUN_UPDATE_SIG + " %f %f\n");

    if(vals && vals.length == 2) {
        players[id].left_wheel = clamp(vals[0], -1.0, 1.0);
        players[id].right_wheel = clamp(vals[1], -1.0, 1.0);
        return true;
    }

    return false;
}

// Get the path to the file where a player with id's run code will be compiled
// Property: is an absolute path
function runfile(id) {
    return __dirname + "/runcode/" + id.replace(/\W/g, "");
}

function update_function_files(id, dont_include, when_done)
{
    var cl_id = id.replace(/\W/g, "");
    var headers = "#ifndef __" + cl_id + "__\n#define __" + cl_id + "__\n";
    var definitions = "#ifndef __" + cl_id + "DEFS__\n#define __" + cl_id + "DEFS__\n";
    for(var key in players[id].functions) {
        if(!players[id].functions.hasOwnProperty(key) || dont_include.indexOf(key) != -1)
            continue;

        headers += "void " + key + "();\n";
        definitions += "void " + key + "() {\n" + players[id].functions[key] + "\n}\n";
    }
    headers += "#endif\n";
    definitions += "#endif\n";

    fs.writeFile(runfile(id) + ".h", headers, function(error) {
        if(error)
            when_done(error.message);
        else {
            fs.writeFile(runfile(id) + "_defs.h", definitions, function(error) {
                if(error)
                    when_done(error.message);
                else
                    when_done();
            });
        }
    });
}

// ** params:
// id: player id
// command: string text of command
// when_done: callback for when running is done
function run(id, command, when_done) {
    update_function_files(id, [], function(error) {
        if(error)
            when_done(2, null, error);
        else {
            var includes = "#include \"" + PREDEFINES + "\"\n#include \"" + runfile(id) + ".h\"\n#include \"" + runfile(id) + "_defs.h\"\n";
            var contents = includes + "\nint main(){\nstart();\n" + command + "\nend();\nreturn 0;}\n";
            var write = fs.writeFile(runfile(id) + ".c", contents, function(error) {
                if(error)
                    when_done(2, null, error.message);
                else {
                    cp.exec("gcc -Wall " + runfile(id) + ".c -o " + runfile(id), function(error, stdout, stderr) {
                        if(error)
                            when_done(1, null, stderr);
                        else
                            when_done(0, cp.spawn(runfile(id)));
                    });
                }
            });
        }
    });
}

// Updates or adds a function to a player
function update_function(id, data, when_done) {
    update_function_files(id, [ data.name ], function(error) {
        if(error)
            when_done(2, data, error);
        else {
            var func = "void " + data.name + "(){\n" + data.body + "\n}\n";
            var header = "void " + data.name + "();\n";
            var includes = "#include \"" + PREDEFINES + "\"\n" + header + "\n#include \"" + runfile(id) + ".h\"\n#include \"" + runfile(id) + "_defs.h\"\n";
            var contents = includes + func + "int main(){return 0;}\n";
            var write = fs.writeFile(runfile(id) + ".c", contents, function(error) {
                if(error)
                    when_done(2, data, error.message);
                else {
                    cp.exec("gcc -Wall " + runfile(id) + ".c -o " + runfile(id), function(error, stdout, stderr) {
                        if(error) {
                            when_done(1, data, stderr);
                        }
                        else {
                            players[id].functions[data.name] = data.body;
                            when_done(0, data);
                        }
                    });
                }
            });
        }
    });
}

function addplayer(id) {
    player = {};

    var red = 0, blue = 0;

    var red_numbers = [];
    var blue_numbers = [];

    for(idx in players_pack) {
        if(!players_pack.hasOwnProperty(idx))
            continue;
        
        if(players_pack[idx].color == RED_ID) {
            red++;
            red_numbers.push(players_pack[idx].number);
        }
        else if(players_pack[idx].color == BLUE_ID) {
            blue++;
            blue_numbers.push(players_pack[idx].number);
        }
    }

    if(red == blue) {
        var col = (Math.random() >= 0.5);
    
        if(col)
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

    function comp(a, b) { return (a - b); }

    var starts, numbers;
    if(player.color == BLUE_ID) {
        player.heading = START_HEADING_BLUE;
        starts = BLUE_STARTS;

        blue_numbers.sort(comp);
        numbers = blue_numbers;
    }
    else {
        player.heading = START_HEADING_RED;
        starts = RED_STARTS;

        red_numbers.sort(comp);
        numbers = red_numbers;
    }
    
    for(var i = 0; i < numbers.length; i++) {
        if(numbers[i] != i) {
            player.number = i;
            break;
        }
    }

    if(!player.number && player.number != 0)
        player.number = numbers.length;
    
    for(var i = 0; i < starts.length; i++) {
        var invalid = false;

        for(idx in players_pack) {
            if(!players_pack.hasOwnProperty(idx))
                continue;
            
            var xd = players_pack[idx].x - starts[i][0];
            var yd = players_pack[idx].y - starts[i][1];

            if((xd * xd + yd * yd) < INVALID_START_DISTANCE_SQUARED) {
                invalid = true;
                break;
            }
        }

        if(!invalid) {
            player.x = starts[i][0];
            player.y = starts[i][1];
            players_pack[id] = player; 
            players[id] = { functions: {}, left_wheel: 0.0, right_wheel: 0.0 };
            return true;
        }
    }

    return false;
}

function removeplayer(id) {
    delete players[id];
    delete players_pack[id];

    cp.exec("rm " + runfile(id) + ".c " + runfile(id) + " " + runfile(id) + ".h " + runfile(id) + "_defs.h");
}

io.on("connection", function(socket) {
    if(!addplayer(socket.id))
        socket.emit("rejected", players_pack);
    else {
        socket.emit("begin", { all: players_pack, you: socket.id });
        
        socket.on("code", function(data) {
            update_function(socket.id, { name: data.function_name, body: data.function_contents }, function(error_code, info, message) {
                console.log("Function update done with code " + error_code + ":  " + message);
                if(error_code == 0)
                    socket.emit("code_success", info.name);
                else
                    socket.emit("code_error", { code: error_code, name: info.name, message: message });
            });
        });

        socket.on("cancel", function() {
            if(players[socket.id].run_p) {
                players[socket.id].run_p.kill();
                players[socket.id].run_p = null;
            }
        });

        socket.on("run", function(data) {
            run(socket.id, data, function(error_code, process, error) {
                console.log("Run done with code " + error_code + ":  " + error);
                players[socket.id].run_p = process;
                
                if(players[socket.id].run_p) {
                    players[socket.id].run_p = process;

                    players[socket.id].run_p.stdout.on("data", function(data) {
                        if(!take_data(socket.id, data))
                            socket.emit("run_stdout", data);
                    });

                    players[socket.id].run_p.stderr.on("data", function(data) {
                        socket.emit("run_stderr", data);
                    });

                    players[socket.id].run_p.on("close", function() {
                        socket.emit("done_run");
                        players[socket.id].run_p = null;
                    });
                }
                else
                    socket.emit("run_error", { code: error_code, message: error });
            });
        });
        
        socket.on("disconnect", function() {
            removeplayer(socket.id);
            io.emit("left", socket.id);
        });
    }
});

setInterval(function() {
    io.emit("update", players_pack);
    //console.log(players_pack);
}, TIMESTEP);

server.listen(PORT);
console.log("Listening at port " + PORT);
