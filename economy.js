// Original work for the NMS Galactic Map project (elegra1965) -- NOT ported
// from hadsh/nms_namegen like the rest of nms-core/. nms_namegen never
// modeled system economy, conflict, race, outlaw/abandoned/uncharted status,
// or planet rings at all, so there was nothing upstream to port for this
// part; it had to be built from scratch.
//
// The numeric probability tables below ARE real, decompiled game data
// though, not guesses: ODDS and RING_CHANCE were verified 2026-08-12 against
// a legitimately-owned NMS install by decompiling
// GCSOLARGENERATIONGLOBALS.GLOBAL.MBIN with NMS Mod Tool
// (nexusmods.com/nomanssky/mods/4312, wraps libMBIN -- real Hello Games
// data, not another fan tool's reverse-engineering). ODDS' three keys map to
// that file's own field names: unc = EmptySystemProbability, aba =
// AbandonedSystemProbability, out = PirateSystemProbability, all keyed by
// star colour. RING_CHANCE = PlanetRingProbability (flat, not per-colour).
//
// 2026-08-23 update -- nms-core/system.js's systemAttributes() now derives
// economy_type/wealth/conflict_level/dominant_race/uncharted/abandoned/
// pirate directly off the game's own real RNG stream (ported from
// hadsh/nms_namegen, ~99% validated against 1000 ground-truth systems --
// see that file's own header and TODO.md). That supersedes the ODDS-driven
// abandoned/uncharted/outlaw/race/econType/econTier/conTier draws THIS file
// used to do independently. rollSystemFlavorFromAttrs() below is the new,
// preferred entry point when a caller already has that real attrs object
// (portal-code-based generation, i.e. almost always) -- it takes those
// fields as given and only rolls what system.js still doesn't model: which
// specific flavour-text word within a type/tier (econName/econDesc/
// conflict), and sell%/buy%. rollSystemFlavor() (the original, fully
// independent ODDS-driven roll) stays exactly as it was, unchanged, as the
// fallback for callers with no portal address / no systemAttributes() to
// call (e.g. this project's own file:// fallback path -- see preview.html).
//
// Everything else here -- the race list, the economy/conflict NAME pools,
// the tier-threshold cutoffs, and the biome->ring-style pairing -- is this
// project's own invented flavour text/logic, written to read naturally next
// to the real in-game UI. It is NOT extracted from the game files. Flagged
// honestly rather than overclaimed, same as every other README in this
// module.
//
// 2026-08-24 addition -- pickBiome() below. Tony asked whether a real
// pattern exists for which biome (Lush/Frozen/Radioactive/etc.) a planet
// gets, since the old flat `pickOne(br,BIOME_KEYS)` in preview.html picks
// uniformly across all 12 biome keys with zero regard for star colour,
// galaxy type, or whether the body is a "Prime" (Origins-era extra) slot --
// confirmed "close but not close enough" by his own in-game experience.
// Research (session 2026-08-24, see NMS_Biome_Pattern_Analysis.xlsx --
// delivered to Tony, not shipped in this repo) found a citable source:
// nomanssky.fandom.com/wiki/Biome publishes two weighted tables ("Normal
// Planets" and "Prime Planets"), broken out by star colour and, for yellow
// stars only, by galaxy type (Norm/Lush/Empty), stating the numbers were
// "extracted from the 3.68 version of BIOMELISTPERSTARTYPE.MBIN" -- the
// same decompiled-data category already trusted above for ODDS/RING_CHANCE.
// BIOME_WEIGHTS below is that table, transcribed as-is (not independently
// re-verified against the .MBIN file itself the way ODDS/RING_CHANCE were --
// this is a second-hand wiki transcription, fetched twice independently and
// consistent both times, but flagged with less confidence than a direct
// decompile).
//
// Two real, disclosed gaps the wiki table itself doesn't cover, each
// handled as an invented placeholder rather than silently ignored:
//   - No Purple/Exotic star column exists on the wiki page at all. Rather
//     than guess a Purple-specific table, avgPurpleColumn() below averages
//     the 6 real columns (yellowNorm/yellowLush/yellowEmpty/red/green/blue)
//     live, so it can never drift out of sync with the real data if that's
//     ever edited.
//   - No dedicated Harsh-galaxy column exists either -- a separate wiki page
//     (Harsh_galaxy) says Harsh galaxies are "much more likely" to generate
//     Extreme biomes (Scorched/Frozen/Toxic/Radioactive/Volcanic) than Norm,
//     with no exact multiplier published anywhere found. HARSH_MULTIPLIER
//     is this project's own invented placeholder (2x on those 5 rows,
//     applied on top of the Norm-galaxy yellow column, or the relevant
//     colour column for red/green/blue), same "disclosed guess, easy to
//     adjust" status as GIANT_CHANCE above.
//
// Prime-vs-Normal routing: pickBiome() takes an `isPrime` flag from the
// caller rather than deriving it itself -- preview.html approximates it per
// body as `pi >= attrs.planet_count` (attrs from nms-core/system.js's real
// systemAttributes()), i.e. body slots beyond the real "normal" planet count
// are treated as Prime/extra. WHICH exact slot is Prime isn't something
// nms-core exposes per-body (same disclosed gap as the existing moon-slot
// approximation in generateSystem() -- see its own comment), so this is a
// reasonable positional approximation, not confirmed ground truth.
//
// The wiki's 13 category rows are folded onto this project's 11 real
// pickable BIOME_KEYS (Irradiated excluded -- see BIOME_ORDER's own comment)
// as follows: Weird->Exotic, Swamp->Marsh, Lava->Volcanic (all judgement
// calls, not exact name matches), and the wiki's 3 colour-locked
// "Red/Green/Blue (star-matched)" rows are SUMMED into this project's single
// "Mega Exotic" key per column (mutually-exclusive rows, so summing loses no
// probability mass) -- full reasoning for every mapping decision is in the
// delivered spreadsheet's "Biome Name Mapping" tab.
//
// Usage: pass your own seeded RNG function `r` (must return a float in
// [0,1) each call, e.g. Math.random, or the PRNG in nms-core/prng.js, or a
// hand-rolled mulberry32 like this project uses elsewhere).
//
//   import { rollSystemFlavorFromAttrs, rollSystemFlavor, rollRing } from './nms-core/economy.js';
//
//   // Preferred: you already have systemAttributes(portalCode, galaxy)'s
//   // result (see nms-core/system.js) -- economy/wealth/conflict/race/
//   // uncharted/abandoned/pirate come from that, real and exact:
//   var flavor = rollSystemFlavorFromAttrs(myRng, attrs);
//
//   // Fallback: no portal address available, so no real attrs to draw
//   // from -- everything is independently guessed, star-colour-only:
//   var flavor = rollSystemFlavor(myRng, "purple");
//
//   // Either way: flavor.abandoned, flavor.uncharted, flavor.outlaw,
//   // flavor.race, flavor.econType, flavor.econName, flavor.econTier,
//   // flavor.econDesc, flavor.sell, flavor.buy, flavor.conTier,
//   // flavor.conflict
//
//   var ringStyle = rollRing(myRng, "Frozen", false); // "icy" | false
//
// IMPORTANT for anyone porting this into a seeded/reproducible generator:
// both rollSystemFlavor() and rollSystemFlavorFromAttrs() call `r()` a
// fixed number of times per call (some draws are conditionally skipped via
// short-circuit, exactly mirroring the real game's own "abandoned rolled
// first, uncharted skipped if already abandoned" behaviour, or -- for
// rollSystemFlavorFromAttrs() -- simply not drawn at all since attrs
// already has the answer) -- if you also draw more random values from the
// SAME rng instance afterwards for other fields, calling either function a
// different number of times than expected will desync every later draw.
// Give it its own seeded rng instance per system if in doubt.

