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

// Server-side mirror of preview.html's SENTINEL_LEVELS -- keep in sync.
const SENTINEL_LEVELS = ["None","Low","High","Aggressive","Corrupted"];

// Server-side mirror of preview.html's RING_STYLE_BY_BIOME -- keep in sync.
// The client only ever sends a boolean "does this body have a ring", never
// the style itself -- the style is always derived here (and again on every
// client re-render) from the body's own biome, so a manual edit and a
// procedurally generated planet of the same biome always get the same look.
const RING_STYLE_BY_BIOME = {
  Frozen: "icy",
  Barren: "tan", Lush: "tan", Marsh: "tan",
  Volcanic: "ash", Dead: "ash", Toxic: "ash",
  Scorched: "gold", Irradiated: "gold", "Mega Exotic": "gold",
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
    var biomeR = filterText(b.biome, {maxLen:20, fieldName:"Biome"});
    if(!biomeR.ok){ errors.push(biomeR.reason); continue; }
    var descR = filterText(b.descriptor, {maxLen:20, fieldName:"Descriptor"});
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
      minerals: resArr(b.minerals,"Mineral"),
      salvage: resArr(b.salvage,"Salvageable tech"),
      fossils: resArr(b.fossils,"Fossil/curiosity"),
      sentinel: SENTINEL_LEVELS.indexOf(sentinelIn)>=0 ? sentinelIn : "None",
      autophage: !!b.autophage
    });
  }

  // Real game constraint (Giant planets): at most 1 non-moon body, since a
  // system with a Giant can't generate any other planets, only up to 5
  // moons orbiting the Giant itself.
  if(out.giant){
    if(planetCount>1) errors.push("A Giant planet system can only have 1 planet (the Giant itself)");
    if(moonCount>5) errors.push("A Giant planet can have at most 5 moons");
  }

  return {ok: errors.length===0, cleaned: out, errors: errors};
}

export function filterReport(payload){
  payload = payload || {};
  var reasonR = filterText(payload.reason, {maxLen:200, allowNewlines:true, fieldName:"Report reason"});
  return {ok: reasonR.ok, cleaned: {reason: reasonR.cleaned}, errors: reasonR.ok?[]:[reasonR.reason]};
}
