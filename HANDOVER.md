# NMS Galactic Map — Handover

**Session 32 (2026-08-14) — Cowork, Tony away, worked solo through his "In No Man's Sky hyperdrive types.docx" task list (12 items), researching and self-confirming each before moving on, per his explicit instruction not to wait for him.**

Tony uploaded a docx with 12 numbered asks about adding real hyperdrive-type gating (which drives reach which star colours) plus several smaller filter/edit/research items, and said to work through them one by one, research where needed, and ship everything in one sweep since he wouldn't be back until his laptop session. Read the doc first (python-docx, since it's not directly readable) and transcribed all 12 items exactly before starting anything.

**Task 2+3 - hyperdrive TYPE gating + filter UI.** The existing `fHyper` select was already a pure LY-range picker for course-plotting math, with no concept of drive TYPE or star-colour access at all. Added a new `HYPER_DRIVES` table (Standard->yellow, Cadmium->+red, Emeril->+green, Indium->+blue, Atlantid->+purple - transcribed directly from Tony's own doc, each tier backwards-compatible with every lower one, matching his own "Information to take into account" section) plus `canReachColor()`/`minDriveForColor()`/`driveNeededMsg()` helpers. Clicking a star your selected drive can't reach now shows a toast - "Need [Drive] to reach [Colour] star systems" - matching the doc's exact wording, but still opens the info panel (doesn't block browsing/planning, only actual travel actions). "Enter system" and "Jump to" (the plotted-course travel button) hard-block with the same message if the target's colour is out of reach; the plain address-box Jump/Random/Glyphs stay unrestricted since those are map-navigation/lookup tools, not a simulated hyperdrive jump - a deliberate distinction, flagged here for Tony to weigh in on if he disagrees.

**Task 4 - "don't just jump between [the drive's max] colour, mix in lower ones too" (the one item marked "ask questions to confirm").** Tony's away, so rather than block on this, reasoned it through from his own doc's own stated mechanic (each drive is backwards-compatible with every lower tier) and verified the fix with a real test rather than guessing: `findRoute()`'s candidate search now filters hops to any colour in the CURRENT drive's whole reach set, not just its top tier - an Indium-drive route freely mixes blue/green/red/yellow hops, never just blue. New standalone `starTypeForIdx()` helper (deliberately NOT a refactor of `generateSystem()` itself - extracting its inline star-type logic into a differently-seeded helper would have shifted every later `r()` draw by one and silently changed every downstream field whenever nms-core isn't loaded, exactly the kind of determinism bug this project has been burned by before; verified the standalone version is byte-identical via a 200,000-trial Node parity test) gives `regionCandidates()` a real colour per candidate to filter on. Verified with a dedicated Node harness extracting the real shipped `findRoute`/`regionCandidates` code: 300 Standard-drive trips / 1,199 intermediate hops were 100% yellow (0 failures); 200 Indium-drive trips / 891 hops mixed all 4 reachable colours (yellow/red/green/blue) with zero purple leaks; the old unrestricted behaviour is still reachable via a 4th `driveGateRoute` parameter defaulting falsy, so nothing else that might call `findRoute()` in the future breaks by accident. **This is the one design call made without Tony's live input - flagging clearly in case he wants it done differently.**

**Task 5 - info panel now shows the gating status directly:** a red "Need [Drive] to reach [Colour] star systems" tag appears on any selected system your current drive can't reach, alongside the existing tags.

**Task 6 - Filters panel redesign.** Adding a 2nd hyperdrive dropdown plus 2 new checkboxes on top of the existing 8 filter controls would have made the box noticeably longer, so per Tony's own "slides right" suggestion, hyperdrive type+range moved into a new slide-out sub-panel (reusing the exact `sideL`/`sideR` "expand into whichever side has room" mechanism already built for the accessibility popup's Rendering-tuning panel) reached via a single "Hyperdrive" button showing a live summary ("Standard // 101 LY"). **Simplified from Tony's literal "slides right, then right again" (two chained panels) to one panel containing both pill-rows (drive type, then jump range) stacked vertically** - flagged as a deliberate scope simplification for reliability; easy to split into two if he'd rather have the literal two-hop version once he's seen it.

**Task 7 - filter galaxy by colour.** Added a small "Any type/Normal/Harsh/Empty/Lush" dropdown next to the galaxy selector that narrows the 257-entry list down to just galaxies of that type (using the already-existing, wiki-verified `galaxyType()`/`GALAXY_TYPES` data), auto-jumping to the first match if your current galaxy gets filtered out.

**Task 8 - gas giants, not "giant planet".** Researched first: gas giants ARE confirmed real-game-exclusive to purple systems (Steam Community + nmsguide.com), always 1 giant + 5 moons, no other planets - which is exactly what this project's existing `s.giant` flag (driven by nms-core's real decompiled `gas_giant` attribute since Session 28) already modelled correctly. This was purely a naming/UI issue, not a data issue - renamed the filter checkbox, Edit-system checkbox, info-panel tag, and both client/server validation messages from "Giant planet" to "Gas giant" throughout, with a note in the Edit modal's tooltip explaining the rename so a returning visitor isn't confused.

**Task 9 - ruins in Edit system.** Researched: Ancient Ruins are a real surface POI (Knowledge Stones + memoir device, sometimes a buried Artifact Ruin) with no confirmed procedural placement rule found anywhere in this project's own decompiled-GLOBALS research (Session 30) - so, same as black hole/Atlas/rings before it, added as a manual-only "Ruins present" checkbox in Edit system's Special Features, wired through the full pipeline: `applyOverride()`, the save payload, `filter.mjs`'s allowlist, and a new `ruins` tag in the info panel.

**While wiring ruins through, found and fixed a real pre-existing bug, unrelated to this task list:** `system-edit.mjs`'s actual save path only ever persists the 12 fields listed in its `TOP_CATS` array (via `getCategoryValue`/`applyCategoryValue`) - and `phantom` (Phantom/Shadow Star, built in Session 29) was never added to that list. It was validated by `filterSystemEdit()` and shown correctly in the Edit modal the whole time, but a submitted phantom/shadow flag was silently dropped before it ever reached the shared data store - never actually saved. Added both `ruins` and `phantom` to `TOP_CATS`/`getCategoryValue`/`applyCategoryValue` together, same one-line-per-field pattern as every other entry. Deliberately did NOT add `ruins` to the flag/dispute "Data looks wrong" picker (`FLAG_CATEGORIES`) this round - it'll save/load/display correctly but isn't flaggable/disputable by other visitors yet, a disclosed scope cut given the size of the rest of this list.

**Task 10 - star-code research ("p = peculiar could be ruins etc").** Researched properly rather than guessing: real astronomy calls a "p" suffix "peculiar" (unusual spectrum), and in NMS specifically, community discussion confirms the f/p/pf suffix's actual in-game effect (if any) is genuinely debated/unconfirmed - found nothing tying it to ruins or anything else. Added an honest note to the About modal explaining this, and deliberately did NOT wire any mechanic (like ruins odds) to the suffix, since that would mean inventing a rule this project's own research couldn't confirm.

**Task 11 - waypoints for places you can't reach yet.** Researched: no real in-game "waypoint for an out-of-range system" mechanic exists (the real Galactic Map simply won't let you plot to a system you can't reach) - this is a tool-only planning aid, not a reproduction of something in the game, disclosed as such. Built `store.waypoints` (personal, localStorage-only, exported/imported alongside notes/marks) with a new "Waypoint" button on the system panel, an amber marker in both Local and Galaxy views, a "Waypoints" filter checkbox, and a tag in the info panel. When "Jump to" is blocked by drive gating (task 2), the toast now explicitly suggests using Waypoint instead of just saying no.

**Task 12 - visited/base tagging, explicitly "not a priority, just thoughts... give feedback".** Feedback first, since that's what was actually asked for: auto-tracking **visited** systems is genuinely useful and cheap (just "have you ever jumped here", reuses the exact bookmark/localStorage machinery, zero UI cost since it can be fully automatic) - built it: `store.visited` marks a system the moment it becomes your real jump target (not the silent boot/galaxy-switch re-anchor), shown as a plain "Visited" tag and a new filter checkbox. A separate manual **"base here" tag**, by contrast, I'd recommend against as its own feature: this tool has no access to a player's real save file, so it could never confirm an actual in-game base either way - a manual "I put a base here" flag would be functionally identical to just Bookmarking the system with a note in Surveyor notes, which already exists. Started building `store.bases` alongside `visited` and then removed it once I'd reasoned through this, rather than ship unused plumbing with no real reason to exist. On the "boundaries/errors" half of the ask: the main real risk with visited-tracking is storage growth for a heavy explorer over months (thousands of localStorage keys) - not a problem at any realistic scale, but worth knowing the ceiling exists. Also worth deciding later: should Bookmark and Visited be visually distinguishable at a glance in Local view, or is the tag-on-click enough? Left as Tony's call, not guessed at.

**Verification, since Tony wasn't here to confirm each step live:** `node --check` on all 3 extracted `preview.html` script blocks (classic x2 + the ESM module block, re-checked as real `.mjs` syntax) and both touched `netlify/functions/*.mjs` files - all pass. A tag-balance pass (0 new mismatches; the one pre-existing `['html','body','admin']` false-positive was confirmed present in the Session-31 backup too, not introduced this session). An ID-existence check (every `getElementById()` target in the final file resolves to a real `id=` in markup, 0 missing, 0 duplicates). The `starTypeForIdx()` determinism-parity test and the `findRoute()` colour-gating test described above. No live browser rendering was possible from this sandbox (same standing limitation as every prior session) - the actual on-screen look of the new Hyperdrive slide-out panel, the toast wording/timing, and the amber waypoint markers all still need Tony's own device pass before being trusted, same as every other visual feature in this project's history.

**Not deployed** - this session touched both `preview.html` and `netlify/functions/system-edit.mjs` + `netlify/functions/filter.mjs`, so it needs the same combined push as every session that's touched the server-side allowlist (all three files together, `data/overrides.json` excluded as always). Full list of what changed, for a quick self-review before pushing:
- `preview.html`: HYPER_DRIVES table + helpers, Filters panel (Hyperdrive slide-out, Waypoints/Visited/Reachable-only checkboxes, Gas giant rename), galaxy-type filter dropdown, star-click/Enter-system/Jump-to gating, `findRoute`/`regionCandidates` colour filtering, waypoint button + store + galaxy/local markers, auto-visited tracking, Edit-system Ruins checkbox + full wiring, About modal star-code note, hyperdrive first-time-notice text updated to match the new UI.
- `netlify/functions/filter.mjs`: `ruins` field added to the allowlist, Gas giant validation message wording.
- `netlify/functions/system-edit.mjs`: `ruins` AND `phantom` added to `TOP_CATS`/`getCategoryValue`/`applyCategoryValue` (the phantom half is the bugfix described above, not a task-list item).

---

**Session 30, continued once more — extracted the economy/conflict/race/ring logic into a standalone, shareable `nms-core/economy.js` module.**
Tony asked a fair question after the ODDS/RING_CHANCE/draw-order fixes above: since those fixes lived in `preview.html`, and he specifically wanted a JavaScript module in `nms-core/` he could share (the way `hadsh/nms_namegen` is shared — a plain HTML file isn't reusable in someone else's build), why weren't they in the module? Answer: `nms-core` is a port of `hadsh/nms_namegen`, and that upstream library never modeled economy/conflict/race/rings at all (confirmed earlier this session) — so there was nothing to port for that part; it's always been this project's own separate, original logic sitting in `preview.html`.

Built `nms-core/economy.js` as a new standalone ES module — genuinely original work (not a port), documented as such in its own header, with the real decompiled-GLOBALS sourcing for `ODDS`/`RING_CHANCE` cited inline (same citations as the `preview.html` comments) and the invented parts (race/economy/conflict name pools, tier thresholds, biome→ring-style pairing) honestly flagged as this project's own flavour logic, not extracted from the game. Exports the data tables (`ODDS`, `RING_CHANCE`, `GIANT_CHANCE`, `RACES`, `ECON`, `ECON_S`, `CONFLICT`, `STELLAR_EL`, `UNIVERSAL_EL`, `RING_STYLE_BY_BIOME`) plus two pure functions: `rollSystemFlavor(r, starKey)` (abandoned/uncharted/outlaw/race/economy/conflict, matching the real draw order fixed earlier this session) and `rollRing(br, biome, isMoon)`. Both take a caller-supplied seeded RNG function, so anyone can `import` this file standalone and get NMS Galactic Map's real system-flavour generation without needing any of the rest of the site.

Wired `preview.html` to use it: the module `<script type="module">` loader now also imports `economy.js` and bridges it onto `window.NMSEconomy`, alongside the existing `window.NMSCore` bridge. `generateSystem()`'s flavor-roll block and the per-planet ring-roll now call `window.NMSEconomy.rollSystemFlavor()`/`rollRing()` when available, falling back to an identical inline copy of the same logic otherwise (same fallback pattern as `window.NMSCore` elsewhere in this function, for file:// or a module-load failure). Verified the module and the fallback are **byte-identical**, not just similar: a from-scratch 200,000-trial Node parity test ran the OLD inline formulas (extracted verbatim) and the NEW module functions side by side off matching seeds, asserting identical output AND identical downstream RNG state (critical since `r`/`br` are shared, reused for later draws like the fallback body-count total and each body's size/tilt/spin — a mismatch in how many times either path calls the rng would have silently desynced every draw after it) — 400,000 checks, zero mismatches. A separate 50,000-trial smoke test confirmed the module's real shape/logic (required fields present, tiers in range, uncharted/abandoned systems always "Uninhabited", moons never getting rings) with no runtime errors.

