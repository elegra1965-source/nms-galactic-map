/* ============================================================
   Content filter for NMS Galactic Map system-edit submissions.
   Pure functions, no dependencies -- runs identically client-side
   (instant feedback) and inside the Netlify Function (authoritative,
   can't be bypassed by editing client JS).

   This is a starting-point wordlist of common English profanity,
   NOT a comprehensive slur database -- Tony, add more terms to
   BAD_WORDS below any time, one per line, lowercase, no punctuation.
   ============================================================ */

export const BAD_WORDS = [
  "fuck","shit","bitch","asshole","bastard","cunt","dick","piss",
  "cock","pussy","whore","slut","fag","retard","nigger","nigga",
  "rape","rapist","kike","chink","spic","tranny"
];

// Server-side mirror of preview.html's SENTINEL_WORDS -- keep in sync.
// Expanded 2026-08-17 from 5 flat tier names to the real per-tier adjective
// words (sourced from the NMS wiki's Sentinel page, itself extracted from
// the game's own localisation files) -- see preview.html's own comment on
// this same change for the full reasoning, including "Dissonant" (Tony's
// "Dissonance sentinels") being one of the real Corrupted-tier words.
const SENTINEL_WORDS = [
  ["Low","Minimal","Low Security","Limited","Infrequent","Sparse","Isolated","Remote","Irregular Patrols","Spread Thin","Intermittent","Few"],
  ["Attentive","Enforcing","Frequent","Require Orthodoxy","Require Obedience","Regular Patrols","Unwavering","Observant","Ever-present"],
  ["Aggressive","Frenzied","High Security","Hostile Patrols","Threatening","Hateful","Zealous","Malicious","Inescapable"],
  ["Corrupted","Forsaken","Rebellious","Answer To None","Sharded from the Atlas","Dissonant","De-Harmonised"]
];
const SENTINEL_LEVELS = ["None"].concat(SENTINEL_WORDS[0],SENTINEL_WORDS[1],SENTINEL_WORDS[2],SENTINEL_WORDS[3]);

// Server-side mirror of preview.html's RING_STYLE_BY_BIOME -- keep in sync.
// The client only ever sends a boolean "does this body have a ring", never
// the style itself -- the style is always derived here (and again on every
// client re-render) from the body's own biome, so a manual edit and a
// procedurally generated planet of the same biome always get the same look.
const RING_STYLE_BY_BIOME = {
  Frozen: "icy",
  Barren: "tan", Lush: "tan", Marsh: "tan",
  Volcanic: "ash", Dead: "ash", Toxic: "ash",
  Scorched: "gold", Radioactive: "gold", Irradiated: "gold", "Mega Exotic": "gold",  // Irradiated kept as an alias, see preview.html comment
  Exotic: "split"
};

const LEET = {"0":"o","1":"i","3":"e","4":"a","5":"s","7":"t","@":"a","$":"s"};

// Normalizes ONE token (no spaces left in it by the time this runs) --
// leet-substitutes, strips stray punctuation stuck to a word (hyphens,
// dots, apostrophes -- still catches "f-u-c-k" / "f.u.c.k" evasion since
// those symbols sit *inside* a single whitespace-delimited token), and
// collapses stretched letters ("fuuuuck" -> "fuck").
function normalizeWord(word){
  var s = String(word||"").toLowerCase();
  s = s.replace(/[01345 7@$]/g, function(ch){ return LEET[ch]!==undefined?LEET[ch]:ch; });
  s = s.replace(/[^a-z]/g, "");
  s = s.replace(/(.)\1{2,}/g, "$1");
  return s;
}

