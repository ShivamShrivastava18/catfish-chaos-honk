// Boss.tsx — L4 "Sleep With The Fishes" final fight.
// Don Vitale stands on the dock ABOVE the waterline (rendered by the level's
// bossDonMan prop). He telegraphs, then DROPS waste barrels that sink toward the
// player. Dodge them; a barrel that settles on the seabed becomes grabbable —
// press SPACE to grab it, SPACE again to HURL it up at the Don. Three good hits
// end the fight (each hit completes the active bossHit objective; the store rolls
// into the victory outro on the third). Renders only on the boss level.
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3, MathUtils, type Mesh, type MeshStandardMaterial, type MeshBasicMaterial } from 'three'
import { useGame } from './store'
import { getPlayerPos } from './Player'
import { LEVELS } from './levels'

// --- Fight geometry ---
const BOSS = new Vector3(0, 6, 0) // aim point on the dock (matches bossDonMan prop)
const DOCK_Y = 5.4 // where dropped barrels spawn
const SEABED_Y = -2.6 // where falling barrels settle (become grabbable)
const DROP_MIN_X = -9
const DROP_MAX_X = 9

// --- Tuning ---
const POOL = 10
const FALL_GRAV = -7 // sink acceleration
const FALL_TERMINAL = -6
const THROW_SPEED = 17
const THROW_GRAV = -3 // gentle arc on thrown barrels
const GRAB_R = 2.3 // reach to a resting barrel
const PLAYER_HIT_R = 1.15 // a falling barrel this close clips the player
const BOSS_HIT_R = 2.4 // a thrown barrel this close counts as a hit
const HIT_INVULN = 0.45 // debounce so one throw = one hit

// Escalating, breadcrumbed difficulty by hits landed (0,1,2).
const DROP_INTERVAL = [2.6, 2.1, 1.6]
const TELEGRAPH_TIME = [1.1, 0.9, 0.72]

// --- Barrel colors ---
const BARREL_BASE = '#435a37'
const HAZARD = '#ff7a1a' // falling / thrown = dangerous glow
const GRABBABLE = '#39ff88' // resting = grab-me glow

type BarrelState = 'idle' | 'falling' | 'resting' | 'held' | 'thrown'
interface Barrel {
  state: BarrelState
  pos: Vector3
  vel: Vector3
}

interface Puff {
  active: boolean
  t: number
  life: number
  pos: Vector3
  impact: boolean // true = orange boss impact, false = blue splash
}

