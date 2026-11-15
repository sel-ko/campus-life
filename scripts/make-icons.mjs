// Draws the app icons (a big-head block student) as PNG files, with no
// libraries: just rectangles and Node's built-in zlib.
// Run: node scripts/make-icons.mjs   (writes into public/icons/)
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const NIGHT = [0x14, 0x20, 0x2b];
const SUN = [0xf5, 0xb8, 0x3d];
const SKIN = [0x8d, 0x5a, 0x3a];
const SKIN_DARK = [0x71, 0x48, 0x2e];
const HAIR = [0x1b, 0x12, 0x0d];
const WHITE = [0xfb, 0xf7, 0xee];
const PUPIL = [0x2a, 0x18, 0x10];
const LIP = [0x9e, 0x3b, 0x4b];
const TOP = [0x2e, 0x8b, 0x57];

/** Shapes on a 100 x 100 grid: [x, y, w, h, colour, cornerRadius]. */
function shapes(padding) {
  // padding shrinks the drawing towards the centre (maskable icons need a safe zone)
  const s = (100 - padding * 2) / 100;
  const at = (x, y, w, h, c, r = 0) => [padding + x * s, padding + y * s, w * s, h * s, c, r * s];
  return [
    at(14, 82, 72, 30, TOP, 10), // shoulders
    at(20, 18, 60, 58, SKIN, 9), // head
    at(14, 40, 8, 16, SKIN, 3), // ears
    at(78, 40, 8, 16, SKIN, 3),
    at(18, 12, 64, 16, HAIR, 7), // hair
    at(18, 22, 4, 16, HAIR),
    at(78, 22, 4, 16, HAIR),
    at(30, 38, 13, 11, WHITE, 2), // eyes
    at(57, 38, 13, 11, WHITE, 2),
    at(33, 39, 7, 9, PUPIL, 1),
    at(60, 39, 7, 9, PUPIL, 1),
    at(29, 31, 15, 4, HAIR, 1), // brows
    at(56, 31, 15, 4, HAIR, 1),
    at(45, 50, 10, 8, SKIN_DARK, 3), // nose
    at(36, 63, 28, 4, LIP, 2), // mouth
    at(28, 61, 5, 4, LIP, 1),
    at(67, 61, 5, 4, LIP, 1),
  ];
}

function inside(px, py, [x, y, w, h, , r]) {
  if (px < x || py < y || px >= x + w || py >= y + h) return false;
  if (!r) return true;
  const cx = Math.max(x + r, Math.min(px, x + w - r));
  const cy = Math.max(y + r, Math.min(py, y + h - r));
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function draw(size, { padding = 6, roundBg = true }) {
  const list = shapes(padding);
  const px = Buffer.alloc(size * size * 4);
  const SS = 3; // 3x3 supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / size) * 100;
          const v = ((y + (sy + 0.5) / SS) / size) * 100;
          // Background: rounded square (normal) or full square (maskable).
          const bgShape = [0, 0, 100, 100, NIGHT, roundBg ? 22 : 0];
          if (!inside(u, v, bgShape)) continue;
          let c = NIGHT;
          if (u > 0 && v > 88) c = SUN; // a strip of school-ish gold at the bottom
          for (const s of list) if (inside(u, v, s)) c = s[4];
          r += c[0]; g += c[1]; b += c[2]; a += 255;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      const cov = a / n / 255;
      px[i] = cov ? r / (n * cov) : 0;
      px[i + 1] = cov ? g / (n * cov) : 0;
      px[i + 2] = cov ? b / (n * cov) : 0;
      px[i + 3] = a / n;
    }
  }
  return png(size, size, px);
}

// ---- minimal PNG encoder ----
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // no filter
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', draw(192, {}));
writeFileSync('public/icons/icon-512.png', draw(512, {}));
writeFileSync('public/icons/maskable-512.png', draw(512, { padding: 16, roundBg: false }));
writeFileSync('public/icons/apple-touch-icon.png', draw(180, { roundBg: false }));
writeFileSync('public/favicon.png', draw(64, {}));
console.log('Icons written to public/icons/ and public/favicon.png');
