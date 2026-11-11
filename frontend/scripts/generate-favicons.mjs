import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const publicDirectory = new URL("../public/", import.meta.url);
const source = await readFile(new URL("favicon.svg", publicDirectory));

async function renderIcon(size, { background, artworkScale = 1 } = {}) {
  const artworkSize = Math.round(size * artworkScale);
  const artwork = await sharp(source, { density: 384 })
    .resize(artworkSize, artworkSize)
    .png()
    .toBuffer();

  if (!background) {
    return artwork;
  }

  const offset = Math.floor((size - artworkSize) / 2);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: artwork, left: offset, top: offset }])
    .png()
    .toBuffer();
}

// ICO stores a directory followed by one PNG image for each supported size.
async function renderIco(sizes) {
  const images = await Promise.all(sizes.map((size) => renderIcon(size)));
  const directory = Buffer.alloc(6 + sizes.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(sizes.length, 4);
  let imageOffset = directory.length;

  sizes.forEach((size, index) => {
    const entryOffset = 6 + index * 16;
    directory.writeUInt8(size === 256 ? 0 : size, entryOffset);
    directory.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    directory.writeUInt16LE(1, entryOffset + 4);
    directory.writeUInt16LE(32, entryOffset + 6);
    directory.writeUInt32LE(images[index].length, entryOffset + 8);
    directory.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += images[index].length;
  });

  return Buffer.concat([directory, ...images]);
}

const pngIcons = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "favicon-48x48.png", size: 48 },
  {
    name: "apple-touch-icon.png",
    size: 180,
    background: "#ffffff",
    artworkScale: 0.9,
  },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
  {
    name: "maskable-icon-512x512.png",
    size: 512,
    background: "#ffffff",
    // Keep the complete briefcase inside the central 80%-diameter safe circle.
    artworkScale: 0.72,
  },
];

for (const { name, size, ...options } of pngIcons) {
  await writeFile(new URL(name, publicDirectory), await renderIcon(size, options));
  console.log(`Generated ${name} (${size}x${size})`);
}

const icoSizes = [16, 32, 48, 64, 128, 256];
await writeFile(new URL("favicon.ico", publicDirectory), await renderIco(icoSizes));
console.log(`Generated favicon.ico (${icoSizes.join(", ")} px)`);
