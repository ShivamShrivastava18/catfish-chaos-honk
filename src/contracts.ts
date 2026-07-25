/**
 * contracts.ts — the shared contract other agents build against for v2.
 *
 * No runtime behavior beyond exporting documentation strings. It is the single
 * reference for the core store, the level/story data shapes, and how the level
 * state machine flows. If code and this file disagree, code in store.ts /
 * levels.ts / story.ts wins and this file should be updated to match.
 */

// ---------------------------------------------------------------------------
// BillboardSprite  (src/BillboardSprite.tsx)  — unchanged from v1
// ---------------------------------------------------------------------------
export const BILLBOARD_SPRITE_CONTRACT = `
import { BillboardSprite } from './BillboardSprite'

interface BillboardSpriteProps {
  url: string                              // texture URL (e.g. SPRITES[key])
  position?: [number, number, number]      // default [0,0,0]
  scale?: number                           // default 1; larger image side == this many world units
  flipX?: boolean                          // default false; mirrors horizontally
  opacity?: number                         // default 1; material opacity (transparent + alphaTest 0.5)
}

Behavior: drei <Billboard> + unit <planeGeometry>; NearestFilter (pixel-crisp),
meshBasicMaterial transparent alphaTest 0.5 depthWrite false toneMapped false.
Aspect derived from the loaded image. useLoader SUSPENDS — wrap trees in <Suspense>.
`

// ---------------------------------------------------------------------------
// Data shapes  (src/story.ts + src/levels.ts)
// ---------------------------------------------------------------------------
export const DATA_SHAPES_CONTRACT = `
// --- src/story.ts ---
type Speaker = 'reginald' | 'hench' | 'citizen' | 'boss' | 'narrator'
interface DialogueLine { speaker: Speaker; name: string; portrait: SpriteKey | null; text: string }
interface Character   { id: string; name: string; portrait: SpriteKey }

export const REGINALD: Character
export const CHARACTERS: Record<string, Character>            // reginald, vinny, marla, sil, barnaby, paulie, della, vitale
export const L1_INTRO / L1_OUTRO ... L4_INTRO / L4_OUTRO: DialogueLine[]
export const HONK_LINE: DialogueLine                          // Reginald's 'HONK.' bark (portrait faceWink)
export const reginaldBark: (text: string) => DialogueLine     // wrap a plain string as a Reginald line
export const ENDING_STAT: string                              // WWF 84% freshwater stat (win-card kicker)
export const ENDING_SOURCE: string                            // 'WWF Living Planet Report 2020'

// --- src/levels.ts ---
type ObjectiveKind = 'grab' | 'deliver' | 'clear' | 'talk' | 'bossHit'
interface Objective {
  id: string
  kind: ObjectiveKind
  pos: [number, number, number]      // where the marker/arrow points
  target?: [number, number, number]  // 'deliver'/'bossHit' drop/aim point
  sprite?: SpriteKey                  // optional prop sprite for the objective object
  label: string                      // shown in the HUD checklist
  hint?: string                      // tutorial/controls hint for the ACTIVE objective
  doneLine?: string                  // Reginald bark spoken on completion (mid-level only)
}
interface PropPlacement { sprite: SpriteKey; pos: [number, number, number]; scale?: number; flip?: boolean }
interface Level {
  id: string; index: number; title: string; subtitle: string
  waterTint: string                  // per-level base water hue (distinct from waterColor(health))
  isBoss?: boolean                   // true only for L4
  hench: SpriteKey; citizen: SpriteKey
  intro: DialogueLine[]; outro: DialogueLine[]
  objectives: Objective[]            // ORDERED breadcrumb; only objectives[objectiveIndex] is targetable
  props: PropPlacement[]             // dense, deliberate environment layout
  path: [number, number][]          // (x,y) waypoints forming the swim lane
}

export const LEVELS: Level[]                 // [L1, L2, L3, L4]
export const LEVEL_COUNT: number             // 4
export function getLevel(index: number): Level | undefined
`

