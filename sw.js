/**
 * Service Worker for Flappy Bird Game
 * Handles cache management to prevent mobile cache issues
 */

const CACHE_NAME = 'flappy-bird-v3.1.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/flappy-bird.js',
    '/leaderboard.js',
    '/mario-laugh.mp3',
    '/Super mario laugh Sound Effects.mp3',
    '/Gotta Go Fast (Sonic Theme) - MLG Sound Effect (HD) ( 160kbps ).mp3'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
    console.log('📱 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('📱 Service Worker: Caching app shell');
                return cache.addAll(urlsToCache.map(url => url + '?v=3.1.0'));
            })
            .catch(function(error) {
                console.log('📱 Service Worker: Cache failed', error);
            })
    );
    
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
    console.log('📱 Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('📱 Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            // Take control of all clients immediately
            return self.clients.claim();
        })
    );
});

// Fetch event - serve cached content when offline, always try network first
self.addEventListener('fetch', function(event) {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        // Try network first (for fresh content)
        fetch(event.request)
            .then(function(response) {
                // If we got a response, clone it and update cache
                if (response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });
                }
                return response;
            })
            .catch(function() {
                // Network failed, try cache
                return caches.match(event.request)
                    .then(function(response) {
                        if (response) {
                            console.log('📱 Service Worker: Serving from cache', event.request.url);
                            return response;
                        }
                        
                        // If no cache, return a basic offline page for HTML requests
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return new Response(
                                '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>🐦 Flappy Bird</h1><p>Please check your internet connection and try again.</p></body></html>',
                                { headers: { 'Content-Type': 'text/html' } }
                            );
                        }
                    });
            })
    );
});

// Handle messages from the main thread
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('📱 Service Worker: Clearing cache on request');
        caches.delete(CACHE_NAME).then(() => {
            console.log('📱 Service Worker: Cache cleared');
        });
    }
});
