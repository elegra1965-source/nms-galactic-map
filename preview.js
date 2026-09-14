
"use strict";

/* ---- error surfacing so a runtime fault is visible, not a blank screen ---- */
var __nmsThreeMissing=false;
function showErr(msg){
  var e=document.getElementById("err");
  e.style.display="block";
  e.textContent="ERROR: "+msg;
}
window.addEventListener("error",function(ev){
  if(__nmsThreeMissing) return; // already showing the real explanation below -- don't overwrite it with the cryptic "THREE is not defined" this same failure inevitably throws a moment later
  showErr((ev.message||"unknown")+"\n"+(ev.filename||"")+":"+(ev.lineno||""));
});
/* 2026-08-31: the whole app depends on the Three.js CDN script tag just
   above actually loading -- a script-load failure fires only on the
   script element itself, not as a global window "error" event, so a
   blocked/unreachable CDN (corporate firewall, an over-aggressive
   ad-blocker, a regional outage) previously fell through to whatever
   later line first touched `THREE`, surfacing as a cryptic "THREE is
   not defined" via the handler above rather than something a non-technical
   visitor could act on. Checking for it explicitly, right after the tag
   had a chance to run, means a real network/blocking problem gets a plain
   explanation instead of a raw JS error -- the __nmsThreeMissing flag stops
   the inevitable follow-up ReferenceError (from the first line below that
   touches THREE) from silently overwriting this friendlier message. */
if(typeof THREE==="undefined"){
  __nmsThreeMissing=true;
  showErr("Couldn't load a required file (three.js) from cdnjs.cloudflare.com.\n"+
    "This usually means an ad-blocker or firewall is blocking that address, or your connection dropped mid-load.\n"+
    "Try disabling any ad/script blocker for this site, then reload the page.");
}

/* ============ constants ============ */
var SIZE_XZ=0x1000, SIZE_Y=0x100;
var GAL_R=200, GAL_H=13, CORE_R=14;
var VOX_U=9, LY_PER_VOXEL=400;
var HEXD="0123456789ABCDEF";

var GALAXIES=["Euclid","Hilbert Dimension","Calypso","Hesperius Dimension","Hyades","Ickjamatew","Budullangr","Kikolgallr","Eltiensleen","Eissentam","Elkupalos","Aptarkaba","Ontiniangp","Odiwagiri","Ogtialabi","Muhacksonto","Hitonskyer","Rerasmutul","Isdoraijung","Doctinawyra","Loychazinq","Zukasizawa","Ekwathore","Yeberhahne","Twerbetek","Sivarates","Eajerandal","Aldukesci","Wotyarogii","Sudzerbal","Maupenzhay","Sugueziume","Brogoweldian","Ehbogdenbu","Ijsenufryos","Nipikulha","Autsurabin","Lusontrygiamh","Rewmanawa","Ethiophodhe","Urastrykle","Xobeurindj","Oniijialdu","Wucetosucc","Ebyeloof","Odyavanta","Milekistri","Waferganh","Agnusopwit","Teyaypilny","Zalienkosm","Ladgudiraf","Mushonponte","Amsentisz","Fladiselm","Laanawemb","Ilkerloor","Davanossi","Ploehrliou","Corpinyaya","Leckandmeram","Quulngais","Nokokipsechl","Rinblodesa","Loydporpen","Ibtrevskip","Elkowaldb","Heholhofsko","Yebrilowisod","Husalvangewi","Ovna'uesed","Bahibusey","Nuybeliaure","Doshawchuc","Ruckinarkh","Thorettac","Nuponoparau","Moglaschil","Uiweupose","Nasmilete","Ekdaluskin","Hakapanasy","Dimonimba","Cajaccari","Olonerovo","Umlanswick","Henayliszm","Utzenmate","Umirpaiya","Paholiang","Iaereznika","Yudukagath","Boealalosnj","Yaevarcko","Coellosipp","Wayndohalou","Smoduraykl","Apmaneessu","Hicanpaav","Akvasanta","Tuychelisaor","Rivskimbe","Daksanquix","Kissonlin","Aediabiel","Ulosaginyik","Roclaytonycar","Kichiaroa","Irceauffey","Nudquathsenfe","Getaizakaal","Hansolmien","Bloytisagra","Ladsenlay","Luyugoslasr","Ubredhatk","Cidoniana","Jasinessa","Torweierf","Saffneckm","Thnistner","Dotusingg","Luleukous","Jelmandan","Otimanaso","Enjaxusanto","Sezviktorew","Zikehpm","Bephembah","Broomerrai","Meximicka","Venessika","Gaiteseling","Zosakasiro","Drajayanes","Ooibekuar","Urckiansi","Dozivadido","Emiekereks","Meykinunukur","Kimycuristh","Roansfien","Isgarmeso","Daitibeli","Gucuttarik","Enlaythie","Drewweste","Akbulkabi","Homskiw","Zavainlani","Jewijkmas","Itlhotagra","Podalicess","Hiviusauer","Halsebenk","Puikitoac","Gaybakuaria","Grbodubhe","Rycempler","Indjalala","Fontenikk","Pasycihelwhee","Ikbaksmit","Telicianses","Oyleyzhan","Uagerosat","Impoxectin","Twoodmand","Hilfsesorbs","Ezdaranit","Wiensanshe","Ewheelonc","Litzmantufa","Emarmatosi","Mufimbomacvi","Wongquarum","Hapirajua","Igbinduina","Wepaitvas","Sthatigudi","Yekathsebehn","Ebedeagurst","Nolisonia","Ulexovitab","Iodhinxois","Irroswitzs","Bifredait","Beiraghedwe","Yeonatlak","Cugnatachh","Nozoryenki","Ebralduri","Evcickcandj","Ziybosswin","Heperclait","Sugiuniam","Aaseertush","Uglyestemaa","Horeroedsh","Drundemiso","Ityanianat","Purneyrine","Dokiessmat","Nupiacheh","Dihewsonj","Rudrailhik","Tweretnort","Snatreetze","Iwundaracos","Digarlewena","Erquagsta","Logovoloin","Boyaghosganh","Kuolungau","Pehneldept","Yevettiiqidcon","Sahliacabru","Noggalterpor","Chmageaki","Veticueca","Vittesbursul","Nootanore","Innebdjerah","Kisvarcini","Cuzcogipper","Pamanhermonsu","Brotoghek","Mibittara","Huruahili","Raldwicarn","Ezdartlic","Badesclema","Isenkeyan","Iadoitesu","Yagrovoisi","Ewcomechio","Inunnunnoda","Dischiutun","Yuwarugha","Ialmendra","Reponudrle","Rinjanagrbo","Zeziceloh","Oeileutasc","Zicniijinis","Dugnowarilda","Neuxoisan","Ilmenhorn","Rukwatsuku","Nepitzaspru","Chcehoemig","Haffneyrin","Uliciawai","Tuhgrespod","Iousongola","Odyalutai"];

var STAR_TYPES=[
  {k:"yellow",w:55,cls:["F","G"],col:0xffe08a},
  {k:"red",   w:25,cls:["K","M"],col:0xff7a4a},
  {k:"green", w:6, cls:["E"],    col:0x6bffa8},
  {k:"blue",  w:9, cls:["B","O"],col:0x6ba8ff},
  {k:"purple",w:5, cls:["X","Y"],col:0xc78aff}
];
/* Human-readable labels for the star-colour dropdown in Edit system --
   matches the wiki's own class groupings for each of the 5 real colours. */
var STAR_COLOR_LABEL={yellow:"Yellow (F/G)",red:"Red/Orange (K/M)",green:"Green (E)",blue:"Blue (B/O)",purple:"Purple (X/Y)"};
function starTypeByKey(k){ for(var i=0;i<STAR_TYPES.length;i++) if(STAR_TYPES[i].k===k) return STAR_TYPES[i]; return STAR_TYPES[0]; }
/* ============ hyperdrive types (task from Tony's "hyperdrive types.docx",
   2026-08-14) ============
   Access tiers transcribed directly from Tony's own doc, which itself
   matches the NMS wiki's Hyperdrive page: each drive is backwards-
   compatible with every lower tier's star colour, not just its own --
   an Indium Drive reaches yellow/red/green/blue, not blue alone. This
   `reach` array is the authoritative "what colours can this drive jump
   to" set used everywhere below (click warnings, Enter system / Jump to
   gating, and route-finding candidate filtering). Standard is the
   default, matching the same "every save starts here" reasoning already
   used for the 101 LY Basic hyperdrive-range default above. */
var HYPER_DRIVES=[
  {k:"standard", label:"Standard Hyperdrive", short:"Standard", reach:["yellow"]},
  {k:"cadmium",  label:"Cadmium Drive",       short:"Cadmium",  reach:["yellow","red"]},
  {k:"emeril",   label:"Emeril Drive",        short:"Emeril",   reach:["yellow","red","green"]},
  {k:"indium",   label:"Indium Drive",        short:"Indium",   reach:["yellow","red","green","blue"]},
  {k:"atlantid", label:"Atlantid Drive",      short:"Atlantid", reach:["yellow","red","green","blue","purple"]}
];
var COLOR_LABEL_PLAIN={yellow:"Yellow",red:"Red/Orange",green:"Green",blue:"Blue",purple:"Purple"};
function driveByKey(k){ for(var i=0;i<HYPER_DRIVES.length;i++) if(HYPER_DRIVES[i].k===k) return HYPER_DRIVES[i]; return HYPER_DRIVES[0]; }
function currentDrive(){
  var el=document.getElementById("fHyperDrive");
  return driveByKey(el?el.value:"standard");
}
function canReachColor(colKey,drive){ return (drive||currentDrive()).reach.indexOf(colKey)>=0; }
/* The lowest-tier drive that first unlocks a given colour -- used for the
   "you need X to reach Y systems" message, so purple always says Atlantid
   even if the player currently has Indium selected. */
function minDriveForColor(colKey){
  for(var i=0;i<HYPER_DRIVES.length;i++) if(HYPER_DRIVES[i].reach.indexOf(colKey)>=0) return HYPER_DRIVES[i];
  return HYPER_DRIVES[HYPER_DRIVES.length-1];
}
function driveNeededMsg(colKey){
  return "Need "+minDriveForColor(colKey).label+" to reach "+COLOR_LABEL_PLAIN[colKey]+" star systems";
}
/* Deterministically reproduces the exact star type generateSystem() would
   assign at (vx,vy,vz,idx) WITHOUT running the rest of generateSystem --
   used only for read-only colour lookups (route-candidate filtering) where
   materializing a full system would be wasteful. Deliberately a fresh,
   standalone function rather than a refactor of generateSystem() itself --
   generateSystem's own `r` is a single shared mulberry32 instance consumed
   in a fixed order by everything after the star-type roll (spectral class,
   water/dissonant, star count, ...), so extracting this block out of that
   function and having it draw from a DIFFERENT rng instance would shift
   every later r() call by one and silently change every downstream field
   for any system that falls back to weightedStar() (i.e. whenever nms-core
   isn't loaded or errors) -- exactly the kind of subtle determinism bug
   this project has been burned by before. This function instead builds its
   OWN fresh mulberry32(gseed(vx,vy,vz,idx)) and feeds it straight into
   weightedStar(), which only ever consumes one r() call -- the identical
   first draw generateSystem's own `r` would produce at that same point,
   verified by inspection (weightedStar is the very next statement after
   `r` is created in generateSystem, with nothing drawing from it first)
   and by a Node parity test run before shipping this. */
function starTypeForIdx(vx,vy,vz,idx){
  var address=formatAddress(1,idx,vx,vy,vz);
  var pc = window.NMSCore ? BigInt("0x"+address) : null;
  var attrs=null;
  if(pc!==null){ try{ attrs=window.NMSCore.systemAttributes(pc,GALAXY); }catch(e){ attrs=null; } }
  if(attrs) return starTypeByKey(NMS_STAR_TYPE_KEY[attrs.star_type]||"yellow");
  return weightedStar(mulberry32(gseed(vx,vy,vz,idx)));
}
/* Verified 2026-08-12 against Tony's own legitimately-owned game install:
   decompiled GCSOLARGENERATIONGLOBALS.GLOBAL.MBIN via NMS Mod Tool
   (nexusmods.com/nomanssky/mods/4312), which wraps libMBIN -- real Hello
   Games data, not a guess or another fan tool's reverse-engineering. That
   file's AbandonedSystemProbability / EmptySystemProbability /
   PirateSystemProbability tables (keyed Yellow/Green/Blue/Red/Purple)
   match every value below exactly EXCEPT purple, which this project had
   been approximating -- out .15->.05, unc .40->.20, aba .10->.35, now the
   real numbers. (unc here = the real "EmptySystemProbability" name; aba =
   AbandonedSystemProbability; out = PirateSystemProbability.) */
/* GEN_VERSION -- prep work for handling a future game update (e.g. the
   real, Hello-Games-confirmed "Cosmos" update teased 2026-08-10, though no
   patch notes exist yet as of this writing) that could change what the
   real game actually generates for an address, out from under data
   travellers already submitted. Every Edit-system save and save-file
   bulk-import now stamps the record with whichever GEN_VERSION was loaded
   in the submitting traveller's browser at save time (stored server-side,
   see system-edit.mjs). Bump this (semver-ish, no strict meaning enforced)
   whenever a change here could make generateSystem() produce different
   output for an address that already exists in the shared store --
   ODDS/GIANT_CHANCE/RING_CHANCE/RING_STYLE_BY_BIOME below, generateSystem()
   itself, or nms-core/economy.js's tables. Deliberately NOT wired to
   anything user-facing yet -- there is no reconciliation UI, no diffing,
   no auto-refresh. This is only the version marker itself, so that
   whenever a real patch actually changes generation, a future session can
   diff "records saved under the old GEN_VERSION" against a fresh regen
   under the new one and flag mismatches through the existing dispute
   system, instead of either guessing blind or manually re-checking ~260+
   records by hand. */
var GEN_VERSION="1.3.0"; // bumped 2026-08-24: planet/moon biome selection
  // now uses nms-core/economy.js's pickBiome() -- a real wiki-sourced
  // weighted table by star colour x galaxy type x Prime-vs-Normal slot --
  // instead of a flat uniform pick across all 12 BIOME_KEYS. Every existing
  // address's un-overridden bodies can now generate a different biome than
  // before. See pickBiome()'s own header comment in economy.js for the full
  // research writeup, sources, and disclosed placeholders (no confirmed
  // Purple-star or Harsh-galaxy weight data exists, so those are this
  // project's own averaged/multiplied approximations, not decompiled
  // fact). Also folds "Irradiated" out of procedural generation (it was
  // always a display-only alias of "Radioactive" with identical texture/
  // resource data -- still fully selectable manually via Edit system).
  // Earlier bumps: 1.2.0 (2026-08-23, later same day) -- a planet now only
  // ever gets 1 universal resource instead of up to 2 (5 total resources
  // per planet instead of 6, matching the wiki's own "five resources" rule
  // and Tony's real in-game count); at most one ringed planet per system
  // now (previously each non-moon planet rolled its real 30%
  // PlanetRingProbability fully independently, so 2+ ringed planets in one
  // system was common -- Tony reports only ever seeing one in real play;
  // NOT confirmed against decompiled data or the wiki, see the dedup
  // pass's own comment in generateSystem() for the caveat). 1.1.0 covered
  // economy/wealth/conflict/race wiring to nms-core/system.js and the
  // sell%/buy% refit -- see nms-core/economy.js's header.
var ODDS={yellow:{out:.25,unc:0,aba:0},red:{out:.50,unc:.95,aba:0},
  green:{out:.15,unc:.40,aba:.10},blue:{out:.15,unc:.40,aba:.10},purple:{out:.05,unc:.20,aba:.35}};
/* chance a purple system is also a Giant-planet system -- placeholder,
   see the comment in generateSystem() where it's used */
var GIANT_CHANCE=0.12;
/* Chance any given PLANET (never a moon -- not a thing in-game) generates
   with rings. Was a 0.22 placeholder; verified 2026-08-12 as the real
   PlanetRingProbability value (0.30) from the same decompiled
   GCSOLARGENERATIONGLOBALS.GLOBAL.MBIN referenced in the ODDS comment
   above. */
var RING_CHANCE=0.30;
/* Which of the 5 ring looks each biome gets -- Tony's own pairing ("ice for
   frozen planets, ash for volcanic etc"), not random per-planet. b.ring is
   now one of these style keys (or false for no ring), not a plain boolean --
   still works everywhere that just checks `if(b.ring)` truthy/falsy, but
   also tells makeRingTexture() and buildSystemView() which look to use. */
var RING_STYLE_BY_BIOME={
  Frozen:"icy",
  Barren:"tan", Lush:"tan", Marsh:"tan",
  Volcanic:"ash", Dead:"ash", Toxic:"ash",
  Scorched:"gold", Radioactive:"gold", Irradiated:"gold", "Mega Exotic":"gold",
  Exotic:"split"
};
// RING_STYLE_LABEL (icy/tan/ash/gold/split -> Icy/Dusty/Ash/Golden/Split)
// removed 2026-08-23 -- was only ever used to spell the ring style name out
// in the two "rings" tags above, and per Tony/GoodGuysFree neither needs
// it anymore, just "Rings" if present. RING_PALETTES below still drives
// the actual ring colour on the 3D body itself -- unaffected.
var RING_PALETTES={
  icy:  [0xeaf6ff,0xb9dcf0,0xdceefc,0x8fc4e0],
  tan:  [0xd8c9a8,0xcbb694,0xbfa87e,0xe4dcc2],
  ash:  [0x6b6b6b,0x232323,0x5a5a5a,0x1c1c1c],
  gold: [0xffcf5c,0xc97f16,0xf0a500,0xa85e00],
  split:[0xe8edf0,0x9aa7ab,0xcfd8dc,0x7f8a8e]
};
var RACES=["Gek","Vy'keen","Korvax"];
var ECON=[
  ["Trading",["Mercantile","Trading","Shipping","Commercial"]],
  ["Advanced Materials",["Material Fusion","Alchemical","Metal Processing","Ore Processing"]],
  ["Scientific",["Research","Scientific","Experimental","Mathematical"]],
  ["Mining",["Mining","Minerals","Ore Extraction","Prospecting"]],
  ["Manufacturing",["Manufacturing","Industrial","Construction","Mass Production"]],
  ["Technology",["High Tech","Technology","Nano-construction","Engineering"]],
  ["Power Generation",["Power Generation","Energy Supply","Fuel Generation","High Voltage"]]
];
var ECON_S=[
  ["Declining","Destitute","Failing","Fledgling","Low Supply","Struggling","Unsuccessful","Unpromising"],
  ["Adequate","Balanced","Comfortable","Developing","Medium Supply","Promising","Satisfactory","Sustainable"],
  ["Advanced","Affluent","Booming","Flourishing","High Supply","Opulent","Prosperous","Wealthy"]
];
var CONFLICT=[
  ["Gentle","Low","Mild","Peaceful","Relaxed","Stable","Tranquil","Trivial","Unthreatening","Untroubled"],
  ["Belligerent","Boisterous","Fractious","Intermittent","Medium","Rowdy","Sporadic","Testy","Unruly","Unstable"],
  ["Aggressive","Alarming","At War","Critical","Dangerous","Destructive","Formidable","High","Lawless","Perilous","Pirate Controlled"]
];

/* original icon marks — drawn for this project, not lifted from the game */
function svg(inner,col){
  return '<svg viewBox="0 0 24 24" style="color:'+(col||"var(--cyan)")+'" stroke-width="1.7">'+inner+'</svg>';
}
var IC_RACE={
  "Gek":"icons-web/race-gek.png",
  "Vy'keen":"icons-web/race-vykeen.png",
  "Korvax":"icons-web/race-korvax.png"
};
var IC_ECON={
  "Trading":"icons-web/econ-trading.png",
  "Advanced Materials":"icons-web/econ-advanced-materials.png",
  "Scientific":"icons-web/econ-scientific.png",
  "Mining":"icons-web/econ-mining.png",
  "Manufacturing":"icons-web/econ-manufacturing.png",
  "Technology":"icons-web/econ-technology.png",
  "Power Generation":"icons-web/econ-power-generation.png"
};
var ECON_COL={
  "Trading":"#00af50","Advanced Materials":"#7030a1","Scientific":"#0270c1",
  "Mining":"#fd9900","Manufacturing":"#f0e900","Technology":"#94cdde",
  "Power Generation":"#fe0000"
};
var IC_UNINHAB='<circle cx="12" cy="12" r="8.2" stroke-dasharray="2.6 3"/><path d="M8.4 12h7.2"/>';
function raceIcon(race){
  if(IC_RACE[race]) return '<img class="icimg" src="'+IC_RACE[race]+'" alt="'+race+'">';
  return svg(IC_UNINHAB);
}
function econIcon(type){
  var c=ECON_COL[type]||"#00e5ff";
  return '<img class="icimg tint" style="filter:drop-shadow(0 0 5px '+c+')" src="'+
         IC_ECON[type]+'" alt="'+type+'">';
}
/* Real crossed-swords glyph (was a plain X before) -- two blades crossing
   near centre, each with a short crossguard and a small pommel dot at the
   handle end, matching Tony's real in-game conflict icon reference. Verified
   by rendering this exact path data to a PNG and visually confirming it
   reads as crossed swords, not just an X, before shipping. */
var IC_CONFLICT='<path d="M3 3 15 15"/><path d="M16.55 13.45 13.45 16.55"/><path d="M15 15 18 18"/><path d="M21 3 9 15"/><path d="M10.55 16.55 7.45 13.45"/><path d="M9 15 6 18"/><circle cx="19" cy="19" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="19" r="1" fill="currentColor" stroke="none"/>';
var IC_BIOME='<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.7 2.7 2.7 14.1 0 16.8M12 3.6c-2.7 2.7-2.7 14.1 0 16.8"/>';
var IC_RES='<path d="M12 3.4 20.2 9l-2.6 11.4H6.4L3.8 9Z"/><path d="M3.8 9h16.4M8.6 9 12 3.4l3.4 5.6M6.4 20.4 8.6 9M17.6 20.4 15.4 9"/>';
var CONFLICT_COL=["#6bffa8","#f0a500","#ff5a4a"];

/* Rebuilt 2026-08-17 (Tony): the dropdown used to only offer the 5 coarse
   tier NAMES (None/Low/High/Aggressive/Corrupted), but the real game shows
   a specific ADJECTIVE per scan/discovery, e.g. "Frequent Sentinel
   Activity" -- Tony flagged that a traveller typing a real word like
   "Frequent" and not finding it would likely assume the site was missing
   data rather than realise it's folded into "High". Full word list sourced
   from the NMS wiki's Sentinel page, itself extracted directly from the
   game's own NMS_LOC5_ENGLISH.MBIN/NMS_LOC8_ENGLISH.MBIN localisation
   files by a community researcher (Ertosi) -- same "read the real game
   data, don't guess" standard as every other decompiled table in this
   project. Same tier+word-list shape as ECON_S/CONFLICT, reusing the
   existing tierFromWord() helper to go from a saved word back to its tier
   for colouring. "Dissonant" (Tony: "Dissonance sentinels are sometimes on
   Dissonance planets in purple systems") is a real word in this same
   source table, sitting under Corrupted -- no separate label needed, it's
   just one more selectable word in that tier like every other. */
var SENTINEL_TIER_LB=["Low","High","Aggressive","Corrupted"];
var SENTINEL_WORDS=[
  ["Low","Minimal","Low Security","Limited","Infrequent","Sparse","Isolated","Remote","Irregular Patrols","Spread Thin","Intermittent","Few"],
  ["Attentive","Enforcing","Frequent","Require Orthodoxy","Require Obedience","Regular Patrols","Unwavering","Observant","Ever-present"],
  ["Aggressive","Frenzied","High Security","Hostile Patrols","Threatening","Hateful","Zealous","Malicious","Inescapable"],
  ["Corrupted","Forsaken","Rebellious","Answer To None","Sharded from the Atlas","Dissonant","De-Harmonised"]
];
var SENTINEL_TIER_COL=["#6bffa8","#f4a623","#e2564f","#b06bff"];
// "Not shown" added 2026-09-02 (Tony's own in-game screenshot showed a
// system with genuinely NO Sentinel line at all in the info panel -- not
// "None"/"Not reported" text, nothing) -- kept as a real, separate index
// (not index 0) so it counts as a deliberate traveller confirmation the
// same way a real tier word does, distinct from "None" staying the
// untouched-form-default that never counts as a real submission.
var SENTINEL_ALL_WORDS=["None","Not shown"].concat(SENTINEL_WORDS[0],SENTINEL_WORDS[1],SENTINEL_WORDS[2],SENTINEL_WORDS[3]);
function sentinelColor(word){
  var t=tierFromWord(word,SENTINEL_WORDS);
  return t===null?"#5a6a76":SENTINEL_TIER_COL[t];
}
/* 2026-08-23 (Tony): Sentinel activity has never actually been procedural in
   this codebase -- SENTINEL_WORDS above only ever backed the Edit System
   suggestion list, and every planet just showed "Not reported" until a
   traveller typed something in. Tony remembered it feeling generated and
   asked for an invented per-body guess weighted by the system's conflict
   level, tagged "(procedural)" the same way rings are -- NOT the muted
   .guessVal/tag.guess treatment race/economy/conflict used to get before
   today's real wiring, since this genuinely has no real algorithm to draw
   on (systemAttributes() has no sentinel field at all; see nms-core/
   system.js's own header). This table is entirely this project's own
   invented pairing, same honesty standard as RING_STYLE_BY_BIOME/CONFLICT/
   ECON_S -- not extracted or reverse-engineered from anything. Each row is
   conTier (system conflict, 0-2, from economy.js's rollSystemFlavor*) ->
   the chance of landing in each of the 4 SENTINEL_TIER_LB tiers; low
   conflict skews toward Low/High sentinel presence, high conflict skews
   toward Aggressive, with Corrupted kept rare everywhere (it's flavour text
   for "gone rogue", not just "very hostile"). */
var SENTINEL_TIER_WEIGHTS_BY_CONTIER=[
  [0.55,0.35,0.08,0.02], // conTier 0 (low conflict)
  [0.20,0.45,0.28,0.07], // conTier 1 (medium conflict)
  [0.05,0.20,0.50,0.25]  // conTier 2 (high conflict)
];
/* Consumes exactly 2 br() draws (tier pick, then word-within-tier) -- always
   called last for a body, after every other br() draw for that body (ring/
   resUni/size/tilt/spin), so it can never desync anything that came before
   it. Each body gets its own fresh mulberry32 instance (see the `var br=...`
   line in generateSystem()'s body loop), so this also can't affect any
   other body's draws either way. */
function rollSentinelGuess(br,conTier){
  var w=SENTINEL_TIER_WEIGHTS_BY_CONTIER[Math.max(0,Math.min(2,conTier|0))];
  var x=br(),acc=0,tier=w.length-1;
  for(var i=0;i<w.length;i++){ acc+=w[i]; if(x<acc){ tier=i; break; } }
  return pickOne(br,SENTINEL_WORDS[tier]);
}
/* Placeholder icon marks for the newer additions -- original line-art in the
   same style as IC_CONFLICT/IC_UNINHAB above, NOT lifted from the game.
   Tony couldn't grab real in-game screenshots for these right now, so these
   stand in until he can -- swap them out the same way Race/Economy went
   from placeholder to real cropped screenshots. */
var IC_SENTINEL='<ellipse cx="12" cy="12" rx="9" ry="5.4"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>';
var IC_AUTOPHAGE='<rect x="12" y="2.5" width="13.4" height="13.4" transform="rotate(45 12 12)"/><path d="M12 8v8M8 12h8"/>';
var IC_GIANT='<circle cx="12" cy="12" r="6.4"/><ellipse cx="12" cy="12" rx="10.4" ry="3" transform="rotate(-20 12 12)"/>';
var IC_FLORA='<path d="M12 20c0-9 4-13.6 8-14.6-1 7.8-4 11.8-8 14.6Z"/><path d="M12 20c0-9-4-13.6-8-14.6 1 7.8 4 11.8 8 14.6Z"/>';
/* Original placeholder line-art, same style/status as IC_SALVAGE/IC_FOSSIL
   above -- a simple paw print, not lifted from the game. Swap for a real
   in-game icon later the same way Race/Economy went from placeholder to
   real cropped screenshots. */
var IC_FAUNA='<ellipse cx="12" cy="16.2" rx="4.6" ry="3.6"/><circle cx="7.4" cy="9.4" r="1.7"/><circle cx="11.2" cy="6.8" r="1.7"/><circle cx="15" cy="6.8" r="1.7"/><circle cx="18.4" cy="9.4" r="1.7"/>';
var IC_MINERAL='<path d="M12 3.4 19.4 8.8l-2.6 11.2H7.2L4.6 8.8Z"/>';
var IC_SALVAGE='<circle cx="12" cy="12" r="3"/><path d="M12 3.6V6.4M12 17.6v2.8M3.6 12H6.4M17.6 12h2.8M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2"/>';
var IC_FOSSIL='<path d="M6 9.6C6 6.1 8.4 4.2 10.9 5.6c1 .6 1 1.7 0 2.3-1.3.8-1.3 2.1 0 2.9 1.3.8 1.3 2.1 0 2.9-1 .6-1 1.7 0 2.3 2.5 1.4 5.1-.5 5.1-4"/><circle cx="8.4" cy="8.4" r="0.9" fill="currentColor" stroke="none"/><circle cx="16.2" cy="17.2" r="0.9" fill="currentColor" stroke="none"/>';
/* Swapped 2026-08-17 for Tony's own real in-game screenshot instead of a
   hand-drawn line icon (his first hand-built attempt still "looked nothing
   like a skull" at small size) -- icons-web/status-outlaw.png, background
   chroma-keyed out in Python (alpha derived from whiteness-vs-saturation so
   the screenshot's reddish tile background drops out cleanly, leaving a
   clean white skull silhouette), same processing approach already used for
   the black hole/Atlas Station reference photos back in Session 23. */
var STAR_PATH='M12 3.6l2.2 4.6 5 .7-3.6 3.6.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.6 5-.7Z';
function ecoStars(tier){
  var n=Math.max(0,Math.min(3,(tier|0)+1)),html="",i,on;
  for(i=0;i<3;i++){
    on=i<n;
    html+='<svg viewBox="0 0 24 24" width="9" height="9"><path d="'+STAR_PATH+'" '+
      (on?'fill="var(--gold)" stroke="none"':'fill="none" stroke="#324352" stroke-width="1.6"')+'/></svg>';
  }
  return html;
}
function conBadge(s){
  var n=Math.max(1,Math.min(3,(s.conTier|0)+1)),html="";
  if(s.outlaw) html+='<img class="icimg" style="width:13px;height:13px;object-fit:contain" src="icons-web/status-outlaw.png" alt="Outlaw">';
  html+='<b>'+n+'</b>';
  return html;
}
/* Overriding the Economy Strength / Conflict word (via the dropdowns) must
   also move the star-rating / number badge to match -- otherwise a saved
   word from a higher tier would still show the old procedural tier's count.
   Finds which tier array a saved word actually belongs to; returns null
   (leave the procedural tier alone) if it's not a recognised word. */
function tierFromWord(word,table){
  for(var t=0;t<table.length;t++) if(table[t].indexOf(word)>=0) return t;
  return null;
}
function bodyByIndex(s,idx){
  for(var i=0;i<s.bodies.length;i++) if(s.bodies[i].index===idx) return s.bodies[i];
  return null;
}
/* Walks a moon's real parent chain (b.parent) up to the first non-moon
   body, so buildSystemView() can attach a moon to the actual planet it
   orbits rather than whichever body happens to sit next to it in the
   array. generateSystem() can (rarely) chain a moon's parent to another
   moon rather than a planet when several consecutive body slots all roll
   as moons -- this walks past that safely. applyOverride() never produces
   that chain (a traveller's Orbits pick, and its own fallback, are always
   validated to point at a real planet or 0), so this only ever matters for
   purely-procedural systems, but it's used for both so buildSystemView()
   has one single, always-correct way to find a moon's real anchor.
   Cycle-guarded purely as a defensive backstop against malformed/legacy
   data -- a real generated or saved system can't actually produce a
   parent cycle. Returns the owning planet's .index, or null if it can't
   be resolved (caller falls back to the last-built planet). */
function findOwningPlanetIndex(s,b){
  var seen={}, cur=b, guard=0;
  while(cur && cur.moon){
    if(guard++>8 || seen[cur.index]) return null;
    seen[cur.index]=true;
    cur=bodyByIndex(s,cur.parent);
  }
  return cur ? cur.index : null;
}

var BIOMES={
  "Lush":       {base:"#1d5f31",land:["#2f8f45","#3fa855","#256b30","#6f9438"],sea:"#12406e",cap:"#dce9f4",water:true, atmo:0x6fd8ff, res:["Paraffinium","Star Bulb","Nitrogen"]},
  "Barren":     {base:"#8a6a42",land:["#a9834f","#7a5c39","#c19a63","#6b4f31"],sea:"#2b4c5c",cap:"#cdbb9c",water:true, atmo:0xffcf8a, res:["Pyrite","Cactus Flesh","Sulphurine"]},
  "Dead":       {base:"#6a6a6a",land:["#7e7e7e","#5a5a5a","#909090","#4a4a4a"],sea:null,     cap:"#8a8a8a",water:false,atmo:0, res:["Rusted Metal"]},
  "Exotic":     {base:"#3a2a55",land:["#5a3f7a","#2b1e40","#7a4f9a","#241a38"],sea:null,     cap:"#4a3a66",water:false,atmo:0, res:null},
  "Mega Exotic":{base:"#7a2f2f",land:["#a34040","#5a2222","#c05a3a","#481919"],sea:"#3a2a4a",cap:"#c9a0a0",water:true, atmo:0xff8a6a, res:null},
  "Scorched":   {base:"#4a2418",land:["#6b3320","#341a12","#8a4526","#26120c"],sea:"#3a2a1a",cap:"#7a4a2a",water:true, atmo:0xff9a4a,glow:"#ff7b2a", res:["Phosphorus","Solanium","Sulphurine"]},
  "Frozen":     {base:"#c6dced",land:["#e8f4ff","#a9c8dd","#ffffff","#8fb4cc"],sea:"#3f6f8f",cap:"#ffffff",water:true, atmo:0xbfe6ff, res:["Dioxite","Frost Crystal","Radon"]},
  "Toxic":      {base:"#49591f",land:["#6b7a2a","#333f18","#8a9a35","#232c10"],sea:"#3f4a1a",cap:"#9aa86a",water:true, atmo:0xc8ff4a,glow:"#c8ff4a", res:["Ammonia","Fungal Mould","Nitrogen"]},
  /* Renamed from "Irradiated" 2026-08-17 -- the NMS wiki's own Biome page
     lists "Irradiated" as this biome's name, but Tony sent a real photo of
     his own game's discovery/scan popup showing "Radioactive Planet" as the
     literal on-screen text -- his own primary save data outranks a
     secondary wiki reading, so this now matches what a player actually
     sees rather than the wiki's own internal/community naming. */
  /* base/land/cap/atmo/glow shifted from a dark forest-green (near-identical
     to Lush's own #1d5f31 swatch, both read as "just green" in the Edit
     system biome dropdown -- Tony flagged this 2026-08-21) to a distinctly
     yellow-green lime, so the two are unmistakable at swatch-dot size and
     in the 3D scene. sea kept dark/desaturated (not lime) so water still
     reads as water rather than another lime tone. */
  "Radioactive": {base:"#8fae1b",land:["#a6c92e","#6e8a14","#c4e83f","#516610"],sea:"#20402a",cap:"#d8f06a",water:true, atmo:0xccff33,glow:"#ccff33", res:["Uranium","Gamma Root","Radon"]},
  /* Kept as a second selectable entry, not just quietly dropped -- Tony's
     own screenshot confirmed "Radioactive" is what the in-game scan popup
     shows, but he asked to keep "Irradiated" too "just in case" (the wiki's
     own Biome page uses it, and other UI contexts in-game may still show
     it). Same texture/colour data as Radioactive since it's the same
     underlying biome. */
  "Irradiated": {base:"#8fae1b",land:["#a6c92e","#6e8a14","#c4e83f","#516610"],sea:"#20402a",cap:"#d8f06a",water:true, atmo:0xccff33,glow:"#ccff33", res:["Uranium","Gamma Root","Radon"]},
  "Marsh":      {base:"#38473a",land:["#4f6b4a","#2a3a2a","#66805a","#1e2a1e"],sea:"#2f4a4a",cap:"#9aa89a",water:true, atmo:0x9ad8b0, res:null},
  "Volcanic":   {base:"#241a18",land:["#3a2a24","#140f0e","#4a3028","#0d0908"],sea:"#2a1a14",cap:"#5a4a44",water:true, atmo:0xff6a3a,glow:"#ff4a1a", res:null},
  /* Added 2026-08-26 (Tony) -- a real, separately-documented type on the
     wiki (its own "Biome - Waterworld" page, distinct from the 11 above),
     previously missing entirely. Manual-select only for now: NOT wired into
     procedural generation (see GEN_BIOME_KEYS below) since a real generation
     weight for it hasn't been researched yet -- a traveller can tag a real
     water world via Edit system, but the random generator will never pick
     it on its own until that research happens. res left null (undocumented)
     rather than guessed, same convention as Exotic/Marsh/Volcanic above. */
  "Water World":{base:"#1f5a7a",land:["#2a6f8f","#154258","#3a8aab","#0f3245"],sea:"#0e3a52",cap:"#eaf6ff",water:true, atmo:0x7fd4ff, res:null},
  /* Added 2026-09-06 (Tony, biome-corpus research pass) -- a real, separate
     top-level biome per the wiki's own current Category:Biomes listing
     (nomanssky.fandom.com/wiki/Category:Biomes), confirmed added in the
     "Worlds Part 2" content update (Feb 2025). This is NOT the same thing
     as this site's existing purple-system "Gas giant" special case
     (edGiant checkbox -- one giant planet + up to 5 moons, a system-layout
     mechanic): the wiki confirms Gas Giant is now also a normal per-planet
     biome any system can roll, independent of that older mechanic. Manual-
     select only for now, same as Water World above -- no real generation
     weight has been researched for it yet, so GEN_BIOME_KEYS below
     excludes it too. Palette is this project's own placeholder (a banded
     amber/orange gas-giant look), not sourced from a real in-game screenshot
     -- worth revisiting once a confirmed real one is available. res left
     null (undocumented). */
  "Gas Giant":  {base:"#b8863a",land:["#d4a24f","#8f6224","#e8c070","#6b4a1a"],sea:null,water:false, atmo:0xe0b060,glow:"#f0c878", res:null},
  /* Added 2026-09-06 (Tony, same research pass) -- also listed on the
     wiki's Category:Biomes page (Biome - The Reliquary), but flagged here
     as LOWER CONFIDENCE than Gas Giant above: the wiki's own Reliquary page
     is a stub, and a related page (Biome Subtype - Relic World) describes
     what sounds like the same thing as a SUBTYPE layered onto an existing
     biome (Worlds Part 2 again) rather than a standalone top-level biome in
     its own right -- the wiki is not internally consistent on which of the
     two it actually is. Included as a manual-select option per Tony's own
     call so it's available if a traveller confirms one in-game, but this
     is the one entry in this table most likely to need correcting (either
     removed in favour of treating it as a subtype tag, or merged into
     whatever its true parent biome turns out to be) once real confirmation
     comes in. Palette is a placeholder (weathered stone/ruin tones), not
     sourced from a screenshot. res left null (undocumented). */
  "The Reliquary": {base:"#8a7a5a",land:["#a5936c","#6b5d42","#c2ad82","#4f4530"],sea:null,water:false, atmo:0xcbb98a, res:null}
};
var BIOME_KEYS=Object.keys(BIOMES);
/* Generation-only subset of BIOME_KEYS -- excludes "Water World", "Gas
   Giant" and "The Reliquary" (all manual-select only, see their comments
   above) so the old flat-uniform fallback pick below (used only if
   window.NMSEconomy/economy.js fails to load) can never randomly produce
   them. The weighted pick in economy.js's own BIOME_ORDER already excludes
   them by simply never having been given them -- this is the matching
   guard for the degraded-fallback path. */
var GEN_BIOME_KEYS=BIOME_KEYS.filter(function(k){ return k!=="Water World" && k!=="Gas Giant" && k!=="The Reliquary"; });
/* Real in-game "planet type" flavour-text sub-names -- NOT separate biomes,
   just alternate on-screen wording NMS layers onto one of the categories
   above (confirmed against the wiki's own per-biome pages, 2026-09-06
   research pass; e.g. nomanssky.fandom.com/wiki/Biome_-_Dead lists Dead,
   Empty, Desolate, Lifeless, Forsaken, Life-Incompatible, Low Atmosphere,
   Airless, Abandoned and Terraforming Catastrophe as prefixes the SAME Dead
   biome can generate with -- a traveller reporting "Airless" saw a Dead
   planet, not a 13th category). Purely a display/lookup convenience for
   Edit System's Biome combo below (biomeComboGroups()) so a traveller can
   search/select using the exact wording they actually saw in-game --
   selecting any of these still stores its PARENT key as the real value,
   so classification, colouring, and the biome-corpus comparison against
   economy.js's pickBiome() all keep working against the 12 real category
   keys only, never against a sub-name string. "Lava" and "Tectonic" are
   included at LOWER CONFIDENCE (mapped to Volcanic on thematic grounds --
   Volcanic's own wiki page didn't have its sub-name list confirmed in this
   pass) -- worth double-checking against nomanssky.fandom.com/wiki/Biome_-_Volcanic
   directly if a traveller reports one and this mapping turns out wrong. */
/* EXPANDED 2026-09-08 (Tony, full biome sub-name research pass) -- every
   entry below now sourced directly from each biome's own wiki page (each
   citing a specific decompiled NMS_UPDATE3_ENGLISH.MBIN/NMS_LOC6_ENGLISH.MBIN
   version as its origin), not just the handful spotted by chance before.
   "Arid" moved OFF Barren -- checked directly against the wiki and it's
   actually Scorched's word (#2 on that biome's own list), not Barren's;
   Barren's real list is Desert/Rocky/Bleak/Parched/Abandoned/Dusty/
   Desolate/Wind-swept. "Lava"/"Tectonic" on Volcanic are now CONFIRMED
   (was flagged lower-confidence) -- full 13-word list fetched directly.
   Exotic's list is a flattened union of its ~11 real sub-biome name pools
   (Beam/Bone Spire/Bubble/Contour/Fract Cube/Hexagon/Hydro Garden/Irri
   Shells/M Structure/Shards/Wire Cell/Glitch) -- the game actually groups
   these by sub-biome type, but this project's combo only tracks one
   canonical key per BIOME_KEYS entry, so all are searchable under one
   "Exotic" group for now; a real sub-biome-aware grouping would be a
   separate, bigger change. Mega Exotic is NOT here -- its 3 name pools are
   colour-locked (Red/Green/Blue star), so they live in their own
   MEGA_EXOTIC_SUBNAMES table below and get filtered by the system's actual
   star colour(s) in biomeComboGroups(), not just flattened into one list. */
var BIOME_SUBNAMES={
  "Lush": ["Rainy","Verdant","Tropical","Viridescent","Paradise","Temperate","Humid","Overgrown","Flourishing","Grassy","Bountiful"],
  "Toxic": ["Poisonous","Noxious","Corrosive","Acidic","Caustic","Acrid","Blighted","Miasmatic","Rotting"],
  "Scorched": ["Charred","Arid","Hot","Fiery","Boiling","High Temperature","Torrid","Incandescent","Scalding"],
  "Frozen": ["Icebound","Arctic","Glacial","Sub-zero","Icy","Frostbound","Freezing","Hiemal","Hyperborean"],
  "Barren": ["Desert","Rocky","Bleak","Parched","Abandoned","Dusty","Desolate","Wind-swept"],
  "Dead": ["Empty","Desolate","Lifeless","Forsaken","Life-Incompatible","Low Atmosphere","Airless","Abandoned","Terraforming Catastrophe"],
  "Radioactive": ["Contaminated","Nuclear","Isotopic","Decaying Nuclear","Gamma-Intensive","High Radio Source","Supercritical","High Energy"],
  "Irradiated": ["Contaminated","Nuclear","Isotopic","Decaying Nuclear","Gamma-Intensive","High Radio Source","Supercritical","High Energy"],
  "Marsh": ["Marshy","Swamp","Tropical","Foggy","Misty","Boggy","Endless Morass","Quagmire","Hazy","Cloudy","Vapour","Reeking","Murky","Damp"],
  "Volcanic": ["Lava","Magma","Erupting","Ash-Shrouded","Ashen","Tectonic","Unstable","Violent","Molten","Flame-Ruptured","Imminent Core Detonation","Obsidian Bead","Basalt"],
  "Water World": ["Waterworld","Drowning","Oceanic","Tidal","Waterlocked","Aquatic","Endless Seas","Marine"],
  "Exotic": ["Weird","Fissured","of Light","Breached","Rattling","Spined","Skeletal","Bubbling","Frothing","Foaming","Contoured","Cabled","Webbed","Mechanical","Metallic","Metallurgic","Hexagonal","Plated","Scaly","Fungal","Sporal","Capped","Finned","Bladed","Shell-Strewn","Ossified","Petrified","Calcified","Columned","Sharded","Pillared","Shattered","Fractured","Fragmented","Crimson","Planetary Anomaly","Malfunctioning","Infected","Glassy","Thirsty","Doomed","Erased","Temporary","Corrupted"]
};
/* Mega Exotic's 3 real name pools -- colour-locked to the system's actual
   star colour per the wiki (Red biome only in red-star systems, etc; any
   of the 3 can appear in a yellow-Empty/Lush or purple system). Dropped
   the literal "[REDACTED]" wiki placeholder from Red -- not a real usable
   string. See biomeComboGroups() below for how this gets filtered by the
   system currently being edited's star colour(s) (editStars). */
var MEGA_EXOTIC_SUBNAMES={
  red: ["Crimson","Planetary Anomaly","Stellar Corruption Detected","Chromatic Fog","Vermillion Globe","Scarlet","Blood","Wine Dark"],
  green: ["Planetary Anomaly","Lost Green","Stellar Corruption Detected","Chromatic Fog","Vile Anomaly","Toxic Anomaly","Doomed Jade","Emeril","Deathly Green Anomaly"],
  blue: ["Planetary Anomaly","Lost Blue","Stellar Corruption Detected","Chromatic Fog","Harsh Blue Globe","Frozen Anomaly","Azure","Cerulean","Ultramarine"]
};
/* Safe palette lookup for any biome VALUE, including a custom/unrecognised
   traveller-typed name (allowed since 2026-08-26 -- the Biome combo lets a
   traveller type real in-game wording that isn't one of this site's own 12
   named biomes). Every unrecognised value used to fall back to the exact
   same fixed Barren palette -- harmless for a single custom entry, but a
   real bug once a system has MULTIPLE differently-typed custom biomes:
   Tony's own Nogsangh system (2026-09-01) had "Nuclear"/"Icebound"/
   "Empty"/"Tectonic" across its 4 bodies -- none are recognised keys, so
   all 4 collapsed onto the identical Barren look, "all the planets have
   changed colour/texture to the same [picture]". Fixed by hashing the
   literal string into a hue instead of one hardcoded fallback, so two
   DIFFERENT custom names always render as two DIFFERENT colours (and the
   same custom name always renders the same way, every reload) -- this is
   not a claim about what colour that real in-game classification actually
   is, there's no way to know that for arbitrary typed text, just a
   guarantee that distinct biome text never paints identically. The literal
   string in b.biome/biome is still shown everywhere it's displayed as
   text -- this only affects rendering. */
function _biomeStrHash(str){
  var h=0;
  for(var i=0;i<str.length;i++) h=((h<<5)-h+str.charCodeAt(i))|0;
  return h>>>0;
}
function _hslToHex(h,s,l){
  s/=100; l/=100;
  var c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2, r=0,g=0,b=0;
  if(h<60){r=c;g=x;b=0;} else if(h<120){r=x;g=c;b=0;} else if(h<180){r=0;g=c;b=x;}
  else if(h<240){r=0;g=x;b=c;} else if(h<300){r=x;g=0;b=c;} else {r=c;g=0;b=x;}
  r=Math.round((r+m)*255); g=Math.round((g+m)*255); b=Math.round((b+m)*255);
  return (r<<16)|(g<<8)|b;
}
var _customBiomePalCache={};
function biomePal(k){
  if(BIOMES[k]) return BIOMES[k];
  var key=String(k||"");
  if(!key) return BIOMES.Barren;
  if(_customBiomePalCache[key]) return _customBiomePalCache[key];
  var hue=_biomeStrHash(key)%360;
  var pal={
    base:"hsl("+hue+",42%,32%)",
    land:["hsl("+hue+",48%,44%)","hsl("+hue+",42%,22%)","hsl("+hue+",55%,52%)","hsl("+hue+",38%,16%)"],
    sea:"hsl("+((hue+200)%360)+",38%,26%)",
    cap:"hsl("+hue+",30%,80%)",
    water:true,
    atmo:_hslToHex(hue,60,62),
    res:null
  };
  _customBiomePalCache[key]=pal;
  return pal;
}
/* Sourced (nomanssky.fandom.com/wiki/Resource, wiki/Biome, /wiki/System_colours): Lush/Barren/Scorched/
   Frozen/Toxic/Radioactive have fixed [local element, agricultural, atmospheric] resources; Dead has only
   a local element, no agri/atmo. Exotic/Mega Exotic/Marsh/Volcanic are documented as inconsistent/
   undocumented on the wiki -- res:null rather than guessing. Universal elements can appear on any planet.
   Stellar element is set by the star's colour, confirmed per colour (purple = Quartzite). */
var UNIVERSAL_EL=["Cobalt","Silver","Gold","Magnetised Ferrite","Salt","Sodium"];
var STELLAR_EL={yellow:"Copper",red:"Cadmium",green:"Emeril",blue:"Indium",purple:"Quartzite"};
/* ============ Cosmos-era floating resource/signal icons (2026-09-09) ============
   Tony sent real screenshots of the "Cosmos" 10th-anniversary system view: small
   diamond-shaped icons float near bodies, each clickable into a "Starmap Analysis
   Report" card (name/category, Signal Type, Route recommendation flavour text, a
   Set Marker action). Built as small per-PLANET billboards only (not moons, and
   NOT invented standalone POIs like the reference's asteroid belts/comet
   fragments -- this site has no data at all for those, and this project's own
   standing rule is to never invent what isn't sourced, same reasoning as the
   biome "Unknown until a real submission exists" gating elsewhere).
   Everything shown here as fact (the resource NAME) comes from data this site
   already treats as real/sourced: bd.res (the wiki-sourced per-biome resource
   list showBody() already displays), resUni (the procedural universal-element
   roll, always present), and the system's own stellar element. The one
   deliberately INVENTED part is the "Route recommendation" flavour line --
   there is no way to source a unique per-object description procedurally, so
   this is openly decorative atmosphere text picked from the small bank below,
   never treated as fact anywhere else in the UI. Both picks are seeded off the
   body's own .seed (mulberry32, same determinism pattern used everywhere else
   in this file) so a given system's icons look the same on every reload,
   consistent with the rest of the map. */
var RES_ICON_CAT={
  mineral:{icon:IC_MINERAL,color:"#5ad7ff",label:"Mineral Deposit"},
  flora:{icon:IC_FLORA,color:"#7cffa0",label:"Flora Growth"},
  frozen:{icon:null,color:"#bfe6ff",label:"Frozen Signal"},
  tech:{icon:IC_SALVAGE,color:"#ff8a4a",label:"Tech Anomaly"},
  // Outpost/construction (2026-09-09, Tony's own "Barnyano Outpost Beta"
  // screenshot): deliberately NEVER wired into RES_ICON_BIOME_CAT above --
  // Tony's explicit ask was "dont want icon generated ... has to be user
  // input not procedural", so this category only ever reaches the scene
  // through buildManualSignalIcon()'s traveller-submitted markers, never
  // through the automatic per-planet buildResourceIcon() path. No existing
  // SVG icon in this app resembles a station/outpost either, so -- same as
  // frozen above -- icon stays null and the glyph is hand-drawn.
  outpost:{icon:null,color:"#c7cdd6",label:"Deep-space Outpost"},
  // 3 more added 2026-09-09, same session -- Tony sent 7 close-up photos of
  // real in-game icons with no accompanying text labels this time (unlike
  // the Barnyano Outpost screenshot, which had a full popup). Rather than
  // guess at "official" category names for each, Tony's own call: let the
  // traveller pick whichever glyph looks right for what they saw and type
  // the real specifics themselves in the free-text fields -- same as every
  // other manual marker. These 3 are the ones with a clearly distinct
  // shape/colour from the 5 already built; a couple of the 7 photos looked
  // like closer variants of categories already covered (a more detailed
  // mineral crystal, a slightly different frozen teal) so weren't added as
  // separate options.
  creature:{icon:null,color:"#e08cd9",label:"Cosmic Whale"},
  hazard:{icon:null,color:"#ff5a4a",label:"Hazard / Danger"},
  cargo:{icon:null,color:"#eef2f5",label:"Minor Wreckage"},
  // Atlas Station (2026-09-09, same session as the real-icon-image swap
  // just below) -- Hello Games' own real icon for this landmark (Tony:
  // "thats hello games new icon for atlas station"), not a fan reading of
  // an ambiguous screenshot the way creature/hazard/cargo were. Never wired
  // into RES_ICON_BIOME_CAT, same "not procedural" reasoning as outpost.
  atlasstation:{icon:null,color:"#ff7a3d",label:"Atlas Station"},
  // Added 2026-09-13 from Tony's own in-game screenshot of a floating
  // diamond icon he hadn't seen before ("not sure what it is possible
  // base") -- the glyph is a building/horizon silhouette, closest real
  // match to a base or other surface structure, but keeping the label
  // honest about the uncertainty rather than asserting "Base" outright.
  base:{icon:null,color:"#8fd0ff",label:"Base / Structure"}
};
/* Real icon images (2026-09-09, Tony: "just got grok to isolate icons" --
   he ran his own reference photos through Grok to get clean isolated
   versions, one per category, dropped in New Map/). Only these 6 categories
   have a real image; flora/tech/hazard don't yet and keep their existing
   canvas-drawn glyph (see buildManualSignalIcon() below). Each source image
   came back as a flat JPEG with the "transparent" background baked in as a
   visible checkerboard/white pattern rather than a real alpha channel --
   background was removed here (flood-filled from the image border on a
   near-neutral-AND-bright test, so it can't accidentally eat into the dark
   diamond or a saturated glyph colour) and re-exported as real transparent
   PNGs at icons-web/signal-<cat>.png, matching this file's existing
   icons-web/feature-*.png convention. Loaded once each into REAL_ICON_TEX
   right after TEX_LOADER is defined further down. */
var REAL_ICON_URL={
  mineral:"icons-web/signal-mineral.png",
  frozen:"icons-web/signal-frozen.png",
  outpost:"icons-web/signal-outpost.png",
  creature:"icons-web/signal-creature.png",
  cargo:"icons-web/signal-cargo.png",
  atlasstation:"icons-web/signal-atlasstation.png",
  base:"icons-web/signal-base.png"
};
var RES_ICON_BIOME_CAT={
  "Lush":"flora","Toxic":"flora","Marsh":"flora","Water World":"flora",
  "Frozen":"frozen",
  "Barren":"mineral","Dead":"mineral","Scorched":"mineral","Volcanic":"mineral","Gas Giant":"mineral",
  "Radioactive":"tech","Irradiated":"tech","Exotic":"tech","Mega Exotic":"tech","The Reliquary":"tech"
};
var RES_ICON_ROUTES={
  mineral:["Dense mineral deposit detected. Mining opportunities nearby.",
           "Rich vein of surface deposits. Extraction site viable.",
           "Ore-bearing formation detected. Refinery drop recommended."],
  flora:["Organic compounds detected. Flora harvesting opportunities.",
         "Biological signal strong. Sampling site viable.",
         "Active growth detected. Farming outpost potential."],
  frozen:["Sub-zero signal detected. Extraction gear recommended.",
          "Frozen deposit located. Thermal protection advised.",
          "Ice-bound formation detected. Harvest opportunities present."],
  tech:["Anomalous signal detected. Approach with scanner ready.",
        "Unstable readings nearby. Proceed with caution.",
        "Salvageable technology detected. Recovery opportunity flagged."]
};
function resIconCategory(biome){ return RES_ICON_BIOME_CAT[biome]||"mineral"; }
function resIconResourceName(b,s){
  var bd=biomePal(b.biome), rlist=[];
  if(bd.res) rlist=rlist.concat(bd.res);
  var stel=STELLAR_EL[s.starTypes[0]]; if(stel) rlist.push(stel);
  if(b.resUni) rlist=rlist.concat(b.resUni);
  if(!rlist.length) rlist=["Unknown deposit"];
  var pick=mulberry32(b.seed^0x52c17)();
  return rlist[Math.floor(pick*rlist.length)];
}
function resIconRouteText(cat,seed){
  var bank=RES_ICON_ROUTES[cat]||RES_ICON_ROUTES.mineral;
  var pick=mulberry32(seed^0x7a11f)();
  return bank[Math.floor(pick*bank.length)];
}
var TERRAIN=["Pangean","Continental","Riverland","Wetlands","Swamp","Archipelago","Island Chains","Oceanic","Reef"];
var SYL_A=["Ok","Ux","Ya","Ze","Hu","Ig","Ba","Vy","Ne","Qo","Ri","Ta","El","Mu","Su","Ka"];
var SYL_B=["ra","lo","ni","tak","ves","mor","dun","phi","gal","ren","sup","yak","del","onu","cor","wex"];
var SYL_C=["","-I","-II","-III","-IV","-IX","-XI","-XV","us","ar","on","ix","eth","um"];

/* ============ rng ============ */
var GALAXY=0;
function h32(x,y,z,i){
  var h=2166136261>>>0,v=[x|0,y|0,z|0,i|0],k,b;
  for(k=0;k<4;k++) for(b=0;b<4;b++){ h^=((v[k]>>>(b*8))&0xff); h=Math.imul(h,16777619)>>>0; }
  return h>>>0;
}
function gseed(x,y,z,i){ return (h32(x,y,z,i) ^ Math.imul(GALAXY+1,2654435761))>>>0; }
function mulberry32(a){
  return function(){
    a|=0; a=(a+0x6D2B79F5)|0;
    var t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function pickOne(r,arr){ return arr[Math.floor(r()*arr.length)]; }
/* Exact per-galaxy type, transcribed from Tony's own reference list ("No Man's
   Sky - List of Galaxy Names and Types") and cross-checked programmatically
   against every one of the 255 names already in GALAXIES -- 254/255 matched on
   the first pass, the one mismatch was a transcription typo on this end (#243
   Zeziceloh), not a data error. Counts came out to 178 Norm / 26 Harsh /
   26 Empty / 25 Lush, matching the wiki-verified totals already noted in this
   project's history. Replaces the old (n+1)%20 approximation, which was only
   ever a rough guess at the real pattern -- most galaxies near each other in
   the dropdown landed on "Norm" under it, which is why switching galaxies
   looked like nothing changed. One letter per galaxy, in GALAXIES order:
   N=Norm H=Harsh E=Empty L=Lush. */
var GALAXY_TYPES="NNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNHNNNLNNNHNNNENNLNENNH";
var GALAXY_TYPE_INFO={
  Empty:{c:"#6ba8ff",names:["Ancestral","Frozen","Exhausted","Silent"]},
  Harsh:{c:"#ff7a4a",names:["Burning","Raging","Relentless","Ruthless"]},
  Lush:{c:"#6bffa8",names:["Halcyon","Inspiring","Serene","Tranquil"]},
  Norm:{c:"#00e5ff",names:["Imperfect","Improved","Parallel","Rebuilt"]},
  Unknown:{c:"#b06bff",names:["Hidden","Forbidden","Concealed","Uncharted"]}
};
function galaxyType(n){
  if(n===255){
    var u=GALAXY_TYPE_INFO.Unknown;
    return {k:"Unknown",c:u.c,names:u.names};
  }
  var code=GALAXY_TYPES[((n%GALAXY_TYPES.length)+GALAXY_TYPES.length)%GALAXY_TYPES.length];
  var k=code==="E"?"Empty":code==="H"?"Harsh":code==="L"?"Lush":"Norm";
  var info=GALAXY_TYPE_INFO[k];
  return {k:k,c:info.c,names:info.names};
}

/* ============ address maths ============ */
function toSigned(v,size){ var half=size/2; return v<half?v:v-size; }
function toRaw(s,size){ return s<0?s+size:s; }
function hex(n,w){ var s=n.toString(16).toUpperCase(); while(s.length<w) s="0"+s; return s; }
function cleanHex(str){ return (str||"").trim().toUpperCase().replace(/[^0-9A-F]/g,""); }
function parseAddress(str){
  var a=cleanHex(str);
  if(a.length!==12) return null;
  return {p:parseInt(a[0],16),idx:parseInt(a.slice(1,4),16),
    y:toSigned(parseInt(a.slice(4,6),16),SIZE_Y),
    z:toSigned(parseInt(a.slice(6,9),16),SIZE_XZ),
    x:toSigned(parseInt(a.slice(9,12),16),SIZE_XZ)};
}
function formatAddress(p,idx,x,y,z){
  return hex(p&0xF,1)+hex(idx&0xFFF,3)+hex(toRaw(y,SIZE_Y)&0xFF,2)+
         hex(toRaw(z,SIZE_XZ)&0xFFF,3)+hex(toRaw(x,SIZE_XZ)&0xFFF,3);
}
function glyphSrc(ch){ return "glyphs/glyph-mask-"+ch+".png"; }
/* every region is ~400 ly across, so voxel distance x 400 = light years */
function coreLY(vx,vy,vz){ return Math.round(Math.sqrt(vx*vx+vy*vy+vz*vz)*LY_PER_VOXEL); }
function commas(n){ return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,","); }
function bearingOf(dx,dz,dy){
  /* wiki compass, clockwise: north, beta, east, delta, south, gamma, west, alpha */
  var names=["north","beta","east","delta","south","gamma","west","alpha"];
  var ang=Math.atan2(dx,-dz);
  if(ang<0) ang+=Math.PI*2;
  var oct=Math.round(ang/(Math.PI/4))%8;
  var vert = dy>0.15 ? " majoris" : (dy<-0.15 ? " minoris" : "");
  return names[oct]+vert;
}

/* ============ generators ============ */
function nameFrom(seed){ var r=mulberry32(seed); return pickOne(r,SYL_A)+pickOne(r,SYL_B)+pickOne(r,SYL_C); }
function regionName(vx,vy,vz){
  var r=mulberry32(gseed(vx,vy,vz,0x5EED));
  var tail=["Anomaly","Fringe","Mass","Conflux","Expanse","Void","Sector","Cluster","Nebula","Reach"];
  return (pickOne(r,SYL_A)+pickOne(r,SYL_B)+" "+pickOne(r,tail)).toUpperCase();
}
/* Real bug found 2026-08-16: this used to return a placeholder 122-580,
   invented before nms-core was wired in. formatAddress()'s own encoding
   (idx&0xFFF) already proves the true per-region system-index field is 3
   hex digits -- 0-4095, 4096 possible systems -- and nms-core's real
   systemAttributes() only ever assigns purple/gas-giant to raw index
   1001-1065, which sat completely outside the old 580 ceiling. Net effect:
   purple stars (and therefore gas giants, which only ever roll on purple)
   could NEVER be generated anywhere, by anything that calls regionCount --
   ticking either filter was guaranteed to show "no systems match" forever,
   no matter how far you searched. This also starved regionCandidates()
   below, which is why Set course routes were taking far more hops than
   distance/range implied (see its own comment). Verified via a 300-region
   Node sweep with this fix: ~29% of regions now contain >=1 purple system
   and ~4% a gas giant at the default 22-per-region density -- both
   filters are reliably findable now instead of structurally impossible. */
function regionCount(vx,vy,vz){ return 4096; }
function weightedStar(r){
  var tot=0,i;
  for(i=0;i<STAR_TYPES.length;i++) tot+=STAR_TYPES[i].w;
  var v=r()*tot;
  for(i=0;i<STAR_TYPES.length;i++){ v-=STAR_TYPES[i].w; if(v<=0) return STAR_TYPES[i]; }
  return STAR_TYPES[0];
}
/* 0->yellow/white(F/G), 1->green(E), 2->blue(B/O), 3->red(K/M), 4->purple/exotic(X/Y) --
   nms-core's systemAttributes().star_type convention, mapped onto this site's own
   STAR_TYPES key names so everything downstream (colour, icon, ODDS table, spectral
   class letters) keeps working unchanged once the source of `st` changes. */
var NMS_STAR_TYPE_KEY=["yellow","green","blue","red","purple"];
/* portalCode as a BigInt, reusing formatAddress's own hex layout (P SSS YY ZZZ XXX)
   so this can never drift out of sync with the address the rest of the app already
   shows/copies for a system -- see DEPLOYMENT_BRIEF.md "File placement" section. */
function portalCodeBig(p,idx,vx,vy,vz){ return BigInt("0x"+formatAddress(p,idx,vx,vy,vz)); }
/* Real black-hole/Atlas-station placement for a region, replacing the old blanket
   "every region has exactly one of each, always at index 0x079/0x07A" assumption --
   see DEPLOYMENT_BRIEF.md "The fixed-index problem is bigger than one function".
   Derived from nms-core's voxelAttributes(): a region's guide-star/black-hole/Atlas
   counts are constant (120/1/1) everywhere except the ~8-voxel dead core around
   galaxy centre, where there are none of either -- this reduces to exactly the old
   0x079/0x07A indices everywhere outside that core (verified: guide_star_count+1 =
   0x79, +black_hole_count = 0x7A with the module's default counts), so this is a
   pure correctness fix for the dead core, not a behaviour change anywhere else.
   Falls back to the old fixed indices if nms-core isn't loaded (see module script
   above) so the map still renders something sensible either way. Returns
   {bh:index|-1, atlas:index|-1}; -1 means "this region genuinely has none". */
function regionAnomalyIdx(vx,vy,vz){
  if(window.NMSCore){
    try{
      var va=window.NMSCore.voxelAttributes(portalCodeBig(1,0,vx,vy,vz));
      return {
        bh: va.black_hole_count>0 ? (va.guide_star_count+1) : -1,
        atlas: va.atlas_station_count>0 ? (va.guide_star_count+va.black_hole_count+1) : -1
      };
    }catch(e){ /* fall through to legacy fallback below */ }
  }
  return {bh:0x079, atlas:0x07A};
}
function generateSystem(vx,vy,vz,idx,noOverride){
  var r=mulberry32(gseed(vx,vy,vz,idx)), s={}, i;
  s.vx=vx; s.vy=vy; s.vz=vz; s.idx=idx; s.galaxy=GALAXY;

  /* Accurate star type / planet count / black hole & Atlas placement / system,
     region & planet naming via the ported nms-core module (see
     DEPLOYMENT_BRIEF.md) when it's loaded; every field below falls back to
     this site's original procedural approximation otherwise (module not yet
     ready, or unavailable e.g. under file://). address is built once up
     front since both the accurate path and s.address (unchanged, still
     shown/copied everywhere else) need the exact same portal code. */
  var address=formatAddress(1,idx,vx,vy,vz);
  var pc = window.NMSCore ? BigInt("0x"+address) : null;
  var attrs=null;
  if(pc!==null){
    try{ attrs=window.NMSCore.systemAttributes(pc,GALAXY); }catch(e){ attrs=null; }
  }

  var st = attrs ? starTypeByKey(NMS_STAR_TYPE_KEY[attrs.star_type]||"yellow") : weightedStar(r);
  s.type=st.k; s.color=st.col;

  var anomaly=regionAnomalyIdx(vx,vy,vz);
  s.blackHole=(idx===anomaly.bh); s.atlas=(idx===anomaly.atlas);
  s.phantom=""; // "phantom" | "shadow" | "" -- manual-only, see applyOverride()

  /* Giants are exclusive to purple systems in the real game. Now driven
     directly by nms-core's own gas_giant draw (real gate, not a guess) when
     available; falls back to the placeholder GIANT_CHANCE roll otherwise --
     Tony, that placeholder now only matters for the file:// fallback path,
     see the comment on GIANT_CHANCE above. */
  s.giant = attrs ? !!attrs.gas_giant
                  : (s.type==="purple" && mulberry32(gseed(vx,vy,vz,idx^0x61A47))()<GIANT_CHANCE);
  s.spectral=pickOne(r,st.cls)+Math.floor(r()*10)+pickOne(r,["","","","f","p","pf"]);
  s.water=r()<0.18; s.dissonant=r()<0.10;
  var sc=r(); s.stars = sc<0.80?1:(sc<0.95?2:3);
  /* binary and ternary systems: each star a different colour */
  s.starColors=[st.col];
  s.starTypes=[st.k];
  var pool=[];
  for(i=0;i<STAR_TYPES.length;i++) if(STAR_TYPES[i].k!==st.k) pool.push(STAR_TYPES[i]);
  for(i=1;i<s.stars;i++){
    var pi2=Math.floor(r()*pool.length);
    var pick=pool.splice(pi2,1)[0];
    s.starColors.push(pick.col); s.starTypes.push(pick.k);
  }

  if(attrs && window.nmsLetterMap){
    try{ s.name=window.NMSCore.systemName(pc,GALAXY,window.nmsLetterMap); }
    catch(e){ s.name=nameFrom(gseed(vx,vy,vz,idx^0xABCD)); }
    try{ s.region=window.NMSCore.regionName(pc,GALAXY,window.nmsLetterMap); }
    catch(e){ s.region=regionName(vx,vy,vz); }
  } else {
    s.name=nameFrom(gseed(vx,vy,vz,idx^0xABCD));
    s.region=regionName(vx,vy,vz);
  }

  /* Economy/conflict/race/outlaw/abandoned/uncharted.
     2026-08-23: now wired to the REAL algorithm when it's available --
     `attrs` (computed above, same object already driving star_type/
     gas_giant/planet counts) carries systemAttributes()'s own
     economy_type/wealth/conflict_level/dominant_race/uncharted/abandoned/
     pirate, ~99% validated against 1000 ground-truth systems (see
     nms-core/system.js's header). window.NMSEconomy.
     rollSystemFlavorFromAttrs() takes those as given and only rolls the
     flavour-text word within each type/tier plus sell%/buy% (the one piece
     systemAttributes() doesn't model -- see economy.js's own rollSellBuy()
     header for the 2026-08-23 corpus refit that replaced the old
     tier-scaled sell/buy guess).
     Falls back to the ORIGINAL fully-independent roll -- via
     window.NMSEconomy.rollSystemFlavor() when the module loaded but attrs
     didn't (no portal address, e.g. this function called with no valid
     vx/vy/vz), or this identical inline copy when even the module failed
     to load (file://) -- unchanged from before this wiring, still the same
     path verified byte-identical against economy.js via a 200,000-trial
     parity test, RNG-call parity included so everything drawn from `r`
     afterwards (e.g. the fallback body-count total below) stays in sync.
     Order (abandoned first & unconditional, uncharted only if not
     abandoned, outlaw only if not uncharted) verified 2026-08-12 against
     nms-core's own corpus-verified real draw sequence (system.js's
     ABANDONED_SYSTEM_PCT comment: "when a system is abandoned, the
     empty-system check draw is SKIPPED") -- this project previously rolled
     uncharted first instead, which skewed purple's real 35% abandoned rate
     down to ~28% before the fix. */
  var flavor;
  // flavorIsReal: true only when race/economy/conflict came from the real
  // systemAttributes()-derived path (rollSystemFlavorFromAttrs) -- i.e.
  // essentially always. False in the rare fallback branches below (no
  // portal address, or nms-core/economy.js failed to load), where these
  // fields really are still an independent invented guess. Drives the
  // "Procedural" tag/greyed styling in updatePanel() -- 2026-08-23:
  // previously that tag fired for EVERY system regardless, back when all
  // three fields were always invented; now it should only fire when they
  // actually are. See the About modal's "Procedural data" section and the
  // .guessVal/.tag.guess CSS comment above for the same update.
  var flavorIsReal=!!(attrs && window.NMSEconomy && window.NMSEconomy.rollSystemFlavorFromAttrs);
  if(flavorIsReal){
    flavor=window.NMSEconomy.rollSystemFlavorFromAttrs(r,attrs);
  } else if(window.NMSEconomy){
    flavor=window.NMSEconomy.rollSystemFlavor(r,st.k);
  } else {
    var o=ODDS[st.k];
    flavor={};
    flavor.abandoned=r()<o.aba;
    flavor.uncharted=!flavor.abandoned&&(r()<o.unc);
    flavor.outlaw=!flavor.uncharted&&(r()<o.out);
    flavor.race=(flavor.uncharted||flavor.abandoned)?"Uninhabited":pickOne(r,RACES);
    var e=pickOne(r,ECON);
    flavor.econType=e[0]; flavor.econName=pickOne(r,e[1]);
    var tr=r(); flavor.econTier=tr<0.45?0:(tr<0.85?1:2);
    flavor.econDesc=pickOne(r,ECON_S[flavor.econTier]);
    // sell%/buy% -- 2026-08-23 refit, see economy.js's rollSellBuy() header
    // for the full corpus writeup; kept byte-identical to that function.
    var s3=r()+r()+r();
    flavor.sell=Math.max(0,60+(s3-1.5)*24).toFixed(1);
    flavor.buy=(-(10+r()*20)).toFixed(1);
    var cr=r(); flavor.conTier=cr<0.45?0:(cr<0.82?1:2);
    flavor.conflict=pickOne(r,CONFLICT[flavor.conTier]);
  }
  s.abandoned=flavor.abandoned; s.uncharted=flavor.uncharted; s.outlaw=flavor.outlaw;
  s.race=flavor.race;
  s.econType=flavor.econType; s.econName=flavor.econName; s.econTier=flavor.econTier;
  s.econDesc=flavor.econDesc; s.sell=flavor.sell; s.buy=flavor.buy;
  s.conTier=flavor.conTier; s.conflict=flavor.conflict;
  // Per-field "has a traveller actually confirmed this" flags -- see
  // applyOverride() below for where these flip true. Deliberately separate
  // from s.override (whole-system flag): a system can be "Community edited"
  // for its name/planets while race/economy/conflict are still nobody's
  // confirmed guess, and the UI (updatePanel's "Procedural" tags) needs to know
  // that per-field, not just per-system.
  s.raceVerified=false; s.econVerified=false; s.conflictVerified=false;
  // Per-field "is this the real algorithm, not an invented guess" flags --
  // see flavorIsReal above. All three start equal (one flavor roll covers
  // all of them) but kept separate, same shape as *Verified above, in case
  // a future partial-attrs path ever needs to split them.
  s.raceReal=flavorIsReal; s.econReal=flavorIsReal; s.conflictReal=flavorIsReal;

  /* Total body count (planets+moons combined, real 6-body hard cap): accurate
     via nms-core's planetSeeds() when available -- its final planet_count+
     moon_count already folds in the gas-giant collapse (1 planet+5 moons)
     and the real prime-planet/moon-absorption draws, replacing the old flat
     2-6 guess. Falls back to that same guess otherwise.
     Real bug found 2026-08-22 (Tony/GoodGuysFree side-by-side test against
     Umensk-Feks XVIII): the COUNT was accurate but the planet/moon SPLIT
     wasn't -- ps.moon_count was computed right below and then silently
     discarded; each non-giant body instead got its own independent
     br()<0.28 coin-flip to decide isMoon. For that real system nms-core
     correctly says moon_count=0 (6 plain planets, matching the in-game
     Discoveries panel exactly), but the coin-flip still tagged one body as
     a moon anyway. Fixed below by using ps.moon_count to fix the TOTAL
     number of moon slots (moonSlots) instead of rolling independently.
     WHICH specific body ends up flagged is still a guess -- nms-core
     doesn't expose a per-slot breakdown to port that part accurately (see
     DEPLOYMENT_BRIEF.md; that half of the gap is real and stays scoped
     out) -- but the moon COUNT itself no longer contradicts data nms-core
     already handed us. */
  var total, ps=null;
  if(attrs){
    try{
      ps=window.NMSCore.planetSeeds(pc,GALAXY);
      total=Math.min(6,Math.max(1,ps.planet_count+ps.moon_count));
    }catch(e){ total=2+Math.floor(r()*5); if(total>6) total=6; }
  } else {
    total=2+Math.floor(r()*5); if(total>6) total=6;
  }
  // Pick exactly ps.moon_count of the non-first slots (index 0 is always a
  // planet -- same as the old logic's implicit pi>0 requirement) to be
  // moons, via a seed dedicated to this choice so it never disturbs any
  // other draw. Giant systems are untouched: s.giant already forces every
  // trailing body to be a moon of the giant, which was already exactly
  // right (gasGiant collapses nms-core's own planet_count to 1, so
  // moon_count there is already total-1 -- verified against system.js).
  var moonSlots=null;
  if(!s.giant && ps){
    var wantMoons=Math.min(ps.moon_count,Math.max(0,total-1));
    if(wantMoons>0){
      var candidates=[]; for(var ci=1; ci<total; ci++) candidates.push(ci);
      var slotR=mulberry32(gseed(vx,vy,vz,idx^0x4001));
      for(var si=0; si<wantMoons; si++){
        var jx=si+Math.floor(slotR()*(candidates.length-si));
        var tmp=candidates[si]; candidates[si]=candidates[jx]; candidates[jx]=tmp;
      }
      moonSlots=new Set(candidates.slice(0,wantMoons));
    } else {
      moonSlots=new Set();
    }
  }
  /* Biome weighting -- 2026-08-24, see nms-core/economy.js's pickBiome()
     header for the full research writeup (wiki-sourced BIOMELISTPERSTARTYPE.MBIN
     weights, disclosed Harsh/Purple placeholders). galaxyType(GALAXY).k is
     computed once here (not per-body -- it can't change within one system)
     via the same function already used for the nebula palette/badge. */
  var gxType=galaxyType(GALAXY).k;
  s.bodies=[]; s.planets=0; s.moons=0; s.signals=[];
  for(var pi=0; pi<total; pi++){
    var br=mulberry32(gseed(vx,vy,vz,(idx<<4)^(pi+7)));
    var isMoon = s.giant ? (pi>0)
      : (moonSlots ? moonSlots.has(pi) : (pi>0 && br()<0.28 && s.bodies.length>0));
    // isPrime approximation: body slots beyond systemAttributes()'s own real
    // "normal" planet_count are treated as Prime/extra -- same disclosed
    // "which exact slot" gap as the moonSlots approximation above (nms-core
    // doesn't expose a per-slot breakdown), not confirmed ground truth.
    // Defaults false (the safer "Normal Planets" table) whenever attrs
    // itself isn't available (no portal address / module not loaded).
    var isPrimeBody = !!(attrs && attrs.planet_count!==undefined && pi>=attrs.planet_count);
    // Same window.NMSEconomy-with-inline-fallback pattern as the flavor/ring
    // rolls above: weighted pick (real research, still exactly one br() draw,
    // see pickBiome()'s own header) when the module loaded, else the
    // original flat uniform pick, unchanged -- verified byte-identical draw
    // count via a dedicated parity test either way.
    var biome = window.NMSEconomy
      ? window.NMSEconomy.pickBiome(br,{starKey:s.type,galaxyType:gxType,isPrime:isPrimeBody})
      : pickOne(br,GEN_BIOME_KEYS);
    var bd=BIOMES[biome];
    var canWater = bd.water && !isMoon;
    var hasWater = canWater && br()<0.62;
    // Same fallback pattern as the flavor roll above -- window.NMSEconomy's
    // rollRing() when available, else this identical inline copy. Verified
    // byte-identical (including the isMoon short-circuit that skips
    // consuming br() entirely for moons, preserving downstream br() draws
    // for resUni/size/tilt/spin below) via the same parity test.
    var ringStyle = window.NMSEconomy
      ? window.NMSEconomy.rollRing(br,biome,isMoon)
      : (!isMoon && br()<RING_CHANCE ? (RING_STYLE_BY_BIOME[biome]||"tan") : false);
    var hasRing = !!ringStyle;
    // Resource-count cap -- 2026-08-23, per Tony's own real-gameplay count
    // (up to ~5 resources shown per planet) plus the wiki's own general
    // rule ("except for Dead/Exotic, each biome has five resources") --
    // previously rolled a SECOND universal element too (~83% chance of
    // landing on a distinct one), pushing most planets to 6 total (3
    // biome-fixed + 1 stellar + 2 universal) instead of the real ~5. Now
    // only ever rolls one universal element -- still consumes exactly one
    // br() call either way, so this is a single deliberate draw-count
    // change (downstream size/tilt/spin for a given address will shift as
    // a result -- expected, see the GEN_VERSION bump above).
    var resUni=[UNIVERSAL_EL[Math.floor(br()*UNIVERSAL_EL.length)]];
    /* Body names stay on the cheap legacy generator here, even when nms-core
       is available -- benchmarked at ~0.15ms/system for the accurate
       per-body planetName() calls (75% of a system's total generation cost),
       which would freeze the page for several seconds on a "Heavy" slice
       regen (see the Node harness in this session's verification, referenced
       from DEPLOYMENT_BRIEF.md's own "needs benchmarking" flag). Real names
       are still used, just lazily -- see upgradeBodyNames(), called once
       from updatePanel() so a viewed/entered system always shows accurate
       names without paying that cost for the thousands of systems rendered
       as unlabeled points that a player never opens. */
    var bodyName=nameFrom(gseed(vx,vy,vz,(idx*31)+pi));
    s.bodies.push({
      index:pi+1, moon:isMoon,
      // every moon of a Giant orbits the Giant itself (always body #1) --
      // NOT the previous body pushed, which is what the non-giant fallback
      // means (each planet's own trailing moon chain)
      parent:isMoon?(s.giant?1:s.bodies[s.bodies.length-1].index):0,
      name:bodyName,
      nameOverridden:false, // this is the placeholder legacy name, not a real traveller submission -- upgradeBodyNames() is free to replace it with the accurate nms-core name
      biome:biome, biomeOverridden:false, // procedural roll, never a traveller submission (2026-09-08, Tony/goodguyfree: nobody's reverse-engineered the real biome roll, so this never displays as fact -- see the .bb/bBiome render sites, which show "Unknown" instead of this value until a real submission exists) -- the value itself is KEPT and still drives colour/ring-style rendering, only the TEXT claim is gated
      terrain:hasWater?pickOne(br,TERRAIN.slice(1)):"Pangean", water:hasWater,
      ring:ringStyle,
      // Renamed from ringOverridden (2026-09-09, Tony: "has water and rings
      // until again user input" should work the same as biome) -- this
      // flag now covers BOTH water and rings, not just rings: neither has
      // ever been reverse-engineered any more than biome has, they're both
      // procedural guesses from the same rollRing()/hasWater roll, so both
      // get the same treatment biome already has -- simply not shown as
      // fact until a traveller's real Edit system submission exists for
      // this whole body. See applyOverride() below for where this flips
      // true, and the .bb/tags render sites for where it gates display.
      bodyOverridden:false, // procedural roll, never a traveller submission
      size:isMoon?(0.34+br()*0.22):(0.68+br()*0.62),
      tilt:(br()-0.5)*0.7, spin:0.15+br()*0.5,
      resUni:resUni,
      sentinel:rollSentinelGuess(br,s.conTier),
      sentinelOverridden:false, // invented per-body guess (rollSentinelGuess()), never a traveller submission -- see the "guess" tag on the panel body list
      seed:gseed(vx,vy,vz,(idx*57)+pi)
    });
    if(isMoon) s.moons++; else s.planets++;
  }
  // Ring dedup -- 2026-08-23, per Tony's own real-gameplay observation
  // ("only ever seen one planet with rings in a system"). NOT confirmed
  // against decompiled game data or the wiki -- GCSOLARGENERATIONGLOBALS'
  // own PlanetRingProbability (RING_CHANCE=0.30, see nms-core/economy.js)
  // is a flat PER-PLANET roll with no system-level gating found during the
  // 2026-08-12 decompile, so this cap is this project's own invented rule
  // layered on top of that real per-planet roll -- same disclosed-guess
  // pattern as RING_STYLE_BY_BIOME. Every non-moon body still rolls its own
  // real 30% chance above (rollRing(), unchanged, so the underlying
  // per-planet odds stay faithful to the decompiled data); this pass only
  // trims a system down to at most one ringed planet afterward, picking
  // uniformly among whichever planets happened to roll true, via a
  // system-level seeded RNG so the choice stays deterministic/reproducible
  // for the same address. Flagged to Tony as easy to revert/adjust if he
  // later confirms multiple ringed planets per system ARE real.
  var ringedIdx=[];
  for(var rgi=0; rgi<s.bodies.length; rgi++) if(!s.bodies[rgi].moon && s.bodies[rgi].ring) ringedIdx.push(rgi);
  if(ringedIdx.length>1){
    var ringPickR=mulberry32(gseed(vx,vy,vz,idx^0x5201));
    var keepRingIdx=ringedIdx[Math.floor(ringPickR()*ringedIdx.length)];
    for(var rgj=0; rgj<ringedIdx.length; rgj++){
      if(ringedIdx[rgj]!==keepRingIdx) s.bodies[ringedIdx[rgj]].ring=false;
    }
  }
  s.address=address;
  s.coreLY=coreLY(vx,vy,vz);
  // noOverride: used only by getFieldStatus()'s procedural-baseline diff
  // (see below) -- gives a clean "what would this system look like with NO
  // community data at all" snapshot to compare a real, override-applied
  // system against, field by field, without a second copy of every
  // generation rule living in two places.
  if(!noOverride) applyOverride(s);
  return s;
}

/* ============ shared community overrides ============ */
/* Loaded once from the Netlify Function (which itself reads a JSON file
   kept in a GitHub repo -- see netlify/functions/system-edit.mjs). Layered
   over the procedural output so a system a player has entered real
   in-game data for shows that data to every visitor, not just locally. */
var FUNC_URL="/.netlify/functions/system-edit";
var FLAG_URL="/.netlify/functions/flag-dispute";
var FEEDBACK_URL="/.netlify/functions/feedback";
var OVERRIDES={systems:{},communityTerms:{}};
/* Alliance badges (2026-09-10) -- name-keyed, not system-keyed, so this is
   deliberately its own top-level registry rather than living inside
   OVERRIDES: a single alliance's entry here can apply to many different
   systems' records at once. Populated by loadOverrides() from the same GET
   response's `alliances` field (see system-edit.mjs's handleGet()), keyed
   exactly the way normalizeAllianceKey() keys it server-side (lib/shared.mjs)
   -- allianceKey() below is the client-side copy of that same trim+lowercase
   rule, kept in sync by hand same as FLAG_CATEGORIES already is. */
var ALLIANCES={};
function allianceKey(name){ return String(name||"").trim().toLowerCase(); }
/* Small inline badge icon for the info panel's "(Alliance: X)" tag pill
   (see updatePanel()'s tags array) -- returns "" (nothing) when this
   alliance has no shared badge on file yet. Tag pill content is already
   built as an HTML string elsewhere (see the tags.push html join further
   down), so an <img> here renders exactly like the rest of that pill,
   same reasoning that let conBadge() already do this for the Conflict row. */
function allianceBadgeTagHtml(name){
  var a=ALLIANCES[allianceKey(name)];
  if(!a||!a.badgeUrl) return "";
  return ' <img src="'+a.badgeUrl+'" alt="" style="width:13px;height:13px;object-fit:cover;border-radius:3px;vertical-align:-2px;border:1px solid rgba(255,255,255,.25)">';
}
/* The 12 whole-row flag categories a visitor can flag/dispute (see
   FLAG_FIELDS in netlify/functions/_shared.mjs -- kept in sync by hand,
   there's no way to share a JS module between the client bundle and the
   Netlify Functions here). "bodies.N" (N=0..5) is the 13th category,
   generated dynamically per system rather than listed here. */
var FLAG_CATEGORIES=["name","race","region","starClass","stars","suffix","giant","economy","conflict","blackHole","atlas","phantom","notes","screenshot"];
function applyOverride(s){
  // Real per-galaxy addressing (2026-08-22): the shared systems dict is
  // keyed "galaxy:ADDRESS" now, not just ADDRESS (see lib/shared.mjs's
  // compositeKey() comment) -- skey() is the exact same helper store.marks/waypoints/
  // visited already use for this, reused here rather than duplicated.
  var ov=OVERRIDES.systems && OVERRIDES.systems[skey(s)];
  // Backward-compat fallback for data/overrides.json records that predate
  // the 2026-08-22 composite-key migration -- see the long comment above
  // applyOverride() for the full why. Only applies in Euclid (galaxy 0), matching the
  // migration's own default, and only when no real composite-keyed record
  // already exists for this address (a fresh post-migration or newly-
  // edited record always wins).
  if(!ov && OVERRIDES.systems && s.galaxy===0) ov=OVERRIDES.systems[s.address];
  // Flag/dispute status can exist on a system that's never been edited at
  // all (a visitor can flag a purely procedural value as "this looks
  // wrong" without providing a correction) -- so this has to be read BEFORE
  // the "no override data" early-return below, not folded into it.
  s.flaggedFields=(ov&&ov.flaggedFields)||[];
  s.disputedFields=(ov&&ov.disputedFields)||[];
  if(!ov || !ov.data) return s;
  var d=ov.data;
  s.override=true;
  s.overrideAt=ov.editedAt;
  if(d.name) s.name=d.name;
  if(d.race){ s.race=d.race; s.raceVerified=true; }
  if(d.econName){ s.econName=d.econName; s.econVerified=true; }
  if(d.sell){ s.sell=d.sell; s.econVerified=true; }
  if(d.buy){ s.buy=d.buy; s.econVerified=true; }
  if(d.econDesc){ s.econDesc=d.econDesc; var et=tierFromWord(d.econDesc,ECON_S); if(et!==null) s.econTier=et; s.econVerified=true; }
  if(d.conflict){ s.conflict=d.conflict; var ct=tierFromWord(d.conflict,CONFLICT); if(ct!==null) s.conTier=ct; s.conflictVerified=true; }
  if(d.blackHole!==undefined) s.blackHole=!!d.blackHole;
  if(d.atlas!==undefined) s.atlas=!!d.atlas;
  if(d.phantom!==undefined) s.phantom=(d.phantom==="phantom"||d.phantom==="shadow")?d.phantom:"";
  if(d.region) s.region=d.region;
  if(d.starClass) s.spectral=d.starClass;
  // Number of stars + each star's own colour -- wiki-confirmed real game
  // mechanics: 1-3 stars per system (single/binary/ternary), and in a
  // binary/ternary system every star is a different colour. d.stars is an
  // array of colour keys (index 0 = the "original"/primary star, which is
  // what actually drives this system's spectral class, biome odds and
  // economy-element odds elsewhere in the generator). Falls back to the
  // procedural stars if no override was ever saved.
  if(d.stars && d.stars.length){
    var validKeys=STAR_TYPES.map(function(t){return t.k;});
    var stk=[];
    for(var si=0; si<d.stars.length && si<3; si++){
      if(validKeys.indexOf(d.stars[si])>=0 && stk.indexOf(d.stars[si])<0) stk.push(d.stars[si]);
    }
    if(stk.length){
      s.starTypes=stk;
      s.starColors=stk.map(function(k){ return starTypeByKey(k).col; });
      s.stars=stk.length;
      s.type=stk[0];
      s.color=starTypeByKey(stk[0]).col;
    }
  }
  // Independent flags, not a 3-way choice -- confirmed against the wiki:
  // Water (Abyss update) and Dissonant (Interceptor update) were added in
  // separate updates as separate per-system conditions ("has an ocean
  // world" / "has a dissonant world"), so a system can legitimately show
  // both suffixes at once. The old single edSuffix dropdown couldn't
  // represent that -- picking one always silently cleared the other.
  if(d.water!==undefined) s.water=!!d.water;
  if(d.dissonant!==undefined) s.dissonant=!!d.dissonant;
  if(d.giant!==undefined) s.giant=!!d.giant;
  if(d.ruins!==undefined) s.ruins=!!d.ruins;
  if(d.outlaw!==undefined) s.outlaw=!!d.outlaw;
  if(d.abandoned!==undefined) s.abandoned=!!d.abandoned;
  if(d.colliding!==undefined) s.colliding=!!d.colliding;
  // collidingSet (2026-09-13, goodguyfree found a real 4-planet pileup in-
  // game): replaces the old fixed collidingA/collidingB pair with an
  // arbitrary-length list of 1-based body positions, so a cluster of any
  // size can be documented, not just two. Older saved systems only ever
  // wrote collidingA/collidingB -- synthesize the equivalent 2-entry set
  // from those so pre-existing data keeps rendering exactly as before.
  if(d.collidingSet!==undefined && Array.isArray(d.collidingSet)){
    s.collidingSet=d.collidingSet.map(function(n){ return n|0; }).filter(function(n){ return n>0; });
  } else if(d.collidingA!==undefined || d.collidingB!==undefined){
    s.collidingSet=[d.collidingA|0, d.collidingB|0].filter(function(n){ return n>0; });
  }
  if(d.hasStation!==undefined) s.hasStation=!!d.hasStation;
  if(d.stationName!==undefined) s.stationName=d.stationName||"";
  if(d.allianceName!==undefined) s.allianceName=d.allianceName||"";
  if(d.stationPhoto!==undefined) s.stationPhoto=d.stationPhoto||"";
  // Traveller-submitted resource/signal markers (2026-09-09, Cosmos-era
  // follow-up -- Tony: "maybe can choose which planet when adding icon").
  // Purely traveller data with no procedural counterpart to merge against
  // (unlike bodies[], which blends real submissions with procedural
  // rendering-only fields) -- so this is a plain overwrite, same treatment
  // as stationName/stationPhoto just above.
  s.signals=(d.signals&&d.signals.length)?d.signals:[];
  s.publicNotes=d.notes||"";
  s.publicScreenshot=d.screenshot||"";
  s.editorName=d.editorName||"";
  s.editorFriendCode=d.editorFriendCode||"";
  s.editorFriendCodeVisible=!!d.editorFriendCodeVisible;
  if(d.bodies && d.bodies.length){
    var orig=s.bodies, out=[], planetIdx=0, lastPlanetIndex=0;
    for(var i=0;i<d.bodies.length && i<6;i++){
      var b=d.bodies[i]||{};
      var o=orig[i]; /* reuse the procedural body's rendering-only fields (size/tilt/spin/seed) when one exists at this slot, purely cosmetic, never shown to the player */
      // Was BIOMES[b.biome]?b.biome:... (silently discarded anything not a
      // known key) -- relaxed 2026-08-26 (Tony) so a traveller's own typed
      // custom biome name (not on the official list) survives being saved
      // and re-loaded, not just the 12 recognised ones. Render call sites
      // that need real palette/texture data now go through biomePal(),
      // which falls back to a generic palette for any unrecognised name.
      var biome=(b.biome&&String(b.biome).trim())?String(b.biome).trim():(o?o.biome:"Lush");
      // 2026-09-08 (Tony/goodguyfree): true only when THIS traveller actually
      // typed a biome for this slot -- same "blank falls back to the
      // procedural/original guess for RENDERING only, never for the text
      // claim" pattern as nameOverridden above. A blank submission still
      // falls through to o.biome/"Lush" so the planet keeps a sensible
      // colour/ring-style, but .bb/bBiome render "Unknown" text unless this
      // is true.
      var biomeOverridden=!!(b.biome&&String(b.biome).trim());
      var isMoon=!!b.moon && i>0;
      var idx1=i+1;
      /* If the traveller explicitly picked which planet a moon orbits
         (the Orbits dropdown), b.orbits is the 1-based position of that
         planet within this SAME saved bodies array -- use it when it still
         points at a real, non-moon body. Otherwise fall back to the old
         behaviour (assume it orbits the nearest preceding planet), which
         also covers every save made before this field existed. */
      var validOrbit=isMoon && b.orbits>=1 && b.orbits<=d.bodies.length && d.bodies[b.orbits-1] && !d.bodies[b.orbits-1].moon;
      out.push({
        index:idx1,
        moon:isMoon,
        parent:isMoon?(validOrbit?b.orbits:lastPlanetIndex):0,
        name:(b.name&&b.name.trim())||(o?o.name:"Unnamed"),
        // true only when THIS traveller actually typed a name for this slot --
        // tells upgradeBodyNames() (below) to never clobber a real submitted
        // name with its own procedural guess. A blank submission (falling
        // through to the old procedural o.name/"Unnamed") is NOT a real name,
        // so it stays eligible to be upgraded to the accurate one.
        nameOverridden:!!(b.name&&b.name.trim()),
        biome:biome,
        biomeOverridden:biomeOverridden,
        subtype:(b.subtype||"").trim(),
        descriptor:b.descriptor||"",
        terrain:o?o.terrain:"Pangean",
        water:!!b.water,
        ring:(!isMoon&&!!b.ring)?(RING_STYLE_BY_BIOME[biome]||"tan"):false,
        bodyOverridden:true, // this whole body came from a traveller's Edit system submission (d.bodies) -- water/ring checkboxes included, a real answer either way, not a procedural roll
        // Reuse the procedural body's own size ONLY when this slot's
        // moon/planet role still matches what procedural generation
        // originally rolled for it (o.moon===isMoon) -- otherwise a
        // traveller correcting a body FROM planet TO moon (or vice versa --
        // Tony's real Nogsangh report 2026-09-01: "Udre II"/"Ibai 73/C5"
        // swapped) kept the OLD role's size, so the newly-flagged moon
        // rendered bigger than the planet it's supposed to orbit ("looks
        // like a planet orbiting a moon"). When the role genuinely
        // changed, fall back to the same flat per-role default already
        // used for a brand-new body added at this slot.
        size:(o&&o.moon===isMoon)?o.size:(isMoon?0.42:0.85),
        tilt:o?o.tilt:((i%2?1:-1)*(0.1+0.05*i)),
        spin:o?o.spin:0.3,
        resUni:(b.resources&&b.resources.length)?b.resources.slice(0,6):(o?o.resUni:[]),
        flora:(b.flora&&b.flora.length)?b.flora.slice(0,6):[],
        fauna:(b.fauna&&b.fauna.length)?b.fauna.slice(0,6):[],
        minerals:(b.minerals&&b.minerals.length)?b.minerals.slice(0,6):[],
        salvage:(b.salvage&&b.salvage.length)?b.salvage.slice(0,6):[],
        fossils:(b.fossils&&b.fossils.length)?b.fossils.slice(0,6):[],
        // 2026-08-23, fixed same day: unlike ring's checkbox (where an
        // unchecked box IS a real, deliberate answer -- "I looked, no
        // ring"), the Sentinel combo just starts every edit pre-filled with
        // whatever's already there, "None" before this feature existed --
        // so treating a submitted "None" as a real confirmed answer here
        // made EVERY never-touched body on EVERY previously-edited system
        // permanently show "Not reported" instead of the new procedural
        // guess, and (since fsBodyKey() below hashes sentinel into its
        // edited-vs-original diff) made every single body on those systems
        // wrongly read as "edited" too, since the live "None" no longer
        // matched the freshly-generated procedural-guess baseline. Only a
        // real, specific tier word counts as a traveller confirmation now;
        // a bare "None" falls back to the original procedural body's own
        // guess (o.sentinel) at this slot, same "reuse the procedural
        // body's own field" pattern `o` already exists for above -- or
        // plain "None" if this slot didn't exist procedurally at all (a
        // traveller-added extra body, nothing to fall back to).
        sentinel:(b.sentinel && SENTINEL_ALL_WORDS.indexOf(b.sentinel)>=1)?b.sentinel:(o?o.sentinel:"None"),
        sentinelOverridden:!!(b.sentinel && SENTINEL_ALL_WORDS.indexOf(b.sentinel)>=1),
        autophage:!!b.autophage,
        // Reliquary ruins (2026-09-08, Tony: "probably better to put
        // Reliquary into the boolean flag like autophage and ruins") --
        // replaces "The Reliquary" as a selectable top-level biome (research
        // found it's actually a prefix/suffix TAG the real game layers onto
        // an existing biome -- "Abandoned Desert", "Dusty Relic" -- not a
        // 13th category of its own), same manual-only pattern as autophage:
        // no procedural rule exists for which planet has one, purely a
        // traveller's own in-game observation. Deliberately its OWN field,
        // not reusing the existing system-level `ruins` flag ("Ancient
        // Ruins" surface POI, ruins/edRuins) -- that's a different, already-
        // shipped concept (Knowledge Stones + memoir device) and conflating
        // the two would misrepresent both.
        reliquary:!!b.reliquary,
        // Ruins (2026-09-08, split from Reliquary per Tony: "Reliquary and
        // ruins should be 2 separate tick boxes not together") -- same
        // per-body/manual-only pattern, deliberately independent so a
        // traveller can flag either observation without the other. Note
        // this reuses the field name "ruins" already used by the SYSTEM-
        // level flag (payload.ruins/s.ruins, Ancient Ruins POI) -- same
        // precedent as "water" already existing at both system AND per-
        // body level in this same payload shape, so no actual collision.
        ruins:!!b.ruins,
        // "Has base" (2026-08-17, Tony): personal-marker-style field, same
        // manual-only pattern as autophage/rings -- no procedural rule
        // exists (or could exist) for where a TRAVELLER'S OWN base sits.
        // baseName added 2026-08-21 -- the base's own name, distinct from
        // (and never written into) the planet or star's own name field.
        base:!!b.base,
        baseName:(b.baseName||"").trim(),
        seed:o?o.seed:gseed(s.vx,s.vy,s.vz,(s.idx*57)+i)
      });
      if(!isMoon) lastPlanetIndex=idx1;
    }
    s.bodies=out;
    s.planets=0; s.moons=0;
    for(i=0;i<out.length;i++){ if(out[i].moon) s.moons++; else s.planets++; }
  }
  return s;
}
function loadOverrides(){
  fetch(FUNC_URL,{method:"GET"}).then(function(r){
    if(!r.ok) throw new Error("status "+r.status);
    return r.json();
  }).then(function(data){
    if(!data || !data.ok) return;
    OVERRIDES.systems=data.systems||{};
    // Community-submitted dropdown vocabulary (2026-09-02) -- see
    // system-edit.mjs's handleGet()/addCommunityTerms() for what this is.
    // Repopulating the Descriptor datalist and re-rendering is enough:
    // buildCommaCombo()'s own allItems() reads OVERRIDES.communityTerms
    // fresh on every open, so nothing else needs to be told this arrived.
    OVERRIDES.communityTerms=data.communityTerms||{};
    // Alliance badges (2026-09-10) -- see the ALLIANCES var comment above.
    // No populate/refresh call needed the way communityTerms needs
    // populateDatalists(): this only ever gets READ, on demand, by
    // renderEdAllianceBadge() (Edit system modal) and allianceBadgeTagHtml()
    // (info panel tag) -- both already re-render from live state whenever
    // they're called, so nothing needs to be proactively pushed out here.
    ALLIANCES=data.alliances||{};
    populateDatalists();
    if(Object.keys(OVERRIDES.systems).length) refreshAfterOverrides();
  }).catch(function(){
    /* Shared edits are a nice-to-have layer -- if the Function isn't set up yet
       (no GITHUB_TOKEN, not deployed via GitHub yet, etc.) the map must still
       work exactly as before with procedural-only data. Fail silently. */
  });
}
/* Re-applies overrides to whatever is already generated, without disturbing
   camera position, selection, or mode -- called once after loadOverrides()
   resolves (normally within a second of page load). */
function refreshAfterOverrides(){
  if(focusSystem) focusSystem=generateSystem(focusSystem.vx,focusSystem.vy,focusSystem.vz,focusSystem.idx);
  generateSlice(focusSystem?focusSystem.idx:null);
  if(focusSystem){
    // generateSystem() above only refreshes override-affected fields -- it
    // never assigns a spatial position (only generateSlice's own loop does
    // that, same as jumpTo() already relies on) -- so focusSystem loses its
    // px/py/pz the instant this runs, and every "distance from here"
    // calculation for the rest of the session silently reads NaN. Confirmed
    // live on the deployed site 2026-08-07 (Tony's Oktakar screenshot) and
    // reproduced/fixed against real app state before this edit was made.
    // Re-find this exact address in the slice we just rebuilt and adopt its
    // correctly positioned copy -- same lookup jumpTo() uses.
    var posMatch=null;
    for(var fi=0; fi<allSystems.length; fi++){
      if(allSystems[fi].idx===focusSystem.idx && allSystems[fi].vx===focusSystem.vx &&
         allSystems[fi].vy===focusSystem.vy && allSystems[fi].vz===focusSystem.vz){ posMatch=allSystems[fi]; break; }
    }
    if(posMatch) focusSystem=posMatch;
    else { focusSystem.px=0; focusSystem.py=0; focusSystem.pz=0; }
  }
  if(selected){
    var fresh=null;
    for(var i=0;i<allSystems.length;i++) if(allSystems[i].address===selected.address){ fresh=allSystems[i]; break; }
    if(fresh){
      selected=fresh;
      if(document.getElementById("pBody").style.display==="none") updatePanel(selected);
      // buildSystemView() bakes star/planet names onto the 3D meshes at build
      // time (userData.name etc) -- they don't live-follow `selected`, so if
      // you're currently drilled into the very system you just edited, the
      // floating star/planet labels and textures would otherwise keep
      // showing the pre-edit data until you left and re-entered. Rebuild the
      // system view in place so labels/textures pick up the save immediately.
      if(mode==="system"){
        buildSystemView(selected);
        // #sysBanner (the fixed top-centre "you are here" pill, see
        // setMode()) is only ever written when system mode is first
        // entered -- confirmed missing here 2026-09-13 (Tony: renamed a
        // system while already inside it, the banner kept showing the old
        // name even though the floating star label and the info panel both
        // picked up the rename correctly). Same one-line fix setMode()
        // itself uses, just re-run here too so an in-place edit doesn't
        // leave this one label stuck on the pre-edit name.
        var _sysBanner=document.getElementById("sysBanner");
        if(_sysBanner) _sysBanner.textContent=selected.name;
        positionSysBanner();
      }
    }
  }
}

/* ============ storage ============ */
var STORE_K="nms-galmap-logs";
var TRAVELLER_K="nms-galmap-traveller"; // remembers "your name"/"friend code"/"show friend code" locally so Edit system doesn't need retyping every time -- see loadTravellerId()/saveTravellerId()
/* waypoints/visited/bases are all personal, local-only lists -- same
   localStorage-only mechanism as marks/notes, never sent anywhere and
   never part of the shared community-edit data. Task 11 (waypoints for
   systems you can't reach yet) and task 12 (visited/base tagging, "not a
   priority, just thoughts... obviously only in their saved app... not on
   the general public map") both explicitly asked for personal-device-only
   tracking, so this reuses the exact same pattern rather than inventing a
   new storage mechanism. */
/* store.routes (2026-08-30, Tony: "a way to save a route for later... since
   expeditions rarely happen in one browser tab"): an ARRAY, not a keyed
   object like the others above -- a route isn't tied to one system address,
   it's its own thing with an id of its own. Same personal, local-only
   mechanism otherwise, and rides along in Export/Import exactly like the
   rest of store (see saveRoutesMerge() near bImport's handler). */
var store={notes:{},noteImgs:{},marks:{},waypoints:{},visited:{},routes:[]};
function skey(s){ return s.galaxy+":"+s.address; }
function loadStore(){
  try{
    var raw=localStorage.getItem(STORE_K);
    if(raw){
      var o=JSON.parse(raw);
      store.notes=o.notes||{}; store.noteImgs=o.noteImgs||{}; store.marks=o.marks||{};
      store.waypoints=o.waypoints||{}; store.visited=o.visited||{};
      store.routes=Array.isArray(o.routes)?o.routes:[];
    }
  }catch(err){ store={notes:{},noteImgs:{},marks:{},waypoints:{},visited:{},routes:[]}; }
}
function saveStore(){
  try{ localStorage.setItem(STORE_K,JSON.stringify(store)); }
  catch(err){ toast("Could not save locally"); }
}
function loadTravellerId(){
  try{
    var raw=localStorage.getItem(TRAVELLER_K);
    if(raw){ var o=JSON.parse(raw); return {name:o.name||"",code:o.code||"",codeVisible:!!o.codeVisible}; }
  }catch(err){}
  return {name:"",code:"",codeVisible:false};
}
function saveTravellerId(name,code,codeVisible){
  try{ localStorage.setItem(TRAVELLER_K,JSON.stringify({name:name||"",code:code||"",codeVisible:!!codeVisible})); }
  catch(err){}
}
/* Last real position/galaxy a visitor jumped to (2026-08-26, Tony: "what if
   the user logs back in and wants to be at their last/current position
   rather than having to find/input system... should it not start in their
   last galaxy visited rather than Euclid each time"). Personal, local-only
   -- same pattern as store.marks/waypoints/visited and TRAVELLER_K above,
   never sent anywhere. Only ever written from jumpTo()'s real (non-silent)
   path, so it always reflects somewhere the visitor actually asked to go,
   never the anonymous random boot-anchor placeholder (see randomBootAddress()
   below) or a mid-galaxy-switch silent re-anchor. */
var LAST_POS_K="nms-galmap-lastpos";
function loadLastPosition(){
  try{
    var raw=localStorage.getItem(LAST_POS_K);
    if(raw){
      var o=JSON.parse(raw);
      if(o && typeof o.address==="string" && parseAddress(o.address) &&
         typeof o.galaxy==="number" && o.galaxy>=0 && o.galaxy<GALAXIES.length){
        return {galaxy:o.galaxy, address:o.address};
      }
    }
  }catch(err){}
  return null;
}
function saveLastPosition(galaxy,address){
  try{ localStorage.setItem(LAST_POS_K,JSON.stringify({galaxy:galaxy,address:address})); }
  catch(err){}
}
/* "Suggestions of words you've already added" (Tony, 2026-08-17) -- a
   plain localStorage list per field type, grown every time a save actually
   succeeds (see rememberKnownTerms(), called from submitEditPayload's
   success path), fed into a <datalist> per field so the browser's own
   native suggestion dropdown shows terms this traveller has typed before
   as they start typing again. Local-only, same as notes/marks/waypoints --
   never sent to the server, never shared between visitors.

   Added 2026-09-02: a SEPARATE, shared vocabulary layer now sits alongside
   this one -- OVERRIDES.communityTerms, fetched from the server on every
   page load (see loadOverrides()) and grown by every successful edit ANY
   traveller makes (see addCommunityTerms() in lib/shared.mjs). Tony had
   typed "Quartzite" himself and asked why it only ever became a suggestion
   in his own browser, not everyone else's too -- this is that fix. Both
   layers feed the same suggestion list (see buildCommaCombo()'s allItems()
   and populateDatalists() below): canon list, then community terms, then
   this browser's own locally-learned terms, deduped case-insensitively. */
/* Real item names sourced 2026-08-26 from nomanssky.fandom.com/wiki/Resource
   (Common/Uncommon rarity tiers), /wiki/Curiosity and /wiki/Salvaged_Frigate_Module
   -- seeded into the matching field's datalist below (see populateDatalists())
   ahead of whatever a traveller has typed before, so the suggestion dropdown
   shows real game items from day one rather than starting empty. These are
   suggestions only, same as the learned-terms list -- typing anything else
   is never blocked, same free-text field as always. Fossil names are
   themselves procedurally generated in-game (no fixed list exists on the
   wiki, confirmed via its own Fossil Sample page), so FOSSILS_CANON is
   deliberately just real curiosity items, not an attempt at a fossil list. */
var RESOURCES_CANON=["Carbon","Oxygen","Di-hydrogen","Tritium","Ferrite Dust","Silicate Powder",
  "Sodium","Cobalt","Salt","Copper","Chromatic Metal","Silver","Sulphurine","Radon","Nitrogen",
  "Activated Copper","Residual Goop","Rusted Metal","Somnal Dust","Ancestral Memories","Liquid Sun"];
var MINERALS_CANON=["Condensed Carbon","Pure Ferrite","Magnetised Ferrite","Sodium Nitrate",
  "Ionised Cobalt","Chlorine","Paraffinium","Pyrite","Ammonia","Uranium","Dioxite","Phosphorus",
  "Tainted Metal","Mordite","Gold","Activated Cadmium","Activated Emeril","Activated Indium",
  "Fungal Mould","Frost Crystal","Gamma Root","Cactus Flesh","Solanium","Star Bulb","Marrow Bulb",
  "Kelp Sac","Faecium","Runaway Mould","Living Slime","Viscous Fluids",
  // Added 2026-09-02 (Tony hit these typing manually -- purple-star items
  // missing from the original wiki pass): Quartzite/Activated Quartzite are
  // this file's own STELLAR_EL for purple stars (see that table above), and
  // Crystallised Helium is a real gas-giant-only uncommon resource -- all 3
  // confirmed against nomanssky.fandom.com's own pages for each item.
  "Quartzite","Activated Quartzite","Crystallised Helium"];
var SALVAGE_CANON=["Salvaged Technology","Salvaged Frigate Module","Recovered Sentinel Components",
  "Rogue Technology Echo","Anomalous Data Unit","Anomalous Homing Device","Advanced Research Module",
  "Biomechanical Construct","Bionic Ark","Capital Ship Wiring Platform","Encrypted Navigation Data",
  "Cartographic Data","Loop Manifestation Technology","Starship Expansion Module",
  "Contained Reality Glitch","Living Starship Organ","Access Card","Advanced Crafted Product"];
var FOSSILS_CANON=["Fossil Sample","Timeless Artifact","Soul Fragment","Energetic Fragment",
  "Fragment of Life","Communion of Hirk","Cosmic Melody Instrument","Glassy Indeterminance",
  "Incomplete Data Sequence","Medicinal Substance","Concentrated Deposit","Valuable Mineral Deposit",
  "Valuable Ore","Aquatic Relic"];
var KNOWN_TERMS_K="nms-galmap-known-terms";
// "biome" added 2026-09-08 (Tony) -- same reasoning as every other field
// here: a traveller's own typed value (not on the canonical list) should
// become a future suggestion, not just a saved-but-forgotten string. See
// biomeCommunityExtras()/rememberKnownTerms() below.
// "subtype" added 2026-09-08 -- the new per-body Sub type field (see
// subtypeComboGroups() above), same reasoning as biome: a traveller's own
// typed sub-name not on the researched list becomes a future suggestion.
var KNOWN_TERMS_FIELDS=["resources","flora","fauna","minerals","salvage","fossils","descriptor","biome","subtype"];
var knownTerms={};
function loadKnownTerms(){
  knownTerms={};
  KNOWN_TERMS_FIELDS.forEach(function(k){ knownTerms[k]=[]; });
  try{
    var raw=localStorage.getItem(KNOWN_TERMS_K);
    if(raw){
      var o=JSON.parse(raw);
      KNOWN_TERMS_FIELDS.forEach(function(k){ if(Array.isArray(o[k])) knownTerms[k]=o[k]; });
    }
  }catch(err){}
}
function saveKnownTerms(){
  try{ localStorage.setItem(KNOWN_TERMS_K,JSON.stringify(knownTerms)); }catch(err){}
}
// Adds new values to the front of a field's list (most-recent-first, so the
// datalist surfaces recently-used terms ahead of old ones), de-duped
// case-insensitively, capped at 150 entries so this can't grow forever.
function rememberTerms(list,values){
  values.forEach(function(v){
    v=String(v||"").trim();
    if(!v) return;
    var lower=v.toLowerCase();
    for(var k=list.length-1;k>=0;k--){ if(list[k].toLowerCase()===lower) list.splice(k,1); }
    list.unshift(v);
  });
  if(list.length>150) list.length=150;
}
// Called right after a successful save -- payload.bodies[*] already holds
// arrays (resources/flora/fauna/minerals/salvage/fossils were split from
// their comma-separated inputs before the request went out) plus a single
// descriptor string per body.
function rememberKnownTerms(payload){
  var bodies=(payload&&payload.bodies)||[];
  bodies.forEach(function(b){
    rememberTerms(knownTerms.resources,b.resources||[]);
    rememberTerms(knownTerms.flora,b.flora||[]);
    rememberTerms(knownTerms.fauna,b.fauna||[]);
    rememberTerms(knownTerms.minerals,b.minerals||[]);
    rememberTerms(knownTerms.salvage,b.salvage||[]);
    rememberTerms(knownTerms.fossils,b.fossils||[]);
    if(b.descriptor) rememberTerms(knownTerms.descriptor,[b.descriptor]);
    if(b.biome) rememberTerms(knownTerms.biome,[b.biome]);
    if(b.subtype) rememberTerms(knownTerms.subtype,[b.subtype]);
  });
  saveKnownTerms();
  populateDatalists();
}
// 2026-09-13 fix (Tony: a real 6-planet submission flagged Copper, Salt,
// Silver, Cobalt (typo'd "Cobolt"), Activated Copper, Rusted Metal and
// Magnetised Ferrite as "not on the known list", even spelled correctly --
// because RESOURCES_CANON and MINERALS_CANON were each other's blind spot.
// The real game doesn't pin a resource to one tier: the same element is the
// per-planet Common pickup on one biome and the per-planet Uncommon pickup
// on another (exactly what this submission reported first-hand -- Copper
// as Uncommon on three different planets, Magnetised Ferrite as Common on
// one). Common and Uncommon resources now share one combined canon pool for
// matching/auto-correct, so a real item spelled correctly is recognised
// either way instead of hitting the confirm dialog every time it shows up
// on the "other" tier. Salvageable tech and Fossils & curiosities are left
// untouched -- nothing in this submission (or any prior one) showed either
// of those crossing into the other's list.
var RESOURCE_TIER_CANON=RESOURCES_CANON.concat(MINERALS_CANON);
var CANON_TERMS_BY_FIELD={resources:RESOURCE_TIER_CANON,minerals:RESOURCE_TIER_CANON,
  salvage:SALVAGE_CANON,fossils:FOSSILS_CANON};
var CANON_FIELD_LABELS={resources:"Common resources",minerals:"Uncommon resources",
  salvage:"Salvageable tech",fossils:"Fossils & curiosities"};
/* ---- Spelling safety net (2026-09-02, Tony: "auto correct whats known
   but flag back anything else asking if correct before saving") --
   these 4 fields are the only comma-list fields with a real, fixed
   in-game list behind them -- Flora/Fauna/Descriptor are deliberately
   left alone, since those names are effectively endless and made up
   per-planet, so there's no single "correct" spelling to check against.
   Runs right before a save actually goes out (see edSubmit's click
   handler below): a typo of something on the REAL canon list gets
   silently auto-corrected to the exact real spelling (classic Levenshtein
   edit distance, tolerance scaled gently by word length); anything that
   isn't a close match to anything on canon -- genuinely new, not just
   misspelled -- gets held back for a plain confirm instead of quietly
   adding a fresh typo to the shared suggestion list that then sits there
   forever right next to the correct spelling. */
function levenshtein(a,b){
  a=String(a).toLowerCase(); b=String(b).toLowerCase();
  var m=a.length,n=b.length;
  if(!m) return n; if(!n) return m;
  var prev=new Array(n+1), cur=new Array(n+1), i,j;
  for(j=0;j<=n;j++) prev[j]=j;
  for(i=1;i<=m;i++){
    cur[0]=i;
    for(j=1;j<=n;j++) cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a.charAt(i-1)===b.charAt(j-1)?0:1));
    var tmp=prev; prev=cur; cur=tmp;
  }
  return prev[n];
}
// Typo tolerance scales gently with length -- a short word (<=5 chars) has
// to be almost exact to auto-correct (otherwise short real words start
// getting mistaken for each other), a long one (like "Activated
// Quartzite") can absorb a couple more different characters and still
// clearly be the same item.
function closestCanonMatch(value,canonArr){
  var v=String(value||"").trim();
  if(!v) return null;
  var vLo=v.toLowerCase(), best=null, bestDist=Infinity, i;
  for(i=0;i<canonArr.length;i++){ if(canonArr[i].toLowerCase()===vLo) return {term:canonArr[i],dist:0}; }
  for(i=0;i<canonArr.length;i++){
    var d=levenshtein(v,canonArr[i]);
    if(d<bestDist){ bestDist=d; best=canonArr[i]; }
  }
  if(!best) return null;
  var maxLen=Math.max(v.length,best.length);
  var allowed=maxLen<=5?1:(maxLen<=10?2:3);
  return bestDist<=allowed ? {term:best,dist:bestDist} : null;
}
// Checks one field's whole comma value against three sources, in a
// specific priority order -- canon FIRST, always, then community/learned:
// 2026-09-13 real bug (Tony: typed "Cooper" on Ayne, got the auto-correct
// toast, saved fine -- but "Cobolt" on Tanh, same submission, same typo
// shape, saved as the literal typo and STAYED that way on every re-edit).
// Root cause: the old version treated an exact match to canon, the shared
// community list, or this browser's own past input as equally "known" and
// skipped the distance check for all three alike. But community/learned
// terms are just "something a traveller typed once and confirmed" -- not
// reviewed, not necessarily correct. The very first time ANY typo (of a
// real canon item) got confirmed through the "add anyway" dialog, it was
// unconditionally folded into the shared community list server-side (see
// addCommunityTerms() in lib/shared.mjs -- happens for every submitted
// value, flagged or not) and from that point on it matched the community
// check first and skipped correction forever after, for every future
// traveller who typed that same typo, on any system. "Cobolt" and, it
// turns out, "Cooper" itself are both sitting in the real live community
// list right now -- confirmed live on the deployed site, not guessed.
// Fix: try an exact CANON match first, then the distance check against
// canon (so a real typo of a real item always gets pulled toward the
// correct spelling, no matter what's already sitting in the community
// list), and only fall back to "already confirmed by the community/this
// browser" for a value that ISN'T close to anything on canon -- i.e. a
// genuinely new, non-canon item like "Salvageable scrap", which is exactly
// what that fallback should be for.
function checkFieldAgainstCanon(field,rawValue){
  var canonArr=CANON_TERMS_BY_FIELD[field];
  var items=String(rawValue||"").split(",").map(function(x){return x.trim();}).filter(Boolean);
  if(!canonArr) return {items:items,corrected:[],flagged:[]};
  var community=(OVERRIDES.communityTerms&&OVERRIDES.communityTerms[field])||[];
  var learned=knownTerms[field]||[];
  var canonLo={};
  canonArr.forEach(function(v){ canonLo[v.toLowerCase()]=1; });
  var communityLearnedLo={};
  community.concat(learned).forEach(function(v){ communityLearnedLo[v.toLowerCase()]=1; });
  var corrected=[], flagged=[];
  var outItems=items.map(function(v){
    var vLo=v.toLowerCase();
    if(canonLo[vLo]) return v;
    var m=closestCanonMatch(v,canonArr);
    if(m && m.dist>0){ corrected.push({from:v,to:m.term}); return m.term; }
    if(communityLearnedLo[vLo]) return v;
    flagged.push(v);
    return v;
  });
  return {items:outItems,corrected:corrected,flagged:flagged};
}
// Runs the check across every body's 4 canon-backed fields, rewriting each
// body's own comma string in place with any auto-corrected spelling (skips
// the rewrite if that would somehow push the field over its real maxlength
// -- exceptionally unlikely, every canon spelling is well under the cap --
// rather than risk an unsendable value), and collects everything the
// caller needs to report back and/or confirm.
function runCanonSafetyNet(){
  var corrected=[], flagged=[];
  editBodies.forEach(function(b,idx){
    var label=(b.name||"").trim()||((b.moon?"Moon":"Planet")+" #"+(idx+1));
    ["resources","minerals","salvage","fossils"].forEach(function(field){
      var r=checkFieldAgainstCanon(field,b[field]);
      if(!r.corrected.length && !r.flagged.length) return;
      var maxLen=field==="resources"?120:80;
      var joined=r.items.join(", ");
      if(joined.length<=maxLen) b[field]=joined;
      r.corrected.forEach(function(c){ corrected.push({idx:idx,label:label,field:field,from:c.from,to:c.to}); });
      r.flagged.forEach(function(v){ flagged.push({idx:idx,label:label,field:field,value:v}); });
    });
  });
  return {corrected:corrected,flagged:flagged};
}
// Shows the "new item, not on the list" confirm modal (siblings inside
// #modalWrap, same pattern as editModal/reportModal/etc -- see
// closeAllModalBoxes()) and calls onConfirm() only if the traveller
// chooses to add the flagged item(s) anyway. Choosing "Go back and check"
// instead jumps straight to the first flagged body's own accordion row so
// there's no hunting for which planet/moon it was on.
function showTermConfirmModal(flagged,onConfirm){
  var html="";
  flagged.forEach(function(f){
    html+='<div style="margin-bottom:6px">'+escAttr(CANON_FIELD_LABELS[f.field]||f.field)+
      ' on '+escAttr(f.label)+': <b style="color:var(--gold)">'+escAttr(f.value)+'</b></div>';
  });
  document.getElementById("termConfirmList").innerHTML=html;
  document.getElementById("editModal").style.display="none";
  document.getElementById("termConfirmModal").style.display="";
  var yesBtn=document.getElementById("termConfirmYes"), noBtn=document.getElementById("termConfirmNo");
  function cleanup(){
    yesBtn.removeEventListener("click",onYes);
    noBtn.removeEventListener("click",onNo);
    document.getElementById("termConfirmModal").style.display="none";
    document.getElementById("editModal").style.display="";
  }
  function onYes(){ cleanup(); onConfirm(); }
  function onNo(){
    cleanup();
    var idx=flagged[0].idx;
    editBodies.forEach(function(b,j){ b.open=(j===idx); });
    renderBodyEditList();
    var rows=document.querySelectorAll("#bodyEditList .bodyEdit");
    if(rows[idx]) rows[idx].scrollIntoView({block:"nearest",behavior:"smooth"});
  }
  yesBtn.addEventListener("click",onYes);
  noBtn.addEventListener("click",onNo);
}
function populateDatalists(){
  // Descriptor (now "Conditions" in the UI) switched from a plain
  // <datalist> to a grouped icombo, biome-filtered via
  // conditionsComboGroups() (2026-09-08) -- see CONDITIONS_CANON's own
  // comment. Nothing else ever used this native-datalist mechanism, so the
  // map is now empty; left as a no-op rather than deleted outright since
  // this function is still called from several places below (loadOverrides,
  // rememberKnownTerms, initial load) and an empty map keeps all of those
  // call sites harmless without hunting down and removing each one. The
  // orphaned #dlDescriptor <datalist> element itself is simply unused now.
  var map={};
  Object.keys(map).forEach(function(k){
    var dl=document.getElementById(map[k]); if(!dl) return;
    // Real wiki-sourced items first (if this field has any), then whatever
    // the traveller has typed before that isn't already a duplicate --
    // case-insensitive so "star bulb" typed once doesn't sit right next to
    // the canonical "Star Bulb".
    var canon=CANON_TERMS_BY_FIELD[k]||[], learned=knownTerms[k]||[];
    var community=(OVERRIDES.communityTerms&&OVERRIDES.communityTerms[k])||[];
    var seen={}, arr=[];
    canon.forEach(function(v){ var lo=v.toLowerCase(); if(!seen[lo]){ seen[lo]=1; arr.push(v); } });
    community.forEach(function(v){ var lo=v.toLowerCase(); if(!seen[lo]){ seen[lo]=1; arr.push(v); } });
    learned.forEach(function(v){ var lo=v.toLowerCase(); if(!seen[lo]){ seen[lo]=1; arr.push(v); } });
    // Alphabetized (Tony, 2026-09-01) -- was canon-order-then-most-recent,
    // same ordering bug this whole round of fixes addresses everywhere else.
    arr=sortAlphaCI(arr);
    var html="";
    for(var i=0;i<arr.length;i++) html+='<option value="'+escAttr(arr[i])+'">';
    dl.innerHTML=html;
  });
}
function toast(msg,ms){
  var t=document.getElementById("toast");
  t.innerHTML=msg; t.style.display="block";
  clearTimeout(toast._t);
  toast._t=setTimeout(function(){ t.style.display="none"; },ms||1800);
}
function shareTo(t){
  var url="https://nms-galaxy-map.netlify.app",
      txt="NMS Galactic Map \u2014 a fan-made 3D No Man's Sky galaxy map and portal address decoder, by elegra1965.";
  if(t==="x") window.open("https://twitter.com/intent/tweet?text="+encodeURIComponent(txt)+"&url="+encodeURIComponent(url),"_blank");
  else if(t==="reddit") window.open("https://www.reddit.com/submit?url="+encodeURIComponent(url)+"&title="+encodeURIComponent("NMS Galactic Map"),"_blank");
  else if(t==="copy"){ navigator.clipboard.writeText(url).then(function(){ toast("Link copied"); },function(){ toast(url); }); }
  return false;
}

/* ============ three setup ============ */
var canvas=document.getElementById("c");
var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:false,alpha:false});
renderer.setClearColor(0x04060a,1);
var scene=new THREE.Scene();
var camera=new THREE.PerspectiveCamera(58,1,0.1,5000);
var galaxyGroup=new THREE.Group(), localGroup=new THREE.Group(), systemGroup=new THREE.Group();
scene.add(galaxyGroup); scene.add(localGroup); scene.add(systemGroup);
var starLight=new THREE.PointLight(0xffffff,1.8,0,2);
var ambient=new THREE.AmbientLight(0xffffff,0.16);
scene.add(starLight); scene.add(ambient);

function makeSprite(){
  var cv=document.createElement("canvas"); cv.width=64; cv.height=64;
  var g=cv.getContext("2d");
  var grd=g.createRadialGradient(32,32,0,32,32,32);
  grd.addColorStop(0,"rgba(255,255,255,1)");
  grd.addColorStop(0.22,"rgba(255,255,255,0.8)");
  grd.addColorStop(0.55,"rgba(255,255,255,0.2)");
  grd.addColorStop(1,"rgba(255,255,255,0)");
  g.fillStyle=grd; g.fillRect(0,0,64,64);
  var t=new THREE.Texture(cv); t.needsUpdate=true; return t;
}
var SPRITE=makeSprite();
/* ---- spec item 10: GLSL star shaders (cinematic twinkling galaxy map) ---- */
var STAR_VERT_SH=[
  'uniform float uTime;',
  'attribute vec3 aColor;',
  'attribute float aSize;',
  'varying vec3 vColor;',
  'varying float vTwinkle;',
  'void main(){',
  '  vColor=aColor;',
  '  vTwinkle=sin(uTime*3.0+position.x*10.0+position.y*5.0)*0.4+0.6;',
  '  vec4 mvp=modelViewMatrix*vec4(position,1.0);',
  '  gl_Position=projectionMatrix*mvp;',
  '  gl_PointSize=aSize*(300.0/-mvp.z);',
  '}'
].join('\n');
var STAR_FRAG_SH=[
  'varying vec3 vColor;',
  'varying float vTwinkle;',
  'void main(){',
  '  float d=length(gl_PointCoord-vec2(0.5));',
  '  if(d>0.5) discard;',
  '  float g=smoothstep(0.5,0.0,d);',
  '  vec3 c=vColor*(0.6+vTwinkle*0.4);',
  '  gl_FragColor=vec4(c,g);',
  '}'
].join('\n');
var _starTime={value:0}; /* shared uniform for both galPts and locPts shaders */
/* Hollow ring (not a filled blob like SPRITE/real stars) so course waypoint
   markers read as UI markers at a glance instead of blending into the star
   field -- confirmed live that a filled same-toned dot was invisible next to
   real stars; a stroked ring is not. */
function makeRingSprite(){
  var cv=document.createElement("canvas"); cv.width=64; cv.height=64;
  var g=cv.getContext("2d");
  g.strokeStyle="rgba(255,255,255,1)"; g.lineWidth=8;
  g.beginPath(); g.arc(32,32,21,0,Math.PI*2); g.stroke();
  var t=new THREE.Texture(cv); t.needsUpdate=true; return t;
}
var RING_SPRITE=makeRingSprite();

/* corona with rays, used as the billboard glow around a star */
function makeCorona(){
  var S=256;
  var cv=document.createElement("canvas"); cv.width=S; cv.height=S;
  var g=cv.getContext("2d"), c=S/2, i;
  var grd=g.createRadialGradient(c,c,0,c,c,c);
  grd.addColorStop(0,"rgba(255,255,255,0.95)");
  grd.addColorStop(0.10,"rgba(255,255,255,0.55)");
  grd.addColorStop(0.30,"rgba(255,255,255,0.16)");
  grd.addColorStop(0.65,"rgba(255,255,255,0.04)");
  grd.addColorStop(1,"rgba(255,255,255,0)");
  g.fillStyle=grd; g.fillRect(0,0,S,S);
  g.globalCompositeOperation="lighter";
  var r=mulberry32(4242);
  for(i=0;i<28;i++){
    var a=(i/28)*Math.PI*2+r()*0.12;
    var len=c*(0.42+r()*0.55);
    var wid=1.2+r()*3.2;
    g.save(); g.translate(c,c); g.rotate(a);
    var lg=g.createLinearGradient(0,0,len,0);
    lg.addColorStop(0,"rgba(255,255,255,0.42)");
    lg.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=lg; g.fillRect(0,-wid/2,len,wid);
    g.restore();
  }
  /* two long spikes for a lens-flare feel */
  for(i=0;i<2;i++){
    g.save(); g.translate(c,c); g.rotate(i*Math.PI/2);
    var lg2=g.createLinearGradient(-c,0,c,0);
    lg2.addColorStop(0,"rgba(255,255,255,0)");
    lg2.addColorStop(0.5,"rgba(255,255,255,0.5)");
    lg2.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=lg2; g.fillRect(-c,-1.6,S,3.2);
    g.restore();
  }
  var t=new THREE.Texture(cv); t.needsUpdate=true; return t;
}
var CORONA=makeCorona();
var TEX_LOADER=new THREE.TextureLoader();
var BH_TEX=TEX_LOADER.load("icons-web/feature-blackhole.png");
var ATLAS_TEX=TEX_LOADER.load("icons-web/feature-atlas.png");
/* Real signal-marker icon images (2026-09-09, Tony: "just got grok to
   isolate icons"). Same load-once-reuse pattern as BH_TEX/ATLAS_TEX just
   above -- REAL_ICON_URL (defined next to RES_ICON_CAT) is the source of
   truth for which categories have a real image at all; this just loads each
   one through the one shared TEX_LOADER, once, and caches the resulting
   Texture for every sprite of that category to share. mineral/frozen/
   outpost/creature/cargo all replace their earlier hand-drawn canvas glyph
   with the real thing here; flora/tech/hazard have no real image yet and
   keep the existing canvas-drawn path in buildManualSignalIcon() below.
   atlasstation is new -- Hello Games' own real Atlas Station icon, not a
   relabelled version of anything already built. */
var REAL_ICON_TEX={};
for(var _ricK in REAL_ICON_URL){ REAL_ICON_TEX[_ricK]=TEX_LOADER.load(REAL_ICON_URL[_ricK]); }

function makeCloud(seed){
  var cv=document.createElement("canvas"); cv.width=160; cv.height=160;
  var g=cv.getContext("2d"), r=mulberry32(seed), i;
  g.globalCompositeOperation="lighter";
  for(i=0;i<16;i++){
    var cx=40+r()*80, cy=40+r()*80, rad=18+r()*46;
    var grd=g.createRadialGradient(cx,cy,0,cx,cy,rad);
    var a=0.10+r()*0.16;
    grd.addColorStop(0,"rgba(255,255,255,"+a.toFixed(3)+")");
    grd.addColorStop(0.5,"rgba(255,255,255,"+(a*0.42).toFixed(3)+")");
    grd.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=grd; g.beginPath(); g.arc(cx,cy,rad,0,Math.PI*2); g.fill();
  }
  g.globalCompositeOperation="destination-in";
  var fade=g.createRadialGradient(80,80,10,80,80,80);
  fade.addColorStop(0,"rgba(255,255,255,1)");
  fade.addColorStop(0.65,"rgba(255,255,255,0.85)");
  fade.addColorStop(1,"rgba(255,255,255,0)");
  g.fillStyle=fade; g.fillRect(0,0,160,160);
  var t=new THREE.Texture(cv); t.needsUpdate=true; return t;
}
var CLOUDS=[makeCloud(11),makeCloud(29),makeCloud(47),makeCloud(83)];

function makePlanetTexture(b){
  var W=256,H=128;
  var cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  var g=cv.getContext("2d"), r=mulberry32(b.seed), i, k;
  var pal=biomePal(b.biome);
  g.fillStyle=(b.water&&pal.sea)?pal.sea:pal.base;
  g.fillRect(0,0,W,H);
  var blobs=b.water?90:150;
  for(i=0;i<blobs;i++){
    var x=r()*W, y=r()*H;
    var rad=(4+r()*24)*(0.45+Math.sin(y/H*Math.PI)*0.85);
    g.fillStyle=pal.land[Math.floor(r()*pal.land.length)];
    g.globalAlpha=0.32+r()*0.5;
    var rx=rad*(0.7+r()*0.9), ry=rad*(0.45+r()*0.5), rot=r()*Math.PI;
    g.beginPath(); g.ellipse(x,y,rx,ry,rot,0,Math.PI*2); g.fill();
    if(x<rx){ g.beginPath(); g.ellipse(x+W,y,rx,ry,rot,0,Math.PI*2); g.fill(); }
    if(x>W-rx){ g.beginPath(); g.ellipse(x-W,y,rx,ry,rot,0,Math.PI*2); g.fill(); }
  }
  g.globalAlpha=1;
  if(b.biome==="Dead"||b.biome==="Exotic"){
    for(i=0;i<46;i++){
      var cx=r()*W, cy=r()*H, cr=1.5+r()*7;
      g.strokeStyle="rgba(0,0,0,0.42)"; g.lineWidth=1.4;
      g.beginPath(); g.arc(cx,cy,cr,0,Math.PI*2); g.stroke();
      g.fillStyle=(b.biome==="Exotic")?"rgba(0,0,0,0.5)":"rgba(255,255,255,0.09)";
      g.beginPath(); g.arc(cx,cy,cr*0.8,0,Math.PI*2); g.fill();
    }
  }
  if(pal.glow){
    g.strokeStyle=pal.glow; g.lineWidth=1.2; g.globalAlpha=0.5;
    for(i=0;i<26;i++){
      var sx=r()*W, sy=r()*H;
      g.beginPath(); g.moveTo(sx,sy);
      for(k=0;k<5;k++){ sx+=(r()-0.5)*26; sy+=(r()-0.5)*14; g.lineTo(sx,sy); }
      g.stroke();
    }
    if(b.biome==="Radioactive"||b.biome==="Irradiated"){
      for(i=0;i<14;i++){
        var ax=r()*W, ay=r()*H, arr=3+r()*9;
        g.beginPath(); g.arc(ax,ay,arr,0,Math.PI*1.6); g.stroke();
      }
    }
    g.globalAlpha=1;
  }
  if(pal.cap){
    var cg=g.createLinearGradient(0,0,0,H*0.19);
    cg.addColorStop(0,pal.cap); cg.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=cg; g.fillRect(0,0,W,H*0.19);
    var cg2=g.createLinearGradient(0,H,0,H*0.81);
    cg2.addColorStop(0,pal.cap); cg2.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=cg2; g.fillRect(0,H*0.81,W,H*0.19);
  }
  var t=new THREE.CanvasTexture(cv); t.needsUpdate=true; return t;
}
/* Saturn-style ring band texture for planets flagged b.ring. RingGeometry's
   built-in UVs map u around the circumference and v from inner to outer
   radius, so a texture that only varies vertically (bands) and repeats
   cleanly across u is exactly what's needed -- no special UV remapping.
   Seeded off the body's own seed (offset, so it never rolls the same
   pattern as the planet surface texture) purely for band-pattern variety
   between different ringed worlds. */
function makeRingTexture(b){
  var W=8,H=64;
  var cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  var g=cv.getContext("2d"), r=mulberry32(b.seed^0x21196E), i;
  var base=RING_PALETTES[b.ring]||RING_PALETTES.tan;
  for(i=0;i<H;i++){
    var v=i/H;
    var edge=Math.min(v,1-v)*2; // fades near inner/outer edge instead of a hard cutoff
    var band=base[Math.floor(r()*base.length)];
    var a=(0.28+r()*0.5)*Math.min(1,edge*3);
    g.fillStyle="rgba("+((band>>16)&255)+","+((band>>8)&255)+","+(band&255)+","+a.toFixed(3)+")";
    g.fillRect(0,i,W,1);
  }
  var t=new THREE.CanvasTexture(cv); t.needsUpdate=true;
  t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.ClampToEdgeWrapping;
  return t;
}

var galPts=null, locPts=null, locInstMesh=null, nebulaGroup=new THREE.Group(), coreMesh=null, courseLine=null;
var backdropPts=null; /* Item 8 — parallax starfield backdrop layer */
var voxGrid=null, galMarks=null, gridOn=true;
var selRing=null, focusRing=null, hoverRing=null;
/* Session 38 (2026-08-17): hover popup + course-preview state. hoverSys is
   the system currently under the mouse (null when nothing hovered).
   previewLine/previewRing are drawn only while hovering a candidate while
   the info panel is open (i.e. mid course-planning).
   Session 39 (2026-08-18, Tony -- his own real-in-game reference research
   confirmed warp lines run star-to-star, not a single straight diagonal):
   the preview line now routes through findRoute()'s real intermediate
   stars, same as the committed Set-course line, instead of a plain 2-point
   straight line. Running findRoute() on every hover-target CHANGE (not
   every frame -- that was always the actual cost concern, and hover target
   only changes when the mouse lands on a genuinely different star) is
   cheap enough; previewRouteTimer debounces it a further ~140ms so a fast
   mouse sweep across a dense cluster doesn't fire a route search for every
   star glanced over, only the one actually settled on. */
var hoverSys=null, hoverPopVisible=false, _hoverRayT=0;
var previewLine=null, previewTargetAddr=null, previewPendingAddr=null, previewRouteTimer=null;
/* Session 38 continued: previewGrowing/previewHoldT drive a looping
   grow-hold-reset cycle (not a one-shot animation) -- per Tony's ask, the
   line keeps expanding out to the hovered candidate, holds briefly fully
   extended, then resets back to the source and grows again, repeating for
   as long as that candidate stays hovered. See updatePreviewAnim().
   previewPoints/previewPrefix/previewTotalLen (Session 39) are the real
   routed waypoint chain and its cumulative arc length, walked by
   _polylineLerp() to find how far along the BENT path (not a straight
   line) the growing tip has reached. */
var previewAnimT=0, previewGrowing=false, previewHoldT=0, previewStyle=null;
var previewPoints=null, previewPrefix=null, previewTotalLen=0;
galaxyGroup.add(nebulaGroup);
var allSystems=[], shown=[];
var focus={x:0,y:0,z:0}, focusSystem=null, courseTarget=null;
/* True only once the visitor has actually jumped somewhere themselves (Jump/
   Enter/keypad/course/galaxy-switch). The boot sequence silently anchors
   focusSystem to a real coordinate purely for internal slice/camera math (see
   jumpTo's silent flag) -- without this flag, "Reset" would fill the address
   box back in with that boot coordinate instead of leaving it empty, quietly
   defeating the whole point of not showing a specific system by default. */
var hasRealLocation=false;
var mode="galaxy", ctrl="orbit", selected=null, labelsOn=true;

/* "You are here" beacon in the big 3D galaxy view -- always positioned at
   the last real jump (voxelToGalaxy(focus)), billboarded to face the
   camera every frame (see marker.lookAt() in animate() below). 2026-08-26:
   Tony spotted this as "the yellow circle" in the large galaxy view and
   asked why it never seemed to change -- it always DID track real
   position, it just always landed on the exact same spot because the old
   boot sequence always jumped to the same fixed address (see
   randomBootAddress() further down, and loadLastPosition() for the
   returning-visitor case). Given additive glow + a gentle pulse here (see
   the marker.scale/opacity lines in animate()) so it reads as a live
   indicator rather than blending into the star field/nebula around it,
   which is what made it look static/decorative in the first place. */
var marker=new THREE.Mesh(new THREE.RingGeometry(4.0,6.5,40),
  new THREE.MeshBasicMaterial({color:0xf0a500,side:THREE.DoubleSide,transparent:true,
    opacity:0.95,depthWrite:false,blending:THREE.AdditiveBlending}));
galaxyGroup.add(marker);
/* 2026-08-27, Tony: "is it possible to click the yellow circle... to go to
   the star system" -- yes, wired up in tryPick()'s new galaxy-mode branch
   below. The visible ring itself (radius 4-6.5) is a thin, easy-to-miss
   click target at typical Galaxy-view zoom, so this invisible, larger
   filled disc is a child of marker purely for raycasting -- it inherits
   marker's position/billboard-rotation/pulse-scale automatically (being a
   child), so nothing else needs to track it. Never rendered (opacity 0),
   only ever intersected by tryPick()'s raycast. */
var markerHitArea=new THREE.Mesh(new THREE.CircleGeometry(9,24),
  new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
marker.add(markerHitArea);
function voxelToGalaxy(x,y,z){ return new THREE.Vector3((x/2048)*GAL_R,(y/128)*GAL_H,(z/2048)*GAL_R); }

/* Galactic Atlas overlay (2026-08-29): Hello Games' own community POI map
   for the Euclid galaxy -- https://galacticatlas.nomanssky.com/ -- pulled
   in as clickable diamond markers. Addresses hand-entered once into
   atlas-pois.json (no live scraping); each one decodes with
   this project's own parseAddress()/voxelToGalaxy(), exactly like typing
   it into the Jump box. Diamonds are children of galaxyGroup (same parent
   as "marker" above), so they orbit with the galaxy's own rotation exactly
   like the yellow ring does -- confirmed live on the deployed site first
   (forced galaxyGroup.rotation.y forward in the console and watched the
   ring sweep with the spiral) before building this, rather than guessing.
   Billboarded face-on every frame in animate() so the diamond shape itself
   never looks foreshortened -- position orbits, shape stays fixed, same
   split as the existing marker. */
function diamondOutlineGeometry(outerR,innerR){
  var shape=new THREE.Shape();
  shape.moveTo(0,outerR); shape.lineTo(outerR,0); shape.lineTo(0,-outerR); shape.lineTo(-outerR,0); shape.closePath();
  var hole=new THREE.Path();
  hole.moveTo(0,innerR); hole.lineTo(innerR,0); hole.lineTo(0,-innerR); hole.lineTo(-innerR,0); hole.closePath();
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape);
}
var atlasGroup=new THREE.Group();
atlasGroup.visible=false;
galaxyGroup.add(atlasGroup);
var atlasMarkers=[], atlasHitAreas=[], atlasOn=false;
function loadAtlasPOIs(){
  fetch("atlas-pois.json").then(function(r){ return r.json(); }).then(function(list){
    var geo=diamondOutlineGeometry(3.4,1.7);
    for(var i=0;i<list.length;i++){
      var poi=list[i];
      if(!poi.address) continue;
      var a=parseAddress(poi.address);
      if(!a) continue;
      var mat=new THREE.MeshBasicMaterial({color:0x00e5ff,side:THREE.DoubleSide,transparent:true,
        opacity:0.85,depthWrite:false,blending:THREE.AdditiveBlending});
      var amesh=new THREE.Mesh(geo,mat);
      amesh.position.copy(voxelToGalaxy(a.x,a.y,a.z));
      amesh.userData={name:poi.name,url:poi.url,phase:i*0.7};
      atlasGroup.add(amesh);
      atlasMarkers.push(amesh);
      var ahit=new THREE.Mesh(new THREE.CircleGeometry(6,16),
        new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
      amesh.add(ahit);
      atlasHitAreas.push(ahit);
    }
  }).catch(function(){ /* no network, or opened via file:// -- overlay just
    stays empty, same graceful-degrade pattern as the nms-core module loader */ });
}

selRing=new THREE.Mesh(new THREE.RingGeometry(0.85,1.05,40),
  new THREE.MeshBasicMaterial({color:0xf0a500,side:THREE.DoubleSide,transparent:true,
    opacity:0.95,depthWrite:false,blending:THREE.AdditiveBlending}));
selRing.visible=false; localGroup.add(selRing);
focusRing=new THREE.Mesh(new THREE.RingGeometry(1.5,1.72,44),
  new THREE.MeshBasicMaterial({color:0x00e5ff,side:THREE.DoubleSide,transparent:true,
    opacity:0.75,depthWrite:false,blending:THREE.AdditiveBlending}));
focusRing.visible=false; localGroup.add(focusRing);

/* Session 38: small ring marking the star currently under the mouse during
   course-preview hover -- separate from selRing (the committed/clicked
   selection) so hovering a candidate never disturbs whatever's actually
   selected. Colour swaps live per-hover between gold (reachable) and red
   (current drive can't reach that star colour), matching the preview line. */
hoverRing=new THREE.Mesh(new THREE.RingGeometry(1.1,1.3,36),
  new THREE.MeshBasicMaterial({color:0xf0a500,side:THREE.DoubleSide,transparent:true,
    opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
hoverRing.visible=false; localGroup.add(hoverRing);

/* lattice of region boundaries — one cube per voxel, ~400 ly across */
function buildVoxelGrid(){
  if(voxGrid){ localGroup.remove(voxGrid); voxGrid.geometry.dispose(); voxGrid.material.dispose(); voxGrid=null; }
  if(!gridOn) return;
  var R=parseInt(document.getElementById("sR").value,10);
  var lo=-(R+0.5)*VOX_U, n=2*R+2, pts=[], i, j, a, b;
  for(i=0;i<n;i++) for(j=0;j<n;j++){
    a=lo+i*VOX_U; b=lo+j*VOX_U;
    pts.push(lo,a,b, lo+(n-1)*VOX_U,a,b);
    pts.push(a,lo,b, a,lo+(n-1)*VOX_U,b);
    pts.push(a,b,lo, a,b,lo+(n-1)*VOX_U);
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(pts),3));
  voxGrid=new THREE.LineSegments(g,new THREE.LineBasicMaterial({
    color:0x00e5ff,transparent:true,opacity:0.10,depthWrite:false}));
  localGroup.add(voxGrid);
}

/* galaxy view is a backdrop, so give it real markers to look at */
function buildGalaxyMarks(){
  if(galMarks){ galaxyGroup.remove(galMarks); galMarks.geometry.dispose(); galMarks.material.dispose(); galMarks=null; }
  var keys=Object.keys(store.marks), pts=[], cols=[], i, v;
  for(i=0;i<keys.length;i++){
    var parts=keys[i].split(":");
    if(parseInt(parts[0],10)!==GALAXY) continue;
    var a=parseAddress(parts[1]);
    if(!a) continue;
    v=voxelToGalaxy(a.x,a.y,a.z);
    pts.push(v.x,v.y,v.z); cols.push(0,0.9,1);
  }
  /* Waypoints (task 11: places you want to go but can't reach yet) get their
     own amber marker, distinct from bookmark cyan and the course-target
     orange, so a saved goal is still visible on the whole-galaxy view even
     before you've upgraded a drive to actually plot a course to it. */
  var wpKeys=Object.keys(store.waypoints);
  for(i=0;i<wpKeys.length;i++){
    var wparts=wpKeys[i].split(":");
    if(parseInt(wparts[0],10)!==GALAXY) continue;
    var wa=parseAddress(wparts[1]);
    if(!wa) continue;
    v=voxelToGalaxy(wa.x,wa.y,wa.z);
    pts.push(v.x,v.y,v.z); cols.push(1,0.71,0.33);
  }
  if(courseTarget){
    v=voxelToGalaxy(courseTarget.vx,courseTarget.vy,courseTarget.vz);
    pts.push(v.x,v.y,v.z); cols.push(1,0.65,0);
  }
  if(!pts.length) return;
  var g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(pts),3));
  g.setAttribute("color",new THREE.BufferAttribute(new Float32Array(cols),3));
  galMarks=new THREE.Points(g,new THREE.PointsMaterial({size:7,map:SPRITE,vertexColors:true,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:false}));
  galaxyGroup.add(galMarks);
}

/* ============ galaxy ============ */
function armPos(r,arms,tw,t){
  var arm=Math.floor(r()*arms);
  var rad=CORE_R+t*(GAL_R-CORE_R);
  var spread=(1-t)*0.5+0.09;
  var jit=(r()+r()+r()-1.5)*spread;
  return {ang:arm*(Math.PI*2/arms)+t*tw+jit, rad:rad};
}
function buildNebula(){
  while(nebulaGroup.children.length){
    var ch=nebulaGroup.children.pop();
    if(ch.geometry) ch.geometry.dispose();
    if(ch.material) ch.material.dispose();
  }
  var N=parseInt(document.getElementById("sNeb").value,10);
  var csz=parseFloat(document.getElementById("sCsz").value);
  var arms=parseInt(document.getElementById("sArm").value,10);
  var tw=parseFloat(document.getElementById("sTw").value);
  var th=parseFloat(document.getElementById("sTh").value);
  var gt=galaxyType(GALAXY);
  var r=mulberry32(0x51EB7A+GALAXY*7919), i;
  /* Only the mid band varied by type before -- with the inner core and outer
     rim staying identical fixed colours regardless of galaxy, the type
     difference barely read at a glance (Tony's original complaint: "all
     galaxies are same colour"). Now every band shifts with the type so each
     one has its own overall mood, not just a different ring buried in the
     middle: Harsh runs hot red/ember throughout, Lush stays green/teal and
     alive-looking all the way out, Empty goes pale and cold with a dimmer
     core (a "used up" feel), Norm keeps the original warm-core/blue-violet-rim
     look as the baseline everything else was designed against. */
  var inner = gt.k==="Harsh" ? [0xff6a3d,0xff4a2a,0xffab5c] :
              gt.k==="Lush"  ? [0xc8ff9a,0xa8ff7a,0xe8ffcb] :
              gt.k==="Empty" ? [0xcfe0f5,0xaac0e0,0xe8f0ff] :
                               [0xffb347,0xff8a3d,0xffd88a];
  var mid = gt.k==="Harsh" ? [0xd94f2f,0xb03a2a,0xe07a3a,0xd9662a] :
            gt.k==="Lush"  ? [0x3fd97a,0x2f9e5a,0x5ad98a,0x2a9e7a] :
            gt.k==="Empty" ? [0x3a6fb0,0x2a4f80,0x4a8fd0,0x2f5f9a] :
                             [0x2fd9c0,0x1f9e8f,0x3ad1a0,0x2a8fd9];
  var outer = gt.k==="Harsh" ? [0x6a1f10,0x8a2f18,0x4a1a0c,0x7a2510] :
              gt.k==="Lush"  ? [0x2a8f5a,0x1f6f45,0x3aab6a,0x256e50] :
              gt.k==="Empty" ? [0x3a5a80,0x2a4560,0x4a6a90,0x35506f] :
                               [0x4a6bd9,0x7a4ad9,0x9a5ad0,0x3a4a9a];
  for(i=0;i<N;i++){
    var t=Math.pow(r(),0.55);
    var p=armPos(r,arms,tw,t);
    var pal=(t<0.16)?inner:((t<0.62)?mid:outer);
    var size=(26+r()*70)*csz*(0.55+t*0.9);
    var m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),
      new THREE.MeshBasicMaterial({map:CLOUDS[Math.floor(r()*CLOUDS.length)],
        color:pal[Math.floor(r()*pal.length)],transparent:true,opacity:0.085+r()*0.13,
        blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    m.position.set(Math.cos(p.ang)*p.rad,(r()+r()-1)*th*GAL_H*0.7,Math.sin(p.ang)*p.rad);
    m.rotation.x=-Math.PI/2; m.rotation.z=r()*Math.PI*2;
    nebulaGroup.add(m);
  }
  if(coreMesh){ galaxyGroup.remove(coreMesh); coreMesh.geometry.dispose(); coreMesh.material.dispose(); }
  var coreCol = gt.k==="Harsh" ? 0xffd8b0 : gt.k==="Lush" ? 0xf0ffd8 :
                gt.k==="Empty" ? 0xd8e8ff : 0xfff0c8;
  var coreOp = gt.k==="Empty" ? 0.6 : 0.9; /* an exhausted/empty galaxy's core reads dimmer, not just paler */
  coreMesh=new THREE.Mesh(new THREE.PlaneGeometry(CORE_R*11,CORE_R*11),
    new THREE.MeshBasicMaterial({map:CLOUDS[0],color:coreCol,transparent:true,opacity:coreOp,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  coreMesh.rotation.x=-Math.PI/2;
  galaxyGroup.add(coreMesh);
}
function drawGalIcon(){
  var cv=document.getElementById("galIcon");
  var dpr=Math.min(window.devicePixelRatio||1,2);
  var cssSize=84, size=cssSize*dpr;
  cv.width=size; cv.height=size;
  var ctx=cv.getContext("2d");
  ctx.clearRect(0,0,size,size);
  var gt=galaxyType(GALAXY);
  var inner = gt.k==="Harsh" ? [0xff6a3d,0xff4a2a,0xffab5c] :
              gt.k==="Lush"  ? [0xc8ff9a,0xa8ff7a,0xe8ffcb] :
              gt.k==="Empty" ? [0xcfe0f5,0xaac0e0,0xe8f0ff] :
                               [0xffb347,0xff8a3d,0xffd88a];
  var mid = gt.k==="Harsh" ? [0xd94f2f,0xb03a2a,0xe07a3a,0xd9662a] :
            gt.k==="Lush"  ? [0x3fd97a,0x2f9e5a,0x5ad98a,0x2a9e7a] :
            gt.k==="Empty" ? [0x3a6fb0,0x2a4f80,0x4a8fd0,0x2f5f9a] :
                             [0x2fd9c0,0x1f9e8f,0x3ad1a0,0x2a8fd9];
  var outer = gt.k==="Harsh" ? [0x6a1f10,0x8a2f18,0x4a1a0c,0x7a2510] :
              gt.k==="Lush"  ? [0x2a8f5a,0x1f6f45,0x3aab6a,0x256e50] :
              gt.k==="Empty" ? [0x3a5a80,0x2a4560,0x4a6a90,0x35506f] :
                               [0x4a6bd9,0x7a4ad9,0x9a5ad0,0x3a4a9a];
  var coreCol = gt.k==="Harsh" ? 0xffd8b0 : gt.k==="Lush" ? 0xf0ffd8 :
                gt.k==="Empty" ? 0xd8e8ff : 0xfff0c8;
  function hx(n){ return "#"+("000000"+n.toString(16)).slice(-6); }
  var cx=size/2, cy=size/2, R=size*0.47;
  var r=mulberry32(0x51EB7A+GALAXY*7919);
  var arms=parseInt(document.getElementById("sArm").value,10)||4;
  var tw=parseFloat(document.getElementById("sTw").value)||3.6;
  ctx.globalCompositeOperation="lighter";
  var N=Math.round(size*0.9);
  for(var i=0;i<N;i++){
    var t=Math.pow(r(),0.55);
    var arm=Math.floor(r()*arms);
    var ang=arm*(Math.PI*2/arms)+t*tw+(r()+r()+r()-1.5)*0.7+galIconRot;
    var rad=t*R;
    var px=cx+Math.cos(ang)*rad, py=cy+Math.sin(ang)*rad*0.62;
    var pal=(t<0.16)?inner:((t<0.62)?mid:outer);
    var col=hx(pal[Math.floor(r()*pal.length)]);
    var bs=(size*0.05)+r()*size*0.11;
    var g=ctx.createRadialGradient(px,py,0,px,py,bs);
    g.addColorStop(0,col); g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.globalAlpha=0.32+r()*0.34;
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(px,py,bs,0,Math.PI*2); ctx.fill();
  }
  var cg=ctx.createRadialGradient(cx,cy,0,cx,cy,size*0.16);
  cg.addColorStop(0,hx(coreCol)); cg.addColorStop(1,"rgba(0,0,0,0)");
  ctx.globalAlpha=0.95;
  ctx.fillStyle=cg;
  ctx.beginPath(); ctx.arc(cx,cy,size*0.16,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
}
/* ============ Item 8: starfield parallax backdrop ============
   2200 cool-white points on a large sphere (radius 1100-1500 wu) —
   renders before galaxy/nebula so it sits behind everything.
   Fixed in world space; natural perspective parallax as camera moves. */
function buildBackdrop(){
  if(backdropPts){scene.remove(backdropPts);backdropPts.geometry.dispose();backdropPts.material.dispose();backdropPts=null;}
  var N=2200,pos=new Float32Array(N*3),col=new Float32Array(N*3);
  var rb=mulberry32(0x5EED5001);
  for(var i=0;i<N;i++){
    var theta=rb()*Math.PI*2,phi=Math.acos(2*rb()-1);
    var rad=1100+rb()*400; /* 1100–1500 wu — behind galaxy, within camera far=5000 */
    pos[i*3]=rad*Math.sin(phi)*Math.cos(theta);
    pos[i*3+1]=rad*Math.sin(phi)*Math.sin(theta);
    pos[i*3+2]=rad*Math.cos(phi);
    var b=0.25+rb()*0.65; /* brightness 0.25–0.9 */
    col[i*3]=b*0.74;col[i*3+1]=b*0.82;col[i*3+2]=b; /* cool blue-white tint */
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  backdropPts=new THREE.Points(g,new THREE.PointsMaterial({
    size:2.2,sizeAttenuation:true,vertexColors:true,
    transparent:true,opacity:0.5,depthWrite:false,
    blending:THREE.AdditiveBlending
  }));
  backdropPts.renderOrder=-1; /* draw first, sits behind galaxy/nebula */
  scene.add(backdropPts);
}
function buildGalaxy(){
  if(galPts){ galaxyGroup.remove(galPts); galPts.geometry.dispose(); galPts.material.dispose(); galPts=null; }
  var N=parseInt(document.getElementById("sGal").value,10);
  var arms=parseInt(document.getElementById("sArm").value,10);
  var tw=parseFloat(document.getElementById("sTw").value);
  var th=parseFloat(document.getElementById("sTh").value);
  var pos=new Float32Array(N*3), col=new Float32Array(N*3);
  var r=mulberry32(0xC0FFEE+GALAXY*104729), c=new THREE.Color();
  var palette=[0x9fe6ff,0xbfd4ff,0xffe9c0,0xffd08a,0xd8b8ff,0xa8ffd8,0xffffff];
  for(var i=0;i<N;i++){
    var t=Math.pow(r(),0.6);
    var p=armPos(r,arms,tw,t);
    pos[i*3]=Math.cos(p.ang)*p.rad+(r()-0.5)*2.5;
    pos[i*3+1]=(r()+r()+r()-1.5)*th*GAL_H*(1-t*0.5);
    pos[i*3+2]=Math.sin(p.ang)*p.rad+(r()-0.5)*2.5;
    c.setHex(palette[Math.floor(r()*palette.length)]);
    var b=0.4+(1-t)*0.6;
    col[i*3]=c.r*b; col[i*3+1]=c.g*b; col[i*3+2]=c.b*b;
  }
  /* item 10: add per-star size variation for GLSL shader */
  var sz=new Float32Array(N);
  for(var _si=0;_si<N;_si++) sz[_si]=0.9+r()*0.7;
  var g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(pos,3));
  g.setAttribute("aColor",new THREE.BufferAttribute(col,3));
  g.setAttribute("aSize",new THREE.BufferAttribute(sz,1));
  galPts=new THREE.Points(g,new THREE.ShaderMaterial({
    vertexShader:STAR_VERT_SH,fragmentShader:STAR_FRAG_SH,
    uniforms:{uTime:_starTime},
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  galaxyGroup.add(galPts);
}

/* Guaranteed-visible marked systems (2026-08-26, Tony: "if i filter black
   holes it shows all systems with black holes yet doesnt show visited...
   even system edited by travellers still only coming back with current
   system"). Black holes/Atlas stations always showed reliably because
   regionAnomalyIdx() below force-includes their real index in every
   region's slice regardless of the random per-region sample -- but a
   visited/waypointed/edited system's index is just an ordinary address
   like any other, so it only ever turned up if the random per-region draw
   (sPer picks out of a 4096-wide pool) happened to land on it by chance.
   That's why those two filters only ever showed the system you'd just
   jumped to (guaranteed in via focusIdx below) and nothing else, even for
   systems genuinely visited/edited nearby. Fix: decode every
   store.visited/store.waypoints key plus every real (has .data)
   OVERRIDES.systems entry for the CURRENT galaxy back into its region+index
   -- parseAddress() is the exact inverse of formatAddress(), so this needs
   no new storage -- and guarantee those indices into the slice the same
   way bh/atlas/focus already are, region by region. Built once per
   generateSlice() call (not a per-star OVERRIDES scan), so this stays
   cheap even with thousands of visited/edited systems on record.
   2026-08-27, Tony: the "Visited"/"Systems edited by traveller" FILTER
   checkboxes this was built for are gone now (removed below, in
   passFilter() -- Local view is inherently spatial and could never show
   something outside whatever range is currently loaded no matter what this
   function did, and Search's empty-query browse already covers "show me
   everywhere I've been/edited, click to jump back" without that limit --
   not worth the further time/tokens to keep chasing). Left this function
   running as-is rather than ripping it out: the Waypoints filter still
   reads store.waypoints the exact same way and still benefits from the
   same guarantee, and the Visited/edited entries it also surfaces are
   harmless -- at worst a system that would've rendered anyway shows its
   real "Visited"/"Community edited" info-panel tag a little more often. */
function markedRegionIdx(){
  var map={};
  function add(vx,vy,vz,idx){
    var k=vx+","+vy+","+vz;
    if(!map[k]) map[k]=[];
    if(map[k].indexOf(idx)<0) map[k].push(idx);
  }
  function addFromKey(key,assumeGalaxy0){
    var ci=key.indexOf(":");
    var gal, addrStr;
    if(ci<0){ if(!assumeGalaxy0) return; gal=0; addrStr=key; }
    else { gal=parseInt(key.slice(0,ci),10); addrStr=key.slice(ci+1); }
    if(gal!==GALAXY) return;
    var a=parseAddress(addrStr);
    if(!a) return;
    add(a.x,a.y,a.z,a.idx);
  }
  var k;
  for(k in store.visited) addFromKey(k,false);
  for(k in store.waypoints) addFromKey(k,false);
  if(OVERRIDES.systems) for(k in OVERRIDES.systems){
    var ov=OVERRIDES.systems[k];
    // legacy pre-migration records are bare addresses assumed galaxy 0 --
    // same fallback rule applyOverride() itself uses above.
    if(ov && ov.data) addFromKey(k,true);
  }
  return map;
}
/* ============ local slice ============ */
function generateSlice(focusIdx){
  var R=parseInt(document.getElementById("sR").value,10);
  var per=parseInt(document.getElementById("sPer").value,10);
  allSystems=[];
  var _marked=markedRegionIdx();
  var dx,dy,dz,i;
  for(dx=-R;dx<=R;dx++) for(dy=-R;dy<=R;dy++) for(dz=-R;dz<=R;dz++){
    var vx=focus.x+dx, vy=focus.y+dy, vz=focus.z+dz;
    var count=regionCount(vx,vy,vz);
    var vr=mulberry32(gseed(vx,vy,vz,0xF00D));
    /* real per-region black-hole/Atlas indices (0, 1, or 2 entries -- see
       regionAnomalyIdx()), replacing the old blanket [0x079,0x07A] which
       force-manufactured one of each in every region shown, including the
       dead core where the real game has none. */
    var _an=regionAnomalyIdx(vx,vy,vz);
    var idxs=[]; if(_an.bh>=0) idxs.push(_an.bh); if(_an.atlas>=0) idxs.push(_an.atlas);
    /* the system you jumped to must always be in the slice, or nothing gets selected */
    if(focusIdx!=null && dx===0 && dy===0 && dz===0 && idxs.indexOf(focusIdx)<0) idxs.push(focusIdx);
    /* any visited/waypointed/edited system that falls in this region must also
       always be in the slice -- see markedRegionIdx() above for why. */
    var _mk=_marked[vx+","+vy+","+vz];
    if(_mk){ for(var _mj=0;_mj<_mk.length;_mj++){ if(idxs.indexOf(_mk[_mj])<0) idxs.push(_mk[_mj]); } }
    for(i=0;i<per;i++){
      var pick=Math.floor(vr()*count);
      if(idxs.indexOf(pick)<0) idxs.push(pick);
    }
    for(i=0;i<idxs.length;i++){
      var idx=idxs[i];
      var jr=mulberry32(gseed(vx,vy,vz,idx^0x9999));
      var s=generateSystem(vx,vy,vz,idx);
      s.px=(dx+jr()-0.5)*VOX_U; s.py=(dy+jr()-0.5)*VOX_U; s.pz=(dz+jr()-0.5)*VOX_U;
      allSystems.push(s);
    }
  }
  buildVoxelGrid();
  if(allSystems.length>45000) toast("Heavy: "+allSystems.length.toLocaleString()+" systems");
  applyFilter();
}
/* "Visited" and "Systems edited by traveller" checkboxes removed 2026-08-27
   (Tony: not worth further time/tokens given Local view's inherent range
   limit -- see markedRegionIdx()'s own comment above generateSlice() --
   and Search's empty-query browse already covers the real ask: everywhere
   you've been/edited, regardless of where you currently are, click to jump
   back). store.visited/s.override themselves are untouched and still drive
   the info panel's "Visited"/"Community edited" tags and Search. */
function passFilter(s){
  var col=document.getElementById("fCol").value;
  var race=document.getElementById("fRace").value;
  var eco=document.getElementById("fEco").value;
  if(col&&s.type!==col) return false;
  if(race&&s.race!==race) return false;
  if(eco&&s.econType!==eco) return false;
  if(document.getElementById("fBH").checked&&!s.blackHole) return false;
  if(document.getElementById("fAtl").checked&&!s.atlas) return false;
  if(document.getElementById("fStation").checked&&!s.hasStation) return false;
  if(document.getElementById("fPhantom").checked&&s.phantom!=="phantom") return false;
  if(document.getElementById("fShadow").checked&&s.phantom!=="shadow") return false;
  if(document.getElementById("fOut").checked&&!s.outlaw) return false;
  if(document.getElementById("fGiant").checked&&!s.giant) return false;
  if(document.getElementById("fWaypoint").checked&&!store.waypoints[skey(s)]) return false;
  if(document.getElementById("fReachOnly").checked&&!canReachColor(s.type)) return false;
  return true;
}
function updateRings(){
  if(focusSystem){ focusRing.position.set(focusSystem.px,focusSystem.py,focusSystem.pz); focusRing.visible=true; }
  else focusRing.visible=false;
  if(selected&&selected.px!==undefined){ selRing.position.set(selected.px,selected.py,selected.pz); selRing.visible=true; }
  else selRing.visible=false;
}
function applyFilter(){
  if(locPts){ localGroup.remove(locPts); locPts.geometry.dispose(); locPts.material.dispose(); locPts=null; }
  if(locInstMesh){ localGroup.remove(locInstMesh); locInstMesh.geometry.dispose(); locInstMesh.material.dispose(); locInstMesh=null; }
  shown=[];
  var i;
  for(i=0;i<allSystems.length;i++) if(passFilter(allSystems[i])) shown.push(allSystems[i]);
  var n=shown.length;
  document.getElementById("nsys").textContent=n;
  document.getElementById("empty").style.display = (n===0&&mode==="local") ? "block" : "none";
  if(n===0){ updateRings(); return; }
  var pos=new Float32Array(n*3), col=new Float32Array(n*3), c=new THREE.Color();
  for(i=0;i<n;i++){
    var s=shown[i];
    pos[i*3]=s.px; pos[i*3+1]=s.py; pos[i*3+2]=s.pz;
    var hx=s.blackHole?0xffffff:(s.atlas?0xf0a500:(s.phantom==="shadow"?0x6a4fa0:(s.phantom==="phantom"?0x777788:s.color)));
    if(store.waypoints[skey(s)]) hx=0xffb454;
    if(store.marks[skey(s)]) hx=0x00e5ff;
    c.setHex(hx);
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  /* item 10: per-star size for GLSL shader, based on user size setting */
  var szBase=parseFloat(document.getElementById("sSz").value);
  var sz=new Float32Array(n);
  var _szr=mulberry32(0xA5712E33);
  for(i=0;i<n;i++) sz[i]=szBase*(0.8+_szr()*0.5);
  var g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(pos,3));
  g.setAttribute("aColor",new THREE.BufferAttribute(col,3));
  g.setAttribute("aSize",new THREE.BufferAttribute(sz,1));
  locPts=new THREE.Points(g,new THREE.ShaderMaterial({
    vertexShader:STAR_VERT_SH,fragmentShader:STAR_FRAG_SH,
    uniforms:{uTime:_starTime},
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  localGroup.add(locPts);
  /* ---- InstancedMesh picking layer: invisible spheres give reliable instanceId raycasting ---- */
  var _iGeo=new THREE.SphereGeometry(0.55,4,3);
  var _iMat=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false});
  locInstMesh=new THREE.InstancedMesh(_iGeo,_iMat,n);
  locInstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  var _im4=new THREE.Matrix4(),_icv=new THREE.Color();
  for(var _ii=0;_ii<n;_ii++){
    _im4.setPosition(shown[_ii].px,shown[_ii].py,shown[_ii].pz);
    locInstMesh.setMatrixAt(_ii,_im4);
    _icv.setRGB(col[_ii*3],col[_ii*3+1],col[_ii*3+2]);
    locInstMesh.setColorAt(_ii,_icv);
  }
  locInstMesh.instanceMatrix.needsUpdate=true;
  if(locInstMesh.instanceColor) locInstMesh.instanceColor.needsUpdate=true;
  localGroup.add(locInstMesh);
  drawCourse();
  updateRings();
}

/* ============ course plotting ============ */
var courseDots=null;
function clearCourseLine(){
  if(courseLine){ localGroup.remove(courseLine); courseLine.geometry.dispose(); courseLine.material.dispose(); courseLine=null; }
  if(courseDots){ localGroup.remove(courseDots); courseDots.geometry.dispose(); courseDots.material.dispose(); courseDots=null; }
}
var courseWaypoints=null, courseTruncated=false;
/* 2026-08-30, honest-review fix: the actual jump-by-jump route distance
   (sum of each hop's real length), computed once in _finishSetCourse()
   from the final courseWaypoints and reused everywhere a "how far is this
   route" number is shown -- the Warp Manifest's own Est. Distance line and
   the PLAN JOURNEY handoff to the Navigator both used to compute this
   independently (the manifest showed the straight-line beeline distance
   from setCourse() instead, PLAN JOURNEY re-summed the hops itself), so
   the two could -- and on any route that isn't a straight line, did --
   disagree, sometimes by 20%+, one click apart in the same flow. Keeping
   one shared number here means every "route distance" readout on the site
   is now, by construction, the same value. */
var courseRouteLY=0;
/* 2026-08-26: set true by the #bCourse click handler right before a FRESH
   plot (new target); _finishSetCourse() checks and clears it once the
   route resolves, opening the Warp Manifest if it is not already open.
   Re-clicking #bCourse on the SAME already-plotted target skips setCourse()
   entirely and just clicks #bToggleManifest directly (see #bCourse's own
   listener) -- so this flag only ever matters for a genuine new plot. */
var _openManifestOnPlot=false;
var _routeWorker=null; /* active A* web worker, null when idle */
var _routeGen=0; /* bumped by setCourse() every call and by abortRoute() -- lets any
  in-flight A* result or chunked findRouteAsync fallback (see its own comment) tell
  it's been superseded and quietly stop instead of possibly landing after a newer,
  already-finished course and clobbering it */
var WARP_ENABLED=localStorage.getItem('nms-galmap-warp')!=='0'; /* spec item 9 */
/* inline A* worker — blob URL created once at startup, reused for every setCourse() call */
var _ASTAR_WORKER_URL=(function(){
  /* Real bug fixed 2026-08-16 (Tony: "LOCK NAVIGATION TARGET" spinning
     forever, only stoppable via Abort): this A* search had no upper bound
     at all on how long it could run -- for a big/dense enough candidate
     graph (allSystems can now be several thousand real systems, especially
     after a course has been plotted a few times and mergeWaypointsIntoSlice()
     keeps adding to it) the plain O(n) neighbour filter + O(n log n) sort
     every single iteration could genuinely take a very long time before
     either finding the target or exhausting every node, which is exactly
     what "doesn't stop till you click abort" looks like from the outside --
     not a true infinite loop, just unbounded work. Added a wall-clock bail:
     if the search is still running after ~4 seconds it gives up and returns
     null, which the existing onmessage handler already treats as "A* found
     nothing" and falls back to the fast, already-solid findRoute() below --
     same safety-net path that already runs whenever A* can't find a
     connected route, just now guaranteed to actually trigger instead of
     hanging indefinitely first.
     Follow-up fix 2026-08-25 (Tony: "set course taking too long... as if
     in a loop again, had to click abort"): the bail above was only
     sampling Date.now() every 200th iteration (_n%200===0). At ~3000
     systems each iteration does an O(n log n) sort plus an O(n) filter
     with a sqrt distance calc, so 200 iterations can take far longer than
     4 seconds -- confirmed live, the worker ran 48+ seconds without ever
     bailing on its own. Now checks the wall clock every iteration instead,
     so the 4-second cap is actually honoured.
     Root-cause fix 2026-08-25, round 3 (Tony, after the display was
     already fixed: "still taking to long even with 3 jumps"): live-timed
     this on the real deployed site and a plain 2-hop route was taking
     ~1.9 REAL seconds inside the worker alone against a ~2200-entry
     candidate set -- the 4s bail above was masking this as "eventually
     works" instead of "fast", and the fabricated loader text before this
     round hid it entirely. The actual cost is that db.filter(...) below
     scans literally every candidate system, computing a real sqrt
     distance, for EVERY single node the search pops off open -- O(n) per
     node instead of only looking at what's actually nearby. The other
     route path (findRoute()/_routeHop() below, used by the findRouteAsync
     fallback) already solved this exact problem with regionCandidates()'s
     spatial lookup; this gives planRoute() the equivalent for its own
     fixed db array: a uniform grid, cell size = mr (the jump range,
     already the natural radius), built once before the search starts, so
     a neighbour query only has to check the ~27 cells around the current
     node instead of the whole database. This changes nothing about WHICH
     systems count as neighbours -- same gd() distance, same d>0&&d<=mr
     condition, same resulting set -- only how that set is found. */
  /* Round 4 fix 2026-08-25 (Tony, still stuck at "STILL SEARCHING" with zero
     hop lines even after the round-3 neighbour fix above): exactly the
     second cost flagged (but not yet fixed) in that round's own comment --
     open.sort() re-sorts the ENTIRE open list from scratch on every single
     iteration (O(k log k)), and open.some(...) below does a full linear
     scan of open on every edge relax to check for an existing duplicate
     (O(k) per neighbour). Both were fine while open stayed small; on a
     harder/longer route -- especially now, since mergeWaypointsIntoSlice()
     keeps growing the candidate pool every time a route is plotted, this
     session included -- open can grow into the thousands before the search
     converges or the 4s bail fires, and at that size the sort+scan costs
     dominate all over again, independent of the neighbour-lookup fix.
     Replaced the plain array with a real binary min-heap (heapPush/
     heapPop below), keyed on fs -- O(log k) per push/pop instead of
     O(k log k)/O(k). Since an array heap can't cheaply decrease an
     existing entry's key in place, a relaxed edge just pushes a fresh
     entry instead of the old open.some() dedupe check; a node can now
     appear in the heap more than once, so each pop verifies its stored key
     still matches the CURRENT fs.get(address) (both come from the exact
     same tg+gd(nb,e) expression, so this is an exact match, not a
     tolerance) and silently skips+continues on a stale one -- the
     classic "lazy deletion" trick. This changes nothing about the actual
     search: same neighbours, same relaxation rule, same termination
     conditions, same returned path -- verified hop-for-hop identical
     against the round-3 version on real routes from the live site before
     shipping (see chat). Only how the open list's min is found changed. */
  var src='function gd(a,b){var dx=a.x-b.x,dy=a.y-b.y,dz=a.z-b.z;return Math.sqrt(dx*dx+dy*dy+dz*dz);}\n'+
    'function heapPush(h,it){h.push(it);var i=h.length-1;while(i>0){var p=(i-1)>>1;if(h[p].k<=h[i].k)break;var t=h[p];h[p]=h[i];h[i]=t;i=p;}}\n'+
    'function heapPop(h){var top=h[0],last=h.pop();if(h.length>0){h[0]=last;var i=0,n=h.length;while(true){var l=2*i+1,r=2*i+2,sm=i;if(l<n&&h[l].k<h[sm].k)sm=l;if(r<n&&h[r].k<h[sm].k)sm=r;if(sm===i)break;var t=h[sm];h[sm]=h[i];h[i]=t;i=sm;}}return top;}\n'+
    'function planRoute(s,e,db,mr){\n'+
    '  var cell=mr>0?mr:1;\n'+
    '  function ck(x,y,z){return Math.floor(x/cell)+\",\"+Math.floor(y/cell)+\",\"+Math.floor(z/cell);}\n'+
    '  var grid=new Map();\n'+
    '  for(var gi=0;gi<db.length;gi++){\n'+
    '    var o=db[gi],gk=ck(o.x,o.y,o.z),garr=grid.get(gk);\n'+
    '    if(!garr){garr=[];grid.set(gk,garr);}\n'+
    '    garr.push(o);\n'+
    '  }\n'+
    '  function neighborsOf(cur){\n'+
    '    var cx=Math.floor(cur.x/cell),cy=Math.floor(cur.y/cell),cz=Math.floor(cur.z/cell),out=[];\n'+
    '    for(var ddx=-1;ddx<=1;ddx++) for(var ddy=-1;ddy<=1;ddy++) for(var ddz=-1;ddz<=1;ddz++){\n'+
    '      var garr=grid.get((cx+ddx)+\",\"+(cy+ddy)+\",\"+(cz+ddz));\n'+
    '      if(!garr) continue;\n'+
    '      for(var ai=0;ai<garr.length;ai++){\n'+
    '        var d=gd(cur,garr[ai]);\n'+
    '        if(d>0&&d<=mr) out.push(garr[ai]);\n'+
    '      }\n'+
    '    }\n'+
    '    return out;\n'+
    '  }\n'+
    '  var cf=new Map(),gs=new Map(),fs=new Map();\n'+
    '  gs.set(s.address,0); fs.set(s.address,gd(s,e));\n'+
    '  var heap=[]; heapPush(heap,{n:s,k:gd(s,e)});\n'+
    '  var _t0=Date.now(),_n=0;\n'+
    '  while(heap.length>0){\n'+
    '    _n++; if(Date.now()-_t0>4000) return null;\n'+
    '    var top=heapPop(heap), cur=top.n;\n'+
    '    if(top.k!==fs.get(cur.address)) continue;\n'+
    '    if(cur.address===e.address||gd(cur,e)<=mr){\n'+
    '      var path=[],tmp=cur;\n'+
    '      while(cf.has(tmp.address)){path.unshift(tmp);tmp=cf.get(tmp.address);}\n'+
    '      path.unshift(s);\n'+
    '      if(cur.address!==e.address) path.push(e);\n'+
    '      return path;\n'+
    '    }\n'+
    '    var nbrs=neighborsOf(cur);\n'+
    '    for(var i=0;i<nbrs.length;i++){\n'+
    '      var nb=nbrs[i],tg=(gs.get(cur.address)||0)+gd(cur,nb);\n'+
    '      if(tg<(gs.get(nb.address)||Infinity)){\n'+
    '        cf.set(nb.address,cur); gs.set(nb.address,tg);\n'+
    '        var nfs=tg+gd(nb,e); fs.set(nb.address,nfs);\n'+
    '        heapPush(heap,{n:nb,k:nfs});\n'+
    '      }\n'+
    '    }\n'+
    '  }\n'+
    '  return null;\n'+
    '}\n'+
    'self.onmessage=function(e){self.postMessage(planRoute(e.data.s,e.data.e,e.data.db,e.data.mr));};';
  return URL.createObjectURL(new Blob([src],{type:'application/javascript'}));
})();
var VOX_LY=LY_PER_VOXEL/VOX_U; /* light-years represented by one world unit, ~44.4 */
var ROUTE_MAX_HOPS=40; /* a real long-haul NMS trip can be hundreds of jumps -- past this
  many the polyline stops being useful to look at anyway, so the route is truncated with
  a final dashed run to the target and the jump COUNT still reported honestly via the
  simple distance/range math rather than pretending every hop was individually plotted */
/* Same deterministic per-region system-picking as generateSlice() (same 0xF00D seed,
   same regionCount()) but scoped to a single region on demand -- lets the route
   planner ask "what real named systems exist here" for any region along a course,
   not just whatever happens to be in the currently-rendered local slice, without
   needing to materialize/render systems the player never actually visits. Positions
   are computed relative to the CURRENT `focus` origin, same formula generateSlice
   uses, so they land in the same coordinate space as focusSystem/courseTarget. */
function regionCandidates(vx,vy,vz){
  var count=regionCount(vx,vy,vz);
  var vr=mulberry32(gseed(vx,vy,vz,0xF00D));
  /* Route-finding only, not the visible local-slice density (#sPer) -- verified
     against the NMS wiki that a hyperdrive can only ever warp to a real charted
     star system, never empty space, so route candidates need to be dense enough
     that a real system is essentially always found in range, especially at the
     Basic (101 LY) default where a hop only covers a sliver of one region.
     Bumped 200->1000 alongside the regionCount() fix above (2026-08-16): a
     101 LY hop only spans ~7% of one region's volume by geometry, so once
     regionCount() started reporting the true 4096-wide pool instead of the
     old ~350-average placeholder, 200 draws against the bigger pool was
     actually SPARSER than before and made hop counts worse, not better --
     confirmed by a Node harness reproducing Tony's own "980 LY should be
     ~10 jumps, not 26" report. A 40-trial regression sweep at per=1000
     landed routes at ~1.1x the naive distance/range minimum on average
     (worst case 1.3x) with zero truncated/backtracking routes, versus up
     to ~2.6x before -- the one-time cost is a couple of extra seconds of
     findRoute() compute on a long trip, which the existing showRouteLoader()
     screen already covers. */
  var per=Math.min(1000,count);
  /* real per-region black-hole/Atlas indices, same fix as generateSlice() --
     see regionAnomalyIdx(). */
  var _an=regionAnomalyIdx(vx,vy,vz);
  var idxs=[]; if(_an.bh>=0) idxs.push(_an.bh); if(_an.atlas>=0) idxs.push(_an.atlas);
  var i;
  for(i=0;i<per;i++){
    var pick=Math.floor(vr()*count);
    if(idxs.indexOf(pick)<0) idxs.push(pick);
  }
  var out=[], dx=vx-focus.x, dy=vy-focus.y, dz=vz-focus.z;
  for(i=0;i<idxs.length;i++){
    var idx=idxs[i];
    var jr=mulberry32(gseed(vx,vy,vz,idx^0x9999));
    var jx=jr(),jy=jr(),jz=jr();
    out.push({
      vx:vx,vy:vy,vz:vz,idx:idx,
      px:(dx+jx-0.5)*VOX_U, py:(dy+jy-0.5)*VOX_U, pz:(dz+jz-0.5)*VOX_U,
      name:nameFrom(gseed(vx,vy,vz,idx^0xABCD)),
      address:formatAddress(1,idx,vx,vy,vz),
      blackHole:idx===_an.bh, atlas:idx===_an.atlas,
      /* Star colour of this candidate, via the read-only starTypeForIdx()
         helper (see its own comment) -- lets findRoute() below only route
         hyperdrive hops through colours the CURRENT drive can actually
         reach, task 4's ask. Black hole/Atlas indices have no real star
         type of their own in-game, but they're extremely rare picks
         (guide-star reserved indices) and canReachColor() only ever
         narrows candidates, never adds bad ones, so leaving them typed
         normally like any other index is harmless. */
      type:starTypeForIdx(vx,vy,vz,idx).k
    });
  }
  return out;
}
function wpDist(a,b){ var dx=a.px-b.px,dy=a.py-b.py,dz=a.pz-b.pz; return Math.sqrt(dx*dx+dy*dy+dz*dz); }
/* Greedy multi-hop route: from each point, aim for the maximum hyperdrive range in
   the ideal straight-line direction, then snap to whichever REAL charted system
   lands nearest that ideal point (searching an expanding neighbourhood of regions
   around it, not the whole sphere within range -- keeps this cheap even at the
   6000 LY freighter range, which would otherwise mean scanning a huge volume every
   hop). This is what actually produces the bent, system-to-system path the game
   itself shows instead of one straight dashed line drawn through empty space.
   Confirmed against the NMS wiki (Hyperdrive page) that a hyperdrive can only ever
   warp to a real charted star system, accessed via the Galactic Map -- never to a
   point in empty space -- so every hop below must land on a real system with a
   real name. If nothing forward-progressing is in range even after the widened
   search, the last resort is still a real in-range star (just not one that's
   strictly closer yet); only if literally no charted system is in range at all
   does the route give up and report itself truncated, same as running out of
   hyperdrive range for real. */
/* Extracted 2026-08-25 from findRoute()'s while-loop body so the exact same
   per-hop candidate search can be shared, byte-for-byte, between the
   original synchronous findRoute() (still used for the cheap single-call
   hover preview) and the new chunked findRouteAsync() below (used for
   setCourse()'s slow multi-hop fallback) -- see findRouteAsync's own
   comment for why. Pure refactor, no logic changed: same operations, same
   order, same locals (they were already re-declared fresh each loop
   iteration via var, so moving them into this function's own scope changes
   nothing). */
function _routeHop(cur,to,rangeW,visited,driveGateRoute){
  var remain=wpDist(cur,to);
  var dir={x:(to.px-cur.px)/remain,y:(to.py-cur.py)/remain,z:(to.pz-cur.pz)/remain};
  var step=Math.min(rangeW*0.95,remain);
  var ideal={px:cur.px+dir.x*step,py:cur.py+dir.y*step,pz:cur.pz+dir.z*step};
  var ivx=Math.round(focus.x+ideal.px/VOX_U), ivy=Math.round(focus.y+ideal.py/VOX_U), ivz=Math.round(focus.z+ideal.pz/VOX_U);
  var best=null,bestD=Infinity;
  var fallback=null,fallbackD=Infinity; /* nearest-to-ideal among ALL in-range,
    not-yet-visited real stars, regardless of whether they beat `remain` --
    last resort only. Tried "nearest to the TARGET" here first, but a headless
    test caught it wandering the route further and further away over many
    hops in a sparse patch (each compromise still had to avoid every star
    visited so far, so it kept drifting) -- nearest-to-ideal keeps the
    fallback on roughly the same bearing instead of jumping off in whatever
    direction happens to be closest overall, which behaves far more sanely. */
  for(var rad=1;rad<=3&&!best;rad++){
    for(var ddx=-rad;ddx<=rad;ddx++) for(var ddy=-rad;ddy<=rad;ddy++) for(var ddz=-rad;ddz<=rad;ddz++){
      if(rad>1 && Math.max(Math.abs(ddx),Math.abs(ddy),Math.abs(ddz))<rad) continue; /* shell only, inner already scanned */
      var cands=regionCandidates(ivx+ddx,ivy+ddy,ivz+ddz),c;
      for(var k=0;k<cands.length;k++){
        c=cands[k];
        if(visited[c.address]) continue;
        /* Task 4 ("don't just jump between [the drive's max] colour --
           sometimes add lower star colours too, since a higher drive is
           backwards-compatible"): a hop is a valid candidate if its colour
           is ANYWHERE in the current drive's reach set, not just its top
           tier -- an Indium Drive route should freely mix blue AND
           yellow/red/green hops, exactly like the real backwards-
           compatible mechanic in Tony's own doc. Only the FINAL waypoint
           (pushed unconditionally after this loop, same as before) is
           allowed to be a colour outside the current reach -- that's the
           "I want to plan a trip to a system I can't reach yet" case,
           handled instead by disabling Jump-to and offering a Waypoint
           save (see bGoCourse's handler). */
        if(driveGateRoute && !canReachColor(c.type)) continue;
        var dHop=wpDist(cur,c);
        if(dHop>rangeW||dHop<0.05) continue;
        var dToIdeal=wpDist(ideal,c);
        if(dToIdeal<fallbackD){ fallbackD=dToIdeal; fallback=c; }
        /* Being the closest real star to the ideal point isn't enough on its own --
           without this, a hop could snap to a real system that's within range but
           actually sideways or slightly BEHIND cur relative to the target, which
           reads on screen as the route doubling back on itself. */
        if(wpDist(c,to)>=remain) continue;
        if(dToIdeal<bestD){ bestD=dToIdeal; best=c; }
      }
    }
  }
  return best||fallback||null; /* null: no charted, unvisited system in range at all */
}
function findRoute(from,to,rangeLY,driveGateRoute){
  var rangeW=rangeLY/VOX_LY;
  var path=[{px:from.px,py:from.py,pz:from.pz,name:from.name,address:from.address,real:true}];
  /* Every address ever pushed onto the path is excluded from future candidacy --
     verified via a headless test that without this, the route can genuinely
     ping-pong forever between two real stars right at the edge of jump range
     (a real star that's the "closest in range" from A can turn out to be
     WORSE than A once you're standing at it, sending you right back to A).
     Tony's own rule -- "never goes back to a previous star" -- turns out to be
     exactly what prevents that, not just a nicety. */
  var visited={}; if(from.address) visited[from.address]=true;
  var cur=path[0], truncated=false;
  var total=wpDist(from,to);
  if(total<=rangeW){
    path.push({px:to.px,py:to.py,pz:to.pz,name:to.name,address:to.address,real:true});
    return {path:path,truncated:false};
  }
  var guard=0;
  while(wpDist(cur,to)>rangeW){
    guard++;
    if(guard>ROUTE_MAX_HOPS){ truncated=true; break; }
    var next=_routeHop(cur,to,rangeW,visited,driveGateRoute);
    if(!next){ truncated=true; break; } /* no charted, unvisited system in range at all -- report honestly rather than invent one */
    path.push(next);
    if(next.address) visited[next.address]=true;
    cur=next;
  }
  path.push({px:to.px,py:to.py,pz:to.pz,name:to.name,address:to.address,real:true});
  return {path:path,truncated:truncated};
}
/* Added 2026-08-25 (Tony, after the A* worker-timeout fix: "quick tweak and
   if stutter a message saying plotting to next star / rundown list of star
   names"): findRoute()'s hop loop above was confirmed live to take 12.6s for
   a single ~679LY/10-hop route, running entirely synchronously on the main
   thread with no way for Abort to interrupt it once started -- unlike the
   A* search, this isn't a worker, it can't just be terminated mid-flight.
   Moving the whole thing into a real worker would mean hand-duplicating
   regionCandidates()'s seeded-RNG candidate generation (plus wpDist/
   canReachColor/the hyperdrive table) into an isolated worker script the
   same fragile, easy-to-transcribe-wrong way the A* worker already is --
   given how much headless-test tuning findRoute()'s exact hop selection has
   had across prior sessions, that felt like too much risk to fix what's
   ultimately a UI freeze. So instead: the EXACT same hop-by-hop logic
   (_routeHop above, the same function findRoute() itself calls, not a
   rewritten copy), just run one hop per setTimeout(0) tick instead of all
   of them back to back -- the browser gets a paint/input turn between every
   hop, onHop can surface real progress (used by setCourse() to print each
   plotted star into the loader's terminal console as it's found).
   isCancelled is a caller-supplied predicate rather than a single shared
   flag: setCourse() picking a NEW star while a fallback is still chunking
   away on the OLD one is a real case now that this doesn't block the tab
   (it couldn't happen before -- the old synchronous version blocked
   everything else until it finished, so nothing could ever race it). A
   shared boolean can't tell "abort the run I own" from "abort whatever's
   currently in flight, which may not be me any more" apart; setCourse()
   instead hands each run its own generation number and isCancelled closure
   (see _routeGen there) so a superseded run quietly stops itself without
   any chance of clobbering the newer one's result, and the explicit Abort
   button bumps that same counter to cancel whatever's currently running. */
function findRouteAsync(from,to,rangeLY,driveGateRoute,onHop,onDone,isCancelled){
  var rangeW=rangeLY/VOX_LY;
  var path=[{px:from.px,py:from.py,pz:from.pz,name:from.name,address:from.address,real:true}];
  var visited={}; if(from.address) visited[from.address]=true;
  var cur=path[0], truncated=false;
  var total=wpDist(from,to);
  if(total<=rangeW){
    path.push({px:to.px,py:to.py,pz:to.pz,name:to.name,address:to.address,real:true});
    onDone({path:path,truncated:false});
    return;
  }
  var guard=0;
  function _step(){
    if(isCancelled&&isCancelled()){ onDone(null); return; } /* superseded or aborted; caller does nothing further */
    if(wpDist(cur,to)<=rangeW){
      path.push({px:to.px,py:to.py,pz:to.pz,name:to.name,address:to.address,real:true});
      onDone({path:path,truncated:truncated});
      return;
    }
    guard++;
    if(guard>ROUTE_MAX_HOPS){
      truncated=true;
      path.push({px:to.px,py:to.py,pz:to.pz,name:to.name,address:to.address,real:true});
      onDone({path:path,truncated:truncated});
      return;
    }
    var next=_routeHop(cur,to,rangeW,visited,driveGateRoute);
    if(!next){
      truncated=true;
      path.push({px:to.px,py:to.py,pz:to.pz,name:to.name,address:to.address,real:true});
      onDone({path:path,truncated:truncated});
      return;
    }
    path.push(next);
    if(next.address) visited[next.address]=true;
    cur=next;
    if(onHop) onHop(next,guard);
    setTimeout(_step,0);
  }
  setTimeout(_step,0);
}
/* Session 38: solid vs dashed vs red-dashed course line, matching the real
   game's own convention (confirmed via NMS community sources) -- solid =
   reachable in a single hyperdrive jump, dashed = needs multiple hops or a
   drive upgrade. Tony's map already gates Jump-to/Enter system and
   route-hop selection by canReachColor()/HYPER_DRIVES -- this wires that
   same reachability into how the plotted line actually LOOKS, which it
   never did before (every course used to render identically regardless). */
/* ---- thick "ribbon" course/preview lines --------------------------------
   Tony asked for a thicker line after seeing a mockup (picked 3px). Plain
   THREE.Line's linewidth is capped at 1px on most Windows/Chrome setups --
   a real WebGL/ANGLE driver restriction, not a Three.js setting -- so
   actual triangle geometry is the only reliable way to get real visible
   thickness. These build a camera-facing flat strip (2 triangles per
   segment) whose half-width is recomputed from the CURRENT camera distance
   every frame, so the line holds a constant on-screen pixel width
   (COURSE_LINE_PX) rather than a fixed world size that would look chunky
   up close and vanish from far away -- the same way a real HUD trace
   behaves regardless of zoom. */
var COURSE_LINE_PX=3;
function _ribbonRight(p0,p1,camPos){
  var dir=new THREE.Vector3(p1.x-p0.x,p1.y-p0.y,p1.z-p0.z).normalize();
  var mid=new THREE.Vector3((p0.x+p1.x)/2,(p0.y+p1.y)/2,(p0.z+p1.z)/2);
  var toCam=new THREE.Vector3().subVectors(camPos,mid).normalize();
  var right=new THREE.Vector3().crossVectors(dir,toCam);
  if(right.lengthSq()<1e-6){
    /* dir is (near-)parallel to the camera view, or a zero-length segment
       -- fall back to a world-up-based right vector so the ribbon never
       collapses to nothing instead of vanishing at that one angle. */
    right.crossVectors(dir,new THREE.Vector3(0,1,0));
    if(right.lengthSq()<1e-6) right.set(1,0,0);
  }
  return right.normalize();
}
function _pxHalfWidth(worldPos,camera,px){
  var dist=camera.position.distanceTo(worldPos);
  var vFov=camera.fov*Math.PI/180;
  var h=(renderer&&renderer.domElement&&renderer.domElement.clientHeight)||window.innerHeight||800;
  var worldPerPixel=2*Math.tan(vFov/2)*dist/h;
  return (px/2)*worldPerPixel;
}
function _polylineLerp(points,prefix,targetDist){
  for(var i=0;i<points.length-1;i++){
    if(targetDist>=prefix[i]&&targetDist<=prefix[i+1]){
      var segLen=prefix[i+1]-prefix[i];
      var t=segLen>1e-9?(targetDist-prefix[i])/segLen:0;
      var a=points[i], b=points[i+1];
      return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
    }
  }
  return points[points.length-1];
}
/* Chops an ordered polyline into only the "on" portions of a dash pattern,
   walking real cumulative arc length so dashing stays correct across
   multiple hops of very different lengths. solid=true returns the whole
   polyline as one continuous run (no gaps). Returns an array of
   {p0:{x,y,z},p1:{x,y,z}} segments, each becoming one ribbon quad. */
function _dashSegments(points,dashSize,gapSize,solid){
  var out=[],i;
  if(points.length<2) return out;
  if(solid){
    for(i=0;i<points.length-1;i++) out.push({p0:points[i],p1:points[i+1]});
    return out;
  }
  var prefix=[0];
  for(i=0;i<points.length-1;i++){
    var a=points[i], b=points[i+1];
    var d=Math.sqrt((b.x-a.x)*(b.x-a.x)+(b.y-a.y)*(b.y-a.y)+(b.z-a.z)*(b.z-a.z));
    prefix.push(prefix[prefix.length-1]+d);
  }
  var total=prefix[prefix.length-1], period=dashSize+gapSize, k=0;
  while(k*period<total){
    var s=k*period, e=Math.min(k*period+dashSize,total);
    if(e>s) out.push({p0:_polylineLerp(points,prefix,s),p1:_polylineLerp(points,prefix,e)});
    k++;
  }
  return out;
}
function _buildRibbonMesh(segments,color,opacity,px){
  var n=segments.length;
  var geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(Math.max(n,1)*18),3));
  var mat=new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:opacity,side:THREE.DoubleSide,depthWrite:false});
  var mesh=new THREE.Mesh(geo,mat);
  mesh.userData.segments=segments;
  mesh.userData.px=px;
  _updateRibbonGeometry(mesh);
  return mesh;
}
function _updateRibbonGeometry(mesh){
  var segments=mesh.userData.segments, px=mesh.userData.px;
  var pos=mesh.geometry.attributes.position, camPos=camera.position;
  for(var i=0;i<segments.length;i++){
    var p0=segments[i].p0, p1=segments[i].p1;
    var right=_ribbonRight(p0,p1,camPos);
    var midV=new THREE.Vector3((p0.x+p1.x)/2,(p0.y+p1.y)/2,(p0.z+p1.z)/2);
    var hw=_pxHalfWidth(midV,camera,px);
    var rx=right.x*hw, ry=right.y*hw, rz=right.z*hw, o=i*18;
    pos.array[o+0]=p0.x+rx; pos.array[o+1]=p0.y+ry; pos.array[o+2]=p0.z+rz;
    pos.array[o+3]=p0.x-rx; pos.array[o+4]=p0.y-ry; pos.array[o+5]=p0.z-rz;
    pos.array[o+6]=p1.x+rx; pos.array[o+7]=p1.y+ry; pos.array[o+8]=p1.z+rz;
    pos.array[o+9]=p1.x+rx; pos.array[o+10]=p1.y+ry; pos.array[o+11]=p1.z+rz;
    pos.array[o+12]=p0.x-rx; pos.array[o+13]=p0.y-ry; pos.array[o+14]=p0.z-rz;
    pos.array[o+15]=p1.x-rx; pos.array[o+16]=p1.y-ry; pos.array[o+17]=p1.z-rz;
  }
  pos.needsUpdate=true;
}
function courseLineStyle(){
  if(!courseTarget) return {solid:false,color:0xf0a500};
  if(!canReachColor(courseTarget.type)) return {solid:false,color:0xe24b4a};
  var hops=courseWaypoints?courseWaypoints.length-1:0;
  return {solid:(hops===1),color:0xf0a500};
}
function drawCourse(){
  clearCourseLine();
  if(!courseTarget||!focusSystem||!courseWaypoints||courseWaypoints.length<2) return;
  var i,pts=courseWaypoints.map(function(wp){ return {x:wp.px,y:wp.py,z:wp.pz}; });
  var lstyle=courseLineStyle();
  var segs=_dashSegments(pts,2.4,1.6,lstyle.solid);
  courseLine=_buildRibbonMesh(segs,lstyle.color,0.9,COURSE_LINE_PX);
  localGroup.add(courseLine);
  /* The route bends toward real systems along the way, but that bend can be
     subtle to the eye when the detour is small relative to the total distance
     -- confirmed live: a genuine 5-hop route looked almost like a straight line
     at a normal zoom level and only clearly read as bent once zoomed in. A dot
     at every intermediate stop makes each hop unmistakable regardless of zoom
     or how straight the route happens to look, without needing the full
     selection-ring treatment the two endpoints already get. Every intermediate
     stop is always a real charted system now (findRoute no longer invents an
     open-space point -- confirmed via the NMS wiki that a hyperdrive can only
     ever warp to a real system), so the dot count now always equals the
     reported jump count. */
  var mids=courseWaypoints.slice(1,-1);
  if(mids.length){
    var dp=new Float32Array(mids.length*3);
    for(i=0;i<mids.length;i++){ dp[i*3]=mids[i].px; dp[i*3+1]=mids[i].py; dp[i*3+2]=mids[i].pz; }
    var dg=new THREE.BufferGeometry();
    dg.setAttribute("position",new THREE.BufferAttribute(dp,3));
    /* depthTest:false + a high renderOrder so a waypoint never gets visually
       swallowed by a brighter/nearer real star sitting in front of it. */
    courseDots=new THREE.Points(dg,new THREE.PointsMaterial({
      color:lstyle.color,map:RING_SPRITE,size:1.3,transparent:true,
      depthWrite:false,depthTest:false,sizeAttenuation:true}));
    courseDots.renderOrder=999;
    localGroup.add(courseDots);
  }
}
/* Real bug fixed 2026-08-16 (Tony, zoomed into a hop marker and found empty
   space: "the stars are listed in the manifest so should hit them"). Every
   intermediate hop IS a real, fully-generated system -- findRoute() never
   invents an open-space stop, and the Warp Manifest already proves it by
   showing a real name/address for each one. The bug was that only the bare
   coordinates ever reached the map, via the decorative courseDots sprite
   above -- the actual star itself was never added to the real, clickable
   star field (allSystems / locPts / locInstMesh), so a hop marker sat over
   nothing you could actually click. This regenerates each intermediate hop
   as a full system -- same generateSystem() call and position formula
   every other star on the map already uses -- and merges it into
   allSystems so it becomes a real star: visible, filterable, and clickable
   exactly like any other. Start and destination don't need this -- they're
   always already real, already-rendered systems, which is how you picked
   them in the first place. */
function mergeWaypointsIntoSlice(){
  if(!courseWaypoints) return;
  for(var i=0;i<courseWaypoints.length;i++){
    var wp=courseWaypoints[i];
    /* Real bug found 2026-08-27 (Tony: clicking a manifest row crashed the
       whole render loop -- "ERROR: render loop stopped: Cannot read
       properties of undefined (reading 'toString')"). The old guard here
       (`wp.vx===undefined||wp.idx===undefined`) assumed a START/DESTINATION
       waypoint was "already real & rendered" and skipped it untouched -- but
       findRoute()/findRouteAsync() actually build START/DESTINATION as bare
       {px,py,pz,name,address,real:true} placeholder copies, never a
       reference to the real focusSystem/courseTarget object, so they were
       never a real generated system at all and had no `coreLY` (among other
       fields) -- the very first thing updateTelemetry() reads off whatever
       object is `selected` on every single animate() frame once you click
       one, which is what actually threw and killed the loop. A mid-route
       HOP waypoint has real vx/vy/vz/idx and got upgraded correctly below;
       START/DESTINATION never did. The guard is now keyed off `coreLY`
       (only ever present on a genuine generateSystem() output, whether a
       hop or an already-real anchor) instead of vx/idx, so anything still
       lightweight -- hop OR start/end -- gets resolved below rather than
       silently left broken. */
    if(wp.coreLY!==undefined) continue;
    var existing=null;
    for(var j=0;j<allSystems.length;j++) if(allSystems[j].address===wp.address){ existing=allSystems[j]; break; }
    if(!existing && focusSystem && wp.address===focusSystem.address) existing=focusSystem;
    if(!existing && courseTarget && wp.address===courseTarget.address) existing=courseTarget;
    if(existing){
      /* 2026-08-26, Tony: manifest showed a fake placeholder name ("Uxra-II")
         while clicking that same hop opened a totally different real name
         ("Doganonj") for what was actually the same star. Root cause:
         regionCandidates() (used by the route search itself, above) names
         every candidate with the cheap nameFrom() placeholder -- it can't
         afford the real NMSCore.systemName() lookup for up to 1000
         candidates per region on every single hop -- while generateSystem()
         (used everywhere else: the map, the info panel, clicking a hop)
         always computes the real, accurate name. The address was always
         correct and always pointed at the same real star; only the NAME
         baked into courseWaypoints at plot time was ever wrong. Swapping in
         the authoritative object here (generated below for any hop not yet
         in allSystems, or already sitting there for one that is) means the
         manifest list and a clicked hop's info panel are now guaranteed to
         agree, since both read the exact same object. Extended 2026-08-27
         to also check focusSystem/courseTarget directly, not just
         allSystems, so a real START/DESTINATION resolves to the exact live
         object already in use elsewhere instead of a fresh regeneration. */
      courseWaypoints[i]=existing;
      continue;
    }
    /* No live object found -- either a genuine mid-route hop (has vx/idx
       already) or a START/DESTINATION placeholder (has only an address,
       decode it the same way jumpTo()/Search already do -- parseAddress()
       is the exact inverse of formatAddress()). Either way this always
       ends up a real generateSystem() output with coreLY set, so it can
       never reach updateTelemetry() half-formed again. */
    var pa=(wp.vx===undefined||wp.idx===undefined)?(wp.address?parseAddress(wp.address):null):null;
    var gvx=pa?pa.x:wp.vx, gvy=pa?pa.y:wp.vy, gvz=pa?pa.z:wp.vz, gidx=pa?pa.idx:wp.idx;
    if(gvx===undefined||gidx===undefined) continue; /* no address/coords to resolve from at all -- leave the placeholder rather than throw */
    var full=generateSystem(gvx,gvy,gvz,gidx);
    full.px=wp.px; full.py=wp.py; full.pz=wp.pz;
    allSystems.push(full);
    courseWaypoints[i]=full;
  }
}
/* Investigated 2026-08-16 (Tony: "why not go 1 jump back... research how
   it's done in game"): tried feeding the existing A* worker above a denser
   graph -- sampled from regionCandidates() along the direct corridor
   between start and target, instead of the sparse currently-rendered
   slice it was getting before (which is why A* was silently failing and
   falling back to findRoute() on nearly every real course; a graph that
   sparse is almost never even connected over a few hundred LY). The idea
   was sound -- A* can look ahead/backtrack in a way a greedy hop-by-hop
   search structurally can't -- but tested head-to-head via a Node harness
   against the real nms-core module: a one-shot corridor sample wide enough
   to matter took 1.5-2.5s to build BEFORE A* even ran, and still landed
   WORSE on average (~1.3x the naive distance/range minimum, worst 1.5x)
   than the findRoute() fix already shipped below (~1.1x average, worst
   1.3x, verified via the same harness). Root cause: findRoute()'s own
   search re-centres and can expand its candidate search up to 3 regions
   around EACH hop's own ideal point individually, which turns out to
   concentrate search effort far more effectively than spreading a single
   upfront budget across the whole corridor -- so the already-shipped fix
   is genuinely the better one here, not just the simpler one. Not
   pursuing this further. Separately: there's no real in-game precedent to
   match -- No Man's Sky itself has no multi-hop route planner; players
   jump one star at a time and just see which stars are in range each
   time, so there's no canonical "how the real game shows this" to copy. */
function setCourse(s,silent){
  if(!focusSystem){ toast("Jump somewhere first"); return; }
  if(s.address===focusSystem.address){ toast("That is where you are — pick another star"); return; }
  maybeShowHyperNotice();
  courseTarget=s;
  var dvx=s.vx-focusSystem.vx, dvy=s.vy-focusSystem.vy, dvz=s.vz-focusSystem.vz;
  var ly=Math.round(Math.sqrt(dvx*dvx+dvy*dvy+dvz*dvz)*LY_PER_VOXEL);
  if(ly===0){
    var dx=s.px-focusSystem.px, dy=s.py-focusSystem.py, dz=s.pz-focusSystem.pz;
    ly=Math.round(Math.sqrt(dx*dx+dy*dy+dz*dz)/VOX_U*LY_PER_VOXEL);
  }
  var range=parseInt(document.getElementById("fHyper").value,10);
  /* terminate any previous worker before starting a fresh one */
  if(_routeWorker){ _routeWorker.terminate(); _routeWorker=null; }
  /* 2026-08-25: bump the generation so any still-in-flight A* result or
     chunked findRouteAsync fallback from a PREVIOUS call (see _routeGen's
     own comment) knows it's stale the moment its next checkpoint runs,
     instead of possibly finishing after this new one and overwriting it. */
  _routeGen++; var _myGen=_routeGen;
  /* Real bug fixed 2026-08-18 (Tony: "click again seems long as if in a
     loop... click abort and choose another star its as quick as the first
     time"): #route-loader is a full-viewport position:fixed overlay with
     no pointer-events:none, z-index 99999 -- while it's showing, EVERY
     click (including on a different star) lands on the overlay itself,
     not the canvas underneath, so nothing the user does short of hitting
     the overlay's own Abort button gets through. That was fine when Set
     course was a rare, deliberate button press, but since clicking ANY
     star now calls setCourse() (see tryPick's Local branch), a route that
     takes a moment to compute -- like a long/sparse trip needing many hops
     -- now blocks the whole map from picking a different, faster-to-route
     star for however long it takes, reading exactly like a hang. silent
     (passed true only from that passive click-to-replot path, not the
     explicit "Set course" button) skips the blocking overlay entirely --
     the worker still runs and updatePanel() already gave the user instant
     feedback that their click registered, so a quiet background compute
     is enough; picking yet another star mid-compute still works instantly
     since the existing worker-termination logic above already handles it,
     now that nothing is blocking the click from reaching the canvas. */
  var _s=s,_ly=ly,_range=range,_dvx=dvx,_dvy=dvy,_dvz=dvz;
  /* world-unit jump range for A* */
  var _rangeW=_range/VOX_LY;
  /* star database for A*: map current slice to {address,x,y,z}. Real bug
     fixed 2026-08-16: this never filtered by the selected hyperdrive's
     reachable colours at all, so on the rare occasion A* did find a
     connected path in the rendered slice, it could have routed straight
     through a colour the current drive can't actually reach -- findRoute()
     below always applied that gate, this never did. Cheap, safe fix
     (allSystems is already computed, this is just a filter over it) --
     left the denser corridor-sampling idea out after testing showed it
     performed worse than the already-shipped findRoute() fix, see the
     comment above setCourse(). */
  var _db=allSystems.filter(function(sys){ return canReachColor(sys.type); }).map(function(sys){
    return {address:sys.address,x:sys.px,y:sys.py,z:sys.pz};
  });
  /* ensure target is in the database (may be outside current slice) */
  if(!_db.some(function(o){return o.address===_s.address;}))
    _db.push({address:_s.address,x:_s.px,y:_s.py,z:_s.pz});
  var _startObj={address:focusSystem.address,x:focusSystem.px,y:focusSystem.py,z:focusSystem.pz};
  var _endObj={address:_s.address,x:_s.px,y:_s.py,z:_s.pz};
  /* address→system lookup for mapping A* results back to full objects */
  var _amap={};
  for(var _ai=0;_ai<allSystems.length;_ai++) _amap[allSystems[_ai].address]=allSystems[_ai];
  /* 2026-08-25: the old synchronous findRoute() fallback (below A* failing)
     is now chunked via findRouteAsync() -- see its own comment -- so a long
     fallback route neither freezes the tab nor leaves Abort powerless.
     Shared by both places findRoute() used to be called inline: A* coming
     back null (target beyond the local slice) and the worker erroring out. */
  function _runRouteFallback(){
    /* 2026-08-25, round 4 (Tony: "why can it not display each system name
       as it fetches it then the next then the next... so at least shows
       something is happening instead of waiting for it all"): genuinely
       true for THIS path specifically, unlike the fast A* worker above.
       findRouteAsync computes hops one at a time, in real final order, no
       backtracking -- by the time onHop fires for a given star, that star
       IS a real, permanent part of the route (never undone later), so
       showing it live, the moment it's found, is 100% honest here. Restored
       the live per-hop line (_routeLoaderHop, already throttled to ~400ms
       so fast stretches don't blur past readable -- see its own comment)
       instead of waiting for the whole route and revealing it after; no
       need for the post-plot _revealRouteHops reveal afterward either,
       since every hop was already shown for real as it happened. */
    findRouteAsync(focusSystem,_s,_range,true,
      function(){},
      function(rt){
        if(!rt) return; /* superseded by a newer setCourse() call, or aborted -- nothing more to do */
        courseWaypoints=rt.path; courseTruncated=rt.truncated;
        _finishSetCourse(_s,_ly,_range,_dvx,_dvy,_dvz);
      },
      function(){ return _myGen!==_routeGen; });
  }
  function _applyRoute(apath){
    if(_myGen!==_routeGen) return; /* a newer setCourse() call has already superseded this one */
    if(apath&&apath.length>=2){
      /* map lightweight A* result back to full system objects */
      courseWaypoints=apath.map(function(wp){
        return _amap[wp.address]||{address:wp.address,px:wp.x,py:wp.y,pz:wp.z,
          name:'—',type:'',coreLY:0,vx:0,vy:0,vz:0};
      });
      /* pin start/end to authoritative system objects */
      courseWaypoints[0]=focusSystem;
      courseWaypoints[courseWaypoints.length-1]=_s;
      courseTruncated=false;
      _finishSetCourse(_s,_ly,_range,_dvx,_dvy,_dvz);
    } else {
      /* A* returned null (target beyond local slice) — fall back to findRouteAsync() */
      _runRouteFallback();
    }
  }
  _routeWorker=new Worker(_ASTAR_WORKER_URL);
  _routeWorker.onmessage=function(e){ _routeWorker=null; _applyRoute(e.data); };
  _routeWorker.onerror=function(){
    _routeWorker=null;
    if(_myGen!==_routeGen) return; /* a newer setCourse() call has already superseded this one */
    _runRouteFallback();
  };
  _routeWorker.postMessage({s:_startObj,e:_endObj,db:_db,mr:_rangeW});
}
/* Real bug fixed 2026-08-16 (Tony's own two screenshots): #course's default
   CSS position -- centred under the toolbar -- collides with whatever else
   is open, e.g. it can cover a chunk of the local star field or sit under
   the info panel. Same measure-don't-guess fix used everywhere else in
   this file (positionUnderButton, --top-h): check what's actually on
   screen and anchor beside it instead of guessing a fixed spot. Only runs
   once per session/resize -- a real drag (or this auto-anchor itself)
   leaves a real inline left/top that resetDraggedBoxes() clears on the
   next window resize, same signal makeDraggable's other boxes already use
   to know a fresh anchor is actually needed rather than clobbering
   somewhere Tony deliberately dragged it to.
   (2026-08-16, continued: the sliding system-info-drawer this originally
   also accounted for was scrapped same-session -- its fields moved into
   this panel itself, see the Matrix vector points block in the Portal
   sequence box -- so the drawer branch here was removed too.) */
function positionCourseCard(){
  var course=document.getElementById("course");
  if(course.style.left) return; /* already dragged, or already auto-anchored this session */
  var panel=document.getElementById("panel");
  var cw=course.offsetWidth||246;
  var topY=parseFloat(getComputedStyle(course).top)||70;
  var left;
  if(panel&&panel.classList.contains("show")){
    left=panel.getBoundingClientRect().left-cw-16;
  } else {
    return; /* nothing else open to avoid -- the default centred CSS position is fine */
  }
  left=Math.max(8,Math.min(window.innerWidth-cw-8,left));
  course.style.position="fixed";
  course.style.left=left+"px";
  course.style.top=topY+"px";
  course.style.right="auto";
  course.style.transform="none";
}
function _finishSetCourse(_s,_ly,_range,_dvx,_dvy,_dvz){
  var hops=courseWaypoints.length-1;
  /* 2026-08-30, honest-review fix: the real route distance -- the sum of
     each hop's own jump length, exactly the way PLAN JOURNEY's handoff to
     the Navigator computes it -- so the Warp Manifest and the Navigator
     always agree on "how far is this route" instead of the manifest
     showing a straight-line beeline number instead. _ly (the beeline
     distance) is kept for its own purpose just below: the "more hops than
     X÷Y suggests" note specifically needs the naive beeline/range math to
     explain itself, and the "course" card's own Distance line is
     deliberately the beeline reading (see its own comment). */
  courseRouteLY=0;
  for(var _ci=1;_ci<courseWaypoints.length;_ci++) courseRouteLY+=Math.round(wpDist(courseWaypoints[_ci-1],courseWaypoints[_ci])*VOX_LY);
  document.getElementById("cTarget").textContent=_s.name;
  /* Beeline distance -- deliberately NOT courseRouteLY. This line answers
     "how far as the crow flies," which is what the jumps-vs-range sanity
     note right below needs; the actual jump-by-jump route length is the
     Warp Manifest's job (see displayCalculatedItinerary() below). */
  document.getElementById("cDist").textContent=commas(_ly)+" LY";
  document.getElementById("cJumps").textContent=(courseTruncated?(hops+"+"):hops)+" @ "+commas(_range)+" LY"+(courseTruncated?" (simplified)":"");
  /* Real question from Tony (2026-08-18): 800 LY at 101 LY range "should
     be max 7-8 jumps" but reported 12 -- not a bug, the About modal already
     explains why (every hop must land on a real charted star, so routes
     drift short of max range whenever nothing sits right on the ideal
     bearing -- confirmed this really does happen in the live game too:
     NMS's OWN displayed hyperdrive range has long been reported as
     overstating the actual effective linear jump distance, a leftover
     from a past galaxy-distance rescale -- so needing well above the
     naive beeline-distance/range number is expected, not a glitch). The
     gap is that explanation only ever lived in About, easy to miss. Only
     surface this note when the route is genuinely inflated (>=35% over
     the theoretical minimum) so a normal, close-to-ideal route doesn't
     get cluttered with a caption nobody needs to read. */
  var cJumpsNote=document.getElementById("cJumpsNote");
  var naiveJumps=_range>0?Math.max(1,Math.ceil(_ly/_range)):1;
  if(!courseTruncated&&hops>naiveJumps*1.35&&hops>naiveJumps){
    cJumpsNote.textContent="More hops than "+commas(_ly)+"÷"+commas(_range)+" suggests -- real stars rarely sit right on the bearing, so routes drift short of max range to reach one (see About).";
    cJumpsNote.style.display="block";
  } else {
    cJumpsNote.style.display="none";
  }
  document.getElementById("cBear").textContent=(_ly===0)?"—":bearingOf(_dvx,_dvz,_dvy);
  document.getElementById("cCore").textContent=commas(_s.coreLY)+" LY";
  document.getElementById("course").classList.add("show");
  document.getElementById("course").classList.remove("min");
  document.getElementById("bCourseMin").innerHTML="&#9662;";
  positionCourseCard();
  /* merge each hop into the real star field first, then applyFilter() --
     not just drawCourse() -- so shown/locPts/locInstMesh actually rebuild
     to include them (applyFilter() calls drawCourse() itself at the end). */
  mergeWaypointsIntoSlice();
  applyFilter();
  buildGalaxyMarks();
  displayCalculatedItinerary(courseWaypoints,courseRouteLY);
  if(_openManifestOnPlot){
    _openManifestOnPlot=false;
    var _mCard=document.getElementById("route-itinerary-card");
    if(_mCard&&!_mCard.classList.contains("show")) document.getElementById("bToggleManifest").click();
  }
}

/* ============ saved / shareable routes ============
   2026-08-30, Tony: "I'd want a way to save a route for later instead of
   just planning it in one sitting, since expeditions rarely happen in one
   browser tab." Two related but separate needs, both built here: a personal
   "My Routes" list (save/reload/rename/delete, local to this device, rides
   along in Export/Import for free -- see store.routes above), and a
   shareable ?route=... link that works without ever touching this device's
   storage at all (paste it on a phone, send it to someone else). Both save
   and reload the exact SAME waypoints the map already plotted -- nothing is
   ever recomputed differently on load than it was when the course was first
   found, since that's exactly the kind of "two numbers that should agree
   don't" bug this whole session has been about fixing, not repeating in a
   new feature. */

/* A courseWaypoints entry is a full generateSystem() object (has coreLY,
   possibly a whole planet/moon list) -- overkill to store per hop, and
   mergeWaypointsIntoSlice() (already used everywhere a plotted course is
   drawn) already knows how to turn exactly this lightweight shape back into
   a full real one from just its address, the same way findRoute()'s own
   raw hop/placeholder output looks before that upgrade happens. So this is
   the natural, already-supported "unresolved" shape to persist, not a new
   invented one. */
function snapshotWaypoint(wp){
  return {name:wp.name||"",address:wp.address||"",px:wp.px,py:wp.py,pz:wp.pz};
}
/* Builds a route record from whatever's plotted right now -- shared by
   Save Route, Copy Link, and every row's own Link button, so there is only
   ever one place that decides what a "route" actually contains. */
function buildRouteRecord(name){
  if(!focusSystem||!courseTarget||!courseWaypoints||courseWaypoints.length<2) return null;
  var dvx=courseTarget.vx-focusSystem.vx, dvy=courseTarget.vy-focusSystem.vy, dvz=courseTarget.vz-focusSystem.vz;
  var directLY=Math.round(Math.sqrt(dvx*dvx+dvy*dvy+dvz*dvz)*LY_PER_VOXEL);
  if(directLY===0){
    var dx=courseTarget.px-focusSystem.px, dy=courseTarget.py-focusSystem.py, dz=courseTarget.pz-focusSystem.pz;
    directLY=Math.round(Math.sqrt(dx*dx+dy*dy+dz*dz)/VOX_U*LY_PER_VOXEL);
  }
  return {
    id:"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,8),
    name:name||(focusSystem.name+" → "+courseTarget.name),
    savedAt:Date.now(),
    galaxy:GALAXY,
    fromAddress:focusSystem.address, fromName:focusSystem.name,
    toAddress:courseTarget.address, toName:courseTarget.name,
    jumps:courseWaypoints.length-1,
    routeLY:courseRouteLY,
    directLY:directLY,
    driveKey:currentDrive().k,
    rangeLY:parseInt(document.getElementById("fHyper").value,10)||null,
    waypoints:courseWaypoints.map(snapshotWaypoint)
  };
}
function saveCurrentRoute(){
  if(!focusSystem||!courseTarget||!courseWaypoints||courseWaypoints.length<2){
    toast("Plot a course first"); return;
  }
  var suggested=focusSystem.name+" → "+courseTarget.name;
  var name=prompt("Name this route:",suggested);
  if(name===null) return; /* cancelled */
  name=name.trim()||suggested;
  var rec=buildRouteRecord(name);
  store.routes=store.routes||[];
  store.routes.unshift(rec);
  saveStore();
  renderRoutesList();
  toast("Route saved: “"+name+"”");
}
function copyRouteLink(route){
  var rec=route||buildRouteRecord();
  if(!rec){ toast("Plot a course first"); return; }
  var link=location.origin+location.pathname+"?route="+encodeRoutePayload(rec);
  if(navigator.clipboard&&navigator.clipboard.writeText)
    navigator.clipboard.writeText(link).then(function(){ toast("Route link copied"); },function(){ toast(link); });
  else toast(link);
}
function encodeRoutePayload(rec){
  return encodeURIComponent(JSON.stringify({
    v:1,n:rec.name,g:rec.galaxy,fa:rec.fromAddress,fn:rec.fromName,
    ta:rec.toAddress,tn:rec.toName,w:rec.waypoints,dk:rec.driveKey||null,rl:rec.rangeLY||null
  }));
}
/* The inverse of encodeRoutePayload() -- deliberately tolerant of a whole
   pasted URL (not just the raw param value), see bLoadRouteLink below. */
function decodeRoutePayload(raw){
  try{
    var s=String(raw);
    var m=s.match(/[?&]route=([^&]+)/);
    if(m) s=m[1];
    var o=JSON.parse(decodeURIComponent(s));
    if(!o||!Array.isArray(o.w)||o.w.length<2||!o.fa) return null;
    return {
      id:"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,8),
      name:o.n||"Shared route",
      savedAt:Date.now(),
      galaxy:(typeof o.g==="number"&&o.g>=0&&o.g<GALAXIES.length)?o.g:0,
      fromAddress:o.fa, fromName:o.fn||"", toAddress:o.ta||"", toName:o.tn||"",
      jumps:o.w.length-1, routeLY:null, directLY:null,
      driveKey:o.dk||null, rangeLY:o.rl||null,
      waypoints:o.w
    };
  }catch(e){ return null; }
}
/* Loads a saved/shared route back onto the live map -- jumps to its real
   origin (exactly like typing the address in yourself), restores the exact
   saved waypoints, then reuses _finishSetCourse() (the same function a live
   plot ends on) to draw the line, populate the manifest and open it. Never
   re-runs pathfinding -- the whole point is that this reproduces the exact
   route that was saved, not a fresh search that might disagree with it. */
function loadSavedRoute(route){
  if(!route||!route.waypoints||route.waypoints.length<2){ toast("This route looks corrupted"); return; }
  if(typeof route.galaxy==="number"&&route.galaxy!==GALAXY&&route.galaxy>=0&&route.galaxy<GALAXIES.length){
    switchGalaxy(route.galaxy);
    document.getElementById("galSel").value=String(route.galaxy);
    syncGalaxyPickInput();
  }
  if(!jumpTo(route.fromAddress)){ toast("Could not jump to this route's start -- the address looks invalid"); return; }
  courseWaypoints=route.waypoints.map(function(w){ return {name:w.name,address:w.address,px:w.px,py:w.py,pz:w.pz}; });
  mergeWaypointsIntoSlice(); /* upgrades every hop, start/dest included, to real generateSystem() objects */
  courseTarget=courseWaypoints[courseWaypoints.length-1];
  if(route.driveKey) applyDrivePill(route.driveKey);
  if(route.rangeLY) applyRangePill(route.rangeLY);
  var dvx=courseTarget.vx-focusSystem.vx, dvy=courseTarget.vy-focusSystem.vy, dvz=courseTarget.vz-focusSystem.vz;
  var ly=Math.round(Math.sqrt(dvx*dvx+dvy*dvy+dvz*dvz)*LY_PER_VOXEL);
  if(ly===0){
    var dx=courseTarget.px-focusSystem.px, dy=courseTarget.py-focusSystem.py, dz=courseTarget.pz-focusSystem.pz;
    ly=Math.round(Math.sqrt(dx*dx+dy*dy+dz*dz)/VOX_U*LY_PER_VOXEL);
  }
  var range=parseInt(document.getElementById("fHyper").value,10)||101;
  _openManifestOnPlot=true;
  _finishSetCourse(courseTarget,ly,range,dvx,dvy,dvz);
  toast("Loaded route: “"+(route.name||(route.fromName+" → "+route.toName))+"”");
}
/* A route received via a link (pasted, or opened directly via ?route=...)
   is both loaded AND kept in My Routes -- same reasoning as jumpTo() always
   saving last-position: if you went to the trouble of opening someone's
   route, you'll probably want it to still be there next time too, not just
   for this one visit. */
function receiveSharedRoute(shared){
  if(!shared) return;
  loadSavedRoute(shared);
  store.routes=store.routes||[];
  store.routes.unshift(Object.assign({},shared,{
    id:"r"+Date.now().toString(36)+Math.random().toString(36).slice(2,8),
    savedAt:Date.now()
  }));
  saveStore();
  renderRoutesList();
}
/* Small helpers so loadSavedRoute() can restore the drive/range that was
   active when a route was saved, using the exact same pill-click state sync
   (on class, the hidden select, updateHyperSummary()) the real pill click
   handlers below already do -- one shared way to change these, whether a
   person clicks a pill or a saved route restores one. */
function applyDrivePill(driveKey){
  var b=document.querySelector('#hyperDriveRow .pill[data-drive="'+driveKey+'"]');
  if(!b) return;
  document.querySelectorAll("#hyperDriveRow .pill").forEach(function(p){ p.classList.remove("on"); });
  b.classList.add("on");
  document.getElementById("fHyperDrive").value=driveKey;
  document.getElementById("fHyperDrive").dispatchEvent(new Event("change"));
  updateHyperSummary();
}
function applyRangePill(range){
  var b=document.querySelector('#hyperRangeRow .pill[data-range="'+range+'"]');
  document.querySelectorAll("#hyperRangeRow .pill").forEach(function(p){ p.classList.remove("on"); });
  document.getElementById("fHyper").value=String(range);
  if(b) b.classList.add("on");
  document.getElementById("fHyper").dispatchEvent(new Event("change"));
  updateHyperSummary();
}
function renderRoutesList(){
  var box=document.getElementById("routesResults");
  if(!box) return;
  var routes=(store.routes||[]).slice().sort(function(a,b){ return (b.savedAt||0)-(a.savedAt||0); });
  if(!routes.length){
    box.innerHTML='<div class="searchEmpty">No saved routes yet -- plot a course and hit Save Route on it, or paste a route link above.</div>';
    return;
  }
  var html="";
  routes.forEach(function(r){
    html+='<div class="searchRes routeRes" data-id="'+escAttr(r.id)+'">'+
      '<div class="searchResName">'+escAttr(r.name)+'</div>'+
      '<div class="searchResMeta">'+(r.jumps!=null?r.jumps:"?")+" jumps"+
        (r.routeLY!=null?" &middot; "+commas(r.routeLY)+" LY":"")+
        " &middot; "+(GALAXIES[r.galaxy]||("Galaxy #"+(r.galaxy+1)))+'</div>'+
      '<div class="routeRowActions">'+
        '<button type="button" class="routeActBtn" data-act="load">Load</button>'+
        '<button type="button" class="routeActBtn" data-act="link" title="Copy a shareable link for this route">Link</button>'+
        '<button type="button" class="routeActBtn" data-act="rename">Rename</button>'+
        '<button type="button" class="routeActBtn danger" data-act="delete" title="Delete this saved route">&#10005;</button>'+
      '</div></div>';
  });
  box.innerHTML=html;
}
/* Favourites (2026-09-13, Tony's own ask for a dedicated tab rather than
   folding bookmarks into Search's empty-query browse mode) -- store.marks
   IS already the favourites data (same thing the Bookmark button on a
   system's info panel writes), this just gives it its own always-reachable
   list instead of being interleaved with waypoints/visited/documented.
   Decodes each saved "galaxy:address" key back into a real system via
   generateSystem() to get its current name, same technique buildSearchIndex()
   above already uses for the exact same store.marks/waypoints/visited keys. */
function buildFavouritesIndex(){
  var keys=Object.keys(store.marks), idx=[];
  for(var k=0;k<keys.length;k++){
    var parts=keys[k].split(":");
    if(parts.length<2) continue;
    var g=parseInt(parts[0],10);
    if(isNaN(g)) continue;
    var addr=parts[1];
    var a=parseAddress(addr);
    if(!a) continue;
    var sys;
    if(g===GALAXY){
      sys=generateSystem(a.x,a.y,a.z,a.idx);
    } else {
      var prevGal=GALAXY;
      GALAXY=g;
      sys=generateSystem(a.x,a.y,a.z,a.idx);
      GALAXY=prevGal;
    }
    idx.push({name:sys.name,address:addr,galaxy:g,key:keys[k]});
  }
  idx.sort(function(a,b){ return a.name.localeCompare(b.name); });
  return idx;
}
function renderFavouritesList(){
  var box=document.getElementById("favResults");
  if(!box) return;
  var favs=buildFavouritesIndex();
  if(!favs.length){
    box.innerHTML='<div class="searchEmpty">Nothing favourited yet -- open a system\'s info panel and tap Bookmark to add it here.</div>';
    return;
  }
  var html="";
  favs.forEach(function(f){
    var glyphHtml="",gi;
    for(gi=0;gi<f.address.length;gi++) glyphHtml+='<img alt="'+f.address[gi]+'" src="'+glyphSrc(f.address[gi])+'" style="height:10px;width:10px;vertical-align:-1px;margin-right:1px">';
    html+='<div class="searchRes favRes" data-addr="'+f.address+'" data-galaxy="'+f.galaxy+'" data-key="'+escAttr(f.key)+'">'+
      '<div class="searchResName">'+f.name+'</div>'+
      '<div class="searchResMeta">'+glyphHtml+' '+f.address+' &middot; '+(GALAXIES[f.galaxy]||("Galaxy #"+(f.galaxy+1)))+'</div>'+
      '<div class="routeRowActions"><button type="button" class="routeActBtn danger" data-act="unfav">Remove</button></div>'+
    '</div>';
  });
  box.innerHTML=html;
}
document.getElementById("favResults").addEventListener("click",function(e){
  var unfavBtn=e.target.closest?e.target.closest('.routeActBtn[data-act="unfav"]'):null;
  if(unfavBtn){
    var row=unfavBtn.closest(".favRes");
    var key=row&&row.getAttribute("data-key");
    if(key){ delete store.marks[key]; saveStore(); applyFilter(); buildGalaxyMarks(); renderFavouritesList(); toast("Removed from Favourites"); }
    return;
  }
  var row2=e.target.closest?e.target.closest(".favRes"):null;
  if(!row2) return;
  var addr=row2.getAttribute("data-addr");
  var galAttr=row2.getAttribute("data-galaxy");
  var gal=galAttr!==null?parseInt(galAttr,10):GALAXY;
  if(!isNaN(gal)&&gal!==GALAXY){
    switchGalaxy(gal);
    document.getElementById("galSel").value=String(gal);
    syncGalaxyPickInput();
    toast("Switched to "+GALAXIES[gal]+" -- that's where this favourite is",3200);
  }
  document.getElementById("inAddr").value=addr;
  setKeypad(addr);
  if(jumpTo(addr)) playWarpTransition("portal");
  if(typeof closeFavPop==="function") closeFavPop();
});

/* ============ system view ============ */
var bodyMeshes=[], pivots=[], starMeshes=[], coronas=[], featureMeshes=[], resourceMeshes=[];
function buildStar(s,i,pos){
  var col=s.starColors[i%s.starColors.length];
  var rad=1.6;
  /* Each additional star in a multi-star system additively blends its own
     corona/glow on top of the first (2026-09-13, Tony: "if more than 1 star
     would defiantly over powering") -- a binary would otherwise stack two
     full-brightness coronas right next to each other and read far brighter
     than either star alone. Companion stars (i>0) get a dimmed glow so the
     total bloom stays in the same ballpark as a single star; the core disc
     itself is left at full brightness since that's the actual star, not the
     bloom around it. */
  var glowMul=i===0?1:0.6;
  var grp=new THREE.Group();
  grp.position.copy(pos);
  var core=new THREE.Mesh(new THREE.SphereGeometry(rad,30,22),
    new THREE.MeshBasicMaterial({color:0xffffff}));
  core.userData={star:true,name:s.name+(s.stars>1?(" "+String.fromCharCode(65+i)):""),sys:s};
  grp.add(core); starMeshes.push(core);
  var tint=new THREE.Mesh(new THREE.SphereGeometry(rad*1.04,28,20),
    new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.72,
      blending:THREE.AdditiveBlending,depthWrite:false}));
  grp.add(tint);
  /* Corona/glow scaled down (2026-09-13, Tony live-site feedback: "star
     seams a bit big taking over the system") -- rad*11 for the billboard
     plane and rad*2.3 for the outer glow shell were tuned only by eye
     against a single mockup frame, and on a real (often smaller) system
     the additive-blended bloom reads as far bigger than its literal
     texture bounds, visually dominating the whole flattened disc. Trimmed
     the plane and both glow shells; sh1/rad itself untouched (that's the
     star's actual visible disc size, not the bloom around it). */
  var sh1=new THREE.Mesh(new THREE.SphereGeometry(rad*1.35,24,18),
    new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.22*glowMul,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide}));
  var sh2=new THREE.Mesh(new THREE.SphereGeometry(rad*1.7,20,16),
    new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.10*glowMul,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide}));
  grp.add(sh1); grp.add(sh2);
  var cor=new THREE.Mesh(new THREE.PlaneGeometry(rad*7,rad*7),
    new THREE.MeshBasicMaterial({map:CORONA,color:col,transparent:true,
      opacity:0.95*glowMul,blending:THREE.AdditiveBlending,depthWrite:false,
      side:THREE.DoubleSide}));
  grp.add(cor); coronas.push(cor);
  return grp;
}
function buildFeature(s,kind,pos){
  var tex=kind==="bh"?BH_TEX:ATLAS_TEX;
  var aspect=kind==="bh"?(512/346):(443/512);
  var h=kind==="bh"?5.2:6.4, w=h*aspect;
  var mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});
  var spr=new THREE.Sprite(mat);
  spr.scale.set(w,h,1);
  spr.position.copy(pos);
  spr.userData={feature:true,name:kind==="bh"?"Black hole":"Atlas station",sys:s};
  featureMeshes.push(spr);
  return spr;
}
/* Draws a rounded-rectangle PATH (caller fills/strokes/clips it) on a 2D
   canvas context -- small local helper, no library, used only by
   buildStationCard() below. */
function _roundRectPath(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
/* Station photo "framed card" billboard (2026-09-09, Tony: "user being able
   to upload a picture of their space station and a icon is created like
   atlas station is to put in their system"). Deliberately built quite
   differently from buildFeature() above: black hole/Atlas both reuse ONE
   static, hand-cut, pre-baked transparent PNG shared by every system on
   the whole map (BH_TEX/ATLAS_TEX, chroma-keyed clean back in Session 23)
   -- but a station photo is per-system, arrives as an arbitrary
   rectangular player screenshot with no clean edge this sandbox could ever
   key out automatically, and its URL isn't even known until the system's
   own data has loaded. So instead of a pre-cut texture, this composites a
   single THREE.CanvasTexture per system: draws a dark-navy, cyan-bordered
   "card" (matching this site's own theme, and the Galactic Navigator's
   Journey Snapshot polaroid card look Tony's already seen) onto an
   offscreen <canvas> immediately, then -- once the photo has actually
   loaded over the network -- draws it cover-fit inside the card's inset
   area and marks the texture dirty. Kept as ONE sprite/texture throughout
   (a placeholder card shows right away, the same sprite's texture is
   redrawn in place once the photo is ready) rather than two stacked
   planes, specifically to avoid any depth-sort/z-fighting risk between a
   background card and a foreground photo sharing the same billboard
   plane. Per Tony's own "can we do both 1 and 3" answer, this is the 3D
   half of the display -- pubStationPhotoWrap (see updatePanel()) is the
   info-panel half, shown independently and reusing the exact same photo.
   Only built for a system that actually has a photo (s.hasStation &&
   s.stationPhoto) -- a station flagged with no photo yet still gets its
   info-panel tag pill (see updatePanel()'s tags array), just no 3D card
   until a real photo exists to show, so a bare flag doesn't render an
   empty/misleading frame in the scene. Clicking the card in 3D opens the
   system's info panel, exactly like clicking the black hole/Atlas
   billboards already does (see tryPick()'s featureMeshes branch) -- the
   photo itself can then be enlarged from there via the same click-to-
   zoom lightbox every other screenshot in this app already uses, rather
   than adding a second, different click behaviour just for this one
   billboard. */
function buildStationCard(s,pos){
  var CW=300, CH=204, PAD=14, LBL_H=24;
  var canvas=document.createElement("canvas");
  canvas.width=CW; canvas.height=CH;
  var ctx=canvas.getContext("2d");
  var label=(s.stationName?s.stationName:"Space station").toUpperCase();
  function drawChrome(){
    _roundRectPath(ctx,2,2,CW-4,CH-4,14);
    ctx.fillStyle="rgba(6,12,20,0.94)";
    ctx.fill();
    ctx.lineWidth=3;
    ctx.strokeStyle="#5ad7ff";
    ctx.stroke();
    ctx.fillStyle="#8fe9ff";
    ctx.font="600 15px Orbitron, sans-serif";
    ctx.textAlign="center";
    ctx.textBaseline="alphabetic";
    var maxW=CW-PAD*2;
    var txt=label;
    while(ctx.measureText(txt).width>maxW && txt.length>1){ txt=txt.slice(0,-1); }
    if(txt!==label) txt=txt.slice(0,-1)+"\u2026";
    ctx.fillText(txt,CW/2,CH-9);
  }
  ctx.clearRect(0,0,CW,CH);
  drawChrome();
  var tex=new THREE.CanvasTexture(canvas);
  tex.minFilter=THREE.LinearFilter;
  var mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});
  var spr=new THREE.Sprite(mat);
  var h=5.6, w=h*(CW/CH);
  spr.scale.set(w,h,1);
  spr.position.copy(pos);
  // 2026-09-13, Tony: an uninhabited system can still carry a real
  // manually-flagged station (hasStation is entirely traveller-submitted,
  // never tied to race -- see the Edit system form's own "Space station
  // directorship" comment) -- notable enough to call out right on the tag
  // itself rather than only being discoverable by opening the full info
  // panel and checking Race separately. Tony's own follow-up: the
  // "(Uninhabited)" tag is only ever the DEFAULT placeholder state -- a
  // traveller can still submit a real station name once they know it
  // (someone can found/name a station in a system the procedural roll
  // called Uninhabited), and once a real name exists that name is the
  // known fact, not the procedural guess, so the tag drops off rather than
  // sitting there looking like it contradicts the name right next to it.
  spr.userData={feature:true,stationCard:true,
    name:(s.stationName?("Station: "+s.stationName):("Space station"+(s.race==="Uninhabited"?" (Uninhabited)":"")))+(s.allianceName?(" (Alliance: "+s.allianceName+")"):""),sys:s};
  featureMeshes.push(spr);
  var img=new Image();
  img.crossOrigin="anonymous";
  img.onload=function(){
    var innerX=PAD, innerY=PAD, innerW=CW-PAD*2, innerH=CH-PAD*2-LBL_H;
    if(innerW<=0||innerH<=0) return;
    var iw=img.naturalWidth||1, ih=img.naturalHeight||1;
    var scale=Math.max(innerW/iw, innerH/ih);
    var dw=iw*scale, dh=ih*scale;
    var dx=innerX+(innerW-dw)/2, dy=innerY+(innerH-dh)/2;
    ctx.clearRect(0,0,CW,CH);
    ctx.save();
    _roundRectPath(ctx,innerX,innerY,innerW,innerH,8);
    ctx.clip();
    ctx.drawImage(img,dx,dy,dw,dh);
    ctx.restore();
    ctx.lineWidth=1.5;
    ctx.strokeStyle="rgba(255,255,255,0.22)";
    _roundRectPath(ctx,innerX,innerY,innerW,innerH,8);
    ctx.stroke();
    drawChrome();
    tex.needsUpdate=true;
  };
  // No onerror handling beyond leaving the already-drawn placeholder card
  // in place -- a broken/unreachable photo URL still shows the station's
  // name, just without a picture, rather than an empty or missing sprite.
  img.src=s.stationPhoto;
  return spr;
}
/* Builds ONE floating diamond signal icon for a planet (see the RES_ICON_*
   header comment above for the data-honesty reasoning). Deliberately a CHILD
   of the planet's own pivot (not systemGroup, unlike buildFeature/
   buildStationCard) -- pivot.rotation.y is what animate() already spins to
   produce the planet's orbit, so a sprite parented here just rides along
   automatically, no separate per-frame position code needed. Sprites stay
   camera-facing regardless of parent rotation (same THREE.Sprite billboarding
   confirmed for buildFeature/buildStationCard earlier this session), so this
   still reads as a stationary-facing tag while visibly orbiting with its
   planet -- matching how the reference screenshots show these hugging their
   object as the view moves. */
/* Shared by buildResourceIcon()/buildManualSignalIcon() for the 3 icon
   types added 2026-09-09 (creature/hazard/cargo) -- unlike frozen/outpost
   above, these are a genuine shared helper rather than a duplicated block:
   they were never speculatively drawn ahead of a real reference (both
   frozen and outpost were each hand-drawn once, verified, then copied), so
   there's no "already-verified working code" being reshaped here, just new
   code with no reason to type twice. ctx is assumed already translated to
   the icon centre and scaled/stroke-styled by the caller, same contract as
   the frozen/outpost branches. */
function drawExtraIconGlyph(ctx,cat){
  ctx.save(); ctx.scale(0.62,0.62);
  if(cat==="creature"){
    // Small abstract creature silhouette -- rounded body, two curved
    // ear/antenna shapes, two short legs -- matching the general read of
    // Tony's own reference photos (a bipedal figure with curled antennae in
    // one, a small four-legged silhouette in another) without claiming to
    // reproduce either exactly.
    ctx.beginPath(); ctx.ellipse(0,2,7,9,0,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3,-6); ctx.quadraticCurveTo(-8,-14,-2,-16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3,-6); ctx.quadraticCurveTo(8,-14,2,-16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4,10); ctx.lineTo(-5,14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4,10); ctx.lineTo(5,14); ctx.stroke();
  } else if(cat==="hazard"){
    // Thick ring, dark diamond backdrop shows through the centre --
    // matches the red ringed/donut look in Tony's reference photo without
    // needing a separate fill colour.
    ctx.lineWidth=5;
    ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.stroke();
  } else if(cat==="cargo"){
    // Barrel/crate outline -- a rect body, two horizontal band lines, and a
    // small diamond badge in the middle -- matching Tony's reference photo
    // of a pale canister with a diamond mark on it.
    ctx.strokeRect(-6,-10,12,20);
    ctx.beginPath(); ctx.moveTo(-6,-3); ctx.lineTo(6,-3); ctx.moveTo(-6,4); ctx.lineTo(6,4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(4,0); ctx.lineTo(0,4); ctx.lineTo(-4,0); ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
}
function buildResourceIcon(s,b,pivot,localPos){
  var cat=resIconCategory(b.biome);
  var cfg=RES_ICON_CAT[cat];
  var CS=64;
  var canvas=document.createElement("canvas");
  canvas.width=CS; canvas.height=CS;
  var ctx=canvas.getContext("2d");
  ctx.translate(CS/2,CS/2);
  ctx.beginPath();
  ctx.moveTo(0,-CS*0.42); ctx.lineTo(CS*0.34,0); ctx.lineTo(0,CS*0.42); ctx.lineTo(-CS*0.34,0); ctx.closePath();
  ctx.fillStyle="rgba(6,12,20,0.55)";
  ctx.fill();
  ctx.lineWidth=2.4;
  ctx.strokeStyle=cfg.color;
  ctx.shadowColor=cfg.color; ctx.shadowBlur=8;
  ctx.stroke();
  ctx.shadowBlur=0;
  ctx.strokeStyle=cfg.color; ctx.lineWidth=1.6;
  ctx.lineCap="round"; ctx.lineJoin="round";
  if(cat==="frozen"){
    // No existing SVG icon in this app is a snowflake -- drawn by hand here
    // rather than reusing an unrelated glyph, six spokes each with a small
    // "V" barb near the tip (matches the pale-blue frozen/snowflake icon
    // Tony described from the reference screenshots).
    ctx.save(); ctx.scale(0.62,0.62);
    for(var a=0;a<6;a++){
      ctx.save(); ctx.rotate(a*Math.PI/3);
      ctx.beginPath(); ctx.moveTo(0,-11); ctx.lineTo(0,11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(-3.2,-9.6); ctx.moveTo(0,-7); ctx.lineTo(3.2,-9.6); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  } else if(cat==="outpost"){
    // Dead code here -- resIconCategory()/RES_ICON_BIOME_CAT can never
    // return "outpost" (see RES_ICON_CAT's comment), so this automatic
    // per-planet path never reaches it. Kept structurally identical to
    // buildManualSignalIcon()'s own copy of this branch below anyway, same
    // near-duplicate-rather-than-shared-refactor reasoning as the rest of
    // this function.
    ctx.save(); ctx.scale(0.62,0.62);
    ctx.strokeRect(-3,-7,6,14);
    ctx.beginPath();
    ctx.moveTo(-3,-3); ctx.lineTo(-11,-5);
    ctx.moveTo(-3,3); ctx.lineTo(-11,5);
    ctx.moveTo(3,-3); ctx.lineTo(11,-5);
    ctx.moveTo(3,3); ctx.lineTo(11,5);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(0,-11); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,-11,1.4,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  } else if(cat==="creature"||cat==="hazard"||cat==="cargo"){
    // Dead code here too, same reason as the outpost branch above -- kept
    // structurally identical to buildManualSignalIcon()'s own copy below.
    drawExtraIconGlyph(ctx,cat);
  } else {
    var m=/d="([^"]+)"/.exec(cfg.icon);
    if(m){
      var p=new Path2D(m[1]);
      ctx.save(); ctx.scale(1.5,1.5); ctx.translate(-12,-12); ctx.stroke(p); ctx.restore();
    }
  }
  var tex=new THREE.CanvasTexture(canvas);
  tex.minFilter=THREE.LinearFilter;
  var mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});
  var spr=new THREE.Sprite(mat);
  var h=0.85+b.size*0.55;
  spr.scale.set(h,h,1);
  spr.position.copy(localPos);
  spr.userData={resourceIcon:true,sys:s,body:b,category:cat,
    name:b.name,catLabel:cfg.label,
    signalType:resIconResourceName(b,s),
    route:resIconRouteText(cat,b.seed)};
  pivot.add(spr);
  resourceMeshes.push(spr);
  return spr;
}
/* Traveller-submitted counterpart to buildResourceIcon() above (2026-09-09
   follow-up -- Tony: "3 icons on system map but they are not necessarily
   linked to planets... maybe can choose which planet when adding icon").
   Deliberately a near-duplicate of buildResourceIcon()'s canvas-drawing
   code rather than a shared refactor -- lower risk than reshaping already-
   verified working code right after it shipped. The real difference is the
   TEXT: buildResourceIcon() picks a real resource name from this site's own
   sourced data and an openly-decorative flavour line; every field here is
   whatever the traveller actually typed (their own real "Starmap Analysis
   Report" observation), so this never falls back to a procedural pick --
   only to a plain "unreported" placeholder if a field was left blank.
   `parent` is either the specific body's own pivot (rides along in orbit
   exactly like an automatic icon) or null for a free-floating marker
   (added straight to systemGroup at a world-space position instead). */
function buildManualSignalIcon(s,sig,parent,pos){
  var cat=(["mineral","flora","frozen","tech","outpost","creature","hazard","cargo","atlasstation","base"].indexOf(sig.icon)>=0)?sig.icon:"mineral";
  var cfg=RES_ICON_CAT[cat];
  var mat;
  if(REAL_ICON_TEX[cat]){
    // Real icon image (2026-09-09) -- mineral/frozen/outpost/creature/cargo/
    // atlasstation all now use the actual isolated icon Tony provided
    // instead of a hand-drawn canvas glyph; see REAL_ICON_URL's comment
    // above for where these came from. The image already has its own
    // diamond backdrop baked in, so there's no separate backdrop-drawing
    // step here the way the canvas path below still needs one.
    mat=new THREE.SpriteMaterial({map:REAL_ICON_TEX[cat],transparent:true,depthWrite:false});
  } else {
    // No real image yet for this category (flora/tech/hazard) -- same
    // hand-drawn canvas backdrop+glyph as before.
    var CS=64;
    var canvas=document.createElement("canvas");
    canvas.width=CS; canvas.height=CS;
    var ctx=canvas.getContext("2d");
    ctx.translate(CS/2,CS/2);
    ctx.beginPath();
    ctx.moveTo(0,-CS*0.42); ctx.lineTo(CS*0.34,0); ctx.lineTo(0,CS*0.42); ctx.lineTo(-CS*0.34,0); ctx.closePath();
    ctx.fillStyle="rgba(6,12,20,0.55)";
    ctx.fill();
    ctx.lineWidth=2.4;
    ctx.strokeStyle=cfg.color;
    ctx.shadowColor=cfg.color; ctx.shadowBlur=8;
    ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle=cfg.color; ctx.lineWidth=1.6;
    ctx.lineCap="round"; ctx.lineJoin="round";
    if(cat==="hazard"){
      drawExtraIconGlyph(ctx,cat);
    } else {
      var m=/d="([^"]+)"/.exec(cfg.icon);
      if(m){
        var p=new Path2D(m[1]);
        ctx.save(); ctx.scale(1.5,1.5); ctx.translate(-12,-12); ctx.stroke(p); ctx.restore();
      }
    }
    var tex=new THREE.CanvasTexture(canvas);
    tex.minFilter=THREE.LinearFilter;
    mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});
  }
  var spr=new THREE.Sprite(mat);
  spr.scale.set(1.3,1.3,1);
  spr.position.copy(pos);
  spr.userData={resourceIcon:true,sys:s,manual:true,category:cat,
    name:(sig.name&&sig.name.trim())?sig.name:"Unnamed signal",
    catLabel:(sig.category&&sig.category.trim())?sig.category:"Signal",
    signalType:(sig.signalType&&sig.signalType.trim())?sig.signalType:"Unreported",
    route:(sig.route&&sig.route.trim())?sig.route:"No further details reported."};
  if(parent) parent.add(spr); else systemGroup.add(spr);
  resourceMeshes.push(spr);
  return spr;
}
/* Display-only fix for the "Colliding planets present" edit flag. Which
   planets collide is ALWAYS a traveller pick (s.collidingSet, an array of
   1-based body.index values, set via the Edit system panel's colliding-
   planet rows -- 2 fixed dropdowns until 2026-09-13, when goodguyfree found
   a real in-game system with 4 planets colliding at once and it became an
   add/remove list) -- this deliberately does NOT auto-detect overlap from
   generated size/position, since only someone who actually saw the
   collision in-game can know which planets it is; a geometric guess can
   miss the real cluster or flag one that isn't actually colliding on
   screen.
   Real bug found 2026-08-17 (Tony's screenshot vs. his Ibaraohu reference):
   the original version here only nudged each planet's mesh.position ONCE,
   right after the scene finished building -- but every planet still orbits
   on its OWN independent pivot at its OWN independent speed (pivots[].sp is
   planetIdx-dependent, outer planets orbit slower), so the two planets
   separated again the very next animation frame. A "collision" that only
   ever looked right for a single frame wasn't a fix -- confirmed exactly
   this by reading animate()'s per-frame `pivots[i].p.rotation.y+=...` loop,
   which has no idea two pivots are supposed to move together.
   Rewritten to actually JOIN planet B onto planet A's pivot instead of just
   repositioning it: B's own pivot (and the circular orbit-path ring drawn
   on it, and B's own entry in the module-level pivots[] array) is removed
   from the scene entirely, and B's mesh -- plus its atmosphere shell if it
   has one, plus its moonAnchor (carrying along any of B's OWN moons,
   unchanged) -- is reparented as a child of A's pivot at a fixed touching
   offset. Since both planets now hang off the exact same pivot, A's single
   rotation.y drives both forever -- they stay touching permanently, the
   same way a planet and its own moon already do in this scene, instead of
   drifting apart after the first frame. Never touches userData.body on
   either planet, so each still keeps its own separate name/biome/
   resources -- nothing is merged or removed, purely how the two meshes are
   parented and positioned in the 3D scene. Runs after the full body loop
   below so every planetEntries size/mesh reference is already built. */
/* Extended 2026-09-13 (goodguyfree found a real in-game system with 4
   planets colliding, not just the 2-planet case this originally handled) --
   idxList is now an arbitrary-length array of 1-based body positions
   instead of a fixed idxA/idxB pair. Every planet after the first is
   attached to the FIRST one's pivot (same reparenting technique as the
   original 2-planet version, just repeated per planet), each at its own
   direction around it so a bigger cluster fans out instead of stacking
   multiple planets in the same spot. entries[0] (the pre-2026-09-13 "A")
   still gets no rotation offset at all, so an unchanged 2-planet pick
   renders pixel-identical to before this change. */
function resolvePlanetCollisions(planetEntries,idxList){
  var seen={}, idxs=[], k;
  for(k=0;k<(idxList||[]).length;k++){
    var v=idxList[k]|0;
    if(v>0 && !seen[v]){ seen[v]=true; idxs.push(v); }
  }
  if(idxs.length<2) return;
  var entries=[], i, j;
  for(i=0;i<idxs.length;i++){
    for(j=0;j<planetEntries.length;j++){
      if(planetEntries[j].index===idxs[i]){ entries.push(planetEntries[j]); break; }
    }
  }
  if(entries.length<2) return; // fewer than 2 of the picks still exist (e.g. bodies removed since last save)
  var a=entries[0];
  // Golden-angle spacing (~137.5 degrees) around A: reused here purely
  // because it's a cheap, well-known way to spread any number of points
  // around a circle with none of them landing close together, however many
  // planets are in the cluster -- not tied to anything astronomical.
  var GOLDEN_ANGLE=2.399963229728653;
  var baseDir=new THREE.Vector3(0.82,-0.22,0.53).normalize();
  var yAxis=new THREE.Vector3(0,1,0);
  for(i=1;i<entries.length;i++){
    var b=entries[i];
    // b no longer orbits independently -- drop its pivot (and the orbit-
    // path ring + anything else still only attached to that pivot) from
    // the scene, and drop its entry from pivots[] so animate() isn't still
    // spinning a pivot nothing renders from any more.
    systemGroup.remove(b.pivot);
    for(j=pivots.length-1;j>=0;j--){ if(pivots[j].p===b.pivot) pivots.splice(j,1); }
    // b's own orbital pivot is gone, but it should still spin gently on its
    // own axis like every other planet -- give it a throwaway Object3D
    // that's never added to the scene as a harmless stand-in "pivot" (its
    // rotation.y ticks up doing nothing) purely so animate()'s existing
    // per-pivots-entry loop keeps applying b's own axial spin without any
    // special-casing there.
    pivots.push({p:new THREE.Object3D(),sp:0,mesh:b.mesh,spin:b.spin});

    // Fixed offset in A's own local space -- a sideways-and-back diagonal
    // (not pure X) so the pair reads as two spheres genuinely resting
    // against each other from most camera angles, rather than lined up
    // dead-centre on the same orbital ring; +0.4 is a small visible gap so
    // they touch, not fuse into one mesh. Every planet past the second
    // rotates that same direction further around A by the golden angle so
    // a 3rd/4th/etc planet gets its own spot instead of overlapping the
    // ones already placed.
    var dist=a.size+b.size+0.4;
    var dir=baseDir.clone().applyAxisAngle(yAxis,GOLDEN_ANGLE*(i-1));
    var newPos=a.mesh.position.clone().addScaledVector(dir,dist);

    a.pivot.add(b.mesh);
    b.mesh.position.copy(newPos);
    if(b.atmo){ a.pivot.add(b.atmo); b.atmo.position.copy(newPos); }
    if(b.moonAnchor){ a.pivot.add(b.moonAnchor); b.moonAnchor.position.copy(newPos); }
  }
}
/* ============ flattened system-view helpers (2026-09-13) ============
   Added for the Cosmos-era system-view redesign: Tony's real in-game
   reference screenshots ("THE TAGASHIW XVI SYSTEM" etc.) show every
   planet sharing ONE flat orbital plane, not this site's older
   individually-tilted-per-planet look -- see buildSystemView()'s planet
   loop below, where pivot.rotation.x now always uses this single
   constant instead of a per-planet stagger. Kept as a named constant
   (not just a literal 0) so the whole disc's tilt can be tuned later in
   one place if Tony ever wants it (independent of the camera's own
   raked viewing angle, which is what setMode('system') controls). */
var SYSTEM_TILT=0;
/* Four ring treatments, cycling by planet index (0=innermost since
   planetIdx counts outward from the star) -- matches the 4 distinct ring
   styles visible in the real reference screenshot: solid -> red
   segmented "scan band" -> solid white -> fine dashed (outermost of the
   4, repeats again for a 5th/6th planet if a system has that many). */
var ORBIT_RING_STYLES=[
  {color:0x00e5ff,opacity:0.55,dash:null},
  {color:0xff4646,opacity:0.65,dash:[34,7,12,7,55,7,18,7,70,7]},
  {color:0xffffff,opacity:0.55,dash:null},
  {color:0xd7ebf5,opacity:0.42,dash:[3,7]}
];
/* Long thin alternating-alpha strip for a dashed ring -- RingGeometry's
   own UVs map u around the circumference and v radially (see the
   existing makeRingTexture() comment above, already relied on for
   planets' own Saturn-style rings), so a texture that varies along its
   WIDTH and repeats via wrapS is exactly what draws dashes running
   around the ring rather than across its band. */
function orbitDashTexture(dash){
  var TW=1024,TH=8,cv=document.createElement("canvas"); cv.width=TW; cv.height=TH;
  var g=cv.getContext("2d");
  var total=dash.reduce(function(a,b){return a+b;},0);
  var scale=TW/total,x=0,on=true,i;
  g.clearRect(0,0,TW,TH);
  for(i=0;i<dash.length;i++){
    var w=dash[i]*scale;
    if(on){ g.fillStyle="#fff"; g.fillRect(x,0,w,TH); }
    x+=w; on=!on;
  }
  var t=new THREE.CanvasTexture(cv); t.needsUpdate=true;
  t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.ClampToEdgeWrapping;
  return t;
}
/* Builds one styled orbit-path ring for a planet at orbitR, style chosen
   by ORBIT_RING_STYLES[idx % 4]. Dash repeat count is scaled with orbitR
   so dash SIZE stays roughly constant across rings of different radii
   (a bigger ring needs proportionally more repeats of the same pattern),
   not a fixed repeat count that would stretch on the outer rings. */
function orbitRingMesh(orbitR,idx){
  var style=ORBIT_RING_STYLES[idx%ORBIT_RING_STYLES.length];
  var matOpts={color:style.color,transparent:true,opacity:style.opacity,
    side:THREE.DoubleSide,depthWrite:false};
  if(style.dash){
    var tex=orbitDashTexture(style.dash);
    tex.repeat.set(Math.max(1,orbitR*0.6),1);
    matOpts.map=tex;
  }
  var ring=new THREE.Mesh(new THREE.RingGeometry(orbitR-0.05,orbitR+0.05,128),
    new THREE.MeshBasicMaterial(matOpts));
  ring.rotation.x=Math.PI/2;
  return ring;
}
/* Default station icon (2026-09-13, expanded to all 5 processed refs).
   The system centre now ALWAYS shows a station (matching the confirmed
   mockup design), not just when a traveller has submitted a real photo.
   DEFAULT_STATION_TEX holds all 5 of Tony's reference photos that have
   had their backgrounds removed -- each entry carries its OWN aspect
   ratio (a tall spire vs. a wide ring station are very different shapes,
   so one shared aspect would squash most of them), picked STABLY per
   system (mulberry32 off s.idx, same determinism pattern every other
   seeded roll in this file already uses) so a system shows the same
   default icon on every visit rather than a different one each time. */
var DEFAULT_STATION_TEX=[
  {tex:TEX_LOADER.load("icons-web/feature-station-default1.png"),aspect:160/316},
  {tex:TEX_LOADER.load("icons-web/feature-station-default2.png"),aspect:332/332},
  {tex:TEX_LOADER.load("icons-web/feature-station-default3.png"),aspect:640/607},
  {tex:TEX_LOADER.load("icons-web/feature-station-default4.png"),aspect:640/364},
  {tex:TEX_LOADER.load("icons-web/feature-station-default5.png"),aspect:438/482}
];
/* Shared with setMode()'s camera-fit (2026-09-13, Tony live feedback: system
   view "needs to fill screen more, little small") -- both need the exact
   same "how big is this system" number, factored out so they can't drift
   out of sync the way two separately-typed copies of the same formula
   eventually do. lastOrbitR is the outermost planet's orbit radius (see
   buildSystemView's own orbitR formula below); featureR pushes 12 further
   out, clear of that ring, which is also where the star/black hole/Atlas
   get placed. */
function systemFeatureR(s){
  return 8+Math.max(0,s.planets-1)*3.7+12;
}
function buildDefaultStationIcon(s){
  var pick=DEFAULT_STATION_TEX[Math.floor(mulberry32(s.idx^0x53544144)()*DEFAULT_STATION_TEX.length)];
  var mat=new THREE.SpriteMaterial({map:pick.tex,transparent:true,depthWrite:false});
  var spr=new THREE.Sprite(mat);
  var h=5.0,w=h*pick.aspect;
  spr.scale.set(w,h,1);
  spr.position.set(0,0,0);
  /* Real bug (2026-09-13, Tony: clicked the default station icon live and
     got "Cannot read properties of undefined (reading 'stars')"): this
     userData was missing `sys`, but tryPick()'s system branch always calls
     updatePanel(ud.sys) for anything with ud.feature true -- so clicking
     this icon called updatePanel(undefined), which crashed the moment it
     tried starSwatches(undefined).stars. buildStationCard (the real-photo
     twin of this function) already carried sys -- this just brings the
     default icon in line with it, and picks up the traveller's real
     stationName the same way buildStationCard does rather than always
     showing the generic "Space station" fallback. */
  // Same "(Uninhabited)"-only-while-unnamed tag as buildStationCard's own
  // userData.name -- see that function's comment for the why. Kept
  // identical between the two so the tag reads the same whether or not a
  // real station photo exists.
  spr.userData={feature:true,stationCard:true,sys:s,
    name:(s.stationName?("Station: "+s.stationName):("Space station"+(s.race==="Uninhabited"?" (Uninhabited)":"")))+(s.allianceName?(" (Alliance: "+s.allianceName+")"):"")};
  featureMeshes.push(spr);
  return spr;
}
function buildSystemView(s){
  while(systemGroup.children.length){
    var ch=systemGroup.children.pop();
    ch.traverse(function(o){
      if(o.geometry) o.geometry.dispose();
      if(o.material){ if(o.material.map&&o.material.map!==CORONA&&o.material.map!==BH_TEX&&o.material.map!==ATLAS_TEX) o.material.map.dispose(); o.material.dispose(); }
    });
  }
  bodyMeshes=[]; pivots=[]; starMeshes=[]; coronas=[]; featureMeshes=[]; resourceMeshes=[];
  hideResourceReport();
  /* place clear of the outermost planet's orbit ring -- lastOrbitR mirrors
     the exact orbitR formula used below (8 + planetIdx*3.7) so this can't
     drift back inside the rings as generated bodies change; +12 is a hard
     clearance margin. Computed BEFORE the star loop now (2026-09-13,
     flattened system-view redesign) because the star cluster is also
     positioned off featureR -- see below. */
  var featureR=systemFeatureR(s);
  /* Flattened system view (2026-09-13, Tony -- Cosmos-era reference
     screenshots): the star used to sit at the scene's exact centre, with
     every planet orbiting it directly. The reference instead keeps the
     STATION at centre and pushes the star out to its own corner, so the
     star (and, for a binary, its companion, offset a little further
     along the same direction) now gets a fixed off-centre placement --
     same "unit-length fraction of featureR" approach already used for
     the black hole/Atlas billboards below, just its own direction so a
     system with a black hole AND a station AND a star all stay visually
     separated rather than stacking. starLight is deliberately left at
     the origin (not moved with the star) so the flattened disc keeps
     even, centred lighting rather than going dark on whichever side the
     star visually isn't. */
  var si;
  for(si=0; si<s.stars; si++){
    var off=new THREE.Vector3(featureR*0.66+si*3.2,featureR*0.47,-featureR*0.21-si*1.6);
    systemGroup.add(buildStar(s,si,off));
  }
  starLight.color.setHex(s.starColors[0]);
  starLight.position.set(0,0,0);
  if(s.blackHole) systemGroup.add(buildFeature(s,"bh",new THREE.Vector3(featureR*0.82,featureR*0.18,-featureR*0.55)));
  if(s.atlas) systemGroup.add(buildFeature(s,"atlas",new THREE.Vector3(-featureR*0.85,-featureR*0.15,featureR*0.5)));
  /* Station is now ALWAYS shown at the scene centre -- either the real
     submitted photo (buildStationCard, unchanged) or, when no photo has
     been submitted yet, a small default station icon, matching the
     confirmed mockup design rather than showing an empty centre until a
     traveller uploads one. */
  if(s.hasStation && s.stationPhoto) systemGroup.add(buildStationCard(s,new THREE.Vector3(0,0,0)));
  else systemGroup.add(buildDefaultStationIcon(s));
  /* Two-pass build (2026-09-01, Tony's Nogsangh report): every planet is
     built first (pass 1, unchanged geometry/material logic from before),
     recording each one's own moonAnchor/size/running-moon-count keyed by
     its real body .index in planetAnchors{}. Moons are then attached in a
     SEPARATE second pass, each one resolved to its actual owning planet
     via findOwningPlanetIndex(s,b) (which reads b.parent -- the traveller's
     real Orbits pick, or generateSystem()'s own procedural parent chain --
     see that function's own header). The old single-pass version attached
     a moon to whichever planet happened to be built immediately before it
     in array order, with no reference to b.parent at all -- it happened to
     look right for Nogsangh purely because the two swapped bodies (Udre
     II/Ibai 73/C5) were array-adjacent, not because the logic was actually
     using their real relationship; any system where a corrected/edited
     moon isn't immediately preceded by its real parent in the array would
     have rendered it orbiting the wrong planet. Falls back to the
     last-built planet (the old behaviour) only if a moon's real parent
     can't be resolved at all -- shouldn't happen for a saved/edited system
     (applyOverride() always points b.parent at a genuine planet or 0),
     kept as a safety net for malformed/legacy data. */
  var planetIdx=0;
  var planetAnchors={}; // keyed by body.index -- {moonAnchor,moonAnchorSize,moonIdx}
  var lastPlanetAnchorKey=null;
  var planetEntries=[]; // for resolvePlanetCollisions(), populated below
  var moonBodies=[]; // deferred to pass 2, once every planet anchor exists
  // 1-based array-position lookups, populated below in both the planet and
  // moon passes -- used only by the manual-signal-marker pass further down
  // to place a traveller-linked marker near the exact body they picked
  // (payload.signals[].planet is a 1-based position into s.bodies, same
  // shape as a moon's own "orbits" field / the colliding-pair fields).
  var bodyPivots={}, bodyLocalPos={}, bodySize={};
  for(var bi=0; bi<s.bodies.length; bi++){
    var b=s.bodies[bi];
    if(b.moon){ moonBodies.push(b); continue; }
    var pal=biomePal(b.biome);
    var pivot=new THREE.Object3D(); systemGroup.add(pivot);
    var orbitR=8+planetIdx*3.7;
    var mesh=new THREE.Mesh(new THREE.SphereGeometry(b.size,32,24),
      new THREE.MeshLambertMaterial({map:makePlanetTexture(b)}));
    mesh.position.set(orbitR,0,0);
    bodyPivots[bi+1]=pivot; bodyLocalPos[bi+1]=mesh.position.clone(); bodySize[bi+1]=b.size;
    mesh.rotation.z=b.tilt;
    mesh.userData={body:b,sys:s};
    pivot.add(mesh);
    if(pal.atmo){
      var atmo=new THREE.Mesh(new THREE.SphereGeometry(b.size*1.14,24,18),
        new THREE.MeshBasicMaterial({color:pal.atmo,transparent:true,opacity:0.14,
          blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide}));
      atmo.position.copy(mesh.position);
      pivot.add(atmo);
    }
    /* Flattened system view (2026-09-13): every planet's orbit now shares
       ONE plane (SYSTEM_TILT) instead of each getting its own individual
       pivot.rotation.x stagger. rotation.y is left as a per-planet
       starting phase (just which point of its ring it begins at) --
       unrelated to the tilt fix, still varied per planet. */
    pivot.rotation.x=SYSTEM_TILT;
    pivot.rotation.y=planetIdx*1.1;
    pivot.add(orbitRingMesh(orbitR,planetIdx));
    if(b.ring){
      // A real Saturn-style planetary ring, distinct from the thin cyan
      // orbit-path ring above -- lives as a CHILD of the planet mesh so it
      // automatically inherits mesh.rotation.z (the planet's own axial
      // tilt) and sits correctly in its equatorial plane with zero extra
      // tilt math needed here. Width kept to ~0.3x the planet's own radius
      // (was 0.95x, read as a chunky solid disc rather than a ring on
      // Tony's actual screen) -- a tighter band plus a small gap off the
      // planet's surface reads as a proper ring at real render size.
      // "split" is the one style that's a genuinely different SHAPE, not
      // just a different texture -- two separate thin bands with a real
      // gap between them (Cassini-division look), matching the mockup
      // Tony picked rather than faking a gap in the texture alone.
      if(b.ring==="split"){
        var pRingIn=new THREE.Mesh(new THREE.RingGeometry(b.size*1.4,b.size*1.5,64),
          new THREE.MeshBasicMaterial({map:makeRingTexture(b),transparent:true,
            side:THREE.DoubleSide,depthWrite:false}));
        pRingIn.rotation.x=Math.PI/2; mesh.add(pRingIn);
        var pRingOut=new THREE.Mesh(new THREE.RingGeometry(b.size*1.58,b.size*1.7,64),
          new THREE.MeshBasicMaterial({map:makeRingTexture(b),transparent:true,
            side:THREE.DoubleSide,depthWrite:false}));
        pRingOut.rotation.x=Math.PI/2; mesh.add(pRingOut);
      } else {
        var pRing=new THREE.Mesh(new THREE.RingGeometry(b.size*1.4,b.size*1.7,64),
          new THREE.MeshBasicMaterial({map:makeRingTexture(b),transparent:true,
            side:THREE.DoubleSide,depthWrite:false}));
        pRing.rotation.x=Math.PI/2; mesh.add(pRing);
      }
    }
    // buildResourceIcon() call removed 2026-09-09 (Tony, same day as the
    // outpost/creature/hazard/cargo icon work): he saw a diamond icon next
    // to every single planet/moon in a real system screenshot and pointed
    // out these appear automatically, with no real submitted data behind
    // them -- resIconCategory() derives purely from biome (itself
    // "Unknown" for any unconfirmed planet per the Sept 8 decision) and
    // falls back to "mineral" for anything unmapped, so every body got an
    // icon whether or not a traveller had actually reported one. That's
    // exactly the "generated ... not user input" problem Tony flagged for
    // outpost specifically earlier this session, just not yet applied here
    // -- now applied everywhere: only buildManualSignalIcon()'s
    // traveller-submitted signals (the Edit system "Resource / signal
    // markers" list) ever render a diamond. buildResourceIcon() itself is
    // left defined but unused rather than deleted, same as the existing
    // dead-code branches inside it -- lower risk than removing a
    // function outright, and an easy revert if ever wanted back.
    pivots.push({p:pivot,sp:0.10/(1+planetIdx*0.55),mesh:mesh,spin:b.spin});
    bodyMeshes.push(mesh);
    var pMoonAnchor=new THREE.Object3D();
    pMoonAnchor.position.set(orbitR,0,0);
    pivot.add(pMoonAnchor);
    planetAnchors[b.index]={moonAnchor:pMoonAnchor,moonAnchorSize:b.size,moonIdx:0};
    lastPlanetAnchorKey=b.index;
    planetEntries.push({pivot:pivot,mesh:mesh,size:b.size,moonAnchor:pMoonAnchor,index:b.index,atmo:atmo});
    planetIdx++;
  }
  for(var mi=0; mi<moonBodies.length; mi++){
    var mb=moonBodies[mi];
    var mPal=biomePal(mb.biome);
    var ownerKey=findOwningPlanetIndex(s,mb);
    var anchorEntry=(ownerKey!==null && planetAnchors[ownerKey])?planetAnchors[ownerKey]:planetAnchors[lastPlanetAnchorKey];
    if(!anchorEntry) continue; // no planet at all in this system -- nothing to attach to
    var moonAnchor=anchorEntry.moonAnchor, moonAnchorSize=anchorEntry.moonAnchorSize, moonIdx=anchorEntry.moonIdx;
    var mR=moonAnchorSize+mb.size*1.9+moonIdx*1.5+1.4;
    var mPivot=new THREE.Object3D(); moonAnchor.add(mPivot);
    var mMesh=new THREE.Mesh(new THREE.SphereGeometry(mb.size,24,18),
      new THREE.MeshLambertMaterial({map:makePlanetTexture(mb)}));
    mMesh.position.set(mR,0,0);
    var mbPos=s.bodies.indexOf(mb)+1;
    bodyPivots[mbPos]=mPivot; bodyLocalPos[mbPos]=mMesh.position.clone(); bodySize[mbPos]=mb.size;
    mMesh.rotation.z=mb.tilt;
    mMesh.userData={body:mb,sys:s};
    mPivot.add(mMesh);
    if(mPal.atmo){
      var mAtmo=new THREE.Mesh(new THREE.SphereGeometry(mb.size*1.14,24,18),
        new THREE.MeshBasicMaterial({color:mPal.atmo,transparent:true,opacity:0.14,
          blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide}));
      mAtmo.position.copy(mMesh.position);
      mPivot.add(mAtmo);
    }
    mPivot.rotation.x=(moonIdx%2?0.22:-0.16);
    mPivot.rotation.y=moonIdx*2.1;
    var mRing=new THREE.Mesh(new THREE.RingGeometry(mR-0.02,mR+0.02,64),
      new THREE.MeshBasicMaterial({color:0x00e5ff,transparent:true,opacity:0.10,
        side:THREE.DoubleSide,depthWrite:false}));
    mRing.rotation.x=Math.PI/2; mPivot.add(mRing);
    pivots.push({p:mPivot,sp:0.34/(1+moonIdx*0.4),mesh:mMesh,spin:mb.spin});
    bodyMeshes.push(mMesh);
    anchorEntry.moonIdx++;
  }
  // Traveller-added resource/signal markers (2026-09-09) -- built AFTER
  // every real body's pivot/position/size is known (both passes above),
  // since a linked marker needs its target body's own pivot to parent
  // onto. A marker with no planet chosen (or one pointing at a slot that
  // no longer exists -- e.g. the traveller removed that body afterwards)
  // free-floats instead, fanned out around a small ring near the feature
  // area so multiple free ones don't stack on top of each other.
  if(s.signals && s.signals.length){
    var freeIdx=0;
    for(var sgi=0; sgi<s.signals.length; sgi++){
      var sig=s.signals[sgi];
      var linkPos=sig.planet|0;
      if(linkPos>=1 && bodyPivots[linkPos]){
        var basePos=bodyLocalPos[linkPos], bsz=bodySize[linkPos];
        var localPos=new THREE.Vector3(basePos.x+bsz*2.4,basePos.y+bsz*1.7,basePos.z+bsz*1.1);
        buildManualSignalIcon(s,sig,bodyPivots[linkPos],localPos);
      } else {
        var fAng=freeIdx*(Math.PI*2/6)+0.4;
        var fR=featureR*0.45;
        var worldPos=new THREE.Vector3(Math.cos(fAng)*fR,featureR*0.15*(freeIdx%2?1:-1),Math.sin(fAng)*fR);
        buildManualSignalIcon(s,sig,null,worldPos);
        freeIdx++;
      }
    }
  }
  if(s.colliding) resolvePlanetCollisions(planetEntries,s.collidingSet||[]);
}

/* ============ panel ============ */
function renderSeq(el,addr){
  var html="",i;
  for(i=0;i<addr.length;i++) html+='<img alt="'+addr[i]+'" src="'+glyphSrc(addr[i])+'">';
  el.innerHTML=html;
}
function starSwatches(s){
  var html="",i;
  for(i=0;i<s.stars;i++){
    var c="#"+hex(s.starColors[i],6);
    html+='<span class="starsw" style="background:radial-gradient(circle at 38% 34%,#fff 0%,'+c+
          ' 46%,'+c+' 60%,rgba(0,0,0,0) 82%);box-shadow:0 0 10px '+c+'"></span>';
  }
  return html;
}
function distanceLY(s){
  if(!focusSystem) return 0;
  var dx=s.px-focusSystem.px, dy=s.py-focusSystem.py, dz=s.pz-focusSystem.pz;
  return Math.round(Math.sqrt(dx*dx+dy*dy+dz*dz)/VOX_U*LY_PER_VOXEL);
}
/* ============ field-level edit status (EDIT-TRACKING-AND-DISPUTES.md) ============
   Gold/green ("original" vs "edited") is computed HERE, client-side, by
   diffing the live system against a freshly-generated, override-free
   version of the exact same address -- rather than the server tracking an
   editedFields list the way the spec originally sketched it. This is a
   deliberate simplification made while building this: the server already
   has to store the CURRENT value of every field somewhere (sysRec.data),
   and generateSystem() already knows exactly how to reproduce the pure
   procedural version of any address on demand -- so "did a real person
   change this" is just "does it differ from what the algorithm alone would
   have produced", no separate bookkeeping required, and it's automatically
   correct for every system ever saved (including ones edited before this
   feature existed), not just ones with a server-tracked history. Amber
   (flagged) and red (disputed) genuinely can't be derived this way -- they
   describe REVIEW STATE, not value divergence -- so those two still come
   from the server (s.flaggedFields/s.disputedFields, set in applyOverride()). */
function fieldStatusBaseline(s){
  if(!s._fsBaseline){
    s._fsBaseline=generateSystem(s.vx,s.vy,s.vz,s.idx,true);
    upgradeBodyNames(s._fsBaseline); // compare like for like -- see upgradeBodyNames() below
  }
  return s._fsBaseline;
}
function fsBodyKey(b){
  if(!b) return null;
  // Real bug fixed 2026-08-12: every other field here already defaults a
  // missing value the same way on both the pure-procedural path
  // (generateSystem's own body loop, which never sets descriptor/flora/
  // minerals/salvage/fossils at all) and the override path (applyOverride,
  // which always sets them, even to "" / [] / "None") -- descriptor was the
  // one field still comparing raw b.descriptor, i.e. undefined vs "". Since
  // JSON.stringify OMITS keys whose value is undefined but KEEPS an empty
  // string, an untouched body on a system that had ANY other body edited
  // would permanently compare as "edited" even though nothing about that
  // specific body ever changed -- a false-positive green/edited status.
  return JSON.stringify({n:b.name,bi:b.biome,d:b.descriptor||"",w:!!b.water,r:b.ring||false,
    se:b.sentinel||"None",au:!!b.autophage,ba:!!b.base,bn:b.baseName||"",ru:(b.resUni||[]).slice().sort(),
    fl:(b.flora||[]).slice().sort(),fa:(b.fauna||[]).slice().sort(),mi:(b.minerals||[]).slice().sort(),
    sa:(b.salvage||[]).slice().sort(),fo:(b.fossils||[]).slice().sort()});
}
function fsCategoryValue(s,category){
  var m=/^bodies\.(\d)$/.exec(category);
  if(m) return fsBodyKey(s.bodies[+m[1]]);
  switch(category){
    case "name": return s.name;
    case "race": return s.race;
    case "region": return s.region;
    case "starClass": return s.spectral;
    case "stars": return JSON.stringify(s.starTypes);
    case "suffix": return JSON.stringify({water:!!s.water,dissonant:!!s.dissonant});
    case "giant": return !!s.giant;
    case "economy": return JSON.stringify({e:s.econName,se:s.sell,b:s.buy,d:s.econDesc});
    case "conflict": return s.conflict;
    case "blackHole": return !!s.blackHole;
    case "atlas": return !!s.atlas;
    case "phantom": return s.phantom||"";
    case "notes": return s.publicNotes||"";
    case "screenshot": return s.publicScreenshot||"";
    // Station (2026-09-09): bundles all 3 fields the same way "suffix"
    // bundles water+dissonant and "colliding" bundles its 3 fields -- one
    // traveller's station-directorship pick, diffed/flagged/disputed as
    // one unit rather than 3 independent fields. Also closes a real gap:
    // the station tag pill (see updatePanel()'s tags array) already passed
    // "station" as its category before this case existed, so it could
    // never actually show edited/flagged/disputed colouring -- this fixes
    // that at the same time it gives the new photo section something to
    // diff against.
    case "station": return JSON.stringify({h:!!s.hasStation,n:s.stationName||"",a:s.allianceName||"",p:s.stationPhoto||""});
    // Resource/signal markers (2026-09-09): the whole array diffed as one
    // unit, same "colliding"/"station" bundling precedent -- not split
    // per-marker since there's no per-marker flag/dispute UI for it.
    case "signals": return JSON.stringify(s.signals||[]);
    default: return undefined;
  }
}
/* Returns 'original'|'edited'|'flagged'|'disputed' for one field category on
   one system. Order matters -- a field a traveller is actively disputing
   should read as disputed/flagged even if it also happens to differ from
   the procedural baseline (it almost always will, that's WHY it's flagged). */
function getFieldStatus(s,category){
  if((s.disputedFields||[]).indexOf(category)>=0) return "disputed";
  if((s.flaggedFields||[]).indexOf(category)>=0) return "flagged";
  if(!s.override) return "original";
  var base=fieldStatusBaseline(s);
  return fsCategoryValue(s,category)===fsCategoryValue(base,category) ? "original" : "edited";
}
function fsClass(s,category){ return "fs-"+getFieldStatus(s,category); }
/* Swaps in the right fs-* class on one panel element without disturbing any
   other class it already carries (e.g. #pStars also has "stars", .row
   elements also have "row row-eco", etc). */
function setFsClass(id,category,s){
  var el=document.getElementById(id);
  if(!el) return;
  el.classList.remove("fs-original","fs-edited","fs-flagged","fs-disputed");
  el.classList.add(fsClass(s,category));
}
/* Lazily upgrades a single system's body names to nms-core's accurate
   planetName() output, in place, the first time that system is actually
   viewed (called from updatePanel(), the one choke point every selection
   path -- star click, jump, Enter system, edit-save refresh -- already goes
   through before a player can see either the info panel or the 3D system
   view; buildSystemView() only ever runs on `selected`, which this has
   already mutated by then). Memoised on the system object itself
   (s._bodyNamesUpgraded) so re-opening the same system doesn't repeat the
   work. See the comment on the body loop in generateSystem() for why this
   isn't done eagerly for every generated system. */
function upgradeBodyNames(s){
  if(!s || s._bodyNamesUpgraded || !window.NMSCore || !window.nmsLetterMap) return;
  s._bodyNamesUpgraded=true;
  var ps2;
  try{ ps2=window.NMSCore.planetSeeds(BigInt("0x"+s.address),s.galaxy); }
  catch(e){ return; }
  for(var i=0;i<s.bodies.length;i++){
    var b=s.bodies[i];
    // Real bug fixed 2026-08-12: this used to overwrite EVERY body's name
    // unconditionally, including ones a traveller had actually typed in via
    // Edit system and saved as shared community data -- so a system with
    // real submitted planet names would silently show this site's own
    // procedural guess instead the moment it was opened. A submitted name
    // is a fact (from someone's real save), the procedural name is only a
    // best-effort guess when no one has told us the real one yet -- never
    // let the guess win.
    if(b.nameOverridden) continue;
    if(b.index>ps2.planet_seeds.length) continue;
    // Biome/sentinel context (2026-08-18) -- see nms-core/planet.js's own
    // comment on BIOME_ADORNMENTS for why this is still a disclosed
    // stylistic guess, not real save data, just one that now leans on the
    // biome/sentinel already shown right next to it instead of a fully
    // generic word pool. b.sentinel is only ever set after a traveller has
    // actually edited this body (see the procedural-body-shape note in
    // generateSystem()) -- undefined on a fresh body, which planetName()
    // treats the same as "no sentinel context", falling through to biome.
    try{ b.name=window.NMSCore.planetName(portalCodeBig(b.index,s.idx,s.vx,s.vy,s.vz),s.galaxy,window.nmsLetterMap,{biome:b.biome,sentinel:b.sentinel}); }
    catch(e){ /* keep the existing (legacy) name for this one body */ }
  }
}
function updatePanel(s){
  selected=s;
  hideHopPreviewBar();
  upgradeBodyNames(s);
  document.getElementById("panel").classList.add("show");
  document.getElementById("pSys").style.display="";
  document.getElementById("pBody").style.display="none";
  closePanelFold("pSeqHead","pSeqBody");
  closePanelFold("pNoteHead","pNoteBody");
  document.getElementById("pStars").innerHTML=starSwatches(s);
  document.getElementById("pName").textContent=s.name;
  document.getElementById("pReg").textContent="REGION: "+s.region;
  setFsClass("pStars","stars",s);
  setFsClass("pName","name",s);
  setFsClass("pReg","region",s);
  var here=(focusSystem&&s.address===focusSystem.address&&s.galaxy===focusSystem.galaxy);
  var suffixParts=[]; if(s.water) suffixParts.push("Water"); if(s.dissonant) suffixParts.push("Dissonant");
  var suffix=suffixParts.length?" // "+suffixParts.join(" "):"";
  document.getElementById("pCls").textContent=
    (here?"CURRENT LOCATION":(commas(distanceLY(s))+" LY"))+" // "+s.spectral+suffix;
  // pCls shows starClass and the water/dissonant suffix on one combined
  // line -- worse-of the two statuses (disputed beats flagged beats edited
  // beats original) so the line lights up if EITHER underlying field needs
  // attention, since there's no way to colour half a text node.
  var FS_RANK={original:0,edited:1,flagged:2,disputed:3};
  var clsStat=getFieldStatus(s,"starClass"), sufStat=getFieldStatus(s,"suffix");
  setFsClass("pCls", FS_RANK[sufStat]>FS_RANK[clsStat]?"suffix":"starClass", s);
  document.getElementById("pCore").textContent=commas(s.coreLY)+" LY from galaxy centre";
  document.getElementById("icRace").innerHTML=raceIcon(s.race);
  document.getElementById("icEco").innerHTML=econIcon(s.econType);
  document.getElementById("pRace").innerHTML=escAttr(s.race)+(s.abandoned?' <span style="color:var(--gold)">(Abandoned)</span>':"");
  document.getElementById("pEco").textContent=s.uncharted?"—":s.econName;
  document.getElementById("pEcoSub").textContent=s.uncharted?"Uncharted system":
    (s.econName+" // Sell: "+s.sell+"% Buy: "+s.buy+"% // "+s.econDesc);
  document.getElementById("pEcoStars").innerHTML=s.uncharted?"":ecoStars(s.econTier);
  // "Not Available" (2026-09-02): hides the whole Conflict row, matching
  // Tony's own in-game screenshot of an abandoned system that showed no
  // Conflict line at all (also wiki-confirmed for abandoned systems
  // generally) -- same hide-the-row mechanism as Sentinel's "Not shown".
  if(s.conflict==="Not Available"){
    document.getElementById("pConRow").style.display="none";
  }else{
    document.getElementById("pConRow").style.display="";
    document.getElementById("icCon").innerHTML=svg(IC_CONFLICT,CONFLICT_COL[s.conTier]);
    document.getElementById("pCon").textContent=s.conflict;
    document.getElementById("pConBadge").innerHTML=conBadge(s);
  }
  setFsClass("pRaceRow","race",s);
  setFsClass("pEcoRow","economy",s);
  setFsClass("pConRow","conflict",s);
  // Grey out + tag "Procedural" for race/economy/conflict ONLY when neither a
  // traveller has confirmed it via Edit system NOR the real algorithm
  // produced it (s.raceReal/econReal/conflictReal -- see generateSystem()'s
  // flavorIsReal). 2026-08-23: these three used to be invented flavour
  // unconditionally, so this fired for every unedited system; now
  // systemAttributes() derives them for real (same footing as star type,
  // which never got this tag), so it only fires in the rare fallback case
  // (no portal address, or nms-core/economy.js failed to load) -- see the
  // About modal's "Procedural data" section for the same update.
  var raceIsGuess=!s.raceVerified&&!s.raceReal;
  var econIsGuess=!s.econVerified&&!s.econReal;
  var conIsGuess=!s.conflictVerified&&!s.conflictReal;
  document.getElementById("pRaceGuess").style.display=raceIsGuess?"":"none";
  document.getElementById("pEcoGuess").style.display=econIsGuess?"":"none";
  document.getElementById("pConGuess").style.display=conIsGuess?"":"none";
  document.getElementById("pRace").classList.toggle("guessVal",raceIsGuess);
  document.getElementById("pEco").classList.toggle("guessVal",econIsGuess);
  document.getElementById("pEcoSub").classList.toggle("guessVal",econIsGuess);
  document.getElementById("pCon").classList.toggle("guessVal",conIsGuess);

  var tags=[["",["","Single","Binary","Ternary"][s.stars]+" star"]];
  tags.push(["",s.planets+(s.planets===1?" planet":" planets")]);
  if(s.moons>0) tags.push(["",s.moons+(s.moons===1?" moon":" moons")]);
  if(s.giant) tags.push(["hot","Gas giant","giant"]);
  if(s.ruins) tags.push(["ruin","Ruins"]);
  if(s.blackHole) tags.push(["bh","Black hole","blackHole"]);
  if(s.atlas) tags.push(["hot","Atlas interface","atlas"]);
  if(s.hasStation) tags.push(["hot",(s.stationName?("Station: "+s.stationName):"Space station")+(s.allianceName?(" (Alliance: "+s.allianceName+")"+allianceBadgeTagHtml(s.allianceName)):""),"station"]);
  if(s.signals&&s.signals.length) tags.push(["hot",s.signals.length+(s.signals.length===1?" signal marker":" signal markers"),"signals"]);
  if(!canReachColor(s.type)) tags.push(["noreach",driveNeededMsg(s.type)]);
  if(s.phantom==="phantom") tags.push(["ghost","Phantom Star","phantom",
    "An unreachable NMS oddity: most regions contain thousands of \"phantom\" system indices that never appear on the real in-game map or Galactic Map. Normally only reached via a save/portal-index edit -- opening the map while inside one snaps your position to the nearest normal star instead."]);
  if(s.phantom==="shadow") tags.push(["ghost","Shadow Star","phantom",
    "A distinct, related anomaly: the first invalid system index right after the portal network's valid range. Unlike an ordinary phantom, a Shadow Star CAN be reached by hyperjump."]);
  if(s.outlaw) tags.push(["hot","Outlaw"]);
  if(s.uncharted) tags.push(["","Uncharted"]);
  if(s.abandoned) tags.push(["hot","Abandoned"]);
  if(store.marks[skey(s)]) tags.push(["hot","Bookmarked"]);
  if(store.waypoints[skey(s)]) tags.push(["wp","Waypoint"]);
  if(store.visited[skey(s)]) tags.push(["","Visited"]);
  if(s.override) tags.push(["hot","Community edited"]);
  var html="",i;
  for(i=0;i<tags.length;i++){
    var extraCls=tags[i][0], cat=tags[i][2], tip=tags[i][3];
    if(cat){ var st=getFieldStatus(s,cat); if(st!=="original") extraCls+=" fs-"+st; }
    html+='<span class="tag '+extraCls+'"'+(tip?' title="'+tip.replace(/"/g,"&quot;")+'"':'')+'>'+tags[i][1]+'</span>';
  }
  document.getElementById("pTags").innerHTML=html;
  var pnb=document.getElementById("pubNoteBox");
  var pEditorLine=document.getElementById("pEditorLine");
  var editorTxt=s.editorName?("Documented by "+s.editorName+(s.editorFriendCode?" \u00b7 Friend code: "+s.editorFriendCode:"")):(s.editorFriendCode?("Friend code: "+s.editorFriendCode):"");
  if(editorTxt){ pEditorLine.textContent=editorTxt; pEditorLine.style.display="block"; }
  else pEditorLine.style.display="none";
  if(s.publicNotes){ document.getElementById("pubNote").style.display=""; document.getElementById("pubNote").textContent=s.publicNotes; }
  else document.getElementById("pubNote").style.display="none";
  var pubShotWrap=document.getElementById("pubScreenshotWrap"), pubShotImg=document.getElementById("pubScreenshot");
  if(s.publicScreenshot){ pubShotImg.src=s.publicScreenshot; pubShotWrap.style.display="block"; }
  else { pubShotImg.src=""; pubShotWrap.style.display="none"; }
  var pubStPhotoWrap=document.getElementById("pubStationPhotoWrap"), pubStPhotoImg=document.getElementById("pubStationPhoto");
  if(s.hasStation && s.stationPhoto){ pubStPhotoImg.src=s.stationPhoto; pubStPhotoWrap.style.display="block"; }
  else { pubStPhotoImg.src=""; pubStPhotoWrap.style.display="none"; }
  pnb.style.display=(s.publicNotes||editorTxt||s.publicScreenshot||(s.hasStation&&s.stationPhoto))?"":"none";
  setFsClass("pubNoteBox","notes",s);
  setFsClass("pubScreenshotWrap","screenshot",s);
  setFsClass("pubStationPhotoWrap","station",s);

  var bl="";
  for(i=0;i<s.bodies.length;i++){
    var b=s.bodies[i];
    var bStat=getFieldStatus(s,"bodies."+i);
    // Tony, 2026-08-26: the &#8627; arrow prefix meant nothing to him at a
    // glance either (asked "what do these brackets represent"), and if
    // the person who built it can't tell, a visiting traveller never will
    // -- a plain hover tooltip spelling it out, same pattern already used
    // for e.g. the Phantom Star tag's explanation, fixes that without
    // needing a wider/less compact row.
    var moonTip="";
    if(b.moon){
      var pbod=bodyByIndex(s,b.parent);
      moonTip=' title="Moon of '+escAttr(pbod?pbod.name:"the planet above")+'"';
    }
    // Only flagged/disputed get the coloured left-edge marker here, not
    // the routine "edited" status -- Tony, 2026-08-26: on a fully community-
    // edited system every row compares as edited against the procedural
    // baseline, so the green box-shadow on every row (packed tight, no gap)
    // fused into one continuous bar down the whole list, reading as "all
    // these bodies are linked together" rather than 6 separate markers.
    // The system-level "Community edited" tag at the top of the panel
    // already says the system's been touched, so the routine per-row copy
    // of that was redundant clutter here -- flagged/disputed are kept since
    // those flag a genuine live dispute on one specific body (rare, and
    // exactly the kind of thing worth a traveller's attention), not just
    // "differs from a random dice roll".
    var bMark=(bStat==="flagged"||bStat==="disputed")?(" fs-"+bStat):"";
    bl+='<div class="brow'+(b.moon?" isMoon":"")+bMark+'" data-b="'+i+'"'+moonTip+'><span class="bdot" style="background:'+biomePal(b.biome).base+'"></span>'+
        '<span class="bn">'+(b.moon?"&#8627; ":"")+b.name+'</span>'+
        // Water and rings are invented per-planet rolls (hasWater/
        // rollRing()), same as race/economy/conflict, until a traveller
        // submits the real answer via Edit system (b.bodyOverridden) --
        // both simply omitted from this line rather than shown as fact,
        // same strict treatment biome already gets (2026-09-09, Tony:
        // "should also include if has water and rings until again user
        // input") -- dropped the old "(procedural)" tag on rings, since
        // that was a softer half-measure biome never got either.
        '<span class="bb">'+(b.biomeOverridden?(b.biome+(b.subtype?" ("+b.subtype+")":"")):"Unknown")+(b.bodyOverridden&&b.water?" &middot; water":"")+(b.bodyOverridden&&b.ring?" &middot; rings":"")+(b.reliquary?" &middot; reliquary":"")+(b.ruins?" &middot; ruins":"")+'</span></div>';
  }
  document.getElementById("pBodies").innerHTML=bl;
  // 2026-08-30, honest-review fix: this blanket "names are a guess" line
  // used to show unconditionally, even under a fully community-documented
  // system (e.g. Sranch Op10079) whose bodies are ALL real traveller
  // submissions -- directly under the "Community edited" tag saying the
  // opposite. Now it only shows while at least one body in THIS system is
  // still an unconfirmed procedural guess; once every body has a real
  // submitted name (b.nameOverridden), there's nothing left to disclaim.
  var allBodyNamesReal=s.bodies.length>0;
  for(i=0;i<s.bodies.length;i++){ if(!s.bodies[i].nameOverridden){ allBodyNamesReal=false; break; } }
  document.getElementById("pNameDisclaimer").style.display=allBodyNamesReal?"none":"";

  renderSeq(document.getElementById("pSeq"),s.address);
  document.getElementById("pAddr").textContent=s.address;
  document.getElementById("pCoords").textContent="X: "+s.vx+" | Y: "+s.vy+" | Z: "+s.vz;
  document.getElementById("pNote").value=store.notes[skey(s)]||"";
  renderPNoteImg();
  document.getElementById("bMark").classList.toggle("on",!!store.marks[skey(s)]);
  var cb=document.getElementById("bCourse");
  cb.classList.toggle("off",here);
  cb.title = here ? "This is where you are. Select a different star to plot a course to it."
    : "Plot a route from where you are to this system. Draws a line on the map and works out distance, bearing and how many hyperdrive jumps it takes -- solid if it's a single jump, dashed if it needs multiple hops, red-dashed if your current drive can't reach that star's colour at all.";
  setKeypad(s.address);
  updateRings();
}
function showBody(b,s){
  document.getElementById("panel").classList.add("show");
  document.getElementById("pSys").style.display="none";
  document.getElementById("pBody").style.display="";
  document.getElementById("pStars").innerHTML=
    '<span class="starsw" style="background:radial-gradient(circle at 36% 32%,#fff 0%,'+
    biomePal(b.biome).base+' 55%,rgba(0,0,0,0) 84%)"></span>';
  document.getElementById("pName").textContent=b.name;
  var pbod=b.moon?bodyByIndex(s,b.parent):null;
  document.getElementById("pReg").textContent=
    (b.moon?("MOON OF "+(pbod?pbod.name:("INDEX "+b.parent))):(s.giant?"GIANT":"PLANET"))+" · INDEX "+b.index;
  document.getElementById("pCls").textContent=s.name+" // "+s.spectral;
  document.getElementById("pCore").textContent=commas(s.coreLY)+" LY from galaxy centre";
  document.getElementById("icBio").innerHTML=svg(IC_BIOME,biomePal(b.biome).base);
  // 2026-09-08 (Tony/goodguyfree): shows "Unknown" rather than the
  // procedural guess until a real traveller submission exists for this
  // slot -- nobody's reverse-engineered the real biome roll, so unlike
  // name/region/planet-count (the real ported algorithm) this must never
  // read as fact. b.biome itself is untouched and still backs colour/ring-
  // style rendering elsewhere on this same panel.
  // 2026-09-08: Sub type shown alongside Biome (e.g. "Radioactive
  // (Nuclear)") when a traveller has reported one -- Conditions/descriptor
  // still appends after, same as before.
  document.getElementById("bBiome").textContent=(b.biomeOverridden?(b.biome+(b.subtype?" ("+b.subtype+")":"")):"Unknown")+(b.descriptor?" \u2014 "+b.descriptor:"");
  document.getElementById("bTerr").textContent=b.terrain+(b.water?" · has water":" · no water");
  var t=[["",b.moon?"Moon":(s.giant?"Giant":"Planet")]];
  if(!biomePal(b.biome).atmo) t.push(["","No atmosphere"]);
  // Gated on biomeOverridden (2026-09-08) -- "Anomalous" is a direct claim
  // about which biome this is, same reasoning as the Biome line above.
  if(b.biomeOverridden&&(b.biome==="Exotic"||b.biome==="Mega Exotic")) t.push(["bh","Anomalous"]);
  if(b.reliquary) t.push(["hot","Reliquary"]);
  if(b.ruins) t.push(["hot","Ruins"]);
  if(b.bodyOverridden&&b.water) t.push(["hot","Water"]);
  // Same strict treatment as the panel body list and Biome -- a ring
  // nobody's confirmed via Edit system isn't shown at all, not even
  // tagged as a guess (2026-09-09, dropped the old "(procedural)" tag).
  // 2026-08-23: dropped the ring style name (Golden/Icy/Dusty/Ash/Split)
  // from both this tag and the panel body list above -- per Tony/
  // GoodGuysFree, just "rings" if present is all that's needed here (the
  // style name is still shown/used for the actual ring's visual colour on
  // the 3D body itself, just not spelled out in text).
  if(b.bodyOverridden&&b.ring) t.push(["hot","Rings"]);
  if(b.autophage) t.push(["hot","Autophage camp"]);
  if(b.base) t.push(["hot",b.baseName?('Base: "'+b.baseName+'"'):"Has base"]);
  var html="",i;
  for(i=0;i<t.length;i++) html+='<span class="tag '+t[i][0]+'">'+t[i][1]+'</span>';
  document.getElementById("bTags").innerHTML=html;
  document.getElementById("icSent").innerHTML=svg(IC_SENTINEL,sentinelColor(b.sentinel));
  // Same invented-flavour distinction as rings (see the .bb/tags comment
  // above) -- an unconfirmed sentinel guess reads as "<word> Sentinel
  // Activity (procedural)" rather than a confident, unqualified value.
  // "None" only ever gets here via a real traveller submission (the
  // procedural roll always picks a real tier word, never "None" -- see
  // rollSentinelGuess()), so it stays plain "Not reported" either way.
  // "Not shown" (2026-09-02): hides this whole row, matching a real
  // in-game info panel that displays no Sentinel line at all for some
  // planets -- distinct from "None", which stays visible as plain "Not
  // reported" text (unchanged, so no previously-saved data changes look).
  if(b.sentinel==="Not shown"){
    document.getElementById("bSentRow").style.display="none";
  }else{
    document.getElementById("bSentRow").style.display="";
    document.getElementById("bSent").textContent=(b.sentinel&&b.sentinel!=="None")?(b.sentinel+" Sentinel Activity"+(b.sentinelOverridden?"":" (procedural)")):"Not reported";
  }
  document.getElementById("icRes").innerHTML=svg(IC_RES,biomePal(b.biome).base);
  var bd=biomePal(b.biome), rlist=[];
  if(bd.res) for(i=0;i<bd.res.length;i++) rlist.push(bd.res[i]);
  var stel=STELLAR_EL[s.starTypes[0]];
  if(stel) rlist.push(stel);
  if(b.resUni) for(i=0;i<b.resUni.length;i++) rlist.push(b.resUni[i]);
  var rhtml="";
  for(i=0;i<rlist.length;i++) rhtml+='<span class="tag">'+rlist[i]+'</span>';
  document.getElementById("bRes").innerHTML=rhtml||'<span class="tag">Varies &mdash; unconfirmed</span>';
  /* the 4 player-submitted resource groups only take up space once someone
     has actually reported something in them -- most bodies won't have any
     of this yet, so each row hides itself rather than showing empty */
  function resGroup(key,rowId,tagId,iconId,icon){
    var arr=b[key]||[], row=document.getElementById(rowId);
    if(!arr.length){ row.style.display="none"; return; }
    row.style.display="";
    document.getElementById(iconId).innerHTML=svg(icon,biomePal(b.biome).base);
    var h="",j; for(j=0;j<arr.length;j++) h+='<span class="tag">'+arr[j]+'</span>';
    document.getElementById(tagId).innerHTML=h;
  }
  resGroup("flora","bFloraRow","bFlora","icFlora",IC_FLORA);
  resGroup("fauna","bFaunaRow","bFauna","icFauna",IC_FAUNA);
  resGroup("minerals","bMineralRow","bMineral","icMineral",IC_MINERAL);
  resGroup("salvage","bSalvageRow","bSalvage","icSalvage",IC_SALVAGE);
  resGroup("fossils","bFossilRow","bFossil","icFossil",IC_FOSSIL);
  var ba=formatAddress(b.index,s.idx,s.vx,s.vy,s.vz);
  renderSeq(document.getElementById("pSeq"),ba);
  document.getElementById("pAddr").textContent=ba;
  setKeypad(ba);
}

/* ============ camera ============ */
var cam={theta:0.7,phi:0.62,dist:330,target:new THREE.Vector3(0,0,0)};
var DIST={galaxy:[30,1200],local:[5,260],system:[9,110]};
var flyPos=new THREE.Vector3(0,6,40), flyYaw=0, flyPitch=0;
var _d=new THREE.Vector3();
/* point the fly camera at a world position — never guess the yaw */
function aimFly(target){
  _d.subVectors(target,flyPos);
  if(_d.lengthSq()<1e-8){ flyYaw=0; flyPitch=0; return; }
  _d.normalize();
  flyYaw=Math.atan2(-_d.x,-_d.z);
  flyPitch=Math.asin(Math.max(-1,Math.min(1,_d.y)));
}
function applyCam(){
  if(ctrl==="fly"){
    camera.position.copy(flyPos);
    camera.rotation.set(0,0,0);
    camera.rotateY(flyYaw); camera.rotateX(flyPitch);
    return;
  }
  var lim=DIST[mode];
  if(cam.dist<lim[0]) cam.dist=lim[0];
  if(cam.dist>lim[1]) cam.dist=lim[1];
  if(cam.phi<0.10) cam.phi=0.10;
  if(cam.phi>Math.PI-0.10) cam.phi=Math.PI-0.10;
  var sp=Math.sin(cam.phi), cp=Math.cos(cam.phi);
  camera.position.set(cam.target.x+cam.dist*sp*Math.sin(cam.theta),
    cam.target.y+cam.dist*cp, cam.target.z+cam.dist*sp*Math.cos(cam.theta));
  camera.lookAt(cam.target);
}
var keys={};
window.addEventListener("keydown",function(e){
  if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.tagName==="SELECT") return;
  keys[e.code]=true;
  /* Ctrl+Shift+F is the hidden FPS/debug-stats hotkey (Session Notes,
     2026-08-09 -- "gate behind a keyboard combo... rather than a visible
     toggle", so regular visitors never see it). Checked and returned first
     so it can't ALSO fire the plain "F" Filters-panel shortcut below on the
     very same keypress. */
  if(e.ctrlKey&&e.shiftKey&&e.code==="KeyF"){ e.preventDefault(); toggleStats(); return; }
  if(e.code==="KeyH") toggleLabels();
  if(e.code==="KeyF") toggleFold("filt","fHeadLabel","Filters","bFiltMin");
  if(e.code==="KeyG") toggleGrid();
});
function toggleStats(){
  document.getElementById("stats").classList.toggle("show");
  document.documentElement.classList.toggle("debug-on");
}
/* Long-press the small galaxy icon (top-left HUD, next to "Galactic Core...
   LY") = the touch equivalent of Ctrl+Shift+F -- phones have no keyboard to
   reach the debug hotkey at all. Originally bound to the title text instead,
   but that triggered Android Chrome's own native long-press context menu
   (Copy/Share/Select all/Web search) regardless of user-select/touch-callout
   CSS -- moved here, to a small icon rather than a text run, and this
   version calls preventDefault() on pointerdown to actually suppress that
   native behaviour rather than just styling around it. Also a better spot
   than the title on its own merits: this icon is visible in every view mode
   (Galaxy/Local/System), not just Galaxy view like the text badge above it.
   Uses Pointer Events (unifies touch/mouse/pen, so this also works by
   long-pressing with a mouse on desktop) with a movement-cancel tolerance so
   a drag/scroll starting on the icon doesn't accidentally trigger it.
   Deliberately no visual hint this is interactive -- same "regular visitors
   never see it" intent as the hotkey. #galIcon itself has pointer-events:auto
   set in CSS to poke a hole through its parent #galHud's own
   pointer-events:none (deliberate there, so the HUD doesn't block dragging
   the 3D camera underneath it everywhere else). */
(function(){
  var el=document.getElementById("galIcon"), timer=null, sx=0, sy=0, TOL=10, HOLD_MS=1200;
  function start(e){
    if(timer) return;
    e.preventDefault();
    sx=e.clientX; sy=e.clientY;
    timer=setTimeout(function(){
      timer=null;
      toggleStats();
      toast(document.documentElement.classList.contains("debug-on")?"Debug mode on":"Debug mode off");
    },HOLD_MS);
  }
  function cancel(){ if(timer){ clearTimeout(timer); timer=null; } }
  function move(e){
    if(timer&&(Math.abs(e.clientX-sx)>TOL||Math.abs(e.clientY-sy)>TOL)) cancel();
  }
  el.addEventListener("pointerdown",start);
  el.addEventListener("pointerup",cancel);
  el.addEventListener("pointercancel",cancel);
  el.addEventListener("pointerleave",cancel);
  el.addEventListener("pointermove",move);
  el.addEventListener("contextmenu",function(e){ e.preventDefault(); });
})();
window.addEventListener("keyup",function(e){ keys[e.code]=false; });
function flyStep(dt){
  var sp=(keys.ShiftLeft||keys.ShiftRight)?46:18;
  var fwd=new THREE.Vector3(), right=new THREE.Vector3();
  camera.getWorldDirection(fwd);
  right.crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();
  var m=new THREE.Vector3();
  if(keys.KeyW||keys.ArrowUp) m.add(fwd);
  if(keys.KeyS||keys.ArrowDown) m.sub(fwd);
  if(keys.KeyD||keys.ArrowRight) m.add(right);
  if(keys.KeyA||keys.ArrowLeft) m.sub(right);
  if(keys.Space||keys.KeyQ) m.y+=1;
  if(keys.KeyE) m.y-=1;
  if(stick.act){ m.add(fwd.clone().multiplyScalar(-stick.y)); m.add(right.clone().multiplyScalar(stick.x)); }
  if(m.lengthSq()>0){ m.normalize().multiplyScalar(sp*dt); flyPos.add(m); }
  applyCam();
}

var drag=false,lastX=0,lastY=0,pointers={},pinchD=0,moved=0,wasPinch=false;
var stick={act:false,x:0,y:0,id:null,ox:0,oy:0};
canvas.addEventListener("pointerdown",function(e){
  hideHoverPop(); clearCoursePreview();
  pointers[e.pointerId]={x:e.clientX,y:e.clientY};
  if(ctrl==="fly"&&e.pointerType==="touch"&&e.clientX<window.innerWidth*0.4&&!stick.act){
    stick.act=true; stick.id=e.pointerId; stick.ox=e.clientX; stick.oy=e.clientY; stick.x=0; stick.y=0;
    /* Visual thumbstick, 2026-08-30 (Tony: this drag zone already worked,
       it just had zero on-screen indication -- mobile has no WASD keys to
       show, so a real base+knob graphic is the actual "interactive
       choice" equivalent, same as any touch game's virtual stick). Pure
       visual layer, pointer-events:none, never touches stick.x/y itself --
       the existing pointermove/endPointer logic above is unchanged. */
    var jb=document.getElementById("joyBase");
    if(jb){ jb.style.left=stick.ox+"px"; jb.style.top=stick.oy+"px"; jb.style.display="block"; }
    return;
  }
  /* Real bug fixed 2026-08-21 (Tony: "pinch to zoom automatically registers
     ... and creates plotted course"): a 2nd finger landing mid-pinch fires
     its OWN pointerdown, which unconditionally reset moved=0 same as a
     fresh single-finger tap would -- and the pointermove handler's 2-pointer
     (pinch) branch returns early WITHOUT ever touching moved, so it stayed
     frozen at that 0 for the entire pinch gesture. When the fingers lift one
     at a time, endPointer() only fires tryPick() once pointers is back down
     to 0 -- by then drag was still true and moved was still <6, so the very
     last finger to lift looked exactly like a clean single-finger tap and
     picked (then, since 2026-08-17, immediately course-plotted) whatever
     star happened to be under it. wasPinch latches true the moment a real
     2nd simultaneous pointer is seen and only clears once every finger is
     off the glass, so a pinch can never be mistaken for a tap regardless of
     the order the fingers happen to lift in. */
  if(Object.keys(pointers).length>=2) wasPinch=true;
  drag=true; lastX=e.clientX; lastY=e.clientY; moved=0;
  canvas.style.cursor="grabbing"; // 2026-09-13, Tony: grab feedback for an active drag (see canvas#c's resting "grab" in preview.html)
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",function(e){
  if(!pointers[e.pointerId]) return;
  pointers[e.pointerId]={x:e.clientX,y:e.clientY};
  if(stick.act&&e.pointerId===stick.id){
    stick.x=Math.max(-1,Math.min(1,(e.clientX-stick.ox)/70));
    stick.y=Math.max(-1,Math.min(1,(e.clientY-stick.oy)/70));
    var jk=document.getElementById("joyKnob");
    if(jk) jk.style.transform="translate("+(stick.x*28)+"px,"+(stick.y*28)+"px)";
    return;
  }
  var ids=Object.keys(pointers);
  if(ids.length>=2){
    var a=pointers[ids[0]],b=pointers[ids[1]];
    var d=Math.hypot(a.x-b.x,a.y-b.y);
    if(pinchD>0){
      if(ctrl==="fly"){
        /* Fly has no orbit "dist" to scale -- dolly the camera itself along its
           own view direction, same axis the wheel-zoom already uses for fly,
           so a pinch does the same thing a wheel/scroll does. */
        var pf=new THREE.Vector3(); camera.getWorldDirection(pf);
        flyPos.add(pf.multiplyScalar((d-pinchD)*0.6));
      } else {
        cam.dist*=pinchD/d;
      }
      applyCam();
    }
    pinchD=d; return;
  }
  if(!drag) return;
  var dx=e.clientX-lastX, dy=e.clientY-lastY;
  moved+=Math.abs(dx)+Math.abs(dy);
  if(ctrl==="fly"){
    flyYaw-=dx*0.004; flyPitch-=dy*0.004;
    if(flyPitch>1.5) flyPitch=1.5;
    if(flyPitch<-1.5) flyPitch=-1.5;
  } else { cam.theta-=dx*0.005; cam.phi-=dy*0.005; }
  lastX=e.clientX; lastY=e.clientY;
  applyCam();
});
function endPointer(e){
  if(stick.act&&e.pointerId===stick.id){
    stick.act=false; stick.x=0; stick.y=0; stick.id=null;
    var jb=document.getElementById("joyBase"), jk=document.getElementById("joyKnob");
    if(jb) jb.style.display="none";
    if(jk) jk.style.transform="translate(0,0)";
  }
  if(pointers[e.pointerId]) delete pointers[e.pointerId];
  if(Object.keys(pointers).length<2) pinchD=0;
  if(Object.keys(pointers).length===0){
    if(drag&&moved<6&&!wasPinch) tryPick(e.clientX,e.clientY);
    drag=false;
    wasPinch=false;
    canvas.style.cursor="grab"; // back to the resting drag affordance once the gesture ends
  }
}
canvas.addEventListener("pointerup",endPointer);
canvas.addEventListener("pointercancel",endPointer);
canvas.addEventListener("wheel",function(e){
  e.preventDefault();
  if(ctrl==="fly"){
    var f=new THREE.Vector3(); camera.getWorldDirection(f);
    flyPos.add(f.multiplyScalar(e.deltaY>0?-8:8));
  } else cam.dist*=(e.deltaY>0?1.12:0.89);
  applyCam();
},{passive:false});

/* ============ picking ============ */
/* previewSystem(sys) -- open a system's full info panel and silently plot a
   course to it from wherever you currently are, WITHOUT moving you. This is
   exactly what clicking any already-visible star in Local view has done
   since 2026-08-17 (see the comment that used to live right here); factored
   out 2026-09-12 so the new Find results (runFindScan()/renderFindMatches()
   near the bottom of this file) can call the identical, already-verified
   behaviour instead of a second copy that could quietly drift from it. */
function previewSystem(sys){
  updatePanel(sys);
  /* Task 2: "if click on a star and they don't have correct drive, popup
     saying need X to reach Y". Informational only -- still opens the panel
     above so the map stays usable as a reference/planning tool, doesn't
     block browsing. The actual travel actions (Enter system, Jump to a
     plotted course) are the ones that hard-block -- see their own handlers
     below. */
  if(!canReachColor(sys.type)) toast(driveNeededMsg(sys.type));
  /* Tony (2026-08-17): wanted clicking any star to immediately plot a fresh
     course there, replacing whatever was plotted before, instead of the old
     line sitting there until a separate "Set course" click. setCourse()
     already clears+redraws drawCourse() at the start of its own flow, so
     just calling it here on every click naturally replaces the previous
     line rather than leaving it stuck on screen. Skipped only when the pick
     IS your current location -- setCourse() already no-ops with a toast for
     that case, no need to spam it on every click of your own star. */
  if(focusSystem&&sys.address!==focusSystem.address) setCourse(sys,true);
}
var ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
function tryPick(cx,cy){
  var rect=canvas.getBoundingClientRect();
  ndc.x=((cx-rect.left)/rect.width)*2-1;
  ndc.y=-((cy-rect.top)/rect.height)*2+1;
  ray.setFromCamera(ndc,camera);
  if(mode==="local"&&locInstMesh){
    var hits=ray.intersectObject(locInstMesh);
    if(hits.length&&hits[0].instanceId!==undefined&&shown[hits[0].instanceId]){
      previewSystem(shown[hits[0].instanceId]);
    }
  } else if(mode==="system"){
    var bh=ray.intersectObjects(bodyMeshes.concat(starMeshes).concat(featureMeshes).concat(resourceMeshes));
    if(bh.length){
      var ud=bh[0].object.userData;
      if(ud.resourceIcon){ showResourceReport(ud); }
      else {
        hideResourceReport();
        if(ud.star||ud.feature) updatePanel(ud.sys);
        else showBody(ud.body,ud.sys);
      }
    } else {
      hideResourceReport();
    }
  } else if(mode==="galaxy"){
    /* 2026-08-27, Tony: click the "you are here" marker to jump straight
       into Local view at your current position, instead of only being able
       to switch view modes via the toolbar. Raycasts markerHitArea (the
       larger invisible click target, see its own comment near "var
       marker=" above), not the thin visible ring itself. focusSystem is
       always set by this point (boot always jumps somewhere, real or
       anonymous), so this is safe to fire unconditionally on a hit. */
    if(atlasOn&&atlasHitAreas.length){
      var atlasHit=ray.intersectObjects(atlasHitAreas);
      if(atlasHit.length){
        var atlasUrl=atlasHit[0].object.parent.userData.url;
        if(atlasUrl) window.open(atlasUrl,"_blank");
        return;
      }
    }
    if(ray.intersectObject(markerHitArea).length && focusSystem){
      setMode("local");
      updatePanel(focusSystem);
    }
  }
}

/* ============ Starmap Analysis Report popup (2026-09-09) ============
   Click target for the resource/signal diamond icons built by
   buildResourceIcon() above -- see tryPick()'s new resourceMeshes branch.
   A single fixed bottom-dock card rather than one pinned to the icon's
   own screen position (which would need a per-frame 3D-to-2D projection
   while open, same as the hover popup does for Local view) -- kept
   simple for this first pass; flagged to Tony as an easy follow-up if he
   wants it pinned to the icon instead. */
function showResourceReport(ud){
  document.getElementById("rrName").textContent=ud.name.toUpperCase();
  document.getElementById("rrCat").textContent=ud.catLabel;
  document.getElementById("rrSignal").textContent=ud.signalType+".";
  document.getElementById("rrRoute").textContent=ud.route;
  var card=document.getElementById("resReport");
  card.style.display="";
  card._ud=ud;
}
function hideResourceReport(){
  document.getElementById("resReport").style.display="none";
}
document.getElementById("rrClose").addEventListener("click",hideResourceReport);
// Decorative-only, matching this card's own "Route recommendation" flavour
// text (see the RES_ICON_* header comment) -- not wired to any persisted
// waypoint/bookmark system, just a toast acknowledging the action, same
// spirit as the rest of this card being atmosphere rather than a real
// gameplay mechanic.
document.getElementById("rrMarker").addEventListener("click",function(){
  var ud=document.getElementById("resReport")._ud;
  toast(ud?("Marker set \u2014 "+ud.name.toUpperCase()):"Marker set");
});

/* ============ hover popup + course preview (Session 38) ============
   Two independent hover behaviours, both mouse-only (matchMedia hover:hover
   gate) -- touch has no hover state at all, and tapping a star already
   opens the full info panel with the same data, so no separate touch path
   is built here, same reasoning already used for the accessibility popup.
   Throttled via _hoverRayT so the raycast against locInstMesh only runs a
   handful of times a second, not on every pointermove event. */
var _hoverCapable=window.matchMedia && window.matchMedia("(hover:hover)").matches;
/* 2026-08-29, Tony: galaxy spins too fast to click an Atlas diamond while
   it's orbiting past. Slowing the whole galaxy's rotation while the mouse
   is over the canvas (not stopping it -- still reads as "orbiting", just
   gives the pointer a real chance to land on a moving target) rather than
   only slowing near a diamond specifically, since the same problem applies
   to the "you are here" ring too and any future clickable marker. */
var galaxyHovered=false;
function handleHoverRay(e){
  galaxyHovered=true;
  if(!_hoverCapable||e.pointerType!=="mouse"||drag) return;
  /* 2026-08-27: cursor-pointer affordance for the clickable galaxy-view
     marker (see tryPick()'s galaxy branch) -- nothing else on this canvas
     gets a cursor change (stars in Local view rely on the hover popup
     itself as the affordance), but the marker has no equivalent popup, so
     without this there's no visual hint it's clickable at all. Kept in
     this same function/throttle rather than a separate listener since it's
     the same kind of "raycast on hover, mouse only" concern. */
  if(mode==="galaxy"){
    var nowG=performance.now();
    if(nowG-_hoverRayT<70) return; _hoverRayT=nowG;
    var rectG=canvas.getBoundingClientRect();
    ndc.x=((e.clientX-rectG.left)/rectG.width)*2-1;
    ndc.y=-((e.clientY-rectG.top)/rectG.height)*2+1;
    ray.setFromCamera(ndc,camera);
    canvas.style.cursor=(ray.intersectObject(markerHitArea).length||(atlasOn&&atlasHitAreas.length&&ray.intersectObjects(atlasHitAreas).length))?"pointer":"";
    return;
  }
  canvas.style.cursor="";
  /* System-view hover cards (2026-09-13, Phase 2): System view has no
     instanced mesh to raycast (Local's locInstMesh trick doesn't apply --
     every star/feature/body here is its own real Object3D), so this
     raycasts the same three arrays tryPick()'s system branch already
     raycasts on click (bodyMeshes/starMeshes/featureMeshes -- resourceMeshes
     deliberately left out, those already have their own click-only report
     card). Same 70ms throttle as the other two branches. */
  if(mode==="system"){
    var nowSys=performance.now();
    if(nowSys-_hoverRayT<70) return; _hoverRayT=nowSys;
    var rectSys=canvas.getBoundingClientRect();
    ndc.x=((e.clientX-rectSys.left)/rectSys.width)*2-1;
    ndc.y=-((e.clientY-rectSys.top)/rectSys.height)*2+1;
    ray.setFromCamera(ndc,camera);
    var hitsSys=ray.intersectObjects(bodyMeshes.concat(starMeshes).concat(featureMeshes));
    if(hitsSys.length) showSystemHoverPop(hitsSys[0].object.userData,e.clientX,e.clientY);
    else hideHoverPop();
    return;
  }
  if(mode!=="local"||!locInstMesh) return;
  var now=performance.now();
  if(now-_hoverRayT<70) return; _hoverRayT=now;
  var rect=canvas.getBoundingClientRect();
  ndc.x=((e.clientX-rect.left)/rect.width)*2-1;
  ndc.y=-((e.clientY-rect.top)/rect.height)*2+1;
  ray.setFromCamera(ndc,camera);
  var hits=ray.intersectObject(locInstMesh);
  if(hits.length&&hits[0].instanceId!==undefined&&shown[hits[0].instanceId]){
    var hs=shown[hits[0].instanceId];
    showHoverPop(hs,e.clientX,e.clientY);
    updateCoursePreviewHover(hs);
  } else {
    hideHoverPop();
    clearCoursePreview();
  }
}
/* Declutters by zoom exactly like updateLabels() already does off cam.dist
   (range 5-260 in Local) -- name only while zoomed out, full stats (address
   class/suffix, race/economy/conflict) once zoomed in past HOVER_ZOOM_FULL. */
var HOVER_ZOOM_FULL=45;
function showHoverPop(s,cx,cy){
  hoverSys=s;
  var pop=document.getElementById("hoverPop");
  var suffixParts=[]; if(s.water) suffixParts.push("Water"); if(s.dissonant) suffixParts.push("Dissonant");
  var suffix=suffixParts.length?" // "+suffixParts.join(" "):"";
  var full=cam.dist<=HOVER_ZOOM_FULL;
  var html='<div class="hpName">'+s.name+'</div>';
  if(full){
    html+='<div class="hpCls">'+commas(distanceLY(s))+' LY // '+s.spectral+suffix+'</div>';
    /* Reuses the exact same icon calls the full info panel already uses
       (raceIcon/econIcon/IC_CONFLICT via svg()) PLUS the real Sell/Buy/
       strength line and the conflict-tier word, matching the real game's
       own hover popup -- Tony's screenshot (2026-08-17) showed race/
       economy/conflict as full labelled rows with real text visible, not
       icons hidden behind a hover tooltip like the first pass here had.
       Reuses the exact same s.sell/s.buy/s.econDesc/s.conflict fields the
       full info panel already displays at pEcoSub/pCon -- no new data. */
    html+='<div class="hpDetail">'+
      '<div class="hpRow">'+raceIcon(s.race)+'<span class="hpLbl">'+s.race+'</span></div>'+
      '<div class="hpRow">'+econIcon(s.econType)+'<span class="hpLbl">'+(s.uncharted?"Uncharted":s.econName)+'</span></div>'+
      (s.uncharted?'':'<div class="hpSub">Sell: '+s.sell+'% Buy: '+s.buy+'% // '+s.econDesc+'</div>')+
      (s.conflict==="Not Available"?'':'<div class="hpRow">'+svg(IC_CONFLICT,CONFLICT_COL[s.conTier])+conBadge(s)+'<span class="hpLbl">'+s.conflict+'</span></div>')+
      '</div>';
  }
  pop.innerHTML=html;
  pop.style.left=cx+"px"; pop.style.top=cy+"px";
  pop.style.display="block";
  hoverPopVisible=true;
}
function hideHoverPop(){
  if(!hoverPopVisible) return;
  document.getElementById("hoverPop").style.display="none";
  hoverPopVisible=false; hoverSys=null;
}
/* System-view hover cards (2026-09-13, Phase 2) -- reuses the exact same
   #hoverPop element/CSS Local's showHoverPop() already uses (hpName/hpCls
   classes), just fed different content per object type since System view's
   userData shapes differ from Local's system-summary objects: a body carries
   {body,sys}, a star/feature carries {star|feature,name,sys}. Deliberately
   simpler than Local's full hover card (no zoom-gated "full" detail tier) --
   clicking any of these already opens the real info panel/body card via
   tryPick()'s system branch, so this is just a lightweight "what's this"
   label, not a second copy of the full panel. */
function showSystemHoverPop(ud,cx,cy){
  var pop=document.getElementById("hoverPop"),html;
  if(ud.body){
    /* Enriched 2026-09-13 (Tony live feedback: "not a lot of information
       in planet tab") -- was just name + biome/water/ring folded into one
       line. Now mirrors the same fields showBody()'s full click-through
       panel already shows (biome/subtype -- "Unknown" until a traveller's
       confirmed it, same strict rule as the panel -- terrain, water, and
       any of the panel's own tag pills that apply), just condensed to a
       couple of lines instead of the panel's full layout. */
    var b=ud.body;
    var biomeTxt=b.biomeOverridden?(b.biome+(b.subtype?" ("+b.subtype+")":"")):"Unknown";
    var tags=[];
    if(b.bodyOverridden&&b.ring) tags.push("Ring");
    if(b.base) tags.push(b.baseName?('Base: "'+b.baseName+'"'):"Base");
    if(b.ruins) tags.push("Ruins");
    if(b.reliquary) tags.push("Reliquary");
    html='<div class="hpName">'+(b.moon?"↳ ":"")+b.name+'</div>'+
      '<div class="hpCls">'+biomeTxt+'</div>'+
      '<div class="hpSub">'+b.terrain+(b.water?" // Water":" // No water")+'</div>'+
      (tags.length?'<div class="hpSub">'+tags.join(" // ")+'</div>':'')+
      // Resources line (2026-09-13, Tony: compared a real in-game discovery
      // popup showing its resource list against this card showing none) --
      // b.resUni is the exact same combined list the info panel's own
      // "Resources" row already shows (biome-typical + stellar element +
      // any traveller-submitted Common resources, see updatePanel()), so
      // this reuses it rather than inventing a second resource computation.
      // Capped at 3 so the hover stays a quick glance, not a second panel;
      // omitted entirely when nothing's known yet, same as the tags line.
      (b.resUni&&b.resUni.length?'<div class="hpSub">'+b.resUni.slice(0,3).join(", ")+'</div>':'');
  } else if(ud.star){
    /* Enriched 2026-09-13 (Tony live feedback: "star not much information
       again") -- reuses the exact same race/economy/conflict block Local's
       showHoverPop() already builds for its "full" tier (same sy.race/
       econType/econName/sell/buy/econDesc/conflict/conTier fields -- a
       System-view star's ud.sys is the very same system object), just
       always shown rather than zoom-gated the way Local's is, since
       System view has no equivalent of Local's cam.dist to gate on. */
    var sy=ud.sys,spec=(sy&&sy.spectral)?sy.spectral:"";
    html='<div class="hpName">★ '+ud.name+'</div>'+(spec?'<div class="hpCls">'+spec+'</div>':'');
    if(sy){
      html+='<div class="hpDetail">'+
        '<div class="hpRow">'+raceIcon(sy.race)+'<span class="hpLbl">'+sy.race+'</span></div>'+
        '<div class="hpRow">'+econIcon(sy.econType)+'<span class="hpLbl">'+(sy.uncharted?"Uncharted":sy.econName)+'</span></div>'+
        (sy.uncharted?'':'<div class="hpSub">Sell: '+sy.sell+'% Buy: '+sy.buy+'% // '+sy.econDesc+'</div>')+
        (sy.conflict==="Not Available"?'':'<div class="hpRow">'+svg(IC_CONFLICT,CONFLICT_COL[sy.conTier])+conBadge(sy)+'<span class="hpLbl">'+sy.conflict+'</span></div>')+
        '</div>';
    }
  } else {
    html='<div class="hpName">'+ud.name+'</div>';
  }
  pop.innerHTML=html;
  pop.style.left=cx+"px"; pop.style.top=cy+"px";
  pop.style.display="block";
  hoverPopVisible=true;
}
/* Corrected 2026-08-17 after Tony's live feedback: his original "only
   during Set course" answer was interpreted as "only once a panel is
   already open", but what he actually wants matches the real game --
   hovering ANY star shows the preview line immediately, before you've
   clicked/selected anything, as long as you're actually somewhere
   (focusSystem exists). No panel-open gate anymore. Still deliberately a
   straight two-point line (real distance vs current hyperdrive range), NOT
   a full findRoute() multi-hop search -- running the real pathfinder on
   every hover frame would be far too expensive. The full, real multi-hop
   route is still only ever computed when Set course is actually clicked. */
function updateCoursePreviewHover(s){
  if(!focusSystem||!s||s.address===focusSystem.address||
     (courseTarget&&s.address===courseTarget.address)){
    if(previewRouteTimer){ clearTimeout(previewRouteTimer); previewRouteTimer=null; }
    previewPendingAddr=null;
    clearCoursePreview(); return;
  }
  if(previewTargetAddr===s.address||previewPendingAddr===s.address) return; /* already showing, or already queued, for this one */
  if(previewRouteTimer){ clearTimeout(previewRouteTimer); previewRouteTimer=null; }
  previewPendingAddr=s.address;
  var range=parseInt(document.getElementById("fHyper").value,10);
  var reachable=canReachColor(s.type);
  var color=reachable?0xf0a500:0xe24b4a;
  var fromSys=focusSystem;
  /* Debounced, not instant -- findRoute() is cheap for a single call but
     a fast mouse sweep across a dense cluster can land on many different
     stars per second, and each one is a real (bounded, but non-trivial)
     hop-by-hop search. Waiting ~140ms means only the star actually settled
     on gets routed, not every one glanced over along the way. */
  previewRouteTimer=setTimeout(function(){
    previewRouteTimer=null;
    if(previewPendingAddr!==s.address||!focusSystem||focusSystem.address!==fromSys.address) return; /* hover moved on, or location changed, before this fired */
    var rt=findRoute(fromSys,s,range,true);
    var pts=rt.path.map(function(wp){ return {x:wp.px,y:wp.py,z:wp.pz}; });
    var solid=reachable&&(pts.length-1===1);
    startPreviewLine(s,{solid:solid,color:color},pts);
  },140);
}
function startPreviewLine(toSys,style,points){
  clearCoursePreview();
  previewTargetAddr=toSys.address;
  previewPoints=points;
  previewPrefix=[0];
  for(var i=0;i<points.length-1;i++){
    var a=points[i],b=points[i+1];
    var d=Math.sqrt((b.x-a.x)*(b.x-a.x)+(b.y-a.y)*(b.y-a.y)+(b.z-a.z)*(b.z-a.z));
    previewPrefix.push(previewPrefix[previewPrefix.length-1]+d);
  }
  previewTotalLen=previewPrefix[previewPrefix.length-1];
  previewStyle=style;
  var endPt=points[points.length-1];
  hoverRing.position.set(endPt.x,endPt.y,endPt.z);
  hoverRing.material.color.setHex(style.color);
  hoverRing.material.opacity=0; hoverRing.visible=true;
  previewAnimT=0; previewGrowing=true; previewHoldT=0;
}
function clearCoursePreview(){
  if(previewRouteTimer){ clearTimeout(previewRouteTimer); previewRouteTimer=null; }
  previewPendingAddr=null;
  if(previewLine){ localGroup.remove(previewLine); previewLine.geometry.dispose(); previewLine.material.dispose(); previewLine=null; }
  hoverRing.visible=false;
  previewTargetAddr=null; previewGrowing=false; previewHoldT=0;
  previewPoints=null; previewPrefix=null; previewTotalLen=0; previewStyle=null;
}
/* Called every frame from animate() -- cheap no-op unless a preview is
   active. Per Tony's ask ("expanding needs to be continuous... then start
   again from current, looping till choice click") this is NOT a one-shot
   animation -- it loops: ease-out grow from the current system out to the
   hovered candidate, ~300ms holding fully extended, then an instant reset
   back to zero-length at the source and the grow phase begins again.
   Repeats indefinitely while the same candidate stays hovered; changing the
   hover target (startPreviewLine) or clearing it (clearCoursePreview, on
   mouse-leave or a click) is what actually stops the loop.
   Session 39 (2026-08-18): the grow now walks along previewPoints, the
   REAL routed waypoint chain from findRoute() (via _polylineLerp, same
   cumulative-arc-length approach the committed course line already uses
   in drawCourse()) instead of a straight line from source to destination
   -- so the animation visibly bends through each real intermediate star
   exactly like the committed line does, not a single diagonal cutting
   across open space. The ribbon is rebuilt every active frame (cheap --
   at most a handful of segments) since both its length AND its
   camera-facing width change together every frame. */
function updatePreviewAnim(dt){
  if(!previewPoints||!previewPrefix||!previewStyle) return;
  var t;
  if(previewGrowing){
    previewAnimT+=dt/1.4; /* half speed again per Tony's ask -- was 0.7, 0.35 originally */
    if(previewAnimT>=1){ previewAnimT=1; previewGrowing=false; previewHoldT=0; }
    t=1-Math.pow(1-previewAnimT,3);
    hoverRing.material.opacity=0.85*t;
  }else{
    previewHoldT+=dt;
    if(previewHoldT>=0.3){
      previewAnimT=0; previewGrowing=true; t=0;
      hoverRing.material.opacity=0;
    }else{
      t=1;
    }
  }
  var tipDist=previewTotalLen*t;
  var tip=_polylineLerp(previewPoints,previewPrefix,tipDist);
  /* Every real waypoint the grow has already passed, plus the interpolated
     tip as the final point -- gives _dashSegments() a genuine (partial)
     bent polyline to draw, not just two endpoints. */
  var grownPts=[previewPoints[0]];
  for(var i=1;i<previewPoints.length;i++){
    if(previewPrefix[i]<=tipDist) grownPts.push(previewPoints[i]);
    else { grownPts.push(tip); break; }
  }
  if(grownPts.length<2) grownPts.push(tip);
  if(previewLine){ localGroup.remove(previewLine); previewLine.geometry.dispose(); previewLine.material.dispose(); }
  var segs=_dashSegments(grownPts,2.0,1.4,previewStyle.solid);
  previewLine=_buildRibbonMesh(segs,previewStyle.color,previewStyle.solid?0.75:0.8,COURSE_LINE_PX);
  localGroup.add(previewLine);
}
canvas.addEventListener("pointermove",handleHoverRay);
canvas.addEventListener("pointerleave",function(){ galaxyHovered=false; hideHoverPop(); clearCoursePreview(); });

/* ============ labels ============ */
var labelEls=[], LBL_MAX=28;
/* Cached copy of the top toolbar's real rendered height, kept in sync by
   syncTopOffset() (same measurement it already takes to set the --top-h CSS
   var) so updateLabels() -- which runs every single animation frame -- never
   has to do its own getComputedStyle/getBoundingClientRect read on #top just
   to know where the toolbar's bottom edge is. */
var topBarH=60;
function initLabels(){
  var box=document.getElementById("labels"),i;
  for(i=0;i<LBL_MAX;i++){
    var d=document.createElement("div");
    d.className="lbl"; d.style.display="none";
    box.appendChild(d); labelEls.push(d);
  }
}
function hideLabels(){ for(var i=0;i<labelEls.length;i++) labelEls[i].style.display="none"; }
function toggleLabels(){
  labelsOn=!labelsOn;
  document.getElementById("bLbl").classList.toggle("on",labelsOn);
  if(!labelsOn) hideLabels();
}

/* Galactic Atlas cluster badges (2026-08-29, Tony: "the hello games map has
   numbers", checked galacticatlas.nomanssky.com's own mobile-width map
   directly -- it collapses nearby POIs into one diamond with a count, only
   splitting into separate diamonds once you're zoomed in close enough that
   they no longer overlap on screen. This reproduces that: every atlas
   diamond's on-screen position is recomputed each frame (same
   project()-to-pixels technique as updateLabels() above), greedily grouped
   with any other diamond within 26px, and any group bigger than one hides
   its individual 3D diamonds (Three.js raycasting already skips
   invisible objects, so this doubles as removing them as click targets)
   in favour of one DOM badge showing the count. A lone diamond is left
   exactly as before -- still the real clickable 3D marker, still opens its
   Atlas page directly. Pooled divs, same reuse pattern as labelEls, so a
   badge is available for reassignment every frame rather than the DOM
   being rebuilt from scratch. */
var atlasBadgeEls=[], ATLAS_BADGE_MAX=30, atlasBadgeData=[];
function initAtlasBadges(){
  var box=document.getElementById("atlasBadges"),i;
  for(i=0;i<ATLAS_BADGE_MAX;i++){
    var d=document.createElement("div");
    d.className="atlasBadge"; d.style.display="none"; d.dataset.i=i;
    d.appendChild(document.createElement("span"));
    box.appendChild(d); atlasBadgeEls.push(d); atlasBadgeData.push(null);
  }
  box.addEventListener("click",function(e){
    var el=e.target.closest(".atlasBadge");
    if(!el) return;
    var data=atlasBadgeData[parseInt(el.dataset.i,10)];
    if(!data) return;
    cam.target.copy(data.pos);
    cam.dist*=0.5;
    applyCam();
  });
}
function hideAtlasBadges(){ for(var i=0;i<atlasBadgeEls.length;i++) atlasBadgeEls[i].style.display="none"; }
function updateAtlasOverlay(){
  if(!atlasOn||mode!=="galaxy"||GALAXY!==0||!atlasMarkers.length){ hideAtlasBadges(); return; }
  var w=window.innerWidth,h=window.innerHeight,i,pts=[];
  for(i=0;i<atlasMarkers.length;i++){
    var am=atlasMarkers[i];
    am.getWorldPosition(_w);
    _v.copy(_w).project(camera);
    if(_v.z>1||_v.x<-1.15||_v.x>1.15||_v.y<-1.15||_v.y>1.15){ am.visible=false; continue; }
    pts.push({i:i,sx:(_v.x*0.5+0.5)*w,sy:(-_v.y*0.5+0.5)*h,wx:_w.x,wy:_w.y,wz:_w.z});
  }
  var used=[],clusters=[],a,b;
  for(a=0;a<pts.length;a++){
    if(used[a]) continue;
    var group=[pts[a]]; used[a]=true;
    for(b=a+1;b<pts.length;b++){
      if(used[b]) continue;
      if(Math.hypot(pts[a].sx-pts[b].sx,pts[a].sy-pts[b].sy)<26){ group.push(pts[b]); used[b]=true; }
    }
    clusters.push(group);
  }
  var badgeI=0;
  for(var c=0;c<clusters.length;c++){
    var grp=clusters[c];
    if(grp.length===1){ atlasMarkers[grp[0].i].visible=true; continue; }
    var sx=0,sy=0,wx=0,wy=0,wz=0,k;
    for(k=0;k<grp.length;k++){
      sx+=grp[k].sx; sy+=grp[k].sy; wx+=grp[k].wx; wy+=grp[k].wy; wz+=grp[k].wz;
      atlasMarkers[grp[k].i].visible=false;
    }
    sx/=grp.length; sy/=grp.length; wx/=grp.length; wy/=grp.length; wz/=grp.length;
    if(badgeI<ATLAS_BADGE_MAX){
      var el=atlasBadgeEls[badgeI];
      el.style.display="flex"; el.style.left=sx+"px"; el.style.top=sy+"px";
      el.firstChild.textContent=grp.length;
      atlasBadgeData[badgeI]={pos:new THREE.Vector3(wx,wy,wz)};
      badgeI++;
    }
  }
  for(;badgeI<ATLAS_BADGE_MAX;badgeI++) atlasBadgeEls[badgeI].style.display="none";
}
var _v=new THREE.Vector3(), _w=new THREE.Vector3();
function updateLabels(){
  if(!labelsOn||mode==="galaxy"){ hideLabels(); return; }
  var cands=[],i;
  if(mode==="local"){
    for(i=0;i<shown.length;i++){
      var s=shown[i];
      var dx=s.px-camera.position.x, dy=s.py-camera.position.y, dz=s.pz-camera.position.z;
      cands.push({x:s.px,y:s.py,z:s.pz,d:dx*dx+dy*dy+dz*dz,
        t:(s.blackHole?"◉ ":(s.atlas?"◈ ":(s.phantom==="shadow"?"◇ ":(s.phantom==="phantom"?"◌ ":""))))+s.name});
    }
  } else {
    for(i=0;i<starMeshes.length;i++){
      starMeshes[i].getWorldPosition(_w);
      cands.push({x:_w.x,y:_w.y,z:_w.z,d:0,t:"★ "+starMeshes[i].userData.name});
    }
    for(i=0;i<featureMeshes.length;i++){
      featureMeshes[i].getWorldPosition(_w);
      cands.push({x:_w.x,y:_w.y,z:_w.z,d:0,t:(featureMeshes[i].userData.stationCard?"⛶ ":(featureMeshes[i].userData.name==="Black hole"?"◉ ":"◈ "))+featureMeshes[i].userData.name});
    }
    for(i=0;i<bodyMeshes.length;i++){
      bodyMeshes[i].getWorldPosition(_w);
      var b=bodyMeshes[i].userData.body;
      cands.push({x:_w.x,y:_w.y,z:_w.z,d:1,t:(b.moon?"↳ ":"")+b.name});
    }
  }
  cands.sort(function(a,b){ return a.d-b.d; });
  var w=window.innerWidth,h=window.innerHeight;
  /* A moon (or any two bodies close in-frame) projects to nearly the same
     screen point as its parent planet, so two independently-placed labels can
     land right on top of each other and read as one run-together mess (seen
     live: a planet + its moon rendered as "Vylo-XI, Hucoreth" instead of two
     legible tags). Each label already floats above its anchor point via CSS
     (translate -150% on Y), so resolving a collision is just: whichever label
     is lower-priority (farther from camera, since cands is sorted nearest
     first) gets pushed further up in fixed steps until it clears every label
     already placed this frame. Cheap -- LBL_MAX caps this at 28 labels, so at
     most ~28*28 comparisons per frame. */
  /* Collision thresholds below were tuned against the default 9.5px label
     size -- the accessibility font-size setting now scales .lbl's actual
     CSS size (see the --ui-zoom rule), so the same pixel gaps have to scale
     with it too, or XL text would still be allowed to overlap by the old
     default-size thresholds. a11y.fs is the same multiplier driving
     --ui-zoom, read directly rather than round-tripping through a style
     read every frame. */
  var lz=(typeof a11y!=="undefined"&&a11y.fs)?a11y.fs:1;
  var placed=[];
  for(i=0;i<LBL_MAX;i++){
    var el=labelEls[i];
    if(i>=cands.length){ el.style.display="none"; continue; }
    var cd=cands[i];
    _v.set(cd.x,cd.y,cd.z).project(camera);
    if(_v.z>1||_v.x<-1||_v.x>1||_v.y<-1||_v.y>1){ el.style.display="none"; continue; }
    el.style.display="block";
    var lx=(_v.x*0.5+0.5)*w, ly=(-_v.y*0.5+0.5)*h;
    var ly0=ly, fits=true;
    var moved=true, guard=0;
    while(moved && guard<20){
      moved=false; guard++;
      for(var k=0;k<placed.length;k++){
        if(Math.abs(placed[k].x-lx)<64*lz && Math.abs(placed[k].y-ly)<16*lz){
          ly=placed[k].y-16*lz; moved=true;
        }
      }
      /* Zoomed far out, many stars project into the same small screen area at
         once (not just an occasional moon+planet pair) -- the old loop kept
         nudging every conflicting label up 16px regardless of how far that
         pushed it from its real star, producing a stacked column of names
         disconnected from the dots they're meant to label. Bail out and hide
         the label instead of drifting it more than ~48px from its true spot;
         a missing label at extreme zoom-out is less confusing than a wrong one. */
      if(ly0-ly>48*lz){ fits=false; break; }
    }
    if(!fits){ el.style.display="none"; continue; }
    /* Site review 2026-09-13: "Star labels render behind the top toolbar" --
       reproduced jumping RANDOM onto systems with neighbours near the top
       edge (e.g. "Bukyun"). #labels sits at z-index:15, #top at z-index:30
       (deliberately, so the toolbar's own buttons stay clickable above
       everything), so a label anchored near the top of the screen was never
       actually broken -- it was rendering exactly where it should, just
       behind an opaque toolbar sitting on top of it, cutting it off
       mid-glyph instead of showing cleanly. Each label also floats ABOVE
       its own anchor point (.lbl's -150% Y translate, ~1.5 line-heights),
       so the true cutoff line is some way below topBarH, not right at it --
       36*lz reproduces that same translate distance at the current
       accessibility text-size multiplier. Hiding here (rather than
       clamping ly down to fit) matches the bail-out just above: a label
       that's missing near the toolbar reads better than one detached from
       its real star. */
    if(ly-36*lz<topBarH){ el.style.display="none"; continue; }
    placed.push({x:lx,y:ly});
    el.style.left=lx+"px";
    el.style.top=ly+"px";
    el.textContent=cd.t;
  }
}

/* ============ keypad ============ */
var keySeq="";
function buildKeypad(){
  var g=document.getElementById("kGrid"),html="",i;
  for(i=0;i<16;i++){
    var ch=HEXD[i];
    html+='<button class="kbtn" data-h="'+ch+'" title="'+ch+'"><img alt="'+ch+'" src="'+glyphSrc(ch)+'"></button>';
  }
  g.innerHTML=html;
  g.addEventListener("click",function(e){
    var b=e.target.closest(".kbtn");
    if(!b||keySeq.length>=12) return;
    keySeq+=b.getAttribute("data-h"); drawKeypad();
  });
  /* seed from the address box, otherwise drawKeypad would blank it before the first jump */
  keySeq=cleanHex(document.getElementById("inAddr").value).slice(0,12);
  drawKeypad();
}
function setKeypad(addr){ keySeq=cleanHex(addr).slice(0,12); drawKeypad(); }
function drawKeypad(){
  var el=document.getElementById("kSeq"),html="",i;
  for(i=0;i<12;i++){
    if(i<keySeq.length) html+='<div class="kslot"><img alt="'+keySeq[i]+'" src="'+glyphSrc(keySeq[i])+'"></div>';
    else html+='<div class="kslot"></div>';
  }
  el.innerHTML=html;
  var pad=keySeq; while(pad.length<12) pad+="—";
  document.getElementById("kHex").textContent=pad;
  document.getElementById("inAddr").value=keySeq;
}

/* ============ modes ============ */
function setMode(m){
  hideHoverPop(); clearCoursePreview();
  mode=m;
  galaxyGroup.visible=(m==="galaxy");
  localGroup.visible=(m==="local");
  systemGroup.visible=(m==="system");
  document.getElementById("mGal").classList.toggle("on",m==="galaxy");
  document.getElementById("mLoc").classList.toggle("on",m!=="galaxy");
  document.getElementById("bEnter").textContent=(m==="system")?"Back to local":"Enter system";
  document.getElementById("mstat").textContent=m.toUpperCase();
  /* System-name banner (2026-09-13, Phase 2) -- System view had no
     persistent "you are here" label at all; selected is always populated
     with the current system by the time setMode("system") runs (every
     caller does buildSystemView(selected) either just before or after
     this, see buildSystemView's own call sites), so this is safe to read
     unconditionally here rather than needing its own separate hook. */
  var sysBanner=document.getElementById("sysBanner");
  if(m==="system"&&selected){
    sysBanner.textContent=selected.name;
    sysBanner.style.display="block";
    positionSysBanner();
  } else {
    sysBanner.style.display="none";
  }
  updateGalInfoBadge();
  hideLabels();
  document.getElementById("empty").style.display=(m==="local"&&shown.length===0)?"block":"none";
  cam.target.set(0,0,0);
  if(m==="galaxy"){
    cam.dist=330; cam.phi=0.62; flyPos.set(0,150,240);
    /* Tony: clicking a star in Local correctly opens the info panel, but
       going back to Galaxy left it hanging open showing a now-irrelevant
       system. Galaxy view has no concept of a "selected" star (that only
       exists in Local/System), so close the panel and clear selection the
       same way the address Reset/Clear button already does. */
    selected=null;
    document.getElementById("panel").classList.remove("show");
    updateRings();
  }
  /* Local's starting tilt (2026-09-12, Tony: default framing left a big
     empty band of sky at the top of the view -- he found a rotated angle
     he preferred instead and had Claude read the exact camera position
     back off the Telemetry panel to reproduce it: camera ~(47.66, 0.24,
     15.10) at dist~50 solves to phi~1.55 rad -- i.e. almost perfectly
     level with the target/galactic-plane (Y~0) rather than the old 0.62
     rad, which was tipped up enough to leave that empty band above the
     stars. Reset phi here (not just dist) every time Local is entered --
     boot restore, the LOCAL button, or "Back to local" -- so it's always
     this angle regardless of whatever rotation was left over from Galaxy/
     System or a previous drag, rather than only fixing it on a truly
     fresh page load. theta (azimuth) is left alone -- unlike phi it has
     no bearing on whether the view fills the frame, so there's no one
     "correct" value for it. */
  if(m==="local"){ cam.dist=50; cam.phi=1.55; flyPos.set(0,10,44); maybeShowHyperNotice(); }
  /* 2026-09-13, flattened system-view redesign: explicit phi now set
     (previously system mode inherited whatever phi Local last had, ~1.55
     rad -- nearly edge-on -- which would show the new flat shared orbital
     plane as barely more than a line). Raked down closer to Galaxy's own
     angle instead so the flattened disc actually reads as a disc.
     cam.dist was a flat 65 (2026-09-13 first pass) -- fine for the one
     4-planet scene it was eyeballed against, but Tony's live-site feedback
     the same day was "needs to fill screen more, little small": a flat
     distance means a small (fewer-planet) system just sits lost in empty
     space while a big one clips, since neither scales with how far out
     this system's own rings/star/features actually reach. Refit
     (2026-09-13, second pass) via the same headless-Three.js harness
     verification as the rest of this redesign -- binary-searched, at the
     real camera's actual fov (58), the tightest dist that keeps every
     ring point + the star's full corona + every feature within 85% of
     the frame (a small safety margin, not clipped) for system sizes from
     1 to 10 planets, then fit a line through the results: dist tracks
     featureR almost exactly linearly (R²-clean, not just close), so one
     linear formula covers every system size instead of a fixed guess. */
  if(m==="system"){ cam.dist=selected?(systemFeatureR(selected)*1.27+7.34):65; cam.phi=0.8; flyPos.set(0,34,50); }
  aimFly(cam.target);
  applyCam();
}
function setCtrl(c){
  ctrl=c;
  document.getElementById("cOrb").classList.toggle("on",c==="orbit");
  document.getElementById("cFly").classList.toggle("on",c==="fly");
  document.getElementById("flyhint").style.display=(c==="fly")?"block":"none";
  if(c!=="fly"&&stick.act){
    // Leaving fly mode mid-drag (e.g. Orbit clicked while a finger is still
    // down) -- drop the virtual stick and its visual so neither lingers
    // stuck "on" once back in Orbit.
    stick.act=false; stick.x=0; stick.y=0; stick.id=null;
    var jb=document.getElementById("joyBase"), jk=document.getElementById("joyKnob");
    if(jb) jb.style.display="none";
    if(jk) jk.style.transform="translate(0,0)";
  }
  if(c==="fly"){
    flyPos.copy(camera.position);
    aimFly(cam.target);
  }
  applyCam();
}
function jumpTo(str,silent){
  var a=parseAddress(str);
  if(!a){ toast("Address needs 12 glyphs"); document.getElementById("inAddr").style.borderColor="#ff4a4a"; return false; }
  document.getElementById("inAddr").style.borderColor="";
  focus.x=a.x; focus.y=a.y; focus.z=a.z;
  marker.position.copy(voxelToGalaxy(a.x,a.y,a.z));
  courseTarget=null; courseWaypoints=null; courseRouteLY=0; clearCourseLine();
  document.getElementById("course").classList.remove("show");
  generateSlice(a.idx);
  focusSystem=null;
  var i;
  for(i=0;i<allSystems.length;i++){
    if(allSystems[i].idx===a.idx&&allSystems[i].vx===a.x&&
       allSystems[i].vy===a.y&&allSystems[i].vz===a.z){ focusSystem=allSystems[i]; break; }
  }
  if(!focusSystem){
    focusSystem=generateSystem(a.x,a.y,a.z,a.idx);
    focusSystem.px=0; focusSystem.py=0; focusSystem.pz=0;
  }
  cam.target.set(focusSystem.px,focusSystem.py,focusSystem.pz);
  flyPos.set(focusSystem.px,focusSystem.py+9,focusSystem.pz+40);
  aimFly(cam.target);
  applyCam();
  if(!silent){
    setMode("local"); updatePanel(focusSystem); hasRealLocation=true; syncResetBtn();
    /* Task 12 ("possible marking stars already visited... obviously only in
       their saved app on their map on their computer/mobile, not on the
       general public map"): auto-tracked, personal/local-only (store.visited,
       localStorage, never sent anywhere -- same as notes/marks). Only a real
       jump counts, not the silent boot/galaxy-switch re-anchor. */
    var vk=skey(focusSystem);
    if(!store.visited[vk]){ store.visited[vk]=1; saveStore(); }
    // Remember this as "where the visitor last was" so a returning visit
    // (see the boot restore near the bottom of this file) can pick up here
    // instead of Euclid/a random anonymous spot every time.
    saveLastPosition(GALAXY,focusSystem.address);
  }
  updateRings();
  buildGalaxyMarks();
  return true;
}
function toggleFold(boxId,headId,label,minBtnId){
  var t=document.getElementById(boxId);
  t.classList.toggle("min");
  var isMin=t.classList.contains("min");
  document.getElementById(headId).textContent=(isMin?"▸ ":"▾ ")+label;
  /* Filters (2026-08-24, Tony: "not collapsible like others") is the only
     fold-via-header box that also has its own dedicated minimize button
     (#bFiltMin, mirroring #bCourseMin/#bManifestMin/#bEditMin) -- kept in
     sync here so every way of toggling Filters (header tap, the button,
     the toolbar Filters button, and the F hotkey) can never drift out of
     sync with each other. #tel/#searchPop/#tweak don't pass minBtnId and
     stay untouched by this. */
  if(minBtnId){
    var b=document.getElementById(minBtnId);
    if(b) b.innerHTML=isMin?"&#9656;":"&#9662;";
    // 2026-09-12: minBtnId is only ever "bFiltMin" in practice (see comment
    // above) so this can't touch Tweak/Telemetry/Search -- keeps the
    // toolbar Filters button gold while its panel is open, same "on" =
    // "currently showing" language Labels/Grid/Atlas/Orbit already use.
    var ft=document.getElementById("bFiltToggle");
    if(ft) ft.classList.toggle("on",!isMin);
  }
}

/* ============ wiring ============ */
(function(){
  // Real per-galaxy addressing (2026-08-22): #galSel (toolbar), #edGalaxy
  // (Edit system form) and #dlGalaxyPick (the glyph keypad's searchable
  // galaxy picker) all list the exact same 257 galaxies in the exact same
  // "N. Name" format, built once here so the three can never drift out of
  // sync with each other or with GALAXIES itself.
  var sel=document.getElementById("galSel");
  var edSel=document.getElementById("edGalaxy");
  var dl=document.getElementById("dlGalaxyPick");
  for(var i=0;i<GALAXIES.length;i++){
    var label=(i+1)+". "+GALAXIES[i];
    var o=document.createElement("option");
    o.value=String(i); o.textContent=label;
    sel.appendChild(o);
    var o2=document.createElement("option");
    o2.value=String(i); o2.textContent=label;
    edSel.appendChild(o2);
    var o3=document.createElement("option");
    o3.value=label;
    dl.appendChild(o3);
  }
  sel.value="0";
  edSel.value="0";
})();
function updateGalaxyInfo(){
  var gt=galaxyType(GALAXY);
  var r=mulberry32(GALAXY*7919+13);
  var el=document.getElementById("gType");
  el.textContent=pickOne(r,gt.names)+" galaxy";
  el.style.color=gt.c;
}
function galInfoHTML(){
  var gt=galaxyType(GALAXY);
  var typeLabel=gt.k==="Unknown"?"TYPE UNKNOWN":gt.k==="Norm"?"NORMAL":gt.k.toUpperCase();
  return GALAXIES[GALAXY].toUpperCase()+" \u2014 GALAXY #"+(GALAXY+1)+" OF "+GALAXIES.length+
    " \u2014 <span style=\"color:"+gt.c+"\">"+typeLabel+"</span>";
}
function updateGalInfoBadge(){
  var el=document.getElementById("galInfo");
  var hud=document.getElementById("galHud");
  if(mode==="galaxy"){ el.innerHTML=galInfoHTML(); el.style.display="block"; hud.classList.add("withBadge"); }
  else{ el.style.display="none"; hud.classList.remove("withBadge"); }
  positionAnnivBadge();
  setTimeout(positionAnnivBadge,160); /* settle after #galHud's own top transition */
}
/* Shared galaxy-switch logic, pulled out of #galSel's own change handler
   (2026-08-21) so anything that needs to jump a traveller into a DIFFERENT
   galaxy than the one they're currently in -- e.g. picking a Search result
   that was documented/bookmarked in another galaxy -- can reuse the exact
   same state reset instead of only ever switching GALAXY as a side effect
   of the dropdown itself. Does NOT jump anywhere or update the dropdown's
   own <select> value -- callers that need those do it themselves right
   after, since #galSel's change handler needs a slightly different jump
   fallback (BOOT_ANCHOR when no real location yet) than a Search pick does
   (always jump straight to the picked address). */
function switchGalaxy(newGal){
  GALAXY=newGal;
  atlasGroup.visible=atlasOn&&GALAXY===0;
  updateGalaxyInfo();
  buildGalaxy(); buildNebula(); drawGalIcon();
  focusSystem=null; courseTarget=null; courseWaypoints=null;
  document.getElementById("course").classList.remove("show");
  updateGalInfoBadge();
}
document.getElementById("galSel").addEventListener("change",function(){
  switchGalaxy(parseInt(this.value,10));
  syncGalaxyPickInput();
  /* If the visitor hasn't actually jumped anywhere yet, the address box is
     still empty by design (see hasRealLocation) -- re-anchor silently on the
     boot coordinate instead of trying to jump to an empty string, which would
     otherwise flash a red "Address needs 12 glyphs" error on a perfectly
     normal galaxy switch before anyone's typed anything. */
  jumpTo(hasRealLocation?document.getElementById("inAddr").value:BOOT_ANCHOR_ADDR,!hasRealLocation);
  if(mode!=="galaxy") toast(galInfoHTML(), 2600);
});

/* Keeps the glyph keypad's searchable galaxy picker's displayed text in
   sync with GALAXY, no matter which of the several ways GALAXY can change
   (the #galSel dropdown, a Search result switching galaxy, the admin
   panel's "View system" action, or this picker switching itself). */
function syncGalaxyPickInput(){
  var inp=document.getElementById("kGalaxyInput");
  if(inp) inp.value=(GALAXY+1)+". "+GALAXIES[GALAXY];
}
/* Resolves free-typed text in #kGalaxyInput to a galaxy index -- "a search
   instead of dropdown" per Tony's explicit ask, reusing the native
   <datalist> autocomplete this file already relies on elsewhere for
   free-text suggestions (see populateDatalists()) rather than building a
   custom dropdown widget. Tries, in order: an exact match on the "N. Name"
   label the datalist itself offers; a plain 1-based galaxy number (matching
   the "GALAXY #N" convention used everywhere else in this file, e.g.
   galInfoHTML()); an exact galaxy-name match; then name-starts-with, then
   name-contains -- same ranking convention buildSearchIndex()/runSearch()
   already use for system-name search. Returns null if nothing matches. */
function resolveGalaxyPick(text){
  text=String(text||"").trim();
  if(!text) return null;
  var lower=text.toLowerCase(), i;
  for(i=0;i<GALAXIES.length;i++){
    if(((i+1)+". "+GALAXIES[i]).toLowerCase()===lower) return i;
  }
  if(/^\d+$/.test(text)){
    var n=parseInt(text,10);
    if(n>=1 && n<=GALAXIES.length) return n-1;
  }
  for(i=0;i<GALAXIES.length;i++){
    if(GALAXIES[i].toLowerCase()===lower) return i;
  }
  for(i=0;i<GALAXIES.length;i++){
    if(GALAXIES[i].toLowerCase().indexOf(lower)===0) return i;
  }
  for(i=0;i<GALAXIES.length;i++){
    if(GALAXIES[i].toLowerCase().indexOf(lower)>=0) return i;
  }
  return null;
}
(function(){
  var inp=document.getElementById("kGalaxyInput");
  if(!inp) return;
  function commit(){
    var g=resolveGalaxyPick(inp.value);
    if(g===null){
      toast("No galaxy matches \""+inp.value+"\"", 2400);
      syncGalaxyPickInput();
      return;
    }
    if(g===GALAXY){ syncGalaxyPickInput(); return; }
    switchGalaxy(g);
    document.getElementById("galSel").value=String(g);
    syncGalaxyPickInput();
    /* Same silent-boot-anchor behaviour as #galSel's own change handler
       above -- see its comment for why. */
    jumpTo(hasRealLocation?document.getElementById("inAddr").value:BOOT_ANCHOR_ADDR,!hasRealLocation);
    if(mode!=="galaxy") toast(galInfoHTML(), 2600);
  }
  inp.addEventListener("change",commit);
  inp.addEventListener("keydown",function(e){
    if(e.key==="Enter"){ e.preventDefault(); commit(); inp.blur(); }
  });
  syncGalaxyPickInput();
})();
function bindSlider(id,out,fn,fixed){
  var el=document.getElementById(id);
  el.addEventListener("input",function(){
    document.getElementById(out).textContent=fixed?parseFloat(el.value).toFixed(1):el.value;
    fn();
  });
}
bindSlider("sNeb","vNeb",buildNebula,false);
bindSlider("sCsz","vCsz",buildNebula,true);
bindSlider("sGal","vGal",buildGalaxy,false);
bindSlider("sArm","vArm",function(){ buildGalaxy(); buildNebula(); drawGalIcon(); },false);
bindSlider("sTw","vTw",function(){ buildGalaxy(); buildNebula(); drawGalIcon(); },true);
bindSlider("sTh","vTh",function(){ buildGalaxy(); buildNebula(); },true);
bindSlider("sR","vR",generateSlice,false);
bindSlider("sPer","vPer",generateSlice,false);
bindSlider("sSz","vSz",function(){
  /* item 10: shader uses aSize attribute baked per-star, so rebuild locPts on size change */
  if(mode==="local") applyFilter();
},true);

(function(){
  var sel=document.getElementById("fEco"),i;
  for(i=0;i<ECON.length;i++){ var o=document.createElement("option"); o.textContent=ECON[i][0]; sel.appendChild(o); }
})();
/* Same population as #fEco just above, for the "By traits" tab of the new
   Find popup (#searchPop) -- a separate select rather than sharing #fEco
   itself, so scanning for a trait can never silently change what Filters is
   currently narrowing Local view down to, or vice versa. */
(function(){
  var sel=document.getElementById("fdEco"),i;
  for(i=0;i<ECON.length;i++){ var o=document.createElement("option"); o.textContent=ECON[i][0]; sel.appendChild(o); }
})();
["fCol","fRace","fEco","fBH","fAtl","fStation","fOut","fGiant","fWaypoint","fReachOnly","fPhantom","fShadow"].forEach(function(id){
  document.getElementById(id).addEventListener("change",applyFilter);
});
/* spec item 9 -- warp animation toggle */
document.getElementById("fWarpAnim").checked=WARP_ENABLED;
/* 2026-08-30, honest-review to-do: the only way to turn this off used to be
   buried inside the Filters panel, which nobody finds by accident -- add a
   one-click toggle right in the main toolbar next to Random/Search too.
   Both controls drive the exact same WARP_ENABLED flag/localStorage key, so
   flipping either one immediately updates the other's visible state. */
var bWarpToggle=document.getElementById("bWarpToggle");
function syncWarpToggleBtn(){ bWarpToggle.classList.toggle("on",WARP_ENABLED); }
syncWarpToggleBtn();
bWarpToggle.addEventListener("click",function(){
  var cb=document.getElementById("fWarpAnim");
  cb.checked=!cb.checked;
  cb.dispatchEvent(new Event("change"));
});
document.getElementById("fWarpAnim").addEventListener("change",function(){
  WARP_ENABLED=this.checked;
  localStorage.setItem('nms-galmap-warp',WARP_ENABLED?'1':'0');
  syncWarpToggleBtn();
});
document.getElementById("fHyper").addEventListener("change",function(){
  if(courseTarget) setCourse(courseTarget);
});
document.getElementById("fHyperDrive").addEventListener("change",function(){
  if(courseTarget) setCourse(courseTarget);
  if(selected) updatePanel(selected);
  applyFilter();
});
document.getElementById("bReset").addEventListener("click",function(){
  document.getElementById("fCol").value=""; document.getElementById("fRace").value="";
  document.getElementById("fEco").value="";
  document.getElementById("fBH").checked=false; document.getElementById("fAtl").checked=false;
  document.getElementById("fStation").checked=false;
  document.getElementById("fOut").checked=false; document.getElementById("fGiant").checked=false;
  document.getElementById("fWaypoint").checked=false;
  document.getElementById("fReachOnly").checked=false;
  document.getElementById("fPhantom").checked=false;
  document.getElementById("fShadow").checked=false;
  applyFilter();
});
/* ============ hyperdrive slide-out panel (task 6: "filter may look
   cluttered so maybe a new window slides right for hyperdrive type then
   right again after to choosing jump range") -- simplified from two
   chained slide-outs to one slide-out panel covering both drive type and
   range together, reusing the exact sideL/sideR "expand into whichever
   side has room" mechanism already built for the accessibility popup's
   Rendering tuning panel (positionTweakPanel), anchored to #filt itself
   rather than #accessPop. Flagged as a scope simplification in HANDOVER.md
   for Tony to review -- easy to split into two panels later if he'd rather
   have the literal two-hop version. */
function updateHyperSummary(){
  var d=currentDrive(), r=document.getElementById("fHyper").value;
  document.getElementById("hyperSummary").textContent=d.short+" // "+commas(parseInt(r,10))+" LY";
}
function positionHyperPanel(){
  var hp=document.getElementById("hyperPanel"), filt=document.getElementById("filt");
  if(!hp.classList.contains("show")) return;
  /* Back to the .sideL/.sideR CSS-class mechanism (2026-08-24) -- see the
     #hyperPanel CSS comment for why. This still picks the side ONCE, right
     here, based on real available room (same "measure don't guess" as
     positionTweakPanel) -- what's different from yesterday's version is
     the panel no longer needs its LEFT/TOP re-computed as #filt moves,
     because position:absolute does that automatically now that #hyperPanel
     isn't clipped by anything anymore. */
  var fr=filt.getBoundingClientRect();
  var pw=198;
  var roomRight=window.innerWidth-fr.right-8, roomLeft=fr.left-8;
  hp.classList.remove("sideL","sideR");
  hp.classList.add(roomRight>=pw||roomRight>=roomLeft?"sideR":"sideL");
  hp.classList.remove("scroll");
  var maxH=window.innerHeight-40;
  if(hp.scrollHeight>maxH+1) hp.classList.add("scroll");
}
document.getElementById("bHyperOpen").addEventListener("click",function(e){
  e.stopPropagation();
  document.getElementById("hyperPanel").classList.toggle("show");
  positionHyperPanel();
});
document.addEventListener("click",function(e){
  var hp=document.getElementById("hyperPanel");
  if(hp.classList.contains("show") && !hp.contains(e.target) && e.target.id!=="bHyperOpen"){
    hp.classList.remove("show");
  }
});
document.getElementById("hyperDriveRow").addEventListener("click",function(e){
  var b=e.target.closest(".pill"); if(!b) return;
  document.querySelectorAll("#hyperDriveRow .pill").forEach(function(p){ p.classList.remove("on"); });
  b.classList.add("on");
  document.getElementById("fHyperDrive").value=b.getAttribute("data-drive");
  document.getElementById("fHyperDrive").dispatchEvent(new Event("change"));
  updateHyperSummary();
});
document.getElementById("hyperRangeRow").addEventListener("click",function(e){
  var b=e.target.closest(".pill"); if(!b) return;
  document.querySelectorAll("#hyperRangeRow .pill").forEach(function(p){ p.classList.remove("on"); });
  b.classList.add("on");
  document.getElementById("fHyper").value=b.getAttribute("data-range");
  document.getElementById("fHyper").dispatchEvent(new Event("change"));
  updateHyperSummary();
});
document.getElementById("bWaypoint").addEventListener("click",function(){
  if(!selected) return;
  var k=skey(selected);
  if(store.waypoints[k]) delete store.waypoints[k]; else store.waypoints[k]={name:selected.name,at:Date.now()};
  saveStore(); applyFilter(); updatePanel(selected); buildGalaxyMarks();
  toast(store.waypoints[k]?"Saved as waypoint":"Waypoint removed");
});
document.getElementById("bSaveRoute").addEventListener("click",saveCurrentRoute);
document.getElementById("bCopyRouteLink").addEventListener("click",function(){ copyRouteLink(); });
document.getElementById("bLoadRouteLink").addEventListener("click",function(){
  var raw=document.getElementById("inRouteLink").value.trim();
  if(!raw){ toast("Paste a route link first"); return; }
  var shared=decodeRoutePayload(raw);
  if(!shared){ toast("That route link looks broken"); return; }
  document.getElementById("inRouteLink").value="";
  receiveSharedRoute(shared);
  if(typeof closeRoutesPop==="function") closeRoutesPop();
});
document.getElementById("routesResults").addEventListener("click",function(e){
  var btn=e.target.closest?e.target.closest(".routeActBtn"):null;
  if(!btn) return;
  var row=btn.closest(".routeRes");
  var id=row&&row.getAttribute("data-id");
  var route=(store.routes||[]).filter(function(r){ return r.id===id; })[0];
  if(!route) return;
  var act=btn.getAttribute("data-act");
  if(act==="load"){
    loadSavedRoute(route);
    if(typeof closeRoutesPop==="function") closeRoutesPop();
  } else if(act==="link"){
    copyRouteLink(route);
  } else if(act==="rename"){
    var nn=prompt("Rename route:",route.name);
    if(nn===null) return;
    nn=nn.trim(); if(!nn) return;
    route.name=nn; saveStore(); renderRoutesList();
  } else if(act==="delete"){
    store.routes=(store.routes||[]).filter(function(r){ return r.id!==id; });
    saveStore(); renderRoutesList();
    toast("Route deleted");
  }
});
document.getElementById("galTypeFilter").addEventListener("change",function(){
  var want=this.value;
  var sel=document.getElementById("galSel");
  var cur=sel.value;
  for(var i=0;i<sel.options.length;i++){
    var gi=parseInt(sel.options[i].value,10);
    var show=!want || galaxyType(gi).k===want;
    sel.options[i].style.display=show?"":"none";
  }
  // if the current selection just got hidden, jump to the first still-visible option
  var curOpt=sel.querySelector('option[value="'+cur+'"]');
  if(curOpt && curOpt.style.display==="none"){
    for(var j=0;j<sel.options.length;j++){
      if(sel.options[j].style.display!=="none"){ sel.value=sel.options[j].value; sel.dispatchEvent(new Event("change")); break; }
    }
  }
});
document.getElementById("pBodies").addEventListener("click",function(e){
  var row=e.target.closest(".brow");
  if(!row||!selected) return;
  var b=selected.bodies[parseInt(row.getAttribute("data-b"),10)];
  if(b) showBody(b,selected);
});
document.getElementById("mGal").addEventListener("click",function(){ setMode("galaxy"); });
document.getElementById("mLoc").addEventListener("click",function(){ setMode("local"); });
document.getElementById("cOrb").addEventListener("click",function(){ setCtrl("orbit"); });
document.getElementById("cFly").addEventListener("click",function(){ setCtrl(ctrl==="fly"?"orbit":"fly"); });
document.getElementById("bJump").addEventListener("click",function(){ if(jumpTo(document.getElementById("inAddr").value)) playWarpTransition("portal"); });
document.getElementById("inAddr").addEventListener("input",function(){
  var v=cleanHex(this.value).slice(0,12);
  this.value=v; keySeq=v; drawKeypad();
});
document.getElementById("inAddr").addEventListener("keydown",function(e){
  if(e.key==="Enter"){ if(jumpTo(this.value)) playWarpTransition("portal"); }
});
document.getElementById("bRand").addEventListener("click",function(){
  var r=mulberry32((Math.random()*4294967296)>>>0);
  var a=hex(1,1)+hex(Math.floor(r()*0x2FF),3)+hex(Math.floor(r()*0x100),2)+
        hex(Math.floor(r()*0x1000),3)+hex(Math.floor(r()*0x1000),3);
  setKeypad(a); if(jumpTo(a)) playWarpTransition("portal");
});
document.getElementById("bKeys").addEventListener("click",function(){
  var k=document.getElementById("keys");
  k.classList.toggle("show");
  this.classList.toggle("on",k.classList.contains("show"));
});
document.getElementById("bLbl").addEventListener("click",toggleLabels);
function toggleGrid(){
  gridOn=!gridOn;
  document.getElementById("bGrid").classList.toggle("on",gridOn);
  buildVoxelGrid();
}
document.getElementById("bGrid").addEventListener("click",toggleGrid);
function toggleAtlasOverlay(){
  atlasOn=!atlasOn;
  document.getElementById("bAtlas").classList.toggle("on",atlasOn);
  atlasGroup.visible=atlasOn&&GALAXY===0;
  if(!atlasOn) hideAtlasBadges();
  if(atlasOn&&GALAXY!==0) toast("Galactic Atlas data only exists for Euclid (Galaxy #1)");
}
document.getElementById("bAtlas").addEventListener("click",toggleAtlasOverlay);
document.getElementById("kBack").addEventListener("click",function(){ keySeq=keySeq.slice(0,-1); drawKeypad(); });
document.getElementById("kClear").addEventListener("click",function(){ keySeq=""; drawKeypad(); });
document.getElementById("kJump").addEventListener("click",function(){ if(jumpTo(keySeq)) playWarpTransition("portal"); });
document.getElementById("bEnter").addEventListener("click",function(){
  if(mode==="system"){ setMode("local"); if(selected) updatePanel(selected); return; }
  if(!selected) return;
  if(!canReachColor(selected.type)){ toast(driveNeededMsg(selected.type)); return; }
  buildSystemView(selected); setMode("system"); playWarpTransition("ship");
  if(selected.editorName||selected.editorFriendCode){
    var who=selected.editorName?("Documented by "+selected.editorName):"Documented by a traveller";
    toast(who+(selected.editorFriendCode?(" \u00b7 Friend code: "+selected.editorFriendCode):""), 3200);
  }
});
document.getElementById("bCourse").addEventListener("click",function(){
  if(!selected) return;
  if(courseTarget&&courseTarget.address===selected.address){
    /* already plotted to this exact system -- Plotted course now doubles
       as the Warp Manifest open/close toggle for it, rather than silently
       re-running the route computation for no reason. */
    document.getElementById("bToggleManifest").click();
    return;
  }
  _openManifestOnPlot=true;
  setCourse(selected);
});
document.getElementById("bClrCourse").addEventListener("click",function(){
  courseTarget=null; courseWaypoints=null; courseRouteLY=0; clearCourseLine(); buildGalaxyMarks();
  document.getElementById("course").classList.remove("show");
});
document.getElementById("bGoCourse").addEventListener("click",function(){
  if(!courseTarget) return;
  if(!canReachColor(courseTarget.type)){
    toast(driveNeededMsg(courseTarget.type)+" -- tap Waypoint on its panel to save it for later");
    return;
  }
  var a=courseTarget.address; setKeypad(a); jumpTo(a); playWarpTransition("ship");
});
/* 2026-09-13 fix: pSeqHead ("Portal sequence & coordinates") and pNoteHead
   ("Surveyor log") were added (with role=button/tabindex=0/aria-expanded,
   collapsed by default via style="display:none" on pSeqBody/pNoteBody) as
   part of shortening the info panel, but togglePanelFold() -- named in that
   same commit's own HTML comment -- was never actually written, so the
   headers did nothing when clicked. Mirrors the ▸/▾ + display:none idiom
   toggleFold() already uses for the floating Filters/Tweak/Telemetry boxes,
   just scoped to a body element inside this one panel instead of a whole
   box, and independent of each other (opening one doesn't close the other). */
function togglePanelFold(headId,bodyId){
  var head=document.getElementById(headId), body=document.getElementById(bodyId);
  var wasOpen=body.style.display!=="none";
  body.style.display=wasOpen?"none":"";
  head.setAttribute("aria-expanded",String(!wasOpen));
  head.textContent=(wasOpen?"▸ ":"▾ ")+head.textContent.slice(2);
}
function closePanelFold(headId,bodyId){
  var head=document.getElementById(headId), body=document.getElementById(bodyId);
  body.style.display="none";
  head.setAttribute("aria-expanded","false");
  head.textContent="▸ "+head.textContent.slice(2);
}
function panelFoldKey(e,headId,bodyId){
  if(e.key==="Enter"||e.key===" "){ e.preventDefault(); togglePanelFold(headId,bodyId); }
}
document.getElementById("pSeqHead").addEventListener("click",function(){ togglePanelFold("pSeqHead","pSeqBody"); });
document.getElementById("pNoteHead").addEventListener("click",function(){ togglePanelFold("pNoteHead","pNoteBody"); });
document.getElementById("pSeqHead").addEventListener("keydown",function(e){ panelFoldKey(e,"pSeqHead","pSeqBody"); });
document.getElementById("pNoteHead").addEventListener("keydown",function(e){ panelFoldKey(e,"pNoteHead","pNoteBody"); });
// 2026-09-13, Tony's follow-up on the same review: the Filters panel's
// checkbox block gets the same collapsible treatment via the same
// togglePanelFold()/panelFoldKey() helpers -- see the fTogHead/fTogBody
// HTML comment for why only this block folds and not the whole panel.
document.getElementById("fTogHead").addEventListener("click",function(){ togglePanelFold("fTogHead","fTogBody"); });
document.getElementById("fTogHead").addEventListener("keydown",function(e){ panelFoldKey(e,"fTogHead","fTogBody"); });
document.getElementById("bSave").addEventListener("click",function(){
  if(!selected) return;
  var v=document.getElementById("pNote").value.trim();
  if(v) store.notes[skey(selected)]=v; else delete store.notes[skey(selected)];
  saveStore(); toast("Log saved");
});
document.getElementById("bBodyBack").addEventListener("click",function(){
  // Same pattern already used at bEnter's own "back to local" branch above --
  // updatePanel() always resets #pBody to hidden and #pSys (the planet/moon
  // list) back to visible. Real gap found 2026-08-18 (Tony, mobile): once a
  // planet/moon is clicked open via showBody(), nothing in the panel itself
  // could get back to the list -- desktop visitors could sometimes click the
  // star again in the 3D view behind the panel, but that's not reachable at
  // all on a phone where the panel covers the screen.
  if(selected) updatePanel(selected);
});
document.getElementById("bMark").addEventListener("click",function(){
  if(!selected) return;
  var k=skey(selected);
  if(store.marks[k]) delete store.marks[k]; else store.marks[k]=1;
  saveStore(); applyFilter(); updatePanel(selected); buildGalaxyMarks();
  // Keep the Favourites list live if it's already open in the background --
  // same reasoning as the other refreshes on this line, just scoped to only
  // do the extra work when there's actually a list on screen to update.
  var favPopEl=document.getElementById("favPop");
  if(favPopEl && favPopEl.classList.contains("show")) renderFavouritesList();
  toast(store.marks[k]?"Bookmarked":"Bookmark removed");
});
document.getElementById("bCopy").addEventListener("click",function(){
  var txt=document.getElementById("pAddr").textContent;
  if(navigator.clipboard&&navigator.clipboard.writeText)
    navigator.clipboard.writeText(txt).then(function(){ toast("Address copied"); },function(){ toast(txt); });
  else toast(txt);
});
document.getElementById("bExport").addEventListener("click",function(){
  var blob=new Blob([JSON.stringify(store,null,2)],{type:"application/json"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="nms-galactic-map-logs.json"; a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); },2000);
  toast("Logs exported");
});
document.getElementById("bImport").addEventListener("click",function(){ document.getElementById("fFile").click(); });
document.getElementById("fFile").addEventListener("change",function(e){
  var f=e.target.files[0]; if(!f) return;
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var o=JSON.parse(rd.result);
      store.notes=Object.assign(store.notes,o.notes||{});
      store.noteImgs=Object.assign(store.noteImgs,o.noteImgs||{});
      store.marks=Object.assign(store.marks,o.marks||{});
      store.waypoints=Object.assign(store.waypoints,o.waypoints||{});
      store.visited=Object.assign(store.visited,o.visited||{});
      /* Routes are an array (see store.routes' own comment), so this can't
         be an Object.assign merge like the keyed lists above -- merge by id
         instead, an imported route overwriting one already here with the
         same id (a re-import of the same export) rather than duplicating it. */
      if(Array.isArray(o.routes)){
        var byId={};
        (store.routes||[]).forEach(function(r){ byId[r.id]=r; });
        o.routes.forEach(function(r){ if(r&&r.id) byId[r.id]=r; });
        store.routes=Object.keys(byId).map(function(k){ return byId[k]; })
          .sort(function(a,b){ return (b.savedAt||0)-(a.savedAt||0); });
      }
      saveStore(); applyFilter(); buildGalaxyMarks(); renderRoutesList(); toast("Logs imported");
    }catch(err){ toast("Import failed — bad file"); }
  };
  rd.readAsText(f);
});
document.getElementById("tHead").addEventListener("click",function(){
  toggleFold("tweak","tHead","Tweak");
  positionTweakPanel();
});
function positionTweakPanel(){
  var tw=document.getElementById("tweak"), pop=document.getElementById("accessPop");
  if(tw.classList.contains("min")){
    tw.classList.remove("sideL","sideR");
    tw.style.marginTop="10px";
    return;
  }
  var pr=pop.getBoundingClientRect();
  var roomRight=window.innerWidth-pr.right-8, roomLeft=pr.left-8;
  tw.classList.remove("sideL","sideR");
  tw.classList.add(roomRight>=190||roomRight>=roomLeft?"sideR":"sideL");
  tw.style.marginTop="0";
}
document.getElementById("fHead").addEventListener("click",function(){ toggleFold("filt","fHeadLabel","Filters","bFiltMin"); });
document.getElementById("telHead").addEventListener("click",function(){ toggleFold("tel","telHead","Telemetry"); });
document.getElementById("bFiltToggle").addEventListener("click",function(){ toggleFold("filt","fHeadLabel","Filters","bFiltMin"); });
/* Dedicated collapse button for Filters (2026-08-24, Tony: "filter its not
   collapsible like others so have to always click filter button next to
   search to collapse"). Real root cause: #fHead doubles as makeDraggable's
   drag handle, and on a real touchscreen a "tap" easily drifts past the
   6px drag threshold, which silently swallows the click that would've
   toggled the fold (see makeDraggable's own comment) -- so the header tap
   worked in theory but was flaky in practice, exactly why Tony fell back
   to the toolbar button every time. Course/Manifest/Edit system already
   solved this with a real <button> inside their drag handle, which
   makeDraggable's pointerdown already excludes from ever starting a drag
   (e.target.closest("button")) -- mirrors that exact, already-proven
   pattern instead of inventing a new one. */
document.getElementById("bFiltMin").addEventListener("click",function(e){
  e.stopPropagation();
  toggleFold("filt","fHeadLabel","Filters","bFiltMin");
});
function syncResetBtn(){
  var btn=document.getElementById("bAddrReset");
  if(hasRealLocation&&focusSystem){ btn.textContent="Reset"; btn.title="Reset the address box back to where you currently are."; }
  else { btn.textContent="Clear"; btn.title="Clear the address box."; }
}
document.getElementById("bAddrReset").addEventListener("click",function(){
  var goingHome=hasRealLocation&&focusSystem;
  var addr=goingHome?focusSystem.address:document.getElementById("inAddr").defaultValue;
  var el=document.getElementById("inAddr");
  el.value=addr; el.style.borderColor="";
  keySeq=addr; drawKeypad();
  el.focus();
  // The address box's text isn't the only place a system shows -- clicking a
  // star in Local/System view calls updatePanel() independently of the box,
  // so `selected`/the info panel can still be showing whatever was last
  // clicked even after this button rewrites the box back to something else
  // entirely. Confirmed live: Random -> click a different star -> Reset left
  // the address box correctly back home while the panel kept showing the
  // OTHER star -- exactly the "picture 1 vs picture 2" mismatch Tony flagged.
  // Re-sync selection/panel here so the box and panel always agree.
  if(goingHome){
    updatePanel(focusSystem);
  } else {
    selected=null;
    document.getElementById("panel").classList.remove("show");
  }
  toast(goingHome?"Address reset to your current location":"Address cleared");
});
document.getElementById("bPanelMin").addEventListener("click",function(){
  var min=document.getElementById("panel").classList.toggle("panel-min");
  this.innerHTML=min?"&#9656;":"&#9662;";
});
document.getElementById("bCourseMin").addEventListener("click",function(e){
  e.stopPropagation();
  var min=document.getElementById("course").classList.toggle("min");
  this.innerHTML=min?"&#9656;":"&#9662;";
});
document.getElementById("bManifestMin").addEventListener("click",function(e){
  e.stopPropagation();
  var min=document.getElementById("route-itinerary-card").classList.toggle("min");
  this.innerHTML=min?"&#9656;":"&#9662;";
});
document.getElementById("bEditMin").addEventListener("click",function(e){
  e.stopPropagation();
  var min=document.getElementById("editModal").classList.toggle("min");
  this.innerHTML=min?"&#9656;":"&#9662;";
});

/* ============ draggable boxes ============ */
/* Filters, the system info panel, and Course plotted can all end up in the
   wrong place on some specific phone/orientation combo (this project's whole
   session-22 punch list). Rather than keep chasing each device permutation
   one screenshot at a time, let Tony drag any of them by their header to
   wherever actually works on his screen. Tap-vs-drag is distinguished by the
   same movement threshold the canvas star-picking already uses, so a plain
   tap on the header still toggles collapse as before -- only a real drag
   (>=6px of movement) repositions the box and swallows the click that would
   otherwise also fire the collapse toggle. Session-only (resets on reload,
   and on any resize/orientation change -- so a rotated phone can never end
   up with a box stuck off-screen from a drag made in the other orientation). */
var draggedBoxes=[];
function makeDraggable(boxEl,handleEl){
  if(!boxEl||!handleEl) return;
  var sx=0,sy=0,ox=0,oy=0,dragging=false,moved=0,ptrId=null,wasDrag=false;
  draggedBoxes.push(boxEl);
  handleEl.addEventListener("pointerdown",function(e){
    if(e.target.closest("button")) return;
    var r=boxEl.getBoundingClientRect();
    ox=r.left; oy=r.top; sx=e.clientX; sy=e.clientY;
    dragging=true; moved=0; ptrId=e.pointerId;
    handleEl.setPointerCapture(e.pointerId);
  });
  handleEl.addEventListener("pointermove",function(e){
    if(!dragging||e.pointerId!==ptrId) return;
    var ddx=e.clientX-sx, ddy=e.clientY-sy;
    moved=Math.max(moved,Math.abs(ddx)+Math.abs(ddy));
    if(moved<6) return;
    boxEl.style.position="fixed";
    boxEl.style.right="auto"; boxEl.style.bottom="auto"; boxEl.style.transform="none";
    /* Clamp top to the real toolbar bottom edge, not a flat 4px (Tony,
       2026-08-24: dragging Filters up near the toolbar left it stuck --
       #top is z-index:30, every draggable box here is z-index:25 or
       lower, so once a box's own top overlapped #top's box, #top silently
       won every future pointerdown at that spot -- including on the
       box's own drag handle, so there was no way to grab it again to
       pull it back down. Measuring #top's live bottom edge (same
       --top-h source of truth used everywhere else in this file) makes
       it structurally impossible to drag ANY of the 7 draggable boxes
       into that dead zone, not just Filters. */
    var topEl=document.getElementById("top");
    var minTop=(topEl?topEl.getBoundingClientRect().bottom:0)+4;
    boxEl.style.left=Math.max(4,Math.min(window.innerWidth-40,ox+ddx))+"px";
    boxEl.style.top=Math.max(minTop,Math.min(window.innerHeight-40,oy+ddy))+"px";
    /* No explicit Hyperdrive-panel re-anchor call here any more
       (2026-08-24) -- #hyperPanel went back to position:absolute anchored
       to #filt (see its CSS comment), which auto-follows #filt for any
       reason it moves, drag included, with no JS needed. The removed hook
       only ever covered this one case (an active #filt drag) and silently
       missed every other way #filt could move, which is exactly what broke. */
  });
  function end(e){
    if(!dragging||e.pointerId!==ptrId) return;
    dragging=false;
    wasDrag=moved>=6;
    /* 2026-08-25, round-2 honest-review fix: flag that a human actually
       repositioned this box, so callers (currently just Search, see
       openSearch()) can tell "never been touched, safe to keep
       auto-positioning" apart from "user parked it somewhere on purpose,
       leave it alone" -- a plain tap that doesn't cross the drag threshold
       does not set this. */
    if(wasDrag) boxEl.dataset.userMoved="1";
  }
  handleEl.addEventListener("pointerup",end);
  handleEl.addEventListener("pointercancel",end);
  handleEl.addEventListener("click",function(e){
    if(wasDrag){ e.stopPropagation(); e.preventDefault(); wasDrag=false; }
  },true);
}
makeDraggable(document.getElementById("filt"),document.getElementById("fHead"));
/* 2026-09-12 (reverted later the same day -- see #pName's own CSS comment,
   a few hundred lines up, for the full story): back to the whole .phead row
   as the drag handle, same as every other box in this file. Tony's real
   ask -- a bigger, easier-to-hit #bPanelMin -- is the actual fix for the
   original "too close to tell apart" complaint; see that button's own CSS. */
makeDraggable(document.getElementById("panel"),document.querySelector("#panel .phead"));
makeDraggable(document.getElementById("course"),document.querySelector("#course .chead"));
makeDraggable(document.getElementById("accessPop"),document.getElementById("a11yHead"));
makeDraggable(document.getElementById("editModal"),document.getElementById("edHead"));
/* Search by name, made draggable/collapsible like every other floating box
   (Tony, 2026-08-22) -- #searchPop/#searchHead already had the right markup,
   they just were never wired into the two shared helpers other windows use. */
document.getElementById("searchHead").addEventListener("click",function(){ toggleFold("searchPop","searchHead","Search by name"); });
makeDraggable(document.getElementById("searchPop"),document.getElementById("searchHead"));
/* Glyph keypad (2026-08-23, Tony: "why isn't the glyph window draggable like
   the rest") -- same story as searchPop above: #keys/#keysHead already had
   the right .box markup, it just never got wired into makeDraggable() when
   the other floating windows did. Handle is the "Portal glyph keypad" title
   span specifically, NOT the whole .kheadrow header bar -- that bar also
   holds the galaxy search input (#kGalaxyInput), and makeDraggable's own
   pointerdown handler only excludes clicks on a button element (see its own
   comment), so wiring the full row would've hijacked clicking into that
   input to focus/type. Attaching the handler to just the title span sidesteps
   that -- the input is a sibling, not a descendant, so it never sees these
   listeners at all. */
makeDraggable(document.getElementById("keys"),document.getElementById("keysHead"));
/* route-itinerary-card (Warp Manifest) made draggable 2026-08-26 (Tony:
   "wants to be like all other windows draggable and collapsible") --
   collapsible already worked (bManifestMin/.min, same as every other box);
   this was the one piece still missing. See positionManifestCard() and
   displayCalculatedItinerary() for how it's still auto-placed the first
   time it opens each session. */
makeDraggable(document.getElementById("route-itinerary-card"),document.getElementById("riHead"));

/* ---- warp manifest helpers (spec item 7) ---- */
var _activeRouteData=[];
var _SCIFI_LOGS=[
  "FETCHING GALACTIC VOXEL INDEXES...",
  "SCANNING REGIONAL SPECTRAL CLASS HIERARCHIES...",
  "ISOLATING BLACK HOLE EVENT HORIZONS...",
  "CONVERTING VOXEL HEX TO LOCAL SYSTEM INDEX...",
  "CALCULATING FUEL-OPTIMISED WARP HOP PATHS...",
  "FILTERING ATLAS INTERFACE CHRONOLOGY SEEDS...",
  "QUERYING EUCLID CORE APPROXIMATIONS...",
  "CORRELATING PORTAL GLYPH ADJACENCY MATRIX...",
  "GENERATING HYPERDRIVE MANIFEST SEGMENTS...",
  "EVALUATING BIOME MATRICES FOR LUSH SPONS...",
  "SYNCHRONISING INTERSTELLAR COORDINATE BUFFERS...",
  "RESOLVING LOCAL ANOMALY VECTORS..."
];
var _warpFailTimer=null;
var _warpGen=0;
function playWarpTransition(kind){
  if(!WARP_ENABLED) return;
  var ov=document.getElementById('warp-overlay');
  var vid=document.getElementById('warp-vid');
  if(!ov||!vid) return;
  if(_warpFailTimer){ clearTimeout(_warpFailTimer); _warpFailTimer=null; }
  // 2026-08-30, honest-review fix: jumping again (Random/search/glyph
  // keypad, all typically fast repeat clicks) while a clip was still
  // loading/playing called this a second time, and vid.load() below aborts
  // the FIRST call's still-pending play() promise. That promise's own
  // .catch() then fired --- after the second call had already re-shown the
  // overlay for the NEW jump --- and its "rejected, hide the overlay"
  // fallback logic hid the SECOND warp's overlay too, plus logged a scary
  // console.warn for what's actually an expected, harmless interruption.
  // myGen/_warpGen lets every callback below check "am I still the most
  // recent warp, or did a newer one already start" before touching the
  // overlay or the console -- a stale call now quietly no-ops instead.
  /* 2026-08-25, Tony: two distinct clips matching the real game's two
     separate travel mechanics -- portals are on-foot, walk-through-a-
     glowing-ring, no ship ever visible; hyperdrive/plotted travel is the
     ship-flown warp tunnel. 'portal' (default) is used for any raw-address
     lookup (typing hex, glyph keypad, Random, search results, admin
     "view"). 'ship' is the original ship-hyperdrive footage, reserved for
     the Set course -> Jump to -> Enter system flow -- left untouched below.
     Swap the <source> targets and reload rather than keeping two separate
     <video> elements, since only one is ever showing at a time.
     2026-08-26, Tony: the portal clip swapped again -- the placeholder
     green footage replaced with Tony's own real filmed portal-ring warp
     (actual in-game purple/pink colours), transcoded from his 1920x1080
     HEVC phone capture down to 960x540 H.264/VP9 (audio stripped -- #warp-
     vid is muted anyway, so it was dead weight) to match this project's
     existing web-delivery format for this element. Real clip length is
     10.4s, up from the old ~4.8s -- see the timeout below, which had to
     move with it. */
  var myGen=++_warpGen;
  var isShip=(kind==="ship");
  var webmSrc=isShip?"warp_transition.webm":"warp_transition_portal.webm";
  var mp4Src=isShip?"warp_transition.mp4":"warp_transition_portal.mp4";
  var sWebm=vid.querySelector('source[type="video/webm"]');
  var sMp4=vid.querySelector('source[type="video/mp4"]');
  if(sWebm) sWebm.src=webmSrc;
  if(sMp4) sMp4.src=mp4Src;
  ov.style.display='block';
  vid.load();
  /* 2026-08-25, honest-review fix: this used to have no error path and no
     ceiling on how long it could sit on-screen. If the clip failed to
     decode/load after play() had already resolved (or stalled buffering on
     a slow connection), neither onended nor the play().catch() below ever
     fired, and a traveller was left staring at a plain black screen with
     only the small "TAP TO SKIP" label as their one way out. Both an
     onerror handler and a hard timeout (a little over the ~3-4s clips'
     real length) now force the overlay closed no matter what went wrong,
     same "always have an escape hatch" spirit as ABORT on the route loader. */
  vid.onerror=function(){
    if(myGen!==_warpGen) return;
    console.warn('[warp] video element errored, code='+(vid.error?vid.error.code:'?')+' src='+vid.currentSrc);
    ov.style.display='none'; vid.onerror=null;
    if(_warpFailTimer){ clearTimeout(_warpFailTimer); _warpFailTimer=null; }
  };
  var _warpCleared=false;
  vid.play().then(function(){
    if(myGen!==_warpGen) return;
    console.log('[warp] play() resolved for '+vid.currentSrc);
  }).catch(function(err){
    // 2026-08-30, honest-review recheck: the myGen!==_warpGen guard above
    // only catches a stale call whose play() promise settles AFTER a newer
    // jump has already bumped _warpGen -- true rapid-click bursts (mashing
    // Random, glyph keypad, search results) can still get an AbortError on
    // what IS the current generation at the moment the promise settles,
    // because browsers can reject play() for a request that's about to be
    // superseded before the next click's own gen bump has actually run yet.
    // AbortError specifically is Chrome's own documented "play() request
    // was interrupted" case (https://goo.gl/LdLk22) -- it is ALWAYS benign,
    // never a sign of a real failure, regardless of which generation it
    // belongs to. Genuine problems (decode errors, unsupported source,
    // autoplay blocked) surface as a different err.name here, or via
    // vid.onerror / the timeout failsafe below -- never as AbortError -- so
    // only those non-AbortError cases are still worth a console warning.
    if(err.name!=='AbortError'){
      if(myGen===_warpGen) console.warn('[warp] play() rejected: '+err.name+' -- '+err.message);
    }
    // Hiding the overlay is still gated on gen match: a stale call's own
    // rejection (of either kind) must never hide an overlay that already
    // belongs to a newer warp.
    if(myGen!==_warpGen) return;
    ov.style.display='none';
  });
  vid.onended=function(){
    if(myGen!==_warpGen) return;
    ov.style.display='none'; vid.onended=null; _warpCleared=true;
    if(_warpFailTimer){ clearTimeout(_warpFailTimer); _warpFailTimer=null; }
  };
  // Ceiling bumped 7000->15000 (2026-08-26): this is a shared failsafe for
  // BOTH clips (portal + ship), sized to whichever is longer. The portal
  // clip is now Tony's real 10.4s footage (was ~4.8s) -- 7s would force-
  // close it mid-playback on every single normal run, not just genuine
  // stalls. Harmless for the shorter, untouched ship clip: onended still
  // fires and closes the overlay the moment IT finishes, same as always --
  // this ceiling only ever matters on a real stall/error, for either clip.
  _warpFailTimer=setTimeout(function(){
    if(!_warpCleared) console.warn('[warp] timed out after 15s, readyState='+vid.readyState+' networkState='+vid.networkState+' paused='+vid.paused+' -- forcing overlay closed');
    ov.style.display='none';
  },15000);
}
function skipWarp(){
  var ov=document.getElementById('warp-overlay');
  var vid=document.getElementById('warp-vid');
  if(ov) ov.style.display='none';
  if(vid){ vid.pause(); vid.onended=null; vid.onerror=null; }
  if(_warpFailTimer){ clearTimeout(_warpFailTimer); _warpFailTimer=null; }
}
/* 2026-08-26, Tony: "opens up way over top left when should only open next
   to system information, also wants to be like all other windows draggable
   and collapsible" -- this used to re-measure and re-place the card EVERY
   time it opened or refreshed, unlike every other box in the file. A
   transient zero-size #course rect on any one of those calls (e.g. mid
   reflow) left it pinned in the top-left corner for good, with no way to
   drag it back out since it wasn't draggable -- same root class of bug
   positionCourseCard() (see its own comment) already had to fix for
   #course itself. Now follows that exact same one-shot pattern: auto
   -anchor once per session (or after a resize clears it, see
   resetDraggedBoxes()), then leave it alone -- a real drag (now wired up
   below) or a window resize are the only things that move it after that.
   Prefers directly under #course (keeps the Course/Manifest pair visually
   grouped); falls back to immediately left of the system info panel --
   Tony's own ask, and the same spot #course itself defaults to. */
/* 2026-09-13, honest-review fix: every button-anchored popover below sets
   top=triggerButton.bottom+8 with nothing stopping that from landing so
   low that part of the box -- #searchPop's own Scan button, confirmed live
   -- renders below window.innerHeight. html/body are overflow:hidden
   everywhere in this app (fixed canvas layout), so there's no page scroll
   to fall back on, and a popover's own .scroll class (see #searchPop's
   remeasureScroll()) only helps when ITS CONTENT is taller than its own
   box -- it does nothing when the box itself is positioned past the
   bottom edge. Same "measure real space, don't guess" fix as
   positionHyperPanel()/tourPosition() elsewhere in this file: after a
   popover is positioned, or its content height changes, pull its top up
   just enough to keep its own bottom on-screen. Shared here rather than
   re-derived per box (#searchPop, #routesPop, #accessPop, this manifest
   card all anchor the same way). */
function clampPopoverTop(pop,minTop){
  var r=pop.getBoundingClientRect();
  if(!r.height) return; // not open/laid out yet -- nothing to clamp
  var top=Math.min(r.top,window.innerHeight-8-r.height);
  pop.style.top=Math.max(minTop||8,top)+"px";
}
function positionManifestCard(){
  var card=document.getElementById("route-itinerary-card");
  if(!card) return;
  if(card.style.left) return; /* already dragged, or already auto-anchored this session */
  var cw=card.offsetWidth||300;
  var course=document.getElementById("course");
  var left,top;
  if(course&&course.classList.contains("show")){
    var r=course.getBoundingClientRect();
    if(!r.width) return; /* #course not actually laid out yet -- try again next call rather than anchor at 0,0 */
    left=r.left; top=r.bottom+8;
  } else {
    var panel=document.getElementById("panel");
    if(panel&&panel.classList.contains("show")){
      left=panel.getBoundingClientRect().left-cw-16;
      top=parseFloat(getComputedStyle(card).top)||70;
    } else {
      return; /* nothing else open to avoid -- default centred CSS position is fine */
    }
  }
  left=Math.max(8,Math.min(window.innerWidth-cw-8,left));
  card.style.position="fixed";
  card.style.left=left+"px";
  card.style.top=top+"px";
  card.style.right="auto";
  card.style.transform="none";
  clampPopoverTop(card);
}
/* Fills in the manifest's content. As of 2026-08-21 this no longer forces
   the card open on every course plot (Tony: clicking any star re-plots the
   course, so an always-auto-opening manifest popped up on every single
   click -- exactly the "separate window" behaviour he asked to replace).
   It now only shows itself if the traveller already had it open (a
   re-plot while it's open just refreshes + re-anchors it); otherwise it
   stays closed until #bToggleManifest is clicked. */
function displayCalculatedItinerary(waypoints,totalLY){
  var card=document.getElementById("route-itinerary-card");
  var stepsList=document.getElementById("route-steps-list");
  var statJumps=document.getElementById("stat-jumps");
  var statDist=document.getElementById("stat-dist");
  if(!card||!waypoints||waypoints.length<2) return;
  _activeRouteData=waypoints;
  stepsList.innerHTML="";
  statJumps.textContent=waypoints.length-1;
  statDist.textContent=commas(totalLY)+" LY";
  waypoints.forEach(function(wp,i){
    var label=i===0?"START":i===waypoints.length-1?"DESTINATION":"HOP "+i;
    var name=wp.name||(wp.real?"(system)":"(open space)");
    var addr=wp.address||"";
    /* 2026-08-26: only a hop with a real portal address is a real system
       to preview -- an "(open space)" stop has none, so it stays plain. */
    var attrs=addr?(' class="hopRow" data-hop-idx="'+i+'" title="Click to preview this system\'s info"'):"";
    stepsList.innerHTML+='<div'+attrs+' style="margin-bottom:6px"><b style="color:var(--cyan)">['+label+']</b> '+
      name+'<br><span style="opacity:0.55;font-size:10px">'+addr+'</span></div>';
  });
  if(card.classList.contains("show")) positionManifestCard();
}
/* 2026-08-26, Tony: "why aren't the highlighted hop not clickable... show
   information about that star system but be able to go back to target
   information in one click" -- delegated so it keeps working across every
   displayCalculatedItinerary() re-render (innerHTML rebuild). */
document.getElementById("route-steps-list").addEventListener("click",function(e){
  var row=e.target.closest?e.target.closest(".hopRow"):null;
  if(!row) return;
  /* 2026-08-26: index straight into courseWaypoints (the exact array
     displayCalculatedItinerary() just rendered from) instead of decoding
     the printed address back into coordinates -- guarantees the system
     shown here is always the literal same object the row's own name came
     from, never a second, independently-regenerated one that could
     disagree with it. */
  var idx=parseInt(row.getAttribute("data-hop-idx"),10);
  if(isNaN(idx)||!courseWaypoints||!courseWaypoints[idx]) return;
  var sys=courseWaypoints[idx];
  updatePanel(sys);
  if(courseTarget&&sys.address!==courseTarget.address) showHopPreviewBar();
});
function showHopPreviewBar(){
  var bar=document.getElementById("hopPreviewBar");
  if(!bar||!courseTarget) return;
  document.getElementById("hopPreviewTarget").textContent=courseTarget.name;
  bar.style.display="flex";
}
function hideHopPreviewBar(){
  var bar=document.getElementById("hopPreviewBar");
  if(bar) bar.style.display="none";
}
document.getElementById("bBackToTarget").addEventListener("click",function(){
  if(courseTarget) updatePanel(courseTarget);
});
document.getElementById("bToggleManifest").addEventListener("click",function(){
  var card=document.getElementById("route-itinerary-card");
  var btn=this;
  if(card.classList.contains("show")){
    card.classList.remove("show");
    btn.classList.remove("on");
    btn.innerHTML="&#9662; Manifest";
  } else {
    card.classList.remove("min");
    document.getElementById("bManifestMin").innerHTML="&#9662;";
    positionManifestCard();
    card.classList.add("show");
    btn.classList.add("on");
    btn.innerHTML="&#9652; Manifest";
  }
});
/* PLAN JOURNEY -- goes to the Galactic Navigator (a separate page on this
   same site) IN PLACE, in this same tab, passing the real plotted origin/
   destination/jumps/distance through as URL params. Reads the same live
   globals bCourse/bGoCourse already read (focusSystem, courseTarget) plus
   the stats the manifest card is already showing (#stat-jumps/#stat-dist)
   -- no new state, nothing computed twice, nothing invented. 2026-08-29.
   2026-08-30 (Tony: multiple journeys were piling up separate browser
   windows): first tried opening the Navigator in a new tab and reusing a
   named window across repeat clicks, but Tony's actual ask was simpler
   and cleaner than that -- no second window at all, just the one map tab
   navigating to the Navigator and back, the same way an ordinary link
   would. So this is now a plain `location.href`, exactly like the
   Navigator's own #backToMap and complete.html's #viewMap buttons already
   navigate back here (both already existed, already same-tab) -- this
   was the one leg of the round trip still opening a window instead of
   just navigating. */
document.getElementById("bPlanJourney").addEventListener("click",function(){
  if(!focusSystem||!courseTarget){ toast("Plot a course first"); return; }
  /* 2026-08-29: also hand off the real galaxy number and the real drive
     type/range currently set in Filters, so Navigator can render this
     journey's actual galaxy art and show the real hyperdrive instead of
     a generic sample -- same "everything real, nothing invented" rule as
     the from/to/jumps/dist fields already handed off above. */

  /* 2026-08-29 (later same day, Tony: "the mock is not really showing as
     would live for example the glyph placements etc... i also want the
     economy etc to be active by pulling whats needed"): the Navigator was
     still always showing its own baked-in sample route/glyphs/economy no
     matter what was actually plotted here -- this "PLAN JOURNEY" button
     only ever sent the two endpoints + aggregate stats, never the real
     hop-by-hop systems. Fixed by handing off the REAL route: every
     waypoint courseWaypoints already holds, upgraded to a full
     generateSystem() object (mergeWaypointsIntoSlice() -- already called
     when the course was plotted/displayed, called again here defensively
     in case anything since reverted a waypoint to a placeholder) so each
     hop carries its real name, glyph address, region, star type, race,
     economy, conflict and black-hole/Atlas flags -- the exact same
     algorithm the live map itself uses everywhere else, not a guess made
     up for this handoff. Per-hop distance is computed the same way the
     route line itself is drawn (wpDist, world units -> LY via VOX_LY).
     Encoded as one JSON array in the "hops" param -- static site, no
     server involved, so a long query string costs nothing and the link
     stays a genuine, reloadable deep link into this exact real route. */
  mergeWaypointsIntoSlice();
  var hops=(courseWaypoints||[]).map(function(wp,i){
    var prev=i>0?courseWaypoints[i-1]:null;
    return {
      systemName:wp.name||"",
      address:wp.address||"",
      region:wp.region||"",
      starType:wp.type||"",
      race:wp.race||"",
      economy:wp.econType||"",
      econType:wp.econType||"",
      econTier:(wp.econTier!=null?wp.econTier:null),
      conflict:wp.conflict||"",
      conTier:(wp.conTier!=null?wp.conTier:null),
      outlaw:!!wp.outlaw,
      abandoned:!!wp.abandoned,
      uncharted:!!wp.uncharted,
      isBlackHole:!!wp.blackHole,
      isAtlas:!!wp.atlas,
      coords:{x:wp.vx,y:wp.vy,z:wp.vz},
      distance:prev?Math.round(wpDist(prev,wp)*VOX_LY):0
    };
  });
  /* 2026-08-30, honest-review fix: reuse the exact same route-distance
     total the Warp Manifest is already showing (courseRouteLY, set in
     _finishSetCourse from these same per-hop distances) instead of
     re-summing hops[].distance here -- two summations of the same numbers
     should never be able to drift apart, and this removes the only other
     place a "total route distance" was ever computed independently. */
  var qs=new URLSearchParams({
    from:focusSystem.address||"",
    fromName:focusSystem.name||"",
    to:courseTarget.address||"",
    toName:courseTarget.name||"",
    jumps:String(Math.max(0,hops.length-1)),
    dist:commas(courseRouteLY)+" LY",
    galaxy:String(GALAXY),
    galaxyName:GALAXIES[GALAXY]||("Galaxy "+GALAXY),
    drive:currentDrive().k,
    range:document.getElementById("fHyper").value||"",
    hops:JSON.stringify(hops)
  });
  location.href="navigator/index.html?"+qs.toString();
});
/* hide manifest when course is cleared */
document.getElementById("bClrCourse").addEventListener("click",function(){
  var card=document.getElementById("route-itinerary-card");
  if(card) card.classList.remove("show");
  var btn=document.getElementById("bToggleManifest");
  if(btn){ btn.classList.remove("on"); btn.innerHTML="&#9662; Manifest"; }
},true);
/* copy button */
(function(){
  var btn=document.getElementById("copy-route-btn");
  if(!btn) return;
  btn.addEventListener("click",function(){
    if(!_activeRouteData.length) return;
    var txt="--- NO MAN'S SKY FLIGHT ROUTE MANIFEST ---\n";
    txt+="Total Warp Jumps: "+(_activeRouteData.length-1)+"\n\n";
    _activeRouteData.forEach(function(wp,i){
      var label=i===0?"STARTING POINT":i===_activeRouteData.length-1?"FINAL DESTINATION":"WARP JUMP STEP "+i;
      txt+="["+label+"]\n";
      txt+="System: "+(wp.name||(wp.real?"(system)":"(open space)"))+"\n";
      if(wp.address) txt+="Portal Hex: "+wp.address+"\n";
      txt+="-----------------------------------------\n";
    });
    navigator.clipboard.writeText(txt).then(function(){
      var orig=btn.textContent;
      btn.textContent="COPIED! ✓";
      btn.style.color="#fff";
      btn.style.background="var(--color-matrix)";
      setTimeout(function(){
        btn.textContent=orig;
        btn.style.color="";
        btn.style.background="";
      },1500);
    }).catch(function(err){
      console.error("Clipboard copy failed:",err);
    });
  });
})();
/* Any drag position is a manual override tied to the current window size/orientation --
   reset it on resize (covers rotation too) rather than risk a box left stranded
   off-screen or behind the toolbar after the layout changes underneath it. */
function resetDraggedBoxes(){
  for(var i=0;i<draggedBoxes.length;i++){
    var el=draggedBoxes[i];
    el.style.position=""; el.style.left=""; el.style.top="";
    el.style.right=""; el.style.bottom=""; el.style.transform="";
  }
}
window.addEventListener("resize",resetDraggedBoxes);

/* ============ edit / report modal ============ */
function escAttr(s){
  return String(s==null?"":s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
/* Economy and conflict are, in the real game, always drawn from a fixed word
   list (same ECON/CONFLICT tables the procedural generator itself uses) --
   not free text -- so a dropdown is both easier to use and more accurate
   than a text box a traveller has to type an exact match into by hand. */
var CONFLICT_TIER_LB=["Low","Medium","High"];
var ECON_TIER_LB=["Poor","Average","Good"];
/* Cosmetic rebuild 2026-08-17 (Tony): replaces the 3 native <select>
   elements above with a small icon+search combo, built once here as a
   generic helper and reused for all 3 fields. A native <select> can't show
   an icon inside an <option> in any browser, so getting the same icon-per-
   choice look Tony wanted (matching the info panel's own icons) requires a
   custom pop-open list; Tony also asked for type-to-filter, so the same
   text box that displays/holds the current value doubles as a live search
   box -- same interaction already proven by the Search-by-name popup
   (#searchPop) elsewhere in this file, just anchored under its own field
   instead of floating over the whole viewport. The input's own .value IS
   the saved field (same as the old select's .value) so every downstream
   read (openEditModal, validateEdit, the save payload) needed zero changes. */
function buildIconCombo(inputId,listId,groups,blankLabel,allowCustom){
  var inp=document.getElementById(inputId), list=document.getElementById(listId);
  var items=[], i, j;
  if(blankLabel) items.push({label:"",display:blankLabel,groupLabel:null,iconHtml:svg(IC_UNINHAB)});
  for(i=0;i<groups.length;i++){
    var g=groups[i];
    for(j=0;j<g.items.length;j++){
      // Item can be a plain string (existing Economy/Conflict/Sentinel
      // combos -- label and display are the same, exactly as before) or an
      // {v,d} object (added 2026-09-06 for the Biome combo's sub-name
      // support below): v is what actually gets stored/submitted, d is
      // what's shown/searched in the list. Lets a traveller find and pick
      // "Airless" while the field still saves "Dead" -- see
      // biomeComboGroups() and BIOME_SUBNAMES above for why.
      var raw=g.items[j];
      var val=(raw&&typeof raw==="object")?raw.v:raw;
      var disp=(raw&&typeof raw==="object")?raw.d:raw;
      items.push({label:val,display:disp,groupLabel:g.label,iconHtml:g.iconHtml});
    }
  }
  var lastCommitted=inp.value||"";
  function render(filterText){
    var q=(filterText||"").trim().toLowerCase(), html="", lastGrp, shown=0, k, it;
    for(k=0;k<items.length;k++){
      it=items[k];
      if(q && it.display.toLowerCase().indexOf(q)<0) continue;
      if(it.groupLabel!==lastGrp){
        if(it.groupLabel) html+='<div class="icomboGrp">'+escAttr(it.groupLabel)+'</div>';
        lastGrp=it.groupLabel;
      }
      html+='<div class="icomboOpt" data-val="'+escAttr(it.label)+'">'+it.iconHtml+
        '<span>'+escAttr(it.display)+'</span></div>';
      shown++;
    }
    if(!shown){
      html = (allowCustom && q)
        ? '<div class="icomboEmpty">No match -- press Enter to add &quot;'+escAttr(filterText.trim())+'&quot; as a new type</div>'
        : '<div class="icomboEmpty">No match</div>';
    }
    list.innerHTML=html;
  }
  inp.addEventListener("focus",function(){ lastCommitted=inp.value; render(""); list.classList.add("show"); });
  inp.addEventListener("input",function(){ render(inp.value); list.classList.add("show"); });
  inp.addEventListener("keydown",function(e){
    if(e.key==="Escape"){ list.classList.remove("show"); inp.blur(); }
    else if(e.key==="Enter"){
      var first=list.querySelector(".icomboOpt");
      if(first){ inp.value=first.getAttribute("data-val"); lastCommitted=inp.value; list.classList.remove("show"); e.preventDefault();
        inp.dispatchEvent(new Event("change",{bubbles:true})); }
      else if(allowCustom && inp.value.trim()){
        inp.value=inp.value.trim(); lastCommitted=inp.value; list.classList.remove("show"); e.preventDefault();
        inp.dispatchEvent(new Event("change",{bubbles:true}));
      }
    }
  });
  list.addEventListener("mousedown",function(e){
    var row=e.target.closest?e.target.closest(".icomboOpt"):null;
    if(!row) return;
    inp.value=row.getAttribute("data-val"); lastCommitted=inp.value;
    list.classList.remove("show");
    inp.dispatchEvent(new Event("change",{bubbles:true}));
  });
  /* commitNow() is the same "does the typed text exactly match a real
     option?" check the blur handler below runs, pulled into its own
     function and attached to the input itself (inp._icomboCommit) so it
     can ALSO be run synchronously on demand -- see flushAllCombos().
     Real bug this fixes (Tony, 2026-08-17): typing a value straight into
     the box (not clicking a suggestion from the list) then immediately
     clicking Save blurs this input -- but blur's own commit used to be
     deliberately delayed 120ms (to let a mousedown list-selection's own
     value land first), so Save's click handler ran and read the OLD
     editBodies value before that 120ms timeout ever fired. The typed text
     was visibly sitting in the box, looked saved, but silently never made
     it into the payload -- exactly Tony's "put in Frequent, saved, came
     back as None" report, and only for typed (not clicked) values, which
     is why it looked intermittent rather than always-broken. */
  function commitNow(){
    var v=inp.value.trim();
    var valid = v==="" ? !!blankLabel : (allowCustom ? true : items.some(function(it2){ return it2.label===v; }));
    inp.value = valid ? inp.value : lastCommitted;
    if(valid){ lastCommitted=inp.value; inp.dispatchEvent(new Event("change",{bubbles:true})); }
  }
  inp._icomboCommit=commitNow;
  inp.addEventListener("blur",function(){
    /* Deliberate typo guard: since typed text now goes straight into the
       real saved field, a partial/misspelled entry left uncommitted (no
       click, no Enter) would otherwise submit garbage to a field the site
       and filter.mjs both treat as a fixed word list -- so on blur, only
       keep the typed text if it exactly matches a real option (or is blank
       and blank is allowed), otherwise snap back to whatever was valid
       before this focus. setTimeout lets a mousedown selection above land
       first (mousedown fires before this blur). */
    setTimeout(function(){ commitNow(); list.classList.remove("show"); },120);
  });
}
/* Every .icomboInput currently in the DOM registers its own commitNow()
   here (see inp._icomboCommit above) -- flushAllCombos() forces every one
   of them to commit its live value RIGHT NOW, synchronously, bypassing
   blur's 120ms delay entirely. Called at the top of the Save click handler
   so a typed-not-clicked Biome/Sentinel/Economy/Economy-strength/Conflict
   value can never lose the race described in commitNow()'s comment. */
function flushAllCombos(){
  var els=document.querySelectorAll(".icomboInput");
  for(var ci=0;ci<els.length;ci++){ if(els[ci]._icomboCommit) els[ci]._icomboCommit(); }
}
/* Case-insensitive alphabetical sort, returning a NEW array -- used to fix
   a real ordering bug Tony flagged (2026-09-01): every dropdown/combo list
   in Edit system was showing items in whatever order the underlying data
   table happened to define them (wiki category order, generation-tier
   order, etc), not alphabetical, making a specific item slow to find by
   eye. Never mutates the array passed in, since several of these (BIOME_KEYS,
   ECON, CONFLICT, SENTINEL_WORDS...) are shared, order-sensitive tables
   read elsewhere in the file for actual generation logic -- only the
   COMBO'S OWN DISPLAY COPY gets reordered, never the source data. */
function sortAlphaCI(arr){
  return arr.slice().sort(function(a,b){
    var x=String(a).toLowerCase(), y=String(b).toLowerCase();
    return x<y?-1:(x>y?1:0);
  });
}
/* Comma-list free-text combo (Resources/Flora/Fauna/Minerals/Salvageable
   tech/Fossils) -- like buildIconCombo() above, but for a field that can
   hold MULTIPLE comma-separated items with no fixed word list to validate
   against (typing anything is always a valid save, canon/learned terms are
   suggestions only). Fixes two real bugs Tony reported (2026-09-01): (1)
   suggestions came out in wiki-category/most-recent order rather than
   alphabetical -- fixed via sortAlphaCI() above; (2) a native <datalist>
   (this field's old mechanism) matches the WHOLE input value as one
   string, so once a first item + comma was typed, nothing typed after
   that could ever match a single-word suggestion again -- the dropdown
   just stopped appearing for every item after the 1st, defeating the
   point of a suggestion list. This filters against only the text after
   the LAST comma, and inserts a picked suggestion back into just that
   segment (leaving every earlier item untouched) -- so suggestions work
   identically for the 1st, 2nd, 3rd... item typed into the field. Reuses
   the same .icombo/.icomboList/.icomboOpt CSS as buildIconCombo. */
function buildCommaCombo(inputId,listId,canonArr,knownKey){
  var inp=document.getElementById(inputId), list=document.getElementById(listId);
  if(!inp||!list) return;
  function allItems(){
    var learned=knownTerms[knownKey]||[];
    var community=(OVERRIDES.communityTerms&&OVERRIDES.communityTerms[knownKey])||[];
    var seen={}, arr=[];
    canonArr.concat(community).concat(learned).forEach(function(v){
      var lo=v.toLowerCase();
      if(!seen[lo]){ seen[lo]=1; arr.push(v); }
    });
    return sortAlphaCI(arr);
  }
  function segments(){ return inp.value.split(","); }
  function lastSeg(){
    var parts=segments();
    return parts[parts.length-1].replace(/^\s+/,"");
  }
  function priorItems(){
    var parts=segments();
    return parts.slice(0,-1).map(function(p){ return p.trim(); }).filter(Boolean);
  }
  function render(){
    var q=lastSeg().toLowerCase(), used={}, html="", shown=0, k, it, lo;
    priorItems().forEach(function(p){ used[p.toLowerCase()]=1; });
    var items=allItems();
    for(k=0;k<items.length && shown<60;k++){
      it=items[k]; lo=it.toLowerCase();
      if(used[lo]) continue;
      if(q && lo.indexOf(q)<0) continue;
      html+='<div class="icomboOpt" data-val="'+escAttr(it)+'"><span>'+escAttr(it)+'</span></div>';
      shown++;
    }
    if(!shown) html='<div class="icomboEmpty">No match -- type your own, it\u2019ll still save</div>';
    list.innerHTML=html;
  }
  function pick(val){
    var newVal=priorItems().concat([val]).join(", ")+", ";
    var maxLen=+inp.getAttribute("maxlength")||0;
    if(maxLen && newVal.length>maxLen) newVal=newVal.slice(0,maxLen);
    inp.value=newVal;
    render();
    list.classList.add("show");
    // Delegated on #bodyEditList (see its "input" listener) -- this is what
    // actually writes the picked value into editBodies[i] and re-runs
    // checkItemLenWarn(), same as if the traveller had typed it by hand.
    inp.dispatchEvent(new Event("input",{bubbles:true}));
  }
  inp.addEventListener("focus",function(){ render(); list.classList.add("show"); });
  inp.addEventListener("input",function(){ render(); list.classList.add("show"); });
  inp.addEventListener("keydown",function(e){
    if(e.key==="Escape"){ list.classList.remove("show"); }
    else if(e.key==="Enter"){
      var first=list.querySelector(".icomboOpt");
      if(first){ pick(first.getAttribute("data-val")); e.preventDefault(); }
    }
  });
  list.addEventListener("mousedown",function(e){
    var row=e.target.closest?e.target.closest(".icomboOpt"):null;
    if(!row) return;
    e.preventDefault(); // .icomboOpt is a plain div (not natively focusable)
                         // so this never actually moves focus off inp -- kept
                         // for robustness, matching buildIconCombo's intent.
    pick(row.getAttribute("data-val"));
  });
  inp.addEventListener("blur",function(){
    setTimeout(function(){ list.classList.remove("show"); },120);
  });
}
function buildEconConflictSelects(){
  buildIconCombo("edEcon","edEconList",
    // "Data Unavailable" (Tony's own in-game screenshot, 2026-09-02): a
    // real, distinct, savable economy name -- NOT the same as the blank
    // "uncharted / none" placeholder below, which wipes the icon/stars/
    // sell-buy display entirely. The real game still shows the economy
    // icon, star rating and sell/buy % for an abandoned system, just with
    // "Data Unavailable" as the name instead of a real flavour word --
    // this option lets a traveller document that exact combination.
    [{label:null,items:["Data Unavailable"],iconHtml:svg(IC_UNINHAB,"#8892a6")}].concat(
      ECON.map(function(g){ return {label:g[0],items:sortAlphaCI(g[1]),iconHtml:econIcon(g[0])}; })
    ),
    "— uncharted / none —");
  buildIconCombo("edEconStr","edEconStrList",
    ECON_S.map(function(arr,i){ return {label:ECON_TIER_LB[i]||("Tier "+i),items:sortAlphaCI(arr),iconHtml:ecoStars(i)}; }));
  /* Tony noticed (2026-08-17) the info panel's Conflict row shows a real
     tier-number badge (1/2/3, via conBadge()) but the new dropdown list only
     had the crossed-swords icon with no number -- adding the exact same
     .conBadge markup used in the panel so the list reads the same way.
     Items within each tier alphabetized 2026-09-01 (see sortAlphaCI). */
  buildIconCombo("edConflict","edConflictList",
    // "Not Available" (2026-09-02, Tony's own in-game screenshot): an
    // abandoned system showed no Conflict line at all -- confirmed against
    // the wiki too (abandoned systems always show "no conflict rating,
    // Not Available"). Hides the whole Conflict row in the info panel,
    // same mechanism as Sentinel's "Not shown" -- see drawSystem() below.
    [{label:null,items:["Not Available"],iconHtml:svg(IC_CONFLICT,"#5a6a76")}].concat(
      CONFLICT.map(function(arr,i){ return {label:CONFLICT_TIER_LB[i]||("Tier "+i),items:sortAlphaCI(arr),
        iconHtml:svg(IC_CONFLICT,CONFLICT_COL[i])+'<span class="conBadge"><b>'+(i+1)+'</b></span>'}; }))
    );
}
buildEconConflictSelects();
// Per-body Biome/Sentinel combos (added 2026-08-17, Tony: "biome and Sentinel
// activity could do with being the same as Conflict level as in can type
// then all consistent") -- unlike Economy/Conflict above, these are rebuilt
// every time the accordion row they live in is (re)opened, since each body
// row is its own DOM instance with a unique index-suffixed id, not a single
// static field. One tiny single-item "group" per biome so each gets its own
// colour-matched icon rather than sharing one icon across a whole tier.
// UPDATED 2026-09-06 (biome-corpus research pass): each group now also
// carries every real in-game sub-name BIOME_SUBNAMES knows for that biome
// (e.g. "Airless" under Dead), so a traveller can search/select using the
// exact wording they saw on screen. Every item in a group -- the canonical
// name itself plus every sub-name -- shares that group's {v:k} value, so
// picking any of them stores and submits the same canonical key; the
// input box settling on the canonical name after a sub-name is picked is
// intentional (matches what's actually saved), not a bug.
// Mega Exotic's Red/Green/Blue name pools are colour-locked in the real
// game (2026-09-08 research) -- this returns the union of whichever pools
// apply to the star colour(s) currently selected in the Edit System form
// (editStars, module-scope above), falling back to all 3 for a yellow/
// purple system (the wiki: "in purple and yellow star systems, any of the
// 3 types can be found") or if editStars isn't populated yet.
function megaExoticSubs(){
  var cols=(typeof editStars!=="undefined"?editStars:[]).map(function(s){ return s.color; })
    .filter(function(c){ return c==="red"||c==="green"||c==="blue"; });
  if(!cols.length) cols=["red","green","blue"];
  var seen={}, out=[];
  cols.forEach(function(c){
    (MEGA_EXOTIC_SUBNAMES[c]||[]).forEach(function(s){
      var lo=s.toLowerCase();
      if(!seen[lo]){ seen[lo]=1; out.push(s); }
    });
  });
  return out;
}
// Community-reported biome text that doesn't match any canonical key or
// sub-name already in `usedLower` (2026-09-08, Tony: "if not in the list
// then what they type is added to the list for future inputs") -- same
// knownTerms(local)+OVERRIDES.communityTerms(shared) pattern as
// buildCommaCombo's allItems() above, just for a single-value field
// instead of a comma list. Returned as its own trailing, ungrouped-by-
// biome section since we genuinely don't know which real biome a typed-
// but-unrecognised value belongs to -- picking one just re-fills the exact
// text as typed, it doesn't reclassify it.
function biomeCommunityExtras(usedLower){
  var learned=(typeof knownTerms!=="undefined"&&knownTerms.biome)||[];
  var community=(typeof OVERRIDES!=="undefined"&&OVERRIDES.communityTerms&&OVERRIDES.communityTerms.biome)||[];
  var seen={}, out=[];
  community.concat(learned).forEach(function(v){
    var lo=String(v).toLowerCase();
    if(usedLower[lo]||seen[lo]) return;
    seen[lo]=1; out.push(v);
  });
  return sortAlphaCI(out);
}
function biomeComboGroups(){
  // Alphabetized for display (Tony, 2026-09-01) -- BIOME_KEYS itself keeps
  // its original insertion order since it's read elsewhere for real
  // generation logic; only this combo's own copy is reordered.
  // "The Reliquary" excluded from selection (2026-09-08) -- replaced by the
  // standalone `reliquary` boolean flag (see applyOverride()'s own comment
  // on why) -- BIOMES["The Reliquary"] is deliberately left defined for any
  // already-saved system that still has it as a biome value, just no
  // longer offered going forward.
  var usedLower={};
  var groups=sortAlphaCI(BIOME_KEYS).filter(function(k){ return k!=="The Reliquary"; }).map(function(k){
    var subs=(k==="Mega Exotic")?megaExoticSubs():(BIOME_SUBNAMES[k]||[]);
    var items=[{v:k,d:k}].concat(subs.map(function(s){ return {v:k,d:s}; }));
    items.forEach(function(it){ usedLower[it.d.toLowerCase()]=1; });
    return {label:k,items:items,iconHtml:svg(IC_BIOME,BIOMES[k].base)};
  });
  var extras=biomeCommunityExtras(usedLower);
  if(extras.length){
    groups.push({label:"Other reported",items:extras.map(function(s){ return {v:s,d:s}; }),iconHtml:svg(IC_BIOME,"#8892a6")});
  }
  return groups;
}
// Sub type combo (2026-09-08, Tony: "BIOME 'radioactive' / SUB TYPE 'nuclear'
// / CONDITIONS 'frequent radioactive storms'") -- splits what used to be a
// display-only search alias (picking "Isotopic" under Biome only ever saved
// "Radioactive", the specific wording was thrown away) into its OWN saved
// field. Reuses BIOME_SUBNAMES/MEGA_EXOTIC_SUBNAMES as the canon source --
// same research, now the literal savable value instead of just a lookup
// alias -- filtered to whichever Biome is CURRENTLY selected for this body,
// plus free-type-and-it-saves (allowCustom) and a shared "Other reported"
// community-extras group, same pattern as Biome itself.
function subtypeCommunityExtras(usedLower){
  var learned=(typeof knownTerms!=="undefined"&&knownTerms.subtype)||[];
  var community=(typeof OVERRIDES!=="undefined"&&OVERRIDES.communityTerms&&OVERRIDES.communityTerms.subtype)||[];
  var seen={}, out=[];
  community.concat(learned).forEach(function(v){
    var lo=String(v).toLowerCase();
    if(usedLower[lo]||seen[lo]) return;
    seen[lo]=1; out.push(v);
  });
  return sortAlphaCI(out);
}
function subtypeComboGroups(biomeKey){
  var subs=(biomeKey==="Mega Exotic")?megaExoticSubs():(BIOME_SUBNAMES[biomeKey]||[]);
  var usedLower={};
  subs.forEach(function(s){ usedLower[s.toLowerCase()]=1; });
  var groups=subs.length?[{label:null,items:subs.map(function(s){ return {v:s,d:s}; }),iconHtml:svg(IC_BIOME,(BIOMES[biomeKey]||BIOMES.Barren).base)}]:[];
  var extras=subtypeCommunityExtras(usedLower);
  if(extras.length) groups.push({label:"Other reported",items:extras.map(function(s){ return {v:s,d:s}; }),iconHtml:svg(IC_BIOME,"#8892a6")});
  return groups;
}
// Conditions combo (renamed from "Descriptor" in the UI, 2026-09-08 --
// Tony: "Descriptor name probably needs changing as people might not know
// what descriptor is") -- real weather-phrase word lists, sourced from the
// SAME per-biome wiki pages as BIOME_SUBNAMES (each biome's own "Weather[]"
// table -- Clear/Normal/Extreme columns flattened into one list; column
// tier isn't tracked separately since a traveller is reporting what they
// actually saw, not picking a severity). Dead and Gas Giant have no real
// list (Dead: wiki states "storms never occur"; Gas Giant: no discrete
// named phrases found, only prose) -- left empty, community/free-text only.
// Mega Exotic's 3 colour-locked weather sets are flattened into one union
// here rather than filtered by star colour like its biome sub-names are --
// a real refinement if it turns out to matter, not done in this pass.
// Internal field name stays `descriptor` (see applyOverride()/payload
// builder) -- only the UI label and its suggestion source changed, so
// nothing already saved needs migrating.
var CONDITIONS_CANON={
  "Lush": ["Temperate","Light Showers","Mild Rain","Refreshing Breeze","Humid","Pleasant","Balmy","Mellow","Beautiful","Blissful","Boiling Puddles","Sweltering Damp","Superheated Drizzle","Dangerously Hot Fog","Choking Humidity","Mostly Calm","Occasional Scalding Cloudbursts","Usually Mild","Blistering Damp","Lethal Humidity Outbreaks","Boiling Superstorms","Intense Heatbursts","Superheated Rain","Boiling Monsoons","Broiling Humidity","Painfully Hot Rain","Torrential Heat","Blistering Floods","Scalding Rainstorms","Torrid Deluges","Bilious Storms","Echoes of Acid","Deadly Pressure Variations","Harsh Toxic Wind","Corrupted Blood","Inescapable Toxins","Clouds of Haunted Green","Invisible Jade Winds","Infinite Toxic Mist","Poison Cyclones"],
  "Toxic": ["Acid Rain","Caustic Moisture","Choking Clouds","Corrosive Damp","Poison Rain","Poisonous Gas","Stinging Atmosphere","Stinging Puddles","Toxic Clouds","Toxic Damp","Acidic Dust Pockets","Alkaline Cloudbursts","Atmospheric Corruption","Caustic Winds","Corrosive Sleet Storms","Dangerously Toxic Rain","Infrequent Toxic Drizzle","Lethal Atmosphere","Occasional Acid Storms","Passing Toxic Fronts","Poison Flurries","Acidic Deluges","Bone-Stripping Acid Storms","Caustic Floods","Corrosive Cyclones","Corrosive Rainstorms","Corrosive Storms","Frequent Toxic Floods","Noxious Gas Storms","Pouring Toxic Rain","Torrential Acid","Toxic Monsoons","Toxic Outbreaks","Toxic Superstorms"],
  "Scorched": ["Parched","Overly Warm","Sunny","Dehydrated","Unending Sunlight","Direct Sunlight","Heated Atmosphere","Sweltering","Dangerously Hot","Burning Air","Infrequent Heat Storms","Rare Firestorms","Superheated Gas Pockets","Wandering Hot Spots","Atmospheric Heat Instabilities","Occasional Ash Storms","Incendiary Dust","Self-Igniting Storms","Extreme Heat","Burning Gas Clouds","Intense Heat","Superheated Air","Scalding Heat","Inferno Winds","Firestorms","Combustible Dust"],
  "Frozen": ["Crisp","Freezing","Frost","Icy","Permafrost","Powder Snow","Snowy","Wintry","Drifting Snowstorms","Frozen Clouds","Harsh, Icy Winds","Icy Blasts","Ice Storms","Infrequent Blizzards","Migratory Blizzards","Occasional Snowfall","Outbreaks of Frozen Rain","Wandering Frosts","Deep Freeze","Frequent Blizzards","Hazardous Whiteouts","Howling Blizzards","Icy Tempests","Intense Cold","Raging Snowstorms","Roaring Ice Storms","Supercooled Storms"],
  "Barren": ["Baked","Clear","Dry Gusts","Icy Nights","Moistureless","Sterile","Unclouded Skies","Withered","Blasted Atmosphere","Ceaseless Drought","Dust-Choked Winds","Freezing Night Winds","Highly Variable Temperatures","Infrequent Dust Storms","Intermittent Wind Blasting","Occasional Sandstorms","Parched Sands","Sporadic Grit Storms","Billowing Dust Storms","Choking Sandstorms","Dead Wastes","Extreme Wind Blasting","Hazardous Temperature Extremes","Howling Gales","Lung-Burning Night Wind","Planetwide Desiccation","Sand Blizzards"],
  "Radioactive": ["Contaminated Puddles","Gamma Dust","Irradiated Winds","Nuclidic Atmosphere","Radioactive Damp","Radioactive Humidity","Unstable Atmosphere","Volatile Winds","Volatile Windstorms","Energetic Storms","Irradiated Downpours","Irradiated Storms","Occasional Radiation Outbursts","Particulate Winds","Radioactive Dust Storms","Reactive Rain","Unstable Fog","Planet-Wide Radiation Storms","Contaminated Squalls","Enormous Nuclear Storms","Extreme Atmospheric Decay","Extreme Radioactivity","Extreme Thermonuclear Fog","Frequent Particle Eruptions","Gamma Cyclones","Irradiated Thunderstorms","Roaring Nuclear Wind"],
  "Irradiated": ["Contaminated Puddles","Gamma Dust","Irradiated Winds","Nuclidic Atmosphere","Radioactive Damp","Radioactive Humidity","Unstable Atmosphere","Volatile Winds","Volatile Windstorms","Energetic Storms","Irradiated Downpours","Irradiated Storms","Occasional Radiation Outbursts","Particulate Winds","Radioactive Dust Storms","Reactive Rain","Unstable Fog","Planet-Wide Radiation Storms","Contaminated Squalls","Enormous Nuclear Storms","Extreme Atmospheric Decay","Extreme Radioactivity","Extreme Thermonuclear Fog","Frequent Particle Eruptions","Gamma Cyclones","Irradiated Thunderstorms","Roaring Nuclear Wind"],
  "Marsh": ["Gentle Mist","Humid","Tropical Winds","Warm Fog","Temperate Murk","Mild Damp","Warm Dewdrops","Tepid Damp","Sweaty Drizzle","Muggy Haze","Tropical Storms","Occasional Boiling Fog","Superheated Mists","Painful Mist","Infrequent Torrents","Oppressive","Soggy Danger","Sticky Heat","Clammy Menace","Hazardous Moisture","Death Fog","Sultry Disaster","Cataclysmic Monsoons","Mists of Annihilation","All-Consuming Fog","Liquid Hell","Storms of Desolation","Melting Deluges","Boiling Catastrophe","Damp Misery"],
  "Volcanic": ["Sulphurous Haze","Ash Wisps","Drifting Smog","Cinderfalls","Ash Plumes","Choking Ash","Burning Mists","Sulfur Fumes","Enveloping Ash","Ashen Winds","Smothering Ash","Heated Gas Pockets","Occasional Firestorms","Incendiary Winds","Unpredictable Conflagrations","Drifting Firestorms","Pillars of Flame","Magma Geysers","Plumes of Fire","Molten Rain","Tectonic Storms","Frequent Firestorms","Walls of Flame","Clouds of Fire","Ashen Destruction","Magma Rain","Basalt Hail","Explosive Gas Eruptions","Lethal Ash Storms","Sulphurous Inferno","Colossal Firestorms","Obsidian Doom"],
  "Exotic": ["Invisible Mist","Internal Rain","Lost Clouds","Crimson Heat","Winds of Glass","Thirsty Clouds","Obsidian Heat","Memories of Frost","Haunted Frost","Indetectable Burning","Anomalous"],
  "Mega Exotic": ["Burning Crimson","Scarlet Rain","Fevered Clouds","Carmine Winds","Red Mist","Flaming Hail","Vermillion Storms","Rain of Atlas","Angered Clouds","Blood Rain","Bilious Storms","Deadly Pressure Variations","Harsh Toxic Wind","Corrupted Blood","Infinite Toxic Mist","Echoes of Acid","Poison Cyclones","Inescapable Toxins","Clouds of Haunted Green","Invisible Jade Winds","Frozen Mists","Electric Rain","Azure Storms","Extreme Low Pressure","All-Consuming Cold","Winds from Beyond","Unfathomable Storms","Unimaginable Blue","Ultramarine Wind","Inverted Superstorms"],
  "Water World": ["Coastal Storm"]
};
function conditionsCommunityExtras(usedLower){
  var learned=(typeof knownTerms!=="undefined"&&knownTerms.descriptor)||[];
  var community=(typeof OVERRIDES!=="undefined"&&OVERRIDES.communityTerms&&OVERRIDES.communityTerms.descriptor)||[];
  var seen={}, out=[];
  community.concat(learned).forEach(function(v){
    var lo=String(v).toLowerCase();
    if(usedLower[lo]||seen[lo]) return;
    seen[lo]=1; out.push(v);
  });
  return sortAlphaCI(out);
}
function conditionsComboGroups(biomeKey){
  var canon=CONDITIONS_CANON[biomeKey]||[];
  var usedLower={};
  canon.forEach(function(s){ usedLower[s.toLowerCase()]=1; });
  var groups=canon.length?[{label:null,items:sortAlphaCI(canon).map(function(s){ return {v:s,d:s}; }),iconHtml:svg(IC_BIOME,(BIOMES[biomeKey]||BIOMES.Barren).base)}]:[];
  var extras=conditionsCommunityExtras(usedLower);
  if(extras.length) groups.push({label:"Previously reported",items:extras.map(function(s){ return {v:s,d:s}; }),iconHtml:svg(IC_BIOME,"#8892a6")});
  return groups;
}
// Rebuilds ONE body row's Sub type + Conditions suggestion lists against
// whatever Biome is CURRENTLY typed for it (2026-09-08) -- called once at
// row-open (renderBodyEditList()) and again every time that row's Biome
// field commits a new value (see the delegated "change" handler below), so
// switching Biome live re-filters both without needing the row re-opened.
// blankLabel is "Unknown" for both (not null/empty) -- matching Biome's own
// "staying blank is a valid, keepable state" fix: buildIconCombo's own
// commitNow() only accepts a blank field on blur when blankLabel is truthy,
// so an empty string here would have silently snapped back to whatever was
// last saved instead of actually clearing.
function rebuildBiomeDependentCombos(i){
  var biomeVal=(editBodies[i]&&editBodies[i].biome)||"";
  buildIconCombo("bfSubtype-"+i,"bfSubtypeList-"+i,subtypeComboGroups(biomeVal),"Unknown",true);
  buildIconCombo("bfConditions-"+i,"bfConditionsList-"+i,conditionsComboGroups(biomeVal),"Unknown",true);
}
function sentinelComboGroups(){
  // "None" deliberately stays first (it's the common/default choice, same
  // as blankLabel sitting first in buildIconCombo's own item list) --
  // everything within each real tier is alphabetized (Tony, 2026-09-01);
  // tier order itself (Calm->Extreme) is left alone since that's a
  // meaningful severity progression, not an arbitrary listing.
  var g=[{label:null,items:["None"],iconHtml:svg(IC_SENTINEL,"#5a6a76")},
    {label:null,items:["Not shown"],iconHtml:svg(IC_SENTINEL,"#3a444c")}];
  for(var i=0;i<SENTINEL_WORDS.length;i++) g.push({label:SENTINEL_TIER_LB[i],items:sortAlphaCI(SENTINEL_WORDS[i]),iconHtml:svg(IC_SENTINEL,SENTINEL_TIER_COL[i])});
  return g;
}
var editStars=[];
var starUidSeq=1; // stable per-row id, same pattern as bodyUidSeq below
// Star colour rows for Edit system -- one row per star (max 3, matching the
// real game's single/binary/ternary limit). Index 0 is always labelled as
// the original/primary star, since that's the one that actually drives the
// system's spectral class + economy-element odds in generateSystem().
function renderStarEditList(){
  var el=document.getElementById("starEditList"), html="";
  for(var i=0;i<editStars.length;i++){
    var st=editStars[i], t=starTypeByKey(st.color), opts="";
    for(var k=0;k<STAR_TYPES.length;k++){
      opts+='<option value="'+STAR_TYPES[k].k+'"'+(st.color===STAR_TYPES[k].k?" selected":"")+'>'+STAR_COLOR_LABEL[STAR_TYPES[k].k]+'</option>';
    }
    html+='<div class="starRow" data-si="'+i+'">'+
      '<span class="starSwatch" style="background:#'+hex(t.col,6)+'" title="'+(i===0?"Original star -- drives this system\u2019s star class":"Companion star")+'"></span>'+
      '<div class="mfld" style="margin-bottom:0"><div class="lb">'+(i===0?"Star A (original)":"Star "+String.fromCharCode(65+i))+'</div>'+
      '<select class="sfColor" data-si="'+i+'">'+opts+'</select></div>'+
      (editStars.length>1?'<span class="bx" data-star-remove="'+i+'" title="Remove">&times;</span>':'')+
    '</div>';
  }
  el.innerHTML=html;
}
var editBodies=[];
var bodyUidSeq=1;
var editSignals=[];
var signalUidSeq=1; // stable per-row id, survives add/remove reordering during a single edit session
/* uids (not positions -- same reasoning as bfOrbits above) of every
   traveller-picked colliding planet, in pick order, kept in module scope so
   a selection survives re-renders triggered by adding/removing/reordering
   bodies. Only the traveller who actually saw the overlap in-game can know
   which ones -- this is deliberately NOT auto-detected from generated
   size/position, since that's a guess and can miss or misidentify the real
   cluster. Was a fixed collidingAUid/collidingBUid pair until 2026-09-13
   (goodguyfree found a real in-game system with 4 planets colliding at
   once) -- an ordered array supports any cluster size, 2 and up. */
var collidingUids=[];
function renderCollidingSelectors(){
  var wrap=document.getElementById("edCollidingPair");
  var on=document.getElementById("edColliding").checked;
  wrap.style.display=on?"block":"none";
  if(!on) return;
  var isGiantSys=document.getElementById("edGiant").checked;
  var planets=editBodies.filter(function(b){ return !b.moon; });
  // Drop any pick whose planet row no longer exists (removed from the
  // system since it was picked), same reasoning as bfOrbits' own cleanup.
  collidingUids=collidingUids.filter(function(uid){
    return planets.some(function(p){ return String(p.uid)===String(uid); });
  });
  // A freshly-ticked checkbox (or one left with fewer than 2 valid picks
  // after the cleanup above) always starts at 2 empty rows -- the real-game
  // minimum for "colliding" to mean anything -- same as the old fixed pair.
  while(collidingUids.length<2) collidingUids.push("");
  function opts(selectedUid){
    var html='<option value="">Choose a planet&hellip;</option>';
    for(var p=0;p<planets.length;p++){
      var pIdx=editBodies.indexOf(planets[p])+1;
      html+='<option value="'+planets[p].uid+'"'+(String(selectedUid)===String(planets[p].uid)?" selected":"")+
        '>'+(isGiantSys?"Giant":("Planet #"+pIdx))+' — '+escAttr(planets[p].name||"(unnamed)")+'</option>';
    }
    return html;
  }
  var ordinal=["First planet","Second planet","Third planet","Fourth planet","Fifth planet","Sixth planet"];
  var html="";
  for(var i=0;i<collidingUids.length;i++){
    html+='<div class="starRow">'+
      '<div class="mfld" style="margin-bottom:0;flex:1"><div class="lb">'+(ordinal[i]||("Planet "+(i+1)))+'</div>'+
      '<select class="collidingSel" data-ci="'+i+'">'+opts(collidingUids[i])+'</select></div>'+
      (collidingUids.length>2?'<span class="bx" data-colliding-remove="'+i+'" title="Remove">&times;</span>':'')+
    '</div>';
  }
  document.getElementById("collidingEditList").innerHTML=html;
}
document.getElementById("edColliding").addEventListener("change",renderCollidingSelectors);
document.getElementById("edStation").addEventListener("change",function(){
  document.getElementById("edStationNameWrap").style.display=this.checked?"block":"none";
});
document.getElementById("collidingEditList").addEventListener("change",function(e){
  var ci=e.target.getAttribute("data-ci"); if(ci===null) return;
  collidingUids[+ci]=e.target.value;
});
document.getElementById("collidingEditList").addEventListener("click",function(e){
  var rm=e.target.getAttribute("data-colliding-remove"); if(rm===null) return;
  if(collidingUids.length<=2) return; // every colliding cluster needs at least 2 planets
  collidingUids.splice(+rm,1);
  renderCollidingSelectors();
});
document.getElementById("edAddColliding").addEventListener("click",function(){
  var planetCount=editBodies.filter(function(b){ return !b.moon; }).length;
  if(collidingUids.length>=planetCount){ toast("Every planet in this system is already in the colliding list."); return; }
  collidingUids.push("");
  renderCollidingSelectors();
});
// Each row starts collapsed (just a name summary) so a system with several
// planets doesn't turn the modal into a huge scroll -- only the row the
// traveller is actively adding/editing expands, accordion-style, so Save
// and any error message stay reachable without hunting through open fields.
function renderBodyEditList(){
  var el=document.getElementById("bodyEditList"), html="",i;
  // A Giant system only ever has 1 non-moon body -- the Giant itself -- so
  // this relabels both the row header and the Orbits dropdown to say
  // "Giant" instead of "Planet #1" wherever that single body shows up,
  // matching how the info panel already renders it once saved.
  var isGiantSys=document.getElementById("edGiant").checked;
  for(i=0;i<editBodies.length;i++){
    var b=editBodies[i];
    var summary=escAttr(b.name||"(unnamed)");
    html+='<div class="bodyEdit'+(b.open?" open":"")+'" data-i="'+i+'">'+
      '<div class="bhead">'+
        '<span class="bhLabel">'+(b.moon?"Moon":(isGiantSys?"Giant":"Planet"))+' #'+(i+1)+' &mdash; '+summary+'</span>'+
        '<span class="bhBtns"><span class="bchev">'+(b.open?"&#9662;":"&#9656;")+'</span>'+
          '<span class="bx" data-remove="'+i+'" title="Remove">&times;</span></span>'+
      '</div>';
    if(b.open){
      html+='<div class="brow2">'+
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Name</div><input type="text" class="bfName" data-i="'+i+'" maxlength="30" value="'+escAttr(b.name)+'"></div>'+
          '<label class="chk2"><input type="checkbox" class="bfMoon" data-i="'+i+'"'+(b.moon?" checked":"")+'> Moon</label>'+
        '</div>'+
        '<div class="brow2">'+
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Biome</div><div class="icombo"><input type="text" class="bfBiome icomboInput" maxlength="30" data-i="'+i+'" id="bfBiome-'+i+'" autocomplete="off" placeholder="e.g. Radioactive" value="'+escAttr(b.biome)+'"><div class="icomboList" id="bfBiomeList-'+i+'"></div></div></div>'+
          // Sub type (2026-09-08, split out of Biome's own search-alias list
          // -- "BIOME 'Radioactive' / SUB TYPE 'Nuclear'" per Tony) -- its
          // own saved field, filtered to whichever Biome is CURRENTLY typed
          // above; see rebuildBiomeDependentCombos() for how it re-filters
          // live as the Biome field changes.
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Category type</div><div class="icombo"><input type="text" class="bfSubtype icomboInput" maxlength="30" data-i="'+i+'" id="bfSubtype-'+i+'" autocomplete="off" placeholder="e.g. Nuclear" value="'+escAttr(b.subtype||"")+'"><div class="icomboList" id="bfSubtypeList-'+i+'"></div></div></div>'+
        '</div>'+
        '<div class="brow2">'+
          /* maxlength was 20 -- too short for real in-game hazard/weather
             phrases (Tony hit this typing "Planet-wide Radioactive Storm",
             30 chars, and got cut off mid-word at "Radiatio"). Bumped to 50,
             comfortably covers the longest real phrases seen (e.g. "Extreme
             Sentinel Activity", "Planet-wide Radioactive Storm"). */
          // Renamed "Descriptor"->"Conditions" in the UI (2026-09-08, Tony:
          // "people might not know what descriptor is") and switched from a
          // plain <datalist> to the same grouped icombo every other canon
          // field uses, now filtered to the current Biome via
          // conditionsComboGroups() -- see CONDITIONS_CANON's own comment
          // for the real weather-phrase research behind it. Internal field
          // name stays `descriptor`, nothing saved needs migrating.
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Conditions</div><div class="icombo"><input type="text" class="bfConditions icomboInput" maxlength="50" data-i="'+i+'" id="bfConditions-'+i+'" autocomplete="off" placeholder="e.g. Bountiful" value="'+escAttr(b.descriptor)+'"><div class="icomboList" id="bfConditionsList-'+i+'"></div></div></div>'+
        '</div>'+
        // Reordered 2026-09-09 (Tony: "has rings, water, has base then below
        // them autophage camp, ruins, reliquary -- reduces the height and
        // better grouping") -- was 3 separate 2-item rows (Water+Autophage,
        // Reliquary+Ruins, Rings+Base), now 2 rows of up to 3. Has rings
        // only ever shows for a planet/Giant row (moons never have rings in-
        // game, same reasoning as before), so a moon's first row is just
        // Water + Has base.
        '<div class="brow2">'+
          // Labels changed "Has rings"/"Has base" -> "Rings"/"Base"
          // (2026-09-09, Tony: consistency with the row below -- "Autophage
          // camp, Ruins, Reliquary" doesn't use "Has X" phrasing either).
          (!b.moon?'<label class="chk2"><input type="checkbox" class="bfRing" data-i="'+i+'"'+(b.ring?" checked":"")+'> Rings</label>':"")+
          '<label class="chk2"><input type="checkbox" class="bfWater" data-i="'+i+'"'+(b.water?" checked":"")+'> Water</label>'+
          '<label class="chk2"><input type="checkbox" class="bfBase" data-i="'+i+'"'+(b.base?" checked":"")+'> Base</label>'+
        '</div>'+
        '<div class="brow2">'+
          '<label class="chk2"><input type="checkbox" class="bfAutophage" data-i="'+i+'"'+(b.autophage?" checked":"")+'> Autophage camp</label>'+
          '<label class="chk2"><input type="checkbox" class="bfRuins" data-i="'+i+'"'+(b.ruins?" checked":"")+'> Ruins</label>'+
          // Reliquary replaces "The Reliquary" as a selectable biome (see
          // applyOverride()'s own comment for the why) -- independent
          // per-body flag, same manual-only pattern as Autophage camp.
          '<label class="chk2"><input type="checkbox" class="bfReliquary" data-i="'+i+'"'+(b.reliquary?" checked":"")+'> Reliquary</label>'+
        '</div>';
      if(b.base){
        html+='<div class="mfld" style="margin-bottom:0"><div class="lb">Base name</div><input type="text" class="bfBaseName" data-i="'+i+'" maxlength="30" placeholder="e.g. Elegraynor Portal" value="'+escAttr(b.baseName||"")+'"></div>';
      }
      if(b.moon){
        var orbOpts='<option value="">'+(isGiantSys?"The Giant (default)":"Nearest preceding planet (default)")+'</option>';
        for(var p=0;p<editBodies.length;p++){
          if(p===i || editBodies[p].moon) continue;
          orbOpts+='<option value="'+editBodies[p].uid+'"'+(String(b.orbits)===String(editBodies[p].uid)?" selected":"")+
            '>'+(isGiantSys?"Giant":("Planet #"+(p+1)))+' — '+escAttr(editBodies[p].name||"(unnamed)")+'</option>';
        }
        html+='<div class="mfld" style="margin-bottom:0"><div class="lb">Orbits</div><select class="bfOrbits" data-i="'+i+'">'+orbOpts+'</select></div>';
      }
      html+='<div class="brow2">'+
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Sentinel</div><div class="icombo"><input type="text" class="bfSentinel icomboInput" title="&quot;None&quot; shows &quot;Not reported&quot; in the info panel. &quot;Not shown&quot; hides the Sentinel line entirely -- pick this if the real in-game panel shows no Sentinel row at all for this planet." data-i="'+i+'" id="bfSentinel-'+i+'" autocomplete="off" value="'+escAttr(b.sentinel||"None")+'"><div class="icomboList" id="bfSentinelList-'+i+'"></div></div></div>'+
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Fossils &amp; curiosities</div><div class="icombo"><input type="text" class="bfFossils" data-i="'+i+'" id="bfFossils-'+i+'" maxlength="80" spellcheck="true" autocomplete="off" value="'+escAttr(b.fossils)+'"><div class="icomboList" id="bfFossilsList-'+i+'"></div></div></div>'+
        '</div>'+
        '<div class="mfld" style="margin-bottom:0"><div class="lb">Common resources (comma separated)</div><div class="icombo"><input type="text" class="bfRes" data-i="'+i+'" id="bfRes-'+i+'" maxlength="120" spellcheck="true" autocomplete="off" value="'+escAttr(b.resources)+'"><div class="icomboList" id="bfResList-'+i+'"></div></div></div>'+
        '<div class="fldHint">Separate multiple items with commas -- each individual item can be up to 24 characters.</div>'+
        '<div class="brow2">'+
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Flora</div><div class="icombo"><input type="text" class="bfFlora" data-i="'+i+'" id="bfFlora-'+i+'" maxlength="80" spellcheck="true" autocomplete="off" value="'+escAttr(b.flora)+'"><div class="icomboList" id="bfFloraList-'+i+'"></div></div></div>'+
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Fauna</div><div class="icombo"><input type="text" class="bfFauna" data-i="'+i+'" id="bfFauna-'+i+'" maxlength="80" spellcheck="true" autocomplete="off" value="'+escAttr(b.fauna)+'"><div class="icomboList" id="bfFaunaList-'+i+'"></div></div></div>'+
        '</div>'+
        '<div class="brow2">'+
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Uncommon resources</div><div class="icombo"><input type="text" class="bfMinerals" data-i="'+i+'" id="bfMinerals-'+i+'" maxlength="80" spellcheck="true" autocomplete="off" value="'+escAttr(b.minerals)+'"><div class="icomboList" id="bfMineralsList-'+i+'"></div></div></div>'+
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Salvageable tech</div><div class="icombo"><input type="text" class="bfSalvage" data-i="'+i+'" id="bfSalvage-'+i+'" maxlength="80" spellcheck="true" autocomplete="off" value="'+escAttr(b.salvage)+'"><div class="icomboList" id="bfSalvageList-'+i+'"></div></div></div>'+
        '</div>';
    }
    html+='</div>';
  }
  el.innerHTML=html;
  // buildIconCombo() reads/writes the input by DOM id, so each open body's
  // Biome/Sentinel combo must be (re)wired after the markup above lands --
  // static ids like edEcon only need this once (built at load), but these
  // ids are unique per body index and only exist in the DOM while that row
  // is open, so they need rebuilding every time this function runs.
  for(i=0;i<editBodies.length;i++){
    if(!editBodies[i].open) continue;
    // blankLabel changed from null to "Unknown" (2026-09-08) -- lets the
    // field genuinely start/stay empty (a valid, keepable state, not just
    // something commitNow() snaps back out of on blur) rather than always
    // needing SOME biome picked. See editBodies' own default biome:"" below.
    buildIconCombo("bfBiome-"+i,"bfBiomeList-"+i,biomeComboGroups(),"Unknown",true);
    buildIconCombo("bfSentinel-"+i,"bfSentinelList-"+i,sentinelComboGroups());
    // Sub type/Conditions (2026-09-08) -- both filtered to this body's
    // CURRENT Biome value; rebuildBiomeDependentCombos() re-runs these same
    // two calls whenever the Biome field itself changes (see the delegated
    // "change" handler below), so switching Biome live re-filters both
    // without needing the row to be closed and reopened.
    rebuildBiomeDependentCombos(i);
    // Comma-list suggestion combos (2026-09-01) -- see buildCommaCombo()'s
    // own comment for why these replaced a plain <datalist>.
    buildCommaCombo("bfRes-"+i,"bfResList-"+i,RESOURCES_CANON,"resources");
    buildCommaCombo("bfFlora-"+i,"bfFloraList-"+i,[],"flora");
    buildCommaCombo("bfFauna-"+i,"bfFaunaList-"+i,[],"fauna");
    buildCommaCombo("bfMinerals-"+i,"bfMineralsList-"+i,MINERALS_CANON,"minerals");
    buildCommaCombo("bfSalvage-"+i,"bfSalvageList-"+i,SALVAGE_CANON,"salvage");
    buildCommaCombo("bfFossils-"+i,"bfFossilsList-"+i,FOSSILS_CANON,"fossils");
  }
  renderCollidingSelectors();
}
/* Plain-English "N days/hours ago" for the Edit-system "currently saved as"
   notice -- overrideAt is an ISO timestamp from the server (system-edit.mjs's
   editedAt), so this only ever formats a real value, never a guess. */
function relTime(iso){
  var then=new Date(iso).getTime();
  if(isNaN(then)) return "recently";
  var mins=Math.floor((Date.now()-then)/60000);
  if(mins<1) return "just now";
  if(mins<60) return mins+" minute"+(mins===1?"":"s")+" ago";
  var hrs=Math.floor(mins/60);
  if(hrs<24) return hrs+" hour"+(hrs===1?"":"s")+" ago";
  var days=Math.floor(hrs/24);
  if(days<30) return days+" day"+(days===1?"":"s")+" ago";
  var months=Math.floor(days/30);
  if(months<12) return months+" month"+(months===1?"":"s")+" ago";
  var years=Math.floor(months/12);
  return years+" year"+(years===1?"":"s")+" ago";
}
/* ============================================================
   Screenshots (2026-09-01, Tony: "on the edit system instead of surveyor
   notes... a screenshot users can add a picture" -- added to BOTH the
   public Edit System modal and the private Surveyor notes log, alongside
   their existing text fields, not replacing either). Shared pieces:
   compressImageToJpeg() (used by both uploaders) and the lightbox overlay
   (used by both preview thumbnails plus the public one on the info panel).
   The public half's server round trip lives in netlify/functions/
   system-edit.mjs's resolveScreenshotUpload() and lib/shared.mjs's
   screenshot helpers -- see those for why every upload gets its own
   filename rather than one fixed path per system.
   ============================================================ */

/* Reads an image file, draws it to a canvas, and re-encodes as JPEG at
   shrinking size/quality steps until the result fits maxBytes -- a real
   in-game screenshot straight off a phone or a capture tool easily runs
   2-8MB, and neither the shared data store (overrides.json already had one
   real outage from outgrowing the GitHub Contents API's 1MB inline-read
   ceiling from TEXT alone, see lib/shared.mjs's githubGetFile() comment)
   nor a visitor's own localStorage quota (Surveyor notes' private copy)
   can afford that raw. Always outputs image/jpeg regardless of the source
   format -- keeps both sides of this feature down to exactly one mime type
   to validate/store, and JPEG compresses a real screenshot far smaller
   than PNG would for the same visual quality. Resolves a
   data:image/jpeg;base64,... string, or rejects with a short user-facing
   message. Deliberately a fixed ladder of (dimension, quality) steps
   rather than a search for an exact byte target -- five canvas draws, worst
   case, always converges for a real photo, and "close enough under budget"
   is all either caller actually needs. */
function compressImageToJpeg(file,maxDim,maxBytes){
  return new Promise(function(resolve,reject){
    var url=URL.createObjectURL(file);
    var img=new Image();
    img.onload=function(){
      URL.revokeObjectURL(url);
      var w=img.naturalWidth,h=img.naturalHeight;
      if(!w||!h){ reject(new Error("Couldn't read that image")); return; }
      var STEPS=[[maxDim,0.82],[maxDim,0.62],[Math.round(maxDim*0.75),0.58],
        [Math.round(maxDim*0.55),0.52],[Math.round(maxDim*0.4),0.48]];
      var maxChars=maxBytes*4/3; // base64's fixed ~4/3 size overhead -- fine as a proxy, no need to decode just to measure
      var last=null;
      for(var i=0;i<STEPS.length;i++){
        var dim=STEPS[i][0], q=STEPS[i][1];
        var scale=Math.min(1,dim/Math.max(w,h));
        var cw=Math.max(1,Math.round(w*scale)), ch=Math.max(1,Math.round(h*scale));
        var canvas=document.createElement("canvas");
        canvas.width=cw; canvas.height=ch;
        canvas.getContext("2d").drawImage(img,0,0,cw,ch);
        var dataUrl=canvas.toDataURL("image/jpeg",q);
        last=dataUrl;
        if(dataUrl.length<=maxChars){ resolve(dataUrl); return; }
      }
      if(last && last.length<=maxChars*1.5){ resolve(last); return; } // smallest step still a bit over -- close enough, better than failing outright
      reject(new Error("That image is too large to attach, even compressed"));
    };
    img.onerror=function(){ URL.revokeObjectURL(url); reject(new Error("Couldn't read that image")); };
    img.src=url;
  });
}
function openScreenshotLightbox(src){
  if(!src) return;
  document.getElementById("screenshotLightboxImg").src=src;
  document.getElementById("screenshotLightbox").style.display="flex";
}
function closeScreenshotLightbox(){ document.getElementById("screenshotLightbox").style.display="none"; }
document.getElementById("screenshotLightboxClose").addEventListener("click",closeScreenshotLightbox);
document.getElementById("screenshotLightbox").addEventListener("click",function(e){ if(e.target===this) closeScreenshotLightbox(); });
document.addEventListener("keydown",function(e){
  if(e.key==="Escape" && document.getElementById("screenshotLightbox").style.display!=="none") closeScreenshotLightbox();
if(e.key==="Escape") hideResourceReport();
});
document.getElementById("pubScreenshot").addEventListener("click",function(){ openScreenshotLightbox(this.src); });
document.getElementById("pubStationPhoto").addEventListener("click",function(){ openScreenshotLightbox(this.src); });

/* Edit System modal screenshot state -- kept as two separate values rather
   than one shared "current value" string so the modal can always tell the
   difference between "this is the same photo already saved here"
   (edScreenshotBaseline, a stored https URL or "") and "this browser just
   picked/removed a new one this session" (edScreenshotNew: null=untouched,
   ""=removed, or a fresh data:image/jpeg;base64,... string). Reset fresh
   every time openEditModal() opens (see its own setEdScreenshotState()
   call); the value actually sent on Save is edScreenshotCurrentValue(),
   read once in edSubmit's own payload assembly. */
var edScreenshotBaseline="", edScreenshotNew=null;
function setEdScreenshotState(url){
  edScreenshotBaseline=url||""; edScreenshotNew=null;
  renderEdScreenshotPreview();
}
function edScreenshotCurrentValue(){
  return edScreenshotNew===null ? edScreenshotBaseline : edScreenshotNew;
}
function renderEdScreenshotPreview(){
  var v=edScreenshotCurrentValue();
  var wrap=document.getElementById("edScreenshotPreviewWrap");
  var img=document.getElementById("edScreenshotPreview");
  var removeBtn=document.getElementById("edScreenshotRemoveBtn");
  var addBtnTxt=document.getElementById("edScreenshotBtnTxt");
  if(v){ img.src=v; wrap.style.display="block"; removeBtn.style.display="inline-block"; addBtnTxt.textContent="Replace screenshot"; }
  else { img.src=""; wrap.style.display="none"; removeBtn.style.display="none"; addBtnTxt.textContent="Add screenshot"; }
}
document.getElementById("edScreenshotBtn").addEventListener("click",function(){ document.getElementById("edScreenshotFile").click(); });
document.getElementById("edScreenshotPreview").addEventListener("click",function(){ openScreenshotLightbox(this.src); });
document.getElementById("edScreenshotRemoveBtn").addEventListener("click",function(){ edScreenshotNew=""; renderEdScreenshotPreview(); });
document.getElementById("edScreenshotFile").addEventListener("change",function(e){
  var f=e.target.files[0]; e.target.value="";
  if(!f) return;
  if(!/^image\//.test(f.type)){ toast("Please choose an image file"); return; }
  var hint=document.getElementById("edScreenshotHint");
  hint.textContent="Compressing...";
  compressImageToJpeg(f,1100,260000).then(function(dataUrl){
    hint.textContent="";
    edScreenshotNew=dataUrl; renderEdScreenshotPreview();
  }).catch(function(err){
    hint.textContent="";
    toast(err&&err.message?err.message:"Couldn't read that image");
  });
});

/* Station photo (2026-09-09) -- exact same staged-until-Save state pattern
   as the general screenshot just above (edStationPhotoBaseline: a stored
   https URL or ""; edStationPhotoNew: null=untouched, ""=removed, or a
   fresh data:image/jpeg;base64,... string), same compressImageToJpeg
   budget, same shared lightbox. Kept as its own separate pair of state
   vars/DOM ids rather than a generalised "screenshot uploader" widget --
   this modal only ever needs two of these, and duplicating the ~15 lines
   was simpler and lower-risk than refactoring the working general-
   screenshot code into something parameterised right before a deploy. */
var edStationPhotoBaseline="", edStationPhotoNew=null;
function setEdStationPhotoState(url){
  edStationPhotoBaseline=url||""; edStationPhotoNew=null;
  renderEdStationPhotoPreview();
}
function edStationPhotoCurrentValue(){
  return edStationPhotoNew===null ? edStationPhotoBaseline : edStationPhotoNew;
}
function renderEdStationPhotoPreview(){
  var v=edStationPhotoCurrentValue();
  var wrap=document.getElementById("edStationPhotoPreviewWrap");
  var img=document.getElementById("edStationPhotoPreview");
  var removeBtn=document.getElementById("edStationPhotoRemoveBtn");
  var addBtnTxt=document.getElementById("edStationPhotoBtnTxt");
  if(v){ img.src=v; wrap.style.display="block"; removeBtn.style.display="inline-block"; addBtnTxt.textContent="Replace photo"; }
  else { img.src=""; wrap.style.display="none"; removeBtn.style.display="none"; addBtnTxt.textContent="Add station photo"; }
}
document.getElementById("edStationPhotoBtn").addEventListener("click",function(){ document.getElementById("edStationPhotoFile").click(); });
document.getElementById("edStationPhotoPreview").addEventListener("click",function(){ openScreenshotLightbox(this.src); });
document.getElementById("edStationPhotoRemoveBtn").addEventListener("click",function(){ edStationPhotoNew=""; renderEdStationPhotoPreview(); });
document.getElementById("edStationPhotoFile").addEventListener("change",function(e){
  var f=e.target.files[0]; e.target.value="";
  if(!f) return;
  if(!/^image\//.test(f.type)){ toast("Please choose an image file"); return; }
  var hint=document.getElementById("edStationPhotoHint");
  hint.textContent="Compressing...";
  compressImageToJpeg(f,1100,260000).then(function(dataUrl){
    hint.textContent="";
    edStationPhotoNew=dataUrl; renderEdStationPhotoPreview();
  }).catch(function(err){
    hint.textContent="";
    toast(err&&err.message?err.message:"Couldn't read that image");
  });
});

/* Alliance badge (2026-09-10) -- see the HTML comment above
   edAllianceBadgeFile for why this is deliberately NOT a baseline/new pair
   like edStationPhoto* / edScreenshot* above. edAllianceBadgeNew is either
   null (untouched this session -- edAllianceBadgeCurrentValue() then sends
   "", never an already-hosted URL) or a fresh data:image/jpeg;base64,...
   string this browser just picked. There's no "remove" affordance here on
   purpose -- this is a SHARED resource keyed by alliance name, not this
   system's own, so silently blanking it on every other system's behalf
   isn't offered; picking a NEW image is the only action available, and
   system-edit.mjs's upsertAllianceBadge() requires a second traveller's
   matching upload before it actually replaces an alliance that already has
   one (same anti-vandalism principle the flag/dispute consensus system
   already applies to every other shared field). */
var edAllianceBadgeNew=null;
function edAllianceBadgeCurrentValue(){ return edAllianceBadgeNew||""; }
function edAllianceLookup(){
  var key=allianceKey(document.getElementById("edAllianceName").value);
  return key?(ALLIANCES[key]||null):null;
}
function renderEdAllianceBadge(){
  var wrap=document.getElementById("edAllianceBadgePreviewWrap");
  var img=document.getElementById("edAllianceBadgePreview");
  var btnTxt=document.getElementById("edAllianceBadgeBtnTxt");
  var hint=document.getElementById("edAllianceBadgeHint");
  if(edAllianceBadgeNew){
    img.src=edAllianceBadgeNew; wrap.style.display="block";
    btnTxt.textContent="Replace alliance badge";
    hint.textContent="New badge -- not shared until you Save. If this alliance already has one, a second traveller's matching upload is needed to confirm the change.";
    return;
  }
  var existing=edAllianceLookup();
  if(existing && existing.badgeUrl){
    img.src=existing.badgeUrl; wrap.style.display="block";
    btnTxt.textContent="Replace alliance badge";
    hint.textContent="This alliance's current shared badge. Uploading a new one needs a second traveller's matching upload to confirm the change.";
  } else {
    img.src=""; wrap.style.display="none";
    btnTxt.textContent="Add alliance badge";
    hint.textContent="";
  }
}
document.getElementById("edAllianceBadgeBtn").addEventListener("click",function(){ document.getElementById("edAllianceBadgeFile").click(); });
document.getElementById("edAllianceBadgePreview").addEventListener("click",function(){ openScreenshotLightbox(this.src); });
document.getElementById("edAllianceBadgeFile").addEventListener("change",function(e){
  var f=e.target.files[0]; e.target.value="";
  if(!f) return;
  if(!/^image\//.test(f.type)){ toast("Please choose an image file"); return; }
  var hint=document.getElementById("edAllianceBadgeHint");
  hint.textContent="Compressing...";
  compressImageToJpeg(f,640,180000).then(function(dataUrl){
    edAllianceBadgeNew=dataUrl; renderEdAllianceBadge();
  }).catch(function(err){
    hint.textContent="";
    toast(err&&err.message?err.message:"Couldn't read that image");
  });
});
// Retyping the alliance name re-looks-up whatever THAT name's existing
// badge is (if any) -- purely informational, doesn't touch edAllianceBadgeNew,
// so a already-staged new upload stays staged even if the name is tweaked
// afterwards.
document.getElementById("edAllianceName").addEventListener("input",function(){ renderEdAllianceBadge(); });

/* Private Surveyor notes screenshot -- see store.noteImgs (loadStore()'s
   own comment). renderPNoteImg() is called from updatePanel() right
   alongside pNote's own value population, same choke point. */
function renderPNoteImg(){
  var v=selected?(store.noteImgs[skey(selected)]||""):"";
  var wrap=document.getElementById("pNoteImgPreviewWrap"), img=document.getElementById("pNoteImgPreview"),
    rm=document.getElementById("pNoteImgRemoveBtn");
  if(v){ img.src=v; wrap.style.display="block"; rm.style.display="inline-block"; }
  else { img.src=""; wrap.style.display="none"; rm.style.display="none"; }
}
document.getElementById("pNoteImgPreview").addEventListener("click",function(){ openScreenshotLightbox(this.src); });
document.getElementById("pNoteImgBtn").addEventListener("click",function(){ document.getElementById("pNoteImgFile").click(); });
document.getElementById("pNoteImgRemoveBtn").addEventListener("click",function(){
  if(!selected) return;
  delete store.noteImgs[skey(selected)]; saveStore(); renderPNoteImg(); toast("Screenshot removed");
});
document.getElementById("pNoteImgFile").addEventListener("change",function(e){
  var f=e.target.files[0]; e.target.value="";
  if(!f || !selected) return;
  if(!/^image\//.test(f.type)){ toast("Please choose an image file"); return; }
  compressImageToJpeg(f,640,90000).then(function(dataUrl){
    store.noteImgs[skey(selected)]=dataUrl; saveStore(); renderPNoteImg(); toast("Screenshot attached to your log");
  }).catch(function(err){ toast(err&&err.message?err.message:"Couldn't read that image"); });
});

/* ---- Adaptive console for Edit system (2026-09-10) ----
   groupEditSections() runs once, the FIRST time the modal opens: it moves
   (not clones/rebuilds) each field's existing .mfld wrapper into one of the
   6 section containers added above, found via document.getElementById(...)
   .closest(".mfld") on one stable field id per group -- every input keeps
   its own id and every existing event listener on it (icombo widgets, the
   star/body/signal list renderers, photo upload staging) stays attached,
   since appendChild moves a node rather than recreating it. After this
   runs once, every later modal open just shows/hides the 6 containers --
   nothing is ever re-grouped or duplicated. */
var edGrouped=false;
function groupEditSections(){
  if(edGrouped) return;
  edGrouped=true;
  function put(containerId, anchorIds){
    var c=document.getElementById(containerId);
    anchorIds.forEach(function(id){
      var el=document.getElementById(id);
      var fld=el&&el.closest(".mfld");
      if(fld) c.appendChild(fld);
    });
  }
  put("edSecIdent",   ["edGalaxy","edName","edRegion","edStarClass","edRace"]);
  put("edSecEcon",    ["edEcon","edSell","edEconStr","edConflict"]);
  put("edSecBodies",  ["edAddStar","edAddBody","edAddSignal"]);
  put("edSecFeatures",["edBH","edPhantom"]);
  put("edSecLog",     ["edNotes","edScreenshotFile"]);
  put("edSecAttr",    ["edEditorName","edEditorCodeVisible","edOpenSaveImport"]);
}
var EDSEC_ORDER=["ident","econ","bodies","features","log","attr"];
var EDSEC_META={
  ident:    {title:"Identification",       icon:"icons-web/edtab-identification.png"},
  econ:     {title:"Economy & Conflict",   icon:"icons-web/edtab-economy.png"},
  bodies:   {title:"Stellar Bodies",       icon:"icons-web/edtab-bodies.png"},
  features: {title:"Special Features",     icon:"icons-web/edtab-features.png"},
  log:      {title:"Surveyor Log",         icon:"icons-web/edtab-log.png"},
  attr:     {title:"Attribution",          icon:"icons-web/edtab-attribution.png"}
};
function edSecEl(key){ return document.getElementById("edSec"+key.charAt(0).toUpperCase()+key.slice(1)); }
var edMode="wizard", edWizStep=0, edActiveKey="ident";
function edBuildSwitchRow(){
  var row=document.getElementById("edSwitchRow");
  if(row.children.length) return;
  EDSEC_ORDER.forEach(function(key){
    var sw=document.createElement("div");
    sw.className="edSwitch"; sw.dataset.key=key;
    sw.innerHTML=
      '<div class="edSwInner">'+
        '<div class="edSwFace edSwFront"><img src="'+EDSEC_META[key].icon+'" alt=""><span>'+EDSEC_META[key].title+'</span></div>'+
        '<div class="edSwFace edSwBack"><img src="icons-web/status-atlas.png" alt=""></div>'+
      '</div>';
    sw.addEventListener("click",function(){ edGoTo(key); });
    row.appendChild(sw);
  });
}
function edBuildScanbar(){
  var bar=document.getElementById("edScanbar");
  if(bar.children.length) return;
  EDSEC_ORDER.forEach(function(){ bar.appendChild(document.createElement("i")); });
}
function edGoTo(key){
  edActiveKey=key;
  EDSEC_ORDER.forEach(function(k){ edSecEl(k).style.display=(k===key)?"":"none"; });
  var sws=document.querySelectorAll("#edSwitchRow .edSwitch");
  for(var i=0;i<sws.length;i++) sws[i].classList.toggle("active", sws[i].dataset.key===key);
  if(edMode==="wizard"){ edWizStep=EDSEC_ORDER.indexOf(key); edUpdateWizNav(); }
}
function edUpdateWizNav(){
  var kids=document.getElementById("edScanbar").children;
  for(var i=0;i<kids.length;i++) kids[i].className = i<edWizStep?"done":(i===edWizStep?"now":"");
  document.getElementById("edScanlabel").innerHTML =
    "Compiling survey log &mdash; step "+(edWizStep+1)+" of "+EDSEC_ORDER.length+": <b>"+EDSEC_META[EDSEC_ORDER[edWizStep]].title+"</b>";
  var last=edWizStep===EDSEC_ORDER.length-1;
  document.getElementById("edWizBack").style.visibility = edWizStep===0?"hidden":"visible";
  document.getElementById("edWizNext").style.display = last?"none":"";
  var btnsRow=document.querySelector("#editModal .modalBtns");
  if(btnsRow) btnsRow.style.display = last?"flex":"none";
}
function edSetMode(mode){
  edMode=mode;
  var stateBtns=document.querySelectorAll("#edConsoleState button");
  for(var i=0;i<stateBtns.length;i++) stateBtns[i].classList.toggle("on", stateBtns[i].dataset.mode===mode);
  document.getElementById("edSwitchRow").style.display = mode==="tabs"?"flex":"none";
  document.getElementById("edScanbar").style.display = mode==="wizard"?"flex":"none";
  document.getElementById("edScanlabel").style.display = mode==="wizard"?"block":"none";
  document.getElementById("edWizNav").style.display = mode==="wizard"?"flex":"none";
  var btnsRow=document.querySelector("#editModal .modalBtns");
  if(mode==="tabs" && btnsRow) btnsRow.style.display="flex";
  edWizStep=0;
  edGoTo(mode==="wizard"?EDSEC_ORDER[0]:edActiveKey);
}
function edInitConsole(isDocumented){
  edBuildSwitchRow();
  edBuildScanbar();
  edActiveKey="ident";
  edSetMode(isDocumented?"tabs":"wizard");
}
document.querySelectorAll("#edConsoleState button").forEach(function(b){
  b.addEventListener("click",function(){ edSetMode(b.dataset.mode); });
});
document.getElementById("edWizBack").addEventListener("click",function(){
  if(edWizStep>0) edGoTo(EDSEC_ORDER[edWizStep-1]);
});
document.getElementById("edWizNext").addEventListener("click",function(){
  if(edWizStep<EDSEC_ORDER.length-1) edGoTo(EDSEC_ORDER[edWizStep+1]);
});
function openEditModal(){
  if(!selected) return;
  var s=selected;
  groupEditSections();
  // Shows what's already saved for this address BEFORE the form below
  // pre-fills over it with the same values, so a visitor about to overwrite
  // real community data (not just a procedural placeholder) sees that
  // plainly instead of silently clobbering someone else's honest submission.
  var prevNotice=document.getElementById("editPrevNotice");
  if(s.override){
    var prevBy=s.editorName?(" by "+s.editorName):" by another traveller";
    prevNotice.textContent='Currently saved as "'+(s.name||"Unnamed")+'" -- submitted '+relTime(s.overrideAt)+prevBy+'. Saving will replace it for everyone. If this doesn\'t look right, use Report in the system panel instead of overwriting it.';
    prevNotice.style.display="block";
  } else {
    prevNotice.style.display="none";
    prevNotice.textContent="";
  }
  document.getElementById("edGalaxy").value=String(s.galaxy);
  document.getElementById("edName").value=s.name||"";
  var raceOk=["Gek","Vy'keen","Korvax","Uninhabited"];
  document.getElementById("edRace").value=(raceOk.indexOf(s.race)>=0)?s.race:"Uninhabited";
  document.getElementById("edEcon").value=s.uncharted?"":(s.econName||"");
  document.getElementById("edSell").value=(s.sell!=null?s.sell:"");
  document.getElementById("edBuy").value=(s.buy!=null?s.buy:"");
  document.getElementById("edEconStr").value=s.econDesc||"";
  document.getElementById("edConflict").value=s.conflict||"";
  document.getElementById("edBH").checked=!!s.blackHole;
  document.getElementById("edAtlas").checked=!!s.atlas;
  document.getElementById("edPhantom").value=(s.phantom==="phantom"||s.phantom==="shadow")?s.phantom:"";
  document.getElementById("edRegion").value=s.region||"";
  document.getElementById("edStarClass").value=s.spectral||"";
  editStars=(s.starTypes&&s.starTypes.length?s.starTypes:[s.type]).slice(0,3).map(function(k){
    return {uid:starUidSeq++, color:(STAR_TYPES.map(function(t){return t.k;}).indexOf(k)>=0)?k:"yellow"};
  });
  renderStarEditList();
  document.getElementById("edWaterSuf").checked=!!s.water;
  document.getElementById("edDissonantSuf").checked=!!s.dissonant;
  document.getElementById("edGiant").checked=!!s.giant;
  document.getElementById("edRuins").checked=!!s.ruins;
  document.getElementById("edOutlaw").checked=!!s.outlaw;
  document.getElementById("edAbandoned").checked=!!s.abandoned;
  document.getElementById("edColliding").checked=!!s.colliding;
  document.getElementById("edStation").checked=!!s.hasStation;
  document.getElementById("edStationName").value=s.stationName||"";
  document.getElementById("edAllianceName").value=s.allianceName||"";
  document.getElementById("edStationNameWrap").style.display=s.hasStation?"block":"none";
  setEdStationPhotoState(s.stationPhoto||"");
  edAllianceBadgeNew=null; renderEdAllianceBadge();
  document.getElementById("edNotes").value=s.publicNotes||"";
  setEdScreenshotState(s.publicScreenshot||"");
  var myId=loadTravellerId();
  document.getElementById("edEditorName").value=myId.name;
  document.getElementById("edEditorCode").value=myId.code;
  document.getElementById("edEditorCodeVisible").checked=myId.codeVisible;
  editBodies=s.bodies.map(function(b){
    return {
      uid:bodyUidSeq++,
      name:b.name,
      moon:!!b.moon,
      // 2026-09-08 (Tony/goodguyfree): starts blank/"Unknown" rather than
      // pre-filled with a guessed biome key. FIXED same day -- b.biome is
      // NEVER actually blank here (it always carries the procedural guess
      // for rendering, see biomeOverridden's own comment in applyOverride())
      // so checking b.biome's truthiness alone always pre-filled the guess
      // anyway. Must gate on b.biomeOverridden instead -- only a real past
      // traveller submission should pre-fill this field.
      biome:b.biomeOverridden?b.biome:"",
      subtype:b.subtype||"",
      descriptor:b.descriptor||"",
      water:!!b.water,
      ring:!!b.ring,
      resources:(b.resUni||[]).join(", "),
      flora:(b.flora||[]).join(", "),
      fauna:(b.fauna||[]).join(", "),
      minerals:(b.minerals||[]).join(", "),
      salvage:(b.salvage||[]).join(", "),
      fossils:(b.fossils||[]).join(", "),
      sentinel:(SENTINEL_ALL_WORDS.indexOf(b.sentinel)>=0)?b.sentinel:"None",
      autophage:!!b.autophage,
      reliquary:!!b.reliquary,
      ruins:!!b.ruins,
      base:!!b.base,
      baseName:b.baseName||"",
      parentPos:b.moon?b.parent:0,
      open:false
    };
  });
  // resolve each moon's saved 1-based parent POSITION into the matching
  // row's stable uid, since the Orbits dropdown is keyed by uid (positions
  // shift as rows are added/removed, uids never do)
  for(var pj=0;pj<editBodies.length;pj++){
    var pp=editBodies[pj].parentPos;
    editBodies[pj].orbits=(pp>=1 && editBodies[pp-1])?editBodies[pp-1].uid:"";
    delete editBodies[pj].parentPos;
  }
  // resolve the saved 1-based colliding-cluster positions to this session's
  // uids, same reasoning as the moon-orbits resolution just above
  collidingUids=(s.collidingSet||[]).map(function(pos){
    return (pos>=1 && editBodies[pos-1])?editBodies[pos-1].uid:null;
  }).filter(function(uid){ return uid; });
  renderBodyEditList();
  editSignals=(s.signals||[]).map(function(g){
    return {
      uid:signalUidSeq++,
      name:g.name||"", category:g.category||"",
      icon:(["mineral","flora","frozen","tech","outpost","creature","hazard","cargo","atlasstation"].indexOf(g.icon)>=0)?g.icon:"mineral",
      signalType:g.signalType||"", route:g.route||"",
      planetPos:g.planet||0, open:false
    };
  });
  for(var sgk=0; sgk<editSignals.length; sgk++){
    var spp=editSignals[sgk].planetPos;
    editSignals[sgk].planetUid=(spp>=1 && editBodies[spp-1])?editBodies[spp-1].uid:"";
    delete editSignals[sgk].planetPos;
  }
  renderSignalEditList();
  document.getElementById("editModal").classList.remove("min");
  document.getElementById("bEditMin").innerHTML="&#9662;";
  document.getElementById("editErr").style.display="none";
  document.getElementById("edRetry").style.display="none";
  hideStatusIcon(document.getElementById("editIconWrap"));
  lastEditAttempt=null;
  // s.override is the site's own existing "real community data already saved
  // here" flag (see the notice built at the top of this function) -- reused
  // as-is to decide which console mode to open in: a placeholder/unsaved
  // system starts in the wizard, an already-documented one starts on the
  // flip-switch tiles. Either can still be switched manually via the two
  // buttons at the top of the form.
  edInitConsole(!!s.override);
  closeAllModalBoxes();
  document.getElementById("editModal").style.display="";
  document.getElementById("modalWrap").classList.add("show");
}
// Every modal-open path must hide the OTHER modal boxes first -- editModal/
// reportModal/disclaimerModal are siblings inside the same #modalWrap, and
// each one only ever set its own display plus one sibling's, never all
// three -- so a modal left open from an earlier trigger (e.g. the
// first-visit disclaimer, or the About button) could still be showing
// underneath/alongside a newly-opened one. Real bug Tony hit: opening
// Edit system while the disclaimer was still up rendered both side by side,
// and "Got it" on the disclaimer closed #modalWrap entirely, taking Edit
// system with it before he could type anything.
function closeAllModalBoxes(){
  document.getElementById("editModal").style.display="none";
  document.getElementById("reportModal").style.display="none";
  document.getElementById("disclaimerModal").style.display="none";
  document.getElementById("hyperdriveModal").style.display="none";
  document.getElementById("feedbackModal").style.display="none";
  document.getElementById("saveImportModal").style.display="none";
  document.getElementById("termConfirmModal").style.display="none";
}
function closeModal(){ document.getElementById("modalWrap").classList.remove("show"); }
function clientPrecheck(){
  /* Small client-side echo of the server's word list, purely for instant
     feedback before the round trip. The Netlify Function's own copy
     (netlify/functions/filter.mjs, BAD_WORDS) is the real, authoritative
     filter -- if Tony wants to add more blocked words, add them there too. */
  var CHECK_WORDS=["fuck","shit","bitch","cunt","nigger","nigga","retard","faggot","fag",
    "rape","cock","pussy","whore","slut","kike","chink","spic","tranny","bastard","dick","piss","asshole"];
  var LEET={"0":"o","1":"i","3":"e","4":"a","5":"s","@":"a","$":"s"};
  function bad(str){
    // Whole-word match only, not substring -- avoids false positives like
    // "skyscraper"/"grape" containing "rape", "classic" containing "ass",
    // "cockpit" containing "cock", etc. Mirrors filter.mjs's containsBadWord.
    var words=String(str||"").split(/\s+/).filter(Boolean);
    for(var w=0;w<words.length;w++){
      var n=words[w].toLowerCase().replace(/[01345@$]/g,function(c){return LEET[c];})
        .replace(/[^a-z]/g,"").replace(/(.)\1{2,}/g,"$1");
      if(!n) continue;
      for(var i=0;i<CHECK_WORDS.length;i++) if(n===CHECK_WORDS[i]) return true;
    }
    return false;
  }
  var fields=[document.getElementById("edName").value,document.getElementById("edEcon").value,
    document.getElementById("edEconStr").value,document.getElementById("edConflict").value,
    document.getElementById("edRegion").value,document.getElementById("edStarClass").value,
    document.getElementById("edNotes").value,document.getElementById("edEditorName").value,
    document.getElementById("edEditorCode").value];
  for(var i=0;i<editBodies.length;i++){
    fields.push(editBodies[i].name,editBodies[i].descriptor,editBodies[i].flora,
      editBodies[i].fauna,editBodies[i].minerals,editBodies[i].salvage,editBodies[i].fossils);
  }
  for(i=0;i<fields.length;i++) if(bad(fields[i])) return "Please remove blocked language before saving.";
  if(!document.getElementById("edName").value.trim()) return "System name can't be empty.";
  var PCT_RE=/^-?\d{1,4}(\.\d{1,2})?$/;
  var sellV=document.getElementById("edSell").value.trim();
  var buyV=document.getElementById("edBuy").value.trim();
  if(sellV && !PCT_RE.test(sellV)) return "Sell % must be a plain number, e.g. 71.5 -- no % sign needed.";
  if(buyV && !PCT_RE.test(buyV)) return "Buy % must be a plain number, e.g. -15.7 -- no % sign needed.";
  if(document.getElementById("edGiant").checked){
    var planetCount=0, moonCount=0;
    for(i=0;i<editBodies.length;i++){ if(editBodies[i].moon) moonCount++; else planetCount++; }
    if(planetCount>1) return "A Gas giant system can only have 1 planet (the giant itself) -- remove the extra planet(s) or untick Gas giant.";
    if(moonCount>5) return "A Gas giant can have at most 5 moons.";
  }
  if(editStars.length<1 || editStars.length>3) return "A system must have 1 to 3 stars.";
  var seenColors=[];
  for(i=0;i<editStars.length;i++){
    if(seenColors.indexOf(editStars[i].color)>=0) return "Each star in a binary/ternary system must be a different colour -- that's how it works in-game.";
    seenColors.push(editStars[i].color);
  }
  return null;
}
document.getElementById("starEditList").addEventListener("change",function(e){
  var siAttr=e.target.getAttribute("data-si"); if(siAttr===null) return;
  if(e.target.classList.contains("sfColor")) editStars[+siAttr].color=e.target.value;
  renderStarEditList();
});
document.getElementById("starEditList").addEventListener("click",function(e){
  var rm=e.target.getAttribute("data-star-remove");
  if(rm===null) return;
  if(editStars.length<=1) return; // real game minimum -- every system has at least 1 star
  editStars.splice(+rm,1);
  renderStarEditList();
});
document.getElementById("edAddStar").addEventListener("click",function(){
  if(editStars.length>=3){ toast("Ternary is the limit -- No Man's Sky systems can have at most 3 stars."); return; }
  var used=editStars.map(function(s){return s.color;});
  var nextColor=STAR_TYPES.map(function(t){return t.k;}).filter(function(k){return used.indexOf(k)<0;})[0]||"yellow";
  editStars.push({uid:starUidSeq++,color:nextColor});
  renderStarEditList();
});
/* Live per-item length check for the 5 comma-separated groups (Resources/
   Flora/Fauna/Minerals/Salvageable tech/Fossils) -- filter.mjs's resArr()
   caps each INDIVIDUAL item at 24 characters, but the client-side
   maxlength on these inputs only caps the whole field (120/80), so a
   single long word could type fine and only get rejected server-side
   after Save, with no clue which word did it. This flags the exact
   offending item live, as soon as it goes over, instead of after the
   fact -- addresses Tony's "must only be max 30 [sic] so tell the user"
   report (the real per-item limit is 24, not 30 or the old whole-field
   number he'd been guessing at). */
var ITEM_LEN_FIELDS=["bfRes","bfFlora","bfFauna","bfMinerals","bfSalvage","bfFossils"];
function checkItemLenWarn(el){
  if(!el || !el.classList) return;
  var isListField=false, k;
  for(k=0;k<ITEM_LEN_FIELDS.length;k++){ if(el.classList.contains(ITEM_LEN_FIELDS[k])){ isListField=true; break; } }
  if(!isListField) return;
  var parts=el.value.split(",").map(function(x){ return x.trim(); }).filter(Boolean);
  var bad=null;
  for(k=0;k<parts.length;k++){ if(parts[k].length>24){ bad=parts[k]; break; } }
  var warnEl=el.nextElementSibling;
  if(!warnEl || !warnEl.classList || !warnEl.classList.contains("itemLenWarn")){
    warnEl=document.createElement("div");
    warnEl.className="itemLenWarn";
    el.parentNode.insertBefore(warnEl, el.nextSibling);
  }
  el.classList.toggle("over24", !!bad);
  if(bad){
    warnEl.textContent='"'+bad+'" is '+bad.length+' characters -- each item must be 24 or fewer, or the whole save will be rejected.';
    warnEl.classList.add("show");
  } else {
    warnEl.classList.remove("show");
  }
}
document.getElementById("bodyEditList").addEventListener("input",function(e){
  var iAttr=e.target.getAttribute("data-i"); if(iAttr===null) return; var i=+iAttr;
  if(e.target.classList.contains("bfName")) editBodies[i].name=e.target.value;
  else if(e.target.classList.contains("bfRes")) editBodies[i].resources=e.target.value;
  // bfDesc's old "input"-event capture removed (2026-09-08) -- Conditions
  // is now an icombo (bfConditions), committed on "change" like Biome/
  // Sentinel, not on every keystroke -- see the "change" listener below.
  else if(e.target.classList.contains("bfFlora")) editBodies[i].flora=e.target.value;
  else if(e.target.classList.contains("bfFauna")) editBodies[i].fauna=e.target.value;
  else if(e.target.classList.contains("bfMinerals")) editBodies[i].minerals=e.target.value;
  else if(e.target.classList.contains("bfSalvage")) editBodies[i].salvage=e.target.value;
  else if(e.target.classList.contains("bfFossils")) editBodies[i].fossils=e.target.value;
  else if(e.target.classList.contains("bfBaseName")) editBodies[i].baseName=e.target.value;
  checkItemLenWarn(e.target);
});
document.getElementById("bodyEditList").addEventListener("change",function(e){
  var iAttr=e.target.getAttribute("data-i"); if(iAttr===null) return; var i=+iAttr;
  if(e.target.classList.contains("bfMoon")){
    editBodies[i].moon=e.target.checked;
    renderBodyEditList(); // Orbits dropdown only applies to moon rows -- must appear/disappear immediately
  }
  else if(e.target.classList.contains("bfWater")) editBodies[i].water=e.target.checked;
  else if(e.target.classList.contains("bfRing")) editBodies[i].ring=e.target.checked;
  else if(e.target.classList.contains("bfBiome")){
    editBodies[i].biome=e.target.value;
    // 2026-09-08: Sub type/Conditions must re-filter to the NEW biome the
    // moment this commits -- otherwise they'd keep showing suggestions for
    // whatever biome was selected when the row was opened.
    rebuildBiomeDependentCombos(i);
  }
  else if(e.target.classList.contains("bfSubtype")) editBodies[i].subtype=e.target.value;
  else if(e.target.classList.contains("bfConditions")) editBodies[i].descriptor=e.target.value;
  else if(e.target.classList.contains("bfAutophage")) editBodies[i].autophage=e.target.checked;
  else if(e.target.classList.contains("bfReliquary")) editBodies[i].reliquary=e.target.checked;
  else if(e.target.classList.contains("bfRuins")) editBodies[i].ruins=e.target.checked;
  else if(e.target.classList.contains("bfBase")){
    editBodies[i].base=e.target.checked;
    renderBodyEditList(); // base-name field only appears once ticked -- must show/hide immediately
  }
  else if(e.target.classList.contains("bfSentinel")) editBodies[i].sentinel=e.target.value;
  else if(e.target.classList.contains("bfOrbits")) editBodies[i].orbits=e.target.value;
});
document.getElementById("bodyEditList").addEventListener("click",function(e){
  var rm=e.target.getAttribute("data-remove");
  if(rm!==null){ editBodies.splice(+rm,1); renderBodyEditList(); return; }
  var row=e.target.closest?e.target.closest(".bodyEdit"):null;
  var headHit=e.target.closest?e.target.closest(".bhead"):null;
  if(row && headHit){
    var idx=+row.getAttribute("data-i");
    var wasOpen=editBodies[idx].open;
    for(var j=0;j<editBodies.length;j++) editBodies[j].open=false; // accordion -- only one open at a time
    editBodies[idx].open=!wasOpen;
    renderBodyEditList();
  }
});
document.getElementById("edAddBody").addEventListener("click",function(){
  if(editBodies.length>=6){ toast("6 is the limit -- No Man's Sky systems can have at most 6 planets and moons combined."); return; }
  for(var j=0;j<editBodies.length;j++) editBodies[j].open=false;
  editBodies.push({uid:bodyUidSeq++,name:"New body",moon:false,biome:"",subtype:"",descriptor:"",water:false,
    resources:"",flora:"",fauna:"",minerals:"",salvage:"",fossils:"",sentinel:"None",autophage:false,reliquary:false,ruins:false,base:false,baseName:"",orbits:"",open:true});
  renderBodyEditList();
  var rows=document.querySelectorAll("#bodyEditList .bodyEdit");
  var last=rows[rows.length-1];
  if(last) last.scrollIntoView({block:"nearest",behavior:"smooth"});
});
document.getElementById("edGiant").addEventListener("change",renderBodyEditList);
// Repeatable resource/signal-marker rows -- deliberately the SAME
// accordion pattern (and the same .bodyEdit/.bhead/.brow2/.mfld/.lb CSS,
// no new rules needed) as the planets/moons editor just above, since it's
// structurally the same thing: an array of traveller-editable rows with
// add/remove and a collapsed one-line summary. Kept as its OWN array/
// render function rather than folded into editBodies -- a signal marker
// isn't a body, and giving it a fake body-shaped row would make both
// this list and the save payload harder to reason about for no benefit.
var ICON_SWATCH_CATS=["mineral","flora","frozen","tech","outpost","creature","hazard","cargo","atlasstation","base"];
var iconSwatchCache={};
/* Small preview image for the icon-type picker below (2026-09-09, Tony:
   "add the icons in front of names" in the Icon type dropdown). For the 6
   categories with a real image (REAL_ICON_URL) this just returns that same
   URL directly -- the picker always shows exactly what actually gets placed
   in the scene, no separate rendering needed. For the rest (flora/tech/
   hazard, no real image yet) this is the same 64px canvas-drawing code as
   buildManualSignalIcon()'s own fallback path (diamond backdrop +
   per-category glyph), exported as a data: URL <img> instead of a
   THREE.CanvasTexture. Cached per category either way since none of this
   changes at runtime -- resolved once on first use, then reused for every
   signal row and every re-render. */
function iconSwatchDataURL(cat){
  if(REAL_ICON_URL[cat]) return REAL_ICON_URL[cat];
  if(iconSwatchCache[cat]) return iconSwatchCache[cat];
  var cfg=RES_ICON_CAT[cat];
  var CS=64;
  var canvas=document.createElement("canvas");
  canvas.width=CS; canvas.height=CS;
  var ctx=canvas.getContext("2d");
  ctx.translate(CS/2,CS/2);
  ctx.beginPath();
  ctx.moveTo(0,-CS*0.42); ctx.lineTo(CS*0.34,0); ctx.lineTo(0,CS*0.42); ctx.lineTo(-CS*0.34,0); ctx.closePath();
  ctx.fillStyle="rgba(6,12,20,0.55)";
  ctx.fill();
  ctx.lineWidth=2.4;
  ctx.strokeStyle=cfg.color;
  ctx.shadowColor=cfg.color; ctx.shadowBlur=8;
  ctx.stroke();
  ctx.shadowBlur=0;
  ctx.strokeStyle=cfg.color; ctx.lineWidth=1.6;
  ctx.lineCap="round"; ctx.lineJoin="round";
  if(cat==="hazard"){
    drawExtraIconGlyph(ctx,cat);
  } else {
    var m=/d="([^"]+)"/.exec(cfg.icon);
    if(m){
      var p=new Path2D(m[1]);
      ctx.save(); ctx.scale(1.5,1.5); ctx.translate(-12,-12); ctx.stroke(p); ctx.restore();
    }
  }
  var url=canvas.toDataURL("image/png");
  iconSwatchCache[cat]=url;
  return url;
}
function renderSignalEditList(){
  var el=document.getElementById("signalEditList"), html="", i;
  for(i=0;i<editSignals.length;i++){
    var g=editSignals[i];
    var summary=escAttr(g.name||"(unnamed signal)");
    html+='<div class="bodyEdit'+(g.open?" open":"")+'" data-si="'+i+'">'+
      '<div class="bhead">'+
        '<span class="bhLabel">Signal #'+(i+1)+' &mdash; '+summary+'</span>'+
        '<span class="bhBtns"><span class="bchev">'+(g.open?"&#9662;":"&#9656;")+'</span>'+
          '<span class="bx" data-sigremove="'+i+'" title="Remove">&times;</span></span>'+
      '</div>';
    if(g.open){
      html+='<div class="brow2">'+
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Name</div><input type="text" class="sgName" data-si="'+i+'" maxlength="40" placeholder="e.g. The Afaye Cluster" value="'+escAttr(g.name)+'"></div>'+
          '<div class="mfld" style="margin-bottom:0"><div class="lb">Icon type</div>'+
            '<div class="iconPick" data-si="'+i+'">'+
              '<button type="button" class="iconPickBtn" data-si="'+i+'">'+
                '<img class="iconPickImg" src="'+iconSwatchDataURL(g.icon)+'" alt="">'+
                '<span class="iconPickLbl">'+RES_ICON_CAT[g.icon].label+'</span>'+
                '<span class="iconPickCaret">&#9662;</span>'+
              '</button>'+
              '<div class="iconPickList">'+
                (function(){
                  var oh="";
                  for(var oi=0;oi<ICON_SWATCH_CATS.length;oi++){
                    var ocat=ICON_SWATCH_CATS[oi];
                    oh+='<div class="iconPickOpt'+(ocat===g.icon?" on":"")+'" data-si="'+i+'" data-icon="'+ocat+'">'+
                      '<img class="iconPickImg" src="'+iconSwatchDataURL(ocat)+'" alt="">'+
                      '<span>'+RES_ICON_CAT[ocat].label+'</span></div>';
                  }
                  return oh;
                })()+
              '</div>'+
            '</div>'+
            '<select class="sgIcon" data-si="'+i+'" style="display:none">'+
              '<option value="mineral"'+(g.icon==="mineral"?" selected":"")+'>Mineral</option>'+
              '<option value="flora"'+(g.icon==="flora"?" selected":"")+'>Flora</option>'+
              '<option value="frozen"'+(g.icon==="frozen"?" selected":"")+'>Frozen</option>'+
              '<option value="tech"'+(g.icon==="tech"?" selected":"")+'>Tech</option>'+
              '<option value="outpost"'+(g.icon==="outpost"?" selected":"")+'>Outpost / Construction</option>'+
              '<option value="creature"'+(g.icon==="creature"?" selected":"")+'>Cosmic Whale</option>'+
              '<option value="hazard"'+(g.icon==="hazard"?" selected":"")+'>Hazard / Danger</option>'+
              '<option value="cargo"'+(g.icon==="cargo"?" selected":"")+'>Minor Wreckage</option>'+
              '<option value="atlasstation"'+(g.icon==="atlasstation"?" selected":"")+'>Atlas Station</option>'+
              '<option value="base"'+(g.icon==="base"?" selected":"")+'>Base / Structure</option>'+
            '</select>'+
          '</div>'+
        '</div>'+
        '<div class="mfld" style="margin-bottom:0"><div class="lb">Category label</div><input type="text" class="sgCat" data-si="'+i+'" maxlength="40" placeholder="e.g. Asteroid Belt" value="'+escAttr(g.category)+'"></div>'+
        '<div class="mfld" style="margin-bottom:0"><div class="lb">Signal type</div><input type="text" class="sgType" data-si="'+i+'" maxlength="80" placeholder="e.g. Extraterrestrial ice." value="'+escAttr(g.signalType)+'"></div>'+
        '<div class="mfld" style="margin-bottom:0"><div class="lb">Route recommendation</div><input type="text" class="sgRoute" data-si="'+i+'" maxlength="140" placeholder="e.g. Rich vein of comet fragments. Harvest opportunities detected." value="'+escAttr(g.route)+'"></div>'+
        '<div class="mfld" style="margin-bottom:0"><div class="lb">Near which planet/moon</div><select class="sgPlanet" data-si="'+i+'"><option value="">Not linked (floating)</option>';
      for(var pj=0;pj<editBodies.length;pj++){
        html+='<option value="'+editBodies[pj].uid+'"'+(String(g.planetUid)===String(editBodies[pj].uid)?" selected":"")+
          '>'+(editBodies[pj].moon?"Moon":"Planet")+' #'+(pj+1)+' \u2014 '+escAttr(editBodies[pj].name||"(unnamed)")+'</option>';
      }
      html+='</select></div>';
    }
    html+='</div>';
  }
  el.innerHTML=html;
}
document.getElementById("signalEditList").addEventListener("input",function(e){
  var iAttr=e.target.getAttribute("data-si"); if(iAttr===null) return; var i=+iAttr;
  if(e.target.classList.contains("sgName")) editSignals[i].name=e.target.value;
  else if(e.target.classList.contains("sgCat")) editSignals[i].category=e.target.value;
  else if(e.target.classList.contains("sgType")) editSignals[i].signalType=e.target.value;
  else if(e.target.classList.contains("sgRoute")) editSignals[i].route=e.target.value;
});
document.getElementById("signalEditList").addEventListener("change",function(e){
  var iAttr=e.target.getAttribute("data-si"); if(iAttr===null) return; var i=+iAttr;
  if(e.target.classList.contains("sgIcon")) editSignals[i].icon=e.target.value;
  else if(e.target.classList.contains("sgPlanet")) editSignals[i].planetUid=e.target.value;
});
document.getElementById("signalEditList").addEventListener("click",function(e){
  // Icon-type picker (2026-09-09) -- checked first and returns early so
  // clicks inside it never fall through to the header open/close toggle
  // below (a picker button/option can sit inside an open row, but it's not
  // the row's .bhead).
  var pickOpt=e.target.closest?e.target.closest(".iconPickOpt"):null;
  if(pickOpt){
    var oi=+pickOpt.getAttribute("data-si"), ocat=pickOpt.getAttribute("data-icon");
    var sel=document.querySelector('.sgIcon[data-si="'+oi+'"]');
    if(sel){ sel.value=ocat; sel.dispatchEvent(new Event("change",{bubbles:true})); }
    var wrap=pickOpt.closest(".iconPick");
    if(wrap) wrap.classList.remove("open");
    renderSignalEditList();
    return;
  }
  var pickBtn=e.target.closest?e.target.closest(".iconPickBtn"):null;
  if(pickBtn){
    var pWrap=pickBtn.closest(".iconPick");
    var wasOpenPick=pWrap&&pWrap.classList.contains("open");
    document.querySelectorAll("#signalEditList .iconPick.open").forEach(function(o){ o.classList.remove("open"); });
    if(pWrap&&!wasOpenPick) pWrap.classList.add("open");
    return;
  }
  var rm=e.target.getAttribute("data-sigremove");
  if(rm!==null){ editSignals.splice(+rm,1); renderSignalEditList(); return; }
  var row=e.target.closest?e.target.closest(".bodyEdit"):null;
  var headHit=e.target.closest?e.target.closest(".bhead"):null;
  if(row && headHit){
    var idx=+row.getAttribute("data-si");
    var wasOpen=editSignals[idx].open;
    for(var j=0;j<editSignals.length;j++) editSignals[j].open=false;
    editSignals[idx].open=!wasOpen;
    renderSignalEditList();
  }
});
// Click anywhere outside an open icon-type picker closes it -- the picker's
// own button/option clicks are handled (and stopped from reaching here via
// normal bubbling into this same listener) by the delegated handler above,
// which only ever ADDS/toggles "open" or removes it itself on a pick; this
// listener's job is purely the "clicked elsewhere entirely" case.
document.addEventListener("click",function(e){
  var openPicks=document.querySelectorAll("#signalEditList .iconPick.open");
  if(!openPicks.length) return;
  openPicks.forEach(function(p){
    if(!p.contains(e.target)) p.classList.remove("open");
  });
});
document.getElementById("edAddSignal").addEventListener("click",function(){
  if(editSignals.length>=6){ toast("6 is the limit for resource/signal markers per system."); return; }
  for(var j=0;j<editSignals.length;j++) editSignals[j].open=false;
  editSignals.push({uid:signalUidSeq++,name:"",category:"",icon:"mineral",signalType:"",route:"",planetUid:"",open:true});
  renderSignalEditList();
  var rows=document.querySelectorAll("#signalEditList .bodyEdit");
  var last=rows[rows.length-1];
  if(last) last.scrollIntoView({block:"nearest",behavior:"smooth"});
});
document.getElementById("bEdit").addEventListener("click",function(){ if(selected) openEditModal(); });
/* Human-readable labels for the "Flag this field" picker -- must list the
   exact same 14 categories as FLAG_CATEGORIES above (kept in sync by hand
   with FLAG_FIELDS in netlify/functions/lib/shared.mjs, same caveat).
   screenshot added 2026-09-01 alongside the rest of that feature. */
var FLAG_LABELS={
  name:"System name", race:"Race", region:"Region name", starClass:"Star class",
  stars:"Star colour(s)", suffix:"Water / Dissonant suffix", giant:"Gas giant",
  economy:"Economy (name, sell/buy %, strength)", conflict:"Conflict level",
  blackHole:"Black hole", atlas:"Atlas Interface", phantom:"Phantom / Shadow Star", notes:"Notes",
  screenshot:"Screenshot"
};
function renderFlagFieldList(s){
  var html="",i;
  for(i=0;i<FLAG_CATEGORIES.length;i++){
    var cat=FLAG_CATEGORIES[i];
    var st=getFieldStatus(s,cat);
    html+='<label class="flagFieldRow"><input type="checkbox" value="'+cat+'">'+FLAG_LABELS[cat]+
      (st==="flagged"?'<span class="fq">already flagged</span>':st==="disputed"?'<span class="fq">disputed</span>':'')+'</label>';
  }
  for(i=0;i<s.bodies.length;i++){
    var cat2="bodies."+i, st2=getFieldStatus(s,cat2), b=s.bodies[i];
    html+='<label class="flagFieldRow"><input type="checkbox" value="'+cat2+'">'+(b.moon?"Moon: ":"Planet: ")+b.name+
      (st2==="flagged"?'<span class="fq">already flagged</span>':st2==="disputed"?'<span class="fq">disputed</span>':'')+'</label>';
  }
  document.getElementById("flagFieldList").innerHTML=html;
}
function setReportMode(mode){
  var flagMode=mode==="flag";
  document.getElementById("repModeFlag").classList.toggle("on",flagMode);
  document.getElementById("repModeContent").classList.toggle("on",!flagMode);
  document.getElementById("repFlagSection").style.display=flagMode?"":"none";
  document.getElementById("repContentSection").style.display=flagMode?"none":"";
  document.getElementById("reportErr").style.display="none";
  document.getElementById("repRetry").style.display="none";
  hideStatusIcon(document.getElementById("reportIconWrap"));
}
document.getElementById("repModeContent").addEventListener("click",function(){ setReportMode("content"); });
document.getElementById("repModeFlag").addEventListener("click",function(){ setReportMode("flag"); });
document.getElementById("bReport").addEventListener("click",function(){
  if(!selected) return;
  setReportMode("content");
  lastReportAttempt=null;
  lastFlagAttempt=null;
  document.getElementById("repReason").value="";
  document.getElementById("flagNote").value="";
  renderFlagFieldList(selected);
  closeAllModalBoxes();
  document.getElementById("reportModal").style.display="";
  document.getElementById("modalWrap").classList.add("show");
});
document.getElementById("edCancel").addEventListener("click",closeModal);
document.getElementById("repCancel").addEventListener("click",closeModal);
document.getElementById("modalWrap").addEventListener("click",function(e){
  if(e.target.id!=="modalWrap") return;
  // Edit system involves a lot of typing (planets, resources, notes) -- an
  // accidental click on the dark backdrop used to silently discard all of
  // it with zero confirmation, which Tony flagged as genuinely frustrating.
  // Every other modal (Report, disclaimer, hyperdrive notice, feedback,
  // tour) still closes on a backdrop click same as before; only Edit
  // system now requires an explicit Save or Cancel.
  if(document.getElementById("editModal").style.display!=="none") return;
  closeModal();
});
/* Tony (2026-08-17): clicking into a populated field used to just drop the
   cursor at that point, so replacing the whole value meant backspacing it
   out first. Selecting the existing text on focus means typing straight
   over it instead, matching how most "click to edit" desktop fields
   behave -- delegated on #modalWrap (via focusin, which bubbles, unlike
   plain focus) so it covers every text input/textarea in every modal,
   including body rows that get rebuilt on every renderBodyEditList() call,
   with no per-field wiring needed. */
document.getElementById("modalWrap").addEventListener("focusin",function(e){
  var t=e.target;
  if(t && ((t.tagName==="INPUT" && t.type==="text") || t.tagName==="TEXTAREA")) t.select();
});

/* ============ fan-made / procedural-data disclaimer ============ */
var DISCLAIMER_KEY="nms-galmap-disclaimer-seen";
/* Same measure-don't-guess phantom-scrollbar fix as #searchPop/#hyperPanel/etc
   (see the standing comment near the top of this file) -- the modal used to
   always genuinely overflow before today's accordion, so its scrollbar was
   real; now that everything starts collapsed it usually fits, and a real
   scrollbar should only appear once an expanded section actually pushes it
   past max-height. Called on open and after every section toggle. */
function remeasureDisclaimerScroll(){
  var m=document.getElementById("disclaimerModal");
  m.classList.remove("scroll");
  if(m.scrollHeight>m.clientHeight+1) m.classList.add("scroll");
}
function openDisclaimer(){
  closeAllModalBoxes();
  document.getElementById("disclaimerModal").style.display="";
  document.getElementById("modalWrap").classList.add("show");
  remeasureDisclaimerScroll();
}
document.getElementById("bAbout").addEventListener("click",openDisclaimer);
/* About accordion + read-aloud (Tony, 2026-09-05): the open/close mechanics
   below are the same exclusive-accordion behaviour from 2026-08-22 -- click
   a header, it opens and every other section closes. Two things added on
   top:
   1) Real keyboard/ARIA support -- there was no keyboard path into this
      before (mouse/touch only). Each header is promoted from a plain div
      into an actual <h4> (so screen readers announce it as a heading, not
      silent text) with role=button/aria-expanded/aria-controls, and
      Enter/Space now activates it same as a click.
   2) An opt-in "read aloud" toggle using the browser's own speech
      synthesis (Web Speech API) -- off by default, panel looks exactly as
      it always has until switched on. Deliberately NOT pre-recorded
      narration (this copy changes often; re-recording every time isn't
      viable) and deliberately NOT relying on speechSynthesis.pause()/
      resume() (silently broken on a lot of mobile browsers, confirmed on
      Chrome-for-Android in testing while Samsung Internet worked fine) --
      pause instead cancels the current sentence and replays it on resume,
      using only speak()/cancel(), the two calls that work everywhere.
      Narration text is read straight from each section's own visible copy
      by default, so it can never drift out of sync when this copy is
      edited -- data-narrate on the two link/button-only sections (More by
      elegra1965, Share this map -- nothing else there to read) overrides
      that with a short hand-written line instead. A "read all" run also
      auto-expands each section as it starts reading it, same as a person
      clicking through manually would; clicking a different header while
      it's running jumps narration straight to that section instead of
      fighting the click. */
(function(){
  var modal=document.getElementById('disclaimerModal');
  var sections=modal.querySelectorAll('.mfld');
  var collapsible=[];
  var narratable=[];

  for(var i=0;i<sections.length;i++){
    var section=sections[i];
    var oldLb=section.querySelector('.lb');
    if(!oldLb) continue;

    var lb=document.createElement('h4');
    lb.className=oldLb.className;
    while(oldLb.firstChild) lb.appendChild(oldLb.firstChild);
    oldLb.parentNode.replaceChild(lb,oldLb);

    var icon=document.createElement('span');
    icon.className='rd-ic';
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML='&#128266;';
    lb.appendChild(icon);

    var divs=section.querySelectorAll(':scope > div');
    var narrateBody=divs.length?divs[0]:null;

    var collapseItem=null;
    var collapseBody=section.querySelector(':scope > div:last-child');
    if(collapseBody && collapseBody!==lb){
      var id='discBody-'+i;
      collapseBody.id=id;
      collapseBody.style.display='none';
      lb.style.cursor='pointer';
      lb.style.userSelect='none';
      lb.setAttribute('role','button');
      lb.setAttribute('tabindex','0');
      lb.setAttribute('aria-expanded','false');
      lb.setAttribute('aria-controls',id);
      collapseItem={lb:lb,body:collapseBody};
      collapsible.push(collapseItem);
    }

    if(narrateBody){
      narratable.push({lb:lb,icon:icon,section:section,body:narrateBody,collapse:collapseItem});
    }
  }

  function closeAll(){
    for(var j=0;j<collapsible.length;j++){
      collapsible[j].body.style.display='none';
      collapsible[j].lb.classList.remove('open');
      collapsible[j].lb.setAttribute('aria-expanded','false');
    }
  }

  function openItem(item){
    closeAll();
    item.body.style.display='';
    item.lb.classList.add('open');
    item.lb.setAttribute('aria-expanded','true');
    remeasureDisclaimerScroll();
  }

  for(var k=0;k<collapsible.length;k++){
    (function(item){
      function activate(){
        var wasOpen=item.body.style.display!=='none';
        if(wasOpen) closeAll(); else openItem(item);
        remeasureDisclaimerScroll();
        if(readMode){
          if(wasOpen){ Narrate.stop(); }
          else{
            var match=null;
            for(var m=0;m<narratable.length;m++){ if(narratable[m].lb===item.lb){ match=narratable[m]; break; } }
            if(match) Narrate.playOne(match);
          }
        }
      }
      item.lb.addEventListener('click',activate);
      item.lb.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '||e.key==='Spacebar'){ e.preventDefault(); activate(); }
      });
    })(collapsible[k]);
  }

  var readMode=false;
  var toggleBtn=document.getElementById('discReadToggle');
  toggleBtn.addEventListener('click',function(){
    readMode=!readMode;
    toggleBtn.setAttribute('aria-checked',String(readMode));
    modal.classList.toggle('read-mode',readMode);
    if(!readMode) Narrate.stop();
  });

  var Narrate=(function(){
    var readBar=document.getElementById('discReadBar');
    if(!('speechSynthesis' in window)){
      readBar.innerHTML='<span style="font-size:10px;color:var(--text-faint)">read-aloud isn\'t supported in this browser</span>';
      return {playOne:function(){},playAll:function(){},stop:function(){}};
    }
    var playBtn=document.getElementById('discReadPlay');
    var pauseBtn=document.getElementById('discReadPause');
    var stopBtn=document.getElementById('discReadStop');
    var status=document.getElementById('discReadStatus');
    var CLOSING_LINE='That was the contents of the About page.';
    var queue=[],pos=0,playing=false,paused=false,wantsClosing=false,replayCurrent=null,voicesReady=null,gen=0;

    function textFor(entry){
      if(entry.section.hasAttribute('data-narrate')) return entry.section.getAttribute('data-narrate');
      return (entry.body.textContent||'').replace(/\s+/g,' ').trim();
    }
    function splitSentences(t){
      return (t.match(/[^.!?]+[.!?]+(\s|$)/g)||[t]).map(function(s){return s.trim();}).filter(Boolean);
    }
    function ensureVoices(){
      if(voicesReady) return voicesReady;
      voicesReady=new Promise(function(resolve){
        var existing=window.speechSynthesis.getVoices();
        if(existing.length){ resolve(existing); return; }
        var settled=false;
        window.speechSynthesis.onvoiceschanged=function(){
          if(settled) return;
          var v=window.speechSynthesis.getVoices();
          if(v.length){ settled=true; resolve(v); }
        };
        setTimeout(function(){ if(!settled){ settled=true; resolve(window.speechSynthesis.getVoices()); } },1200);
      });
      return voicesReady;
    }
    function setControls(active){ playBtn.disabled=active; pauseBtn.disabled=!active; stopBtn.disabled=!active; }
    function setStatus(t){ status.textContent=t; }
    function clearActive(){
      for(var n=0;n<narratable.length;n++){ narratable[n].lb.classList.remove('reading'); narratable[n].icon.classList.remove('pulse'); }
    }
    function highlight(entry){
      clearActive();
      if(!entry) return;
      entry.lb.classList.add('reading');
      entry.icon.classList.add('pulse');
      if(entry.collapse) openItem(entry.collapse);
    }
    function speak(text,entry,onDone,myGen){
      highlight(entry);
      setStatus(entry?'reading':'finishing');
      var u=new SpeechSynthesisUtterance(text);
      u.onend=function(){ if(myGen!==gen||!playing||paused) return; onDone(); };
      u.onerror=function(){ if(myGen!==gen) return; if(playing&&!paused) finish(true); };
      replayCurrent=function(){ if(myGen===gen) speak(text,entry,onDone,myGen); };
      window.speechSynthesis.cancel();
      setTimeout(function(){ window.speechSynthesis.speak(u); },40);
    }
    function advance(myGen){
      if(myGen!==gen) return;
      if(pos<queue.length){
        var q=queue[pos];
        speak(q.text,q.entry,function(){ pos++; advance(myGen); },myGen);
        return;
      }
      if(wantsClosing){ wantsClosing=false; speak(CLOSING_LINE,null,function(){ finish(false); },myGen); return; }
      finish(false);
    }
    function buildQueue(list){
      var q=[];
      for(var x=0;x<list.length;x++){
        var sentences=splitSentences(textFor(list[x]));
        for(var s=0;s<sentences.length;s++) q.push({entry:list[x],text:sentences[s]});
      }
      return q;
    }
    function play(list,closing){
      gen++; var myGen=gen;
      ensureVoices().then(function(voices){
        if(myGen!==gen) return;
        if(!voices.length){ setStatus('no voice found on this device'); return; }
        queue=buildQueue(list); pos=0; playing=true; paused=false; wantsClosing=closing;
        setControls(true); pauseBtn.textContent='Pause';
        advance(myGen);
      });
    }
    function finish(errored){
      gen++;
      playing=false; paused=false; pos=0; queue=[]; wantsClosing=false; replayCurrent=null;
      clearActive();
      window.speechSynthesis.cancel();
      setControls(false); pauseBtn.textContent='Pause';
      setStatus(errored?'playback error -- try again':'ready');
    }
    playBtn.addEventListener('click',function(){ play(narratable,true); });
    pauseBtn.addEventListener('click',function(){
      if(!playing) return;
      if(!paused){ paused=true; window.speechSynthesis.cancel(); pauseBtn.textContent='Resume'; setStatus('paused'); }
      else{ paused=false; pauseBtn.textContent='Pause'; if(replayCurrent) replayCurrent(); }
    });
    stopBtn.addEventListener('click',function(){ finish(false); });
    return {
      playOne:function(entry){ play([entry],false); },
      playAll:function(){ play(narratable,true); },
      stop:function(){ finish(false); }
    };
  })();
})();
document.getElementById("discOk").addEventListener("click",function(){
  try{ localStorage.setItem(DISCLAIMER_KEY,"1"); }catch(e){}
  closeModal();
});
try{
  if(!localStorage.getItem(DISCLAIMER_KEY)) openDisclaimer();
}catch(e){
  /* localStorage blocked (private browsing etc) -- show it once per page load instead of never */
  openDisclaimer();
}

/* ============ hyperdrive-range first-time notice ============
   fHyper defaults to Basic (101 LY, see the select above) rather than an
   upgraded class -- most players have upgraded, so jump counts on Set course
   will be wrong for them until they change it. That control lives inside the
   Filters box, easy to miss, so flag it once the first time it'd actually
   matter: entering Local view, or plotting a course, whichever happens
   first. Shown once ever (localStorage-gated), same pattern as the
   disclaimer above -- if storage is blocked, falls back to once per page
   load via the in-memory flag instead of never showing at all. */
var HYPER_KEY="nms-galmap-hyperdrive-seen";
var hyperNoticeShown=false;
function openHyperNotice(){
  closeAllModalBoxes();
  var hm=document.getElementById("hyperdriveModal");
  document.getElementById("modalWrap").classList.add("show");
  hm.style.display="";
  hm.classList.remove("scroll");
  /* Same measure-don't-guess fix as positionHyperPanel() -- only opt into a
     real scrollbar once actual overflow is confirmed after layout. */
  if(hm.scrollHeight>hm.clientHeight+1) hm.classList.add("scroll");
}
function maybeShowHyperNotice(){
  if(hyperNoticeShown) return;
  try{
    if(localStorage.getItem(HYPER_KEY)){ hyperNoticeShown=true; return; }
    localStorage.setItem(HYPER_KEY,"1");
  }catch(e){ /* localStorage blocked -- fall through, in-memory flag still stops repeats this load */ }
  hyperNoticeShown=true;
  openHyperNotice();
}
document.getElementById("hyperOk").addEventListener("click",closeModal);
document.getElementById("hyperOpenFilters").addEventListener("click",function(){
  closeModal();
  var f=document.getElementById("filt");
  if(f.classList.contains("min")) toggleFold("filt","fHeadLabel","Filters","bFiltMin");
  // fHyper/fHyperDrive are hidden inputs now (see task 6's slide-out redesign)
  // driven by the Hyperdrive button + pill panel -- open that instead of
  // trying to focus a display:none select.
  var btn=document.getElementById("bHyperOpen");
  btn.scrollIntoView({block:"center",behavior:"smooth"});
  document.getElementById("hyperPanel").classList.add("show");
  positionHyperPanel();
});

/* ============ first-visit feature tour ============
   Opt-in, not auto-shown (see the CSS comment above #tourOverlay for why) --
   reached via "Take a quick tour" on the disclaimer modal or the standing
   Tour button in the toolbar, so it can be replayed any time rather than
   only ever firing once. Steps are adapted from the same walkthrough written
   for README.md, just pointed at the real live elements instead of static
   screenshots. Positioning follows the same measure-don't-guess pattern as
   positionUnderButton/positionCourseCard elsewhere in this file: read the
   real target element's on-screen rect each step rather than hardcoding
   coordinates, so it stays correct across window sizes and toolbar wrapping. */
var TOUR_STEPS=[
  {sel:"#mGal",title:"A real 3D galaxy",
    body:"You're looking at one of 256 real No Man's Sky galaxies, generated from a portal address -- not a static image, a galaxy you can actually fly through and zoom into."},
  /* Site review 2026-09-13: this used to be one step that name-dropped "Warp
     Manifest" and "Galactic Navigator" before a first-timer had seen either
     -- "a first-timer has nothing to hang those terms on yet". Split into
     two steps, both still spotlighting Local (nothing else on the toolbar
     to point at yet), so the basic hover/click/panel interactions land
     first and the routing vocabulary only shows up once there's already a
     star field on screen to plot a course through. */
  {sel:"#mLoc",title:"Local view",
    body:"Local shows the real star field around you. Hover a star (mouse) for a quick popup, or click for the full panel -- race, economy, conflict, planets. Enter system for a full 3D view, or add your own in-game data via Edit system."},
  {sel:"#mLoc",title:"Plotting a route",
    body:"Click any star to plot a course to it -- solid line for a single jump, dashed for multi-hop, red if your current drive can't reach it. That opens the Warp Manifest, a full jump-by-jump itinerary, and its PLAN JOURNEY button hands the route to the Galactic Navigator for turn-by-turn tracking -- it remembers your progress if you close the tab, and its own Back to Map / View Map buttons bring you right back here."},
  {sel:"#inAddr",title:"Type an address",
    body:"Paste or type a 12-character portal address here and hit Jump to fly straight to that exact system."},
  {sel:"#bKeys",title:"No address handy?",
    body:"Tap Glyphs to enter the address using the game's own 16 symbols instead of hex -- handy for decoding one off a screenshot."},
  {sel:"#bSearch",title:"Find it by name",
    body:"Type a name to jump straight there -- scoped to systems you or the community have actually documented, bookmarked, waypointed or visited, since the full procedural galaxy has no names to search until someone gives it one."},
  {sel:"#bFiltToggle",title:"Narrow what you see",
    body:"Filters can limit the star field by colour, race, economy, or special types like black holes and Atlas interfaces -- plus your hyperdrive type and range, which gates what Plotted course and Enter system will actually let you reach."},
  {sel:"#bAtlas",title:"Hello Games' own Atlas",
    body:"In Galaxy view, Atlas overlays the real points of interest from Hello Games' own Galactic Atlas website (Euclid only) as diamond markers -- click one to open its real Atlas page. Nearby ones collapse into a numbered marker until you zoom in close enough to tell them apart, same as the official site does."},
  {sel:"#bAbout",title:"Worth a read",
    body:"About explains exactly what's generated accurately versus a plausible guess -- and what's still an unverified guess, like individual planet names. It's also where Feedback lives if you spot a bug or have an idea -- no account needed to send one."},
  {sel:"#bAccess",title:"Accessibility",
    body:"Four font-size presets, a high-contrast mode, and real colour-correction (not just simulation) for protanopia, deuteranopia and tritanopia -- built into the map itself."}
];
var tourIdx=0, tourActive=false;
var TOUR_KEY="nms-galmap-tour-done";
function markTourDone(){ try{ localStorage.setItem(TOUR_KEY,"1"); }catch(e){} }
function tourPosition(){
  var step=TOUR_STEPS[tourIdx];
  var el=document.querySelector(step.sel);
  var hole=document.getElementById("tourHole");
  var box=document.getElementById("tourBox");
  if(!el){ tourNextStep(); return; } /* target not on screen this session -- skip rather than spotlight nothing */
  var r=el.getBoundingClientRect();
  var pad=6;
  hole.style.top=(r.top-pad)+"px";
  hole.style.left=(r.left-pad)+"px";
  hole.style.width=(r.width+pad*2)+"px";
  hole.style.height=(r.height+pad*2)+"px";
  document.getElementById("tourStepLabel").textContent="STEP "+(tourIdx+1)+" OF "+TOUR_STEPS.length;
  document.getElementById("tourTitle").textContent=step.title;
  document.getElementById("tourBody").textContent=step.body;
  document.getElementById("tourBack").style.visibility=tourIdx===0?"hidden":"visible";
  document.getElementById("tourNext").textContent=(tourIdx===TOUR_STEPS.length-1)?"Done":"Next";
  var bw=box.offsetWidth||280, bh=box.offsetHeight||140;
  var top=r.bottom+pad+10;
  if(top+bh>window.innerHeight-8) top=Math.max(8,r.top-pad-10-bh);
  var left=Math.min(window.innerWidth-bw-8,Math.max(8,r.left));
  box.style.top=top+"px";
  box.style.left=left+"px";
}
function openTour(){
  closeAllModalBoxes();
  closeModal();
  tourIdx=0; tourActive=true;
  document.getElementById("tourOverlay").classList.add("show");
  tourPosition();
}
function closeTour(){
  tourActive=false;
  document.getElementById("tourOverlay").classList.remove("show");
}
function tourNextStep(){
  if(tourIdx>=TOUR_STEPS.length-1){ closeTour(); markTourDone(); return; }
  tourIdx++; tourPosition();
}
function tourPrevStep(){ if(tourIdx>0){ tourIdx--; tourPosition(); } }
document.getElementById("tourNext").addEventListener("click",tourNextStep);
document.getElementById("tourBack").addEventListener("click",tourPrevStep);
document.getElementById("tourSkip").addEventListener("click",function(){ closeTour(); markTourDone(); });
document.getElementById("bTour").addEventListener("click",openTour);
document.getElementById("discTour").addEventListener("click",function(){
  try{ localStorage.setItem(DISCLAIMER_KEY,"1"); }catch(e){}
  openTour();
});
window.addEventListener("resize",function(){ if(tourActive) tourPosition(); });

/* ============ accessibility panel ============
   Font size / colour-blind filters / high contrast, gated behind a
   small gear icon rather than a full toolbar button -- Tony's own call: this
   is a setting a player sets once and forgets, not a feature they reach for
   every session, so it shouldn't compete for space with Jump/Filters/Labels.
   Opens on hover on devices that have real hover (desktop mouse), and on
   tap everywhere else -- matchMedia(hover:hover) is the standard feature
   test for "does this device have a mouse", since touch-only devices report
   no hover capability at all. Click-to-toggle is always wired too, so a
   mouse user can still pin it open by clicking, and it's the only way in on
   touch. All three settings persist to localStorage (same per-feature key
   pattern as the disclaimer/hyperdrive notices above) and are re-applied on
   boot before the first frame renders, so a returning visitor's choice
   doesn't flash back to default first. */
var A11Y_KEY="nms-galmap-a11y";
var a11y={fs:1,cc:false,filt:"none",hc:false};
try{
  var savedA11y=JSON.parse(localStorage.getItem(A11Y_KEY)||"null");
  if(savedA11y) a11y=Object.assign(a11y,savedA11y);
  // Invert was removed after Tony tried it live and didn't like it -- a
  // returning visitor with an old saved "invert" choice falls back to no
  // filter rather than applying a setting that no longer has a UI control.
  if(a11y.filt==="invert") a11y.filt="none";
}catch(e){ /* localStorage blocked or bad JSON -- fall back to defaults */ }
function saveA11y(){
  try{ localStorage.setItem(A11Y_KEY,JSON.stringify(a11y)); }catch(e){}
}
function applyA11y(){
  document.documentElement.style.setProperty("--ui-zoom",a11y.fs);
  document.querySelectorAll("#a11yFsRow .pill").forEach(function(b){
    b.classList.toggle("on",parseFloat(b.dataset.fs)===a11y.fs);
  });
  var filtRow=document.getElementById("a11yFiltRow");
  filtRow.style.opacity=a11y.cc?"1":".35";
  filtRow.querySelectorAll(".pill").forEach(function(b){
    b.disabled=!a11y.cc;
    b.classList.toggle("on",b.dataset.filt===a11y.filt);
  });
  var cssFilter="none";
  if(a11y.cc){
    if(a11y.filt==="protanopia") cssFilter="url(#protanopia-f)";
    else if(a11y.filt==="deuteranopia") cssFilter="url(#deuteranopia-f)";
    else if(a11y.filt==="tritanopia") cssFilter="url(#tritanopia-f)";
  }
  document.documentElement.style.filter=cssFilter;
  document.documentElement.classList.toggle("hc-on",a11y.hc);
  document.getElementById("a11yCC").checked=a11y.cc;
  document.getElementById("a11yHC").checked=a11y.hc;
}
document.querySelectorAll("#a11yFsRow .pill").forEach(function(b){
  b.addEventListener("click",function(){ a11y.fs=parseFloat(b.dataset.fs); applyA11y(); saveA11y(); });
});
document.getElementById("a11yCC").addEventListener("change",function(e){
  a11y.cc=e.target.checked; applyA11y(); saveA11y();
});
document.getElementById("a11yHC").addEventListener("change",function(e){
  a11y.hc=e.target.checked; applyA11y(); saveA11y();
});
document.querySelectorAll("#a11yFiltRow .pill").forEach(function(b){
  b.addEventListener("click",function(){
    if(b.disabled) return;
    a11y.filt=b.dataset.filt; applyA11y(); saveA11y();
  });
});
applyA11y();
(function(){
  var btn=document.getElementById("bAccess"), pop=document.getElementById("accessPop");
  var hoverCapable=window.matchMedia && window.matchMedia("(hover:hover)").matches;
  var hideT=null;
  /* Tony's real feedback: a pure hover tooltip is unusable for something with
     actual controls in it -- moving the mouse from the gear toward a checkbox
     or slider can leave the hover zone before you reach it, closing the whole
     panel mid-click. "pinned" fixes that: hovering still opens it for a quick
     peek and auto-closes on mouseleave like before, but the moment the panel
     is actually interacted with (a click, or grabbing the header to drag it,
     which is a pointerdown on the header) it pins open and ignores mouseleave
     entirely -- only a click on the gear while pinned, or a click elsewhere
     on the page, closes it after that. On touch devices (no hover at all)
     every open is a click, so every open is pinned by definition. */
  var pinned=false;
  /* The static top:.../right:10px in the CSS was a guess at where the gear
     button would end up -- wrong on a wide desktop window (the toolbar packs
     from the left, so the last button often isn't anywhere near the right
     edge) and wrong again once the toolbar wraps to its own rows on mobile
     (Tony's own screenshot showed the button, and where he wanted the panel,
     over on the left). Same lesson as --top-h elsewhere in this file: measure
     the button's real rendered position instead of guessing a fixed corner.
     Only runs once per session/resize -- makeDraggable() already gives this
     box a real inline left/top the moment it's auto-positioned OR dragged,
     and resetDraggedBoxes() (on window resize) clears that inline style back
     to "", which is exactly the signal used here to know a fresh anchor is
     needed rather than clobbering a position Tony deliberately dragged it to. */
  function positionUnderButton(){
    var r=btn.getBoundingClientRect();
    var pw=pop.offsetWidth||198;
    var left=Math.min(window.innerWidth-pw-8,Math.max(8,r.left));
    var top=r.bottom+8;
    // Never open on top of the "GALAXY #N OF N" badge (#galInfo, Galaxy
    // view only) -- both it and this popup anchor to roughly the same
    // "just under the toolbar" spot, and the badge's higher z-index then
    // rendered in front of the popup's own first row, making it look like
    // the badge was PART of the popup instead of floating over it (Tony's
    // screenshot). Measure its real rendered bottom edge rather than
    // guessing a fixed offset -- its height varies with the galaxy name's
    // length/wrapping, and getBoundingClientRect() naturally returns 0
    // height when it's hidden (Local/System view), so this only ever
    // pushes the popup down when the badge is actually showing.
    var badge=document.getElementById("galInfo");
    if(badge){
      var br=badge.getBoundingClientRect();
      if(br.height>0) top=Math.max(top,br.bottom+8);
    }
    pop.style.position="fixed";
    pop.style.left=left+"px";
    pop.style.right="auto";
    pop.style.top=top+"px";
    pop.style.bottom="auto";
    clampPopoverTop(pop);
  }
  function open(){
    clearTimeout(hideT);
    pop.classList.add("show");
    btn.classList.add("on");
    if(!pop.style.left) positionUnderButton();
    btn.setAttribute("aria-expanded","true");
  }
  function scheduleClose(){
    if(pinned) return;
    clearTimeout(hideT);
    hideT=setTimeout(close,220);
  }
  function close(){
    pop.classList.remove("show");
    btn.classList.remove("on");
    btn.setAttribute("aria-expanded","false");
    pinned=false;
  }
  if(hoverCapable){
    btn.addEventListener("mouseenter",open);
    btn.addEventListener("mouseleave",scheduleClose);
    pop.addEventListener("mouseenter",function(){ clearTimeout(hideT); });
    pop.addEventListener("mouseleave",scheduleClose);
  }
  btn.addEventListener("click",function(e){
    e.stopPropagation();
    if(pop.classList.contains("show") && pinned){ close(); }
    else { pinned=true; open(); }
  });
  pop.addEventListener("pointerdown",function(){ pinned=true; });
  document.addEventListener("click",function(e){
    if(pop.classList.contains("show") && !pop.contains(e.target) && e.target!==btn) close();
  });
})();

/* ============ search by name (Session 38) ============
   Can't search the whole procedural galaxy by name -- names are generated
   FROM the address, there's no reverse index, and the address space is far
   too large to brute-force search. What IS searchable: every system this
   browser already knows a real name for -- community-documented systems
   (fetched into OVERRIDES.systems on page load) plus your own bookmarks/
   waypoints/visited history (their name decoded fresh from the address via
   generateSystem(), same as everywhere else in this file). Rebuilt fresh
   every time the popup opens rather than kept live-updated -- these pools
   are small, so recomputing on open is cheap and avoids hooking every place
   a bookmark/waypoint/override can change. */
/* Search results now carry the GALAXY they actually belong to (2026-08-21,
   Tony: "if the system is in Euclid the galaxy information must change to
   suit" -- picking a result used to jump within whatever galaxy you were
   currently browsing, decoding the address there even when it was really
   bookmarked/waypointed/visited in a different one, which produced a wrong
   system). Bookmarks/waypoints/visited store a real "galaxyIdx:address" key
   already -- addFromStore used to just throw away anything not matching
   the CURRENT galaxy instead of surfacing it with its own galaxy attached,
   so those were silently unsearchable from any other galaxy at all, not
   just mis-jumped. Decoding a cross-galaxy address needs the real
   generateSystem()/GALAXY-global machinery, so addAddr briefly swaps
   GALAXY to the result's own galaxy, generates, then restores it --
   synchronous, no other code runs in between, safe.
   "Documented" (community-edited OVERRIDES.systems) entries closed that
   last gap on 2026-08-22: the shared store is now keyed "galaxy:ADDRESS"
   (see lib/shared.mjs's
   compositeKey() comment), so every record already carries its own real
   galaxy in its key, parsed the exact same way addFromStore() below
   already parses store.marks/waypoints/visited's own "galaxy:address"
   keys -- no more silent "assumed to be whichever galaxy you're currently
   in" fallback for this category. */
function buildSearchIndex(){
  var idx=[], seen={};
  function addAddr(addr,hint,galIdx){
    var g=(galIdx==null)?GALAXY:galIdx;
    var key=g+":"+addr;
    if(seen[key]) return; seen[key]=true;
    var a=parseAddress(addr);
    if(!a) return;
    var sys;
    if(g===GALAXY){
      sys=generateSystem(a.x,a.y,a.z,a.idx);
    } else {
      var prevGal=GALAXY;
      GALAXY=g;
      sys=generateSystem(a.x,a.y,a.z,a.idx);
      GALAXY=prevGal;
    }
    idx.push({name:sys.name,address:addr,hint:hint,galaxy:g});
    // Alliance name, added 2026-09-10 per Tony's ask -- a director may
    // optionally found an alliance (see disclaimerModal's "Space station
    // directorship" section) that isn't scoped to any single system, so
    // the SAME alliance name can legitimately appear on several of that
    // director's systems. Indexing it as its own entry (same pattern as
    // the planet/base names just below) means searching the alliance name
    // naturally surfaces every system that carries it -- no grouping logic
    // needed, buildSearchIndex()/renderMatches() already return and render
    // multiple matches for one query. hint carries the owning system's own
    // name too (not just the bare word "Alliance"), since several results
    // will share the exact same title (the alliance name itself) and a
    // traveller needs a fast way to tell them apart beyond the address.
    if(sys.allianceName) idx.push({name:sys.allianceName,address:addr,hint:"Alliance ("+sys.name+")",galaxy:g});
    // Real (non-procedural) planet/moon names + base names, added 2026-08-21
    // per Tony's ask -- most travellers remember what they named a
    // PLANET or a base, not the system it's in. b.nameOverridden is the same
    // flag applyOverride() sets the moment a real submitted body name lands
    // (see upgradeBodyNames()'s own comment) -- it's only ever true for a
    // genuine traveller submission, never this site's own procedural guess,
    // so no diff-against-baseline needed here, just check the flag. A base's
    // own name (b.baseName, added earlier the same day) is definitionally
    // real too -- it's a free-text field only a traveller can fill in, there
    // is no procedural "guess" for it to be confused with. bodyIdx is kept on
    // the result so a click can scroll/highlight that exact row once the
    // panel opens, instead of just landing on the system and making the
    // traveller hunt for the match themselves.
    if(sys.bodies&&sys.bodies.length){
      for(var bi=0;bi<sys.bodies.length;bi++){
        var b=sys.bodies[bi];
        if(!b) continue;
        if(b.nameOverridden && b.name) idx.push({name:b.name,address:addr,hint:(b.moon?"Moon":"Planet")+" ("+sys.name+")",galaxy:g,bodyIdx:bi});
        if(b.base && b.baseName) idx.push({name:b.baseName,address:addr,hint:"Base ("+sys.name+")",galaxy:g,bodyIdx:bi});
      }
    }
  }
  var ovKeys=Object.keys(OVERRIDES.systems||{});
  /* Real gap found 2026-08-27 (Tony: "why isnt even the saved file systems
     not showing... i have jumped and edited saved a few systems"): every
     "Documented" (community-edited) system was excluded from the empty-
     query personal browse by SEARCH_PERSONAL_HINTS below on purpose --
     otherwise leaving the search box empty would dump every OTHER
     traveller's edits too, not read as "my own history" any more. But that
     meant a visitor's OWN edits/bulk-imported bases -- which absolutely
     should come back when they're just trying to get back to somewhere
     they personally documented -- were just as invisible as anyone else's.
     Fix: tag an OVERRIDES.systems record "Documented (you)" instead of
     "Documented" when its editorName matches this browser's own saved
     traveller name (same loadTravellerId() used to auto-fill "Your name"
     in Edit system) -- see SEARCH_PERSONAL_HINTS below for the other half.
     Separately, this also drops the old `!ov.data.name` gate -- it silently
     skipped indexing ANY edited system that never had its system-level
     name field explicitly submitted (exactly what a bulk-imported base
     record looks like: only a base name + note, per handleBulkImport()'s
     own "never clobber" rule -- see netlify/functions/system-edit.mjs),
     even though addAddr() below already generates the system and picks up
     its real display name (procedural or overridden) via generateSystem()
     regardless, and separately indexes any real base/planet names on its
     bodies. A genuinely real edit (`ov.data` exists) is always worth
     indexing by SOME name, not just the ones where a system name
     specifically was typed in. */
  var _myTraveller=(loadTravellerId().name||"").trim().toLowerCase();
  for(var i=0;i<ovKeys.length;i++){
    var ov=OVERRIDES.systems[ovKeys[i]];
    if(!ov||!ov.data) continue;
    var _mineHint=(_myTraveller && ov.data.editorName &&
      String(ov.data.editorName).trim().toLowerCase()===_myTraveller) ?
      "Documented (you)" : "Documented";
    var ovParts=ovKeys[i].split(":");
    if(ovParts.length<2){
      // Pre-migration legacy record (bare address, no galaxy digit at all)
      // -- treat as Euclid, same fallback/reasoning as applyOverride()'s
      // own comment. Becomes unreachable once the migration runs.
      if(/^[0-9A-Fa-f]{12}$/.test(ovKeys[i])) addAddr(ovKeys[i],_mineHint,0);
      continue;
    }
    var ovGal=parseInt(ovParts[0],10);
    if(isNaN(ovGal)) continue;
    addAddr(ovParts[1],_mineHint,ovGal);
  }
  function addFromStore(obj,hint){
    var keys=Object.keys(obj);
    for(var k=0;k<keys.length;k++){
      var parts=keys[k].split(":");
      if(parts.length<2) continue;
      var g=parseInt(parts[0],10);
      if(isNaN(g)) continue;
      addAddr(parts[1],hint,g);
    }
  }
  addFromStore(store.marks,"Bookmarked");
  addFromStore(store.waypoints,"Waypoint");
  addFromStore(store.visited,"Visited");
  return idx;
}
var SEARCH_PERSONAL_HINTS={Visited:1,Bookmarked:1,Waypoint:1,"Documented (you)":1};
function runSearch(query){
  var box=document.getElementById("searchResults");
  var q=query.trim().toLowerCase();
  var idx=buildSearchIndex(), i;
  if(!q){
    // Browse mode (2026-08-26, Tony: "filter visited and they all show,
    // then I click which one I want to go back to") -- an empty box used
    // to just say "type a name" and show nothing, so the only way back to
    // an old system was remembering its address or portal glyphs. Personal
    // history only (Visited/Bookmarked/Waypoint), not every community
    // "Documented" system -- reads as "my own history", not a general
    // community browse. Typing a name still searches everything including
    // Documented, unchanged below.
    var mine=[];
    for(i=0;i<idx.length;i++){ if(SEARCH_PERSONAL_HINTS[idx[i].hint]) mine.push(idx[i]); }
    mine.sort(function(a,b){ return a.name.localeCompare(b.name); });
    var _histHintFull="Nothing bookmarked, waypointed, visited, or edited by you yet -- jump to a system (Random, an address, or a Search result), or submit a real edit, and it'll show up here. Type a name above to search the wider community-documented list instead.";
    var _histHintMsg;
    try{
      if(localStorage.getItem("nms_histHintSeen")==="1"){
        _histHintMsg='Nothing in your history yet. <span class="histHintReopen" data-full="'+escAttr(_histHintFull)+'" style="color:var(--cyan);cursor:pointer;text-decoration:underline">What\'s this?</span>';
      } else {
        _histHintMsg=_histHintFull+' <span class="histHintDismiss" style="color:var(--cyan);cursor:pointer;text-decoration:underline;white-space:nowrap">Got it, don\'t show this again</span>';
      }
    }catch(_e){ _histHintMsg=_histHintFull; } // localStorage unavailable (private mode etc.) -- fall back to always showing the full text, never crash the search
    renderMatches(mine.slice(0,60),_histHintMsg);
    return;
  }
  var starts=[];
  for(i=0;i<idx.length;i++){
    if(idx[i].name.toLowerCase().indexOf(q)===0) starts.push(idx[i]);
  }
  /* 2026-09-11, Tony's ask: pull Alliance-tagged matches into their own
     group instead of leaving them flat in the same list as any other
     same-prefix hit (e.g. a system literally named "Ember" sitting next
     to an alliance called "Embercore" would otherwise be indistinguishable
     at a glance). Grouped by the alliance's own real name (idx.name for
     these rows -- hint carries the OWNING system, not the alliance), since
     a broad-enough prefix can technically match more than one distinct
     alliance at once. Kept inside this same popup rather than a separate
     floating window -- see WINDOW-STANDARDS.md. */
  var allianceOrder=[], allianceGroups={}, rest=[];
  for(i=0;i<starts.length;i++){
    var m=starts[i];
    if(m.hint && m.hint.indexOf("Alliance (")===0){
      if(!allianceGroups[m.name]){ allianceGroups[m.name]=[]; allianceOrder.push(m.name); }
      allianceGroups[m.name].push(m);
    } else {
      rest.push(m);
    }
  }
  renderMatches({allianceOrder:allianceOrder,allianceGroups:allianceGroups,rest:rest},
    "No match found -- only names you or the community have actually documented, bookmarked, waypointed or visited are searchable, not every procedural system. Your own bookmarks/waypoints/visited history are already searched across every galaxy, not just the one you're currently viewing.");
}
/* 2026-09-11: now accepts either the plain flat array runSearch's empty-
   query browse mode has always passed, OR the {allianceOrder,
   allianceGroups, rest} shape runSearch's real query path now builds --
   detected by Array.isArray so browse mode needed no changes at all. */
function renderMatches(matches,emptyMsg){
  var box=document.getElementById("searchResults");
  var grouped=!Array.isArray(matches);
  var allianceOrder=grouped?matches.allianceOrder:[];
  var allianceGroups=grouped?matches.allianceGroups:{};
  var rest=grouped?matches.rest:matches;
  var total=rest.length,g;
  for(g=0;g<allianceOrder.length;g++) total+=allianceGroups[allianceOrder[g]].length;
  if(!total){ box.innerHTML='<div class="searchEmpty">'+emptyMsg+'</div>'; return; }
  var CAP=20, used=0, html="";
  function rowHtml(m){
    /* 2026-08-30, honest-review fix: this used to only print the galaxy
       name for a CROSS-galaxy result, on the theory that "no tag" plainly
       enough meant "same as what you're currently browsing". Real usage
       (and Tony's own follow-up ask) showed that's not obvious in the
       moment -- a traveller scanning a list of "Documented"/"Visited"
       results has no way to tell an untagged one is safely local without
       already remembering which galaxy is current, especially once
       there's more than a couple of results on screen. Every result's
       galaxy is now always printed; the gold highlight is kept exactly as
       before (cross-galaxy only) so that "picking this switches your
       galaxy" heads-up isn't lost or diluted by the now-routine same-
       galaxy label sitting right next to it in the same plain colour. */
    var galNote=' &middot; <span'+(m.galaxy!==GALAXY?' style="color:var(--gold)"':'')+'>'+
      (GALAXIES[m.galaxy]||("Galaxy #"+(m.galaxy+1)))+'</span>';
    var bodyAttr=(m.bodyIdx!=null)?(' data-body="'+m.bodyIdx+'"'):"";
    var glyphHtml="",_gi; for(_gi=0;_gi<m.address.length;_gi++)
      glyphHtml+='<img alt="'+m.address[_gi]+'" src="'+glyphSrc(m.address[_gi])+'" style="height:10px;width:10px;vertical-align:-1px;margin-right:1px">';
    return '<div class="searchRes" data-addr="'+m.address+'" data-galaxy="'+m.galaxy+'"'+bodyAttr+'>'+
      '<div class="searchResName">'+m.name+'</div>'+
      '<div class="searchResMeta">'+glyphHtml+' '+m.address+' &middot; '+m.hint+galNote+'</div></div>';
  }
  for(g=0;g<allianceOrder.length && used<CAP;g++){
    var allianceName=allianceOrder[g], group=allianceGroups[allianceName], j;
    html+='<div class="searchAllianceHead">Alliance: '+allianceName+' &middot; '+
      group.length+' system'+(group.length===1?"":"s")+'</div>';
    for(j=0;j<group.length && used<CAP;j++){ html+=rowHtml(group[j]); used++; }
  }
  for(var i=0;i<rest.length && used<CAP;i++){ html+=rowHtml(rest[i]); used++; }
  box.innerHTML=html;
}
(function(){
  var btn=document.getElementById("bSearch"), pop=document.getElementById("searchPop");
  var inp=document.getElementById("inSearch");
  function positionUnderSearchBtn(){
    var r=btn.getBoundingClientRect();
    var pw=pop.offsetWidth||260;
    var left=Math.min(window.innerWidth-pw-8,Math.max(8,r.left));
    var top=r.bottom+8;
    var badge=document.getElementById("galInfo");
    if(badge){
      var br=badge.getBoundingClientRect();
      if(br.height>0) top=Math.max(top,br.bottom+8);
    }
    /* 2026-08-25, honest-review fix: the Search toolbar button sits far
       enough right that "under the button" used to land the popup directly
       on top of #panel (the system-info sidebar) whenever one was showing
       -- two boxes of near-identical width stacked in the same corner.
       Same measure-don't-guess approach as the rest of this function:
       check #panel's real rect rather than assuming, and if it's visible
       and would actually overlap, slide the popup left of it instead. */
    var panelEl=document.getElementById("panel");
    if(panelEl && panelEl.classList.contains("show")){
      var pr=panelEl.getBoundingClientRect();
      if(pr.width>0 && left+pw>pr.left-8 && left<pr.right){
        left=Math.max(8,pr.left-pw-8);
      }
    }
    pop.style.position="fixed";
    pop.style.left=left+"px"; pop.style.right="auto";
    pop.style.top=top+"px"; pop.style.bottom="auto";
    clampPopoverTop(pop);
  }
  /* Same measure-don't-guess fix as positionHyperPanel()/openHyperNotice()
     -- only opt into a real scrollbar once actual overflow is confirmed
     after layout, called right after every content-changing runSearch().
     Tolerance widened 1px->3px (2026-08-22, real screenshot from Tony still
     showing a phantom scrollbar): #searchPop also has zoom:var(--ui-zoom,1)
     applied for the accessibility font-size feature, and CSS zoom is a
     known extra source of scrollHeight/clientHeight sub-pixel drift on top
     of this bug class's usual rounding quirk -- a few px of "overflow" here
     is not something a traveller could ever actually see, so it's safe
     slack, not a masked real bug. */
  function remeasureScroll(){
    pop.classList.remove("scroll");
    if(pop.scrollHeight>pop.clientHeight+3) pop.classList.add("scroll");
    clampPopoverTop(pop);
  }
  function openSearch(){
    pop.classList.add("show");
    btn.classList.add("on");
    if(!pop.dataset.userMoved) positionUnderSearchBtn();
    runSearch(inp.value);
    remeasureScroll();
    inp.focus();
  }
  function closeSearch(){ pop.classList.remove("show"); btn.classList.remove("on"); }
  document.getElementById("bSearchClose").addEventListener("click",function(e){
    e.stopPropagation();
    closeSearch();
  });
  btn.addEventListener("click",function(e){
    e.stopPropagation();
    if(pop.classList.contains("show")) closeSearch(); else openSearch();
  });
  document.addEventListener("click",function(e){
    if(pop.classList.contains("show") && !pop.contains(e.target) && e.target!==btn){
      closeSearch();
      e.stopPropagation(); // swallow the click so it doesn't ALSO pick whatever's underneath (Tony: "defeats the object")
    }
  },true);
  inp.addEventListener("input",function(){ runSearch(inp.value); remeasureScroll(); });
  document.getElementById("searchResults").addEventListener("click",function(e){
    if(e.target.closest&&e.target.closest(".histHintDismiss")){
      try{ localStorage.setItem("nms_histHintSeen","1"); }catch(_e){}
      runSearch(inp.value);
      return;
    }
    if(e.target.closest&&e.target.closest(".histHintReopen")){
      toast(e.target.closest(".histHintReopen").getAttribute("data-full"),6000);
      return;
    }
    var row=e.target.closest?e.target.closest(".searchRes"):null;
    if(!row) return;
    var addr=row.getAttribute("data-addr");
    var galAttr=row.getAttribute("data-galaxy");
    var gal=galAttr!==null?parseInt(galAttr,10):GALAXY;
    if(!isNaN(gal)&&gal!==GALAXY){
      switchGalaxy(gal);
      document.getElementById("galSel").value=String(gal);
      syncGalaxyPickInput();
      toast("Switched to "+GALAXIES[gal]+" -- that's where this result was documented/bookmarked", 3200);
    }
    document.getElementById("inAddr").value=addr;
    setKeypad(addr);
    if(jumpTo(addr)) playWarpTransition("portal");
    closeSearch();
    // Body/base search results (2026-08-21): jumpTo() already opened the
    // panel and rebuilt #pBodies synchronously above, so the matched row's
    // real DOM node exists right now -- scroll it into view and flash it
    // briefly so a planet/base match doesn't just land on the system and
    // leave the traveller to hunt for it in the body list themselves.
    var bodyAttr=row.getAttribute("data-body");
    if(bodyAttr!==null){
      var brow=document.querySelector('#pBodies .brow[data-b="'+bodyAttr+'"]');
      if(brow){
        brow.scrollIntoView({block:"nearest"});
        brow.classList.add("searchHit");
        setTimeout(function(){ brow.classList.remove("searchHit"); },2400);
      }
    }
  });
})();
/* ============ Find: destination scan (2026-09-12) ============
   The gap this closes: Filters only narrows systems generateSlice() already
   materialized for the CURRENT Local view, and (the by-name search just
   above, untouched) only finds systems you or the community have already
   documented/bookmarked/waypointed/visited -- neither can answer "is there a
   system matching X somewhere I haven't looked yet", which was Tony's own
   original real-world case: finding a yellow-star/black-hole/Korvax system
   in-game first, then only being able to locate it here because it happened
   to already be inside the currently-rendered slice.
   Honest scope, not swept under the rug: a system's REAL name and its
   ordinary traits (colour/race/economy/outlaw/gas giant) only exist at one
   of 4096 possible indices per region, and generating all 4096 to check
   every one, for every region in a multi-thousand-LY radius, is far too
   slow to run synchronously on a click (this is exactly why generateSlice()
   itself only ever materializes a random `per`-sized sample per region, not
   all 4096 -- see its own comment). So this scan reuses that SAME sampling
   approach (same #sPer density, same per-region seed 0xF00D) rather than
   pretending to be exhaustive -- a specific ordinary system is not
   guaranteed to turn up, exactly as one is not guaranteed to already be
   rendered in Local view today, and the UI says so.
   Two things ARE checked exactly, with zero sampling gap, however large the
   radius: every region's real black hole/Atlas index (regionAnomalyIdx() is
   O(1) per region, no 4096-index sweep needed), and every system already in
   your OWN history (bookmarked/waypointed/visited/documented, current
   galaxy -- markedRegionIdx() again, same source Local view itself always
   force-includes) regardless of distance. Between the two, Tony's own
   original worked example -- find a black-hole system by colour/race -- is
   in fact always found, not just usually. */
/* Both radii below are deliberately conservative: even the "exact, not
   sampled" black-hole/Atlas pass costs one full generateSystem() call per
   real anomaly (most regions have one of each -- see regionAnomalyIdx()'s
   own comment), and generateSystem() is not cheap (full body/biome/ring
   generation per system). At FIND_MAX_HALFWIDTH=8 that pass is bounded to
   (2*8+1)^3=4,913 regions -- worst case (no colour filter to cheaply skip
   with, see wantCol below) under ~10,000 full generations, comfortably
   under this file's own existing "Heavy: N systems" threshold of 45,000 for
   a passive render, which is the right bar for a single on-demand click to
   clear too. FIND_SCAN_BUDGET separately bounds the random-sample pass the
   same way generateSlice()'s own `per` already is. Together, a max-radius
   scan (halfwidth capped, sample thinned) still finishes in well under a
   second on ordinary hardware -- verified by the call-count math in
   verify_find_scan.js's harness, not just asserted here. */
var FIND_SCAN_BUDGET=8000, FIND_MAX_HALFWIDTH=8;
function sysNameMatches(s,q){
  // Returns the exact name the query was found in (the system's own name,
  // or a specific planet/moon's), not just true/false -- see its one call
  // site in tryMatch() and renderFindMatches()'s own use of r.matchedName.
  if(s.name.toLowerCase().indexOf(q)>=0) return s.name;
  if(s.bodies) for(var _bi=0;_bi<s.bodies.length;_bi++){
    var _bn=s.bodies[_bi].name;
    if(_bn && _bn.toLowerCase().indexOf(q)>=0) return _bn;
  }
  return null;
}
function findMatchesTraits(s,tr){
  if(tr.col&&s.type!==tr.col) return false;
  if(tr.race&&s.race!==tr.race) return false;
  if(tr.eco&&s.econType!==tr.eco) return false;
  if(tr.bh&&!s.blackHole) return false;
  if(tr.atl&&!s.atlas) return false;
  if(tr.out&&!s.outlaw) return false;
  if(tr.giant&&!s.giant) return false;
  return true;
}
function runFindScan(mode){
  if(!focusSystem){ toast("Jump somewhere first"); return; }
  var q="", tr=null;
  if(mode==="name"){
    q=document.getElementById("inSearch").value.trim().toLowerCase();
    // Blank query -- browse nearby systems (sorted by distance) rather than
    // refusing; see this block's own header comment.
  } else {
    tr={
      col:document.getElementById("fdCol").value,
      race:document.getElementById("fdRace").value,
      eco:document.getElementById("fdEco").value,
      bh:document.getElementById("fdBH").checked,
      atl:document.getElementById("fdAtl").checked,
      out:document.getElementById("fdOut").checked,
      giant:document.getElementById("fdGiant").checked
    };
    // No trait ticked -- same "browse nearby" fallback as a blank name query
    // above; findMatchesTraits({col:"",race:"",...}) already matches
    // everything on its own, nothing else to change here.
  }
  var wantRadius=Math.max(1,parseFloat(document.getElementById("fdRadius").value)||2200);
  var wantHalf=Math.ceil(wantRadius/LY_PER_VOXEL)+1;
  var halfwidth=Math.min(FIND_MAX_HALFWIDTH,wantHalf);
  var capped=wantHalf>FIND_MAX_HALFWIDTH;
  var radius=capped?(FIND_MAX_HALFWIDTH*LY_PER_VOXEL):wantRadius;

  var results=[], seen={};
  function genAt(vx,vy,vz,idx){
    var s=generateSystem(vx,vy,vz,idx);
    var jr=mulberry32(gseed(vx,vy,vz,idx^0x9999));
    var dx=vx-focus.x, dy=vy-focus.y, dz=vz-focus.z;
    s.px=(dx+jr()-0.5)*VOX_U; s.py=(dy+jr()-0.5)*VOX_U; s.pz=(dz+jr()-0.5)*VOX_U;
    return s;
  }
  function tryMatch(s,forceInclude,tag){
    var key=s.galaxy+":"+s.address;
    if(seen[key]) return;
    var matchedName = mode==="name" ? sysNameMatches(s,q) : null;
    var isMatch = mode==="name" ? (matchedName!==null) : findMatchesTraits(s,tr);
    if(!isMatch) return;
    var dist=wpDist(s,focusSystem)*VOX_LY;
    if(!forceInclude && dist>radius) return;
    seen[key]=true;
    results.push({sys:s,dist:dist,tag:tag,matchedName:matchedName});
  }

  // 1) your own history (bookmarked/waypointed/visited/documented, current
  // galaxy) -- always checked, regardless of distance, same as the by-name
  // search's own empty-query browse already does.
  var _marked=markedRegionIdx(), mk;
  for(mk in _marked){
    var parts=mk.split(","), mvx=parseInt(parts[0],10), mvy=parseInt(parts[1],10), mvz=parseInt(parts[2],10);
    var list=_marked[mk];
    for(var mi=0;mi<list.length;mi++) tryMatch(genAt(mvx,mvy,mvz,list[mi]),true,"history");
  }

  // 1b) allSystems is the exact array generateSlice() just built for Local
  // view's own starfield -- same systems, same generated names, already
  // sitting in memory. Reusing it directly (rather than an independent
  // re-sample) guarantees perfect parity with what's on screen right now.
  var localR=parseInt(document.getElementById("sR").value,10);
  if(isNaN(localR)) localR=2;
  if(window.allSystems && allSystems.length){
    for(var ali=0;ali<allSystems.length;ali++) tryMatch(allSystems[ali],false,"local");
  }

  // 2) every real black hole / Atlas station in radius -- exact, not sampled.
  // Same cheap starTypeForIdx() colour pre-check as the sample pass below
  // when a colour is required (regionAnomalyIdx() itself is already O(1),
  // it's the subsequent full generateSystem() per anomaly that's costly --
  // see FIND_MAX_HALFWIDTH's own comment above) -- this is what keeps
  // Tony's own original worked example (yellow + black hole + race) fast
  // even at a large radius, not just correct.
  var dx,dy,dz,regionsN=0;
  var wantColAnomaly=(mode==="trait"&&tr.col)?tr.col:null;
  for(dx=-halfwidth;dx<=halfwidth;dx++) for(dy=-halfwidth;dy<=halfwidth;dy++) for(dz=-halfwidth;dz<=halfwidth;dz++){
    regionsN++;
    var vx=focus.x+dx, vy=focus.y+dy, vz=focus.z+dz;
    var an=regionAnomalyIdx(vx,vy,vz);
    if(an.bh>=0 && (!wantColAnomaly || starTypeForIdx(vx,vy,vz,an.bh).k===wantColAnomaly))
      tryMatch(genAt(vx,vy,vz,an.bh),false,"exact");
    if(an.atlas>=0 && an.atlas!==an.bh && (!wantColAnomaly || starTypeForIdx(vx,vy,vz,an.atlas).k===wantColAnomaly))
      tryMatch(genAt(vx,vy,vz,an.atlas),false,"exact");
  }

  // 3) random sample, same seed/density the map itself already uses when
  // this region is actually rendered, budget-capped so a big radius stays
  // responsive (thinned rather than refused -- see the toast below).
  // Budget the sample pass over the OUTER shell only (regions already
  // covered by the allSystems reuse above are skipped below) -- both because
  // re-sampling them would just be redundant work, and so the regions that
  // actually need this pass (beyond Local view's own reach) get a fair share
  // of the budget instead of it being diluted across regions that didn't
  // need it.
  var innerSpan=Math.min(2*localR+1,2*halfwidth+1);
  var outerRegionsN=Math.max(1,Math.pow(2*halfwidth+1,3)-Math.pow(innerSpan,3));
  var wantPer=parseInt(document.getElementById("sPer").value,10)||22;
  var per=Math.max(2,Math.min(wantPer,Math.floor(FIND_SCAN_BUDGET/outerRegionsN)));
  var thinned=per<wantPer;
  for(dx=-halfwidth;dx<=halfwidth;dx++) for(dy=-halfwidth;dy<=halfwidth;dy++) for(dz=-halfwidth;dz<=halfwidth;dz++){
    if(Math.abs(dx)<=localR && Math.abs(dy)<=localR && Math.abs(dz)<=localR) continue; // already covered above
    var vx2=focus.x+dx, vy2=focus.y+dy, vz2=focus.z+dz;
    var count=regionCount(vx2,vy2,vz2);
    var vr=mulberry32(gseed(vx2,vy2,vz2,0xF00D));
    // Cheap colour-only pre-check (starTypeForIdx(), see its own comment
    // above -- verified byte-identical to generateSystem()'s own first
    // draw) so a colour requirement doesn't spend the full-generation
    // budget on misses -- lets the sample cover more of the region for
    // exactly the trait Tony's own example leaned on hardest.
    var wantCol=(mode==="trait"&&tr.col)?tr.col:null;
    var tries=0, hits=0, maxTries=per*6;
    while(hits<per && tries<maxTries){
      tries++;
      var pick=Math.floor(vr()*count);
      if(wantCol && starTypeForIdx(vx2,vy2,vz2,pick).k!==wantCol) continue;
      hits++;
      tryMatch(genAt(vx2,vy2,vz2,pick),false,"sample");
    }
  }

  var isTargeted=(mode==="name"&&q) || (mode==="trait"&&(tr.col||tr.race||tr.eco||tr.bh||tr.atl||tr.out||tr.giant));
  results.sort(function(a,b){
    if(isTargeted){
      if(a.tag==="history"&&b.tag!=="history") return -1;
      if(b.tag==="history"&&a.tag!=="history") return 1;
    }
    return a.dist-b.dist;
  });
  renderFindMatches(results.slice(0,20),radius,capped,thinned,mode,q);
}
window.__findResultsByAddr=null;
function remeasureSearchPop(){
  var pop=document.getElementById("searchPop");
  if(!pop) return;
  pop.classList.remove("scroll");
  if(pop.scrollHeight>pop.clientHeight+3) pop.classList.add("scroll");
  clampPopoverTop(pop);
}
function renderFindMatches(results,radius,capped,thinned,mode,q){
  var box=document.getElementById("findScanResults");
  var notes="";
  // A non-empty name query only ever matches systems whose real name
  // contains that exact text -- names are effectively unique per address,
  // so this is almost always going to be the one system you already typed.
  // Spell that out right here, with a one-click way to actually browse
  // nearby instead, rather than leaving "why is nothing else showing up"
  // to be re-discovered by trial and error.
  if(mode==="name" && q){
    notes+='<div class="searchEmpty">Only matching &quot;'+escAttr(q)+'&quot; -- '+
      '<span class="findClearLink" style="color:var(--cyan);cursor:pointer;text-decoration:underline">clear the name and browse everything nearby instead</span></div>';
  }
  if(capped) notes+='<div class="searchEmpty">Radius capped to '+commas(radius)+' LY for performance.</div>';
  if(thinned) notes+='<div class="searchEmpty">Large radius -- sampled at reduced density to stay responsive. An ordinary system might not turn up; narrow the radius (or add a black hole/Atlas requirement, always checked exactly) for a denser scan.</div>';
  if(!results.length){
    box.innerHTML=notes+'<div class="searchEmpty">No matches within '+commas(Math.round(radius))+
      ' LY. Everywhere you\'ve bookmarked, waypointed, visited or documented is always checked too, regardless of distance.</div>';
    window.__findResultsByAddr=null;
    remeasureSearchPop();
    return;
  }
  var byAddr={}, html=notes, i;
  for(i=0;i<results.length;i++){
    var r=results[i], s=r.sys;
    byAddr[s.address]=s;
    var reach=canReachColor(s.type);
    var metaBits=[s.type,s.race];
    if(s.blackHole) metaBits.push("Black hole");
    if(s.atlas) metaBits.push("Atlas");
    // A name-mode match found only on a planet/moon (not the system's own
    // name) needs to say so right here -- otherwise there's no way to tell
    // WHICH of several results actually has the planet you searched for.
    if(r.matchedName && r.matchedName!==s.name) metaBits.push('matched planet "'+escAttr(r.matchedName)+'"');
    var distLabel=(r.tag==="history")?"Your history":(commas(Math.round(r.dist))+" LY");
    var subLabel=reach?"reachable":("needs "+minDriveForColor(s.type).short);
    html+='<div class="findCard" data-addr="'+s.address+'">'+
      '<div class="top"><div><div class="name">'+s.name+'</div>'+
      '<div class="meta">'+metaBits.join(" &middot; ")+'</div></div>'+
      '<div class="dist">'+distLabel+'<small'+(reach?"":' style="color:#ff6a5a"')+'>'+subLabel+'</small></div></div>'+
      '</div>';
  }
  box.innerHTML=html;
  window.__findResultsByAddr=byAddr;
  remeasureSearchPop();
}
(function(){
  var tabName=document.getElementById("fdTabName"), tabTrait=document.getElementById("fdTabTrait");
  var bodyName=document.getElementById("fdNameBody"), bodyTrait=document.getElementById("fdTraitBody");
  var findMode="name";
  function showFindTab(m){
    findMode=m;
    tabName.classList.toggle("on",m==="name");
    tabTrait.classList.toggle("on",m==="trait");
    bodyName.style.display=(m==="name")?"":"none";
    bodyTrait.style.display=(m==="trait")?"":"none";
    remeasureSearchPop();
  }
  tabName.addEventListener("click",function(){ showFindTab("name"); });
  tabTrait.addEventListener("click",function(){ showFindTab("trait"); });
  // Keeps the shared scan radius live-synced to the currently-selected
  // Hyperdrive's jump range -- both the first time this popup is opened AND
  // every time that range changes afterwards in Filters (Tony: "scan radius
  // should match user jump distance, user should not need to
  // put/change...") -- until the traveller types their own value into the
  // radius box, at which point it's clearly a deliberate choice and syncing
  // stops so it isn't silently overwritten later.
  var radiusUserEdited=false;
  function syncRadiusToHyper(){
    if(radiusUserEdited) return;
    var hv=parseInt(document.getElementById("fHyper").value,10);
    if(hv) document.getElementById("fdRadius").value=hv;
  }
  document.getElementById("bSearch").addEventListener("click",syncRadiusToHyper);
  document.getElementById("fHyper").addEventListener("change",syncRadiusToHyper);
  document.getElementById("fdRadius").addEventListener("input",function(){ radiusUserEdited=true; });
  document.getElementById("bFdScan").addEventListener("click",function(){ runFindScan(findMode); });
  document.getElementById("findScanResults").addEventListener("click",function(e){
    if(e.target.closest&&e.target.closest(".findClearLink")){
      document.getElementById("inSearch").value="";
      runFindScan("name");
      runSearch(""); // keep the by-name history list above in sync too
      return;
    }
    var row=e.target.closest?e.target.closest(".findCard"):null;
    if(!row) return;
    var addr=row.getAttribute("data-addr");
    var sys=window.__findResultsByAddr&&window.__findResultsByAddr[addr];
    if(!sys) return;
    // 2026-09-13 fix (Tony: after Scan, "whichever you click the system
    // should change to the system you clicked"). This used to call
    // previewSystem() (still used by tryPick() for an ordinary star click on
    // the rendered field, see its own comment above that function), which
    // opens the info panel and silently plots a course WITHOUT moving you --
    // fine for a star already visible on screen, but a Scan result can sit
    // anywhere in the galaxy, nowhere near what's currently rendered, so
    // "preview only" left the 3D view/camera/system banner still showing
    // wherever you scanned FROM, reading as a dead click. Now matches the By
    // Name search result's own click handler just above: set the address,
    // jumpTo() it for real, then close the popup the same way closeSearch()
    // does (that function is local to the other IIFE above, out of scope
    // here, so its two lines are just repeated rather than exported).
    document.getElementById("inAddr").value=sys.address;
    setKeypad(sys.address);
    if(jumpTo(sys.address)) playWarpTransition("portal");
    document.getElementById("searchPop").classList.remove("show");
    document.getElementById("bSearch").classList.remove("on");
  });
})();
/* #routesPop open/close/position -- same pattern as #searchPop just above,
   right down to the #panel-overlap dodge, so the two popovers behave
   identically to a traveller even though what they list is different.
   closeRoutesPop is exported on window so the row-action and paste-link
   handlers elsewhere (registered outside this IIFE) can close the popover
   after they act, the same way closeSearch() only needs to be reachable
   from inside its own IIFE. */
(function(){
  var btn=document.getElementById("bRoutes"), pop=document.getElementById("routesPop");
  function positionUnderRoutesBtn(){
    var r=btn.getBoundingClientRect();
    var pw=pop.offsetWidth||300;
    var left=Math.min(window.innerWidth-pw-8,Math.max(8,r.left));
    var top=r.bottom+8;
    var badge=document.getElementById("galInfo");
    if(badge){
      var br=badge.getBoundingClientRect();
      if(br.height>0) top=Math.max(top,br.bottom+8);
    }
    var panelEl=document.getElementById("panel");
    if(panelEl && panelEl.classList.contains("show")){
      var pr=panelEl.getBoundingClientRect();
      if(pr.width>0 && left+pw>pr.left-8 && left<pr.right){
        left=Math.max(8,pr.left-pw-8);
      }
    }
    pop.style.position="fixed";
    pop.style.left=left+"px"; pop.style.right="auto";
    pop.style.top=top+"px"; pop.style.bottom="auto";
    clampPopoverTop(pop);
  }
  function remeasureScroll(){
    pop.classList.remove("scroll");
    if(pop.scrollHeight>pop.clientHeight+3) pop.classList.add("scroll");
    clampPopoverTop(pop);
  }
  function openRoutes(){
    pop.classList.add("show");
    btn.classList.add("on");
    positionUnderRoutesBtn();
    renderRoutesList();
    remeasureScroll();
  }
  function closeRoutes(){ pop.classList.remove("show"); btn.classList.remove("on"); }
  window.closeRoutesPop=closeRoutes;
  btn.addEventListener("click",function(e){
    e.stopPropagation();
    if(pop.classList.contains("show")) closeRoutes(); else openRoutes();
  });
  document.addEventListener("click",function(e){
    if(pop.classList.contains("show") && !pop.contains(e.target) && e.target!==btn) closeRoutes();
  });
})();

/* #favPop open/close/position -- same pattern as #routesPop just above. */
(function(){
  var btn=document.getElementById("bFav"), pop=document.getElementById("favPop");
  function positionUnderFavBtn(){
    var r=btn.getBoundingClientRect();
    var pw=pop.offsetWidth||300;
    var left=Math.min(window.innerWidth-pw-8,Math.max(8,r.left));
    var top=r.bottom+8;
    var badge=document.getElementById("galInfo");
    if(badge){
      var br=badge.getBoundingClientRect();
      if(br.height>0) top=Math.max(top,br.bottom+8);
    }
    var panelEl=document.getElementById("panel");
    if(panelEl && panelEl.classList.contains("show")){
      var pr=panelEl.getBoundingClientRect();
      if(pr.width>0 && left+pw>pr.left-8 && left<pr.right){
        left=Math.max(8,pr.left-pw-8);
      }
    }
    pop.style.position="fixed";
    pop.style.left=left+"px"; pop.style.right="auto";
    pop.style.top=top+"px"; pop.style.bottom="auto";
    clampPopoverTop(pop);
  }
  function remeasureScroll(){
    pop.classList.remove("scroll");
    if(pop.scrollHeight>pop.clientHeight+3) pop.classList.add("scroll");
    clampPopoverTop(pop);
  }
  function openFav(){
    pop.classList.add("show");
    btn.classList.add("on");
    positionUnderFavBtn();
    renderFavouritesList();
    remeasureScroll();
  }
  function closeFav(){ pop.classList.remove("show"); btn.classList.remove("on"); }
  window.closeFavPop=closeFav;
  btn.addEventListener("click",function(e){
    e.stopPropagation();
    if(pop.classList.contains("show")) closeFav(); else openFav();
  });
  document.addEventListener("click",function(e){
    if(pop.classList.contains("show") && !pop.contains(e.target) && e.target!==btn) closeFav();
  });
})();

/* Real bug fixed 2026-08-16 (Tony: "on other windows clicking outside
   closes it, but with these it just clicks a different star"). Every other
   closeable box in this app either sits inside #modalWrap's own opaque
   backdrop (clicking the backdrop closes the modal, see modalWrap's own
   click listener) or has its own outside-click-closes handler (see
   #accessPop just above). #course and #route-itinerary-card had neither --
   they just float directly over the interactive 3D canvas with no backdrop,
   so a click meant to dismiss them fell straight through to the canvas's
   own pointerdown/pointerup handlers and picked whatever star was under the
   cursor instead. Listens on pointerdown in the CAPTURE phase specifically
   so this runs before canvas's own (bubble-phase) pointerdown listener --
   stopping propagation there is what actually prevents that fall-through
   star pick, not just closing the boxes after the fact. Only stops
   propagation when the click landed on the canvas itself; clicking any
   other real button/UI element still closes these boxes too (harmless) but
   is left free to do its own job as normal -- this only ever swallows the
   one interaction it was built for. Closing here only hides the cards --
   it does not clear the plotted course/waypoints/line, so the route stays
   on the map and CLEAR still works exactly as it did for actually
   cancelling a course. */
document.addEventListener("pointerdown",function(e){
  var course=document.getElementById("course");
  var manifest=document.getElementById("route-itinerary-card");
  var courseOpen=course.classList.contains("show");
  var manifestOpen=manifest.classList.contains("show");
  if(!courseOpen&&!manifestOpen) return;
  if(course.contains(e.target)||manifest.contains(e.target)) return;
  /* 2026-08-29: a click inside ANY modal (disclaimer/hyperdrive/edit/report/
     feedback/save-import -- all live inside #modalWrap) is not a "click
     outside the course/manifest" in the sense this listener means -- it's
     the user dismissing or interacting with a completely different overlay.
     Real bug Tony hit: clicking "Got it" on the first-time hyperdrive-range
     notice (which can pop up mid-way through plotting a course) silently
     closed the Warp Manifest card that had just opened underneath it,
     because #hyperOk/#discOk/etc. are outside both course and manifest.
     Route/manifest STATE was never touched by this, only their visibility
     -- CLEAR still worked, the plotted line stayed on the map -- so this
     fix is purely about not hiding cards that shouldn't have been hidden. */
  if(document.getElementById("modalWrap").contains(e.target)) return;
  course.classList.remove("show");
  manifest.classList.remove("show");
  var mBtn=document.getElementById("bToggleManifest");
  if(mBtn){ mBtn.classList.remove("on"); mBtn.innerHTML="&#9662; Manifest"; }
  if(e.target===canvas) e.stopPropagation();
},true);

/* Turns a failed save's raw status/body into a plain-English reason PLUS
   whether a Retry button makes sense. Three real failure shapes exist here:
     - a genuine conflict (someone else saved this same system a moment
       earlier -- GitHub's Contents API rejects the write with a 409 because
       the file changed under us) -- nothing was lost on either side, just
       retry and it re-reads the latest file first;
     - a transient problem reaching GitHub or no network at all -- also
       just a Retry;
     - content-filter rejection or the per-hour submission limit -- retrying
       the exact same payload would only fail again identically, so no
       Retry button for these; the existing Save/Send button already covers
       "edit the flagged text and try again" once the visitor fixes it. */
/* The 6 status icons (real game imagery, sourced same as every other icon
   already in icons-web/) and which animation each uses -- "waiting" states
   (still might succeed) get a calm pulse; "resolved failure" states get a
   left-right drift (the same drone-patrol motion as the Theme Pack's "click
   me to scan" flyer), so the MOTION itself signals "still working, be
   patient" vs "something's actually wrong" independent of the artwork. */
var STATUS_ICONS={
  atlas:   {src:"icons-web/status-atlas.png",     cls:"pulse"},  // normal save, in flight
  sentinel:{src:"icons-web/status-sentinel.png",  cls:"pulse"},  // still in flight, heavy traffic
  grave:   {src:"icons-web/status-grave.png",     cls:"pulse"},  // no connection / server unreachable -- a badge, doesn't fly
  pass3:   {src:"icons-web/status-atlaspass.png", cls:"pulse"},  // someone else saved first (conflict) -- a badge, doesn't fly
  corrupt: {src:"icons-web/status-corrupt.png",   cls:"drift"}   // blocked text AND rate limit -- a drone, flies
  // "ship" (status-ship.png) removed -- Tony felt it didn't look right paired
  // with the drift motion, so both drift-style errors now share Corrupt
  // Sentinel for a consistent look, same as how Grave already covers every
  // pulse-style connection failure rather than having its own icon each.
};
/* The scanning beam lives on the .merr box paired with each icon wrap
   (editIconWrap -> editErr, reportIconWrap -> reportErr, same naming
   convention both ids already share), toggled on only for the "drift" icon
   (Corrupt Sentinel, now shared by both blocked-text and rate-limit errors)
   so the beam and the flying-drone icon always appear and disappear together. */
function pairedErrEl(wrap){ return document.getElementById(wrap.id.replace("IconWrap","Err")); }
function showStatusIcon(wrap,img,key){
  var d=STATUS_ICONS[key];
  var errEl=pairedErrEl(wrap);
  if(!d){ hideStatusIcon(wrap); return; }
  img.src=d.src;
  wrap.style.display=""; // clear any inline "none" so the class below controls display/layout
  wrap.className="iconWrap "+d.cls;
  if(errEl) errEl.classList.toggle("scanning", d.cls==="drift");
}
function hideStatusIcon(wrap){
  wrap.style.display="none"; wrap.className="iconWrap";
  var errEl=pairedErrEl(wrap);
  if(errEl) errEl.classList.remove("scanning");
}
/* Sets the error box's message without wiping out the .errScan beam element
   that lives alongside the text -- errEl.textContent=... would delete it. */
function setErrText(errEl, msg){
  var t=errEl.querySelector(".errTxt");
  if(t) t.textContent=msg; else errEl.textContent=msg;
}
/* Turns a failed save's raw status/body into a plain-English reason, which
   status icon to show, and whether a Retry button makes sense. Three real
   failure shapes exist here:
     - a genuine conflict (someone else saved this same system a moment
       earlier -- GitHub's Contents API rejects the write with a 409 because
       the file changed under us) -- nothing was lost on either side, just
       retry and it re-reads the latest file first;
     - a transient problem reaching GitHub or no network at all -- also
       just a Retry;
     - content-filter rejection or the per-hour submission limit -- retrying
       the exact same payload would only fail again identically, so no
       Retry button for these; the existing Save/Send button already covers
       "edit the flagged text and try again" once the visitor fixes it. */
function describeSaveError(status, body, isReport){
  var err=(body && body.error) || "Could not save";
  var verb=isReport?"report":"edit", saveWord=isReport?"Send report":"Save";
  if(status===429){
    return { message: err, retryable:false, icon:"corrupt" };
  }
  if(status===422){
    var extra=(body && body.details && body.details.length)?"\n"+body.details.join("\n"):"";
    return { message:"This "+verb+" was blocked: "+err+extra+"\n\nFix the flagged text above and click "+saveWord+" again.", retryable:false, icon:"corrupt" };
  }
  if(status===502 && /write failed:\s*409/i.test(err)){
    return { message:"Someone else saved a change to this system at almost the same moment, so this "+verb+" didn't go through. Nothing was lost on their end -- click Retry to save yours now.", retryable:true, icon:"pass3" };
  }
  if(status===502){
    return { message:"Couldn't reach the shared data store just now (GitHub may be briefly unavailable or busy). Your "+verb+" was NOT saved -- click Retry.", retryable:true, icon:"grave" };
  }
  if(status===500){
    return { message:"The shared-edit system isn't fully set up on the server yet. Retrying won't fix this -- flag it to elegra1965.", retryable:false, icon:"grave" };
  }
  return { message: err, retryable:false, icon:"grave" };
}
var lastEditAttempt=null; // {address,payload} of the most recent failed save, so Retry resubmits exactly what failed without re-reading the form
/* Shows the Atlas icon (pulsing) and "Atlas is working on it" line while a
   save/report is in flight, and -- if it's still going after 5s -- swaps to
   the Sentinel icon and a "heavy traffic, please be patient" message. A slow
   GitHub/Netlify response under real load looks identical to a stuck request
   otherwise; this at least tells people it's congestion, not broken. Returns
   a stop() to call once the request settles (success, failure, or network
   error), which cancels the timer either way so a fast request never shows
   the slow-message/icon at all.
   The modal itself scrolls (long form, Save sits at the very bottom), so the
   icon living near the top -- fixed after Tony flagged it was buried below
   the fold -- goes invisible again the moment someone actually scrolls down
   to click Save. scrollIntoView() here brings it into view the instant a
   save starts, regardless of where in the form the click happened, same
   pattern this file already uses to surface error messages. */
function startAtlasWait(txtEl, iconWrap, iconImg){
  txtEl.textContent="Atlas is working on it...";
  showStatusIcon(iconWrap, iconImg, "atlas");
  iconWrap.scrollIntoView({block:"nearest",behavior:"smooth"});
  var slowTimer=setTimeout(function(){
    txtEl.textContent="Atlas is busy helping a lot of travellers right now -- please be patient, this can take a little longer than usual.";
    showStatusIcon(iconWrap, iconImg, "sentinel");
  }, 5000);
  return function stop(){ clearTimeout(slowTimer); };
}
function submitEditPayload(address, galaxy, payload){
  var errEl=document.getElementById("editErr"), retryBtn=document.getElementById("edRetry");
  var spin=document.getElementById("editSpin"), spinTxt=document.getElementById("editSpinTxt"), btn=document.getElementById("edSubmit");
  var iconWrap=document.getElementById("editIconWrap"), iconImg=document.getElementById("editIconImg");
  lastEditAttempt={address:address,galaxy:galaxy,payload:payload};
  retryBtn.style.display="none";
  spin.style.display="flex"; btn.disabled=true;
  var stopWait=startAtlasWait(spinTxt, iconWrap, iconImg);
  fetch(FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"edit",address:address,galaxy:galaxy,payload:payload})
  }).then(function(r){ return r.json().then(function(j){ return {status:r.status,body:j}; }); })
  .then(function(res){
    stopWait(); spin.style.display="none"; btn.disabled=false;
    if(!res.body.ok){
      var d=describeSaveError(res.status,res.body,false);
      showStatusIcon(iconWrap,iconImg,d.icon);
      setErrText(errEl,d.message); errEl.style.display="block"; errEl.scrollIntoView({block:"nearest"});
      retryBtn.style.display=d.retryable?"inline-block":"none";
      return;
    }
    hideStatusIcon(iconWrap);
    rememberKnownTerms(payload);
    closeModal(); toast("System saved -- visible to everyone"); loadOverrides();
  }).catch(function(){
    stopWait(); spin.style.display="none"; btn.disabled=false;
    showStatusIcon(iconWrap,iconImg,"grave");
    setErrText(errEl,"Couldn't reach the server -- check your connection. Your edit was NOT saved.");
    errEl.style.display="block"; errEl.scrollIntoView({block:"nearest"});
    retryBtn.style.display="inline-block";
  });
}
document.getElementById("edRetry").addEventListener("click",function(){
  if(!lastEditAttempt) return;
  submitEditPayload(lastEditAttempt.address, lastEditAttempt.galaxy, lastEditAttempt.payload);
});
document.getElementById("edSubmit").addEventListener("click",function(){
  if(!selected) return;
  // Force any in-progress icombo edit (Biome/Sentinel/Economy/Economy
  // strength/Conflict) to commit its live value NOW -- otherwise a typed
  // (not clicked) value can lose a race against this same click blurring
  // the input. See commitNow()'s comment in buildIconCombo.
  flushAllCombos();
  var err=clientPrecheck();
  var errEl=document.getElementById("editErr"), retryBtn=document.getElementById("edRetry");
  var iconWrap=document.getElementById("editIconWrap"), iconImg=document.getElementById("editIconImg");
  // clientPrecheck() catching this locally means the request never reaches
  // submitEditPayload()/describeSaveError() at all -- without this, the
  // blocked-content icon (Corrupt Sentinel) only ever showed for a SERVER-side
  // rejection, never this much more common instant client-side one, so the
  // error text appeared with no icon above it. Real bug, caught from Tony's
  // own screenshot testing "rope" as a system name.
  if(err){
    setErrText(errEl,err); errEl.style.display="block"; retryBtn.style.display="none";
    showStatusIcon(iconWrap,iconImg,"corrupt");
    errEl.scrollIntoView({block:"nearest"}); return;
  }
  errEl.style.display="none"; retryBtn.style.display="none";
  hideStatusIcon(iconWrap);
  // Spelling safety net (2026-09-02) -- runs on the real editBodies data
  // before anything else touches it, so both the visible form AND the
  // payload built below pick up any auto-correction. Silent for a clean
  // save (the common case); only interrupts with a toast/modal when it
  // actually did something.
  var canonCheck=runCanonSafetyNet();
  if(canonCheck.corrected.length){
    renderBodyEditList();
    toast(canonCheck.corrected.length===1
      ? 'Auto-corrected "'+canonCheck.corrected[0].from+'" to "'+canonCheck.corrected[0].to+'"'
      : "Auto-corrected "+canonCheck.corrected.length+" spelling(s) to match the known list", 3200);
  }
  // Orbits is stored per-row as a stable uid while editing (survives
  // add/remove reordering); resolve every uid to its final SAVED array
  // position right before building the payload, since that's the only
  // reference applyOverride() can use once this comes back from the server.
  var uidToPos={};
  editBodies.forEach(function(b,idx){ uidToPos[b.uid]=idx+1; });
  var edEditorName=document.getElementById("edEditorName").value.trim();
  var edEditorCode=document.getElementById("edEditorCode").value.trim();
  var edEditorCodeVisible=document.getElementById("edEditorCodeVisible").checked;
  saveTravellerId(edEditorName,edEditorCode,edEditorCodeVisible); // remember locally so this doesn't need retyping next time
  /* Merge any "Has base" name(s) into this system's Notes at save time
     (2026-08-21, Tony: "put name of base in notes") -- a base name lives on
     its own body (see the bfBaseName field above) so it always stays
     attached to the right planet/moon even if bodies get reordered, but
     Tony specifically wants it visible in Notes too, same "Base 'X' on Y"
     phrasing the save-file bulk-import already writes there for
     consistency. Appends to whatever the traveller already typed rather
     than replacing it, and skips a line that's already present so
     re-saving the same system twice doesn't duplicate it. */
  var mergedNotes=document.getElementById("edNotes").value.trim();
  editBodies.forEach(function(b,idx){
    var bn=(b.baseName||"").trim();
    if(!b.base||!bn) return;
    var label=(b.name||"").trim()||((b.moon?"Moon":"Planet")+" #"+(idx+1));
    var line='Base "'+bn+'" on '+label;
    if(mergedNotes.indexOf(line)<0) mergedNotes=mergedNotes?(mergedNotes+" | "+line):line;
  });
  var payload={
    name:document.getElementById("edName").value.trim(),
    race:document.getElementById("edRace").value,
    region:document.getElementById("edRegion").value.trim(),
    stars:editStars.map(function(s){ return s.color; }),
    starClass:document.getElementById("edStarClass").value.trim(),
    water:document.getElementById("edWaterSuf").checked,
    dissonant:document.getElementById("edDissonantSuf").checked,
    giant:document.getElementById("edGiant").checked,
    ruins:document.getElementById("edRuins").checked,
    outlaw:document.getElementById("edOutlaw").checked,
    abandoned:document.getElementById("edAbandoned").checked,
    colliding:document.getElementById("edColliding").checked,
    collidingSet:document.getElementById("edColliding").checked
      ? collidingUids.map(function(uid){ return uidToPos[uid]||0; }).filter(function(pos){ return pos>0; })
      : [],
    hasStation:document.getElementById("edStation").checked,
    stationName:document.getElementById("edStation").checked?document.getElementById("edStationName").value.trim():"",
    allianceName:document.getElementById("edStation").checked?document.getElementById("edAllianceName").value.trim():"",
    allianceBadge:document.getElementById("edStation").checked?edAllianceBadgeCurrentValue():"",
    stationPhoto:document.getElementById("edStation").checked?edStationPhotoCurrentValue():"",
    econName:document.getElementById("edEcon").value.trim(),
    sell:document.getElementById("edSell").value.trim(),
    buy:document.getElementById("edBuy").value.trim(),
    econDesc:document.getElementById("edEconStr").value,
    conflict:document.getElementById("edConflict").value.trim(),
    blackHole:document.getElementById("edBH").checked,
    atlas:document.getElementById("edAtlas").checked,
    phantom:document.getElementById("edPhantom").value,
    notes:mergedNotes,
    screenshot:edScreenshotCurrentValue(),
    editorName:edEditorName,
    editorFriendCode:edEditorCode,
    editorFriendCodeVisible:edEditorCodeVisible,
    genVersion:GEN_VERSION,
    bodies:editBodies.map(function(b){
      return {
        name:b.name.trim(), moon:b.moon,
        orbits:(b.moon && b.orbits && uidToPos[b.orbits])?uidToPos[b.orbits]:0,
        biome:b.biome, subtype:(b.subtype||"").trim(), descriptor:(b.descriptor||"").trim(), water:b.water, ring:!b.moon&&!!b.ring,
        resources:b.resources.split(",").map(function(x){ return x.trim(); }).filter(Boolean),
        flora:(b.flora||"").split(",").map(function(x){ return x.trim(); }).filter(Boolean),
        fauna:(b.fauna||"").split(",").map(function(x){ return x.trim(); }).filter(Boolean),
        minerals:(b.minerals||"").split(",").map(function(x){ return x.trim(); }).filter(Boolean),
        salvage:(b.salvage||"").split(",").map(function(x){ return x.trim(); }).filter(Boolean),
        fossils:(b.fossils||"").split(",").map(function(x){ return x.trim(); }).filter(Boolean),
        sentinel:b.sentinel||"None",
        autophage:!!b.autophage,
        reliquary:!!b.reliquary,
        ruins:!!b.ruins,
        base:!!b.base,
        baseName:(b.baseName||"").trim()
      };
    }),
    signals:editSignals.map(function(g){
      return {
        name:(g.name||"").trim(),
        category:(g.category||"").trim(),
        icon:(["mineral","flora","frozen","tech","outpost","creature","hazard","cargo","atlasstation"].indexOf(g.icon)>=0)?g.icon:"mineral",
        signalType:(g.signalType||"").trim(),
        route:(g.route||"").trim(),
        planet:(g.planetUid && uidToPos[g.planetUid])?uidToPos[g.planetUid]:0
      };
    })
  };
  var chosenGalaxy=parseInt(document.getElementById("edGalaxy").value,10);
  if(isNaN(chosenGalaxy)) chosenGalaxy=selected.galaxy;
  if(canonCheck.flagged.length){
    showTermConfirmModal(canonCheck.flagged, function(){
      submitEditPayload(selected.address, chosenGalaxy, payload);
    });
    return;
  }
  submitEditPayload(selected.address, chosenGalaxy, payload);
});
/* ============ Save-file import (2026-08-18) ============
   Everything here runs client-side -- the raw .hg file is never uploaded.
   nms-core/save-import/* does the actual decompress+deobfuscate+extract
   work (see that folder's own header comments); this block is just the
   consent UI + wiring: pick a file or decline, see what was found, choose
   to auto-fill "Your name" and/or bulk-import real base names into the
   shared map via the bulk-import Function action (a separate, much
   stricter rate limit than a normal single-system edit -- see
   system-edit.mjs's handleBulkImport). */
var siLastSummary=null;
function siRemeasureScroll(){
  var m=document.getElementById("saveImportModal");
  m.classList.remove("scroll");
  if(m.scrollHeight>m.clientHeight+1) m.classList.add("scroll");
}
function siReset(){
  siLastSummary=null;
  document.getElementById("siStep1").style.display="block";
  document.getElementById("siProgress").style.display="none";
  document.getElementById("siErr").style.display="none";
  document.getElementById("siResults").style.display="none";
  document.getElementById("siRetry").style.display="none";
  document.getElementById("siFileInput").value="";
  siRemeasureScroll();
}
function openSaveImportModal(){
  closeAllModalBoxes();
  siReset();
  document.getElementById("saveImportModal").style.display="";
  document.getElementById("modalWrap").classList.add("show");
  siRemeasureScroll();
}
document.getElementById("edOpenSaveImport").addEventListener("click",openSaveImportModal);
document.getElementById("siWhereDetails").addEventListener("toggle",siRemeasureScroll);
document.getElementById("siClose").addEventListener("click",closeModal);
document.getElementById("siManual").addEventListener("click",closeModal);
document.getElementById("siChooseFile").addEventListener("click",function(){
  document.getElementById("siFileInput").click();
});
document.getElementById("siRetry").addEventListener("click",siReset);
function siShowError(msg){
  var errEl=document.getElementById("siErr");
  setErrText(errEl,msg);
  errEl.style.display="block";
  document.getElementById("siRetry").style.display="inline-block";
  siRemeasureScroll();
}
document.getElementById("siFileInput").addEventListener("change",function(e){
  var f=e.target.files && e.target.files[0];
  if(!f) return;
  document.getElementById("siStep1").style.display="none";
  document.getElementById("siErr").style.display="none";
  document.getElementById("siResults").style.display="none";
  document.getElementById("siRetry").style.display="none";
  var progress=document.getElementById("siProgress"), spinTxt=document.getElementById("siSpinTxt");
  var iconWrap=document.getElementById("siIconWrap"), iconImg=document.getElementById("siIconImg");
  progress.style.display="block";
  siRemeasureScroll();
  var stopWait=startAtlasWait(spinTxt, iconWrap, iconImg);
  var reader=new FileReader();
  reader.onload=function(){
    Promise.all([
      import('./nms-core/save-import/parse-save.js'),
      import('./nms-core/save-import/extract-summary.js')
    ]).then(function(mods){
      var parseMod=mods[0], summaryMod=mods[1];
      return parseMod.loadSaveMapping('./nms-core/save-import').then(function(mapping){
        var bytes=new Uint8Array(reader.result);
        return parseMod.parseSaveFile(bytes, mapping);
      }).then(function(save){
        return summaryMod.extractSaveSummary(save);
      });
    }).then(function(summary){
      stopWait(); progress.style.display="none";
      siLastSummary=summary;
      siShowResults(summary);
    }).catch(function(err){
      stopWait(); progress.style.display="none";
      siShowError((err && err.message) ? err.message : "Couldn't read that file -- make sure it's a real No Man's Sky save.hg file.");
    });
  };
  reader.onerror=function(){
    stopWait(); progress.style.display="none";
    siShowError("Couldn't read that file from your device.");
  };
  reader.readAsArrayBuffer(f);
});
function siShowResults(summary){
  var results=document.getElementById("siResults");
  results.style.display="block";
  var sumEl=document.getElementById("siSummary");
  var planets=summary.planets||[], systemNames=summary.systemNames||[];
  var parts=[];
  if(summary.saveName) parts.push('Save slot: "'+summary.saveName+'"');
  parts.push(summary.systemCount+" system"+(summary.systemCount===1?"":"s")+" with a real base name found");
  if(planets.length) parts.push(planets.length+" real planet name"+(planets.length===1?"":"s"));
  if(systemNames.length) parts.push(systemNames.length+" real system name"+(systemNames.length===1?"":"s"));
  var nothingFound = !summary.systemCount && !planets.length && !systemNames.length;
  sumEl.textContent=parts.join(" \u00b7 ")+(nothingFound?" -- nothing to auto-fill besides your name below, if found.":"");
  var nameFld=document.getElementById("siNameFld");
  if(summary.username){
    nameFld.style.display="block";
    document.getElementById("siNameVal").textContent=summary.username;
  } else {
    nameFld.style.display="none";
  }
  var basesFld=document.getElementById("siBasesFld");
  var listEl=document.getElementById("siBasesList");
  if(summary.bases && summary.bases.length){
    basesFld.style.display="block";
    listEl.innerHTML="";
    summary.bases.forEach(function(b){
      var row=document.createElement("div");
      row.textContent=b.names.join(", ")+"  ("+b.address+")";
      listEl.appendChild(row);
    });
  } else {
    basesFld.style.display="none";
  }
  var sysNameFld=document.getElementById("siSystemNamesFld");
  var sysNameList=document.getElementById("siSystemNamesList");
  if(systemNames.length){
    sysNameFld.style.display="block";
    sysNameList.innerHTML="";
    systemNames.forEach(function(s){
      var row=document.createElement("div");
      row.textContent='"'+s.name+'"  ('+s.address+')';
      sysNameList.appendChild(row);
    });
  } else {
    sysNameFld.style.display="none";
  }
  var planetsFld=document.getElementById("siPlanetsFld");
  var planetsList=document.getElementById("siPlanetsList");
  if(planets.length){
    planetsFld.style.display="block";
    planetsList.innerHTML="";
    planets.forEach(function(p){
      var row=document.createElement("div");
      row.textContent='"'+p.name+'"  (planet #'+p.planetIndex+' in system '+p.systemAddress+')';
      planetsList.appendChild(row);
    });
  } else {
    planetsFld.style.display="none";
  }
  var totalItems = summary.bases.length + planets.length + systemNames.length;
  var importFld=document.getElementById("siImportFld");
  if(totalItems){
    importFld.style.display="block";
    document.getElementById("siImportCount").textContent=totalItems;
    document.getElementById("siImportPlural").textContent=totalItems===1?"":"s";
  } else {
    importFld.style.display="none";
  }
  siRemeasureScroll();
}
document.getElementById("siUseName").addEventListener("click",function(){
  if(!siLastSummary || !siLastSummary.username) return;
  document.getElementById("edEditorName").value=siLastSummary.username;
  // Persist immediately -- editModal is currently hidden (not destroyed)
  // behind this one, and re-opening Edit system later calls openEditModal(),
  // which re-fills "Your name" from loadTravellerId(), overwriting whatever
  // is just sitting in the field's DOM value right now. Without this, "Use
  // this name" would appear to work but silently not survive a modal
  // round-trip.
  saveTravellerId(siLastSummary.username, document.getElementById("edEditorCode").value.trim(), document.getElementById("edEditorCodeVisible").checked);
  toast("Filled in your name from your save");
});
// Real total body count for a system address, via the same NMSCore.planetSeeds()
// call the map itself already uses to size a system's body list (line ~2139) --
// needed so the server can build a correctly-sized bodies array instead of
// guessing or truncating. Falls back to 0 (server then just uses whatever the
// highest referenced planet index requires) if nms-core isn't loaded/errors.
function siBodyCountFor(address){
  if(!window.NMSCore) return 0;
  try{
    var pc=BigInt("0x"+address);
    var ps=window.NMSCore.planetSeeds(pc, GALAXY);
    return Math.min(6, Math.max(1, ps.planet_count+ps.moon_count));
  }catch(e){ return 0; }
}
document.getElementById("siImportBases").addEventListener("click",function(){
  if(!siLastSummary) return;
  var bases=siLastSummary.bases||[], planets=siLastSummary.planets||[], systemNames=siLastSummary.systemNames||[];
  if(!bases.length && !planets.length && !systemNames.length) return;
  var btn=this;
  var editorName=document.getElementById("edEditorName").value.trim() || siLastSummary.username || "";
  var editorCode=document.getElementById("edEditorCode").value.trim() || "";
  var editorCodeVisible=document.getElementById("edEditorCodeVisible").checked;

  // Combine bases + planet names + system names into one entries array keyed
  // by system address -- MAX_BULK_IMPORTS_PER_IP_PER_DAY is 1, so everything
  // has to go out in a single request or the second call would just be
  // rejected as "one import per day already used."
  //
  // Real per-galaxy addressing (2026-08-22): every entry needs
  // a real galaxy now, not just an address. extractSaveSummary() already
  // resolved each base's real galaxy where possible (b.galaxy, via
  // TeleportEndpoints name-matching -- see extract-summary.js's header
  // comment); a base with no matching teleport point, or a bare planet/
  // system-name discovery with no base at that address at all, has no
  // ground truth to resolve from, so it falls back to the save's own
  // CURRENT galaxy (siLastSummary.currentGalaxy) -- a plausible guess, not
  // a verified fact, disclosed to the traveller below rather than silently
  // assumed. Falling back further to the client's on-screen GALAXY only
  // covers the edge case of a save with no recoverable current-galaxy field
  // at all.
  var byAddr={};
  function entryFor(addr){
    if(!byAddr[addr]) byAddr[addr]={address:addr, names:[], planetNames:[], systemName:"", bodyCount:0, galaxy:null};
    return byAddr[addr];
  }
  bases.forEach(function(b){
    var e=entryFor(b.address);
    e.names=b.names;
    if(b.galaxy!=null) e.galaxy=b.galaxy;
  });
  planets.forEach(function(p){
    var e=entryFor(p.systemAddress);
    e.planetNames.push({index:p.planetIndex, name:p.name});
    e.bodyCount=siBodyCountFor(p.systemAddress);
  });
  systemNames.forEach(function(s){
    var e=entryFor(s.address);
    e.systemName=s.name;
    if(!e.bodyCount) e.bodyCount=siBodyCountFor(s.address);
  });
  var siFallbackGalaxy=(siLastSummary&&typeof siLastSummary.currentGalaxy==="number")?siLastSummary.currentGalaxy:GALAXY;
  var siGuessedCount=0;
  Object.keys(byAddr).forEach(function(k){
    if(byAddr[k].galaxy==null){ byAddr[k].galaxy=siFallbackGalaxy; siGuessedCount++; }
  });
  var entries=Object.keys(byAddr).map(function(k){ return byAddr[k]; });

  btn.disabled=true;
  document.getElementById("siErr").style.display="none";
  var progress=document.getElementById("siProgress"), spinTxt=document.getElementById("siSpinTxt");
  var iconWrap=document.getElementById("siIconWrap"), iconImg=document.getElementById("siIconImg");
  progress.style.display="block";
  siRemeasureScroll();
  var stopWait=startAtlasWait(spinTxt, iconWrap, iconImg);
  fetch(FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"bulk-import", payload:{entries:entries, editorName:editorName, editorFriendCode:editorCode, editorFriendCodeVisible:editorCodeVisible, genVersion:GEN_VERSION}})
  }).then(function(r){ return r.json().then(function(j){ return {status:r.status, body:j}; }); })
  .then(function(res){
    stopWait(); progress.style.display="none"; btn.disabled=false;
    if(!res.body.ok){
      var d=describeSaveError(res.status,res.body,false);
      siShowError(d.message);
      return;
    }
    if(editorName) saveTravellerId(editorName, editorCode, editorCodeVisible);
    var msg="Imported "+res.body.added+" new system"+(res.body.added===1?"":"s")+", merged into "+res.body.merged+" existing";
    var extra=[];
    if(res.body.planetsSet) extra.push(res.body.planetsSet+" planet name"+(res.body.planetsSet===1?"":"s"));
    if(res.body.systemNamesSet) extra.push(res.body.systemNamesSet+" system name"+(res.body.systemNamesSet===1?"":"s"));
    if(extra.length) msg+=" (incl. "+extra.join(", ")+")";
    if(siGuessedCount) msg+=" -- "+siGuessedCount+" system"+(siGuessedCount===1?"":"s")+" had no confirmed teleporter match, so its galaxy is a best guess (your save's current galaxy)";
    toast(msg+" -- visible to everyone", siGuessedCount?5200:3200);
    loadOverrides();
    closeModal();
  }).catch(function(){
    stopWait(); progress.style.display="none"; btn.disabled=false;
    siShowError("Couldn't reach the server -- check your connection and try again.");
  });
});
var lastReportAttempt=null; // {address,reason} of the most recent failed report, so Retry resubmits without retyping
function submitReportPayload(address, galaxy, reason){
  var errEl=document.getElementById("reportErr"), retryBtn=document.getElementById("repRetry");
  var spin=document.getElementById("reportSpin"), spinTxt=document.getElementById("reportSpinTxt"), btn=document.getElementById("repSubmit");
  var iconWrap=document.getElementById("reportIconWrap"), iconImg=document.getElementById("reportIconImg");
  lastReportAttempt={address:address,galaxy:galaxy,reason:reason};
  retryBtn.style.display="none";
  spin.style.display="flex"; btn.disabled=true;
  var stopWait=startAtlasWait(spinTxt, iconWrap, iconImg);
  fetch(FUNC_URL,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"report",address:address,galaxy:galaxy,payload:{reason:reason}})
  }).then(function(r){ return r.json().then(function(j){ return {status:r.status,body:j}; }); })
  .then(function(res){
    stopWait(); spin.style.display="none"; btn.disabled=false;
    if(!res.body.ok){
      var d=describeSaveError(res.status,res.body,true);
      showStatusIcon(iconWrap,iconImg,d.icon);
      setErrText(errEl,d.message); errEl.style.display="block"; errEl.scrollIntoView({block:"nearest"});
      retryBtn.style.display=d.retryable?"inline-block":"none";
      return;
    }
    hideStatusIcon(iconWrap);
    closeModal(); toast("Report sent -- thanks");
  }).catch(function(){
    stopWait(); spin.style.display="none"; btn.disabled=false;
    showStatusIcon(iconWrap,iconImg,"grave");
    setErrText(errEl,"Couldn't reach the server -- check your connection. Your report was NOT sent.");
    errEl.style.display="block"; errEl.scrollIntoView({block:"nearest"});
    retryBtn.style.display="inline-block";
  });
}
var lastFlagAttempt=null; // {address,fields,note} of the most recent failed flag submission, so Retry resubmits without re-checking boxes
function submitFlagPayload(address, galaxy, fields, note){
  var errEl=document.getElementById("reportErr"), retryBtn=document.getElementById("repRetry");
  var spin=document.getElementById("reportSpin"), spinTxt=document.getElementById("reportSpinTxt"), btn=document.getElementById("repSubmit");
  var iconWrap=document.getElementById("reportIconWrap"), iconImg=document.getElementById("reportIconImg");
  lastFlagAttempt={address:address,galaxy:galaxy,fields:fields,note:note};
  retryBtn.style.display="none";
  spin.style.display="flex"; btn.disabled=true;
  var stopWait=startAtlasWait(spinTxt, iconWrap, iconImg);
  fetch(FLAG_URL,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({address:address,galaxy:galaxy,fields:fields,note:note})
  }).then(function(r){ return r.json().then(function(j){ return {status:r.status,body:j}; }); })
  .then(function(res){
    stopWait(); spin.style.display="none"; btn.disabled=false;
    if(!res.body.ok){
      var d=describeSaveError(res.status,res.body,true);
      showStatusIcon(iconWrap,iconImg,d.icon);
      setErrText(errEl,d.message); errEl.style.display="block"; errEl.scrollIntoView({block:"nearest"});
      retryBtn.style.display=d.retryable?"inline-block":"none";
      return;
    }
    hideStatusIcon(iconWrap);
    closeModal();
    toast(res.body.issueCreated?"Flagged -- elegra1965 has been notified":"Flagged -- visible as amber to everyone now");
    loadOverrides(); // so the amber colour shows up immediately without a manual refresh
  }).catch(function(){
    stopWait(); spin.style.display="none"; btn.disabled=false;
    showStatusIcon(iconWrap,iconImg,"grave");
    setErrText(errEl,"Couldn't reach the server -- check your connection. Nothing was flagged.");
    errEl.style.display="block"; errEl.scrollIntoView({block:"nearest"});
    retryBtn.style.display="inline-block";
  });
}
document.getElementById("repRetry").addEventListener("click",function(){
  if(document.getElementById("repModeFlag").classList.contains("on")){
    if(lastFlagAttempt) submitFlagPayload(lastFlagAttempt.address, lastFlagAttempt.galaxy, lastFlagAttempt.fields, lastFlagAttempt.note);
  } else if(lastReportAttempt){
    submitReportPayload(lastReportAttempt.address, lastReportAttempt.galaxy, lastReportAttempt.reason);
  }
});
document.getElementById("repSubmit").addEventListener("click",function(){
  if(!selected) return;
  var errEl=document.getElementById("reportErr"), retryBtn=document.getElementById("repRetry");
  if(document.getElementById("repModeFlag").classList.contains("on")){
    var checked=Array.prototype.slice.call(document.querySelectorAll("#flagFieldList input:checked")).map(function(c){ return c.value; });
    if(!checked.length){ setErrText(errEl,"Pick at least one field to flag."); errEl.style.display="block"; retryBtn.style.display="none"; errEl.classList.remove("scanning"); errEl.scrollIntoView({block:"nearest"}); return; }
    errEl.style.display="none"; retryBtn.style.display="none";
    submitFlagPayload(selected.address, selected.galaxy, checked, document.getElementById("flagNote").value.trim());
    return;
  }
  var reason=document.getElementById("repReason").value.trim();
  if(!reason){ setErrText(errEl,"Please describe what's wrong."); errEl.style.display="block"; retryBtn.style.display="none"; errEl.classList.remove("scanning"); errEl.scrollIntoView({block:"nearest"}); return; }
  errEl.style.display="none"; retryBtn.style.display="none";
  submitReportPayload(selected.address, selected.galaxy, reason);
});

/* ============ general site feedback (2026-08-16) ============
   Not tied to any address, unlike Report above -- so it doesn't need
   `selected` at all. Reuses the exact same describeSaveError/startAtlasWait/
   showStatusIcon/setErrText machinery as edit/report/flag; "feedbackIconWrap"
   -> "feedbackErr" already matches pairedErrEl()'s naming convention with no
   extra wiring needed. */
function openFeedbackModal(){
  closeAllModalBoxes();
  document.getElementById("fbCategory").value="Bug/glitch";
  document.getElementById("fbMessage").value="";
  document.getElementById("fbRepro").value="";
  // Best-effort device/browser prefill -- still a plain editable text input,
  // not read-only, since a visitor might want to add/replace this themselves.
  try{ document.getElementById("fbDevice").value=navigator.userAgent.slice(0,100); }
  catch(e){ /* navigator unavailable for some reason -- leave it blank, not required */ }
  document.getElementById("fbContact").value="";
  document.getElementById("feedbackErr").style.display="none";
  document.getElementById("feedbackErr").classList.remove("scanning");
  document.getElementById("fbRetry").style.display="none";
  hideStatusIcon(document.getElementById("feedbackIconWrap"));
  document.getElementById("fbSubmit").reset();
  lastFeedbackAttempt=null;
  var fm=document.getElementById("feedbackModal");
  document.getElementById("modalWrap").classList.add("show");
  fm.style.display="";
  fm.classList.remove("scroll");
  /* Same measure-don't-guess fix as openHyperNotice() -- only opt into a
     real scrollbar once actual overflow is confirmed after layout. */
  if(fm.scrollHeight>fm.clientHeight+1) fm.classList.add("scroll");
}
document.getElementById("discFeedback").addEventListener("click",openFeedbackModal);
document.getElementById("fbCancel").addEventListener("click",closeModal);
var lastFeedbackAttempt=null; // {category,message,repro,device,contact} of the most recent failed send, so Retry resubmits without retyping
function submitFeedbackPayload(payload){
  var errEl=document.getElementById("feedbackErr"), retryBtn=document.getElementById("fbRetry");
  var spin=document.getElementById("feedbackSpin"), spinTxt=document.getElementById("feedbackSpinTxt"), btn=document.getElementById("fbSubmit");
  var iconWrap=document.getElementById("feedbackIconWrap"), iconImg=document.getElementById("feedbackIconImg");
  lastFeedbackAttempt=payload;
  retryBtn.style.display="none";
  spin.style.display="flex"; btn.disabled=true;
  btn.playSending();
  var sendStartedAt=Date.now(); // send-button.js's own playSending() holds at "Feedback sent"
    // for exactly SEND_ANIM_MS internally before it's fully settled -- on success below
    // we wait out whatever's left of that window (rather than closing the instant the
    // network responds, which on a fast connection was cutting the ship-flies-off
    // animation short) plus SEND_HOLD_MS so there's always a moment to actually read
    // "Feedback sent" before the modal closes, regardless of how fast the request was.
  var SEND_ANIM_MS=4000, SEND_HOLD_MS=700, RETURN_ANIM_MS=1100;
    // RETURN_ANIM_MS covers playReturn()'s own warp-in (a 140ms delay then a
    // .38s flash-and-fade -- ~520ms total) plus a hold on top, same idea as
    // SEND_HOLD_MS above: the warp-in itself is a quick flash by design, so
    // without an explicit hold the modal closed the instant it finished and
    // it read as a blink-and-you-miss-it flicker rather than something seen.
  var stopWait=startAtlasWait(spinTxt, iconWrap, iconImg);
  fetch(FEEDBACK_URL,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  }).then(function(r){ return r.json().then(function(j){ return {status:r.status,body:j}; }); })
  .then(function(res){
    stopWait(); spin.style.display="none"; btn.disabled=false;
    if(!res.body.ok){
      var d=describeSaveError(res.status,res.body,true);
      showStatusIcon(iconWrap,iconImg,d.icon);
      setErrText(errEl,d.message); errEl.style.display="block"; errEl.scrollIntoView({block:"nearest"});
      retryBtn.style.display=d.retryable?"inline-block":"none";
      btn.playReturn();
      return;
    }
    hideStatusIcon(iconWrap);
    var elapsed=Date.now()-sendStartedAt;
    var wait=Math.max(0,SEND_ANIM_MS-elapsed)+SEND_HOLD_MS;
    setTimeout(function(){
      btn.playReturn();
      setTimeout(function(){
        closeModal();
        toast(res.body.issueUrl?"Feedback sent -- thank you":"Feedback sent -- thanks");
      },RETURN_ANIM_MS);
    },wait);
  }).catch(function(){
    stopWait(); spin.style.display="none"; btn.disabled=false;
    showStatusIcon(iconWrap,iconImg,"grave");
    setErrText(errEl,"Couldn't reach the server -- check your connection. Your feedback was NOT sent.");
    errEl.style.display="block"; errEl.scrollIntoView({block:"nearest"});
    retryBtn.style.display="inline-block";
    btn.playReturn();
  });
}
document.getElementById("fbRetry").addEventListener("click",function(){
  if(lastFeedbackAttempt) submitFeedbackPayload(lastFeedbackAttempt);
});
document.getElementById("fbSubmit").addEventListener("click",function(){
  var errEl=document.getElementById("feedbackErr"), retryBtn=document.getElementById("fbRetry");
  var message=document.getElementById("fbMessage").value.trim();
  if(!message){ setErrText(errEl,"Please describe what happened or what you'd like."); errEl.style.display="block"; retryBtn.style.display="none"; errEl.classList.remove("scanning"); errEl.scrollIntoView({block:"nearest"}); return; }
  errEl.style.display="none"; retryBtn.style.display="none";
  submitFeedbackPayload({
    category: document.getElementById("fbCategory").value,
    message: message,
    repro: document.getElementById("fbRepro").value.trim(),
    device: document.getElementById("fbDevice").value.trim(),
    contact: document.getElementById("fbContact").value.trim()
  });
});

/* ============ install as app ============ */
var deferredInstallPrompt=null;
var installBtn=document.getElementById("bInstall");
function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true;
}
if(!isStandalone()) installBtn.style.display="";
window.addEventListener("beforeinstallprompt",function(e){
  e.preventDefault();
  deferredInstallPrompt=e;
  installBtn.style.display="";
});
window.addEventListener("appinstalled",function(){
  installBtn.style.display="none";
  deferredInstallPrompt=null;
  toast("Installed");
});
installBtn.addEventListener("click",function(){
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(function(){ deferredInstallPrompt=null; });
    return;
  }
  var isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  toast(isiOS?"Share button -> Add to Home Screen":"Use your browser menu's Install app / Add to Home Screen option");
});
if("serviceWorker" in navigator){
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("sw.js").catch(function(err){
      console.warn("SW registration failed",err);
    });
  });
}

/* ============ loop ============ */
var _lastW=0, _lastH=0;
function resize(){
  var w=window.innerWidth,h=window.innerHeight;
  _lastW=w; _lastH=h;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  /* true (not false) here is the actual fix: it makes three.js set canvas.style.width/height
     to real CSS pixels (w,h). With false, the canvas is a replaced element with no explicit
     CSS size, so the browser displays it at its raw drawing-buffer attribute size instead --
     w*devicePixelRatio, h*devicePixelRatio -- which is only "correct" at devicePixelRatio 1.
     At any OS display scaling above 100% (e.g. Windows 125%) the canvas renders that many
     percent too large, silently misaligned against every label/camera calculation that
     (correctly) uses plain window.innerWidth/innerHeight. */
  renderer.setSize(w,h,true);
  camera.aspect=w/h; camera.updateProjectionMatrix();
  syncTopOffset();
  positionAnnivBadge();
  positionSysBanner();
  _lastOccludeW=-1; /* force syncPanelOffset() to recompute against the new size next frame */
}
/* The mobile layout (leftcol/keys/stats) positions itself below the top
   toolbar, but the toolbar's real height is NOT a fixed number -- it wraps
   onto more rows the narrower the screen is (confirmed on Tony's S26: the
   stats box was hardcoded to sit 50px from the top, but the wrapped toolbar
   there is taller than that, so stats rendered on top of the Glyphs button).
   Measuring the toolbar's actual rendered height and exposing it as a CSS
   variable means everything below it stays correctly positioned on any
   screen width, instead of guessing a pixel number that only happens to
   work on whatever screen it was last tested on. */
function syncTopOffset(){
  var top=document.getElementById("top");
  if(!top) return;
  topBarH=top.offsetHeight;
  document.documentElement.style.setProperty("--top-h",topBarH+"px");
}
/* Positions the 10th-anniversary badge directly under #bAccess (the gear/
   accessibility button), matching its real rendered rect rather than a
   guessed fixed corner -- same reasoning as positionUnderButton() further
   down: #bAccess's own x-position isn't fixed (the toolbar is a wrapping
   flex row), so only measuring its live getBoundingClientRect() keeps this
   correct on every screen width and after every toolbar re-wrap. Called
   from resize() below so it re-syncs whenever the toolbar layout could
   have changed -- never from anything mode-related, so it never moves or
   hides when switching Galaxy/Local/System. */
function positionSysBanner(){
  var topEl=document.getElementById("top"), el=document.getElementById("sysBanner");
  if(!topEl||!el||el.style.display==="none") return;
  var r=topEl.getBoundingClientRect();
  if(r.width===0 && r.height===0) return; /* not laid out yet */
  el.style.top=Math.round(r.bottom+10)+"px";
}
function positionAnnivBadge(){
  var hud=document.getElementById("galHud"), el=document.getElementById("annivBadge");
  if(!hud||!el) return;
  var r=hud.getBoundingClientRect();
  if(r.width===0 && r.height===0) return; /* not laid out yet */
  var h=el.offsetHeight||30, gap=10;
  el.style.left=Math.round(r.right+gap)+"px";
  el.style.top=Math.round(r.top+(r.height-h)/2)+"px";
}
/* The camera frames the FULL window width, but the right-docked info panel
   (desktop, and mobile landscape) visually sits on top of ~280-300px of that
   canvas. Anything whose orbit happens to project into that strip -- a planet,
   a moon, a star -- renders perfectly correctly and is just permanently hidden
   behind the panel. Confirmed live: a 6th planet in a real system never showed
   up no matter how far the camera zoomed out, because its screen position
   landed exactly under the panel every time. Fix: shift the camera's frustum
   left by the occluded width via setViewOffset, so the visible (non-panel)
   area is what actually gets centred. Reading the panel's live bounding rect
   instead of duplicating its CSS breakpoints means this keeps working if the
   panel's own layout changes later. The mobile-portrait bottom dock spans the
   full width instead of the right side, so it's correctly excluded (its rect
   starts near the left edge, not past the window's midpoint). */
var _lastOccludeW=-1;
function syncPanelOffset(){
  var panelEl=document.getElementById("panel");
  var w=window.innerWidth,h=window.innerHeight;
  var occludeW=0;
  if(panelEl && panelEl.classList.contains("show")){
    var r=panelEl.getBoundingClientRect();
    if(r.width>0 && r.left>w*0.5) occludeW=Math.round(w-r.left+20);
  }
  /* This compensation was tuned against desktop's panel, which covers roughly
     15% of a typical window. On a narrow mobile-landscape screen the panel can
     cover well over a third of the width -- checked the actual frustum maths
     this produces (setViewOffset with a wider virtual sensor, cropped from its
     left edge) and at that ratio it pushes the WHOLE system view, including the
     star you're looking at, toward/behind the panel instead of just nudging an
     occluded edge-case body into frame -- confirmed as the cause of Tony's
     "planets are hidden" report in landscape. Past this ratio the correction
     does more harm than good, so disable it rather than let it get worse. */
  if(occludeW>w*0.22) occludeW=0;
  if(occludeW===_lastOccludeW) return;
  _lastOccludeW=occludeW;
  if(occludeW>0) camera.setViewOffset(w+occludeW,h,occludeW,0,w,h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
/* On mobile portrait, #filt (left-docked, grows downward) and #panel (also
   bottom-docked there, full width) can end up sharing the same lower slice of
   the screen once a system is selected -- #panel comes later in the DOM so it
   paints on top, silently covering (and eating clicks on) Reset/Export/Import
   underneath (confirmed by Tony: "buttons get hidden behind the planet index").
   The static CSS max-height on #filt has no way to know #panel exists, so this
   measures both boxes' live rects each frame (same technique syncPanelOffset
   already uses for the camera) and clamps #filt's height to stop just above
   wherever #panel actually starts -- on desktop/landscape #panel docks to the
   right and never shares horizontal space with the left-docked #filt, so this
   is a no-op there. */
var _lastFiltCap=null;
function syncFiltBoundary(){
  var filt=document.getElementById("filt"), panel=document.getElementById("panel");
  if(!filt||!panel) return;
  var cap=null;
  if(panel.classList.contains("show")){
    var fr=filt.getBoundingClientRect(), pr=panel.getBoundingClientRect();
    if(pr.width>0 && pr.left<fr.right && pr.top<window.innerHeight){
      var avail=Math.round(pr.top-fr.top-10);
      if(avail>80) cap=avail;
    }
  }
  if(cap===_lastFiltCap) return;
  _lastFiltCap=cap;
  filt.style.maxHeight=cap?cap+"px":"";
}
window.addEventListener("resize",resize);
/* The browser's own "resize" event doesn't reliably fire for every case that changes
   window.innerWidth/innerHeight (docking DevTools is a confirmed one). When it's missed,
   the canvas keeps rendering at its old size/aspect while every other calculation (label
   projection, camera aspect math) correctly uses the new window size -- so labels end up
   nowhere near their planets even though their own math is completely correct. Checking
   every frame instead of trusting the event means it can never go stale. */
function syncSizeIfChanged(){
  if(window.innerWidth!==_lastW||window.innerHeight!==_lastH) resize();
}
function updateTelemetry(){
  var p=camera.position;
  document.getElementById("tX").textContent=p.x.toFixed(2);
  document.getElementById("tY").textContent=p.y.toFixed(2);
  document.getElementById("tZ").textContent=p.z.toFixed(2);
  var vx,vy,vz;
  if(mode==="galaxy"){
    vx=Math.round(p.x/GAL_R*2048); vy=Math.round(p.y/GAL_H*128); vz=Math.round(p.z/GAL_R*2048);
  } else {
    vx=focus.x+Math.round(p.x/VOX_U); vy=focus.y+Math.round(p.y/VOX_U); vz=focus.z+Math.round(p.z/VOX_U);
  }
  document.getElementById("tV").textContent=
    hex(toRaw(vy,SIZE_Y)&0xFF,2)+":"+hex(toRaw(vz,SIZE_XZ)&0xFFF,3)+":"+hex(toRaw(vx,SIZE_XZ)&0xFFF,3);
  document.getElementById("tCore").textContent="CAM "+commas(coreLY(vx,vy,vz))+" LY FROM CENTRE";
  document.getElementById("galHudName").textContent="Galactic Core ("+GALAXIES[GALAXY]+")";
  /* This HUD reads as "how far is [whatever I'm looking at] from the galaxy
     centre" -- it must NOT drift as you orbit-rotate the camera around a
     selected star, since rotating is a pure view transform and doesn't move
     the star at all. Bug reported 2026-08-09 (Galactic-Map-Session-Notes.md):
     this always read off the live camera position (vx,vy,vz above), which
     visibly shifts as the camera orbits around any target that isn't exactly
     the true origin -- not floating-point drift, the camera genuinely moves.
     Fixed by preferring a real anchor's own fixed voxel-derived coreLY
     (selected star, else the system you're focused/jumped to) -- both
     already computed once at generation time straight from integer voxel
     coordinates, so they can't be affected by camera movement at all. Falls
     back to the live camera-derived reading only when nothing is selected/
     focused, preserving the original "where am I roaming" behaviour for that
     case. tCore above is left alone -- it's explicitly labelled "CAM", so
     it's honestly describing camera position, not misrepresenting a star. */
  var _hudAnchor=selected||focusSystem;
  /* Defensive fallback added 2026-08-27 alongside the mergeWaypointsIntoSlice()
     fix above: this used to trust _hudAnchor.coreLY unconditionally, which is
     exactly what crashed the render loop when a lightweight (no-coreLY)
     manifest placeholder ended up `selected` -- falls back to the live
     camera-derived reading instead of throwing if that ever happens again,
     from here or anywhere else, rather than taking the whole map down. */
  document.getElementById("galHudDist").textContent=commas((_hudAnchor&&_hudAnchor.coreLY!==undefined)?_hudAnchor.coreLY:coreLY(vx,vy,vz))+" LY";
}
var frames=0, fpsT=performance.now(), lastT=fpsT, loopDead=false, _totalT=0;
/* Galaxy rotation speed, shared by the real 3D galaxy (galaxyGroup.rotation.y)
   and the mini HUD icon (galIconRot) so they can never drift out of sync again --
   a real galaxy's rotation period is ~200-250 MILLION years (Milky Way), so
   there's no "accurate" speed to use for a live UI; this is a stylised choice
   tuned for ~20s per full turn, fast enough to actually read as spinning
   rather than the near-static 0.0003 rad/frame (~350s/turn) it shipped with. */
var GAL_ROT_SPD=0.0052;
/* mini galaxy icon's own rotation angle -- advanced a little each frame in
   animate() below, independent of the 3D scene's galaxyGroup.rotation.y */
var galIconRot=0, galIconFrame=0;
function animate(){
  requestAnimationFrame(animate);
  if(loopDead) return;
  try{
    syncSizeIfChanged();
    syncPanelOffset();
    syncFiltBoundary();
    var now=performance.now();
    var dt=Math.min(0.05,(now-lastT)/1000); lastT=now;
    frames++;
    if(now-fpsT>500){
      document.getElementById("fps").textContent=Math.round(frames*1000/(now-fpsT));
      frames=0; fpsT=now;
    }
    if(ctrl==="fly") flyStep(dt);
    if(mode==="galaxy") galaxyGroup.rotation.y+=GAL_ROT_SPD*((galaxyHovered&&atlasOn)?0.2:1);
    /* Tony confirmed live: the icon spun the opposite way to the real 3D
       galaxy, and at a different speed. Fixed by matching both exactly --
       same per-frame magnitude as galaxyGroup.rotation.y above (0.0003,
       advanced every frame regardless of mode so the icon keeps turning in
       Local/System too, not just Galaxy view) and the opposite sign, since
       the previous "+=" was the direction Tony saw as backwards. Redraw
       itself stays throttled to every 3rd frame for performance -- only the
       redraw is skipped, the angle still accumulates every frame so the
       average speed is correct rather than 3x too fast. */
    galIconRot-=GAL_ROT_SPD; if(galIconRot<-Math.PI*2) galIconRot+=Math.PI*2;
    galIconFrame++;
    if(galIconFrame%3===0) drawGalIcon();
    if(mode==="system"){
      for(var i=0;i<pivots.length;i++){
        pivots[i].p.rotation.y+=pivots[i].sp*0.01;
        pivots[i].mesh.rotation.y+=pivots[i].spin*0.01;
      }
      for(i=0;i<coronas.length;i++) coronas[i].quaternion.copy(camera.quaternion);
    }
    marker.lookAt(camera.position);
    if(atlasOn) for(var _ai=0;_ai<atlasMarkers.length;_ai++) atlasMarkers[_ai].lookAt(camera.position);
    if(mode==="local"){
      if(selRing.visible) selRing.quaternion.copy(camera.quaternion);
      if(focusRing.visible) focusRing.quaternion.copy(camera.quaternion);
    }
    /* camera.matrixWorldInverse is only refreshed as a side effect of renderer.render(),
       which runs AFTER this point -- so without this, updateLabels() below always projects
       against last frame's camera, one full frame stale. Invisible when the camera is still,
       but during an orbit-drag (continuous mousemove -> applyCam(), not tied to this loop)
       every label lags behind the live camera, landing nowhere near its body. Force the
       refresh first so labels always use the camera position this frame actually renders with. */
    _totalT+=dt; _starTime.value=_totalT;
    // Gentle breathing pulse on the "you are here" galaxy-view marker
    // (~4s per cycle) so it reads as a live indicator, not a static prop --
    // see its own comment above, near "var marker=".
    var _mp=0.85+Math.sin(_totalT*1.6)*0.15;
    marker.scale.setScalar(_mp);
    marker.material.opacity=0.75+Math.sin(_totalT*1.6)*0.2;
    if(atlasOn) for(var _aj=0;_aj<atlasMarkers.length;_aj++){
      var _am=atlasMarkers[_aj], _aph=_am.userData.phase||0;
      _am.scale.setScalar(0.8+Math.sin(_totalT*1.4+_aph)*0.2);
      _am.material.opacity=0.55+Math.sin(_totalT*1.4+_aph)*0.3;
    }
    camera.updateMatrixWorld();
    updateLabels();
    updateAtlasOverlay();
    updateTelemetry();
    if(courseLine) _updateRibbonGeometry(courseLine);
    updatePreviewAnim(dt);
    renderer.render(scene,camera);
  }catch(err){
    loopDead=true;
    showErr("render loop stopped: "+(err&&err.message?err.message:err));
  }
}

/* ============ admin flag review queue ============
   Reached via ?admin=<ADMIN_TOKEN> on the URL -- never linked anywhere in
   the normal UI, purely something Tony types in himself. Pulls the same
   admin GET view system-edit.mjs already serves at ?token=<ADMIN_TOKEN>
   (flagQueue: every currently flagged field across every system, with the
   note/timestamp/vote-count detail the public payload deliberately omits).
   See the header comment on adminPanel's HTML above for what's in and out
   of scope here. */
var ADMIN_TOKEN=null;
function adminAction(address, galaxy, field, resolution, value){
  return fetch(FUNC_URL+"?token="+encodeURIComponent(ADMIN_TOKEN),{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"resolve-flag", address:address, galaxy:galaxy, payload:{field:field, resolution:resolution, value:value}})
  }).then(function(r){ return r.json(); });
}
// Composite categories can't be fixed with a single plain-text prompt() --
// their real correction always goes through the normal Edit system flow
// anyway (which is itself consensus-safe, see voteAndMaybeResolve() in
// system-edit.mjs), so "fix it now" is only offered for simple ones.
var ADMIN_SIMPLE_FIELDS={name:1,race:1,region:1,starClass:1,conflict:1,notes:1};
function renderAdminQueue(data){
  var sub=document.getElementById("adminSub"), box=document.getElementById("adminQueue");
  var q=data.flagQueue||[];
  sub.textContent=q.length?(q.length+" flagged field"+(q.length===1?"":"s")+" waiting on review:"):"Nothing flagged right now.";
  if(!q.length){ box.innerHTML=""; return; }
  var html="";
  for(var i=0;i<q.length;i++){
    var it=q[i];
    var label=FLAG_LABELS[it.field]||("Body "+(it.field.split(".")[1]!==undefined?(+it.field.split(".")[1]+1):"?"));
    html+='<div class="mfld" style="border:1px solid var(--border-soft);border-radius:var(--r-sm);padding:8px 10px" data-addr="'+it.address+'" data-gal="'+it.galaxy+'" data-field="'+it.field+'">'+
      '<div style="display:flex;justify-content:space-between;gap:8px"><b style="color:var(--text)">'+label+'</b>'+
      '<span style="font-size:10px;color:var(--text-faint)">'+(it.flaggedAt?relTime(new Date(it.flaggedAt).toISOString()):"")+' &middot; '+it.votes+' vote(s)'+(it.issueUrl?' &middot; <a href="'+it.issueUrl+'" target="_blank" style="color:var(--cyan)">Issue</a>':'')+'</span></div>'+
      '<div style="font-size:11px;color:var(--text-dim);margin:3px 0 6px">'+it.address+' &middot; '+(it.galaxy!=null&&GALAXIES[it.galaxy]?GALAXIES[it.galaxy]:"galaxy "+it.galaxy)+(it.note?' -- "'+it.note+'"':'')+'</div>'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
        '<button class="btn" data-act="view" style="font-size:10px">View system</button>'+
        '<button class="btn" data-act="dispute" style="font-size:10px">Confirm dispute</button>'+
        '<button class="btn" data-act="dismiss" style="font-size:10px">Dismiss (data was fine)</button>'+
        (ADMIN_SIMPLE_FIELDS[it.field]?'<button class="btn" data-act="fix" style="font-size:10px">Fix it now</button>':'')+
      '</div></div>';
  }
  box.innerHTML=html;
}
function loadAdminQueue(){
  document.getElementById("adminSub").textContent="Loading…";
  fetch(FUNC_URL+"?token="+encodeURIComponent(ADMIN_TOKEN)).then(function(r){ return r.json(); }).then(function(data){
    if(!data.ok || data.flagQueue===undefined){
      document.getElementById("adminSub").textContent="Invalid admin token, or the server isn't set up yet.";
      document.getElementById("adminQueue").innerHTML="";
      return;
    }
    renderAdminQueue(data);
  }).catch(function(){
    document.getElementById("adminSub").textContent="Couldn't reach the server.";
  });
}
document.getElementById("adminQueue").addEventListener("click",function(e){
  var btn=e.target.closest?e.target.closest("button[data-act]"):null;
  if(!btn) return;
  var row=btn.closest(".mfld");
  var address=row.getAttribute("data-addr"), field=row.getAttribute("data-field"), act=btn.getAttribute("data-act");
  var galaxy=parseInt(row.getAttribute("data-gal"),10);
  if(isNaN(galaxy)) galaxy=0;
  if(act==="view"){
    document.getElementById("adminPanel").style.display="none";
    if(galaxy!==GALAXY){
      switchGalaxy(galaxy);
      document.getElementById("galSel").value=String(galaxy);
      syncGalaxyPickInput();
    }
    if(jumpTo(address)) playWarpTransition("portal");
    return;
  }
  if(act==="fix"){
    var val=prompt("New value for "+(FLAG_LABELS[field]||field)+":");
    if(val===null || !val.trim()) return;
    adminAction(address,galaxy,field,"set-value",val.trim()).then(function(){ loadAdminQueue(); loadOverrides(); });
    return;
  }
  var resolution = act==="dispute" ? "dispute" : "dismiss";
  adminAction(address,galaxy,field,resolution).then(function(){ loadAdminQueue(); loadOverrides(); });
});
document.getElementById("adminClose").addEventListener("click",function(){
  document.getElementById("adminPanel").style.display="none";
});
function openAdminPanel(token){
  ADMIN_TOKEN=token;
  document.getElementById("adminPanel").style.display="";
  loadAdminQueue();
}

/* ============ init ============ */
loadStore();
loadKnownTerms();
populateDatalists();
initLabels();
initAtlasBadges();
buildKeypad();
/* Restore a returning visitor's last real galaxy/position (2026-08-26,
   Tony: "should it not start in their last galaxy visited rather than
   Euclid each time"). Read before the first buildGalaxy()/buildNebula()/
   drawGalIcon() calls below, so a non-Euclid last galaxy renders correctly
   from the very first frame instead of flashing Euclid first. A brand-new
   visitor with nothing saved (LAST_POS null) falls straight through to the
   existing random-boot-anchor behaviour further down, unchanged. */
/* Real-position hand-off from the Galactic Navigator's "GALACTIC MAP"
   buttons (2026-08-30, Tony: "going back to map should land where you
   ended up, not the start, otherwise what was the point") -- see
   navigator/index.html's mapReturnQuery() and complete.html's viewMap
   button, which both link here with ?arrival=1&addr=...&galaxy=... for
   exactly this. Takes priority over a returning visitor's remembered
   last position for this one boot, since a hand-off is a more specific
   "go here" request -- jumpTo() below then saves it as the new last
   position anyway, so a plain revisit afterwards just continues from
   here, same as any other real jump. */
function readArrivalHandoff(){
  try{
    var q=new URLSearchParams(location.search);
    if(q.get("arrival")!=="1") return null;
    var addr=q.get("addr");
    if(!addr||!parseAddress(addr)) return null;
    var g=parseInt(q.get("galaxy"),10);
    if(!(g>=0&&g<GALAXIES.length)) g=0;
    return {galaxy:g, address:addr};
  }catch(e){ return null; }
}
var LAST_POS=readArrivalHandoff()||loadLastPosition();
if(LAST_POS){
  GALAXY=LAST_POS.galaxy;
  document.getElementById("galSel").value=String(GALAXY);
}
updateGalaxyInfo();
updateHyperSummary();
resize();
buildBackdrop();
buildGalaxy();
buildNebula();
drawGalIcon();
loadAtlasPOIs();
/* Random per-visit starting coordinate (2026-08-26, Tony: "why is it always
   that number, shouldn't it be random... every traveller does not start at
   the same place"). Used to be a single fixed address, "1067FA5A9B2C", so
   every visitor landed on the exact same system (~761,822 ly out) every
   single time. A fresh No Man's Sky save actually starts roughly 700,000-
   750,000 ly from the galactic core -- nowhere near this tool's own
   theoretical max radius of ~1,159,656 ly (SIZE_XZ/SIZE_Y x LY_PER_VOXEL,
   which already lines up almost exactly with the real galaxy-edge distance
   players report, ~1,159,350-1,159,371 ly), so 761,822 ly was always a
   realistic *distance* -- just never a *different* one. This rolls a new
   position inside that real 700k-750k ly spawn band on every page load
   (kept thin on the y/galactic-plane axis, like NMS's actual disc-shaped
   galaxy), so both the number and the system it seeds differ per visitor
   and per refresh. p/idx are carried over unchanged from the old fixed
   anchor -- only the position is randomised. */
function randomBootAddress(){
  var minR=1750, maxR=1875; // voxel units; x LY_PER_VOXEL(400) = 700,000-750,000 ly
  var r=minR+Math.random()*(maxR-minR);
  var theta=Math.random()*Math.PI*2;
  var vx=Math.round(Math.cos(theta)*r);
  var vz=Math.round(Math.sin(theta)*r);
  var vy=Math.round((Math.random()*2-1)*40); // thin galactic-plane offset
  return formatAddress(1,0x067,vx,vy,vz);
}
var BOOT_ANCHOR_ADDR=randomBootAddress(); /* not shown to the visitor, see jumpTo's silent flag */
/* Gated behind the nms-core module script above (see DEPLOYMENT_BRIEF.md) so
   the very first generateSlice() call -- inside jumpTo() below -- doesn't run
   before window.nmsLetterMap is populated. window.nmsCoreReady always
   resolves (even if the module failed to load, see its .catch() above), so
   this never hangs the page waiting on it. */
window.nmsCoreReady.then(function(){
  var restored=false;
  if(LAST_POS){
    document.getElementById("inAddr").value=LAST_POS.address;
    setKeypad(LAST_POS.address);
    syncGalaxyPickInput();
    // jumpTo's real (non-silent) path sets mode to "local", opens the
    // panel, marks hasRealLocation, and re-saves this same position --
    // exactly as if the visitor had just typed/jumped here themselves,
    // which is the whole point: this IS somewhere real they asked to go,
    // just remembered from last time rather than typed again.
    restored=jumpTo(LAST_POS.address,false);
  }
  if(!restored){
    // Either nothing was saved yet, or (belt and braces) a saved address
    // somehow failed to resolve -- fall back to the anonymous random spot.
    jumpTo(BOOT_ANCHOR_ADDR,true);
    setMode("galaxy");
  }
  syncResetBtn();
  setCtrl("orbit");
  applyCam();
  animate();
  loadOverrides();
  try{
    var adminQ=new URLSearchParams(location.search).get("admin");
    if(adminQ) openAdminPanel(adminQ);
  }catch(e){}
  /* 2026-08-30, Tony: shareable route links -- opening a ?route=... link
     directly (someone pasted it into their address bar, or it's a bookmark
     from Copy Link) loads that route the same way pasting it into the
     Routes popover would, right on boot. Runs after the position restore
     above on purpose (same "hand-off wins" precedent as ?arrival=1) -- a
     route link is a more specific "go here" request than wherever this
     visitor happened to be last. */
  try{
    var routeQ=new URLSearchParams(location.search).get("route");
    if(routeQ){
      var shared=decodeRoutePayload(routeQ);
      if(shared) receiveSharedRoute(shared);
      else toast("That route link looks broken");
    }
  }catch(e){}
  renderRoutesList();
});
/* Web fonts can finish loading a moment after this script runs, subtly
   changing button widths and therefore how many rows the toolbar wraps
   onto -- re-measure once fonts settle so --top-h doesn't end up stale. */
if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ syncTopOffset(); positionAnnivBadge(); }).catch(function(){});

/* 2026-08-30, Tony: one-shot header intro -- types "NMS GALACTIC MAP" out
   character by character with a blinking cursor, blinks a few more times
   once fully typed, then hands off to the CSS titleTextBreathe/titleBoxBreathe
   keyframes (see #title's rule above) for the rest of the session. The
   favicon icon spins the whole time regardless of which phase the text is
   in -- that's a plain always-on CSS animation, not gated by this script.
   Reads the real text back out of the DOM rather than hardcoding it again,
   so this can never drift from whatever #titleText actually says. Bails
   out immediately (showing the finished title, static icon) for a visitor
   with prefers-reduced-motion set, same escape hatch as the CSS side. */
(function(){
  var box=document.getElementById('title');
  var textEl=document.getElementById('titleText');
  if(!box||!textEl) return;
  var FULL=textEl.textContent.trim();
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    textEl.textContent=FULL;
    return;
  }
  var CURSOR=String.fromCharCode(0x258C); // "▌"
  // 2026-08-30 (round 4), honest-review fix: #title is a plain flex row
  // with no fixed width, so growing #titleText char-by-char widened the
  // whole box and shoved every toolbar button to its right sideways for
  // as long as typing (+ the blink tail afterward) lasted -- a real,
  // measurable click-target shift caught by actually mistiming a click
  // during the animation, not a cosmetic nit. Reserving up front the
  // width of the WIDEST string this element will ever show mid-animation
  // (the full text plus one cursor character -- typing never shows more
  // than that, and the blink tail only ever alternates between this and
  // the plain final text, which is shorter) fixes both the growth during
  // typing and the blink jitter afterward in one move: nothing to the
  // title's right ever has to move again, regardless of what's mid-typed.
  // Measured on the real element (inherits the parent's white-space:nowrap
  // and the same font-family/size it'll actually render with) rather than
  // a detached clone, and re-measured once more after webfonts settle --
  // Orbitron may not have painted yet at this exact point, same race
  // syncTopOffset() already guards against elsewhere in this file, so a
  // fallback-font measurement taken before Orbitron loads can't leave the
  // reservation too narrow. Only ever widens (never shrinks) an existing
  // reservation, so a second, later measurement can't reintroduce a shift.
  function reserveWidth(){
    var prevText=textEl.textContent, prevMin=parseFloat(textEl.style.minWidth)||0;
    textEl.style.minWidth='0';
    textEl.textContent=FULL+CURSOR;
    var natural=textEl.getBoundingClientRect().width;
    textEl.style.minWidth=Math.max(prevMin,Math.ceil(natural))+'px';
    textEl.textContent=prevText;
  }
  reserveWidth();
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(reserveWidth).catch(function(){});
  box.classList.add('typing');
  var i=0;
  function typeStep(){
    if(i<=FULL.length){
      textEl.textContent=FULL.slice(0,i)+CURSOR;
      i++;
      setTimeout(typeStep,65+Math.random()*50);
    } else {
      blink(5);
    }
  }
  function blink(remaining){
    if(remaining<=0){
      textEl.textContent=FULL;
      box.classList.remove('typing'); // hands off to the CSS breathing animation
      return;
    }
    textEl.textContent=FULL+(remaining%2===0?'':CURSOR);
    setTimeout(function(){ blink(remaining-1); },380);
  }
  typeStep();
})();
(function(){
  /* 2026-08-30, Tony (round 8): mobile "hide controls" toggle, now a
     per-group cascade instead of round 7's single whole-block slide --
     "reveal one row at a time smoothly with same glow as title but then
     looses glow... remove one at a time... not too quick not too slow".
     TIERS mirrors the same 6 groups the dividers (sepA-E) already mark, so
     no HTML restructuring was needed -- each tier reveals/hides on its own
     staggered delay, fading in/out via @keyframes toolbarRowReveal/Hide.
     Hiding a tier waits for its own fade-out to finish before switching to
     display:none, so the layout shrinks in the same staggered rhythm rather
     than all at once.
     2026-08-31, Tony: real jank on his actual phone (video), not fixed by
     any of the above timing tuning -- the drop-shadow glow this cascade
     used to add on reveal was dropped (see the keyframes' own comment) as
     the real cost-per-frame culprit, so what's below is now a plain
     opacity+transform fade with no glow step. */
  var KEY='nms_mobileToolbarCollapsed';
  var btn=document.getElementById('toolbarToggle');
  if(!btn) return;
  var TIERS=[
    ['galSel','galTypeFilter'],
    ['sepA'],
    ['sepB','bKeys','bRand','bSearch','bJump','bWarpToggle','bRoutes'],
    ['sepC','bFiltToggle','bLbl','bGrid','bAtlas'],
    ['sepD','cOrb','cFly'],
    ['sepE','bInstall','bTour','bAbout','bAccess']
    // 2026-09-12: #mGal/#mLoc/#inAddr/#bAddrReset deliberately absent from
    // every tier below -- same "not listed = never touched by this
    // cascade, always visible" mechanism #bWarpToggle/#bRoutes used to
    // rely on, now used for the group Tony actually wants left showing
    // when controls are hidden (Galaxy/Local/the hex address box/Clear --
    // confirmed via his own screenshots that all 4 already share one row
    // with room to spare, so dropping everything else can't squeeze it).
  ].map(function(ids){
    return ids.map(function(id){ return document.getElementById(id); }).filter(Boolean);
  });
  var STAGGER=180, REVEAL_MS=560, HIDE_MS=320; // half speed (see round-9 CSS comment)
  var reduceMotion=false;
  try{ reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
  var timers=[];
  function clearTimers(){ timers.forEach(clearTimeout); timers=[]; }
  function setLabel(collapsed){
    btn.textContent=(collapsed?'▼ Show controls':'▲ Hide controls');
    btn.setAttribute('aria-expanded',String(!collapsed));
  }
  function showInstant(tier){
    tier.forEach(function(el){ el.classList.remove('tb-hidden','tb-revealing','tb-hiding'); });
  }
  function hideInstant(tier){
    tier.forEach(function(el){ el.classList.remove('tb-revealing','tb-hiding'); el.classList.add('tb-hidden'); });
  }
  /* 2026-08-30, Tony: "shouldn't picture 1 be moving up and down with
     collapse and expand -- buttons see through, can't see some words" --
     the Galactic Core distance readout (#galHud) and a few other overlays
     (#course, #toast, #galInfo, #leftcol, #keys) all position themselves
     off the --top-h CSS variable, which syncTopOffset() sets from #top's
     real measured height -- but that function only ever runs on window
     resize or once when fonts settle (see its own definition above), never
     when THIS cascade changes #top's height. So --top-h went stale the
     moment a tier revealed or hid, and #galHud kept rendering at whatever
     height the toolbar happened to be at page load, bleeding through
     semi-transparent buttons once the real toolbar grew past that stale
     value. Calling syncTopOffset() at each tier step keeps it honest, and
     the transition added on #galHud/#course/etc. (see the .tb-hidden rule's
     neighbours in the @media block) turns each step into a smooth glide
     instead of a snap -- which is also the "moving up and down" motion
     Tony was actually asking for. */
  /* 2026-08-30, Tony: "picture 1 moves... but picture 2 doesn't... they
     suppose to be together" -- #annivBadge (the 10th-anniversary badge) is
     positioned in JS off #galHud's own live rect (positionAnnivBadge(),
     defined above), specifically so it always sits glued to galHud's right
     edge. But this cascade only ever called syncTopOffset() at each tier
     step -- which is what makes #galHud itself glide via --top-h -- and
     never called positionAnnivBadge() alongside it, so the badge stayed
     frozen at wherever it was last measured while galHud slid out from
     under it, same category of bug as the --top-h one just above. One
     shared step for both, same reasoning as keeping one shared distance
     number elsewhere in this file: whatever moves galHud should always be
     the same thing that re-glues the badge to it, so they can't drift apart
     again. (#annivBadge's own CSS already has `transition:left .15s,top
     .15s`, so recomputing it here rides the same glide, not a snap.) */
  function syncOverlays(){
    syncTopOffset();
    positionAnnivBadge();
    positionSysBanner();
    /* 2026-08-30 (later same day, Tony: still out of sync once controls were
       fully shown again): the immediate call above still isn't enough on its
       own -- this cascade fires a syncOverlays() every STAGGER(180ms) as each
       tier hides/reveals, but #galHud's own top move is a .15s CSS
       transition, so a call made the instant one tier's --top-h changes
       reads galHud's rect mid-glide from the PREVIOUS tier's move, not the
       settled position of the CURRENT one -- everything stays one tier
       behind, which is exactly the small persistent gap Tony saw after the
       whole cascade finished revealing. Scheduling one more positionAnnivBadge()
       just past the transition's own duration catches it once it's actually
       settled -- same fix already used for this exact class of race
       elsewhere in this file (see updateGalInfoBadge() above). */
    timers.push(setTimeout(positionAnnivBadge,180));
    timers.push(setTimeout(positionSysBanner,180));
  }
  /* 2026-08-31: was one forced synchronous reflow (`void el.offsetWidth`)
     PER BUTTON in a tier -- needed once, to make the browser notice the
     class was removed-then-re-added so the animation actually restarts,
     but reading layout from every element in the tier repeats the same
     forced flush for no extra benefit (the whole tier reflows together
     regardless of which single element you read). Reading it off just the
     tier's first element gets the same restart guarantee for the cost of
     one layout read instead of up to five -- real savings multiplied by
     6 tiers every time the cascade runs, and part of the same jank fix as
     dropping the drop-shadow glow above. */
  function restartAnim(tier){ if(tier[0]) void tier[0].offsetWidth; }
  function revealAll(){
    clearTimers();
    if(reduceMotion){ TIERS.forEach(showInstant); syncOverlays(); return; }
    TIERS.forEach(function(tier,i){
      timers.push(setTimeout(function(){
        tier.forEach(function(el){ el.classList.remove('tb-hidden','tb-hiding','tb-revealing'); });
        restartAnim(tier);
        tier.forEach(function(el){ el.classList.add('tb-revealing'); });
        syncOverlays();
        timers.push(setTimeout(function(){
          tier.forEach(function(el){ el.classList.remove('tb-revealing'); });
        },REVEAL_MS));
      },i*STAGGER));
    });
  }
  function hideAll(){
    clearTimers();
    if(reduceMotion){ TIERS.forEach(hideInstant); syncOverlays(); return; }
    TIERS.slice().reverse().forEach(function(tier,ri){
      timers.push(setTimeout(function(){
        tier.forEach(function(el){ el.classList.remove('tb-revealing','tb-hiding'); });
        restartAnim(tier);
        tier.forEach(function(el){ el.classList.add('tb-hiding'); });
        timers.push(setTimeout(function(){
          tier.forEach(function(el){ el.classList.remove('tb-hiding'); el.classList.add('tb-hidden'); });
          syncOverlays();
        },HIDE_MS));
      },ri*STAGGER));
    });
  }
  // First paint only: jump straight to the saved state with no animation --
  // the cascade should only ever play in response to an actual tap.
  var initial=false;
  try{ initial=localStorage.getItem(KEY)==='1'; }catch(e){}
  TIERS.forEach(initial?hideInstant:showInstant);
  document.documentElement.classList.toggle('toolbar-collapsed',initial);
  setLabel(initial);
  syncOverlays();
  btn.addEventListener('click',function(){
    var collapsing=!document.documentElement.classList.contains('toolbar-collapsed');
    document.documentElement.classList.toggle('toolbar-collapsed',collapsing);
    setLabel(collapsing);
    if(collapsing) hideAll(); else revealAll();
    btn.classList.remove('flash'); void btn.offsetWidth; btn.classList.add('flash');
    try{ localStorage.setItem(KEY,collapsing?'1':'0'); }catch(e){}
  });
})();
