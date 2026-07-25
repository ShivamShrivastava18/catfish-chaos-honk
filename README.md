# Catfish Chaos: HONK!

You are Sir Reginald, a top-hatted gentleman catfish. A riverside town has been dumping
filth into your river, and rather than sulk about it you retaliate — with a tidy checklist
of dignified petty crimes. Return the toxic barrels to the boss's lawn. Yank the outflow
pipe loose. Capsize the poacher's boat. Every crime you pull off happens to clean the water
a little more, so by the time the list is done the river is blue again and full of fish.
Reginald is not sentimental about this. He is offended, and he is getting his estate back.

It's a browser game: pixel-art sprites billboarded inside a real 3D underwater scene (fog,
bloom, light shafts, drifting particles). Built in about 7 hours for a hackathon.

## Controls

- **WASD** (or arrow keys) — swim
- **SPACE / E** — grab an object, then press again over the target zone to drop it
- **H** — HONK (a taunt; townsfolk flinch, you feel powerful)

Every task uses the same verb: swim into a thing, grab it, drag it to where it belongs,
let go. That's the whole game.

## Run it locally

You'll need Node 18+.

```bash
npm install
npm run dev
```

Vite prints a local URL (usually http://localhost:5173). Open it and start swimming.

The sprite frames in `public/sprites/` are already committed, so you don't need to slice
anything to play. If you edit the source sheet at `assets/sprites/catfish-spritesheet.webp`
and want to regenerate the frames, run:

```bash
node scripts/slice-sprites.mjs
```

## Build

```bash
npm run build
```

This type-checks (`tsc -b`) and bundles to `dist/`. To look at the production build before
shipping it:

```bash
npm run preview
```

## Deploy to Vercel

`vercel.json` already sets the framework, build command, and output directory, so there's
nothing to configure in the dashboard.

- **CLI:** `npx vercel` (then `npx vercel --prod` when you're happy with the preview URL).
- **Git:** push the repo to GitHub/GitLab and import it at [vercel.com/new](https://vercel.com/new).
  Vercel reads `vercel.json`, runs `npm run build`, and serves `dist/`.

Every push gets its own preview deployment; the default branch becomes production.

## How the eco hook works

There's no quiz and no lecture mid-game. Cleaning the river is just the player's own reward.

A single `riverHealth` value (0–100) lives in the Zustand store and goes up each time you
finish a crime. That one number drives everything you can see:

- water color lerps from sludge-brown toward clear blue,
- background fish drift back in as it climbs,
- Reginald earns cosmetics (a monocle, then a cane).

Only once the whole list is done and the river is clean does one card appear with a single
real statistic — freshwater species populations have fallen 84% since 1970
([WWF Living Planet Report 2020](https://www.wwf.org.uk/press-release/living-planet-report-2020)).
That's the entire message. The rest is a catfish committing crimes in a top hat.

## Tech stack

- **Vite + TypeScript** — build and dev server
- **React 18** with **React Three Fiber** (`@react-three/fiber`) and **drei** — the 3D scene, declaratively
- **@react-three/postprocessing** — bloom and vignette
- **three** — the underlying renderer
- **zustand** — game state (crimes, river health, dialogue, phase)
- **sharp** — slices the sprite sheet into transparent PNGs at build time

The look is "2D-in-3D": a procedural underwater environment with pixel sprites drawn on
camera-facing planes (`NearestFilter` + `alphaTest`) placed at varying depth. Depth plus
light shafts read as 3D on a projector; the pixel catfish keeps the charm.

## Art credits

Sprite art is the team's own — a hand-authored sheet at
`assets/sprites/catfish-spritesheet.webp` (swim cycle, expressions, the HONK pose, a UI kit,
and props), assembled with help from Google Gemini and sliced into frames by
`scripts/slice-sprites.mjs`. Water, fog, and lighting are all code, not models.
