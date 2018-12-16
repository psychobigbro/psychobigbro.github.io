function downloadGCSFiles (event, maxRaceNo) {
	$.mobile.loading( "show" ); 
	let fileName = $("#horses-file").val()+".json";	//GCS horses file
	let fileName2 = "history.json";	//GCS history file
	downloadGCSFilePromise (fileName)
	.then ( horses => {
		$("#start-dl-btn").text("已下載" + fileName +"。更新中...");
		return createHorsesStorePromise (horses);
	})
	.then ((numHorseRecs) => {
		$("#start-dl-btn").text("載入馬匹記錄共" + numHorseRecs + "筆。下載中...");

		return downloadGCSFilePromise (fileName2);
	})
	.then ( history => {
		$("#start-dl-btn").text("已下載" + fileName2 +"。更新中...");
		return updateHistoryStorePromise (history);
	})
	.then (async(result) => {
		$.mobile.loading( "hide" );
		$("#start-dl-btn").text("載入記錄共" + result.numRecAdded + "筆至場次"+result.lastRaceIdx+"。完成!");
		updateTrainerJockeyTables();  //that also download all starters
		popupMsg ("正下載排位表及更新分場表...");
		await sleep(5000);
		$.mobile.changePage("#race-page", {
			transition: "fade"
		});
	})
	.catch (error => {
		$.mobile.loading( "hide" );
		$("#start-dl-btn").text("停止！操作失敗："+error);
		console.error (error);
		popupMsg (JSON.stringify(error));
	})
}

/**** Recursive function to call loadDataAndRefreshDomPromise for maxRaceNo races ****/
function loadDataAndRefreshDom (event, raceNo, maxRaceNo) {
	if (raceNo <= maxRaceNo)
		loadDataAndRefreshDomPromise(event, true, raceNo)
		.then ( raceNoDone => {
			popupMsg("已更新第" + raceNoDone + "場 ...");
			loadDataAndRefreshDom (event, ++raceNo, maxRaceNo);
		})
		.catch ( error => {
			popupMsg("更新第" + raceNo + "場失敗！");
		});
	else
		popupMsg("完成更新！",3000);	
}

/**** Return a promises to fetch data for a specifc raceNo bypassing cache ***
function loadDataPromise (raceNo) {
	return new Promise (function (resolve, reject) {
		fetchStarter (Event, raceNo)
		.then (starter => {
			if (starter && starter.runners) {
				cacheToStore ("starters", starter);
				return startFireStoreQueriesForPredictions (true, starter)
					   .then (rec => { startFireStoreQueriesForStatistics (true, starter);
					   });
			}
			else
				reject ("No starter "+raceNo+"data");
		})
		.then (rec => {
			resolve (rec);
		})
		.catch (error => {
			reject (error);
		});
	});
}
/*

/* Chaining promises to fetch data and refresh DOM for a specifc raceNo  	*/
/* byPassCache, if true, will skip reading cache to query firestore directly*/
/* Return a promise to allow awaited call for all raceNo					*/
function loadDataAndRefreshDomPromise (event, byPassCache, raceNo) {
	dataLoading (true);
	return new Promise (function (resolve, reject) {
	fetchStarter (event, raceNo)
	.then ( async starter => {
		/* here we have starter either from cache or racecard, save raceDate as global */
		//race-page init triggered race 1 fetch to ensure actual RaceDate change (new starter read) is detected here!!
		if (RaceDate != starter.raceDate) {
			RaceDate = starter.raceDate; //updated & cache to reflect actual starter read (Event[0] was what expected)
			cacheRaceInfo();
		}
		refreshRacePage (starter);  //history & horses stores raceDate also checked inside
		//if history & horses stores not upto starters RaceDate, dont go on or wrong data will be cached!!
		if (downloadGCSRequired ()) { 
			dataLoading (false);
			resolve(raceNo);
			return;
		}
		// init change course selection fields from cache before prediction queries
		let selectRec = await getFromCache ("courseSelect", raceNo, starter.raceDate);
		if (selectRec && selectRec.RCC != "今") {
			$('#select-RC').val(selectRec.RCC).selectmenu( "refresh" );
			$("#select-course").val(selectRec.course).selectmenu( "refresh" );
			$("#select-track").val(selectRec.track).selectmenu( "refresh" );
			$("#select-distance").val(selectRec.distance).selectmenu( "refresh" );
		} else {
			$('#select-RC').val("今").selectmenu( "refresh" );
			$("#select-course").val(starter.course).selectmenu( "refresh" );
			$("#select-track").val(starter.track).selectmenu( "refresh" );
			$("#select-distance").val(starter.distance).selectmenu( "refresh" );
		}
		if (selectRec) {
			$('#weight-rate').val(selectRec.wgRate).selectmenu( "refresh" );
			$('#dr-rate').val(selectRec.drRate).selectmenu( "refresh" );
		} else {
			$('#weight-rate').val(WgRate).selectmenu( "refresh" );
			$('#dr-rate').val(DrRate).selectmenu( "refresh" );			
		}
		//nesting promise.then to keep starter in scope for later use
		//use "return" to pass any reject error back upper level promise's catch function
		return startFireStoreQueriesForPredictions (byPassCache, starter)
		.then (function (predictRec){
			refreshPredictPage (starter, predictRec);
			return startFireStoreQueriesForStatistics (byPassCache, starter)
			.then (async function (statRec) {
				dataLoading (false);
				refreshSummaryPage (starter, predictRec, statRec);
				refreshRacePage (starter, predictRec, statRec);
				//get features in global memory, assuming access only in current raceNo
				Features = getFeaturesForRace (starter, predictRec, statRec);
				if ( timeFromNow (starter.raceDate) < 72000000 		//tigger winOdds fetch if less than 20 hours ahead (from 08:00 of raceDate)
					 && $("#odds-switch").val() == "on" ) 			//and odds-mode is on
					await updateOddsAndScores (raceNo);
				resolve(raceNo);
			});
		});				
	})
	.catch (error => {  //catch all error returned from the nested .then above
		console.error(error);
		dataLoading(false);
		popupMsg ("loadDataAndRefresh:"+JSON.stringify(error));
		reject(error);
	});
	}) //Promise
}

