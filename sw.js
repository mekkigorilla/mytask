/* ホーム画面のアプリとして入れるための裏方（サービスワーカー）。
   ねらいは2つだけ。
     ① ブラウザとは別のアプリとして開けるようにする（Chrome/Braveはこれが無いとアプリ扱いにしない）
     ② 電波が悪いときでも、前に開いた画面がひとまず出るようにする

   ★ 中身の新しさを優先する（network-first）。
     先に貯めた方を返すと、直したはずのアプリが古いまま出る。これが一番まずい。
   ★ Supabase（別のサーバー）は一切ここで触らない。タスクの中身を端末に貯め込まない。 */
var CACHE = "mytask-v1";

self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   /* Supabaseなど外は素通し */

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("./");
        return new Response("", { status: 504, statusText: "offline" });
      });
    })
  );
});
