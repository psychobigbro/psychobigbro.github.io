/*** Pertaining to firebase (Google) Cloud Storage ***/

/* return a promise to download horses.json from GCS
 * resolve to horses object
 */
function downloadGCSFilePromise (fileName) {
	return new Promise ((resolve, reject) => {
		let storage = firebase.storage();
		let storeRef = storage.ref(fileName);
		storeRef.getDownloadURL()
		.then ( url => {
			/* $.ajax or $.getJSON cant handle 404 errors!!! */
			let xhr = new XMLHttpRequest();
			xhr.responseType = 'json';
			xhr.onload = function(event) {
				let resp = xhr.response;
				resolve (resp);
			};
			xhr.open('GET', url);
			xhr.send();
		})
		.catch ( error => {
			// Handle any errors
			reject (fileName+":"+error.code);
		});
	})
}

/* return a promise to upload fileName to GCS
 */
function uploadGCSFilePromise (fileName, data, metadata) {
	return new Promise ((resolve, reject) => {
		let storeRef = firebase.storage().ref(fileName);
		storeRef.putString(data, 'raw', metadata)
		.then ( snapshot => {
			resolve (snapshot);
		})
		.catch ( error => {
			// Handle any errors
			reject (fileName+":"+error.code);
		});
	})
}

/* return a promise to create iDB horses store from GCS horses file
 * resolve to number of horses put to store
 */
 function createHorsesStorePromise (horsesObj) {
	let horses = horsesObj.horses;
	let raceDate = horsesObj.raceDate;
	let recStoreName = horsesObj.storeName;  //as in GCS rec
	let storeName = 'horses';
	let numHorseRecs = 0;
	return new Promise (async function (resolve, reject) {
	try {
		/* delete and recreate HKRaceDB horses store to avoid performance issue for non-ios chrome */
		let dbOld = await HorsesIDbPromise;
		let versionNo = dbOld.version;
		dbOld.close();
		//console.log ("HKRaceDB version", versionNo, "closed!!");
		HorsesIDbPromise = idb.open('HKRaceDB', ++versionNo, function (upgradeDb) {
			if (upgradeDb.objectStoreNames.contains(storeName)) {
				upgradeDb.deleteObjectStore(storeName);
				console.log ("iDB store",storeName, "deleted!!");
			}
			let horsesOS = upgradeDb.createObjectStore(storeName, {autoIncrement:true});
			horsesOS.createIndex('HY', ['horseNo','yyyymmdd'], {unique: true});
			horsesOS.createIndex('HSY', ['horseNo','season','yyyymmdd'], {unique: true});
			horsesOS.createIndex('HRTDY', ['horseNo','RCC','track','distance','yyyymmdd'], {unique: true});
			horsesOS.createIndex('HRTDCY', ['horseNo','RCC','track','distance','course','yyyymmdd'], {unique: true});
			console.log ("iDB store",storeName, "of HKRaceDB version",versionNo,"created");
		});
		let db = await HorsesIDbPromise;
		let tx = db.transaction(storeName, "readwrite");
		let store = tx.objectStore(storeName);
		for (let i=0; i<horses.length; i++, numHorseRecs++) {
			//for (let j=0; j<horses[i].records.length; j++) {
			//let obj = horses[i].records[j];
			let obj = horses[i];
			obj.raceDate = raceDate;
			//obj.horseNo = horses[i].horseNo;
			await store.add(obj);
		}
		await store.add({horseNo:"ZZZZ",yyyymmdd:"00000000",RCC:"",track:"",distance:0,course:"",
						raceDate:raceDate, storeName:recStoreName});
		console.log ('...finished all horses from',recStoreName);
		await tx.complete;
		console.log ("iDB store", storeName, "of", raceDate,"updated!!");
		HorsesOSRaceDate = raceDate;
		cacheRaceInfo ();
		resolve (numHorseRecs);
		}
	catch (error) {
		reject ("create iDB horses:"+error);
		}
	})
}
/*
async function clearHorsesStore () {
	let storeName = 'horses';
	let db = await IDbPromise;
	let tx = db.transaction(storeName, "readwrite");
	await tx.objectStore(storeName).clear(); 
	await tx.complete;
	console.log ("iDB store",storeName, "cleared!!");	
}

function updateHorsesStorePromise (horsesObj) {
	let horses = horsesObj.horses;
	let raceDate = horsesObj.raceDate;
	let storeName = 'horses';
	let numHorses = 0;
	return new Promise ((resolve, reject) => {
	IDbPromise
	.then( db => {
		let tx = db.transaction(storeName, "readwrite");
		tx.objectStore(storeName).clear(); 
		return tx.complete;
	})
	.then( () => {
		console.log ("iDB store",storeName, "cleared!!");
		return IDbPromise
		.then (db => {
			let tx = db.transaction(storeName, "readwrite");
			let store = tx.objectStore(storeName);
			for (let i=0; i<horses.length; i++, numHorses++)
				for (let j=0; j<horses[i].records.length; j++) {
					let obj = horses[i].records[j];
					obj.raceDate = raceDate;
					obj.horseNo = horses[i].horseNo;
					store.add(obj);
				}
			store.add({horseNo:"ZZZZ",yyyymmdd:"00000000",RCC:"",track:"",distance:0,course:"",raceDate:raceDate});
			console.log ('...finished all horses');
			return tx.complete;
		})
		.then( () => {
		console.log ("iDB store", storeName, "of", raceDate,"updated!!");
		HorsesOSRaceDate = raceDate;
		cacheRaceInfo ();
		resolve (numHorses);
		})
	})
	.catch( error => {
		console.error ("update iDB horses:",error);
		reject ("update iDB horses:"+JSON.stringify(error));
	})
	})
}
*/
/* return a promise to update iDB history store from GCS file
 * resolve to number of records added
 */
