/* navigator/real-region.js — shared real-regional-data generator.
   2026-08-30.

   Extracted out of index.html so map-mock.html can use the exact same
   "real systems around a real coordinate" generator as the black-hole-exit
   fix, instead of each page carrying its own copy. Loads the same ported
   nms-core module (+ the economy/conflict/race module) the live map
   itself uses, and exposes one function: window.realRegionCandidates(...).

   Load order contract (same reason as preview.html's own copy of this
   comment): a plain classic <script> earlier on the page runs
   synchronously as the parser reaches it, while this file (a
   <script type="module">) is deferred until the whole document has
   parsed. So each page that uses this module must FIRST, in its own
   inline classic <script>, create the placeholder promise:

     <script>
     window.nmsCoreReady = new Promise(function (res) { window.__nmsCoreResolve = res; });
     </script>
     <script type="module" src="./real-region.js"></script>

   That tiny placeholder can't itself live in here (a module script can't
   run early enough to matter), so it stays duplicated, on purpose, in
   every page that needs it. Everything else — the actual nms-core import,
   the letter-map load, and the candidate generator — lives here once.

   window.realRegionCandidates(originVx, originVy, originVz, galaxy)
   returns an array of real system objects (or null if nms-core isn't
   available yet / failed to load, in which case callers should fall back
   to their own static sample pool), same shape index.html's black-hole
   detour code already expects:
     { address, systemName, region, starType, race, economy, econType,
       econTier, conflict, conTier, outlaw, coords:{x,y,z}, distanceFromHome }
*/
import * as NMSCore from '../nms-core/index.js';
import { loadLetterMap } from '../nms-core/loadLetterMap.js';
import * as NMSEconomy from '../nms-core/economy.js';

window.NMSCore = NMSCore;
window.NMSEconomy = NMSEconomy;

loadLetterMap('../nms-core/letter-map').then(function (lm) {
  window.nmsLetterMap = lm;
  if (window.__nmsCoreResolve) window.__nmsCoreResolve();
}).catch(function (err) {
  console.error('nms-core letter map failed to load -- real-region candidates will fall back to whatever static sample pool the caller has', err);
  window.NMSCore = null;
  if (window.__nmsCoreResolve) window.__nmsCoreResolve();
});

