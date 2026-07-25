import { useRef, useState, useEffect, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Vector3, MathUtils } from 'three'
import { BillboardSprite } from './BillboardSprite'
import { SPRITES, type SpriteKey } from './sprites'
import { useGame } from './store'

// Play-area bounds (X/Y swimming plane). Player z stays fixed.
const BOUNDS = { minX: -15, maxX: 15, minY: -4, maxY: 11 }
const PLAYER_Z = 0
const MAX_SPEED = 9 // world units / sec
const ACCEL_LERP = 6 // velocity damping toward target (higher = snappier)
const DIR_THRESHOLD = 0.15 // min |vx| before flipping facing
const MOVE_THRESHOLD = 0.4 // min speed before the swim cycle engages
const HONK_FRAME_MS = 450
const SWIM_FPS = 6
const SCALE = 3.2

// Uniform-size swim frames — animated by BillboardSprite so tail/face never clip.
const SWIM_FRAMES = [SPRITES.reginaldSwim1, SPRITES.reginaldSwim2, SPRITES.reginaldSwim3]
// Last-stand body: hatless Reginald with a lit cigar (single frame, no swim cycle art).
const CIGAR_FRAMES = [SPRITES.reginaldCigar]

// Hat-float (defiant last stand): the top hat drifts up + away and fades out once.
const HAT_FLOAT_MS = 1400
const HAT_Y_OFFSET = 1.2 // start height above Reginald's head
const HAT_RISE = 3.4 // total upward drift
const HAT_DRIFT = 1.8 // sideways drift (toward facing)
const HAT_SCALE = SCALE * 0.55

// Module-level shared position so interaction/grabbable/boss features can read the
// player's location WITHOUT touching the store. Updated every frame.
const playerPos: [number, number, number] = [0, 2, PLAYER_Z]

/** Current player world position as a tuple. Safe to call from any feature. */
export function getPlayerPos(): [number, number, number] {
  return playerPos
}

interface HatState {
  on: boolean
  x: number
  y: number
  opacity: number
}

