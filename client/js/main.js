
var customized_f_names = [];
var customized_f_dict = {};

var f_name = $("#f_name");
var f_content = $("#f_content");
var function_defining = $(".function_defining");
var function_list = $(".function_list ul");

window.onload = function (){

	// For when sending over to server
	function formatContent(originalContent){
		var newContent = originalContent.replace(/(\r\n\t|\n|\r\t)/gm,"");
		newContent = newContent.slice(0, newContent.lastIndexOf(";"));
		return newContent.split(";");
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

	$('#submit_button').click(function(){
		if (functionIncomplete())
			return;
		function_defining.removeClass("function_defining_red");

		var isNewFunction = (customized_f_names.includes(f_name.val())) ? 0 : 1;
		saveFunctionData(isNewFunction);
		if (isNewFunction)
			createFunctionLi();

		clearFunctionCustomizing();
	})

	$(".function_list").on("click", "button", function(event){
		function_defining.removeClass("function_defining_red");
		clicked_f_name = $(this).attr("id");
		f_name.val(clicked_f_name);
		f_content.val(customized_f_dict[clicked_f_name]);
	})

};

