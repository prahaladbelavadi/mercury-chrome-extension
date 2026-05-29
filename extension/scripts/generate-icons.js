#!/usr/bin/env node
/**
 * Generates Mercury icons (16×16, 48×48, 128×128) as valid PNG files
 * using only Node.js built-ins — no npm dependencies required.
 *
 * Usage: node extension/scripts/generate-icons.js
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC32 table (used by PNG chunk checksums)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf  = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf  = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Build a PNG with a circular Mercury-brand icon on dark bg.
 * Colors: bg=#0f0f13  accent=#6366f1
 */
function createMercuryPNG(size) {
  const BG  = [15, 15, 19];      // #0f0f13
  const FG  = [99, 102, 241];    // #6366f1
  const cx = size / 2, cy = size / 2;
  const r1 = size * 0.38;        // outer ring
  const r2 = size * 0.17;        // inner dot

  // Raw image: 1 filter byte + size*3 RGB bytes per row
  const raw = Buffer.alloc(size * (1 + size * 3), 0);

  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0; // filter = None
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ringW = Math.max(1, size * 0.07);

      let r, g, b;
      if (dist >= r1 - ringW && dist <= r1 + ringW) {
        // Ring
        const edge = Math.min(dist - (r1 - ringW), (r1 + ringW) - dist) / ringW;
        const a = Math.min(1, edge * 2);
        r = Math.round(BG[0] * (1 - a) + FG[0] * a);
        g = Math.round(BG[1] * (1 - a) + FG[1] * a);
        b = Math.round(BG[2] * (1 - a) + FG[2] * a);
      } else if (dist <= r2) {
        // Center dot
        const edge = Math.min(1, (r2 - dist) / (size * 0.04 + 1));
        r = Math.round(BG[0] * (1 - edge) + FG[0] * edge);
        g = Math.round(BG[1] * (1 - edge) + FG[1] * edge);
        b = Math.round(BG[2] * (1 - edge) + FG[2] * edge);
      } else {
        [r, g, b] = BG;
      }

      const idx = row + 1 + x * 3;
      raw[idx]     = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 2;  // RGB
  ihdr[10] = 0;  // deflate
  ihdr[11] = 0;  // adaptive filter
  ihdr[12] = 0;  // no interlace

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png  = createMercuryPNG(size);
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`✓ icons/icon${size}.png (${png.length} bytes)`);
}
