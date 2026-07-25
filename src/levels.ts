// levels.ts — the four hand-designed levels of Catfish Chaos: HONK! v2.
// Each level has a DENSE, deliberate props[] layout, a readable path[] lane, and
// an ORDERED objectives[] breadcrumb (only the active objective is targetable).
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

export interface PropPlacement {
  sprite: SpriteKey
  pos: [number, number, number]
  scale?: number
  flip?: boolean
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
  props: PropPlacement[]
  path: [number, number][]
}

// ---------------------------------------------------------------------------
// LEVEL 1 — "A Small Favour" (TUTORIAL)
// Silty, murky green water. Teach swim / grab / deliver / the glowing ring.
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
      kind: 'grab',
      pos: [-6.5, -2.4, 0],
      sprite: 'rockBrown',
      label: 'Dig the silt off the nursery',
      hint: 'Hold W A S D to swim over, then press SPACE to grab',
      doneLine: 'Filth. Overnight, she said.',
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
  props: [
    { sprite: 'seaweedTall', pos: [-11, -3, -3], scale: 2.4 },
    { sprite: 'seaweedTall', pos: [-9.5, -3.2, -3], scale: 2, flip: true },
    { sprite: 'seaweedShort', pos: [-8, -3.4, -2], scale: 1.4 },
    { sprite: 'rockBrown', pos: [-6.5, -3.6, -1], scale: 1.6 },
    { sprite: 'rockGrey', pos: [-4, -3.6, -2], scale: 1.2 },
    { sprite: 'coral', pos: [-2, -3.2, -3], scale: 1.5 },
    { sprite: 'seaweedTall', pos: [0, -3, -3], scale: 2.2, flip: true },
    { sprite: 'seaweedShort', pos: [1.6, -3.4, -2], scale: 1.3 },
    { sprite: 'rockBrown', pos: [3.5, -3.6, -1], scale: 1.4 },
    { sprite: 'coral', pos: [5.5, -3.3, -3], scale: 1.6 },
    { sprite: 'seaweedTall', pos: [7.5, -3, -3], scale: 2.3 },
    { sprite: 'seaweedShort', pos: [9, -3.3, -2], scale: 1.5, flip: true },
    { sprite: 'coral', pos: [9, 0.4, -0.5], scale: 1.4 },
    { sprite: 'rockGrey', pos: [10.5, -3.6, -2], scale: 1.6 },
    { sprite: 'lilyPad', pos: [-7, 5.6, -2], scale: 2 },
    { sprite: 'lilyPad', pos: [2, 5.8, -3], scale: 2.4, flip: true },
    { sprite: 'lilyPad', pos: [8, 5.6, -2], scale: 1.8 },
    { sprite: 'bubbleCluster', pos: [-3, 1, -2], scale: 1.2 },
    { sprite: 'bubbleCluster', pos: [6, -0.5, -1], scale: 1 },
  ],
}

// ---------------------------------------------------------------------------
// LEVEL 2 — "Bad Water"
// Reed beds choked by a net and leaking drums. Metallic sick-green water.
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
      sprite: 'coral',
      label: 'Cut the poacher’s net',
      hint: 'Swim into the net and press SPACE to cut it free',
      doneLine: 'Poachers I understand. This, less so.',
    },
    {
      id: 'l2-grab-drum',
      kind: 'grab',
      pos: [-1, -2.6, 0],
      sprite: 'rockGrey',
      label: 'Grab a leaking drum',
      hint: 'Press SPACE to hoist the drum',
      doneLine: 'Heavier than it has any right to be.',
    },
    {
      id: 'l2-haul-drum',
      kind: 'deliver',
      pos: [-1, -2.6, 0],
      target: [11, 2, 0],
      sprite: 'rockGrey',
      label: 'Haul the drum to the bank',
      hint: 'Drag it to the glowing marker and press SPACE',
      doneLine: 'Off my riverbed.',
    },
    {
      id: 'l2-clear-last-drum',
      kind: 'clear',
      pos: [6, -2.2, 0],
      sprite: 'rockGrey',
      label: 'Clear the last leaking drum',
      hint: 'Press SPACE to clear it',
      doneLine: 'Now — what is stamped on these.',
    },
  ],
  props: [
    { sprite: 'seaweedTall', pos: [-11, -2.8, -3], scale: 2.6 },
    { sprite: 'seaweedTall', pos: [-9.6, -2.8, -2.5], scale: 2.4, flip: true },
    { sprite: 'seaweedTall', pos: [-8, -2.8, -3], scale: 2.8 },
    { sprite: 'seaweedShort', pos: [-6.5, -3.2, -2], scale: 1.6 },
    { sprite: 'rockGrey', pos: [-4.5, -3.4, -1], scale: 1.3 },
    { sprite: 'seaweedTall', pos: [-3, -2.8, -3], scale: 2.5, flip: true },
    { sprite: 'coral', pos: [-1.5, -3.2, -2], scale: 1.4 },
    { sprite: 'seaweedTall', pos: [1, -2.8, -3], scale: 2.7 },
    { sprite: 'seaweedShort', pos: [2.8, -3.3, -2], scale: 1.5, flip: true },
    { sprite: 'rockBrown', pos: [4.5, -3.4, -1], scale: 1.5 },
    { sprite: 'seaweedTall', pos: [6.5, -2.8, -3], scale: 2.6 },
    { sprite: 'seaweedTall', pos: [8, -2.8, -2.5], scale: 2.3, flip: true },
    { sprite: 'coral', pos: [9.8, -3.1, -3], scale: 1.6 },
    { sprite: 'rockGrey', pos: [11, -3.4, -2], scale: 1.4 },
    { sprite: 'lilyPad', pos: [-6, 5.6, -2], scale: 2.2 },
    { sprite: 'lilyPad', pos: [3, 5.8, -3], scale: 2 },
    { sprite: 'lilyPad', pos: [9, 5.6, -2], scale: 2.4, flip: true },
    { sprite: 'bubbleCluster', pos: [-2, 0.5, -2], scale: 1.1 },
    { sprite: 'bubbleCluster', pos: [5, 1.5, -1], scale: 0.9 },
  ],
}

