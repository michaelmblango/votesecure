const sharp  = require('sharp');
const fs     = require('fs');
const path   = require('path');

const publicDir = path.join(__dirname, '../public');

// Set to false to use the geometric ballot-box fallback instead of the emoji.
const USE_EMOJI = false;

// The icon design: navy rounded square + ballot box emoji
function buildEmojiSVG(size) {
  const radius   = Math.round(size * 0.22);
  const emoji    = size >= 64 ? '🗳️' : '🗳';
  const fontSize = Math.round(size * 0.52);
  const y        = Math.round(size * 0.72);

  return `<svg xmlns="http://www.w3.org/2000/svg"
               xmlns:xlink="http://www.w3.org/1999/xlink"
               viewBox="0 0 ${size} ${size}"
               width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="#0D2B55"/>
    <text
      x="${size / 2}"
      y="${y}"
      font-size="${fontSize}"
      text-anchor="middle"
      font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"
      dominant-baseline="auto">
      ${emoji}
    </text>
  </svg>`;
}

// Pure-SVG geometric ballot icon - always renders correctly regardless
// of the host's emoji font support.
function buildGeometricSVG(size) {
  const r  = Math.round(size * 0.22);
  const bw = Math.round(size * 0.54);
  const bh = Math.round(size * 0.44);
  const bx = Math.round((size - bw) / 2);
  const by = Math.round(size * 0.40);
  const sw = Math.round(bw * 0.32);
  const sh = Math.round(size * 0.18);
  const sx = Math.round((size - sw) / 2);
  const sy = Math.round(size * 0.22);
  const sr = Math.round(size * 0.04);

  return `<svg xmlns="http://www.w3.org/2000/svg"
               viewBox="0 0 ${size} ${size}"
               width="${size}" height="${size}">
    <!-- Background -->
    <rect width="${size}" height="${size}" rx="${r}" fill="#0D2B55"/>

    <!-- Ballot slot paper top -->
    <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}"
          rx="${sr}" fill="#ffffff" opacity="0.95"/>

    <!-- Green checkmark on paper -->
    <polyline
      points="${sx + sw*0.22},${sy + sh*0.52}
              ${sx + sw*0.45},${sy + sh*0.76}
              ${sx + sw*0.78},${sy + sh*0.24}"
      stroke="#22C55E" stroke-width="${Math.round(size*0.045)}"
      stroke-linecap="round" stroke-linejoin="round"
      fill="none"/>

    <!-- Ballot box body -->
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}"
          rx="${Math.round(size*0.06)}"
          fill="#ffffff" opacity="0.18"/>

    <!-- Slot at top of box -->
    <rect x="${Math.round(size*0.38)}" y="${Math.round(by - size*0.02)}"
          width="${Math.round(size*0.24)}" height="${Math.round(size*0.05)}"
          rx="${Math.round(size*0.025)}"
          fill="#0D2B55" opacity="0.6"/>

    <!-- Two handle dots -->
    <circle cx="${Math.round(size*0.37)}" cy="${Math.round(by + bh*0.42)}"
            r="${Math.round(size*0.03)}" fill="#ffffff" opacity="0.4"/>
    <circle cx="${Math.round(size*0.63)}" cy="${Math.round(by + bh*0.42)}"
            r="${Math.round(size*0.03)}" fill="#ffffff" opacity="0.4"/>
  </svg>`;
}

function buildSVG(size) {
  return USE_EMOJI ? buildEmojiSVG(size) : buildGeometricSVG(size);
}

async function generate(svgString, outputPath, size) {
  const buf = Buffer.from(svgString);
  await sharp(buf, { density: 300 })
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(outputPath);
  console.log(`Generated ${path.basename(outputPath)} (${size}x${size})`);
}

// Build a genuine ICO container embedding a PNG image (the modern ICO
// format, supported everywhere since Windows Vista) - NOT a renamed PNG.
function buildIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(1, 4); // image count

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
  dirEntry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  dirEntry.writeUInt8(0, 2);                      // color palette
  dirEntry.writeUInt8(0, 3);                      // reserved
  dirEntry.writeUInt16LE(1, 4);                   // color planes
  dirEntry.writeUInt16LE(32, 6);                  // bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8);    // image data size
  dirEntry.writeUInt32LE(6 + 16, 12);             // image data offset

  return Buffer.concat([header, dirEntry, pngBuffer]);
}

async function main() {
  const jobs = [
    { file: 'logo512.png',          size: 512 },
    { file: 'logo192.png',          size: 192 },
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'favicon-32.png',       size:  32 },
    { file: 'favicon-16.png',       size:  16 },
  ];

  for (const { file, size } of jobs) {
    const svg  = buildSVG(size * 2);  // 2x for sharpness, then downscale
    const dest = path.join(publicDir, file);
    await generate(svg, dest, size);
  }

  // favicon.ico: build a real ICO container around a 32x32 PNG
  const ico32Png = await sharp(Buffer.from(buildSVG(64)), { density: 300 })
    .resize(32, 32)
    .png()
    .toBuffer();
  const icoBuffer = buildIco(ico32Png, 32);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log(`Generated favicon.ico (32x32, ${icoBuffer.length} bytes, valid ICO container)`);

  // Also generate an SVG favicon for modern browsers
  const svgContent = buildSVG(32);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  console.log('Generated favicon.svg');

  console.log(`\nAll icons generated successfully using the ${USE_EMOJI ? 'emoji' : 'geometric fallback'} design.`);
}

main().catch(err => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
