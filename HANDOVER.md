# NMS Galactic Map — Handover

**Last worked:** 2026-08-04 (Session 17)
**Status:** LIVE at `nms-galaxy-map.netlify.app`, GitHub-connected deploy, cross-linked
from NMS Hub, installable as a PWA. Labels/camera-matrix/moon-orbit bugs from Session 15
confirmed fixed by Tony. Shared community system editing is built, self-tested, and
deployed — but the Edit/Report flow itself has still never been clicked through in a
real browser, so that's the next real check.
**Folder:** `C:\Users\elegr\Claude\Projects\NMS Galactic Map`

---

## Read these first

| File | What it is |
|---|---|
| `SPEC.md` | All the research — address maths, voxel grid, data model, sources. Still accurate. |
| `preview.html` | **The whole app.** Single self-contained file, Three.js r128 from cdnjs. Double-click to open. No build step. |
| `SHARED-EDITS-SETUP.md` | **New.** Plain-English steps for Tony to wire up the shared-editing backend (GitHub token, Netlify Git connect, env vars). Nothing in Claude's power to do — needs Tony's own accounts. |
| `netlify/functions/system-edit.mjs` | The backend. Handles edit/report submissions, filters content, commits to GitHub, and serves the merged data back to every visitor on page load (`GET`). |
| `netlify/functions/filter.mjs` | Shared content-safety filter (profanity/HTML/length/URL stripping). Imported by the function; a small client-side echo of the same word list lives in `preview.html` for instant feedback — keep both in sync if the list changes. |
| `data/overrides.json` | Starting shape of the shared datastore (`{systems:{}, reports:{}, ipLog:{}}`). Netlify commits real data into this file once live. |
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
GitHub's file history, explained in the setup doc).

---

## PICK UP HERE — the play-test was interrupted

Tony has `preview.html` open in Chrome and we were walking through it together.
He clicks, Claude screenshots his screen and gives feedback. **This works and is
worth continuing** — it has already found bugs that reading the code did not.

**Still never seen render:**
1. **Enter system** — the 3D orbital view. Do the textured planets actually read
   as planets, or as coloured blobs? This is the biggest unknown.
2. **Labels** inside the system view.
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
