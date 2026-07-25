import type { SpriteKey } from './sprites'

/** A physical object tied to a crime id (matches store crime ids exactly). */
export interface CrimeObject {
  id: string
  /** Where the object starts, spread around the riverbed. */
  spawn: [number, number, number]
  /** Where Reginald must drag it (the town/bank), higher Y or off to a side. */
  dropZone: [number, number, number]
  /** A sprite key from the manifest, or a fallback colored box for missing props. */
  sprite: SpriteKey | { color: string }
  label: string
}

// ids MUST match store crimes: barrels, pipe, boat, sign, toupee.
export const CRIME_OBJECTS: CrimeObject[] = [
  {
    id: 'barrels',
    spawn: [-9, -3, 1],
    dropZone: [11, 4, -3],
    sprite: { color: '#8aa02e' }, // toxic sludge green
    label: 'Toxic barrels',
  },
  {
    id: 'pipe',
    spawn: [7, -4, -2],
    dropZone: [12, 3, 3],
    sprite: { color: '#8a8f96' }, // grey outflow pipe
    label: 'Outflow pipe',
  },
  {
    id: 'boat',
    spawn: [-3, -2, 4],
    dropZone: [-11, 5, -2],
    sprite: { color: '#7a4a24' }, // wooden hull
    label: "Poacher's boat",
  },
  {
    id: 'sign',
    spawn: [9, -3, 3],
    dropZone: [12, 5, -5],
    sprite: { color: '#dfe7ef' }, // CONDOS sign board
    label: 'CONDOS sign',
  },
  {
    id: 'toupee',
    spawn: [1, -1, -4],
    dropZone: [0, 6, -2],
    sprite: 'topHat', // stand-in prop for the mayor's toupee
    label: "Mayor's toupee",
  },
]