"use strict";

/**
 * Source: GCSOLARGENERATIONGLOBALS.GLOBAL.MBIN's AbandonedSystemProbability
 * / EmptySystemProbability / PirateSystemProbability tables, keyed by star
 * colour (Yellow/Red/Green/Blue/Purple in the real file).
 */
var ODDS = {
  yellow: { out: .25, unc: 0,   aba: 0   },
  red:    { out: .50, unc: .95, aba: 0   },
  green:  { out: .15, unc: .40, aba: .10 },
  blue:   { out: .15, unc: .40, aba: .10 },
  purple: { out: .05, unc: .20, aba: .35 },
};

/** Real PlanetRingProbability value, same decompiled source file. */
var RING_CHANCE = 0.30;

/**
 * Giants are exclusive to purple systems in the real game. This constant is
 * only useful as a fallback approximation for callers with no way to derive
 * the real per-system gas_giant flag (e.g. no portal address available to
 * feed nms-core/system.js's systemAttributes()) -- it is NOT itself a
 * decompiled value, just this project's own placeholder tuning.
 */
var GIANT_CHANCE = 0.12;

/** Only 3 factions ever control a system in the real game (confirmed via
 * the NMS wiki's Faction page); "Uninhabited" covers abandoned/uncharted. */
var RACES = ["Gek", "Vy'keen", "Korvax"];

