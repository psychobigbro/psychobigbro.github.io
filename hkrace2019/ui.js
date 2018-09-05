/*** scrollmenu click events handler ***/
function scrollMenuEventHandler() {
		if (this.hasAttribute("disabled"))
			return;
		//dataLoading (true); //moved inside loadDataAndRefreshDom
		var raceNo = Number(this.getAttribute("raceNo"));
		if (!isNaN(raceNo) && Event) //starters cache and HKJCracecard use numeric raceNo
			loadDataAndRefreshDom (Event, false, raceNo);  //load data without bypassCache
};

/* enable / disable loader, scrollmenu, a.reload-btn and a.racecourse according to boolean busy */
function dataLoading (busy) {
	if (busy) {
		$("div.scrollmenu a").attr("disabled","");
		$("div.scrollmenu").attr("disabled","");
		$("a.reload-btn").attr("disabled","");
		$("a.reload-btn").addClass("rotate");  //css :disable cant make it rotate, so use class rotate
		$("a.result-btn").attr("disabled","");
		$("a.result-btn").addClass("rotate");
		$("a.racecourse").attr("disabled","");
		$("#start-dl-btn").attr("disabled","");
		$("#summary-page a.winodds-btn").attr("disabled","");
		$.mobile.loading( "show" ); 
	} else {
		$("div.scrollmenu a").removeAttr("disabled");  //enable race no. navigation
		$("div.scrollmenu").removeAttr("disabled");
		$("a.reload-btn").removeClass("rotate");
		$("a.reload-btn").removeAttr("disabled");
		$("a.result-btn").removeClass("rotate");
		$("a.result-btn").removeAttr("disabled");
		$("a.racecourse").removeAttr("disabled");
		$("#start-dl-btn").removeAttr("disabled");
		$("#summary-page a.winodds-btn").removeAttr("disabled");
		$.mobile.loading( "hide" );  //hide loader
	}
}
function popupMsg (msg, displayTime) {
	if (typeof displayTime == 'undefined')
		displayTime = 0;  //default infinite
	let hTag = "<h3/>";
	if (msg.length > 35)
		hTag = "<h4/>";
	$("#popup-message").empty().append($(hTag).text(msg));
	setTimeout ('$("#popup-message").popup("open", {transition:"fade"});',500);
	if (displayTime)
		setTimeout ('$("#popup-message").popup("close", {transition:"fade"});',displayTime);
}
/* update race-page DOM from starter obj */
function refreshRacePage (starter, pred, stat) {
	$("a.racecourse").text(starter.RC=="HV"?"跑馬地":"沙田");

	refreshPage ($("#race-page"), Thead2, starter, pred, stat);
	if (downloadGCSRequired ())
		popupMsg ("需下載"+RaceDate+"數據!!");
}

/* update predict-page DOM from starter obj and fireStore returned best time rec */
function refreshPredictPage (starter, pred) {
	refreshPage ($("#predict-page"), Thead1, starter, pred);
}

function refreshSummaryPage (starter, pred, stat) {
	
	refreshPage ($("#summary-page"), null, starter, pred, stat);

}

