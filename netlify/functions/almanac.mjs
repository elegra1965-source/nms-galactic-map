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
   - 2026-11-13: after an Almanac 429 every call (visitors, Check route, the
     warm-up) stays quiet until its Retry-After has passed. The wait is kept in
     the blob store (state/benched). The Almanac turns a client that calls early
     away for 5 minutes on everything, so we must not keep knocking.
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
const CACHE_V = 5;   // 2026-10-24 v2: colours/ringed. 2026-10-26 v3: player-given names + station picture. 2026-11-14 v5: discoverer (read from system.discovery); older cached answers are refetched

class Busy extends Error { constructor(ra){ super("busy"); this.retryAfter = ra; } }

const BENCH_KEY = "state/benched";
async function benchLeft(){
  try {
    var b = await getStore(STORE).get(BENCH_KEY, { type: "json" });
    if(b && b.until > Date.now()) return Math.ceil((b.until - Date.now()) / 1000);
  } catch(e){}
  return 0;
}

async function aGet(path){
  var left = await benchLeft();
  if(left > 0) throw new Busy(left);
  var ctl = new AbortController();
  var t = setTimeout(function(){ ctl.abort(); }, TIMEOUT_MS);
  var h = { "Accept": "application/json", "User-Agent": "map.nomansskyhub.app (almanac)" };
  if(process.env.ALMANAC_API_KEY) h["Authorization"] = "Bearer " + process.env.ALMANAC_API_KEY;
  try {
    var r = await fetch(BASE + path, { headers: h, signal: ctl.signal });
    if(r.status === 429){
      var ra = Math.min(parseInt(r.headers.get("Retry-After") || "0", 10) || 600, 3600);
      await getStore(STORE).setJSON(BENCH_KEY, { until: Date.now() + ra * 1000 + 1000 }).catch(function(){});
      throw new Busy(ra);
    }
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
    // 1.3.0: a planet no longer lists `resources`; its trio (rare, uncommon, common substance) stands in
    resources: (p.resources || p.trio || []).slice(0, 40).map(function(k){ return item(w, k); }),
    disc: pic.disc ? BASE + pic.disc : null,
    discSmall: pic.disc_small ? BASE + pic.disc_small : null,
    card: pic.card ? BASE + pic.card : null,
    // 2026-10-24: real look for the map's 3D planets (terrain/water/sky/ring colours)
    colours: p.colours ? { terrain: p.colours.terrain || null, water: p.colours.water || null,
      sky: p.colours.sky && p.colours.sky.day || null, rings: p.colours.rings || null } : null,
    ringed: !!(p.colours && p.colours.rings)
  };
}

/* 1.3.0 (Almanac, Nov 2026): the system answer keeps only the system. economy, wealth and
   conflict became plain strings with one shared `phrase` draw (0-7), race is a string, the
   station kind is `station` ("ordinary" | "abandoned" | "outlaw" | "none"), and everything
   about the station (trade percentages, demand, pictures) lives in GET /systems/{portal}/station.
   This reads BOTH shapes (old answers had economy/wealth/conflict as {type|level, phrase}
   objects and trade/pictures.station on the system), so it works before and after the release. */
