/**
 * bmp_to_svg.js
 * 
 * Reads bmp00001.bmp (544x32, 17 icons at 32x32 each),
 * removes the gray background (#C0C0C0 = 192,192,192) via flood-fill,
 * and exports each icon as a separate true-vector SVG file.
 *
 * Usage: node scripts/bmp_to_svg.js
 * Output: public/assets/t3icon/icons_svg/icon_01.svg ... icon_17.svg
 *         also processes toolbar_disable.bmp → icons_svg_disabled/
 */

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const ICON_W = 32;
const ICON_H = 32;
const BG_R = 192, BG_G = 192, BG_B = 192;   // background color
const BG_TOLERANCE = 32;                       // flood-fill tolerance (RGB distance)

const INPUTS = [
  {
    bmp: path.join(__dirname, '../public/assets/t3icon/bmp00001.bmp'),
    outDir: path.join(__dirname, '../public/assets/t3icon/icons_svg'),
    prefix: 'icon',
  },
  {
    bmp: path.join(__dirname, '../public/assets/t3icon/toolbar_disable.bmp'),
    outDir: path.join(__dirname, '../public/assets/t3icon/icons_svg_disabled'),
    prefix: 'icon_disabled',
  },
];

// ─── BMP Reader ───────────────────────────────────────────────────────────────
function readBMP(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] !== 0x42 || buf[1] !== 0x4D) throw new Error('Not a BMP file: ' + filePath);

  const pixelOffset = buf.readUInt32LE(10);
  const headerSize  = buf.readUInt32LE(14);
  const width       = buf.readInt32LE(18);
  const height      = buf.readInt32LE(22);   // negative = top-down
  const bpp         = buf.readUInt16LE(28);
  const compression = buf.readUInt32LE(30);

  const topDown  = height < 0;
  const absHeight = Math.abs(height);

  if (bpp !== 24) throw new Error(`Only 24-bit BMP supported, got ${bpp}-bit`);
  if (compression !== 0) throw new Error('Only uncompressed BMP supported');

  const rowStride = Math.ceil(width * 3 / 4) * 4;

  // Build RGBA pixel array [r,g,b,a, r,g,b,a, ...]  row-major, top-to-bottom
  const pixels = new Uint8Array(width * absHeight * 4);

  for (let y = 0; y < absHeight; y++) {
    const srcRow = topDown ? y : (absHeight - 1 - y);
    const srcBase = pixelOffset + srcRow * rowStride;
    for (let x = 0; x < width; x++) {
      const srcOff = srcBase + x * 3;
      const dstOff = (y * width + x) * 4;
      // BMP stores BGR
      pixels[dstOff + 0] = buf[srcOff + 2]; // R
      pixels[dstOff + 1] = buf[srcOff + 1]; // G
      pixels[dstOff + 2] = buf[srcOff + 0]; // B
      pixels[dstOff + 3] = 255;             // A (opaque initially)
    }
  }

  return { pixels, width, height: absHeight };
}

// ─── Extract a 32x32 icon region ─────────────────────────────────────────────
function extractIcon(src, srcW, iconIndex) {
  const ox = iconIndex * ICON_W;
  const icon = new Uint8Array(ICON_W * ICON_H * 4);
  for (let y = 0; y < ICON_H; y++) {
    for (let x = 0; x < ICON_W; x++) {
      const srcOff = ((y) * srcW + (ox + x)) * 4;
      const dstOff = (y * ICON_W + x) * 4;
      icon[dstOff + 0] = src[srcOff + 0];
      icon[dstOff + 1] = src[srcOff + 1];
      icon[dstOff + 2] = src[srcOff + 2];
      icon[dstOff + 3] = src[srcOff + 3];
    }
  }
  return icon;
}

// ─── Flood-fill background removal ───────────────────────────────────────────
function rgbDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function removeBackground(pixels, w, h) {
  const visited = new Uint8Array(w * h);
  const queue = [];

  function enqueueIfBg(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const off = idx * 4;
    const dist = rgbDist(pixels[off], pixels[off + 1], pixels[off + 2], BG_R, BG_G, BG_B);
    if (dist <= BG_TOLERANCE) {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  // Seed from all four edges
  for (let x = 0; x < w; x++) { enqueueIfBg(x, 0); enqueueIfBg(x, h - 1); }
  for (let y = 0; y < h; y++) { enqueueIfBg(0, y); enqueueIfBg(w - 1, y); }

  // BFS flood-fill
  let i = 0;
  while (i < queue.length) {
    const idx = queue[i++];
    const x = idx % w;
    const y = Math.floor(idx / w);
    // Make transparent
    pixels[idx * 4 + 3] = 0;
    // Visit 4-connected neighbors
    enqueueIfBg(x + 1, y);
    enqueueIfBg(x - 1, y);
    enqueueIfBg(x, y + 1);
    enqueueIfBg(x, y - 1);
  }
}

// ─── Pixel-to-SVG (run-length encoded rows → <rect> elements) ────────────────
function pixelsToSVG(pixels, w, h) {
  const rects = [];

  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const off = (y * w + x) * 4;
      const a = pixels[off + 3];
      if (a === 0) { x++; continue; }

      const r = pixels[off + 0];
      const g = pixels[off + 1];
      const b = pixels[off + 2];

      // Extend run-length for same color in this row
      let runLen = 1;
      while (x + runLen < w) {
        const noff = (y * w + x + runLen) * 4;
        if (
          pixels[noff + 3] === 0 ||
          pixels[noff + 0] !== r ||
          pixels[noff + 1] !== g ||
          pixels[noff + 2] !== b
        ) break;
        runLen++;
      }

      const hex = '#' +
        r.toString(16).padStart(2, '0') +
        g.toString(16).padStart(2, '0') +
        b.toString(16).padStart(2, '0');

      rects.push(`<rect x="${x}" y="${y}" width="${runLen}" height="1" fill="${hex}"/>`);
      x += runLen;
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">`,
    ...rects,
    '</svg>',
  ].join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
for (const { bmp, outDir, prefix } of INPUTS) {
  if (!fs.existsSync(bmp)) {
    console.warn(`Skipping (not found): ${bmp}`);
    continue;
  }

  console.log(`Processing: ${path.basename(bmp)}`);
  const { pixels, width, height } = readBMP(bmp);
  const iconCount = Math.floor(width / ICON_W);
  console.log(`  ${width}x${height}  →  ${iconCount} icons of ${ICON_W}x${ICON_H}`);

  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < iconCount; i++) {
    const icon = extractIcon(pixels, width, i);
    removeBackground(icon, ICON_W, ICON_H);

    const svg = pixelsToSVG(icon, ICON_W, ICON_H);
    const num = String(i + 1).padStart(2, '0');
    const outFile = path.join(outDir, `${prefix}_${num}.svg`);
    fs.writeFileSync(outFile, svg, 'utf8');
    process.stdout.write(`  [${num}/${String(iconCount).padStart(2, '0')}] ${path.basename(outFile)}\n`);
  }

  console.log(`  Done → ${outDir}\n`);
}
