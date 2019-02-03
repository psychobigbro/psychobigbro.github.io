/* AI related functions */
(function () {
	'use strict';
	Tfjs.model = tf.loadModel(Tfjs.modelName+'/model.json'); //model name = subfolder name
	$.getJSON( Tfjs.modelName+"/scale_.json", function( scale_ ) {
		Tfjs.tensorS = tf.tensor1d(scale_);	//for either StandardScaler or MinMaxScaler
		console.log (Tfjs.modelName,'scaler scale_ downloaded:');
		Tfjs.tensorS.print();
	}); /* uncomment if minMaxScaler is used
	$.getJSON( Tfjs.modelName+"/min_.json", function( min_ ) {
		Tfjs.tensorM = tf.tensor1d(min_);	//for MinMaxScaler
		console.log (Tfjs.modelName,'MinMaxScaler min_ downloaded:');
		Tfjs.tensorM.print();
		Tfjs.scalerTransform = minMaxScaler;
	}); */
	$.getJSON( Tfjs.modelName+"/mean_.json", function( mean_ ) {
		Tfjs.tensorM = tf.tensor1d(mean_);	//for StandardScaler
		console.log (Tfjs.modelName,'standardScaler mean_ downloaded:');
		Tfjs.tensorM.print();
		Tfjs.scalerTransform = standardScaler;
	});
	
})();

function minMaxScaler(tensorX) {
	return tensorX.mul(Tfjs.tensorS).add(Tfjs.tensorM);
}

function standardScaler(tensorX) {
	return tensorX.sub(Tfjs.tensorM).div(Tfjs.tensorS);
}

/*** Retrieve all features from starters, predict and stat data of a specific race ***/
function getFeaturesForRace (starter, pred, stat) {
	let raceNo = starter.raceNo;
	let raceDate = starter.raceDate;
	let features = [];
	let nHorses = 0;
	//i, s, p index to runners, stat, pred
	for (let i=0,s=0,p=0; i<starter.runners.length; i++,p += 2,s += 4) {
		let runner = starter.runners[i];
		if (runner.num == "(Null)")
			continue;	//ignore Standby Horse as wont be displayed
		if (runner.scratch) {
			features.push (null);
			continue;   //filler for scratched horse, will be displayed but not assessed
		}
		nHorses++; //accum no actual no. of horses running
		let allowance = runner.allowance + runner.flAllowance;
		let pObj = pred[p];
		let sObj = stat[s+2];
		let lastRec = sObj.lastRec ? sObj.lastRec :   //use dummy lastRec when not available
									{RCC:"",track:"",distance:0,dr:0,actWeight:0,weight:0,class:0,finTime:MaxSeconds};
		let adjDr = adjustedDr (starter.RCC, starter.track, starter.distance, Number(runner.dr));
		let adjLastDr = adjustedDr (lastRec.RCC, lastRec.track, lastRec.distance, lastRec.dr);
		let adjBestDr = adjustedDr (starter.RCC, starter.track, starter.distance, pObj.dr);
		let fObj = {horseNo:runner.horseNo, RCC:starter.RCC, track:starter.track, 
					distance:starter.distance, going:starter.going, class:starter.class, dr:adjDr,
					actWgt:Number(runner.weight)-allowance, rating:runner.rating, age:Number(runner.horseAge),
					horseWgt:Number(runner.horseWeight),
					trainer:runner.trainer,jockey:runner.jockey, bestDr:adjBestDr, bestDate:pObj.date,
					bestActWgt:pObj.weight, bestHorseWgt:pObj.horseWeight, bestClass:pObj.class, bestTime:pObj.recTime,
					lastDate:sObj.lastRecDate, lastRCC:lastRec.RCC, lastTrack:lastRec.track,
					lastDist:lastRec.distance, lastDr:adjLastDr, lastActWgt:lastRec.actWeight,
					lastHorseWgt:lastRec.weight, lastClass:lastRec.class, lastTime:lastRec.finTime };
		features.push(fObj);

	}
	//No need to have features cache if Global Features work well
	//cacheToStore ("features",
	//			  {key:raceNo, raceDate:raceDate, features:features});
	features.splice(0,0,nHorses);  //insert nHorses to features[0]
	return features;
}

