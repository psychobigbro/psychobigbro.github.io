/* Change global Event to a choice from past events list maintained by host */
function changeEvent () {
	if (!Season) {
		popupMsg ("Require season history from GCS");
		return;
	}
	execGoogleAppPromise ("getPastEventsInfo",JSON.stringify({season:Season}))
	.then ( info => {
		if (info) {
			/* info's key is always in ascending order!! */
			let raceDates = Object.keys(info);
			let $select = $("#select-event");
			let options = {};
			raceDates.reverse().forEach (raceDate => {
				let date = raceDate.toHyphenatedDate();
				let event = info[raceDate].event;
				let venue = event[1] == "ST" ? "沙田" : "跑馬地";
				let maxRaceNo = info[raceDate].maxRaceNo;
				options[date+" "+venue+" 共"+maxRaceNo+"場"] = raceDate;
			});
			$select.empty();
			renewSelect ($select, options, raceDates[0]);
			$( "#event-dialog" ).data('opener', {pastEventsInfo:info}).popup("open");
		}
		else
			throw "can't getPastEventsInfo";
	})
	.catch ( error => {
		popupMsg("changeEvent " + JSON.stringify(error));
		console.log (error);
	});
}

/* invoked upon detection of raceDate change to update maxRaceNo and scrollmenu and cache */
function updateRaceInfo() { /***** THIS MAY NOT BE REQUIRED !!!!!****/
	execGoogleAppPromise ("getRaceDayInfo")
	.then ( info => {
		if (info && info.raceDate && info.maxRaceNo > 5) { //should have at least 6 races
			RaceDate = info.raceDate;
			Event = info.event;
			if (info.maxRaceNo != MaxRaceNo) {
				MaxRaceNo = info.maxRaceNo;
				updateScrollMenu (MaxRaceNo);
			}
			//Update cache anyway for new globals
			cacheRaceInfo ();
		}
		else
			throw "Can't getRaceDayInfo";
	})
	.catch ( error => {
		popupMsg("updateRaceInfo " + JSON.stringify(error));
		console.log (error);
	});
}


/* Rebuild scroll menu for maxRaceNo */
function updateScrollMenu (maxRaceNo) {
	let $menu = $("div.scrollmenu");
	$menu.empty();
	for (let i=1; i<=maxRaceNo; i++)
		$menu.append($("<a/>",{"href":"#", "raceNo":i}).text(i));
	$menu.enhanceWithin();
	/*** re-setup scrollmenu click events handler ***/
	$("div.scrollmenu a").on("click", scrollMenuEventHandler);
}

function getAllFromCache (store) {
	return new Promise (function (resolve, reject) {
		IDbPromise
		.then (db => {return db.transaction(store).objectStore(store).getAll()})
		.then (allObjs => resolve (allObjs))
		.catch (error => reject (error));
	});
}

/* return a Promise to get Starter from cache */
/* Reject will be followed by google apps fetch and so any error is logged and any	
   starter data is returned in place of error */
function getStarterFromCache (raceNo, raceDate) {
	return new Promise (function (resolve, reject) {
		//read IDb
		IDbPromise
		.then(function(db) {
			let tx = db.transaction('starters', 'readonly');
			var store = tx.objectStore('starters');
			return store.get(raceNo);
		})
		.then(function(starter) {
			if (starter) {  //something read
				starter.fromCache = true;
				let now = new Date();
				let ageInMinutes = (now.getTime() - starter.created.getTime())/(60*1000);
				console.log('starter ', starter.raceNo, ' of ',ageInMinutes,'min. old dated',
							starter.raceDate, 'read from iDb');
				//if (timeFromNow (raceDate) < -86400000)  // past over 1 day
				if (starter.raceDate != raceDate) //starter raceDate not what expected
					reject (null);  //past raceDate starters cannot be used
				else if (ageInMinutes > StarterCacheTimeoutMinutes)
					//cache is too old
					reject (starter);  //may still be used if no racecard avail
				else
					resolve (starter);
			}
			else
				reject (null); 
		})
		.catch(function(error) {
			console.log ("Fail to get iDb starter:", raceNo, error);
			reject (null);
		})
	})
}

