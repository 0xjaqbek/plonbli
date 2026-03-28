import sharp from "sharp";

const sizes = [192, 512];

async function generate() {
  for (const size of sizes) {
    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#4a7c59" rx="${size * 0.15}"/>
      <text x="50%" y="55%" font-size="${size * 0.3}" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="bold">P</text>
    </svg>`;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(`public/icons/icon-${size}.png`);
  }
  console.log("Icons generated");
}

generate();
