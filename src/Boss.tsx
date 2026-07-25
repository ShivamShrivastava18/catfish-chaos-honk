// Boss.tsx — L4 "Sleep With The Fishes": the fully underwater final fight.
// Don Vitale wears a SCUBA suit and SWIMS the whole time — a mobile diver that
// wanders the upper play area (BOSS_SCUBA_FRAMES, facing his travel direction).
// He HURLS waste barrels down at Reginald (telegraph reticle -> fast barrel).
// Dodge them; a barrel that settles on the seabed glows green — SPACE to grab,
// SPACE again to HURL it back. A thrown barrel HOMES on Vitale's LIVE position.
// Three good hits win; each completes the active bossHit objective and the store
// rolls into the victory outro on the third. A barrel that clips Reginald costs
// him one health (damagePlayer, with a short invuln). Renders only on the boss level.
import { Suspense, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Group,
  Vector3,
  MathUtils,
  type Mesh,
  type MeshStandardMaterial,
  type MeshBasicMaterial,
} from 'three'
import { useGame } from './store'
import { getPlayerPos } from './Player'
import { LEVELS } from './levels'
import { BillboardSprite } from './BillboardSprite'
import { SPRITES, BOSS_SCUBA_FRAMES } from './sprites'

const SCUBA_URLS = BOSS_SCUBA_FRAMES.map((k) => SPRITES[k])

// --- Fight geometry ---
const SEABED_Y = -2.6 // where a hurled barrel settles (becomes grabbable)
const BOSS_SCALE = 3.4

// Vitale's wander box (kept in the upper play area, above Reginald's lane).
const BOSS_MIN_X = -8.5
const BOSS_MAX_X = 8.5
const BOSS_MIN_Y = 3.8
const BOSS_MAX_Y = 7.6
const BOSS_SPEED = 3.6
const BOSS_ARRIVE = 0.7 // distance to a waypoint that counts as "arrived"

// --- Tuning ---
const POOL = 12
const HURL_SPEED = 12 // boss -> player barrel launch speed
const HURL_GRAV = -4 // gentle sink on hurled barrels
const HURL_TERMINAL = -9
const THROW_SPEED = 18 // player -> boss (homing)
const THROW_LEAD = 0.22 // seconds of Vitale's velocity to lead
const GRAB_R = 2.4 // reach to a resting barrel
const PLAYER_HIT_R = 1.1 // a hurled barrel this close clips Reginald
const BOSS_HIT_R = 2.2 // a thrown barrel this close counts as a hit
const HIT_INVULN = 0.4 // debounce so one throw = one boss hit
const PLAYER_INVULN = 1.0 // grace after taking a hit (one barrel = one hit)

// Escalating cadence by hits landed (0,1,2).
const HURL_INTERVAL = [2.6, 2.1, 1.6]
const TELEGRAPH_TIME = [1.0, 0.82, 0.68]

// --- Barrel colors ---
const BARREL_BASE = '#435a37'
const HAZARD = '#ff7a1a' // hurled / thrown = dangerous glow
const GRABBABLE = '#39ff88' // resting = grab-me glow

