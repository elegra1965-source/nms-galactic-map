/* ============================================================
   NMS Galactic Map -- send a system to Voyager's Haven (2026-10-12)

   Opt-in bridge: after a traveller saves a system in Edit System and
   ticks "Also send to Voyager's Haven", preview.js posts a Haven-shaped
   copy here and this forwards it to Haven's submission endpoint
   (POST https://havenmap.online/api/extraction) with the Hub's own
   submit-only key, issued by u/IAmThe-Ekimo-1920 under the Haven
   profile "nomanskyhub" / community tag NMSHUB.

   - Nothing goes live on Haven from here: every submission lands in
     Ekimo's approval queue (201 = new system queued, 200 = merged into a
     pending entry or queued as an edit to a system already on Haven).
   - HAVEN_SUBMIT_KEY (Netlify env var, secret) is ONLY read here, never
     sent to the browser. Deliberately a different name from haven-lookup's
     optional HAVEN_API_KEY, so public lookups never count towards the
     key's 100 requests/hour.
   - Until HAVEN_SUBMIT_KEY is set this returns 503 "not switched on yet",
     so the tick box is harmless before go-live.
   - Every field is whitelisted, enum-checked or run through the same
     filterText() the map's own edits use. Blank / "Unknown" values are
     omitted, as Haven asked.
   - Limits (Netlify Blobs, hashed IP, no raw IPs stored): 5 per traveller
     per hour, 80 per hour site-wide (Haven allows 100/hour for the key).
   - Writes nothing to the GitHub repo, so it never triggers a deploy.
   ============================================================ */

import { getStore } from "@netlify/blobs";
import { json, isValidAddress } from "./lib/shared.mjs";
import { filterText } from "./filter.mjs";

const HAVEN_URL = "https://havenmap.online/api/extraction";
const STORE = "nms-galmap-haven-submit";
const HOUR = 60 * 60 * 1000;
const PER_IP_PER_HOUR = 5;
const GLOBAL_PER_HOUR = 80;
const TIMEOUT_MS = 8000;

const STAR_COLORS = ["Yellow", "Red", "Green", "Blue", "Purple"];
const TIERS = ["Low", "Medium", "High"];
const LIFEFORMS = ["Gek", "Vy'keen", "Korvax"];
const ECON_TYPES = ["Trading", "Advanced Materials", "Scientific", "Mining", "Manufacturing", "Technology", "Power Generation"];

function enumOf(v, list){
  if(typeof v !== "string") return null;
  var t = v.trim().toLowerCase();
  for(var i = 0; i < list.length; i++) if(list[i].toLowerCase() === t) return list[i];
  return null;
}

/* Returns the cleaned string, "" for blank/Unknown, or throws on blocked text. */
function txt(v, maxLen, name){
  if(v === null || v === undefined) return "";
  var s = String(v).trim();
  if(!s || /^unknown$/i.test(s) || /^none$/i.test(s) || /^not shown$/i.test(s)) return "";
  var r = filterText(s, { maxLen: maxLen, fieldName: name });
  if(!r.ok) throw new Error(r.reason);
  return r.cleaned;
}

function set(obj, k, v){ if(v !== "" && v !== null && v !== undefined) obj[k] = v; }