/* general routine to read cache from iDb Store that are refreshed by raceDate or not */
/* if raceDate is present, resolve with rec iff found with matched raceDate, resolve null otherwise    */
function getFromCache (storeName, key, raceDate) {
	if (typeof raceDate == 'undefined')
		raceDate = "";  //only used when .raceDate was cached
	return new Promise (function (resolve, reject) {
		//read IDb
		IDbPromise
		.then(function(db) {
			let tx = db.transaction(storeName, 'readonly');
			var store = tx.objectStore(storeName);
			return store.get(key);
		})
		.then(function(rec) {
			if (rec) {  //something read
				if (rec.raceDate && raceDate)
					if (rec.raceDate == raceDate)
						resolve (rec);
					else
						resolve (null);
				else
					resolve (rec);
			} else
				resolve (null);
		})
		.catch(function(error) {
			console.log ("Fail to get iDb",storeName, key);
			resolve (null);
		})
	})
}
/* General routine to cache obj to IndexedDB store */
/* Caller may or may not await promise */
function cacheToStore (storeName, obj) {
	return new Promise (function (resolve, reject) {
		IDbPromise
		.then(function(db) {
			let tx = db.transaction(storeName, 'readwrite');
			let store = tx.objectStore(storeName);
			obj.created = new Date();
			store.put(obj);
			return tx.complete;
		})
		.then(function() {
			if (storeName == "starters") {
				console.log(storeName, obj.raceNo,'in iDb updated!');
			}
			else
				console.log(storeName, obj.key,'in iDb updated!');
			resolve ();
		})
		.catch(function(error) {
			console.log ("Fail to put iDb", storeName, obj, error);
			popupMsg ("Fail to put iDb " + storeName + ":" + JSON.stringify(error));
			reject (error);
		})
	})
}

/* clear all cache stores except starters */
/* no need to clear starters which can be overwritten */
function clearCache () {
	IDbPromise
	.then(function(db) {
		let tx = db.transaction(["predictedTime","JTInPlace","remarks","testHorse",
								'columnToggle','winOdds','cache','trump','history'], "readwrite");
		tx.objectStore("testHorse").clear(); 
		tx.objectStore("remarks").clear(); 
		tx.objectStore("predictedTime").clear();
		tx.objectStore("JTInPlace").clear();
		tx.objectStore("columnToggle").clear();
		tx.objectStore("winOdds").clear();
		tx.objectStore("cache").clear();
		tx.objectStore("trump").clear();
		tx.objectStore("history").clear();
		return tx.complete;
	})
	.then(function() {
		console.log ("cache in indexedDB cleared!!");
		popupMsg ("cache in indexedDB cleared!!");
	})
	.catch(function(error) {
		console.log ("Fail to clear cache", error);
		popupMsg ("clearCache:"+JSON.stringify(error));
	})

}

/*** Delete all indexDBs and RESTART ***/
function deleteAllDbs () {
	idb.delete('firebaseLocalStorageDb');  //this will not be resolved until restart!!
	IDbPromise
	.then( db => {
		return db.close();
	})
	.then ( () => {
		return idb.delete('HKRace')
	})
	.then( () => {
		console.log ("indexedDB HKRace deleted!!");
		return HorsesIDbPromise;
	})
	.then( db => {
		return db.close();
	})
	.then ( () => {
		return idb.delete('HKRaceDB')
	})
	.then( async () => {
		console.log ("indexedDB HKRaceDB deleted!!");
		popupMsg ("All indexedDBs deleted!! Restarting ...",4500);
		await sleep (5000);
		location.reload(true);  //reload current page from server
	})
	.catch( error =>{
		console.log ("deleteAllDbs:", error);
		popupMsg(JSON.stringify(error));
	})
}

function signInOut () {
	if (firebase.auth().currentUser)
		firebase.auth().signOut();
	else {
		// No user is signed in.
		let provider = new firebase.auth.GoogleAuthProvider();
		// To apply the default browser preference instead of explicitly setting it.
		firebase.auth().useDeviceLanguage();
		firebase.auth().signInWithRedirect(provider);
	}
}

function toggleOnlineDebug () {
	execGoogleAppPromise ("toggleDebug")
	.then ( debug => {
		let state = (debug == "0") ? "off" : "on";
		popupMsg ("HKJCOnline debug mode is: "+state);
	})
	.catch ( error => {
		popupMsg (JSON.stringify(error));
	})
}
function timeFromNow (date) {   //date is dd-mm-yyyy
	let now = new Date();
	let yyyymmdd = date.substr(6,4)+ "-" +date.substr(3,2)+ "-" + date.substr(0,2);
	let d = new Date(yyyymmdd);
	return (d.getTime() - now.getTime())
}

