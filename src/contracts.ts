/**
 * contracts.ts — the shared contract other agents build against.
 *
 * This module has NO runtime behavior beyond exporting documentation strings.
 * It is the single reference for how the core store, BillboardSprite, the
 * sprite manifest, and the component wiring fit together. Treat the signatures
 * here as authoritative; if code and this file disagree, code in store.ts /
 * BillboardSprite.tsx wins and this file should be updated to match.
 */

// ---------------------------------------------------------------------------
// BillboardSprite  (src/BillboardSprite.tsx)
// ---------------------------------------------------------------------------
export const BILLBOARD_SPRITE_CONTRACT = `
import { BillboardSprite } from './BillboardSprite'

interface BillboardSpriteProps {
  url: string                              // texture URL (import the .webp / sliced frame and pass its URL)
  position?: [number, number, number]      // default [0,0,0]
  scale?: number                           // default 1; larger image side == this many world units
  flipX?: boolean                          // default false; true mirrors horizontally (left-facing -> right)
  opacity?: number                         // default 1; material opacity (transparent + alphaTest 0.5)
}

Behavior:
- Renders a drei <Billboard> (always faces the camera) containing a unit <planeGeometry>.
- Texture: NearestFilter min/mag, generateMipmaps=false, SRGBColorSpace -> pixel-crisp.
- Material: meshBasicMaterial, transparent, alphaTest=0.5, depthWrite=false, toneMapped=false.
- Aspect: plane w/h derived from texture.image dimensions; larger side normalized to 1, then * scale.
- Loading: uses useLoader(TextureLoader) which SUSPENDS. Callers MUST wrap trees of
  BillboardSprite in a <Suspense fallback={...}> boundary (inside the R3F Canvas).
`

// ---------------------------------------------------------------------------
// Store  (src/store.ts)  — import { useGame, ... } from './store'
// ---------------------------------------------------------------------------
export const STORE_CONTRACT = `
export interface Crime { id: string; label: string; done: boolean }
export type GamePhase = 'title' | 'playing' | 'won'

// Exported constants
export const CRIME_DIALOGUE: Record<string, string>  // crime id -> exact spec bark
export const ENDING_LINE: string                      // shown on the win card

// Exported pure helpers
export function cosmeticLevel(health: number): 0 | 1 | 2  // 0-33->0, 34-66->1, 67-100->2
export function waterColor(health: number): THREE.Color   // sludge brown -> clear blue lerp

// Zustand store: const useGame = create<GameState>(...)
interface GameState {
  // state
  crimes: Crime[]                 // 5 crimes: barrels, pipe, boat, sign, toupee
  riverHealth: number             // 0..100, = round(done/total * 100)
  gamePhase: GamePhase            // starts 'title'
  currentLine: string | null      // active speech-bubble line, null when hidden
  honkPulse: number               // increments on each honk() — subscribe to react (shake/sfx)

  // actions
  completeCrime: (id: string) => void  // marks done, updates riverHealth, say()s CRIME_DIALOGUE[id];
                                       //   when ALL done -> gamePhase 'won'
  reset: () => void                    // full reset incl. gamePhase 'title', clears say timer
  setGamePhase: (p: GamePhase) => void
  startGame: () => void                // gamePhase -> 'playing'
  say: (line: string) => void          // set currentLine, auto-clear after 2.5s (repeat calls reset timer)
  clearLine: () => void                // clear currentLine + cancel timer now
  honk: () => void                     // honkPulse++ and say('HONK.')
}

// Usage
const health = useGame((s) => s.riverHealth)
useGame.getState().honk()             // imperative (e.g. from a keydown handler)
useGame.subscribe((s) => s.honkPulse) // react to honks
`

// ---------------------------------------------------------------------------
// Sprite manifest  (src/sprites.ts — owned by the sprites/art agent)
// ---------------------------------------------------------------------------
export const SPRITE_MANIFEST_CONTRACT = `
// src/sprites.ts is expected to export:
//   export type SpriteKey = 'catfish-swim-1' | 'catfish-honk' | 'barrel' | ... (string union)
//   export interface SpriteEntry { url: string; w?: number; h?: number }  // url = sliced-frame URL
//   export const SPRITES: Record<SpriteKey, SpriteEntry>
//
// BillboardSprite consumes SpriteEntry.url directly:
//   <BillboardSprite url={SPRITES[key].url} ... />
// BillboardSprite derives aspect from the loaded image, so w/h in the manifest
// are optional/advisory only.
`

// ---------------------------------------------------------------------------
// Intended component wiring
// ---------------------------------------------------------------------------
export const WIRING_CONTRACT = `
App (Canvas + EffectComposer)          [exists]
 ├─ Scene (fog/light/particles/riverbed; reads riverHealth via waterColor)  [exists]
 │   └─ <Suspense> Player + Grabbables + Townsfolk  (all BillboardSprite)
 ├─ HUD (crimes checklist, clarity bar)  [exists; extend for phases]
 │   ├─ title screen when gamePhase==='title'  -> startGame()
 │   ├─ HONK button -> useGame.getState().honk()
 │   ├─ speech bubble bound to currentLine
 │   └─ ending card when gamePhase==='won' -> ENDING_LINE + real stat
 │
 Player: cosmeticLevel(riverHealth) selects monocle/cane sprite overlay;
         calls completeCrime(id) on grab-drag drop; flipX by swim direction.
 Grabbables: one per crime id; distance check to drop zone -> completeCrime(id).
`

/** Convenience: every contract string in one array (for logging/inspection). */
export const CONTRACTS = [
  BILLBOARD_SPRITE_CONTRACT,
  STORE_CONTRACT,
  SPRITE_MANIFEST_CONTRACT,
  WIRING_CONTRACT,
] as const
