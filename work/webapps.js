// Make an AJAX call to Google Script
function callGoogleScript(func,param,successHandler) {
	console.log("***callGoogleScript CALLED!!!");
	$.mobile.loading( "show" )
  	if (param === undefined) param = "";
	if (successHandler === undefined) successHandler = onSuccess; //default
		var url = "https://script.google.com/macros/s/AKfycbzxidFb5mOppsZOuoPWvddsFnL_pfBh_BTIXR2nQe_PQedz-chq/exec?" + "func=" + func + "&param=";
		//var func = "getPastRaceDates";

		var request = $.ajax({
			crossDomain: true,
			url: url + encodeURIComponent(param),
			method: "GET",
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

function onSuccess (result,status,xhr) {
	console.log("***onSuccess called!!!");
	// console.log(result);
	console.log(status);
	console.log(xhr);
	$("#sys-msg").text(result.status + ":" + result.message);
	for (var i=0; i < result.response.length; i++) {
		var d = new Date(result.response[i][0]);
		result.response[i][0] = d.getDate() + "/" + (d.getMonth()+1) + " " +
								d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
	}
	$("#log-table tbody").html(makeTableHTML(result.response));
	$("#refresh-btn").removeAttr( "disabled" );	
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