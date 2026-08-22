// Pulls just what the "Import from my save" UI needs out of a parsed save
// object (see parse-save.js) -- the traveller's own username, and their
// real bases (name + address), deduped by system and packed into the
// exact 12-char uppercase hex address format the rest of this site uses
// (matches isValidAddress() in netlify/functions/lib/shared.mjs and every
// existing data/overrides.json entry). ORIGINAL code, 2026-08-18.
//
// CORRECTION, 2026-08-21: the previous version of packedAddressToHex()
// below just masked the raw 48 bits and printed them -- it never actually
// re-ordered them to match the site's PSSSYYZZZXXX portal-string layout.
// Fixed after directly reading a real save (save-samples from pc/) and
// cross-checking against TWO independent known-correct structured
// addresses baked into the save itself: PlayerStateData.UniverseAddress
// (VoxelX:1875, VoxelY:-31, VoxelZ:1076, SolarSystemIndex:88, PlanetIndex:0
// -- the traveller's own home system) and GraveUniverseAddress (VoxelX:551,
// VoxelY:4, VoxelZ:-1693, SolarSystemIndex:213, PlanetIndex:3). The real
// packed layout, low bit to high: X (12 bits) | Z (12 bits) | Y (8 bits) |
// SolarSystemIndex (16 bits, byte-swapped relative to a plain shift-and-mask)
// | RealityIndex (4 bits, always 0 for every case seen) | PlanetIndex
// (4 bits). Both decode exactly against the formula below; the old
// non-reordered version did NOT (it silently swapped PlanetIndex and
// SolarSystemIndex on every single address). This was live in production:
// see CLAUDE.md's 2026-08-21 session note for the retroactive fix applied
// to the 224 already-imported systems in data/overrides.json.
//
// EXTENDED, 2026-08-21: now also reads DiscoveryManagerData for real player-
// given planet/system names -- the assumption above (that discoveries never
// carry a name) was wrong, confirmed by reading a real save directly.
// DiscoveryManagerData['DiscoveryData-v1'].Store.Record is a flat array
// covering EVERY discovery synced into this save file, not just the local
// player's own -- in multiplayer/shared saves it's full of other real
// travellers' discoveries too (confirmed: 143 of 151 named records in a
// real test save belonged to other USNs). Every record is filtered to
// OWS.USN matching the save's own resolved username (the same one already
// computed from PersistentPlayerBases below) before being surfaced here --
// never import someone else's discovery as if this traveller documented it.
// DD.DT is the discovery type ("Planet", "SolarSystem", "Animal", "Flora",
// "Mineral", "Sector"); DM.CN is only present once a player has actually
// renamed that discovery in-game. "Planet" records become per-body name
// overrides; "SolarSystem" records become a candidate real system name
// (only ever used to FILL a blank system name, never to overwrite one --
// same "never clobber existing data" rule as every other bulk-import field).
//
// EXTENDED AGAIN, 2026-08-22: real per-galaxy addressing (see TODO.md's
// "Real per-galaxy addressing" entry) -- a portal address alone never says
// which of the 257 galaxies it's in, so every base this importer surfaces
// now also carries its real resolved `galaxy` when one can be found.
// PersistentPlayerBases[].GalacticAddress has NO galaxy bits at all
// (confirmed by direct bit-level inspection of a real save -- don't go
// looking for it there). What DOES carry a real galaxy is a completely
// separate list, PlayerStateData.TeleportEndpoints[] -- each entry has its
// own `Name` and a STRUCTURED (not packed) `UniverseAddress` object with a
// standalone `RealityIndex` field (0-255, literally "galaxy index",
// sitting alongside VoxelX/VoxelY/VoxelZ/SolarSystemIndex/PlanetIndex the
// same way PlayerStateData.UniverseAddress does in the worked example
// above). Name-matching TeleportEndpoints[].Name against
// PersistentPlayerBases[].Name resolves real galaxy for most (not all --
// not every base has a teleporter) bases; verified directly against a real
// save (191 of 278 real bases resolved in the original investigation).
// Planet/system-NAME discoveries (DiscoveryManagerData) carry no galaxy
// field of their own and aren't teleport points, so they can't be resolved
// this same way -- callers fall back to the save's own CURRENT galaxy
// (PlayerStateData.UniverseAddress.RealityIndex, also returned here as
// currentGalaxy) for anything that can't be name-matched, and should treat
// that fallback as a plausible guess, not a verified fact, per TODO.md's
// own recommendation. Deliberately NOT attempting a broader address-based
// cross-reference (reconstructing a system address from a TeleportEndpoint's
// own signed Voxel coordinates would need a new signed-to-unsigned
// conversion this code has never had to do before, and there's no real
// save file in this environment to verify it against -- exactly the kind
// of "easy to get subtly wrong" math this project's own history warns
// against shipping unverified, see CLAUDE.md). Flagged as a possible
// future enhancement, not silently skipped.

