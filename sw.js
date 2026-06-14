// Copyright (c) 2026 Brian Kircher
//
// Open Source Software: you can modify and/or share it under the terms of the
// BSD license file in the root directory of this project.

const prefix = "setup-timer-";

const cacheName = `${prefix}site-v1`;

const assets =
[
  "favicon.webp",
  "index.html",
  "manifest.webmanifest",
  "styles.css",
  "sw.js",
  "timer.js",
];

self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(cacheName).then(cache => {
      cache.addAll(assets);
    })
  )
});

self.addEventListener("activate", async evt => {
  evt.waitUntil(
    caches.keys().then(cacheList => {
      return(Promise.all(
        cacheList.map(cache => {
          if((cache.substring(0, prefix.length) === prefix) &&
             (cache !== cacheName)) {
            return(caches.delete(cache));
          }
        })
      ));
    })
  )
});

self.addEventListener("fetch", evt => {
  evt.respondWith(
    caches.match(evt.request).then(res => {
      return(res || fetch(evt.request));
    })
  );
});