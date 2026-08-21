/* ============================================================
   NMS Galactic Map — system-edit Netlify Function
   Endpoint: /.netlify/functions/system-edit

   POST body: { action: "edit"|"report"|"resolve-flag", address, payload }
     address = the 12-char portal hex address the edit applies to
     "edit"   payload = {name, race, region, stars:[colourKey,...] (max 3), starClass, water, dissonant,
                         giant, ruins, outlaw, phantom, econName, sell, buy, econDesc, conflict, blackHole, atlas, notes,
                         editorName, editorFriendCode, colliding, collidingA, collidingB,
                         bodies:[{name, moon, orbits, biome, descriptor, water, ring, resources,
                                  flora, fauna, minerals, salvage, fossils, sentinel, autophage, base, baseName}, ...]}
                         (base added 2026-08-17 -- "Has base" per-body marker, same manual-only
                         pattern as autophage. baseName added 2026-08-21 -- the base's own name,
                         30-char cap same as a body's own `name`; deliberately its own field, NEVER
                         merged into a body's or the system's own name (see the save-file
                         bulk-import bug fixed the same day: a base name silently became the STAR
                         system's name). The client also copies it into the system's `notes` at
                         save time for visibility, but this is the field tying the name to the
                         actual body it belongs to. fauna added 2026-08-17 -- same shape/24-char-per-item
                         limit as flora/minerals/salvage/fossils, see filter.mjs's resArr().)
                         (ruins added 2026-08-14; phantom was already validated/shown but is only
                         actually persisted as of the same date -- see getCategoryValue's comment.
                         editorName/editorFriendCode added 2026-08-16 -- optional "who documented
                         this" attribution, always overwrites directly, NOT part of TOP_CATS/the
                         flag-consensus system below, see filter.mjs's comment on why. outlaw added
                         2026-08-17 -- Tony caught that picking the "Pirate Controlled" conflict word
                         didn't set this separate skull/tag flag, same manual-only pattern as
                         giant/ruins/blackHole/atlas. colliding/collidingA/collidingB added
                         2026-08-17 -- display-only "these two planets visually overlap" flag, built
                         client-side in a separate session but never actually added to this
                         allowlist until now -- see filter.mjs's own comment on that same field for
                         why it's a manual pick, not derived data.)
     "report" payload = {reason}
     "bulk-import" payload = {entries:[{address, names:[...]}...], editorName, editorFriendCode}
                    Added 2026-08-18 alongside nms-core/save-import/ (client-side save.hg
                    parser) -- a visitor who's parsed their OWN save file in their own
                    browser can offer to import their real bases in one batch instead of
                    one Edit-system submission per system. See filterBulkImport() in
                    filter.mjs and handleBulkImport() below for the full behaviour
                    (existing community data on a system is never blanked out, only
                    name-if-blank and notes get touched; rate-limited separately and much
                    more strictly than a normal edit, since it's a much heavier write).
     "resolve-flag" (admin only, requires ?token=<ADMIN_TOKEN> on the URL) payload =
                    {field, resolution:"dispute"|"dismiss"|"set-value", value?}
                    field is one of FLAG_FIELDS or "bodies.N" -- see lib/shared.mjs.

   Field-level flag/dispute tracking (added for EDIT-TRACKING-AND-DISPUTES.md):
     Fields a visitor has flagged live in each system record's flaggedFields
     array (amber in the UI); fields Tony's personally reviewed and confirmed
     as a real problem move to disputedFields (red). See flag-dispute.mjs for
     how a field GETS flagged in the first place -- this file only handles
     what happens to a flagged/disputed field when a NEW "edit" submission
     comes in for it, and how Tony clears one via "resolve-flag".

     Consensus, not chronology: a normal edit to a field that is NOT
     currently flagged/disputed still just overwrites it directly, exactly
     as before this feature existed -- that's the common case and doesn't
     need to change. But a field that IS flagged/disputed is genuinely
     contested, so a new submission for it is recorded as a VOTE
     (fieldVotes[category], deduped by editor) instead of blindly
     overwriting what's shown. Once 2+ DIFFERENT editors' votes agree on the
     same value, that value locks in as canonical and the flag/dispute
     clears automatically -- no review needed. Until then the field stays
     flagged/disputed and keeps showing whatever it showed before (a single
     contested edit can never silently become the new "truth" on its own).
     See voteAndMaybeResolve() below, and EDIT-TRACKING-AND-DISPUTES.md for
     the original spec this implements (deliberately coarsened from a
     leaf-field-per-vote model to 13 whole-row categories -- see FLAG_FIELDS
     in lib/shared.mjs for why).

   Flow (edit/report, unchanged from before this feature):
     1. Rate-limit by IP (very simple in-memory-per-invocation + a
        rolling log kept in the same GitHub JSON file, since
        Netlify Functions are stateless between cold starts).
     2. Run the shared content filter (filter.mjs) — same rules the
        client already applied, but this copy is authoritative.
     3. Read the current data/overrides.json from GitHub (Contents API).
     4. Merge in the edit / report / resolution.
     5. Commit the updated file back to GitHub (Contents API), which
        is also the free full revert history Tony asked about --
        every past version is a git commit he can look at or roll
        back on github.com without any extra tooling.

   Public GET caching (added for traffic-wave resilience):
     Every visitor's page load calls GET once to merge live community
     edits over the procedural map (loadOverrides() in preview.html).
     Uncached, that's one live GitHub Contents-API read per visitor
     against the token's shared 5,000-req/hour limit. GET now keeps a
     30s in-memory copy (lib/shared.mjs's getGetCache/setGetCache) and sets
     Cache-Control so a burst of visitors in the same window shares one
     GitHub read, and serves that last-known-good copy instead of failing
     outright if GitHub is briefly rate-limited/unreachable. The cache is
     cleared the moment ANY write succeeds (edit, flag, resolve-flag, or
     the scheduled sweep), so the very next visitor's load sees it, not a
     stale pre-write copy. The admin view (?token=<ADMIN_TOKEN>) always
     bypasses the cache and reads live -- Tony should never see a stale
     reports/flags queue.

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
   And one more used only by the admin view/resolve-flag action:
     ADMIN_TOKEN    -- any random string Tony picks, passed as
                       ?token=... to prove it's really him.
   ============================================================ */

