// Sprite manifest. Frames are sliced from assets/sprites/catfish-spritesheet.webp
// by scripts/slice-sprites.mjs into public/sprites/ (served from the web root).
export const SPRITES = {
  reginaldSwim1: '/sprites/reginaldSwim1.png',
  reginaldSwim2: '/sprites/reginaldSwim2.png',
  reginaldSwim3: '/sprites/reginaldSwim3.png',
  reginaldFront: '/sprites/reginaldFront.png',
  reginaldHonk: '/sprites/reginaldHonk.png',
  reginaldDead: '/sprites/reginaldDead.png',
  rock: '/sprites/rock.png',
  cattail: '/sprites/cattail.png',
  topHat: '/sprites/topHat.png',
  fullSheet: '/sprites/fullSheet.png',
} as const;

export type SpriteKey = keyof typeof SPRITES;