**Verified:** `node --check` on `nms-core/economy.js` and all 3 extracted `preview.html` script blocks (module block explicitly re-checked as `.mjs` to confirm real ESM syntax validity), a tag-balance pass (0 mismatches), an ID-existence check (181 targets, all present, unchanged), and a diff against a pre-edit backup confirming exactly the 3 intended blocks changed (the module-loader import/bridge, the flavor-roll call site, the ring-roll call site) — nothing else touched. **Not deployed** — this time needs `preview.html` AND the new `nms-core/economy.js` file pushed together (the module won't resolve otherwise, same as every other `nms-core/*.js` file), `data/overrides.json` excluded as always. Confirmed via a direct fetch of the live site that the REST of `nms-core/` (the 10 files from Session 28) is already deployed and reachable — so this is just one new file joining an already-live folder, not a fresh from-scratch upload.

**Session 30 (2026-08-12) — real economy/conflict/race data hunt via actual game-file decompilation, per Tony's own mobile-Claude plan.**
Continuing straight on from the session where Tony asked for accurate economy/conflict/race/faction/outlaw generation logic. First checked `hadsh/nms-tessera` (the repo Tony believed `nms-core` came from) directly on GitHub — confirmed it's actually an unrelated save-file-to-story-seed tool, not a proc-gen source. Traced the real precedent to `hadsh/nms_namegen` (the actual repo `nms-core` was ported from) and read its `system.py` directly — confirmed zero economy/conflict/race/faction logic exists there either, just star type/planet count/abandoned-flag. Reported this to Tony, who'd separately asked "Claude on mobile" for a plan and got back a docx (`creating java script to proc-gen economy etc in nms.docx`): install NMS Mod Tool (nexusmods.com/nomanssky/mods/4312, wraps `libMBIN`), unpack Tony's own legitimately-owned Steam game files, and decompile the relevant `GLOBALS` `.MBIN` files to real readable XML.

Tony gave full go-ahead to execute this via computer-use himself. Installed NMS Mod Tool (needed a separate .NET Desktop Runtime 10 install first), unpacked all 97 of Tony's game PAKs (184,821 files, ~15min), and worked through a real environment blocker: Windows File Explorer's ribbon Copy/Paste silently no-op'd every time (confirmed via a clean Desktop paste-in-place test), and Explorer's tier restrictions block right-click/keyboard shortcuts entirely, so there was no obvious workaround. Fixed properly rather than fighting it further — used `request_cowork_directory` to mount the unpacked `GLOBALS` folder (then the whole `Unpacked` tree) directly, giving Read/Grep/Bash real access to any file NMS Mod Tool decompiled, with zero copy-paste needed at all. (One near-miss caught mid-session: an errant click almost triggered NMS Mod Tool's "Clean Destination" — would have deleted the entire 184,821-file unpack — caught via the confirmation dialog and cancelled before anything was lost.)

Decompiled and read through the real candidates systematically: all of `GLOBALS` (`GCSOLARGENERATIONGLOBALS`, `GCGALAXYGLOBALS`, `GCGAMETABLEGLOBALS`, `GCSIMULATIONGLOBALS`, `GCGAMEPLAYGLOBALS`, `GCCHARACTERGLOBALS`, `GCSETTLEMENTGLOBALS`), `METADATA/REALITY/TABLES/TRADINGCLASSDATATABLE.MBIN`, and `METADATA/SIMULATION/SOLARSYSTEM/VOXELGENERATORSETTINGS.MBIN` (grepped, 4.4MB decompiled). Real finds:
- `GCSOLARGENERATIONGLOBALS.GLOBAL.MBIN` had exactly what mattered: `AbandonedSystemProbability`/`EmptySystemProbability`/`PirateSystemProbability` tables keyed Yellow/Green/Blue/Red/Purple, plus `PlanetRingProbability` (0.30), `ExtremePlanetChance`, and `PercentChanceExtraPrime` (33 — which independently matches the `33` threshold already corpus-verified inside `nms-core/system.js`'s prime-planet draw, a nice cross-check that both totally separate reverse-engineering methods landed on the same real constant).
- `GCGALAXYGLOBALS` confirmed the real economy category names (Mining/HighTech/Trading/Manufacturing/Fusion/Scientific/PowerGeneration), conflict filter tiers (Low/Default/High/Pirate), and — new information — a fuller race/faction filter list than this project currently uses (Traders/Warriors/Explorers/Robots/Atlas/Diplomats/Exotics/Builders/None vs. the current `RACES=["Gek","Vy'keen","Korvax"]`). Flagged for Tony, not acted on — unclear whether those extra categories are alternate per-system races or unrelated UI filter buckets (Atlas/Builders overlap with mechanics this project already tracks separately), so it needs his call before changing core generation behaviour.
- `TRADINGCLASSDATATABLE.MBIN` gave real Sells/Needs trade-category pairs per economy and price-multiplier ranges — interesting flavour data, but the multiplier ranges turned out identical across all 7 economy types in the base table, so porting it wouldn't actually change this project's existing tier-based sell/buy% formula in any meaningful way. Not implemented.
- No file anywhere (including a full-tree filename sweep for ECONOMY/CONFLICT/FACTION/REALITYTABLE) contained an actual "which economy/conflict/race does THIS system get" assignment formula — concluded, same as the `nms_namegen` author before, that this lives in the compiled game binary, not tunable MBIN data.

**Presented findings to Tony before writing anything** (per the standing rule on complex tasks) — he chose "build it with what I found." Scope ended up small and surgical since the real data mostly *confirmed* existing values rather than requiring new code: `preview.html`'s `ODDS` table (abandoned/uncharted/outlaw odds by star colour) already matched the real numbers exactly for yellow/green/blue/red — only **purple** was off (out .15→.05, unc .40→.20, aba .10→.35, now corrected using the real Pirate/Empty/Abandoned probabilities). `RING_CHANCE` corrected from a 0.22 placeholder to the real 0.30. Both changes cited inline with the exact source file and how it was obtained, and the now-stale "Tony, adjust once you've got a feel for it" comment on `RING_CHANCE` was cleaned up since it's real data now, not a guess. Race/economy/conflict category names, the new fuller race-filter list, and the real trade Sells/Needs pairs were all deliberately left untouched — flagged as optional follow-ups, not folded in silently, since they're either unclear in scope (race list) or wouldn't actually change behaviour (trade multipliers).

**Verified:** `node --check` on the extracted script (pass), a tag-balance pass (0 mismatches), and a diff against a pre-session backup confirming exactly the 2 intended value/comment blocks changed — nothing else touched. **Not deployed** — same `preview.html`-only GitHub push needed as every prior session, `data/overrides.json` excluded as always. One housekeeping note for next session: a stray full copy of the NMS Mod Tool app + an empty/stale `Unpacked` folder ended up inside this project's own folder (`NMS Galactic Map/NMSModTool/`) from an early mis-click before the `request_cowork_directory` fix — harmless (not referenced by anything, won't get swept into a GitHub push since only `preview.html` + `netlify/functions/` ever get pushed), but worth deleting next time Tony's around to confirm, since Projects-folder deletes need his explicit OK.

**Session 30, follow-up same day — verification sweep on the ODDS/RING_CHANCE fix, which surfaced a second real bug.** Tony asked for a proper sweep to confirm the earlier fix actually works, batched efficiently. Ran: `node --check` (pass), tag-balance (0 mismatches), ID-existence (181 targets, all present), a diff against the pre-sweep backup (only the intended blocks touched), a 1,000,000-trial Monte Carlo of the exact shipped `RING_CHANCE` line (30.02% actual vs 30% target), a 500,000-trials-per-colour Monte Carlo of the exact shipped `ODDS` draw logic, and a regression smoke-test of `nms-core` against real addresses (still healthy; the only 2 failures were the already-documented pre-existing idx=0 upstream bug, not a new issue).

The ODDS sweep surfaced a real, previously-unnoticed structural issue: the shipped code rolled `uncharted` FIRST and gated `abandoned`/`outlaw` behind `!uncharted` — so purple's real 35% abandoned rate was only landing at ~28% of purple systems in practice, because 20% of them got claimed as uncharted first. Cross-checked against `nms-core`'s own corpus-verified real draw sequence (the `ABANDONED_SYSTEM_PCT` comment in `system.js`: "when a system is abandoned, the empty-system check draw is SKIPPED") — the real game rolls **Abandoned first, unconditionally**, and only attempts the empty/uncharted check if the system wasn't already abandoned, the opposite order from what this project had. Flagged to Tony rather than silently fixing a structural/logic change; he said yes, fix it. Swapped the roll order in `generateSystem()` (`s.abandoned=r()<o.aba; s.uncharted=!s.abandoned&&(r()<o.unc); s.outlaw=!s.uncharted&&(r()<o.out);`) — outlaw's own gate (behind `!uncharted`) deliberately left untouched, since `nms-core` doesn't model pirate/outlaw at all and there's no real evidence for where it belongs in the sequence. Re-ran the full verification suite plus a fresh Monte Carlo against the new shipped order: abandoned's population-wide rate now matches its raw table value exactly for every star colour (e.g. purple 0.3502 actual vs 0.35 target), confirming the fix is real and correct. **Not deployed** — same `preview.html`-only push as the rest of this session.

**Session 30, follow-up same day — Tony asked whether the fuller race/faction list should actually be added, and whether the About/disclaimer modal needed a check.** Researched properly before answering rather than guessing either way: fetched the NMS wiki's Faction page directly, which states explicitly that only three factions ever control a star system (Gek/Vy'keen/Korvax, or none if uninhabited) — a long-standing, unchanged core mechanic. Cross-referenced the 6 extra names against what this session had already turned up elsewhere in the game files: `Atlas` almost certainly maps to the existing Atlas Interface filter (already tracked separately as `s.atlas`, not a race); `Builders` lines up with `Settlement_Hub_Builders`, found earlier this session in `GCSETTLEMENTGLOBALS` — a Settlement-feature concept, not a system-wide race; `None` is just "no filter"/uninhabited, already covered by this project's existing `"Uninhabited"` value. `Robots`/`Diplomats`/`Exotics` remain genuinely unconfirmed even after checking. Concluded that `RaceFilterDefaultColours` is a galaxy-map UI filter enum, not 9 equally-likely system-race outcomes — adding all 9 as interchangeable races would likely have made generation LESS accurate, not more, and would have duplicated mechanics already tracked separately (Atlas). Also checked the disclaimer/"Before you explore" modal line by line — it never states a race count or lists races anywhere, so nothing there was actually inaccurate; no fix needed. Presented this reasoning to Tony with three options (leave as-is / research further first / add confirmed ones as filter-only tags) — **he chose to leave `RACES=["Gek","Vy'keen","Korvax"]` as-is.** No code changed this round.

**Session 29 (2026-08-12) — Google Drive tracking-doc audit, then the 4 items from `Galactic-Map-Session-Notes.md`.**
Tony asked for a rundown of what's done vs. outstanding across every doc in his Drive "NMS-tracking-json etc" folder, then to work through the laptop session notes: move Tweak into the accessibility panel, add a hidden FPS counter, fix a rotation-distance bug, and add Phantom/Shadow Star flagging. `V1-SCOPE-CHECKLIST.md` and `EDIT-TRACKING-AND-DISPUTES.md`/`ACCESSIBILITY-SPEC.md` were already built (Sessions 26/28) but the checklist doc itself was never ticked off — flagged to Tony that this session's Drive connector has no file-write/update tool (only read/search/create — creating would just duplicate the doc, not overwrite it), so the checklist needs ticking by hand rather than being fixed here.

- **Rotation-distance bug, real root cause found (not the two hypotheses in the session notes).** The always-visible top-left "Galactic Core / distance" HUD (`galHudDist`) was reading its number from the LIVE CAMERA position every single frame (`updateTelemetry()`), not from any star's fixed coordinates. In Local/System view, orbiting the camera around a selected star that isn't exactly at the true galaxy origin moves the camera itself through real 3D space along its orbit sphere — so its own distance-from-centre genuinely changes as you rotate, even though the star you're looking at hasn't moved an inch. Not floating-point drift (the other hypothesis in the notes) — the panel's own `pCore` readout for a selected system was already correct the whole time, since it reads a system's `coreLY` computed once from its integer voxel coordinates at generation time. Fixed by having `galHudDist` prefer a real anchor (`selected||focusSystem`) and show THAT object's fixed `coreLY` whenever one exists, only falling back to the live camera-derived reading when nothing is selected/focused (preserves the original "where am I roaming" behaviour for free-flying with nothing picked). The Telemetry panel's own `tCore` was left untouched — it's explicitly prefixed "CAM", so it was never mislabelled, just easy to conflate with the unlabelled HUD number next to it.
- **Tweak (rendering-tuning sliders) moved into the Accessibility popup**, as its own nested collapsible "▸ Rendering tuning" sub-section, per the session note's own "likely into the accessibility panel" call. Pure relocation — `toggleFold()` is ID-based so no JS logic changed, just the DOM location and a width/padding tweak so the nested box fits inside the (also 198px) popup. Still hidden on mobile via the pre-existing `#tweak{display:none}` media-query rule (unchanged intent: power-user/desktop tool, moving it didn't change that).
- **Hidden FPS counter.** The `#stats` box (FPS/shown-count/mode) already existed but was permanently visible on desktop — now hidden by default everywhere and only shown via `Ctrl+Shift+F` (toggles a `.show` class), per the note's explicit "gate behind a hotkey... not a visible toggle" ask. Had to special-case the combo in the existing keydown handler so it doesn't ALSO fire the plain "F" Filters-panel shortcut on the same keypress.
- **Filter control in the top bar** — already existed (`bFiltToggle`, opens the Filters panel: star colour/race/economy/black hole/Atlas/outlaw/giant/bookmarked/hyperdrive range). No change made. The session note's other half — new filter fields like "system type/discovered/distance/faction" — was left as an open, undecided item exactly as Tony wrote it, not guessed at.
- **Phantom Star / Shadow Star flagging**, built end to end per the note's own researched wiki facts (nomanssky.fandom.com/wiki/Phantom_Star): a new `edPhantom` select in Edit system (None/Phantom/Shadow, with the full explainer as its tooltip), wired through `applyOverride()`, the save payload, and `filter.mjs`'s server-side enum allowlist (`PHANTOM_KEYS`) the same way every other field works. Added to `FLAG_CATEGORIES`/`FLAG_LABELS` in `preview.html` and `FLAG_FIELDS` in `netlify/functions/lib/shared.mjs` (kept in sync by hand, same standing caveat as every other entry in those lists) so it's flaggable/disputable like any other field. Visual distinction per the note's own suggestion: a new dashed, muted `.tag.ghost` pill in the info panel (with the wiki explainer as its title tooltip, since most visitors won't know either term), a distinct desaturated point colour in the Local-view starfield (can't do a literal dashed line on a Points-material star, so a dull grey/purple stands in for "doesn't belong here" against the vibrant real star colours), and a label prefix symbol (◌ phantom / ◇ shadow) matching the existing black-hole/Atlas convention.
- **Verification:** `node --check` on the extracted main script and all 3 touched `.mjs` files (`filter.mjs`, `lib/shared.mjs`, `system-edit.mjs` unchanged), a tag-balance pass (one pre-existing false-positive confirmed present in the pre-session backup too, not introduced this session), an ID-existence check (181 `getElementById` targets, zero missing), and a diff against a pre-session backup confirming only the intended blocks changed.
- **Not deployed** — same combined `preview.html` + `netlify/functions/` push as every session touching the server side; `data/overrides.json` excluded as always. The actual on-screen result (rendering-tuning panel fitting cleanly inside the popup, the ghost-star point colour/tag reading as intended, the HUD distance genuinely holding steady during a rotate) still needs Tony's own device pass — no live browser rendering possible from this sandbox, same standing limitation as every prior session.

**Session 28, continued (2026-08-12) — field-level edit tracking + dispute system, per `EDIT-TRACKING-AND-DISPUTES.md` (Google Drive, "NMS-tracking-json etc" folder).**
Tony asked to implement this spec, then move on to `NMS-ProcGen-Accuracy-TODO.md` next. Read the full spec from Drive first: per-FIELD (not whole-tile) gold/green/amber/red status, an `editedFields`/`flaggedFields`/`disputedFields` data model, consensus auto-resolution (2+ matching edits auto-lock, genuine disagreement goes to manual review, a 7-day timeout backstop), and a GitHub-Issue-backed dispute flow.

**Two deliberate simplifications made while building this, both worth knowing about:**
1. **Gold vs green (original vs edited) is computed client-side, not server-tracked.** The spec's own sketch has the server maintain an `editedFields` array. Realized while building that this is unnecessary: `generateSystem()` can already reproduce the exact pure-procedural version of any address on demand, and the server already tracks the CURRENT value of every field (`sysRec.data`) — so "did a human change this" is just "does it differ from what the algorithm alone would produce," diffed live, field by field, with zero extra bookkeeping. This is automatically correct for every system ever saved (including every edit made before this feature existed, no migration needed), not just ones with server-tracked history. See `getFieldStatus()`/`fieldStatusBaseline()` in `preview.html`.
2. **13 whole-row categories, not one vote per leaf field.** The spec's own example uses dot-paths per leaf field (e.g. `planets.0.name`, `economy` as its own leaf, etc.) — building a "flag this field" picker at that granularity would mean 80+ checkboxes for a full 6-body system. Coarsened to the 13 things that actually render as one row/line in the info panel: `name, race, region, starClass, stars, suffix (water+dissonant), giant, economy (name+sell+buy+strength), conflict, blackHole, atlas, notes`, plus one `bodies.N` per planet/moon (whole body, not its 12 individual sub-fields). See `FLAG_FIELDS` in `netlify/functions/lib/shared.mjs` and `FLAG_CATEGORIES`/`FLAG_LABELS` in `preview.html` — these three lists must be kept in sync by hand, there's no shared module between the client bundle and the Netlify Functions.

