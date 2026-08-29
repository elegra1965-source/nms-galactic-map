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

## check-atlas-updates.mjs

Manual sanity check for whether Hello Games' own [Galactic Atlas](https://galacticatlas.nomanssky.com/) has added or removed any points of interest since `atlas-pois.json` (used by the map's "Atlas" overlay toggle) was last hand-updated.

```
node nms-tools/check-atlas-updates.mjs
```

It fetches the live Atlas page, regex-scans it for `region-XXXXXXXXXXXX` / `planet-XXXXXXXXXXXX` addresses, and diffs the result against `atlas-pois.json`, printing anything added or removed. It never edits `atlas-pois.json` itself — that's still hand-maintained, on the theory that the list doesn't change often enough to be worth scraping automatically. If it starts turning up real changes often, that's the signal to build a scheduled scraper instead.

**Known limitation:** `galacticatlas.nomanssky.com` appears to block requests from datacenter IPs (confirmed getting an HTTP 403 even with full browser-style headers) — this looks like Cloudflare or similar bot-blocking rather than a header check. Running it from an ordinary home connection should work fine, but if you also get a 403, the script prints a fallback: open the Atlas site in your own browser, open DevTools' console (F12), and paste this to get the same list of addresses by eye:

```js
[...document.querySelectorAll('a[href*="/poi/"]')].map(a=>a.getAttribute("href")).join("\n")
```

---

## License

MIT — see [../nms-core/LICENSE](../nms-core/LICENSE).

Original work by elegra1965. Not affiliated with Hello Games.
