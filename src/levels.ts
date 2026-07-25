// levels.ts — the four hand-designed levels of Catfish Chaos: HONK! v4.
// Each level is now an OPEN-WORLD, LAYERED scene: a far BACKGROUND silhouette
// band (bgRidge / bgReeds / distant kelp / god-rays), a parallax MID band of
// kelp forests, coral fields and sunken-ruin clusters, and a detailed FOREGROUND.
// Decor is grouped into deliberate CLUSTERS / points-of-interest across a wide
// area — never a uniform scatter. The readable objectives[] breadcrumb and the
// glowing path[] lane still thread straight through the middle of it all.
import type { SpriteKey } from './sprites'
import {
  L1_INTRO,
  L1_OUTRO,
  L2_INTRO,
  L2_OUTRO,
  L3_INTRO,
  L3_OUTRO,
  L4_INTRO,
  L4_OUTRO,
  type DialogueLine,
} from './story'

export type ObjectiveKind = 'grab' | 'deliver' | 'clear' | 'talk' | 'bossHit'

export interface Objective {
  id: string
  kind: ObjectiveKind
  pos: [number, number, number]
  target?: [number, number, number]
  sprite?: SpriteKey
  label: string
  hint?: string
  doneLine?: string
}

/**
 * Parallax band a prop belongs to. The renderer camera-parallaxes each band by a
 * different amount, giving the scene real depth:
 *   'mid' — kelp forests, coral fields, sunken ruins (the bulk of the world).
 *   'fg'  — detailed near decor, nearly locked to the play plane.
 * The BACKGROUND band (far silhouettes) lives in Level.background[] and is always
 * treated as the slowest, farthest layer, so its items need no `layer` field.
 */
export type PropLayer = 'mid' | 'fg'

/**
 * A placed decor billboard.
 *   pos      — true world position; z sets real depth, so bg items sit deepest.
 *   scale    — size multiplier for the billboard.
 *   flip     — mirror horizontally (vary a repeated silhouette).
 *   layer    — MID (default) or FG parallax band, for props in `props[]`.
 *   parallax — optional 0..1 override of the band default (0 = fixed/farthest,
 *              1 = locked to the play plane). Background items default ~0.2,
 *              mid ~0.6, fg ~0.9 when this is omitted.
 *   debris   — part of a clearable clump; hidden once its objective completes.
 */
export interface PropPlacement {
  sprite: SpriteKey
  pos: [number, number, number]
  scale?: number
  flip?: boolean
  layer?: PropLayer
  parallax?: number
  debris?: boolean // part of a clearable clump; hidden once its `revealAfter` objective is done
}

/** One real, attributed environmental fact, shown on the chapter-clear card. */
export interface EnvFact {
  text: string
  source: string
}

/**
 * A sprite hidden UNDER a debris clump (L1 nursery). Environment/Objectives draw
 * it once the objective `afterObjective` completes — the reveal beneath the silt.
 */
export interface RevealMarker {
  sprite: SpriteKey
  pos: [number, number, number]
  scale?: number
  afterObjective: string // objective id whose completion reveals this + hides matching debris
}

/** Baby fish that SWIM OUT of the cut net (L2). Released when `afterObjective` completes. */
export interface FrySpawn {
  sprite: SpriteKey
  pos: [number, number, number] // where the fry start (inside the net)
  target: [number, number, number] // where they swim to once freed
  count: number
  afterObjective: string // objective id (cutting the net) that releases the fry
}

/**
 * Marks the real 3D outflow pipe + surface dock (L3 reveal, L4 backdrop). The
 * PipeDock component reads this; `pipe` is the submerged pipe anchor, `dock` the
 * above-surface platform dumping polluted water.
 */
export interface PipeDock {
  pipe: [number, number, number]
  dock: [number, number, number]
}

export interface Level {
  id: string
  index: number
  title: string
  subtitle: string
  waterTint: string
  isBoss?: boolean
  hench: SpriteKey
  citizen: SpriteKey
  intro: DialogueLine[]
  outro: DialogueLine[]
  objectives: Objective[]
  // The far SILHOUETTE band — bgRidge / bgReeds / distant kelp / god-rays. Rendered
  // deepest, slowest parallax; sets the horizon and the "there is more world back
  // there" feeling. Deliberately authored, not scattered.
  background: PropPlacement[]
  // The MID + FOREGROUND world — kelp forests, coral fields, sunken-ruin clusters,
  // points of interest. Each prop's `layer` picks its parallax band.
  props: PropPlacement[]
  path: [number, number][]
  envFact: EnvFact // REAL, attributed fact matched to the level theme (shown on chapter-clear)
  reveal?: RevealMarker // L1: the nursery nest/eggs beneath the debris clump
  fry?: FrySpawn // L2: baby fish that swim out of the cut net
  pipeDock?: PipeDock // L3/L4: the 3D outflow pipe + surface dock
}

