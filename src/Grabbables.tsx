import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group, type Mesh } from 'three'
import { BillboardSprite } from './BillboardSprite'
import { SPRITES } from './sprites'
import { useGame } from './store'
import { getPlayerPos } from './Player'
import { CRIME_OBJECTS, type CrimeObject } from './crimeObjects'

const GRAB_RANGE = 2.4 // how close Reginald must be to pick something up
const DROP_RADIUS = 2.4 // how close the carried object must get to its drop zone
const FOLLOW = new Vector3() // carry offset target (scratch)
const PLAYER = new Vector3() // scratch for the player position each frame

/** Normalize whatever ./Player returns (Vector3-like or [x,y,z]) into `out`. */
function readPlayer(out: Vector3): Vector3 {
  const p = getPlayerPos() as { x?: number; y?: number; z?: number } | number[] | undefined
  if (!p) return out
  if (Array.isArray(p)) return out.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0)
  return out.set(p.x ?? 0, p.y ?? 0, p.z ?? 0)
}

/** Distinct colored primitive for crimes whose prop sprite doesn't exist yet. */
function FallbackMesh({ id, color }: { id: string; color: string }) {
  switch (id) {
    case 'barrels':
      return (
        <mesh>
          <cylinderGeometry args={[0.45, 0.45, 1, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.6} />
        </mesh>
      )
    case 'pipe':
      return (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 1.8, 12]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
        </mesh>
      )
    case 'boat':
      return (
        <mesh rotation={[Math.PI * 0.06, 0, 0]}>
          <boxGeometry args={[1.8, 0.5, 0.9]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      )
    case 'sign':
      return (
        <mesh>
          <boxGeometry args={[1.4, 0.9, 0.08]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.8} />
        </mesh>
      )
    default:
      return (
        <mesh>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )
  }
}

function CrimeObjectView({ obj, register }: { obj: CrimeObject; register: (id: string, g: Group | null) => void }) {
  return (
    <group ref={(g) => register(obj.id, g)} position={obj.spawn}>
      {typeof obj.sprite === 'string' ? (
        <BillboardSprite url={SPRITES[obj.sprite]} scale={1.3} />
      ) : (
        <FallbackMesh id={obj.id} color={obj.sprite.color} />
      )}
    </group>
  )
}

export function Grabbables() {
  const crimes = useGame((s) => s.crimes)
  const doneById = new Map(crimes.map((c) => [c.id, c.done]))
  const active = CRIME_OBJECTS.filter((o) => !doneById.get(o.id))

  const groups = useRef<Map<string, Group>>(new Map())
  const markerRef = useRef<Mesh>(null)
  const grabbedRef = useRef<string | null>(null)
  const pressRef = useRef(false)

  const register = (id: string, g: Group | null) => {
    if (g) groups.current.set(id, g)
    else groups.current.delete(id)
  }

  // SPACE / E toggles grab. Register once.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === ' ' || k === 'e' || e.code === 'Space') {
        if (k === ' ' || e.code === 'Space') e.preventDefault()
        pressRef.current = true
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const player = readPlayer(PLAYER)
    const grabbedId = grabbedRef.current

    // If the currently-grabbed object got completed/removed, forget it.
    if (grabbedId && !groups.current.has(grabbedId)) grabbedRef.current = null

    // Find the nearest grabbable while we aren't holding anything.
    let nearestId: string | null = null
    let nearestDist = GRAB_RANGE
    if (!grabbedRef.current) {
      for (const obj of active) {
        const g = groups.current.get(obj.id)
        if (!g) continue
        // 2D proximity — player swims in the X/Y plane; Z is cosmetic depth only.
        const d = Math.hypot(g.position.x - player.x, g.position.y - player.y)
        if (d < nearestDist) {
          nearestDist = d
          nearestId = obj.id
        }
      }
    }

    // Resolve a grab/drop press.
    if (pressRef.current) {
      pressRef.current = false
      if (grabbedRef.current) grabbedRef.current = null // drop in place
      else if (nearestId) grabbedRef.current = nearestId
    }

    // Update every visible object.
    const held = grabbedRef.current
    for (const obj of active) {
      const g = groups.current.get(obj.id)
      if (!g) continue

      if (obj.id === held) {
        // Follow Reginald with a little trailing lag; sit just below him.
        FOLLOW.set(player.x, player.y - 0.4, player.z + 0.5)
        g.position.lerp(FOLLOW, 1 - Math.pow(0.0005, delta))
        g.scale.setScalar(1)

        const dz = obj.dropZone
        // 2D check — the carried object trails the player in X/Y; Z stays cosmetic.
        const dropDist = Math.hypot(g.position.x - dz[0], g.position.y - dz[1])
        if (dropDist < DROP_RADIUS) {
          grabbedRef.current = null
          useGame.getState().completeCrime(obj.id) // handles dialogue + river health
        }
      } else if (obj.id === nearestId) {
        g.scale.setScalar(1 + Math.sin(t * 7) * 0.08) // "grab me" pulse
      } else {
        g.scale.setScalar(1)
      }
    }

    // Drop-zone marker follows the held object's target.
    const marker = markerRef.current
    if (marker) {
      const heldObj = held ? active.find((o) => o.id === held) : undefined
      if (heldObj) {
        marker.visible = true
        marker.position.set(heldObj.dropZone[0], heldObj.dropZone[1], heldObj.dropZone[2])
        marker.rotation.z = t * 0.8
        marker.scale.setScalar(1 + Math.sin(t * 4) * 0.12)
      } else {
        marker.visible = false
      }
    }
  })

  return (
    <>
      {active.map((obj) => (
        <CrimeObjectView key={obj.id} obj={obj} register={register} />
      ))}

      {/* Active drop-zone marker (hidden until something is carried). */}
      <mesh ref={markerRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.1, 0.09, 8, 32]} />
        <meshBasicMaterial color="#ffd34d" transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </>
  )
}
