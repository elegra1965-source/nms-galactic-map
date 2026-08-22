/* ============================================================
   NMS Galactic Map — flag-dispute Netlify Function
   Endpoint: /.netlify/functions/flag-dispute

   POST body: { address, galaxy, fields: ["name","bodies.0",...], note }
     address = the 12-char portal hex address
     galaxy  = the 0-255 galaxy index this address is being flagged in (added
               2026-08-22 for real per-galaxy addressing -- see TODO.md and
               lib/shared.mjs's compositeKey() comment; the shared systems
               dict is keyed "galaxy:ADDRESS" now, not just ADDRESS, since an
               address alone doesn't say which of the 257 galaxies it's in)
     fields  = which of the FLAG_FIELDS categories (lib/shared.mjs) look
               wrong -- a visitor can flag data even on a purely
               procedural system (no prior edit needed) since the
               complaint might just be "this shouldn't have a black
               hole", not "here's a correction".
     note    = optional free-text explaining what's wrong (<=200 chars)

   Per EDIT-TRACKING-AND-DISPUTES.md, this is the "Flag this edit"
   button distinct from the existing "Report" (inappropriate content)
   flow in system-edit.mjs -- a data DISPUTE, not a content violation.
   Flagged fields turn amber in the info panel for every visitor
   (system-edit.mjs's public GET already returns flaggedFields per
   system); the next genuine edit submitted for a flagged field goes
   through consensus voting instead of a direct overwrite (see
   voteAndMaybeResolve() in system-edit.mjs) rather than being clobbered
   by whoever happens to submit next.

   GitHub Issue creation is best-effort, not required for the flag
   itself to succeed: the existing GITHUB_TOKEN (scoped to Contents
   read/write only, see system-edit.mjs's own header comment) most
   likely does NOT have Issues:write permission yet. Tony can add that
   scope on GitHub any time he wants real notifications for new flags;
   until then, every flag is still fully recorded in overrides.json and
   visible in the admin queue (GET .../system-edit?token=<ADMIN_TOKEN>),
   it just won't also open a GitHub Issue. This mirrors how the rest of
   this project already treats GitHub as "best effort, never a hard
   dependency for the core feature to work" (see the GET-cache fallback
   in system-edit.mjs for the same philosophy).
   ============================================================ */

import { filterText } from "./filter.mjs";
import {
  json, isValidAddress, githubGetFile, githubPutFile, pruneLog,
  editorHash, invalidateGetCache, isValidFlagField,
  isValidGalaxy, compositeKey,
  GITHUB_OWNER, GITHUB_REPO
} from "./lib/shared.mjs";

const MAX_FLAGS_PER_IP_PER_HOUR = 15;
const MAX_FIELDS_PER_FLAG = 8;

async function tryOpenGithubIssue(token, address, fields, note, systemName){
  try{
    var title = "Flagged: "+(systemName||address)+" ("+address+")";
    var body = "System: "+(systemName||"(unnamed)")+" ("+address+")\n"+
      "Flagged fields: "+fields.join(", ")+"\n\n"+
      "Reporter note: "+(note||"none")+"\n\n"+
      "View: https://nms-galaxy-map.netlify.app/?addr="+address;
    var res = await fetch("https://api.github.com/repos/"+GITHUB_OWNER+"/"+GITHUB_REPO+"/issues", {
      method: "POST",
      headers: {
        "Authorization": "Bearer "+token,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "nms-galactic-map-function"
      },
      body: JSON.stringify({ title: title, body: body, labels: ["flagged","needs-review"] })
    });
    if(!res.ok) return null; // most likely a 403 (token lacks Issues:write) -- soft-fail, see header comment
    var j = await res.json();
    return j.html_url || null;
  } catch(e){
    return null;
  }
}