// ---------------------------------------------------------------------------
// LEVEL 1 — "A Small Favour" (TUTORIAL)
// Biome: silty nursery FLATS. Soft green murk, gentle terraced beds, kelp fringes
// and a coral patch behind the buried nursery. Wide, calm, easy to read.
// ---------------------------------------------------------------------------
const LEVEL_1: Level = {
  id: 'l1-small-favour',
  index: 0,
  title: 'A Small Favour',
  subtitle: 'The guppy’s nursery is buried in silt.',
  waterTint: '#3a4a2e',
  hench: 'henchClownfish',
  citizen: 'citizenGuppy',
  intro: L1_INTRO,
  outro: L1_OUTRO,
  path: [
    [-11, -2],
    [-7, -2],
    [-3, -1.4],
    [1, -1],
    [5, -0.2],
    [9, 0.8],
  ],
  objectives: [
    {
      id: 'l1-dig-silt',
      kind: 'clear',
      pos: [-6.5, -2.4, 0],
      sprite: 'rockBrown',
      label: 'Dig out the debris clump smothering the nursery',
      hint: 'Hold W A S D to swim into the heaped silt and press SPACE to dig it clear',
      doneLine: 'Filth. Heaped on overnight, she said.',
    },
    {
      id: 'l1-haul-silt',
      kind: 'deliver',
      pos: [-6.5, -2.4, 0],
      target: [-11, 1.6, 0],
      sprite: 'rockBrown',
      label: 'Haul the silt clear of the eggs',
      hint: 'Swim to the glowing marker and press SPACE to drop it',
      doneLine: 'There. Room to breathe.',
    },
    {
      id: 'l1-clear-trash',
      kind: 'clear',
      pos: [3, -2, 0],
      sprite: 'rockGrey',
      label: 'Clear the tangled trash',
      hint: 'Swim into the trash and press SPACE — press H to HONK any time',
      doneLine: 'They discard so casually.',
    },
    {
      id: 'l1-guide-fry',
      kind: 'deliver',
      pos: [6, -0.2, 0],
      target: [9, 0.8, 0],
      sprite: 'citizenGuppy',
      label: 'Guide the fry to the safe ring',
      hint: 'Lead them into the glowing ring',
      doneLine: 'Stay close, little ones.',
    },
  ],
  // FAR BACKGROUND — a distant seabed ridge, faint reed strips, silhouette kelp on
  // the horizon, and two soft god-rays sliding down through the silty water.
  background: [
    { sprite: 'bgRidge', pos: [-8, -3.5, -13], scale: 6.5, parallax: 0.18 },
    { sprite: 'bgRidge', pos: [8, -3.6, -13], scale: 6.5, flip: true, parallax: 0.18 },
    { sprite: 'bgReeds', pos: [-14, -3.3, -11], scale: 5, parallax: 0.24 },
    { sprite: 'bgReeds', pos: [0, -3.3, -11.5], scale: 5.2, parallax: 0.22 },
    { sprite: 'bgReeds', pos: [14, -3.3, -11], scale: 5, flip: true, parallax: 0.24 },
    { sprite: 'kelpB', pos: [-18, -3.5, -10], scale: 3.2, parallax: 0.3 },
    { sprite: 'kelpC', pos: [-3, -3.5, -10], scale: 3, parallax: 0.3 },
    { sprite: 'kelpA', pos: [12, -3.5, -10], scale: 3.4, flip: true, parallax: 0.3 },
    { sprite: 'kelpB', pos: [19, -3.5, -9.5], scale: 3, parallax: 0.32 },
    { sprite: 'lightShaftSoft', pos: [-6, 2, -9], scale: 6, parallax: 0.1 },
    { sprite: 'lightShaftSoft', pos: [7, 2.5, -9], scale: 7, parallax: 0.1 },
  ],
  props: [
    // DEBRIS CLUMP — heaped densely over the nursery at [-6.5,-2.4]. Cleared by
    // the 'l1-dig-silt' objective; hidden afterward to REVEAL the nursery beneath.
    { sprite: 'rockBrown', pos: [-6.8, -2.3, 0.2], scale: 1.2, layer: 'fg', debris: true },
    { sprite: 'rockGrey', pos: [-6.2, -2.5, 0.3], scale: 1.1, layer: 'fg', debris: true, flip: true },
    { sprite: 'rockBrown', pos: [-6.5, -1.9, 0.4], scale: 1, layer: 'fg', debris: true },
    { sprite: 'rockGrey', pos: [-7.1, -2.7, 0.1], scale: 0.9, layer: 'fg', debris: true },
    { sprite: 'rockBrown', pos: [-5.9, -2.1, 0.3], scale: 0.95, layer: 'fg', debris: true, flip: true },
    { sprite: 'rockGrey', pos: [-6.9, -1.7, 0.5], scale: 0.8, layer: 'fg', debris: true },
    { sprite: 'coralA', pos: [-6.3, -2.9, 0.2], scale: 0.9, layer: 'fg', debris: true },
    { sprite: 'rockBrown', pos: [-7.3, -2.2, 0.35], scale: 0.85, layer: 'fg', debris: true },
    { sprite: 'rockGrey', pos: [-5.7, -2.6, 0.25], scale: 0.9, layer: 'fg', debris: true, flip: true },
    { sprite: 'rockBrown', pos: [-6.6, -2.4, 0.55], scale: 0.8, layer: 'fg', debris: true },

    // MID — CLUSTER A: west kelp forest (a wall of seaweed you enter from).
    { sprite: 'kelpA', pos: [-16, -3.3, -5], scale: 2.6 },
    { sprite: 'kelpB', pos: [-14.5, -3.3, -4.5], scale: 2.9, flip: true },
    { sprite: 'kelpC', pos: [-13, -3.3, -5.5], scale: 2.4 },
    { sprite: 'kelpA', pos: [-11.8, -3.3, -4], scale: 2.7, flip: true },
    { sprite: 'anemone', pos: [-15, -3.5, -4], scale: 1.2 },
    { sprite: 'shellCluster', pos: [-13.5, -3.5, -3.5], scale: 1 },
    // MID — CLUSTER B: coral patch behind the nursery (the pretty bit worth saving).
    { sprite: 'coralA', pos: [-4, -3.4, -5], scale: 1.8 },
    { sprite: 'coralFan', pos: [-2.8, -3.4, -4.5], scale: 2, flip: true },
    { sprite: 'coralB', pos: [-1.5, -3.4, -5.2], scale: 1.6 },
    { sprite: 'anemone', pos: [-3.2, -3.5, -4], scale: 1 },
    { sprite: 'shellCluster', pos: [-2, -3.5, -3.8], scale: 0.9 },
    // MID — CLUSTER C: a rocky terrace mid-river.
    { sprite: 'rockPile', pos: [3.5, -3.4, -5], scale: 2 },
    { sprite: 'rockFlat', pos: [5, -3.5, -4.5], scale: 1.8, flip: true },
    { sprite: 'rockBig', pos: [6.5, -3.4, -5.5], scale: 2.2 },
    { sprite: 'kelpB', pos: [4.2, -3.3, -4], scale: 2.3 },
    // MID — CLUSTER D: east kelp fringe + a sunken-tire point of interest.
    { sprite: 'kelpA', pos: [9.5, -3.3, -5], scale: 2.6 },
    { sprite: 'kelpC', pos: [11, -3.3, -4.5], scale: 2.4, flip: true },
    { sprite: 'sunkenTire', pos: [12.5, -3.5, -4.5], scale: 1.4 },
    { sprite: 'driftwood', pos: [13.5, -3.5, -4], scale: 1.6 },
    { sprite: 'kelpB', pos: [14, -3.3, -5], scale: 2.5 },

    // FOREGROUND — near decor framing the play plane, kept off the guided lane.
    { sprite: 'kelpA', pos: [-13, -3.3, -1], scale: 2.2, layer: 'fg', flip: true },
    { sprite: 'anemone', pos: [-10, -3.5, -0.8], scale: 1.2, layer: 'fg' },
    { sprite: 'driftwood', pos: [-9, -3.5, -1], scale: 1.4, layer: 'fg' },
    { sprite: 'coralFan', pos: [-0.5, -3.4, -1], scale: 1.6, layer: 'fg' },
    { sprite: 'shellCluster', pos: [1, -3.5, -0.9], scale: 1, layer: 'fg' },
    { sprite: 'rockPile', pos: [7.5, -3.4, -1], scale: 1.8, layer: 'fg' },
    { sprite: 'kelpC', pos: [10, -3.3, -1.2], scale: 2, layer: 'fg', flip: true },
    { sprite: 'anemone', pos: [11.5, -3.5, -0.8], scale: 1.1, layer: 'fg' },
    { sprite: 'coralFan', pos: [9, 0.4, -0.5], scale: 1.4, layer: 'fg' },

    // Surface lily pads + drifting bubbles.
    { sprite: 'lilyPadBig', pos: [-7, 5.6, -2], scale: 2.4 },
    { sprite: 'lilyPadBig', pos: [2, 5.8, -3], scale: 2.8, flip: true },
    { sprite: 'lilyPadBig', pos: [8, 5.6, -2], scale: 2.2 },
    { sprite: 'bubbleCluster', pos: [-3, 1, -2], scale: 1.2 },
    { sprite: 'bubbleCluster', pos: [6, -0.5, -1], scale: 1, layer: 'fg' },
  ],
  // The nursery nest + eggs, revealed beneath the debris once it's dug clear.
  reveal: {
    sprite: 'nursery',
    pos: [-6.5, -2.4, 0.6],
    scale: 1.8,
    afterObjective: 'l1-dig-silt',
  },
  envFact: {
    text: 'Excess fine sediment is one of the most widespread pollutants in rivers: it blankets the gravel beds fish spawn on, starving the eggs of oxygen and smothering the young before they hatch.',
    source: 'US EPA, National Rivers and Streams Assessment',
  },
}

