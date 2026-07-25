// Sprite pipeline v2 — slices the four source art sheets into the exact keys of
// the SPRITE KEY CONTRACT (see src/sprites.ts) as transparent, pixel-crisp PNGs.
//
// Background removal uses a BORDER FLOOD FILL over near-white / light-grey pixels
// (the paper background + the dashed grid gutters). Flooding from the image edge
// removes the background and grid lines while PRESERVING enclosed light pixels
// inside a sprite (white koi bellies, silver angelfish, panda cory) — a plain
// colour key would eat those. No resampling anywhere (kernel:'nearest').
//
// Reginald's swim/idle/honk frames are padded onto a COMMON, UNIFORM canvas so
// swapping animation frames never resizes, shifts, or clips his body/tail/face.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets/sprites');
const OUT = join(root, 'public/sprites');

// ---- background removal ------------------------------------------------------
// A pixel is "background-ish" if it is near-white or a low-saturation light grey
// (the bluish dashed grid). Fish outlines/hats are dark; fish bodies saturated.
function isLight(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  const white = r > 230 && g > 230 && b > 230;
  const grey = sat < 32 && max > 172;
  return white || grey;
}

// Remove only background-ish pixels CONNECTED to the image border (4-neighbour
// flood). Interior light pixels enclosed by a darker outline are kept.
function floodDeBackground(data, W, H) {
  const visited = new Uint8Array(W * H);
  const stack = [];
  const consider = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (visited[p]) return;
    const i = p * 4;
    if (!isLight(data[i], data[i + 1], data[i + 2])) return;
    visited[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < W; x++) { consider(x, 0); consider(x, H - 1); }
  for (let y = 0; y < H; y++) { consider(0, y); consider(W - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    const y = (p - x) / W;
    consider(x + 1, y); consider(x - 1, y); consider(x, y + 1); consider(x, y - 1);
  }
  for (let p = 0; p < W * H; p++) if (visited[p]) data[p * 4 + 3] = 0;
  return data;
}

// Tight bounding box of non-transparent pixels within a sub-region.
function bbox(data, W, x, y, w, h) {
  let mnx = w, mny = h, mxx = -1, mxy = -1;
  for (let ry = 0; ry < h; ry++) {
    for (let rx = 0; rx < w; rx++) {
      if (data[((y + ry) * W + (x + rx)) * 4 + 3] > 16) {
        if (rx < mnx) mnx = rx; if (rx > mxx) mxx = rx;
        if (ry < mny) mny = ry; if (ry > mxy) mxy = ry;
      }
    }
  }
  if (mxx < 0) return null;
  return { left: x + mnx, top: y + mny, width: mxx - mnx + 1, height: mxy - mny + 1 };
}

async function loadCleanSheet(file) {
  const { data, info } = await sharp(join(SRC, file))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const clean = floodDeBackground(Buffer.from(data), info.width, info.height);
  return { data: clean, width: info.width, height: info.height };
}

// Extract + trim one frame from a cleaned sheet. Returns a { info, data } raw
// RGBA object (sharp region), optionally horizontally mirrored to face LEFT.
async function frame(sheet, [x, y, w, h], flop = false) {
  const { data, width: W, height: H } = sheet;
  x = Math.max(0, x); y = Math.max(0, y);
  w = Math.min(w, W - x); h = Math.min(h, H - y);
  const bb = bbox(data, W, x, y, w, h);
  if (!bb) throw new Error(`empty region [${x},${y},${w},${h}]`);
  let img = sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract(bb);
  if (flop) img = img.flop();
  const out = await img.raw().toBuffer({ resolveWithObject: true });
  return { data: out.data, width: out.info.width, height: out.info.height };
}

async function writeRaw(rawObj, key) {
  await sharp(rawObj.data, { raw: { width: rawObj.width, height: rawObj.height, channels: 4 } })
    .png().toFile(join(OUT, `${key}.png`));
  console.log(`  ${key}: ${rawObj.width}x${rawObj.height}`);
}

// Slice a region straight to a PNG.
async function slice(sheet, key, region, flop = false) {
  await writeRaw(await frame(sheet, region, flop), key);
}

// ---- boss man silhouette (constructed) --------------------------------------
// The boss reference photo merges the fedora MAN with black city-skyline shapes,
// so a clean crop is impossible; per the contract we construct a menacing
// fedora-figure silhouette instead. bossDonFish IS extractable and is sliced.
function fedoraManSvg() {
  const fill = '#0e1420';
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640">
  <g fill="${fill}">
    <ellipse cx="180" cy="122" rx="134" ry="24"/>
    <path d="M120,124 Q114,44 180,40 Q246,44 240,124 Z"/>
    <ellipse cx="180" cy="168" rx="50" ry="46"/>
    <rect x="160" y="204" width="40" height="30"/>
    <path d="M126,226 Q180,208 234,226 L268,286 L260,486 L100,486 L92,286 Z"/>
    <path d="M104,258 L52,340 L28,378 L52,392 L86,338 L128,282 Z"/>
    <path d="M256,262 L300,300 L286,372 L258,356 L242,300 Z"/>
    <path d="M286,352 L266,404 L236,388 L252,344 Z"/>
    <path d="M118,486 L112,600 L166,600 L174,494 Z"/>
    <path d="M186,494 L194,600 L248,600 L242,486 Z"/>
    <ellipse cx="126" cy="606" rx="46" ry="16"/>
    <ellipse cx="222" cy="606" rx="46" ry="16"/>
  </g>
</svg>`;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const catfish = await loadCleanSheet('catfish-spritesheet.webp');
  const citizens = await loadCleanSheet('citizens-sheet.webp');
  const henchmen = await loadCleanSheet('henchmen-sheet.webp');

  console.log('REGINALD (uniform canvas):');
  // Swim/idle are side views facing RIGHT on the sheet -> flop to face LEFT.
  // Honk is a front-facing head (orientation-neutral).
  const reg = {
    reginaldSwim1: await frame(catfish, [42, 765, 540, 260], true),
    reginaldSwim2: await frame(catfish, [660, 765, 495, 260], true),
    reginaldSwim3: await frame(catfish, [1235, 765, 540, 260], true),
    reginaldIdle: await frame(catfish, [55, 1091, 430, 215], true),
    reginaldHonk: await frame(catfish, [85, 1350, 350, 300]),
  };
  // Common canvas = max bbox across the set; every frame is centred into it so
  // frame swaps keep identical plane dimensions (fixes the tail/face clipping).
  const canW = Math.max(...Object.values(reg).map((f) => f.width));
  const canH = Math.max(...Object.values(reg).map((f) => f.height));
  for (const [key, f] of Object.entries(reg)) {
    const left = Math.floor((canW - f.width) / 2);
    const top = Math.floor((canH - f.height) / 2);
    await sharp(f.data, { raw: { width: f.width, height: f.height, channels: 4 } })
      .extend({
        top, left, bottom: canH - f.height - top, right: canW - f.width - left,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png().toFile(join(OUT, `${key}.png`));
    console.log(`  ${key}: ${canW}x${canH}`);
  }

  console.log('REGINALD extras + faces:');
  await slice(catfish, 'reginaldDead', [604, 1670, 715, 255]);
  await slice(catfish, 'topHat', [560, 415, 250, 140]);
  await slice(catfish, 'faceAngry', [40, 410, 435, 290]);
  await slice(catfish, 'faceNeutral', [470, 410, 430, 290]);
  await slice(catfish, 'faceContent', [895, 410, 430, 290]);
  await slice(catfish, 'faceWink', [1325, 410, 445, 290]);

  console.log('CITIZENS:');
  await slice(citizens, 'citizenGuppy', [210, 385, 320, 225]);
  await slice(citizens, 'citizenTetra', [1240, 665, 345, 255]);
  await slice(citizens, 'citizenCory', [45, 985, 370, 185]);
  await slice(citizens, 'citizenGourami', [440, 1255, 515, 215]);
  await slice(citizens, 'citizenPuffer', [1210, 1215, 290, 265]);
  await slice(citizens, 'citizenAngel', [360, 1491, 290, 246]);
  await slice(citizens, 'citizenDiscus', [30, 47, 300, 290]);
  await slice(citizens, 'citizenRasbora', [385, 1485, 385, 255]);

  console.log('HENCHMEN:');
  await slice(henchmen, 'henchGoldfish', [1215, 371, 360, 255]);
  await slice(henchmen, 'henchKoi', [435, 371, 360, 255]);
  await slice(henchmen, 'henchClownfish', [1135, 675, 445, 250]);
  await slice(henchmen, 'henchBetta', [826, 974, 355, 220]);
  await slice(henchmen, 'henchPuffer', [640, 1211, 410, 255]);
  await slice(henchmen, 'henchAngel', [360, 1491, 280, 240]);

  console.log('DECOR:');
  await slice(citizens, 'seaweedTall', [1235, 55, 120, 275]);
  await slice(catfish, 'seaweedShort', [1615, 1655, 135, 275]);
  await slice(henchmen, 'rockBrown', [1450, 40, 150, 300]);
  await slice(citizens, 'rockGrey', [30, 669, 125, 250]);
  await slice(henchmen, 'lilyPad', [1240, 1491, 125, 240]);
  await slice(citizens, 'coral', [1415, 1491, 180, 250]);
  await slice(henchmen, 'bubbleCluster', [1465, 1491, 85, 240]);

  console.log('BOSS:');
  // Fish: clean grey gradient behind it -> drop mid-grey, keep dark+bright ink.
  {
    const { data, info } = await sharp(join(SRC, 'boss-reference.png'))
      .extract({ left: 8, top: 1035, width: 250, height: 198 })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = info;
    for (let p = 0; p < W * H; p++) {
      const i = p * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum >= 95 && lum <= 175) data[i + 3] = 0;
    }
    const bb = bbox(data, W, 0, 0, W, H);
    await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .extract(bb).png().toFile(join(OUT, 'bossDonFish.png'));
    console.log(`  bossDonFish: ${bb.width}x${bb.height}`);
  }
  // Man: constructed silhouette (reference is fouled by the city skyline).
  await sharp(Buffer.from(fedoraManSvg())).png().toFile(join(OUT, 'bossDonMan.png'));
  console.log('  bossDonMan: 360x640 (constructed)');

  console.log('DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
