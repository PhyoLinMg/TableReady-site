// TableReady's service worker: once the app has been opened, it opens again without a connection.
// The page and its code are stored when the worker installs. The people are large, so they are stored the
// first time they are used, at the level of graphics this machine uses.
// The build fills in the lists below (see the offline plugin in vite.config.ts). Development never registers it.

const SHELL = ["assets/Stage3D-DhHFCFo3.js","assets/Walk-COWmXdPo.js","assets/index-D62q9Ni-.css","assets/index-DW-XOvEt.js","assets/look-B_sAVAqu.js"];
const SHELL_CACHE = "tableready-shell-312050ac43aa";
const PEOPLE_CACHE = "tableready-people-68299db003a7";
const FONTS_CACHE = "tableready-fonts";
const KEEP = [SHELL_CACHE, PEOPLE_CACHE, FONTS_CACHE];

// No skipping the wait: a new version takes over only once every tab of the old one has closed. Otherwise it would
// clear the old files from under an open tab that still has parts of the old version to load.
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(["./", ...SHELL])));
});

// A new version clears out the old one's files.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("tableready-") && !KEEP.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

const scope = new URL(self.registration.scope);

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(fresh(request));
    return;
  }
  if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) {
    const path = url.pathname.slice(scope.pathname.length);
    if (path.startsWith("people/")) event.respondWith(stored(request, PEOPLE_CACHE));
    else if (path.startsWith("assets/")) event.respondWith(stored(request, SHELL_CACHE));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(stored(request, FONTS_CACHE, true));
  }
});

/** From the store if it is there; if not, from the network, and kept for next time. */
async function stored(request, name, cors = false) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  // The font list is asked for without CORS, which would store an opaque (and oversized) copy: ask with it.
  const response = await fetch(cors ? new Request(request.url, { mode: "cors", credentials: "omit" }) : request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

/** The page itself: the network's copy whenever there is one, so a new version shows at once; the stored one offline. */
async function fresh(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put("./", response.clone());
    return response;
  } catch {
    return (await cache.match("./")) ?? Response.error();
  }
}