/* Return a promise to query Firestore Horses\horseNo\Records to calculate adjusted best time */
function getAdjBestTime (byPassCache, raceDate, RCC, track, course, distance, dr, weight, horseNo) {
	return new Promise (function (resolve, reject) {
		if (byPassCache)
			_getAdjBestTimeFromIDB (resolve, reject);
		else 
			// attempt to get it from iDb predictedTime
			getFromCache ('predictedTime', horseNo+RCC+track+course+distance, raceDate)
			.then (function (rec) {
				if (rec && rec.drRate == Number($('#dr-rate').val()) && rec.wgRate == Number($('#weight-rate').val()))
					resolve(rec.timeRec);
				// offline mode no longer relevant to iDB
				//else if ( $("#online-mode-switch").val() == "off" )
				//	reject (Error("No predictedTime cache in offline mode"));
				else
					_getAdjBestTimeFromIDB (resolve, reject);
			})
			.catch (function (error) {
				_getAdjBestTimeFromIDB (resolve, reject);
			});
	});

	function _getAdjBestTimeFromIDB (resolve, reject) {
		let storeName = "horses";
		HorsesIDbPromise
		.then( db => {
			let tx = db.transaction(storeName, "readonly");
			let store = tx.objectStore(storeName);
			let index;
			let range; 
			if (course == "*") {
				index = store.index("HRTDY");
				// create query range incl lower bound (false) excl upper bound (true)
				range = IDBKeyRange.bound([horseNo,RCC,track,distance,"00000000"],
										  [horseNo,RCC,track,distance,Event[0]], false, true);
				return index.getAll(range);
			} else {
				index = store.index("HRTDCY");
				range = IDBKeyRange.bound([horseNo,RCC,track,distance,course,"00000000"],
										  [horseNo,RCC,track,distance,course,Event[0]], false, true);
				return index.getAll(range);
			}
		})
		.then ( function(recs) {
			let bestTime = MaxSeconds;  // indicate N/A
			let dateMade = "N/A";
			let weightMade = 0;
			let drMade = 0;
			let recTime = MaxSeconds;
			let adjRecTime = MaxSeconds;
			let recWeight = 0;
			let recClass = 0;
			let drRate = Number($('#dr-rate').val());
			let wgRate = Number($('#weight-rate').val());
			recs.forEach(function(rec) {

				let normalTime = adjustedTime (1, rec.finTime, rec.RCC, rec.track, rec.distance,
												rec.dr, rec.actWeight, drRate, wgRate);
				let predictedTime = adjustedTime (-1, normalTime, RCC, track, distance,
													dr, weight, drRate, wgRate);
				if (predictedTime < bestTime) {
					bestTime = predictedTime;
					dateMade = rec.yyyymmdd;
					weightMade = rec.actWeight;
					drMade = rec.dr;
					recTime = rec.finTime;
					adjRecTime = normalTime;
					recWeight = rec.weight;
					recClass = rec.class;
				}
			});
			console.log("From iDB",horseNo,"=>", bestTime, dateMade);
			let obj = {date:dateMade,weight:weightMade,dr:drMade,recTime:recTime,adjRecTime:adjRecTime,
					   predTime:bestTime, horseWeight:recWeight, class:recClass};
			cacheToStore ("predictedTime",{key:horseNo+RCC+track+course+distance,  //* for all courses
										raceDate:raceDate, timeRec:obj,
										drRate:drRate, wgRate:wgRate});
			resolve (obj);
		}) 
		.catch(function(error) {
			reject (error);
		});
	}
}
	
