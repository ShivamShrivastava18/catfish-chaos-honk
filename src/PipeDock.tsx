// PipeDock.tsx — the real 3D industrial outflow pipe + surface dock (L3 reveal,
// L4 boss backdrop). A big rusty metal pipe runs from a submerged mouth up to a
// wooden dock above the waterline and GUSHES murky, polluted water into the
// river. Self-contained: `pipe` is the world anchor of the outflow mouth, `dock`
// the world anchor of the surface deck; the pipe body is built along the vector
// between them. `scale` sizes the rig; `flip` mirrors the outflow direction.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, Quaternion, Vector3, type Points as ThreePoints, type MeshBasicMaterial } from 'three'
import { useGame } from './store'
import { LEVELS } from './levels'

interface PipeDockProps {
  pipe: [number, number, number]
  dock: [number, number, number]
  scale?: number
  flip?: boolean
}

// --- Palette ---
const METAL = '#6d5c46' // rusty steel body
const METAL_DARK = '#3f3427' // darker rim / bracket steel
const RUST = '#8a4a24' // rust streak accent
const WOOD = '#6b4a2a'
const WOOD_DARK = '#503620'
const SLUDGE = '#57632f' // murky brown-green polluted water
const SLUDGE_LIGHT = '#7a8a48'

const PIPE_R = 0.9
const SEABED_WORLD = -6 // riverbed plane (matches Scene.tsx)

// --- Gushing water particles ---
const GUSH_COUNT = 60

interface Drop {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

function spawnDrop(d: Drop, dirSign: number) {
  // Erupts from the mouth, fans outward toward the river, then gravity arcs it down.
  d.x = dirSign * (0.1 + Math.random() * 0.2)
  d.y = (Math.random() - 0.5) * PIPE_R * 1.2
  d.z = (Math.random() - 0.5) * PIPE_R * 1.2
  d.vx = dirSign * (2.4 + Math.random() * 1.8)
  d.vy = 0.4 + Math.random() * 0.8
  d.vz = (Math.random() - 0.5) * 0.7
}

function Gush({ dirSign, floorY }: { dirSign: number; floorY: number }) {
  const ref = useRef<ThreePoints>(null)
  const drops = useMemo<Drop[]>(() => {
    const arr: Drop[] = []
    for (let i = 0; i < GUSH_COUNT; i++) {
      const d: Drop = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }
      spawnDrop(d, dirSign)
      d.x += dirSign * Math.random() * 5 // stagger so the jet is full immediately
      d.y -= Math.random() * 3
      arr.push(d)
    }
    return arr
  }, [dirSign])
  const positions = useMemo(() => new Float32Array(GUSH_COUNT * 3), [])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const pts = ref.current
    if (!pts) return
    const a = pts.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < GUSH_COUNT; i++) {
      const d = drops[i]
      d.vy += -7 * delta // gravity
      d.x += d.vx * delta
      d.y += d.vy * delta
      d.z += d.vz * delta
      if (d.y < floorY || Math.abs(d.x) > 8) spawnDrop(d, dirSign)
      a[i * 3 + 0] = d.x
      a[i * 3 + 1] = d.y
      a[i * 3 + 2] = d.z
    }
    pts.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={SLUDGE_LIGHT} size={0.32} sizeAttenuation transparent opacity={0.75} depthWrite={false} />
    </points>
  )
}

