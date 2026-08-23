/* ============================================================
   NMS Galactic Map — shared helpers for the Netlify Functions
   (system-edit.mjs, flag-dispute.mjs, sweep-stale-flags.mjs)

   Pulled out during the edit-tracking/dispute build (see
   EDIT-TRACKING-AND-DISPUTES.md) so all three functions read/write
   the exact same GitHub repo constants, the exact same shape of
   data/overrides.json, and share ONE in-memory GET cache object --
   a flag or an admin resolve-flag action changes the public GET
   payload just as much as a normal edit does, so it has to invalidate
   the same cache system-edit.mjs's own GET handler reads from.
   ============================================================ */

export const GITHUB_OWNER  = "elegra1965-source";
export const GITHUB_REPO   = "nms-galactic-map";
export const GITHUB_BRANCH = "main";
export const DATA_PATH     = "data/overrides.json";

export function json(status, body, extraHeaders){
  var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(extraHeaders){ for(var k in extraHeaders) headers[k] = extraHeaders[k]; }
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

export function isValidAddress(addr){
  return typeof addr === "string" && /^[0-9A-Fa-f]{12}$/.test(addr);
}

/* Real galaxy index, 0-255 (matches GALAXIES.length===257 client-side, and
   the real in-game galaxy count). Added for per-galaxy addressing
   (2026-08-22) -- see TODO.md's "Real per-galaxy addressing" entry for the
   full "why": a 12-glyph portal address has no galaxy digit in it, so the
   same address means a DIFFERENT real system in each of the 257 galaxies,
   and data/overrides.json's systems dict needs a galaxy dimension in its
   keys or two travellers documenting the same address in two different
   galaxies would silently overwrite each other. */
export function isValidGalaxy(g){
  var n = Number(g);
  return Number.isInteger(n) && n >= 0 && n <= 255;
}

/* The systems dict's real key from here on: "galaxy:ADDRESS", matching the
   exact format preview.html's own skey() already uses for the personal
   marks/waypoints/visited stores (galaxy is always the plain integer, no
   padding). Centralised here so system-edit.mjs and flag-dispute.mjs build
   and parse it identically -- see compositeKey()'s call sites for why every
   systems-dict lookup/write goes through this instead of a bare address. */
export function compositeKey(galaxy, address){
  return String(galaxy)+":"+String(address).toUpperCase();
}
/* Splits a composite key back into {galaxy, address} -- used by the admin
   GET view (which needs to show Tony which galaxy a flagged/disputed
   system is actually in) and by anything iterating current.data.systems by
   key. Returns null if the key doesn't look like galaxy:ADDRESS (shouldn't
   happen for anything written by this codebase, but a hand-edited
   overrides.json or a pre-migration leftover key could be malformed --
   fail soft rather than throw). */
export function parseCompositeKey(key){
  var i = String(key||"").indexOf(":");
  if(i<0) return null;
  var g = parseInt(key.slice(0,i),10);
  var addr = key.slice(i+1);
  if(!isValidGalaxy(g) || !isValidAddress(addr)) return null;
  return { galaxy:g, address:addr };
}

/* The 14 flaggable/disputable field categories a visitor can pick in the
   "Flag this field" picker, and that getFieldStatus() in preview.html
   colours on the info panel. Deliberately coarser than the dot-path-per-
   leaf-field example in EDIT-TRACKING-AND-DISPUTES.md -- grouping
   econName/sell/buy/econDesc into one "economy" category and water/
   dissonant into one "suffix" category (they already render as one
   combined row/line in the info panel, so a single status per row is what
   a visitor actually sees), and treating each planet/moon as ONE flaggable
   unit ("bodies.0" etc) rather than 12 separate sub-fields per body --
   keeps the picker UI to a manageable ~12-18 checkboxes instead of 80+.
   "phantom" added alongside blackHole/atlas for the Phantom/Shadow Star
   flag (Galactic-Map-Session-Notes.md) -- same coarse-category treatment.
   See HANDOVER.md for the full reasoning. */
export const FLAG_FIELDS = [
  "name","race","region","starClass","stars","suffix","giant",
  "economy","conflict","blackHole","atlas","phantom","notes"
];
export function isValidFlagField(field){
  if(FLAG_FIELDS.indexOf(field) >= 0) return true;
  var m = /^bodies\.(\d)$/.exec(String(field||""));
  return !!(m && +m[1] >= 0 && +m[1] <= 5);
}

export async function githubGetFile(token){
  var url = "https://api.github.com/repos/"+GITHUB_OWNER+"/"+GITHUB_REPO+"/contents/"+DATA_PATH+"?ref="+GITHUB_BRANCH;
  var res = await fetch(url, {
    headers: {
      "Authorization": "Bearer "+token,
      "Accept": "application/vnd.github+json",
      "User-Agent": "nms-galactic-map-function"
    }
  });
  if(res.status === 404){
    // file doesn't exist yet -- start fresh
    return { sha: null, data: { systems:{}, reports:[], ipLog:{}, flagLog:{} } };
  }
  if(!res.ok){
    throw new Error("GitHub read failed: "+res.status+" "+(await res.text()));
  }
  var body = await res.json();
  var decoded;
  if(body.content){
    // Normal path: file <=1MB, Contents API returns it inline as base64.
    decoded = Buffer.from(body.content, "base64").toString("utf8");
  } else {
    // 2026-08-23: the wiki-corpus bulk import pushed overrides.json past
    // 1MB (it's now ~1.3MB), which is the Contents API's hard limit for
    // returning `content` inline -- above that it comes back with content
    // omitted/empty, no error, no `truncated` flag set reliably either.
    // Buffer.from("", "base64") silently decodes to "", so JSON.parse("")
    // then threw "Unexpected end of JSON input" on every single read AND
    // write (writes read-merge-write via this same function) -- the whole
    // shared data store was down for every visitor until this was added.
    // Fix: re-fetch the identical blob via its own git_url using the raw
    // media type, which has no 1MB ceiling (good up to 100MB). See
    // https://docs.github.com/en/rest/repos/contents
    var blobRes = await fetch(body.git_url, {
      headers: {
        "Authorization": "Bearer "+token,
        "Accept": "application/vnd.github.raw",
        "User-Agent": "nms-galactic-map-function"
      }
    });
    if(!blobRes.ok){
      throw new Error("GitHub blob read failed: "+blobRes.status+" "+(await blobRes.text()));
    }
    decoded = await blobRes.text();
  }
  var data;
  try { data = JSON.parse(decoded); }
  catch(e){ throw new Error("overrides.json on GitHub is not valid JSON: "+e.message); }
  if(!data.systems) data.systems = {};
  if(!data.reports) data.reports = [];
  if(!data.ipLog) data.ipLog = {};
  if(!data.flagLog) data.flagLog = {};
  return { sha: body.sha, data: data };
}

export async function githubPutFile(token, data, sha, commitMessage){
  var url = "https://api.github.com/repos/"+GITHUB_OWNER+"/"+GITHUB_REPO+"/contents/"+DATA_PATH;
  var content = Buffer.from(JSON.stringify(data, null, 2), "utf8").toString("base64");
  var payload = {
    message: commitMessage,
    content: content,
    branch: GITHUB_BRANCH
  };
  if(sha) payload.sha = sha;
  var res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": "Bearer "+token,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "nms-galactic-map-function"
    },
    body: JSON.stringify(payload)
  });
  if(!res.ok){
    throw new Error("GitHub write failed: "+res.status+" "+(await res.text()));
  }
  return res.json();
}

