/* ============================================================
   NMS Galactic Map -- NMS Almanac lookup (2026-10-23)

   Read-only bridge to NMS Almanac (nmsalmanac.com) by Borjomi (u/Fosferus),
   who gave this site an API key on 2026-10-23: 500 planet/system lookups an
   hour, key server-side only, and "Data: NMS Almanac" shown next to the data.

   GET ?addr=<12 hex>&galaxy=<0-255, this map's galaxy index>
   -> { ok, found, system:{...}, bodies:[{p, name, desc, weather, ...}], attribution }
   Every code is turned into its word here (the Almanac answers with codes and
   a word table), so the pages only show text.

   - ALMANAC_API_KEY: Netlify env var (secret). Never in page code.
   - One system costs 1 + number-of-bodies key lookups, so answers are cached
     in Netlify Blobs for 30 days (misses 1 day). Nothing goes in the repo.
   - Busy (Almanac 429 / key hour used up) -> { ok:false, busy:true } so the
     page can say "try again later". Not cached.
   - 40 uncached systems per hour per visitor (hashed IP), so nobody can use
     the whole hour's key allowance on their own. Cached answers are free.
   ============================================================ */

import { getStore } from "@netlify/blobs";
import { json, isValidAddress, ipKey } from "./lib/shared.mjs";

const BASE = "https://nmsalmanac.com/api/";
const STORE = "nms-galmap-almanac";
const TTL_HIT_MS  = 30 * 24 * 3600 * 1000;
const TTL_MISS_MS = 24 * 3600 * 1000;
const PER_IP_HOUR = 40;
const TIMEOUT_MS = 8000;
const CACHE_V = 2;   // 2026-10-24: bodies now carry colours/ringed; older cached answers are refetched

class Busy extends Error { constructor(ra){ super("busy"); this.retryAfter = ra; } }

