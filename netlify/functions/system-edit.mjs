/* ============================================================
   NMS Galactic Map — system-edit Netlify Function
   Endpoint: /.netlify/functions/system-edit

   POST body: { action: "edit"|"report"|"resolve-flag"|"bulk-import", address, galaxy, payload }
     address = the 12-char portal hex address the edit applies to
     galaxy  = the 0-255 galaxy index the address is being documented in (added
               2026-08-22 for real per-galaxy addressing -- see TODO.md's "Real
               per-galaxy addressing" entry and lib/shared.mjs's compositeKey()
               comment for the full "why": a portal address alone doesn't say
               which of the 257 galaxies it's in, so every systems-dict record
               is now keyed "galaxy:ADDRESS", not just ADDRESS. Required for
               "edit"/"report"/"resolve-flag"; "bulk-import" carries its own
               per-entry galaxy instead, see filterBulkImport() in filter.mjs.)
     "edit"   payload = {name, race, region, stars:[colourKey,...] (max 3), starClass, water, dissonant,
                         giant, ruins, outlaw, abandoned, phantom, econName, sell, buy, econDesc, conflict, blackHole, atlas, notes,
                         screenshot, editorName, editorFriendCode, genVersion, colliding, collidingA, collidingB,
                         hasStation, stationName, allianceName, stationPhoto,
                         signals:[{name, category, icon, signalType, route, planet}, ...] (max 6),
                         bodies:[{name, moon, orbits, biome, subtype, descriptor, water, ring, resources,
                                  flora, fauna, minerals, salvage, fossils, sentinel, autophage,
                                  reliquary, ruins, base, baseName}, ...]}
                         (subtype added 2026-09-08 -- Sub type, split out of Biome per Tony ("BIOME
                         'radioactive' / SUB TYPE 'nuclear' / CONDITIONS 'frequent radioactive
                         storms'"): the real on-screen wording a traveller saw ("Isotopic"), kept
                         separate from the canonical `biome` key it maps to instead of being
                         thrown away the way it used to be when it was only a search alias.
                         `descriptor` is unchanged internally -- only its UI label ("Conditions")
                         and suggestion source changed, see preview.html's CONDITIONS_CANON.)
                         (reliquary/ruins added 2026-09-08 -- TWO separate per-body "has
                         Reliquary"/"has ruins" markers, same manual-only pattern as autophage,
                         deliberately split into 2 checkboxes per Tony ("should be 2 separate
                         tick boxes not together"). Together they replace "The Reliquary" as a
                         selectable biome client-side -- research found it's actually a
                         prefix/suffix TAG the real game layers onto an existing biome
                         ("Abandoned Desert", "Dusty Relic"), not a 13th category of its own.
                         Per-body `ruins` reuses the field name already used by the system-level
                         `ruins` flag below (Ancient Ruins surface POI: Knowledge Stones + memoir
                         device) -- same precedent as `water` already existing at both system
                         and per-body level in this same payload shape, not an actual collision.)
                         (screenshot added 2026-09-01 -- an optional public photo, see
                         resolveScreenshotUpload() and lib/shared.mjs's screenshot helpers for the
                         full "why one file per upload, not per system" reasoning.)
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
                         flag-consensus system below, see filter.mjs's comment on why. genVersion
                         added 2026-08-22 -- NOT user content, an automatic marker of which
                         GEN_VERSION (preview.html) the submitting browser was running, prep work
                         for detecting when a future game update (e.g. the real, teased "Cosmos")
                         has made the procedural generator itself out of date relative to already-
                         submitted data; same always-overwrites/not-in-TOP_CATS treatment as
                         editorName since it's metadata about the submission, not contestable
                         content -- see filter.mjs's isValidGenVersion() and preview.html's own
                         GEN_VERSION comment for the full why. Deliberately not used for anything
                         yet beyond being recorded. outlaw added
                         2026-08-17 -- Tony caught that picking the "Pirate Controlled" conflict word
                         didn't set this separate skull/tag flag, same manual-only pattern as
                         giant/ruins/blackHole/atlas. colliding/collidingA/collidingB added
                         2026-08-17 -- display-only "these two planets visually overlap" flag, built
                         client-side in a separate session but never actually added to this
                         allowlist until now -- see filter.mjs's own comment on that same field for
                         why it's a manual pick, not derived data. hasStation/stationName added
                         2026-09-09 -- Space Station Directorship, from the real "Cosmos" 10th-
                         anniversary update (Update 7.0), released the same day. Foundation pass
                         per Tony's own framing ("lay the foundation down and update as we go
                         along") -- system-level manual boolean + a 30-char name, same pattern as
                         every other special-feature flag in this payload. This is exactly the
                         kind of real-game-content change genVersion above was built to anticipate,
                         but genVersion itself is untouched by this: it tracks when the PROCEDURAL
                         GENERATOR's own output goes stale, and station directorship is manual-only
                         data with no generateSystem() involvement at all. stationPhoto added
                         the same day as a same-session follow-up, once Tony asked about letting a
                         visitor upload a real photo of their station -- a DEDICATED upload
                         (Tony's own explicit pick over reusing the general `screenshot` field
                         above), resolved through the exact same resolveScreenshotUpload()/
                         filterScreenshot() machinery, just called a second time with its own
                         editKey suffix so it always lands in its own uniquely-named file, never
                         colliding with a system's separate general screenshot upload.)
                         allianceName added 2026-09-10 -- checked against the real Cosmos patch
                         notes before adding this: founding an alliance is its own separate,
                         OPTIONAL action a station director may take ("directors may found their
                         own alliance and seek like minded travellers to join their collective"),
                         not a requirement of simply naming/personalising a station, and not
                         scoped to one system/region the way stationName is (an alliance can span
                         every system its founder directs; other travellers can join up to 3).
                         Kept as a plain optional 30-char string here regardless, same "foundation
                         pass, more detail later" framing as station itself -- bundled into the
                         same "station" consensus category rather than given its own, since it's
                         still one traveller's station-directorship pick.)
                         allianceBadge added same day, same-session follow-up once Tony noticed the
                         Edit system form had nowhere to actually attach one: unlike stationPhoto
                         above, this is NOT part of the "station" TOP_CATS category and is never
                         written onto sysRec.data at all -- it's resolved (see the "edit" handler
                         below) and then upserted into the top-level data.alliances dict, keyed by
                         allianceName via normalizeAllianceKey() (lib/shared.mjs), since one alliance
                         spans every system its founder directs and needs ONE shared badge, not a
                         separate photo per system. See upsertAllianceBadge()'s own header comment
                         for the full design (why it's name-keyed, and its lightweight 2-editor
                         consensus once an alliance already has a badge).)
                         signals added 2026-09-09 -- the "Cosmos" system-view click-to-inspect
                         diamond icons (resource/signal markers). One is drawn automatically per
                         planet/moon already, straight off `bodies`, with no data of its own -- this
                         array is only the EXTRA ones a traveller adds by hand for real standalone
                         points of interest the generator has no equivalent for at all (asteroid
                         belts, comet fragments, wreck fields). Per Tony's own pick ("Full custom
                         card"), every field is free-typed to match what the traveller actually saw
                         in-game rather than picked from a fixed list, same reasoning as
                         baseName/stationName above. `planet` is an OPTIONAL 1-based link into THIS
                         SAME submitted `bodies` array (identical shape/clamping to a moon's `orbits`
                         or colliding's collidingA/collidingB above) -- 0 means "not linked to any
                         body", rendered client-side as a free-floating marker instead of one that
                         rides along with a planet's orbit. Capped at 6 per system, same cap as
                         `bodies` itself. Bundled as one consensus-voted TOP_CATS unit (see
                         getCategoryValue's comment below) rather than 6 independently-flaggable
                         rows, same precedent as "colliding" and "station" above -- deliberately NOT
                         added to FLAG_FIELDS/FLAG_CATEGORIES in lib/shared.mjs/preview.html. A 5th
                         icon value, "outpost", added same day (Tony's own "Barnyano Outpost Beta"
                         screenshot) -- deliberately manual-only, never wired into any procedural
                         per-planet path.)
     "report" payload = {reason}
     "bulk-import" payload = {entries:[{address, names:[...], planetNames:[{index,name}...],
                    systemName}...], editorName, editorFriendCode, genVersion}
                    Added 2026-08-18 alongside nms-core/save-import/ (client-side save.hg
                    parser) -- a visitor who's parsed their OWN save file in their own
                    browser can offer to import their real bases in one batch instead of
                    one Edit-system submission per system. See filterBulkImport() in
                    filter.mjs and handleBulkImport() below for the full behaviour
                    (existing community data on a system is never blanked out, only
                    name-if-blank and notes get touched; rate-limited separately and much
                    more strictly than a normal edit, since it's a much heavier write).
                    planetNames/systemName added 2026-08-21 -- real per-body and per-system
                    names read from DiscoveryManagerData, filtered client-side to the
                    traveller's own discoveries only (see extract-summary.js). Same "never
                    clobber" rule: systemName only fills a blank system name, planetNames
                    only ever grows a system's bodies array and only ever sets .name on the
                    slot(s) named, see applyPlanetNamesToBodies() below.
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
  isValidFlagField, isValidGalaxy, compositeKey, parseCompositeKey,
  githubPutBinaryFile, screenshotPathFor, screenshotUrlPrefix,
  addCommunityTerms, normalizeAllianceKey
} from "./lib/shared.mjs";

const MAX_EDITS_PER_IP_PER_HOUR = 8;
const MAX_REPORTS_PER_IP_PER_HOUR = 15;
const GET_CACHE_TTL_MS = 60 * 1000; // bumped from 30s now that the cache is shared via Netlify Blobs (2026-09-03) -- a launch-day traffic wave shares one GitHub read across ALL concurrent visitors, not just ones hitting the same warm container
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
    // Abandoned (2026-09-02): plain boolean, same pattern as outlaw/
    // ruins/giant/blackHole/atlas above -- independent of race so either
    // can be corrected on its own.
    case "abandoned": return !!out.abandoned;
    // Phantom / Shadow Star -- was validated by filterSystemEdit() and shown
    // in the Edit system modal since it was added, but never actually wired
    // into TOP_CATS/getCategoryValue/applyCategoryValue below, so a
    // traveller's phantom/shadow submission was silently dropped before it
    // ever reached the shared data store. Found while wiring ruins through
    // this same code path -- genuinely pre-existing, unrelated to ruins
    // itself, fixed alongside since it's the identical one-line pattern.
    case "phantom": return out.phantom || "";
    case "notes": return out.notes;
    // Screenshot (2026-09-01): a plain string, same treatment as notes --
    // by the time this runs, filtered.cleaned.screenshot has already been
    // resolved to a final hosted URL (or "") by resolveScreenshotUpload()
    // below, never a raw data: URL.
    case "screenshot": return out.screenshot||"";
    // Colliding planets (2026-08-17): bundled the same way "suffix" bundles
    // water+dissonant above -- colliding/collidingA/collidingB are one
    // traveller pick (display-only pairing), so they go through consensus
    // together, not as 3 independently-flaggable fields.
    case "colliding": return { colliding: !!out.colliding, collidingA: out.collidingA||0, collidingB: out.collidingB||0 };
    // Space Station Directorship (2026-09-09): bundled the same way "suffix"
    // bundles water+dissonant and "colliding" bundles its 3 fields -- one
    // traveller pick (has a station + what they named it), goes through
    // consensus together rather than as 2 independently-flaggable fields.
    // stationPhoto added same-session (2026-09-09): by the time this runs,
    // filtered.cleaned.stationPhoto has already been resolved to a final
    // hosted URL (or "") by its own resolveScreenshotUpload() call below --
    // same treatment as the general `screenshot` category above, just its
    // own dedicated field/upload/file.
    case "station": return { hasStation: !!out.hasStation, stationName: out.stationName||"", allianceName: out.allianceName||"", stationPhoto: out.stationPhoto||"" };
    // Resource / signal markers (2026-09-09): bundled the same way "colliding"
    // and "station" bundle their own fields above -- the whole array is one
    // consensus-voted unit, not 6 independently-flaggable rows. See the
    // payload-shape doc comment at the top of this file for the full "why".
    case "signals": return Array.isArray(out.signals) ? out.signals : [];
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
    case "abandoned": data.abandoned=!!value; return;
    case "phantom": data.phantom=value; return;
    case "notes": data.notes=value; return;
    case "screenshot": data.screenshot=value; return;
    case "colliding":
      data.colliding=!!value.colliding; data.collidingA=value.collidingA||0; data.collidingB=value.collidingB||0;
      return;
    case "station":
      data.hasStation=!!value.hasStation; data.stationName=value.stationName||""; data.allianceName=value.allianceName||""; data.stationPhoto=value.stationPhoto||"";
      return;
    case "signals": data.signals=Array.isArray(value)?value:[]; return;
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
/* Turns whatever filterSystemEdit() validated for `screenshot` into the
   value that actually gets stored on the system record. Three shapes can
   arrive here (see filter.mjs's filterScreenshot() for what's already been
   validated by this point):
     ""                            -> no screenshot, or the traveller removed
                                       it -- stored as-is, no GitHub I/O.
     "data:image/jpeg;base64,..."  -> a genuinely NEW photo -- gets committed
                                       to its own file (lib/shared.mjs's
                                       screenshot helpers), and only the
                                       resulting URL is ever returned/stored.
     any other "https://..."       -> an already-hosted screenshot URL the
                                       traveller didn't touch this submission
                                       (the Edit System modal always
                                       resubmits a system's full current
                                       state, same as every other field) --
                                       left exactly as it is, no new commit.
   Only the middle case does any GitHub I/O -- called BEFORE the
   flag/dispute consensus loop below runs, so a currently-flagged/disputed
   screenshot's new candidate photo is uploaded (so it HAS a URL to vote
   with) but never touches sysRec.data.screenshot unless that vote actually
   wins, exactly the same guarantee every other TOP_CATS field already gets
   -- see screenshotPathFor()'s own comment in lib/shared.mjs for why each
   upload gets a unique filename rather than overwriting one fixed path,
   which is what makes that guarantee possible here at all. */
