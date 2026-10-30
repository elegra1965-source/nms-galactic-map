/* ============================================================
   NMS medals -- "Total unlocked" (2026-10-30, Tony).
   How many times each streak medal has been unlocked, across everyone.

   - POST { m: "d3" | "d7" | "d14" | "d30" | "week" | "month" }: +1, sent by
     nms-medals.js only at the moment a medal is earned (which happens once per
     daily medal per device, once per week / month for the others). Nothing else
     is sent: no name, no system, no device id. The IP is only used (hashed, by
     ipKey) for a small per-hour limit and isn't kept past that hour.
   - GET -> { ok, counts: { d3: n, ... } }, cached 5 min. Read by the Map and Hub
     (CORS *).
   Stored in Netlify Blobs (store nms-galmap-medals). No GitHub writes, no deploys.
   ============================================================ */
import { getStore } from "@netlify/blobs";
import { json, ipKey } from "./lib/shared.mjs";

const STORE = "nms-galmap-medals";
const KINDS = ["d3", "d7", "d14", "d30", "week", "month"];
const PER_IP_HOUR = 12;
const H = { "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
var _get = { at: 0, body: null };

export default async (req, context) => {
  if(req.method === "OPTIONS") return json(204, {}, H);
  var store;
  try { store = getStore(STORE); } catch(e){ return json(503, { ok: false, error: "store" }, H); }

  if(req.method === "POST"){
    var body = null;
    try { body = JSON.parse(await req.text()); } catch(e){}
    var m = body && String(body.m || "");
    if(KINDS.indexOf(m) < 0) return json(400, { ok: false, error: "kind" }, H);
    var who = await ipKey((context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "unknown");
    var rk = "rl/" + who + "/" + Math.floor(Date.now() / 3600000);
    var n = (await store.get(rk, { type: "json" }).catch(function(){ return null; })) || 0;
    if(n >= PER_IP_HOUR) return json(429, { ok: false, error: "rate" }, H);
    await store.setJSON(rk, n + 1).catch(function(){});
    var c = (await store.get("counts", { type: "json" }).catch(function(){ return null; })) || {};
    c[m] = (c[m] || 0) + 1;
    await store.setJSON("counts", c);
    _get.at = 0;
    return json(200, { ok: true, counts: c }, H);
  }

  if(req.method !== "GET") return json(405, { ok: false }, H);
  var cacheH = { "Cache-Control": "public, max-age=300, s-maxage=300" };
  for(var k in H) cacheH[k] = H[k];
  if(_get.body && Date.now() - _get.at < 300000) return json(200, _get.body, cacheH);
  var counts = (await store.get("counts", { type: "json" }).catch(function(){ return null; })) || {};
  var out = { ok: true, counts: {} };
  KINDS.forEach(function(k){ out.counts[k] = +counts[k] || 0; });
  _get = { at: Date.now(), body: out };
  return json(200, out, cacheH);
};

export const config = { path: "/.netlify/functions/medal-count" };