// Shared decode step used by both packedAddressToHex() (below, unchanged
// public signature -- still returns a plain hex string, exactly as every
// existing caller expects) and packedAddressToFields() (new -- returns the
// P/SSI/Y/Z/X pieces separately, needed for discovery records where the
// PlanetIndex has to be split out from the rest of the address instead of
// baked into one combined hex string).
function decodeRawAddress(v) {
  let n;
  if (typeof v === 'string') {
    const h = v.toLowerCase().startsWith('0x') ? v.slice(2) : v;
    n = BigInt('0x' + h);
  } else {
    n = BigInt(Math.trunc(v));
  }
  n = n & 0xFFFFFFFFFFFFFFn; // 56 bits: keep PlanetIndex's nibble too

  const x = n & 0xFFFn;
  const z = (n >> 12n) & 0xFFFn;
  const y = (n >> 24n) & 0xFFn;
  const ssiRaw = (n >> 32n) & 0xFFFFn;
  const ssi = (((ssiRaw & 0xFFn) << 8n) | ((ssiRaw >> 8n) & 0xFFn)) & 0xFFFn; // byte-swap, then keep the 3 hex digits the portal format actually has room for
  const p = (n >> 52n) & 0xFn; // top nibble; bits 48-51 are RealityIndex, unused here

  return { p: Number(p), ssi, y, z, x };
}

function fieldsToHex(f, pOverride) {
  const p = pOverride === undefined ? BigInt(f.p) : BigInt(pOverride);
  const packed = (p << 44n) | (f.ssi << 32n) | (f.y << 24n) | (f.z << 12n) | f.x;
  return packed.toString(16).toUpperCase().padStart(12, '0');
}

function packedAddressToHex(v) {
  // P forced to 1 -- see the 2026-08-22 root-cause-fix comment above the
  // relevant call sites in this file for why (matches every real
  // formatAddress(1,...) call site in preview.html; a base's own raw
  // PlanetIndex nibble was never used for anything downstream of this
  // call, only the system-level address itself, so preserving it here
  // was actively harmful, not just imprecise).
  return fieldsToHex(decodeRawAddress(v), 1);
}

/** Name -> RealityIndex (0-255 galaxy index), built from every
 * PlayerStateData.TeleportEndpoints[] entry across all contexts that has
 * both a real Name and a numeric UniverseAddress.RealityIndex. First match
 * wins if the same name somehow appears twice. See the file header comment
 * (2026-08-22 addition) for what this can and can't resolve. */
function collectTeleportGalaxies(contexts) {
  const byName = new Map();
  for (const ctx of contexts) {
    const psd = ctx && ctx.PlayerStateData;
    const eps = (psd && psd.TeleportEndpoints) || [];
    for (const ep of eps) {
      const name = (ep && ep.Name || '').trim();
      const ua = ep && ep.UniverseAddress;
      if (!name || !ua || typeof ua.RealityIndex !== 'number') continue;
      if (!byName.has(name)) byName.set(name, ua.RealityIndex);
    }
  }
  return byName;
}

/** The save's own CURRENT galaxy (where the traveller's UniverseAddress
 * sits right now), used as the best-guess fallback for anything that can't
 * be resolved via collectTeleportGalaxies() above -- e.g. a planet/system
 * name discovery with no teleport point of its own. Returns null if no
 * context has a usable PlayerStateData.UniverseAddress.RealityIndex. */
function currentSaveGalaxy(contexts) {
  for (const ctx of contexts) {
    const psd = ctx && ctx.PlayerStateData;
    const ua = psd && psd.UniverseAddress;
    if (ua && typeof ua.RealityIndex === 'number') return ua.RealityIndex;
  }
  return null;
}

/** Returns { planetIndex, systemAddress } -- systemAddress is the same
 * 12-char hex as packedAddressToHex() but with the leading PlanetIndex
 * nibble forced to P=1 (CORRECTED 2026-08-22 -- previously zeroed to
 * '0', which does NOT match this site's real convention: preview.html's
 * own generateSystem()/formatAddress() always builds a system's canonical
 * .address with P hardcoded to 1, never 0. A P=0 address is therefore
 * just as unreachable by the site's real lookup as any other wrong
 * digit -- this was silently producing orphaned community-store records,
 * exactly the class of bug found in the "Sranch duplicate" investigation
 * (see CLAUDE.md's 2026-08-22 session note). planetIndex is the discovery
 * record's own real PlanetIndex nibble, 0-15 (matches the 1-based
 * b.index this site's own body arrays already use, per
 * generateSystem()/planetSeeds() -- a discovery's real PlanetIndex tells
 * you exactly which body slot it is), returned separately and untouched
 * by the P=1 normalization above, which only affects the address used as
 * the system-level storage/lookup key. */
function packedAddressToFields(v) {
  const f = decodeRawAddress(v);
  return { planetIndex: f.p, systemAddress: fieldsToHex(f, 1) };
}

/** Returns { username, bases: [{address, name}], baseCount, systemCount,
 * planets: [{systemAddress, planetIndex, name}], systemNames:
 * [{address, name}] }. planets/systemNames come from DiscoveryManagerData,
 * filtered to this traveller's own USN only -- see the file header comment. */
