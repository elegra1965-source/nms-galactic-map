// Single entry point for the game-accurate NMS generation core.
// Ported from hadsh/nms_namegen (MIT), see README.md for attribution,
// integration notes, and the letter_map.json lazy-loading pattern.

export { indexPrimedPRNG } from './iprng.js';
export { PRNG, MULTIPLIER } from './prng.js';
export { voxelAttributes, regionSeed, regionName, REGION_NAME_ADORNMENTS } from './region.js';
export { systemAttributes, planetSeeds, systemName } from './system.js';
export { planetName, planetSeed } from './planet.js';
export { generateName } from './generator.js';
export { toRoman } from './roman.js';
