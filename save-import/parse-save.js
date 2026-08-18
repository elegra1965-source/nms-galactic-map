// Client-side No Man's Sky save file (.hg) parser -- decompresses the raw
// file, deobfuscates its JSON keys, and returns a plain JS object with
// readable field names (Version, CommonStateData, BaseContext, etc).
//
// EVERYTHING here runs entirely in the visitor's own browser. No save data
// is ever sent to any server -- see save-popup.js for the consent UI that
// wraps this, and NMS Galactic Map's own privacy note in the About modal.
//
// ORIGINAL implementation (elegra1965/Claude, 2026-08-18). The overall
// pipeline (16-byte block header with magic 0xFEEDA1E5 -> LZ4 block
// payload -> JSON with hashed key names) follows the same real, publicly
// documented save format used by every community NMS save tool (see
// README.md in this folder for the full list and attribution) -- this is
// an independent implementation of that public format, not copied code.
// The actual obfuscated-key -> readable-name LOOKUP TABLE in
// save-mapping.json is not reproduced here by algorithm; it's the real
// bundled mapping data from oxur/nms-copilot (itself sourced from
// MBINCompiler's own generated mapping.json), used as a static data
// asset -- see save-mapping.json's own "_source" field.
//
// Verified byte-for-byte against a real 2.6MB save file's already-known-
// correct decompression before this was wired into the UI.

import { lz4BlockDecompress } from './lz4-block.js';

const MAGIC = 0xFEEDA1E5;
const MAX_FILE_SIZE = 64 * 1024 * 1024; // 64MB -- a real save.hg is a few MB; this is a generous sanity cap, not a real-world limit

/** Walks the sequence of 16-byte block headers + LZ4 payloads and returns
 * the fully decompressed, concatenated JSON bytes. */
function decompressSaveBytes(buf) {
  if (buf.length > MAX_FILE_SIZE) {
    throw new Error("This file is larger than a real No Man's Sky save should be -- did you pick the right file?");
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = 0;
  const chunks = [];
  while (pos + 16 <= buf.length) {
    const magic = view.getUint32(pos, true);
    if (magic !== MAGIC) break;
    const compressedSize = view.getUint32(pos + 4, true);
    const decompressedSize = view.getUint32(pos + 8, true);
    pos += 16;
    if (compressedSize > buf.length || pos + compressedSize > buf.length) {
      throw new Error("This doesn't look like a complete, valid save.hg file (a block ran past the end of the file).");
    }
    const blockIn = buf.subarray(pos, pos + compressedSize);
    const blockOut = lz4BlockDecompress(blockIn, decompressedSize);
    chunks.push(blockOut);
    pos += compressedSize;
  }
  if (chunks.length === 0) {
    // The most common real-world cause of this (not a corrupt file): the
    // Microsoft Store / Xbox Game Pass version of NMS on Windows stores its
    // saves in a different, encrypted container (under
    // AppData\Local\Packages\HelloGames.NoMansSky_*\SystemAppData\wgs\)
    // rather than this LZ4-block format -- confirmed via multiple community
    // save-tool discussions (see nms-core/save-import/README.md). Only the
    // Steam/GOG save.hg format is supported here. Phrased as a likely cause,
    // not a certainty, since a genuinely wrong/corrupt file would look the
    // same from this function's point of view.
    throw new Error("This doesn't look like a No Man's Sky save file (no valid save blocks found). If you're on the Microsoft Store / Xbox Game Pass version, that uses a different, encrypted save format this tool can't currently read -- Steam and GOG saves are the ones supported here.");
  }
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

/** Decodes the decompressed bytes as lenient UTF-8 (matches how the real
 * save's own free-text fields can contain raw non-UTF-8 byte sequences in
 * a handful of internal/system strings we never read) and extracts the
 * first complete top-level JSON object, ignoring any trailing NUL padding
 * the game pads the last block out to. */
function bytesToLenientJson(bytes) {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  let end = text.length;
  while (end > 0 && /\s/.test(text[end - 1])) end--;
  const trimmed = text.slice(0, end);
  const i = trimmed.indexOf('{');
  if (i < 0) throw new Error("This doesn't look like a No Man's Sky save file (no JSON data found after decompressing).");
  let depth = 0, inStr = false, esc = false, endIdx = -1;
  for (let j = i; j < trimmed.length; j++) {
    const ch = trimmed[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { endIdx = j; break; } }
  }
  if (endIdx < 0) throw new Error("The save data looks truncated or corrupted (JSON never closes).");
  return JSON.parse(trimmed.slice(i, endIdx + 1));
}

/** Recursively renames obfuscated 3-char keys to their real field names
 * using the bundled mapping table. Keys with no known mapping are left
 * as-is (harmless -- callers only ever read a handful of well-known
 * fields by their real name). */
function deobfuscate(node, entries, fixups) {
  if (Array.isArray(node)) {
    return node.map((v) => deobfuscate(v, entries, fixups));
  }
  if (node && typeof node === 'object') {
    const out = {};
    for (const k in node) {
      const v = deobfuscate(node[k], entries, fixups);
      let nk = entries[k] !== undefined ? entries[k] : k;
      if (fixups[nk] !== undefined) nk = fixups[nk];
      out[nk] = v;
    }
    return out;
  }
  return node;
}

/** Full pipeline: raw file bytes (Uint8Array) + the parsed save-mapping.json
 * -> a plain JS object with readable field names. Throws a user-readable
 * Error on anything that isn't a real, complete NMS save file. */
async function parseSaveFile(fileBytes, mapping) {
  const raw = decompressSaveBytes(fileBytes);
  const data = bytesToLenientJson(raw);
  return deobfuscate(data, mapping.entries, mapping.fixups);
}

/** Convenience loader for save-mapping.json, matching the lazy-fetch
 * pattern loadLetterMap.js already uses elsewhere in nms-core. */
let cachedMapping = null;
async function loadSaveMapping(baseUrl = '/nms-core/save-import') {
  if (cachedMapping) return cachedMapping;
  const res = await fetch(`${baseUrl}/save-mapping.json`);
  if (!res.ok) throw new Error(`Failed to load save-mapping.json: ${res.status}`);
  cachedMapping = await res.json();
  return cachedMapping;
}

export { decompressSaveBytes, bytesToLenientJson, deobfuscate, parseSaveFile, loadSaveMapping };