/** A translucent murky sheet spilling from the mouth — the body of the outflow. */
function FlowSheet({ dirSign }: { dirSign: number }) {
  const matRef = useRef<MeshBasicMaterial>(null)
  useFrame((state) => {
    const m = matRef.current
    if (m) m.opacity = 0.26 + Math.abs(Math.sin(state.clock.elapsedTime * 2.4)) * 0.12
  })
  return (
    <mesh position={[dirSign * 1.9, -1.5, 0]} rotation={[0, 0, dirSign * 0.55]}>
      <planeGeometry args={[4.4, 1.5]} />
      <meshBasicMaterial
        ref={matRef}
        color={SLUDGE}
        transparent
        opacity={0.3}
        side={DoubleSide}
        depthWrite={false}
        toneMapped={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}

export function PipeDock({ pipe, dock, scale = 1, flip = false }: PipeDockProps) {
  const dirSign = flip ? -1 : 1

  // Flow stops once the outflow valve is wrenched shut. If the current level has a
  // valve objective, gush until the player passes it; otherwise (L4 backdrop) always.
  const levelIndex = useGame((s) => s.levelIndex)
  const objectiveIndex = useGame((s) => s.objectiveIndex)
  const valveIdx = LEVELS[levelIndex]?.objectives.findIndex((o) => o.id === 'l3-jam-valve') ?? -1
  const flowing = valveIdx < 0 || objectiveIndex <= valveIdx

  // Everything is authored in a local frame whose origin is the outflow mouth
  // (world `pipe`); the dock sits at the local delta to world `dock`.
  const [delta, quat, length] = useMemo(() => {
    const d = new Vector3(dock[0] - pipe[0], dock[1] - pipe[1], dock[2] - pipe[2])
    const len = d.length() || 1
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize())
    return [d, q, len] as const
  }, [pipe, dock])

  const quatArr: [number, number, number, number] = [quat.x, quat.y, quat.z, quat.w]
  const mid: [number, number, number] = [delta.x / 2, delta.y / 2, delta.z / 2]
  const dockLocal: [number, number, number] = [delta.x, delta.y, delta.z]

  // Support legs only when the mouth actually sits near the riverbed (L3),
  // not when the rig is a raised ceiling backdrop (L4).
  const localSeabed = SEABED_WORLD - pipe[1]
  const showLegs = pipe[1] < 1 && localSeabed < -1
  const floorY = Math.min(localSeabed, -5)

  return (
    <group position={pipe} scale={scale}>
      {/* ---- Main outflow pipe body (mouth -> dock) ---- */}
      <mesh position={mid} quaternion={quatArr}>
        <cylinderGeometry args={[PIPE_R, PIPE_R, length, 20]} />
        <meshStandardMaterial color={METAL} metalness={0.65} roughness={0.62} />
      </mesh>

      {/* bolted collars / rust bands along the run */}
      {[0.22, 0.5, 0.78].map((t, i) => (
        <mesh key={`collar-${i}`} position={[delta.x * t, delta.y * t, delta.z * t]} quaternion={quatArr}>
          <cylinderGeometry args={[PIPE_R * 1.06, PIPE_R * 1.06, 0.34, 20]} />
          <meshStandardMaterial color={i === 1 ? RUST : METAL_DARK} metalness={0.55} roughness={0.75} />
        </mesh>
      ))}

      {/* ---- Flange rim + dark bore at the mouth ---- */}
      <mesh position={[0, 0, 0]} quaternion={quatArr}>
        <cylinderGeometry args={[PIPE_R * 1.3, PIPE_R * 1.3, 0.3, 20]} />
        <meshStandardMaterial color={METAL_DARK} metalness={0.7} roughness={0.55} />
      </mesh>
      <mesh position={[dirSign * -0.05, -0.05, 0]}>
        <sphereGeometry args={[PIPE_R * 0.8, 16, 12]} />
        <meshStandardMaterial color="#141a10" roughness={1} metalness={0} />
      </mesh>

      {/* ---- Support legs + saddle brackets to the riverbed (L3) ---- */}
      {showLegs && (
        <>
          {[-0.6, 0.6].map((offx, i) => (
            <mesh key={`leg-${i}`} position={[offx, localSeabed / 2, 0]}>
              <boxGeometry args={[0.35, Math.abs(localSeabed), 0.35]} />
              <meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.7} />
            </mesh>
          ))}
          <mesh position={[0, -PIPE_R * 0.7, 0]}>
            <boxGeometry args={[2, 0.5, PIPE_R * 2.4]} />
            <meshStandardMaterial color={RUST} metalness={0.4} roughness={0.85} />
          </mesh>
        </>
      )}

      {/* ---- Surface dock (wooden deck + pilings) ---- */}
      <group position={dockLocal}>
        {[-1.4, -0.7, 0, 0.7, 1.4].map((px, i) => (
          <mesh key={`plank-${i}`} position={[px, 0.15, 0]}>
            <boxGeometry args={[0.6, 0.25, 4.2]} />
            <meshStandardMaterial color={i % 2 ? WOOD : WOOD_DARK} roughness={0.95} metalness={0} />
          </mesh>
        ))}
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[3.6, 0.3, 4.4]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.95} metalness={0} />
        </mesh>
        {[
          [-1.5, -1.9],
          [1.5, -1.9],
          [-1.5, 1.9],
          [1.5, 1.9],
        ].map(([px, pz], i) => (
          <mesh key={`piling-${i}`} position={[px, -1.2, pz]}>
            <cylinderGeometry args={[0.22, 0.22, 2.6, 10]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.95} metalness={0} />
          </mesh>
        ))}
      </group>

      {/* ---- Polluted outflow (stops once the valve is wrenched shut) ---- */}
      {flowing && (
        <>
          <FlowSheet dirSign={dirSign} />
          <Gush dirSign={dirSign} floorY={floorY} />
        </>
      )}
    </group>
  )
}
