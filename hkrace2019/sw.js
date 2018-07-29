const requestsToBeCached
	 = ['/',
		'/ai.js',
		'/bet.js',
		'/data.js',
		'/idb.js',
		'/index.html',
		'/inline.css',
		'/startup.js',
		'/storage.js',
		'/tables.js',
		'/ui.js',
		'/util.js',
		'/themes/',
		'/themes/Bootstrap.min.css',
		'/themes/jquery.mobile.icons.min.css',
		'/themes/images/ajax-loader.gif',
		'/model/',
		'/model/group1-shard1of1',
		'/model/group2-shard1of1',
		'/model/group3-shard1of1',
		'/model/group4-shard1of1',
		'/model/group5-shard1of1',
		'/model/mean_.json',
		'/model/model.json',
		'/model/scale_.json',
		'https://fonts.googleapis.com/earlyaccess/notosanstc.css',
		'https://code.jquery.com/mobile/1.4.5/jquery.mobile.structure-1.4.5.min.css',
		'https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js',
		'https://ajax.googleapis.com/ajax/libs/jquerymobile/1.4.5/jquery.mobile.min.js',
		'https://cdn.jsdelivr.net/npm/firebase@5.3.0/firebase-app.js',
		'https://cdn.jsdelivr.net/npm/firebase@5.3.0/firebase-auth.js',
		'https://cdn.jsdelivr.net/npm/firebase@5.3.0/firebase-storage.js',
		'/DataTables/datatables.min.css',
		'/DataTables/datatables.min.js',
		'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@0.12.0',
		'/whoami.png',
		/* below are not specified explicitly in index.html, but required on demand by notosanstc.css */
		'https://fonts.gstatic.com/ea/notosanstc/v1/NotoSansTC-Bold.woff2',
		'https://fonts.gstatic.com/ea/notosanstc/v1/NotoSansTC-Regular.woff2'
       ];

self.addEventListener ('install', function(e) {
	e.waitUntil(
		caches.open('HKRace2019v1').then(function(cache) {
		return cache.addAll(requestsToBeCached);
		})
	);
});

self.addEventListener('fetch', function(event) {
	//console.log(event.request.url);
	event.respondWith(
		caches.match(event.request)
		.then (function(response) {
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
		caches.keys().then(function(cacheNames) {
			return Promise.all(
			cacheNames
			.filter(function(cacheName) {
				// Return true if you want to remove this cache,
				// but remember that caches are shared across
				// the whole origin
				if (cacheName == "HKRace2019v2") return true;
			})
			.map(function(cacheName) {
				return caches.delete(cacheName);
			})
		);
		})
	);
});
