# Catfish Chaos: HONK!

You are Sir Reginald, a top-hatted gentleman catfish and the Don of a river district.
The fish here fear you and love you in about equal measure. You have done ugly things to
hold this stretch of water, and you would do them again, but the fish are yours and nobody
poisons what is yours. So when your people come to you with a problem, you fix it. Quietly,
thoroughly, and without a lot of talk about your feelings.

It's a browser game: pixel-art sprites billboarded inside a real 3D underwater scene (fog,
bloom, light shafts, drifting particles). Four story levels, ending in a boss fight against
the man who has been poisoning the river to build condos on top of it.

## The story

This one is played straight, in the key of *Sarkar* (2005): a messiah-and-a-mafia don who
is not a good man but is the only one who shows up. Each level, one of Reginald's henchmen
(the ones in top hats) drags in a citizen fish (no hat) with a problem, and Reginald solves
it. Solving it always makes the water a little cleaner. And every problem, if you follow it,
leads to the same place upstream.

### Levels

1. **A Small Favour** *(tutorial)* — Vinny brings Marla, a guppy whose nursery got buried in
   silt overnight. You dig it out and learn the controls doing it. The silt does not smell
   like river. It smells like chemicals.
2. **Bad Water** — Old Barnaby's reed beds are choked by a poacher's net and a row of leaking
   drums. Cut the net, haul the drums. The drums are stamped **VITALE LAND CO.** So the
   careless man upstream has a name now.
3. **The Source** — Della's people are sick. A giant outflow pipe is pouring waste into the
   river, and Reginald traces it up to the dock, where he finally sees Don Vitale killing the
   water to build "Riverfront Condos." After this, Reginald is out for blood.
4. **Sleep With The Fishes** *(boss)* — Vitale stands on the dock above the waterline, dropping
   barrels. Dodge them, grab them, and hurl them back up at him. Three good hits ends it. The
   river comes back clean. How Reginald got it back is another question, and the game does not
   pretend otherwise.

The credits card ends on one real number:
*Monitored freshwater species populations have fallen 84% since 1970*
([WWF Living Planet Report 2020](https://www.wwf.org.uk/press-release/living-planet-report-2020)).

## Controls

- **WASD** (or arrow keys) — swim
- **SPACE / E** — grab an object, then press again over the target zone to drop or deliver it
- **H** — HONK (a taunt; nearby fish flinch, you feel powerful)
- **SPACE / ENTER** — advance dialogue

Objectives arrive one at a time as an ordered breadcrumb. Only the active one is targetable,
and a marker plus a directional arrow point you at it, so you are never hunting the map for
what to do next.

## Run it locally

You'll need Node 18+.

```bash
npm install
npm run dev
```

Vite prints a local URL (usually http://localhost:5173). Open it and start swimming.

The sprite frames in `public/sprites/` are already committed, so you don't need to slice
anything to play. If you edit one of the source sheets in `assets/sprites/` and want to
regenerate the frames, run:

```bash
node scripts/slice-sprites.mjs
```

## Build

```bash
npm run build
```

This type-checks (`tsc -b`) and bundles to `dist/`. To look at the production build:

```bash
npm run preview
```

## Tech stack

- **Vite + TypeScript** (strict) — build and dev server
- **React 18** with **React Three Fiber** (`@react-three/fiber`) and **drei** — the 3D scene, declaratively
- **@react-three/postprocessing** — bloom and vignette
- **three** — the underlying renderer
- **zustand** — game state (current level, objectives, dialogue, phase, river health)
- **sharp** — slices the sprite sheets into transparent PNGs at build time

The look is "2D-in-3D": a procedural underwater environment with pixel sprites drawn on
camera-facing planes (`NearestFilter` + `alphaTest`) placed at varying depth. Each level is a
hand-placed set of props and a readable swim lane, not a random scatter. Depth and light shafts
read as 3D; the pixel catfish keeps the charm and the pixels stay crisp.

## Art credits

Sprite art is the team's own, hand-authored across four sheets in `assets/sprites/`:
`catfish-spritesheet.webp` (Reginald's swim cycle, expressions, the HONK pose, the top hat),
`citizens-sheet.webp` (the unhatted citizen fish and decor), `henchmen-sheet.webp` (the
top-hatted gang and decor), and `boss-reference.png` (art direction for Don Vitale). The sheets
were assembled with help from Google Gemini and sliced into frames by `scripts/slice-sprites.mjs`.
Water, fog, and lighting are all code, not models.
