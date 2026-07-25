import { useMemo } from 'react'
import { Billboard } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { TextureLoader, NearestFilter, SRGBColorSpace, type Texture } from 'three'

export interface BillboardSpriteProps {
  url: string
  position?: [number, number, number]
  scale?: number
  flipX?: boolean
  opacity?: number
}

/**
 * Pixel-crisp, camera-facing textured plane.
 * Plane aspect is derived from the texture's image dimensions so sprites
 * are never squished. Wrap in <Suspense> — useLoader suspends while loading.
 */
export function BillboardSprite({
  url,
  position = [0, 0, 0],
  scale = 1,
  flipX = false,
  opacity = 1,
}: BillboardSpriteProps) {
  const texture = useLoader(TextureLoader, url) as Texture

  // Pixel-art crispness + correct color space.
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.colorSpace = SRGBColorSpace

  // Derive plane w/h from image dimensions (normalized so the larger side = scale).
  const [w, h] = useMemo<[number, number]>(() => {
    const img = texture.image as { width?: number; height?: number } | undefined
    const iw = img?.width ?? 1
    const ih = img?.height ?? 1
    const aspect = iw / ih
    return aspect >= 1 ? [1, 1 / aspect] : [aspect, 1]
  }, [texture])

  return (
    <Billboard position={position}>
      <mesh scale={[w * scale * (flipX ? -1 : 1), h * scale, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
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
