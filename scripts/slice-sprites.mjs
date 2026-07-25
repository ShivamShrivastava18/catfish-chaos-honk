// Slice catfish-spritesheet.webp into individual transparent PNG frames.
// Approach: color-key the near-white background (and light grey dashed grid
// lines) to transparent, then extract best-estimate pixel regions and .trim().
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets/sprites/catfish-spritesheet.webp');
const OUT = join(root, 'public/sprites');

// Regions are [x, y, w, h] on the 1808x1946 sheet, derived from a content
// projection of the de-backgrounded sheet. Each pads into surrounding white
// space; .trim() tightens to the sprite. `flop` mirrors side views to face LEFT.
const FRAMES = {
  reginaldSwim1: { region: [150, 748, 430, 288], flop: true },
  reginaldSwim2: { region: [652, 748, 515, 288], flop: true },
  reginaldSwim3: { region: [1228, 748, 432, 288], flop: true },
  reginaldFront: { region: [44, 406, 418, 304] },
  reginaldHonk: { region: [1350, 406, 432, 304] },
  reginaldDead: { region: [590, 1660, 570, 260] },
  rock: { region: [60, 1655, 175, 210] },
  cattail: { region: [1590, 1540, 218, 406] },
  topHat: { region: [1178, 1540, 210, 210] },
};

// Color-key: transparent for pure white background and light grey dashed lines,
// while keeping the saturated green fish and the dark charcoal top hat opaque.
function deBackground(rgba) {
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max - min;
    const nearWhite = r > 238 && g > 238 && b > 238;
    // Dashed grid lines are a bluish light grey (b >= r); the catfish belly is a
    // pinkish lavender (r >= b), so keying on b >= r spares the fish.
    const lightGrey = sat < 22 && max > 165 && b >= r;
    if (nearWhite || lightGrey) rgba[i + 3] = 0;
  }
  return rgba;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const clean = deBackground(Buffer.from(data));
  const sheet = { raw: { width, height, channels: 4 } };

  // Full de-backgrounded sheet as a robustness fallback asset.
  await sharp(clean, sheet).png().toFile(join(OUT, 'fullSheet.png'));

  const produced = [];
  for (const [key, { region, flop }] of Object.entries(FRAMES)) {
    let [x, y, w, h] = region;
    x = Math.max(0, x); y = Math.max(0, y);
    w = Math.min(w, width - x); h = Math.min(h, height - y);

    // Deterministic trim: find the bbox of non-transparent pixels in the region.
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let ry = 0; ry < h; ry++) {
      for (let rx = 0; rx < w; rx++) {
        const a = clean[(((y + ry) * width) + (x + rx)) * 4 + 3];
        if (a > 8) {
          if (rx < minX) minX = rx; if (rx > maxX) maxX = rx;
          if (ry < minY) minY = ry; if (ry > maxY) maxY = ry;
        }
      }
    }
    if (maxX < 0) { console.warn(`${key}: EMPTY region, skipping trim`); minX = 0; minY = 0; maxX = w - 1; maxY = h - 1; }

    let img = sharp(clean, sheet).extract({
      left: x + minX, top: y + minY, width: maxX - minX + 1, height: maxY - minY + 1,
    });
    if (flop) img = img.flop(); // mirror side views to face LEFT; no resampling
    await img.png().toFile(join(OUT, `${key}.png`));
    produced.push(key);
    const meta = await sharp(join(OUT, `${key}.png`)).metadata();
    console.log(`${key}: ${meta.width}x${meta.height}`);
  }
  produced.push('fullSheet');
  console.log('DONE', produced.join(', '));
}

main().catch((e) => { console.error(e); process.exit(1); });