/** nms-core/system.js's own dominant_race numbering (1=Gek, 2=Korvax,
 * 3=Vy'keen, 0=uncharted/no race) -- NOT the same order as RACES above, so
 * this is an explicit lookup rather than a reusable array index. */
var RACE_BY_DOMINANT_CODE = { 1: "Gek", 2: "Korvax", 3: "Vy'keen" };

var ECON = [
  ["Trading", ["Mercantile", "Trading", "Shipping", "Commercial"]],
  ["Advanced Materials", ["Material Fusion", "Alchemical", "Metal Processing", "Ore Processing"]],
  ["Scientific", ["Research", "Scientific", "Experimental", "Mathematical"]],
  ["Mining", ["Mining", "Minerals", "Ore Extraction", "Prospecting"]],
  ["Manufacturing", ["Manufacturing", "Industrial", "Construction", "Mass Production"]],
  ["Technology", ["High Tech", "Technology", "Nano-construction", "Engineering"]],
  ["Power Generation", ["Power Generation", "Energy Supply", "Fuel Generation", "High Voltage"]],
];

var ECON_S = [
  ["Declining", "Destitute", "Failing", "Fledgling", "Low Supply", "Struggling", "Unsuccessful", "Unpromising"],
  ["Adequate", "Balanced", "Comfortable", "Developing", "Medium Supply", "Promising", "Satisfactory", "Sustainable"],
  ["Advanced", "Affluent", "Booming", "Flourishing", "High Supply", "Opulent", "Prosperous", "Wealthy"],
];

var CONFLICT = [
  ["Gentle", "Low", "Mild", "Peaceful", "Relaxed", "Stable", "Tranquil", "Trivial", "Unthreatening", "Untroubled"],
  ["Belligerent", "Boisterous", "Fractious", "Intermittent", "Medium", "Rowdy", "Sporadic", "Testy", "Unruly", "Unstable"],
  ["Aggressive", "Alarming", "At War", "Critical", "Dangerous", "Destructive", "Formidable", "High", "Lawless", "Perilous", "Pirate Controlled"],
];

/** Sourced (nomanssky.fandom.com/wiki/Resource): the stellar-class element
 * every planet in a system can mine, keyed by the system's star colour. */
var STELLAR_EL = { yellow: "Copper", red: "Cadmium", green: "Emeril", blue: "Indium", purple: "Quartzite" };

/** Universal elements that can appear on any planet regardless of biome. */
var UNIVERSAL_EL = ["Cobalt", "Silver", "Gold", "Magnetised Ferrite", "Salt", "Sodium"];

/** Which of the 5 ring looks each biome gets -- this project's own pairing
 * ("ice for frozen planets, ash for volcanic etc"), not randomised. */