async function resolveScreenshotUpload(token, editKey, rawValue){
  if(!rawValue || rawValue.indexOf("data:image/jpeg;base64,") !== 0) return rawValue || "";
  var base64 = rawValue.slice("data:image/jpeg;base64,".length);
  var path = screenshotPathFor(editKey);
  await githubPutBinaryFile(token, path, base64, "Add screenshot for "+editKey+" via site");
  return screenshotUrlPrefix()+path.split("/").pop();
}

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

/* Alliance badges (2026-09-10) -- a genuinely different shape of "shared"
   than anything else in this file. Every other TOP_CATS field above is
   scoped to ONE system record (compositeKey galaxy:ADDRESS), so even
   getting it wrong only ever affects that one system's visitors. An
   alliance badge is keyed by the alliance NAME instead (data.alliances,
   see normalizeAllianceKey() in lib/shared.mjs) precisely because it's
   NOT scoped that way in the real game -- the same reasoning that made
   Alliance name itself span every system its founder directs, and that
   made it worth indexing for search (buildSearchIndex() in preview.html).
   That also means literally any visitor typing the right alliance name
   could silently overwrite an alliance's shared badge for every OTHER
   system carrying it, which no per-system field risks -- Tony's own pick,
   when asked, was the "matches the real game" shared-profile design over
   a quick per-system clone of Station photo, on the understanding it
   needed its own moderation.

   Kept deliberately lightweight rather than a whole new voting UI: a
   brand-new alliance name (no existing data.alliances entry) sets its
   badge immediately from a single submission -- there's nothing yet to
   protect, and this is exactly how founding an alliance's name/station
   already works (first submission just becomes the value, same as every
   other unflagged field in this file). Once an alliance HAS a badge,
   changing it reuses the exact 2-distinct-editor consensus principle
   voteAndMaybeResolve() already applies to flagged/disputed system
   fields (own vote ledger, deduped by editorHash, oldest dropped past
   MAX_VOTES_PER_FIELD) rather than accepting the very next submission --
   this is the "its own moderation rules" the shared-profile design was
   flagged as needing. Never called at all when allianceBadge is "" (see
   filter.mjs's own comment on why "" from the client means "not touching
   this", not "remove") -- an existing shared badge is never blanked just
   because one submitter's own form didn't carry a new one. */
