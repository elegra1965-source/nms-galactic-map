/* ============================================================
   NMS Galactic Map -- "🔥 Trending this week" (2026-10-19)

   Counts how often travellers open charted systems, so the most-viewed
   public systems each week get a leaderboard with medals (top 3), rank
   movement arrows and a "last week's #1" line.

   - Only PUBLIC charted systems count: a key must exist in the public
     overrides data (the shared GET cache). Private systems are never
     counted, so a counter can't hint that someone else knows a private
     address. If the cache isn't available the view is simply dropped.
   - The browser sends each system at most once per device per day, and
     leaves out systems the traveller charted themselves (trending.js);
     here, per-IP limits stop anyone inflating a count.
   - Weeks run Monday-Sunday (UTC), stored per week in Netlify Blobs
     (store nms-galmap-trending). Writes nothing to GitHub, no deploys.
   - Movement arrows compare today's ranks with the first snapshot taken
     today, so they show change "since this morning".

   POST { views:["g:HEX", ...] }  (also accepts a sendBeacon text body)
   GET                            -> { ok, week, top:[...], lastWeek }
   ============================================================ */

import { getStore } from "@netlify/blobs";
import { json, ipKey, getGetCache } from "./lib/shared.mjs";

const STORE = "nms-galmap-trending";
const KEY_RE = /^\d{1,3}:[0-9A-F]{12}$/;
const HOUR = 3600000;
const PER_IP_PER_HOUR = 300;
const TOP_N = 10;
const H = { "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

function mondayOf(d){
  var x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  var day = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}
function isImport(name){ return /\(import\)|no original editor name/i.test(String(name || "")); }

async function publicSystems(){
  var c = await getGetCache();
  return (c && c.data && c.data.systems) || null;
}

function ranked(counts){
  return Object.keys(counts).map(function(k){ return { key: k, views: counts[k] }; })
    .filter(function(x){ return x.views > 0; })
    .sort(function(a, b){ return b.views - a.views || (a.key < b.key ? -1 : 1); });
}
function describe(sys, x, i){
  var r = sys && sys[x.key], d = (r && r.data) || {};
  var p = x.key.split(":");
  return { key: x.key, galaxy: +p[0], address: p[1], views: x.views, rank: i + 1,
           name: String(d.name || ""), editor: isImport(d.editorName) ? "" : String(d.editorName || "").trim() };
}

var _get = { at: 0, body: null };

export default async (req, context) => {
  if(req.method === "OPTIONS") return json(200, { ok: true }, H);
  var store;
  try { store = getStore(STORE); } catch(e){ return json(503, { ok: false, error: "store" }, H); }
  var now = new Date(), week = mondayOf(now);

  if(req.method === "POST"){
    var body = null;
    try { body = JSON.parse(await req.text()); } catch(e){}
    var views = body && Array.isArray(body.views) ? body.views.slice(0, 20) : [];
    views = views.map(function(k){ return String(k || "").toUpperCase(); })
      .filter(function(k, i, a){ return KEY_RE.test(k) && +k.split(":")[0] <= 255 && a.indexOf(k) === i; });
    if(!views.length) return json(200, { ok: true, counted: 0 }, H);

    var who = await ipKey((context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "unknown");
    var rlKey = "rl/" + who, rl = [];
    try { rl = (await store.get(rlKey, { type: "json" })) || []; } catch(e){}
    rl = rl.filter(function(t){ return now - t < HOUR; });
    if(rl.length + views.length > PER_IP_PER_HOUR) return json(429, { ok: false, error: "rate" }, H);

    var sys = await publicSystems();
    if(!sys) return json(200, { ok: true, counted: 0 }, H);
    views = views.filter(function(k){ return sys[k] && sys[k].data; });
    if(!views.length) return json(200, { ok: true, counted: 0 }, H);

    for(var v = 0; v < views.length; v++) rl.push(+now);
    try { await store.setJSON(rlKey, rl); } catch(e){}
    var wk = (await store.get("wk/" + week, { type: "json" }).catch(function(){ return null; })) || { counts: {} };
    views.forEach(function(k){ wk.counts[k] = (wk.counts[k] || 0) + 1; });
    await store.setJSON("wk/" + week, wk);
    _get.at = 0; // this instance's next GET reads fresh counts
    return json(200, { ok: true, counted: views.length }, H);
  }

  if(req.method !== "GET") return json(405, { ok: false }, H);
  var cacheH = { "Cache-Control": "public, max-age=60, s-maxage=60" };
  for(var k2 in H) cacheH[k2] = H[k2];
  if(_get.body && now - _get.at < 60000 && _get.body.week === week) return json(200, _get.body, cacheH);

  var sys2 = (await publicSystems()) || {};
  var cur = (await store.get("wk/" + week, { type: "json" }).catch(function(){ return null; })) || { counts: {} };
  // only systems that are still public
  var counts = {};
  for(var k in cur.counts) if(sys2[k] && sys2[k].data) counts[k] = cur.counts[k];
  var list = ranked(counts).slice(0, TOP_N);

  // movement since the first look today
  var today = now.toISOString().slice(0, 10), snapKey = "snap/" + week + "/" + today;
  var snap = await store.get(snapKey, { type: "json" }).catch(function(){ return null; });
  if(!snap){
    snap = {}; list.forEach(function(x, i){ snap[x.key] = i + 1; });
    try { await store.setJSON(snapKey, snap); } catch(e){}
  }
  var top = list.map(function(x, i){
    var o = describe(sys2, x, i);
    o.move = snap[x.key] ? snap[x.key] - (i + 1) : "new";
    return o;
  });

  var prevMon = new Date(Date.parse(week + "T00:00:00Z") - 7 * 86400000).toISOString().slice(0, 10);
  var prev = await store.get("wk/" + prevMon, { type: "json" }).catch(function(){ return null; });
  var lastWeek = null;
  if(prev && prev.counts){
    var pc = {}; for(var k3 in prev.counts) if(sys2[k3] && sys2[k3].data) pc[k3] = prev.counts[k3];
    var pr = ranked(pc);
    if(pr.length) lastWeek = describe(sys2, pr[0], 0);
  }

  var out = { ok: true, week: week, top: top, lastWeek: lastWeek };
  _get = { at: +now, body: out };
  return json(200, out, cacheH);
};

export const config = { path: "/.netlify/functions/trending" };
