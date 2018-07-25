/* fetch dividends data from HKJCOnline and update result-table with Bet.tbl data
 * based on Event & MaxRaceNo
 */
function updateResultTable () {
	if (!(Event && MaxRaceNo)) {
		popupMsg ("No active Event!!");
		return;
	}
	dataLoading(true);
	let allPromises = [];
	for (let raceNo = 1; raceNo <= MaxRaceNo; raceNo++)
		allPromises.push(execGoogleAppPromise ("fetchDividends",
												JSON.stringify({raceDate:Event[0],venue:Event[1],raceNo:raceNo})));
	Promise.all (allPromises)
	.then ( results => {
		dataLoading (false);
		// find actual length of results with data
		let resultLen = 0;
		for (let i=results.length-1; i >= 0; i--)
			if (results[i] != null && results[i].raceDate) {
				resultLen = i+1;
				break;
			};
		var title = "";
		if (resultLen > 0) {
			// use date/time of last results record
			let result = results[resultLen-1];
			if (result.raceDate == RaceDate) {
				title = result.updateTime + "&nbsp;" + "賽馬日：" + result.raceDate + "&nbsp;" 
						+ (result.RC=="HV"?"跑馬地":"沙田");
				$("#result-page div.result-msg").html(title);
			}
			else {
				popupMsg ("Results for "+result.raceDate+" is outdated",3000);
				resultLen = 0;
				results = Array(11);  //nullify results (11 races) for checking logic below
			}
		} else
			popupMsg ("No results for "+RaceDate+" yet",3000);
		let table = $("#result-table").DataTable();
		const numOfTblCols = table.init().columns.length;
		let data = [];  //DataTable data
		let bets = tabulatedBetData();
		let raceNoCeiling = Math.max(bets.winLen, bets.plaLen, bets.qinLen, bets.qplLen, resultLen);
		for (let i=0; i < raceNoCeiling; i++) {
			let maxRows = Math.max(results[i]  ? results[i].plas.length : 0,
								   bets.win[i] ? bets.win[i].length : 0,
								   bets.pla[i] ? bets.pla[i].length : 0,
								   bets.qin[i] ? bets.qin[i].length : 0,
								   bets.qpl[i] ? bets.qpl[i].length : 0);
			for (let j=0; j < maxRows; j++) {
				let row = Array(numOfTblCols).fill("");
				if (j == 0)
					row[0] = i+1;
				if (results[i]) {
					if (j == 0) {
						//row[0] = results[i].raceNo;
						row[2] = results[i].win.num+":$"+results[i].win.div;
						row[5] = results[i].qin.nums+":$"+results[i].qin.div;
					}
					if (results[i].plas[j])
						row[8] = results[i].plas[j].num+":$"+results[i].plas[j].div;				
					if (results[i].qpls && results[i].qpls[j])  //race with few horses has no qpls
						row[11] = results[i].qpls[j].nums+":$"+results[i].qpls[j].div;
				}
				if (bets.win[i] && bets.win[i][j]) {
					row[1] = bets.win[i][j].numAmt;
					if (results[i] && bets.win[i][j].num == results[i].win.num) {
						let div = results[i].win.div / 10 * bets.win[i][j].amt
						row[3] = "$" + div;
						bets.winTotDiv += div;
					}
				}
				if (bets.pla[i] && bets.pla[i][j]) {
					row[7] = bets.pla[i][j].numAmt;
					if (results[i])
						for (let k=0; k < results[i].plas.length; k++)
							if (results[i].plas[k].num == bets.pla[i][j].num) {
								let div = results[i].plas[k].div / 10 * bets.pla[i][j].amt
								row[9] = "$" + div;
								bets.plaTotDiv += div;
								break;
							}
				}
				if (bets.qin[i] && bets.qin[i][j]) {
					row[4] = bets.qin[i][j].numAmt;
					if (results[i] && bets.qin[i][j].num == results[i].qin.nums) {
						let div = results[i].qin.div / 10 * bets.qin[i][j].amt
						row[6] = "$" + div;
						bets.qinTotDiv += div;
					}					
				}
				if (bets.qpl[i] && bets.qpl[i][j]) {
					row[10] = bets.qpl[i][j].numAmt;
					if (results[i])
						for (let k=0; k < results[i].qpls.length; k++)
							if (results[i].qpls[k].nums == bets.qpl[i][j].num) {
								let div = results[i].qpls[k].div / 10 * bets.qpl[i][j].amt
								row[12] = "$" + div;
								bets.qplTotDiv += div;
								break;
							}				
				}
				data.push(row);  //finished 1 row of current raceNo		
			}
		};
		// add total row if some bets exist
		if (bets.winTotBet > 0 || bets.plaTotBet > 0 || bets.qinTotBet > 0 || bets.qplTotBet > 0) {
			let row = Array(13).fill("");
			row[0] = "共";
			row[1] = "($" + bets.winTotBet + ")";
			row[3] = "$" + bets.winTotDiv;
			row[4] = "($" + bets.qinTotBet + ")";
			row[6] = "$" + bets.qinTotDiv;
			row[7] = "($" + bets.plaTotBet + ")";
			row[9] = "$" + bets.plaTotDiv;
			row[10] = "($" + bets.qplTotBet + ")";
			row[12] = "$" + bets.qplTotDiv;
			data.push(row); 
		}		
		if (data.length > 0)
			cacheToStore ("cache", {key:"Results", data:{title:title,contents:data,results:results}});
		table.clear().rows.add(data);
		table.columns.adjust().draw();
	})
	.catch ( error => {
		dataLoading (false);
		popupMsg(JSON.stringify(error));
		console.log (error);
	});
}