function updateHistoryStorePromise (history) {
	let records = history.records;
	let raceDate = history.raceDate;
	let season = history.season;
	let lastRaceIdx = history.lastRaceIdx;
	let storeName = 'history';
	let recLastRaceIdx = 0;
	let numRecAdded = 0;
	let updLastRaceIdx;
	return new Promise ((resolve, reject) => {
	IDbPromise
	.then( db => {
		let tx = db.transaction(storeName, "readonly");
		let store = tx.objectStore(storeName);
		return store.get([0,'ZZZZ']);
	})
	.then( rec => {
		if (rec && rec.lastRaceIdx && rec.season == season) {
			recLastRaceIdx = rec.lastRaceIdx;
			console.log (storeName,"to be appended from lastRaceIdx",rec.lastRaceIdx)
			return IDbPromise;
		}
		return IDbPromise.then ( db => {
		console.log (storeName,"has no header record or of different season");
		let tx = db.transaction(storeName, "readwrite");
		tx.objectStore(storeName).clear();
		console.log ("iDB store",storeName, "to be reset!!");		
		return tx.complete;
		})
	})
	.then( () => {
		return IDbPromise
		.then (db => {
			let tx = db.transaction(storeName, "readwrite");
			let store = tx.objectStore(storeName);
			records.forEach ( record =>	{
				if (record.raceIdx > recLastRaceIdx) {
					store.add(record);
					numRecAdded++
				}
			});
			updLastRaceIdx = Math.max(recLastRaceIdx, lastRaceIdx);  //just in case!!!
			let hdr = {raceIdx:0,horseID:"ZZZZ",trainer:"",jockey:"",trumpCard:1,  //required index properties
					   raceDate:raceDate,lastRaceIdx:updLastRaceIdx,season:season};	  //data properties
			store.put(hdr);
			return tx.complete;
		})
	})
	.then( () => {
		console.log ("iDB store",storeName,"updated to",raceDate,"with",numRecAdded,
					"records added up to lastRaceIdx:", updLastRaceIdx);
		HistoryOSRaceDate = raceDate;
		Season = season;  //remember season that this history store support
		cacheRaceInfo ();
		resolve ({numRecAdded:numRecAdded,lastRaceIdx:updLastRaceIdx});
	})
	.catch( error => {
		console.error ("update iDB history:",error);
		reject ("update iDB history:"+JSON.stringify(error));
	})
	})
}
