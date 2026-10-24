/* ============================================================
   NMS Galactic Map -- NMS Almanac pre-load (2026-10-24, Tony)

   Fills the map's Almanac cache (Netlify Blobs store nms-galmap-almanac,
   the same one almanac.mjs reads) for every system travellers have charted,
   so the "Real game data" fold, the 3D real names, the hover cards and the
   Translator's planet tile open instantly instead of waiting on a lookup.

   - Runs every 10 minutes. Each run spends at most 40 Almanac lookups
     (~240 an hour), about half of the key's 500/hour, so live visitors
     always have room. Stops early on a 429 or after 20 seconds.
   - The list of charted systems comes from data/overrides.json (read from
     GitHub like check-data-growth.mjs) and is rebuilt once a week, so new
     systems join the queue. Systems whose cached answer still has 3+ days
     left are skipped at no cost; the rest are looked up again, so the cache
     keeps itself fresh (answers last 30 days).
   - Only the cache is written: no git commit, so no Netlify deploy, ever.
   - Travellers' edits are never touched; the pages already show an edit
     over Almanac data.
   - Progress: Blobs key warm/state  { keys, i, listAt, done, lastRun, used }.
   ============================================================ */

import { getStore } from "@netlify/blobs";
import { githubGetFile, parseCompositeKey, isValidAddress } from "./lib/shared.mjs";
import { lookupAndCache, Busy, STORE } from "./almanac.mjs";

const BUDGET = 40;                    // lookups per run
const TIME_MS = 20000;                // stop after this long
const SKIP_IF_LEFT_MS = 3 * 24 * 3600 * 1000;
const LIST_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export default async () => {
  if(!process.env.ALMANAC_API_KEY) return new Response("Skipped: no ALMANAC_API_KEY", { status: 200 });
  var store = getStore(STORE);
  var st = (await store.get("warm/state", { type: "json" }).catch(function(){ return null; })) || {};
  var now = Date.now();

  if(!st.keys || !st.listAt || now - st.listAt > LIST_MAX_AGE_MS || (st.i >= st.keys.length && now - st.listAt > 24 * 3600 * 1000)){
    var token = process.env.GITHUB_TOKEN;
    if(!token) return new Response("Skipped: no GITHUB_TOKEN", { status: 200 });
    var cur;
    try { cur = await githubGetFile(token); }
    catch(e){ return new Response("Could not read charted systems: " + e.message, { status: 200 }); }
    var keys = [];
    Object.keys((cur.data && cur.data.systems) || {}).forEach(function(k){
      var p = parseCompositeKey(k);
      if(p && isValidAddress(p.address)) keys.push(p.galaxy + ":" + p.address);
    });
    st = { keys: keys, i: 0, listAt: now, done: 0, used: 0 };
  }

  var used = 0, looked = 0, skipped = 0, t0 = Date.now(), why = "budget";
  while(st.i < st.keys.length){
    if(used >= BUDGET){ why = "budget"; break; }
    if(Date.now() - t0 > TIME_MS){ why = "time"; break; }
    var parts = st.keys[st.i].split(":"), g = parseInt(parts[0], 10), addr = parts[1];
    var ck = "sys/" + g + "/0" + addr.slice(1);
    var c = await store.get(ck, { type: "json" }).catch(function(){ return null; });
    if(c && c.until - Date.now() > SKIP_IF_LEFT_MS){ st.i++; skipped++; continue; }
    try {
      var r = await lookupAndCache(store, addr, g);
      used += r.cost; looked++; st.i++; st.done = (st.done || 0) + 1;
    } catch(e){
      why = e instanceof Busy ? "busy" : "error: " + (e && e.message);
      break;
    }
  }
  if(st.i >= st.keys.length) why = "list finished";
  st.used = (st.used || 0) + used; st.lastRun = now; st.lastWhy = why;
  await store.setJSON("warm/state", st).catch(function(){});
  return new Response("Almanac warm: " + looked + " looked up, " + skipped + " already fresh, " + used + " lookups, " +
    st.i + "/" + st.keys.length + " (" + why + ")", { status: 200 });
};

export const config = { schedule: "*/10 * * * *" };
