# NMS Galaxy Generation Core (ported from nms_namegen)

A JavaScript/ESM port of the real, disassembly-derived No Man's Sky
generation algorithm from
[hadsh/nms_namegen](https://github.com/hadsh/nms_namegen) (a fork of
[stuart/nms_namegen](https://github.com/stuart/nms_namegen), MIT licensed).
Covers both system/planet **attributes** (star type, planet/moon counts,
black hole/Atlas placement) and **name generation** (system, region, and
planet names), all verified byte-for-byte against the Python source.

**Keep the MIT attribution** (this README + the header comments) if you
publish the project, per the license terms.

## What's in here

| File | What it does |
|---|---|
| `iprng.js` | Threefish/Skein-style 64-bit hash: universal address -> system seed |
| `prng.js` | The game's 32-bit multiplicative PRNG everything else draws from |
| `region.js` | `voxelAttributes()` (black hole/Atlas/guide-star counts by distance from galaxy centre) and `regionName()` |
| `system.js` | `systemAttributes()`, `planetSeeds()`, and `systemName()` |
| `planet.js` | `planetName()` — full planet-naming logic (styles, adornments, short/long codes) |
| `generator.js` | The weighted-Markov name generator both `systemName`/`regionName`/`planetName` are built on |
| `alphasets.js` | 8 character-triplet corpora the generator draws from (~72KB, bundle-safe) |
| `roman.js` | Roman numeral formatting (used in system/planet names) |
| `letter_map_0.json` .. `letter_map_7.json` | The real per-triplet letter-frequency corpus, split into 8 shards (one per alphaset) — see loading notes below |
| `loadLetterMap.js` | Fetches and merges the shards at runtime |
| `index.js` | Barrel file — import everything from here |

All BigInt-based, zero dependencies.

## The structural fix to your existing plan

Your SPEC.md assumed black hole = fixed index `079`, Atlas station = fixed
index `07A`, in every region. The real rule (`voxelAttributes()` in
`region.js`) computes these from the region's **3D distance from the
galaxy centre**:

- Distance < 8 voxels: dead core — zero guide stars, zero black holes,
  zero Atlas stations (`inside_gap: 1`)
- Distance 8–1440 voxels: guide star count tapers down from 120 as you
  move outward, feeding a "renegade star" count that boosts star-type
  variety near the core
- Black hole / Atlas station counts are typically 1 each per region,
  placed wherever the anomaly draw lands — not a fixed slot

## letter_map — loading notes

The original `letter_map.json` was 5.3MB (517KB gzipped) as one file. Split
into 8 shards by alphaset (`letter_map_0.json` .. `letter_map_7.json`,
62KB–1MB each, reassembling to byte-identical content — verified), it's
easier to serve and easier to eventually lazy-load per-shard if you want to
get fancier later. For now, `loadLetterMap.js` just fetches all 8 in
parallel and merges them, which is what the original single-file approach
did anyway — the actual fix is keeping it **out of your main JS bundle**
(don't `import` the JSON files directly, that inlines them) so it doesn't
block first paint.

1. Put all 8 `letter_map_*.json` files in your `public/nms-core/` folder
   (Vite serves `public/` as static assets, untouched).
2. Copy `loadLetterMap.js` alongside your other `lib/nms-core/` files.
3. Call it once, lazily, the first time you need a name:

```js
import { systemName, regionName, planetName } from './lib/nms-core/index.js';
import { loadLetterMap } from './lib/nms-core/loadLetterMap.js';

const letterMap = await loadLetterMap('/nms-core'); // fetches all 8 shards + caches
const name = systemName(portalCode, galaxy, letterMap);
```

If you later want tighter control (e.g. only fetch the shards a specific
call path needs), `loadLetterMapShards([indices], baseUrl)` is also
exported and takes an explicit list of alphaset indices (0-7).

## How to drop it in

1. Copy this folder into your project, e.g. `src/lib/nms-core/`, **except**
   the `letter_map_*.json` shards — move those to `public/nms-core/`
   instead (see above).
2. Attributes (star type, planet count, gas giant, black hole/Atlas
   placement) don't need the letter map at all:

```js
import { systemAttributes, planetSeeds, voxelAttributes } from './lib/nms-core/index.js';

const attrs = systemAttributes(portalCode, galaxy);
// -> { planet_count, prime_planet_count, safe_start_planet, gas_giant, star_type }

const bodies = planetSeeds(portalCode, galaxy);
// -> { planet_seeds: BigInt[], planet_count, moon_count }

const region = voxelAttributes(portalCode);
// -> { guide_star_count, black_hole_count, atlas_station_count, inside_gap, guide_star_renegade_count }
```

3. Names need the (lazy-loaded) letter map as a third argument:

```js
import { systemName, regionName, planetName } from './lib/nms-core/index.js';

const system = systemName(portalCode, galaxy, letterMap);   // "Abarof-Dulin"
const region = regionName(portalCode, galaxy, letterMap);   // "Yihelli Quadrant"
const planet = planetName(portalCode, galaxy, letterMap);   // "Edershar K25"
// planetName also accepts a raw planet seed directly (galaxy omitted):
const p2 = planetName(planetSeedBigInt, undefined, letterMap);
```

4. `attrs.star_type` (0-4) maps directly to your spectral-class table
   (0=yellow/white, 1=green, 2=blue, 3=red, 4=purple).
5. `attrs.gas_giant` means render exactly 1 planet + 5 moons — handle this
   before looping over `planet_seeds`.
6. Everything you've already designed on top — economy, conflict level,
   race, outlaw/uncharted/abandoned display flags, the 3D scene — stays
   exactly as planned; none of it is covered by the disassembly.

## Verification

- `systemAttributes()`, `planetSeeds()`, `voxelAttributes()`: the Python
  reference's own unit tests (10/10) plus 200 randomized cross-checks,
  field-by-field including full seed lists — all exact matches.
- `systemName()`, `regionName()`: 100/100 randomized cross-checks against
  the Python reference, plus both of the source repo's own README examples
  reproduced exactly (`Abarof-Dulin`, `Yihelli Quadrant`).
- `planetName()`: 44/44 randomized cross-checks (6 inputs hit a pre-existing
  edge case in the Python reference itself, unrelated to the port), plus
  both of the source repo's own README examples reproduced exactly
  (`Edershar K25`, `Nutsvill Sigma`).

The Python source itself is corpus-verified against ~1,000-2,700 real
systems from wiki/AGT data (see comments in the original `system.py`).

## Attribution

Original algorithm reverse-engineered by GoodGuysFree and hadsh, building
on Stuart Coyle's `nms_namegen` and Andraemon/monkeyman192's
`SystemNameCalculator`. MIT licensed — see upstream repo for full license
text.