function adjustedTime (sign, time, RCC, track, distance, dr, weight, drRate, wgRate) {
	/* normalize time based on dr 10 and weight 125 adjusted for drRate and wgRate respectively */
	/* +ve sign for ex post and -ve for ex ante */
	if (isNaN(time) || isNaN(dr) || isNaN(weight) || isNaN(distance))
		return MaxSeconds;
	let adjDr = adjustedDr (RCC, track, distance, dr);
	return time - Math.max(0, adjDr-10)*drRate*sign - (weight-125)*wgRate*sign;
}

function adjustedDr (RCC, track, distance, dr) {
	return (RCC == "田" && track == "草" && distance == 1000) ?
			Math.abs(dr - 15) : dr;
}

/* Return a promise to query Firestore History for trainer trumpcard uses and in place(1-4) records  */
function queryInPlaceTrumpcards (byPassCache, season, raceDate, trainer, inPlaLimit) {
	return new Promise (function (resolve, reject) {
		if (byPassCache)
			_queryInPlaceTrumpcardsFromIDB (resolve, reject);
		else
			// attempt to get it from iDb trump
			getFromCache ('trump', trainer, raceDate)
			.then (function (rec) {
				if (rec)  //use cache if found
					resolve(rec.ratio);
				// offline mode no longer relevant to iDB
				//else if ( $("#online-mode-switch").val() == "off" )
				//	reject (Error("No trump cache in offline mode"));
				else
					_queryInPlaceTrumpcardsFromIDB (resolve, reject);
			})
			.catch (function (error) {
				_queryInPlaceTrumpFromIDB (resolve, reject);
			});
	});
	
	function _queryInPlaceTrumpcardsFromIDB (resolve, reject) {
		let storeName = "history";
		IDbPromise
		.then( db => {
			let tx = db.transaction(storeName, "readonly");
			let store = tx.objectStore(storeName);
			let index = store.index("TT");
			return index.getAll([trainer,1]);
		})
		.then ( function(recs) {
			let inPlaCount = 0;
			let totalCount = 0;
			recs.forEach(function(rec) {
				totalCount++;
				if (rec.position > 0 && rec.position <= inPlaLimit) 
					inPlaCount++;
			})
			cacheToStore ("trump",
						{key:trainer, raceDate:raceDate, ratio:[inPlaCount,totalCount]});
			console.log("From iDB",trainer,"=>", inPlaCount, totalCount);
			resolve ([inPlaCount,totalCount]);
		})
		.catch(function(error) {
		reject (error);
		});
	}
}