/* return tabulated data from Bet.tbl */
function tabulatedBetData () {
	var data = {win:[],pla:[],qin:[],qpl:[],winLen:0,plaLen:0,qinLen:0,qplLen:0,winTotBet:0,plaTotBet:0,
				winTotDiv:0,plaTotDiv:0,qinTotBet:0,qinTotDiv:0,qplTotBet:0,qplTotDiv:0};
	if (Bet.raceDate != RaceDate)
		//bet table has no data created under current RaceDate
		return data;
	for (let r=0; r<Bet.tbl.length; r++) {
		data.win[r] = [];
		data.pla[r] = [];
		data.qin[r] = [];
		data.qpl[r] = [];
		let iWin = 0;
		let iPla = 0;
		let iQin = 0;
		let iQpl = 0;
		for (let n=0; n<Bet.tbl[r].length; n++) {
			let cell = Bet.tbl[r][n];
			if (cell) {
				if (cell.winAmt) {
					if (cell.qinLeg) {
						let numStr = (n+1) < Number(cell.qinLeg) ? (n+1).toString()+","+cell.qinLeg
																 : cell.qinLeg+","+(n+1).toString();
						data.qin[r][iQin++] = {num:numStr, numAmt:numStr+"($"+cell.winAmt+")",
											   amt:Number(cell.winAmt)};
						data.qinTotBet += Number(cell.winAmt);						
					} else {
						data.win[r][iWin++] = {num:(n+1).toString(), numAmt:(n+1).toString()+"($"+cell.winAmt+")",
											   amt:Number(cell.winAmt)};
						data.winTotBet += Number(cell.winAmt);
					};
				};
				if (cell.plaAmt) {
					if (cell.qplLeg) {
						let numStr = (n+1) < Number(cell.qplLeg) ? (n+1).toString()+","+cell.qplLeg
																 : cell.qplLeg+","+(n+1).toString();
						data.qpl[r][iQpl++] = {num:numStr, numAmt:numStr+"($"+cell.plaAmt+")",
											   amt:Number(cell.plaAmt)};
						data.qplTotBet += Number(cell.plaAmt);						
					} else {
						data.pla[r][iPla++] = {num:(n+1).toString(), numAmt:(n+1).toString()+"($"+cell.plaAmt+")",
											   amt:Number(cell.plaAmt)};
						data.plaTotBet += Number(cell.plaAmt);
					};
				};
			}
		}
	}
	//find last non-empty array and save the actual length
	for (let i = data.win.length-1; i >= 0; i--)
		if (data.win[i].length > 0) {
			data.winLen = i+1;
			break;
		};
	for (let i = data.pla.length-1; i >= 0; i--)
		if (data.pla[i].length > 0) {
			data.plaLen = i+1;
			break;
		};
	for (let i = data.qin.length-1; i >= 0; i--)
		if (data.qin[i].length > 0) {
			data.qinLen = i+1;
			break;
		};
	for (let i = data.qpl.length-1; i >= 0; i--)
		if (data.qpl[i].length > 0) {
			data.qplLen = i+1;
			break;
		};
	return data;
}

