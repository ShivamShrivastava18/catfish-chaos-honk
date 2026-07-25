import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MathUtils,
  Shape,
  ShapeGeometry,
  ShaderMaterial,
  type Mesh,
  type MeshBasicMaterial,
  type Group,
} from 'three'
import { BillboardSprite } from './BillboardSprite'
import { SPRITES } from './sprites'
import { useGame } from './store'

/**
 * Ambient underwater life + fake god rays. Drop INSIDE the 3D scene.
 * Reads riverHealth every frame (no React re-renders) so fish fade in as the
 * water clears and god rays brighten with it.
 */

interface FishDatum {
  x: number
  baseY: number
  z: number
  dir: 1 | -1
  speed: number
  bobAmp: number
  bobFreq: number
  phase: number
  scale: number
  baseOpacity: number
  color: string
}

const X_BOUND = 22
const FISH_COLORS = ['#e8c07a', '#cfa15a', '#9ec6c0', '#7fae9a', '#d98d6b', '#bca0c8']

function buildFish(count: number): FishDatum[] {
  const fish: FishDatum[] = []
  for (let i = 0; i < count; i++) {
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1
    fish.push({
      x: MathUtils.lerp(-X_BOUND, X_BOUND, Math.random()),
      baseY: MathUtils.lerp(-4, 9, Math.random()),
      z: MathUtils.lerp(-9, 4, Math.random()),
      dir,
      speed: MathUtils.lerp(0.5, 1.4, Math.random()),
      bobAmp: MathUtils.lerp(0.15, 0.7, Math.random()),
      bobFreq: MathUtils.lerp(0.6, 1.6, Math.random()),
      phase: Math.random() * Math.PI * 2,
      scale: MathUtils.lerp(0.28, 0.62, Math.random()),
      baseOpacity: MathUtils.lerp(0.6, 0.9, Math.random()),
      color: FISH_COLORS[i % FISH_COLORS.length],
    })
  }
  return fish
}

/** Flat side-profile fish silhouette pointing +x (nose to the right). */
function useFishGeometry(): ShapeGeometry {
  return useMemo(() => {
    const s = new Shape()
    s.moveTo(0.5, 0)
    s.quadraticCurveTo(0.12, 0.26, -0.24, 0.12)
    s.lineTo(-0.5, 0.3)
    s.lineTo(-0.36, 0)
    s.lineTo(-0.5, -0.3)
    s.lineTo(-0.24, -0.12)
    s.quadraticCurveTo(0.12, -0.26, 0.5, 0)
    return new ShapeGeometry(s)
  }, [])
}

const GOD_RAY_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const GOD_RAY_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    // Soft horizontal edges, strong at top fading toward the riverbed.
    float edge = smoothstep(0.0, 0.45, vUv.x) * smoothstep(1.0, 0.55, vUv.x);
    float fade = smoothstep(0.0, 0.85, vUv.y);
    float a = edge * fade * uOpacity;
    gl_FragColor = vec4(uColor, a);
  }
`

interface RayDatum {
  x: number
  z: number
  tilt: number
  width: number
  swayAmp: number
  swaySpeed: number
  phase: number
}

function buildRays(count: number): RayDatum[] {
  const rays: RayDatum[] = []
  for (let i = 0; i < count; i++) {
    rays.push({
      x: MathUtils.lerp(-15, 15, (i + 0.5 + (Math.random() - 0.5) * 0.4) / count),
      z: MathUtils.lerp(-7, 1, Math.random()),
      tilt: MathUtils.lerp(-0.18, 0.18, Math.random()),
      width: MathUtils.lerp(3.5, 6.5, Math.random()),
      swayAmp: MathUtils.lerp(0.04, 0.1, Math.random()),
      swaySpeed: MathUtils.lerp(0.15, 0.35, Math.random()),
      phase: Math.random() * Math.PI * 2,
    })
  }
  return rays
}

export interface AmbientLifeProps {
  fishCount?: number
  rayCount?: number
}

export function AmbientLife({ fishCount = 16, rayCount = 5 }: AmbientLifeProps) {
  const fish = useMemo(() => buildFish(fishCount), [fishCount])
  const rays = useMemo(() => buildRays(rayCount), [rayCount])
  const fishGeo = useFishGeometry()

  const fishRefs = useRef<(Mesh | null)[]>([])
  const rayRefs = useRef<(Group | null)[]>([])

  const rayMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color('#cfeeff') },
          uOpacity: { value: 0 },
        },
        vertexShader: GOD_RAY_VERT,
        fragmentShader: GOD_RAY_FRAG,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const d = Math.min(delta, 0.05)
    const healthFrac = useGame.getState().riverHealth / 100
    const activeFloat = healthFrac * fish.length

    for (let i = 0; i < fish.length; i++) {
      const mesh = fishRefs.current[i]
      if (!mesh) continue
      const f = fish[i]

      f.x += f.dir * f.speed * d
      if (f.x > X_BOUND) f.x = -X_BOUND
      else if (f.x < -X_BOUND) f.x = X_BOUND

      mesh.position.set(f.x, f.baseY + Math.sin(t * f.bobFreq + f.phase) * f.bobAmp, f.z)
      mesh.scale.set(f.dir === 1 ? f.scale : -f.scale, f.scale, f.scale)

      const target = MathUtils.clamp(activeFloat - i, 0, 1) * f.baseOpacity
      const mat = mesh.material as MeshBasicMaterial
      mat.opacity = MathUtils.damp(mat.opacity, target, 3, d)
      mesh.visible = mat.opacity > 0.01
    }

    // God rays: subtle, brighter as the water clears.
    rayMaterial.uniforms.uOpacity.value = MathUtils.lerp(0.03, 0.13, healthFrac)
    for (let i = 0; i < rays.length; i++) {
      const g = rayRefs.current[i]
      if (!g) continue
      const r = rays[i]
      g.rotation.z = r.tilt + Math.sin(t * r.swaySpeed + r.phase) * r.swayAmp
    }
  })

  return (
    <group>
      {fish.map((f, i) => (
        <mesh
          key={`fish-${i}`}
          ref={(el) => (fishRefs.current[i] = el)}
          geometry={fishGeo}
          visible={false}
        >
          <meshBasicMaterial
            color={f.color}
            transparent
            opacity={0}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      ))}

      {rays.map((r, i) => (
        <group key={`ray-${i}`} ref={(el) => (rayRefs.current[i] = el)} position={[r.x, 6, r.z]}>
          <mesh material={rayMaterial}>
            <planeGeometry args={[r.width, 34]} />
          </mesh>
        </group>
      ))}

      {/* Gentle seabed props. */}
      <Suspense fallback={null}>
        <BillboardSprite url={SPRITES.rock} position={[-9, -5.4, -3]} scale={2.2} />
        <BillboardSprite url={SPRITES.rock} position={[11, -5.5, -6]} scale={1.6} flipX />
        <BillboardSprite url={SPRITES.rock} position={[4, -5.6, -8]} scale={1.3} />
        <BillboardSprite url={SPRITES.cattail} position={[-13, -4.4, -5]} scale={3.4} />
        <BillboardSprite url={SPRITES.cattail} position={[14, -4.2, -4]} scale={3.8} flipX />
        <BillboardSprite url={SPRITES.cattail} position={[-4, -4.6, -9]} scale={3} />
      </Suspense>
    </group>
  )
}
