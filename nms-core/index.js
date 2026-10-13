// Single entry point for the game-accurate NMS generation core.
// Ported from hadsh/nms_namegen (MIT), see README.md for attribution,
// integration notes, and the letter_map.json lazy-loading pattern.

export { indexPrimedPRNG } from './iprng.js?v=20261013';
export { PRNG, MULTIPLIER } from './prng.js?v=20261013';
export { voxelAttributes, regionSeed, regionName, REGION_NAME_ADORNMENTS } from './region.js?v=20261013';
export { systemAttributes, planetSeeds, systemName, sellBuy } from './system.js?v=20261013';
export { planetName, planetSeed } from './planet.js?v=20261013';
export { generateName } from './generator.js?v=20261013';
export { toRoman } from './roman.js?v=20261013';
