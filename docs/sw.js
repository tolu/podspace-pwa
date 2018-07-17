/* Bundle built Tue Jul 17 2018 18:57:55 GMT+0200 (CEST), current version 1.0.0 */
importScripts("https://storage.googleapis.com/workbox-cdn/releases/3.2.0/workbox-sw.js");
if (workbox) {
    console.log(`Yay! Workbox is loaded 🎉`);
    // workbox.core.LOG_LEVELS: {debug: 0, log: 1, warn: 2, error: 3, silent: 4}
    workbox.core.setLogLevel(workbox.core.LOG_LEVELS.silent);
}
else {
    console.log(`Boo! Workbox didn't load 😬`);
}
/*
const request = new Request('https://third-party-no-cors.com/', { mode: 'no-cors' });
fetch(request).then(response => cache.put(request, response));
*/
/* Static file cache */
// Root html
workbox.routing.registerRoute(({ url }) => {
    // Return true if the route should match
    const sameHost = self.location.host === url.host;
    return sameHost && /^(\/podspace-pwa)?\/$/.test(url.pathname);
}, workbox.strategies.networkFirst({
    cacheName: "static-resources",
}));
// Static files
workbox.routing.registerRoute(/.*\.(js|css)$/, workbox.strategies.networkFirst({
    cacheName: "static-resources",
}));
// Image cache
workbox.routing.registerRoute(({ url }) => {
    // Return true if the route should match
    return /\.(?:png|gif|jpg|jpeg|svg)$/.test(url.pathname);
}, workbox.strategies.cacheFirst({
    cacheName: "images",
    plugins: [
        new workbox.expiration.Plugin({
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
        new workbox.cacheableResponse.Plugin({
            statuses: [0, 200],
        }),
    ],
}));
/* MP3 Cache */
workbox.routing.registerRoute(({ url }) => {
    // Return true if the route should match
    const isMp3 = /\.(?:mp3)$/.test(url.pathname);
    const offline = /podspace-offline/.test(url.search);
    if (isMp3 && offline) {
        console.log("offline mp3", url.toString());
    }
    return isMp3 && offline;
}, workbox.strategies.cacheFirst({
    cacheName: "audio",
    plugins: [
        new workbox.expiration.Plugin({
            maxEntries: 20,
            maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
        new workbox.cacheableResponse.Plugin({
            statuses: [0, 200],
        }),
    ],
}));
//# sourceMappingURL=sw.js.map
