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
	$("#sys-msg").text(result.status + ":" + result.message);
	$("#log-table tbody").text(makeTableHTML(result.response));
}

/* Return an HTML tr td from 2D array*/
function makeTableHTML(myArray) {
  var result = "";
  for(var i=0; i<myArray.length; i++) {
    result += "<tr>";
    for(var j=0; j<myArray[i].length; j++){
      result += "<td>"+myArray[i][j]+"</td>";
    }
    result += "</tr>";
  }
  return result;
}