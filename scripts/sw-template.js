// Regenerated on every `npm run build:web` (see scripts/generate-sw.js), which changes this
// file's bytes on every deploy — that byte diff is what lets the browser detect a new version
// and offer it up as `registration.waiting`, which components/UpdateBanner.tsx watches for.
const BUILD_ID = '__BUILD_ID__';

self.addEventListener('install', () => {
  // Deliberately no skipWaiting() here: a newly installed worker should sit in "waiting" until
  // the user taps Refresh (UpdateBanner posts SKIP_WAITING below), not take over mid-session.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// This app has no offline mode (it needs the network for every read/write), so the only job
// here is to satisfy PWA installability and drive the update-detection flow above.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
