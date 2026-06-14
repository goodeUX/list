const path = require('path');
const sharp = require('sharp');

const SIZE = 1024;
const SCALE = 0.7;
const SOURCE = path.join(__dirname, '../assets/images/icon.png');
const FOREGROUND_OUT = path.join(__dirname, '../assets/images/android-icon-foreground.png');
const MONOCHROME_OUT = path.join(__dirname, '../assets/images/android-icon-monochrome.png');
const BACKGROUND_OUT = path.join(__dirname, '../assets/images/android-icon-background.png');

const BACKGROUND_COLOR = '#EDE4D4';

async function generateAndroidIcons() {
  const scaledSize = Math.round(SIZE * SCALE);
  const resized = await sharp(SOURCE)
    .resize(scaledSize, scaledSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(FOREGROUND_OUT);

  await sharp(FOREGROUND_OUT).grayscale().png().toFile(MONOCHROME_OUT);

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 3,
      background: BACKGROUND_COLOR,
    },
  })
    .png()
    .toFile(BACKGROUND_OUT);

  console.log(`Generated padded foreground at ${Math.round(SCALE * 100)}% scale (${scaledSize}px).`);
}

generateAndroidIcons().catch((error) => {
  console.error(error);
  process.exit(1);
});