function upsertAllianceBadge(data, allianceName, badgeUrl, edHash, now, editorName){
  var key = normalizeAllianceKey(allianceName);
  if(!key || !badgeUrl) return;
  if(!data.alliances) data.alliances = {};
  var rec = data.alliances[key];
  if(!rec){
    data.alliances[key] = { name: allianceName, badgeUrl: badgeUrl, updatedAt: now, editorName: editorName||"", fieldVotes: [] };
    return;
  }
  rec.name = allianceName; // keep the display spelling fresh to whichever traveller most recently typed this same key
  if(rec.badgeUrl === badgeUrl) return; // resubmitting the badge that's already canonical -- nothing to vote on
  var votes = rec.fieldVotes || [];
  votes.push({ value: badgeUrl, editorHash: edHash, ts: now });
  if(votes.length > MAX_VOTES_PER_FIELD) votes = votes.slice(-MAX_VOTES_PER_FIELD);
  var groups = {}; // badgeUrl -> Set(editorHash)
  for(var i=0;i<votes.length;i++){
    var v = votes[i].value;
    if(!groups[v]) groups[v] = new Set();
    groups[v].add(votes[i].editorHash);
  }
  var winner=null, winnerCount=0;
  for(var v2 in groups){ if(groups[v2].size>winnerCount){ winner=v2; winnerCount=groups[v2].size; } }
  if(winner && winnerCount>=2){
    rec.badgeUrl = winner;
    rec.updatedAt = now;
    rec.fieldVotes = [];
  } else {
    rec.fieldVotes = votes;
  }
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
  var cacheHeaders = { "Cache-Control": "public, max-age=60, s-maxage=60" };
  var cache = await getGetCache();

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
  // Keys stay exactly as stored ("galaxy:ADDRESS") -- preview.html's own
  // skey()/loadOverrides() already build and look up that same composite
  // key client-side (see lib/shared.mjs's compositeKey() comment), so no
  // reshaping is needed here, just a straight copy of the public fields.
  var publicSystems = {};
  for(var key in current.data.systems){
    var rec = current.data.systems[key];
    publicSystems[key] = {
      data: rec.data, editedAt: rec.editedAt,
      flaggedFields: rec.flaggedFields||[], disputedFields: rec.disputedFields||[]
    };
  }

  // Alliance badges (2026-09-10): public, name-keyed, no per-editor detail
  // (fieldVotes/editorHash) leaked -- same "just enough to render, nothing
  // about who submitted what" treatment communityTerms already gets above.
  // preview.html's loadOverrides() reads this into ALLIANCES so the Edit
  // system modal can show an alliance's existing shared badge (see
  // renderEdAllianceBadge()) and the info panel can show it next to any
  // system's own "(Alliance: X)" tag (see updatePanel()'s allianceBadgeTagHtml()).
  var publicAlliances = {};
  for(var allKey in (current.data.alliances||{})){
    var allRec = current.data.alliances[allKey];
    publicAlliances[allKey] = { name: allRec.name, badgeUrl: allRec.badgeUrl||"", updatedAt: allRec.updatedAt||null };
  }

  var out = { ok:true, systems: publicSystems, communityTerms: current.data.communityTerms || {}, alliances: publicAlliances };

  if(isAdmin){
    out.reports = current.data.reports;
    // Flat review queue: every currently-flagged field across every system,
    // with the detail (note, reporter, when, vote progress) the public
    // payload above deliberately omits -- this IS the amber queue the
    // EDIT-TRACKING-AND-DISPUTES.md spec describes as "things I haven't
    // looked at yet".
    var queue=[];
    for(var k2 in current.data.systems){
      var r2=current.data.systems[k2];
      var parsed2 = parseCompositeKey(k2) || {galaxy:null, address:k2};
      var flags=r2.flaggedFields||[];
      for(var fi=0; fi<flags.length; fi++){
        var meta=(r2.flagMeta&&r2.flagMeta[flags[fi]])||{};
        queue.push({
          galaxy:parsed2.galaxy, address:parsed2.address, field:flags[fi], note:meta.note||"", flaggedAt:meta.flaggedAt||null,
          issueUrl:meta.issueUrl||null,
          votes:(r2.fieldVotes&&r2.fieldVotes[flags[fi]])?r2.fieldVotes[flags[fi]].length:0
        });
      }
    }
    out.flagQueue=queue;
    out.disputed=[];
    for(var k3 in current.data.systems){
      var r3=current.data.systems[k3];
      var parsed3 = parseCompositeKey(k3) || {galaxy:null, address:k3};
      var disp=r3.disputedFields||[];
      for(var di=0; di<disp.length; di++) out.disputed.push({galaxy:parsed3.galaxy, address:parsed3.address, field:disp[di]});
    }
    return json(200, out); // admin view: always live, never cached/served-from-cache
  }

  await setGetCache(out, now);
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
   produces.

   EXTENDED, 2026-08-21: also merges real planet names (entry.planetNames,
   from DiscoveryManagerData's Planet-type discoveries) and a real system
   name (entry.systemName, from a SolarSystem-type discovery) -- see
   extract-summary.js's header and filterBulkImport()'s comment in
   filter.mjs for the full "why" and the safety rules. systemName only ever
   fills a blank sysRec.data.name, never overwrites one. planetNames go
   through applyPlanetNamesToBodies() below, which is deliberately
   append-only: it only ever GROWS a system's bodies array (to at least
   entry.bodyCount, the real body count computed client-side, and at least
   the highest referenced planet index) and only ever touches the specific
   .name field of the slot(s) named -- every other field on an existing
   body, and every other body in the array, is left completely untouched.
   This is the only safe way to do it here: a naive "replace sysRec.data.bodies
   with a freshly-built array" would either truncate a system that already
   has more real per-body data than this one import knows about, or blank
   out fields (biome/resources/ring/etc) another traveller already
   documented, since preview.html's applyOverride() treats bodies as a
   dense array replacing the procedural one wholesale, not a sparse patch. */
function blankBody(){
  return {
    name:"", moon:false, orbits:0, biome:"", subtype:"", descriptor:"", water:false, ring:false,
    resources:[], flora:[], fauna:[], minerals:[], salvage:[], fossils:[],
    sentinel:"None", autophage:false, reliquary:false, ruins:false, base:false, baseName:""
  };
}
function applyPlanetNamesToBodies(existingBodies, bodyCount, planetNames){
  var bodies = (existingBodies && existingBodies.length) ? existingBodies.slice() : [];
  var neededLen = Math.max(bodies.length, bodyCount||0);
  for(var pn=0; pn<planetNames.length; pn++) neededLen = Math.max(neededLen, planetNames[pn].index);
  neededLen = Math.min(6, neededLen);
  while(bodies.length < neededLen) bodies.push(blankBody());
  for(var i=0;i<planetNames.length;i++){
    var idx = planetNames[i].index;
    if(idx>=1 && idx<=bodies.length){
      bodies[idx-1] = Object.assign({}, bodies[idx-1], {name: planetNames[i].name});
    }
  }
  return bodies;
}
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

  var added=0, merged=0, planetsSet=0, systemNamesSet=0;
  for(var i=0;i<filtered.cleaned.entries.length;i++){
    var entry = filtered.cleaned.entries[i];
    var entryKey = compositeKey(entry.galaxy, entry.address);
    var sysRec = current.data.systems[entryKey];
    var noteLine = entry.names.length ? (entry.names.length>1
      ? "Real bases from a traveller's save: "+entry.names.join("; ")
      : "Real base from a traveller's save: "+entry.names[0]) : "";

    if(!sysRec){
      current.data.systems[entryKey] = {
        galaxy: entry.galaxy,
        flaggedFields: [], disputedFields: [],
        data: {
          // name: blank unless this entry carries a real SolarSystem-type
          // discovery name (entry.systemName) -- a base name is NOT the
          // star system's name (see the header comment above), but a
          // renamed discovery genuinely is the real system name.
          name: entry.systemName || "", race:"", region:"", starClass:"", stars:[],
          water:false, dissonant:false, giant:false,
          econName:"", sell:"", buy:"", econDesc:"", conflict:"",
          blackHole:false, atlas:false, ruins:false, outlaw:false, abandoned:false, phantom:"",
          notes: noteLine, colliding:false, collidingA:0, collidingB:0,
          editorName: filtered.cleaned.editorName, editorFriendCode: filtered.cleaned.editorFriendCode,
          genVersion: filtered.cleaned.genVersion || "",
          bodies: applyPlanetNamesToBodies([], entry.bodyCount, entry.planetNames)
        },
        editedAt: new Date(now).toISOString(),
        editedByIp: ip,
        history: [{ at: new Date(now).toISOString(), text: "Imported from a traveller's real save file (base name/address/discovery data)" }]
      };
      added++;
      if(entry.systemName) systemNamesSet++;
      if(entry.planetNames.length) planetsSet+=entry.planetNames.length;
    } else {
      if(!sysRec.data) sysRec.data = {};
      if(noteLine){
        var existingNotes = sysRec.data.notes || "";
        if(existingNotes.indexOf(noteLine) < 0){
          sysRec.data.notes = existingNotes ? (existingNotes+" | "+noteLine) : noteLine;
        }
      }
      // Never overwrite an already-documented system name -- only fill it
      // in when currently blank, same "never clobber" rule as every other
      // bulk-import field.
      if(entry.systemName && !sysRec.data.name){
        sysRec.data.name = entry.systemName;
        systemNamesSet++;
      }
      if(entry.planetNames.length){
        sysRec.data.bodies = applyPlanetNamesToBodies(sysRec.data.bodies, entry.bodyCount, entry.planetNames);
        planetsSet += entry.planetNames.length;
      }
      sysRec.data.editorName = filtered.cleaned.editorName || sysRec.data.editorName || "";
      sysRec.data.editorFriendCode = filtered.cleaned.editorFriendCode || sysRec.data.editorFriendCode || "";
      sysRec.data.genVersion = filtered.cleaned.genVersion || sysRec.data.genVersion || "";
      sysRec.editedAt = new Date(now).toISOString();
      pushHistory(sysRec, "real base/planet/system name(s) merged in from a traveller's save-file import", now);
      merged++;
    }
  }

  try {
    await githubPutFile(token, current.data, current.sha,
      "Bulk save-file import: "+added+" new, "+merged+" merged, "+planetsSet+" planet name(s), "+systemNamesSet+" system name(s) ("+(filtered.cleaned.editorName||"anonymous")+")");
  } catch(e){
    return json(502, {ok:false, error:"Could not save to shared data store: "+e.message});
  }

  await invalidateGetCache();
  return json(200, {ok:true, added:added, merged:merged, planetsSet:planetsSet, systemNamesSet:systemNamesSet, total:filtered.cleaned.entries.length});
}

