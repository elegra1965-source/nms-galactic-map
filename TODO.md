# NMS Galactic Map — TODO

Ideas Tony's raised that are worth doing but weren't built yet, so they don't get lost between sessions. Newest first.

---

## Real per-galaxy addressing: shared data store doesn't know which galaxy a name belongs to (2026-08-21)

Tony's ask, after search started finding real planet/base names: clicking a search result should **switch to the real galaxy that name belongs to**, the same way personal bookmarks/waypoints already do — right now it doesn't, and he correctly called that "not authentic."

### Root cause (confirmed, not guessed)
`data/overrides.json` — the whole shared community data store — is keyed by **address only** (`OVERRIDES.systems[hexAddress]`, see `applyOverride()` in `preview.html`). A portal address genuinely has no galaxy digit in it (confirmed real game behaviour: the same 12-glyph address dialled in two different galaxies takes you to two different systems), so the site currently has no way to know which of the 257 galaxies a documented name was actually submitted for. In practice this means a name shows up identically no matter which galaxy you're browsing — never "not found," just possibly attached to the wrong galaxy's rendering of that address.

### Is the real galaxy recoverable? Yes for bases, mostly no for lone planet/system discoveries — verified directly against Tony's real save (`save-samples from pc/save.hg.deobfuscated.json`), not assumed:

- **`PersistentPlayerBases[].GalacticAddress`** (what `packedAddressToHex()`/`packedAddressToFields()` already decode) is a packed integer with **no galaxy bits in it at all** — confirmed by bit-level cross-check against real non-zero examples, so don't waste time trying to squeeze it out of that field.
- **`PlayerStateData.TeleportEndpoints[]`** (a separate list, one entry per base/waypoint with a teleporter) *does* carry a real, standalone `UniverseAddress.RealityIndex` field (0–255 — this is literally "galaxy index" in the save format, distinct from the `PlanetIndex`/`SolarSystemIndex`/Voxel X-Y-Z fields it sits alongside). Name-matching `TeleportEndpoints[].Name` against `PersistentPlayerBases[].Name` resolved real galaxy for **191 of Tony's 278 real bases** in a direct test this session. All 191 came back galaxy 9 — not Euclid (0), which is where his save's *current* position (`PlayerStateData.UniverseAddress.RealityIndex`) happens to sit right now. That's a real, previously-wrong assumption this site was making.
- **`DiscoveryManagerData` records** (the source for imported planet/system names) carry **no galaxy field whatsoever** — confirmed by reading the raw record shape (`DD.UA`, `DD.DT`, `DM.CN`, `OWS.USN`, nothing else). The only way one of these gets a real galaxy is if its exact address happens to also appear somewhere else in the save with a `RealityIndex` attached (this is how "Sranch Op10079" — a system-name discovery — was confirmed as Euclid: it shares an address with a `TeleportEndpoints` "Rendezvous" entry, not because the discovery record itself says so).

### What building this for real requires
1. **Schema change on the live shared store**: re-key `OVERRIDES.systems` from `address` → `galaxy:address` (matching the pattern `store.marks`/`store.waypoints`/`store.visited` already use client-side). Touches `applyOverride()`, `filter.mjs`, `system-edit.mjs`'s read/write/merge/flag-dispute logic, and `buildSearchIndex()`'s "Documented" pass.
2. **Migrate the ~244 existing community records** — none of them currently have a galaxy, so a decision is needed on a default. Recommend Euclid (0): overwhelmingly the most-played galaxy, and it's this site's own default view, so it changes nothing visually for the common case.
3. **Resolve real galaxy at save-import time**: for base-linked names, cross-reference `TeleportEndpoints[]` by name (proven, ~69% hit rate on Tony's own save — not every base has a teleporter). For standalone planet/system discoveries with no matching teleport point, there is no ground truth — fall back to the save's *current* `UniverseAddress.RealityIndex` and disclose plainly that this is a best guess for anything discovered before a black-hole/portal galaxy change, not a verified fact.
4. **Manual `Edit system` saves are the easy part** — the system being edited is already generated under whatever galaxy is currently active (`sys.galaxy = GALAXY`, set in `generateSystem()`), so recording it at save time is exact, no guessing involved.
5. **Wire the stored galaxy into search-result clicks** — reuse the exact switch-galaxy-and-toast mechanism `buildSearchIndex()`/the search click handler already has for personal bookmarks (`switchGalaxy(gal)` + a toast explaining why), just driven by the newly-real per-record galaxy instead of always defaulting to whatever's currently on screen.

### Why this wasn't built tonight
This touches the live shared data store used by every visitor who's ever run Edit system, not just Tony's own submissions — a schema migration + a live re-key of real community data, not a client-only tweak like tonight's search-by-name work. Wanted Tony's explicit go-ahead before restructuring shared data and accepting the "best guess" fallback for discoveries with no recoverable galaxy. Also worth deciding up front: is a wrong-but-plausible galaxy guess (current fallback) better or worse than just not offering a galaxy switch at all for those specific entries?

---

## Search by name: extend to planets/bases, not just systems — DONE (2026-08-18, built 2026-08-21)

Built and pushed (`3bb0dcb`): `buildSearchIndex()` now also indexes real (non-procedural) planet/moon names via `b.nameOverridden`, and base names via `b.baseName`. Clicking a planet/moon/base result scrolls to and briefly highlights the matching row in the info panel. Empty-state copy and the About modal's "Search by name" entry updated to mention planets/moons/bases.

Deliberately deferred: giving *bulk-imported save-file* base names (the ones that land in `notes` as prose, from `handleBulkImport()`) their own structured field so they're searchable too — a base tagged directly via Edit system's own "Has a base" checkbox already has a clean `baseName` field and is covered by tonight's work; only the save-import path still buries base names in prose. Small, same shape as before, still worth its own pass if it comes up again.
