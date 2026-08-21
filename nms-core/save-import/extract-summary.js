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
// Was also deliberately NOT reading DiscoveryManagerData here -- that
// assumption has since been corrected too: real per-discovery player-given
// names (DiscoveryManagerData['DiscoveryData-v1'].Store.Record[].DM.CN) DO
// exist for planets/animals/flora/minerals, confirmed by reading a real
// save directly. Still not wired into this importer yet (separate future
// work) -- flagging here so nobody re-reads the old claim and trusts it.

function packedAddressToHex(v) {
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

  const packed = (p << 44n) | (ssi << 32n) | (y << 24n) | (z << 12n) | x;
  return packed.toString(16).toUpperCase().padStart(12, '0');
}

/** Returns { username, bases: [{address, name}], baseCount, systemCount } */
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

  const bases = [];
  for (const [addr, list] of byAddress) {
    list.sort((a, b) => b.ts - a.ts);
    bases.push({ address: addr, names: list.map((e) => e.name) });
  }

  return {
    username,
    saveName: (deobfuscatedSave.CommonStateData && deobfuscatedSave.CommonStateData.SaveName) || '',
    bases,
    baseCount: bases.reduce((n, b) => n + b.names.length, 0),
    systemCount: bases.length,
  };
}

export { extractSaveSummary, packedAddressToHex };