var RING_STYLE_BY_BIOME = {
  Frozen: "icy",
  Barren: "tan", Lush: "tan", Marsh: "tan",
  Volcanic: "ash", Dead: "ash", Toxic: "ash",
  Scorched: "gold", Radioactive: "gold", Irradiated: "gold", "Mega Exotic": "gold",  // Irradiated kept as an alias, see preview.html comment
  Exotic: "split",
};

function pickOne(r, arr) { return arr[Math.floor(r() * arr.length)]; }

/**
 * Rolls a system's abandoned/uncharted/outlaw status, controlling race,
 * economy (type/name/tier/description/sell%/buy%), and conflict
 * (tier/description) -- the full "flavour" of a system, everything the real
 * in-game info panel shows apart from star type and planet count/names
 * (those are handled by nms-core/system.js instead).
 *
 * Draw order matches the real game (confirmed via a 2026-08-12 statistical
 * sweep cross-checked against nms-core/system.js's own corpus-verified
 * sequence): abandoned is rolled first and unconditionally; uncharted is
 * only rolled if the system wasn't already abandoned; outlaw is only rolled
 * if the system isn't uncharted. (Outlaw/pirate placement itself isn't
 * modeled by the upstream nms_namegen port this project also uses, so
 * there's no independently-verified evidence for exactly where its own
 * gate belongs relative to the other two -- it's kept behind !uncharted
 * as this project has always done, not because that's confirmed real.)
 *
 * @param {() => number} r - seeded RNG returning a float in [0,1) each call
 * @param {"yellow"|"red"|"green"|"blue"|"purple"} starKey
 * @returns {{abandoned:boolean, uncharted:boolean, outlaw:boolean,
 *   race:string, econType:string, econName:string, econTier:number,
 *   econDesc:string, sell:string, buy:string, conTier:number,
 *   conflict:string}}
 */
function rollSystemFlavor(r, starKey) {
  var o = ODDS[starKey] || ODDS.yellow;
  var out = {};

  out.abandoned = r() < o.aba;
  out.uncharted = !out.abandoned && (r() < o.unc);
  out.outlaw = !out.uncharted && (r() < o.out);
  out.race = (out.uncharted || out.abandoned) ? "Uninhabited" : pickOne(r, RACES);

  var e = pickOne(r, ECON);
  out.econType = e[0];
  out.econName = pickOne(r, e[1]);
  var tr = r();
  out.econTier = tr < 0.45 ? 0 : (tr < 0.85 ? 1 : 2);
  out.econDesc = pickOne(r, ECON_S[out.econTier]);
  rollSellBuy(r, out);

  var cr = r();
  out.conTier = cr < 0.45 ? 0 : (cr < 0.82 ? 1 : 2);
  out.conflict = pickOne(r, CONFLICT[out.conTier]);

  return out;
}

/**
 * sell%/buy% -- refit 2026-08-23 against 822 real system records pulled
 * from the live "Edit System" corpus (data/overrides.json), replacing the
 * original tier-scaled guess. What that check actually found: real sell%
 * does NOT track wealth tier (tier 0/1/2 means were 59.6/60.2/58.4 --
 * statistically indistinguishable) or economy type (all 7 types clustered
 * 58-61%) -- so the draw below is deliberately independent of out.econTier,
 * unlike the old [5+r()*30, 30+r()*30, 55+r()*25][tier] formula. Real
 * sell% clustered around mean 60 with sd ~12 (an Irwin-Hall-style summed
 * draw matches that spread much better than a single flat r()*range roll,
 * which would be too wide/uniform); real |buy%| was close to a flat
 * uniform draw, mean ~20, sd ~5.7, range roughly 10-30.
 *
 * Caveat, worth knowing if this gets refit again: 819 of those 822 records
 * trace to a single 2026-08-23 wiki bulk-import (see TODO.md), not hundreds
 * of independent players, and its observed sell% max (79.9%) may or may not
 * be a real hard ceiling -- Tony has personally seen values over 100%
 * in-game and wasn't sure whether that's this same system-wide stat or a
 * different per-item trade-terminal modifier. On that uncertainty, the old
 * hard `Math.min(80, ...)` clamp is deliberately REMOVED rather than
 * re-asserted on thin evidence -- the draw's own spread still keeps values
 * much above 80 rare, it just no longer forbids them outright.
 *
 * Consumes exactly 4 r() calls (3 for sell, 1 for buy) either way -- same
 * total as the formula this replaces, so draw-count parity with any
 * existing caller is unaffected.
 *
 * @param {() => number} r
 * @param {object} out - mutated in place: out.sell, out.buy (both strings)
 */
