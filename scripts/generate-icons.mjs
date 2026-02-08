import sharp from 'sharp'
import { writeFileSync } from 'fs'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0f0f0f"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e63946"/>
      <stop offset="100%" stop-color="#ff6b6b"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- Dumbbell icon scaled up and centered -->
  <g transform="translate(256,256) scale(5.5) translate(-24,-24)">
    <rect x="4" y="18" width="6" height="12" rx="2" fill="url(#accent)"/>
    <rect x="10" y="14" width="5" height="20" rx="2" fill="url(#accent)"/>
    <rect x="33" y="14" width="5" height="20" rx="2" fill="url(#accent)"/>
    <rect x="38" y="18" width="6" height="12" rx="2" fill="url(#accent)"/>
    <rect x="15" y="21" width="18" height="6" rx="1" fill="url(#accent)"/>
  </g>
</svg>`

const sizes = [192, 512]

for (const size of sizes) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  writeFileSync(`public/icon-${size}.png`, buf)
  console.log(`Created public/icon-${size}.png (${size}x${size})`)
}