// ---------------------------------------------------------------------------
// LEVEL 2 — "Bad Water"
// Biome: REED / DRUM WETLAND. Dense reed forests, a thick lily-pad ceiling, and
// sunken crates & drums half-buried in the mud. Metallic sick-green water.
// ---------------------------------------------------------------------------
const LEVEL_2: Level = {
  id: 'l2-bad-water',
  index: 1,
  title: 'Bad Water',
  subtitle: 'A net and leaking drums are killing the reeds.',
  waterTint: '#2e4a38',
  hench: 'henchBetta',
  citizen: 'citizenCory',
  intro: L2_INTRO,
  outro: L2_OUTRO,
  path: [
    [-11, -1],
    [-6, -1.4],
    [-1, -2.2],
    [4, -1.4],
    [8, -1],
    [11, 1.4],
  ],
  objectives: [
    {
      id: 'l2-cut-net',
      kind: 'clear',
      pos: [-6, -1, 0],
      sprite: 'net',
      label: 'Cut the poacher’s net',
      hint: 'Swim into the net and press SPACE to cut it free',
      doneLine: 'Poachers I understand. This, less so.',
    },
    {
      id: 'l2-grab-drum',
      kind: 'grab',
      pos: [-1, -2.6, 0],
      sprite: 'drum',
      label: 'Grab a leaking drum',
      hint: 'Press SPACE to hoist the drum',
      doneLine: 'Heavier than it has any right to be.',
    },
    {
      id: 'l2-haul-drum',
      kind: 'deliver',
      pos: [-1, -2.6, 0],
      target: [11, 2, 0],
      sprite: 'drum',
      label: 'Haul the drum to the bank',
      hint: 'Drag it to the glowing marker and press SPACE',
      doneLine: 'Off my riverbed.',
    },
    {
      id: 'l2-clear-last-drum',
      kind: 'clear',
      pos: [6, -2.2, 0],
      sprite: 'drum',
      label: 'Clear the last leaking drum',
      hint: 'Press SPACE to clear it',
      doneLine: 'Now — what is stamped on these.',
    },
  ],
  // FAR BACKGROUND — a wide bank of faint reed silhouettes and a low ridge; god-rays
  // filter weakly through the choked wetland.
  background: [
    { sprite: 'bgRidge', pos: [-9, -3.5, -13], scale: 6, parallax: 0.18 },
    { sprite: 'bgRidge', pos: [9, -3.6, -13], scale: 6, flip: true, parallax: 0.18 },
    { sprite: 'bgReeds', pos: [-15, -3.3, -11], scale: 5.5, parallax: 0.24 },
    { sprite: 'bgReeds', pos: [-3, -3.3, -11.5], scale: 5.5, parallax: 0.22 },
    { sprite: 'bgReeds', pos: [10, -3.3, -11], scale: 5.5, flip: true, parallax: 0.24 },
    { sprite: 'bgReeds', pos: [18, -3.3, -11], scale: 5, parallax: 0.24 },
    { sprite: 'kelpC', pos: [-18, -3.5, -10], scale: 3, parallax: 0.3 },
    { sprite: 'kelpA', pos: [4, -3.5, -10], scale: 3.2, parallax: 0.3 },
    { sprite: 'kelpB', pos: [15, -3.5, -9.5], scale: 3, flip: true, parallax: 0.32 },
    { sprite: 'lightShaftSoft', pos: [-5, 2.5, -9], scale: 6, parallax: 0.1 },
    { sprite: 'lightShaftSoft', pos: [8, 2, -9], scale: 6.5, parallax: 0.1 },
  ],
  props: [
    // MID — CLUSTER A: dense west reed forest.
    { sprite: 'kelpA', pos: [-14, -3.3, -5], scale: 3 },
    { sprite: 'kelpB', pos: [-12.5, -3.3, -4.5], scale: 3.2, flip: true },
    { sprite: 'kelpA', pos: [-11, -3.3, -5.5], scale: 2.8 },
    { sprite: 'kelpC', pos: [-9.5, -3.3, -4], scale: 2.6 },
    { sprite: 'anemone', pos: [-13, -3.5, -4], scale: 1.1 },
    // MID — CLUSTER B: sunken drums & debris around the net.
    { sprite: 'sunkenCrate', pos: [-5, -3.5, -4.5], scale: 1.5 },
    { sprite: 'sunkenTire', pos: [-3.5, -3.5, -4], scale: 1.3 },
    { sprite: 'driftwood', pos: [-6.5, -3.5, -4.2], scale: 1.6, flip: true },
    { sprite: 'rockPile', pos: [-4, -3.4, -5], scale: 1.6 },
    // MID — CLUSTER C: mid-river reed patch.
    { sprite: 'kelpB', pos: [-1, -3.3, -5], scale: 2.8 },
    { sprite: 'kelpA', pos: [0.5, -3.3, -4.5], scale: 3, flip: true },
    { sprite: 'kelpC', pos: [2, -3.3, -5.2], scale: 2.5 },
    { sprite: 'shellCluster', pos: [1, -3.5, -3.8], scale: 0.9 },
    // MID — CLUSTER D: east reed forest + more sunken crates (the drum trail).
    { sprite: 'kelpA', pos: [6.5, -3.3, -5], scale: 3 },
    { sprite: 'kelpB', pos: [8, -3.3, -4.5], scale: 2.8, flip: true },
    { sprite: 'sunkenCrate', pos: [10, -3.5, -4.5], scale: 1.5 },
    { sprite: 'driftwood', pos: [11.5, -3.5, -4], scale: 1.5 },
    { sprite: 'kelpC', pos: [13, -3.3, -5], scale: 2.6 },
    { sprite: 'coralFan', pos: [14, -3.4, -5.2], scale: 1.6 },

    // FOREGROUND — near reeds and debris hugging the edges of the lane.
    { sprite: 'kelpA', pos: [-12, -3.3, -1], scale: 2.6, layer: 'fg', flip: true },
    { sprite: 'kelpC', pos: [-10, -3.3, -1.2], scale: 2.2, layer: 'fg' },
    { sprite: 'anemone', pos: [-8, -3.5, -0.8], scale: 1.1, layer: 'fg' },
    { sprite: 'driftwood', pos: [-7, -3.5, -1], scale: 1.5, layer: 'fg' },
    { sprite: 'shellCluster', pos: [-5, -3.5, -0.9], scale: 1, layer: 'fg' },
    { sprite: 'kelpB', pos: [1.5, -3.3, -1.1], scale: 2.4, layer: 'fg', flip: true },
    { sprite: 'sunkenTire', pos: [7, -3.5, -1], scale: 1.3, layer: 'fg' },
    { sprite: 'kelpA', pos: [9, -3.3, -1.2], scale: 2.5, layer: 'fg' },
    { sprite: 'kelpC', pos: [12, -3.3, -1], scale: 2.2, layer: 'fg', flip: true },

    // A thick lily-pad ceiling over the wetland + drifting bubbles.
    { sprite: 'lilyPadBig', pos: [-6, 5.6, -2], scale: 2.8 },
    { sprite: 'lilyPadBig', pos: [-1, 5.5, -2.5], scale: 2.4, flip: true },
    { sprite: 'lilyPadBig', pos: [3, 5.8, -3], scale: 3 },
    { sprite: 'lilyPadBig', pos: [9, 5.6, -2], scale: 2.6, flip: true },
    { sprite: 'bubbleCluster', pos: [-2, 0.5, -2], scale: 1.1 },
    { sprite: 'bubbleCluster', pos: [5, 1.5, -1], scale: 0.9, layer: 'fg' },
  ],
  // The trapped fry swim free once the net is cut.
  fry: {
    sprite: 'fry',
    pos: [-6, -1, 0.4],
    target: [-2, 1.5, 0.4],
    count: 5,
    afterObjective: 'l2-cut-net',
  },
  envFact: {
    text: 'Abandoned and discarded fishing gear — “ghost nets” — makes up roughly a tenth of marine litter, about 640,000 tonnes each year, and keeps trapping and drowning fish long after it is lost.',
    source: 'FAO & UNEP (2009), Abandoned, Lost or Otherwise Discarded Fishing Gear',
  },
}

