import { Suspense, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  MathUtils,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type Points,
  type PointsMaterial,
  type Texture,
} from 'three'
import { BillboardSprite } from './BillboardSprite'
import { SPRITES, type SpriteKey } from './sprites'
import { LEVELS, type PropPlacement } from './levels'
import { useGame } from './store'
import { PipeDock } from './PipeDock'

// ---------------------------------------------------------------------------
// Sprite role sets — which decor plants on the riverbed, which is a living plant
// that wilts in bad water, and which sways gently in the current.
// ---------------------------------------------------------------------------
const BOTTOM_ANCHORED: ReadonlySet<SpriteKey> = new Set<SpriteKey>([
  'seaweedTall', 'seaweedShort', 'rockBrown', 'rockGrey', 'coral',
  'kelpA', 'kelpB', 'kelpC', 'coralA', 'coralB', 'coralFan',
  'rockBig', 'rockFlat', 'rockPile', 'sunkenPillar', 'sunkenTire',
  'sunkenCrate', 'driftwood', 'shellCluster', 'anemone', 'nursery',
  'bgReeds', 'bgRidge', 'net',
])
const PLANTS: ReadonlySet<SpriteKey> = new Set<SpriteKey>([
  'seaweedTall', 'seaweedShort', 'coral',
  'kelpA', 'kelpB', 'kelpC', 'coralA', 'coralB', 'coralFan', 'anemone',
])
// Living plants that also sway laterally in the current.
const SWAY: ReadonlySet<SpriteKey> = new Set<SpriteKey>([
  'seaweedTall', 'seaweedShort',
  'kelpA', 'kelpB', 'kelpC', 'coralFan', 'anemone',
])

// Camera-follow strength (Player.tsx: camera.x = player.x * 0.7). We add a gentle
// world-space offset per layer so far bands lag the near plane → parallax depth.
const PARALLAX_GAIN = 0.4
const BAND_PARALLAX = { bg: 0.2, mid: 0.6, fg: 0.9 } as const
type Band = keyof typeof BAND_PARALLAX

interface Placed {
  p: PropPlacement
  band: Band
  parallax: number
  bottom: boolean
  isPlant: boolean
  sway: number // 0 = static, else sway amplitude
  phase: number
}

function crisp(t: Texture) {
  t.magFilter = NearestFilter
  t.minFilter = NearestFilter
  t.generateMipmaps = false
  t.colorSpace = SRGBColorSpace
  t.needsUpdate = true
}

