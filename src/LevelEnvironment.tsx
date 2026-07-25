import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  MathUtils,
  type Mesh,
  type MeshBasicMaterial,
  type Points,
  type PointsMaterial,
} from 'three'
import { BillboardSprite } from './BillboardSprite'
import { SPRITES, type SpriteKey } from './sprites'
import { LEVELS } from './levels'
import { useGame } from './store'

// Decor that grows up FROM the riverbed is planted by its bottom edge; the pipe
// and dock pilings (rockGrey) are tall structures that read the same way.
const BOTTOM_ANCHORED: ReadonlySet<SpriteKey> = new Set<SpriteKey>([
  'seaweedTall',
  'seaweedShort',
  'rockBrown',
  'rockGrey',
  'coral',
])
// Living plants wilt (fade + shrink a touch) when the water turns murky.
const PLANTS: ReadonlySet<SpriteKey> = new Set<SpriteKey>([
  'seaweedTall',
  'seaweedShort',
  'coral',
])

// ---------------------------------------------------------------------------
// Far parallax backdrop — a deterministic silhouette band well behind the play
// plane. Varies per level via `seed`; recedes into the murk when health is low.
// ---------------------------------------------------------------------------
interface FarItem {
  key: SpriteKey
  x: number
  z: number
  scale: number
  flip: boolean
}

const FAR_KEYS: SpriteKey[] = ['seaweedTall', 'rockGrey', 'seaweedTall', 'rockBrown', 'seaweedShort']

function buildFar(seed: number): FarItem[] {
  const items: FarItem[] = []
  for (let i = 0; i < 11; i++) {
    const jitter = ((seed * 7 + i * 13) % 5) - 2
    items.push({
      key: FAR_KEYS[(i + seed) % FAR_KEYS.length],
      x: -20 + i * 4 + jitter,
      z: -8 - ((seed + i) % 3),
      scale: 2.6 + ((seed * 3 + i * 5) % 4) * 0.45,
      flip: (i + seed) % 2 === 0,
    })
  }
  return items
}

function FarBackdrop({ seed, frac }: { seed: number; frac: number }) {
  const items = useMemo(() => buildFar(seed), [seed])
  const opacity = MathUtils.lerp(0.12, 0.42, frac)
  return (
    <>
      {items.map((it, i) => (
        <BillboardSprite
          key={`far-${seed}-${i}`}
          url={SPRITES[it.key]}
          position={[it.x, -3.6, it.z]}
          scale={it.scale}
          flipX={it.flip}
          anchor="bottom"
          opacity={opacity}
        />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Path lane — a faint trail of light along the authored waypoints. A travelling
// pulse flows toward the goal, reinforcing the definite route. Brightens as the
// river clears.
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
// Murk haze — suspended brown sediment that is thick in bad water and dissolves
// away as the river is cleaned. Drifts gently; never re-renders (imperative).
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

/**
 * The current level's full, designed world: authored props rendered densely as
 * bottom-anchored billboards with a far parallax backdrop, a glowing path lane
 * along the level's waypoints, and health-reactive murk + plant wilting.
 * Drop INSIDE the 3D <Scene>.
 */
export function LevelEnvironment() {
  const levelIndex = useGame((s) => s.levelIndex)
  const health = useGame((s) => s.riverHealth)
  const level = LEVELS[levelIndex] ?? LEVELS[0]
  const frac = health / 100

  return (
    <group>
      <Suspense fallback={null}>
        <FarBackdrop seed={levelIndex} frac={frac} />
        {level.props.map((p, i) => {
          const bottom = BOTTOM_ANCHORED.has(p.sprite)
          const isPlant = PLANTS.has(p.sprite)
          const scale = (p.scale ?? 1) * (isPlant ? MathUtils.lerp(0.9, 1, frac) : 1)
          const opacity = isPlant ? MathUtils.lerp(0.6, 1, frac) : 1
          return (
            <BillboardSprite
              key={`${level.id}-prop-${i}`}
              url={SPRITES[p.sprite]}
              position={p.pos}
              scale={scale}
              flipX={p.flip}
              anchor={bottom ? 'bottom' : 'center'}
              opacity={opacity}
            />
          )
        })}
      </Suspense>

      <PathLane key={`lane-${level.id}`} path={level.path} />
      <MurkHaze />
    </group>
  )
}