// ---------------------------------------------------------------------------
// Store  (src/store.ts)  — import { useGame, ... } from './store'
// ---------------------------------------------------------------------------
export const STORE_CONTRACT = `
export type GamePhase = 'title' | 'intro' | 'playing' | 'outro' | 'levelclear' | 'won'
export type { DialogueLine }                  // re-exported from ./story
export { ENDING_STAT, ENDING_SOURCE }         // re-exported from ./story

// Pure helpers
export function cosmeticLevel(health: number): 0 | 1 | 2   // 0-33->0, 34-66->1, 67-100->2
export function waterColor(health: number): THREE.Color    // sludge brown -> clear blue lerp

// Zustand store: const useGame = create<GameState>(...)
interface GameState {
  // ---- state ----
  gamePhase: GamePhase          // starts 'title'
  levelIndex: number            // 0..3, current level (index into LEVELS)
  objectiveIndex: number        // active objective in the current level; ONLY this one is completable
  riverHealth: number           // 0..100, PER-LEVEL, = round(objectivesDone / total * 100)
  currentLine: DialogueLine|null// active speech line (typewriter target); null when hidden
  dialogue: DialogueLine[]      // the active intro/outro sequence being played
  lineIndex: number             // cursor into dialogue[]
  honkPulse: number             // increments on honk() — subscribe to react (shake/sfx)

  // ---- actions ----
  startGame: () => void                 // title -> beginLevel(0)
  beginLevel: (i: number) => void       // load level i: phase 'intro', reset objective/health, show intro[0]
  startPlaying: () => void              // phase 'playing', clears dialogue/currentLine (auto at intro end)
  completeObjective: (id: string) => void // no-op unless phase==='playing' AND id===active objective id;
                                          //   advances objectiveIndex, raises riverHealth, barks doneLine;
                                          //   when the LAST objective completes -> phase 'outro' (plays outro)
  nextLevel: () => void                 // from 'levelclear': beginLevel(i+1), or phase 'won' after L4
  advanceDialogue: () => void           // intro/outro only: next line, else hand off (intro->playing, outro->levelclear)
  say: (line: DialogueLine) => void     // set currentLine, auto-clear after 2.6s (repeat calls reset timer)
  honk: () => void                      // honkPulse++ and say(HONK_LINE)
  reset: () => void                     // full reset to 'title', clears say timer
}

// Usage
const health = useGame((s) => s.riverHealth)
useGame.getState().honk()                       // imperative (keydown handler)
useGame.subscribe((s) => s.honkPulse)           // react to honks
// Active objective for markers/arrows:
//   const lvl = LEVELS[useGame((s)=>s.levelIndex)]
//   const active = lvl.objectives[useGame((s)=>s.objectiveIndex)]
`

// ---------------------------------------------------------------------------
// Level state machine flow
// ---------------------------------------------------------------------------
export const STATE_MACHINE_CONTRACT = `
title
  --startGame()-->            intro (level 0)
intro
  --advanceDialogue() xN-->   (walks intro[]) --auto at end--> startPlaying()
playing
  --completeObjective(id)-->  advances objectiveIndex + riverHealth (bark on doneLine)
  --last objective done-->    outro (auto)
outro
  --advanceDialogue() xN-->   (walks outro[]) --auto at end--> levelclear
levelclear
  --nextLevel()-->            intro (next level)  OR  won (after L4)
won                            terminal (win card: ENDING_STAT + ENDING_SOURCE)
reset() returns to title from anywhere.

Rendering rules for consumers:
- Only LEVELS[levelIndex].objectives[objectiveIndex] is targetable — draw its marker + a
  directional arrow from the player toward objective.pos.
- Speech UI binds to currentLine (DialogueLine). During intro/outro, an advance control
  (click / SPACE) calls advanceDialogue(). During playing, barks auto-clear via say().
- Base water hue = level.waterTint; clarity overlay = waterColor(riverHealth).
`

// ---------------------------------------------------------------------------
// Sprite manifest  (src/sprites.ts — owned by the sprites/art agent)
// ---------------------------------------------------------------------------
export const SPRITE_MANIFEST_CONTRACT = `
// src/sprites.ts exports:
//   export const SPRITES: Record<SpriteKey, string>   // key -> '/sprites/<key>.png'
//   export type SpriteKey = keyof typeof SPRITES
//   export const CITIZEN_KEYS / HENCH_KEYS / DECOR_KEYS: SpriteKey[]
// BillboardSprite consumes SPRITES[key] as its url. Every key points to a real file.
`

// ---------------------------------------------------------------------------
// Intended component wiring (v2)
// ---------------------------------------------------------------------------
export const WIRING_CONTRACT = `
App (Canvas + EffectComposer)
 ├─ Scene: base tint = level.waterTint, clarity = waterColor(riverHealth)
 │   └─ <Suspense> Player + level.props (BillboardSprite) + active-objective marker/arrow
 ├─ HUD (playing): objectives checklist (active + hint), river clarity bar
 ├─ DialogueBox (intro/outro): currentLine portrait+name+text; advance -> advanceDialogue()
 ├─ SpeechBubble: transient barks bound to currentLine during playing
 ├─ TitleScreen (title) -> startGame()
 ├─ LevelClear card (levelclear) -> nextLevel()
 └─ EndCard (won) -> ENDING_STAT + ENDING_SOURCE, reset()
Player: cosmeticLevel(riverHealth) overlay; completeObjective(activeId) on grab/deliver/clear/talk/bossHit.
`

/** Convenience: every contract string in one array (for logging/inspection). */
export const CONTRACTS = [
  BILLBOARD_SPRITE_CONTRACT,
  DATA_SHAPES_CONTRACT,
  STORE_CONTRACT,
  STATE_MACHINE_CONTRACT,
  SPRITE_MANIFEST_CONTRACT,
  WIRING_CONTRACT,
] as const