async function aGet(path){
  var ctl = new AbortController();
  var t = setTimeout(function(){ ctl.abort(); }, TIMEOUT_MS);
  var h = { "Accept": "application/json", "User-Agent": "map.nomansskyhub.app (almanac)" };
  if(process.env.ALMANAC_API_KEY) h["Authorization"] = "Bearer " + process.env.ALMANAC_API_KEY;
  try {
    var r = await fetch(BASE + path, { headers: h, signal: ctl.signal });
    if(r.status === 429) throw new Busy(parseInt(r.headers.get("Retry-After") || "0", 10) || 600);
    if(r.status === 404) return null;
    if(!r.ok) throw new Error("Almanac HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

function pretty(code){
  if(code == null) return null;
  return String(code).replace(/[-_]+/g, " ").replace(/\b\w/g, function(c){ return c.toUpperCase(); });
}
function phrase(w, group, key, n){
  try { var v = w[group].phrases[key][n]; if(typeof v === "string") return v; } catch(e){}
  return pretty(key);
}
function word(w, group, code){
  if(code == null) return null;
  try {
    var v = w[group][code];
    if(typeof v === "string") return v;
    if(v && typeof v.name === "string") return v.name;
  } catch(e){}
  return pretty(code);
}
function item(w, code){ return word(w, "items", code); }
function lifeWord(w, o){ try { return w.life[o.family][o.phrase]; } catch(e){ return null; } }

function mapPlanet(p, w){
  var d = null;
  try {
    d = w.description.phrases[p.description.family][p.description.phrase];
    d = d.replace("%PLANETCLASS%", (w.description["class"] || {})[p.size] || "");
  } catch(e){ d = pretty(p.biome); }
  var pic = p.pictures || {};
  return {
    p: parseInt(String(p.portal).charAt(0), 16),
    portal: p.portal,
    moonOf: p.body && p.body.moon_of ? p.body.moon_of : null,
    name: p.names && p.names.game ? String(p.names.game).slice(0, 80) : null,
    desc: d,
    biome: p.biome || null,
    size: p.size || null,
    weather: p.weather ? phrase(w, "weather", p.weather.family, p.weather.phrase) : null,
    extreme: !!(p.weather && p.weather.extreme),
    sentinels: p.sentinels ? phrase(w, "sentinels", p.sentinels.level, p.sentinels.phrase) : null,
    sentLevel: p.sentinels ? p.sentinels.level : null,
    fauna: p.fauna ? p.fauna.species : null, faunaW: p.fauna ? lifeWord(w, p.fauna) : null,
    flora: p.flora ? p.flora.plants : null, floraW: p.flora ? lifeWord(w, p.flora) : null,
    water: p.water || null,
    resources: (p.resources || []).slice(0, 40).map(function(k){ return item(w, k); }),
    disc: pic.disc ? BASE + pic.disc : null,
    discSmall: pic.disc_small ? BASE + pic.disc_small : null,
    card: pic.card ? BASE + pic.card : null,
    // 2026-10-24: real look for the map's 3D planets (terrain/water/sky/ring colours)
    colours: p.colours ? { terrain: p.colours.terrain || null, water: p.colours.water || null,
      sky: p.colours.sky && p.colours.sky.day || null, rings: p.colours.rings || null } : null,
    ringed: !!(p.colours && p.colours.rings)
  };
}

function mapSystem(s, w){
  var tr = s.trade || {};
  return {
    portal: s.portal,
    name: s.names && s.names.game ? String(s.names.game).slice(0, 80) : null,
    region: s.region || null,
    star: word(w, "star", s.star),
    spectral: s.spectral_class || null,
    suns: s.suns || null,
    race: s.abandoned ? "Abandoned" : word(w, "race", s.race),
    economy: s.economy ? phrase(w, "economy", s.economy.type, s.economy.phrase) : null,
    economyType: s.economy ? (function(){ try { var v = w.economy.type[s.economy.type]; if(typeof v === "string") return v; } catch(e){} return pretty(s.economy.type); })() : null,
    wealth: s.wealth ? phrase(w, "wealth", s.wealth.level, s.wealth.phrase) : null,
    conflict: s.conflict ? phrase(w, "conflict", s.conflict.level, s.conflict.phrase) : null,
    abandoned: !!s.abandoned,
    sell: typeof tr.sell_percent === "number" ? Math.round(tr.sell_percent * 10) / 10 : null,
    buy: typeof tr.buy_percent === "number" ? Math.round(tr.buy_percent * 10) / 10 : null,
    demand: tr.demand ? (function(){ try { var v = w.trade.demand[tr.demand]; if(typeof v === "string") return v; if(v && v.name) return v.name; } catch(e){} return pretty(tr.demand); })() : null,
    card: s.pictures && s.pictures.card ? BASE + s.pictures.card : null
  };
}

async function words(store, path){
  var k = "words/" + path;
  var c = await store.get(k, { type: "json" }).catch(function(){ return null; });
  if(c) return c;
  var w = await aGet(path);
  if(w) await store.setJSON(k, w).catch(function(){});
  return w || {};
}

/* One system's Almanac lookup, stored in the cache. Also used by almanac-warm.mjs
   (2026-10-24, the pre-load of every charted system). Returns { body, cost } where
   cost = key lookups used (1 + bodies). Throws Busy on a 429. */
export async function lookupAndCache(store, addr, g){
  var ck = "sys/" + g + "/0" + addr.slice(1);
  var cost = 1;
  var s = await aGet("systems/" + addr + "?galaxy=" + (g + 1));
  var body;
  if(!s){ body = { ok:true, found:false, v:CACHE_V }; }
  else {
    var w = await words(store, s.words);
    var bodies = [];
    for(var i = 0; i < (s.bodies || []).length && i < 8; i++){
      var p = await aGet("planets/" + s.bodies[i].portal + "?galaxy=" + (g + 1)); cost++;
      if(p) bodies.push(mapPlanet(p, w));
    }
    body = { ok:true, found:true, v:CACHE_V, galaxy:g, system: mapSystem(s, w), bodies: bodies,
             attribution: "Data: NMS Almanac, https://nmsalmanac.com", link: "https://nmsalmanac.com" };
  }
  await store.setJSON(ck, { until: Date.now() + (body.found ? TTL_HIT_MS : TTL_MISS_MS), body: body }).catch(function(){});
  return { body: body, cost: cost };
}
export { Busy, STORE, CACHE_V };

async function hourCount(store, who){
  var k = "rl/" + who + "/" + Math.floor(Date.now() / 3600000);
  var n = (await store.get(k, { type: "json" }).catch(function(){ return null; })) || 0;
  return { k: k, n: n };
}

export default async (req, context) => {
  if(req.method === "OPTIONS") return json(204, {}, { "Access-Control-Allow-Methods": "GET, OPTIONS" });
  if(req.method !== "GET") return json(405, { ok:false, error:"GET only" });
  var u = new URL(req.url);
  var addr = (u.searchParams.get("addr") || "").toUpperCase();
  var g = parseInt(u.searchParams.get("galaxy") || "0", 10);
  if(!isValidAddress(addr)) return json(400, { ok:false, error:"addr must be 12 hex digits" });
  if(!(g >= 0 && g <= 255)) return json(400, { ok:false, error:"galaxy must be 0-255" });
  var sys0 = "0" + addr.slice(1);                 // system key: planet digit ignored
  var store = getStore(STORE);
  var ck = "sys/" + g + "/" + sys0;
  var cached = await store.get(ck, { type: "json" }).catch(function(){ return null; });
  if(cached && cached.until > Date.now() && cached.body && cached.body.v === CACHE_V) return json(200, cached.body, { "Cache-Control": "public, max-age=3600" });

  var who = await ipKey((context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "unknown");
  var rl = await hourCount(store, who);
  if(rl.n >= PER_IP_HOUR) return json(200, { ok:false, busy:true, reason:"visitor-hour" });
  await store.setJSON(rl.k, rl.n + 1).catch(function(){});

  try {
    var body = (await lookupAndCache(store, addr, g)).body;
    return json(200, body, { "Cache-Control": "public, max-age=3600" });
  } catch(e){
    if(e instanceof Busy) return json(200, { ok:false, busy:true, retryAfter: e.retryAfter });
    return json(200, { ok:false, error: "Couldn't reach NMS Almanac" });
  }
};
