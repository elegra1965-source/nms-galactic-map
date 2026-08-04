# NMS Galactic Map — Project Spec

**Status:** Planning complete, not yet built
**Created:** 2026-08-01 (Session 14)
**Folder:** `C:\Users\elegr\Claude\Projects\NMS Galactic Map`

A fan-made portal decoder + 3D galactic map. Own style, no copied code or assets from
nmsportals.github.io or galacticatlas.nomanssky.com — both were reviewed for
*functionality* only.

---

## Decisions locked in (Tony, Session 14)

| Decision | Choice |
|---|---|
| System data source | Deterministic seeded generation from the galactic address |
| Map type | True 3D, optimised (local slice rendering) |
| System view | 3D orbital scene + docked detail panel overlay |
| Build setup | Vite + React + Three.js (same stack as Living Atlas project) |
| Project scope | New standalone project, reusing shared glyph assets |

---

## The key insight

**A portal address is literally a 3D coordinate.** This is what makes the whole project
coherent — the glyph decoder and the 3D map are the same tool. Enter 12 glyphs, fly to
that exact point in the galaxy.

### Address format

```
[P][SSS][YY][ZZZ][XXX]     12 glyphs, hexadecimal 0-F
 |   |    |   |    |
 |   |    |   |    +-- X / length  (001-FFF)
 |   |    |   +------- Z / width   (001-FFF)
 |   |    +----------- Y / height  (01-FF)
 |   +---------------- Solar System Index (000-FFE)
 +-------------------- Planet Index (0-6)
```

### Voxel grid

- Galaxy = oblong cuboid. Portal network is **4096 x 256 x 4096 regions**
  (radius 2048 regions, height 128 regions).
- Each region is roughly **400ly x 400ly x 400ly**.
- Galaxy is 819,000 ly radius, 51,000 ly height.
- Origin (X, Y, Z = 0) is the **galaxy centre**.
- Centre is **devoid of stars for 3,000 ly** in all directions (~7 axial voxels) —
  render as an empty core with the bright galactic centre glow.

### Signed coordinate wrap (important — easy to get wrong)

Values are effectively two's complement. The midpoint value is **skipped**, not used:

| Axis | Positive direction | Negative direction | Unused |
|---|---|---|---|
| Y (height) | `00`-`7F` = up | `FF`-`81` = down | `80` |
| X (length) | `000`-`7FF` = east | `FFF`-`801` = west | `800` |
| Z (width) | `000`-`7FF` = south | `FFF`-`801` = north | `800` |

To convert address hex to a signed voxel offset:

```js
// v = parsed hex, size = 0x100 for Y, 0x1000 for X/Z
const half = size / 2;
const signed = v < half ? v : v - size;   // 0x801 -> -2047, 0x7FF -> +2047
```

### Galactic Coordinates (signal booster) conversion

Signal booster coords are a *second* system with a different origin — Alpha Minoris
(bottom northwest corner), running `0000:0000:0000:0000` to `0FFE:00FE:0FFE:0000`.
Conversion to portal values is a simple offset:

- Y: galactic `0000` -> portal `81` ... galactic `007F` -> portal `00` ... `00FE` -> `7F`
- X/Z: galactic `0000` -> portal `801` ... galactic `07FF` -> portal `000` ... `0FFE` -> `7FF`

So: `portal = (galactic + half) mod size`, then apply the skip rule.
Note: converting galactic coords always yields **PlanetIndex = 0**.

---

## Hard rules (not random — must be special-cased)

These are guaranteed by the game in **every single region**:

- `SolarSystemIndex = 079` -> **always a Black Hole system**
- `SolarSystemIndex = 07A` -> **always has an Atlas Interface**

Therefore every region has at least 122 systems. Real regions range from ~218
(Sokoli Mass, smallest documented) to 584 (Baadossm Anomaly, largest documented)
accessible systems. Indices above the region's real count are "phantom stars" —
unreachable in game.

