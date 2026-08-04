# NMS Galactic Map — Handover

**Last worked:** 2026-08-04 (Session 18)
**Status:** Four fixes made to `preview.html`, verified via `node --check` + a full
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
