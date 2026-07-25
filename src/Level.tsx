import { Suspense } from 'react'
import { useGame } from './store'
import { LEVELS } from './levels'
import { LevelEnvironment } from './LevelEnvironment'
import { Objectives } from './Objectives'
import { Player } from './Player'
import { Boss } from './Boss'

/**
 * Per-level renderer (3D — mount INSIDE the Canvas).
 * Renders the active level's authored world + the guided-objective system +
 * Reginald, and the boss fight on boss levels. All children self-gate on
 * gamePhase / levelIndex, so Level itself just assembles them.
 */
export function Level() {
  const levelIndex = useGame((s) => s.levelIndex)
  const level = LEVELS[levelIndex]
  if (!level) return null

  return (
    <group>
      <LevelEnvironment />
      <Suspense fallback={null}>
        <Player />
        <Objectives />
        {level.isBoss && <Boss />}
      </Suspense>
    </group>
  )
}
