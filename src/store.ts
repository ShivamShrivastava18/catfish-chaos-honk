import { create } from 'zustand'
import { Color } from 'three'
import { LEVELS } from './levels'
import { HONK_LINE, reginaldBark, ENDING_STAT, ENDING_SOURCE, type DialogueLine } from './story'

export { ENDING_STAT, ENDING_SOURCE }
export type { DialogueLine }

/**
 * gamePhase drives the whole game loop:
 *   title    -> startGame()      -> intro (level 0)
 *   intro    -> advanceDialogue()-> ... -> startPlaying()  (auto at end of intro)
 *   playing  -> completeObjective() x N -> outro           (auto when all done)
 *   outro    -> advanceDialogue()-> ... -> levelclear       (auto at end of outro)
 *   levelclear -> nextLevel()    -> intro (next level) OR won (after L4)
 */
export type GamePhase = 'title' | 'intro' | 'playing' | 'outro' | 'levelclear' | 'won'

const SAY_DURATION = 2600
let sayTimer: ReturnType<typeof setTimeout> | null = null

function clearSayTimer() {
  if (sayTimer) {
    clearTimeout(sayTimer)
    sayTimer = null
  }
}

interface GameState {
  gamePhase: GamePhase
  levelIndex: number // 0..LEVELS.length-1
  objectiveIndex: number // active objective within the current level
  riverHealth: number // 0..100, per-level, driven by objectives completed
  currentLine: DialogueLine | null // active speech line (typewriter target)
  dialogue: DialogueLine[] // active intro/outro sequence
  lineIndex: number // cursor into `dialogue`
  honkPulse: number // increments on honk() — subscribe to react (shake/sfx)

  startGame: () => void
  beginLevel: (i: number) => void
  startPlaying: () => void
  completeObjective: (id: string) => void
  nextLevel: () => void
  advanceDialogue: () => void
  say: (line: DialogueLine) => void
  honk: () => void
  reset: () => void
}

const CLEAN_SLATE = {
  gamePhase: 'title' as GamePhase,
  levelIndex: 0,
  objectiveIndex: 0,
  riverHealth: 0,
  currentLine: null as DialogueLine | null,
  dialogue: [] as DialogueLine[],
  lineIndex: 0,
  honkPulse: 0,
}

export const useGame = create<GameState>((set, get) => ({
  ...CLEAN_SLATE,

  startGame: () => get().beginLevel(0),

  beginLevel: (i) => {
    clearSayTimer()
    const level = LEVELS[i]
    const intro = level ? level.intro : []
    set({
      gamePhase: 'intro',
      levelIndex: i,
      objectiveIndex: 0,
      riverHealth: 0,
      dialogue: intro,
      lineIndex: 0,
      currentLine: intro.length > 0 ? intro[0] : null,
    })
  },

  startPlaying: () => {
    clearSayTimer()
    set({ gamePhase: 'playing', dialogue: [], lineIndex: 0, currentLine: null })
  },

  completeObjective: (id) => {
    const { gamePhase, levelIndex, objectiveIndex } = get()
    if (gamePhase !== 'playing') return
    const level = LEVELS[levelIndex]
    if (!level) return
    const active = level.objectives[objectiveIndex]
    // Only the active breadcrumb objective is completable.
    if (!active || active.id !== id) return

    const nextIndex = objectiveIndex + 1
    const total = level.objectives.length
    const riverHealth = Math.round((nextIndex / total) * 100)

    if (nextIndex >= total) {
      // Level solved — roll straight into the outro sequence.
      clearSayTimer()
      set({
        objectiveIndex: nextIndex,
        riverHealth,
        gamePhase: 'outro',
        dialogue: level.outro,
        lineIndex: 0,
        currentLine: level.outro.length > 0 ? level.outro[0] : null,
      })
    } else {
      set({ objectiveIndex: nextIndex, riverHealth })
      if (active.doneLine) get().say(reginaldBark(active.doneLine))
    }
  },

  nextLevel: () => {
    const { levelIndex } = get()
    const next = levelIndex + 1
    if (next < LEVELS.length) {
      get().beginLevel(next)
    } else {
      clearSayTimer()
      set({ gamePhase: 'won', currentLine: null, dialogue: [], lineIndex: 0 })
    }
  },

  advanceDialogue: () => {
    const { gamePhase, dialogue, lineIndex } = get()
    if (gamePhase !== 'intro' && gamePhase !== 'outro') return
    const next = lineIndex + 1
    if (next < dialogue.length) {
      set({ lineIndex: next, currentLine: dialogue[next] })
      return
    }
    // End of the sequence — hand off to the next phase.
    if (gamePhase === 'intro') {
      get().startPlaying()
    } else {
      set({ gamePhase: 'levelclear', currentLine: null, dialogue: [], lineIndex: 0 })
    }
  },

  say: (line) => {
    clearSayTimer()
    set({ currentLine: line })
    sayTimer = setTimeout(() => {
      sayTimer = null
      set({ currentLine: null })
    }, SAY_DURATION)
  },

  honk: () => {
    set((s) => ({ honkPulse: s.honkPulse + 1 }))
    get().say(HONK_LINE)
  },

  reset: () => {
    clearSayTimer()
    set({ ...CLEAN_SLATE })
  },
}))

/** Cosmetic tier from river health: 0 (bare) -> 1 (monocle) -> 2 (monocle + cane). */
export function cosmeticLevel(health: number): 0 | 1 | 2 {
  if (health >= 67) return 2
  if (health >= 34) return 1
  return 0
}

// Water color as a function of river health: sludge brown -> clear blue.
const SLUDGE = new Color('#5a4a2a')
const CLEAR = new Color('#06283d')
export function waterColor(health: number): Color {
  return SLUDGE.clone().lerp(CLEAR, health / 100)
}