export function pruneLog(log, now){
  var HOUR = 3600*1000;
  var out = {};
  for(var k in log){
    var kept = (log[k]||[]).filter(function(ts){ return now - ts < HOUR; });
    if(kept.length) out[k] = kept;
  }
  return out;
}

/* Consensus/audit trail needs SOME notion of "the same editor came back",
   without ever storing or exposing a visitor's raw IP outside this file
   (the existing rate-limit ipLog already stores raw IPs, but that's never
   returned from GET -- see system-edit.mjs). This hashes IP+a fixed salt
   with SHA-256 (Web Crypto, available in Netlify's Node runtime with no
   extra dependency) and truncates to a short opaque id. It's a soft
   privacy measure, not real anonymity (an IP is still a weak, gameable
   proxy for "distinct person" -- a household or office NATs many real
   people behind one IP, and one person on mobile data can get a new IP
   just by toggling airplane mode) -- documented here and in
   EDIT-TRACKING-AND-DISPUTES.md's own review of this tradeoff. Good enough
   to stop a single accidental double-click or a single browser refresh
   from counting as "2 editors agreeing", which is the main thing consensus
   needs to guard against; not a defence against a determined bad actor
   with multiple real connections. */
var HASH_SALT = "nms-galmap-editor-v1";
export async function editorHash(ip){
  var enc = new TextEncoder().encode(HASH_SALT+"|"+String(ip||"unknown"));
  var buf = await crypto.subtle.digest("SHA-256", enc);
  var hex = Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,"0"); }).join("");
  return "u_"+hex.slice(0,16);
}

/* Shared 30s GET-response cache (see the header comment in system-edit.mjs
   for why this exists). Exported as get/set/invalidate functions rather
   than a raw mutable object so flag-dispute.mjs and sweep-stale-flags.mjs
   can invalidate it after their own writes without needing to know its
   internal shape -- any of the three functions changing overrides.json
   must call invalidateGetCache() so the next visitor's page load doesn't
   serve a stale pre-write copy for up to 30s. */
var _getCache = { data: null, fetchedAt: 0 };
export function getGetCache(){ return _getCache; }
export function setGetCache(data, now){ _getCache = { data: data, fetchedAt: now }; }
export function invalidateGetCache(){ _getCache = { data: null, fetchedAt: 0 }; }