import { filterSystemEdit, filterReport, filterBulkImport } from "./filter.mjs";
import {
  json, isValidAddress, githubGetFile, githubPutFile, pruneLog,
  editorHash, getGetCache, setGetCache, invalidateGetCache,
  isValidFlagField
} from "./lib/shared.mjs";

const MAX_EDITS_PER_IP_PER_HOUR = 8;
const MAX_REPORTS_PER_IP_PER_HOUR = 15;
const GET_CACHE_TTL_MS = 30 * 1000;
const MAX_VOTES_PER_FIELD = 20;   // oldest dropped once a field's vote ledger passes this
const MAX_HISTORY_PER_SYSTEM = 30; // oldest dropped once a system's audit log passes this
const MAX_BULK_IMPORTS_PER_IP_PER_DAY = 1; // save-file import is a much heavier write than a normal edit -- one per IP per day is plenty for a real visitor, and blocks abuse

/* Reads one of the 13 flag categories' current value out of a
   filterSystemEdit()-shaped payload (`out`) or an already-saved `data`
   object (same shape). "suffix" and "economy" are small grouped objects
   since they render as one combined row in the info panel -- see the
   FLAG_FIELDS comment in lib/shared.mjs. */
function getCategoryValue(out, category){
  if(!out) return undefined;
  var m = /^bodies\.(\d)$/.exec(category);
  if(m){ var bi=+m[1]; return (out.bodies && out.bodies[bi]) ? out.bodies[bi] : null; }
  switch(category){
    case "name": return out.name;
    case "race": return out.race;
    case "region": return out.region;
    case "starClass": return out.starClass;
    case "stars": return out.stars;
    case "suffix": return { water: !!out.water, dissonant: !!out.dissonant };
    case "giant": return !!out.giant;
    case "economy": return { econName: out.econName, sell: out.sell, buy: out.buy, econDesc: out.econDesc };
    case "conflict": return out.conflict;
    case "blackHole": return !!out.blackHole;
    case "atlas": return !!out.atlas;
    // Ruins (2026-08-14, hyperdrive-types.docx task 9): plain boolean, same
    // pattern as giant/blackHole/atlas above.
    case "ruins": return !!out.ruins;
    // Outlaw (2026-08-17): plain boolean, same pattern as ruins/giant/
    // blackHole/atlas above.
    case "outlaw": return !!out.outlaw;
    // Phantom / Shadow Star -- was validated by filterSystemEdit() and shown
    // in the Edit system modal since it was added, but never actually wired
    // into TOP_CATS/getCategoryValue/applyCategoryValue below, so a
    // traveller's phantom/shadow submission was silently dropped before it
    // ever reached the shared data store. Found while wiring ruins through
    // this same code path -- genuinely pre-existing, unrelated to ruins
    // itself, fixed alongside since it's the identical one-line pattern.
    case "phantom": return out.phantom || "";
    case "notes": return out.notes;
    // Colliding planets (2026-08-17): bundled the same way "suffix" bundles
    // water+dissonant above -- colliding/collidingA/collidingB are one
    // traveller pick (display-only pairing), so they go through consensus
    // together, not as 3 independently-flaggable fields.
    case "colliding": return { colliding: !!out.colliding, collidingA: out.collidingA||0, collidingB: out.collidingB||0 };
    default: return undefined;
  }
}

