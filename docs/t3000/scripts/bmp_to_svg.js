/**
 * bmp_to_svg.js  (v2)
 *
 * Reads bmp00001.bmp (544×32, 17 icons at 32×32 each), removes the gray
 * background (#C0C0C0) and exports each icon as a separate SVG file that
 * embeds a transparent PNG.
 *
 * Background removal uses TWO passes:
 *   Pass 1 – BFS flood-fill from all four edges (removes exterior BG incl.
 *             anti-aliased edge pixels).
 *   Pass 2 – Global colour key with tight tolerance (removes enclosed BG
 *             regions inside gear-teeth etc. that are unreachable from edges).
 *
 * Output SVGs embed the transparent PNG as a base64 data URI so they look
 * identical to the source at any size with no jagged pixel artefacts.
 *
 * Usage:  node docs/t3000/scripts/bmp_to_svg.js
 * Output: public/assets/t3icon/icons_svg/icon_01.svg … icon_17.svg
 *         public/assets/t3icon/icons_svg_disabled/icon_disabled_01.svg …
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── Config ──────────────────────────────────────────────────────────────────
const ICON_W = 32;
const ICON_H = 32;
const BG = { r: 192, g: 192, b: 192 };

// Pass-1: BFS flood-fill from all four icon edges (handles exterior BG + anti-
//         aliased fringe pixels that blend into the background).
const FLOOD_TOLERANCE = 28;

// Pass-2: Global colour key applied AFTER flood-fill.  Only pixels whose RGB
//         distance from BG is ≤ this value are additionally cleared.  This
//         catches enclosed regions (e.g. background trapped inside gear teeth)
//         that the flood-fill cannot reach from the outside.  The value is
//         intentionally tight so that legitimate dark-grey icon pixels (which
//         tend to be far from 192,192,192) are left untouched.
const GLOBAL_KEY_TOLERANCE = 8;

// Resolved relative to this script's location (docs/t3000/scripts/)
const ROOT = path.resolve(__dirname, '../../..');

const INPUTS = [
  {
    bmp   : path.join(ROOT, 'public/assets/t3icon/bmp00001.bmp'),
    outDir: path.join(ROOT, 'public/assets/t3icon/icons_svg'),
    prefix: 'icon',
  },
  {
    bmp   : path.join(ROOT, 'public/assets/t3icon/toolbar_disable.bmp'),
    outDir: path.join(ROOT, 'public/assets/t3icon/icons_svg_disabled'),
    prefix: 'icon_disabled',
  },
];

// ─── CRC-32 (needed by PNG encoder) ──────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── PNG encoder (pure Node.js – uses built-in zlib) ─────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([t, data]));
  const out = Buffer.alloc(4 + 4 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  t.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crcVal, 8 + data.length);
  return out;
}

function encodePNG(pixels, w, h) {
  // IHDR: 8-bit RGBA (colour type 6)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // bit-depth=8, colour-type=RGBA

  // Raw scanlines: one filter byte (0 = None) followed by RGBA samples
  const raw = Buffer.alloc(h * (1 + w * 4));
  let pos = 0;
  for (let y = 0; y < h; y++) {
    raw[pos++] = 0; // filter None
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      raw[pos++] = pixels[o];
      raw[pos++] = pixels[o + 1];
      raw[pos++] = pixels[o + 2];
      raw[pos++] = pixels[o + 3];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── BMP Reader ───────────────────────────────────────────────────────────────
function readBMP(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] !== 0x42 || buf[1] !== 0x4D) throw new Error('Not a BMP: ' + filePath);

  const pixelOffset = buf.readUInt32LE(10);
  const width       = buf.readInt32LE(18);
  const rawHeight   = buf.readInt32LE(22); // negative = top-down storage
  const bpp         = buf.readUInt16LE(28);
  const compression = buf.readUInt32LE(30);

  if (bpp !== 24)      throw new Error(`Need 24-bit BMP, got ${bpp}-bit`);
  if (compression !==0) throw new Error('Need uncompressed BMP');

  const topDown = rawHeight < 0;
  const height  = Math.abs(rawHeight);
  const stride  = Math.ceil(width * 3 / 4) * 4;

  // RGBA, top-to-bottom
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcRow = topDown ? y : (height - 1 - y);
    const base   = pixelOffset + srcRow * stride;
    for (let x = 0; x < width; x++) {
      const s = base + x * 3;
      const d = (y * width + x) * 4;
      pixels[d]     = buf[s + 2]; // R  (BMP stores BGR)
      pixels[d + 1] = buf[s + 1]; // G
      pixels[d + 2] = buf[s];     // B
      pixels[d + 3] = 255;
    }
  }
  return { pixels, width, height };
}

// ─── Extract one 32×32 icon cell ─────────────────────────────────────────────
function extractIcon(src, srcW, iconIndex) {
  const ox   = iconIndex * ICON_W;
  const icon = new Uint8Array(ICON_W * ICON_H * 4);
  for (let y = 0; y < ICON_H; y++) {
    for (let x = 0; x < ICON_W; x++) {
      const s = (y * srcW + (ox + x)) * 4;
      const d = (y * ICON_W + x) * 4;
      icon[d]     = src[s];
      icon[d + 1] = src[s + 1];
      icon[d + 2] = src[s + 2];
      icon[d + 3] = src[s + 3];
    }
  }
  return icon;
}

// ─── Background removal ───────────────────────────────────────────────────────
function bgDist(r, g, b) {
  return Math.sqrt((r - BG.r) ** 2 + (g - BG.g) ** 2 + (b - BG.b) ** 2);
}

function removeBackground(pixels, w, h) {
  // ── Pass 1: BFS flood-fill seeded from all four icon edges ──────────────
  const visited = new Uint8Array(w * h);
  const queue   = [];

  function tryEnqueue(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const o = idx * 4;
    if (bgDist(pixels[o], pixels[o + 1], pixels[o + 2]) <= FLOOD_TOLERANCE) {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  for (let x = 0; x < w; x++) { tryEnqueue(x, 0); tryEnqueue(x, h - 1); }
  for (let y = 0; y < h; y++) { tryEnqueue(0, y); tryEnqueue(w - 1, y); }

  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    pixels[idx * 4 + 3] = 0; // transparent
    const x = idx % w, y = (idx / w) | 0;
    tryEnqueue(x + 1, y); tryEnqueue(x - 1, y);
    tryEnqueue(x, y + 1); tryEnqueue(x, y - 1);
  }

  // ── Pass 2: global key – removes enclosed BG regions (e.g. gear-tooth
  //    interiors) that are geometrically unreachable from the icon edges ──
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (pixels[o + 3] === 0) continue; // already transparent
    if (bgDist(pixels[o], pixels[o + 1], pixels[o + 2]) <= GLOBAL_KEY_TOLERANCE) {
      pixels[o + 3] = 0;
    }
  }
}

// ─── Wrap a transparent PNG as an SVG <image> data-URI ───────────────────────
function pngToSVG(pngBuf, w, h) {
  const b64 = pngBuf.toString('base64');
  // viewBox matches the pixel grid; no explicit width/height so the SVG
  // scales naturally when used as <img> or CSS background.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${w} ${h}">\n` +
    `  <image width="${w}" height="${h}" ` +
    `xlink:href="data:image/png;base64,${b64}"/>\n` +
    `</svg>\n`
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
for (const { bmp, outDir, prefix } of INPUTS) {
  if (!fs.existsSync(bmp)) { console.warn('Skipping (not found):', bmp); continue; }

  console.log('Processing:', path.basename(bmp));
  const { pixels, width, height } = readBMP(bmp);
  const iconCount = Math.floor(width / ICON_W);
  console.log(`  ${width}×${height}  →  ${iconCount} icons of ${ICON_W}×${ICON_H}`);

  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < iconCount; i++) {
    const icon = extractIcon(pixels, width, i);
    removeBackground(icon, ICON_W, ICON_H);

    const png = encodePNG(icon, ICON_W, ICON_H);
    const svg = pngToSVG(png, ICON_W, ICON_H);

    const num     = String(i + 1).padStart(2, '0');
    const outFile = path.join(outDir, `${prefix}_${num}.svg`);
    fs.writeFileSync(outFile, svg, 'utf8');
    process.stdout.write(`  [${num}/${String(iconCount).padStart(2, '0')}] ${path.basename(outFile)}\n`);
  }

  console.log(`  Done → ${outDir}\n`);
}