// Whole-word match only -- NOT a substring search. A raw substring search
// flags real words that happen to contain a bad word as a fragment (e.g.
// "skyscraper"/"grape" contain "rape", "classic"/"assassin"/"brass" contain
// "ass", "cockpit"/"cockatoo" contain "cock") -- the classic "Scunthorpe
// problem". Splitting on whitespace/punctuation first and requiring an
// EXACT match per token avoids that while still catching the word typed
// on its own, with leetspeak, or with letters stretched out.
export function containsBadWord(str){
  // Split on WHITESPACE only (not all punctuation) so "f-u-c-k" / "f.u.c.k"
  // typed as one token still gets caught by normalizeWord stripping the
  // punctuation inside it -- only an actual space/newline separates words.
  var words = String(str||"").split(/\s+/).filter(Boolean);
  for(var w=0; w<words.length; w++){
    var n = normalizeWord(words[w]);
    if(!n) continue;
    for(var i=0;i<BAD_WORDS.length;i++){
      if(n === BAD_WORDS[i]) return BAD_WORDS[i];
    }
  }
  return null;
}

function stripHtml(str){
  return String(str||"").replace(/<[^>]*>/g, "");
}

function stripUrls(str){
  return String(str||"").replace(/\b(?:https?:\/\/|www\.)\S+/gi, "");
}

/* filterText: the one function both the client and the Function call.
   opts: {maxLen, allowNewlines, fieldName} */
export function filterText(raw, opts){
  opts = opts || {};
  var maxLen = opts.maxLen || 60;
  var fieldName = opts.fieldName || "field";
  var s = String(raw==null?"":raw).trim();

  if(!s) return {ok:true, cleaned:""};

  s = stripHtml(s);
  s = stripUrls(s);
  if(!opts.allowNewlines) s = s.replace(/[\r\n\t]+/g, " ");
  s = s.replace(/\s{2,}/g, " ").trim();

  if(s.length > maxLen){
    return {ok:false, cleaned:s.slice(0,maxLen), reason:fieldName+" is too long (max "+maxLen+" characters)"};
  }
  var bad = containsBadWord(s);
  if(bad){
    return {ok:false, cleaned:s, reason:fieldName+" contains blocked language"};
  }
  return {ok:true, cleaned:s};
}

// Sell/Buy are player-typed real in-game percentages -- deliberately NOT
// clamped to the procedural generator's own 0-80%/-30-0% range, since a
// real screenshot could legitimately show something outside that (or the
// generator's assumed range could just be wrong) -- only rejects genuine
// non-numeric junk, never the value itself.
function filterPercent(raw, fieldName){
  var s = String(raw==null?"":raw).trim();
  if(!s) return {ok:true, cleaned:""};
  if(s.length > 10) return {ok:false, cleaned:"", reason:fieldName+" is too long"};
  if(!/^-?\d+(\.\d+)?$/.test(s)) return {ok:false, cleaned:"", reason:fieldName+" must be a plain number, e.g. 71.5"};
  return {ok:true, cleaned:parseFloat(s).toFixed(1)};
}

// Screenshot (2026-09-01, Tony: "on the edit system instead of surveyor
// notes... a screenshot users can add a picture"): a system's optional
// photo, submitted as a compressed JPEG data URL (preview.html always
// re-encodes to JPEG client-side before this ever reaches here -- see
// compressImageToJpeg()) OR, on a re-save where the traveller didn't touch
// it, the URL this same field already resolved to on an earlier submission
// (the Edit System modal always resubmits a system's full current state,
// same as every other field -- see edSubmit's own comment in preview.html;
// system-edit.mjs recognises that shape and skips re-uploading it, see its
// own resolveScreenshotUpload() comment). This file deliberately has no
// dependencies (see the header comment above), so this only checks SHAPE
// and size -- it never validates the actual GitHub URL prefix, that
// recognition happens in system-edit.mjs, which already imports
// lib/shared.mjs for it.
var MAX_SCREENSHOT_DATAURL_CHARS = 360000; // ~260KB decoded once base64's ~4/3 overhead is accounted for -- see compressImageToJpeg()'s own budget in preview.html
function filterScreenshot(raw){
  var s = String(raw==null?"":raw).trim();
  if(!s) return {ok:true, cleaned:""};
  if(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s)){
    if(s.length > MAX_SCREENSHOT_DATAURL_CHARS) return {ok:false, cleaned:"", reason:"Screenshot is too large -- try picking it again, it should compress automatically"};
    return {ok:true, cleaned:s};
  }
  // Anything else claiming to be "leave the existing one as it is": only a
  // plain, short https URL is plausible as an already-stored screenshot
  // link -- never anything else (no javascript:, no arbitrary long string).
  if(/^https:\/\/\S+$/.test(s) && s.length <= 300) return {ok:true, cleaned:s};
  return {ok:false, cleaned:"", reason:"Screenshot must be a photo you just added, or left exactly as it was"};
}