// ---------------------------------------------------------------------------
// LEVEL 3 — "The Source"
// Biome: INDUSTRIAL PIPE OUTFALL. A drowned ruin field — broken pillars, tires,
// crates and driftwood — with sickly, sparse kelp, climbing upstream toward the
// outflow pipe and the dock. Toxic dark-red water.
// ---------------------------------------------------------------------------
const LEVEL_3: Level = {
  id: 'l3-the-source',
  index: 2,
  title: 'The Source',
  subtitle: 'Trace the outflow pipe to whoever holds the other end.',
  waterTint: '#472a2a',
  hench: 'henchPuffer',
  citizen: 'citizenDiscus',
  intro: L3_INTRO,
  outro: L3_OUTRO,
  path: [
    [-11, -1.5],
    [-7, -1],
    [-1, -2],
    [4, -0.6],
    [8, 2],
    [10, 4.5],
  ],
  objectives: [
    {
      id: 'l3-check-sick',
      kind: 'talk',
      pos: [-7, -1, 0],
      sprite: 'citizenTetra',
      label: 'Check on the sick',
      hint: 'Swim close and press SPACE to speak',
      doneLine: 'Breathe, friend. I am handling it.',
    },
    {
      id: 'l3-clear-waste',
      kind: 'clear',
      pos: [-1, -2.4, 0],
      sprite: 'sludge',
      label: 'Clear the waste choking the flow',
      hint: 'Press SPACE to clear the waste',
      doneLine: 'It never stops. So it must have a source.',
    },
    {
      id: 'l3-jam-valve',
      kind: 'clear',
      pos: [5, -0.6, 0],
      sprite: 'valve',
      label: 'Wrench the outflow valve',
      hint: 'Swim to the valve and press SPACE to wrench it shut',
      doneLine: 'Shut. For now.',
    },
    {
      id: 'l3-follow-pipe',
      kind: 'talk',
      pos: [10, 4.5, 0],
      label: 'Follow the pipe to the surface',
      hint: 'Swim up along the pipe and press SPACE',
      doneLine: 'A dock. And a man in a very fine hat.',
    },
  ],
  // FAR BACKGROUND — a skyline of drowned pillar silhouettes, a low ridge, and a
  // strong god-ray leaning toward the dock on the right (where the pipe surfaces).
  background: [
    { sprite: 'bgRidge', pos: [-9, -3.5, -13], scale: 6, parallax: 0.18 },
    { sprite: 'bgRidge', pos: [7, -3.6, -13], scale: 6, flip: true, parallax: 0.18 },
    { sprite: 'bgReeds', pos: [-15, -3.3, -11], scale: 5, parallax: 0.24 },
    { sprite: 'bgReeds', pos: [14, -3.3, -11], scale: 5, flip: true, parallax: 0.24 },
    { sprite: 'sunkenPillar', pos: [-17, -3.5, -10], scale: 3.5, parallax: 0.3 },
    { sprite: 'sunkenPillar', pos: [-12, -3.5, -10.5], scale: 3, flip: true, parallax: 0.3 },
    { sprite: 'sunkenPillar', pos: [5, -3.5, -10], scale: 3.2, parallax: 0.3 },
    { sprite: 'kelpC', pos: [-3, -3.5, -10], scale: 2.6, parallax: 0.3 },
    { sprite: 'kelpB', pos: [11, -3.5, -9.5], scale: 2.4, flip: true, parallax: 0.32 },
    { sprite: 'lightShaftSoft', pos: [8, 3, -9], scale: 7, parallax: 0.1 },
    { sprite: 'lightShaftSoft', pos: [-4, 2, -9], scale: 5, parallax: 0.1 },
  ],
  props: [
    // NB: the outflow pipe + surface dock are drawn as real 3D geometry by the
    // PipeDock component from `pipeDock` below — no fake rock props stand in.

    // MID — CLUSTER A: west ruin field (toppled pillars & rubble).
    { sprite: 'sunkenPillar', pos: [-14, -3.4, -5], scale: 2.8 },
    { sprite: 'sunkenPillar', pos: [-11.5, -3.4, -4.5], scale: 2.4, flip: true },
    { sprite: 'rockPile', pos: [-12.8, -3.4, -5.2], scale: 1.8 },
    { sprite: 'driftwood', pos: [-10, -3.5, -4], scale: 1.6 },
    { sprite: 'rockBig', pos: [-9.2, -3.4, -5], scale: 2 },
    // MID — CLUSTER B: the waste choke (debris packed into the flow).
    { sprite: 'sunkenCrate', pos: [-2, -3.5, -4.5], scale: 1.6 },
    { sprite: 'sunkenTire', pos: [-0.5, -3.5, -4], scale: 1.4 },
    { sprite: 'rockPile', pos: [-3, -3.4, -5], scale: 1.8 },
    { sprite: 'driftwood', pos: [-1.2, -3.5, -4.2], scale: 1.5, flip: true },
    // MID — CLUSTER C: mid rocks with a few surviving, sickly weeds.
    { sprite: 'rockBig', pos: [3, -3.4, -5], scale: 2.2 },
    { sprite: 'rockFlat', pos: [4.5, -3.5, -4.5], scale: 1.8, flip: true },
    { sprite: 'kelpC', pos: [5.5, -3.3, -5], scale: 2.2 },
    { sprite: 'sunkenTire', pos: [2.2, -3.5, -4], scale: 1.2 },
    // MID — CLUSTER D: pipe-approach ruins climbing toward the dock.
    { sprite: 'sunkenPillar', pos: [8.5, -3.4, -5], scale: 2.6 },
    { sprite: 'sunkenCrate', pos: [10, -3.5, -4.5], scale: 1.5 },
    { sprite: 'rockPile', pos: [11.5, -3.4, -5], scale: 1.8 },
    { sprite: 'driftwood', pos: [12.5, -3.5, -4], scale: 1.5 },

    // FOREGROUND — near ruins + the sick residents Reginald tends to.
    { sprite: 'sunkenPillar', pos: [-13, -3.4, -1], scale: 2.4, layer: 'fg', flip: true },
    { sprite: 'rockPile', pos: [-11, -3.4, -1.2], scale: 1.8, layer: 'fg' },
    { sprite: 'driftwood', pos: [-9, -3.5, -0.9], scale: 1.5, layer: 'fg' },
    { sprite: 'citizenTetra', pos: [-7, -1, 0.5], scale: 0.9, layer: 'fg', flip: true },
    { sprite: 'citizenRasbora', pos: [-3, 0.5, 0.5], scale: 0.8, layer: 'fg' },
    { sprite: 'citizenAngel', pos: [4, 1.5, 0.5], scale: 0.9, layer: 'fg', flip: true },
    { sprite: 'sunkenTire', pos: [-0.5, -3.5, -1], scale: 1.2, layer: 'fg' },
    { sprite: 'rockPile', pos: [1, -3.4, -1.1], scale: 1.6, layer: 'fg' },
    { sprite: 'sunkenPillar', pos: [7, -3.4, -1], scale: 2.2, layer: 'fg' },
    { sprite: 'rockBig', pos: [9, -3.4, -1.2], scale: 1.8, layer: 'fg', flip: true },

    // Bubbles boiling up from the pipe + a couple of polluted lily pads.
    { sprite: 'bubbleCluster', pos: [8.5, 0, -0.5], scale: 1.4, layer: 'fg' },
    { sprite: 'bubbleCluster', pos: [8.8, 2.5, -0.5], scale: 1.2, layer: 'fg' },
    { sprite: 'lilyPadBig', pos: [-4, 5.6, -2], scale: 2.2 },
    { sprite: 'lilyPadBig', pos: [4, 5.8, -3], scale: 2.4, flip: true },
  ],
  // The outflow pipe climbs from the riverbed to a surface dock that dumps
  // polluted water — the 'l3-follow-pipe' objective leads up to it.
  pipeDock: {
    pipe: [9.5, -1.5, -0.8],
    dock: [10, 5.2, -0.8],
  },
  envFact: {
    text: 'More than 80% of the world’s wastewater flows back into rivers and seas without being treated, carrying industrial chemicals and sewage into the water that people and wildlife depend on.',
    source: 'UN World Water Development Report 2017 (UNESCO)',
  },
}

