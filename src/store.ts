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

interface GameState {
  crimes: Crime[]
  riverHealth: number // 0 (sludge) .. 100 (clear)
  completeCrime: (id: string) => void
  reset: () => void
}

export const useGame = create<GameState>((set) => ({
  crimes: INITIAL_CRIMES.map((c) => ({ ...c })),
  riverHealth: 0,
  completeCrime: (id) =>
    set((state) => {
      const crimes = state.crimes.map((c) => (c.id === id ? { ...c, done: true } : c))
      const doneCount = crimes.filter((c) => c.done).length
      return { crimes, riverHealth: Math.round((doneCount / crimes.length) * 100) }
    }),
  reset: () => set({ crimes: INITIAL_CRIMES.map((c) => ({ ...c })), riverHealth: 0 }),
}))

// Water color as a function of river health: sludge brown -> clear blue.
const SLUDGE = new Color('#5a4a2a')
const CLEAR = new Color('#06283d')
export function waterColor(health: number): Color {
  return SLUDGE.clone().lerp(CLEAR, health / 100)
}
