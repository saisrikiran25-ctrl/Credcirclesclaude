// Generates the PWA icons from one SVG: the "Circle" mark (members around a ring, a coin at the centre).
import sharp from "sharp";
import fs from "node:fs";

const dots = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
  return { x: 256 + 138 * Math.cos(a), y: 256 + 138 * Math.sin(a), accent: i === 0 };
});
const mark = (pad) => `
  <circle cx="256" cy="256" r="138" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="12"/>
  ${dots.map((d) => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.accent ? 40 : 32}" fill="${d.accent ? "#F2A516" : "#ffffff"}"/>`).join("\n  ")}
  <circle cx="256" cy="256" r="56" fill="#F2A516"/>
  <circle cx="256" cy="256" r="30" fill="none" stroke="#23307A" stroke-width="10"/>`;

const svg = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="#23307A"/>
  <g transform="${maskable ? "translate(256 256) scale(0.78) translate(-256 -256)" : ""}">${mark()}</g>
</svg>`;

fs.writeFileSync("public/icon.svg", svg(false));
fs.writeFileSync("app/icon.svg", svg(false));
for (const size of [192, 512]) {
  await sharp(Buffer.from(svg(false))).resize(size, size).png().toFile(`public/icon-${size}.png`);
}
await sharp(Buffer.from(svg(true))).resize(512, 512).png().toFile("public/icon-maskable-512.png");
await sharp(Buffer.from(svg(true))).resize(180, 180).png().toFile("public/apple-touch-icon.png");
console.log("icons written");
