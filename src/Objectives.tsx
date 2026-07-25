import { Suspense, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group, type Mesh } from 'three'
import { BillboardSprite } from './BillboardSprite'
import { SPRITES } from './sprites'
import { useGame } from './store'
import { getPlayerPos } from './Player'
import { LEVELS, type Objective } from './levels'
import { ObjectiveArrow } from './objectiveArrow'

// Proximity thresholds (2D, in the X/Y swim plane — Z is cosmetic depth).
const GRAB_RANGE = 2.4 // grab / clear / auto-pickup radius
const TALK_RANGE = 2.6 // slightly roomier for conversational objectives
const DROP_RADIUS = 2.4 // how close a carried object must reach its target ring

const FOLLOW = new Vector3() // scratch carry-target for the held object

/**
 * The active-objective breadcrumb. Only the level's CURRENT objective
 * (store.objectiveIndex) is rendered and interactive; done ones are gone and
 * later ones stay hidden. A glowing ring marks the spot and an arrow points the
 * way. Handles grab / deliver / clear / talk; the boss's bossHit is owned by the
 * boss system, so this component sits it out.
 */
function ActiveObjective({ objective }: { objective: Objective }) {
  const groupRef = useRef<Group>(null)
  const markerRef = useRef<Mesh>(null)
  const pressRef = useRef(false)
  const carryingRef = useRef(false)
  const [carrying, setCarrying] = useState(false)

  const isDeliver = objective.kind === 'deliver'
  const range = objective.kind === 'talk' ? TALK_RANGE : GRAB_RANGE

  // SPACE = interact (grab / drop / clear / talk).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        pressRef.current = true
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useFrame((state, delta) => {
    const pressed = pressRef.current
    pressRef.current = false
    if (useGame.getState().gamePhase !== 'playing') return

    const g = groupRef.current
    const marker = markerRef.current
    const t = state.clock.elapsedTime
    const p = getPlayerPos()

    if (isDeliver) {
      const target = objective.target ?? objective.pos

      if (!carryingRef.current) {
        // The object waits at its spawn until Reginald swims into it.
        if (g) {
          g.position.set(objective.pos[0], objective.pos[1], objective.pos[2])
          g.scale.setScalar(1 + Math.sin(t * 6) * 0.08)
        }
        const d = Math.hypot(objective.pos[0] - p[0], objective.pos[1] - p[1])
        if (d < GRAB_RANGE) {
          carryingRef.current = true
          setCarrying(true)
        }
        placeMarker(marker, objective.pos, t, d < GRAB_RANGE)
      } else {
        // Carried: trail below Reginald and check the drop ring.
        if (g) {
          FOLLOW.set(p[0], p[1] - 0.5, p[2] + 0.4)
          g.position.lerp(FOLLOW, 1 - Math.pow(0.0006, delta))
          g.scale.setScalar(1)
        }
        const hx = g ? g.position.x : p[0]
        const hy = g ? g.position.y : p[1]
        const dropDist = Math.hypot(hx - target[0], hy - target[1])
        const near = dropDist < DROP_RADIUS
        placeMarker(marker, target, t, near)
        if (pressed && near) useGame.getState().completeObjective(objective.id)
      }
      return
    }

    // grab / clear / talk — swim in range, press SPACE.
    const d = Math.hypot(objective.pos[0] - p[0], objective.pos[1] - p[1])
    const near = d < range
    if (g) {
      g.position.set(objective.pos[0], objective.pos[1], objective.pos[2])
      g.scale.setScalar((near ? 1.1 : 1) + Math.sin(t * 7) * 0.08)
    }
    placeMarker(marker, objective.pos, t, near)
    if (pressed && near) useGame.getState().completeObjective(objective.id)
  })

  const arrowTo: [number, number, number] =
    isDeliver && carrying ? objective.target ?? objective.pos : objective.pos

  return (
    <>
      {objective.sprite && (
        <Suspense fallback={null}>
          <group ref={groupRef} position={objective.pos}>
            <BillboardSprite url={SPRITES[objective.sprite]} scale={1.3} />
          </group>
        </Suspense>
      )}
      <mesh ref={markerRef} visible={false}>
        <torusGeometry args={[1.15, 0.09, 8, 32]} />
        <meshBasicMaterial color="#ffd34d" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
      </mesh>
      <ObjectiveArrow to={arrowTo} />
    </>
  )
}

/** Position + animate the glowing objective ring; brighter when in range. */
function placeMarker(marker: Mesh | null, at: [number, number, number], t: number, near: boolean) {
  if (!marker) return
  marker.visible = true
  marker.position.set(at[0], at[1], at[2] + 0.05)
  marker.rotation.z = t * 0.8
  marker.scale.setScalar((near ? 1.18 : 1) + Math.sin(t * 4) * 0.12)
}

/**
 * Guided-objectives root. Renders the active breadcrumb for the current level
 * while playing; renders nothing otherwise. Wire inside the Canvas/Scene.
 */
export function Objectives() {
  const gamePhase = useGame((s) => s.gamePhase)
  const levelIndex = useGame((s) => s.levelIndex)
  const objectiveIndex = useGame((s) => s.objectiveIndex)

  if (gamePhase !== 'playing') return null
  const level = LEVELS[levelIndex]
  if (!level) return null
  const active = level.objectives[objectiveIndex]
  if (!active || active.kind === 'bossHit') return null

  return <ActiveObjective key={active.id} objective={active} />
}
