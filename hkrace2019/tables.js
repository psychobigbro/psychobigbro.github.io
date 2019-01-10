/* Generate new trainer's entries and jockey's rides into TrainerEntries & JockeyRides
 * based on Event & MaxRaceNo
 */
function updateTrainerJockeyTables () {
	if ($("a.reload-btn")[0].hasAttribute("disabled"))
		return;		//avoid repeated operation as reload-btn is disabled by dataloading(true)
	if (!(Event && MaxRaceNo)) {
		popupMsg ("No active Event!!");
		return;
	}
	dataLoading (true);
	/*
	let allPromises = [];
	for (let raceNo = 1; raceNo <= MaxRaceNo; raceNo++)
		allPromises.push(fetchStarter (Event, raceNo));
	Promise.all (allPromises) */
	fetchAllStarters (Event, MaxRaceNo)
	.then ( starters => { //to carry forward starters, init another thenable function passing in starters
		return startLoadingDataForTables (starters)
		.then ( data => {
			// data contain jTInPlace & predictedTime data of each size (tot no. of runners in starters)
			let jTInPlace = data.splice(0,data.length/2); 	//jTInPlace is first half
			let predictedTime = data;  						//predictedTime is second half
			let maxRaceNo = starters.length;
			let obj = buildJockeyTrainerTableContents (starters, jTInPlace, predictedTime);
			cacheToStore ("cache", {key:"TrainerEntries", data:obj.trainerEntries});
			cacheToStore ("cache", {key:"JockeyRides", data:obj.jockeyRides})
			let tTable = $("#trainer-table").DataTable();
			tTable.clear().rows.add(obj.trainerEntries);
			let jTable = $("#jockey-table").DataTable();
			jTable.clear().rows.add(obj.jockeyRides);
			$( jTable.column(0).nodes() ).addClass( 'fixed-column' );
			$( tTable.column(0).nodes() ).addClass( 'fixed-column' );
			popupMsg("完成"+Event[0]+Event[1]+"共" + maxRaceNo + "場賽事", 5000);
			dataLoading (false);
		})
	})
	.catch ( error => {
		popupMsg(JSON.stringify(error));
		dataLoading (false);
		console.error (error);
	});
}

function startLoadingDataForTables (starters) {
	let fireStorePromises = [];
	/* load all jTInPlace data, then predictedTime data in order for easier separation */
	for (let r = 0; r < starters.length; r++) {
		for (let i=0; i<starters[r].runners.length; i++) {
		// first get jockey trainer in place ratio			   
		fireStorePromises.push (getJockeyTrainerInPlaceRatio
								(false,  //dont bypass cache
								 starters[r].season,
								 starters[r].raceDate,
								 starters[r].runners[i].jockey,
								 starters[r].runners[i].trainer,
								 4
								)
							   );
		}
	};
	for (let r = 0; r < starters.length; r++) {
		for (let i=0; i<starters[r].runners.length; i++) {
		// then get times for current race RCC+track+distance
			let actWeight = starters[r].runners[i].weight 
						- starters[r].runners[i].allowance
						- starters[r].runners[i].flAllowance;			
			fireStorePromises.push	(getAdjBestTime
									(false,  //dont bypass cache
									starters[r].raceDate,
									starters[r].RCC,
									starters[r].track,
									"*",
									starters[r].distance,
									starters[r].runners[i].dr,
									actWeight,
									starters[r].runners[i].horseNo
									)
									);
		}
	}
	return Promise.all(fireStorePromises)
}

