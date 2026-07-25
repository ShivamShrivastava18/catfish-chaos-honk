// Sprite manifest. Frames are sliced from the four sheets in assets/sprites/ by
// scripts/slice-sprites.mjs into public/sprites/ (served from the web root).
// Every key below points to a real, non-empty transparent PNG.
export const SPRITES = {
  // Reginald — swim/idle/honk share ONE uniform canvas so frame swaps never
  // resize or clip the body (tail/face). Extras + expression portraits follow.
  reginaldSwim1: '/sprites/reginaldSwim1.png',
  reginaldSwim2: '/sprites/reginaldSwim2.png',
  reginaldSwim3: '/sprites/reginaldSwim3.png',
  reginaldIdle: '/sprites/reginaldIdle.png',
  reginaldHonk: '/sprites/reginaldHonk.png',
  reginaldDead: '/sprites/reginaldDead.png',
  topHat: '/sprites/topHat.png',

  // Reginald v3 — defiant last stand: hat erased, then with a lit cigar.
  reginaldNoHat: '/sprites/reginaldNoHat.png',
  reginaldCigar: '/sprites/reginaldCigar.png',
  cigar: '/sprites/cigar.png',

  // Reginald face expressions (dialogue portraits + reactions).
  faceNeutral: '/sprites/faceNeutral.png',
  faceContent: '/sprites/faceContent.png',
  faceWink: '/sprites/faceWink.png',
  faceAngry: '/sprites/faceAngry.png',

  // Citizens (unhatted).
  citizenGuppy: '/sprites/citizenGuppy.png',
  citizenTetra: '/sprites/citizenTetra.png',
  citizenCory: '/sprites/citizenCory.png',
  citizenGourami: '/sprites/citizenGourami.png',
  citizenPuffer: '/sprites/citizenPuffer.png',
  citizenAngel: '/sprites/citizenAngel.png',
  citizenDiscus: '/sprites/citizenDiscus.png',
  citizenRasbora: '/sprites/citizenRasbora.png',

  // Henchmen (top-hatted gang members).
  henchGoldfish: '/sprites/henchGoldfish.png',
  henchKoi: '/sprites/henchKoi.png',
  henchClownfish: '/sprites/henchClownfish.png',
  henchBetta: '/sprites/henchBetta.png',
  henchPuffer: '/sprites/henchPuffer.png',
  henchAngel: '/sprites/henchAngel.png',

  // Boss.
  bossDonMan: '/sprites/bossDonMan.png',
  bossDonFish: '/sprites/bossDonFish.png',

  // Boss v3 — Don Vitale: fedora persona portrait + underwater SCUBA frames.
  vitalePersona: '/sprites/vitalePersona.png',
  vitaleScubaStand: '/sprites/vitaleScubaStand.png',
  vitaleScuba1: '/sprites/vitaleScuba1.png',
  vitaleScuba2: '/sprites/vitaleScuba2.png',
  vitaleScuba3: '/sprites/vitaleScuba3.png',

  // Level props v3.
  net: '/sprites/net.png',
  nursery: '/sprites/nursery.png',
  fry: '/sprites/fry.png',

  // Decor.
  seaweedTall: '/sprites/seaweedTall.png',
  seaweedShort: '/sprites/seaweedShort.png',
  rockBrown: '/sprites/rockBrown.png',
  rockGrey: '/sprites/rockGrey.png',
  lilyPad: '/sprites/lilyPad.png',
  coral: '/sprites/coral.png',
  bubbleCluster: '/sprites/bubbleCluster.png',

  // v4 environment decor — procedural pixel art for layered open-world levels.
  kelpA: '/sprites/kelpA.png',
  kelpB: '/sprites/kelpB.png',
  kelpC: '/sprites/kelpC.png',
  coralA: '/sprites/coralA.png',
  coralB: '/sprites/coralB.png',
  coralFan: '/sprites/coralFan.png',
  rockBig: '/sprites/rockBig.png',
  rockFlat: '/sprites/rockFlat.png',
  rockPile: '/sprites/rockPile.png',
  sunkenPillar: '/sprites/sunkenPillar.png',
  sunkenTire: '/sprites/sunkenTire.png',
  sunkenCrate: '/sprites/sunkenCrate.png',
  driftwood: '/sprites/driftwood.png',
  shellCluster: '/sprites/shellCluster.png',
  anemone: '/sprites/anemone.png',
  lilyPadBig: '/sprites/lilyPadBig.png',
  bgReeds: '/sprites/bgReeds.png',
  bgRidge: '/sprites/bgRidge.png',
  lightShaftSoft: '/sprites/lightShaftSoft.png',
  causticTile: '/sprites/causticTile.png',

  // v4 UI assets — bubble health sprites + gentleman's-salvage ornaments.
  bubbleFull: '/sprites/bubbleFull.png',
  bubbleEmpty: '/sprites/bubbleEmpty.png',
  bubbleCigar: '/sprites/bubbleCigar.png',
  panelCorner: '/sprites/panelCorner.png',
  ribbon: '/sprites/ribbon.png',

  // Back-compat aliases for the pre-v2 scene (map onto v2 assets). Safe to drop
  // once every consumer references the contract keys above.
  reginaldFront: '/sprites/reginaldIdle.png',
  rock: '/sprites/rockBrown.png',
  cattail: '/sprites/seaweedShort.png',
} as const;

export type SpriteKey = keyof typeof SPRITES;

export const CITIZEN_KEYS: SpriteKey[] = [
  'citizenGuppy',
  'citizenTetra',
  'citizenCory',
  'citizenGourami',
  'citizenPuffer',
  'citizenAngel',
  'citizenDiscus',
  'citizenRasbora',
];

export const HENCH_KEYS: SpriteKey[] = [
  'henchGoldfish',
  'henchKoi',
  'henchClownfish',
  'henchBetta',
  'henchPuffer',
  'henchAngel',
];

// Don Vitale's underwater swim cycle (v3 boss fight).
export const BOSS_SCUBA_FRAMES: SpriteKey[] = [
  'vitaleScuba1',
  'vitaleScuba2',
  'vitaleScuba3',
];

export const DECOR_KEYS: SpriteKey[] = [
  'seaweedTall',
  'seaweedShort',
  'rockBrown',
  'rockGrey',
  'lilyPad',
  'coral',
  'bubbleCluster',
];

// v4 open-world environment decor. Split by layer role so scenes can compose a
// far BACKGROUND (bgReeds/bgRidge), a parallax MID and a detailed FOREGROUND.
export const ENV_DECOR_KEYS: SpriteKey[] = [
  'kelpA',
  'kelpB',
  'kelpC',
  'coralA',
  'coralB',
  'coralFan',
  'rockBig',
  'rockFlat',
  'rockPile',
  'sunkenPillar',
  'sunkenTire',
  'sunkenCrate',
  'driftwood',
  'shellCluster',
  'anemone',
  'lilyPadBig',
  'bgReeds',
  'bgRidge',
  'lightShaftSoft',
  'causticTile',
];

// v4 HUD / card ornament + bubble-health sprites.
export const UI_KEYS: SpriteKey[] = [
  'bubbleFull',
  'bubbleEmpty',
  'bubbleCigar',
  'panelCorner',
  'ribbon',
];