/* clear all bets from Bet.tbl and reset raceDate to current */
function clearBetTbl () {
	Bet.raceDate = RaceDate;
	Bet.tbl = Array(11).fill(null).map(() => Array(14).fill(null));
	cacheToStore ("cache", {key:"Bets",betTbl:Bet.tbl, raceDate:RaceDate});
}

function betOnStrategy () {
	dataLoading (true); 
	// get maxRaceNo
	//execGoogleAppPromise ("getRaceDayInfo")
	//.then ( info => {
	//	if (!info || info.maxRaceNo < 6) {//should have at least 6 races
	//		throw "Can't getRaceDayInfo";
	//	} else if (info.raceDate != info.firestoreRaceDate) {
	//		throw "數據有待更新，請稍後再試";
	//	} else
	//		return info; //cont at next .then
	//})
	//.then ( info => {
	if (RaceDate == "" || MaxRaceNo < 6) return;
	let allPromises = [];
	for (let raceNo = 1; raceNo <= MaxRaceNo; raceNo++)
		allPromises.push(fetchStarter (Event, raceNo));
	Promise.all (allPromises)
	.then ( starters => { //to carry forward starters, init another thenable function passing in starters
		return startLoadingDataForBets (starters)
		.then ( predictedTime => {
			let bets = placeBetsForStrategy (starters, predictedTime);
			let maxRaceNo = starters.length;
			popupMsg("Processed " + maxRaceNo + " races and betted " + bets.length + " horses", 5000);
			dataLoading (false);
		})
	})
	.catch ( error => {
		popupMsg(JSON.stringify(error));
		dataLoading (false);
		console.log (error);
	});
}

function startLoadingDataForBets (starters) {
	let fireStorePromises = [];
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

function placeBetsForStrategy (starters, predictedTime) {
	bets = [];
	for (let r = 0, p = 0; r < starters.length; r++) {
		let starter = starters[r];
		let timeArr = [];
		let noRecCnt = 0;
		for (let n = 0; n < starter.runners.length; n++, p++) {  //this loop cant be skipped, need p++
			let runner = starter.runners[n];
			if (runner.num == "(Null)" ) {
				timeArr[n] = MaxSeconds;
				continue;  //ignore standby horse
			}
			let time = predictedTime[p].predTime;
			timeArr[n] = runner.scratch ? MaxSeconds : time;
			if (!runner.scratch && time == MaxSeconds)
				noRecCnt++;	  //count no. of runners w/o time record
		}
		//scanned 1 race, decide to bet or not
		if (starter.class < 5 && noRecCnt < 3) {
			let indices = indicesOfSortedArray (timeArr);
			for (let i= 0; i < 3; i++)
				if (timeArr[indices[i]] < MaxSeconds)
					bets.push ({raceNoIdx:r,numIdx:indices[i]});
		}
	};
	if (bets.length > 0) {
		Bet.raceDate = starters[0].raceDate;
		Bet.tbl = Array(11).fill(null).map(() => Array(14).fill(null));
		$.each (bets, function (i, bet) {
			Bet.tbl[bet.raceNoIdx][bet.numIdx] = {winAmt:"10",qinLeg:"",plaAmt:"10",qplLeg:""};		
		});
		cacheToStore ("cache", {key:"Bets",betTbl:Bet.tbl, raceDate:Bet.raceDate});
	}
	return bets;
}
