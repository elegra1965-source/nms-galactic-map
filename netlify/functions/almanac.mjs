/* ============================================================
   NMS Galactic Map -- NMS Almanac lookup (2026-10-23)

   Read-only bridge to NMS Almanac (nmsalmanac.com) by Borjomi (u/imurashka),
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
const PER_IP_HOUR_EXISTS = 80;   // 2026-10-26: Navigator's "Check route" (1 key lookup each, see exists=1)
const TIMEOUT_MS = 8000;
const CACHE_V = 3;   // 2026-10-24 v2: colours/ringed. 2026-10-26 v3: player-given names + station picture; older cached answers are refetched

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
    // 2026-10-26: the Almanac now also sends the name a player gave the planet (names.given) -- that is the name the game shows
    name: p.names && (p.names.given || p.names.game) ? String(p.names.given || p.names.game).slice(0, 80) : null,
    gameName: p.names && p.names.game ? String(p.names.game).slice(0, 80) : null,
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
    name: s.names && (s.names.given || s.names.game) ? String(s.names.given || s.names.game).slice(0, 80) : null,
    gameName: s.names && s.names.game ? String(s.names.game).slice(0, 80) : null,
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
    card: s.pictures && s.pictures.card ? BASE + s.pictures.card : null,
    // 2026-10-26: the system's own space station picture (512x512, transparent), absent where it has none
    station: s.pictures && s.pictures.station ? BASE + s.pictures.station : null,
    stationSmall: s.pictures && s.pictures.station_small ? BASE + s.pictures.station_small : null
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

const RMAX_BUDGET_HOUR = 100;   // 2026-10-27: region-size searches, all visitors together

/* Does this system exist? Reads the full or exists cache first (free); else one
   /systems call, stored in the exists cache (30 days, misses 1 day). */