// --- Screen shake (imperative DOM, self-contained) ---
const SHAKE_STYLE_ID = 'boss-shake-style'
function ensureShakeStyle() {
  if (typeof document === 'undefined' || document.getElementById(SHAKE_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = SHAKE_STYLE_ID
  el.textContent = `
@keyframes boss-shake-heavy {
  0%{transform:translate(0,0)}20%{transform:translate(-10px,6px) rotate(-0.8deg)}
  40%{transform:translate(9px,-7px) rotate(0.7deg)}60%{transform:translate(-6px,-4px) rotate(-0.5deg)}
  80%{transform:translate(5px,6px) rotate(0.3deg)}100%{transform:translate(0,0)}}
@keyframes boss-shake-lite {
  0%{transform:translate(0,0)}30%{transform:translate(-4px,3px)}60%{transform:translate(3px,-3px)}100%{transform:translate(0,0)}}
.boss-shake-heavy{animation:boss-shake-heavy 420ms ease-in-out}
.boss-shake-lite{animation:boss-shake-lite 240ms ease-in-out}`
  document.head.appendChild(el)
}
function triggerShake(heavy: boolean) {
  const root = document.getElementById('root')
  if (!root) return
  const cls = heavy ? 'boss-shake-heavy' : 'boss-shake-lite'
  root.classList.remove('boss-shake-heavy', 'boss-shake-lite')
  void root.offsetWidth // reflow to restart the animation
  root.classList.add(cls)
  window.setTimeout(() => root.classList.remove(cls), heavy ? 420 : 240)
}

export function Boss() {
  const levelIndex = useGame((s) => s.levelIndex)
  const objectiveIndex = useGame((s) => s.objectiveIndex) // drives health pips
  const isBoss = !!LEVELS[levelIndex]?.isBoss

  // --- Mutable fight state (imperative; never triggers React re-renders) ---
  const barrels = useRef<Barrel[]>(
    Array.from({ length: POOL }, () => ({
      state: 'idle' as BarrelState,
      pos: new Vector3(),
      vel: new Vector3(),
    })),
  )
  const barrelRefs = useRef<(Group | null)[]>([])
  const barrelMats = useRef<(MeshStandardMaterial | null)[]>([])

  const puffs = useRef<Puff[]>(
    Array.from({ length: POOL }, () => ({ active: false, t: 0, life: 0.5, pos: new Vector3(), impact: false })),
  )
  const puffRefs = useRef<(Mesh | null)[]>([])
  const puffMats = useRef<(MeshBasicMaterial | null)[]>([])

  const pipRefs = useRef<(MeshStandardMaterial | null)[]>([])
  const telegraphRef = useRef<Mesh>(null)
  const telegraphMat = useRef<MeshBasicMaterial>(null)
  const flashMat = useRef<MeshBasicMaterial>(null)

  const held = useRef<number>(-1)
  const pressed = useRef(false)
  const dropPhase = useRef<'wait' | 'telegraph'>('wait')
  const dropTimer = useRef(-1)
  const telegraphX = useRef(0)
  const invulnUntil = useRef(0)
  const flashUntil = useRef(0)
  const player = useRef(new Vector3())

  // SPACE grabs a resting barrel / hurls the held one.
  useEffect(() => {
    if (!isBoss) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space' || e.key.toLowerCase() === 'e') {
        if (e.key === ' ' || e.code === 'Space') e.preventDefault()
        pressed.current = true
      }
    }
    ensureShakeStyle()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isBoss])

  const spawnPuff = (pos: Vector3, impact: boolean) => {
    const p = puffs.current.find((x) => !x.active)
    if (!p) return
    p.active = true
    p.t = 0
    p.life = impact ? 0.55 : 0.4
    p.impact = impact
    p.pos.copy(pos)
  }

  useFrame((_, rawDelta) => {
    if (!isBoss) return
    const delta = Math.min(rawDelta, 0.05)
    const state = useGame.getState()
    const now = state ? performance.now() / 1000 : 0
    const playing = state.gamePhase === 'playing'

    const pp = getPlayerPos()
    player.current.set(pp[0], pp[1], pp[2])

    // --- Not fighting: park everything so re-entry is clean ---
    if (!playing) {
      for (let i = 0; i < POOL; i++) {
        barrels.current[i].state = 'idle'
        const g = barrelRefs.current[i]
        if (g) g.visible = false
      }
      held.current = -1
      dropPhase.current = 'wait'
      dropTimer.current = -1
      const tg = telegraphRef.current
      if (tg) tg.visible = false
      // still advance puffs so lingering effects fade out
      updatePuffs(delta)
      updateFlash(now)
      return
    }

    const hits = Math.min(objectiveIndex, 2)

    // --- Drop cycle: wait -> telegraph -> spawn falling barrel ---
    if (dropTimer.current < 0) dropTimer.current = now + 1.2 // grace on entry
    if (dropPhase.current === 'wait') {
      if (now >= dropTimer.current) {
        // Bias the drop toward the player so dodging matters, but keep it fair.
        telegraphX.current = MathUtils.clamp(
          player.current.x + (Math.random() - 0.5) * 6,
          DROP_MIN_X,
          DROP_MAX_X,
        )
        dropPhase.current = 'telegraph'
        dropTimer.current = now + TELEGRAPH_TIME[hits]
      }
    } else if (now >= dropTimer.current) {
      const b = barrels.current.find((x) => x.state === 'idle')
      if (b) {
        b.state = 'falling'
        b.pos.set(telegraphX.current, DOCK_Y, 0)
        b.vel.set(0, -1, 0)
      }
      dropPhase.current = 'wait'
      dropTimer.current = now + DROP_INTERVAL[hits]
    }

    // Telegraph column: warns exactly where the next barrel will fall.
    const tg = telegraphRef.current
    if (tg) {
      const on = dropPhase.current === 'telegraph'
      tg.visible = on
      if (on) {
        tg.position.x = telegraphX.current
        if (telegraphMat.current) telegraphMat.current.opacity = 0.25 + Math.abs(Math.sin(now * 12)) * 0.3
      }
    }

    // --- Resolve grab / throw press ---
    if (pressed.current) {
      pressed.current = false
      if (held.current >= 0) {
        // Hurl the held barrel at the Don.
        const b = barrels.current[held.current]
        const dx = BOSS.x - b.pos.x
        const dy = BOSS.y - b.pos.y
        const l = Math.hypot(dx, dy) || 1
        b.state = 'thrown'
        b.vel.set((dx / l) * THROW_SPEED, (dy / l) * THROW_SPEED, 0)
        held.current = -1
      } else {
        // Grab the nearest resting barrel in reach.
        let best = -1
        let bestD = GRAB_R
        for (let i = 0; i < POOL; i++) {
          const b = barrels.current[i]
          if (b.state !== 'resting') continue
          const d = Math.hypot(b.pos.x - player.current.x, b.pos.y - player.current.y)
          if (d < bestD) {
            bestD = d
            best = i
          }
        }
        if (best >= 0) {
          barrels.current[best].state = 'held'
          held.current = best
        }
      }
    }

    // --- Per-barrel physics + collisions ---
    for (let i = 0; i < POOL; i++) {
      const b = barrels.current[i]
      const g = barrelRefs.current[i]
      const mat = barrelMats.current[i]
      if (!g) continue

      if (b.state === 'idle') {
        g.visible = false
        continue
      }
      g.visible = true

      if (b.state === 'falling') {
        b.vel.y = Math.max(b.vel.y + FALL_GRAV * delta, FALL_TERMINAL)
        b.pos.y += b.vel.y * delta
        // Clipped the player mid-fall — punish with a shake, then despawn.
        if (Math.hypot(b.pos.x - player.current.x, b.pos.y - player.current.y) < PLAYER_HIT_R) {
          spawnPuff(b.pos, false)
          triggerShake(false)
          b.state = 'idle'
          g.visible = false
          continue
        }
        if (b.pos.y <= SEABED_Y) {
          b.pos.y = SEABED_Y
          b.vel.set(0, 0, 0)
          b.state = 'resting'
          spawnPuff(b.pos, false) // settle splash
        }
      } else if (b.state === 'held') {
        b.pos.lerp(
          new Vector3(player.current.x + 0.6, player.current.y - 0.3, 0.4),
          1 - Math.pow(0.0009, delta),
        )
      } else if (b.state === 'thrown') {
        b.vel.y += THROW_GRAV * delta
        b.pos.x += b.vel.x * delta
        b.pos.y += b.vel.y * delta
        // Hit the Don?
        if (
          now >= invulnUntil.current &&
          Math.hypot(b.pos.x - BOSS.x, b.pos.y - BOSS.y) < BOSS_HIT_R
        ) {
          invulnUntil.current = now + HIT_INVULN
          flashUntil.current = now + 0.35
          spawnPuff(BOSS, true)
          triggerShake(true)
          const active = LEVELS[state.levelIndex]?.objectives[state.objectiveIndex]
          if (active) useGame.getState().completeObjective(active.id)
          b.state = 'idle'
          g.visible = false
          continue
        }
        // Missed / flew off — recycle.
        if (b.pos.y > 9.5 || b.pos.x < -14 || b.pos.x > 14) {
          b.state = 'idle'
          g.visible = false
          continue
        }
      }

      g.position.copy(b.pos)

      // Color/glow feedback by state.
      if (mat) {
        if (b.state === 'resting') {
          mat.emissive.set(GRABBABLE)
          mat.emissiveIntensity = 0.5 + Math.sin(now * 7) * 0.25
          g.scale.setScalar(1 + Math.sin(now * 7) * 0.06)
        } else {
          mat.emissive.set(HAZARD)
          mat.emissiveIntensity = 0.6
          g.scale.setScalar(1)
        }
      }
    }

    updatePuffs(delta)
    updateFlash(now)
  })

  function updatePuffs(delta: number) {
    for (let i = 0; i < POOL; i++) {
      const p = puffs.current[i]
      const m = puffRefs.current[i]
      const mat = puffMats.current[i]
      if (!m) continue
      if (!p.active) {
        m.visible = false
        continue
      }
      p.t += delta
      const k = p.t / p.life
      if (k >= 1) {
        p.active = false
        m.visible = false
        continue
      }
      m.visible = true
      m.position.copy(p.pos)
      const s = 0.5 + k * (p.impact ? 3.4 : 2.4)
      m.scale.setScalar(s)
      if (mat) {
        mat.opacity = (1 - k) * 0.9
        mat.color.set(p.impact ? HAZARD : '#8fd0ff')
      }
    }
  }

  function updateFlash(now: number) {
    const fm = flashMat.current
    if (!fm) return
    const left = flashUntil.current - now
    fm.opacity = left > 0 ? Math.max(0, left / 0.35) * 0.75 : 0
  }

  if (!isBoss) return null

  const remaining = 3 - Math.min(objectiveIndex, 3)

  return (
    <>
      {/* Barrel pool */}
      {barrels.current.map((_, i) => (
        <group key={i} ref={(g) => (barrelRefs.current[i] = g)} visible={false}>
          <mesh>
            <cylinderGeometry args={[0.5, 0.5, 1.15, 16]} />
            <meshStandardMaterial
              ref={(m) => (barrelMats.current[i] = m)}
              color={BARREL_BASE}
              emissive={HAZARD}
              emissiveIntensity={0}
              metalness={0.35}
              roughness={0.6}
            />
          </mesh>
          {/* rust bands */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 0.12, 16]} />
            <meshStandardMaterial color="#20261e" roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.32, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 0.12, 16]} />
            <meshStandardMaterial color="#20261e" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Impact / splash rings */}
      {puffs.current.map((_, i) => (
        <mesh key={i} ref={(m) => (puffRefs.current[i] = m)} visible={false}>
          <ringGeometry args={[0.5, 0.72, 24]} />
          <meshBasicMaterial
            ref={(m) => (puffMats.current[i] = m)}
            color="#8fd0ff"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Telegraph column — shows where the next barrel drops */}
      <mesh ref={telegraphRef} position={[0, (DOCK_Y + SEABED_Y) / 2, -0.4]} visible={false}>
        <planeGeometry args={[1.1, DOCK_Y - SEABED_Y]} />
        <meshBasicMaterial
          ref={telegraphMat}
          color="#ff3b3b"
          transparent
          opacity={0.35}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Hit flash over the Don */}
      <mesh position={[BOSS.x, BOSS.y, 0.6]}>
        <planeGeometry args={[5, 6]} />
        <meshBasicMaterial
          ref={flashMat}
          color="#ff5a3c"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Boss health pips above the dock */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-1 + i * 1, 7.2, 0.5]}>
          <boxGeometry args={[0.7, 0.28, 0.28]} />
          <meshStandardMaterial
            ref={(m) => (pipRefs.current[i] = m)}
            color={i < remaining ? '#54e08a' : '#243b2f'}
            emissive={i < remaining ? '#2fae66' : '#000000'}
            emissiveIntensity={i < remaining ? 0.5 : 0}
            roughness={0.5}
          />
        </mesh>
      ))}
    </>
  )
}
