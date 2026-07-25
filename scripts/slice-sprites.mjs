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

// A leaking chemical drum: green barrel, rust bands, a hazard label, toxic drips.
function drumSvg() {
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="96" viewBox="0 0 72 96" shape-rendering="crispEdges">
  <ellipse cx="36" cy="14" rx="26" ry="8" fill="#3f6a3a"/>
  <rect x="10" y="14" width="52" height="70" fill="#4c7a44"/>
  <ellipse cx="36" cy="84" rx="26" ry="8" fill="#3a5f35"/>
  <rect x="10" y="26" width="52" height="6" fill="#2f4d2c"/>
  <rect x="10" y="66" width="52" height="6" fill="#2f4d2c"/>
  <rect x="12" y="14" width="4" height="70" fill="#6b9a5f" opacity="0.5"/>
  <rect x="24" y="40" width="24" height="20" fill="#e8c33a"/>
  <polygon points="36,42 46,58 26,58" fill="#e8c33a" stroke="#1b1b1b" stroke-width="1.5"/>
  <rect x="35" y="47" width="2" height="6" fill="#1b1b1b"/>
  <rect x="35" y="55" width="2" height="2" fill="#1b1b1b"/>
  <ellipse cx="20" cy="90" rx="4" ry="5" fill="#8fd14a" opacity="0.85"/>
  <ellipse cx="50" cy="92" rx="3" ry="4" fill="#8fd14a" opacity="0.8"/>
</svg>`;
}

// An outflow valve: a rusty steel pipe stub topped with a rusty spoked hand-wheel.
// Palette matches PipeDock's metal (#6d5c46), dark steel (#3f3427) and rust (#8a4a24).
function valveSvg() {
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="72" viewBox="0 0 64 72" shape-rendering="crispEdges">
  <rect x="24" y="40" width="16" height="28" fill="#6d5c46"/>
  <rect x="24" y="40" width="4" height="28" fill="#8a6f52" opacity="0.6"/>
  <rect x="20" y="60" width="24" height="8" fill="#3f3427"/>
  <rect x="20" y="48" width="24" height="4" fill="#8a4a24"/>
  <rect x="28" y="30" width="8" height="14" fill="#5a4d3a"/>
  <circle cx="32" cy="24" r="20" fill="none" stroke="#4a3f2e" stroke-width="6"/>
  <circle cx="32" cy="24" r="20" fill="none" stroke="#8a4a24" stroke-width="2" opacity="0.7"/>
  <g stroke="#5a4d3a" stroke-width="5">
    <line x1="32" y1="6" x2="32" y2="42"/>
    <line x1="14" y1="24" x2="50" y2="24"/>
    <line x1="19" y1="11" x2="45" y2="37"/>
    <line x1="45" y1="11" x2="19" y2="37"/>
  </g>
  <circle cx="32" cy="24" r="5" fill="#8a4a24"/>
</svg>`;
}