**Design call:** generate a per-region system count seeded from the region coords,
in the range 122–600. Always place the black hole at 079 and the Atlas station at 07A.

Planet Index rules:
- Range 1–6. Max **6 celestial bodies total** (planets + moons combined).
- Index 0 means "not on a body" — in an address it silently redirects to index 1.
- Indices above the body count also redirect to 1.
- Moons get *higher* indices than their parent planet (larger aphelion).

---

## System data model (all seeded from address)

### Star colour -> spectral class

| Colour | Classes | Notes |
|---|---|---|
| Yellow | F, G | Most common |
| Red / Orange | K, M | Needs Cadmium Drive |
| Green | E | Needs Emeril Drive (invented class) |
| Blue | B, O | Needs Indium Drive |
| Purple | X, Y | Rare |

Full format: **letter + digit 0-9 + optional suffix** (`f`, `p`, or `pf`).
Example `G6f`. Suffix tags append after: `Water` (ocean worlds), `Dissonant`.

### Star count

- Single (most common)
- Binary (2 stars, each a different colour)
- Ternary (3 stars, each a different colour)

### Race / dominant lifeform

Gek, Vy'keen, Korvax, or uninhabited.
Map filter colours: yellow = Gek, red = Vy'keen, blue = Korvax, white = uninhabited.

### Economy

Seven producing types, each with 4 interchangeable display names:

| Type | Names |
|---|---|
| Trading | Mercantile, Trading, Shipping, Commercial |
| Advanced Materials | Material Fusion, Alchemical, Metal Processing, Ore Processing |
| Scientific | Research, Scientific, Experimental, Mathematical |
| Mining | Mining, Minerals, Ore Extraction, Prospecting |
| Manufacturing | Manufacturing, Industrial, Construction, Mass Production |
| Technology | High Tech, Technology, Nano-construction, Engineering |
| Power Generation | Power Generation, Energy Supply, Fuel Generation, High Voltage |

Strength — three tiers, descriptor shown on the map:

- **Weak (T1):** Declining, Destitute, Failing, Fledgling, Low Supply, Struggling, Unsuccessful, Unpromising
- **Average (T2):** Adequate, Balanced, Comfortable, Developing, Medium Supply, Promising, Satisfactory, Sustainable
- **Strong (T3):** Advanced, Affluent, Booming, Flourishing, High Supply, Opulent, Prosperous, Wealthy

Strong economies are rare. Buy/sell modifiers: sell caps at **+80%**, buy caps at **-30%**.
Display as e.g. `Scientific // Sell: 65.7% Buy: -24.8% // Promising`.

### Conflict level

Three tiers, descriptor shown on the map:

- **Low (1):** Gentle, Low, Mild, Peaceful, Relaxed, Stable, Tranquil, Trivial, Unthreatening, Untroubled
- **Medium (2):** Belligerent, Boisterous, Fractious, Intermittent, Medium, Rowdy, Sporadic, Testy, Unruly, Unstable
- **High (3):** Aggressive, Alarming, At War, Critical, Dangerous, Destructive, Formidable, High, Lawless, Perilous, Pirate Controlled

### Special system flags (probability by star colour)

| Flag | Yellow | Red | Green | Blue |
|---|---|---|---|---|
| Outlaw | 25% | 50% | 15% | 15% |
| Uncharted | 0% | 95% | 40% | 40% |
| Abandoned | 0% | 0% | 10% | 10% |

Uncharted = no structures at all, no space station. Abandoned = ruins only, no animal life.

---

## Assets already owned — reuse, don't rebuild

| Asset | Location | Notes |
|---|---|---|
| **16 portal glyphs** | `_Shared/Glyphs/glyph-mask-0.png` .. `-F.png` | 256x256 RGBA transparent PNGs. This is the glyph keypad. |
| **Design tokens** | `NMS_DESIGN_SYSTEM.md` | Orbitron/Rajdhani, cyan `#00e5ff`, gold `#f0a500`, bg `#070b11`, corner brackets |
| **Three.js stack** | `Build a living cosmic pulsating red orb interface for your AI agent/` | three 0.168, @react-three/fiber 8.17, drei 9.113, Vite 5.4 — installed and proven on this machine |
| **Camera helper pattern** | Same project, `cameraAxes()` helper | Camera-relative axis maths, already debugged |

