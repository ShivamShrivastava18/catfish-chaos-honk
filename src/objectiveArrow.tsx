import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { getPlayerPos } from './Player'

const HIDE_DIST = 1.7 // stop pointing once the player is basically on top of it
const OFFSET = 1.9 // how far in front of Reginald the arrow floats

/**
 * A directional breadcrumb: a glowing arrow that hovers just ahead of the player
 * and always points toward the active objective's location. Reads the shared
 * player position every frame — no store coupling.
 */
export function ObjectiveArrow({ to, color = '#ffd34d' }: { to: [number, number, number]; color?: string }) {
  const ref = useRef<Group>(null)

  useFrame((state) => {
    const g = ref.current
    if (!g) return
    const p = getPlayerPos()
    const dx = to[0] - p[0]
    const dy = to[1] - p[1]
    const dist = Math.hypot(dx, dy)
    if (dist < HIDE_DIST) {
      g.visible = false
      return
    }
    g.visible = true
    const ang = Math.atan2(dy, dx)
    const bob = OFFSET + Math.sin(state.clock.elapsedTime * 3) * 0.18
    g.position.set(p[0] + Math.cos(ang) * bob, p[1] + Math.sin(ang) * bob, p[2] + 0.6)
    // coneGeometry points +Y by default; rotate so the tip aims at the target.
    g.rotation.z = ang - Math.PI / 2
  })

  return (
    <group ref={ref} visible={false}>
      <mesh>
        <coneGeometry args={[0.3, 0.75, 3]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}
