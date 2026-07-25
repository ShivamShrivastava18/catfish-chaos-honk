import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Vector3, type Group, type Mesh } from 'three'
import { BillboardSprite } from './BillboardSprite'
import { SPRITES } from './sprites'
import { useGame } from './store'
import { getPlayerPos } from './Player'
import { LEVELS, type FrySpawn, type Objective, type RevealMarker } from './levels'
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
 * L1 nursery reveal. The nest of eggs sits hidden UNDER the debris clump; once
 * the `afterObjective` (digging the clump) completes, LevelEnvironment drops the
 * debris props and this fades + scales the nursery into view beneath — the
 * clearly-visible payoff for clearing the silt. The detection mirrors
 * LevelEnvironment's (`objectiveIndex > afterObjective's index`) so the nest
 * appears exactly as the debris vanishes. Always mounted (so its useFrame keeps
 * driving the fade); opacity 0 keeps it invisible until revealed.
 */
function NurseryReveal({ reveal, objectives }: { reveal: RevealMarker; objectives: Objective[] }) {
  const groupRef = useRef<Group>(null)
  const doneIndex = useMemo(
    () => objectives.findIndex((o) => o.id === reveal.afterObjective),
    [objectives, reveal.afterObjective],
  )
  const [t, setT] = useState(0) // reveal progress 0..1

  useFrame((state, delta) => {
    const revealed = doneIndex >= 0 && useGame.getState().objectiveIndex > doneIndex
    const target = revealed ? 1 : 0
    setT((prev) => {
      if (Math.abs(prev - target) < 0.005) return prev === target ? prev : target
      return MathUtils.lerp(prev, target, 1 - Math.pow(0.015, delta))
    })
    const g = groupRef.current
    if (g) {
      const bob = Math.sin(state.clock.elapsedTime * 1.4) * 0.05 * t
      g.position.set(reveal.pos[0], reveal.pos[1] + bob, reveal.pos[2])
      g.scale.setScalar(0.55 + 0.45 * t) // gentle scale-in as it surfaces
    }
  })

  return (
    <Suspense fallback={null}>
      <group ref={groupRef} position={reveal.pos}>
        <BillboardSprite url={SPRITES[reveal.sprite]} scale={reveal.scale ?? 1.5} opacity={t} />
      </group>
    </Suspense>
  )
}

/** Per-fry deterministic scatter data — a fanned-out direction + timing offset. */
interface FryData {
  angle: number
  dist: number
  wobble: number
  delay: number
}

/** A single baby fish darting out of the cut net, then fading as it swims off. */
function Fry({ data, fry, releaseAt }: { data: FryData; fry: FrySpawn; releaseAt: number }) {
  const groupRef = useRef<Group>(null)
  const [op, setOp] = useState(0)
  const [flip, setFlip] = useState(false)
  const LIFE = 3.2 // seconds to swim clear of the net and dissolve

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    const local = state.clock.elapsedTime - releaseAt - data.delay
    if (local < 0) {
      g.visible = false
      return
    }
    const k = local / LIFE
    if (k >= 1) {
      g.visible = false
      setOp((p) => (p === 0 ? p : 0))
      return
    }
    g.visible = true
    const ease = 1 - Math.pow(1 - k, 2) // ease-out swim
    const tx = fry.target[0] + Math.cos(data.angle) * data.dist
    const ty = fry.target[1] + Math.sin(data.angle) * data.dist
    const wob = Math.sin(state.clock.elapsedTime * 6 + data.delay * 12) * data.wobble * (1 - k)
    g.position.set(
      fry.pos[0] + (tx - fry.pos[0]) * ease,
      fry.pos[1] + (ty - fry.pos[1]) * ease + wob * 0.12,
      fry.pos[2],
    )
    const facingRight = tx >= fry.pos[0]
    setFlip((prev) => (prev === facingRight ? prev : facingRight))
    // Fade in over the first sliver, hold, then fade out over the tail.
    const opacity = k < 0.15 ? k / 0.15 : k > 0.7 ? Math.max(0, (1 - k) / 0.3) : 1
    setOp((prev) => (Math.abs(prev - opacity) < 0.03 ? prev : opacity))
  })

  return (
    <Suspense fallback={null}>
      <group ref={groupRef}>
        <BillboardSprite url={SPRITES[fry.sprite]} scale={0.7} flipX={flip} opacity={op} />
      </group>
    </Suspense>
  )
}

/**
 * L2 net payoff. Once the `afterObjective` (cutting the net) completes, a little
 * school of fry bursts free and scatters away — a celebratory escape. Detection
 * mirrors the store's active-objective cursor; the school is released once, then
 * the fish self-remove as they finish swimming out.
 */
function FrySchool({ fry, objectives }: { fry: FrySpawn; objectives: Objective[] }) {
  const doneIndex = useMemo(
    () => objectives.findIndex((o) => o.id === fry.afterObjective),
    [objectives, fry.afterObjective],
  )
  const [releaseAt, setReleaseAt] = useState<number | null>(null)
  const flock = useMemo<FryData[]>(
    () =>
      Array.from({ length: fry.count }, (_, i) => ({
        angle: (i / fry.count) * Math.PI * 2 + Math.random() * 0.7,
        dist: 0.6 + Math.random() * 1.3,
        wobble: 0.35 + Math.random() * 0.5,
        delay: i * 0.13 + Math.random() * 0.1,
      })),
    [fry.count],
  )

  useFrame((state) => {
    if (releaseAt != null) return
    const released = doneIndex >= 0 && useGame.getState().objectiveIndex > doneIndex
    if (released) setReleaseAt(state.clock.elapsedTime)
  })

  if (releaseAt == null) return null
  return (
    <>
      {flock.map((f, i) => (
        <Fry key={i} data={f} fry={fry} releaseAt={releaseAt} />
      ))}
    </>
  )
}

/**
 * Guided-objectives root. While playing, renders the active breadcrumb for the
 * current level (the boss's bossHit is owned by the boss system). Across playing
 * AND the outro it also renders the level's environmental payoffs — L1's nursery
 * revealed beneath the dug debris and L2's fry escaping the cut net — so the
 * uncovered nest and freed school stay on screen through the closing lines. Wire
 * inside the Canvas/Scene.
 */
export function Objectives() {
  const gamePhase = useGame((s) => s.gamePhase)
  const levelIndex = useGame((s) => s.levelIndex)
  const objectiveIndex = useGame((s) => s.objectiveIndex)

  const inScene = gamePhase === 'playing' || gamePhase === 'outro'
  if (!inScene) return null
  const level = LEVELS[levelIndex]
  if (!level) return null

  const active = gamePhase === 'playing' ? level.objectives[objectiveIndex] : undefined
  const showBreadcrumb = active && active.kind !== 'bossHit'

  return (
    <>
      {showBreadcrumb && active && <ActiveObjective key={active.id} objective={active} />}
      {level.reveal && (
        <NurseryReveal key={`${level.id}-reveal`} reveal={level.reveal} objectives={level.objectives} />
      )}
      {level.fry && <FrySchool key={`${level.id}-fry`} fry={level.fry} objectives={level.objectives} />}
    </>
  )
}
