/* ============================================================
   NMS Galactic Map — system-edit Netlify Function
   Endpoint: /.netlify/functions/system-edit

   POST body: { action: "edit"|"report", address, payload }
     address = the 12-char portal hex address the edit applies to
     "edit"   payload = {name, race, region, stars:[colourKey,...] (max 3), starClass, water, dissonant,
                         giant, econName, sell, buy, econDesc, conflict, blackHole, atlas, notes,
                         bodies:[{name, moon, orbits, biome, descriptor, water, ring, resources,
                                  flora, minerals, salvage, fossils, sentinel, autophage}, ...]}
     "report" payload = {reason}

   Flow:
     1. Rate-limit by IP (very simple in-memory-per-invocation + a
        rolling log kept in the same GitHub JSON file, since
        Netlify Functions are stateless between cold starts).
     2. Run the shared content filter (filter.mjs) — same rules the
        client already applied, but this copy is authoritative.
     3. Read the current data/overrides.json from GitHub (Contents API).
     4. Merge in the edit / report.
     5. Commit the updated file back to GitHub (Contents API), which
        is also the free full revert history Tony asked about --
        every past version is a git commit he can look at or roll
        back on github.com without any extra tooling.

   Public GET caching (added for traffic-wave resilience):
     Every visitor's page load calls GET once to merge live community
     edits over the procedural map (loadOverrides() in preview.html).
     Uncached, that's one live GitHub Contents-API read per visitor
     against the token's shared 5,000-req/hour limit. GET now keeps a
     30s in-memory copy (_getCache) and sets Cache-Control so a burst
     of visitors in the same window shares one GitHub read, and serves
     that last-known-good copy instead of failing outright if GitHub
     is briefly rate-limited/unreachable. The cache is cleared the
     moment a save succeeds, so the saving visitor's own immediate
     reload sees their edit, not a stale pre-save copy. The admin
     view (?token=<ADMIN_TOKEN>, reports list) always bypasses the
     cache and reads live -- Tony should never see a stale reports queue.

   Save-failure handling (client side, preview.html):
     A 409 buried in a GitHub write-failure message means someone
     else's save landed on the same system a moment earlier (their
     edit succeeded, this one didn't -- nothing lost, just retry).
     Any other 502/network failure is also retryable. A 422 (content
     filter) or 429 (rate limit) is not -- retrying the same payload
     would just fail again identically, so the client shows the
     specific reason instead of a Retry button for those. See
     describeSaveError() in preview.html.

   Requires one Netlify environment variable:
     GITHUB_TOKEN   -- a fine-grained PAT scoped to Contents:read/write
                       on ONLY the nms-galactic-map repo. Set in
                       Netlify: Site settings -> Environment variables.
   And two constants below to match Tony's actual repo.
   ============================================================ */

import { filterSystemEdit, filterReport } from "./filter.mjs";

const GITHUB_OWNER  = "elegra1965-source";
const GITHUB_REPO   = "nms-galactic-map";
const GITHUB_BRANCH = "main";
const DATA_PATH     = "data/overrides.json";

const MAX_EDITS_PER_IP_PER_HOUR = 8;
const MAX_REPORTS_PER_IP_PER_HOUR = 15;

// How long a successful public GET response is reused before reading GitHub
// again. Every visitor's page load hits GET once (see loadOverrides() in
// preview.html) with no caching in front of it previously -- under a real
// traffic wave that's one live GitHub Contents-API call per visitor against
// the token's shared 5,000-requests/hour limit. This cache means a burst of
// visitors landing in the same 30s window shares one GitHub read instead of
// one each. It lives in plain module-scope memory, so it only helps within
// a single warm function instance (Netlify reuses a warm instance across
// back-to-back requests, but a big simultaneous spike still spins up more
// than one instance in parallel) -- it's a real, meaningful reduction, not
// a guaranteed shared cache across every instance. The Cache-Control header
// below is the other half: it lets browsers (and Netlify's CDN, on plans
// that honour it for Function responses) skip the network call entirely
// for repeat loads inside the window, on top of whatever this in-memory
// cache saves at the origin.
const GET_CACHE_TTL_MS = 30 * 1000;
let _getCache = { data: null, fetchedAt: 0 };

function json(status, body, extraHeaders){
  var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if(extraHeaders){ for(var k in extraHeaders) headers[k] = extraHeaders[k]; }
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

function isValidAddress(addr){
  return typeof addr === "string" && /^[0-9A-Fa-f]{12}$/.test(addr);
}

async function githubGetFile(token){
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
    return { sha: null, data: { systems:{}, reports:[], ipLog:{} } };
  }
  if(!res.ok){
    throw new Error("GitHub read failed: "+res.status+" "+(await res.text()));
  }
  var body = await res.json();
  var decoded = Buffer.from(body.content, "base64").toString("utf8");
  var data;
  try { data = JSON.parse(decoded); }
  catch(e){ throw new Error("overrides.json on GitHub is not valid JSON: "+e.message); }
  if(!data.systems) data.systems = {};
  if(!data.reports) data.reports = [];
  if(!data.ipLog) data.ipLog = {};
  return { sha: body.sha, data: data };
}

