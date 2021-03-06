  /*** Startup ***/
  /* Globals */
  var ErudaEnabled = false;
  var Season = 0;		//season of history store 
  var SuperUser = false;
  var AppEmail = "";  //global to hold email of current google app user (returned by webapp response
  var UserLevel = 0;  //global changeable by Webapp result.userLevel to set individual super class elements on/off
  var RaceDate = "";  //global to hold current raceDate AS OBTAINED FROM last online Starters, dd-mm-yyyy, by loadDataAndRefreshDomPromise
					  //format also used in cache for outdating; for display convenience; also updated upon event change; 
  var MaxRaceNo = 0;  //global to hold max. race no corr. to Event
  var Event = null;     //global object for current race event AS OBTAINED FROM getRaceInfo [yyyymmdd','RC']
								  // or set by Event datebacking; this is changed before RaceDate which is starter based
  var HorsesOSRaceDate = "";	//raceDate of downloaded iDB horses store dd-mm-yyyy
  var HistoryOSRaceDate = "";	//raceDate of downloaded iDB history store dd-mm-yyyy
  var Tfjs = {modelName:'model'}; 	//global object for TensorFlow.js model and params
  var Features;
  var DrRate = "0.1";
  var WgRate = "0.1";	//unless changed by change-defaults-dialog
  var FrWinOdds = "1";
  var ToWinOdds = "99";	//unless changed by change-defaults-dialog
  var StarterCacheTimeoutMinutes = 5;
  var IDbPromise;
  var IDbVersionNo = 1;
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
  const HKRace2019Exec = "https://script.google.com/macros/s/AKfycbxHVZLL-PvOG6-Z1xzKkM591O8_MC0JzXSLoBdN4AbmgaDEc0Q6/exec?";
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
  const Thead1 = 
	'<thead><tr>'+
	'<th>號</th><th data-priority="2">馬名</th><th data-priority="5">齡</th>'+
	'<th data-priority="3">騎師</th><th data-priority="3">練馬師</th>'+
	'<th data-priority="2">檔</th><th data-priority="2">負磅</th>'+
	'<th data-priority="1">記錄</th><th data-priority="1">預測時間</th><th data-priority="1">記錄</th><th data-priority="1">參考時間</th>'+
	'<th data-priority="5">上位</th>'+ '<th data-priority="5">上位</th>'+
	'<th data-priority="5">試</th><th data-priority="5">失</th><th data-priority="5">重</th><th data-priority="5">程</th><th data-priority="5">道</th>'+
	'<th data-priority="4">W</th>'+
	'<th data-priority="4">P</th>'+
	'<th data-priority="4">AI</th>'+
	'</tr></thead>';
  /* for race-table */
  const Thead2 = 
	'<thead><tr>'+
	'<th>號</th><th data-priority="1">馬名</th><th data-priority="5">齡</th>'+
	'<th data-priority="1">騎師</th><th data-priority="3">練馬師</th>'+
	'<th data-priority="1">檔</th><th data-priority="1">負磅</th>'+
	'<th data-priority="2">記錄</th><th data-priority="2">預測時間</th>'+
	'<th data-priority="6">記錄</th><th data-priority="6">參考時間</th>'+
	'<th data-priority="3">騎練</th>'+ '<th data-priority="4">騎馬</th>' +
	'<th data-priority="3">試</th><th data-priority="3">失</th><th data-priority="3">重</th><th data-priority="3">程</th><th data-priority="3">道</th>'+
	'<th data-priority="1">W</th>'+
	'<th data-priority="1">P</th>'+
	'<th data-priority="2">AI</th>'+
	'</tr></thead>';
  var StdTimes = [];	/* HKJC standard race time for each RCC/Track/Distance/class */
  StdTimes["田草1000"] = [55.80,55.95,56.50,56.75,57.05];
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
  
  /* load eruda if ?eruda follow non-firebaseapp.com url */
  (function () {
	if (window.location.hostname == 'hkrace-2018.firebaseapp.com' ||
		!/eruda=true/.test(window.location) &&
		localStorage.getItem('active-eruda') != 'true')
		return;
	const src = 'https://cdn.jsdelivr.net/npm/eruda';
	document.write('<scr' + 'ipt src="' + src + '"></scr' + 'ipt>');
	document.write('<scr' + 'ipt>eruda.init(); ErudaEnabled=true;</scr' + 'ipt>');
  })();
  
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
			console.error ('Service Worker Registration failed:',error);
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
	$( "#change-defaults-dialog" ).enhanceWithin().popup();
	$( "#change-syndicate-dialog" ).enhanceWithin().popup();
	//$.event.special.tap.tapholdThreshold = 1000;
	$.event.special.tap.emitTapOnTaphold = false;
	$.mobile.loadPage( "#trainer-page" );
	//$.mobile.loadPage( "#result-page" ); 
	$.mobile.loadPage( "#jockey-page" );  //to init data-tables before add.rows() in race-page
	// All super class elements are hidden initially, SuperUser will be checked later to turn them all on or
	// they may be individually turned on by userLevel set by google webapp returned result.userLevel
	$(".super").hide(); //hide superuser functions upon startup
  });
  /***********************************/
  /* on various pageinit, pagecreate */
  /***********************************/
  $(document).on( "pageinit", "#trainer-page, #jockey-page", function (e) {
	let $page = $(this);
	let $tbl = $page.find("table");
	let tblID = "#"+$tbl.prop("id");
	let pageID = "#"+$page.prop("id");
	getFromCache ("cache", $tbl.attr("cache-name"))
	.then (rec => {
		let data = (rec && rec.data) ? rec.data : null;
		let invisibleCols = (rec && rec.invisibleCols) ? rec.invisibleCols : [-1];
		let table = $tbl.DataTable( {
			data: data,
			paging: false,
			ordering: false,
			info: false,
			searching: false,
			scrollX: true,
			scrollY: "90vh",  //% of viewport height
			scrollCollapse: true,
			fixedColumns: true,
			fixedHeader: false,
			columnDefs: [{
				targets: invisibleCols,
                visible: false,
            }]
		});
		$( table.column(0).nodes() ).addClass( 'fixed-column syndicated' );  //for styling 1st column
		$(window).resize(function() {
			table.draw();
		});
		/*** corner cell click event handler, need to be separated for the 2 tbls as iphone may not work correctly ***/
		$page.find("th:first-child").on ("click", (e) => {
			$("#page-menu").popup( "open", { x: e.pageX, y: e.pageY, transition: "slideDown"} );
			return false;
		});
		/*** 1st column syndicated names tap events handlers ***/
		/*** CAN'T USE taphold as datatable has complicated div structure causing duplicated taphold trigger ***/
		$page.find("td.syndicated").on ("tap", function(e){
			updateSyndicatePopup ( $(this).text() );
			return false;
		});
		/*** title raceno taphold events handlers ***/
		$page.find("th:not(:first-child)").on ("taphold", function(e){
			highlightRaceResults ($(this).attr('raceDate'), $(this).index()); //for both trainer and jockey tables
			return false;
		});
		/*** format cells when there are data ***/	
		if (rec && rec.raceDate) {
			/*** add raceDate attribute to header cells for reference by taphold event handler ***/
			$( table.columns().header()).attr("raceDate",rec.raceDate);
			/*** set table cell background-color according to horse rankings ***/
			for (let i=0; i < 4; i++)
				$(table.cells(":has(rank"+i+")").nodes()).addClass("rank"+i);
			/*** get any runners from cache and highlight forerunners in table ***/
			for (let raceNo=1; raceNo < 12; raceNo++)
				getFromCache ("cache", "Runners"+raceNo, rec.raceDate)
				.then (rec => {
					if (rec)
						highlightForeRunners (tblID, raceNo, rec.runners);
				});
		}
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
		const classes = ["","","","column-won","","","column-won","","","column-won","","","column-won"];
		let colOptions = [];  //array of objects for DataTable column options
		$.each(visibles, (idx,bool) => {
			colOptions.push({visible:bool, className:classes[idx]});
		});
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
		newPage3.appendTo($.mobile.pageContainer);
		$.mobile.loadPage( "#summary-page" );
		//move column toggle button to header
		//$("#summary-page a.ui-table-columntoggle-btn").appendTo("#summary-page .columntogglePlaceholder");
		$("#summary-page .columntogglePlaceholder").replaceWith($("#summary-page a.ui-table-columntoggle-btn"));
		$("#summary-page a.ui-table-columntoggle-btn").addClass("ui-icon-columns")
													  .addClass("ui-btn-icon-notext")
													  .addClass("ui-nodisc-icon");
		//$("#summary-page div[data-role='controlgroup']").enhanceWithin();										  
	};
	$("#race-page div.page-tab li:first-child a").css("backgroundColor", "#c00");
  });
  
  $( document ).on( "pageinit", "#race-page", function() {

	/*$("body").on( "pagecontainertransition", function( event, ui ) {
		//if (ui.toPage.prop("id") == "page2")
		console.log (ui);
	}); */
	/* copy version no. to about-page */
	$("#version").text($("#race-page").find("h1").text());
	
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
			break;			
		case "jockey-page":
			$("#jockey-table").DataTable().columns.adjust().draw();
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
		if (this.hasAttribute("disabled"))  //all users can do reload!!
			return;
		let raceNo = getActiveRaceNo ();
		if (raceNo && Event)//starters cache and HKJCOnline use numeric raceNo
			loadDataAndRefreshDomPromise (Event, true, raceNo);  //re-load data bypassCache
	})
	.on("taphold", function (e) {
		e.preventDefault();  // need also -webkit-touch-callout:none in css to stop ios taphold default!!
		if (this.hasAttribute("disabled") || !SuperUser)  //only superuser can do reload all!!
			return;
		popupMsg ("Reloading "+MaxRaceNo+" races of event "+Event.toString());
		loadDataAndRefreshDom (Event, 1, MaxRaceNo);
	});
	
	$("#left-panel a.exec-func, #page-menu a.exec-func")
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
		window.scrollTo(0, 0);  //scroll to top left before popup open, otherwise iphone misplace dialog
		if ($(this).closest("div").hasClass("ui-popup"))
			//for page-menu popup, the popup must be close before new popup (dialog) can be open
			$("#page-menu").one("popupafterclose", () => {
								//$dialog.popup( "open" ); //cant open first time just after another page-menu item repeatly clicked!
								setTimeout (()=>{$dialog.popup( "open" );},100);  //setTimeout solve the problem
								//$(this).off();	//use .one otherwise page-menu closed by another menu item will invoke $dialog
							})
						   .popup("close");
		else {
			$("#left-panel").panel("close");
			$dialog.popup( "open" );
		}

		
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
		//let raceNum = $("#race-page h1").text().replace(/\D+/g,"");
		let raceNo = getActiveRaceNo ();
		if (!raceNo) return;  //page has no raceNo
		updateOddsAndScores (raceNo);
	})
	.on("taphold", function (e) {
		e.preventDefault();  // need also -webkit-touch-callout:none in css to stop ios taphold default!!
		//$(this).data("longTapRegistered", true);  //so that click event fired after knows
		if (Bet.raceDate != RaceDate) {
			popupMsg ("No current Bet Table",1000);
			return;
		}
		//let raceNum = $("#race-page h1").text().replace(/\D+/g,"");
		let raceNo = getActiveRaceNo ();
		if (!raceNo) return;  //page has no raceNo
		let r = raceNo - 1;
		let betNos = [];
		for (let n=0; n<Bet.tbl[r].length; n++) {
			let cell = Bet.tbl[r][n];
			if (cell && cell.plaAmt)
				betNos.push (n+1);
		}
		if (betNos.length != 3) {
			popupMsg ("Cant find 3 bets on Place for race "+raceNo,1000);
			return;
		}
		let trioBet = betNos.join('-');
		popupMsg ("Fetching Odds for Trio " + trioBet);
		let param = JSON.stringify({raceDate:Event[0],venue:Event[1], raceNo:raceNo});
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
			$elm.removeClass("win pla win-pla"); /*
				.removeAttr("win-amt pla-amt qin-amt qpl-amt qin-leg qpl-leg");*/
			Bet.tbl[raceNoIdx][numIdx] = {};
		} else {
			let winAmt = $("#select-win-amt").val();
			let plaAmt = $("#select-pla-amt").val();
			let qinLeg = $("#select-qin-leg").val();
			let qplLeg = $("#select-qpl-leg").val();
			if (winAmt || plaAmt || qplLeg || qinLeg) {
				let qinAmt = qinLeg ? $("#select-qin-amt").val() : "";
				let qplAmt = qplLeg ? $("#select-qpl-amt").val() : "";
				let betType = winAmt && plaAmt ? "win-pla" : winAmt ? "win" : "pla";
				$elm.removeClass("win pla win-pla")  //remove residual not updated by cancellation in another page
					.addClass(betType); /*.attr("win-amt", winAmt)
									  .attr("qin-leg", qinLeg)
									  .attr("qpl-leg", qplLeg)
									  .attr("qin-amt", qinAmt)
									  .attr("qpl-amt", qplAmt)
									  .attr("pla-amt", plaAmt);*/
				if (Bet.raceDate != raceDate) {
					// create a new Bet.tbl upon raceDate change
					Bet.raceDate = raceDate;
					// dont use Array().fill(Array().fill()) which will create reference to entire column upon single cell upd
					Bet.tbl = Array(11).fill(null).map(() => Array(14).fill(null));
					Bet.modelName = "";
				}
				Bet.tbl[raceNoIdx][numIdx] = {winAmt:winAmt, qinLeg:qinLeg, plaAmt:plaAmt, qplLeg:qplLeg,
											  qinAmt:qinAmt, qplAmt:qplAmt};
			} else
				return;	//nothing chosen
		}
		cacheToStore ("cache", {key:"Bets",betTbl:Bet.tbl, raceDate:raceDate, modelName:Bet.modelName});
	});
	/********************/
	/* change-event-btn */
	/********************/
	$("#change-event-btn").on("click", function() {
		let opener = $("#event-dialog").data("opener");
		let pastEventsInfo = opener.pastEventsInfo;
		$("#event-dialog").popup("close");
		let yyyymmdd = $('#select-event').val();  //selected event date in yyyymmdd
		let yyyymmddHorsesOS = toDateObj (HorsesOSRaceDate).yyyymmdd();
		let yyyymmddHistoryOS = toDateObj (HistoryOSRaceDate).yyyymmdd();
		if (yyyymmdd > yyyymmddHorsesOS || yyyymmdd > yyyymmddHistoryOS) 
			popupMsg ("Horses and/or History store not yet updated to "+yyyymmdd);
		else {
			Event = pastEventsInfo[yyyymmdd].event;
			if (MaxRaceNo != pastEventsInfo[yyyymmdd].maxRaceNo) {
				MaxRaceNo = pastEventsInfo[yyyymmdd].maxRaceNo
				updateScrollMenu (MaxRaceNo);
			}
			RaceDate = yyyymmdd.toHyphenatedDate();   //=> dd-mm-yyyy, will forceit caches
			cacheRaceInfo ();
			clearBetTbl ();
			updateWinOddsAndStartersCaches (Event);
		}
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
	$("#odds-switch").change ( () => cacheSettings()) ;

	/*********************/
	/* change-course-btn */
	/*********************/
	$("#change-course-btn").on("click", async function() {
		$("#select-dialog").popup("close");
		let activePage = $.mobile.activePage.attr("id");
		//let raceNum = $("#"+activePage+" h1").text().replace(/\D+/g,"");
		let raceNo = getActiveRaceNo ();
		if (raceNo) {
			let obj = {raceNo: raceNo, raceDate:RaceDate, RCC:$('#select-RC').val(),
					   course:$("#select-course").val(), track:$("#select-track").val(),
					   distance:$("#select-distance").val(), wgRate:$('#weight-rate').val(),
					   drRate:$('#dr-rate').val()};
			await cacheToStore ("courseSelect", obj); //no matter successful or not, handled by getFromCache later
			$("#"+activePage+" div.scrollmenu a:nth-child("+raceNo+")").trigger( "click" );
		}
	});
	
	/************************/
	/* change-syndidate-btn */
	/************************/
	$("#change-syndicate-btn").on("click", function() {
		let opener = $("#change-syndicate-dialog").data("opener");
		let name = opener.name;
		let syndicates = opener.syndicates;
		let syndicateNo = Number($("#syndicateNo").val());
		if (isNaN($("#syndicateNo").val()) || syndicateNo < 0 || syndicateNo > 9 ) {
			$("#syndicateNo").val('').blur();
			return;
		}
		syndicates[name] = syndicateNo;
		cacheToStore ("cache", {key:"syndicates",data:syndicates});
		$("#change-syndicate-dialog").popup("close");
		popupMsg (name+" 集團： "+syndicateNo,2000);
	});
	
	/***********************/
	/* change-defaults-btn */
	/***********************/
	$("#change-defaults-btn").on("click", function() {
		let lowerWinOdds = Number($("#lowerWinOdds").val());
		let upperWinOdds = Number($("#upperWinOdds").val());
		if (isNaN(lowerWinOdds) || isNaN(upperWinOdds) || lowerWinOdds > upperWinOdds ||
			lowerWinOdds < 1 || lowerWinOdds > 99 || upperWinOdds < 1 || upperWinOdds > 99) {
			$("#lowerWinOdds").val('').blur();
			$("#upperWinOdds").val('').blur();  //display placeholder
			return;
		}
		$("#change-defaults-dialog").popup("close");
		DrRate = $("#df-dr-rate").val();
		WgRate = $("#df-weight-rate").val();
		FrWinOdds = lowerWinOdds;
		ToWinOdds = upperWinOdds;
		// REMINDER: cache all defaults here no matter they are changed or not!!
		cacheToStore ("cache", {key:"Defaults", DrRate:DrRate, WgRate:WgRate, FrWinOdds:FrWinOdds, ToWinOdds:ToWinOdds});
	});

	/*******************/
	/* change-defaults */
	/*******************/
	$("div a.change-defaults") 
	.on("click", function() {
		window.scrollTo(0, 0);  //scroll to top left before popup open, otherwise iphone misplace dialog
		$("#left-panel").panel("close");
		$("#df-weight-rate").val(WgRate).selectmenu( "refresh" );
		$("#df-dr-rate").val(DrRate).selectmenu( "refresh" );
		$("#lowerWinOdds").val(FrWinOdds);
		$("#upperWinOdds").val(ToWinOdds);
		$("#change-defaults-dialog").popup("open");
	})
	
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
				popupMsg ("Signed in Firebase as " + (SuperUser ? "super user:":"normal user:") + profile.email, 3000);
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
					Bet.modelName = rec.modelName;
					Bet.sheetName = rec.sheetName;
				}
				else {
					Bet.tbl = Array(11).fill(null).map(() => Array(14).fill(null));
					Bet.raceDate = "";
				}
				return getFromCache ("cache", "Defaults");
			})
			.then (rec => {
				if (rec) {
					if (rec.WgRate)
						WgRate = rec.WgRate;
					if (rec.DrRate)
						DrRate = rec.DrRate;
					if (rec.FrWinOdds)
						FrWinOdds = rec.FrWinOdds;
					if (rec.ToWinOdds)
						ToWinOdds = rec.ToWinOdds;
				}
				return getFromCache ("cache", "Settings");
			})
			.then (rec => {
				if (rec) {
					$('#online-mode-switch').val(rec.onlineMode).slider( "refresh" );
					if ( $("#online-mode-switch").val() == "off" )
						$("h1[role='heading']").css("color","pink");
					$("#ai-mode-switch").val(rec.aiMode).slider( "refresh" );
					$("#horses-file").val(rec.horsesFile).slider( "refresh" );
					$("#odds-switch").val(rec.oddsMode).slider( "refresh" );
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
 