/* Writes a resolved category value back into a canonical `data` object,
   keeping it in the exact same shape filterSystemEdit() produces so the
   client's applyOverride() (which reads that shape directly) doesn't need
   to know or care whether a field's current value came from a normal
   direct edit or a consensus resolution. */
function applyCategoryValue(data, category, value){
  var m = /^bodies\.(\d)$/.exec(category);
  if(m){
    var bi=+m[1];
    if(!Array.isArray(data.bodies)) data.bodies=[];
    while(data.bodies.length<=bi) data.bodies.push(null);
    data.bodies[bi]=value;
    return;
  }
  switch(category){
    case "name": data.name=value; return;
    case "race": data.race=value; return;
    case "region": data.region=value; return;
    case "starClass": data.starClass=value; return;
    case "stars": data.stars=value; return;
    case "suffix": data.water=!!value.water; data.dissonant=!!value.dissonant; return;
    case "giant": data.giant=!!value; return;
    case "economy":
      data.econName=value.econName; data.sell=value.sell; data.buy=value.buy; data.econDesc=value.econDesc;
      return;
    case "conflict": data.conflict=value; return;
    case "blackHole": data.blackHole=!!value; return;
    case "atlas": data.atlas=!!value; return;
    case "ruins": data.ruins=!!value; return;
    case "outlaw": data.outlaw=!!value; return;
    case "phantom": data.phantom=value; return;
    case "notes": data.notes=value; return;
    case "colliding":
      data.colliding=!!value.colliding; data.collidingA=value.collidingA||0; data.collidingB=value.collidingB||0;
      return;
  }
}

function pushHistory(sysRec, line, now){
  if(!Array.isArray(sysRec.history)) sysRec.history=[];
  sysRec.history.push({ at: new Date(now).toISOString(), text: line });
  if(sysRec.history.length > MAX_HISTORY_PER_SYSTEM) sysRec.history=sysRec.history.slice(-MAX_HISTORY_PER_SYSTEM);
}

/* Records one editor's vote for a currently flagged/disputed category and
   resolves it the moment 2+ DIFFERENT editors agree on the same value.
   Returns true if this call resolved (and thus changed) the category's
   canonical value, false if it just added to the ledger. Deliberately
   counts DISTINCT editorHash values in the winning group, not raw vote
   count -- one editor re-submitting the same form five times must never
   look like 5 people agreeing. */
