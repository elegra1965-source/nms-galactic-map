# nms-core/save-import

Client-side No Man's Sky save file (`.hg`) reader. Decompresses and deobfuscates a real save entirely in the visitor's own browser, and pulls out the two things the site can actually use: the traveller's own in-game name, and their real base names + addresses.

**Nothing in this folder ever sends the raw save file anywhere.** All decoding happens locally via the File API + a hand-written LZ4 block decompressor. See `preview.html`'s "Import from my save file" popup (search for `saveImportModal`) for the consent UI built on top of this.

---

## What's in here

| File | Source | What it does |
|---|---|---|
| `lz4-block.js` | original (elegra1965/Claude) | Pure-JS LZ4 **block**-format decompressor (not the LZ4 frame format most JS libraries implement) — hand-written against the public spec, verified byte-for-byte against a real save file |
| `parse-save.js` | original (elegra1965/Claude) | Walks the save's 16-byte block headers, decompresses each chunk, lenient-decodes the JSON, and deobfuscates every key using `save-mapping.json` |
| `extract-summary.js` | original (elegra1965/Claude) | Pulls just the useful bits out of a parsed save: traveller username, real base names + addresses (deduped, packed to the site's own 12-char hex address format) |
| `save-mapping.json` | **real data**, not generated | The actual obfuscated-key → readable-name lookup table, taken from [oxur/nms-copilot](https://github.com/oxur/nms-copilot) (itself sourced from [MBINCompiler](https://github.com/monkeyman192/MBINCompiler)'s generated mapping) |

## Why no player-given planet names come out of this

Checked directly against a real save file (not assumed): individual planet/system discovery records in `DiscoveryManagerData` never carry a player-given name — only `PersistentPlayerBases` (and `ExpeditionContext`'s copy of the same) do, and only for systems you've actually built a base in. This is also confirmed in nms-copilot's own source comments (`crates/nms-graph/src/extract.rs`: *"System/planet names aren't in discovery records"*). So this module can recover real **base** names for real **systems**, but can't recover a generic "what did you name every planet you've visited" list — that data genuinely isn't stored in the save.

## The save file format (for context, not reproduced verbatim)

A `.hg` file is a sequence of LZ4-block-compressed chunks, each preceded by a 16-byte header (`magic:u32=0xFEEDA1E5, compressedSize:u32, decompressedSize:u32, reserved:u32`, all little-endian). Once decompressed and concatenated, the result is JSON with every key replaced by a 3-character hash (SpookyHash128-based) — this is the real, publicly documented format used by every community NMS save tool (nms-copilot, MBINCompiler, NMSSaveEditor, etc). This implementation follows that public format independently; only the mapping *table* (the actual hash→name pairs) is reused verbatim from oxur/nms-copilot, since that table can only be produced by cross-referencing MBINCompiler's own generated output against the game's real `.MBIN` files — reproducing it by algorithm here isn't practical or necessary when the real table already exists and is MIT-licensed.

## Usage

```js
import { loadSaveMapping, parseSaveFile } from './parse-save.js';
import { extractSaveSummary } from './extract-summary.js';

const mapping = await loadSaveMapping('./nms-core/save-import'); // fetches save-mapping.json once, cached
const fileBytes = new Uint8Array(await file.arrayBuffer());       // file = a <input type=file> File object
const save = await parseSaveFile(fileBytes, mapping);
const summary = extractSaveSummary(save);
// summary = { username, saveName, bases:[{address, names}], baseCount, systemCount }
```

## Known limitations

- Only reads `BaseContext`/`ExpeditionContext` → `PersistentPlayerBases`. Doesn't read discoveries, inventory, or anything else in the save.
- A save with zero named bases (never built anything) will still parse fine and just return an empty `bases` array — this is expected, not an error.
- Very old save formats (pre-obfuscation, or using a different mapping table) aren't specifically tested against; `save-mapping.json` bundles both the current and legacy mapping tables from nms-copilot, which should cover most real-world saves.

## Attribution

`save-mapping.json` is real deobfuscation data from [oxur/nms-copilot](https://github.com/oxur/nms-copilot) (MIT), itself derived from [monkeyman192/MBINCompiler](https://github.com/monkeyman192/MBINCompiler)'s generated `mapping.json`. Everything else in this folder is original code (elegra1965/Claude, 2026-08-18) implementing the public, community-documented `.hg` save format independently.
