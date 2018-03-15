// Make an AJAX call to Google Script
const HKRaceExec = "https://script.google.com/macros/s/AKfycbxLQFYtxgPdUH8QzOsVgW__vZ_5qC6ObmmktSZyGmGYevOShLfU/exec?";
const JSONPTestExec = "https://script.google.com/macros/s/AKfycbzxidFb5mOppsZOuoPWvddsFnL_pfBh_BTIXR2nQe_PQedz-chq/exec?";

function callGoogleScript(func,
						  param,
						  successHandler) {
	console.log("***callGoogleScript CALLED!!!");
  	if (param === undefined) param = "";
	if (successHandler === undefined) successHandler = onSuccess; //default
		var url =  JSONPTestExec + "func=" + func + "&param=";
		if ( $("#test-mode-switch").val() == "off" )
			url =  HKRaceExec + "func=" + func + "&param=";	
		var request = $.ajax({
			crossDomain: true,
			url: url + encodeURIComponent(param),
			method: "GET",  //"POST" will become "GET" for jsonp!!
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

} 

function getLastLogMsgsCompl (result,status,xhr) {
	console.log("***getLastLogMsgsCompl called!!!");
	//$("#sys-msg").text(result.status + ": " + result.message);
	for (var i=0; i < result.response.length; i++) {
		var d = new Date(result.response[i][0]);
		if (isNaN( d.getTime() )) continue;  //skip invalid date
		result.response[i][0] = d.getDate() + "/" + (d.getMonth()+1) + " " +
								pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
	}
	var tblContent = "<thead><tr><th>Time</th><th>Message</th></tr></thead><tbody>"
					+ makeTableHTML(result.response) + "</tbody>";
	$logTbl = $("#log-table");
	$logTbl.find("thead").remove();
	$logTbl.find("tbody").remove();
	$logTbl.append(tblContent).table("rebuild");
	/* check if monitor is on */
	var switchOn = $("#monitor-flipswitch".prop("checked"));
	if (switchOn) {
		clearTimeout(refreshMsgLogTimer); //clear any incase this refresh was manually clicked
		var monInterval = $("#monitor-interval").val();
		refreshMsgLogTimer = setTimeout (refreshMsgLog, monInterval);  //schedule next refresh
		}

	//$("#log-table tbody").html(makeTableHTML(result.response));
	$("#refresh-btn").removeAttr( "disabled" );	
}

function onSuccess (result,status,xhr) {
	// default success callback: write sys-msg from response, enable start-btn & hide loader
	
	console.log("***onSuccess called!!!");

	$("#sys-msg").text(result.status + ": " + result.message + " " + result.response);
	$("#start-btn").removeAttr("disabled");  //enable dialog start btn
	$.mobile.loading( "hide" );  //hide loader; only 1 pending routine func allowed
}

function onConcurrentSuccess (result,status,xhr) {
	// success callback for concurrent func: write sys-msg from response only
	
	console.log("***onConcurrentSuccess called!!!");

	$("#sys-msg").text(result.status + ": " + result.message + " " + result.response);

}

function onDeleteTimeTriggersSuccess (result,status,xhr) {
	// success callback for concurrent func: write sys-msg from response only
	
	console.log("***onDeleteTimeTriggersSuccess called!!!");
	console.log(result.response);
	$("#sys-msg").text(result.status + ": " + result.message);
	var timeTriggers = result.response;
	$dialog = $( "#triggerDialog" );
	$fieldset = $dialog.find("fieldset");
	$fieldset.find("input").remove();
	$fieldset.find("label").remove();
	if (Array.isArray(timeTriggers) && timeTriggers.length > 0) {
		var htmlStr = "";
		for (var i = 0; i < timeTriggers.length; i++) {
			var uid = timeTriggers[i][0];
			var handler = timeTriggers[i][1];
			$fieldset.append('<input type="checkbox" name="' + uid + '" id="' 
							+ uid + '" data-mini="true"><label for="' + uid + '">' + handler + '</label>');
		}
		//ask jqm to enhance all checkboxes and controlgroup
		$("[type=checkbox]").checkboxradio();
		$("[data-role=controlgroup]").controlgroup("refresh");
		$fieldset.find("h3").html("Check to delete triggers:");
		$("#del-trigger-btn").removeAttr("disabled");  //enable delete btn
	} else
		$fieldset.find("h3").html("No time triggers left!");
}

function refreshMsgLog () {
	$("#refresh-btn").attr("disabled","");
	callGoogleScript('getLastLogMsgs',25, getLastLogMsgsCompl);
}

/* Return an HTML tr td from 2D array*/
function makeTableHTML(myArray) {
	var result = "";
	for (var i=0; i < myArray.length; i++) {
		if ( myArray[i][0] == "" ) continue;  //skip blank row
		result += "<tr>";
		for (var j=0; j<myArray[i].length; j++) {
			result += "<td>"+myArray[i][j]+"</td>";
		}
		result += "</tr>";
	}
  return result;
}

function pad(n) {
    return (n < 10) ? ("0" + n) : n;
}