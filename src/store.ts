import { create } from 'zustand'
import { Color } from 'three'

export interface Crime {
  id: string
  label: string
  done: boolean
}

const INITIAL_CRIMES: Crime[] = [
  { id: 'barrels', label: 'Return the toxic barrels to the boss’s lawn', done: false },
  { id: 'pipe', label: 'Yank the outflow pipe loose', done: false },
  { id: 'boat', label: 'Capsize the poacher’s boat', done: false },
  { id: 'sign', label: 'Steal the CONDOS sign', done: false },
  { id: 'toupee', label: 'Snatch the mayor’s toupee', done: false },
]

/** Exact spec dialogue barks, keyed by crime id. */
export const CRIME_DIALOGUE: Record<string, string> = {
  barrels: 'You dropped these. On my carpet.',
  pipe: 'Plumbing is a privilege, not a right.',
  boat: 'A gentleman always sees his guests out.',
  sign: "'Coming soon.' How optimistic.",
  toupee: "I'll be needing that.",
}

/** Line shown on the ending card once the river is clean. */
export const ENDING_LINE = 'Good day. The river thanks you. I do not.'

export type GamePhase = 'title' | 'playing' | 'won'

const SAY_DURATION = 2500
let sayTimer: ReturnType<typeof setTimeout> | null = null

interface GameState {
  crimes: Crime[]
  riverHealth: number // 0 (sludge) .. 100 (clear)
  gamePhase: GamePhase
  currentLine: string | null
  honkPulse: number

  completeCrime: (id: string) => void
  reset: () => void
  setGamePhase: (p: GamePhase) => void
  startGame: () => void
  say: (line: string) => void
  clearLine: () => void
  honk: () => void
}

export const useGame = create<GameState>((set, get) => ({
  crimes: INITIAL_CRIMES.map((c) => ({ ...c })),
  riverHealth: 0,
  gamePhase: 'title',
  currentLine: null,
  honkPulse: 0,

  completeCrime: (id) => {
    set((state) => {
      const crimes = state.crimes.map((c) => (c.id === id ? { ...c, done: true } : c))
      const doneCount = crimes.filter((c) => c.done).length
      const allDone = doneCount === crimes.length
      return {
        crimes,
        riverHealth: Math.round((doneCount / crimes.length) * 100),
        gamePhase: allDone ? ('won' as GamePhase) : state.gamePhase,
      }
    })
    const line = CRIME_DIALOGUE[id]
    if (line) get().say(line)
  },

  reset: () => {
    if (sayTimer) {
      clearTimeout(sayTimer)
      sayTimer = null
    }
    set({
      crimes: INITIAL_CRIMES.map((c) => ({ ...c })),
      riverHealth: 0,
      gamePhase: 'title',
      currentLine: null,
      honkPulse: 0,
    })
  },

  setGamePhase: (p) => set({ gamePhase: p }),

  startGame: () => set({ gamePhase: 'playing' }),

  say: (line) => {
    if (sayTimer) clearTimeout(sayTimer)
    set({ currentLine: line })
    sayTimer = setTimeout(() => {
      sayTimer = null
      set({ currentLine: null })
    }, SAY_DURATION)
  },

  clearLine: () => {
    if (sayTimer) {
      clearTimeout(sayTimer)
      sayTimer = null
    }
    set({ currentLine: null })
  },

  honk: () => {
    set((state) => ({ honkPulse: state.honkPulse + 1 }))
    get().say('HONK.')
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