function buildJockeyTrainerTableContents (starters, jTInPlace, predictedTime) {
	let tTbl = [];
	let jTbl = [];
	//idx increment in the inner loops to cope with jTInPlace and predictedTime array index
	for (let c = 0, idx = 0; c < starters.length; c++) {
		let runners = starters[c].runners;
		let times = [];
		let jRows = [];
		let tRows = [];
		let t = 0;  //idx times separately for cater for skipped horses
		for (let h = 0; h < runners.length; h++, idx++) {
			if (runners[h].scratch || runners[h].num == "(Null)")
				continue; //skip scratch horse and standby horse
			let trainer = runners[h].trainer;
			let jockey = runners[h].jockey;
			let horseName = runners[h].horseName;
			let pref = runners[h].preference;
			let suffix = (runners[h].trumpCard ? "+" : runners[h].priority ? "*" : "") 
						+ (pref == "0" ? "" : pref);
			let ratio = '';
			times[t] = predictedTime[idx].predTime;
			//let timeInMin = secToMin(times[t]);
			if (jTInPlace[idx] && jTInPlace[idx][1])
				ratio = jTInPlace[idx][0] + "/" + jTInPlace[idx][1];
			let tRow = rowOfEmptyCell(tTbl, c+1, trainer);
			tTbl[tRow][0] = trainer;
			tTbl[tRow][c+1] = jockey + ratio + "<br>" + horseName + suffix; // + "<br>" + timeInMin;
			tRows[t] = tRow; 	//remember row number for this specific time
			let jRow = rowOfEmptyCell(jTbl, c+1, jockey);
			jTbl[jRow][0] = jockey;
			jTbl[jRow][c+1] = trainer + ratio + "<br>" + horseName + suffix; // + "<br>" + timeInMin;
			jRows[t] = jRow;
			t++;
		}
		//finished 1 starter, rank times' index and insert rank style to corr. cell
		let indices = indicesOfSortedArray (times);
		//let prefix = '<rank';
		//let suffix1 = '">';
		//let suffix2 = '</>';
		for (let i=0; i<4; i++) {
			let cellText = tTbl[tRows[indices[i]]][c+1];
			tTbl[tRows[indices[i]]][c+1] = "<rank" + i + ">" + cellText + "</rank" + i + ">";
			cellText = jTbl[jRows[indices[i]]][c+1];
			jTbl[jRows[indices[i]]][c+1] = "<rank" + i + ">" + cellText + "</rank" + i + ">";
		}
	}
	//each trainer may appear more than once in a race, sort to group rows of same trainer
	tTbl.sort ((x, y) => {
		return	(x[0] < y[0]) ? -1 : (x[0] > y[0]) ? 1 :
				(x[1] != "" ) ? -1 : (y[1] != "" ) ? 1 :  //non-blank should be on top (-1)
				(x[2] != "" ) ? -1 : (y[2] != "" ) ? 1 :
				(x[3] != "" ) ? -1 : (y[3] != "" ) ? 1 :
 				(x[4] != "" ) ? -1 : (y[4] != "" ) ? 1 :
				(x[5] != "" ) ? -1 : (y[5] != "" ) ? 1 :
				(x[6] != "" ) ? -1 : (y[6] != "" ) ? 1 : 0;
	});
	//each jockey will not appear more than once in a race, no need to sort
	return ({trainerEntries:tTbl, jockeyRides:jTbl});
	
	function rowOfEmptyCell (tbl, raceNo, name) {
		let r;
		for (r = 0; r < tbl.length; r++) {
			if (tbl[r][0] == name && tbl[r][raceNo] == "")
				return r;
		}
		//cant find an existing row starting with name, insert an empty row for it
		tbl.push(Array(12).fill(""));
		return r;  //now r should point to the last row
	}
}

function highlightRaceResults (tableName, raceNo) {
	if (!(Event && MaxRaceNo)) {
		popupMsg ("No active Event!!");
		return;
	}
	if (raceNo > MaxRaceNo)
		return;
	dataLoading(true);
	popupMsg ("更新賽果",2000);
	execGoogleAppPromise ("fetchResultsDividends",
						   JSON.stringify({raceDate:Event[0],venue:Event[1],raceNo:raceNo}))
	.then (results => {
		dataLoading (false);
		if (results && results.runners) {
			let runners = results.runners;
			let table = $(tableName).DataTable();
			let colData;
			if (tableName == "#trainer-table")
				colData = table.column(raceNo).data();
			else
				colData = table.column(0).data();
			let nodes = table.column(raceNo).nodes();
			for (let i=0; i<5; i++) {  //only check the 1st 5 positions
				let runner = runners[i];
				if (runner.position > 0 && runner.position < 5) {
					let jockey = runner.jockey;
					for (let j=0; j<colData.length; j++)
						if (colData[j].indexOf(jockey) >= 0) {
							$(nodes[j]).addClass('position-'+runner.position);
							break;
						}
				}
			}
		} else {
			popupMsg ("未有賽果",2000);
		}
	})
	.catch ( error => {
		dataLoading (false);
		popupMsg ("未有賽果",2000);
		//popupMsg(JSON.stringify(error));
		console.error (error);
	});
}