/* Validate an entire system-edit payload. Returns {ok, cleaned, errors[]}. */
export function filterSystemEdit(payload){
  var errors = [];
  var out = {};
  payload = payload || {};

  var nameR = filterText(payload.name, {maxLen:40, fieldName:"System name"});
  if(!nameR.ok) errors.push(nameR.reason); else out.name = nameR.cleaned;

  var raceR = filterText(payload.race, {maxLen:30, fieldName:"Race"});
  if(!raceR.ok) errors.push(raceR.reason); else out.race = raceR.cleaned;

  var econR = filterText(payload.econName, {maxLen:40, fieldName:"Economy"});
  if(!econR.ok) errors.push(econR.reason); else out.econName = econR.cleaned;

  var sellR = filterPercent(payload.sell, "Sell %");
  if(!sellR.ok) errors.push(sellR.reason); else out.sell = sellR.cleaned;

  var buyR = filterPercent(payload.buy, "Buy %");
  if(!buyR.ok) errors.push(buyR.reason); else out.buy = buyR.cleaned;

  var econDescR = filterText(payload.econDesc, {maxLen:20, fieldName:"Economy strength"});
  if(!econDescR.ok) errors.push(econDescR.reason); else out.econDesc = econDescR.cleaned;

  var conR = filterText(payload.conflict, {maxLen:40, fieldName:"Conflict"});
  if(!conR.ok) errors.push(conR.reason); else out.conflict = conR.cleaned;

  var regionR = filterText(payload.region, {maxLen:40, fieldName:"Region name"});
  if(!regionR.ok) errors.push(regionR.reason); else out.region = regionR.cleaned;

  var starClassR = filterText(payload.starClass, {maxLen:10, fieldName:"Star class"});
  if(!starClassR.ok) errors.push(starClassR.reason); else out.starClass = starClassR.cleaned;

  // Real game constraint: 1-3 stars per system (single/binary/ternary), and
  // in a binary/ternary system every star is a different colour -- this is
  // the AUTHORITATIVE check, the client's own copy in preview.html's
  // clientPrecheck() is only there for instant feedback and can't be relied
  // on alone (same reasoning as every other allowlisted field here).
  var STAR_COLOR_KEYS = ["yellow","red","green","blue","purple"];
  var starsIn = Array.isArray(payload.stars) ? payload.stars : [];
  if (starsIn.length > 3) {
    errors.push("A system can have at most 3 stars (ternary is the real in-game limit)");
  } else if (new Set(starsIn).size !== starsIn.length) {
    errors.push("Each star must be a different colour -- that's how binary/ternary systems work in-game");
  }
  var starsOut = [];
  for (var si = 0; si < starsIn.length && si < 3; si++) {
    var sc = String(starsIn[si] || "");
    if (STAR_COLOR_KEYS.indexOf(sc) >= 0 && starsOut.indexOf(sc) < 0) starsOut.push(sc);
  }
  out.stars = starsOut.length ? starsOut : ["yellow"];

  // Independent, not a 3-way "suffix" choice -- Water (added in the Abyss
  // update) and Dissonant (added in Interceptor) are separate per-system
  // conditions in the real game and can both apply to the same system.
  out.water = !!payload.water;
  out.dissonant = !!payload.dissonant;

  out.blackHole = !!payload.blackHole;
  out.atlas = !!payload.atlas;
  out.giant = !!payload.giant;
  // Ancient Ruins: a real surface point of interest (Knowledge Stones + a
  // memoir device, sometimes a buried Artifact Ruin) -- researched for
  // Tony's hyperdrive-types.docx task list (2026-08-14) and found no
  // confirmed procedural rule for which systems/planets have one, so this
  // is manual-only, same pattern as blackHole/atlas above -- not derived
  // from anything else in the payload.
  out.ruins = !!payload.ruins;

  // Outlaw (2026-08-17, Tony): a system's conflict WORD can be "Pirate
  // Controlled" (a real tier-3 CONFLICT descriptor) without the separate
  // s.outlaw flag being set -- that flag drives the skull icon on the
  // Conflict badge and the "Outlaw" tag, and was procedural-only with no
  // manual override until now, same manual-only pattern as ruins/giant/
  // blackHole/atlas above -- not derived from the conflict word itself,
  // since a traveller should be able to set them independently.
  out.outlaw = !!payload.outlaw;

  // Phantom Star / Shadow Star -- an obscure, wiki-documented NMS oddity
  // (nomanssky.fandom.com/wiki/Phantom_Star, researched in
  // Galactic-Map-Session-Notes.md): most regions contain thousands of
  // unreachable "phantom" system indices that never appear on the real
  // in-game map, plus a distinct "Shadow Star" anomaly (the first invalid
  // index past the portal network's valid range, reachable by hyperjump
  // unlike ordinary phantoms). Neither is something the procedural
  // generator can know on its own -- purely a manual flag a visitor sets
  // after confirming one in-game -- so this is a plain enum allowlist, same
  // pattern as every other field here, not derived from anything else in
  // the payload.
  var PHANTOM_KEYS = ["", "phantom", "shadow"];
  out.phantom = PHANTOM_KEYS.indexOf(payload.phantom) >= 0 ? payload.phantom : "";

  var notesR = filterText(payload.notes, {maxLen:800, allowNewlines:true, fieldName:"Notes"});
  if(!notesR.ok) errors.push(notesR.reason); else out.notes = notesR.cleaned;

  var screenshotR = filterScreenshot(payload.screenshot);
  if(!screenshotR.ok) errors.push(screenshotR.reason); else out.screenshot = screenshotR.cleaned;

  // Optional attribution -- "who documented this system" -- added per Tony's
  // ask (2026-08-16) for a way to show which traveller submitted a system's
  // real in-game data. Deliberately NOT one of the FLAG_FIELDS/TOP_CATS
  // whole-row categories in system-edit.mjs -- it's just metadata about the
  // submission itself, not contestable content, so it always overwrites on
  // every edit (reflects the most recent submitter) rather than going
  // through the flag/consensus-vote pipeline every other field uses.
  var editorNameR = filterText(payload.editorName, {maxLen:30, fieldName:"Your name"});
  if(!editorNameR.ok) errors.push(editorNameR.reason); else out.editorName = editorNameR.cleaned;

  var editorCodeR = filterText(payload.editorFriendCode, {maxLen:24, fieldName:"Friend code"});
  if(!editorCodeR.ok) errors.push(editorCodeR.reason); else out.editorFriendCode = editorCodeR.cleaned;

  // GEN_VERSION tag -- see the isValidGenVersion() comment above. Never
  // pushed to errors: an old cached client with no genVersion at all, or a
  // malformed one, should still save normally, just without the tag.
  if(isValidGenVersion(payload.genVersion)) out.genVersion = payload.genVersion;

  // Small helper for the 4 grouped resource fields (Flora/Minerals/
  // Salvageable tech/Fossils) -- same shape and limits as the existing
  // Resources list, just run once per group.
  function resArr(list,fieldName){
    var out2 = [];
    var arr = Array.isArray(list) ? list : [];
    for(var k=0;k<Math.min(arr.length,6);k++){
      var r = filterText(arr[k], {maxLen:24, fieldName:fieldName});
      if(r.ok && r.cleaned) out2.push(r.cleaned);
    }
    return out2;
  }

  out.bodies = [];
  var bodies = Array.isArray(payload.bodies) ? payload.bodies : [];
  if(bodies.length > 6) errors.push("A system can have at most 6 planets/moons total");
  var planetCount = 0, moonCount = 0;
  for(var i=0;i<Math.min(bodies.length,6);i++){
    var b = bodies[i] || {};
    var bNameR = filterText(b.name, {maxLen:30, fieldName:"Planet/moon name"});
    if(!bNameR.ok){ errors.push(bNameR.reason); continue; }
    // Bumped 20->30 (2026-08-26, Tony): the client now lets a traveller type a
    // custom biome name (e.g. Water World, or anything not on the official
    // list) instead of only picking from the fixed list -- 20 was tight for
    // that, so this now matches the 30-char cap preview.html's own bfBiome
    // input uses (same convention as the Descriptor/Planet-name caps above).
    var biomeR = filterText(b.biome, {maxLen:30, fieldName:"Biome"});
    if(!biomeR.ok){ errors.push(biomeR.reason); continue; }
    // Bumped 20->50 (2026-08-17, Tony): too short for real in-game hazard/
    // weather phrases like "Planet-wide Radioactive Storm" -- must match
    // preview.html's own bfDesc maxlength or the server would still reject/
    // truncate what the client now happily accepts.
    var descR = filterText(b.descriptor, {maxLen:50, fieldName:"Descriptor"});
    if(!descR.ok){ errors.push(descR.reason); continue; }
    var resOut = [];
    var res = Array.isArray(b.resources) ? b.resources : [];
    for(var j=0;j<Math.min(res.length,6);j++){
      var resR = filterText(res[j], {maxLen:24, fieldName:"Resource"});
      if(resR.ok && resR.cleaned) resOut.push(resR.cleaned);
    }
    var isMoon = !!b.moon;
    if(isMoon) moonCount++; else planetCount++;
    var sentinelIn = String(b.sentinel||"None");
    // Base name (2026-08-21, Tony): optional, only meaningful alongside
    // `base`. Same 30-char cap as a body's own name -- deliberately its own
    // field, never merged into `name`/`bNameR` above (that's the real bug
    // the save-file bulk-import hit the same day: a base name silently
    // became the STAR system's name). The client also weaves this into the
    // system's own `notes` at save time for visibility, but this field is
    // the source of truth tying the name to the specific body it belongs to.
    var baseNameR = filterText(b.baseName||"", {maxLen:30, fieldName:"Base name"});
    if(!baseNameR.ok){ errors.push(baseNameR.reason); continue; }
    out.bodies.push({
      name: bNameR.cleaned,
      moon: isMoon,
      // 1-based position (within THIS bodies array) of the planet this moon
      // orbits, chosen via the Orbits dropdown -- 0 means "not set", which
      // applyOverride() on the client falls back to inferring from list
      // order, same as every save made before this field existed.
      orbits: Math.max(0, Math.min(6, parseInt(b.orbits,10)||0)),
      biome: biomeR.cleaned,
      descriptor: descR.cleaned,
      water: !!b.water,
      // Rings aren't a thing on moons in-game -- enforced server-side too,
      // not just hidden client-side, since this is the authoritative copy.
      // Style is derived from the (already-filtered) biome, same lookup the
      // client uses in applyOverride() and generateSystem() -- never trust
      // a style string from the client itself, since one was never sent.
      ring: (!isMoon && !!b.ring) ? (RING_STYLE_BY_BIOME[biomeR.cleaned] || "tan") : false,
      resources: resOut,
      flora: resArr(b.flora,"Flora"),
      fauna: resArr(b.fauna,"Fauna"),
      minerals: resArr(b.minerals,"Mineral"),
      salvage: resArr(b.salvage,"Salvageable tech"),
      fossils: resArr(b.fossils,"Fossil/curiosity"),
      sentinel: SENTINEL_LEVELS.indexOf(sentinelIn)>=0 ? sentinelIn : "None",
      autophage: !!b.autophage,
      // "Has base" (2026-08-17, Tony): plain boolean, same manual-only
      // pattern as autophage above -- no procedural rule for a traveller's
      // own base placement.
      base: !!b.base,
      baseName: baseNameR.cleaned
    });
  }

  // Real game constraint (Gas giants -- renamed from "Giant planet" to match
  // the wiki's own term, 2026-08-14): at most 1 non-moon body, since a
  // system with a gas giant can't generate any other planets, only up to 5
  // moons orbiting the giant itself.
  if(out.giant){
    if(planetCount>1) errors.push("A Gas giant system can only have 1 planet (the giant itself)");
    if(moonCount>5) errors.push("A Gas giant can have at most 5 moons");
  }

  // "Colliding planets present" (2026-08-17, Tony -- built client-side in a
  // separate session, but never actually wired into this server-side
  // allowlist, so the checkbox/pair picker looked like it worked in the
  // Edit form but a submitted choice was silently dropped before it ever
  // reached the shared data store -- same "allowlist is authoritative"
  // pattern every other field on this page already follows, just missed
  // for this one. Display-only, like ring style: which two planets visually
  // collide can ONLY be a traveller's own in-game observation, so this is a
  // manual pick, not derived from anything else in the payload. collidingA/
  // collidingB are 1-based positions into THIS SAME submitted bodies array
  // (same shape as a moon's "orbits" field above) -- clamped to a real
  // position or 0 ("not set"), never trusted blindly, but not hard-rejected
  // either if the pair looks incomplete/equal, since that just means the
  // display-only pairing quietly does nothing rather than blocking an
  // otherwise-valid save over one optional cosmetic field. */
  out.colliding = !!payload.colliding;
  out.collidingA = Math.max(0, Math.min(out.bodies.length, parseInt(payload.collidingA,10)||0));
  out.collidingB = Math.max(0, Math.min(out.bodies.length, parseInt(payload.collidingB,10)||0));

  return {ok: errors.length===0, cleaned: out, errors: errors};
}