function voteAndMaybeResolve(sysRec, category, value, edHash, now){
  if(!sysRec.fieldVotes) sysRec.fieldVotes={};
  var votes = sysRec.fieldVotes[category] || [];
  votes.push({ value: value, editorHash: edHash, ts: now });
  if(votes.length > MAX_VOTES_PER_FIELD) votes = votes.slice(-MAX_VOTES_PER_FIELD);
  sysRec.fieldVotes[category]=votes;

  var groups = {}; // JSON(value) -> {value, editors:Set}
  for(var i=0;i<votes.length;i++){
    var key = JSON.stringify(votes[i].value);
    if(!groups[key]) groups[key] = { value: votes[i].value, editors: new Set() };
    groups[key].editors.add(votes[i].editorHash);
  }
  var winner=null, winnerCount=0;
  for(var k in groups){
    if(groups[k].editors.size > winnerCount){ winner=groups[k]; winnerCount=groups[k].editors.size; }
  }
  if(winner && winnerCount>=2){
    if(!sysRec.data) sysRec.data={};
    applyCategoryValue(sysRec.data, category, winner.value);
    sysRec.flaggedFields=(sysRec.flaggedFields||[]).filter(function(f){ return f!==category; });
    sysRec.disputedFields=(sysRec.disputedFields||[]).filter(function(f){ return f!==category; });
    delete sysRec.fieldVotes[category];
    if(sysRec.flagMeta) delete sysRec.flagMeta[category];
    pushHistory(sysRec, category+" resolved by consensus ("+winnerCount+" editors agreed)", now);
    return true;
  }
  return false;
}

async function handleGet(req, token){
  // Tony-only view: append ?token=<ADMIN_TOKEN> (set as a Netlify env var,
  // separate from GITHUB_TOKEN) to also see the flagged/reports queue, so he
  // can periodically skim it without digging through raw JSON on GitHub.
  // This path always reads live and is never cached or served from cache --
  // Tony reviewing reports should never see a stale or public-only copy.
  var url = new URL(req.url);
  var suppliedAdminToken = url.searchParams.get("token");
  var adminToken = process.env.ADMIN_TOKEN;
  var isAdmin = !!(adminToken && suppliedAdminToken && suppliedAdminToken === adminToken);

  var now = Date.now();
  var cacheHeaders = { "Cache-Control": "public, max-age=30, s-maxage=30" };
  var cache = getGetCache();

  if(!isAdmin && cache.data && (now - cache.fetchedAt) < GET_CACHE_TTL_MS){
    return json(200, cache.data, cacheHeaders);
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
    if(!isAdmin && cache.data) return json(200, cache.data, cacheHeaders);
    return json(502, {ok:false, error:"Could not read shared data store: "+e.message});
  }

  // Public response: every visitor's page load calls this to merge live
  // edits over the procedural defaults, so it must never leak submitter IPs
  // or flag notes/reporter identity -- only enough for field-status colours
  // (flaggedFields/disputedFields are just field-name arrays, no detail).
  var publicSystems = {};
  for(var addr in current.data.systems){
    var rec = current.data.systems[addr];
    publicSystems[addr] = {
      data: rec.data, editedAt: rec.editedAt,
      flaggedFields: rec.flaggedFields||[], disputedFields: rec.disputedFields||[]
    };
  }

  var out = { ok:true, systems: publicSystems };

  if(isAdmin){
    out.reports = current.data.reports;
    // Flat review queue: every currently-flagged field across every system,
    // with the detail (note, reporter, when, vote progress) the public
    // payload above deliberately omits -- this IS the amber queue the
    // EDIT-TRACKING-AND-DISPUTES.md spec describes as "things I haven't
    // looked at yet".
    var queue=[];
    for(var a2 in current.data.systems){
      var r2=current.data.systems[a2];
      var flags=r2.flaggedFields||[];
      for(var fi=0; fi<flags.length; fi++){
        var meta=(r2.flagMeta&&r2.flagMeta[flags[fi]])||{};
        queue.push({
          address:a2, field:flags[fi], note:meta.note||"", flaggedAt:meta.flaggedAt||null,
          issueUrl:meta.issueUrl||null,
          votes:(r2.fieldVotes&&r2.fieldVotes[flags[fi]])?r2.fieldVotes[flags[fi]].length:0
        });
      }
    }
    out.flagQueue=queue;
    out.disputed=[];
    for(var a3 in current.data.systems){
      var r3=current.data.systems[a3];
      var disp=r3.disputedFields||[];
      for(var di=0; di<disp.length; di++) out.disputed.push({address:a3, field:disp[di]});
    }
    return json(200, out); // admin view: always live, never cached/served-from-cache
  }

  setGetCache(out, now);
  return json(200, out, cacheHeaders);
}