/* Return a promise to query IDB Horses for in place(1-4) records and check for remarks */
function queryInPlaceRemarks (byPassCache, raceDate, RCC, track, course, distance, horseWeight, horseNo, jockey) {
	return new Promise (function (resolve, reject) {
		if (byPassCache)
			_queryInPlaceRemarksFromIDB (resolve, reject);
		else
			// attempt to get it from iDb remarks
			getFromCache ('remarks', horseNo, raceDate)
			.then (function (rec) {
				if (rec && rec.horseWeight == horseWeight)  //only use cache when no horseWeight change, reload otherwise
					resolve(rec.remarks);
				// offline mode no longer relevant to iDB
				//else if ( $("#online-mode-switch").val() == "off" )
				//	reject (Error("No remarks cache in offline mode"));
				else
					_queryInPlaceRemarksFromIDB (resolve, reject);
			})
			.catch (function (error) {
				_queryInPlaceRemarksFromIDB (resolve, reject);
			});
	});
	
	function _queryInPlaceRemarksFromIDB (resolve, reject) {
		let storeName = "horses";
		let range = IDBKeyRange.bound([horseNo,"00000000"],
									  [horseNo,Event[0]], false, true);
		HorsesIDbPromise
		.then( db => {
			let tx = db.transaction(storeName, "readonly");
			let store = tx.objectStore(storeName);
			let index = store.index("HY");
			return index.getAll(range);
		})
		.then ( function(recs) {
			let remarks = {weight:false, distance:false, course:false, distKing:false, HJInPlaCnt:0, HJTotCnt:0};
			let sameRCCTrkDistCnt = 0;
			let sameRCCTrkDistInPlaCnt = 0;
			recs.forEach(function(rec) {
				if (rec.RCC == RCC && rec.track == track && rec.distance == distance)
					sameRCCTrkDistCnt++;
				if (rec.horseNo == horseNo && rec.jockey == jockey)
					remarks.HJTotCnt++;
				if (rec.place < 5 && rec.place > 0) {
					if (rec.horseNo == horseNo && rec.jockey == jockey)
						remarks.HJInPlaCnt++;
					if (horseWeight > 500 && Math.abs(horseWeight - rec.weight) <= 10)
						remarks.weight = true;
					if (rec.RCC == RCC && rec.track == track && rec.distance == distance) {
						sameRCCTrkDistInPlaCnt++;
						let lbw = lbwInteger(rec.LBW);
						if (lbw >= 0 && lbw < 3)
							remarks.distance = true;
					}
					if (rec.RCC == RCC && rec.track == track && rec.course == course)
						remarks.course = true;
				}
			});
			if (sameRCCTrkDistCnt > 0 && (sameRCCTrkDistInPlaCnt / sameRCCTrkDistCnt) >= 0.75)
				remarks.distKing = true;
			console.log("From iDB",horseNo,"=>", remarks);
			cacheToStore ("remarks",{key:horseNo,  //* for all courses
							raceDate:raceDate, remarks:remarks, horseWeight:horseWeight});
			resolve (remarks);
		}) 
		.catch(function(error) {
			reject (error);
		});
	}
}

