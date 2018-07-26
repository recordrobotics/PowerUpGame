
var socket = io.connect('http://localhost:4040');

var customized_f_names = [];
var customized_f_dict = {};

var f_name = $("#f_name");
var f_content = $("#f_content");
var function_defining = $(".function_defining");
var function_list = $(".function_list ul");

var COMPILING = false;
var RUNNING = false;
var previous_commands = "";
var players_pack;

window.onload = function (){

	socket.on('begin', function(new_players_pack){
		players_pack = new_players_pack;
	});
	socket.on('code_success', function(function_name){
		$(".function_errors").html("Compiled successfully");
		$(".function_errors").removeClass("function_errors_red");

		var isNewFunction = (customized_f_names.includes(f_name.val())) ? 0 : 1;
		saveFunctionData(isNewFunction);
		if (isNewFunction)
			createFunctionLi();
		clearFunctionCustomizing();
		COMPILING = false;
	});
	socket.on('code_error', function(error){
		$(".function_errors").addClass("function_errors_red");
		error_message = error.name+"<br>"+error.code+"<br>"+error.message;
		$(".function_errors").html(error_message);
		COMPILING = false;
	});
	socket.on('run_stdout', function(output){
		genRunMessage(output, "#00FFF2");
	});
	socket.on('run_stderr', function(error){
		genRunMessage(error, "red");
	});
	socket.on('done_run', function(){
		RUNNING = false;
	});
	socket.on('we_have_found_our_savior', function(){
		startHackAnimation();
	});


	// For when sending over to server
	function formatContent(originalContent){
		var newContent = originalContent.replace(/(\r\n\t|\n|\r\t)/gm,"");
		newContent = newContent.slice(0, newContent.lastIndexOf(";"));
		return newContent.split(";");
	}

	funciton startHackAnimation(){
		$(".hacked_container").addClass("hack_activated");
		setTimeout(function(){
			$(".hacked_container").removeClass("hack_activated");
			$(".hacked_container").addClass("hacked_message");
			$(".hacked_container").html("Congrats to whoever the fxck hacked our server. <br>You have won the competition!");
		}, 3000);
	}
	function genRunMessage(message, color){
		new_message = "<div style='color:"+color+"; background: transparent'>"+message+"</div>";
		previous_commands = new_message + "<br>" + previous_commands;
		$("#previous_messages").html(previous_commands);
	}
	function clearFunctionCustomizing(){
		f_name.val("");
		f_content.val("");
	}
	function functionIncomplete(){
		if (f_name.val() == "" || f_content.val() == ""){
			function_defining.addClass("function_defining_red");
			return 1;
		}
		return 0;
	}
	function saveFunctionData(isNewFunction){
		if (isNewFunction)
			customized_f_names.push(f_name.val());
		customized_f_dict[f_name.val()] = f_content.val();
	}
	function createFunctionLi(){
		var li = $("<li/>")
			.appendTo(function_list);
		var div = $("<button/>")
			.attr("id", f_name.val())
			.text(f_name.val())
			.appendTo(li);
	}
	function  focusIsOnCommandInput(){
		return (document.activeElement == document.getElementById("current_message"));
	}

	$('#submit_button').click(function(){
		if (COMPILING || functionIncomplete())
			return;
		COMPILING = true;
		function_defining.removeClass("function_defining_red");

		socket.emit("code", {function_name: f_name.val(), function_contents: f_content.val()});
		$(".function_errors").html("COMPILING...");

	})

	$(".function_list").on("click", "button", function(event){
		function_defining.removeClass("function_defining_red");
		clicked_f_name = $(this).attr("id");
		f_name.val(clicked_f_name);
		f_content.val(customized_f_dict[clicked_f_name]);
	})

	document.addEventListener("keydown", function onEvent(event) {
		if (event.which == 13 && !RUNNING && focusIsOnCommandInput()){		// Enter key
			RUNNING = true;
			socket.emit("run", $("#current_message").val());
			previous_commands = $("#current_message").val() + "<br>" + previous_commands;
			$("#current_message").val("");
			$("#previous_messages").html(previous_commands);
		}
	});


};