async function existsCached(store, addr, g){
  var sys0 = "0" + addr.slice(1);
  var c = await store.get("sys/" + g + "/" + sys0, { type: "json" }).catch(function(){ return null; });
  if(c && c.until > Date.now() && c.body && c.body.ok) return { found: !!c.body.found, cost: 0 };
  var ek = "ex/" + g + "/" + sys0;
  var ec = await store.get(ek, { type: "json" }).catch(function(){ return null; });
  if(ec && ec.until > Date.now() && ec.body) return { found: !!ec.body.found, cost: 0 };
  var es = await aGet("systems/" + addr + "?galaxy=" + (g + 1));
  var eb = { ok:true, found: !!es, name: es && es.names ? String(es.names.given || es.names.game || "").slice(0, 80) || null : null };
  await store.setJSON(ek, { until: Date.now() + (eb.found ? TTL_HIT_MS : TTL_MISS_MS), body: eb }).catch(function(){});
  return { found: eb.found, cost: 1 };
}

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

  /* 2026-10-26: ?exists=1 -- the Galactic Navigator's "Check route" button only
     needs to know a stop is a real system (and its name). One /systems call (1 key
     lookup, no planets), cached 30 days (misses 1 day), its own per-visitor cap. */
  if(u.searchParams.get("exists") === "1"){
    if(cached && cached.until > Date.now() && cached.body && cached.body.ok){
      var cb = cached.body;
      return json(200, { ok:true, found: !!cb.found, name: cb.found && cb.system ? cb.system.name : null }, { "Cache-Control": "public, max-age=3600" });
    }
    var ek = "ex/" + g + "/" + sys0;
    var ec = await store.get(ek, { type: "json" }).catch(function(){ return null; });
    if(ec && ec.until > Date.now() && ec.body) return json(200, ec.body, { "Cache-Control": "public, max-age=3600" });
    var whoE = await ipKey((context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "unknown");
    var rlE = await hourCount(store, "ex/" + whoE);
    if(rlE.n >= PER_IP_HOUR_EXISTS) return json(200, { ok:false, busy:true, reason:"visitor-hour" });
    await store.setJSON(rlE.k, rlE.n + 1).catch(function(){});
    try {
      var es = await aGet("systems/" + addr + "?galaxy=" + (g + 1));
      var eb = { ok:true, found: !!es, name: es && es.names ? String(es.names.given || es.names.game || "").slice(0, 80) || null : null };
      await store.setJSON(ek, { until: Date.now() + (eb.found ? TTL_HIT_MS : TTL_MISS_MS), body: eb }).catch(function(){});
      return json(200, eb, { "Cache-Control": "public, max-age=3600" });
    } catch(e){
      if(e instanceof Busy) return json(200, { ok:false, busy:true, retryAfter: e.retryAfter });
      return json(200, { ok:false, error: "Couldn't reach NMS Almanac" });
    }
  }

  /* 2026-10-27: ?regionmax=1&addr=<any address in the region>&lo=<hex top number
     known to exist> -- a region's true top system number, for the stars the map
     draws near you. Halving search between lo and 0x3E8 over "does this system
     exist" (each check 1 key lookup, reusing/filling the same exists cache),
     at most 4 checks per call so the function stays quick; the page calls
     again until done. The result is stored for good (rmax/<galaxy>/<region>),
     so every region is only ever searched once, for everybody. Its own budget
     of 100 lookups an hour across all visitors keeps the key free for the rest. */
  if(u.searchParams.get("regionmax") === "1"){
    var region = addr.slice(4);
    var rk = "rmax/" + g + "/" + region;
    var st = await store.get(rk, { type: "json" }).catch(function(){ return null; });
    if(st && st.done) return json(200, { ok:true, done:true, n: st.n }, { "Cache-Control": "public, max-age=86400" });
    var lo0 = parseInt(u.searchParams.get("lo") || "7A", 16);
    if(!(lo0 >= 1 && lo0 < 0x3E8)) return json(400, { ok:false, error:"lo must be 1-3E7 hex" });
    if(!st || st.v !== 1) st = { v:1, lo: lo0, hi: 0x3E9, checkedLo: false, done:false };
    var bk = "rmaxb/" + Math.floor(Date.now() / 3600000);
    var used = (await store.get(bk, { type: "json" }).catch(function(){ return null; })) || 0;
    if(used >= RMAX_BUDGET_HOUR) return json(200, { ok:false, busy:true, reason:"budget" });
    var whoR = await ipKey((context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "unknown");
    var rlR = await hourCount(store, "ex/" + whoR);
    if(rlR.n >= PER_IP_HOUR_EXISTS) return json(200, { ok:false, busy:true, reason:"visitor-hour" });
    var spent = 0;
    try {
      for(var step = 0; step < 4 && !st.done; step++){
        var probe = st.checkedLo ? Math.floor((st.lo + st.hi) / 2) : st.lo;
        var pa = "1" + probe.toString(16).toUpperCase().padStart(3, "0") + region;
        var r = await existsCached(store, pa, g);
        spent += r.cost;
        if(!st.checkedLo){
          st.checkedLo = true;
          if(!r.found){ st.done = true; st.n = 0; }   // the known-good number isn't there: leave this region alone
        } else if(r.found) st.lo = probe; else st.hi = probe;
        if(!st.done && st.checkedLo && st.hi - st.lo <= 1){ st.done = true; st.n = st.lo; }
      }
    } catch(e){
      if(spent) await store.setJSON(bk, used + spent).catch(function(){});
      await store.setJSON(rk, st).catch(function(){});
      if(e instanceof Busy) return json(200, { ok:false, busy:true, retryAfter: e.retryAfter });
      return json(200, { ok:false, error: "Couldn't reach NMS Almanac" });
    }
    if(spent){
      await store.setJSON(bk, used + spent).catch(function(){});
      await store.setJSON(rlR.k, rlR.n + spent).catch(function(){});
    }
    if(st.done) st.at = Date.now();
    await store.setJSON(rk, st).catch(function(){});
    return json(200, st.done ? { ok:true, done:true, n: st.n } : { ok:true, done:false });
  }

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