// A clump of toxic sludge choking the flow: lumpy dark muck with a few gas bubbles.
function sludgeSvg() {
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="56" viewBox="0 0 80 56" shape-rendering="crispEdges">
  <ellipse cx="40" cy="42" rx="38" ry="13" fill="#3d3a1e"/>
  <ellipse cx="26" cy="30" rx="16" ry="14" fill="#4a4726"/>
  <ellipse cx="48" cy="28" rx="18" ry="16" fill="#514d29"/>
  <ellipse cx="60" cy="36" rx="12" ry="10" fill="#45421f"/>
  <g fill="#6f7a2e"><ellipse cx="30" cy="26" rx="3" ry="3"/><ellipse cx="46" cy="22" rx="4" ry="4"/><ellipse cx="56" cy="32" rx="3" ry="3"/></g>
  <g fill="#9fb04a" opacity="0.8"><circle cx="34" cy="16" r="2"/><circle cx="50" cy="12" r="2.5"/><circle cx="60" cy="20" r="2"/></g>
</svg>`;
}

// ============================================================================
// v4 — SCUBA cleanup helpers + procedural pixel-art environment / UI assets.
// ============================================================================

// Keep only the LARGEST 4-connected opaque blob (the diver); zero every other
// component. Removes neighbour-cell specks, stray bubbles and grid-gutter dots
// that a raw crop pulls in, without touching the sprite itself.
function keepLargest(raw) {
  const { data, width: W, height: H } = raw;
  const lab = new Int32Array(W * H).fill(-1);
  const stack = [];
  let best = -1, bestSize = 0, id = 0;
  for (let s = 0; s < W * H; s++) {
    if (data[s * 4 + 3] <= 16 || lab[s] !== -1) continue;
    let size = 0; stack.length = 0; stack.push(s); lab[s] = id;
    while (stack.length) {
      const p = stack.pop(); size++;
      const x = p % W;
      const push = (q) => { if (data[q * 4 + 3] > 16 && lab[q] === -1) { lab[q] = id; stack.push(q); } };
      if (x > 0) push(p - 1);
      if (x < W - 1) push(p + 1);
      if (p - W >= 0) push(p - W);
      if (p + W < W * H) push(p + W);
    }
    if (size > bestSize) { bestSize = size; best = id; }
    id++;
  }
  for (let p = 0; p < W * H; p++) if (lab[p] !== best) data[p * 4 + 3] = 0;
  return raw;
}

// Extract a scuba frame from the cleaned sheet, drop specks, trim to content.
async function scubaFrame(sheet, [x, y, w, h]) {
  const reg = await sharp(sheet.data, { raw: { width: sheet.width, height: sheet.height, channels: 4 } })
    .extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true });
  const raw = { data: Buffer.from(reg.data), width: reg.info.width, height: reg.info.height };
  keepLargest(raw);
  const bb = bbox(raw.data, raw.width, 0, 0, raw.width, raw.height);
  const t = await sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } })
    .extract(bb).raw().toBuffer({ resolveWithObject: true });
  return { data: t.data, width: t.info.width, height: t.info.height };
}

// ---- tiny pixel-art canvas -------------------------------------------------
const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lighten = (c, t) => mix(c, [255, 255, 255], t);
const darken = (c, t) => mix(c, [0, 0, 0], t);
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function canvas(w, h) { return { w, h, d: Buffer.alloc(w * h * 4) }; }
function px(cv, x, y, c, a = 255) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = (y * cv.w + x) * 4;
  cv.d[i] = clamp8(c[0]); cv.d[i + 1] = clamp8(c[1]); cv.d[i + 2] = clamp8(c[2]);
  cv.d[i + 3] = a < 0 ? 0 : a > 255 ? 255 : a | 0;
}
function rect(cv, x, y, w, h, c, a = 255) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(cv, x + i, y + j, c, a); }
async function savePx(cv, key, scale = 4) {
  await sharp(cv.d, { raw: { width: cv.w, height: cv.h, channels: 4 } })
    .resize(cv.w * scale, cv.h * scale, { kernel: 'nearest' }).png().toFile(join(OUT, `${key}.png`));
  console.log(`  ${key}: ${cv.w * scale}x${cv.h * scale}`);
}
async function saveRaw(cv, key) {
  await sharp(cv.d, { raw: { width: cv.w, height: cv.h, channels: 4 } }).png().toFile(join(OUT, `${key}.png`));
  console.log(`  ${key}: ${cv.w}x${cv.h}`);
}

// ---- ENV DECOR generators --------------------------------------------------
function genKelp(seed, H) {
  const W = 22, cv = canvas(W, H), r = rng(seed);
  const top = [120, 210, 130], bot = [22, 84, 50], cx0 = W / 2;
  for (let y = 0; y < H; y++) {
    const t = y / H, base = mix(bot, top, 1 - t);
    const cx = cx0 + 3 * Math.sin((H - y) * 0.09 + seed * 1.3);
    const half = 2.6 + 1.4 * Math.sin((H - y) * 0.05 + 1);
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const e = Math.abs(x - cx) / (half + 0.001);
      px(cv, x, y, e > 0.72 ? darken(base, 0.28) : e < 0.32 ? lighten(base, 0.2) : base);
    }
    if (y % 9 === 2) {
      const dir = y % 18 === 2 ? 1 : -1, len = 4 + (r() * 4 | 0);
      for (let k = 1; k <= len; k++) px(cv, Math.round(cx) + dir * (2 + k), y - (k * 0.7 | 0), lighten(base, 0.12));
    }
  }
  return cv;
}
function genCoralA(seed) {
  const W = 34, H = 34, cv = canvas(W, H), r = rng(seed), col = [222, 92, 68];
  const branch = (x, y, ang, len, wid) => {
    for (let s = 0; s < len; s++) {
      const nx = x + Math.cos(ang) * s, ny = y + Math.sin(ang) * s;
      for (let w = -wid; w <= wid; w++) {
        const sx = Math.round(nx + Math.cos(ang + Math.PI / 2) * w), sy = Math.round(ny + Math.sin(ang + Math.PI / 2) * w);
        px(cv, sx, sy, w === 0 ? lighten(col, 0.16) : Math.abs(w) >= wid ? darken(col, 0.3) : col);
      }
    }
    if (len > 6) {
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      branch(ex, ey, ang - 0.5 - r() * 0.3, len * 0.64, Math.max(0, wid - 1));
      branch(ex, ey, ang + 0.5 + r() * 0.3, len * 0.6, Math.max(0, wid - 1));
    }
  };
  branch(W / 2, H - 1, -Math.PI / 2, 14, 2);
  return cv;
}
function genCoralB(seed) {
  const W = 32, H = 24, cv = canvas(W, H), col = [212, 118, 152];
  const cx = W / 2, cy = H + 3, rx = W / 2 - 1, ry = H - 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1) {
      let c = col; const g = Math.sin(x * 0.9) + Math.sin((x + y) * 0.7);
      if (g > 0.8) c = darken(col, 0.3); else if (g < -0.8) c = lighten(col, 0.16);
      px(cv, x, y, lighten(c, Math.max(0, 1 - y / H) * 0.12));
    }
  }
  return cv;
}
function genCoralFan(seed) {
  const W = 30, H = 32, cv = canvas(W, H), col = [152, 92, 192], cx = W / 2, cy = H - 1;
  for (let a = -70; a <= 70; a += 9) { const rad = a * Math.PI / 180; for (let s = 0; s < H - 2; s++) px(cv, Math.round(cx + Math.sin(rad) * s), Math.round(cy - Math.cos(rad) * s), s > H * 0.6 ? lighten(col, 0.14) : col); }
  for (let s = 6; s < H - 2; s += 5) for (let a = -70; a <= 70; a += 3) { const rad = a * Math.PI / 180; px(cv, Math.round(cx + Math.sin(rad) * s), Math.round(cy - Math.cos(rad) * s), darken(col, 0.22)); }
  rect(cv, Math.round(cx) - 1, cy - 3, 2, 3, darken(col, 0.35));
  return cv;
}
function genRockDome(seed, W, H, base) {
  const cv = canvas(W, H), r = rng(seed), cx = W / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - cx) / (W / 2 - 1), dy = (y - (H - 1)) / (H - 1);
    const wob = 0.9 + 0.1 * Math.sin(x * 0.5 + seed);
    if (dx * dx + dy * dy <= wob) {
      let c = base; const l = (-dx - dy) * 0.2;
      c = l > 0 ? lighten(base, Math.min(0.28, l)) : darken(base, Math.min(0.3, -l));
      if (r() < 0.05) c = darken(c, 0.22);
      px(cv, x, y, c);
    }
  }
  return cv;
}
function genRockPile() {
  const W = 44, H = 26, cv = canvas(W, H);
  const dome = (ox, oy, rw, rh, base, seed) => { const r = rng(seed); for (let y = 0; y < rh * 1.4; y++) for (let x = -rw; x <= rw; x++) { const dx = x / rw, dy = y / rh; if (dx * dx + dy * dy <= 1) { let c = base; const l = (-dx + dy) * 0.2; c = l > 0 ? lighten(base, l) : darken(base, -l); if (r() < 0.06) c = darken(c, 0.2); px(cv, ox + x, oy - y, c); } } };
  dome(12, H - 1, 11, 12, [120, 116, 108], 1);
  dome(31, H - 1, 12, 14, [132, 122, 110], 2);
  dome(22, H - 6, 9, 9, [108, 102, 94], 3);
  return cv;
}
function genPillar() {
  const W = 18, H = 64, cv = canvas(W, H), stone = [150, 150, 140];
  rect(cv, 3, 6, W - 6, H - 8, stone);
  for (let x = 4; x < W - 4; x += 3) rect(cv, x, 8, 1, H - 12, darken(stone, 0.22));
  rect(cv, 3, 6, 2, H - 8, lighten(stone, 0.15));
  rect(cv, W - 5, 6, 2, H - 8, darken(stone, 0.25));
  rect(cv, 1, 2, W - 2, 5, lighten(stone, 0.08));
  for (let y = 0; y < 9; y++) for (let x = 0; x < W; x++) if (x > W - 2 - y) px(cv, x, y, [0, 0, 0], 0);
  rect(cv, 0, H - 4, W, 4, darken(stone, 0.12));
  const r = rng(7);
  for (let i = 0; i < 42; i++) px(cv, r() * W | 0, 9 + r() * (H - 14) | 0, [72, 112, 72]);
  return cv;
}
function genTire() {
  const W = 30, H = 30, cv = canvas(W, H), blk = [30, 30, 34], cx = W / 2, cy = H / 2, R = W / 2 - 1, rin = R * 0.55;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = (y - cy) * 1.05, d = Math.hypot(dx, dy);
    if (d <= R && d >= rin) {
      let c = blk; const l = (-dx - dy) * 0.02; if (l > 0) c = lighten(blk, Math.min(0.35, l));
      const ang = Math.atan2(dy, dx); if ((Math.round(ang * 8) & 1) === 0 && d > rin + 1 && d < R - 1) c = lighten(c, 0.14);
      px(cv, x, y, c);
    }
  }
  return cv;
}
function genCrate() {
  const W = 28, H = 26, cv = canvas(W, H), wood = [140, 96, 52];
  rect(cv, 1, 1, W - 2, H - 2, wood);
  for (let y = 1; y < H - 1; y += 6) rect(cv, 1, y, W - 2, 1, darken(wood, 0.3));
  rect(cv, 1, 1, W - 2, 2, lighten(wood, 0.12)); rect(cv, 1, H - 3, W - 2, 2, darken(wood, 0.25));
  rect(cv, 1, 1, 2, H - 2, lighten(wood, 0.1)); rect(cv, W - 3, 1, 2, H - 2, darken(wood, 0.2));
  const brace = darken(wood, 0.15);
  for (let i = 2; i < W - 2; i++) { const t = (i - 2) / (W - 4); px(cv, i, Math.round(2 + t * (H - 5)), brace); px(cv, i, Math.round(H - 3 - t * (H - 5)), brace); }
  for (const [cxp, cyp] of [[1, 1], [W - 4, 1], [1, H - 4], [W - 4, H - 4]]) rect(cv, cxp, cyp, 3, 3, [92, 98, 106]);
  return cv;
}
function genDriftwood() {
  const W = 48, H = 16, cv = canvas(W, H), wood = [120, 92, 60], r = rng(3);
  rect(cv, 0, 3, W, H - 6, wood);
  rect(cv, 0, 3, W, 2, lighten(wood, 0.14)); rect(cv, 0, H - 5, W, 2, darken(wood, 0.25));
  for (let i = 0; i < W; i++) if (r() < 0.4) px(cv, i, 4 + r() * (H - 8) | 0, darken(wood, 0.2));
  for (let ring = 0; ring < 3; ring++) for (let y = 3; y < H - 3; y++) px(cv, 1 + ring, y, ring % 2 ? lighten(wood, 0.1) : darken(wood, 0.15));
  rect(cv, W / 2 | 0, 6, 3, 3, darken(wood, 0.3));
  return cv;
}
function genShells() {
  const W = 30, H = 20, cv = canvas(W, H);
  const scallop = (ox, oy, rr, col) => { for (let y = 0; y < rr; y++) for (let x = -rr; x <= rr; x++) if (x * x + (y * 1.4) ** 2 <= rr * rr) { let c = col; if ((Math.round(Math.atan2(y + 0.1, x) * 6) & 1) === 0) c = darken(col, 0.18); if (y < 2) c = lighten(col, 0.16); px(cv, ox + x, oy - y, c); } };
  scallop(9, 17, 7, [230, 200, 170]);
  scallop(21, 18, 8, [220, 178, 190]);
  scallop(15, 12, 5, [240, 220, 192]);
  return cv;
}
function genAnemone(seed) {
  const W = 30, H = 30, cv = canvas(W, H), body = [212, 110, 142], tip = [250, 200, 120], r = rng(seed), cx = W / 2;
  for (let y = H - 10; y < H; y++) for (let x = 0; x < W; x++) { const dx = (x - cx) / (W / 2 - 2), dy = (y - (H - 1)) / 9; if (dx * dx + dy * dy <= 1) px(cv, x, y, darken(body, 0.1)); }
  for (let i = 0; i < 11; i++) {
    const bx = cx - 8 + i * 1.6, len = 10 + (i % 3) * 4 + r() * 4, ph = r() * 6;
    for (let s = 0; s < len; s++) px(cv, Math.round(bx + 2 * Math.sin(s * 0.4 + ph)), H - 9 - s, s > len - 3 ? tip : mix(body, tip, s / len * 0.4));
  }
  return cv;
}
function genLilyPad() {
  const W = 40, H = 26, cv = canvas(W, H), pad = [70, 150, 80], cx = W / 2, cy = H / 2, rx = W / 2 - 1, ry = H / 2 - 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry, d = Math.hypot(dx, dy);
    if (d <= 1) { const ang = Math.atan2(dy, dx); if (Math.abs(ang) < 0.35) continue; let c = mix(pad, lighten(pad, 0.2), Math.max(0, 1 - d) * 0.4); if (d > 0.85) c = darken(pad, 0.2); px(cv, x, y, c); }
  }
  for (let a = 0.5; a < 6.28; a += 0.5) { if (Math.abs(((a + Math.PI) % (2 * Math.PI)) - Math.PI) < 0.35) continue; for (let s = 0; s < rx; s++) px(cv, Math.round(cx + Math.cos(a) * s), Math.round(cy + Math.sin(a) * s * (ry / rx)), darken(pad, 0.12)); }
  return cv;
}
function genBgReeds() {
  const W = 200, H = 60, cv = canvas(W, H), r = rng(11), col = [20, 60, 70];
  for (let i = 0; i < 74; i++) { const x = r() * W | 0, h = 20 + r() * 38, sway = r() * 4 - 2; for (let y = 0; y < h; y++) { const xx = x + Math.round(sway * (y / h)); px(cv, xx, H - 1 - y, col, 70); px(cv, xx + 1, H - 1 - y, col, 48); } }
  return cv;
}
function genBgRidge() {
  const W = 220, H = 60, cv = canvas(W, H), r = rng(5), col = [16, 48, 66];
  let hp = 30; const heights = [];
  for (let x = 0; x < W; x++) { hp += (r() - 0.5) * 3; hp = Math.max(12, Math.min(H - 4, hp)); heights[x] = hp; }
  for (let x = 0; x < W; x++) { const h = heights[x]; for (let y = H - 1; y >= H - h; y--) px(cv, x, y, y < H - h + 2 ? lighten(col, 0.1) : col, 120); }
  return cv;
}
function genLightShaft() {
  const W = 64, H = 220, cv = canvas(W, H), col = [230, 245, 255];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ex = 1 - Math.abs(x - W / 2) / (W / 2), ey = 1 - y / H;
    px(cv, x, y, col, Math.pow(Math.max(0, ex), 1.6) * Math.pow(Math.max(0, ey), 0.8) * 120);
  }
  return cv;
}
function genCaustic() {
  const S = 96, cv = canvas(S, S), col = [180, 240, 255];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S * 2 * Math.PI, v = y / S * 2 * Math.PI;
    const n = (Math.sin(u * 2) + Math.sin(v * 2) + Math.sin(u + v) + Math.sin((u - v) * 3)) / 4;
    px(cv, x, y, col, Math.pow(Math.max(0, n), 3) * 90);
  }
  return cv;
}

// ---- UI generators ---------------------------------------------------------
function genBubbleFull() {
  const S = 24, cv = canvas(S, S), cx = S / 2 - 0.5, cy = S / 2 - 0.5, R = S / 2 - 1, base = [63, 169, 245];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= R) { let c = mix(base, [127, 240, 208], Math.max(0, 1 - d / R) * 0.5); if (d > R - 1.5) c = darken(base, 0.18); px(cv, x, y, c, d > R - 1 ? 235 : 215); } }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = x - (cx - R * 0.35), dy = y - (cy - R * 0.35); if (dx * dx + dy * dy <= (R * 0.28) ** 2) px(cv, x, y, [255, 255, 255], 235); }
  return cv;
}
function genBubbleEmpty() {
  const S = 24, cv = canvas(S, S), cx = S / 2 - 0.5, cy = S / 2 - 0.5, R = S / 2 - 1, col = [127, 240, 208];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= R && d >= R - 1.6) px(cv, x, y, col, 150); }
  px(cv, cx - R * 0.4 | 0, cy - R * 0.4 | 0, [255, 255, 255], 180);
  return cv;
}
function genBubbleCigar() {
  const S = 24, cv = canvas(S, S), cx = S / 2 - 0.5, cy = S / 2 - 0.5, R = S / 2 - 1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= R) { let c = mix([90, 50, 30], [255, 150, 40], Math.max(0, 1 - d / R)); if (d > R - 1.5) c = [120, 70, 30]; px(cv, x, y, c, 224); } }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const d = Math.hypot(x - cx, y - cy); if (d < R * 0.3) px(cv, x, y, mix([255, 220, 120], [255, 120, 30], d / (R * 0.3)), 255); }
  px(cv, cx - R * 0.4 | 0, cy - R * 0.4 | 0, [255, 255, 255], 220);
  return cv;
}
function genPanelCorner() {
  const S = 20, cv = canvas(S, S), brass = [190, 150, 70], rope = [200, 180, 120];
  rect(cv, 1, 1, S - 2, 3, brass); rect(cv, 1, 1, 3, S - 2, brass);
  rect(cv, 1, 1, S - 2, 1, lighten(brass, 0.2)); rect(cv, 1, 1, 1, S - 2, lighten(brass, 0.2));
  rect(cv, 1, 3, S - 2, 1, darken(brass, 0.25)); rect(cv, 3, 1, 1, S - 2, darken(brass, 0.25));
  for (const [x, y] of [[3, 2], [S - 4, 2], [2, S - 4]]) { rect(cv, x - 1, y - 1, 3, 3, [120, 90, 40]); px(cv, x, y, [255, 230, 150]); }
  for (let i = 4; i < S - 4; i++) px(cv, i, i, i % 2 === 0 ? rope : darken(rope, 0.2));
  return cv;
}
function genRibbon() {
  const W = 48, H = 14, cv = canvas(W, H), teal = [18, 70, 84], edge = [190, 150, 70];
  rect(cv, 3, 2, W - 6, H - 4, teal);
  rect(cv, 3, 2, W - 6, 1, lighten(teal, 0.2)); rect(cv, 3, H - 3, W - 6, 1, darken(teal, 0.3));
  rect(cv, 3, 2, 1, H - 4, edge); rect(cv, W - 4, 2, 1, H - 4, edge);
  rect(cv, 0, 2, 3, 3, edge); rect(cv, 0, H - 5, 3, 3, edge);
  rect(cv, W - 3, 2, 3, 3, edge); rect(cv, W - 3, H - 5, 3, 3, edge);
  return cv;
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
  // Standing Vitale: a clean, full-body sprite (its own image) — replaces the
  // cramped sheet crop that was getting clipped in-game.
  const standSheet = await loadCleanSheet('vitale-stand.png');
  await slice(standSheet, 'vitaleScubaStand', [0, 0, standSheet.width, standSheet.height]);
  // Defeated Vitale: limp, X-eyed, floating on his side (its own image).
  const deadSheet = await loadCleanSheet('vitale-dead.png');
  await slice(deadSheet, 'vitaleDead', [0, 0, deadSheet.width, deadSheet.height]);
  // Swim frames: extract, drop neighbour specks, then centre each onto ONE
  // uniform canvas (max bbox across the three) so the animated BillboardSprite
  // never resizes/clips per frame. All face RIGHT — Boss.tsx flips as needed.
  const sc = {
    vitaleScuba1: await scubaFrame(scuba, [290, 40, 250, 98]),
    vitaleScuba2: await scubaFrame(scuba, [290, 150, 250, 110]),
    vitaleScuba3: await scubaFrame(scuba, [530, 72, 266, 150]),
  };
  const scW = Math.max(...Object.values(sc).map((f) => f.width));
  const scH = Math.max(...Object.values(sc).map((f) => f.height));
  for (const [key, f] of Object.entries(sc)) {
    const left = Math.floor((scW - f.width) / 2);
    const top = Math.floor((scH - f.height) / 2);
    await sharp(f.data, { raw: { width: f.width, height: f.height, channels: 4 } })
      .extend({ top, left, bottom: scH - f.height - top, right: scW - f.width - left, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(join(OUT, `${key}.png`));
    console.log(`  ${key}: ${scW}x${scH} (uniform)`);
  }

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
  await genSvg('drum', drumSvg());
  await genSvg('valve', valveSvg());
  await genSvg('sludge', sludgeSvg());

  console.log('ENV DECOR (v4 — procedural pixel art):');
  await savePx(genKelp(31, 84), 'kelpA', 4);
  await savePx(genKelp(72, 70), 'kelpB', 4);
  await savePx(genKelp(113, 96), 'kelpC', 4);
  await savePx(genCoralA(5), 'coralA', 4);
  await savePx(genCoralB(9), 'coralB', 4);
  await savePx(genCoralFan(3), 'coralFan', 4);
  await savePx(genRockDome(21, 30, 26, [124, 120, 112]), 'rockBig', 4);
  await savePx(genRockDome(44, 40, 16, [138, 128, 112]), 'rockFlat', 4);
  await savePx(genRockPile(), 'rockPile', 4);
  await savePx(genPillar(), 'sunkenPillar', 4);
  await savePx(genTire(), 'sunkenTire', 4);
  await savePx(genCrate(), 'sunkenCrate', 4);
  await savePx(genDriftwood(), 'driftwood', 4);
  await savePx(genShells(), 'shellCluster', 4);
  await savePx(genAnemone(7), 'anemone', 4);
  await savePx(genLilyPad(), 'lilyPadBig', 4);
  await savePx(genBgReeds(), 'bgReeds', 3);
  await savePx(genBgRidge(), 'bgRidge', 3);
  await saveRaw(genLightShaft(), 'lightShaftSoft');
  await saveRaw(genCaustic(), 'causticTile');

  console.log('UI ASSETS (v4 — bubbles / brass / ribbon):');
  await savePx(genBubbleFull(), 'bubbleFull', 3);
  await savePx(genBubbleEmpty(), 'bubbleEmpty', 3);
  await savePx(genBubbleCigar(), 'bubbleCigar', 3);
  await savePx(genPanelCorner(), 'panelCorner', 3);
  await savePx(genRibbon(), 'ribbon', 3);

  console.log('DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
