/* ============================================================
   NMS Galactic Map -- Voyager's Haven lookup (2026-10-02)

   Read-only bridge to Voyager's Haven (havenmap.online), the community
   NMS database run by u/IAmThe-Ekimo-1920, who offered to link the two
   maps. GET ?addr=<12 hex>&gname=<galaxy name> returns that system's
   Haven record (if charted there), mapped to a small, flat shape the
   info panel renders as its own clearly-labelled "via Voyager's Haven"
   section. Haven data is NEVER merged into data/overrides.json or the
   consensus/dispute system -- it's a second source shown alongside ours.

   - Two Haven calls per miss: /api/search?q=<glyph> (matches on the
     glyph suffix, so the planet digit doesn't matter), then
     /api/systems/{id} for the full record incl. planets.
   - Results (hits AND misses) cached in Netlify Blobs so repeat views
     don't re-hit Haven; nothing is written to the repo (no deploys).
   - HAVEN_API_KEY (Netlify env var, optional): sent as X-API-Key once
     Ekimo issues one. Reads currently work without it.
   ============================================================ */

import { getStore } from "@netlify/blobs";
import { json, isValidAddress } from "./lib/shared.mjs";

const HAVEN_BASE = "https://havenmap.online";
const STORE = "nms-galmap-haven";
const TTL_HIT_MS  = 6 * 60 * 60 * 1000;  // 6h
const TTL_MISS_MS = 60 * 60 * 1000;      // 1h -- new submissions show up reasonably soon
const TIMEOUT_MS = 6000;

function havenHeaders(){
  var h = { "Accept": "application/json", "User-Agent": "nms-galaxy-map.netlify.app (haven-lookup)" };
  if(process.env.HAVEN_API_KEY) h["X-API-Key"] = process.env.HAVEN_API_KEY;
  return h;
}

async function havenGet(path){
  var ctl = new AbortController();
  var t = setTimeout(function(){ ctl.abort(); }, TIMEOUT_MS);
  try {
    var r = await fetch(HAVEN_BASE + path, { headers: havenHeaders(), signal: ctl.signal });
    if(!r.ok) throw new Error("Haven HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

function clean(v){
  if(v === null || v === undefined) return null;
  if(typeof v === "string"){ v = v.trim(); return v ? v.slice(0, 200) : null; }
  return v;
}

function mapSystem(s){
  var planets = Array.isArray(s.planets) ? s.planets : [];
  return {
    id: s.id,
    name: clean(s.name),
    galaxy: clean(s.galaxy),
    glyph: clean(s.glyph_code),
    region: clean(s.region_name),
    star: clean(s.star_type),
    stellarClass: clean(s.stellar_classification),
    economy: clean(s.economy_type),
    economyTier: clean(s.economy_level),
    conflict: clean(s.conflict_level),
    lifeform: clean(s.dominant_lifeform),
    noStation: !!s.no_space_station,
    discoveredBy: clean(s.discovered_by),
    community: clean(s.discord_tag),
    updated: clean(s.last_updated_at || s.modified_at),
    url: HAVEN_BASE + "/systems/" + encodeURIComponent(s.id),
    planets: planets.slice(0, 30).map(function(p){
      return {
        name: clean(p.name),
        moon: !!p.is_moon,
        biome: clean(p.biome),
        biomeSub: clean(p.biome_subtype),
        weather: clean(p.weather),
        sentinels: clean(p.sentinel),
        fauna: clean(p.fauna),
        flora: clean(p.flora),
        resources: clean(p.materials) || [p.common_resource, p.uncommon_resource, p.rare_resource].filter(Boolean).join(", ") || null
      };
    })
  };
}

export default async (req) => {
  if(req.method === "OPTIONS") return json(200, { ok: true });
  if(req.method !== "GET") return json(405, { ok: false, error: "GET only" });

  var u = new URL(req.url);
  var addr = (u.searchParams.get("addr") || "").toUpperCase();
  var gname = (u.searchParams.get("gname") || "").trim();
  if(!isValidAddress(addr)) return json(400, { ok: false, error: "bad addr" });
  if(!gname || gname.length > 40 || !/^[A-Za-z0-9 '\-]+$/.test(gname)) return json(400, { ok: false, error: "bad gname" });

  var cacheKey = gname.toLowerCase().replace(/\s+/g, "_") + ":" + addr.slice(1); // planet digit ignored, same as Haven's suffix match
  var store = null, now = Date.now();
  try { store = getStore(STORE); } catch(e){ store = null; }
  if(store){
    try {
      var c = await store.get(cacheKey, { type: "json" });
      if(c && (now - c.at) < (c.found ? TTL_HIT_MS : TTL_MISS_MS)){
        return json(200, { ok: true, found: c.found, system: c.system || null, cached: true }, { "Cache-Control": "public, max-age=300" });
      }
    } catch(e){ /* cache miss */ }
  }

  try {
    var res = await havenGet("/api/search?q=" + encodeURIComponent(addr) + "&limit=10");
    var suffix = addr.slice(1);
    var hit = (res.systems || []).find(function(s){
      return s && typeof s.glyph_code === "string"
        && s.glyph_code.toUpperCase().slice(1) === suffix
        && String(s.galaxy || "").toLowerCase() === gname.toLowerCase()
        && (!s.reality || s.reality === "Normal");
    });
    var payload = { found: false, system: null, at: now };
    if(hit){
      var full = await havenGet("/api/systems/" + encodeURIComponent(hit.id));
      payload = { found: true, system: mapSystem(full.system || full), at: now };
    }
    if(store){ try { await store.setJSON(cacheKey, payload); } catch(e){} }
    return json(200, { ok: true, found: payload.found, system: payload.system }, { "Cache-Control": "public, max-age=300" });
  } catch(e){
    return json(502, { ok: false, error: "Haven unavailable" });
  }
};

export const config = { path: "/.netlify/functions/haven-lookup" };
