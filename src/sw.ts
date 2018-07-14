importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.2.0/workbox-sw.js');

if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);
} else {
  console.log(`Boo! Workbox didn't load 😬`);
}

/*
const request = new Request('https://third-party-no-cors.com/', { mode: 'no-cors' });
fetch(request).then(response => cache.put(request, response));
*/

/* Static file cache */
workbox.routing.registerRoute(
  '/',
  workbox.strategies.networkFirst({
    cacheName: 'static-resources',
  })
);
workbox.routing.registerRoute(
  /.*\.(js|css)/,
  workbox.strategies.networkFirst({
    cacheName: 'static-resources',
  })
);
/* Image cache */
workbox.routing.registerRoute(
  ({url}: {url: URL}) => {
    // Return true if the route should match
    return /\.(?:png|gif|jpg|jpeg|svg)$/.test(url.pathname);
  },
  workbox.strategies.cacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.Plugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
      new workbox.cacheableResponse.Plugin({
        statuses: [0, 200]
      }),
    ],
  }),
);