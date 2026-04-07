import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 이미지에서 추출한 색상
const BG = '#003D2A';
const TEXT = '#AAFF44';

async function generateIcon(size) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });

  const fontSize = Math.round(size * 0.30);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${size}px;
    height: ${size}px;
    background: ${BG};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .text {
    color: ${TEXT};
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: ${fontSize}px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
    user-select: none;
  }
</style>
</head>
<body>
  <span class="text">GREF</span>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const screenshot = await page.screenshot({ type: 'png' });
  await browser.close();
  return screenshot;
}

async function main() {
  const publicDir = join(__dirname, '../public');

  console.log('Generating 512x512...');
  const buf512 = await generateIcon(512);
  writeFileSync(join(publicDir, 'icons/icon-512.png'), buf512);
  console.log('  → public/icons/icon-512.png');

  console.log('Generating 192x192...');
  const buf192 = await generateIcon(192);
  writeFileSync(join(publicDir, 'icons/icon-192.png'), buf192);
  console.log('  → public/icons/icon-192.png');

  console.log('Generating favicon (48x48 as PNG)...');
  const bufFav = await generateIcon(48);
  writeFileSync(join(publicDir, 'favicon.png'), bufFav);
  console.log('  → public/favicon.png');

  console.log('Done.');
}

main().catch(console.error);