async function handleResolveFlag(req, token, body){
  var url = new URL(req.url);
  var suppliedAdminToken = url.searchParams.get("token");
  var adminToken = process.env.ADMIN_TOKEN;
  if(!adminToken || suppliedAdminToken !== adminToken){
    return json(403, {ok:false, error:"Admin token required (add ?token=... to the URL)"});
  }
  var address=body.address, galaxy=body.galaxy, field=body.payload && body.payload.field;
  var resolution=body.payload && body.payload.resolution;
  if(!isValidAddress(address)) return json(400, {ok:false, error:"address must be a 12-character hex portal address"});
  if(!isValidGalaxy(galaxy)) return json(400, {ok:false, error:"galaxy must be an integer 0-255"});
  if(!isValidFlagField(field)) return json(400, {ok:false, error:"Unknown field: "+field});
  if(["dispute","dismiss","set-value"].indexOf(resolution)<0) return json(400, {ok:false, error:"resolution must be dispute, dismiss, or set-value"});

  var current;
  try { current = await githubGetFile(token); }
  catch(e){ return json(502, {ok:false, error:"Could not read shared data store: "+e.message}); }

  var resolveKey = compositeKey(galaxy, address);
  var sysRec = current.data.systems[resolveKey];
  if(!sysRec && galaxy===0) sysRec = current.data.systems[address]; // pre-migration legacy fallback, see comment above
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

  try { await githubPutFile(token, current.data, current.sha, "Resolve flag "+field+" on "+resolveKey); }
  catch(e){ return json(502, {ok:false, error:"Could not save to shared data store: "+e.message}); }

  await invalidateGetCache();
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
  var galaxy = body.galaxy;
  if(action !== "edit" && action !== "report") return json(400, {ok:false, error:"action must be 'edit', 'report', 'bulk-import', or 'resolve-flag'"});
  if(!isValidAddress(address)) return json(400, {ok:false, error:"address must be a 12-character hex portal address"});
  if(!isValidGalaxy(galaxy)) return json(400, {ok:false, error:"galaxy must be an integer 0-255"});

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
  var editKey = compositeKey(galaxy, address);
  if(action === "edit"){
    if(typeof filtered.cleaned.screenshot === "string" && filtered.cleaned.screenshot.indexOf("data:image/jpeg;base64,") === 0){
      try {
        filtered.cleaned.screenshot = await resolveScreenshotUpload(token, editKey, filtered.cleaned.screenshot);
      } catch(e){
        return json(502, {ok:false, error:"Could not save screenshot: "+e.message});
      }
    }
    // Station photo (2026-09-09): same resolveScreenshotUpload() call as the
    // general screenshot just above, with its own "-station" editKey suffix
    // purely for a readable filename in GitHub's history -- uniqueness
    // itself is already guaranteed by screenshotPathFor()'s own timestamp+
    // random suffix regardless of what editKey it's given, so this can
    // never collide with the general screenshot's own upload for the same
    // system, even if both are replaced in the very same submission.
    if(typeof filtered.cleaned.stationPhoto === "string" && filtered.cleaned.stationPhoto.indexOf("data:image/jpeg;base64,") === 0){
      try {
        filtered.cleaned.stationPhoto = await resolveScreenshotUpload(token, editKey+"-station", filtered.cleaned.stationPhoto);
      } catch(e){
        return json(502, {ok:false, error:"Could not save station photo: "+e.message});
      }
    }
    // Alliance badge (2026-09-10): same upload resolution as stationPhoto
    // just above -- a fresh data: URL becomes a hosted URL. What happens
    // to that URL afterwards is different, though: it's not written onto
    // THIS system's own record at all, it's upserted into the shared,
    // name-keyed data.alliances dict below (see upsertAllianceBadge()'s
    // own header comment for the full "why").
    if(typeof filtered.cleaned.allianceBadge === "string" && filtered.cleaned.allianceBadge.indexOf("data:image/jpeg;base64,") === 0){
      try {
        filtered.cleaned.allianceBadge = await resolveScreenshotUpload(token, editKey+"-alliance", filtered.cleaned.allianceBadge);
      } catch(e){
        return json(502, {ok:false, error:"Could not save alliance badge: "+e.message});
      }
    }
    var edHash = await editorHash(ip);
    if(filtered.cleaned.allianceName && filtered.cleaned.allianceBadge){
      upsertAllianceBadge(current.data, filtered.cleaned.allianceName, filtered.cleaned.allianceBadge, edHash, now, filtered.cleaned.editorName||"");
    }
    var sysRec = current.data.systems[editKey];
    if(!sysRec) sysRec = current.data.systems[editKey] = { galaxy:galaxy, flaggedFields:[], disputedFields:[] };
    if(sysRec.galaxy===undefined) sysRec.galaxy = galaxy; // backfill for a pre-existing record saved before this field existed
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

    var TOP_CATS = ["name","race","region","starClass","stars","suffix","giant","economy","conflict","blackHole","atlas","ruins","outlaw","abandoned","phantom","notes","colliding","screenshot","station","signals"];
    for(var ti=0; ti<TOP_CATS.length; ti++){
      if(stillUnderReview.indexOf(TOP_CATS[ti])>=0) continue;
      applyCategoryValue(sysRec.data, TOP_CATS[ti], getCategoryValue(filtered.cleaned, TOP_CATS[ti]));
    }

    // Attribution metadata -- always a direct overwrite, not gated behind
    // flag/dispute review like TOP_CATS above (see filter.mjs's comment).
    sysRec.data.editorName = filtered.cleaned.editorName || "";
    sysRec.data.editorFriendCode = filtered.cleaned.editorFriendCode || "";
    // genVersion: unlike editorName/editorFriendCode this is never a
    // deliberate user choice to clear, so keep the previous value rather
    // than blanking it whenever an older cached client omits the field.
    sysRec.data.genVersion = filtered.cleaned.genVersion || sysRec.data.genVersion || "";

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

    // Feed every distinct free-text value in this submission into the
    // shared community-terms vocabulary (2026-09-02) -- see
    // lib/shared.mjs's addCommunityTerms() for the full "why". Reads off
    // newBodies (the array just committed above), not filtered.cleaned.bodies
    // directly, so a body index still under flag/dispute review is learned
    // from its real pre-edit value, never from a submission that didn't win.
    newBodies.forEach(function(b){
      if(!b) return;
      addCommunityTerms(current.data, "resources", b.resources||[]);
      addCommunityTerms(current.data, "flora", b.flora||[]);
      addCommunityTerms(current.data, "fauna", b.fauna||[]);
      addCommunityTerms(current.data, "minerals", b.minerals||[]);
      addCommunityTerms(current.data, "salvage", b.salvage||[]);
      addCommunityTerms(current.data, "fossils", b.fossils||[]);
      if(b.descriptor) addCommunityTerms(current.data, "descriptor", [b.descriptor]);
      // 2026-09-08 (Tony/goodguyfree, biome-unknown fix): feed a submitted
      // biome value into the shared vocabulary same as every other free-
      // text field above -- preview.html's biomeCommunityExtras() then
      // surfaces it as an "Other reported" suggestion for every OTHER
      // traveller, not just saved and forgotten in this one record.
      if(b.biome) addCommunityTerms(current.data, "biome", [b.biome]);
      // 2026-09-08 (Sub type split from Biome): same reasoning -- a
      // traveller's real on-screen sub-name feeds the shared vocabulary so
      // subtypeComboGroups() can surface it for every OTHER traveller too.
      if(b.subtype) addCommunityTerms(current.data, "subtype", [b.subtype]);
    });

    sysRec.editedAt = new Date(now).toISOString();
    sysRec.editedByIp = ip;
    pushHistory(sysRec, "edited by a traveller"+(resolvedAny?" (also resolved a flagged field by consensus)":""), now);
    commitMessage = "Edit system "+editKey+" via site";
  } else {
    current.data.reports.push({
      galaxy: galaxy,
      address: address,
      reason: filtered.cleaned.reason,
      reportedAt: new Date(now).toISOString(),
      reportedByIp: ip,
      resolved: false
    });
    commitMessage = "Report system "+editKey+" via site";
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

  await invalidateGetCache();

  return json(200, {ok:true, address: address, action: action});
};

export const config = { path: "/.netlify/functions/system-edit" };
