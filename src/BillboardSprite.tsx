import { useMemo, useRef, useState } from 'react'
import { Billboard } from '@react-three/drei'
import { useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader, NearestFilter, SRGBColorSpace, type Texture } from 'three'

export interface BillboardSpriteProps {
  url?: string
  frames?: string[]
  fps?: number
  position?: [number, number, number]
  scale?: number
  flipX?: boolean
  opacity?: number
  anchor?: 'center' | 'bottom'
}

/**
 * Pixel-crisp, camera-facing textured plane.
 *
 * The plane's aspect is derived from the ACTIVE texture's real pixel dimensions,
 * so sprites are never squished or clipped. Pass `url` for a still, or
 * `frames` + `fps` to cycle an animation on the render clock. `anchor="bottom"`
 * plants the sprite's bottom edge at `position` (seabed props). Wrap in
 * <Suspense> — useLoader suspends while textures load.
 */
export function BillboardSprite({
  url,
  frames,
  fps = 0,
  position = [0, 0, 0],
  scale = 1,
  flipX = false,
  opacity = 1,
  anchor = 'center',
}: BillboardSpriteProps) {
  const urls = useMemo(
    () => (frames && frames.length ? frames : url ? [url] : []),
    [frames, url],
  )
  const textures = useLoader(TextureLoader, urls) as Texture[]

  // Pixel-art crispness + correct colour space (applied when the set changes).
  useMemo(() => {
    for (const t of textures) {
      t.magFilter = NearestFilter
      t.minFilter = NearestFilter
      t.generateMipmaps = false
      t.colorSpace = SRGBColorSpace
      t.needsUpdate = true
    }
  }, [textures])

  // Frame cycling on the clock (only when there are multiple frames + a rate).
  const [index, setIndex] = useState(0)
  const acc = useRef(0)
  const animate = textures.length > 1 && fps > 0
  useFrame((_, delta) => {
    if (!animate) return
    acc.current += delta
    const step = 1 / fps
    while (acc.current >= step) {
      acc.current -= step
      setIndex((i) => (i + 1) % textures.length)
    }
  })

  const active = textures[Math.min(index, textures.length - 1)]

  // Derive plane w/h from image dimensions (normalized so the larger side = 1).
  const [w, h] = useMemo<[number, number]>(() => {
    const img = active?.image as { width?: number; height?: number } | undefined
    const iw = img?.width ?? 1
    const ih = img?.height ?? 1
    const aspect = iw / ih
    return aspect >= 1 ? [1, 1 / aspect] : [aspect, 1]
  }, [active])

  const pw = w * scale
  const ph = h * scale
  const yOffset = anchor === 'bottom' ? ph / 2 : 0

  return (
    <Billboard position={position}>
      <mesh scale={[pw * (flipX ? -1 : 1), ph, 1]} position={[0, yOffset, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={active}
          transparent
          alphaTest={0.5}
          depthWrite={false}
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  )
}