**Backend, all new files under `netlify/functions/`:**
- **`lib/shared.mjs`** — factored out of `system-edit.mjs` (GitHub Contents API read/write, the GET cache, rate-limit-log pruning) so `flag-dispute.mjs` and the new scheduled sweep can share the exact same GitHub-repo constants and the exact same in-memory GET cache object (a flag changes the public payload just as much as an edit does, so it has to invalidate the same cache). **Deliberately placed in a `lib/` subdirectory, not directly in `netlify/functions/`** — confirmed against Netlify's own docs that any `.mjs` file placed directly in the functions directory becomes its own routable function (e.g. `netlify/functions/hello.mjs` → a live endpoint), and this file has no default-export handler, so it would have deployed as a broken function if left at the top level. A subdirectory only becomes a function if it has an `index` file or one matching the subdirectory's own name — `lib/` has neither, so it's just an importable module, confirmed against the documented rule rather than assumed. (Originally built as a flat `_shared.mjs` at the top level before this was caught — moved once verified; the stray original file was deleted with Tony's file-delete permission granted mid-session.)
- **`system-edit.mjs`** (reworked, same endpoint) — the "edit" action now checks, per field category, whether that category is currently in `flaggedFields`/`disputedFields`. If not: direct overwrite, byte-for-byte the same behaviour as before this feature existed. If it IS under review: the submission is recorded as a vote (`sysRec.fieldVotes[category]`, keyed by a hashed-not-raw editor id, deduped so one editor resubmitting the same form five times can never look like 5 people agreeing) instead of blindly overwriting what's shown; the moment 2+ DIFFERENT editors' votes agree on the same value, it locks in as canonical and the flag/dispute clears automatically. New admin-only POST action `resolve-flag` (gated by `?token=<ADMIN_TOKEN>`, separate from `GITHUB_TOKEN`) with three resolutions: `dispute` (amber→red, Tony's confirmed a real problem), `dismiss` (clears it, data was fine), `set-value` (Tony corrects it directly). Admin GET view now also returns `flagQueue` (every currently-flagged field across every system, with note/timestamp/vote-count/GitHub-Issue-link) and `disputed` — the actual review queues. Public GET adds `flaggedFields`/`disputedFields` (just the field-name arrays, no note/reporter identity) to every system record so every visitor's client can colour amber/red, not just Tony's.
- **`flag-dispute.mjs`** (new endpoint) — the actual "Flag this field" submission: address + up to 8 field categories + an optional note, rate-limited on its own counter (separate from edit/report quotas), records `flagMeta` per field (when, note, a hashed reporter id, not the raw IP), and makes a **best-effort** attempt to open a real GitHub Issue (title/body/labels) for visibility. This is explicitly NOT a hard dependency — the existing `GITHUB_TOKEN` (scoped to Contents read/write only, per its own setup doc) almost certainly does NOT have Issues:write permission yet, so this will silently no-op (caught via try/catch + a non-ok response check, not left to throw) until Tony adds that scope on GitHub. The flag itself is always fully recorded and visible in the admin queue either way — Issue creation is a nice-to-have notification layer on top, matching this project's existing "GitHub is best-effort, never a hard dependency" philosophy (same as the GET-cache fallback). **Actual Tony action needed only if he wants real GitHub notifications for new flags:** edit the token's permissions on GitHub to add Issues: Read and write.
- **`sweep-stale-flags.mjs`** (new, Netlify **Scheduled Function**, `export const config = {schedule:"@daily"}` — no `netlify.toml` change needed, Netlify reads this directly from the file) — the 7-day timeout backstop. Runs once a day, auto-clears any `flaggedFields` entry whose `flagMeta.flaggedAt` is older than 7 days back to whatever value it currently shows, so nothing sits in the review queue forever just because traffic on that one system dried up. Deliberately does NOT touch `disputedFields` (red) — those mean Tony already looked at it and confirmed a real problem, so only he (`resolve-flag`) or a fresh community consensus (a normal edit landing 2 agreeing votes) can clear one, never a timer. Only commits to GitHub if it actually found and cleared something, so a quiet day doesn't add an empty commit.

**Client side, all in `preview.html`:**
- `applyOverride(s)` now reads `flaggedFields`/`disputedFields` onto the system object even when there's no `data` override at all — a visitor can flag a purely-procedural value ("this shouldn't have a black hole") without providing a correction first, so this can't be folded into the existing `if(!ov||!ov.data) return s` early-return.
- `generateSystem()` gained an optional `noOverride` 5th arg, used only internally by the new `fieldStatusBaseline()` to get a clean procedural snapshot of the same address to diff against — everywhere else that calls it is unaffected (defaults to the old always-apply-overrides behaviour).
- New field-status colouring: gold border-left = untouched, green = a real edit, amber = flagged (unreviewed), red = disputed (Tony's confirmed it's wrong) — reused this site's own existing green/amber/red convention (`CONFLICT_COL`) rather than inventing a second palette; "flagged" happening to equal the site's `--gold` accent is intentional, that hex is already overloaded as this app's "medium/warning" tier colour. Applied via inset `box-shadow` (not a real border, so no box-model/layout side effects) to: system name, region, star swatches, the star-class+suffix line (worse-of the two, since they render on one combined text line), the Race/Economy/Conflict rows (added `id`s to those `.row` divs so JS can target them directly), the Giant/Black hole/Atlas Interface tags, the public-notes box, and each individual planet/moon row in the body list.
- Report modal now has a mode toggle: the original "Inappropriate content" flow (unchanged) alongside a new "Data looks wrong" flow — a dynamically-populated checkbox list (one per `FLAG_CATEGORIES` category + one per the selected system's actual current planets/moons, each already showing "already flagged"/"disputed" if applicable) plus an optional note, posting to the new `flag-dispute.mjs` endpoint. Reuses the exact same spinner/status-icon/Retry/`describeSaveError()` machinery the existing report flow already has (a shared `repRetry` button now branches on which mode is active).
- New minimal admin panel, reached via `?admin=<ADMIN_TOKEN>` on the URL (never linked anywhere in the normal UI — purely something Tony types in himself): lists the live flag queue from the admin GET view, with per-item "View system" (jumps straight to it on the map), "Confirm dispute", "Dismiss (data was fine)", and — for the simple scalar categories only (name/race/region/starClass/conflict/notes) — a "Fix it now" that prompts for a plain-text replacement value. Composite categories (suffix/economy/stars/bodies.N) deliberately don't get a "fix it now" shortcut here — correcting those properly still goes through the normal Edit system flow, which is itself consensus-safe.

**Verification (all real, none skipped):**
- A from-scratch Node harness (`test_edit_tracking.mjs`) mocking the GitHub Contents + Issues APIs in-memory and running the ACTUAL shipped `system-edit.mjs`/`flag-dispute.mjs`/`sweep-stale-flags.mjs` code against it (not reimplemented) — 45 checks: fresh edit, flagging, public-vs-admin GET payload shape, a lone dissenting vote NOT resolving, a second agreeing editor resolving it, the SAME editor voting twice NOT counting as 2 people, genuine 2-way disagreement staying flagged, all 3 `resolve-flag` resolutions + wrong-admin-token rejection, flag rate-limiting, invalid-field-name rejection, GitHub-Issue-API-403 soft-fail (flag still succeeds), GitHub-Issue-API-success path, a flagged body index gracefully dropping its flag when that body is removed entirely, flagging a system with zero prior edits, and the 7-day sweep clearing a backdated flag while leaving a fresh one and a disputed one alone. All 45 pass.
- A second isolated Node test of the pure client-side diffing logic (`getFieldStatus`/`fsCategoryValue`/`fsBodyKey`) against hand-built mock system objects — confirms unedited fields read original, a single changed field reads edited while untouched siblings stay original, flagged/disputed override the diff regardless of actual value divergence, disputed outranks flagged, resource-array order doesn't cause a false "edited" (sorted before compare), and a body added beyond the procedural baseline's own body count correctly reads edited. 13/13 pass.
- `node --check` on all 5 `.mjs` files, `node --check` on every non-module `<script>` block extracted from `preview.html`, an HTML tag-balance pass (script stripped first), an ID-existence check (179 `getElementById` targets, all present, zero duplicates), and a manual re-read confirming the untouched non-goal areas (economy/conflict/race/outlaw generation logic, every per-body biome/terrain/water/ring/resource roll, this morning's nms-core integration) are genuinely byte-for-byte untouched.

**Not deployed** — needs `preview.html` AND the full `netlify/functions/` tree (including the new `lib/` subfolder) pushed together, `data/overrides.json` excluded as always. Two things only Tony can do once it's live: (1) set an `ADMIN_TOKEN` env var in Netlify (any random string he picks) if he wants the resolve-flag admin action and the `?admin=` panel to work — without it, `resolve-flag` and the admin GET view both correctly refuse with "admin token required" rather than silently doing nothing; (2) optionally grant the existing `GITHUB_TOKEN` Issues:write permission on GitHub if he wants real Issue notifications for new flags — everything else about flagging/disputing/consensus works fully without that, per the "best-effort, not a hard dependency" design above. The actual on-screen look of the new amber/green/red colouring, the flag picker, and the admin panel all still need Tony's own device pass, same standing sandbox limitation as every other visual feature in this project.

**Session 28 (2026-08-12) — deployed the accurate proc-gen module per DEPLOYMENT_BRIEF.md (found in Tony's Google Drive, not local).**
Tony asked to find and run a "deployment_ brief" — located `DEPLOYMENT_BRIEF.md` in Google Drive (a prior session's own writeup, dated 2026-08-11, describing exactly how to wire the already-built `nms-core` proc-gen module — 10 `.js` files + 8 `letter_map_*.json` shards, also sitting in Drive — into `preview.html`). Pulled all 18 files down (the two large ones, `alphasets.js` at 73KB and the 8 letter-map shards up to 1MB each, via a subagent so the base64 blobs didn't bloat this session's own context) into a new `nms-core/` folder at the repo root, exactly matching the brief's file-placement instructions.

**What shipped, in `preview.html`:**
1. A module loader (`<script type="module">` importing `./nms-core/index.js` + `loadLetterMap.js`, bridged onto `window.NMSCore`/`window.nmsLetterMap`). Caught a real ordering bug the brief's own example code would have hit: `type="module"` scripts are deferred until after the whole document parses, but the existing giant classic `<script>` runs synchronously as the parser reaches it — so a naive `window.nmsCoreReady.then(...)` at the bottom of that classic script would throw on `undefined` (the module hasn't executed yet at that point). Fixed by creating the real `Promise` object in a tiny synchronous script BEFORE the module script even loads (its *resolution* can be deferred, calling `.then()` on it can't) — the module then just calls a resolver function once `loadLetterMap()` finishes. If the module fails to load at all (e.g. opened via `file://`, where ES module imports are blocked by CORS — a real way Tony sometimes tests these files), it still resolves so the page doesn't hang, and every downstream call site falls back to the original generation.
2. Fixed all 4 places the brief flagged as hardcoding black hole=index `0x079`/Atlas=`0x07A` in every region (`generateSystem()`, `generateSlice()`, and both spots in `regionCandidates()`) — replaced with a shared `regionAnomalyIdx(vx,vy,vz)` helper derived from `nms-core`'s `voxelAttributes()`. Verified this reduces to the exact old fixed indices everywhere except the ~8-voxel dead core around galaxy centre (where it now correctly returns none of either) — a pure correctness fix, not a behaviour change, for every other region. See the caveat below though.
3. `generateSystem()`: star type, planet/moon total count, and giant-planet gating now come from `nms-core`'s `systemAttributes()`/`planetSeeds()` when the module's loaded, with a try/catch fallback to the original `weightedStar()`/flat-guess logic per field if anything goes wrong. System and region names now come from `nms-core`'s `systemName()`/`regionName()` (real weighted-Markov names off the actual letter-map corpus, not the old 3-syllable picker). Economy/conflict/race/outlaw/uncharted/abandoned and every per-body biome/terrain/water/ring/resource roll are byte-for-byte untouched (confirmed via diff) — exactly the brief's non-goals.

**Two real bugs found during verification (not invented, not guessed — both confirmed by directly exercising the actual shipped module in Node), neither of which made it into the live page:**
1. **`idx===0` crashes `systemAttributes()`, in every region, every galaxy.** Traced into `iprng.js`'s `indexPrimedPRNG()`: when a system's region-local index is exactly 0, an internal counter goes negative, indexes an array at `-1`, and throws mixing `undefined`/BigInt in a shift. Isolated precisely (idx 1-4095 all fine, only idx=0 fails, unconditionally) via direct testing against the real module. This is an upstream limitation inherited from `hadsh/nms_namegen` (confirmed by reading region.js/iprng.js's actual published source), not something introduced by this port. Every `NMSCore` call in `preview.html` was already wrapped in try/catch specifically so a fault like this degrades gracefully (that one system silently uses the old generator) instead of crashing the page — confirmed this actually works via the benchmark harness (23 fallback hits across 90,000 simulated calls, zero crashes).
2. **`voxelAttributes()`'s distance-from-centre calc uses the RAW unsigned portal-code bits for X/Y/Z, not this site's own signed two's-complement voxel coordinates** (the ones `toSigned`/`toRaw`/the "Galactic Core / distance" HUD all use). Confirmed against the actual upstream Python source (`region.py`, fetched from `github.com/hadsh/nms_namegen`) — this is faithful to the real ported game logic, not a porting mistake. Practical effect: the new "dead core has no black hole/Atlas" fix is only symmetric in the all-non-negative-coordinate octant (verified 4096/4096 clean); any region with a negative signed coordinate near true centre still gets a black hole/Atlas at the old fixed 0x079/0x07A indices (verified on 5 samples — 5/5 match, i.e. **not a regression**, just not an extension of the fix into those octants). Flagging this for Tony rather than trying to invent a fix for someone else's reverse-engineered game logic without primary-source access to re-verify against — worth a closer look if it ever matters (e.g. matching glyphs.had.sh corpus data), out of scope for this pass.

**Performance (the brief explicitly flagged this as unbenchmarked, so benchmarked it for real with a Node harness against the actual shipped module + real letter-map, not guessed):** the full accurate path including per-body planet names cost 9s for a 45,000-system "Heavy" slice (the app's own existing warning threshold) — 75% of that was the per-body `planetName()` loop alone. That's a real multi-second freeze at the app's own default settings' upper range, exactly the risk the brief called out. Implemented the brief's own suggested fallback: system/region names (cheap — 0.049ms/system, ~150ms even at default settings) stay eager for every generated system since they're what the star-field labels show; per-body planet names now default to the cheap legacy name generator in the bulk path, and get lazily upgraded to the accurate ones (via a new `upgradeBodyNames()`, called once from `updatePanel()`) only for whichever system a player actually selects/enters — imperceptible per-open cost, and `buildSystemView()`'s 3D labels see the same upgrade for free since it only ever reads from `selected`, which `updatePanel()` already mutated by the time Enter System can be clicked.

**Verified:** `node --check` on both the classic and module script blocks (pass), a tag-balance pass (0 mismatches), an ID-existence check (169 targets, unchanged — no HTML markup touched, JS only), and a diff against a pre-session backup showing exactly the intended blocks changed (confirmed economy/conflict/race/outlaw/`filter.mjs`/`system-edit.mjs` byte-identical to before). Correctness spot-checked against real addresses (the boot anchor, a normal region, the dead core, a 4096-point positive-octant sweep, 5 negative-octant samples) — all real module output, not fabricated.

**Not deployed** — same as every session touching this file: needs Tony's usual `preview.html` GitHub push, this time ALSO including the new `nms-core/` folder (10 `.js` files + `nms-core/letter-map/` with the 8 JSON shards) in the same push, since the module script won't resolve without them actually being on the server. `data/overrides.json` still excluded as always. `netlify.toml` needs no changes (`publish="."` already serves the whole repo tree as static files, including the new folder). The real on-screen result — does a freshly-loaded system actually show a proper weighted-Markov name instead of the old 3-syllable one, does the module load correctly over Netlify's real https serving, does the lazy body-name upgrade feel instant on a real device — still needs Tony's own look once live, same standing sandbox limitation as every other session in this project.

**Session 27, continued further (2026-08-09) — save/report status icons: traffic-readiness caching + Retry, 6→5 real NMS icons per outcome, drift/beam animation, three real-bug fixes from Tony's own screenshots.**
Starting point: Tony asked whether the GitHub-token-based community-edit backend would cope with a traffic wave, plus wanted clearer failure messaging with a Retry button, plus an NMS-style "please be patient, heavy traffic" indicator.
**Backend hardening** (`netlify/functions/system-edit.mjs`): added a 30-second in-memory `_getCache` on the public GET path (shared by every visitor in the same window instead of one live GitHub read each), with graceful degradation — if GitHub itself is briefly unreachable, GET now serves the last-known-good cached copy instead of failing completely silently (previous behaviour: a rate-limited/unreachable GitHub meant the community-edit layer just vanished for everyone with zero indication). Admin `?token=` reports view always bypasses the cache. Cache is invalidated the instant a save succeeds so the saving visitor's own reload shows their edit immediately.
**Save/report UX** (`preview.html`): `describeSaveError(status, body, isReport)` maps every real failure shape (429 rate limit, 422 content-filter block, 502+409 genuine conflict, 502 generic GitHub/network failure, 500 misconfigured server) to a plain-English message, a retry-ability flag, and (see below) a status icon. `submitEditPayload()`/`submitReportPayload()` centralize the fetch/response/error/icon logic so both the Save/Send buttons and new `#edRetry`/`#repRetry` buttons call the same code path — Retry resubmits the exact last-attempted payload (`lastEditAttempt`/`lastReportAttempt`) without the visitor retyping anything. `startAtlasWait()` shows "Atlas is working on it..." immediately and, if the request is still in flight after 5s, swaps to "Atlas is busy helping a lot of travellers right now..." — a fast save never sees the slow message at all.
**Status icons** — Tony supplied 6 real NMS reference images and mapped them to scenarios himself: Atlas=normal save, Grave=no connection, Atlas Pass v3=conflict, Sentinel=heavy traffic, Corrupt Sentinel=blocked text, Sentinel ship=rate limit. Built `STATUS_ICONS`/`showStatusIcon()`/`hideStatusIcon()` in `preview.html`, icons resized to 128x128 in `icons-web/status-*.png`. Split into two animation classes based on Tony's own read of which icons "fly" vs "are badges": Atlas/Sentinel/Grave/Atlas Pass v3 get a calm `pulse` (scale+glow); Corrupt Sentinel and (originally) Sentinel ship get a `drift` — modeled explicitly on the Theme Pack's `flyAcross` flyer animation after an earlier 3D-tumble attempt read as "an icon flipping card, too fast."
**Two real bugs found from Tony's own screenshots, fixed same session:** (1) the client-side `clientPrecheck()` blocked-text catch in the `edSubmit` handler returned early before ever reaching `submitEditPayload()`/`describeSaveError()`, so the most common failure case (typing a blocked word) showed the error text with NO icon at all — fixed by calling `showStatusIcon(...,"corrupt")` directly in that early-return branch. (2) The icon/status text lived at the very bottom of a long scrollable Edit-system form near Save, invisible on any normal screen height until scrolled past ~12 sections — moved to the top of the modal (next to the error box) and added `iconWrap.scrollIntoView(...)` inside `startAtlasWait()` so it's always brought into view the instant a save starts, regardless of where in the form the click happened.
**Cosmetic pass — text-width drift + scanning beam:** Tony asked for the drift icon to travel the actual width of the error text (start→end→flip→back, like the Theme Pack drone) plus a continuous (not click-triggered) scanning beam over the error text — checked the Theme Pack source first and found it already has both a one-shot click beam (`hub-eyebeam`/`hub-pbeam`) AND a genuinely continuous one (`hub-mscan`), used the latter as the model. `.iconWrap.drift img` now uses `left:0` → `calc(100% - 56px)` with a `scaleX(-1)` flip at each end (mirrors like the Theme Pack drone's own artwork) instead of a small fixed wobble, since the icon wrap and the error box share the same content width with no JS measurement needed. Structural fix required: error messages were set via `errEl.textContent=...`, which would wipe out any beam element added inside `.merr` — added a `setErrText()` helper writing to a nested `.errTxt` span instead, swapped all 6 call sites.
**Three follow-up bug reports, all from real screenshots, all fixed:**
1. *"Beam and icon not in sync / too fast."* Root cause: the beam (`errScanSweep`, 2.2s linear, one-directional sweep-and-reset) and the icon (`iconDrift`, 4.4s ease-in-out, back-and-forth-with-flip) had different durations, different easing curves, AND different motion shapes — they could only ever coincide by accident. Fix: rebuilt the beam to reuse `iconDrift` directly (removed the separate `errScanSweep` keyframe entirely) — same duration (slowed to 7s), same easing, same 0/46/50/96/100% breakpoints, both exactly 56px wide. One shared animation, mathematically locked together rather than "close enough."
2. *"Remove Sentinel ship, doesn't look right — stay consistent with Corrupt Sentinel for both errors."* Removed `ship` from `STATUS_ICONS` and repointed the 429 (rate limit) branch of `describeSaveError()` from `icon:"ship"` to `icon:"corrupt"`. `status-ship.png` left sitting unused in `icons-web/` rather than deleted, in case it's wanted for something else later.
3. *"The beam is going down, not up toward the text — should originate near the front of the drone, angled toward the text."* Real bug, not a misread of intent: the edit/report modals actually render the error box, then Retry, then the icon (error text is ABOVE the icon, not below it) — the beam had been built assuming the opposite layout, so it was shooting downward into empty space beside "System name" instead of up into the text. Fixed by moving the extra spacing from `margin-bottom` to `margin-top` on `.iconWrap.drift` (opening the real gap above the icon, where the beam needed to live), flipping `.driftBeam`'s taper (narrow at the drone, widening toward the text) and gradient (brightest near the drone, fading toward the text), and flipping `.merr .errScan`'s radial-gradient glow from top-anchored to bottom-anchored (the edge nearest the drone). Tony confirmed this version looks right and can "live with it." The angled/from-the-front refinement was proposed but deliberately not built yet — fixing the wrong direction took priority, and it's a "might look even better" suggestion rather than a firm ask; revisit if Tony wants it after seeing this corrected version live.
Verified after every round via the project's standard pipeline (`node --check` on the extracted script, a tag-balance pass, and an ID-existence check) — 169 `getElementById` targets, all present throughout, no regressions. **None of this session's status-icon work is deployed yet** — needs the same combined `preview.html` + `netlify/functions/*.mjs` push as the rest of this session (the backend caching lives in a `.mjs` file), `data/overrides.json` excluded as always. The real on-device feel/timing of the drift travel and beam still hasn't had Tony's own look outside of screenshots — same standing sandbox limitation as every other visual feature in this project, though the screenshot-driven iteration this round got unusually close before deploy.

**Session 27, continued (2026-08-09) — star editing (count + colour) added to Edit system, plus max-reached toasts.**
Tony flagged 4 gaps in the Edit system modal: no way to add/edit the number of
stars, no way to edit their colour(s) (including the original/first-generated
one), and no feedback when hitting the real in-game max for stars or planets.
Researched the actual game mechanics first (NMS wiki, `Star_system` page)
before touching anything, confirming what was already assumed elsewhere in
this project: systems have 1-3 stars (single/binary/ternary — a hard game
limit), each star in a binary/ternary system is always a **different colour**,
and systems cap at 6 celestial bodies (planets+moons combined) — already
enforced server-side in `filter.mjs` but the client's "+ Add" button for
bodies just silently no-op'd at 6 with zero feedback, which is presumably
part of what read as "no popup" to Tony.
Confirmed the plan with Tony via 3 quick questions before building (dropdown
per star for colour vs swatches; block duplicate star colours vs warn-only;
toast vs full modal popup for max-reached) — went with the recommended
option on all 3: dropdown, hard-block duplicates, toast.
Built a new "Stars (max 3)" section in the Edit system modal, styled to match
the existing Planets & moons list — one row per star with a Yellow/Red/Green/
Blue/Purple dropdown (`STAR_COLOR_LABEL`, matching `STAR_TYPES`' 5 real
classes), a swatch, and a remove button (min 1 star always). Star index 0 is
explicitly labelled "Star A (original)" since that's the one that actually
drives the system's spectral class, biome odds, and economy-element odds
elsewhere in `generateSystem()` — confirmed by tracing `s.type`/`s.color` vs
`s.starTypes[0]`/`s.starColors[0]` through the renderer (star light colour,
`STELLAR_EL` economy-element lookup, the "Single/Binary/Ternary star" badge
text) before assuming they were interchangeable. "+ Add star" toasts
`"Ternary is the limit..."` at 3; picks the next unused colour by default so
a fresh row never starts as an accidental duplicate. Duplicate colours are
blocked at Save (`clientPrecheck()`), matching the same pattern the existing
Giant-planet validation already uses (checked at submit, not live per
keystroke). Also fixed the pre-existing silent-fail on the Planets & moons
"+ Add" button — removed the `.disabled` toggle (a disabled button can't
receive the click needed to show a toast) and added the matching
`"6 is the limit..."` toast at the real 6-body cap.
Wired star data through the full override pipeline the same way every other
field does: `applyOverride()` now reads `d.stars` (an array of up to 3 colour
keys, deduped, validated against the 5 real keys) and sets
`s.starTypes`/`s.starColors`/`s.stars`/`s.type`/`s.color` together so
everything downstream — the star mesh colours, the scene light, the info
panel colour swatches, the Single/Binary/Ternary badge, the `STELLAR_EL`
economy-element display — stays consistent; old saves made before this field
existed just keep their procedural stars, no migration needed. `filter.mjs`
got the authoritative mirror of the same validation (max 3, dedupe, reject
anything outside the 5 real keys) — the client's own copy is only ever a
UX nicety, this is the copy that can't be bypassed by editing client JS, same
reasoning as every other allowlisted field in that file. `system-edit.mjs`'s
header doc comment updated to list the new `stars` field in the payload shape.
Verified via `node --check` on `filter.mjs`, `system-edit.mjs`, and the
extracted inline script (all pass), a tag-balance pass on the stripped HTML
(pass), an ID-existence check (160 `getElementById` targets, all present, up
from 158), and a diff against a pre-session backup confirming exactly the 11
intended blocks in `preview.html` plus 1 block in `filter.mjs` and 1 in
`system-edit.mjs` changed — nothing else touched. **Not deployed** — same
combined `preview.html` + `netlify/functions/*.mjs` push as every session
that's touched the server-side allowlist, `data/overrides.json` excluded as
always. The actual on-screen look of the new Stars section (row spacing,
swatch sizing, toast wording/timing) still needs Tony's own device pass —
no live browser rendering possible from this sandbox, same standing
limitation as every other visual feature in this project.

**Session 26 (2026-08-08) — galaxy #257 removed, new accessibility panel built.**
Tony had shown the map to someone and gotten good feedback, then came back with
two asks. (1) Galaxy #257, **Yilsrussimil**, no longer exists in the real game —
removed it from the `GALAXIES` array in `preview.html`. The "GALAXY #N OF 257"
badge and the galaxy dropdown both derive from `GALAXIES.length`/contents, so
that was the whole fix, plus narrowing `galaxyType()`'s hidden-galaxy check from
`n===255||n===256` to just `n===255` (Odyalutai, #256, is now the only hidden
"type unknown" galaxy). Verified via `node --check`, tag-balance, ID-existence,
and a diff confirming only those 2 lines changed.
(2) Tony had queued `ACCESSIBILITY-SPEC.md` on Google Drive requesting a
visually-impaired settings panel — font size, a Colour Correction master
toggle, mutually-exclusive Protanopia/Deuteranopia/Tritanopia/Invert filters,
and an independent High Contrast toggle — and explicitly asked to see how it
would look before it got built. Read the spec, built an interactive mockup
(matching the site's real dark cyan/gold Orbitron/Rajdhani theme) as a live
preview widget with two placement options and working feColorMatrix colour-
blind simulation, then used it to resolve the spec doc's own open questions
with Tony. He chose: a **gear icon with a hover popup** ("getting to many
buttons plus is a setting not a feature" — his words, so it shouldn't compete
with Filters/Labels/Grid in the main toolbar); **High Contrast can combine**
with a colour filter rather than being mutually exclusive with it; and
**font size as 4 presets** (Small/Default/Large/XL) rather than a slider.
Built into `preview.html`: `#bAccess` (circular gear button in the toolbar)
opens `#accessPop` on hover for mouse users (`matchMedia(hover:hover)`) and on
tap for touch, anchored the same `--top-h`-aware way `#panel`/`#course`
already survive the toolbar wrapping on mobile. Font size uses `zoom` on each
floating UI box (toolbar, side panels, info panel, course readout, modals, the
popup itself) instead of a rem refactor of ~30 scattered px font-size rules —
same technique the Phone Preview Tool already uses for its own "Fit to
screen" toggle (chosen there over transform specifically to dodge a touch-
routing bug), and it keeps each box's fixed anchor point stable while it
grows from that corner. Deliberately scoped to UI chrome only, not the
in-scene 3D star/planet labels (separate pixel-math collision system) — a
known, flagged gap, not silently dropped. Colour-blind filters (Brettel/
Vienot-style feColorMatrix approximations) and Invert apply via
`html.style.filter`, so they affect the real star colours on the canvas too,
not just UI text. High Contrast reuses the site's existing `--text-*`/
`--border-*` CSS variables instead of a filter, so it sharpens genuine
low-contrast text without touching the cyan/gold accent colours that already
carry meaning. All three settings persist to `localStorage` under
`nms-galmap-a11y`, same pattern as the disclaimer/hyperdrive-notice keys.
Verified via `node --check` (pass), tag-balance with script stripped (pass),
ID-existence (all 156 `getElementById` targets exist), and a diff against a
pre-session backup showing exactly 4 clean insertion blocks (CSS, the gear
button, the popup + hidden SVG filter defs, the JS block) — nothing else
touched. **Neither change is deployed** — same `preview.html`-only GitHub
push needed as every prior session, `data/overrides.json` must never be part
of it. Like every other meaningful visual/interaction feature in this
project, the `zoom`-based font scaling and the on-canvas colour filters
genuinely need Tony's own on-device look before being trusted — no live
browser rendering is possible from this sandbox.

**Session 26 continued — planet rings.** Tony's follow-up in the same session:
some planets have rings in-game, wanted (1) a per-planet "Has rings" option in
Edit system and (2) real rings in the procedural generation too, not just
manual edit. Added `RING_CHANCE=0.22` right next to `GIANT_CHANCE` (same
placeholder-constant pattern — adjust once Tony has a feel for how common
ringed worlds should look) so `generateSystem()`'s per-body loop now rolls
`ring: !isMoon && br()<RING_CHANCE` using the same seeded RNG as every other
procedural trait — moons never get one, real in-game rings only ever appear
on planets/Giants. Added a "Has rings" checkbox to the planet/moon accordion
editor (hidden for moon rows, mirroring how the Orbits dropdown is hidden for
planet rows), wired through the full existing per-body override pipeline:
`openEditModal` pre-fills it from the system's current data, the body input
listener tracks edits, `edSubmit`'s payload includes it, and
`applyOverride()`'s saved-bodies rebuild carries it through — same shape as
water/autophage. Critical catch: `netlify/functions/filter.mjs` explicitly
enumerates every allowed body field by name (`out.bodies.push({name, moon,
orbits, biome, ..., autophage})`) — a client-only change would have shipped a
UI that silently failed to save the ring flag, since the authoritative server
copy would have stripped it. Caught by actually reading that file rather than
assuming the payload passes through untouched; added `ring: !isMoon &&
!!b.ring` there too (same moon-exclusion enforced server-side, not just
hidden in the UI) and updated the file's own header comment documenting the
payload shape.
Rendering: added `makeRingTexture(b)` next to the existing `makePlanetTexture`
— a small banded canvas texture (RingGeometry's built-in UVs map u around the
circumference and v radially, so a texture that only varies vertically tiles
correctly with zero extra UV work), seeded off `b.seed^0x21196E` so different
ringed planets get different band patterns. The ring mesh itself is added as
a CHILD of the planet's own mesh (not the pivot) specifically so it inherits
`mesh.rotation.z` — the planet's existing axial tilt — automatically, sitting
correctly in the equatorial plane with no extra tilt math needed; sized off
`b.size` (inner 1.35x, outer 2.3x) so it always scales with the planet. This
is a genuinely new visual, distinct from the existing thin cyan orbit-path
ring (`RingGeometry(orbitR-0.03,orbitR+0.03,110)`) already in the scene —
easy to confuse the two by name only, worth remembering they're unrelated.
Also surfaced in two read-only spots for parity with the water flag: the info
panel's body list now shows "· rings" next to a ringed planet's biome, and
the individual planet detail view gets a "Rings" tag alongside Water/
Autophage camp.
Verified via `node --check` (pass), tag-balance with script stripped (pass),
ID-existence (all 156 `getElementById` targets exist), a diff against a
pre-change backup confirming exactly 11 clean insertion blocks (constant,
procedural roll, `applyOverride` merge, `openEditModal` prefill, the edit-form
checkbox, the input listener, the save payload, the info-panel list, the
detail-view tag, `makeRingTexture`, and the ring mesh itself in
`buildSystemView`), and a standalone Node test that lifts the actual shipped
`mulberry32` function and `RING_CHANCE` constant verbatim and runs 200,000
seeded trials — confirmed the roll rate matches the constant almost exactly
(14.70% observed vs 14.67% expected across a 2/3-non-moon mix) and zero moons
ever got flagged. **Not deployed** — and unlike every prior deploy note in
this file, this one needs **both** `preview.html` and the two
`netlify/functions/*.mjs` files pushed together, not `preview.html` alone —
the server-side allowlist change won't take effect until the Function
redeploys too. `data/overrides.json` still must never be part of any push.
The actual on-screen ring look (tilt angle, size relative to the planet,
texture banding at real render resolution) needs Tony's own device pass
before being trusted, same standing sandbox limitation as every other visual
feature in this project — no live browser rendering is possible from here.

**Session 26 continued once more — two real fixes from Tony's own screenshot
and testing.** (1) The ring on Muwexar rendered as a thick solid disc rather
than a delicate ring — narrowed `RingGeometry(b.size*1.35,b.size*2.3,64)` to
`(b.size*1.4,b.size*1.7,64)`, cutting the band width from ~0.95x the planet's
own radius down to ~0.3x. (2) The accessibility popup closed as soon as the
mouse moved off it, before Tony could actually click a checkbox or slider —
a pure hover-tooltip is the wrong interaction for something with real
controls in it. Reworked the open/close logic around a `pinned` flag: hover
still opens it for a quick look and auto-closes on mouseleave same as before,
but the moment it's actually interacted with — any click, or a pointerdown
anywhere inside it (which covers grabbing the header to drag it) — it pins
open and stops listening to mouseleave entirely, closing only when the gear
is clicked again while pinned or the page is clicked elsewhere. Touch devices
have no hover at all, so every open there is a click and therefore pinned by
definition — no behaviour change needed for mobile. Tony also asked if it
should be draggable like the other floating boxes — it wasn't wired in at
all, so gave its header an id (`a11yHead`), added that id to the same
`cursor:grab` CSS rule `#fHead`/`.phead`/`.chead` already share, and
registered it with the existing `makeDraggable()` helper right alongside
Filters/Panel/Course — same drag-by-header pattern as everywhere else in
this app, no new mechanism invented. Verified via `node --check`, tag-balance,
ID-existence (157 targets now, all present -- `a11yHead` is new), and a diff
confirming only these targeted lines changed on top of the rings work above.
**Not deployed** — same combined `preview.html` + `netlify/functions/*.mjs`
push as the rings section above (this fix only touched `preview.html`, but
the two are still going out together this round), `data/overrides.json`
excluded as always. The actual ring width and the popup's drag/pin feel at
real render size and on a real touchscreen still need Tony's own device pass.

**Session 26 continued yet again — Invert removed, filters rebuilt as real
correction (not simulation), and 5 biome-tied ring styles.** Three separate
things from Tony in one round.

(1) **Invert dropped.** He liked the other 3 colour-blind filters but wanted
Invert gone. Removed the button, its `cssFilter="invert(1) hue-rotate..."`
branch, and the doc comments describing it; added a load-time migration
guard (`if(a11y.filt==="invert") a11y.filt="none";`) so a returning visitor
with an old saved choice doesn't error, just falls back to no filter.

(2) **"Where is the information shown to users about the visual filter"** —
a fair question with an embarrassing answer: nowhere. None of the filter
pills or the Colour correction/High contrast checkboxes had a `title`
tooltip, unlike almost every other control in this app (Filters/Labels/Grid/
Orbit/Fly all have descriptive titles). Added them. But answering that
question honestly meant re-reading what I'd actually shipped, and that
surfaced something more important: **the 3 filters were built as SIMULATION
matrices** (the standard Brettel/Viénot coefficients, which show a
normal-sighted person what a given colour blindness looks like) **rather
than CORRECTION matrices** (which actually help a colorblind player
distinguish colours they'd otherwise confuse — different math, called
Daltonization). The spec doc's own wording ("Protanopia Filter — for
red-green colour blindness") clearly meant correction, not a demo. Flagged
this to Tony directly rather than quietly shipping the wrong thing with a
new tooltip slapped on top; he confirmed he wanted real correction.
Rebuilt all 3: researched and verified the algorithm against a cited,
working reference implementation (a ReShade port of the daltonize.org
shader, found via web search — not reconstructed from memory) rather than
trust half-remembered coefficients, confirmed the reference's own RGB->LMS
and LMS->RGB matrices are genuine inverses of each other (checked
numerically), then used Python/numpy to actually compute the composed 3x3
correction matrix per type (RGB->LMS, simulate the deficiency, LMS->RGB,
take the "error" the simulation lost, shift that error into channels the
deficiency doesn't affect, add it back on top of the original) rather than
attempt that chain of matrix multiplications by hand, which is exactly the
kind of thing that produces a silently-wrong-but-plausible-looking result.
Tritanopia's correction matrix has noticeably larger coefficients than the
other two (a `3.3656` term) — confirmed this is inherent to the reference
algorithm itself (it reuses the same error-shift weights for all three
types rather than a tritanopia-specific one) rather than a mistake on this
end; briefly tried deriving a tritanopia-specific shift matrix instead but
had no citable source for it, and an unverified guess is worse than a
verified-if-imperfect reference, so kept the reference's approach.

(3) **5 ring styles, tied to planet type.** Tony didn't like the single tan
ring look from earlier and asked for 5 options with the ability to pick more
than one for procedural variety. Showed 5 SVG mockups matching the site's
own dark theme (Icy pale / Dusty tan — the original default / Ash rock dark
rubble / Golden dust warm amber / Split ring with a real Cassini-style gap).
He came back wanting all 5, matched to planet type rather than randomly
picked ("ice for frozen planets, ash for volcanic etc"). Built
`RING_STYLE_BY_BIOME`, a direct lookup covering every one of the 11 biomes
with no fallback gap: Frozen→icy; Barren/Lush/Marsh→tan; Volcanic/Dead/
Toxic→ash; Scorched/Irradiated/Mega Exotic→gold; Exotic→split. `b.ring`
changed from a plain boolean to a style-key string (`"icy"`/`"tan"`/etc, or
`false`) — every existing `if(b.ring)` check still works since a non-empty
string is truthy, so nothing downstream broke. `makeRingTexture(b)` now
looks up its band palette from `RING_PALETTES[b.ring]` instead of one
hardcoded tan array. Split is the one style that's a genuinely different
SHAPE, not just a different texture — `buildSystemView` now renders it as
two separate thin `RingGeometry` bands with a real unpainted gap between
them (1.4-1.5x and 1.58-1.7x the planet's radius), matching the mockup,
rather than faking a gap inside the texture alone. The info panel body list
and the individual planet's detail tags now name the actual style ("icy
rings", "golden rings", etc) instead of a generic "Rings" label.
Server-side: `filter.mjs` never receives a style string from the client at
all — only the boolean "has rings", the same as before — and now derives the
actual style itself from a mirrored `RING_STYLE_BY_BIOME` keyed off the
already-filtered, authoritative biome value, so a manual Edit-system save
and a procedurally generated planet of the same biome can never disagree on
what their ring should look like.
Verified via `node --check` on both `preview.html` and
`netlify/functions/filter.mjs`, tag-balance, ID-existence (157 targets, all
present), a diff confirming exactly 17 clean blocks changed across all three
fixes this round, and a small script confirming all 11 real `BIOME_KEYS`
have an explicit entry in `RING_STYLE_BY_BIOME` (no silent "falls back to
tan" surprises). **Not deployed** — same combined `preview.html` +
`netlify/functions/*.mjs` push as the rest of this session's ring work,
`data/overrides.json` excluded as always. The Daltonization correction's
real-world effect (does it actually read as more distinguishable, not just
mathematically defensible) and all 5 ring styles at real render size still
need Tony's own device pass — no live browser rendering possible from this
sandbox, same standing limitation as ever.

**Session 26, one more round — label font-size, popup position, and Water/
Dissonant independence.** Tony sent two more screenshots (desktop with the
accessibility panel open top-right at XL font size showing a system with
labelled stars/planets; a narrower view showing the same panel positioned
on the left, under the toolbar) and raised 3 things.

(1) **"Is this on purpose"** — the font-size setting wasn't touching the
star/planet name labels in the 3D view, and he noticed labels visibly grow
when zooming into a system. Confirmed: yes, deliberately out of scope
originally (my own code comment said so — the labels have their own
pixel-math collision-avoidance system, separate from the flat UI chrome the
font-size setting was built for). But since he flagged it, extended it
properly: `.lbl`'s `font-size` is now `calc(9.5px * var(--ui-zoom,1))`
instead of a fixed value — reads the exact same custom property the
toolbar/panels already use, no new state needed. The harder part was
`updateLabels()`'s collision-avoidance loop, which nudges overlapping
labels apart using hardcoded pixel thresholds (64px horizontal, 16px
vertical step, 48px max drift) tuned for the OLD fixed 9.5px size — left
alone, XL text would just start overlapping again since the boxes doing the
comparison hadn't grown to match. Added `var lz=a11y.fs||1` and multiplied
all three thresholds by it, so labels at Large/XL get proportionally more
breathing room, not just bigger text packed into the same old gaps.

(2) **Accessibility popup should open where he'd dragged it, not top-right.**
Traced the real cause rather than just hardcoding a new position to match
his screenshot: `right:10px` was never actually anchored to the real gear
button — on a wide desktop window the toolbar packs from the left (no
`justify-content`), so the last button in the row usually isn't anywhere
near the right screen edge either; it was a rough guess that happened to be
close enough until the toolbar started wrapping. Fixed with the same
"measure the real rendered thing, don't guess a breakpoint" philosophy this
file already uses for `--top-h`: added `positionUnderButton()`, which reads
`btn.getBoundingClientRect()` and opens the popup directly beneath wherever
the gear button actually is, clamped to stay on-screen. This runs once per
session (or once per resize) — `open()` only calls it `if(!pop.style.left)`,
and since `accessPop` is already registered with `makeDraggable()` (from the
last round of fixes), a manual drag sets that same inline `left` too, so a
deliberate drag isn't fought on the next open; `resetDraggedBoxes()` (window
resize) clears the inline style back to `""` for all four draggable boxes
including this one, which is exactly the signal that tells `open()` a fresh
anchor is needed.

(3) **"the star suffix i believe can have water or dissident or both"** —
checked the NMS wiki before touching anything (`Water` added in the Abyss
update, `Dissonant` added in Interceptor, years apart) rather than assume
Tony's memory or my own prior implementation was right. Confirmed: these
are two independent per-system conditions ("has an ocean world" / "has a
dissonant world"), not a single 3-way classification — a system can
legitimately show both suffixes together. `generateSystem()` already rolled
them as two separate independent checks (`s.water=r()<0.18;
s.dissonant=r()<0.10;`), so the procedural side was already correct and
already capable of producing both on the same system. The bug was entirely
in Edit system: a single `<select>` (None/Water/Dissonant) that could only
ever hold one value, and `applyOverride()`'s merge logic explicitly cleared
the other whenever one was set (`if(d.suffix==="Water"){s.water=true;
s.dissonant=false}`) — so editing a system could silently destroy a
procedurally-rolled Dissonant flag just by touching the Water field, or vice
versa. Replaced the dropdown with two independent checkboxes, replaced the
mutually-exclusive merge with two independent `if(d.water!==undefined)` /
`if(d.dissonant!==undefined)` checks (same pattern `blackHole`/`atlas`
already use), fixed the info panel's display line so it shows both when
both are true ("F6 // Water Dissonant") instead of only ever the first one
checked, and updated `filter.mjs`'s payload allowlist plus
`system-edit.mjs`'s header doc comment to match the new shape.
Verified via `node --check` on `preview.html`, `filter.mjs`, AND
`system-edit.mjs` (all three touched this round), tag-balance, ID-existence
(158 targets, all present — the two new checkbox ids are new), and two
separate diffs confirming exactly 6 blocks changed for the labels/popup fix
and 5 for the Water/Dissonant fix, nothing else touched. **Not deployed** —
same combined `preview.html` + `netlify/functions/*.mjs` push as the rest of
this session, `data/overrides.json` excluded as always. The label sizing at
XL, the popup's new anchor position on a real device, and the Water+Dissonant
display all still need Tony's own on-device look before being trusted, same
standing sandbox limitation as everything else in this project.

**Session 26, final small round — cosmetic layout, economy stars + conflict
badge.** Tony sent two screenshots — one of the app's own info panel, one a
reference screenshot from the real game's own panel — and asked for two small
layout matches: (1) the conflict tier number (a small "3"-style badge) should
sit directly under the crossed-swords conflict icon instead of floating at
the far right edge of the row; (2) the economy star rating should be a
vertical stack directly under the economy icon, not a horizontal row pushed
to the right — "which is what it is like in game" per his reference shot.
Both rows previously used `margin-left:auto` to shove `#pEcoStars`/
`#pConBadge` to the end of the flex row, decoupled from their icon. Added a
shared `.iconstack{display:flex;flex-direction:column;align-items:center;
gap:3px;flex:none}` class and moved both `#pEcoStars` and `#pConBadge` to sit
inside the same wrapper as their icon (`#icEco`/`#icCon`) rather than at the
row's tail; changed `.starRating` from a horizontal row to
`flex-direction:column` so the stars themselves stack; `.conBadge` dropped
its own right-alignment now that its container handles positioning. Neither
`ecoStars()` nor `conBadge()` (the functions that generate the star/badge
markup) needed to change — they're unaware of how their container arranges
the output, only the CSS/HTML around them moved. Verified via `node --check`
(pass), tag-balance with script stripped (pass), ID-existence (158 targets,
unchanged — no new ids this round), and a diff confirming exactly 2 blocks
changed (the `.iconstack`/`.starRating`/`.conBadge` CSS, and the two `.row`
markup blocks for Economy and Conflict). **Not deployed** — same combined
`preview.html` + `netlify/functions/*.mjs` push as the rest of this session,
`data/overrides.json` excluded as always. The real on-screen spacing/
alignment against the game's actual panel still needs Tony's own look, same
standing sandbox limitation as everything else here.

**Session 26, one more round — row gap + real crossed-swords icon.** Tony
sent two more screenshots (his Elvesum panel next to the real game's own
panel) and flagged that a higher star rating visibly pushed the Conflict row
down, leaving a bigger gap than the real game has, plus asked for the plain
"X" conflict icon to be swapped for an actual crossed-swords icon.
Root cause of the gap: `.row` uses `align-items:flex-start`, so a row's total
rendered height is set by whichever of its two columns is taller — at a
3-star rating the icon+stars column ran to roughly 63px while the economy
text next to it (label/value/sub, 3 short lines) only needed about 40px, so
the Conflict row only ever started after the TALLER column finished,
leaving visible dead space under the shorter text. Fixed two ways at once:
shrank the star SVGs from 11px to 9px and tightened their stacking gaps
(`.starRating` 2px→1px, `.iconstack` 3px→2px), and added a new `.row-eco`
class on just the Economy row with `margin-bottom:4px` instead of the
default 9px — deliberately scoped to that one row (via a targeted class, not
a global `.row` change) so Race and Conflict keep their normal spacing.
For the icon: tried to pull real SVG path data from lucide.dev, unpkg,
jsdelivr, and the Iconify API first rather than hand-guess coordinates, but
every one of those came back completely empty through the fetch tool (only
the plain lucide.dev icon *page* — no raw path data — returned real content;
raw .svg/.json endpoints on all four hosts returned nothing, likely the
fetch tool stripping non-HTML content types). Rather than guess blindly,
hand-built a crossed-swords glyph in the same minimalist stroke-line style as
every other panel icon — two blades crossing near centre, each with a short
perpendicular crossguard and a small filled pommel dot at the handle end —
then rendered the *exact* path data that was about to ship into
`preview.html` to a real PNG with `cairosvg` and looked at it before
committing, rather than trusting the coordinates on paper. It read clearly as
crossed swords, not just an X, so kept it.
Verified via `node --check` (pass), tag-balance with script stripped (pass),
ID-existence (158 targets, unchanged — no new ids this round), and a diff
confirming exactly 5 clean blocks changed: the new `IC_CONFLICT` icon
markup, the `.starRating`/`.iconstack` gap CSS, `ecoStars()`'s SVG size,
the `row-eco` class added to the Economy row's markup, and its CSS rule.
**Not deployed** — same combined `preview.html` + `netlify/functions/*.mjs`
push as the rest of this session, `data/overrides.json` excluded as always.
The real on-screen spacing and how legible the new icon reads at actual
render size (16x16 in the panel, smaller still than the 240x240 test render)
still need Tony's own device look, same standing sandbox limitation as
everything else in this project.

**Session 25 continued (2026-08-07) — real routing bug, same session as the
hyperdrive-default work above.** Tony sent two screenshots of a plotted course
and described the path as "goes up right back up instead of say up left up" —
correctly reading as a route that doubles back on itself rather than heading
steadily toward the target. Explained the ring colours first since they're not
obvious: the **cyan ring is `focusRing`, your current location**; the **orange
rings/dots are the plotted route's waypoints** (`selRing`/`courseDots`, both
gold). Read `findRoute()` and found a real gap: each hop only had to be (a)
within jump range of `cur` and (b) the closest real charted star to that step's
"ideal" straight-line point — nothing required the chosen star to actually be
closer to the target than `cur` already was. A real star sitting sideways or
slightly behind the current position could still win as "nearest to ideal" if
nothing better was in range, producing exactly the visual jog Tony described.
Confirmed this was a real, fixable defect (not just camera-angle/3D-projection
confusion) before touching anything, per standing rule, then got Tony's
go-ahead via a quick options question rather than assuming. Fixed with a single
guard in the candidate loop: `if(wpDist(c,to)>=remain) continue;` — a real star
is now only eligible if it's strictly closer to the target than the current
position; if none qualifies within the searched region shells, the hop falls
through to the existing unnamed "jump into open space" fallback (already
guaranteed to make progress, since it's placed directly on the ideal line).
Verified with a from-scratch headless Node harness (`route_test.js`) that
extracts the real `findRoute`/`regionCandidates`/`wpDist`/etc. code verbatim
(not reimplemented) and runs 60 randomized from/to/range trips: **2,202 hops
checked, every single one strictly closer to the target than the hop before
it, zero failures**, plus a small constructed-candidate regression check
confirming the new guard actually rejects the exact shape of candidate that
caused the bug. Also re-ran the standard checks: `node --check` (pass), tag-
balance with script stripped (pass, 0 mismatches), ID-existence (all 151
`getElementById` targets exist), and a diff confirming only this one block
changed on top of the earlier hyperdrive-notice edits. **Not deployed** — same
`preview.html`-only GitHub push needed; the on-screen route shape still needs
Tony's own look once live, same sandbox rendering limitation as always.

**Session 25 continued again — follow-up bug from the fix above, caught by
Tony from a real screenshot before deploying.** A course plotted at 894 LY /
11 jumps (Basic 100 LY range) only showed 6 circles: 1 start, 4 middle dots,
1 destination — missing roughly half the jumps, and still missing after
zooming/flying in, so not a render-distance issue. Root cause: `drawCourse()`
only ever drew a dot for waypoints where `w.real!==false` (i.e. only named
real systems) -- unnamed "jumped into open space" stops (`findRoute`'s
existing fallback when no real star qualifies) got no marker at all, even
though the dashed line itself correctly passes through every stop. Two
things compound to make this common now: the new default range is Basic
(100 LY, from earlier this session), and a ~400 LY region with ~22 stars in
it only has roughly 1-2 real systems within an actual 100 LY hop of any given
position -- and the routing fix earlier in this session made hops stricter
(must get closer to target), so a chunk of that already-small pool now fails
the check and falls back to unnamed. The line was always correct; only the
dot markers were incomplete. Fixed by dropping the `real!==false` filter in
`drawCourse()` entirely -- every intermediate stop now gets a dot, named or
not, so the visible marker count always matches the reported jump count.
Verified via `node --check`, tag-balance, ID-existence, and a diff confirming
only this one block changed on top of the session's other edits (8 total
blocks touched today, all accounted for). **Not deployed** — same
`preview.html`-only GitHub push needed as everything else this session.

**Session 25 continued yet again — Tony's real ask: "never go to open space,
only star systems, check online for verification."** Searched and fetched the
NMS wiki's Hyperdrive page to confirm before touching anything (not assumed):
confirmed the hyperdrive is strictly "FTL propulsion drive that allows
starship to attain warp speed and jump between neighbouring systems", accessed
via the Galactic Map -- so every route hop genuinely must be a real charted
star, never a point in empty space (also confirms the game's real base range
is 101 LY, validating this session's earlier 100 LY "Basic" default).
Diagnosed why the earlier "must get closer" fix still let unnamed stops
through: `regionCandidates()` (used only by `findRoute`, confirmed via grep --
safe to change without touching the visible local-slice density) was still
piggybacking on the `#sPer` render-density slider (default 22 stars/region)
for its candidate pool, which is comfortably dense at high hyperdrive ranges
but leaves only ~1-2 real stars within an actual 100 LY hop at Basic range --
too sparse to reliably find one, let alone one that makes progress. Bumped
`regionCandidates`' sampling to up to 200 stars/region (independent of the
visual slider) and widened `findRoute`'s search shell from radius 2 to 3.
Built a headless harness (`route_test2.js`/`route_test3.js`, extracting the
real functions verbatim via a regex pull of the live file, not hand-copied)
and immediately caught a genuine regression from the density fix alone: with
`best` now unreachable more often in a sparse pocket, the old "nearest
in-range star regardless of progress" fallback (nearest to `cur`) could pick
something *worse* than where you already were, and from there flip right back
-- an exact two-star infinite ping-pong (`Tadel-I` <-> `Tanieth`, verified with
a hand-reproduction of Tony's own 894 LY/Basic-range numbers), burning all 40
hops without ever finishing a trip that was one good jump from done. Root
cause of the ping-pong: nothing stopped the route from revisiting a star
already in the path. Tony's own rule from earlier in this conversation --
"never goes back to a previous star" -- turned out to be exactly the fix, not
just a nicety: every address ever pushed onto the path is now excluded from
all future candidacy (`visited` set), which makes the specific 2-cycle (and
any short cycle) structurally impossible. Also swapped the compromise-fallback
metric from "nearest to `cur`" to "nearest to the `ideal` bearing point" after
a first attempt at "nearest to the target" was caught (same harness) wandering
further and further from the target over dozens of hops in a sparse pocket --
nearest-to-ideal keeps a forced compromise roughly on the intended bearing
instead of darting off toward whatever's closest overall.
Real finding from all this, worth knowing for next time: a strict "every hop
must get closer to target" and "never revisit a star" turn out to be in
genuine tension in sparse pockets at Basic range -- reproduced via the harness
that Tony's own real 894 LY course, in a sufficiently empty patch, needs ~67
real, non-repeating, always-real-star hops to complete honestly, only 41 of
which fit under the existing `ROUTE_MAX_HOPS=40` cap. Deliberately did NOT
raise the cap or loosen the no-revisit rule to force a shorter-looking number
-- the existing truncation mechanism (`courseTruncated`, "+" suffix,
"(simplified)" label, final dashed run straight to the target) already exists
specifically for exactly this "past this many hops the polyline stops being
useful" case, and a truncated-but-honest report is strictly better than the
old algorithm's suspiciously-clean 11-hop answer, which was clean precisely
*because* it silently allowed backward jumps. Verified with `route_test3.js`,
which reproduces Tony's exact 894 LY/Basic scenario (confirms it now reports
truncated=true rather than looping or faking a route) plus an 80-trip mixed-
range sweep (742 hops total): **zero unnamed intermediate stops and zero
revisited stars across every single trip**, which are now the two hard,
verified guarantees. Also re-ran the standard checks: `node --check`, tag-
balance, ID-existence, and a diff confirming only these 5 blocks changed
(10 total across the whole session, all accounted for). **Not deployed** --
same `preview.html`-only push needed; the real on-screen truncated-route look
for a long Basic-range trip still needs Tony's own pass once live.

**Session 25, one more small round — two follow-up questions from Tony, both
verified rather than assumed.** (1) Asked to confirm that when the remaining
distance is just outside jump range, the router adds however many extra hops
are needed so the final jump actually lands in range. This already holds by
construction -- `findRoute`'s own `while(wpDist(cur,to)>rangeW)` loop
condition is the guarantee, since the only way the loop exits (short of
hitting the hop cap) is for the final real position to already be within
`rangeW` of the target. Proved it rather than just asserting it: added Test C
to `route_test3.js`, engineering 40 trips deliberately placed 2-17% outside
range, asserting the hop immediately before the final target push is always
within actual jump range -- 40/40 pass. (2) Asked whether the NMS wiki's
confirmed 101 LY base range (vs. this session's earlier "100 LY") should
apply to the other hyperdrive-range presets too (500/1000/1500/2200/3000/
6000). Researched via two follow-up searches: 101 LY is specifically the
wiki-documented, exact, unupgraded default -- a fixed constant. The upgraded
presets are different in kind: real players cite ~2,200-2,500 LY as a typical
S-class-with-3-modules result and 6,300+ LY for a modules-upgraded freighter,
but the exact number depends on ship class, which modules rolled, and how
they're placed for synergy bonuses -- there's no single correct value to
"fix" them to, and the existing preset numbers already land squarely in the
community-cited range. So: corrected the Basic option from 100 to 101 LY
(`preview.html`'s `#fHyper` select value+label, the hyperdrive-notice modal
text, and two internal comments) and left the other 6 presets untouched --
explained the reasoning to Tony rather than silently deciding either way.
Also flagged, from Tony's own research on real in-game waypoint routing
(auto-plotted lines stop short and must be manually re-extended jump by jump)
-- this generally matches the app's own approach (each hop aims for up to 95%
of max range along the bearing), so no design change made there, just noted
for the record. Re-verified `node --check`/tag-balance/ID-existence/diff --
still exactly 10 blocks touched across the whole session, all accounted for.
**Not deployed.**

**2026-08-07 note (post-Session 23):** Tony deploys this project via the GitHub
website's drag-and-drop upload (not `git`, so `.gitignore` would do nothing).
The local `data/overrides.json` seed file — which has bitten him before
(Session 18: his real "Sranch Op10079" data got wiped when this local empty
placeholder was swept into an upload) — has been **permanently deleted from
the project folder**, with his OK. It served no runtime purpose locally; the
live site never reads it, only the Netlify Function does, and only against
the real file on GitHub. **Do not recreate `data/overrides.json` locally for
any reason** — if you ever need to inspect the real shared-edits data, read it
from GitHub (`elegra1965-source/nms-galactic-map`, `data/overrides.json`) or
via the admin endpoint (`.../.netlify/functions/system-edit?token=<ADMIN_TOKEN>`),
never by writing a local copy back into this folder.

**Last worked:** 2026-08-07 (Session 25)
**Status:** Tony flagged that the hyperdrive-range setting used for course plotting
defaulted to an S-class upgrade range (2200 LY) with no indication anywhere that this
setting existed or that it needed to match the player's real ship — "not that
obvious." Fixed in `preview.html`, **not yet deployed**:
1. `#fHyper`'s default `selected` option moved from 2200 LY ("S upgrades") to 100 LY,
   relabelled "Basic (default)" — a fresh save always starts with the Basic
   hyperdrive, so this is the honest default rather than assuming upgrades. Added a
   tooltip on the select itself explaining it drives Set course's jump-count math.
2. New one-time popup (`hyperdriveModal`, same modal pattern as the existing
   disclaimer) explaining the Basic-range default and that players with upgraded
   engines need to change it in Filters, with a direct "Open Filters" button that
   unfolds the Filters box and focuses the dropdown. Gated by a
   `nms-galmap-hyperdrive-seen` localStorage flag so it only shows once ever (falls
   back to once-per-page-load if storage is blocked, same fallback the disclaimer
   uses). Wired to fire on whichever happens first: entering Local view (`setMode`)
   or plotting a course (`setCourse`) — covers Tony's "when in local or setting
   course" ask without showing it twice.
3. `closeAllModalBoxes()` updated to also hide the new modal — this file has a
   documented past bug (Session 17-era comment right above that function) where a
   modal left off that list stays visible underneath a newly-opened one, so this was
   checked deliberately, not missed.
Verified via `node --check` on the extracted script (pass), a tag-balance pass with
script content stripped (pass, 0 mismatches), an ID-existence check (all 151
`getElementById` targets exist), and a `diff` against a pre-session backup confirming
only these 6 blocks changed. No live browser pass possible from this sandbox for a
purely local, undeployed change (same standing constraint as every prior session) —
the actual popup timing/appearance still needs Tony's own look once deployed.

---

**Last worked:** 2026-08-07 (Session 23)
**Status:** Live and deployed — confirmed working via Claude in Chrome directly on
`nms-galaxy-map.netlify.app/preview.html`, not just self-tested. Four asks from Tony,
all shipped:

1. **"Tony" → "elegra1965"** in the Edit system modal's subtitle (the git-revert line)
   and the matching server-unreachable error message — the only two user-facing
   mentions found; code comments left alone.
2. **Black hole / Atlas station became editable, not just generated.** Two checkboxes
   added to the Edit system modal ("Black hole present" / "Atlas station present"),
   saved through the same community-override pipeline as Race/Economy/Conflict
   (`filter.mjs` now passes `blackHole`/`atlas` booleans through, `applyOverride()`
   merges them). Previously these were 100% derived from the address's SolarSystemIndex
   (`079`/`07A`) with no way to correct or add one. Edit modal is otherwise untouched —
   Tony was explicit this was the only addition, no redesign.
3. **Black hole no longer replaces the star.** `buildStar()` used to swap the star's
   own geometry/color for a dark-core-plus-violet-ring look whenever `s.blackHole` was
   true (this is what Tony's screenshot of "Hura" showed — the *sun itself* rendered
   as a black hole). The star now always renders normally regardless of `s.blackHole`.
4. **Black hole and Atlas station are separate 3D objects**, built from Tony's own
   reference images rather than procedural geometry (Tony chose "use pics as real
   textures" over a procedural-geometry alternative when asked). Notes, since this is
   the first real external image texture used anywhere in this file (everything else
   is canvas-procedural):
   - Tony's `Atlas Station transparentbackground.png` was **not actually transparent**
     despite the filename — it had a light-grey checkerboard pattern baked into solid
     RGB pixels (an image editor's "transparency preview" that got flattened on
     export). Chroma-keyed it in Python (neutral + bright pixels → alpha 0, smoothstep
     over the boundary for a clean edge) before use. His black-hole reference image
     already had real, clean alpha — used as-is.
   - Both cropped to content and resized to 512px max dimension, saved as
     `icons-web/feature-blackhole.png` (512×346) and `icons-web/feature-atlas.png`
     (443×512).
   - Rendered as `THREE.Sprite` (always faces camera) with a shared `THREE.TextureLoader`
     — `BH_TEX`/`ATLAS_TEX` load once and must stay excluded from the
     `buildSystemView()` disposal loop (same pattern already used for the shared
     `CORONA` texture) or the first system rebuild kills the texture for every
     system after it.
   - **Positioning bug caught and fixed the same session:** the first placement
     formula (`featBase=10+s.planets*3.9`, fractional XYZ offsets) only cleared the
     outermost planet's orbit ring by ~11%, and the Y-offset was steep enough that
     from some camera angles the sprite visually projected *inside* the ring ellipse
     — Tony caught this from a live screenshot, not something code review alone
     would've caught. Fixed by computing the actual outermost ring radius the same
     way the planets themselves do (`lastOrbitR=8+Math.max(0,s.planets-1)*3.7`), then
     placing both objects at `lastOrbitR+12` (a hard clearance margin) with a much
     shallower Y component. Confirmed clear across systems from 1 planet up to 5+ via
     live screenshots.
   - **Deploy gotcha (same lesson as every past GitHub/Netlify upload in this
     project):** the two PNGs first landed at the repo root instead of inside
     `icons-web/`, 404ing the texture request silently (the text label still showed
     since that's separate DOM logic — only the picture was missing). Confirmed via
     `fetch()` status checks run live against the deployed page, not guessed. Fixed
     by re-uploading the whole `icons-web` folder rather than the two files
     individually.
   - Feature placement is **deterministic per system, not random** — same address
     always gets the same relative position, distance scales with planet count via
     the formula above, direction is fixed (black hole up-and-to-one-side, Atlas
     station down-and-the-other-side, the same for every system that has one).

All of the above is live and confirmed, not just shipped-and-hoped — re-tested this
session via Claude in Chrome after Tony's redeploys, including a click-through of
Jump → Enter system → Edit system on a real black-hole system (Nenium), confirming
the checkboxes reflect real system state correctly.

**One real testing limitation surfaced this session, worth knowing for next time:**
this sandbox's Chrome automation tab runs backgrounded (`document.hidden: true`),
which fully freezes `requestAnimationFrame` — scroll-zoom, orbit-drag, and FPS are
untestable from here (confirmed: 0 rAF callbacks fired in 2 real seconds, and
`cam.dist` didn't move after a scroll event). `resize_window` also didn't actually
change `window.innerWidth`, so mobile layout is untestable from here too. Neither is
a reported bug — just sandbox limits — but it means anything involving continuous
camera movement or mobile layout still needs Tony's own device pass or the Phone
Preview Tool, same conclusion as every prior session.

**Session 23 continued — final re-verification via the new `site-review` skill.**
Ran a second live pass against a harder test case: Qoni-II, a binary star with 6
planets (the generator's max) and an Atlas Interface, not the black-hole system used
for the first check. Confirmed: both stars in the binary render as normal stars (the
"star never becomes a black hole visual" fix holds for multi-star systems, not just
single ones); the Atlas Station billboard clears all 6 planet orbit rings cleanly —
the strongest test of the `lastOrbitR+12` clearance formula, since 6 planets is the
generator's ceiling; Edit system modal correctly shows Atlas ticked / Black hole
unticked, matching Qoni-II's real state; console clean, all 39 network requests
returned 200 including both feature textures. No problems found — verdict was 5/5,
"must-have," nothing to add to a to-do list.

**Real finding from that pass, unrelated to today's 4 fixes:** the live Edit system
modal now has fields that were never touched this session — **Region name, Star
class, Suffix (None/Water/Dissonant), Sell%/Buy%, Economy strength, and a new "Giant
planet" system type** (purple-systems-only, caps the system at 1 planet + up to 5
moons, with its own filter checkbox and body-list validation). Confirmed these exist
in the actual `preview.html` on disk (`edRegion`, `edStarClass`, `edSuffix`,
`edGiant`, `fGiant`, `isGiantSys`, etc. all present and wired through the save
payload/`applyOverride()`) — this is not a stale-cache illusion. The file's mtime is
21:21 the same day, hours after this session's own edits were made and pushed,
so this was built by Tony or another session in parallel with this one, not by this
session. Flagging it here since it isn't reflected anywhere else in this handover —
**next session should treat Region name / Star class / Suffix / Economy strength /
Giant planet as real, already-shipped features**, not something to build, and should
get a proper walkthrough of how they were implemented if picking up related work
(this session only confirmed they exist and didn't collide with anything, it didn't
audit the implementation).

---

**Last worked:** 2026-08-05 (Session 22)
**Status:** Tony play-tested the live site on his real S26 (clicking around, no code
reading needed to file these) and sent 4 screenshots across two messages. Diagnosed
and fixed all 4, `preview.html` only, **not deployed yet**:

1. **`#course` (the "COURSE PLOTTED" readout) overlapped the toolbar.** It was still
   hardcoded to `top:50px` — the fixed-pixel positioning every other floating box
   (`#toast`, `#galInfo`, `#galHud`, `#keys` on mobile) moved away from back in
   Session 17 specifically because the toolbar wraps to multiple rows on phone
   widths. `#course` got missed in that migration, so whenever it's showing it
   renders through/behind whatever toolbar row happens to sit at 50px — exactly
   the mess in both of Tony's screenshots. Fixed: both the desktop rule (line ~143)
   and the mobile override (line ~249) now use `top:calc(var(--top-h,Npx) + 8px)`,
   same pattern as everything else.
2. **Pinch-to-zoom only worked in Orbit mode.** Tony reported "couldn't pinch zoom,
   each time tried just rotated til I lost where I was" — his screenshot showed FLY
   as the active control, not Orbit. The two-finger pinch handler's condition was
   `ids.length>=2&&ctrl==="orbit"`, so in Fly mode a pinch gesture fell through to
   the single-finger look-drag code instead, and since both fingers' moves share
   one global `lastX/lastY`, the computed delta jumped wildly between the two
   fingers' screen positions — a real erratic-spin bug, not user error. Fixed:
   pinch now branches on `ctrl` — Orbit keeps its existing `cam.dist*=pinchD/d`,
   Fly dollies the camera forward/back along its own view direction (same axis
   the existing wheel-zoom already uses for fly), so pinch does the same thing on
   touch that scroll/wheel already did on desktop.
3. **Filters box could render off the bottom of the screen with no way to scroll
   to it.** `#filt` (like `#tweak`/`#tel`) had no `max-height`/`overflow` at all —
   unlike `#panel`, which already solved this for itself. With the toolbar wrapping
   to 5 rows on his S26 plus the existing fixed 140px gap `#leftcol` adds on top of
   that, the box can start low enough that Reset/Export/Import (and depending on
   toolbar height, more) lands past the bottom edge — and since `html,body` has
   `overflow:hidden` and the box itself had no internal scroll, that content was
   completely unreachable, not just visually cramped. This is what Tony meant by
   "the filter gets lost." Fixed: `#filt` in the mobile media query now gets
   `max-height:calc(100vh - var(--top-h,150px) - 150px);overflow-y:auto`.
4. **Star/planet labels stack into a disconnected column when zoomed out.** Tony
   tested this himself in the Phone Preview Tool and sent a screenshot: a long
   vertical list of star names bunched near the top of the screen while the actual
   star dots were spread across the whole frame below, clearly not lining up.
   Root cause in `updateLabels()`'s collision-avoidance pass (added Session 15 for
   the much narrower case of a planet+moon landing on the same point): when
   zoomed out, many stars project into a small shared screen region simultaneously
   — not just an occasional close pair — and the old loop kept nudging every
   conflicting label 16px further up with no limit on total drift, so a whole
   cluster of labels walks arbitrarily far (up to the 20-iteration cap, 320px)
   from the real star it's meant to be labelling. Fixed: added a cap — if
   resolving a collision would push a label more than ~48px from its true
   projected position, hide that label instead of placing it somewhere
   misleading. A missing label at extreme zoom-out reads better than a wrong one.

**Verification:** `node --check` on the extracted script (pass), a tag-balance pass
with script content stripped first (pass, all tags balanced), an ID-existence check
(pass, all 132 `getElementById` targets exist in markup), and a `diff` against the
pre-session backup confirming only these 4 blocks changed — nothing else touched.
No live-render check possible from this sandbox, same constraint as every prior
session; the label and pinch-zoom fixes in particular need Tony's own eyes once
deployed.

**Also raised, not yet acted on:** Tony suggested starting Local view more zoomed
out by default so there's a wider overview before zooming in — a real idea (Local's
default orbit `cam.dist` is 50 out of a 5–260 range) but hasn't been sized/confirmed
with him yet, and note it only affects Orbit control (Fly's starting `flyPos` isn't
tied to that same distance value). Revisit if he still wants it after trying the
pinch-zoom fix.

**Session 22 continued:** Tony's next report — the Course Plotted box has no way to
dismiss itself short of hitting Clear (which throws the plotted course away entirely),
so it sits over the local star field the whole time a course is active, blocking the
very systems/jumps he's trying to look at. He suggested collapsible, or even movable
(drag to the bottom out of the way, back to position when expanded). Went with
collapsible, matching the fold/chevron pattern the Filters box already uses (Filters
itself doesn't need any change here — it already collapses via its own ▾/▸ header,
confirmed in his screenshot). Split `#course`'s markup into a `.chead` row (kicker +
target name + a new ▾/▸ `#bCourseMin` button, always visible) and a `#cBody` wrapper
(distance/jumps/bearing/target-from-centre/Jump-to/Clear, hidden via `#course.min
#cBody{display:none}` when collapsed) — same toggle mechanics as the panel's own
`#bPanelMin`. Deliberately did **not** implement "move to the bottom": on mobile the
bottom is already occupied by the info panel's own sticky Enter-system/Set-course row
(the exact thing Session 17 pinned there so it wouldn't get lost off-screen) —
relocating the collapsed course box there would just recreate a version of the
toolbar-overlap bug fixed earlier this session, for no real gain over just shrinking
it in place. `setCourse()` now force-clears the `.min` state whenever a fresh course
is plotted, so collapsing an old course never leaves a *new* one hidden by surprise.
Verified: `node --check` (pass), tag-balance (pass), ID-existence (133/133, the new
`bCourseMin` id included), diff against the pre-session backup confirming only the
intended blocks changed. **Not deployed** — same `preview.html`-only push as everything
else this session.

**Session 22 continued again:** Tony expanded Filters with a system also selected
(so `#panel` was bottom-docked too) and found Reset/Export/Import genuinely hidden
*behind* the info panel, not just scrolled out of view — a zoomed screenshot showed
the buttons exist right where expected, just painted over. Root cause: the mobile
max-height fix earlier this session let `#filt` grow to fill the space down to the
bottom of the viewport, but that calculation had no idea `#panel` might ALSO be
bottom-docked there at the same time — `#panel` sits later in the DOM, so at equal
z-index it paints on top and eats the click along with the visual. Fixed with a new
`syncFiltBoundary()`, called every frame right next to the existing `syncPanelOffset()`
(same live-rect-measuring technique, just for CSS instead of the camera): when
`#panel` is showing and its rect actually overlaps `#filt` horizontally, clamp
`#filt`'s max-height to stop just above `#panel`'s real top edge, so the box's own
`overflow-y:auto` kicks in early enough that Reset/Export/Import stay reachable by
scrolling inside Filters instead of ending up underneath the panel. No-op on desktop
and mobile-landscape, where `#panel` docks to the right and never shares horizontal
space with the left-docked `#filt`. Verified: `node --check`, tag-balance,
ID-existence, all pass. **Not deployed.**

**Session 22 continued yet again — landscape "planets hidden" + draggable boxes:**
Tony entered a system in mobile landscape and the 3D view showed only the star(s)
crammed against the info panel's edge, no planets, no orbit rings, huge empty canvas.
Confirmed via `total=2+Math.floor(r()*5)` in the generator that no system can ever
have zero bodies, so this wasn't an empty system — something was actively hiding
real content. Root-caused it by writing a small standalone Node simulation of
three.js's actual `PerspectiveCamera` frustum math (`/tmp/camtest.js`, not persisted)
and feeding it this project's real numbers: `syncPanelOffset()`'s panel-occlusion
camera correction (built in Session 18 for a **desktop** panel covering ~16% of a
1920px window) was never tested against mobile landscape, where the same right-docked
panel covers ~36% of a 915px-wide screen. At that ratio the simulation showed the
correction pushes the *entire* scene — including the star sitting dead-centre on the
camera's own look-at target — to roughly 68% across the screen, past the panel's own
left edge, rather than just nudging one occluded edge-case body into view like it
was designed for. Fixed with a cap: `syncPanelOffset()` now disables the correction
entirely (falls back to zero) once the occluded width would exceed 22% of the window,
since past that point the "fix" does more harm than the original occlusion ever did.
Left the underlying desktop-scale behaviour untouched (16% is comfortably under the cap).

Tony's own proposed alternative, sent while this was being tracked down, was more
fundamental and better: instead of Claude chasing every device/orientation
permutation of "box X overlaps box Y" one screenshot at a time (this session's whole
punch list), let him drag Filters, the system info panel, and Course Plotted wherever
actually works on his screen. Built a generic `makeDraggable(boxEl,handleEl)` wired to
each box's existing header (`#fHead`, `#panel .phead`, `#course .chead`) — the same
elements that already toggle collapse on tap, so drag vs. tap is distinguished by the
same >=6px movement threshold the canvas's own star-picking already uses (a real drag
swallows the click that would otherwise also fire the collapse toggle). Dragging pulls
a box out of its normal flex/corner-docked CSS by switching it to `position:fixed`
with explicit `left/top` captured from its on-screen position at grab time (no jump),
clamped to stay on-screen. Deliberately session-only, not persisted to localStorage —
and reset automatically on every `resize` (which also fires on orientation change), so
a box dragged to make sense in landscape can never end up stranded off-screen after
rotating back to portrait. Also added a permanent "Boxes in your way?" entry to the
existing About/disclaimer modal so the capability is discoverable by anyone, not just
this session's chat — the modal already auto-shows once per browser and stays
reachable via the About button, no new plumbing needed.

Verified: `node --check` (pass), tag-balance including `<a>` this time since the About
modal edit touches sister-site links (pass), ID-existence (pass), diff against the
pre-session backup reviewed in full — only these blocks plus every earlier fix this
session changed. **Not deployed** — same `preview.html`-only push as everything else.

**Next step:** Tony pushes the updated `preview.html` to GitHub
(`elegra1965-source/nms-galactic-map`), same as every other change to this project.

---

**Last worked:** 2026-08-04 (Session 18, continued)
**Status:** Same session as below, continued after Tony deployed the first 4 fixes and came
back with more. In order: (1) live-verified the 4 deployed fixes actually worked (they did —
caught via `javascript_tool` on the live site, not just re-reading code); (2) fixed a real
data-loss risk Tony flagged — his real "Sranch Op10079" system data had been wiped from the
live shared-edits store, root cause was almost certainly `data/overrides.json` (an empty local
placeholder) getting swept up in a GitHub upload; (3) fixed the "reset does nothing" dead-button
report — the button now relabels itself Clear/Reset depending on whether there's actually
somewhere real to go back to, with a toast either way; (4) built real multi-hop hyperdrive-range
course plotting (was a single straight line regardless of distance) — `findRoute()` walks toward
the target in range-sized steps, snapping each hop to an actual deterministically-generated real
system near the ideal point, capped at 40 hops with honest truncation reporting; verified with a
headless Node test suite (`route_harness.js`, 33 assertions) since no browser render is possible
here — a 40,000 LY test route at 2,200 LY range produced 20 real hops, every one under the range
cap; (5) diagnosed Tony's "still shows straight line" follow-up as NOT a bug — every star
reachable by clicking in Local view is within the default ~1,700 LY slice radius, inside the
2,200 LY default hyperdrive range, so a straight line was the *correct* answer for those targets;
proved the routing itself was fine by calling `findRoute()` directly on the live deployed site;
(6) but added visible hollow-ring waypoint markers anyway, since even genuine bent routes were
too subtle to read at normal zoom (confirmed live — a real 5-hop route looked dead straight until
zoomed in); a first attempt using filled dots in the same gold tone as real stars was invisible
against the star field, swapped for a stroked ring texture with `depthTest:false` so it can't be
swallowed by a nearer bright star; (7) fixed a real discoverability gap Tony hit firsthand ("no
enter or go... what about mobile?") — the Jump button used to live in the toolbar behind Glyphs/
Random/Filters, nothing next to the address input told you what to do after typing; moved Jump to
sit directly next to the input styled gold as the obvious next step, and added
`enterkeyhint="go"` so phone keyboards show an actual "Go" key instead of a generic return arrow;
(8) built real per-galaxy visual variants — Tony sent 8 screenshots of his own reference material
("No Man's Sky - List of Galaxy Names and Types", 257 entries) after noticing every galaxy looked
the same colour. Transcribed all 255 typed entries (2 are unknown/"???" in Tony's own source and
already excluded from the app's 255-long GALAXIES list) into a lookup table, cross-checked every
name against the existing code array programmatically before trusting any of it — 254/255 matched
immediately, the one mismatch was this end's own transcription typo (#243), not Tony's data; type
counts came out 178 Norm / 26 Harsh / 26 Empty / 25 Lush, matching wiki-verified totals already on
record in this project. Replaced the old `(n+1)%20` approximation (which is why switching between
nearby galaxies in the dropdown mostly looked identical — most of that pattern was "Norm") with
the exact table. **Caught a real self-introduced bug during verification**: the 255-character type
string got hand-retyped into the file during the edit and silently truncated to 215 characters;
caught only because the verification step checked the in-file string's actual length against the
source data rather than trusting the edit succeeded, then fixed by regenerating the string
programmatically instead of by eye. Extended the nebula palette so ALL bands (inner core, mid,
outer rim) shift with type, not just the mid band as originally scoped — Harsh runs hot
red/ember throughout, Lush stays green, Empty goes pale/cold with a dimmer core, Norm is the
unchanged original look. Verified with an exhaustive Node test asserting all 255 galaxies resolve
to the correct type, then visually spot-checked live on the deployed site by patching in the new
functions and switching between Euclid/Calypso/Eissentam/Budullangr — all four read as distinctly
different galaxies now. **Not deployed** — same as every change this session, needs Tony's push.
Only `preview.html` changed; per Tony's explicit ask, flagged clearly (to him and here) that
`data/overrides.json` must never be part of that upload.

---

**Status (first half of Session 18):** Four fixes made to `preview.html`, verified via `node --check` + a full
HTML tag-balance pass + manual logic tracing, but **NOT yet deployed** — this sandbox
has no git/GitHub credentials for this project's GitHub-connected deploy, so Tony needs
to push `preview.html` (and only that file changed this session) to the repo himself
for these to go live. Sequence: Tony asked for an honest opinion on the live site vs.
other NMS community tools (Galactic Atlas, Portal Repository, glyph decoders) — verdict
was genuinely positive, nothing else out there combines a true 3D flyable galaxy +
in-system view + working portal-glyph keypad + shared community edits. Four real issues
surfaced from actually clicking through the live site (not just reading code), fixed in
priority order:

1. **P1 — planets rendering invisible behind the info panel (real bug).** Reported
   initially as "a system says 6 planets but only 5 render." Root cause found by
   force-recoloring the missing mesh bright magenta via `javascript_tool` on the live
   site: the 6th planet WAS rendering, correctly positioned — directly behind the
   right-docked `#panel` (278px desktop / 300px mobile-landscape), which visually
   covers part of the canvas that the camera doesn't know about (it frames the FULL
   `window.innerWidth`). Any body whose orbit projects into that strip is permanently
   hidden, for any system, not just this one. Fixed with a new `syncPanelOffset()`
   (called every frame from `animate()`) that reads `#panel`'s live `getBoundingClientRect()`
   and, when it's in right-docked mode (`rect.left > w*0.5` — true on desktop and mobile
   landscape, false on the mobile-portrait bottom dock, which is full-width and doesn't
   occlude anything), shifts the camera's frustum left via `camera.setViewOffset()` by
   the occluded width. This also keeps label projection and click-raycasting correctly
   aligned for free, since both already go through `camera.projectionMatrix`.
2. **P2 — site no longer opens on Tony's personal system by default.** The address box
   had `value="1067FA5A9B2C"` hardcoded in the HTML (Tony's own real, community-edited
   system — "Sranch Op10079", note "My skyscraper ARG system"), and boot called
   `jumpTo()` on it unconditionally, which internally opens the info panel and shows it
   as "CURRENT LOCATION" for **every visitor**, before `setMode("galaxy")` masked the
   3D view (but not the panel) a line later. Tony: "it should have community edited but
   it shouldn't be 1st port of call when running — should go to ready for input of hex
   number or glyphs." Fixed: `jumpTo()` gained an optional `silent` param that skips
   `setMode("local")` + `updatePanel()` (every real user action — Jump, Enter key,
   keypad, course-plot, galaxy-switch — is unaffected since none of them pass it); boot
   now calls `jumpTo(BOOT_ANCHOR_ADDR, true)` where `BOOT_ANCHOR_ADDR` is the same real
   coordinate kept purely to seed internal slice/camera math, never shown. The address
   input's HTML default is now `value=""` with a `placeholder`, so a fresh load lands on
   the galaxy view, input empty and ready to type into. Caught and fixed two knock-on
   regressions from this before calling it done: the **Reset** button used to fall back
   to `focusSystem.address` (which is still the boot anchor internally) — would have
   silently refilled the box with Tony's real address the moment anyone clicked it,
   defeating the fix; added a `hasRealLocation` flag (true only after a *real*, non-silent
   jump) so Reset now correctly falls back to empty instead. The galaxy-switcher dropdown
   also used to re-jump on whatever's in the address box — with it now empty by default,
   switching galaxy before typing anything would have flashed a red "Address needs 12
   glyphs" error; patched to silently re-anchor on `BOOT_ANCHOR_ADDR` in that specific case.
3. **P3 — overlapping body labels.** Confirmed live: a planet and its close moon
   projected to nearly the same screen point and read as one illegible run-together
   label. `updateLabels()` placed every label independently with zero collision
   awareness. Added a cheap same-frame collision pass — labels are already priority-sorted
   nearest-camera-first, so when a lower-priority label's position lands within 64px
   horizontal / 16px vertical of one already placed this frame, it steps 16px further up
   (labels already float above their anchor via CSS) until clear, max 20 iterations.
4. **P4 — no explanation of what a portal address even is for a newcomer.** Added a
   third item to the existing "Before you explore" disclaimer modal (already shown once
   automatically per browser, reachable anytime via the About button — the natural home
   for this, no toolbar clutter needed): "New to No Man's Sky?" explaining the 12-symbol
   code in plain English and pointing at Random/Glyphs as ways in without one.

**Verification this session:** `node --check` on the extracted script (clean), a proper
HTML tag-balance pass with the `<script>` block stripped first (clean — an earlier naive
attempt without stripping script content threw false positives from JS comparison
operators being misread as tags, worth remembering if repeating this check), manual
trace of every `jumpTo()` call site to confirm only the boot call passes `silent`, and
hoisting-order check confirming `BOOT_ANCHOR_ADDR` (declared near the bottom, in the
init sequence) is safe to reference from the earlier-defined `galSel` change handler
since the handler only ever executes after the whole script — including that
declaration — has already run once at load. No live-render check possible from this
sandbox (same constraint as every prior session) — Tony's own look after deploying is
the real check, particularly the panel-occlusion fix, camera framing.

**Next step:** Tony pushes the updated `preview.html` to GitHub (`elegra1965-source/nms-galactic-map`)
the same way as every other change this project's shared-edits feature required.
Nothing else in the repo (functions, overrides.json, manifest, etc.) was touched this
session. `preview.html.bak_1785837968` in the folder predates this session, unrelated.

---

**Last worked:** 2026-08-04 (Session 17)
**Status:** LIVE at `nms-galaxy-map.netlify.app`, GitHub-connected deploy, cross-linked
from NMS Hub, installable as a PWA. Labels/camera-matrix/moon-orbit bugs from Session 15
confirmed fixed by Tony. **Shared community system editing is now confirmed fully
working end-to-end by Tony, in a real browser, on both desktop and mobile** — Edit
modal, dropdowns, save, GitHub write, "Community edited" badge, and the in-system
label refresh all clicked through and verified. See "Session 17 continued" below for
the chain of real bugs found and fixed to get there.

**The last two "never seen render" unknowns are now closed, confirmed by Tony's own
screenshots:** the in-system 3D view renders correctly (textured planets, real corona
on the star, orbit rings, a genuine third planet like Elyaketh sitting further out on
a wider orbit than the framed crop shows — not a bug), and in-system labels work too
(★ prefix on the star, ↳ prefix on moons, all matching the panel's body list) once the
Labels button is actually toggled on (off by default on every load, same as galaxy/
local view — not a bug either, first report of "missing" labels was just that).

**Real-device mobile pass (S26), same session:** Tony's first phone screenshots surfaced
real layout bugs that no amount of code-reading would have caught. Fixed: (1) the FPS/
SHOWN/MODE stats box and the left-side Tweak/Filters/Telemetry stack were pinned at
hardcoded pixel offsets (`top:50px` / `top:150px`) assuming a short toolbar -- on his
actual screen the toolbar wraps into 4+ rows and is taller than that, so stats rendered
on top of the Glyphs button. Replaced with a `--top-h` CSS variable the page measures
from the real toolbar height on every resize and once fonts finish loading (see
`syncTopOffset()`), so it can't drift out of sync on any screen width again. (2) Enter
system/Set course were buried below Race/Economy/Conflict/tags/body-list inside the
scrollable panel, invisible without scrolling first -- pinned them to the top of the
panel via a mobile-only `order:-1` + `position:sticky` combo, which required switching
`#panel`'s show/hide from an inline `style.display` (JS) to a `.show` class (CSS), since
an inline style would otherwise always beat the stylesheet's `display:flex`. (3) "Sensor
telemetry" overflowed its collapsed 158px header box -- shortened to "Telemetry"
(matches the existing "Tweak"/"Filters" one-word pattern). (4) Hid the FPS/SHOWN/MODE
debug readout entirely on mobile per Tony's own "does it need to be there?" -- kept on
desktop. (5) Landscape phones don't have room to stack toolbar + left boxes + a
bottom-docked panel without overlap (confirmed: panel covered the Filters box) -- added
an `orientation:landscape` rule that docks the panel to the right instead, like desktop
already does, so it can't collide with the left-docked boxes at all. Also added, per
Tony's request: a fan-made/procedural-data disclaimer modal (reuses the existing
Edit/Report `#modalWrap` overlay), shown automatically once per browser via
`localStorage`, reachable again anytime via a new "About" toolbar button. None of this
has been seen on a real screen yet -- all reasoned from the actual CSS plus Tony's
screenshots, verified with the usual `node --check`/tag-balance/ID-existence checks, not
a live render. Next real step is Tony reloading on the S26 again (both orientations) to
confirm.

**Second mobile pass, same session, from Tony's follow-up screenshot:** (1) address
input had no label and no way to reset it -- added a small "Portal address" label and
a Reset button (restores the box to `focusSystem.address`, your actual current
location). (2) address input now forced onto its own line on mobile via a wrapping
`#addrGrp` with `width:100%` (a 100%-wide flex child always starts a new row). (3)
toolbar reflowed via mobile-only `order` values into: view-mode toggles, then address
input, then Glyphs/Random/Filters/Jump, then Labels/Grid, then Install app/About --
matches the grouping Tony asked for. (4) Tweak and Sensor Telemetry hidden on mobile
entirely per Tony questioning whether they're needed there -- both power-user/debug
tools, not needed by a first-time visitor; kept on desktop. A new toolbar "Filters"
button gives direct access to the one left-column box mobile keeps. (5) added a
collapse/expand toggle (▾/▸) to the system panel's own header, works on both mobile
and desktop, hides everything but the name/region row when collapsed -- addresses "too
much screen space taken up" without removing the detail entirely. Same caveat as
everything else this session: reasoned from CSS + screenshots, not seen live yet.
**Folder:** `C:\Users\elegr\Claude\Projects\NMS Galactic Map`

---

## Session 17 continued — shared edits taken from "built" to "actually works live"

Tony started clicking through the real Edit-system flow on the live site and found a
chain of real bugs, each one only visible once the previous one was fixed — a good
example of why "self-tested, never clicked" (Session 16's status) undersold how much
was still broken:

1. **Economy/Conflict dropdowns.** Were free-text inputs; Tony asked for dropdowns
   like Race already had. Converted to `<select>` built from the same `ECON`/
   `CONFLICT` tables the procedural generator itself uses (`buildEconConflictSelects()`
   in `preview.html`), grouped by economy type / by Low-Medium-High tier.
2. **"Nothing happens when I click Save"** — turned out to be two stacked bugs:
   - The error box (`#editErr`) rendered at the *top* of a tall modal while Save sits
     at the bottom; any error was genuinely invisible without scrolling up first. Fixed
     by calling `.scrollIntoView()` on the error element every place it's shown, in
     both the Edit and Report modals.
   - Once errors became visible, the real one appeared: `GitHub write failed: 404`.
     `netlify/functions/system-edit.mjs` had `GITHUB_OWNER = "TODO-tony-github-username"`
     — a placeholder from Session 16 that was never swapped for Tony's real username.
     Fixed to `"elegra1965-source"`. **This was a real shipped bug, not a Tony setup
     step** — worth remembering if a similar TODO constant ever gets left in again.
3. **False-positive content filter — a real Scunthorpe problem.** Tony's public note
   "my skyscraper ARG system" got rejected as blocked language. Root cause:
   `containsBadWord()` did a raw substring search across the whole normalized string,
   so "sky**scrap**er" tripped on "rape" hiding inside it. Same bug would have blocked
   "grape", "classic"/"assassin"/"brass" (contain "ass"), "cockpit"/"cockatoo" (contain
   "cock"), etc. Fixed in both `netlify/functions/filter.mjs` (authoritative) and the
   mirrored client-side echo in `preview.html` (`clientPrecheck()`'s `bad()`): split on
   **whitespace only** into words first, normalize each word (leet-substitute, strip
   inner punctuation so "f-u-c-k"/"f.u.c.k" still catch, collapse stretched letters),
   then require an **exact whole-word match** against `BAD_WORDS` — not "does the bad
   word appear anywhere in this word". Verified against a battery of known trap words
   (skyscraper, grape, classic, assassin, cockpit, scunthorpe, grass, glass, pass,
   therapist, well-known — all clean) and real bad words including leetspeak/hyphenated/
   stretched-letter evasion (all still caught). One accepted trade-off: space-separated
   evasion like "f u c k" no longer catches, since spaces are now real word boundaries —
   worth it to stop blocking ordinary English words.
4. **GitHub write 403 "Resource not accessible by personal access token".** Once the
   404 was gone, this came up next. Root cause, confirmed by Tony's own token settings
   screenshot: the fine-grained PAT had the right permission (Contents: Read and write)
   but **zero repositories actually selected** — "This token does not have access to
   any repositories." Purely a GitHub-side setting only Tony can fix (token
   creation/editing is outside what Claude can do). Fix: Edit the token → Repository
   access → select `nms-galactic-map`. Documented as its own troubleshooting entry in
   `SHARED-EDITS-SETUP.md` (both the 404-wrong-owner and 403-no-repo-selected cases),
   including the specific trap of a fine-grained token created *before* a repo
   delete/recreate not automatically following the "new" repo of the same name.
5. **In-system star/planet labels didn't update after a save**, while the info panel
   did. Root cause: `buildSystemView(s)` bakes names onto the 3D meshes' `userData` at
   build time, when "Enter system" is first clicked — those meshes don't live-follow
   the `selected` variable. `refreshAfterOverrides()` was reassigning `selected` to the
   fresh post-edit object but never rebuilding the 3D scene, so the old meshes (and
   their labels) kept showing pre-edit data until you left the system view and
   re-entered. Fixed: `refreshAfterOverrides()` now calls `buildSystemView(selected)`
   again if `mode==="system"`, rebuilding the scene in place (camera untouched) right
   after a save. **Tony confirmed this fix working on mobile too**, in-place, no need
   to back out to local view and re-enter.
6. **Collapsible planet/moon editor**, requested alongside the Save bug report: with
   several planets each showing 3 full rows of fields at once, the modal got very tall
   — Save and any error both required a lot of scrolling. Changed `editBodies` entries
   to carry an `open` flag; `renderBodyEditList()` now shows each body as a one-line
   collapsed summary by default and only renders its fields when open. Clicking a row
   opens it and closes any other open row (accordion — only one open at a time,
   directly answering Tony's "why not only have add planet/moon open when click add").
   Clicking "+ Add" opens only the new row and scrolls it into view. Verified with a
   7-assertion pure-logic test of the open/close state machine (collapse-by-default,
   single-open swapping, toggle-to-close, add-always-opens-only-the-new-one).

**End state, confirmed by Tony:** edit → save → GitHub commit → "Community edited"
badge, panel fields, body list, and in-system 3D labels all update correctly, on both
desktop and mobile, without needing to leave and re-enter the system.

---

## Read these first

| File | What it is |
|---|---|
| `SPEC.md` | All the research — address maths, voxel grid, data model, sources. Still accurate. |
| `preview.html` | **The whole app.** Single self-contained file, Three.js r128 from cdnjs. Double-click to open. No build step. |
| `SHARED-EDITS-SETUP.md` | **New.** Plain-English steps for Tony to wire up the shared-editing backend (GitHub token, Netlify Git connect, env vars). Nothing in Claude's power to do — needs Tony's own accounts. |
| `netlify/functions/system-edit.mjs` | The backend. Handles edit/report submissions, filters content, commits to GitHub, and serves the merged data back to every visitor on page load (`GET`). |
| `netlify/functions/filter.mjs` | Shared content-safety filter (profanity/HTML/length/URL stripping). Imported by the function; a small client-side echo of the same word list lives in `preview.html` for instant feedback — keep both in sync if the list changes. |
| `data/overrides.json` | **No longer kept locally — deleted from the project folder 2026-08-07 (see note below).** Real data lives only on GitHub; the Function reads/writes it there directly. |
| `netlify.toml` | Functions directory + a rewrite so `preview.html` keeps serving at `/` without renaming to `index.html`. |
| `glyphs/` | 16 portal glyph PNGs (copied from `_Shared/Glyphs`). |
| `icons-web/` | Processed race + economy icons. Generated from `Icons/` — see below. |
| `Icons/` | Tony's original source icons. Keep — `icons-web/` is derived from these. |

---

## Session 16 — shared community system editing

Tony sent his real in-game system (6 planets) next to the site's generated
version (3 planets, wrong info) and asked for a way to let players enter their
real data — name, planets, moons, resources, notes — and have it show for
everyone, not just locally. Confirmed via `AskUserQuestion` before building:
shared/everyone-visible (not per-device), all three categories editable (system
basics, planets & moons, resources & notes), live immediately with automatic
content filtering + rate limiting + full revert history (free, via git commits)
+ a Report button rather than a manual approval queue, and — since this needs
real server-side code, which plain drag-and-drop can't run — switching this one
project to GitHub-connected Netlify deploys.

**What's built:**
- `netlify/functions/system-edit.mjs` — `POST` with `action:"edit"|"report"`
  validates the address, runs the content filter, rate-limits by IP (8
  edits/hour, 15 reports/hour), reads the current `data/overrides.json` from
  GitHub, merges in the change, commits it back. `GET` (no body) returns the
  merged public system data (IPs stripped) for the client to layer over the
  procedural generator; `GET ?token=<ADMIN_TOKEN>` additionally returns the
  reports list, for Tony to skim.
- `preview.html` — `applyOverride(s)` merges an override into a freshly
  generated system (called at the tail of `generateSystem`, so every code path
  that creates a system picks it up automatically). `loadOverrides()` fetches
  the merged set once on page load and fails silently if the backend isn't set
  up yet (map still works, procedural-only). New **Edit system** / **Report**
  buttons in the panel open a modal (system fields + a dynamic add/remove list
  of planets/moons with biome/water/resources per body) that POSTs to the
  function. A "Community edited" tag and a public-notes block appear on any
  system that has live shared data.
- Defensive detail worth knowing: a malformed/garbage `biome` value coming
  through an override can't crash the 3D renderer — `applyOverride` falls back
  to the procedural biome (or `"Lush"`) if the submitted value isn't a real key
  in `BIOMES`. Verified by test (see below), not just reasoned about.

**Verified without a browser** (see `/tmp/pt3` — not persisted, rebuild if
needed): self-tests on `filter.mjs` (18 checks — profanity incl. leetspeak/
spacing/letter-stretching evasion, HTML/URL stripping, length caps); a mocked
end-to-end harness for `system-edit.mjs` with `fetch` replaced by an in-memory
fake of the GitHub Contents API (20 checks — first-write, merge-not-clobber,
profanity rejection leaves the store untouched, invalid address rejected
before any GitHub call, report vs. edit, per-IP rate limiting, one IP's limit
doesn't affect another, `GET` strips IPs and hides reports without the admin
token); and a pure-logic extraction of `generateSystem`+`applyOverride` from
the real `preview.html` script run under Node (21 checks — override merge
correctness, moon `parent` computed from body order not trusted from the
override payload, malformed biome falls back safely, unrelated addresses
untouched, a moon flagged at body index 0 is coerced to a planet instead of
crashing). Standard `node --check` / tag-balance / ID-existence checks all
pass on the full file. **None of this is the same as clicking the actual
buttons in a browser** — the modal's look, the flow of editing then seeing the
change reflected, and the real GitHub/Netlify plumbing all still need a real
pass once Tony has done the setup in `SHARED-EDITS-SETUP.md`.

**Not done:** a friendlier admin view for the reports list (currently raw
JSON at a URL with a token); no per-address "originally X, edited to Y" diff
view; no way to clear/undo an edit from the site itself (has to be done via
GitHub's file history, explained in the setup doc). Update, Session 17
continued: the edit/save flow itself (the main open item from Session 16) is
now confirmed working — see "Session 17 continued" section above.

---

## PICK UP HERE — the play-test was interrupted

Tony has `preview.html` open in Chrome and we were walking through it together.
He clicks, Claude screenshots his screen and gives feedback. **This works and is
worth continuing** — it has already found bugs that reading the code did not.

**Still never seen render:**
1. ~~Enter system — the 3D orbital view~~ — **confirmed working, see top of doc.**
2. ~~Labels inside the system view~~ — **confirmed working, see top of doc.**
3. **Fly** movement (the camera aim is fixed and unit-tested, but WASD feel is unverified).
4. The course readout panel in its new top-centre position.

**Next steps as given to Tony (he had refreshed but not yet done these):**
1. Click a star off to one side, then Set course → readout should appear top centre.
2. Enter system.
3. Labels.

**Open question for Tony's eye:** stars in Local view look blobby and confetti-like.
Suggested he try Star size ~1.0 and Systems/voxel ~12 and report back. Not yet answered.

**Possible issue, unconfirmed:** the galaxy core looked slightly right of screen
centre rather than dead centre. Camera targets origin and the core plane sits at
origin, so it should be centred — may just be the side panels biasing perception.
Ask Tony to click GALAXY (which resets the camera) and judge. Do not go rewriting
camera code before confirming it is real.

---

## How to test without a browser

**Claude cannot render this.** Sandbox has no browser, npm registry is blocked
(403, same as every prior session), and Chrome MCP force-prefixes `https://` so it
cannot open `file://`. What works instead:

### 1. Headless play-test harness (rebuild if lost — `/tmp` does not persist)
`/tmp/pt/harness.js` stubs the DOM and Three.js, seeds element ids and default
values by parsing the real markup, then runs the actual inline script under
`vm.runInContext`. Every app function and variable becomes drivable from node.

`/tmp/pt/playtest.js` — 73 checks: boot, jump focus, black hole/Atlas addressing,
fly camera facing across all modes, every filter, grid toggle, course maths,
bookmarks/notes, galaxy switching, keypad sync, icon files, tooltips.

`/tmp/pt/probe.js` — distribution and edge-case probing.

**This harness found the startup bug that reading the code did not.** Rebuild it
if you need to change anything non-trivial. Vector3 needs real maths so camera
aiming can be verified; everything else can be a stub.

### 2. Looking at Tony's actual screen
`mcp__computer-use__request_access` with `["Google Chrome"]`. Granted at tier
**read** — screenshots only, no clicking. Ask Tony to click, then screenshot.
Use `zoom` on the panel region to read small text.

### 3. Static checks (always run these after editing)
```
node --check   on the extracted inline script
ID existence   every getElementById target exists in markup
tag balance    open vs close counts per tag
```

---

## Standing rules that apply here

- **Never use the Edit tool on this HTML file.** Python string-replace only, with
  an `assert count==1` uniqueness check on every replacement. Full-file `Write`
  is fine for a wholesale rewrite.
- Max 2 preview iterations guessing before stopping and asking Tony what
  specifically is wrong.
- No time estimates.

---

## Bugs found and fixed this session (do not reintroduce)

| Bug | Root cause |
|---|---|
| Fly button gave a blank screen | `setMode` hard-set `flyYaw=Math.PI` while placing the camera at +Z, so it faced directly away. Now every fly angle comes from `aimFly(target)` which derives yaw/pitch. Never hardcode a yaw. |
| Jump went to Local but nothing was selected | `buildKeypad()` runs before the first `jumpTo()`, and `drawKeypad()` wrote the empty `keySeq` into the address box, so the startup jump got `""`. Now `buildKeypad` seeds `keySeq` from the input's markup value. |
| Jumped-to system often absent from the slice | Slice indices were random samples; the focus index was frequently not among them. `generateSlice(focusIdx)` now always includes it in the centre voxel. |
| Course readout never visible | `#course` sat at the same corner as `#panel` with a lower z-index, so it rendered behind it. Moved to top centre. Courses were working the whole time. |
| Labels bled across modes | `updateLabels` returned early without clearing, so Local star names painted over the system view. Now `hideLabels()` on every mode change. |
| Duplicate systems | Random index draws could land on the guaranteed 079/07A, giving 132 black holes across 125 regions. Now deduped — exactly 125. |
| Silent empty state | A filter combo matching nothing showed a blank screen. Now an on-screen banner. |
| `0xNEB0` | Not valid hex — N is not a hex digit. Hard syntax error that blanked the page. Caught by `node --check`. |
| Set course said "Already here" | Correct behaviour, bad affordance. Button now dims when the selected system is your current location. |

---

## Icon pipeline

Race icons (`nms_lore_*`) were clean 256x256 transparent diamonds — used as-is,
just cropped to bbox and resized to 128.

Economy icons were wiki screenshots: white glyph on a solid colour tile with the
label baked in. Processing (PIL):
1. Crop `(0.09, 0.13, 0.91, 0.66)` — drops the frame and the label strip.
2. Find the dominant colour = tile background.
3. Alpha = pixel's RGB distance from background, normalised by background→white
   distance, thresholded `(d/dw - 0.14) / 0.70`.
4. Strip any row that is >82% opaque across the full width (leftover frame).
5. Trim to bbox, pad square, resize 128.
6. The tile background colour becomes that economy's accent for the glow.

**Technology needed a special pass** — pale blue tile, white glyph, very low
contrast. Threshold `(d/dw - 0.05) / 0.45`. If you reprocess the set, do not
overwrite Technology with the default parameters or it goes nearly invisible again.

---

## Current defaults (tuned but NOT confirmed by Tony)

```
Nebula clouds  300      Slice radius     2
Cloud size     1.0      Systems / voxel  22
Galaxy stars   24000    Star size        1.5
Arms           4        Camera phi       0.62 rad (fairly top-down)
Twist          3.6      Hyperdrive       2200 LY
```

Tony reports back numbers he likes from the Tweak sliders; bake them in as defaults.

Measured: heaviest setting (radius 5, 80/voxel) generates 109,143 systems — a
warning toast fires above 45,000. 56 FPS at defaults on Tony's laptop.

---

## Verified against the wiki

- Portal address `[P][SSS][YY][ZZZ][XXX]`, signed two's-complement with the
  midpoint skipped (`X/Z=800`, `Y=80` unused). All extreme-coordinate addresses
  from the wiki round-trip correctly.
- 2048 regions x 400 ly = 819,200 vs stated 819,000 radius. Half-height 51,200
  vs stated 51,000.
- Black hole always at SolarSystemIndex `079`, Atlas Interface always at `07A`,
  in every region of every galaxy.
- All 255 galaxy names. Type formula `(n+1) % 20` reproduces the wiki's published
  lists exactly and lands on 26 Empty / 26 Harsh / 25 Lush / 178 Norm.
- 11 biomes with from-space appearance. Dead and Exotic never have water or
  atmosphere; all moons are pangean.
- Binary/ternary stars never repeat a colour within a system (checked over 30,000).
- Compass rose: north, beta, east, delta, south, gamma, west, alpha, with
  majoris/minoris above and below the galactic plane.

---

## Not built yet

- Share links (`?address=...`)
- Real named regions (Galactic Hub etc.) — currently all procedural
- Note: `Icons/` and the source PNGs do not need deploying; only `glyphs/`,
  `icons-web/`, `favicon/`, `manifest.json`, `sw.js`, `netlify.toml`,
  `netlify/functions/`, `data/` and `preview.html` are needed at runtime.

## Done since the last handover revision

- **Deployed.** Live at `nms-galaxy-map.netlify.app`, GitHub-connected (see
  Session 16/17 notes above for the shared-edits backend and the repo-structure
  mistake — folder uploaded instead of its contents, same lesson as every past
  drag-and-drop deploy in this project family, just via GitHub's uploader this
  time — plus a repo delete/recreate breaking Netlify's repo link, fixed by
  unlinking and relinking).
- **Cross-linked from NMS Hub** (`nms-command-network.netlify.app`) — a 4th
  card (NODE 04 — Navigation Systems) added to the Hub's card grid, using
  `assets/bg-glyphs.jpg` (the portal glyph grid photo) since it's the most
  thematically fitting existing asset. Header node count bumped 3→4.
- **Installable PWA**, matching the pattern from NMS Alphabet Translator /
  Weather App: `manifest.json` (icons pulled from the existing `favicon/`
  folder, plus two new maskable variants generated from the 1024px favicon
  source with a padded safe zone), `sw.js` (cache-first for the app shell,
  but explicitly **network-only, never cached, for anything under
  `/.netlify/functions/`** — caching a shared-edit GET would risk serving a
  visitor stale or another visitor's data), and an "Install app" button in
  the top toolbar with the same `beforeinstallprompt` / iOS-fallback pattern
  used elsewhere in this project family.

---

## One thing to be careful about

The Rajdhani font has a single-storey **a**, so "Lawless" reads as "Lowless" on
screen at 14px. It is not a typo. Check the source before "fixing" text you read
off a screenshot.

---

## Session 2026-08-16 — left system-info drawer scrapped, replaced with a small addition to the right panel

A same-day earlier session had added a sliding left drawer (`#system-info-drawer`,
"spec item 5") that opened alongside every star selection, duplicating most of
the right info panel's fields (hex address, coords, planet list, route/edit
buttons) under different labels ("LOCK NAVIGATION TARGET" vs "Set course",
etc.). A follow-up review (`REVIEW-2026-08-16.md`) flagged it as the root cause
of two real bugs: the Filters panel became unreadable whenever the drawer was
open (both live in the same left-side screen region with no mutual awareness),
and the Galactic Core HUD readout ghosted through the drawer's header (the
drawer's glass background is only 85% opaque).

Tony's call: the drawer only ever showed one thing the right panel didn't --
the voxel `X/Y/Z` matrix vector coordinates -- so rather than reconcile two
overlapping UIs, the drawer was removed entirely and that one field moved into
the right panel's existing "Portal sequence" box, directly under the hex
address (`#pAddr`), as a new `#pCoords` line ("Matrix vector points / X: ... |
Y: ... | Z: ..."), styled to match (`Orbitron`, small caps label in `.seqbox
.lb`, dimmer than the address itself since it's secondary info). Wired in
`updatePanel()` right next to where `#pAddr` is already set, off the same
`s.vx/s.vy/s.vz` the drawer used to read.

Removed completely: the drawer's CSS block, its full HTML markup, the
`openInfoDrawer()`/`closeInfoDrawer()` functions and both call sites (in
`updatePanel()` and the address Reset/Clear handler), the drawer branch inside
`positionCourseCard()` (now only checks whether the right panel is open when
deciding where to anchor the course readout), and the now-dead `.hexGlyphs`
CSS rule that only the drawer's inline hex-glyph row used. This also fully
resolves the Galactic Core HUD bleed-through bug from the review -- there's no
longer a drawer for it to bleed through.

The warp-transition video hang (the review's other blocking bug) was **not**
touched this session -- Tony reports it isn't reproducing reliably on his end
("the warp isnt a problem every time i try"), so it's left as a known
intermittent issue rather than guessed at blind. Still worth a hard timeout/
`onstalled` guard if it recurs.

Verified: `node --check` on all 4 script blocks (pass), a tag-balance pass with
script/style content stripped (pass -- the one pre-existing `['html','body',
'admin']` quirk logged in earlier sessions is still the only mismatch, nothing
new), an ID-existence check (245 unique ids in markup, 0 duplicates, 389
`getElementById` calls, 0 missing targets, 0 leftover `drawer-*` ids), and a
diff against a pre-session backup confirming only the intended blocks changed.
**Not deployed** -- same `preview.html`-only push needed as every prior
session (this change touches no server-side files); `data/overrides.json`
still excluded as always. The real on-screen result (panel layout with the new
coords line, Filters no longer competing with anything on the left) still
needs Tony's own device pass, same standing sandbox limitation as every visual
change in this project.

---

## Session 2026-08-16, continued — README feature walkthrough + in-site guided tour

Tony asked whether it was worth doing a walkthrough of what the site can do,
with screenshots -- for both sharing externally and helping first-time
visitors on the site itself. Built both:

**README.md** got a new "What it can do" section, inserted right after the
intro/architecture diagram and before "The address, decoded". Eight real
screenshots taken live from the deployed site via Claude in Chrome (Galaxy
view, Local view with a system selected, the 3D system view, Filters,
Edit system, the glyph keypad, the About/honesty modal, and the accessibility
panel), saved to a new `screenshots/` folder, each with a short caption
explaining what it's showing. Note for whoever pushes this: `screenshots/`
needs to go up to GitHub alongside `preview.html` for the README images to
resolve there (relative paths).

**In-site tour**, adapted from the same walkthrough but pointed at real live
elements instead of static images -- a 6-step spotlight sequence (`#tourOverlay`
in `preview.html`) that dims everything except the current target element
(a CSS box-shadow spotlight trick, no canvas/SVG masking needed) with a
callout box positioned next to it via the same measure-don't-guess pattern
`positionUnderButton`/`positionCourseCard` already use elsewhere in this file.
Steps: Galaxy view -> Local view -> address input -> Glyphs -> Filters ->
About/Accessibility.

Deliberately **not** auto-shown on first visit -- the existing disclaimer
modal already appears automatically and is fairly dense, so stacking a second
automatic overlay on top felt like too much for a first-time visitor. Instead
it's opt-in from two places: a new "Take a quick tour" button on the
disclaimer modal itself, and a standing "Tour" button in the toolbar (next to
About) so it can be replayed any time, including live in front of someone --
which was really the original ask, showing it off with a live walkthrough.

Verified via `node --check` on all 4 script blocks (pass), a tag-balance pass
with script/style stripped (pass, same one pre-existing `['html','body',
'admin']` quirk, nothing new), and an ID-existence check (256 unique ids, up
from 245 -- exactly the 11 new ids added: `tourOverlay`, `tourHole`, `tourBox`,
`tourStepLabel`, `tourTitle`, `tourBody`, `tourSkip`, `tourBack`, `tourNext`,
`bTour`, `discTour` -- 0 duplicates, 0 missing `getElementById` targets, and
all 6 of the tour's `querySelector` target selectors confirmed to match real
ids in the markup). **Not deployed** -- needs `preview.html` AND the new
`screenshots/` folder pushed together this time (the README image paths are
relative), `data/overrides.json` excluded as always. The actual on-screen
spotlight positioning, callout placement, and whether the disclaimer's two-
button row wraps awkwardly on narrow phones all still need Tony's own device
pass, same standing sandbox limitation as every visual feature in this
project -- this is UI-only so it wasn't run through the heavier headless-Node-
harness treatment used for procedural-generation logic elsewhere in this
project, consistent with how the accessibility popup and hyperdrive-notice
modal were verified when they were built.

---

## Session 2026-08-16, continued once more — tour was missing a dedicated Accessibility step

Tony caught it immediately: the README's "What it can do" walkthrough gives
Accessibility its own section with its own screenshot, but the in-site tour
had folded it into the closing "About" step as a side mention rather than
giving it a real spotlighted step of its own. Split it into two steps --
`#bAbout` ("Worth a read", the honesty-about-limits framing) and a new
`#bAccess` step ("Accessibility", font size/high contrast/colour correction)
-- so the tour now has 7 steps instead of 6, matching what the README covers
for every toolbar-level feature (Enter system / Edit system stay text
mentions inside the Local view step rather than their own spotlighted steps,
since those buttons only exist once a system is actually selected -- nothing
to point a spotlight at on a fresh page load).

Verified via `node --check` on all 3 non-empty script blocks (pass), the
same tag-balance pass (pass, same one pre-existing quirk), an ID-existence
check (256 unique ids, unchanged -- no new markup needed since `#bAccess`
already existed as the toolbar's accessibility gear button), and a diff
confirming exactly the one intended block changed. **Not deployed** -- same
`preview.html` + `screenshots/` push as the rest of this session.

---

## Session 2026-08-16, one more small addition — README now mentions the tour

Tony confirmed the new Tour button looks fine on his real S26 (wraps cleanly
into the toolbar's second row, nothing cut off). Added one line to README.md's
"What it can do" intro noting the site has a live version of the same
walkthrough via the Tour button / disclaimer link, so README readers know it
exists without having to find it themselves. Text-only change, no code
touched, no new verification needed beyond confirming the markdown renders
(checked the raw file). **Not deployed** -- same `preview.html` + `screenshots/`
+ `README.md` push as the rest of this session.

---

## Session 2026-08-16, continued yet again — self-hosted feedback form (no Google Form needed)

Tony asked for a way to hear general site feedback/bug reports without
exposing his personal email, and picked "GitHub Issues + a no-account form."
Asked to actually create a Google Form for the no-account half, and couldn't
-- the connected Drive tool only creates Docs/Sheets/Slides/folders, no
Forms API access, and there's no Google Forms connector in the registry
either. Tony chose to skip Google entirely instead: build the no-account
form as part of the site itself, submitting straight to a GitHub Issue via
a new Netlify Function.

**New `netlify/functions/feedback.mjs`** -- POST `{category, message, repro,
device, contact}`, filtered through the existing `filterText()` from
`filter.mjs` (same content filter every other submission on this site goes
through), then opens a real GitHub Issue (title `[Feedback] <category>:
<message excerpt>`, labelled `feedback`). Two deliberate departures from the
existing flag-dispute.mjs pattern, both explained in the function's own
header comment: (1) Issue creation is NOT best-effort here -- flag-dispute
has `overrides.json`'s `flagMeta` as a fallback record if the GITHUB_TOKEN
lacks Issues:write permission, but general feedback has no such fallback, so
a failed Issue creation fails the whole request with a real error rather
than silently vanishing; (2) rate limiting (5/IP/hour) is in-memory only,
deliberately NOT persisted to `data/overrides.json` the way editLog/
reportLog/flagLog are, since feedback has nothing to do with per-system data
and doesn't need a durable store -- keeps this feature fully decoupled from
the precious shared data file every real system edit also writes to.
**Important for deploy:** this means the existing `GITHUB_TOKEN` needs
"Issues: Read and write" permission on its fine-grained PAT for this to work
AT ALL, not just for optional notifications like flag-dispute -- worth
checking/adding that scope before or right after this goes live, since
there's no way to tell from the UI alone whether it's missing until someone
actually submits feedback and gets a 502.

**Frontend (`preview.html`)** -- a new `feedbackModal`, structurally a sibling
of `editModal`/`reportModal`/`disclaimerModal`/`hyperdriveModal` inside
`#modalWrap` (added to `closeAllModalBoxes()`), reusing 100% of the existing
save/report machinery rather than building anything new: `describeSaveError`,
`startAtlasWait`, `showStatusIcon`/`hideStatusIcon`, `setErrText`, the same
`.merr`/`.iconWrap`/`.driftBeam` CSS and `STATUS_ICONS` set -- no new icon
assets needed, and `feedbackIconWrap` -> `feedbackErr` already matches
`pairedErrEl()`'s existing naming convention with zero extra wiring. Fields:
category dropdown (Bug/glitch, Feature idea, Something looks wrong, Other),
required message, optional repro steps, a device/browser field auto-filled
from `navigator.userAgent` (still a plain editable text input, not
read-only), and an optional contact field for anyone who wants a reply.
Reachable only from the About/disclaimer modal (a new "Feedback / found a
bug?" section with a "Send feedback" button) -- deliberately NOT added as
its own toolbar button, given this project's own history of toolbar-
wrapping bugs from added buttons (Session 19, Session 22) and Tony just
having confirmed the brand-new Tour button already adds real pressure to
that row on his S26; Report has never had a toolbar button either, so this
matches existing precedent rather than introducing a new one.

Verified: a from-scratch Node harness mocking `fetch` and importing the real
shipped `feedback.mjs` unmodified -- 8 checks covering empty message (400),
blocked content (422), a valid submission (200 with a real issueUrl), an
invalid category silently falling back to "Other" rather than erroring,
6 submissions from one IP tripping the 5/hour cap on the 6th (429), a GitHub
API failure surfacing as a real 502 with the error text `describeSaveError`
expects, a missing `GITHUB_TOKEN` (500), and a wrong HTTP method (405) -- all
8 pass. Plus the project's standard `node --check` on `feedback.mjs` and all
3 non-empty `preview.html` script blocks (pass), a tag-balance pass (pass,
same one pre-existing quirk), an ID-existence check (271 unique ids, up from
256 -- exactly the 15 new feedback-related ids, 0 duplicates, 0 missing
`getElementById` targets), and a diff confirming only the intended blocks
changed. **Not deployed** -- needs `preview.html` AND the new
`netlify/functions/feedback.mjs` pushed together this time (the function
won't exist server-side otherwise); `data/overrides.json` excluded as
always. The real on-screen modal layout and whether GITHUB_TOKEN actually
has Issues:write still need a real end-to-end test once live -- try
submitting one real piece of feedback after deploying and confirm it shows
up as an Issue on GitHub.


---

### Session 35 (2026-08-16) — mini galaxy icon: real disc rotation, not a clock-hand spin

Tony sent two screenshots of the `#galIcon` HUD thumbnail (top-left "Galactic
Core" readout) and flagged the only thing spoiling it: it spins flat, like a
clock hand, instead of rotating like an actual tilted galactic disc. Exactly
right, and a real bug in how the animation was built, not a taste call.

**Root cause:** the icon's rotation was a plain CSS `animation:spinGalIcon
20s linear infinite` doing `transform:rotate(0deg)->rotate(360deg)` on the
whole canvas element. That spins the *entire rendered image* -- including
its tilt -- around the screen-plane center, like a coin lying flat on a
table spinning face-on. A real tilted galactic disc rotating on its own
polar axis looks completely different: the ellipse's own shape and
orientation stay fixed on screen, and only the spiral pattern *inside* that
fixed ellipse sweeps around. CSS `rotate()` can't produce that -- it was
never going to look right no matter how it was tuned.

**Fix:** stopped CSS-rotating the element entirely and instead animate the
draw itself. `drawGalIcon()`'s per-blob polar angle (`ang=arm*(2π/arms)+t*tw
+jitter`) now adds a `galIconRot` offset; the vertical squish (`*0.62`) that
creates the ellipse is untouched, so the ellipse's tilt/shape never moves --
only the arm pattern rotates inside it, exactly the "west to east" sweep
Tony described, and it can never collapse to a line since the squish factor
is constant, not animated. `galIconRot` is advanced from the main `animate()`
render loop (same loop that already turns `galaxyGroup.rotation.y` in 3D
Galaxy view), throttled to every 3rd frame (~20 redraws/sec at 60fps -- cheap
canvas 2D work, smooth motion) at 0.0157 rad/tick, giving roughly the same
~20s full rotation period as the old CSS version. Removed the now-dead
`animation`/`will-change` CSS properties and the unused `@keyframes
spinGalIcon` rule, replaced with a comment explaining why the CSS approach
was wrong and pointing at the new mechanism.

Verified via `node --check` on all 4 script blocks (pass), a tag-balance
pass (pass, 0 mismatches), an ID-existence check (271 unique ids, 437
`getElementById` calls, 0 missing -- unchanged, this session added no new
ids), and a diff against a pre-session backup confirming exactly the 5
intended blocks changed (the CSS rule, the keyframes->comment swap, the
`ang` line, the new `galIconRot`/`galIconFrame` globals, and the `animate()`
tick). **Not deployed** -- same `preview.html`-only push needed as every
prior session, `data/overrides.json` excluded as always. The actual on-
screen motion (does it read as a real disc rotation now, is the speed
right) still needs Tony's own device look, same standing sandbox limitation
as every visual feature in this project.

---

### Session 35, continued — info panel stayed open when returning to Galaxy view

Small cosmetic follow-up in the same session, from a screenshot: clicking a
star in Local correctly opens the right-hand info panel, but going back to
Galaxy view left it hanging open, still showing that now-irrelevant system.

**Fix:** `setMode()`'s `m==="galaxy"` branch now clears `selected=null` and
removes the panel's `.show` class (plus a matching `updateRings()` call so
the now-stale selection ring doesn't linger either) -- the exact same
close pattern the address Reset/Clear button already uses (Session 24) for
the same reason: Galaxy view has no concept of a "selected" star, that only
exists in Local/System. `updatePanel()`/`updateRings()` already null-guard
`selected` safely, so nothing else needed touching.

Verified via `node --check` (4 script blocks, pass), tag-balance (pass, 0
mismatches), ID-existence (271 ids / 438 `getElementById` calls, 0 missing,
unchanged), and a diff confirming exactly this one block changed. **Not
deployed** -- same `preview.html`-only push as the rotation fix above,
`data/overrides.json` excluded as always.

---

### Session 35, continued once more — mini galaxy icon spun the wrong direction and speed vs. the real 3D galaxy

Right after the rotation fix above, Tony looked at the live behaviour and
flagged it spun the opposite way to the actual 3D galaxy in Galaxy view, and
at a different speed -- should be the same as each other.

**Fix:** `galIconRot` now advances by the exact same per-frame magnitude as
`galaxyGroup.rotation.y` (0.0003, previously the icon used an independently-
tuned 0.0157 applied only on every 3rd frame -- much faster), and with the
opposite sign (`-=` instead of `+=`), since Tony's live look confirmed the
old `+=` direction read as backwards relative to the real galaxy's rotation.
The angle now accumulates every single frame (matching the galaxy's own
per-frame rate exactly) even though the canvas redraw itself stays throttled
to every 3rd frame for performance -- only the *draw* is skipped, not the
angle progression, so the average speed is correct rather than 3x too fast.
Also now advances regardless of `mode` (galaxy's own rotation only runs
`if(mode==="galaxy")`, but the icon is meant to keep turning in Local/System
too, since it's a HUD element visible in all three modes).

Verified via `node --check` (4 blocks, pass), tag-balance (pass), ID-
existence (271 ids / 438 calls, unchanged), and a diff confirming exactly
this one block changed. **Not deployed** -- same `preview.html`-only push
as the rest of this session. Whether the two now genuinely read as
rotating together still needs Tony's own live look, same as every visual
fix in this project.

---

### Session 35, continued a fourth time — rotation speed bumped, shared into one constant

Tony liked the direction fix but felt the shared rotation speed (0.0003
rad/frame, inherited from the pre-existing `galaxyGroup.rotation.y` rate)
was too slow to actually read as a spinning galaxy -- ~350 seconds per full
turn, asked to speed both up, "research if need be."

Flagged honestly rather than pretending there's a researchable "correct"
speed: a real galaxy's rotation period is on the order of 200-250 million
years (the Milky Way's own figure), so there's no scientifically accurate
rate that would ever be visible in a live UI -- this was always going to be
an artistic choice, not a looked-up one. Bumped it to a period of ~20
seconds per full turn (0.0052 rad/frame at 60fps), fast enough to clearly
read as rotation without feeling frantic, and pulled the old duplicated
`0.0003` literal (previously hardcoded separately at both the galaxy line
and the icon line -- exactly the kind of duplication that caused the
speed-mismatch bug two rounds ago) into one shared `GAL_ROT_SPD` constant
that both `galaxyGroup.rotation.y+=` and `galIconRot-=` now read from, so
they structurally can't drift apart again if the speed gets tuned further.

Verified via `node --check` (4 blocks, pass), tag-balance (pass), ID-
existence (271/438, unchanged), and a diff confirming exactly the 3
intended edits (the new constant + its two call sites). **Not deployed** --
same `preview.html`-only push as the rest of this session. The actual felt
speed still needs Tony's own look -- easy to retune further (just the one
`GAL_ROT_SPD` value) if 20s/turn reads as too fast or too slow once live.

---

### Session 38 (2026-08-17) — hover popup, course-line hover-preview, solid/dashed/red line styling, search by name

Tony sent two real in-game screenshots and asked about three authenticity
features: a hover popup (name, class/suffix, race/economy/conflict) that
declutters to name-only when zoomed out; the plotted-course line "expanding"
toward a hovered destination like the real game's own map; and solid vs
dotted course lines matching the real game's single-jump-vs-needs-upgrade
convention. He explicitly asked for examples/limitations before any code
was touched, and separately shared a YouTube reference plus his own
research.

Read the real code first (`tryPick`, `drawCourse`, `findRoute`,
`HYPER_DRIVES`/`canReachColor`, `updateLabels`, `updatePanel`) to ground
feasibility, confirmed the real game's solid/dashed meaning via Steam
Community + wiki sources (solid = reachable in one jump, dashed = out of
range/needs upgrade), and showed a 3-panel mockup before writing anything.
Tony picked: tap-to-preview on touch for the hover popup, course-preview
gated to only when the info panel is open ("during Set course"), build all
3 in one combined pass.

**Hover popup.** New `#hoverPop`, mouse-only (`matchMedia(hover:hover)`),
raycasts the existing `locInstMesh` picking layer on a throttled
`pointermove`. Declutters by `cam.dist` exactly like the label system
already does -- name only past `HOVER_ZOOM_FULL=45`, full stats once zoomed
in closer.

**Course line styling.** New `courseLineStyle()` -- solid gold (single
direct jump), dashed gold (multi-hop, every leg reachable), dashed red
(current drive can't reach the target's star colour at all, an extra state
beyond the vanilla game's own solid/dashed pair).

**Course-preview hover.** While the info panel is open, hovering a
candidate draws a straight two-point line + a small `hoverRing`, growing
outward over ~350ms via a new `updatePreviewAnim(dt)` hooked into
`animate()`. Deliberately NOT a full `findRoute()`/A* search on every
hover frame -- the real multi-hop route is still only ever computed when
Set course is actually clicked.

Verified via `node --check` on all 4 script blocks, tag-balance (`div`
309/309, `a` 5/5, `button` 81/81), an ID-existence check (275 ids, 452
calls, 0 missing), and a diff confirming exactly the 11 intended hunks
changed. One deliberate scope simplification: touch has no hover state at
all, and tapping a star already opens the full info panel with the same
data, so no separate touch-specific popup gesture was built.

**Follow-up from live feedback.** Tony tried it and sent 4 more screenshots:
the hover popup showing plain text tags where the real game uses icons, and
a course scene with an unconnected gold ring after clicking a star,
described as "the old plot line remains." Swapped the popup's 3 text
badges for the exact same icon calls the full info panel already uses
(`raceIcon()`, `econIcon()`, the crossed-swords `IC_CONFLICT` svg) -- same
assets, no new art. For the ring: asked what he'd actually clicked rather
than guess from static screenshots -- he'd just selected Elayand VI. The
ring was the ordinary `selRing` correctly marking the new selection, not a
bug; the real thing catching his eye was the *previously plotted course*
staying visible after selecting a different star, always-intentional
"Lock navigation target" persistence, just far more noticeable now thanks
to the new red-dashed styling. Tony's preference, after being offered 3
options: clicking any star should immediately plot a fresh course to it,
replacing whatever was there before. Implemented in `tryPick()`'s Local
branch -- clicking a star now also calls `setCourse()` on it, skipped only
for your own current location.

**Search by name.** Tony asked if it's worth searching for a system by
name. Flagged the real limit up front: no reverse index across the whole
procedural galaxy is feasible -- names are generated *from* the address,
and the address space is too large to brute-force. Scoped instead to
systems this browser already has a real name for: community-documented
systems (`OVERRIDES.systems`, already fetched on page load) plus the
player's own bookmarks/waypoints/visited history (name decoded on the fly
via `generateSystem()`). New `bSearch` toolbar button opens a `searchPop`
box (same click-to-open/outside-click-closes pattern as the accessibility
popup); `buildSearchIndex()` walks the three pools, deduped by address;
`runSearch()` ranks starts-with above contains-only, caps at 20 results,
and shows a plain "No match found" message (per Tony's explicit ask) when
nothing matches, explaining the scope rather than a blank box.

**Docs pass before pushing.** Per Tony's ask, updated everything a player
would actually see: the Tour's Local-view step now mentions hovering and
the line-style convention, plus a new Tour step for Search; the "Set
course" button's tooltip now explains solid/dashed/red; the About/
disclaimer modal's "Plotting a hyperdrive course" entry got the same
line-style explanation plus a new "Search by name" entry; `README.md`'s
"What it can do" section got two new bullets (hover/line-styling under
Local view, and Search by name near the glyph keypad) -- no new
screenshots, since none can be captured from this sandbox.

Verified via `node --check` (3 non-empty blocks pass), tag-balance (`div`
315/315, `a` 5/5, `button` 82/82), an ID-existence check (0 missing), and a
diff confirming exactly the intended hunks changed at each step. **Not
deployed** -- `preview.html`, `README.md`, and this file all need pushing
together, `data/overrides.json` excluded as always. Every visual element
here (hover-popup zoom thresholds, the preview line's growth feel, whether
the 3 line styles read clearly, the search popup's fit on mobile) still
needs Tony's own device pass, same standing sandbox limitation as always.

---

### Session 38, one more round — icon size, Manifest collapse, hover-preview scoping bug

Tony is testing the local file directly rather than a deployed build, so
his feedback here reflects the real current state of `preview.html`. Three
more screenshots: the hover popup's race/economy/conflict icons too small
to see; the Warp Manifest card only draggable, not collapsible like Course
Plotted, "otherwise cluttered"; and, across two follow-up messages, a
12-hop course rendering with no visible dashing plus "where is the
expanding line on hover like in game, which happens before clicking star
to select it."

Also tried opening his local `Phone Preview Tool.html` via the Claude-in-
Chrome extension first, per his ask, to confirm visually before touching
anything. Couldn't: the extension's `navigate` tool prepends `https://` to
any URL that doesn't already start with `http`, so `file:///C:/...`
becomes a broken `https://file///C:/...`, and once on that broken page
every keyboard/synthetic-input action the extension offers is blocked
outright (no interaction is possible on a non-http(s) page at all). No
working path to a local file through that tool. Said so plainly rather
than quietly giving up or pretending it worked, then proceeded on the two
unambiguous fixes.

**Icon size** -- bumped from 15-17px to 21-24px, roughly matching the full
info panel's own icon sizes. No ambiguity here, just too small.

**Manifest collapse** -- new `#bManifestMin` button in `#riHead`, mirroring
`#bCourseMin`'s exact toggle pattern (`.min` class + chevron swap).
`#route-stats`/`#route-steps-list` wrapped in a new `#riBody` div, hidden
via `#route-itinerary-card.min #riBody{display:none}`. Deliberately did
*not* make `displayCalculatedItinerary()` force-un-minimize the card the
way `#course` does on every replot -- today's earlier "any star click
replots the course" change would otherwise pop the manifest back open on
every single click, defeating the entire point of collapsing it.

**Solid-looking line** -- `courseLineStyle()`'s own logic checked out fine
(hops>1 does pick the dashed material), so this is most likely
`LineDashedMaterial`'s fixed world-unit dash/gap size (1.2/0.8) shrinking
to sub-pixel at typical zoom and visually reading as solid. Doubled both
the committed-course and hover-preview dash patterns (2.4/1.6, 2.0/1.4).

**Hover-preview scoping -- a real bug, not a rendering issue.** Tony's
earlier "only during Set course" answer got implemented as "only once a
system's info panel is already open" -- his follow-up made clear that's not
what he meant: the real game shows the preview line on hovering ANY star,
with nothing clicked or selected first. Removed the
`panel.classList.contains("show")` gate from `updateCoursePreviewHover()`
entirely; it now only requires `focusSystem` (you're actually somewhere)
and that the hovered star isn't your current location or the already-
committed target. Corrected the matching (now-wrong) sentence in
`README.md` too.

Verified via `node --check` on all 3 non-empty script blocks, tag-balance
(`div` 316/316, `a` 5/5, `button` 83/83), an ID-existence check (0
missing), and a diff confirming exactly the intended hunks at each step.
**Not deployed** -- same combined `preview.html` + `README.md` push as the
rest of today. Since Tony's testing the local file directly this time, his
next look should reflect all of this without needing anything deployed
first.