// ---------------------------------------------------------------------------
// LEVEL 4 — "Sleep With The Fishes" (BOSS)
// Biome: DEEP DARK BOSS ARENA. A ring of drowned pillars and dark kelp frames a
// wide-open fighting floor beneath the dock; god-rays stab down from the platform
// above. Center is deliberately CLEAR for the barrel duel. Water is clearing.
// ---------------------------------------------------------------------------
const LEVEL_4: Level = {
  id: 'l4-sleep-with-the-fishes',
  index: 3,
  title: 'Sleep With The Fishes',
  subtitle: 'Throw Don Vitale’s barrels back — three good hits.',
  waterTint: '#0e3a52',
  isBoss: true,
  hench: 'henchPuffer',
  citizen: 'citizenDiscus',
  intro: L4_INTRO,
  outro: L4_OUTRO,
  path: [
    [-9, -2.5],
    [-4, -2.5],
    [0, -2.5],
    [4, -2.5],
    [9, -2.5],
  ],
  objectives: [
    {
      id: 'l4-hit-1',
      kind: 'bossHit',
      pos: [0, 6, 0],
      target: [0, 6, 0],
      sprite: 'rockBrown',
      label: 'Hurl a barrel back at Vitale (1 of 3)',
      hint: 'Dodge the falling barrels, grab one, and press SPACE to throw it up',
      doneLine: 'One.',
    },
    {
      id: 'l4-hit-2',
      kind: 'bossHit',
      pos: [0, 6, 0],
      target: [0, 6, 0],
      sprite: 'rockBrown',
      label: 'Hurl a barrel back at Vitale (2 of 3)',
      hint: 'Keep moving — grab a barrel and press SPACE to throw',
      doneLine: 'Two.',
    },
    {
      id: 'l4-hit-3',
      kind: 'bossHit',
      pos: [0, 6, 0],
      target: [0, 6, 0],
      sprite: 'rockBrown',
      label: 'Hurl a barrel back at Vitale (3 of 3)',
      hint: 'Finish it — one more square hit',
      doneLine: 'Three. Goodnight, Vitale.',
    },
  ],
  // FAR BACKGROUND — a deep pillar-ruin skyline, dark kelp on the horizon, and
  // dramatic god-rays raining down from the dock above the arena.
  background: [
    { sprite: 'bgRidge', pos: [-10, -3.5, -13], scale: 6.5, parallax: 0.18 },
    { sprite: 'bgRidge', pos: [10, -3.6, -13], scale: 6.5, flip: true, parallax: 0.18 },
    { sprite: 'sunkenPillar', pos: [-16, -3.5, -10], scale: 3.4, parallax: 0.3 },
    { sprite: 'sunkenPillar', pos: [16, -3.5, -10], scale: 3.4, flip: true, parallax: 0.3 },
    { sprite: 'sunkenPillar', pos: [-6, -3.5, -11], scale: 3, parallax: 0.28 },
    { sprite: 'sunkenPillar', pos: [6, -3.5, -11], scale: 3, flip: true, parallax: 0.28 },
    { sprite: 'kelpA', pos: [-13, -3.5, -10], scale: 3.2, parallax: 0.3 },
    { sprite: 'kelpB', pos: [13, -3.5, -10], scale: 3, flip: true, parallax: 0.3 },
    { sprite: 'lightShaftSoft', pos: [-3, 3, -9], scale: 7, parallax: 0.08 },
    { sprite: 'lightShaftSoft', pos: [3, 3.5, -9], scale: 7.5, parallax: 0.08 },
    { sprite: 'lightShaftSoft', pos: [0, 3, -8.5], scale: 6, parallax: 0.08 },
  ],
  props: [
    // The dock/pipe ceiling backdrop above the waterline (kept as the platform the
    // fight rages beneath). PipeDock draws the real pipe; these are the pilings.
    { sprite: 'rockGrey', pos: [-6, 5.4, -1], scale: 3 },
    { sprite: 'rockGrey', pos: [-6, 2, -1], scale: 3 },
    { sprite: 'rockGrey', pos: [6, 5.4, -1], scale: 3 },
    { sprite: 'rockGrey', pos: [6, 2, -1], scale: 3 },

    // MID — LEFT arena wall of ruins & kelp (frames the floor, center stays clear).
    { sprite: 'sunkenPillar', pos: [-14, -3.4, -5], scale: 3 },
    { sprite: 'rockBig', pos: [-12, -3.4, -5.2], scale: 2.2 },
    { sprite: 'rockPile', pos: [-10.5, -3.4, -5], scale: 1.8 },
    { sprite: 'kelpA', pos: [-13.2, -3.3, -4.5], scale: 2.6, flip: true },
    { sprite: 'anemone', pos: [-11, -3.5, -4], scale: 1.1 },
    // MID — RIGHT arena wall of ruins & kelp.
    { sprite: 'sunkenPillar', pos: [14, -3.4, -5], scale: 3, flip: true },
    { sprite: 'rockBig', pos: [12, -3.4, -5.2], scale: 2.2 },
    { sprite: 'rockPile', pos: [10.5, -3.4, -5], scale: 1.8 },
    { sprite: 'kelpB', pos: [13.2, -3.3, -4.5], scale: 2.6 },
    { sprite: 'anemone', pos: [11, -3.5, -4], scale: 1.1 },
    // MID — BACK-CENTER low ruins, set deep so they never crowd the fight.
    { sprite: 'sunkenPillar', pos: [-4, -3.4, -6], scale: 2.4 },
    { sprite: 'sunkenPillar', pos: [4, -3.4, -6], scale: 2.4, flip: true },
    { sprite: 'rockPile', pos: [0, -3.5, -6.2], scale: 2 },
    { sprite: 'coralB', pos: [-2, -3.4, -6], scale: 1.4 },
    { sprite: 'coralA', pos: [2, -3.4, -6], scale: 1.4 },

    // FOREGROUND — pushed to the far edges so the barrel duel stays unobstructed.
    { sprite: 'kelpA', pos: [-11, -3.3, -1], scale: 2.6, layer: 'fg', flip: true },
    { sprite: 'sunkenPillar', pos: [-13, -3.4, -1.2], scale: 2.4, layer: 'fg' },
    { sprite: 'anemone', pos: [-9.5, -3.5, -0.9], scale: 1.1, layer: 'fg' },
    { sprite: 'kelpB', pos: [11, -3.3, -1], scale: 2.6, layer: 'fg' },
    { sprite: 'sunkenPillar', pos: [13, -3.4, -1.2], scale: 2.4, layer: 'fg', flip: true },
    { sprite: 'anemone', pos: [9.5, -3.5, -0.9], scale: 1.1, layer: 'fg' },

    // Rising bubbles in the clearing water.
    { sprite: 'bubbleCluster', pos: [-4, 0, -1], scale: 1.2 },
    { sprite: 'bubbleCluster', pos: [3, 1, -1], scale: 1 },
    { sprite: 'bubbleCluster', pos: [-1, -1.5, -0.5], scale: 0.9, layer: 'fg' },
  ],
  // The dock + pipe ceiling backdrop the whole fight plays out beneath.
  pipeDock: {
    pipe: [7, 5, -1.2],
    dock: [0, 6.2, -1.2],
  },
  envFact: {
    text: 'The world has lost about 35% of its wetlands since 1970 — freshwater habitats are vanishing three times faster than forests, drained and filled largely for development.',
    source: 'Ramsar Convention, Global Wetland Outlook 2018',
  },
}

export const LEVELS: Level[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4]

/** Fetch a level by its zero-based index; undefined when out of range. */
export function getLevel(index: number): Level | undefined {
  return LEVELS[index]
}

/** Total number of levels (4). */
export const LEVEL_COUNT = LEVELS.length
