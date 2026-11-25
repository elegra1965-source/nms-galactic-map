/* ============================================================
   expedition -- the one answer every NMS Hub site reads (2026-11-25)
   GET -> { ok, now, live, next, last, research, checkedAt, stale, runs }
   live/next/last are worked out at request time from the stored schedule, so a run starts and ends
   on time even between watcher runs. Each run: { num, title, name, redux, estimated, start, end, art, url, desc }
   (start/end are UTC milliseconds). research = the Galactic Atlas community mission being played now, or null.
   CORS *, cached 2 min. The schedule is filled by expedition-watch.mjs from Hello Games' news.
   ============================================================ */

import { getStore } from "@netlify/blobs";
import { json } from "./lib/shared.mjs";
import { SEED_RUNS, pick, displayName } from "./expedition-lib.mjs";

function view(r){ return r ? Object.assign({ name: displayName(r) }, r) : null; }

export default async function(req){
  if(req.method === "OPTIONS") return json(204, {}, { "Access-Control-Allow-Methods": "GET, OPTIONS" });
  var now = Date.now(), runs = SEED_RUNS, checkedAt = 0, research = null;
  try {
    var store = getStore("nms-expedition");
    var d = await store.get("runs", { type: "json" });
    if(d && Array.isArray(d.runs) && d.runs.length){ runs = d.runs; checkedAt = d.checkedAt || 0; }
    var s = await store.get("state", { type: "json" });
    if(s && s.research && now - s.research.at < 36 * 3600000) research = s.research;
  } catch(e){ /* seed schedule */ }
  var p = pick(runs, now);
  return json(200, {
    ok: true, now: now, live: view(p.live), next: view(p.next), last: view(p.last), research: research,
    checkedAt: checkedAt, stale: !checkedAt || now - checkedAt > 48 * 3600000,
    runs: runs.map(view)
  }, { "Cache-Control": "public, max-age=120", "Access-Control-Allow-Methods": "GET, OPTIONS" });
}

export const config = { path: "/.netlify/functions/expedition" };