/* Update AI Scores column (last column) in all column toggle tables */
function refreshAIScores (raceDate, raceNo, scores, wins) {
	if (!scores || scores.length < 1) return;
	//select tbody of all columnToggle tables
	let $tblBody = $( "[data-mode='columntoggle'] tbody" );
	let ai = $("#ai-mode-switch").val() == "on" 
	for (let i=0; i < scores.length; i++ ) {
		let rowIdx = i+1;
		let $cell = $tblBody.find("tr:nth-child(" + rowIdx + ")")
							.find("td:nth-last-child(1)");
		$cell.text((scores[i]).toFixed(2));
		if (ai)
			Bet.tbl[raceNo-1][i] = null; //first clear any previous bet before update below
	}
	let indices = indicesOfSortedArray (scores).reverse();  //descending order
	for (let i=0; i < 3; i++) {
		let rowIdx = indices[i] + 1;
		if (ai) {
			let leg = indices[(i+1) % 3] + 1;
			//update bet for highest 3 AI scores, but not immediately refreshed!!
			Bet.tbl[raceNo-1][indices[i]] = {winAmt:"10",qinAmt:"10",qinLeg:leg,plaAmt:"10",qplAmt:"10",qplLeg:leg,
											nHorses:scores.length};  //nHorses for backend record only
		}
		let $row = $tblBody.find("tr:nth-child(" + rowIdx + ")");
		$row.find("td:nth-last-child(1)")
			.css("backgroundColor", TimeRankColors[i]);
		// special highlight of horse num with high score as well as winodds between FrWinOdds & ToWinOdds
		let winOdds = wins[rowIdx-1].odds;
		if (  winOdds >=FrWinOdds && winOdds <=ToWinOdds)
			$row.find("td:nth-child(1)")
				.css("backgroundColor", TimeRankColors[i]);
	}
	if (ai) {
		Bet.raceDate = raceDate;
		Bet.modelName = Tfjs.modelName;
		cacheToStore ("cache", {key:"Bets",betTbl:Bet.tbl, raceDate:raceDate, modelName:Bet.modelName});
	}
}

/* perform predictons from cached features and passed-in winOdds and refresh col in tables */
function updateScoresFromFeatures (wins, raceNo, raceDate) {
	if ( $("#ai-mode-switch").val() != "on" )
		return;  //turned off by ai-mode-switch
	getFeaturesPromise (raceNo, raceDate)
	.then (allFeats => {
		if (wins.length != allFeats.length-1)  //features array start with nHorses
			throw "winOdds and features size unmatched";
		let selFeats = [];
		for (let i = 0; i < allFeats.length-1; i++) {
			selFeats[i] = [];
			let f = allFeats[i+1];
			if (!f) {  //set high winOdds to lower prediction value
				selFeats[i]= [0,0,9999,0,0,0,0,0,0,0,0,0,0];  //length 13 should match no. of features
				continue;
			}
			let key = f.RCC + f.track + f.distance;
			let bestSpd = (f.bestTime >= MaxSeconds || f.bestClass <= 0)
						   ? 0 : f.bestTime / StdTimes[key][f.bestClass-1] * 100;
			key = f.lastRCC + f.lastTrack + f.lastDist;
			let lastSpd = (f.lastTime >= MaxSeconds || f.lastClass <= 0)
						   ? 0 : f.lastTime / StdTimes[key][f.lastClass-1] * 100;
			let winOdds = wins[i].odds;
			if (isNaN(winOdds))
				winOdds = 9999;
			selFeats[i].push (f.dr, f.rating, winOdds,
							  f.actWgt, f.horseWgt,
							  f.lastDr, f.lastActWgt, f.lastHorseWgt, lastSpd,
							  f.bestDr, f.bestActWgt, bestSpd, f.age); //, allFeats[0]);
		}
		Tfjs.model.then ( model => {
			const tensorX = tf.tensor2d(selFeats);
			tensorX.print();
			//scale X using same scales as used in model training
			//const tensorScaledX = tensorX.mul(Tfjs.tensorS).add(Tfjs.tensorM);
			const tensorScaledX = Tfjs.scalerTransform(tensorX);
			
			//tensorScaledX.print();
			const tensorY = model.predict(tensorScaledX);
			tensorY.print();
			tensorY.data().then ( scores => refreshAIScores (raceDate, raceNo, scores, wins) );	
		});
	})
	.catch (error => {
		console.error (error);
		popupMsg (JSON.stringify(error));
	})
	
	function getFeaturesPromise (raceNo, raceDate) {
		return new Promise (function (resolve, reject) {
			if (Features)
				resolve (Features)
			else  /** NO NEED to have features cache if global Features work well **/
				getFromCache ("features", raceNo, raceDate)
				.then (rec => {
					if (rec && rec.features)
						resolve (rec.features);
					else
						throw "No features in cache for race " + raceNo + " of date " + raceDate;
				})
				.catch (error => reject (error));			
		})
	}
}