export default async (req, context) => {
  if(req.method === "OPTIONS") return json(200, {ok:true});
  if(req.method !== "POST") return json(405, {ok:false, error:"POST only"});

  var token = process.env.GITHUB_TOKEN;
  if(!token) return json(500, {ok:false, error:"Server not configured (missing GITHUB_TOKEN)."});

  var body;
  try { body = await req.json(); }
  catch(e){ return json(400, {ok:false, error:"Invalid JSON body"}); }

  var address = body.address;
  var galaxy = body.galaxy;
  if(!isValidAddress(address)) return json(400, {ok:false, error:"address must be a 12-character hex portal address"});
  if(!isValidGalaxy(galaxy)) return json(400, {ok:false, error:"galaxy must be an integer 0-255"});

  var fieldsIn = Array.isArray(body.fields) ? body.fields : [];
  var fields = [];
  for(var i=0;i<fieldsIn.length && fields.length<MAX_FIELDS_PER_FLAG;i++){
    if(isValidFlagField(fieldsIn[i]) && fields.indexOf(fieldsIn[i])<0) fields.push(fieldsIn[i]);
  }
  if(!fields.length) return json(400, {ok:false, error:"Pick at least one field to flag."});

  var noteR = filterText(body.note, {maxLen:200, fieldName:"Note"});
  if(!noteR.ok) return json(422, {ok:false, error:"Rejected by content filter", details:[noteR.reason]});

  var ip = req.headers.get("x-nf-client-connection-ip") || context.ip || "unknown";
  var now = Date.now();

  var current;
  try { current = await githubGetFile(token); }
  catch(e){ return json(502, {ok:false, error:"Could not read shared data store: "+e.message}); }

  current.data.flagLog = pruneLog(current.data.flagLog, now);
  var ipHits = current.data.flagLog[ip] || [];
  if(ipHits.length >= MAX_FLAGS_PER_IP_PER_HOUR){
    return json(429, {ok:false, error:"Too many flags from this connection in the last hour. Try again later."});
  }
  ipHits.push(now);
  current.data.flagLog[ip] = ipHits;

  var edHash = await editorHash(ip);
  var flagKey = compositeKey(galaxy, address);
  var sysRec = current.data.systems[flagKey];
  if(!sysRec) sysRec = current.data.systems[flagKey] = { galaxy:galaxy, flaggedFields:[], disputedFields:[] };
  if(sysRec.galaxy===undefined) sysRec.galaxy = galaxy; // backfill for a pre-existing record saved before this field existed
  if(!sysRec.flaggedFields) sysRec.flaggedFields=[];
  if(!sysRec.disputedFields) sysRec.disputedFields=[];
  if(!sysRec.flagMeta) sysRec.flagMeta={};
  if(!sysRec.history) sysRec.history=[];

  var newlyFlagged=[];
  for(var f=0; f<fields.length; f++){
    var field=fields[f];
    if(sysRec.disputedFields.indexOf(field)>=0) continue; // already the worse state, nothing to add
    if(sysRec.flaggedFields.indexOf(field)<0){ sysRec.flaggedFields.push(field); newlyFlagged.push(field); }
    sysRec.flagMeta[field] = { flaggedAt: now, note: noteR.cleaned, reporterHash: edHash, issueUrl: null };
  }

  var issueUrl = null;
  if(newlyFlagged.length){
    issueUrl = await tryOpenGithubIssue(token, address, newlyFlagged, noteR.cleaned, sysRec.data && sysRec.data.name);
    if(issueUrl){ for(var g=0; g<newlyFlagged.length; g++) sysRec.flagMeta[newlyFlagged[g]].issueUrl = issueUrl; }
  }

  sysRec.history.push({ at: new Date(now).toISOString(), text: "flagged: "+fields.join(", ")+(noteR.cleaned?" -- \""+noteR.cleaned+"\"":"") });
  if(sysRec.history.length>30) sysRec.history=sysRec.history.slice(-30);

  try { await githubPutFile(token, current.data, current.sha, "Flag "+fields.join(",")+" on "+flagKey); }
  catch(e){ return json(502, {ok:false, error:"Could not save to shared data store: "+e.message}); }

  invalidateGetCache();

  return json(200, {ok:true, address: address, fields: fields, issueCreated: !!issueUrl});
};

export const config = { path: "/.netlify/functions/flag-dispute" };