/* Bulk save-file import (2026-08-18): a visitor who's parsed their own
   save.hg client-side (see nms-core/save-import/) can offer to import
   their own real bases in one batch, rather than one Edit-system
   submission per system -- which the normal 8-edits/hour rate limit
   would make impractical for anyone with more than a handful of bases.
   Same content rules as a normal edit's name/notes fields, just applied
   to every entry in one array. Caps batch size hard at 300 (a generous
   real-world base count -- Tony's own real save had 278) so one request
   can't be used to smuggle in an unbounded write.

   EXTENDED, 2026-08-21: entries can now also carry planetNames (real
   per-body names from DiscoveryManagerData, one traveller's own renamed
   planets -- see extract-summary.js's header for the full "why") and an
   optional systemName (from a SolarSystem-type discovery). Both ride in
   the SAME entries array/single daily-limited request as base names,
   since MAX_BULK_IMPORTS_PER_IP_PER_DAY is 1 -- a separate second request
   would just get rejected. bodyCount is the real total planet+moon count
   for that system (computed client-side via NMSCore.planetSeeds(), which
   the server has no way to derive on its own) -- needed so handleBulkImport()
   can build a correctly-sized bodies array instead of guessing, or silently
   truncating a system that has more real bodies than named entries. */
var MAX_BULK_IMPORT_ENTRIES = 300;

