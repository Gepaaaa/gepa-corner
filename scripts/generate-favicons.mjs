import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ROOT_DIR = process.cwd();

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// CRC32 implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(len + 12);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, len + 8);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, len + 8);
  return buf;
}

function generatePng(width, height, pixelFn) {
  const rowLen = width * 4;
  const rawData = Buffer.alloc(height * (rowLen + 1));

  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowLen + 1);
    rawData[rowStart] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const idx = rowStart + 1 + x * 4;
      const rgba = pixelFn(x / width, y / height, x, y, width, height);
      rawData[idx] = rgba[0];
      rawData[idx + 1] = rgba[1];
      rawData[idx + 2] = rgba[2];
      rawData[idx + 3] = rgba[3];
    }
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createPngChunk('IDAT', compressed);

  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Gepa Brand Color & Icon Pixel Renderer
 * Matches Gepa's sage aesthetic with rounded squircle, linear gradient, G monogram, sparkle and brand dot
 */
function gepaBrandPixel(u, v, x, y, width, height) {
  // Rounded squircle distance
  const cx = 0.5, cy = 0.5;
  const nx = Math.abs(u - cx) * 2; // 0 at center, 1 at edge
  const ny = Math.abs(v - cy) * 2;
  
  // Superellipse / rounded rectangle approximation (r ~ 0.28 corner radius)
  const p = 4.2; // Squircle curvature
  const dist = Math.pow(nx, p) + Math.pow(ny, p);
  
  if (dist > 1.0) {
    // Outside icon boundary - transparent
    return [0, 0, 0, 0];
  }

  // Smooth anti-aliased edge
  let alpha = 255;
  if (dist > 0.94) {
    alpha = Math.max(0, Math.min(255, Math.floor((1.0 - dist) / 0.06 * 255)));
  }

  // Gradient: Top-left #78966f (120, 150, 111) to Bottom-right #486343 (72, 99, 67)
  const gradT = (u * 0.6 + v * 0.4);
  let r = Math.round(120 - gradT * 48);
  let g = Math.round(150 - gradT * 51);
  let b = Math.round(111 - gradT * 44);

  // Subtle inner border (1.5% - 3.5% from squircle edge)
  if (dist >= 0.82 && dist <= 0.92) {
    r = Math.min(255, r + 45);
    g = Math.min(255, g + 45);
    b = Math.min(255, b + 45);
  }

  // Sparkle ✦ at top-right (around u=0.76, v=0.24)
  const sx = (u - 0.76) * 64;
  const sy = (v - 0.24) * 64;
  const sDist = Math.sqrt(sx * sx + sy * sy);
  const sCross = Math.min(Math.abs(sx), Math.abs(sy));
  if (sDist < 6.5 && (sCross < 1.4 || sDist < 2.2)) {
    const sBright = Math.max(0, 1 - sDist / 6.5);
    r = Math.round(r + (255 - r) * sBright * 0.95);
    g = Math.round(g + (255 - g) * sBright * 0.95);
    b = Math.round(b + (255 - b) * sBright * 0.95);
  }

  // Brand dot at bottom-right (around u=0.74, v=0.68)
  const dotX = (u - 0.74) * 64;
  const dotY = (v - 0.68) * 64;
  const dotDist = Math.sqrt(dotX * dotX + dotY * dotY);
  if (dotDist <= 3.8) {
    // #d7e3cd (215, 227, 205)
    const dotAlpha = dotDist > 3.0 ? (3.8 - dotDist) / 0.8 : 1.0;
    r = Math.round(r * (1 - dotAlpha) + 215 * dotAlpha);
    g = Math.round(g * (1 - dotAlpha) + 227 * dotAlpha);
    b = Math.round(b * (1 - dotAlpha) + 205 * dotAlpha);
  }

  // 'G' Monogram in center
  // Centered at u=0.46, v=0.52. Scale letter radius ~ 14px in 64px coords
  const gx = (u - 0.46) * 64;
  const gy = (v - 0.52) * 64;
  const gRadius = Math.sqrt(gx * gx + gy * gy);
  
  // Ring for G: outer ~ 12px, inner ~ 7.5px
  const isRing = gRadius >= 7.2 && gRadius <= 12.2;
  const isRightOpening = gx > 1.0 && gy > -5.0 && gy < 4.0;
  const isCrossbar = gx >= 0 && gx <= 9.0 && Math.abs(gy - 0.5) <= 2.4;
  const isRightStem = Math.abs(gx - 8.5) <= 2.4 && gy >= 0.5 && gy <= 9.5;

  let inG = (isRing && !isRightOpening) || isCrossbar || isRightStem;

  if (inG) {
    // Cream color #FAF8F1 (250, 248, 241)
    const gAlpha = 0.98;
    r = Math.round(r * (1 - gAlpha) + 250 * gAlpha);
    g = Math.round(g * (1 - gAlpha) + 248 * gAlpha);
    b = Math.round(b * (1 - gAlpha) + 241 * gAlpha);
  }

  return [r, g, b, alpha];
}

// Generate multiple sizes
const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 }, // Google standard
  { name: 'favicon-96x96.png', size: 96 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-192x192.png', size: 192 },
  { name: 'favicon-512x512.png', size: 512 }
];

const generatedPngs = {};

for (const { name, size } of sizes) {
  const pngBuf = generatePng(size, size, gepaBrandPixel);
  generatedPngs[size] = pngBuf;
  fs.writeFileSync(path.join(PUBLIC_DIR, name), pngBuf);
  fs.writeFileSync(path.join(ROOT_DIR, name), pngBuf);
  console.log(`Generated ${name} (${size}x${size}, ${pngBuf.length} bytes)`);
}

// Generate multi-resolution ICO file (combines 16x16, 32x32, 48x48 PNG chunks)
function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  let currentOffset = 6 + numImages * 16;

  for (const { size, buf } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Colors (0 = no palette)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buf.length, 8); // Image size in bytes
    entry.writeUInt32LE(currentOffset, 12); // File offset
    dirEntries.push(entry);
    currentOffset += buf.length;
  }

  const allBuffers = [header, ...dirEntries, ...pngBuffers.map(p => p.buf)];
  return Buffer.concat(allBuffers);
}

const icoBuf = createIco([
  { size: 16, buf: generatedPngs[16] },
  { size: 32, buf: generatedPngs[32] },
  { size: 48, buf: generatedPngs[48] }
]);

fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuf);
fs.writeFileSync(path.join(ROOT_DIR, 'favicon.ico'), icoBuf);
console.log(`Generated favicon.ico (multi-res 16/32/48, ${icoBuf.length} bytes)`);