/* Common routine to refresh race and summary pages */
function refreshPage ($page, thead, starter, pred, stat) {
	//create dummy pred and stat obj if missing
	if (typeof pred == 'undefined') {
		pred = [];
		for (let i=0; i<starter.runners.length; i++) {
			pred.push({date:"N/A",weight:0,dr:0,recTime:MaxSeconds,adjRecTime:MaxSeconds,predTime:MaxSeconds});
			pred.push({date:"N/A",weight:0,dr:0,recTime:MaxSeconds,adjRecTime:MaxSeconds,predTime:MaxSeconds});
		}
	};
	if (typeof stat == 'undefined') {
		stat = [];
		for (let i=0; i<starter.runners.length; i++) {
			stat.push([0,0]);
			stat.push({weight:false,course:false,distance:false});
			stat.push({testHorse:false,testHorseFail:false});
			stat.push([0,0,0,0]);
		}
	};
	$page.find("h1").text ("第 " + starter.raceNo + " 場");
	let raceTime = starter.raceTime; 
	$page.find("div.scrollmenu a").removeClass("active-race");
	$page.find("div.scrollmenu a:nth-child("+starter.raceNo+")").addClass("active-race");
	let $info = $page.find("div.race-info");
	if (starter.fromCache)
		$info.css("color","grey");
	else
		$info.removeAttr("style");
	$info.text(	starter.raceDate + " " + raceTime + " "
		+ starter.classC + " " + starter.RCC	+ starter.track + " " + starter.course + " " + starter.distance + " "
		+ (starter.going == '(Null)' ? '':starter.going+' ') + starter.raceName
		+ " " + starter.created.toLocaleTimeString() + "更新");
	//update first thead for RCC/track/course/distance selected
	let RCC, track, course, distance;
	if ($("#select-RC").val() == "今") {
		RCC = starter.RCC;
		track = starter.track;
		course = starter.course;
		distance = starter.distance;
	} else {
		RCC = $("#select-RC").val();
		track = $("#select-track").val();
		course = $("#select-course").val();
		distance = $("#select-distance").val();
	}
	// remove old tbody and replace thead
	let ai = $("#ai-mode-switch").val() == "on";  //indicate need to retain AI column
	let $tbl = $page.find("table");
	$tbl.find("tbody").remove();
	// Summary-tbl need the original theads to rebuild table or otherwise column toggle checkbox will be set upon display
	if ($tbl.prop("id") != "summary-table") {
		$tbl.find("thead").remove();
		$tbl.append(thead);
	}
		//if ($tbl.prop("id") == "race-table") {
			$tbl.find("thead:first-child th:nth-child(7)").text(starter.RCC+starter.track+starter.distance);
			$tbl.find("thead:first-child th:nth-child(9)").text(RCC+track+distance+" "+course);
		//} else {
		//	$tbl.find("thead:first-child th:nth-child(6)").text(starter.RCC+starter.track+starter.distance);
		//	$tbl.find("thead:first-child th:nth-child(7)").text(RCC+track+distance+" "+course);
		//}
	//} else {
		//$tbl.find("thead:first-child th:nth-child(7)").text(starter.RCC+starter.track+starter.distance);
		//$tbl.find("thead:first-child th:nth-child(9)").text(RCC+track+distance+" "+course);
	//}
	if (!ai)
		if ($tbl.prop("id") == "summary-table")
			$tbl.find("thead:first-child th:nth-child(15)").attr("data-priority","6");
		else
			$tbl.find("thead:first-child th:nth-child(20)").attr("data-priority","6");
	
	let tblContent = "<tbody>";
	//s index to stat, p index to pred
	let timeArr = [];
	for (let i=0,p=0,s=0; i<starter.runners.length; i++,p+=2,s+=4) {
		let runner = starter.runners[i];
		if (runner.num == "(Null)") {
			timeArr[i] = MaxSeconds;
			continue;	//ignore Standby Horse
		}
		let horseName = runner.horseName + (runner.scratch ? "(退出)" : "");
		let allowance = runner.allowance + runner.flAllowance;
		let jockey = runner.jockey + ((allowance>0) ? "(-"+allowance+")" : "");
		tblContent += "<tr>";
/*1*/	tblContent += "<td class='seqno'>" + runner.num + "</td>";
/*2*/	tblContent += "<td>" 
					+ '<a href='+HKJCHorseUrl+runner.horseNo+' target="_blank">'+horseName+'</a>';
					+ "</td>";
/*3*/	tblContent += "<td>" + jockey + "</td>";
/*4*/	tblContent += "<td>" + runner.trainer + "</td>";
/*5*/	tblContent += "<td>" + runner.dr + "</td>";
		if (allowance)
/*6*/		tblContent += "<td style='font-style: italic;'>" + (runner.weight-allowance) + "</td>";
		else
			tblContent += "<td>" + runner.weight + "</td>";
		let dateMade = pred[p].date;
/*7*/	if (dateMade.length==8) { //yyyymmdd -> dd/mm/yy 
			dateMade = dateMade.substr(6,2)+"/"+dateMade.substr(4,2)+"/"+dateMade.substr(2,2);
			tblContent += "<td><div class='scrollable'>" + dateMade + "&nbsp;&nbsp;&nbsp;" + pred[p].dr + "檔" + pred[p].weight
						+ "磅" + pred[p].recTime + "秒</div></td>";
		}
		else /* N/A */
			tblContent += "<td><div class='scrollable'>" + dateMade + "</div></td>";
		let time = pred[p].predTime;
		timeArr[i] = runner.scratch ? MaxSeconds : time;
/*8*/	tblContent += "<td>" + secToMin(time) + "</td>";
		dateMade = pred[p+1].date;
/*9*/	if (dateMade.length==8) { //yyyymmdd -> dd/mm/yy
			dateMade = dateMade.substr(6,2)+"/"+dateMade.substr(4,2)+"/"+dateMade.substr(2,2);
			tblContent += "<td><div class='scrollable'>" + dateMade + "&nbsp;&nbsp;&nbsp;" + pred[p+1].dr + "檔" + pred[p+1].weight
						+ "磅" + pred[p+1].recTime + "秒</div></td>";
		}
		else /* N/A */
			tblContent += "<td><div class='scrollable'>" + dateMade + "</div></td>";
		time = pred[p+1].predTime;
/*10*/	tblContent += "<td>" + secToMin(time) + "</td>";		
/*11*/	tblContent += "<td>" + stat[s][0] + "/" + stat[s][1] + "</td>";
/*12*/	tblContent += "<td>" + stat[s+3][0] + "/" + stat[s+3][1] + "</td>";
		let remarkWeight = stat[s+1].weight ? "&#10028" : "";
		let remarkCourse = stat[s+1].course ? "&#10028" : "";
		let remarkDistance = stat[s+1].distKing ? "&#10026" : stat[s+1].distance ? "&#10025" : "";
		let remarkTestHorse = stat[s+2].testHorse ? "&#10028" : "";
		let remarkTestHorseFail = stat[s+2].testHorseFail ? "&#10025" : "";
/*13*/	tblContent += "<td>" + remarkTestHorse + "</td>";
		tblContent += "<td>" + remarkTestHorseFail + "</td>";
		tblContent += "<td>" + remarkWeight + "</td>";
		tblContent += "<td>" + remarkDistance + "</td>";
/*17*/	tblContent += "<td>" + remarkCourse + "</td>";
/*18*/	tblContent += "<td>" + "" + "</td>";	//WinOdds
/*19*/	tblContent += "<td>" + "" + "</td>";	//PlaOdds
/*20*/	tblContent += "<td>" + "" + "</td>";	//AI Score
		tblContent += "</tr>";
	}
	tblContent += "</tbody>";
	$tbl.append(tblContent);
	let $tbody = $tbl.find("tbody"); 
	
	// color ranks
	let indices = indicesOfSortedArray (timeArr);
	for (let i=0; i<4; i++) {
		let rowIdx = indices[i]+1;
		let $cell = $tbody.find("tr:nth-child(" + rowIdx + ")")
					.find("td:nth-child(8)");
		if ($cell.text() != "N/A")
			$cell.css("background-color", TimeRankColors[i]);			   
	}
	$tbl.table("rebuild");
	
	/* The rest is for SuperUser only */
	if (!SuperUser) return;
	
	//Handle horse num bet marker event and display
	let $num = $page.find("td.seqno");
	$num.off().on ("taphold", {raceDate:starter.raceDate,raceNo:starter.raceNo, $num:$num}, function(e){
		e.preventDefault();
		e.stopPropagation();
		let num = $(this).text();
		let horseName = $(this).next().text();
		let raceNo = e.data.raceNo;
		let raceDate = e.data.raceDate;
		let $sQinLeg = $("#select-qin-leg");
		let $sQplLeg = $("#select-qpl-leg");
		let qplLegs = {"位置Q配搭":""};
		let qinLegs = {"連贏 配搭":""};
		$sQinLeg.empty();
		$sQplLeg.empty();
		let bet = Bet.tbl[raceNo-1][Number(num)-1]; //use Bet.tbl instead of $(this).attr as latter is not uptodate
		let winAmt = bet ? bet.winAmt : "";
		let plaAmt = bet ? bet.plaAmt : "";
		let qinLeg = bet ? bet.qinLeg : "";
		let qplLeg = bet ? bet.qplLeg : "";
		if (winAmt || plaAmt || qinLeg || qplLeg ) {
			$( "#popup-marker h2" ).html(num+"號:"+horseName+"<br>已下注");
			$( "#mark-bet-btn" ).text("取消下注");
			$("#select-win-amt").val(winAmt).selectmenu( "refresh" );
			$("#select-pla-amt").val(plaAmt).selectmenu( "refresh" );
			$("#select-qin-amt").val(bet.qinAmt).selectmenu( "refresh" );
			$("#select-qpl-amt").val(bet.qplAmt).selectmenu( "refresh" );
			if (qplLeg)
				qplLegs["位置Q"+num+"搭"+qplLeg] = qplLeg;
			if (qinLeg)
				qinLegs["連贏 "+num+"搭"+qinLeg] = qinLeg;
			renewSelect ($sQinLeg, qinLegs, qinLeg);
			renewSelect ($sQplLeg, qplLegs, qplLeg);
		}
		else {
			if (horseName.indexOf("(退出)") >= 0) {
				popupMsg (num+"號:已退出",3000)
				return;   //withdrawn horse bet not allowed but may cancel
			}
			$( "#popup-marker h2" ).html(num+"號:"+horseName);
			$( "#mark-bet-btn" ).text("下注");
			$("#select-win-amt").val("").selectmenu( "refresh" );
			$("#select-pla-amt").val("").selectmenu( "refresh" );
			$("#select-qin-amt").val(10).selectmenu( "refresh" );
			$("#select-qpl-amt").val(10).selectmenu( "refresh" );
			let $num = e.data.$num;
			$num.each (function (idx) {
				let thisNum = $(this).text();
				if (thisNum != num) {
					let horseName = $(this).next().text();
					if (horseName.indexOf("(退出)") < 0) {
						let bet = Bet.tbl[raceNo-1][Number(thisNum)-1];
						if (!bet || bet.qplLeg != num)
							qplLegs["位置Q"+num+"搭"+thisNum] = thisNum;
						if (!bet || bet.qinLeg != num)
							qinLegs["連贏 "+num+"搭"+thisNum] = thisNum;
					}
				}
			});
			renewSelect ($sQinLeg, qinLegs, "");
			renewSelect ($sQplLeg, qplLegs, "");
		}
		$( "#popup-marker" ).data('opener', {elm:$(this),raceDate:raceDate,raceNo:raceNo,num:Number(num)})
							.popup("open");
	});
	
	//color mark betted horses if Bet.tbl is current
	if (Bet.raceDate == starter.raceDate) {
		let raceNoIdx = starter.raceNo - 1;
		$num.each ((numIdx, elm) => {  //"this" in fat arrow function = calling context (window), cant be used
			let cell = Bet.tbl[raceNoIdx][numIdx];
			if ( cell && (cell.winAmt || cell.plaAmt)) {
				let betType = cell.winAmt && cell.plaAmt ? "win-pla" : cell.winAmt ? "win" : "pla";
				$(elm).addClass(betType); /*
					  .attr("win-amt", cell.winAmt)
					  .attr("qin-leg", cell.qinLeg)
					  .attr("qpl-leg", cell.qplLeg)
					  .attr("qin-amt", cell.qinAmt)
					  .attr("qpl-amt", cell.qplAmt)
					  .attr("pla-amt", cell.plaAmt);*/
			}
		});
	}
}

