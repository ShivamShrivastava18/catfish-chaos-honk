# Catfish Chaos: HONK! — Design Spec

*Hackathon build, ~7 hours. Theme: under the water. Web/JS. Fun first, environmental awareness carried by the mechanic, not a lecture.*

## One-line pitch

You are Sir Reginald, a top-hatted gentleman catfish. A riverside town dumps filth in your river, so you retaliate with a to-do list of dignified petty crimes — and every crime happens to clean the water.

## Why this concept

Research findings that shaped it:

- Trash-collecting eco-games are massively oversaturated at underwater jams. Rivers, and *playing as the monster*, are wide-open lanes.
- Eco-games become insufferable when the message comes first. The fix: make the environment matter selfishly. Cleaning the river is the player's own reward loop.
- Judges are spectators. Untitled Goose Game's chaos is fun to *watch*, which wins demos.

## Core loop

One verb reused on everything: **grab-and-drag**. Swim into an object, it latches to Sir Reginald, swim to a target zone, release. Because every task is the same action on a different object, adding a crime is just placing a labeled object — that is what keeps the build inside 7 hours.

Secondary verb: **HONK** (press H). A taunt. Speech bubble pops, nearby townsfolk flinch. Pure comedy, and it is in the title.

### The crime list (~5–6 tasks)

1. Drag the toxic barrels off the riverbed onto the factory boss's lawn
2. Yank the outflow pipe loose
3. Capsize the poacher's boat
4. Steal the "RIVERFRONT CONDOS COMING SOON" sign
5. Snatch the mayor's toupee off the bridge
6. Steal the key (bonus / secret)

## The environmental hook

Each completed crime advances a single **river-health** value from 0 to 100. That value drives everything visible: water color lerps from sludge-brown to clear blue, background fish spawn back in, and Sir Reginald earns a cosmetic (monocle, then cane). The player never sees a quiz or a fact mid-play. Only after the list is done and the river is clean does one earned card appear with a single real statistic (default: *"Monitored freshwater species populations have fallen 84% since 1970." — WWF Living Planet Report 2020*). Optional stretch garnish: name the river after a real one and show its live USGS turbidity reading on the title card.

## Narrative

### Character voice pillars — Sir Reginald

- **Identity:** an aristocratic river catfish who considers the town's pollution a personal insult to his estate.
- **Core wound:** his river, once pristine, is now filth. He is not sad about it. He is *offended*.
- **Voice:** formal, unbothered, faintly menacing politeness. Speaks in complete, measured sentences. Never swears, never shouts. Treats vandalism as etiquette.
- **Vocabulary:** "one does not", "I'm afraid", "how terribly unfortunate", "good day". Avoids slang and exclamation except the literal HONK.
- **Rhythm:** dry, clipped, a beat of comedy from understatement.

### Dialogue — kept to short barks, shown as speech bubbles

Dialogue exists to land a joke on each crime, not to explain. Each line has one function: establish Reginald's contempt, or react to a townsperson.

```
// On grabbing the barrels
REGINALD: "You dropped these. On my carpet."

// On yanking the pipe loose
REGINALD: "Plumbing is a privilege, not a right."

// On capsizing the boat
REGINALD: "A gentleman always sees his guests out."

// On stealing the CONDOS sign
REGINALD: "'Coming soon.' How optimistic."

// On the mayor's toupee
REGINALD: "I'll be needing that."

// HONK taunt (townsfolk flinch)
REGINALD: "HONK."

// Ending card, after the river is clean
REGINALD: "Good day. The river thanks you. I do not."
```

Townsfolk get no lines — they only react (flinch, flail, run) so we spend zero time writing NPC dialogue.

## Art & tech

- **Stack:** Vite + TypeScript + React Three Fiber + @react-three/drei + @react-three/postprocessing. Deploy to Vercel from hour zero.
- **Hybrid 2D-in-3D:** a real 3D underwater scene (fog, god rays, bloom, drifting particles, a displaced-plane riverbed) with pixel-art sprites billboarded inside it at varying depth. Depth plus light shafts read as "3D" on a projector; the pixel catfish keeps the charm.

### Assets

- **2D (owned sprite sheet + matching Gemini-generated sprites):** catfish (swim cycle, faces, HONK pose, death), UI kit (bubble health bar, item slots, key, HONK button), props (barrels, boat, sign, toupee, pipe), townsfolk, reeds, rocks. This is nearly the whole art budget. Sheet lives at `assets/sprites/catfish-spritesheet.webp` and must be sliced into frames.
- **3D (minimal):** water and atmosphere are code, not models. Riverbed is a procedural displaced plane. Bridge/dock/pipe are stylized primitives or a couple of free Kenney CC0 kit pieces. Effectively zero character models to source.

## Components (each independently buildable)

1. **SceneEnvironment** — water, fog, lighting, post-FX, riverbed plane. Reads river-health for water color.
2. **BillboardSprite** — reusable pixel-crisp camera-facing textured plane (`NearestFilter`, `transparent`, `alphaTest`). Build once, use everywhere.
3. **Player (Sir Reginald)** — WASD/pointer movement, grab/release state, swim-frame animation, cosmetic swaps.
4. **Grabbables + drop zones** — object has a target zone id; completion is a distance check, no physics engine.
5. **CrimeSystem** — checklist state, completion detection, fires dialogue + river-health increment.
6. **RiverHealth store** (Zustand) — single source of truth driving water color, fish spawns, cosmetics, ending trigger.
7. **UI overlay (HTML/CSS over canvas)** — to-do list, bubble health bar, HONK button, ending card.
8. **Audio** — one ambient underwater loop + a few muffled SFX (low-pass filtered).

## Structure & demo arc

One scene, checklist-driven. The 3-minute demo: open on a murky brown, lifeless river → complete 2–3 crimes live → water turns blue, fish return, Reginald gains a monocle → ending card with the real stat. Funny, watchable, substantive.

## 7-hour build flow

- **Hour ~2 checkpoint (must hit):** Sir Reginald sprite swimming in a foggy 3D river, deployed live to Vercel. If the 3D look is not landing by then, fall back to flat 2D — everything after transfers.
- Grab-and-drag mechanic → CrimeSystem + one crime working end to end → RiverHealth visual state → remaining crimes (cheap once the first works) → juice (HONK, screen shake, audio) → ending card.

### Cut-list, in order

caustics → god rays → extra crimes → audio polish → catfish cosmetics.
Non-negotiable MVP: grab-drag loop + visible river healing + one real stat.

## Out of scope (YAGNI)

Multiplayer, physics engine, multiple levels, NPC dialogue trees, real-time API dependencies during the demo (any real data is baked in or shown on the title card only).
