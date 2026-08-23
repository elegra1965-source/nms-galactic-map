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

export {
  ODDS, RING_CHANCE, GIANT_CHANCE, RACES, RACE_BY_DOMINANT_CODE, ECON, ECON_S, CONFLICT,
  STELLAR_EL, UNIVERSAL_EL, RING_STYLE_BY_BIOME,
  rollSystemFlavor, rollSystemFlavorFromAttrs, rollRing,
};
