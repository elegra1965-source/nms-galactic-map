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
// Everything else here -- the race list, the economy/conflict NAME pools,
// the tier-threshold cutoffs, and the biome->ring-style pairing -- is this
// project's own invented flavour text/logic, written to read naturally next
// to the real in-game UI. It is NOT extracted from the game files. Flagged
// honestly rather than overclaimed, same as every other README in this
// module.
//
// Usage: pass your own seeded RNG function `r` (must return a float in
// [0,1) each call, e.g. Math.random, or the PRNG in nms-core/prng.js, or a
// hand-rolled mulberry32 like this project uses elsewhere) plus the
// system's star colour key to rollSystemFlavor(). Ring rolling is separate
// (rollRing) since it happens once per planet, not once per system.
//
//   import { rollSystemFlavor, rollRing } from './nms-core/economy.js';
//   var flavor = rollSystemFlavor(myRng, "purple");
//   // flavor.abandoned, flavor.uncharted, flavor.outlaw, flavor.race,
//   // flavor.econType, flavor.econName, flavor.econTier, flavor.econDesc,
//   // flavor.sell, flavor.buy, flavor.conTier, flavor.conflict
//
//   var ringStyle = rollRing(myRng, "Frozen", false); // "icy" | false
//
// IMPORTANT for anyone porting this into a seeded/reproducible generator:
// rollSystemFlavor() calls `r()` a fixed number of times per call (some
// draws are conditionally skipped via short-circuit, exactly mirroring the
// real game's own "abandoned rolled first, uncharted skipped if already
// abandoned" behaviour) -- if you also draw more random values from the
// SAME rng instance afterwards for other fields, calling this function a
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
  Scorched: "gold", Radioactive: "gold", "Mega Exotic": "gold",  // renamed 2026-08-17, see preview.html comment
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
  out.sell = Math.min(80, [5 + r() * 30, 30 + r() * 30, 55 + r() * 25][out.econTier]).toFixed(1);
  out.buy = (-(5 + r() * 25)).toFixed(1);

  var cr = r();
  out.conTier = cr < 0.45 ? 0 : (cr < 0.82 ? 1 : 2);
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
  ODDS, RING_CHANCE, GIANT_CHANCE, RACES, ECON, ECON_S, CONFLICT,
  STELLAR_EL, UNIVERSAL_EL, RING_STYLE_BY_BIOME,
  rollSystemFlavor, rollRing,
};
