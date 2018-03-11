// Make an AJAX call to Google Script
const HKRaceExec = "https://script.google.com/macros/s/AKfycbxLQFYtxgPdUH8QzOsVgW__vZ_5qC6ObmmktSZyGmGYevOShLfU/exec?";
const JSONPTestExec = "https://script.google.com/macros/s/AKfycbzxidFb5mOppsZOuoPWvddsFnL_pfBh_BTIXR2nQe_PQedz-chq/exec?";

function callGoogleScript(func,
						  param,
						  successHandler) {
	console.log("***callGoogleScript CALLED!!!");
	$.mobile.loading( "show" )
  	if (param === undefined) param = "";
	if (successHandler === undefined) successHandler = onSuccess; //default
		var url =  JSONPTestExec + "func=" + func + "&param=";
		if ($(#test-mode-switch).value("test-mode") == "off")
			url =  HKRaceExec + "func=" + func + "&param=";	
		var request = $.ajax({
			crossDomain: true,
			url: url + encodeURIComponent(param),
			method: "POST",
			dataType: "jsonp",
			success: successHandler,
			complete: onComplete,
			error: onError
			//jsonpCallback : $.ajax will provide default that server will echo back
		});

}

function onError (xhr,status,error) {
	console.log("***onError called!!!");
	console.log(xhr);
	console.log(status);
	console.log(error);
	$("#sys-msg").text(status + ":" + error);
} 

function onComplete (xhr,status) {
	/* common stuff to do after ajax call complete */
	$.mobile.loading( "hide" );  //hide loader
} 

function getLastLogMsgsCompl (result,status,xhr) {
	console.log("***getLastLogMsgsCompl called!!!");
	//$("#sys-msg").text(result.status + ": " + result.message);
	for (var i=0; i < result.response.length; i++) {
		var d = new Date(result.response[i][0]);
		result.response[i][0] = d.getDate() + "/" + (d.getMonth()+1) + " " +
								pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
	}
	$("#log-table tbody").html(makeTableHTML(result.response));
	$("#refresh-btn").removeAttr( "disabled" );	
}

function onSuccess (result,status,xhr) {
	console.log("***onSuccess called!!!");
	//console.log(result);
	console.log(status);
	console.log(xhr);
	$("#sys-msg").text(result.status + ": " + result.message + " " + result.response);
	$("#start-btn").removeAttr("disabled");  //enable dialog start btn
}

/* Return an HTML tr td from 2D array*/
function makeTableHTML(myArray) {
	var result = "";
	for (var i=0; i < myArray.length; i++) {
		result += "<tr>";
		for(var j=0; j<myArray[i].length; j++){
			result += "<td>"+myArray[i][j]+"</td>";
		}
		result += "</tr>";
	}
  return result;
}

function pad(n) {
    return (n < 10) ? ("0" + n) : n;
}