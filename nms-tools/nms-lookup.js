/**
 * nms-lookup.js — elegra1965 (2026)
 *
 * A simple, high-level wrapper around nms-core + economy.js.
 * Takes a 12-character portal hex address and returns everything
 * about a system in one call — no need to understand the underlying
 * module structure.
 *
 * Requires nms-core/ and nms-core/letter-map/ to be hosted alongside this
 * file (or at the paths you pass to init()).
 *
 * Quick start:
 *
 *   import { init, getSystem } from './nms-tools/nms-lookup.js';
 *
 *   await init('./nms-core');               // load letter map once
 *   const s = await getSystem('0807F07FFFFF', 0);  // Euclid = 0
 *
 *   console.log(s.name);         // "Sranch Op10079"
 *   console.log(s.region);       // "Yihelli Quadrant"
 *   console.log(s.starType);     // "yellow"
 *   console.log(s.planets);      // 4
 *   console.log(s.race);         // "Gek"
 *   console.log(s.economy);      // "Advanced Mining"
 *   console.log(s.conflict);     // "Fractious"
 *   console.log(s.isBlackHole);  // false
 *   console.log(s.isAtlas);      // false
 */

import { loadLetterMap } from '../nms-core/loadLetterMap.js';
import { regionName } from '../nms-core/region.js';
import { systemAttributes, planetSeeds, systemName } from '../nms-core/system.js';
import { planetName } from '../nms-core/planet.js';
import { rollSystemFlavor } from '../nms-core/economy.js';

// ── Star type index → human label ──────────────────────────────────────────

const STAR_COLOR = ['yellow', 'green', 'blue', 'red', 'purple'];

// System indices that are always a black hole (0x079) or Atlas Interface (0x07A)
// in every region. These are the real in-game values.
const SSI_BLACK_HOLE = 0x079;
const SSI_ATLAS      = 0x07A;

// ── Module-level letter map cache ──────────────────────────────────────────

let _letterMap = null;

/**
 * Call once before getSystem(). Fetches and caches the 8 letter_map JSON
 * shards from the given base URL (default: '../nms-core').
 *
 * @param {string} [baseUrl='../nms-core'] - where letter_map_0-7.json live
 * @returns {Promise<void>}
 */
async function init(baseUrl = '../nms-core') {
  if (_letterMap) return;
  _letterMap = await loadLetterMap(baseUrl);
}

// ── Simple seeded RNG (mulberry32) ─────────────────────────────────────────
// Used to drive economy/conflict/race rolls. Seeded from the portal code so
// the same address always produces the same flavour.