**Correction to earlier assumption:** the NMS Alphabet Translator uses the NMS *letter*
alphabet font (base64 TTF embedded), which is a **different asset** from the 16 portal
glyphs. The translator's glyph engine is not directly reusable for portal addresses —
use `_Shared/Glyphs` instead. The translator's *UI patterns* (mode toggle, copy/backspace
buttons, install prompt) are still worth copying stylistically.

---

## Performance plan (no dedicated GPU — Intel UHD + Galaxy S26)

The full portal grid is 4096 x 256 x 4096 = ~4.3 billion voxels. Cannot render.

**Approach: local slice rendering.**

1. Render the galaxy shape as a **static particle backdrop** — a few thousand instanced
   points forming the spiral, purely decorative, never interactive.
2. Maintain a **focus voxel**. Generate and render only systems within N regions of it
   (start N small, tune up). Everything is seeded, so stars regenerate identically
   every time you return.
3. Use a **single instanced points mesh** with per-instance colour rather than one mesh
   per star. One draw call for thousands of stars.
4. Raycast against the points mesh for picking — no per-star meshes.
5. Cap device pixel ratio at 2 on mobile.
6. Drill-down system view is a **separate lightweight scene** (max 6 bodies + 1-3 stars),
   so the galaxy scene can be paused while inside it.

**Open risk:** this needs a real device test on the S26 before trusting it. No live
rendering is possible from the Claude sandbox — Tony's `npm run dev` pass is the real
verification step, same as the Living Atlas project.

---

## Build order (proposed)

1. `portal.js` — pure address maths. Parse/format 12 glyphs, hex to signed voxel,
   galactic-coords conversion, validation. **No UI.** Unit-testable with `node`.
2. `generate.js` — seeded system generator. Address in, full system object out
   (star colour, spectral class, star count, race, economy, conflict, flags, bodies).
   Deterministic — same address always yields the same system.
3. Glyph keypad UI using `_Shared/Glyphs` PNGs.
4. 3D galaxy scene — backdrop, local slice, instanced points, camera controls.
5. Picking + info panel (layout already mocked, matches in-game readout).
6. Drill-down system scene — orbits, up to 6 bodies, click a body for its panel.
7. Share links (`?address=...`), PWA manifest + service worker, install button.

Steps 1 and 2 are pure logic with no visual component — they can be built and verified
properly in the sandbox. Steps 4-6 need Tony's local visual pass.

---

## Open questions for next session

- How many regions deep should the local slice go? Needs device testing to tune.
- Should the map show real named regions (Galactic Hub etc.) or stay purely procedural?
- Multiple galaxies (Euclid, Hilbert Dimension, ...) or Euclid only for v1?
- Save/bookmark favourite systems to localStorage?
- Region naming — procedural generator, or leave regions unnamed?

---

## Sources

- Portal address format, voxel grid, signed wrap, black hole/Atlas rules:
  https://nomanssky.fandom.com/wiki/Portal_address
- Star classification, star count, outlaw/uncharted/abandoned odds:
  https://nomanssky.fandom.com/wiki/Star_system
- Economy types, strength descriptors, buy/sell caps:
  https://nomanssky.fandom.com/wiki/Economy
- Conflict level descriptors:
  https://nomanssky.fandom.com/wiki/Conflict_Level
- Spectral class format: https://nomanssky.fandom.com/wiki/Spectral_class
- Galactic coordinates system: https://nomanssky.miraheze.org/wiki/Galactic_Coordinates

Functionality reviewed (not copied): nmsportals.github.io, galacticatlas.nomanssky.com