/* Return a promise to query IDB Horses for latest 3 records and check for test horse */
/* For efficiency also save/return the last race record (if any) in remarks for features selection later    */
function queryTestHorse (byPassCache, season, raceDate, horseNo) {
	return new Promise (function (resolve, reject) {
		if (byPassCache)
			_queryTestHorseFromIDB (resolve, reject);
		else 
			// attempt to get it from iDb remarks
			getFromCache ('testHorse', horseNo, raceDate)
			.then (function (rec) {
				if (rec)
					resolve(rec.remarks);
				// offline mode no longer relevant to iDB
				//else if ( $("#online-mode-switch").val() == "off" )
				//	reject (Error("No testHorse cache in offline mode"));
				else
					_queryTestHorseFromIDB (resolve, reject);
			})
			.catch (function (error) {
				_queryTestHorseFromIDB (resolve, reject);
			});
	});
	
	function _queryTestHorseFromIDB (resolve, reject) {
		let storeName = "horses";
		let range = IDBKeyRange.bound([horseNo,season,"00000000"],
								  [horseNo,season,Event[0]], false, true);
		let records = [];						  
		HorsesIDbPromise
		.then( db => {
			let tx = db.transaction(storeName, "readonly");
			let store = tx.objectStore(storeName);
			let index = store.index("HSY");
			return index.openCursor(range,"prev");
		}) // user cursor to get rec in descending order
		.then ( function savRecords(cursor) {
			if (!cursor || records.length >= 3) {
				return records;
				}
			records.push(cursor.value);
			return cursor.continue().then(savRecords);
		})
		.then ( recs => {
			/* first save the lastest race record if any */
			let lastRecDate = "N/A";
			let lastRec = null;
			if (recs && recs.length > 0) {
				lastRec = recs[0];
				lastRecDate = lastRec.yyyymmdd;
			}
			/* embed last race record of current season in remarks object for convinience */
			let remarks = {testHorse:false, testHorseFail:false, lastRecDate: lastRecDate, lastRec:lastRec};
			if (recs.length > 2) {
				//check testHorse but fail
				remarks.testHorseFail = _checkTestHorseFail (recs);
			}
			if (recs.length > 1) {
				//check testHorse
				remarks.testHorse = _checkTestHorse (recs);
			}
			console.log("From iDB",horseNo,"=>", remarks.testHorse, remarks.lastRecDate);
			cacheToStore ("testHorse",{key:horseNo,
							raceDate:raceDate, remarks:remarks});
			resolve (remarks);
		}) 
		.catch(function(error) {
			reject (error);
		});
	}
	
	function _checkTestHorse (recs) {  
	//check first 2 records for test horse pattern: catch-up then leading or vice versa
		// 1st record
		let dist1 = lbwInteger(recs[0].LBW);
		if (dist1 < 0)
			return false;  //withdrawn 
		let runPos = recs[0].runPosition.match(/\d+/g);
		if (runPos == null || runPos.length < 2)
			return false;
		let lastPos = Number(runPos[runPos.length - 1]);
		if (lastPos ==  1)
			return false;  //ignore win
		let priorPos = Number(runPos[runPos.length - 2]);
		let state1 = false; //assume catch up
		if (priorPos == lastPos) {
			let frontPos = 7;
			if (recs[0].RCC =="谷")
				frontPos = 6;
			if (lastPos <= frontPos)
				state1 = true;  //1 1, 2 2, 3 3, 4 4 ... considered leading
		} else
			state1 = priorPos < lastPos;
    
		// 2nd record
		let dist2 = lbwInteger(recs[1].LBW);
		if (dist2 < 0)
			return false;     
		let runPos2 = recs[1].runPosition.match(/\d+/g);
		if (runPos2 == null || runPos2.length < 2)
			return false;
		let lastPos2 = Number(runPos2[runPos2.length - 1]);
		if (lastPos2 ==  1)
			return false;
		let priorPos2 = Number(runPos2[runPos2.length - 2]);
		let state2 = false; //assume catch up
		if (priorPos2 == lastPos2) {
			let frontPos2 = 7;
			if (recs[1].RCC =="谷")
			frontPos2 = 6;
			if (lastPos2 <= frontPos2)
				state2 = true; //1 1,2 2,3 3,4 4,5 5,6 6,(7 7) considered leading,else catch up
		} else
			state2 = priorPos2 < lastPos2;
		if (dist1 < 5 && dist2 < 5 && state1 != state2) //頭馬距離 must be < 5
			return true;
		else
			return false; 
	}
	
	function _checkTestHorseFail (recs) {
		if (recs[0].place != 1) { //no most recent win?
			if (_checkTestHorse (recs.slice(1))) //a test horse case for 2nd and 3rd doc?
				return true;
		}
		return false;
	}
}

function fetchAllStarters (event, maxRaceNo) {
	let allPromises = [];
	for (let raceNo = 1; raceNo <= maxRaceNo; raceNo++)
		allPromises.push(fetchStarter (event, raceNo));
	return Promise.all (allPromises)
}

function fetchStarter (event, raceNo) {
	return new Promise (function (resolve, reject) {
		let raceDate = event[0].toHyphenatedDate();  //always expect starter dated according to event
		getStarterFromCache (raceNo, raceDate)
		.then ( starter => {
			resolve (starter);  //a good cached starter found
		})
		.catch ( oldStarterFromCache => {  						//old or no starter found
			// if in offline mode, resolve with any usable cached starter or otherwise reject
			if ( $("#online-mode-switch").val() == "off" ) {  	//settle in offline mode
				if (oldStarterFromCache) {
					console.log ("fetchStarter:cached starter",raceNo,"used in offline mode");
					resolve (oldStarterFromCache);
				}
				else
					reject (Error("No starter "+raceNo+" cache in offline mode"));
			} else {  //resolve & reject above will fall thru if not elsed there!!!
				// Online mode, fetch from google apps
				execGoogleAppPromise ("fetchRacecard",
									JSON.stringify({raceDate:event[0], venue:event[1],raceNo:raceNo}))
				.then ( starter => {
					if (starter && starter.runners) {
						cacheToStore ("starters", starter);
						resolve(starter);
					} else {
						if (oldStarterFromCache)
							resolve (oldSarterFromCache);
						else
							reject(Error("No online starter "+raceNo));
					}
				})
				.catch ((error) => {
					if (oldStarterFromCache) {
						console.error ("fetchStarter from cache after:",error);
						resolve (oldStarterFromCache);
					}
					else
						reject(error);
				})
			}
		});
	});
}

