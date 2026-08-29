#!/usr/bin/env node
/*
 * check-atlas-updates.mjs
 *
 * Standalone, run-it-yourself check for whether Hello Games' own Galactic
 * Atlas (https://galacticatlas.nomanssky.com/) has added or removed any
 * points of interest since atlas-pois.json (used by the map's "Atlas"
 * overlay toggle) was last hand-updated.
 *
 * This does NOT touch atlas-pois.json and does NOT run on a schedule --
 * it's a manual sanity check, per Tony's own call: "I don't think it
 * changes much, so hand-enter the ~50 addresses once... only build the
 * scraper if the list turns out to actually change often enough to
 * matter." Run this from time to time (or whenever you're curious) and it
 * tells you whether that's happened yet.
 *
 * Deliberately doesn't assume the page's exact HTML structure (server-
 * rendered markup vs. a client-hydration JSON blob). Instead it just
 * regex-scans the whole fetched page for the address pattern itself
 * (region-XXXXXXXXXXXX / planet-XXXXXXXXXXXX, 12 hex digits) -- that exact
 * string has to appear SOMEWHERE in the payload no matter how the page is
 * built, since the client needs it to link anywhere. If that ever stops
 * being true (a redesign changes the address format entirely, or the
 * count of found addresses looks implausibly low), this script says so
 * loudly rather than quietly reporting "no changes" -- see NOISE FLOOR
 * check below.
 *
 * A REAL LIMITATION, CONFIRMED, NOT HYPOTHETICAL: a plain fetch() from
 * this project's own cloud sandbox got HTTP 403 from galacticatlas.
 * nomanssky.com even with full browser-style headers -- reads as
 * datacenter-IP bot-blocking (Cloudflare or similar), not a header check,
 * since realistic headers didn't change the result. Running this from an
 * ordinary home internet connection (which is how Tony will actually run
 * it) may well work fine -- residential IPs are usually not on the same
 * blocklist -- but it wasn't possible to verify that from here, since this
 * project's sandbox has no outbound network access at all to test a
 * second network from. If you also get a 403 from your own machine, the
 * error message below gives you a paste-into-devtools fallback that's
 * confirmed to work (that's literally how atlas-pois.json's data was
 * collected in the first place).
 *
 * Usage:
 *   node check-atlas-updates.mjs
 *   node check-atlas-updates.mjs /path/to/atlas-pois.json   (default: ./atlas-pois.json next to this script's project root)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ATLAS_URL = "https://galacticatlas.nomanssky.com/";
const ADDR_RE = /\b(region|planet)-([0-9A-F]{12})\b/gi;

// Below this, assume the fetch/parse itself failed rather than the Atlas
// really having shrunk to almost nothing -- at last check (2026-08-29)
// the live site listed 53 addressed POIs.
const NOISE_FLOOR = 15;

function scriptDir() {
  return dirname(fileURLToPath(import.meta.url));
}

function loadKnownAddresses(jsonPath) {
  const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
  const known = new Map(); // address (upper-case, no dashes) -> name
  for (const poi of raw) {
    if (!poi.address) continue;
    known.set(poi.address.toUpperCase(), poi.name);
  }
  return known;
}

const DEVTOOLS_FALLBACK = `[...document.querySelectorAll('a[href*="/poi/"]')].map(a=>a.getAttribute("href")).join("\\n")`;

async function fetchLiveAddresses(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    const blocked = res.status === 403 || res.status === 429;
    const err = new Error(`HTTP ${res.status} ${res.statusText} fetching ${url}`);
    err.blocked = blocked;
    throw err;
  }
  const html = await res.text();
  const found = new Set();
  let m;
  while ((m = ADDR_RE.exec(html)) !== null) {
    found.add(m[2].toUpperCase());
  }
  return { html, found };
}

async function main() {
  const jsonPath = process.argv[2] || join(scriptDir(), "..", "atlas-pois.json");
  console.log(`Known POI file: ${jsonPath}`);
  console.log(`Live source:    ${ATLAS_URL}`);
  console.log("");

  let known;
  try {
    known = loadKnownAddresses(jsonPath);
  } catch (err) {
    console.error(`Could not read/parse ${jsonPath}: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  let live;
  try {
    live = await fetchLiveAddresses(ATLAS_URL);
  } catch (err) {
    console.error(`Could not fetch the live Atlas page: ${err.message}`);
    if (err.blocked) {
      console.error(
        "\nThat looks like bot-blocking, not a real outage (confirmed happening from this\n" +
        "project's own cloud sandbox even with full browser headers). Fallback that's\n" +
        "confirmed to work: open https://galacticatlas.nomanssky.com/ in your own browser,\n" +
        "open DevTools' console (F12), paste this, and compare the result by eye against\n" +
        "atlas-pois.json:\n\n" +
        `  ${DEVTOOLS_FALLBACK}\n`
      );
    } else {
      console.error("(No network from this machine right now, or the site is genuinely down -- try again later.)");
    }
    process.exitCode = 2;
    return;
  }

  if (live.found.size < NOISE_FLOOR) {
    console.error(
      `Only found ${live.found.size} address-like strings on the live page -- expected dozens.\n` +
      `That almost certainly means the Atlas site changed its page structure (or blocked this\n` +
      `request) rather than that the list actually shrank. Don't trust the diff below; open\n` +
      `${ATLAS_URL} in a real browser and see what changed before touching atlas-pois.json.`
    );
    process.exitCode = 2;
    return;
  }

  const knownAddrs = new Set(known.keys());
  const added = [...live.found].filter((a) => !knownAddrs.has(a)).sort();
  const removed = [...knownAddrs].filter((a) => !live.found.has(a)).sort();

  console.log(`Known addresses:  ${knownAddrs.size}`);
  console.log(`Live addresses:   ${live.found.size}`);
  console.log("");

  if (added.length === 0 && removed.length === 0) {
    console.log("No change detected -- atlas-pois.json still matches the live Atlas.");
    return;
  }

  if (added.length) {
    console.log(`NEW on the live site, not yet in atlas-pois.json (${added.length}):`);
    for (const a of added) console.log(`  + ${a}  https://galacticatlas.nomanssky.com/poi/region-${a}`);
    console.log("");
  }
  if (removed.length) {
    console.log(`IN atlas-pois.json but no longer found on the live site (${removed.length}):`);
    for (const a of removed) console.log(`  - ${a}  (${known.get(a) || "unnamed"})`);
    console.log("");
  }
  console.log(
    "This script only reports the diff -- it never edits atlas-pois.json itself.\n" +
    "If this keeps turning up real changes often, that's the signal to build the\n" +
    "scheduled scraper instead of hand-updating the file each time."
  );
}

main();
