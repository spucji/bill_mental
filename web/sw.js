var CACHE = 'bill-v1'
var URLS = [
  '/','/index.html','/css/app.css','/manifest.json',
  '/js/state.js','/js/api.js','/js/router.js',
  '/js/components/voice-bubble.js','/js/components/chart-canvas.js','/js/components/date-picker.js',
  '/js/pages/login.js','/js/pages/records.js','/js/pages/analysis.js',
  '/js/pages/record-edit.js','/js/pages/mine.js','/js/pages/tags.js'
]

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(URLS) }))
})

self.addEventListener('fetch', function (e) {
  if (e.request.url.indexOf('/api/') >= 0) return
  e.respondWith(caches.match(e.request).then(function (r) { return r || fetch(e.request) }))
})
