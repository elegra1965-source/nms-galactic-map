// Ported from hadsh/nms_namegen (fork of stuart/nms_namegen), MIT licensed.
// https://github.com/hadsh/nms_namegen

import { PRNG, MULTIPLIER } from './prng.js';
import { generateName } from './generator.js';
import { toRoman } from './roman.js';
import { planetSeeds } from './system.js';

const TINY_DOUBLE = 2.3283064370807974e-10;

const ADORNMENTS = [
  'Prime', 'Major', 'Minor', 'Alpha', 'Beta',
  'Gamma', 'Delta', 'Omega', 'Sigma', 'Tau',
];

const STYLES = [
  '%PROCNORM%',
  '%PROCNORM% %ADORNMENT%',
  '%PROCNORM% %NUMERAL%',
  '%PROCNORM% %SHORTCODE%',
  '%PROCLONG% %PROCSHORT%',
  '%PROCSHORT% %LONGCODE%',
  '%PROCNORM%',
  '%PROCNORM% %ADORNMENT%',
  '%PROCNORM% %NUMERAL%',
  'Style 9',
  'New %PROCNORM%',
];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * portalCode, galaxy -> the specific planet seed (BigInt) for the planet
 * index encoded in the portal code (the leading hex digit, "P" in
 * PSSSYYZZZXXX).
 */
function planetSeed(portalCode, galaxy) {
  const pc = BigInt(portalCode);
  const planetId = (pc & 0xF00000000000n) >> 44n;
  const seeds = planetSeeds(pc, galaxy).planet_seeds;
  return seeds[Number(planetId) - 1];
}

function formatLongcode(longcode, digit, alpha) {
  return `${longcode}/${String.fromCharCode(Number(alpha))}${digit}`;
}

function formatShortcode(alpha, num) {
  return `${String.fromCharCode(Number(alpha))}${num}`;
}

/**
 * Returns a planet name given either:
 *   - a raw planet seed (BigInt) as the first argument, with galaxy omitted, or
 *   - a portal code + galaxy, in which case the seed is derived automatically
 *     for the planet index encoded in the portal code.
 *
 * letterMap: parsed letter_map.json (see README for the lazy-loading pattern).
 */
function planetName(planetSeedOrCode, galaxy, letterMap) {
  let seed0 = BigInt(planetSeedOrCode);
  if (galaxy !== undefined && galaxy !== null) {
    seed0 = planetSeed(planetSeedOrCode, galaxy);
  }

  const lowword = seed0 & 0xFFFFFFFFn;
  const highword = seed0 >> 32n;

  let rol16 = ((lowword & 0x0000FFFFn) << 16n) | ((lowword & 0xFFFF0000n) >> 16n);
  rol16 = (rol16 ^ lowword ^ highword) & 0xFFFFFFFFn;

  let seed;
  if (lowword === 0n) {
    seed = (lowword + 1n) * MULTIPLIER + rol16;
  } else {
    seed = lowword * MULTIPLIER + rol16;
  }

  const rng = new PRNG(seed);
  const adornmentIdx = Number(((rng.seed & 0xFFFFFFFFn) * 10n) >> 0x20n);
  const code = rng.random(50) + 1;
  const shortcode = rng.random(0x1a) + 0x41;
  const numeral = rng.random(0x12) + 2;
  const digit = rng.random(0x09) + 1;
  const alpha = rng.random(0x1a) + 0x41;
  const longcode = rng.random(0x59) + 0xb;

  const procnorm = generateName(letterMap, rng, 7, 4, 8);
  const procshort = generateName(letterMap, rng, 5, 4, 5);
  const proclong = generateName(letterMap, rng, 7, 6, 10);

  let namegenStyle = rng.random(9);

  const target = Number(rng.randi()) * TINY_DOUBLE;
  if (!(0.0350000001 <= target)) {
    namegenStyle = 10;
  }

  let name = STYLES[namegenStyle];

  name = name.replace('%PROCNORM%', capitalize(procnorm));
  name = name.replace('%PROCSHORT%', capitalize(procshort));
  name = name.replace('%PROCLONG%', capitalize(proclong));
  name = name.replace('%ADORNMENT%', ADORNMENTS[adornmentIdx]);
  name = name.replace('%SHORTCODE%', formatShortcode(shortcode, code % 0x50));
  name = name.replace('%NUMERAL%', toRoman(numeral));
  name = name.replace('%LONGCODE%', formatLongcode(longcode, digit, alpha));

  return name;
}

export { planetName, planetSeed };
