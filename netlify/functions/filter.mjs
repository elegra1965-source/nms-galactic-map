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

  var conR = filterText(payload.conflict, {maxLen:40, fieldName:"Conflict"});
  if(!conR.ok) errors.push(conR.reason); else out.conflict = conR.cleaned;

  var notesR = filterText(payload.notes, {maxLen:800, allowNewlines:true, fieldName:"Notes"});
  if(!notesR.ok) errors.push(notesR.reason); else out.notes = notesR.cleaned;

  out.bodies = [];
  var bodies = Array.isArray(payload.bodies) ? payload.bodies : [];
  if(bodies.length > 6) errors.push("A system can have at most 6 planets/moons total");
  for(var i=0;i<Math.min(bodies.length,6);i++){
    var b = bodies[i] || {};
    var bNameR = filterText(b.name, {maxLen:30, fieldName:"Planet/moon name"});
    if(!bNameR.ok){ errors.push(bNameR.reason); continue; }
    var biomeR = filterText(b.biome, {maxLen:20, fieldName:"Biome"});
    if(!biomeR.ok){ errors.push(biomeR.reason); continue; }
    var resOut = [];
    var res = Array.isArray(b.resources) ? b.resources : [];
    for(var j=0;j<Math.min(res.length,6);j++){
      var resR = filterText(res[j], {maxLen:24, fieldName:"Resource"});
      if(resR.ok && resR.cleaned) resOut.push(resR.cleaned);
    }
    out.bodies.push({
      name: bNameR.cleaned,
      moon: !!b.moon,
      parent: Math.max(0, parseInt(b.parent,10)||0),
      biome: biomeR.cleaned,
      water: !!b.water,
      resources: resOut
    });
  }

  return {ok: errors.length===0, cleaned: out, errors: errors};
}

export function filterReport(payload){
  payload = payload || {};
  var reasonR = filterText(payload.reason, {maxLen:200, allowNewlines:true, fieldName:"Report reason"});
  return {ok: reasonR.ok, cleaned: {reason: reasonR.cleaned}, errors: reasonR.ok?[]:[reasonR.reason]};
}