/*** Return a promise to execute a google web app function and obtain response ***/
function execGoogleAppPromise  (func,
								param,
								respTimeout,
								exec){
	return new Promise (function (resolve, reject) {
		if (param === undefined) param = "";
		if (respTimeout === undefined) respTimeout = 30 * 1000;  //default to 30 seconds
		if (exec === undefined) exec = HKJCOnlineExec;
		let url =  exec + "func=" + func + "&param=";	
		$.ajax({
			crossDomain: true,
			url: url + encodeURIComponent(param),
			method: "GET",  //"POST" will become "GET" for jsonp!!
			dataType: "jsonp",
			timeout:respTimeout
		})
		.then (function(result,status,xhr) {
			if (result.status == "ACK")  
				resolve(result.response);  //let caller do further check of response (may be null)
			else 				
				reject(result);  //NAK, let promise .catch display app returned error
		})
		.fail (function (xhr,status,error) {
			//console.log (xhr, status);
			reject(error);  	 //let promise .catch display ajax err incl. timeout
		})
	})
}

function startFireStoreQueriesForPredictions (byPassCache, starter) {
	// Read best times (for predict-page) from firestore via promises
	let fireStorePromises = [];
	for (let i=0; i<starter.runners.length; i++) {
		// first get times for current race RCC+track+distance
		let actWeight = starter.runners[i].weight 
						- starter.runners[i].allowance
						- starter.runners[i].flAllowance;			
		fireStorePromises.push (getAdjBestTime
								(byPassCache,
								 starter.raceDate,
								 starter.RCC,
								 starter.track,
								 "*",
								 starter.distance,
								 starter.runners[i].dr,
								 actWeight,
								 starter.runners[i].horseNo
								)
							   );
		// then get times for RCC+track+course+distance depending on settings
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
			distance = Number($("#select-distance").val());
		}
  		fireStorePromises.push (getAdjBestTime
								(byPassCache,
								 starter.raceDate,
								 RCC,
								 track,
								 course,
								 distance,
								 starter.runners[i].dr,
								 actWeight,
								 starter.runners[i].horseNo
								)
							   );
		}
		
	return Promise.all(fireStorePromises)
}

function startFireStoreQueriesForStatistics (byPassCache, starter) {
	// Read best times (for predict-page) from firestore via promises
	let fireStorePromises = [];
	for (let i=0; i<starter.runners.length; i++) {
		// first get jockey trainer in place ratio			   
		fireStorePromises.push (getJockeyTrainerInPlaceRatio
								(byPassCache,
								 starter.season,
								 starter.raceDate,
								 starter.runners[i].jockey,
								 starter.runners[i].trainer,
								 4
								)
							   );
		fireStorePromises.push (queryInPlaceRemarks
								(byPassCache,
								 starter.raceDate,
								 starter.RCC,
								 starter.track,
								 starter.course,
								 starter.distance,
								 starter.runners[i].horseWeight,
								 starter.runners[i].horseNo,
								 starter.runners[i].jockey)
							   );
		fireStorePromises.push (queryTestHorse
								(byPassCache,
								 starter.season,
								 starter.raceDate,
								 starter.runners[i].horseNo)
							   );
		fireStorePromises.push (queryInPlaceTrumpcards
								(byPassCache,
								 starter.season,
								 starter.raceDate,
								 starter.runners[i].trainer,
								 4
								)
							   );
		}
	return Promise.all(fireStorePromises)
}