function mulberry32(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Portal code helpers ────────────────────────────────────────────────────

/**
 * Converts a 12-character glyph string (using digits 0-9 and letters A-F,
 * case-insensitive) to a BigInt portal code.
 *
 * @param {string} hex - e.g. "0807F07FFFFF"
 * @returns {BigInt}
 */
function hexToCode(hex) {
  if (typeof hex !== 'string' || !/^[0-9A-Fa-f]{12}$/.test(hex)) {
    throw new Error(`nms-lookup: invalid portal address "${hex}" — expected 12 hex chars (0-9, A-F)`);
  }
  return BigInt('0x' + hex.toUpperCase());
}

// ── Main API ───────────────────────────────────────────────────────────────

/**
 * Returns a rich object describing a system from its 12-glyph portal address.
 *
 * @param {string} hexAddr - 12-character hex portal address, e.g. "0807F07FFFFF"
 * @param {number} [galaxy=0] - galaxy index (0 = Euclid, 1 = Hilbert Dimension, …)
 * @returns {Promise<{
 *   address:    string,       // the input hex address, upper-cased
 *   galaxy:     number,
 *   name:       string|null,  // system name (null if letter map not loaded)
 *   region:     string|null,  // region name
 *   starType:   string,       // "yellow" | "green" | "blue" | "red" | "purple"
 *   planets:    number,       // total planet + moon count
 *   moons:      number,
 *   gasGiant:   boolean,
 *   safeStart:  number,       // index of the safe-start planet (0-based)
 *   race:       string,       // "Gek" | "Vy'keen" | "Korvax" | "Uninhabited"
 *   economy:    string,       // e.g. "Advanced Mining"
 *   econType:   string,       // e.g. "Mining"
 *   econTier:   number,       // 0 = low, 1 = medium, 2 = high
 *   econDesc:   string,       // tier descriptor, e.g. "Adequate"
 *   sell:       string,       // sell bonus, e.g. "24.5" (percent)
 *   buy:        string,       // buy penalty, e.g. "-18.3" (percent)
 *   conflict:   string,       // e.g. "Fractious"
 *   conTier:    number,
 *   abandoned:  boolean,
 *   uncharted:  boolean,
 *   outlaw:     boolean,
 *   isBlackHole: boolean,
 *   isAtlas:    boolean,
 *   coords: { x: number, y: number, z: number },  // signed voxel coords
 *   planetIndex: number,  // which planet within the system the address lands on
 *   planetNames: Array<string|null>  // one name per body (null if letter map missing)
 * }>}
 */
async function getSystem(hexAddr, galaxy = 0) {
  const code = hexToCode(hexAddr);

  // ── Coordinates ─────────────────────────────────────────────────────────
  // Portal address layout: PSSSYYZZZXXX
  // Voxel coordinates in the portal code are unsigned; convert to signed.
  const rawX = Number((code) & 0xFFFn);
  const rawY = Number((code >> 24n) & 0xFFn);
  const rawZ = Number((code >> 12n) & 0xFFFn);

  // Two's-complement signed conversion (X/Z: 12-bit, Y: 8-bit)
  const x = rawX > 0x7FF ? rawX - 0x1000 : rawX;
  const y = rawY > 0x7F  ? rawY - 0x100  : rawY;
  const z = rawZ > 0x7FF ? rawZ - 0x1000 : rawZ;

  // System index within its region (SSS in portal address)
  const ssi = Number((code >> 32n) & 0xFFFn);

  // Planet index (leading glyph P)
  const planetIndex = Number((code >> 44n) & 0xFn);

  // ── System attributes ────────────────────────────────────────────────────
  // Known crash: systemAttributes throws on ssi === 0 (upstream hadsh bug).
  let attrs;
  try {
    attrs = systemAttributes(code, galaxy);
  } catch (e) {
    attrs = { star_type: 0, planet_count: 3, prime_planet_count: 2,
              safe_start_planet: 0, gas_giant: false };
  }

  const starColorKey = STAR_COLOR[attrs.star_type] || 'yellow';

  // ── Black hole / Atlas ───────────────────────────────────────────────────
  const isBlackHole = ssi === SSI_BLACK_HOLE;
  const isAtlas     = ssi === SSI_ATLAS;

  // ── Names ────────────────────────────────────────────────────────────────
  let sysName    = null;
  let regName    = null;
  let bodyNames  = [];

  if (_letterMap) {
    try { sysName = systemName(code, galaxy, _letterMap); } catch (_) {}
    try { regName = regionName(code, galaxy, _letterMap); } catch (_) {}

    // Planet names — generated per body seed
    try {
      const seeds = planetSeeds(code, galaxy);
      const total = attrs.planet_count;
      bodyNames = Array.from({ length: total }, (_, i) => {
        try {
          const seed = seeds.planet_seeds[i];
          if (seed === undefined || seed === null) return null;
          return planetName(seed, undefined, _letterMap);
        } catch (_) { return null; }
      });
    } catch (_) {}
  }

  // ── Economy / conflict / race ────────────────────────────────────────────
  // Seed from the portal code so results are always deterministic.
  const economySeed = Number(code & 0xFFFFFFFFn);
  const r = mulberry32(economySeed ^ (galaxy * 0x9E3779B9));
  const flavor = rollSystemFlavor(r, starColorKey);

  // Moon count
  const moonCount = attrs.planet_count - attrs.prime_planet_count;

  return {
    address:     hexAddr.toUpperCase(),
    galaxy,

    // Names
    name:        sysName,
    region:      regName,
    planetNames: bodyNames,

    // Star + bodies
    starType:    STAR_COLOR[attrs.star_type] || 'yellow',
    planets:     attrs.planet_count,
    moons:       moonCount,
    gasGiant:    attrs.gas_giant,
    safeStart:   attrs.safe_start_planet,
    planetIndex,

    // Economy / race / conflict
    race:        flavor.race,
    economy:     flavor.econName,
    econType:    flavor.econType,
    econTier:    flavor.econTier,
    econDesc:    flavor.econDesc,
    sell:        flavor.sell,
    buy:         flavor.buy,
    conflict:    flavor.conflict,
    conTier:     flavor.conTier,
    abandoned:   flavor.abandoned,
    uncharted:   flavor.uncharted,
    outlaw:      flavor.outlaw,

    // Special system types
    isBlackHole,
    isAtlas,

    // Coordinates
    coords: { x, y, z },
  };
}

export { init, getSystem, hexToCode, STAR_COLOR };