export function buildHavenPayload(input){
  var out = {};
  var addr = String(input.glyph_code || "").toUpperCase();
  if(!isValidAddress(addr)) throw new Error("Bad portal address");
  out.glyph_code = addr;

  var g = String(input.galaxy_name || "").trim();
  if(!g || g.length > 40 || !/^[A-Za-z0-9 '\-]+$/.test(g)) throw new Error("Bad galaxy name");
  out.galaxy_name = g;
  out.reality = "Normal";

  set(out, "system_name", txt(input.system_name, 40, "System name"));
  set(out, "star_color", enumOf(input.star_color, STAR_COLORS));
  set(out, "economy_type", enumOf(input.economy_type, ECON_TYPES));
  set(out, "economy_strength", enumOf(input.economy_strength, TIERS));
  set(out, "conflict_level", enumOf(input.conflict_level, TIERS));
  set(out, "dominant_lifeform", enumOf(input.dominant_lifeform, LIFEFORMS));
  set(out, "discord_username", txt(input.discord_username, 30, "Your name"));
  out.description = "Submitted from nomansskyhub.app (Galactic Map)";

  var planets = Array.isArray(input.planets) ? input.planets.slice(0, 6) : [];
  var cleanPlanets = [];
  planets.forEach(function(p, i){
    if(!p || typeof p !== "object") return;
    var cp = {};
    set(cp, "planet_name", txt(p.planet_name, 40, "Planet " + (i + 1) + " name"));
    set(cp, "biome", txt(p.biome, 30, "Planet " + (i + 1) + " biome"));
    set(cp, "weather", txt(p.weather, 50, "Planet " + (i + 1) + " weather"));
    set(cp, "sentinel_level", txt(p.sentinel_level, 30, "Planet " + (i + 1) + " sentinels"));
    set(cp, "common_resource", txt(p.common_resource, 40, "Planet " + (i + 1) + " common resource"));
    set(cp, "uncommon_resource", txt(p.uncommon_resource, 40, "Planet " + (i + 1) + " uncommon resource"));
    cp.is_moon = !!p.is_moon;
    if(cp.planet_name || cp.biome || cp.weather || cp.sentinel_level || cp.common_resource || cp.uncommon_resource) cleanPlanets.push(cp);
  });
  if(cleanPlanets.length) out.planets = cleanPlanets;
  return out;
}

async function sha(s){
  var d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).slice(0, 12).map(function(b){ return b.toString(16).padStart(2, "0"); }).join("");
}

/* Sliding-window counter in Blobs. Returns true if this request is allowed (and records it). */
async function allow(store, key, limit, now){
  var list = [];
  try { list = (await store.get(key, { type: "json" })) || []; } catch(e){ list = []; }
  list = list.filter(function(t){ return now - t < HOUR; });
  if(list.length >= limit) return false;
  list.push(now);
  try { await store.setJSON(key, list); } catch(e){}
  return true;
}

export default async (req, context) => {
  if(req.method === "OPTIONS") return json(200, { ok: true });
  if(req.method !== "POST") return json(405, { ok: false, error: "POST only" });

  var key = process.env.HAVEN_SUBMIT_KEY;
  if(!key) return json(503, { ok: false, error: "not-enabled", message: "Sending to Voyager's Haven isn't switched on yet." });

  var body;
  try { body = await req.json(); } catch(e){ return json(400, { ok: false, error: "bad json" }); }

  var payload;
  try { payload = buildHavenPayload(body || {}); }
  catch(e){ return json(422, { ok: false, error: "invalid", message: e.message }); }

  var now = Date.now();
  var store = null;
  try { store = getStore(STORE); } catch(e){ store = null; }
  if(store){
    var ip = (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "unknown";
    var ipKey = "ip:" + await sha(ip);
    if(!(await allow(store, ipKey, PER_IP_PER_HOUR, now)))
      return json(429, { ok: false, error: "rate", message: "You've sent 5 systems to Voyager's Haven this hour -- try again later." });
    if(!(await allow(store, "global", GLOBAL_PER_HOUR, now)))
      return json(429, { ok: false, error: "rate", message: "Voyager's Haven is busy with Hub submissions right now -- try again later." });
  }

  var ctl = new AbortController();
  var t = setTimeout(function(){ ctl.abort(); }, TIMEOUT_MS);
  try {
    var r = await fetch(HAVEN_URL, {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json", "Accept": "application/json",
                 "User-Agent": "nomansskyhub.app (haven-submit)" },
      body: JSON.stringify(payload),
      signal: ctl.signal
    });
    if(r.status === 201) return json(200, { ok: true, result: "new", message: "Sent to Voyager's Haven -- queued for approval." });
    if(r.status === 200) return json(200, { ok: true, result: "update", message: "Already on Voyager's Haven -- sent as an update for approval." });
    if(r.status === 429) return json(429, { ok: false, error: "rate", message: "Voyager's Haven is busy right now -- try again later." });
    if(r.status === 401) return json(502, { ok: false, error: "key", message: "Voyager's Haven rejected the Hub's key." });
    if(r.status === 400) return json(422, { ok: false, error: "invalid", message: "Voyager's Haven didn't accept this system's address." });
    return json(502, { ok: false, error: "haven", message: "Voyager's Haven didn't respond properly (" + r.status + ")." });
  } catch(e){
    return json(502, { ok: false, error: "haven", message: "Couldn't reach Voyager's Haven -- try again later." });
  } finally { clearTimeout(t); }
};

export const config = { path: "/.netlify/functions/haven-submit" };
