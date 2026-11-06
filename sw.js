const CACHE_NAME = "super-nza-bros-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./js/main.js",
  "./js/engine.js",
  "./js/levels.js",
  "./js/assets.js",
  "./js/audio.js",
  "./assets/sprites/player.png",
  "./assets/sprites/enemies.png",
  "./assets/sprites/boss.png",
  "./assets/sprites/tiles.png",
  "./assets/sprites/items.png",
  "./assets/backgrounds/bg_overworld.png",
  "./assets/backgrounds/bg_underground.png",
  "./assets/backgrounds/bg_sky.png",
  "./assets/backgrounds/bg_castle.png",
  "./assets/ui/hero_banner.png",
  "./assets/ui/game_icon.png",
  "./assets/ui/icon_192.png",
  "./assets/ui/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
