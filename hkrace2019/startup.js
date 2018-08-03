  /*** Startup ***/
  /* Globals */
  var Season = "";
  var SuperUser = false;
  var RaceDate = "";  //global to hold current raceDate AS OBTAINED FROM last online Starters, dd-mm-yyyy
  var MaxRaceNo = 0;  //global to hold max. race no corr. to Event
  var Event = null;     //global object for current race event AS OBTAINED FROM getRaceInfo [yyyymmdd','RC']
								  // or set by Event datebacking; this is changed before RaceDate which is starter based
  var HorsesOSRaceDate = "";	//raceDate of downloaded iDB horses store
  var HistoryOSRaceDate = "";	//raceDate of downloaded iDB history store
  var Tfjs = {}; 	//global object for TensorFlow.js model and params
  var Features;
  //var Db;		 	//firestore db 
  var LastFunc = "";//global to hold last webapp func name invoked
  var ReqFunc = ""; //global to hold webapp or window function being requested
  var Executor =""; //global to hold executor (window or google app) of the function
  //var RC = '';		//racecourse of current race, use whatever starter return
  const DrRate = "0.1";
  const WgRate = "0.1";
  var StarterCacheTimeoutMinutes = 5;
  var IDbPromise;
  var IDbVersionNo = 2;
  var HorsesIDbPromise;
  var ScrollLeft = 0; //scrollLeft() of scrollmenu
  var Bet = {};		  //object containing bet table and others
  
  const ScalerMean_ = //tensorflow model features (X) StandardScaler mean_
		[0,0,0,0];

  const ScalerMin_ =   //tensorflow model features (X) MinMaxScaler min_
		[-0.07692308, -0.04237288, -0.01226994, -3.5862069,  -2.4168798,   0.,
		0.,          0.,          0.,          0.,          0.,          0.,
		0.09090909];
  const ScalerScale_ = //tensorflow model features (X) MinMaxScaler scale_, as in X * scale_ + min_
		[7.69230769e-02, 8.47457627e-03, 1.02249489e-02, 3.44827586e-02,
		2.55754476e-03, 7.14285714e-02, 7.51879699e-03, 7.48502994e-04,
		9.79772811e-01, 7.14285714e-02, 7.51879699e-03, 9.84050367e-01,
		9.09090909e-02];
