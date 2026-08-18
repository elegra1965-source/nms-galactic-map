// Pulls just what the "Import from my save" UI needs out of a parsed save
// object (see parse-save.js) -- the traveller's own username, and their
// real bases (name + address), deduped by system and packed into the
// exact 12-char uppercase hex address format the rest of this site uses
// (matches isValidAddress() in netlify/functions/lib/shared.mjs and every
// existing data/overrides.json entry). ORIGINAL code, 2026-08-18.
//
// Deliberately does NOT read DiscoveryManagerData -- confirmed (both from
// nms-copilot's own source and by reading a real save directly) that
// individual discovery records never carry a player-given name, only
// PersistentPlayerBases do. See the About modal / HANDOVER.md for the
// full "why" if you're reading this later wondering why discoveries are
// skipped here.

function packedAddressToHex(v) {
  let n;
  if (typeof v === 'string') {
    const h = v.toLowerCase().startsWith('0x') ? v.slice(2) : v;
    n = BigInt('0x' + h);
  } else {
    n = BigInt(Math.trunc(v));
  }
  n = n & 0xFFFFFFFFFFFFn;
  return n.toString(16).toUpperCase().padStart(12, '0');
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