var SIZE_XZ = 0x1000, SIZE_Y = 0x100, LY_PER_VOXEL = 400;
function hexPad(n, w) { var s = n.toString(16).toUpperCase(); while (s.length < w) s = "0" + s; return s; }
function toRawSigned(s, size) { return s < 0 ? s + size : s; }
function formatAddressLocal(p, idx, x, y, z) {
  return hexPad(p & 0xF, 1) + hexPad(idx & 0xFFF, 3) + hexPad(toRawSigned(y, SIZE_Y) & 0xFF, 2) +
         hexPad(toRawSigned(z, SIZE_XZ) & 0xFFF, 3) + hexPad(toRawSigned(x, SIZE_XZ) & 0xFFF, 3);
}
function h32Local(x, y, z, i) {
  var h = 2166136261 >>> 0, v = [x | 0, y | 0, z | 0, i | 0], k, b;
  for (k = 0; k < 4; k++) for (b = 0; b < 4; b++) { h ^= ((v[k] >>> (b * 8)) & 0xff); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function gseedLocal(galaxy, x, y, z, i) { return (h32Local(x, y, z, i) ^ Math.imul(galaxy + 1, 2654435761)) >>> 0; }
function mulberry32Local(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function regionDistanceLY(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * LY_PER_VOXEL);
}
var STAR_TYPE_BY_INDEX = ["yellow", "green", "blue", "red", "purple"];

var realRegionPoolCache = {};
// Builds real candidate systems around (originVx,originVy,originVz): that
// region plus a handful of scattered neighbouring regions (0-6 regions
// away per axis, ~0-2400 LY), so results land anywhere from right next
// door to genuinely far off, with real generated data instead of one
// fixed unrelated cluster.
function realRegionCandidates(originVx, originVy, originVz, galaxy) {
  var key = galaxy + ":" + originVx + "," + originVy + "," + originVz;
  if (realRegionPoolCache[key]) return realRegionPoolCache[key];
  if (!window.NMSCore || !window.nmsLetterMap) return null; // caller falls back

  var out = [];
  var seenRegion = {};
  var pr = mulberry32Local(gseedLocal(galaxy, originVx, originVy, originVz, 0xE317));
  var REGION_SPREAD = 6;
  var regionOffsets = [[0, 0, 0]];
  while (regionOffsets.length < 5) {
    regionOffsets.push([
      Math.floor((pr() - 0.5) * 2 * REGION_SPREAD),
      Math.floor((pr() - 0.5) * 2 * REGION_SPREAD),
      Math.floor((pr() - 0.5) * 2 * REGION_SPREAD)
    ]);
  }

  regionOffsets.forEach(function (off) {
    var vx = originVx + off[0], vy = originVy + off[1], vz = originVz + off[2];
    var rk = vx + "," + vy + "," + vz;
    if (seenRegion[rk]) return;
    seenRegion[rk] = true;

    // A region's own black-hole/Atlas guide-star indices are a separate
    // overlay (regionAnomalyIdx-style), not something systemAttributes()
    // itself flags -- skip them here so a suggested system is never
    // secretly the region's own black hole or Atlas Interface position.
    var anomaly = { bh: -1, atlas: -1 };
    try {
      var va = window.NMSCore.voxelAttributes(BigInt("0x" + formatAddressLocal(1, 0, vx, vy, vz)));
      anomaly.bh = va.black_hole_count > 0 ? (va.guide_star_count + 1) : -1;
      anomaly.atlas = va.atlas_station_count > 0 ? (va.guide_star_count + va.black_hole_count + 1) : -1;
    } catch (e) {}

    var vr = mulberry32Local(gseedLocal(galaxy, vx, vy, vz, 0xF00D));
    var pickedIdx = {}, attempts = 0, picks = 6;
    while (Object.keys(pickedIdx).length < picks && attempts < 60) {
      attempts++;
      var idx = Math.floor(vr() * 4096);
      var jitter = Math.round(vr() * 350); // spread within a region, ~one region's own span
      if (idx > 0xFFE || idx === anomaly.bh || idx === anomaly.atlas || pickedIdx[idx]) continue;
      pickedIdx[idx] = true;

      var address = formatAddressLocal(1, idx, vx, vy, vz);
      var pc;
      try { pc = BigInt("0x" + address); } catch (e) { continue; }
      var attrs = null;
      try { attrs = window.NMSCore.systemAttributes(pc, galaxy); } catch (e) { attrs = null; }
      if (!attrs) continue;

      var name = null, region = null;
      try { name = window.NMSCore.systemName(pc, galaxy, window.nmsLetterMap); } catch (e) { name = null; }
      try { region = window.NMSCore.regionName(pc, galaxy, window.nmsLetterMap); } catch (e) { region = null; }
      if (!name) continue; // a real name is the whole point -- skip rather than invent one

      var flavor = null;
      if (window.NMSEconomy && window.NMSEconomy.rollSystemFlavorFromAttrs) {
        var fr = mulberry32Local(gseedLocal(galaxy, vx, vy, vz, idx));
        try { flavor = window.NMSEconomy.rollSystemFlavorFromAttrs(fr, attrs); } catch (e) { flavor = null; }
      }

      out.push({
        address: address,
        systemName: name,
        region: region || "",
        starType: STAR_TYPE_BY_INDEX[attrs.star_type] || "yellow",
        race: flavor ? flavor.race : "",
        economy: flavor ? flavor.econType : "",
        econType: flavor ? flavor.econType : "",
        econTier: flavor ? flavor.econTier : null,
        conflict: flavor ? flavor.conflict : "",
        conTier: flavor ? flavor.conTier : null,
        outlaw: flavor ? !!flavor.outlaw : false,
        coords: { x: vx, y: vy, z: vz },
        distanceFromHome: regionDistanceLY({ x: originVx, y: originVy, z: originVz }, { x: vx, y: vy, z: vz }) + jitter
      });
    }
  });

  realRegionPoolCache[key] = out;
  return out;
}

window.realRegionCandidates = realRegionCandidates;