export function Player() {
  const groupRef = useRef<Group>(null)
  const { camera } = useThree()

  const velocity = useRef(new Vector3(0, 0, 0))
  const keys = useRef<Record<string, boolean>>({})
  const facingRight = useRef(true)
  const honkUntil = useRef(0)
  const lastHonkPulse = useRef(useGame.getState().honkPulse)

  const [swimming, setSwimming] = useState(false)
  const [stillFrame, setStillFrame] = useState<SpriteKey>('reginaldIdle')
  const [flipX, setFlipX] = useState(true)

  // --- last stand / hat-float reflection of store state ---
  const [lastChance, setLastChance] = useState(useGame.getState().lastChanceUsed ?? false)
  const [hat, setHat] = useState<HatState>({ on: false, x: 0, y: 0, opacity: 1 })
  // Drives the one-shot float animation without re-rendering on trigger.
  const hatFloat = useRef({ active: false, start: 0, ox: 0, oy: 0, dir: 1 })

  // Keyboard input.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // React to honks: briefly show the HONK pose.
  useEffect(() => {
    return useGame.subscribe((s) => {
      if (s.honkPulse !== lastHonkPulse.current) {
        lastHonkPulse.current = s.honkPulse
        honkUntil.current = performance.now() + HONK_FRAME_MS
      }
    })
  }, [])

  // Watch the boss last-chance state: mirror the hatless/cigar body and kick off the
  // one-shot hat-float the moment `reviving` flips true (first death). Guarded so the
  // component stays robust if these fields are ever absent from the store.
  useEffect(() => {
    return useGame.subscribe((s) => {
      const lc = s.lastChanceUsed ?? false
      setLastChance((prev) => (prev === lc ? prev : lc))
      const reviving = s.reviving ?? false
      if (reviving && !hatFloat.current.active) {
        hatFloat.current = {
          active: true,
          start: performance.now(),
          ox: playerPos[0],
          oy: playerPos[1],
          dir: facingRight.current ? 1 : -1,
        }
        setHat({ on: true, x: playerPos[0], y: playerPos[1] + HAT_Y_OFFSET, opacity: 1 })
      }
    })
  }, [])

  useFrame((_, rawDelta) => {
    const group = groupRef.current
    if (!group) return
    const delta = Math.min(rawDelta, 0.05) // clamp big frame gaps
    const phase = useGame.getState().gamePhase
    const now = performance.now()

    // --- Input -> target velocity (only while playing) ---
    let ix = 0
    let iy = 0
    if (phase === 'playing') {
      const k = keys.current
      if (k['a'] || k['arrowleft']) ix -= 1
      if (k['d'] || k['arrowright']) ix += 1
      if (k['w'] || k['arrowup']) iy += 1
      if (k['s'] || k['arrowdown']) iy -= 1
    }
    const len = Math.hypot(ix, iy)
    if (len > 0) {
      ix /= len
      iy /= len
    }
    const targetVx = ix * MAX_SPEED
    const targetVy = iy * MAX_SPEED

    // --- Damped velocity (smooth accel/decel) ---
    const t = 1 - Math.exp(-ACCEL_LERP * delta)
    velocity.current.x = MathUtils.lerp(velocity.current.x, targetVx, t)
    velocity.current.y = MathUtils.lerp(velocity.current.y, targetVy, t)

    // --- Integrate + clamp to play area ---
    group.position.x = MathUtils.clamp(
      group.position.x + velocity.current.x * delta,
      BOUNDS.minX,
      BOUNDS.maxX,
    )
    group.position.y = MathUtils.clamp(
      group.position.y + velocity.current.y * delta,
      BOUNDS.minY,
      BOUNDS.maxY,
    )
    group.position.z = PLAYER_Z

    playerPos[0] = group.position.x
    playerPos[1] = group.position.y
    playerPos[2] = group.position.z

    const speed = Math.hypot(velocity.current.x, velocity.current.y)
    const moving = speed > MOVE_THRESHOLD

    // --- Facing (flip toward horizontal travel) ---
    if (velocity.current.x > DIR_THRESHOLD && !facingRight.current) {
      facingRight.current = true
      setFlipX(true)
    } else if (velocity.current.x < -DIR_THRESHOLD && facingRight.current) {
      facingRight.current = false
      setFlipX(false)
    }

    // --- Pose (priority: won > honk > swim/idle) ---
    const won = phase === 'won'
    const honking = now < honkUntil.current
    const swim = !won && !honking && moving
    setSwimming((prev) => (prev === swim ? prev : swim))

    const next: SpriteKey = won ? 'reginaldFront' : honking ? 'reginaldHonk' : 'reginaldIdle'
    setStillFrame((prev) => (prev === next ? prev : next))

    // --- Hat float (one-shot on first boss death) ---
    if (hatFloat.current.active) {
      const hf = hatFloat.current
      const p = Math.min(1, (now - hf.start) / HAT_FLOAT_MS)
      const eased = 1 - (1 - p) * (1 - p) // ease-out
      const x = hf.ox + HAT_DRIFT * hf.dir * eased + Math.sin(p * 8) * 0.15
      const y = hf.oy + HAT_Y_OFFSET + HAT_RISE * eased
      const opacity = p < 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) / 0.7)
      setHat({ on: true, x, y, opacity })
      if (p >= 1) {
        hf.active = false
        setHat((h) => (h.on ? { ...h, on: false } : h))
        useGame.getState().endReviving?.()
      }
    }

    // --- Gentle camera follow, preserving App.tsx underwater framing ---
    const camT = 1 - Math.exp(-2.5 * delta)
    camera.position.x = MathUtils.lerp(camera.position.x, group.position.x * 0.7, camT)
    camera.position.y = MathUtils.lerp(camera.position.y, 4 + group.position.y * 0.35, camT)
    camera.position.z = MathUtils.lerp(camera.position.z, 14, camT)
    camera.lookAt(group.position.x * 0.7, group.position.y * 0.6, 0)
  })

  // During the last stand Reginald loses the hat and clenches a cigar — both swim and
  // still layers show the single cigar frame, so the cross-fade is a seamless no-op.
  const swimFrames = lastChance ? CIGAR_FRAMES : SWIM_FRAMES
  const swimFps = lastChance ? 0 : SWIM_FPS
  const stillUrl = lastChance ? SPRITES.reginaldCigar : SPRITES[stillFrame]

  // Two stacked layers (swim animation + still pose) cross-faded by opacity. Both
  // stay mounted so their textures preload once and pose swaps never re-suspend or
  // resize the plane — the source of the old tail/face clipping. The floating hat is
  // a world-space sibling so it drifts free of Reginald's continuing movement.
  return (
    <>
      <group ref={groupRef} position={[0, 2, PLAYER_Z]}>
        <Suspense fallback={null}>
          <BillboardSprite
            frames={swimFrames}
            fps={swimFps}
            scale={SCALE}
            flipX={flipX}
            opacity={swimming ? 1 : 0}
          />
        </Suspense>
        <Suspense fallback={null}>
          <BillboardSprite
            url={stillUrl}
            scale={SCALE}
            flipX={flipX}
            opacity={swimming ? 0 : 1}
          />
        </Suspense>
      </group>
      {hat.on && (
        <Suspense fallback={null}>
          <BillboardSprite
            url={SPRITES.topHat}
            position={[hat.x, hat.y, PLAYER_Z + 0.1]}
            scale={HAT_SCALE}
            opacity={hat.opacity}
          />
        </Suspense>
      )}
    </>
  )
}