/* Return a promise to query IDB History collection to calculate jockey-trainer in place ratio */
function getJockeyTrainerInPlaceRatio (byPassCache, season, raceDate, jockey, trainer, inPlaLimit) {
	return new Promise (function (resolve, reject) {
		if (byPassCache)
			_getJockeyTrainerInPlaceRatioFromIDB (resolve, reject);
		else
			// attempt to get it from iDb JTInPlace
			getFromCache ('JTInPlace', jockey+trainer, raceDate)
			.then (function (rec) {
				if (rec)
					resolve(rec.ratio);
				// offline mode no longer relevant to iDB
				//else if ( $("#online-mode-switch").val() == "off" )
				//	reject (Error("No JTInPlace cache in offline mode"));
				else
					_getJockeyTrainerInPlaceRatioFromIDB (resolve, reject);
			})
			.catch (function (error) {
				_getJockeyTrainerInPlaceRatioFromIDB (resolve, reject);
			});
	});
	
	function _getJockeyTrainerInPlaceRatioFromIDB (resolve, reject) {
		let storeName = "history";
		IDbPromise
		.then( db => {
			let tx = db.transaction(storeName, "readonly");
			let store = tx.objectStore(storeName);
			let index = store.index("TJ");
			return index.getAll([trainer,jockey]);
		})
		.then ( function(recs) {
			let inPlaCount = 0;
			let totalCount = 0;
			recs.forEach(function(rec) {
				totalCount++;
				if (rec.position > 0 && rec.position <= inPlaLimit) 
					inPlaCount++;
			})
			cacheToStore ("JTInPlace",
						{key:jockey+trainer, raceDate:raceDate, ratio:[inPlaCount,totalCount]});
			console.log("From iDB",jockey,trainer,"=>", inPlaCount, totalCount);
			resolve ([inPlaCount,totalCount]);
		})
		.catch(function(error) {
		reject (error);
		});
	}
}

function lbwInteger(str) {
	//return the integer number of lbw from str, return -1 if not available
	if (str.indexOf('--') >= 0)
		return -1;  //lbw not available
	let rVal = 0;
	let idx = str.indexOf('-');
	if (idx < 0) {  // n, a/b or words => only return n
		if (!isNaN(str))
			rVal = Number(str);
	} else  // c-a/b => return c
		rVal = Number(str.substring(0,idx));
	//console.log ("lbwInteger",str,"=>",rVal);
	return rVal;
}

function updateOddsAndScores (raceNo) {
	return new Promise (function (resolve, reject) {
		dataLoading (true); //disable button to avoided repeated calls
		if ( $("#online-mode-switch").val() == "off" ) {  //return cache in offline mode
			getFromCache ("winOdds", raceNo, RaceDate)
			.then ( rec => {
				dataLoading (false);
				if (rec && rec.obj) {
					rec.obj.fromCache = true;
					refreshWinOdds (rec.obj);
					/* also predict AI score and refresh */
					updateScoresFromFeatures (rec.obj.wins, raceNo, RaceDate);
				}
				resolve(raceNo);
			});
			return;
		};
		// get winOdds online
		let param = JSON.stringify({raceDate:Event[0],venue:Event[1], raceNo:raceNo});
		execGoogleAppPromise ("fetchXmlWinPlaOdds", param)
		.then (async obj => {
			dataLoading (false);
			if (obj && obj.wins && obj.wins.length > 0) {  //also check empty array for XML response
				refreshWinOdds (obj);
			    /* also predict AI score using winOdds and refresh */
				updateScoresFromFeatures (obj.wins, obj.raceNo, obj.raceDate);
				/* cache winOdds for offline access */
				cacheToStore ("winOdds", {key:obj.raceNo, raceDate:obj.raceDate, obj:obj});
			} else {
				/* try any cache */
				let rec = await getFromCache ("winOdds", raceNo, RaceDate);
				if (rec && rec.obj) {
					rec.obj.fromCache = true;
					console.log ("Using WinOdds cache for race", raceNo);
					refreshWinOdds (rec.obj);
					/* also predict AI score and refresh */
					updateScoresFromFeatures (rec.obj.wins, raceNo, RaceDate);					
				} else
					console.log ("No WinOdds for race", raceNo);
			};
			resolve(raceNo);
		})
		.catch (error => {
			dataLoading (false);
			console.error (error);
			popupMsg ("fetchXmlWinPlaOdds:"+error);
			resolve();  //no longer escalate
		});
	})
}
