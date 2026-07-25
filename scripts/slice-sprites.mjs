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

// Rasterise an SVG to a crisp (shape-rendering:crispEdges) PNG sprite.
async function genSvg(key, svg) {
  await sharp(Buffer.from(svg)).png().toFile(join(OUT, `${key}.png`));
  console.log(`  ${key}: generated`);
}

// A small standalone lit cigar: brown stub + wrap band + bright ember + smoke.
function cigarSvg() {
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="46" height="30" viewBox="0 0 46 30" shape-rendering="crispEdges">
  <g opacity="0.7" fill="#e8eef2">
    <rect x="6" y="2" width="3" height="3"/>
    <rect x="11" y="6" width="3" height="3"/>
    <rect x="9" y="9" width="2" height="2"/>
  </g>
  <rect x="14" y="14" width="24" height="8" fill="#6b4a2b"/>
  <rect x="14" y="14" width="24" height="2" fill="#835c36"/>
  <rect x="14" y="20" width="24" height="2" fill="#523721"/>
  <rect x="32" y="14" width="6" height="8" fill="#8a6236"/>
  <rect x="8" y="14" width="6" height="8" fill="#ff7a1a"/>
  <rect x="8" y="16" width="4" height="4" fill="#ffd24a"/>
</svg>`;
}

// A poacher's net: knotted diagonal cross-hatch mesh on transparent.
function netSvg() {
  const S = 112, step = 16, rope = '#d8cfa8', knot = '#a8986a';
  let lines = '';
  for (let d = -S; d <= S; d += step) {
    lines += `<line x1="${d}" y1="0" x2="${d + S}" y2="${S}" stroke="${rope}" stroke-width="2"/>`;
    lines += `<line x1="${d + S}" y1="0" x2="${d}" y2="${S}" stroke="${rope}" stroke-width="2"/>`;
  }
  let knots = '';
  for (let y = 0; y <= S; y += step) for (let x = 0; x <= S; x += step)
    knots += `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" fill="${knot}"/>`;
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">
  <clipPath id="c"><rect x="0" y="0" width="${S}" height="${S}"/></clipPath>
  <g clip-path="url(#c)">${lines}${knots}</g>
</svg>`;
}

// A nursery: a shallow twig-nest ring cradling a cluster of pale eggs.
function nurserySvg() {
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="112" height="80" viewBox="0 0 112 80" shape-rendering="crispEdges">
  <ellipse cx="56" cy="52" rx="52" ry="24" fill="#7a5a34"/>
  <ellipse cx="56" cy="50" rx="44" ry="18" fill="#5f4526"/>
  <g fill="#8a6a3e">
    <rect x="6" y="46" width="20" height="4"/><rect x="86" y="46" width="20" height="4"/>
    <rect x="14" y="58" width="24" height="4"/><rect x="74" y="58" width="24" height="4"/>
    <rect x="40" y="66" width="32" height="4"/>
  </g>
  <g fill="#eef0d8" stroke="#c7c9a8" stroke-width="1">
    <ellipse cx="42" cy="46" rx="9" ry="11"/><ellipse cx="60" cy="44" rx="9" ry="11"/>
    <ellipse cx="52" cy="54" rx="9" ry="11"/><ellipse cx="70" cy="52" rx="9" ry="11"/>
  </g>
  <g fill="#b9c48a"><rect x="40" y="42" width="3" height="3"/><rect x="58" y="40" width="3" height="3"/><rect x="50" y="50" width="3" height="3"/><rect x="68" y="48" width="3" height="3"/></g>
</svg>`;
}

// A tiny baby fish (fry).
function frySvg() {
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="18" viewBox="0 0 28 18" shape-rendering="crispEdges">
  <path d="M22,9 L28,3 L28,15 Z" fill="#6fb8d8"/>
  <ellipse cx="12" cy="9" rx="11" ry="6" fill="#9fd0e8"/>
  <ellipse cx="12" cy="9" rx="11" ry="6" fill="none" stroke="#5a97b5" stroke-width="1"/>
  <rect x="5" y="6" width="3" height="3" fill="#173040"/>
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

  console.log('VITALE (v3 — persona + scuba diver):');
  // Persona: the fedora/pinstripe mafia bust portrait (used when Vitale speaks).
  const persona = await loadCleanSheet('vitale-persona.png');
  await slice(persona, 'vitalePersona', [0, 0, persona.width, persona.height]);
  // Scuba sheet: standing figure + three swim frames (all face RIGHT — a
  // consistent direction; Boss.tsx flips as needed). Regions tuned to exclude
  // the sheet's $ / rock / bubble decorations.
  const scuba = await loadCleanSheet('vitale-sheet.png');
  await slice(scuba, 'vitaleScubaStand', [78, 22, 112, 232]);
  await slice(scuba, 'vitaleScuba1', [290, 40, 250, 98]);
  await slice(scuba, 'vitaleScuba2', [290, 150, 250, 110]);
  await slice(scuba, 'vitaleScuba3', [530, 72, 266, 150]);

  console.log('REGINALD (v3 — hatless + cigar):');
  // reginaldNoHat: erase the dark-grey top hat (top-left of the LEFT-facing
  // idle frame) while keeping the green head/body/tail. Only grey/dark pixels
  // inside the hat box are cleared; green head pixels are preserved.
  {
    const { data, info } = await sharp(join(OUT, 'reginaldIdle.png'))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, d = Buffer.from(data);
    const bx = 80, by = 34, bw = 118, bh = 92;
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] < 16) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const green = g > r + 8 && g > b + 8;
      if (sat < 48 && !green) d[i + 3] = 0;
    }
    await sharp(d, { raw: { width: W, height: H, channels: 4 } })
      .png().toFile(join(OUT, 'reginaldNoHat.png'));
    console.log(`  reginaldNoHat: ${W}x${H}`);
    // reginaldCigar: composite the lit cigar at his mouth (far-left snout).
    const cig = await sharp(Buffer.from(cigarSvg())).png().toBuffer();
    await sharp(d, { raw: { width: W, height: H, channels: 4 } })
      .composite([{ input: cig, left: 8, top: 168 }])
      .png().toFile(join(OUT, 'reginaldCigar.png'));
    console.log(`  reginaldCigar: ${W}x${H}`);
  }

  console.log('GENERATED (v3 — cigar / net / nursery / fry):');
  await genSvg('cigar', cigarSvg());
  await genSvg('net', netSvg());
  await genSvg('nursery', nurserySvg());
  await genSvg('fry', frySvg());

  console.log('DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