async function githubPutFile(token, data, sha, commitMessage){
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

function pruneIpLog(ipLog, now){
  var HOUR = 3600*1000;
  var out = {};
  for(var ip in ipLog){
    var kept = (ipLog[ip]||[]).filter(function(ts){ return now - ts < HOUR; });
    if(kept.length) out[ip] = kept;
  }
  return out;
}

async function handleGet(req, token){
  // Tony-only view: append ?token=<ADMIN_TOKEN> (set as a Netlify env var,
  // separate from GITHUB_TOKEN) to also see the flagged/reports list, so he
  // can periodically skim it without digging through raw JSON on GitHub.
  // This path always reads live and is never cached or served from cache --
  // Tony reviewing reports should never see a stale or public-only copy.
  var url = new URL(req.url);
  var suppliedAdminToken = url.searchParams.get("token");
  var adminToken = process.env.ADMIN_TOKEN;
  var isAdmin = !!(adminToken && suppliedAdminToken && suppliedAdminToken === adminToken);

  var now = Date.now();
  var cacheHeaders = { "Cache-Control": "public, max-age=30, s-maxage=30" };

  if(!isAdmin && _getCache.data && (now - _getCache.fetchedAt) < GET_CACHE_TTL_MS){
    return json(200, _getCache.data, cacheHeaders);
  }

  var current;
  try {
    current = await githubGetFile(token);
  } catch(e){
    // GitHub briefly unreachable or rate-limited: if we have a last-known-good
    // copy, serve that instead of nothing -- keeps the community-edit layer
    // alive through a transient GitHub problem instead of every visitor's map
    // silently losing shared edits for the duration (loadOverrides() in
    // preview.html treats a failed GET as "no shared edits", not an error).
    if(!isAdmin && _getCache.data) return json(200, _getCache.data, cacheHeaders);
    return json(502, {ok:false, error:"Could not read shared data store: "+e.message});
  }

  // Public response: every visitor's page load calls this to merge live
  // edits over the procedural defaults, so it must never leak submitter IPs.
  var publicSystems = {};
  for(var addr in current.data.systems){
    var rec = current.data.systems[addr];
    publicSystems[addr] = { data: rec.data, editedAt: rec.editedAt };
  }

  var out = { ok:true, systems: publicSystems };

  if(isAdmin){
    out.reports = current.data.reports;
    return json(200, out); // admin view: always live, never cached/served-from-cache
  }

  _getCache = { data: out, fetchedAt: now };
  return json(200, out, cacheHeaders);
}

export default async (req, context) => {
  if(req.method === "OPTIONS") return json(200, {ok:true});

  var token = process.env.GITHUB_TOKEN;
  if(!token) return json(500, {ok:false, error:"Server not configured (missing GITHUB_TOKEN). Tony needs to set this in Netlify env vars."});

  if(req.method === "GET") return handleGet(req, token);
  if(req.method !== "POST") return json(405, {ok:false, error:"POST or GET only"});

  var body;
  try { body = await req.json(); }
  catch(e){ return json(400, {ok:false, error:"Invalid JSON body"}); }

  var action = body.action;
  var address = body.address;
  if(action !== "edit" && action !== "report") return json(400, {ok:false, error:"action must be 'edit' or 'report'"});
  if(!isValidAddress(address)) return json(400, {ok:false, error:"address must be a 12-character hex portal address"});

  // Netlify supplies the real client IP in this header on their edge network.
  var ip = req.headers.get("x-nf-client-connection-ip") || context.ip || "unknown";
  var now = Date.now();

  var filtered;
  if(action === "edit"){
    filtered = filterSystemEdit(body.payload);
  } else {
    filtered = filterReport(body.payload);
  }
  if(!filtered.ok){
    return json(422, {ok:false, error:"Rejected by content filter", details: filtered.errors});
  }

  var current;
  try {
    current = await githubGetFile(token);
  } catch(e){
    return json(502, {ok:false, error:"Could not read shared data store: "+e.message});
  }

  current.data.ipLog = pruneIpLog(current.data.ipLog, now);
  var ipHits = current.data.ipLog[ip] || [];
  var limit = action === "edit" ? MAX_EDITS_PER_IP_PER_HOUR : MAX_REPORTS_PER_IP_PER_HOUR;
  if(ipHits.length >= limit){
    return json(429, {ok:false, error:"Too many submissions from this connection in the last hour. Try again later."});
  }
  ipHits.push(now);
  current.data.ipLog[ip] = ipHits;

  var commitMessage;
  if(action === "edit"){
    current.data.systems[address] = {
      data: filtered.cleaned,
      editedAt: new Date(now).toISOString(),
      editedByIp: ip
    };
    commitMessage = "Edit system "+address+" via site";
  } else {
    current.data.reports.push({
      address: address,
      reason: filtered.cleaned.reason,
      reportedAt: new Date(now).toISOString(),
      reportedByIp: ip,
      resolved: false
    });
    commitMessage = "Report system "+address+" via site";
  }

  try {
    await githubPutFile(token, current.data, current.sha, commitMessage);
  } catch(e){
    // Surfaces to the client as a 502; if GitHub's message contains "409" this
    // is a genuine conflict (someone else's save landed first and changed the
    // file's sha) -- preview.html's describeSaveError() detects that string
    // and tells the visitor their edit was NOT lost, just needs a retry.
    return json(502, {ok:false, error:"Could not save to shared data store: "+e.message});
  }

  // Invalidate the GET cache immediately so the visitor who just saved (their
  // own client calls loadOverrides() right after this resolves) sees their
  // own edit reflected straight away, instead of possibly getting served a
  // pre-save cached copy for up to GET_CACHE_TTL_MS on this same warm instance.
  _getCache = { data: null, fetchedAt: 0 };

  return json(200, {ok:true, address: address, action: action});
};

export const config = { path: "/.netlify/functions/system-edit" };