function rollSellBuy(r, out) {
  var s3 = r() + r() + r(); // Irwin-Hall(3): mean 1.5, sd 0.5, range [0,3]
  out.sell = Math.max(0, 60 + (s3 - 1.5) * 24).toFixed(1);
  out.buy = (-(10 + r() * 20)).toFixed(1);
}

/**
 * Preferred entry point when the caller already has nms-core/system.js's
 * systemAttributes(portalCode, galaxy) result for this system -- i.e.
 * almost always, since generateSystem() already computes that for
 * star_type/gas_giant/planet counts. Takes abandoned/uncharted/pirate/
 * dominant_race/economy_type/wealth/conflict_level as GIVEN (real, ~99%
 * validated -- see system.js's own header), and only rolls what
 * systemAttributes() still doesn't model: which specific word to show
 * within that type/tier (econName/econDesc/conflict), and sell%/buy% (see
 * rollSellBuy() above).
 *
 * Unlike rollSystemFlavor(), this does NOT draw abandoned/uncharted/outlaw/
 * race/econTier/conTier from `r` at all -- those come straight from attrs,
 * so no ODDS/star-colour lookup is needed here. Draw count on `r` varies
 * (2 draws for econName+econDesc, 4 for sell/buy, 1 for conflict = 7 total,
 * always -- no short-circuiting, since attrs already resolved every
 * conditional) -- fixed and predictable either way, same "give it its own
 * rng instance if in doubt" guidance as rollSystemFlavor() applies.
 *
 * @param {() => number} r - seeded RNG returning a float in [0,1) each call
 * @param {{abandoned:boolean, uncharted:boolean, pirate:boolean,
 *   dominant_race:number, economy_type:number, wealth:number,
 *   conflict_level:number}} attrs - nms-core/system.js's
 *   systemAttributes() result for this exact system
 * @returns {{abandoned:boolean, uncharted:boolean, outlaw:boolean,
 *   race:string, econType:string, econName:string, econTier:number,
 *   econDesc:string, sell:string, buy:string, conTier:number,
 *   conflict:string}}
 */
function rollSystemFlavorFromAttrs(r, attrs) {
  var out = {};

  out.abandoned = !!attrs.abandoned;
  out.uncharted = !!attrs.uncharted;
  out.outlaw = !!attrs.pirate;
  out.race = (out.uncharted || out.abandoned)
    ? "Uninhabited"
    : (RACE_BY_DOMINANT_CODE[attrs.dominant_race] || "Uninhabited");

  var e = ECON[(attrs.economy_type || 1) - 1] || ECON[0];
  out.econType = e[0];
  out.econName = pickOne(r, e[1]);

  out.econTier = Math.max(0, Math.min(2, (attrs.wealth || 1) - 1));
  out.econDesc = pickOne(r, ECON_S[out.econTier]);
  rollSellBuy(r, out);

  out.conTier = Math.max(0, Math.min(2, (attrs.conflict_level || 1) - 1));
  out.conflict = pickOne(r, CONFLICT[out.conTier]);

  return out;
}

/**
 * Rolls whether a single planet has rings, and which of the 5 visual
 * styles it gets if so. Moons never have rings (not a real thing in-game)
 * -- and, to preserve determinism for callers reusing the same rng
 * instance for more draws afterwards, the rng is deliberately NOT consumed
 * at all when isMoon is true (matches this project's own short-circuited
 * `!isMoon && br()<RING_CHANCE`, not a fresh reimplementation).
 *
 * @param {() => number} br - seeded per-body RNG returning a float in [0,1)
 * @param {string} biome - one of the biome keys used by RING_STYLE_BY_BIOME
 *   (an unrecognised biome still gets a ring, styled "tan" as a fallback)
 * @param {boolean} isMoon
 * @returns {string|false} the ring style key ("icy"|"tan"|"ash"|"gold"|
 *   "split"), or false for no ring
 */