// ---------------------------------------------------------------------------
// God-ray — a soft additive light shaft. Its gradient has smooth alpha, so it
// CANNOT go through BillboardSprite (which alpha-tests hard edges); it needs its
// own additive material. Breathes slowly and strengthens as the river clears.
// ---------------------------------------------------------------------------
function GodRay({ position, scale, flip, frac }: { position: [number, number, number]; scale: number; flip?: boolean; frac: number }) {
  const tex = useLoader(TextureLoader, SPRITES.lightShaftSoft) as Texture
  const matRef = useRef<MeshBasicMaterial>(null)
  useMemo(() => crisp(tex), [tex])
  const [w, h] = useMemo<[number, number]>(() => {
    const img = tex.image as { width?: number; height?: number } | undefined
    const a = (img?.width ?? 1) / (img?.height ?? 1)
    return a >= 1 ? [1, 1 / a] : [a, 1]
  }, [tex])
  const base = MathUtils.lerp(0.05, 0.22, frac)
  useFrame((state) => {
    const m = matRef.current
    if (!m) return
    m.opacity = base * (0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 0.5 + position[0]))
  })
  return (
    <mesh position={position} scale={[w * scale * (flip ? -1 : 1), h * scale, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        map={tex}
        transparent
        depthWrite={false}
        opacity={base}
        toneMapped={false}
        blending={AdditiveBlending}
        color="#bfe6ff"
      />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Caustics — a scrolling tiled light texture skimming the seabed. Additive, so
// it reads as dappled sunlight; fades out in murky water.
// ---------------------------------------------------------------------------
function Caustics({ frac }: { frac: number }) {
  const tex = useLoader(TextureLoader, SPRITES.causticTile) as Texture
  const matRef = useRef<MeshBasicMaterial>(null)
  useMemo(() => {
    crisp(tex)
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(10, 8)
  }, [tex])
  useFrame((state, delta) => {
    tex.offset.x += delta * 0.015
    tex.offset.y += delta * 0.008
    const m = matRef.current
    if (m) m.opacity = MathUtils.lerp(0.04, 0.16, frac) * (0.8 + 0.2 * Math.sin(state.clock.elapsedTime * 0.4))
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.4, -4]}>
      <planeGeometry args={[70, 40]} />
      <meshBasicMaterial
        ref={matRef}
        map={tex}
        transparent
        depthWrite={false}
        opacity={0.1}
        toneMapped={false}
        blending={AdditiveBlending}
        color="#9fe8ff"
      />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// A parallax depth band. Each item gets its own group; one useFrame slides every
// group by its parallax offset (far bands lag the play plane) and sways plants.
// ---------------------------------------------------------------------------
function ParallaxBand({
  items,
  frac,
  bandOpacity,
}: {
  items: Placed[]
  frac: number
  bandOpacity: number
}) {
  const { camera } = useThree()
  const refs = useRef<(Group | null)[]>([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const camX = camera.position.x
    for (let i = 0; i < items.length; i++) {
      const g = refs.current[i]
      if (!g) continue
      const it = items[i]
      const par = camX * (1 - it.parallax) * PARALLAX_GAIN
      const drift = it.sway ? Math.sin(t * 0.6 + it.phase) * it.sway : 0
      g.position.x = it.p.pos[0] + par + drift
    }
  })

  return (
    <>
      {items.map((it, i) => {
        const isGodRay = it.p.sprite === 'lightShaftSoft'
        const scale = (it.p.scale ?? 1) * (it.isPlant ? MathUtils.lerp(0.88, 1, frac) : 1)
        const plantFade = it.isPlant ? MathUtils.lerp(0.55, 1, frac) : 1
        const opacity = bandOpacity * plantFade
        return (
          <group
            key={i}
            ref={(el) => (refs.current[i] = el)}
            position={[it.p.pos[0], it.p.pos[1], it.p.pos[2]]}
          >
            {isGodRay ? (
              <GodRay position={[0, 0, 0]} scale={it.p.scale ?? 1} flip={it.p.flip} frac={frac} />
            ) : (
              <BillboardSprite
                url={SPRITES[it.p.sprite]}
                position={[0, 0, 0]}
                scale={scale}
                flipX={it.p.flip}
                anchor={it.bottom ? 'bottom' : 'center'}
                opacity={opacity}
              />
            )}
          </group>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// Path lane — a faint trail of light along the authored waypoints with a pulse
// that flows toward the goal. Brightens as the river clears.
// ---------------------------------------------------------------------------
function buildLane(path: [number, number][], perSeg = 4): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i]
    const [bx, by] = path[i + 1]
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg
      pts.push([MathUtils.lerp(ax, bx, t), MathUtils.lerp(ay, by, t)])
    }
  }
  if (path.length > 0) pts.push(path[path.length - 1])
  return pts
}

function PathLane({ path }: { path: [number, number][] }) {
  const pts = useMemo(() => buildLane(path), [path])
  const refs = useRef<(Mesh | null)[]>([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const frac = useGame.getState().riverHealth / 100
    const bright = MathUtils.lerp(0.28, 0.62, frac)
    for (let i = 0; i < pts.length; i++) {
      const m = refs.current[i]
      if (!m) continue
      const wave = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.55)
      const mat = m.material as MeshBasicMaterial
      mat.opacity = bright * (0.3 + 0.7 * wave)
      m.scale.setScalar(1 + 0.35 * wave)
    }
  })

  return (
    <group>
      {pts.map((p, i) => (
        <mesh key={`lane-${i}`} ref={(el) => (refs.current[i] = el)} position={[p[0], p[1], -0.35]}>
          <circleGeometry args={[0.12, 16]} />
          <meshBasicMaterial
            color="#ffe08a"
            transparent
            opacity={0.3}
            depthWrite={false}
            toneMapped={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Murk haze — suspended sediment, thick in bad water, dissolving as the river is
// cleaned. Drifts gently; never re-renders (updated imperatively).
// ---------------------------------------------------------------------------
function MurkHaze({ count = 150 }: { count?: number }) {
  const ref = useRef<Points>(null)
  const matRef = useRef<PointsMaterial>(null)
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 42
      arr[i * 3 + 1] = Math.random() * 13 - 5
      arr[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2
    }
    return arr
  }, [count])

  useFrame((_, delta) => {
    const frac = useGame.getState().riverHealth / 100
    const mat = matRef.current
    if (mat) mat.opacity = MathUtils.lerp(0.5, 0, frac)
    const pts = ref.current
    if (!pts) return
    const attr = pts.geometry.attributes.position
    const a = attr.array as Float32Array
    for (let i = 0; i < count; i++) {
      a[i * 3 + 0] += delta * 0.18
      a[i * 3 + 1] += Math.sin((a[i * 3 + 0] + i) * 0.3) * delta * 0.05
      if (a[i * 3 + 0] > 21) a[i * 3 + 0] = -21
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        color="#6b5836"
        size={0.2}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

// Turn raw PropPlacements into render descriptors for a given band.
function place(props: PropPlacement[], band: Band): Placed[] {
  return props.map((p, i) => ({
    p,
    band,
    parallax: p.parallax ?? BAND_PARALLAX[band],
    bottom: BOTTOM_ANCHORED.has(p.sprite),
    isPlant: PLANTS.has(p.sprite),
    sway: SWAY.has(p.sprite) ? 0.05 + (p.scale ?? 1) * 0.02 : 0,
    phase: (i * 1.7 + p.pos[0] * 0.3) % (Math.PI * 2),
  }))
}

/**
 * The current level's full, layered open world: a far BACKGROUND silhouette band,
 * a parallax MID band of kelp forests / coral fields / sunken ruins, and a
 * detailed FOREGROUND — each camera-parallaxed for depth. Soft god-rays and
 * scrolling seabed caustics, a glowing objective lane, and health-reactive murk
 * + plant wilting. Drop INSIDE the 3D <Scene>.
 */
export function LevelEnvironment() {
  const levelIndex = useGame((s) => s.levelIndex)
  const objectiveIndex = useGame((s) => s.objectiveIndex)
  const health = useGame((s) => s.riverHealth)
  const level = LEVELS[levelIndex] ?? LEVELS[0]
  const frac = health / 100

  // L1: the heaped debris clump is dug clear once the reveal's afterObjective
  // completes; hide those props then so the nursery (drawn by Objectives) shows.
  const reveal = level.reveal
  const revealIdx = reveal ? level.objectives.findIndex((o) => o.id === reveal.afterObjective) : -1
  const debrisCleared = revealIdx >= 0 && objectiveIndex > revealIdx

  // Split the authored world into its three parallax bands.
  const { bg, mid, fg } = useMemo(() => {
    const midProps: PropPlacement[] = []
    const fgProps: PropPlacement[] = []
    for (const p of level.props) {
      if (p.debris && debrisCleared) continue
      if (p.layer === 'fg') fgProps.push(p)
      else midProps.push(p)
    }
    return {
      bg: place(level.background, 'bg'),
      mid: place(midProps, 'mid'),
      fg: place(fgProps, 'fg'),
    }
  }, [level, debrisCleared])

  // Far band recedes into the murk when health is low (lower opacity + haze).
  const bgOpacity = MathUtils.lerp(0.3, 0.6, frac)

  return (
    <group>
      <Suspense fallback={null}>
        <Caustics frac={frac} />
        <ParallaxBand items={bg} frac={frac} bandOpacity={bgOpacity} />
        <ParallaxBand items={mid} frac={frac} bandOpacity={1} />
        <ParallaxBand items={fg} frac={frac} bandOpacity={1} />
      </Suspense>

      {/* L3 reveal / L4 backdrop: the real 3D outflow pipe + surface dock. */}
      {level.pipeDock && (
        <Suspense fallback={null}>
          <PipeDock pipe={level.pipeDock.pipe} dock={level.pipeDock.dock} />
        </Suspense>
      )}

      <PathLane key={`lane-${level.id}`} path={level.path} />
      <MurkHaze />
    </group>
  )
}