/* Bulk save-file import (2026-08-18) -- see filter.mjs's filterBulkImport()
   header comment for why this exists as its own action instead of looping
   the normal single-system "edit" action. ONE githubGetFile + merge loop +
   ONE githubPutFile for the whole batch, same "respect existing community
   data" principle as a normal edit: a system that already has real
   TOP_CATS data (race/economy/conflict/etc, submitted by some other
   traveller) never gets that data silently blanked out by an import --
   only `notes` (appended, deduped) is ever touched on an existing system.
   A base name is NEVER written into `name` (that field is the STAR
   SYSTEM's name, not a base's -- a save file only ever tells us base
   names, never the real system name, so writing one into the other was a
   real bug caught 2026-08-18 from a live report: elegra1965's own base
   "Elegraynor Portal" ended up displayed as the star's name). A brand-new
   address gets a fresh minimal record, same shape a normal partial edit already
   produces. */
async function handleBulkImport(req, token, body, ip, now){
  var filtered = filterBulkImport(body.payload);
  if(!filtered.ok){
    return json(422, {ok:false, error:"Rejected by content filter", details: filtered.errors});
  }

  var current;
  try { current = await githubGetFile(token); }
  catch(e){ return json(502, {ok:false, error:"Could not read shared data store: "+e.message}); }

  if(!current.data.bulkImportLog) current.data.bulkImportLog = {};
  var HOUR = 3600*1000, DAY = 24*HOUR;
  var hits = (current.data.bulkImportLog[ip]||[]).filter(function(ts){ return now-ts < DAY; });
  if(hits.length >= MAX_BULK_IMPORTS_PER_IP_PER_DAY){
    return json(429, {ok:false, error:"Only one save-file import per day from this connection. Try again tomorrow, or add systems individually via Edit system."});
  }
  hits.push(now);
  current.data.bulkImportLog[ip] = hits;

  var added=0, merged=0;
  for(var i=0;i<filtered.cleaned.entries.length;i++){
    var entry = filtered.cleaned.entries[i];
    var sysRec = current.data.systems[entry.address];
    var noteLine = entry.names.length>1
      ? "Real bases from a traveller's save: "+entry.names.join("; ")
      : "Real base from a traveller's save: "+entry.names[0];

    if(!sysRec){
      current.data.systems[entry.address] = {
        flaggedFields: [], disputedFields: [],
        data: {
          // name deliberately left blank -- a base name is NOT the star
          // system's name, and a save file never tells us the real one
          // (see the header comment above). Leaving it blank means the
          // procedural name still shows until someone actually documents
          // the real system name via Edit system.
          name: "", race:"", region:"", starClass:"", stars:[],
          water:false, dissonant:false, giant:false,
          econName:"", sell:"", buy:"", econDesc:"", conflict:"",
          blackHole:false, atlas:false, ruins:false, outlaw:false, phantom:"",
          notes: noteLine, colliding:false, collidingA:0, collidingB:0,
          editorName: filtered.cleaned.editorName, editorFriendCode: filtered.cleaned.editorFriendCode,
          bodies: []
        },
        editedAt: new Date(now).toISOString(),
        editedByIp: ip,
        history: [{ at: new Date(now).toISOString(), text: "Imported from a traveller's real save file (base name/address)" }]
      };
      added++;
    } else {
      if(!sysRec.data) sysRec.data = {};
      var existingNotes = sysRec.data.notes || "";
      if(existingNotes.indexOf(noteLine) < 0){
        sysRec.data.notes = existingNotes ? (existingNotes+" | "+noteLine) : noteLine;
      }
      sysRec.data.editorName = filtered.cleaned.editorName || sysRec.data.editorName || "";
      sysRec.data.editorFriendCode = filtered.cleaned.editorFriendCode || sysRec.data.editorFriendCode || "";
      sysRec.editedAt = new Date(now).toISOString();
      pushHistory(sysRec, "real base name(s) merged in from a traveller's save-file import", now);
      merged++;
    }
  }

  try {
    await githubPutFile(token, current.data, current.sha,
      "Bulk save-file import: "+added+" new, "+merged+" merged ("+(filtered.cleaned.editorName||"anonymous")+")");
  } catch(e){
    return json(502, {ok:false, error:"Could not save to shared data store: "+e.message});
  }

  invalidateGetCache();
  return json(200, {ok:true, added:added, merged:merged, total:filtered.cleaned.entries.length});
}