function extractSaveSummary(deobfuscatedSave) {
  const contexts = [];
  if (deobfuscatedSave.BaseContext) contexts.push(deobfuscatedSave.BaseContext);
  if (deobfuscatedSave.ExpeditionContext) contexts.push(deobfuscatedSave.ExpeditionContext);

  const byAddress = new Map(); // hexAddr -> {names:Set, ts:number}
  let username = '';
  const usnCounts = new Map();

  for (const ctx of contexts) {
    const psd = ctx && ctx.PlayerStateData;
    const bases = (psd && psd.PersistentPlayerBases) || [];
    for (const b of bases) {
      const name = (b && b.Name || '').trim();
      if (!name) continue;
      let addr;
      try { addr = packedAddressToHex(b.GalacticAddress); }
      catch (e) { continue; }
      const usn = (b.Owner && b.Owner.USN) || '';
      if (usn) usnCounts.set(usn, (usnCounts.get(usn) || 0) + 1);
      const ts = (b.LastUpdateTimestamp || 0);

      if (!byAddress.has(addr)) byAddress.set(addr, []);
      const list = byAddress.get(addr);
      if (!list.some((e) => e.name === name)) list.push({ name, ts });
    }
  }

  // The visitor's own traveller name: the most common Owner.USN across
  // their own PersistentPlayerBases (this structure only ever holds the
  // local player's own bases, never other travellers').
  let bestUsn = '', bestCount = 0;
  for (const [usn, count] of usnCounts) {
    if (count > bestCount) { bestUsn = usn; bestCount = count; }
  }
  username = bestUsn;

  const teleportGalaxies = collectTeleportGalaxies(contexts);
  const currentGalaxy = currentSaveGalaxy(contexts);

  const bases = [];
  for (const [addr, list] of byAddress) {
    list.sort((a, b) => b.ts - a.ts);
    // First of this base's own names (there can be more than one if the
    // same address was renamed over time) that also shows up as a real
    // teleport point wins -- see collectTeleportGalaxies()'s comment. null
    // if none of them match (not every base has a teleporter).
    let galaxy = null;
    for (const e of list) {
      if (teleportGalaxies.has(e.name)) { galaxy = teleportGalaxies.get(e.name); break; }
    }
    bases.push({ address: addr, names: list.map((e) => e.name), galaxy: galaxy });
  }

  // Real per-discovery names, filtered to this traveller's own username
  // only (see file header). DiscoveryManagerData sits at the save's top
  // level, not nested under BaseContext/ExpeditionContext like everything
  // above -- confirmed by reading a real save directly.
  const planets = []; // [{systemAddress, planetIndex, name}]
  const systemNamesMap = new Map(); // systemAddress -> name (first one wins if duplicates)
  const dm = deobfuscatedSave.DiscoveryManagerData;
  const records = dm && dm['DiscoveryData-v1'] && dm['DiscoveryData-v1'].Store
    ? (dm['DiscoveryData-v1'].Store.Record || [])
    : [];
  const usnLower = username.toLowerCase();
  if (usnLower) {
    for (const rec of records) {
      const dd = rec && rec.DD;
      const dmField = rec && rec.DM;
      const ows = rec && rec.OWS;
      if (!dd || !dmField) continue;
      const cn = (dmField.CN || '').trim();
      if (!cn) continue;
      const usn = ((ows && ows.USN) || '').toLowerCase();
      if (usn !== usnLower) continue; // not this traveller's own discovery

      let fields;
      try { fields = packedAddressToFields(dd.UA); }
      catch (e) { continue; }

      if (dd.DT === 'Planet') {
        planets.push({ systemAddress: fields.systemAddress, planetIndex: fields.planetIndex, name: cn });
      } else if (dd.DT === 'SolarSystem') {
        if (!systemNamesMap.has(fields.systemAddress)) systemNamesMap.set(fields.systemAddress, cn);
      }
      // Animal/Flora/Mineral/Sector discoveries also carry real names but
      // aren't wired into the importer yet -- see HANDOVER.md/CLAUDE.md if
      // that's ever worth adding (creature/flora logs, not planet identity).
    }
  }
  const systemNames = [];
  for (const [addr, name] of systemNamesMap) systemNames.push({ address: addr, name });

  return {
    username,
    saveName: (deobfuscatedSave.CommonStateData && deobfuscatedSave.CommonStateData.SaveName) || '',
    bases,
    baseCount: bases.reduce((n, b) => n + b.names.length, 0),
    systemCount: bases.length,
    planets,
    systemNames,
    // The save's own current galaxy (see currentSaveGalaxy() above) -- the
    // caller (preview.html's save-import UI) uses this as the best-guess
    // fallback for any base/planet/system-name entry that
    // collectTeleportGalaxies() couldn't resolve a real galaxy for. null if
    // genuinely unknown.
    currentGalaxy,
  };
}

export { extractSaveSummary, packedAddressToHex, packedAddressToFields };