function rollRing(br, biome, isMoon) {
  if (isMoon) return false;
  if (br() >= RING_CHANCE) return false;
  return RING_STYLE_BY_BIOME[biome] || "tan";
}

/**
 * The 11 biome keys pickBiome() can actually produce. This project's own
 * BIOMES object (preview.html) has 12 keys, but "Irradiated" is a manual-
 * only alias of "Radioactive" (same texture/resource data -- added
 * 2026-08-17 so travellers can still pick the wiki's own name in Edit
 * system "just in case", per Tony) with no dedicated wiki row of its own --
 * folding it out of procedural generation here (rather than giving it a
 * 12th weight column nobody has real data for) means Radioactive planets no
 * longer randomly and meaninglessly show two different names for the same
 * biome. Order matches BIOME_WEIGHTS' column order below; not alphabetical.
 */
var BIOME_ORDER = ["Lush", "Barren", "Dead", "Exotic", "Mega Exotic",
  "Scorched", "Frozen", "Toxic", "Radioactive", "Marsh", "Volcanic"];

/**
 * Relative weights (NOT percentages -- see pickBiome()/weightedPick() for
 * how these get normalised) transcribed from nomanssky.fandom.com/wiki/
 * Biome's "Normal Planets" and "Prime Planets" tables, 2026-08-24. Column
 * order within each row matches BIOME_ORDER above. yellowNorm/yellowLush/
 * yellowEmpty are the wiki's own 3 yellow-star-by-galaxy-type columns; red/
 * green/blue are stated on the wiki as NOT varying by galaxy type. No
 * purple column exists (see avgPurpleColumn() below).
 */
var BIOME_WEIGHTS = {
  normal: {
    yellowNorm:  [2, 1, 2,   0,   0, 1, 1, 1, 1, 0, 0],
    yellowLush:  [4, 1, 0.5, 1,   0, 1, 1, 1, 1, 0, 0],
    yellowEmpty: [1, 1, 4,   1,   0, 1, 1, 1, 1, 0, 0],
    red:         [1, 1, 2,   3,   1, 1, 1, 1, 1, 0, 0],
    green:       [1, 1, 2,   1,   1, 1, 1, 1, 1, 0, 0],
    blue:        [1, 1, 2,   2,   1, 1, 1, 1, 1, 0, 0],
  },
  prime: {
    yellowNorm:  [2, 1, 0.5, 0,   0, 1, 1, 0.5, 0.5, 1, 1],
    yellowLush:  [4, 1, 0.5, 0.5, 3, 1, 1, 0.5, 0.5, 1, 1],
    yellowEmpty: [1, 1, 0.5, 0,   3, 1, 1, 0.5, 0.5, 1, 1],
    red:         [1, 1, 0.5, 0.5, 3, 1, 1, 1,   0.5, 0, 2],
    green:       [1, 1, 0.5, 0.5, 3, 1, 1, 1,   0.5, 2, 0],
    blue:        [1, 1, 0.5, 0.5, 3, 1, 1, 0.5, 0.5, 1, 1],
  },
};

/** Disclosed placeholder -- see the 2026-08-24 header addendum above. Not a
 * decompiled value; the wiki's Harsh_galaxy page describes the direction
 * ("much more likely") but publishes no exact multiplier. */
var HARSH_MULTIPLIER = 2;
var HARSH_BOOST_KEYS = ["Scorched", "Frozen", "Toxic", "Radioactive", "Volcanic"];

/** Averages the 6 real wiki columns live (rather than hardcoding a 7th
 * "purple" column) so it can never drift out of sync if BIOME_WEIGHTS is
 * ever edited. Disclosed placeholder -- no purple-star data exists on the
 * wiki page at all, see header addendum. */
