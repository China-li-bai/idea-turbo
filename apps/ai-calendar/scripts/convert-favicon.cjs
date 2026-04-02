const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo.png');
const outputPath = path.join(publicDir, 'favicon.ico');

async function convertToFavicon() {
  try {
    // Read the logo
    const logoBuffer = fs.readFileSync(logoPath);
    const logo = sharp(logoBuffer);

    // Get metadata
    const metadata = await logo.metadata();
    console.log(`Original logo: ${metadata.width}x${metadata.height}`);

    // Create different sizes for ICO
    const sizes = [16, 32, 48, 64, 128, 256];
    const pngBuffers = [];

    for (const size of sizes) {
      const pngBuffer = await sharp(logoBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 13, g: 13, b: 13, alpha: 1 } })
        .png()
        .toBuffer();
      pngBuffers.push({ size, buffer: pngBuffer });
      console.log(`Created ${size}x${size} PNG`);
    }

    // Create ICO file (simplified - just use 256x256 PNG as ICO)
    // For a proper multi-resolution ICO, you'd need a proper ICO library
    // But most modern browsers will accept a 256x256 PNG as favicon.ico
    await sharp(logoBuffer)
      .resize(256, 256, { fit: 'contain', background: { r: 13, g: 13, b: 13, alpha: 1 } })
      .png()
      .toFile(outputPath.replace('.ico', '.png'));

    console.log(`Created favicon.png at ${outputPath.replace('.ico', '.png')}`);

    // Also copy to app directory for Next.js
    const appDir = path.join(__dirname, '..', 'app');
    fs.copyFileSync(outputPath.replace('.ico', '.png'), path.join(appDir, 'icon.png'));
    console.log(`Copied to app/icon.png`);

  } catch (error) {
    console.error('Error converting favicon:', error);
    process.exit(1);
  }
}

convertToFavicon();