function mapSystem(s, w, st){
  var dsc = s.discovery || {};
  var isNew = typeof s.economy === "string";   // 1.3.0 shape (old answers had an object)
  var abandoned = isNew ? s.station === "abandoned" : !!s.abandoned;
  var econT = null, econP = null, wealthL = null, wealthP = null, confL = null, confP = null;
  if(isNew){
    var ph = typeof s.phrase === "number" ? s.phrase : null;
    if(s.economy && s.economy !== "none" && ph != null){ econT = s.economy; econP = ph >> 1; }
    else if(s.economy && s.economy !== "none"){ econT = s.economy; }
    if(s.wealth && s.wealth !== "none" && ph != null){ wealthL = s.wealth; wealthP = ph; }
    if(s.conflict && s.conflict !== "none" && ph != null){ confL = s.conflict; confP = ph; }
  } else {
    if(s.economy){ econT = s.economy.type; econP = s.economy.phrase; }
    if(s.wealth){ wealthL = s.wealth.level; wealthP = s.wealth.phrase; }
    if(s.conflict){ confL = s.conflict.level; confP = s.conflict.phrase; }
  }
  var tr = (isNew ? st : s.trade) || {};
  var demandCode = isNew ? (st && st.demand && st.demand !== "none" ? st.demand : null) : tr.demand;
  var sp = isNew ? (st && st.pictures) || {} : s.pictures || {};
  var stationPic = isNew ? sp.picture : sp.station, stationSmall = isNew ? sp.picture_small : sp.station_small;
  function demandWord(){
    try { var v = (isNew ? w.station.demand : w.trade.demand)[demandCode]; if(typeof v === "string") return v; if(v && v.name) return v.name; } catch(e){}
    return pretty(demandCode);
  }
  return {
    portal: s.portal,
    name: s.names && (s.names.given || s.names.game) ? String(s.names.given || s.names.game).slice(0, 80) : null,
    gameName: s.names && s.names.game ? String(s.names.game).slice(0, 80) : null,
    region: s.region || null,
    star: word(w, "star", s.star),
    spectral: s.spectral_class || null,
    suns: s.suns || null,
    race: abandoned ? "Abandoned" : word(w, "race", s.race),
    economy: econT && econP != null ? phrase(w, "economy", econT, econP) : null,
    economyType: econT ? (function(){ try { var v = w.economy.type[econT]; if(typeof v === "string") return v; } catch(e){} return pretty(econT); })() : null,
    wealth: wealthL && wealthP != null ? phrase(w, "wealth", wealthL, wealthP) : null,
    conflict: confL && confP != null ? phrase(w, "conflict", confL, confP) : null,
    abandoned: abandoned,
    // 2026-11-14 (Borjomi OK'd): who first discovered it, from the Almanac; absent where Hello Games has no record
    discoverer: dsc.discoverer && typeof dsc.discoverer === "string" && dsc.discoverer.trim() ? dsc.discoverer.trim().slice(0, 40) : null,
    platform: typeof dsc.platform === "string" ? dsc.platform.slice(0, 20) : null,
    discovered: typeof dsc.discovered === "string" && /^\d{4}-\d\d-\d\d/.test(dsc.discovered) ? dsc.discovered.slice(0, 10) : null,
    sell: typeof tr.sell_percent === "number" ? Math.round(tr.sell_percent * 10) / 10 : null,
    buy: typeof tr.buy_percent === "number" ? Math.round(tr.buy_percent * 10) / 10 : null,
    demand: demandCode ? demandWord() : null,
    card: s.pictures && s.pictures.card ? BASE + s.pictures.card : null,
    // 2026-10-26: the system's own space station picture (512x512, transparent), absent where it has none
    station: stationPic ? BASE + stationPic : null,
    stationSmall: stationSmall ? BASE + stationSmall : null
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
   cost = key lookups used (1 + station + bodies). Throws Busy on a 429. */
export async function lookupAndCache(store, addr, g){
  var ck = "sys/" + g + "/0" + addr.slice(1);
  var cost = 1;
  var s = await aGet("systems/" + addr + "?galaxy=" + (g + 1));
  var body;
  if(!s){ body = { ok:true, found:false, v:CACHE_V }; }
  else {
    var w = await words(store, s.words);
    var st = null;
    // 1.3.0: the station has its own call (404 = no station). Old answers carried it on the system.
    if(typeof s.economy === "string" && s.station && s.station !== "none"){ st = await aGet("systems/" + addr + "/station?galaxy=" + (g + 1)); cost++; }
    var bodies = [];
    for(var i = 0; i < (s.bodies || []).length && i < 8; i++){
      var p = await aGet("planets/" + s.bodies[i].portal + "?galaxy=" + (g + 1)); cost++;
      if(p) bodies.push(mapPlanet(p, w));
    }
    body = { ok:true, found:true, v:CACHE_V, galaxy:g, system: mapSystem(s, w, st), bodies: bodies,
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
