const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo.png');
const appDir = path.join(__dirname);

async function createFaviconIco() {
  try {
    // Read the logo
    const logoBuffer = fs.readFileSync(logoPath);
    console.log('Processing logo.png...');

    // Create 32x32 favicon
    const faviconBuffer = await sharp(logoBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 13, g: 13, b: 13, alpha: 1 }
      })
      .png()
      .toBuffer();

    // Save as favicon.ico (Next.js App Router expects this in app/ directory)
    fs.writeFileSync(path.join(appDir, 'favicon.ico'), faviconBuffer);
    console.log('Created app/favicon.ico');

    // Also create apple-touch-icon for iOS
    const appleBuffer = await sharp(logoBuffer)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 13, g: 13, b: 13, alpha: 1 }
      })
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(appDir, 'apple-touch-icon.png'), appleBuffer);
    console.log('Created app/apple-touch-icon.png');

    // Save 192x192 and 512x512 for PWA manifest
    const icon192 = await sharp(logoBuffer)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 13, g: 13, b: 13, alpha: 1 }
      })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
    console.log('Created public/icon-192.png');

    const icon512 = await sharp(logoBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 13, g: 13, b: 13, alpha: 1 }
      })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
    console.log('Created public/icon-512.png');

    console.log('All icons created successfully!');
  } catch (error) {
    console.error('Error creating icons:', error);
    process.exit(1);
  }
}

createFaviconIco();
