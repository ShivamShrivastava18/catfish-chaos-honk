import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3, MathUtils } from 'three'
import { BillboardSprite } from './BillboardSprite'
import { SPRITES, type SpriteKey } from './sprites'
import type { Speaker } from './story'
import { LEVELS } from './levels'
import { useGame } from './store'
import { getPlayerPos } from './Player'

/**
 * IntroActors — during a level's INTRO the henchman + citizen fish (Vitale for the
 * boss) SWIM IN from offscreen toward Reginald, idle-bob beside him while the
 * dialogue plays, and swim back out when play starts. Whoever is currently
 * speaking (store.currentLine.speaker) is gently emphasised (scaled up).
 *
 * This is an R3F component (renders BillboardSprites) so it MUST be mounted inside
 * the <Canvas>, NOT from Cutscene (an HTML overlay). It self-gates on gamePhase,
 * so mounting it unconditionally in the Canvas is safe.
 */

type FromSide = 'left' | 'right' | 'top'

interface ActorDef {
  key: SpriteKey
  speaker: Speaker
  from: FromSide
  offset: [number, number, number] // home, relative to Reginald's live position
  flipX: boolean
  scale: number
}

const OFF_X = 22 // how far offscreen (horizontal) actors start / exit to
const OFF_Y = 16 // how far above (Vitale drops in from the dock/surface)
const EXIT_MS = 900 // keep mounted this long after intro ends, to swim out

function Actor({ def }: { def: ActorDef }) {
  const groupRef = useRef<Group>(null)
  const base = useRef(new Vector3())
  const started = useRef(false)
  const bobPhase = useRef(Math.random() * Math.PI * 2)

  // All the fish sheets (henchmen + citizens) are drawn facing RIGHT natively,
  // so mirror only when we want the actor to face LEFT.

  // Live horizontal facing: start facing the way we swim in (toward the home slot).
  const [facingRight, setFacingRight] = useState(def.offset[0] < 0)
  const facingRef = useRef(facingRight)

  useFrame((state, raw) => {
    const g = groupRef.current
    if (!g) return
    const delta = Math.min(raw, 0.05)
    const st = useGame.getState()
    const intro = st.gamePhase === 'intro'
    const p = getPlayerPos()

    const hx = p[0] + def.offset[0]
    const hy = p[1] + def.offset[1]
    const hz = def.offset[2]

    // Seed the start position offscreen on the very first frame.
    if (!started.current) {
      started.current = true
      if (def.from === 'left') base.current.set(p[0] - OFF_X, hy, hz)
      else if (def.from === 'right') base.current.set(p[0] + OFF_X, hy, hz)
      else base.current.set(hx, p[1] + OFF_Y, hz)
    }

    // Target: swim to the home slot during intro, swim back offscreen otherwise.
    let tx = hx
    let ty = hy
    if (!intro) {
      if (def.from === 'left') tx = p[0] - OFF_X
      else if (def.from === 'right') tx = p[0] + OFF_X
      else ty = p[1] + OFF_Y
    }

    // Face the direction of horizontal travel while swimming; once settled,
    // turn to face Reginald. Only commit to state on an actual flip.
    const vx = tx - base.current.x
    const desiredRight = Math.abs(vx) > 0.05 ? vx > 0 : p[0] - base.current.x > 0
    if (desiredRight !== facingRef.current) {
      facingRef.current = desiredRight
      setFacingRight(desiredRight)
    }

    const t = 1 - Math.exp(-3.2 * delta)
    base.current.x = MathUtils.lerp(base.current.x, tx, t)
    base.current.y = MathUtils.lerp(base.current.y, ty, t)
    base.current.z = hz

    // Idle-bob once settled near the home slot.
    const arrived = intro && Math.abs(base.current.x - hx) < 1.4 && Math.abs(base.current.y - hy) < 1.4
    const bob = Math.sin(state.clock.elapsedTime * 2 + bobPhase.current) * (arrived ? 0.18 : 0.05)
    g.position.set(base.current.x, base.current.y + bob, base.current.z)

    // Emphasise the current speaker.
    const speaking = intro && st.currentLine?.speaker === def.speaker
    const targetScale = speaking ? 1.16 : 0.98
    const s = MathUtils.lerp(g.scale.x, targetScale, 1 - Math.exp(-8 * delta))
    g.scale.setScalar(s)
  })

  return (
    <group ref={groupRef}>
      <Suspense fallback={null}>
        <BillboardSprite
          url={SPRITES[def.key]}
          scale={def.scale}
          flipX={!facingRight}
        />
      </Suspense>
    </group>
  )
}

export function IntroActors() {
  const gamePhase = useGame((s) => s.gamePhase)
  const levelIndex = useGame((s) => s.levelIndex)
  const [render, setRender] = useState(false)

  // Mount during intro; linger EXIT_MS afterward so actors can swim out.
  useEffect(() => {
    if (gamePhase === 'intro') {
      setRender(true)
      return
    }
    const id = setTimeout(() => setRender(false), EXIT_MS)
    return () => clearTimeout(id)
  }, [gamePhase])

  const level = LEVELS[levelIndex]

  const actors = useMemo<ActorDef[]>(() => {
    if (!level) return []
    const defs: ActorDef[] = []
    if (level.isBoss) {
      // Boss intro: just Don Vitale, dropping in from the dock above. No henchman
      // flanking — the final confrontation is Reginald vs. Vitale, one on one.
      defs.push({ key: 'vitaleScubaStand', speaker: 'boss', from: 'top', offset: [0, 2.2, 0.6], flipX: false, scale: 2.6 })
      return defs
    }
    if (SPRITES[level.hench]) {
      defs.push({ key: level.hench, speaker: 'hench', from: 'left', offset: [-3.6, -0.4, 0.5], flipX: true, scale: 2.5 })
    }
    if (SPRITES[level.citizen]) {
      defs.push({ key: level.citizen, speaker: 'citizen', from: 'right', offset: [3.6, -0.4, 0.5], flipX: false, scale: 2.5 })
    }
    return defs
  }, [level])

  if (!render || !level || actors.length === 0) return null

  return (
    <>
      {actors.map((d, i) => (
        <Actor key={`${level.id}-${d.key}-${i}`} def={d} />
      ))}
    </>
  )
}