/* Update winOdds column (second last column) in column toggle tables */
function refreshWinOdds (obj) {
	if (!obj || !obj.wins || !obj.plas || obj.wins.length != obj.plas.length) return;
	let wins = obj.wins;
	let plas = obj.plas;
	//select tbody of all columnToggle tables
	let $tblBody = $( "[data-mode='columntoggle'] tbody" );

	let winOdds = [];
	for (let i=0; i < wins.length; i++ ) {
		let rowIdx = i+1;
		winOdds.push(wins[i].winOdds);
		let $cell = $tblBody.find("tr:nth-child(" + rowIdx + ")")
							.find("td:nth-last-child(3)");
		let $cell2 = $tblBody.find("tr:nth-child(" + rowIdx + ")")
							 .find("td:nth-last-child(2)");
		$cell.text(wins[i].winOdds);
		$cell2.text(plas[i].plaOdds);
		if (wins[i].hottest)
			$cell.css("backgroundColor", "#f33");
		if (plas[i].hottest)
			$cell2.css("backgroundColor", "#f33");
		//if (wins[i].bigDrop)  //no bigDrop in JSON winOdds
		//	$cell.css("backgroundColor", "#ff0");	
	}
	let indices = indicesOfSortedArray (winOdds);
	let c = 0;
	for (let i=indices.length-1; i > indices.length-3; i-- ) {
		let rowIdx = indices[i] + 1;
		$tblBody.find("tr:nth-child(" + rowIdx + ")")
					.find("td:nth-last-child(3)")
					.css("backgroundColor", ColdWinColors[c++]);	
	}
}
function indicesOfSortedArray (arr) {

	let indices = [];
	for (let i = 0; i < arr.length; i++) indices.push(i);
	indices.sort( (a, b) => { return arr[a] < arr[b] ? -1 : arr[a] > arr[b] ? 1 : 0;
	});
	return indices;
}

/* Return an HTML tr td from 2D array*/
function makeTableHTML(myArray) {
	var result = "";
	for (var i=0; i < myArray.length; i++) {
		if ( myArray[i][0] == "" ) continue;  //skip blank row
		result += "<tr>";
		for (var j=0; j < myArray[i].length; j++) {
			result += "<td>" + myArray[i][j] + "</td>";
		}
		result += "</tr>";
	}
  return result;
}

function secToMin (time) {
	return (time==MaxSeconds ? "N/A" : Math.floor(time/60).toString()+"." + pad((time%60).toFixed(2)))	
}

function pad(n) {
    return (n < 10) ? ("0" + n) : n;
}
