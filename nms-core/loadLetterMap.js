// Fetches and merges the 8 letter_map_N.json shards into the same shape
// the ported generator.js/system.js/region.js/planet.js functions expect
// (an object keyed "0".."7"). Put the letter_map_*.json files in your
// public/ folder (e.g. public/nms-core/) so Vite serves them as static
// assets without bundling them into your main JS.
//
// Usage:
//   import { loadLetterMap } from './lib/nms-core/loadLetterMap.js';
//   const letterMap = await loadLetterMap('/nms-core');
//   const name = systemName(portalCode, galaxy, letterMap);

let cached = null;

async function loadLetterMap(baseUrl = '/nms-core') {
  if (cached) return cached;

  const shards = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      fetch(`${baseUrl}/letter_map_${i}.json`).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load letter_map_${i}.json: ${res.status}`);
        }
        return res.json();
      })
    )
  );

  const merged = {};
  shards.forEach((shard, i) => {
    merged[String(i)] = shard;
  });

  cached = merged;
  return cached;
}

/**
 * Loads only the shards you actually need (e.g. if you know a given
 * generation call only ever touches alphaset_index 7). Returns a partial
 * object — fine as input to generateName()/systemName()/etc as long as
 * the alphaset indices they end up needing are all present.
 */
async function loadLetterMapShards(indices, baseUrl = '/nms-core') {
  const shards = await Promise.all(
    indices.map((i) =>
      fetch(`${baseUrl}/letter_map_${i}.json`).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load letter_map_${i}.json: ${res.status}`);
        }
        return res.json();
      })
    )
  );

  const merged = {};
  indices.forEach((i, idx) => {
    merged[String(i)] = shards[idx];
  });
  return merged;
}

export { loadLetterMap, loadLetterMapShards };