function avgPurpleColumn(table) {
  var cols = [table.yellowNorm, table.yellowLush, table.yellowEmpty, table.red, table.green, table.blue];
  var n = BIOME_ORDER.length, out = new Array(n).fill(0), ci, i;
  for (ci = 0; ci < cols.length; ci++) for (i = 0; i < n; i++) out[i] += cols[ci][i];
  for (i = 0; i < n; i++) out[i] = out[i] / cols.length;
  return out;
}

/**
 * Weighted pick that ALWAYS consumes exactly one r() call, same contract as
 * pickOne(r,arr) elsewhere in this project -- callers reusing the same
 * seeded rng instance for further draws afterwards depend on this, same
 * "give it its own instance if in doubt" guidance as every other function
 * in this file. (The r()*(total>0?total:1) below still calls r() even in
 * the never-expected-in-practice all-zero-weights case, rather than
 * short-circuiting before the draw -- every real column here always sums
 * positive, see the header addendum, but this keeps the guarantee
 * unconditional rather than data-dependent.)
 */
function weightedPick(r, keys, weights) {
  var total = 0, i;
  for (i = 0; i < weights.length; i++) total += weights[i];
  var x = r() * (total > 0 ? total : 1);
  if (total <= 0) return keys[0];
  for (i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return keys[i];
  }
  return keys[keys.length - 1]; // floating-point fallback
}

/**
 * Picks a planet/moon's biome using the real wiki-sourced weight table
 * instead of a flat uniform chance across all keys -- see the 2026-08-24
 * header addendum for the full research writeup and disclosed placeholders
 * (Harsh multiplier, Purple column averaging, the isPrime approximation).
 *
 * @param {() => number} r - seeded RNG, consumes exactly one call
 * @param {object} [opts]
 * @param {"yellow"|"red"|"green"|"blue"|"purple"} [opts.starKey="yellow"]
 * @param {"Norm"|"Harsh"|"Empty"|"Lush"|"Unknown"} [opts.galaxyType="Norm"]
 * @param {boolean} [opts.isPrime=false] - true for an approximated "Prime"/
 *   extra body slot (see header addendum); false (the default) uses the
 *   "Normal Planets" table, the safe choice when the caller has no real
 *   attrs.planet_count to compare against (e.g. no portal address).
 * @returns {string} one of BIOME_ORDER's 11 keys
 */
function pickBiome(r, opts) {
  opts = opts || {};
  var starKey = opts.starKey || "yellow";
  var gType = opts.galaxyType || "Norm";
  var table = opts.isPrime ? BIOME_WEIGHTS.prime : BIOME_WEIGHTS.normal;

  var col;
  if (starKey === "yellow") {
    col = (gType === "Lush") ? table.yellowLush
        : (gType === "Empty") ? table.yellowEmpty
        : table.yellowNorm; // Norm, Harsh (boosted below) and Unknown all share this base column
  } else if (starKey === "red") col = table.red;
  else if (starKey === "green") col = table.green;
  else if (starKey === "blue") col = table.blue;
  else if (starKey === "purple") col = avgPurpleColumn(table);
  else col = table.yellowNorm;

  var weights = col.slice();
  if (gType === "Harsh") {
    for (var hi = 0; hi < BIOME_ORDER.length; hi++) {
      if (HARSH_BOOST_KEYS.indexOf(BIOME_ORDER[hi]) >= 0) weights[hi] = weights[hi] * HARSH_MULTIPLIER;
    }
  }
  return weightedPick(r, BIOME_ORDER, weights);
}

export {
  ODDS, RING_CHANCE, GIANT_CHANCE, RACES, RACE_BY_DOMINANT_CODE, ECON, ECON_S, CONFLICT,
  STELLAR_EL, UNIVERSAL_EL, RING_STYLE_BY_BIOME,
  rollSystemFlavor, rollSystemFlavorFromAttrs, rollRing,
  BIOME_ORDER, BIOME_WEIGHTS, HARSH_MULTIPLIER, HARSH_BOOST_KEYS, pickBiome,
};