/*
  const ScalerScale_ = //tensorflow model features (X) StandardScaler scale_, as in (X - mean_) / scale_
		[];
*/
  const MaxSeconds = 9999.99;  //indicate no horse finish time is available for comparison
  const HKJCHorseUrl = "http://www.hkjc.com/chinese/racing/horse.asp?HorseNo=";
  const HKJCOnlineExec = "https://script.google.com/macros/s/AKfycbycwkuTZbAuOLNyA4gHKrjv422WYNDeAAPg1xLSg-KL0prwETA/exec?";
  const ShatinTurf={"1000M": "1000",
					"1200M": "1200",
					"1400M": "1400",
					"1600M": "1600",
					"1800M": "1800",
					"2000M": "2000",
					"2200M": "2200",
					"2400M": "2400"
				   };
  const ValleyTurf={"1000M": "1000",
					"1200M": "1200",
					"1650M": "1650",
					"1800M": "1800",
					"2200M": "2200",
					"2400M": "2400"
				   };
  const ShatinAWT= {"1200M": "1200",
					"1650M": "1650",
					"1800M": "1800",
					"2000M": "2000",
					"2400M": "2400"
				   };
  const NoCourse = {"*":""
				   };
  const ShatinCourse={"A": "A",
					"A+2": "A+2",
					"A+3": "A+3",
					"B": "B",
					"B+2": "B+2",
					"C": "C",
					"C+3": "C+3"
				   };
  const ValleyCourse={"A": "A",
					"A+2": "A+2",
					"B": "B",
					"B+2": "B+2",
					"B+3": "B+3",
					"C": "C",
					"C+3": "C+3"
				   };
  const TwoTracks= {"草地":"草",
					"全天候跑道":"全"
				   };
  const OneTrack = {"草地":"草"
				   };
  const TimeRankColors = ["#ff0","#e6e600","#cc0","#990"];
  const ColdWinColors = ["#0ff","#00d8d8","#0cc"];
  /* for predict-table */
  const Thead1 = '<thead><tr>' +
	'<th>編</th>' +
	'<th data-priority="2">馬</th>' +
	'<th data-priority="3">騎</th>' +
	'<th data-priority="4">練</th>' +
	'<th data-priority="2" colspan="2">排位</th>' +
	'<th data-priority="1" colspan="2">預測時間</th>' +
	'<th data-priority="1" colspan="2">參考時間</th>' +
	'<th data-priority="5">騎練</th>' +
	'<th data-priority="5">皇牌</th>' +
	'<th data-priority="5" colspan="5">注意事項</th>'+
	'<th data-priority="4">獨贏</th>'+
	'<th data-priority="4">位置</th>'+
	'<th data-priority="4">AI</th>'+
	'</tr></thead>'+
	'<thead><tr>'+
	'<th>號</th><th>名</th><th>師</th><th>馬</th>'+
	'<th>檔</th><th>負磅</th>'+
	'<th>記錄</th><th>預測時間</th><th>記錄</th><th>參考時間</th>'+
	'<th>上位</th>'+ '<th>上位</th>' +
	'<th>試</th><th>失</th><th>重</th><th>程</th><th>道</th>'+
	'<th>賠率</th>'+
	'<th>賠率</th>'+
	'<th>Score</th>'+
	'</tr></thead>';
  /* for race-table */
  const Thead2 = '<thead><tr>' +
	'<th>編</th>' +
	'<th data-priority="1">馬</th>' +
	'<th data-priority="2">騎</th>' +
	'<th data-priority="4">練</th>' +
	'<th data-priority="1" colspan="2">排位</th>' +
	'<th data-priority="2" colspan="2">預測時間</th>' +
	'<th data-priority="4" colspan="2">參考時間</th>' +
	'<th data-priority="3">騎練</th>' +
	'<th data-priority="5">皇牌</th>' +
	'<th data-priority="3" colspan="5">注意事項</th>'+
	'<th data-priority="1">獨贏</th>'+
	'<th data-priority="1">位置</th>'+
	'<th data-priority="2">AI</th>'+
	'</tr></thead>'+
	'<thead><tr>'+
	'<th>號</th><th>名</th><th>師</th><th>馬</th>'+
	'<th>檔</th><th>負磅</th>'+
	'<th>記錄</th><th>預測時間</th><th>記錄</th><th>參考時間</th>'+
	'<th>上位</th>'+ '<th>上位</th>' +
	'<th>試</th><th>失</th><th>重</th><th>程</th><th>道</th>'+
	'<th>賠率</th>'+
	'<th>賠率</th>'+
	'<th>Score</th>'+
	'</tr></thead>';
  var StdTimes = [];	/* HKJC standard race time for each RCC/Track/Distance/class */
  StdTimes["田草1000"] = [55.80,55.80,55.95,56.50,56.75];
  StdTimes["田草1200"] = [68.75,68.95,69.35,69.60,69.75];
  StdTimes["田草1400"] = [81.50,81.65,81.80,82.35,82.60];
  StdTimes["田草1600"] = [94.10,94.25,94.65,95.30,95.45];
  StdTimes["田草1800"] = [107.60,107.75,107.90,108.35,108.55];
  StdTimes["田草2000"] = [122.10,122.30,122.50,123.20,123.45];
  StdTimes["田草2200"] = [MaxSeconds,133.75,136.30,136.45,137.50];
  StdTimes["田草2400"] = [MaxSeconds,MaxSeconds,MaxSeconds,MaxSeconds,MaxSeconds];
  StdTimes["谷草1000"] = [MaxSeconds,56.95,57.10,57.25,57.55];
  StdTimes["谷草1200"] = [69.60,69.75,70.10,70.30,70.45];
  StdTimes["谷草1650"] = [100.00,100.15,100.35,100.75,101.00];
  StdTimes["谷草1800"] = [109.20,109.35,109.90,110.80,111.25];
  StdTimes["谷草2200"] = [MaxSeconds,MaxSeconds,137.00,137.70,138.45];
  StdTimes["田全1200"] = [68.20,68.35,68.55,69.20,69.35];
  StdTimes["田全1650"] = [MaxSeconds,98.25,98.60,99.10,99.60];
  StdTimes["田全1800"] = [MaxSeconds,MaxSeconds,107.80,108.30,109.20];
  /* Initialize Firebase & Firestore */
  (function () {
	'use strict';
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
		.register('sw.js')
		.then( registration => {
			console.log ("Service Worker Registered");
			//registration.update();  //uncomment if force update on each reload
		})
		.catch( error => {
			console.log ('Service Worker Registration failed:',error);
		});
	}
	let config = {
		apiKey: "AIzaSyA4O_NJXXFT7jFrk08GWRME17Cl2PQnNzc",
		authDomain: "hkrace-2018.firebaseapp.com",
		databaseURL: "https://hkrace-2018.firebaseio.com",
		projectId: "hkrace-2018",
		storageBucket: "hkrace-2018.appspot.com",
		messagingSenderId: "443501722512"
	};
	firebase.initializeApp(config);	  
	/* Lastly, Initialize indexedDB */
	//check for support
	if (!('indexedDB' in window)) {
		console.log('This browser doesn\'t support IndexedDB');
		return;
	}
	HorsesIDbPromise = idb.open('HKRaceDB');
	IDbPromise = idb.open('HKRace', IDbVersionNo, function(upgradeDb) {
		if (!upgradeDb.objectStoreNames.contains('starters')) {
		  upgradeDb.createObjectStore('starters', {keyPath: 'raceNo'});
		};
		if (!upgradeDb.objectStoreNames.contains('JTInPlace')) {
		  upgradeDb.createObjectStore('JTInPlace', {keyPath: 'key'});
		};
		if (!upgradeDb.objectStoreNames.contains('predictedTime')) {
		  upgradeDb.createObjectStore('predictedTime', {keyPath: 'key'});
		};
		if (!upgradeDb.objectStoreNames.contains('remarks')) {
		  upgradeDb.createObjectStore('remarks', {keyPath: 'key'});
		};
		if (!upgradeDb.objectStoreNames.contains('testHorse')) {
		  upgradeDb.createObjectStore('testHorse', {keyPath: 'key'});
		};
		if (!upgradeDb.objectStoreNames.contains('columnToggle')) {
		  upgradeDb.createObjectStore('columnToggle', {keyPath: 'key'});
		};
		if (!upgradeDb.objectStoreNames.contains('winOdds')) {
		  upgradeDb.createObjectStore('winOdds', {keyPath: 'key'});
		};
		if (!upgradeDb.objectStoreNames.contains('cache')) {
		  upgradeDb.createObjectStore('cache', {keyPath: 'key'});
		};
		if (!upgradeDb.objectStoreNames.contains('trump')) {
		  upgradeDb.createObjectStore('trump', {keyPath: 'key'});
		};
		if (!upgradeDb.objectStoreNames.contains('courseSelect')) {
		  upgradeDb.createObjectStore('courseSelect', {keyPath: 'raceNo'});
		};
		/* Move to new iDB HKRaceDB
		if (!upgradeDb.objectStoreNames.contains('horses')) {
		  let horsesOS = upgradeDb.createObjectStore('horses', {autoIncrement:true});
		  horsesOS.createIndex('HY', ['horseNo','yyyymmdd'], {unique: true});
		  horsesOS.createIndex('HSY', ['horseNo','season','yyyymmdd'], {unique: true});
		  horsesOS.createIndex('HRTDY', ['horseNo','RCC','track','distance','yyyymmdd'], {unique: true});
		  horsesOS.createIndex('HRTDCY', ['horseNo','RCC','track','distance','course','yyyymmdd'], {unique: true});
		};
		*/
		if (!upgradeDb.objectStoreNames.contains('history')) {
		  let historyOS = upgradeDb.createObjectStore('history', {keyPath: ['raceIdx','horseID']});
		  historyOS.createIndex('TJ', ['trainer','jockey'], {unique: false});
		  historyOS.createIndex('TT', ['trainer','trumpCard'], {unique: false});
		};
	});

  })();
  /****************/
  /* on DOM ready */
  /****************/
  $( document ).ready(function() {
    // Instantiate common popup (shared by multiple pages) on DOMReady, and enhance its contents
    $( "#select-dialog" ).enhanceWithin().popup();
    $( "#event-dialog" ).enhanceWithin().popup();
    $( "#popup-message" ).enhanceWithin().popup();
    $( "#popup-dialog" ).enhanceWithin().popup();
	$( "#page-menu" ).enhanceWithin().popup();
	$( "#popup-marker" ).enhanceWithin().popup();
	$( "#left-panel" ).enhanceWithin().panel();
	//$.event.special.tap.tapholdThreshold = 1000;
	$.event.special.tap.emitTapOnTaphold = false;
	$.mobile.loadPage( "#trainer-page" );
	//$.mobile.loadPage( "#result-page" ); 
	$.mobile.loadPage( "#jockey-page" );  //to init data-tables before add.rows() in race-page
  });
  /***********************************/
  /* on various pageinit, pagecreate */
  /***********************************/
  $(document).on("pageinit", "#trainer-page", async function () {
	await getFromCache ("cache", "TrainerEntries")
	.then ((rec) => {
		let data = (rec && rec.data) ? rec.data : null;
		let table = $("#trainer-table").DataTable( {
			data: data,
			paging: false,
			ordering: false,
			info: false,
			searching: false,
			scrollX: true,
			scrollY: "90vh",  //% of viewport height
			scrollCollapse: true,
			fixedColumns: true,
			fixedHeader: false
		});
		$( table.column(0).nodes() ).addClass( 'fixed-column' );  //for stying 1st column
		$(window).resize(function() {
			$("#trainer-table").DataTable().draw();
		});
		/*** page menu click events handler, need to separate from jockey-page as iphone may not work correctly ***/
		$("#trainer-page div.dataTables_wrapper th:first-child").on ("click", (e) => {
			$("#page-menu").popup( "open", { x: e.pageX, y: e.pageY, transition: "slideDown"} );
			e.preventDefault();
		});
	});	
  });
  $(document).on("pageinit", "#jockey-page", async function () {
	await getFromCache ("cache", "JockeyRides")
	.then ((rec) => {
		let data = (rec && rec.data) ? rec.data : null;
		let table = $("#jockey-table").DataTable( {
			data: data,
			paging: false,
			ordering: false,
			info: false,
			searching: false,
			scrollX: true,
			scrollY: "90vh",  //% of viewport height
			scrollCollapse: true,
			fixedColumns: true,
			fixedHeader: false
		});
		$( table.column(0).nodes() ).addClass( 'fixed-column' );
		$(window).resize(function() {
			$("#jockey-table").DataTable().draw();
		});
		/*** page menu click events handler ***/
		$("#jockey-page div.dataTables_wrapper th:first-child").on ("click", (e) => {
			$("#page-menu").popup( "open", { x: e.pageX, y: e.pageY, transition: "slideDown"} );
			e.preventDefault();
		});
	});	
  });

  $(document).on("pageinit", "#result-page", async function () {
	await Promise.all ([getFromCache ("cache", "Results"),
				  getFromCache ("cache", "ResTblColVisStates")])
	.then ((recs) => {
		let data = (recs[0] && recs[0].data) ? recs[0].data.contents : null;
		const title = (recs[0] && recs[0].data) ? recs[0].data.title : null;
		const visibles = (recs[1] && recs[1].data && recs[1].data.length == 13) ? recs[1].data
				: [true,false,true,false,false,true,false,false,true,false,false,true,false];
		let colOptions = [];  //array of objects for DataTable column options
		visibles.forEach ( bool => colOptions.push({"visible":bool}));
		let table = $("#result-table").DataTable( {
			data: data,
			paging: false,
			ordering: false,
			info: false,
			searching: false,
			scrollX: true,
			scrollY: "80vh",  //% of viewport height
			scrollCollapse: true,
			columns: colOptions,
			fixedColumns: true,
			fixedHeader: false,
			createdRow: function( row, data, dataIndex ) {
				// add race-begin class to 1st row of each race
				if (data[0] != "")
					$(row).addClass( 'race-begin' );
			}
		});
		$("#result-page div.result-msg").html(title);
		$(window).resize(function() {
			$("#result-table").DataTable().draw();
		});
		$('#result-page a.toggle-vis').on( 'click', function (e) {
			e.preventDefault();
 			// Get the column indices from attr
			let cols = $(this).attr('data-column').split(",");
			let colsState = false;
			let columns = [];
			// set all columns to invisible if any of the columns visible
			cols.forEach ((col, idx) => {
				columns[idx] = table.column( Number(col));
				colsState = colsState || columns[idx].visible();
			});
			if (colsState)
				columns.forEach (column => column.visible(false));
			// now all 3 or 4 cols invisible, change to whatever the peers look like
			else {
				let states = table.columns().visible();
				let targetStates = [];
				let allState = false;
				if (columns.length == 3) {
					//3 neighboring cols
					columns.forEach ((column,idx) => {
						targetStates[idx] = states[idx+1] || states[idx+4] || states[idx+7] + states[idx+10];
						allState = allState || targetStates[idx];
					});
				} else {
					//4 peer cols
					columns.forEach ((column,idx) => {
						targetStates[idx] = states[idx*3+1] || states[idx*3+2] || states[idx*3+3];
						allState = allState || targetStates[idx];
					});
				}
				//follow the pattern if some col in pattern is visible, otherwise (all invisible) make all target col visible
				if (allState)
					columns.forEach ((column, idx) => column.visible(targetStates[idx]));
				else
					columns.forEach (column => column.visible(true));	
			}
			let colVisStates = [];  //.visible() only array like, need to transform
			$.each (table.columns().visible(), function (idx, visible) {
				colVisStates[idx] = visible;
			});
			cacheToStore ('cache', {key:'ResTblColVisStates',data:colVisStates});
			//console.log (colVisStates);
		});
	});
	$("a.result-btn").on("click", function() {
		if (this.hasAttribute("disabled")  || $("#online-mode-switch").val() == "off")
			return;
		updateResultTable();
	});
	// color page title as indication if switched to offline mode, as result-page may not have been created when switched
	if ( $("#online-mode-switch").val() == "off" )
		$("h1[role='heading']").css("color","pink");
	else
		$("h1[role='heading']").removeAttr("style");
  });
  
  $(document).on("pagebeforecreate", "#summary-page", function () {
	$( "#summary-page [data-mode='columntoggle']" ).on( "tablecreate", function( event, ui ) {
		let id = this.id + "-popup";
		let $checkboxes = $("#" + id + " [type=checkbox]");
		$checkboxes.each(function(index) {
			getFromCache ("columnToggle", index)
			.then ((rec) => {
				if (rec && !rec.checked) //a record is found and .checked is false (default all checked)
					$(this).prop("checked", false); //.checkboxradio("refresh"); //.trigger("change"); not necessary!!
			});
		});
	});
  });
 
  /********************/ 
  /*** on race-page ***/
  /********************/
  // clone race-page before creation to avoid duplicated column toggle markups
  $( document ).on( "pagebeforecreate", "#race-page", function() {
	if($("#predict-page").length == 0) {
		let newPage = $("#race-page").clone();
		newPage.prop("id", "predict-page");
		newPage.find("#race-table").prop("id", "predict-table");
		//newPage.find("a.racecourse").prop("href","#select-dialog");
		newPage.find("div.page-tab li:nth-child(2) a").css("backgroundColor", "#c00");
		newPage.find("table").attr("data-mode","columntoggle");
		newPage.appendTo($.mobile.pageContainer);
		$.mobile.loadPage( "#predict-page" );  //must load it in the background otherwise data-url is not updated
	};
	if($("#summary-page").length == 0) {
		let newPage3 = $("#race-page").clone();
		newPage3.prop("id", "summary-page");
		newPage3.find("#race-table").prop("id", "summary-table");
		newPage3.find("div.page-tab li:nth-child(3) a").css("backgroundColor", "#c00");
		//newPage3.find("table").attr("data-mode","columntoggle");
		newPage3.appendTo($.mobile.pageContainer);
		$.mobile.loadPage( "#summary-page" );
		//move column toggle button to header
		$("#summary-page a.ui-table-columntoggle-btn").appendTo("#summary-page .columntogglePlaceholder");
		$("#summary-page a.ui-table-columntoggle-btn").addClass("ui-icon-bullets")
													  .addClass("ui-btn-icon-notext")
													  .addClass("ui-nodisc-icon");
	};
	$("#race-page div.page-tab li:first-child a").css("backgroundColor", "#c00");
  });
  
  $( document ).on( "pageinit", "#race-page", function() {

	/*$("body").on( "pagecontainertransition", function( event, ui ) {
		//if (ui.toPage.prop("id") == "page2")
		console.log (ui);
	}); */
	/*** scrollmenu click events handler ***/
	$("div.scrollmenu a").on("click", scrollMenuEventHandler);
	
	// save scrollmenu scroll position
	$("div.scrollmenu").scroll (function () {
		ScrollLeft = $(this).scrollLeft();
	});
	
	/*** update toPage upon pagecontainershow ***/
	$( ":mobile-pagecontainer" ).on( "pagecontainershow", function( event, ui ) {

		switch(ui.toPage.prop("id")) {
		case "summary-page":
			let $tbl = $( "#summary-page [data-mode='columntoggle']" );
			let id = $tbl.prop("id") + "-popup";
			let $checkboxes = $("#" + id + " [type=checkbox]");
			// change event hdlr for toggle checkbox must be bound on pageshow as jqm will override it if done earlier
			$checkboxes.off().on ("change", function() {
				let index = $checkboxes.index(this);
				let checked = $(this).is(":checked");
				cacheToStore ("columnToggle",{key:index,checked:checked})
			});
		case "race-page":
		case "predict-page":
		case "summary-page":
			ui.toPage.find("div.scrollmenu").scrollLeft(ScrollLeft);
			break;
		case "trainer-page":
			$("#trainer-table").DataTable().columns.adjust().draw();
			for (let i=0; i < 4; i++)
				$("#trainer-table td").has("rank"+i).css("background-color", TimeRankColors[i]);
			break;			
		case "jockey-page":
			$("#jockey-table").DataTable().columns.adjust().draw();
			for (let j=0; j < 4; j++)
				$("#jockey-table td").has("rank"+j).css("background-color", TimeRankColors[j]);
			break;
		case "result-page":
			$("#result-table").DataTable().columns.adjust().draw();
			break;
		default:
		}
	});
	/**************/
	/* reload-btn */
	/**************/
	$("div a.reload-btn")
	.on("tap", function() {
		if (this.hasAttribute("disabled") || !SuperUser)  //only superuser can do reload!!
			return;
		//dataLoading (true); //moved inside loadDataAndRefreshDom
		let raceNum = $("#predict-page h1").text().replace(/\D+/g,"");
		if (raceNum && Event)//starters cache and HKJCOnline use numeric raceNo
			loadDataAndRefreshDom (Event, true, Number(raceNum));  //re-load data bypassCache
	})
	.on("taphold", function (e) {
		e.preventDefault();  // need also -webkit-touch-callout:none in css to stop ios taphold default!!
		popupMsg ("function to be implemented",5000);
	});
	
	$("#left-panel a.exec-func")
	  .on("click", function() {
		let funcLabel = $(this).find("h3").text();
		let func = this.getAttribute("func");
		let exec = this.getAttribute("exec");  		//tell who to execute the function,, default is window
		if (exec != "google" && typeof window[func] !== "function") {
			console.log ("func attribute:", func, "not a function");
			return;
		}
		let $dialog = $( "#popup-dialog" );
		var prompt = funcLabel + "?"
		$dialog.find("h3").html(prompt);
		$dialog.find("span").attr("func",func);
		$("#left-panel").panel("close");
		window.scrollTo(0, 0);  //scroll to top left before popup open, otherwise iphone misplace dialog
		$dialog.popup( "open" ); //, {positionTo:"div.race-info"});
	})
	/***************/
	/* confirm-btn */
	/***************/
	$("#confirm-btn").on("click", function() {
		let func = $( "#popup-dialog" ).find("span").attr("func");
		if (typeof window[func] === "function")
			window[func]();
			//console.log (func, " executed");
		else
			console.log (func, " not a window function");
		$("#popup-dialog").popup("close");
	})
	$("#left-panel a.download-all")
	  .on("click", function() {
		if ($("#dialog").length === 0) {
			console.log("Creating dialog...");
			$.mobile.pageContainer.append($("<div/>", {
				"data-role": "dialog",
                "data-close-btn": "right",
                "data-theme": "b",
                "data-overlay-theme": "e",
				id: "dialog"
			}).append($("<div/>", {
				"data-role": "header",
                "data-theme": "b"
			}).append($("<h1/>").text("下載賽事往績數據"))).append($("<div/>", {
				"data-role": "content",
                "data-theme": "a"
			}).append($("<ul/>", {
				"data-role": "listview",
                "data-inset": true
			}).append($("<li/>").text("查詢下期賽事 ..."))).append($("<a/>", {
				"data-role": "button",
                "data-theme": "c",
				id: "start-dl-btn"
			}).text("工作中 ..."))) );
		}
		$.mobile.changePage("#dialog", {
			transition: "pop"
		});
		//$("#dialog").popup().popup("open");
		let $btn = $("#start-dl-btn");
		// check button state to ensure no download in progress
		if ($btn[0].hasAttribute("disabled") == false) { //download not in progress
			$btn.text("工作中，請稍候 ...");
			$("#dialog li:first-child").text("查詢下期賽事 ...");
			execGoogleAppPromise ("getRaceDayInfo")
			.then ( info => {
				if (info) {
					if ( info.raceDate && info.maxRaceNo > 5) { //racecard of upcoming raceDate ready??
						$("#dialog li:first-child")
						.text("下期賽事："+info.raceDate+(info.event[1]=="ST" ? " 沙田":" 跑馬地")+" 共"+info.maxRaceNo+ "場");
						if (info.raceDate == info.GCSHistoryRaceDate && info.raceDate == info.GCSHorsesRaceDate) {
							let reminder = "有數據須下載。";
							if (HorsesOSRaceDate == info.GCSHorsesRaceDate &&
								HistoryOSRaceDate == info.GCSHistoryRaceDate)
								reminder = "數據可再下載。"
							$btn.text( reminder+"點擊開始" );
							$btn.on("click", function() {
								$(this).off();  //adding disable attib can't disable click event, so off here
								$(this).text("下載開始 ...");
								//rebuild scrollmenu for maxRaceNo if changed
								if (info.maxRaceNo != MaxRaceNo) {
									updateScrollMenu (info.maxRaceNo);
									MaxRaceNo = info.maxRaceNo;
								}
								Event = info.event; /** Update to next raceDate HERE !!! **/
								cacheRaceInfo ();
								//let maxRaceNo = $("#race-page div.scrollmenu").children().length;
								downloadGCSFiles (Event, MaxRaceNo);
							});
						} else
							$btn.text( "數據有待更新，請稍後再試" );
					} else
						$btn.text( "賽事有待更新，請稍後再試" );
				} else
					$btn.text( "Can't getRaceDayInfo!!" );
			})
			.catch ( error => {
				$btn.text(JSON.stringify(error));
			});
		}
	});
	/***************/
	/* winodds-btn */
	/***************/
	$("div a.winodds-btn") 
	.on("tap", function(e) {
		if (this.hasAttribute("disabled"))
			return;
		//let $this = $(this);
        //if (e.type == "click" && $this.data("longTapRegistered")) {
        //    e.preventDefault();
		//	$this.removeData("longTapRegistered");
		//	return;
        //}
		let raceNum = $("#race-page h1").text().replace(/\D+/g,"");
		if (!raceNum) return;  //page has no raceNo
		dataLoading (true); //disable button to avoided repeated calls
		if ( $("#online-mode-switch").val() == "off" ) {  //return cache in offline mode
			getFromCache ("winOdds", Number(raceNum), RaceDate)
			.then ( rec => {
				dataLoading (false);
				if (rec) {
					refreshWinOdds (rec.obj);
					/* also predict AI score and refresh */
					updateScoresFromFeatures (rec.obj.wins, Number(raceNum), RaceDate);
				}
				//else
				//	popupMsg ("No winOdds cache for race "+raceNum+" in offline mode", 2000);
			});
			return;
		};
		// get winOdds online
		let param = JSON.stringify({raceDate:Event[0],venue:Event[1], raceNo:raceNum});
		execGoogleAppPromise ("fetchWinPlaOdds", param)
		.then (obj => {
			dataLoading (false);
			if (obj && obj.wins) {
				refreshWinOdds (obj);
			    /* also predict AI score using winOdds and refresh */
				updateScoresFromFeatures (obj.wins, obj.raceNo, obj.raceDate);
				/* cache winOdds for offline access */
				cacheToStore ("winOdds", {key:obj.raceNo, raceDate:obj.raceDate, obj:obj});
			}
			else
				console.log ("No WinOdds for race", raceNum);
		})
		.catch (error => {
			dataLoading (false);
			console.log (error);
			popupMsg ("fetchWinPlaOdds:"+JSON.stringify(error));
		});
	})
	.on("taphold", function (e) {
		e.preventDefault();  // need also -webkit-touch-callout:none in css to stop ios taphold default!!
		//$(this).data("longTapRegistered", true);  //so that click event fired after knows
		if (Bet.raceDate != RaceDate) {
			popupMsg ("No current Bet Table",1000);
			return;
		}
		let raceNum = $("#race-page h1").text().replace(/\D+/g,"");
		if (!raceNum) return;  //page has no raceNo
		let r = Number(raceNum) - 1;
		let betNos = [];
		for (let n=0; n<Bet.tbl[r].length; n++) {
			let cell = Bet.tbl[r][n];
			if (cell && cell.plaAmt)
				betNos.push (n+1);
		}
		if (betNos.length != 3) {
			popupMsg ("Cant find 3 bets on Place for race "+raceNum,1000);
			return;
		}
		let trioBet = betNos.join('-');
		popupMsg ("Fetching Odds for Trio " + trioBet);
		let param = JSON.stringify({raceDate:Event[0],venue:Event[1], raceNo:raceNum});
		execGoogleAppPromise ("fetchTriOdds", param)
		.then (obj => {
			if (obj && obj.tris) {
				popupMsg ('單T ' + trioBet + ' 賠率: ' + obj.tris[trioBet]);
			} else
				popupMsg ('Trio odds not available',1000);
		});
	});
	/****************/
	/* mark-bet-btn */
	/****************/
	$("#mark-bet-btn").on("click", function() {
		let opener = $("#popup-marker").data("opener");
		let $elm = opener.elm;
		let raceDate = opener.raceDate;
		let raceNoIdx = opener.raceNo - 1;
		let numIdx = opener.num - 1;
		$("#popup-marker").popup("close");
		if ($(this).text() == "取消下注") {
			$elm.removeClass("win pla win-pla")
				.removeAttr("win-amt pla-amt qin-leg qpl-leg");
			Bet.tbl[raceNoIdx][numIdx] = {};
		}
		else {
			let winAmt = $("#select-win-amt").val();
			let plaAmt = $("#select-pla-amt").val();
			let qinLeg = $("#select-qin-leg").val();
			let qplLeg = $("#select-qpl-leg").val();
			if (!winAmt && !plaAmt )
				return;  //nothing chosen
			else {
				let betType = winAmt && plaAmt ? "win-pla" : winAmt ? "win" : "pla";
				$elm.removeClass("win pla win-pla")  //remove residual not updated by cancellation in another page
					.addClass(betType).attr("win-amt", winAmt)
									  .attr("qin-leg", qinLeg)
									  .attr("qpl-leg", qplLeg)
									  .attr("pla-amt", plaAmt);
				if (Bet.raceDate != raceDate) {
					// create a new Bet.tbl upon raceDate change
					Bet.raceDate = raceDate;
					// dont use Array().fill(Array().fill()) which will create reference to entire column upon single cell upd
					Bet.tbl = Array(11).fill(null).map(() => Array(14).fill(null));
				}
				Bet.tbl[raceNoIdx][numIdx] = {winAmt:winAmt, qinLeg:qinLeg, plaAmt:plaAmt, qplLeg:qplLeg};
			}			
		}
		cacheToStore ("cache", {key:"Bets",betTbl:Bet.tbl, raceDate:raceDate});
	});
	/********************/
	/* change-event-btn */
	/********************/
	$("#change-event-btn").on("click", function() {
		let opener = $("#event-dialog").data("opener");
		let pastEventsInfo = opener.pastEventsInfo;
		$("#event-dialog").popup("close");
		let raceDate = $('#select-event').val();  //yyyymmdd
		Event = pastEventsInfo[raceDate].event;
		if (MaxRaceNo != pastEventsInfo[raceDate].maxRaceNo) {
			MaxRaceNo = pastEventsInfo[raceDate].maxRaceNo
			updateScrollMenu (MaxRaceNo);
		}
		RaceDate = raceDate.toHyphenatedDate();   //=> dd-mm-yyyy, will forceit caches
		cacheRaceInfo ();
		popupMsg ("Event changed to:"+Event.toString());
	});
	/*******************/
	/* switches change */
	/*******************/
	$("#online-mode-switch").change ( () => {
		cacheSettings();
		// color page title as indication if switched to offline mode
		if ( $("#online-mode-switch").val() == "off" )
			$("h1[role='heading']").css("color","pink");
		else
			$("h1[role='heading']").removeAttr("style");
	}) ;
	$("#ai-mode-switch").change ( () => cacheSettings()) ;
	$("#horses-file").change ( () => cacheSettings()) ;

	/*********************/
	/* change-course-btn */
	/*********************/
	$("#change-course-btn").on("click", async function() {
		$("#select-dialog").popup("close");
		let activePage = $.mobile.activePage.attr("id");
		let raceNum = $("#"+activePage+" h1").text().replace(/\D+/g,"");
		if (raceNum) {
			let obj = {raceNo: Number(raceNum), raceDate:RaceDate, RCC:$('#select-RC').val(),
					   course:$("#select-course").val(), track:$("#select-track").val(),
					   distance:$("#select-distance").val(), wgRate:$('#weight-rate').val(),
					   drRate:$('#dr-rate').val()};
			await cacheToStore ("courseSelect", obj); //no matter successful or not, handled by getFromCache later
			$("#"+activePage+" div.scrollmenu a:nth-child("+raceNum+")").trigger( "click" );
		}
	});
	
	$('#select-RC').change(function(){
		console.log ("#select-RC changed to",$(this).val());
		let $dt = $("#select-distance");
		let $tr = $("#select-track");
		let $cs = $("#select-course");
		let distOptions, trackOptions, courseOptions;
		
		if ($(this).val() == "田") {
			trackOptions = TwoTracks;
			if ($tr.val() == "全") {
				distOptions = ShatinAWT; // 田全
				courseOptions = NoCourse;
			} else {
				distOptions = ShatinTurf;  //assume 田草
				courseOptions = ShatinCourse;
			}
		} else { //谷
			trackOptions = OneTrack;
			distOptions = ValleyTurf;  //谷
			courseOptions = ValleyCourse;
		}
		
		let trackSaved = $tr.val();
		$tr.empty();
		$.each(trackOptions, function(key,value) {
			$tr.append($("<option></option>").attr("value", value).text(key));
		});
		if (Object.values(trackOptions).indexOf(trackSaved) > -1)
			$tr.val(trackSaved);
		$tr.selectmenu( "refresh" );
		
		let distSaved = $dt.val();
		$dt.empty();
		$.each(distOptions, function(key,value) {
			$dt.append($("<option></option>").attr("value", value).text(key));
		});
		if (Object.values(distOptions).indexOf(distSaved) > -1)
			$dt.val(distSaved);
		$dt.selectmenu( "refresh" );
		
		let courseSaved = $cs.val();
		$cs.empty();
		$.each(courseOptions, function(key,value) {
			$cs.append($("<option></option>").attr("value", value).text(key));
		});
		if (Object.values(courseOptions).indexOf(courseSaved) > -1)
			$cs.val(courseSaved);
		$cs.selectmenu( "refresh" );		
		
        //$(this).find("option:selected").attr('value')
    });
	
	$('#select-track').change(function(){
		console.log ("#select-track changed to",$(this).val());
		let $rc = $("#select-RC");
		let $dt = $("#select-distance");
		let $cs = $("#select-course");
		let distOptions, courseOptions;
		
		if ($(this).val() == "草") {
			if ($rc.val() == "田") {
				distOptions = ShatinTurf; // 田草
				courseOptions = ShatinCourse;
			} else {
				distOptions = ValleyTurf;  //assume 谷草
				courseOptions = ValleyCourse;
			}
		} else { //全
			distOptions = ShatinAWT;  //田全
			courseOptions = NoCourse;
		}
		
		let distSaved = $dt.val();
		$dt.empty();
		$.each(distOptions, function(key,value) {
			$dt.append($("<option></option>").attr("value", value).text(key));
		});
		if (Object.values(distOptions).indexOf(distSaved) > -1)
			$dt.val(distSaved);
		$dt.selectmenu( "refresh" );
		
		let courseSaved = $cs.val();
		$cs.empty();
		$.each(courseOptions, function(key,value) {
			$cs.append($("<option></option>").attr("value", value).text(key));
		});
		if (Object.values(courseOptions).indexOf(courseSaved) > -1)
			$cs.val(courseSaved);
		$cs.selectmenu( "refresh" );		
    }); /* these rates will changed with courseTrackDist and cached in courseSelect
	$('#weight-rate').change(function(){
		WgRate  = Number($(this).val());
		cacheToStore ("cache", {key:"WgRate", wgRate:WgRate});
	});
	$('#dr-rate').change(function(){
		DrRate  = Number($(this).val());
		cacheToStore ("cache", {key:"DrRate", drRate:DrRate});
	}); */

	// Handle google sign in, which should have refreshed apps upon success, hence reload cache etc.
	firebase.auth().onAuthStateChanged(function(user) {
		if (user) {
			user.providerData.forEach(function (profile) {
				console.log("Sign-in provider: " + profile.providerId);
				//console.log("  Provider-specific UID: " + profile.uid);
				console.log("  Name: " + profile.displayName);
				console.log("  Email: " + profile.email);
				//console.log("  Photo URL: " + profile.photoURL);
				$('#user-photo').attr("src",profile.photoURL);
				$('#user-email').text(profile.email);
				SuperUser = (profile.email == 'psychobigbro@gmail.com');
				if (SuperUser)
					$(".super").show();
				else
					$(".super").hide();
				popupMsg ("You have signed in as a " + (SuperUser ? "super user:":"normal user:") + profile.email, 3500);
			});
			getFromCache ("cache", "RaceInfo")
			.then (rec => {
				if (rec) {
					RaceDate = rec.raceDate;
					Event = rec.event;
					HorsesOSRaceDate = rec.horsesOSRaceDate;
					HistoryOSRaceDate = rec.historyOSRaceDate;
					MaxRaceNo = rec.maxRaceNo;
					Season = rec.season;
					if (MaxRaceNo > 5)  //in case diff from scrollmenu default no.
						updateScrollMenu (MaxRaceNo);
				}
				return getFromCache ("cache", "Bets")
			})
			.then (rec => {
				if (rec && rec.raceDate && timeFromNow (rec.raceDate) > -86400000) {
					Bet.tbl = rec.betTbl;
					Bet.raceDate = rec.raceDate;
				}
				else {
					Bet.tbl = Array(11).fill(null).map(() => Array(14).fill(null));
					Bet.raceDate = "";
				} /* cache moved to courseSelect
				return getFromCache ("cache", "DrRate");
			})
			.then (rec => {
				if (rec)
					DrRate = rec.drRate ? rec.drRate : 0.1;
				$('#dr-rate').val(DrRate).selectmenu( "refresh" );	
				return getFromCache ("cache", "WgRate");
			})
			.then (rec => {
				if (rec)
					WgRate = rec.wgRate ? rec.wgRate : 0.1;
				$('#weight-rate').val(WgRate).selectmenu( "refresh" ); */
				return getFromCache ("cache", "Settings");
			})
			.then (rec => {
				if (rec) {
					$('#online-mode-switch').val(rec.onlineMode).slider( "refresh" );
					if ( $("#online-mode-switch").val() == "off" )
						$("h1[role='heading']").css("color","pink");
					$('#ai-mode-switch').val(rec.aiMode).slider( "refresh" );
					$('#horses-file').val(rec.horsesFile).slider( "refresh" );
				}
				return;
			})
			.then (() => {
				//read starter 1 of any Event (checked in event handler)
				$("#race-page div.scrollmenu a:nth-child(1)").trigger( "click" );
			});
		} else {
			// No user is signed in.
			signInOut();
		}
	});	

  }); /* on pageinit #race-page */
  
  /*** The following stop android chrome default menu popup upon tap hold event on anchor ***/
  $("body").on("contextmenu", "a", function() {
		return false;
  });
 