// ---------------------------------------------------------------------------
// LEVEL 3 — "The Source"
// A giant outflow pipe pours waste; sick fish drift. Toxic dark water.
// Path climbs upstream toward the surface and the reveal.
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
      sprite: 'rockBrown',
      label: 'Clear the waste choking the flow',
      hint: 'Press SPACE to clear the waste',
      doneLine: 'It never stops. So it must have a source.',
    },
    {
      id: 'l3-jam-valve',
      kind: 'grab',
      pos: [5, -0.6, 0],
      sprite: 'rockGrey',
      label: 'Wrench the outflow valve',
      hint: 'Press SPACE to seize the valve and jam it',
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
  props: [
    { sprite: 'rockGrey', pos: [9.5, -1, -1], scale: 5.5 },
    { sprite: 'rockGrey', pos: [9.5, 3, -1], scale: 4 },
    { sprite: 'seaweedShort', pos: [-11, -3, -3], scale: 1.6 },
    { sprite: 'rockBrown', pos: [-9.5, -3.4, -2], scale: 1.8 },
    { sprite: 'citizenTetra', pos: [-7, -1, 0.5], scale: 0.9, flip: true },
    { sprite: 'seaweedShort', pos: [-6, -3.3, -2], scale: 1.3 },
    { sprite: 'rockBrown', pos: [-4, -3.4, -1], scale: 1.6 },
    { sprite: 'citizenRasbora', pos: [-3, 0.5, 0.5], scale: 0.8 },
    { sprite: 'rockBrown', pos: [-1, -3.2, -2], scale: 2 },
    { sprite: 'coral', pos: [1.5, -3.3, -3], scale: 1.4 },
    { sprite: 'rockGrey', pos: [3.5, -3.4, -1], scale: 1.5 },
    { sprite: 'citizenAngel', pos: [4, 1.5, 0.5], scale: 0.9, flip: true },
    { sprite: 'rockBrown', pos: [6.5, -3.4, -2], scale: 1.7 },
    { sprite: 'seaweedTall', pos: [-8.5, -2.8, -3], scale: 2.2 },
    { sprite: 'lilyPad', pos: [-4, 5.6, -2], scale: 2 },
    { sprite: 'lilyPad', pos: [4, 5.8, -3], scale: 2.2, flip: true },
    { sprite: 'bubbleCluster', pos: [8.5, 0, -0.5], scale: 1.4 },
    { sprite: 'bubbleCluster', pos: [8.8, 2.5, -0.5], scale: 1.2 },
  ],
}

// ---------------------------------------------------------------------------
// LEVEL 4 — "Sleep With The Fishes" (BOSS)
// Don Vitale on the dock ABOVE the waterline drops barrels; Reginald dodges and
// hurls three back up to hit him. Water is beginning to clear.
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
  props: [
    { sprite: 'bossDonMan', pos: [0, 6.2, -0.5], scale: 4.5 },
    { sprite: 'rockGrey', pos: [-6, 5.4, -1], scale: 3 },
    { sprite: 'rockGrey', pos: [-6, 2, -1], scale: 3 },
    { sprite: 'rockGrey', pos: [6, 5.4, -1], scale: 3 },
    { sprite: 'rockGrey', pos: [6, 2, -1], scale: 3 },
    { sprite: 'seaweedTall', pos: [-11, -2.8, -3], scale: 2.4 },
    { sprite: 'seaweedTall', pos: [-9, -2.8, -3], scale: 2, flip: true },
    { sprite: 'coral', pos: [-6.5, -3.2, -2], scale: 1.5 },
    { sprite: 'rockBrown', pos: [-3.5, -3.4, -1], scale: 1.6 },
    { sprite: 'seaweedShort', pos: [-1, -3.3, -2], scale: 1.4 },
    { sprite: 'coral', pos: [2, -3.2, -3], scale: 1.6 },
    { sprite: 'rockBrown', pos: [4.5, -3.4, -1], scale: 1.5 },
    { sprite: 'seaweedTall', pos: [7, -2.8, -3], scale: 2.3 },
    { sprite: 'seaweedShort', pos: [9.5, -3.3, -2], scale: 1.5, flip: true },
    { sprite: 'bubbleCluster', pos: [-4, 0, -1], scale: 1.2 },
    { sprite: 'bubbleCluster', pos: [3, 1, -1], scale: 1 },
    { sprite: 'bubbleCluster', pos: [-1, -1.5, -0.5], scale: 0.9 },
  ],
}

export const LEVELS: Level[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4]

/** Fetch a level by its zero-based index; undefined when out of range. */
export function getLevel(index: number): Level | undefined {
  return LEVELS[index]
}

/** Total number of levels (4). */
export const LEVEL_COUNT = LEVELS.length
