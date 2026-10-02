# Save-file waypoint auto-fill tool ("companion app")

This folder holds a standalone script that reads your real local **No Man's Sky
save file** — the one Hello Games Cloud cross-save writes to this PC after you
open the game here and pull your PS5 progress down — and fills in blank
**names** on your live map for any of your own in-game waypoints/bookmarks that
land on a system your map doesn't have a name for yet.

It **never overwrites anything already documented** by you or another
traveller. It only ever touches the `name` field, and only when that field is
currently blank. It never touches bodies, rings, stations, signals,
screenshots, race/economy/conflict data, or anything else — your save doesn't
carry that kind of data, so this tool doesn't guess at it.

## Where your waypoint names come from

Every waypoint/bookmark you've ever set in-game (`Cetanle Base`, `Portal
planet`, `New galaxy`, and so on) is stored in your save file along with its
real galactic address. This tool decodes that list directly from the save —
there's no separate "discovery log" to read, and nothing here talks to Hello
Games or PSN. It only reads a file already sitting on this PC.

Names like "New galaxy" or "Portal planet" are **not** treated as junk or
filtered out — the system's address is what makes each map entry unique, not
the name text, so two different real places sharing a generic-sounding name is
expected and completely fine.

If several of your waypoints land on the exact same system (common — you can
bookmark more than one planet in a system, but the map has one name slot per
system), only the first one found is used to fill that blank; the rest are
written to `nms-save-autofill-skipped.txt` so you can see what didn't make it
in.

## Why you have to run this yourself

Just like the wiki auto-fill tool, this can't run inside a Claude Cowork
session or through any Claude-controlled shell — `nms-galaxy-map.netlify.app`
is behind the same account-level network proxy that blocks the wiki tool,
confirmed directly while building this. Your own terminal isn't behind that
proxy, so it reaches your map fine.

That's why this is a script **you** run — a real Command Prompt/PowerShell
window, a double-clicked `.bat` file, or Windows Task Scheduler — never
something Claude runs for you.

## Before you run it — sync your save

Because this only reads a save file already on this PC, you need to pull your
latest progress down first if you've been playing on PS5:

1. Open No Man's Sky **on this PC**.
2. If Cross-Save is set up, use the in-game **Cross-Save Manager** to download
   your most recent save (the one from PS5, if that's where you played last).
3. You can close the game again once that's done — the script only reads the
   save file on disk, it doesn't need the game running.

The script always reads whichever of your save slots was modified most
recently, so if you play on both PC and PS5, always sync PS5→PC before running
a real pass, or you'll be importing stale waypoints.

## First-time setup

You already have everything needed — Node.js is installed on this machine,
and the script has zero external dependencies (no `npm install` required).

This folder should live at:
`C:\Users\elegr\Claude\Projects\NMS Galactic Map\tools\nms-save-autofill\`
(two levels under the project root, same as the wiki tool.)

## Step 1 — always dry-run first

```
node nms-save-autofill.mjs --dry-run
```

This reads your save, decodes your waypoints, fetches your live map data, and
prints exactly what it *would* fill in — **nothing is written or submitted**.
Read through the list. If a name looks wrong for where you'd expect it, that's
the signal to stop and tell me before doing a real run.

## Step 2 — do a real run

```
node nms-save-autofill.mjs
```

This submits through the same public "Edit System" endpoint your own map's
edit form uses — one system at a time, with an 8-second pause between each,
and it stops itself automatically once it's sent 7 in the current rolling hour
(the server's real limit is 8/hour; this keeps one in reserve). If the server
ever says "too many submissions" anyway, it backs off and waits out the full
hour before continuing on its own.

It's safe to run over and over:
- re-reads your save each time (so a fresh Cross-Save sync is picked up),
- re-reads your live map (so it never fights anything you've since documented
  by hand),
- picks up exactly where the last run left off — progress is tracked in
  `nms-save-autofill-state.json`, right next to the script,
- everything it does is logged to `nms-save-autofill-log.txt`, also right
  here.

Unlike the wiki tool, once a given waypoint's name has been used to fill a
blank (or the site rejects it), there's nothing new for it to do on a later
run — new runs are really only useful after you've set new waypoints in-game
and synced them down.

## Automating it (Windows Task Scheduler)

Same approach as the wiki tool, if you want this to check itself periodically:

1. Open **Task Scheduler**.
2. **Create Task...**.
3. **General** tab: name it `NMS Save Autofill`. Tick "Run whether user is
   logged on or not" if you want it to run while you're away.
4. **Triggers** tab → **New...** → "On a schedule" → whatever cadence you
   like (this only finds new work after you've synced a fresh save down, so
   there's no benefit to running it more than a few times a day).
5. **Actions** tab → **New...**:
   - Program/script: `node`
   - Add arguments: `nms-save-autofill.mjs`
   - Start in:
     `C:\Users\elegr\Claude\Projects\NMS Galactic Map\tools\nms-save-autofill`
6. **Conditions** tab: untick "Start the task only if the computer is on AC
   power" if this is a laptop and you want it to run on battery too.
7. Save.

Check `nms-save-autofill-log.txt` occasionally to see what it's been doing.

## Just want to run it by hand?

Double-click `run-save-autofill.bat` in this folder (or copy it to your
Desktop). It runs a normal (non-dry-run) pass and pauses at the end so the
window doesn't just vanish. If you ever want to dry-run instead, open a
Command Prompt in this folder and run `node nms-save-autofill.mjs --dry-run`
directly.

## Important — do not deploy this folder

This `tools/nms-save-autofill/` folder (and the
`nms-save-autofill-state.json` / `nms-save-autofill-log.txt` /
`nms-save-autofill-skipped.txt` files it creates) is **local tooling only**.
Like `CLAUDE.md`, `HANDOVER.md`, and `overrides.json`, it must **never** be
included in a GitHub push or Netlify deploy for this project.

## What it actually changes, precisely

For each of your waypoints that resolves to a valid galactic address, it only
fills the map's `name` field if your map's current value for that system is
genuinely blank. It never touches any other field. When it fills a name, it
appends a line to that system's notes crediting it as "Filled from a
traveller's own in-game waypoint notes," so it's always clear where the data
came from.

It skips, and never guesses at:
- the literal word "Default" (the game's own placeholder for an unnamed
  marker, not something you actually typed),
- any waypoint whose address it can't confidently decode (older save format,
  a non-spatial waypoint like a stored freighter position, etc) — these are
  logged, not silently dropped,
- a system your map already has a name for, however it got there.