/* redirect to google app url, any needed user authorization will then be handled by */
/* HTML, and google script will finally return a default HTML page for manual goback */
function googleAuthorization () {
	location.href = HKJCOnlineExec;
}

function renewSelect ($select, options, defaultOption) {
	$.each(options, function(key,value) {
		$select.append($("<option></option>").attr("value", value).text(key));
	});
	$select.val(defaultOption).selectmenu( "refresh" );
}

function cacheSettings () {
	cacheToStore ("cache", {key:"Settings",
							onlineMode: $("#online-mode-switch").val(),
							horsesFile: $("#horses-file").val(),
							aiMode: $("#ai-mode-switch").val()});
}

function cacheRaceInfo () {
	cacheToStore ("cache", {key:"RaceInfo", raceDate:RaceDate, event:Event,
							maxRaceNo:MaxRaceNo, horsesOSRaceDate:HorsesOSRaceDate,
							historyOSRaceDate:HistoryOSRaceDate, season:Season});
}

/* return true if dl GCS files required
 * i.e. RaceDate (starter date) > horses and history iDB store raceDates (last download files' raceDate)
 */
function downloadGCSRequired () {
	let dateOfRaceDate = toDateObj (RaceDate);
	let dateOfHorsesOSRaceDate = toDateObj (HorsesOSRaceDate);
	let dateOfHistoryOSRaceDate = toDateObj (HistoryOSRaceDate);
	return !RaceDate || !HorsesOSRaceDate || !HistoryOSRaceDate || dateOfRaceDate > dateOfHorsesOSRaceDate || 
			dateOfRaceDate > dateOfHistoryOSRaceDate;
}
Date.prototype.yyyymmdd = function() {
  var yyyy = this.getFullYear();
  var mm = this.getMonth() < 9 ? "0" + (this.getMonth() + 1) : (this.getMonth() + 1); // getMonth() is zero-based
  var dd  = this.getDate() < 10 ? "0" + this.getDate() : this.getDate();
  return "".concat(yyyy).concat(mm).concat(dd);
}

String.prototype.toHyphenatedDate = function () {
  /* convert yyyymmdd string to dd-mm-yyyy */
  if (isNaN(this) || this.length != 8) return null;
  return this.substr(6,2) + '-' + this.substr(4,2)
          + '-' + this.substr(0,4);
}
function toDateObj (ddhmmhyyyy) {
	/* convert  dd-mm-yyyy string to Date object */
	let parts = ddhmmhyyyy.split("-");
	return (!parts || parts.length != 3) ? null :
		new Date(parts[2], parts[1] - 1, parts[0]); // month is 0-based
}

/* Await this promise to get sleep effecxt */
function sleep(msec) {
    return new Promise(resolve => setTimeout(resolve, msec));
}

/* Return the raceNo (Number) from the h1 header of current active page */
function getActiveRaceNo () {
	let activePage = $.mobile.activePage.attr("id");
	let raceNo = Number($("#"+activePage+" h1").text().replace(/\D+/g,""));
	return ((raceNo < 1 || raceNo > 11) ? 0 : raceNo);
}

/* As a final step of event change : Update the winOdds cache by GCS odds storage of Event changed by caller
 * and refresh all starters cache for new event
 */
async function updateWinOddsAndStartersCaches () {
	let fileName = "odds"+Event[0]+".json";	//GCS odds file
	popupMsg ("Downloading "+fileName);
	let objs = await downloadGCSFilePromise (fileName)
					.catch(error => {
						console.log(error);
					});
	if (objs)
		for (let i=0; i<objs.length; i++)
			await cacheToStore ("winOdds", {key:objs[i].raceNo, raceDate:objs[i].raceDate, obj:objs[i]});
	else {
		popupMsg (fileName+" not available!");
		await sleep (5000);
	}		
	popupMsg ("Downloading "+MaxRaceNo+" races of "+Event[0]);
	await fetchAllStarters (Event, MaxRaceNo);
	popupMsg ("Event changed to:"+Event.toString());
}