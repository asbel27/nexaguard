const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SVG_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1236"/>
      <stop offset="100%" stop-color="#030617"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff"/>
      <stop offset="50%" stop-color="#1877f2"/>
      <stop offset="100%" stop-color="#e1306c"/>
    </linearGradient>
    <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff"/>
      <stop offset="100%" stop-color="#3de8a4"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#15214f"/>
      <stop offset="100%" stop-color="#0c1438"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect x="8" y="8" width="240" height="240" rx="54" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="7"/>

  <!-- Post Card Base -->
  <rect x="42" y="58" width="140" height="130" rx="18" fill="url(#cardGrad)" stroke="#1e2c69" stroke-width="3"/>
  
  <!-- Post Header Avatar & Title Lines -->
  <circle cx="68" cy="85" r="14" fill="#00f0ff"/>
  <rect x="92" y="76" width="70" height="8" rx="4" fill="#ffffff"/>
  <rect x="92" y="90" width="46" height="6" rx="3" fill="#6274a8"/>

  <!-- Post Content Lines -->
  <rect x="58" y="118" width="108" height="7" rx="3.5" fill="#a0b3e5"/>
  <rect x="58" y="133" width="94" height="7" rx="3.5" fill="#a0b3e5"/>
  <rect x="58" y="148" width="60" height="7" rx="3.5" fill="#00f0ff"/>

  <!-- Social Icons Bubbles (Facebook Blue, Instagram Gradient, Green Verified) -->
  <circle cx="58" cy="168" r="7" fill="#1877f2"/>
  <circle cx="78" cy="168" r="7" fill="#e1306c"/>
  <circle cx="98" cy="168" r="7" fill="#3de8a4"/>

  <!-- Dynamic Flying Paper-Plane / Rocket (Symbol of Posting & Launching) -->
  <g filter="url(#glow)">
    <!-- Trail lines -->
    <path d="M100 190 Q 140 170 170 135" stroke="#00f0ff" stroke-width="4" stroke-dasharray="6,4" fill="none" opacity="0.8"/>
    <path d="M110 205 Q 150 185 180 150" stroke="#3de8a4" stroke-width="3" stroke-dasharray="5,3" fill="none" opacity="0.7"/>

    <!-- Paper Plane -->
    <polygon points="214,46 118,124 162,138 214,46" fill="url(#planeGrad)"/>
    <polygon points="214,46 162,138 184,98 214,46" fill="#ffffff" opacity="0.9"/>
    <polygon points="162,138 168,172 182,148 162,138" fill="#00b4cc"/>
  </g>

  <!-- NexaGuard Small Shield Emblem in Bottom Right -->
  <path d="M205 178 L222 184 V198 C222 208 215 215 205 218 C195 215 188 208 188 198 V184 Z" fill="#0b1740" stroke="#00f0ff" stroke-width="2.5"/>
  <path d="M197 198 L203 204 L214 192" stroke="#3de8a4" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

function buildIco(images) {
  // images: array of { width, height, buffer }
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  const imageBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset

    dirEntries.push(entry);
    imageBuffers.push(img.buffer);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

async function main() {
  console.log('Generando icono de alta resolución para NexaGuard Social AutoPoster...');
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await browser.newPage();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; background: transparent; }
          body { display: flex; align-items: center; justify-content: center; }
        </style>
      </head>
      <body>
        ${SVG_ICON}
      </body>
    </html>
  `;

  await page.setContent(html);

  const sizes = [256, 128, 64, 48, 32, 16];
  const images = [];

  for (const s of sizes) {
    await page.setViewport({ width: s, height: s, deviceScaleFactor: 1 });
    const buffer = await page.screenshot({
      type: 'png',
      omitBackground: true,
      clip: { x: 0, y: 0, width: s, height: s }
    });
    images.push({ width: s, height: s, buffer });
  }

  await browser.close();

  const icoBuffer = buildIco(images);
  const outPath = path.join(__dirname, 'app_icon.ico');
  fs.writeFileSync(outPath, icoBuffer);

  // También guardar PNG de alta resolución para accesos directos
  fs.writeFileSync(path.join(__dirname, 'app_icon.png'), images[0].buffer);

  console.log(`✓ Icono multi-resolución generado con éxito en: ${outPath} (${icoBuffer.length} bytes)`);
}

main().catch(console.error);
