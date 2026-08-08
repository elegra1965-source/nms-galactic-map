/* ============================================================
   NMS Galactic Map — system-edit Netlify Function
   Endpoint: /.netlify/functions/system-edit

   POST body: { action: "edit"|"report", address, payload }
     address = the 12-char portal hex address the edit applies to
     "edit"   payload = {name, race, region, starClass, water, dissonant, giant, econName, sell, buy,
                         econDesc, conflict, blackHole, atlas, notes,
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

function json(status, body){
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
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
  var current;
  try {
    current = await githubGetFile(token);
  } catch(e){
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

  // Tony-only view: append ?token=<ADMIN_TOKEN> (set as a Netlify env var,
  // separate from GITHUB_TOKEN) to also see the flagged/reports list, so he
  // can periodically skim it without digging through raw JSON on GitHub.
  var url = new URL(req.url);
  var suppliedAdminToken = url.searchParams.get("token");
  var adminToken = process.env.ADMIN_TOKEN;
  if(adminToken && suppliedAdminToken && suppliedAdminToken === adminToken){
    out.reports = current.data.reports;
  }

  return json(200, out);
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
    return json(502, {ok:false, error:"Could not save to shared data store: "+e.message});
  }

  return json(200, {ok:true, address: address, action: action});
};

export const config = { path: "/.netlify/functions/system-edit" };
