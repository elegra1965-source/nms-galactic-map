# nms-core

Game-accurate star type, planet count, black hole / Atlas placement, system/region/planet name generation, and (since 2026-08-23) real economy/wealth/conflict/race/uncharted/abandoned/pirate derivation for **No Man's Sky**, exported as a vanilla ES module.

Ported from [hadsh/nms_namegen](https://github.com/hadsh/nms_namegen) (itself a fork of [Stuart Coyle's](https://github.com/stu-/nms_namegen) original work, co-authored with GoodGuysFree). The probability tables, hash function, and name-generation logic here are reverse-engineered from the game — not invented. See attribution below.

`economy.js` is separate original work (elegra1965) — the economy/conflict/race/outlaw/ring logic that `nms_namegen` never modelled. Its numeric probability tables were decompiled directly from a legitimately-owned game install; see the file header for detail.

`save-import/` is also separate original work — a client-side-only reader for real NMS `.hg` save files (name + real base list), unrelated to the procedural generation the rest of this module does. See [`save-import/README.md`](./save-import/README.md) for the full writeup; it's covered here only for completeness.

Used by the [NMS Galactic Map](https://nms-galaxy-map.netlify.app) — a free, fan-made 3D portal decoder and galaxy explorer.

---

## What's in here

| File | Source | What it does |
|---|---|---|
| `iprng.js` | ported (hadsh) | Threefish/Skein-style 64-bit hash — the game's real seed mixer |
| `prng.js` | ported (hadsh) | 32-bit multiplicative PRNG, seeded from the hash |
| `region.js` | ported (hadsh) | Voxel→region seed, region name, voxel attributes — including real black hole/Atlas placement, corrected 2026-08-23 (see Known limitations) |
| `system.js` | ported (hadsh) | Star type, planet/moon counts, safe-start planet, system name, plus (since 2026-08-23) `economy_type`, `wealth`, `conflict_level`, `dominant_race`, `uncharted`, `abandoned`, `pirate` — the real reverse-engineered algorithm, not a statistical guess |
| `planet.js` | ported (hadsh) | Per-planet name from the system seed |
| `generator.js` | ported (hadsh) | Weighted-Markov name assembler |
| `roman.js` | ported (hadsh) | Roman numeral formatter (moon suffixes) |
| `alphasets.js` | ported (hadsh) | Character-triplet corpora for name generation |
| `loadLetterMap.js` | ported (hadsh) | Lazy loader for the 8 letter_map JSON shards |
| `economy.js` | original (elegra1965) | Economy/conflict/race/outlaw/abandoned/ring logic with real decompiled probability tables |
| `letter-map/` | ported (hadsh) | 8 JSON data shards required by the name generator (~3 MB total) |
| `save-import/` | original (elegra1965), + real mapping data from oxur/nms-copilot | Client-side `.hg` save file reader — see its own [README](./save-import/README.md) |

---

## Usage

### Loading the module

The module is pure ES module (`type="module"`). In a browser:

```html
<script type="module">
  import * as NMSCore from './nms-core/index.js';
  import { rollSystemFlavor, rollRing } from './nms-core/economy.js';
</script>
```

Or in Node.js / a bundler:

```js
import * as NMSCore from './nms-core/index.js';
import { rollSystemFlavor, rollRing } from './nms-core/economy.js';
```

### Loading the letter map (required for name generation)

Planet/system/region names need the letter map shards. Load them once before calling any name functions:

```js
import { loadLetterMap } from './nms-core/loadLetterMap.js';

// Pass a base URL so the shards can be fetched
const letterMap = await loadLetterMap('./nms-core/letter-map/');

// Then pass it into name functions
const name = NMSCore.systemName(seed, letterMap);
```

Planet names are expensive to generate for large batches. If you're iterating many systems, generate system/region names eagerly and planet names lazily (only for the system a user actually opens).

### Getting system data from a portal address

A 12-glyph portal address encodes a 3D position. Convert glyphs to a hex string, then:

```js
import { voxelAttributes } from './nms-core/region.js';
import { systemAttributes } from './nms-core/system.js';

// "0807F07FFFFF" — 12 hex chars (glyphs 0–F)
const addr = "0807F07FFFFF";

// Parse into coordinates
const planet = parseInt(addr[0], 16);           // glyph 0: planet index
const ssi    = parseInt(addr.slice(1,4), 16);   // glyphs 1-3: system index within region
const y      = parseInt(addr.slice(4,6), 16);   // glyphs 4-5: Y voxel (signed)
const z      = parseInt(addr.slice(6,9), 16);   // glyphs 6-8: Z voxel (signed)
const x      = parseInt(addr.slice(9,12), 16);  // glyphs 9-11: X voxel (signed)

const voxel = voxelAttributes(x, y, z, 0); // 0 = Euclid
const attrs = systemAttributes(voxel.regionSeed, ssi, letterMap);

console.log(attrs.starType);    // e.g. "F2p" (yellow dwarf with planet variant)
console.log(attrs.numPlanets);  // e.g. 4
console.log(attrs.name);        // e.g. "Sranch Op10079"
```

### Economy, conflict, race

```js
import { rollSystemFlavor, rollRing, ECON, CONFLICT, RACES } from './nms-core/economy.js';

// mulberry32-style seeded RNG, or any function returning [0,1)
function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

const rng = makeRng(attrs.seed);
const flavor = rollSystemFlavor(rng, attrs.starType[0]); // first char = colour key

console.log(flavor.race);       // "Gek" | "Vy'keen" | "Korvax" | "Uninhabited"
console.log(flavor.economy);    // e.g. "Advanced Mining"
console.log(flavor.conflict);   // e.g. "Fractious"
console.log(flavor.abandoned);  // true/false
console.log(flavor.uncharted);  // true/false
console.log(flavor.outlaw);     // true/false

// Per-planet ring roll (not per system)
const bodyRng = makeRng(planetSeed);
const ring = rollRing(bodyRng, "Frozen", false); // (rng, biome, isMoon)
// Returns false | "icy" | "tan" | "ash" | "gold" | "split"
```

**2026-08-23: the real algorithm, not a guess — and now wired together.** `system.js`'s `systemAttributes()` returns the actual reverse-engineered economy/wealth/conflict/race/uncharted/abandoned/pirate values, drawn from the same RNG stream already used for `star_type`/`planet_count` — corpus-validated to 98–99% accuracy against 1000 real systems, not an approximation:

```js
const attrs = systemAttributes(portalCodeBigInt, galaxyIndex);

console.log(attrs.economy_type);    // 1-7: trading/advanced materials/scientific/mining/manufacturing/technology/power generation
console.log(attrs.wealth);          // 1-3: low/medium/high
console.log(attrs.conflict_level);  // 1-3: low/medium/high
console.log(attrs.dominant_race);   // 0-3: none/Gek/Korvax/Vy'keen
console.log(attrs.uncharted);       // true/false
console.log(attrs.abandoned);       // true/false
console.log(attrs.pirate);          // true/false
```

`rollSystemFlavor()` above (independent word-pool rolls, star-colour only) used to be the only way to get race/economy/conflict text out of `economy.js`, with no connection to `attrs` at all. As of this same date, `economy.js` also exports **`rollSystemFlavorFromAttrs(rng, attrs)`** — pass it the real `attrs` object above and it takes economy_type/wealth/conflict_level/dominant_race/uncharted/abandoned/pirate as given, only rolling what `systemAttributes()` still doesn't model: which specific word to show within that type/tier (`econName`/`econDesc`/`conflict`), and sell%/buy% (refit this same day against 822 real corpus records — see the function's own header in `economy.js` for the numbers). This is now the preferred path whenever a portal code is available (i.e. almost always); `rollSystemFlavor()` stays as the fallback for when it isn't. `preview.html`'s `generateSystem()` was updated to call it this way:

```js
const flavor = rollSystemFlavorFromAttrs(rng, attrs); // preferred: attrs is real
// vs. flavor = rollSystemFlavor(rng, attrs.starType[0]); // fallback: no portal code
```

### Biome/Sentinel-flavoured planet names (optional)

`planetName()` takes an optional 4th `opts` argument: `{biome, sentinel}`. When
supplied, the generic Prime/Major/Omega-style adornment word swaps for a
pool matched to that biome (e.g. Lush leans toward "Verdance"/"Bloom",
Volcanic toward "Cinder"/"Magma"), with a hostile-Sentinel-activity pool
taking priority over biome when both are given. Omit `opts` entirely (or
call with the original 3-arg signature) and output is byte-identical to
before this was added — every existing caller keeps working unchanged.

```js
const name = NMSCore.planetName(seed, undefined, letterMap, { biome: "Volcanic", sentinel: "Aggressive" });
```

Still a disclosed stylistic guess, not a real algorithm — see "Known
limitations" below and `planet.js`'s own header comment for why.

---

## Known limitations

- **Planet names** are a plausible, unverified reverse-engineering guess. Star type, region names, and system names were validated against a real corpus; planet naming was not. `nms_namegen`'s own README says the same.
- **Economy/wealth/conflict/race/uncharted/abandoned/pirate** (`system.js`'s `systemAttributes()`, added 2026-08-23) *are* the real, reverse-engineered algorithm — validated against upstream's own 10 unit-test vectors, 443 golden regression vectors, and 1000 real ground-truth systems (star colour 99.10%, uncharted 99.80%, dominant race 99.10%, conflict level 99.03%, economy category 99.02%, wealth tier 98.90%, planet count 98.80%). Not currently wired into this project's own live site (`preview.html` still rolls economy/race/conflict through a separate, independently-seeded RNG in `economy.js`) — that's a deliberate, still-open integration task on the consuming site's side, not a limitation of this module.

Two limitations that used to be listed here were fixed 2026-08-23 and no longer apply, kept below for anyone tracking an older copy of this module:

- ~~The hash function (`iprng.js`) crashes on region-local system index 0 in every region.~~ **Fixed.** Python's `o[-1]` list indexing wraps to the last element; a plain JS array returns `undefined` at a negative index instead, which crashed on the exact input that produces `oCounter=-1`. `iprng.js` now wraps the index explicitly to match Python's behaviour.
- ~~Black hole / Atlas placement uses raw unsigned portal-code bits, not signed voxel coordinates. The dead-core fix is only symmetric in the positive-coordinate octant.~~ **Fixed.** `voxelAttributes()` in `region.js` now folds x/y/z to signed offsets from the galactic centre before computing distance, matching the game's own coordinate model in every octant, not just the positive one. This was also missing an integer-truncation step on the centre-distance calculation, fixed at the same time.

---

## Attribution

The name-generation logic in this module (all files except `economy.js`) is a JavaScript port of [hadsh/nms_namegen](https://github.com/hadsh/nms_namegen), itself a fork of [Stuart Coyle's original nms_namegen](https://github.com/stu-/nms_namegen), co-authored with GoodGuysFree. hadsh's repository states this work is MIT-licensed. Credit for the underlying reverse-engineered generation algorithms belongs to:

- **Stuart Coyle** — original author
- **GoodGuysFree** — co-author of the hadsh fork
- **hadsh** — fork maintainer

Each ported file carries a "Ported from hadsh/nms_namegen (MIT licensed)" comment with the upstream URL at the top, per MIT's own requirement that the original notice travel with the code.

`economy.js` is original work by elegra1965, licensed MIT separately. Its probability tables are decompiled from a legitimately-owned NMS install; see the file header for detail.

---

## License

MIT — see [LICENSE](./LICENSE).

This module is a fan project and is not affiliated with, sponsored by, or endorsed by Hello Games.
