import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import { Color, Fog, type Points as ThreePoints } from 'three'
import { useGame, waterColor } from './store'
import { AmbientLife } from './AmbientLife'

/** Drifting bubbles / marine snow. */
function Particles({ count = 400 }: { count?: number }) {
  const ref = useRef<ThreePoints>(null)
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 40
      arr[i * 3 + 1] = Math.random() * 20 - 5
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30
    }
    return arr
  }, [count])

  useFrame((_, delta) => {
    const pts = ref.current
    if (!pts) return
    const pos = pts.geometry.attributes.position
    const a = pos.array as Float32Array
    for (let i = 0; i < count; i++) {
      a[i * 3 + 1] += delta * 0.5 // rise
      if (a[i * 3 + 1] > 15) a[i * 3 + 1] = -5
    }
    pos.needsUpdate = true
  })

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial transparent color="#bcdff0" size={0.12} sizeAttenuation depthWrite={false} opacity={0.5} />
    </Points>
  )
}

/** Water color + fog driven by river health. Updates imperatively each frame. */
function Environment() {
  const { scene } = useThree()
  const fog = useMemo(() => new Fog('#06283d', 8, 42), [])

  useFrame(() => {
    const health = useGame.getState().riverHealth
    const c: Color = waterColor(health)
    scene.background = c
    fog.color.copy(c)
    scene.fog = fog
  })

  return null
}

export function Scene() {
  return (
    <>
      <Environment />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 20, 5]} intensity={1.4} color="#bfe6ff" />

      {/* Riverbed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]} receiveShadow>
        <planeGeometry args={[80, 60, 1, 1]} />
        <meshStandardMaterial color="#243b2f" roughness={1} />
      </mesh>

      <Particles />
      <AmbientLife />
    </>
  )
}
