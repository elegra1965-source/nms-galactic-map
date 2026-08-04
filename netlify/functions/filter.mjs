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

function normalize(str){
  var s = String(str||"").toLowerCase();
  s = s.replace(/[01345 7@$]/g, function(ch){ return LEET[ch]!==undefined?LEET[ch]:ch; });
  s = s.replace(/[^a-z]/g, "");            // strip everything but letters, closes gaps like "f u c k" or "f-u-c-k"
  s = s.replace(/(.)\1{2,}/g, "$1");       // collapse "fuuuuck" -> "fuck" so stretched-letter evasion still matches
  return s;
}

export function containsBadWord(str){
  var n = normalize(str);
  for(var i=0;i<BAD_WORDS.length;i++){
    if(n.indexOf(BAD_WORDS[i]) !== -1) return BAD_WORDS[i];
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
