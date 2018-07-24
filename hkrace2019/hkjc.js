// Make an AJAX call to firebase Host to get xml from HKJC

function hkjcXmlQuery  (type,
						param,
						successHandler,
						respTimeout) {
	console.log("***hkjcXmlQuery CALLED!!!");
  	if (param === undefined) param = "";
	if (respTimeout === undefined) respTimeout = 30 * 1000;	//default to 30 seconds
	if (successHandler === undefined) successHandler = onXMLQuerySuccess; //default
		var url =  "/xml?" + "type=" + type + param; 
		var request = $.ajax({
			//crossDomain: true,
			url: url,		// + encodeURIComponent(param),
			method: "GET",
			dataType: "xml",
			success: successHandler,
			complete: onComplete,
			timeout: respTimeout,
			error:  function (xhr,status,error) {
						onError (xhr,status,error,type, successHandler);
					}
		});
}

