// Minimal pure-JS LZ4 BLOCK-format decompressor (the LZ4 "block" spec, NOT
// the LZ4 "frame" format -- NMS save files store raw LZ4 blocks behind
// their own custom 16-byte header, see parse-save.js). Implements the
// standard public LZ4 block spec: a token byte splits into a literal-length
// nibble + match-length nibble, each extensible via 0xFF continuation
// bytes; a 2-byte little-endian back-reference offset follows the
// literals; matches are copied byte-by-byte since source/destination
// ranges can legitimately overlap (that's how LZ4 encodes short repeats).
// No external dependencies -- works directly on a Uint8Array, runs
// identically in a browser or Node.
//
// ORIGINAL implementation (elegra1965/Claude, 2026-08-18), written
// directly against the public LZ4 block-format specification -- not a
// port of any other project's code. Verified byte-for-byte against a real
// 2.6MB No Man's Sky save file's already-known-correct decompression
// (matches a reference decompression cross-checked against nms-copilot's
// documented pipeline) -- see this folder's README.md.

function lz4BlockDecompress(input, expectedSize) {
  const out = new Uint8Array(expectedSize);
  let ip = 0; // input position
  let op = 0; // output position
  const inLen = input.length;

  while (ip < inLen) {
    const token = input[ip++];
    let literalLen = token >> 4;
    if (literalLen === 15) {
      let b;
      do {
        b = input[ip++];
        literalLen += b;
      } while (b === 255);
    }
    for (let i = 0; i < literalLen; i++) {
      out[op++] = input[ip++];
    }
    // End of block: the final sequence has literals only, no match part.
    if (ip >= inLen) break;

    const offset = input[ip] | (input[ip + 1] << 8);
    ip += 2;
    if (offset === 0) {
      throw new Error("lz4BlockDecompress: zero offset (corrupt stream)");
    }

    let matchLen = token & 0x0f;
    if (matchLen === 15) {
      let b;
      do {
        b = input[ip++];
        matchLen += b;
      } while (b === 255);
    }
    matchLen += 4; // LZ4 minimum encodable match length

    let matchPos = op - offset;
    if (matchPos < 0) {
      throw new Error("lz4BlockDecompress: match offset before start of output (corrupt stream)");
    }
    for (let i = 0; i < matchLen; i++) {
      out[op++] = out[matchPos++];
    }
  }

  if (op !== expectedSize) {
    throw new Error(`lz4BlockDecompress: expected ${expectedSize} bytes, got ${op}`);
  }
  return out;
}

export { lz4BlockDecompress };