type BarrelState = 'idle' | 'hurled' | 'resting' | 'held' | 'thrown'
interface Barrel {
  state: BarrelState
  pos: Vector3
  vel: Vector3
  t: number // lifetime (safety recycle for thrown/hurled)
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
      t: 0,
    })),
  )
  const barrelRefs = useRef<(Group | null)[]>([])
  const barrelMats = useRef<(MeshStandardMaterial | null)[]>([])

  const puffs = useRef<Puff[]>(
    Array.from({ length: POOL }, () => ({ active: false, t: 0, life: 0.5, pos: new Vector3(), impact: false })),
  )
  const puffRefs = useRef<(Mesh | null)[]>([])
  const puffMats = useRef<(MeshBasicMaterial | null)[]>([])

  const telegraphRef = useRef<Mesh>(null)
  const telegraphMat = useRef<MeshBasicMaterial>(null)
  const flashMat = useRef<MeshBasicMaterial>(null)

  // Don Vitale — mobile scuba diver.
  const bossGroup = useRef<Group>(null)
  const bossPos = useRef(new Vector3(0, 6, 0)) // live position (homing target)
  const bossBase = useRef(new Vector3(0, 6, 0)) // wander position pre-bob
  const bossVel = useRef(new Vector3())
  const bossWaypoint = useRef(new Vector3(0, 6, 0))
  const bossFacingRight = useRef(true)
  const [bossFlip, setBossFlip] = useState(true) // reactive mirror so the sprite flips live

  const held = useRef<number>(-1)
  const pressed = useRef(false)
  const attackPhase = useRef<'wait' | 'telegraph'>('wait')
  const attackTimer = useRef(-1)
  const aimPoint = useRef(new Vector3())
  const bossInvulnUntil = useRef(0)
  const playerInvulnUntil = useRef(0)
  const flashUntil = useRef(0)
  const player = useRef(new Vector3())
  const wasReviving = useRef(false)

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

  const pickWaypoint = () => {
    bossWaypoint.current.set(
      MathUtils.lerp(BOSS_MIN_X, BOSS_MAX_X, Math.random()),
      MathUtils.lerp(BOSS_MIN_Y, BOSS_MAX_Y, Math.random()),
      0,
    )
  }

  useFrame((_, rawDelta) => {
    if (!isBoss) return
    const delta = Math.min(rawDelta, 0.05)
    const state = useGame.getState()
    const now = performance.now() / 1000
    const playing = state.gamePhase === 'playing'

    const pp = getPlayerPos()
    player.current.set(pp[0], pp[1], pp[2])

    // --- Vitale keeps swimming in every phase (idle wander when not fighting) ---
    // Defeated once all three hits have landed (objectiveIndex reaches 3).
    const defeated = state.objectiveIndex >= 3

    const grp = bossGroup.current
    if (grp) {
      grp.visible = state.gamePhase === 'playing' || state.gamePhase === 'outro'
      if (defeated) {
        // Beaten: stop swimming. Go limp and sink slowly while the outro plays.
        bossVel.current.set(0, 0, 0)
        bossBase.current.y -= 0.9 * delta
        bossPos.current.set(bossBase.current.x, bossBase.current.y, 0)
        grp.position.copy(bossPos.current)
        grp.rotation.z = MathUtils.lerp(grp.rotation.z, -0.5, 1 - Math.exp(-3 * delta))
      } else {
        // Wander toward the current waypoint.
        const toWp = bossWaypoint.current.clone().sub(bossBase.current)
        const dist = toWp.length()
        if (dist < BOSS_ARRIVE) {
          pickWaypoint()
        } else {
          toWp.multiplyScalar(1 / dist)
          const step = BOSS_SPEED * delta
          bossBase.current.addScaledVector(toWp, step)
          bossVel.current.copy(toWp).multiplyScalar(BOSS_SPEED)
        }
        // Live position = wander base + gentle vertical bob.
        bossPos.current.set(bossBase.current.x, bossBase.current.y + Math.sin(now * 2) * 0.18, 0)
        grp.position.copy(bossPos.current)
        // Face travel direction (hysteresis so it doesn't flicker).
        if (bossVel.current.x > 0.3 && !bossFacingRight.current) {
          bossFacingRight.current = true
          setBossFlip(true)
        } else if (bossVel.current.x < -0.3 && bossFacingRight.current) {
          bossFacingRight.current = false
          setBossFlip(false)
        }
      }
    }

    // --- Revive grace: on Reginald's last stand, sweep away live threats ---
    if (state.reviving && !wasReviving.current) {
      for (let i = 0; i < POOL; i++) {
        if (barrels.current[i].state === 'hurled') {
          barrels.current[i].state = 'idle'
          const g = barrelRefs.current[i]
          if (g) g.visible = false
        }
      }
      attackPhase.current = 'wait'
      attackTimer.current = now + 1.6
      playerInvulnUntil.current = now + 1.6
    }
    wasReviving.current = state.reviving

    // --- Not fighting: park barrels/telegraph so re-entry is clean ---
    if (!playing) {
      for (let i = 0; i < POOL; i++) {
        barrels.current[i].state = 'idle'
        const g = barrelRefs.current[i]
        if (g) g.visible = false
      }
      held.current = -1
      attackPhase.current = 'wait'
      attackTimer.current = -1
      const tg = telegraphRef.current
      if (tg) tg.visible = false
      updatePuffs(delta)
      updateFlash(now)
      return
    }

    const hits = Math.min(objectiveIndex, 2)

    // --- Attack cycle: wait -> telegraph (reticle on Reginald) -> hurl barrel ---
    if (attackTimer.current < 0) attackTimer.current = now + 1.4 // grace on entry
    if (attackPhase.current === 'wait') {
      if (now >= attackTimer.current) {
        aimPoint.current.copy(player.current) // lock aim where Reginald is now
        attackPhase.current = 'telegraph'
        attackTimer.current = now + TELEGRAPH_TIME[hits]
      }
    } else if (now >= attackTimer.current) {
      const b = barrels.current.find((x) => x.state === 'idle')
      if (b) {
        b.state = 'hurled'
        b.t = 0
        b.pos.copy(bossPos.current)
        const dir = aimPoint.current.clone().sub(b.pos)
        const l = dir.length() || 1
        b.vel.set((dir.x / l) * HURL_SPEED, (dir.y / l) * HURL_SPEED, 0)
      }
      attackPhase.current = 'wait'
      attackTimer.current = now + HURL_INTERVAL[hits]
    }

    // Telegraph reticle — warns exactly where the next barrel is aimed.
    const tg = telegraphRef.current
    if (tg) {
      const on = attackPhase.current === 'telegraph'
      tg.visible = on
      if (on) {
        tg.position.set(aimPoint.current.x, aimPoint.current.y, 0.5)
        const pulse = 1 + Math.abs(Math.sin(now * 12)) * 0.4
        tg.scale.setScalar(pulse)
        if (telegraphMat.current) telegraphMat.current.opacity = 0.4 + Math.abs(Math.sin(now * 12)) * 0.35
      }
    }

    // --- Resolve grab / throw press ---
    if (pressed.current) {
      pressed.current = false
      if (held.current >= 0) {
        // Hurl the held barrel — it HOMES, so just get it moving upward.
        const b = barrels.current[held.current]
        b.state = 'thrown'
        b.t = 0
        b.vel.set(0, THROW_SPEED, 0)
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
      b.t += delta

      if (b.state === 'hurled') {
        b.vel.y = Math.max(b.vel.y + HURL_GRAV * delta, HURL_TERMINAL)
        b.pos.x += b.vel.x * delta
        b.pos.y += b.vel.y * delta
        // Clipped Reginald mid-flight — one health, then despawn (respect invuln).
        if (
          now >= playerInvulnUntil.current &&
          Math.hypot(b.pos.x - player.current.x, b.pos.y - player.current.y) < PLAYER_HIT_R
        ) {
          playerInvulnUntil.current = now + PLAYER_INVULN
          useGame.getState().damagePlayer(1)
          spawnPuff(b.pos, false)
          triggerShake(false)
          b.state = 'idle'
          g.visible = false
          continue
        }
        // Settles on the seabed -> grabbable.
        if (b.pos.y <= SEABED_Y) {
          b.pos.y = SEABED_Y
          b.pos.x = MathUtils.clamp(b.pos.x, BOSS_MIN_X, BOSS_MAX_X)
          b.vel.set(0, 0, 0)
          b.state = 'resting'
          spawnPuff(b.pos, false)
        } else if (b.pos.x < -14 || b.pos.x > 14) {
          b.state = 'idle'
          g.visible = false
          continue
        }
      } else if (b.state === 'held') {
        b.pos.lerp(
          new Vector3(player.current.x + 0.6, player.current.y - 0.3, 0.4),
          1 - Math.pow(0.0009, delta),
        )
      } else if (b.state === 'thrown') {
        // HOME on Vitale's LIVE position (lead his velocity a touch).
        const aim = bossPos.current
          .clone()
          .addScaledVector(bossVel.current, THROW_LEAD)
        const dir = aim.sub(b.pos)
        const l = dir.length() || 1
        b.vel.set((dir.x / l) * THROW_SPEED, (dir.y / l) * THROW_SPEED, 0)
        b.pos.addScaledVector(b.vel, delta)
        // Hit Vitale?
        if (
          now >= bossInvulnUntil.current &&
          b.pos.distanceTo(bossPos.current) < BOSS_HIT_R
        ) {
          bossInvulnUntil.current = now + HIT_INVULN
          flashUntil.current = now + 0.35
          spawnPuff(bossPos.current, true)
          triggerShake(true)
          const active = LEVELS[state.levelIndex]?.objectives[state.objectiveIndex]
          if (active) useGame.getState().completeObjective(active.id)
          b.state = 'idle'
          g.visible = false
          continue
        }
        // Safety recycle if it somehow never connects.
        if (b.t > 4 || b.pos.y > 11 || b.pos.x < -14 || b.pos.x > 14) {
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
      {/* Don Vitale — mobile scuba diver, with a hit flash + health pips riding along */}
      <group ref={bossGroup} position={[0, 6, 0]}>
        <Suspense fallback={null}>
          <BillboardSprite
            frames={SCUBA_URLS}
            fps={6}
            scale={BOSS_SCALE}
            flipX={!bossFlip}
          />
        </Suspense>

        {/* Hit flash over Vitale */}
        <mesh position={[0, 0, 0.6]}>
          <planeGeometry args={[4.4, 5.2]} />
          <meshBasicMaterial
            ref={flashMat}
            color="#ff5a3c"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Boss health pips above his head */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-1 + i * 1, 2.7, 0.3]}>
            <boxGeometry args={[0.7, 0.28, 0.28]} />
            <meshStandardMaterial
              color={i < remaining ? '#54e08a' : '#243b2f'}
              emissive={i < remaining ? '#2fae66' : '#000000'}
              emissiveIntensity={i < remaining ? 0.5 : 0}
              roughness={0.5}
            />
          </mesh>
        ))}
      </group>

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

      {/* Telegraph reticle — pulses where the next hurled barrel is aimed */}
      <mesh ref={telegraphRef} visible={false}>
        <ringGeometry args={[0.7, 1.0, 28]} />
        <meshBasicMaterial
          ref={telegraphMat}
          color="#ff3b3b"
          transparent
          opacity={0.5}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}
