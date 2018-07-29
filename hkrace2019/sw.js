const requestsToBeCached  /* must use relative path to cater for both https://psychobigbro.github.io/hkrace2019/& localhost: */
	 = ['/',			  /* localhost can respond /index.html but github.io/hkrace2019/ can't, must use ..hkrace2019/index.html */
		'ai.js',
		'bet.js',
		'data.js',
		'idb.js',
		'index.html',
		'index.html?launcher=true',
		'inline.css',
		'startup.js',
		'storage.js',
		'tables.js',
		'ui.js',
		'util.js',
		'themes/Bootstrap.min.css',
		'themes/jquery.mobile.icons.min.css',
		'themes/images/ajax-loader.gif',
		'model/group1-shard1of1',
		'model/group2-shard1of1',
		'model/group3-shard1of1',
		'model/group4-shard1of1',
		'model/group5-shard1of1',
		'model/mean_.json',
		'model/model.json',
		'model/scale_.json',
		'https://fonts.googleapis.com/earlyaccess/notosanstc.css',
		'https://code.jquery.com/mobile/1.4.5/jquery.mobile.structure-1.4.5.min.css',
		'https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js',
		'https://ajax.googleapis.com/ajax/libs/jquerymobile/1.4.5/jquery.mobile.min.js',
		'https://cdn.jsdelivr.net/npm/firebase@5.3.0/firebase-app.js',
		'https://cdn.jsdelivr.net/npm/firebase@5.3.0/firebase-auth.js',
		'https://cdn.jsdelivr.net/npm/firebase@5.3.0/firebase-storage.js',
		'DataTables/datatables.min.css',
		'DataTables/datatables.min.js',
		'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@0.12.0',
		'whoami.png',
		/* below are not specified explicitly in index.html, but required on demand by notosanstc.css */
		'https://fonts.gstatic.com/ea/notosanstc/v1/NotoSansTC-Bold.woff2',
		'https://fonts.gstatic.com/ea/notosanstc/v1/NotoSansTC-Regular.woff2'
       ];
	   
const expectedCaches = ['HKRace2019v4'];
const latestCacheVersion = expectedCaches[0];

self.addEventListener ('install', event => {
	self.skipWaiting();
	event.waitUntil(
		caches.open(latestCacheVersion)
		.then ( cache => {
			return cache.addAll(requestsToBeCached);
		})
	);
});

self.addEventListener('fetch', function(event) {
	event.respondWith(
		caches.match(event.request)
		.then (response => {
			return response || fetch(event.request);
			/*
			.then (function(response) {
				if (false)
					cache.put(event.request, response.clone());
				return response;
			}); */
		})
	);
});

self.addEventListener ('activate', function(event) {
	//console.log(event);
	event.waitUntil(
		caches.keys()
		.then(keys => Promise.all(
			keys.map(key => {
				if (!expectedCaches.includes(key)) {
					return caches.delete(key);
				}
			})
		))
		.then(() => {
			console.log(expectedCaches,'available upon service worker activation');
		})
	);
});
