// Single entry point for the game-accurate NMS generation core.
// Ported from hadsh/nms_namegen (MIT), see README.md for attribution,
// integration notes, and the letter_map.json lazy-loading pattern.

export { indexPrimedPRNG } from './iprng.js?v=20260906';
export { PRNG, MULTIPLIER } from './prng.js?v=20260906';
export { voxelAttributes, regionSeed, regionName, REGION_NAME_ADORNMENTS } from './region.js?v=20260906';
export { systemAttributes, planetSeeds, systemName } from './system.js?v=20260906';
export { planetName, planetSeed } from './planet.js?v=20260906';
export { generateName } from './generator.js?v=20260906';
export { toRoman } from './roman.js?v=20260906';
