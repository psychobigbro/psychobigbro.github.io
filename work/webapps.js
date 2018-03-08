// Make an AJAX call to Google Script
function callGoogleScript(func,param) {
	console.log("***callGoogleScript CALLED!!!");
  	if (param === undefined) param = "";
		var url = "https://script.google.com/macros/s/AKfycbzxidFb5mOppsZOuoPWvddsFnL_pfBh_BTIXR2nQe_PQedz-chq/exec?" + "func=" + func + "&param=";
		//var func = "getPastRaceDates";

		var request = $.ajax({
			crossDomain: true,
			url: url + encodeURIComponent(param),
			method: "GET",
			dataType: "jsonp",
			success: onSuccess,
			error: onError
		//jsonpCallback : $.ajax will provide default
		});

    }

function onError (xhr,status,error) {
	console.log("***onError called!!!");
	console.log(xhr);
	console.log(status);
	console.log(error);
} 

function onSuccess (result,status,xhr) {
	console.log("***onSuccess called!!!");
	// console.log(result);
	console.log(status);
	console.log(xhr);
	document.getElementById("demo").innerHTML
		= result.status + "<br>" + result.message + "<br> "
		+ result.response.toString().replace(/,/g,"<br>"); 
}