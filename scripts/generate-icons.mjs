/**
 * Generates the PWA PNG icons from the Lunelle mark with no dependencies
 * (a tiny rasteriser + PNG encoder using node:zlib).
 *
 *   node scripts/generate-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x5b, 0x4a, 0x8b];
const FG = [0xff, 0xff, 0xff];
const SAMPLES = 4; // supersampling per axis

// Geometry in the 32-unit logo viewBox (mirrors src/components/ui/Logo.tsx).
const RING = { cx: 16, cy: 16, r: 13, w: 1.75, alpha: 0.55, gapStart: -70.7, gapEnd: -19.2 };
const DOT = { cx: 25.2, cy: 6.8, r: 1.9 };
const MOON = { cx: 15.5, cy: 16.5, r: 7.5 };
const BITE = { cx: 19.6, cy: 13.4, r: 6.6 };

function coverage(x, y) {
  const inside = (c) => (x - c.cx) ** 2 + (y - c.cy) ** 2 <= c.r ** 2;
  if (inside(DOT)) return 1;
  if (inside(MOON) && !inside(BITE)) return 1;
  const d = Math.hypot(x - RING.cx, y - RING.cy);
  if (Math.abs(d - RING.r) <= RING.w / 2) {
    const angle = (Math.atan2(y - RING.cy, x - RING.cx) * 180) / Math.PI;
    if (angle < RING.gapStart || angle > RING.gapEnd) return RING.alpha;
  }
  return 0;
}

function render(size, logoScale) {
  const px = Buffer.alloc(size * size * 3);
  const logoSize = size * logoScale;
  const offset = (size - logoSize) / 2;
  for (let py = 0; py < size; py++) {
    for (let pxl = 0; pxl < size; pxl++) {
      let acc = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = ((pxl + (sx + 0.5) / SAMPLES - offset) / logoSize) * 32;
          const y = ((py + (sy + 0.5) / SAMPLES - offset) / logoSize) * 32;
          acc += coverage(x, y);
        }
      }
      const a = acc / (SAMPLES * SAMPLES);
      const i = (py * size + pxl) * 3;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(BG[c] * (1 - a) + FG[c] * a);
    }
  }
  return px;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputs = [
  ['public/icons/icon-192.png', 192, 0.74],
  ['public/icons/icon-512.png', 512, 0.74],
  ['public/icons/apple-touch-icon.png', 180, 0.7],
  // Maskable icons must keep content inside the central 80% safe zone.
  ['public/icons/icon-maskable-512.png', 512, 0.6],
];
for (const [file, size, scale] of outputs) {
  writeFileSync(file, encodePng(size, render(size, scale)));
  console.log(`wrote ${file}`);
}