async function handleResolveFlag(req, token, body){
  var url = new URL(req.url);
  var suppliedAdminToken = url.searchParams.get("token");
  var adminToken = process.env.ADMIN_TOKEN;
  if(!adminToken || suppliedAdminToken !== adminToken){
    return json(403, {ok:false, error:"Admin token required (add ?token=... to the URL)"});
  }
  var address=body.address, field=body.payload && body.payload.field;
  var resolution=body.payload && body.payload.resolution;
  if(!isValidAddress(address)) return json(400, {ok:false, error:"address must be a 12-character hex portal address"});
  if(!isValidFlagField(field)) return json(400, {ok:false, error:"Unknown field: "+field});
  if(["dispute","dismiss","set-value"].indexOf(resolution)<0) return json(400, {ok:false, error:"resolution must be dispute, dismiss, or set-value"});

  var current;
  try { current = await githubGetFile(token); }
  catch(e){ return json(502, {ok:false, error:"Could not read shared data store: "+e.message}); }

  var sysRec = current.data.systems[address];
  if(!sysRec) return json(404, {ok:false, error:"No record for this system"});
  var now=Date.now();

  if(resolution==="dispute"){
    sysRec.flaggedFields=(sysRec.flaggedFields||[]).filter(function(f){ return f!==field; });
    if(!sysRec.disputedFields) sysRec.disputedFields=[];
    if(sysRec.disputedFields.indexOf(field)<0) sysRec.disputedFields.push(field);
    pushHistory(sysRec, field+" confirmed as a real dispute by elegra1965", now);
  } else if(resolution==="dismiss"){
    sysRec.flaggedFields=(sysRec.flaggedFields||[]).filter(function(f){ return f!==field; });
    sysRec.disputedFields=(sysRec.disputedFields||[]).filter(function(f){ return f!==field; });
    if(sysRec.fieldVotes) delete sysRec.fieldVotes[field];
    if(sysRec.flagMeta) delete sysRec.flagMeta[field];
    pushHistory(sysRec, field+" flag dismissed by elegra1965 (data was fine)", now);
  } else { // set-value
    var value = body.payload.value;
    if(!sysRec.data) sysRec.data={};
    applyCategoryValue(sysRec.data, field, value);
    sysRec.flaggedFields=(sysRec.flaggedFields||[]).filter(function(f){ return f!==field; });
    sysRec.disputedFields=(sysRec.disputedFields||[]).filter(function(f){ return f!==field; });
    if(sysRec.fieldVotes) delete sysRec.fieldVotes[field];
    if(sysRec.flagMeta) delete sysRec.flagMeta[field];
    pushHistory(sysRec, field+" corrected directly by elegra1965", now);
  }

  try { await githubPutFile(token, current.data, current.sha, "Resolve flag "+field+" on "+address); }
  catch(e){ return json(502, {ok:false, error:"Could not save to shared data store: "+e.message}); }

  invalidateGetCache();
  return json(200, {ok:true});
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

  if(action === "resolve-flag") return handleResolveFlag(req, token, body);

  // Netlify supplies the real client IP in this header on their edge network.
  var ip = req.headers.get("x-nf-client-connection-ip") || context.ip || "unknown";
  var now = Date.now();

  if(action === "bulk-import") return handleBulkImport(req, token, body, ip, now);

  var address = body.address;
  if(action !== "edit" && action !== "report") return json(400, {ok:false, error:"action must be 'edit', 'report', 'bulk-import', or 'resolve-flag'"});
  if(!isValidAddress(address)) return json(400, {ok:false, error:"address must be a 12-character hex portal address"});

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

  current.data.ipLog = pruneLog(current.data.ipLog, now);
  var ipHits = current.data.ipLog[ip] || [];
  var limit = action === "edit" ? MAX_EDITS_PER_IP_PER_HOUR : MAX_REPORTS_PER_IP_PER_HOUR;
  if(ipHits.length >= limit){
    return json(429, {ok:false, error:"Too many submissions from this connection in the last hour. Try again later."});
  }
  ipHits.push(now);
  current.data.ipLog[ip] = ipHits;

  var commitMessage;
  if(action === "edit"){
    var edHash = await editorHash(ip);
    var sysRec = current.data.systems[address];
    if(!sysRec) sysRec = current.data.systems[address] = { flaggedFields:[], disputedFields:[] };
    if(!sysRec.flaggedFields) sysRec.flaggedFields=[];
    if(!sysRec.disputedFields) sysRec.disputedFields=[];
    if(!sysRec.data) sysRec.data={};

    // Fields currently under review (flagged or disputed) don't just get
    // silently overwritten by whoever submits next -- see voteAndMaybeResolve()
    // and the module header comment above. Everything else behaves exactly
    // as it always has: direct overwrite.
    var underReview = sysRec.flaggedFields.concat(sysRec.disputedFields);
    var resolvedAny=false;
    for(var ci=0; ci<underReview.length; ci++){
      var cat = underReview[ci];
      var newVal = getCategoryValue(filtered.cleaned, cat);
      if(voteAndMaybeResolve(sysRec, cat, newVal, edHash, now)) resolvedAny=true;
    }
    // Re-read after voting -- a resolution above may have just cleared one
    // or more categories from flaggedFields/disputedFields.
    var stillUnderReview = sysRec.flaggedFields.concat(sysRec.disputedFields);

    var TOP_CATS = ["name","race","region","starClass","stars","suffix","giant","economy","conflict","blackHole","atlas","ruins","outlaw","phantom","notes","colliding"];
    for(var ti=0; ti<TOP_CATS.length; ti++){
      if(stillUnderReview.indexOf(TOP_CATS[ti])>=0) continue;
      applyCategoryValue(sysRec.data, TOP_CATS[ti], getCategoryValue(filtered.cleaned, TOP_CATS[ti]));
    }

    // Attribution metadata -- always a direct overwrite, not gated behind
    // flag/dispute review like TOP_CATS above (see filter.mjs's comment).
    sysRec.data.editorName = filtered.cleaned.editorName || "";
    sysRec.data.editorFriendCode = filtered.cleaned.editorFriendCode || "";

    // Bodies: the submitted form always describes the traveller's FULL
    // current body list (there's no partial-body-list concept client-side,
    // same as every edit before this feature existed) -- so the simple case
    // (no body under dispute) is just "take the new list wholesale", exactly
    // like before. If some index IS still under review, keep that one slot's
    // PRE-EDIT value instead of letting this submission quietly change a
    // contested planet while a vote is in progress -- unless the traveller's
    // new list no longer has a body at that index at all (they removed it),
    // in which case there's nothing left to dispute, so the flag is dropped.
    var bodyReview = stillUnderReview.filter(function(f){ return /^bodies\.\d$/.test(f); });
    var newBodies = (filtered.cleaned.bodies||[]).slice();
    for(var bi=0; bi<bodyReview.length; bi++){
      var idx = +bodyReview[bi].split(".")[1];
      if(idx < newBodies.length){
        newBodies[idx] = (sysRec.data.bodies && sysRec.data.bodies[idx]) || null;
      } else {
        sysRec.flaggedFields = sysRec.flaggedFields.filter(function(f){ return f!==bodyReview[bi]; });
        sysRec.disputedFields = sysRec.disputedFields.filter(function(f){ return f!==bodyReview[bi]; });
      }
    }
    sysRec.data.bodies = newBodies;

    sysRec.editedAt = new Date(now).toISOString();
    sysRec.editedByIp = ip;
    pushHistory(sysRec, "edited by a traveller"+(resolvedAny?" (also resolved a flagged field by consensus)":""), now);
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

  invalidateGetCache();

  return json(200, {ok:true, address: address, action: action});
};

export const config = { path: "/.netlify/functions/system-edit" };
