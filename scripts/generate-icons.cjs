#!/usr/bin/env node
/**
 * Generates minimal valid PNG icon files for PWA without external dependencies.
 * Uses raw PNG byte construction + Node.js built-in zlib.
 * Run: node scripts/generate-icons.js
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/**
 * Creates a PNG buffer: white background, brand-blue circle with a white "B" letter.
 * Uses RGB (color type 2), no alpha, filter type 0 (None) per scanline.
 */
function createIconPNG(size, r, g, b) {
  // ── helpers ──────────────────────────────────────────────────────────────
  function u32be(n) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(n >>> 0, 0);
    return buf;
  }

  // CRC-32 table (standard PNG polynomial)
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (const byte of buf) c = (crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)) >>> 0;
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const tb = Buffer.from(type, 'ascii');
    return Buffer.concat([u32be(data.length), tb, data, u32be(crc32(Buffer.concat([tb, data])))]);
  }

  // ── IHDR ─────────────────────────────────────────────────────────────────
  const ihdr = chunk('IHDR', Buffer.concat([
    u32be(size), u32be(size),
    Buffer.from([8, 2, 0, 0, 0]) // 8-bit, RGB, deflate, no filter, no interlace
  ]));

  // ── Raw scanlines: filter(0) + RGB per pixel ──────────────────────────────
  const rowLen = 1 + size * 3;
  const raw = Buffer.alloc(size * rowLen, 255); // pre-fill white
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.36; // inner white region for a ring effect

  for (let y = 0; y < size; y++) {
    const base = y * rowLen;
    raw[base] = 0; // filter byte: None
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d2 = dx * dx + dy * dy;
      const pr = base + 1 + x * 3;
      if (d2 <= outerR * outerR) {
        // Blue filled circle
        raw[pr] = r; raw[pr + 1] = g; raw[pr + 2] = b;
      }
      // else: stays white (pre-filled)
    }
  }

  // Draw a simple white "B" letter in the center using a 5x7 bitmap
  const bitmap = [
    [1,1,1,0,0],
    [1,0,0,1,0],
    [1,0,0,1,0],
    [1,1,1,0,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
  ];
  const scale = Math.max(1, Math.floor(size / 32));
  const bw = 5 * scale, bh = 7 * scale;
  const startX = Math.floor(cx - bw / 2);
  const startY = Math.floor(cy - bh / 2);

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (bitmap[row][col]) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = startX + col * scale + dx;
            const py = startY + row * scale + dy;
            if (px >= 0 && px < size && py >= 0 && py < size) {
              const pr = py * rowLen + 1 + px * 3;
              raw[pr] = 255; raw[pr + 1] = 255; raw[pr + 2] = 255;
            }
          }
        }
      }
    }
  }

  // ── IDAT + IEND ───────────────────────────────────────────────────────────
  const idat = chunk('IDAT', zlib.deflateSync(raw));
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    ihdr, idat, iend,
  ]);
}

// Brand blue: #2563eb = rgb(37, 99, 235)
const R = 37, G = 99, B = 235;

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const sizes = [180, 192, 512];
for (const size of sizes) {
  const png = createIconPNG(size, R, G, B);
  fs.writeFileSync(path.join(outDir, `icon-${size}x${size}.png`), png);
  console.log(`✓ icon-${size}x${size}.png`);
}

// Maskable copies (same icon; safe-zone is already > 80%)
fs.copyFileSync(path.join(outDir, 'icon-192x192.png'), path.join(outDir, 'icon-192x192-maskable.png'));
fs.copyFileSync(path.join(outDir, 'icon-512x512.png'), path.join(outDir, 'icon-512x512-maskable.png'));
console.log('✓ maskable copies created');
console.log('Done.');
