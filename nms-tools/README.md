# nms-tools

Original helper files by elegra1965 — convenience wrappers built on top of [nms-core](../nms-core/).

These are NOT part of the hadsh/nms_namegen port. Everything in this folder is original work.

---

## nms-lookup.js

Single-call system lookup. Give it a portal address, get back everything about the system.

```js
import { init, getSystem } from './nms-tools/nms-lookup.js';

// Load the letter map once (needed for system/region/planet names)
await init('./nms-core');

// Look up any system by its 12-glyph portal address
const s = await getSystem('0807F07FFFFF', 0); // 0 = Euclid

console.log(s.name);         // "Sranch Op10079"
console.log(s.region);       // "Yihelli Quadrant"
console.log(s.starType);     // "yellow"
console.log(s.planets);      // 4
console.log(s.race);         // "Gek"
console.log(s.economy);      // "Advanced Mining"
console.log(s.conflict);     // "Fractious"
console.log(s.sell);         // "24.5"  (% above average)
console.log(s.coords);       // { x: 2047, y: 127, z: 2047 }
console.log(s.isBlackHole);  // false
console.log(s.isAtlas);      // false
console.log(s.planetNames);  // ["Adkani", "Igrath IV", …]  (unverified guesses)
```

Full return type is documented in the file's JSDoc. Names are available once you call `init()`; everything else (star type, economy, conflict, race, coordinates) works without it.

Requires `nms-core/` and `nms-core/letter-map/` to be hosted at the same level as `nms-tools/`.

---

## License

MIT — see [../nms-core/LICENSE](../nms-core/LICENSE).

Original work by elegra1965. Not affiliated with Hello Games.