export function filterBulkImport(payload){
  var errors = [];
  payload = payload || {};
  var entriesIn = Array.isArray(payload.entries) ? payload.entries : [];
  if(entriesIn.length === 0) errors.push("No entries to import");
  if(entriesIn.length > MAX_BULK_IMPORT_ENTRIES){
    errors.push("Too many entries in one import (max "+MAX_BULK_IMPORT_ENTRIES+", got "+entriesIn.length+")");
  }

  var editorNameR = filterText(payload.editorName, {maxLen:30, fieldName:"Your name"});
  var editorCodeR = filterText(payload.editorFriendCode, {maxLen:24, fieldName:"Friend code"});
  var editorName = editorNameR.ok ? editorNameR.cleaned : "";
  var editorFriendCode = editorCodeR.ok ? editorCodeR.cleaned : "";
  var genVersion = isValidGenVersion(payload.genVersion) ? payload.genVersion : "";

  var out = [];
  for(var i=0;i<Math.min(entriesIn.length, MAX_BULK_IMPORT_ENTRIES);i++){
    var e = entriesIn[i] || {};
    if(!isValidAddressStr(e.address)) continue; // silently skip malformed addresses rather than failing the whole batch
    if(!isValidGalaxyNum(e.galaxy)) continue; // added 2026-08-22 -- every entry must carry a real galaxy now, see isValidGalaxyNum() above
    var namesIn = Array.isArray(e.names) ? e.names : (e.name ? [e.name] : []);
    var cleanedNames = [];
    for(var j=0;j<Math.min(namesIn.length,10);j++){
      var nR = filterText(namesIn[j], {maxLen:40, fieldName:"System name"});
      if(nR.ok && nR.cleaned) cleanedNames.push(nR.cleaned);
    }

    var planetNamesIn = Array.isArray(e.planetNames) ? e.planetNames : [];
    var cleanedPlanetNames = [];
    for(var k=0;k<Math.min(planetNamesIn.length,6);k++){
      var pn = planetNamesIn[k] || {};
      var idx = Math.max(1, Math.min(6, parseInt(pn.index,10)||0));
      if(!pn.index || idx!==Math.round(Number(pn.index))) continue; // must be a real 1-6 integer, not a guessed clamp
      var pnR = filterText(pn.name, {maxLen:30, fieldName:"Planet name"});
      if(pnR.ok && pnR.cleaned) cleanedPlanetNames.push({index:idx, name:pnR.cleaned});
    }

    var systemNameR = filterText(e.systemName||"", {maxLen:40, fieldName:"System name"});
    var cleanedSystemName = systemNameR.ok ? systemNameR.cleaned : "";

    var bodyCount = Math.max(0, Math.min(6, parseInt(e.bodyCount,10)||0));

    if(!cleanedNames.length && !cleanedPlanetNames.length && !cleanedSystemName) continue; // nothing usable in this entry -- skip it, don't fail the batch
    out.push({
      address: String(e.address).toUpperCase(),
      galaxy: Number(e.galaxy),
      names: cleanedNames,
      planetNames: cleanedPlanetNames,
      systemName: cleanedSystemName,
      bodyCount: bodyCount
    });
  }

  return {
    ok: errors.length===0 && out.length>0,
    cleaned: { entries: out, editorName: editorName, editorFriendCode: editorFriendCode, genVersion: genVersion },
    errors: errors.length ? errors : (out.length===0 ? ["No valid entries after filtering"] : [])
  };
}

function isValidAddressStr(addr){
  return typeof addr === "string" && /^[0-9A-Fa-f]{12}$/.test(addr);
}

/* Local copy of lib/shared.mjs's isValidGalaxy() -- this file is
   deliberately dependency-free (see the header comment), so small
   validators like this get duplicated rather than imported, same as
   SENTINEL_WORDS/RING_STYLE_BY_BIOME above. 0-255, matching GALAXIES.length
   client-side. Added 2026-08-22 for per-galaxy addressing (TODO.md). */
function isValidGalaxyNum(g){
  var n = Number(g);
  return Number.isInteger(n) && n >= 0 && n <= 255;
}

/* GEN_VERSION -- prep work logged 2026-08-22 for a possible future game
   update (real, teased, no patch notes yet -- see preview.html's own
   GEN_VERSION comment for the full why). This is metadata about the
   submitting browser's own build, not user content, so it's format-checked
   only (a loose semver-ish shape) rather than run through filterText's
   profanity/length rules -- an unrecognised or missing value is silently
   dropped, never an error, since it's purely informational and must never
   be able to block a real edit from saving. */
function isValidGenVersion(v){
  return typeof v === "string" && /^[0-9]+(\.[0-9]+){0,3}$/.test(v) && v.length <= 20;
}

export function filterReport(payload){
  payload = payload || {};
  var reasonR = filterText(payload.reason, {maxLen:200, allowNewlines:true, fieldName:"Report reason"});
  return {ok: reasonR.ok, cleaned: {reason: reasonR.cleaned}, errors: reasonR.ok?[]:[reasonR.reason]};
}
