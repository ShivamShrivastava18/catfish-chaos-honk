import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Scene } from './Scene'
import { HUD } from './HUD'

export function App() {
  return (
    <>
      <Canvas camera={{ position: [0, 4, 14], fov: 55 }} dpr={[1, 2]}>
        <Scene />
        <EffectComposer>
          <Bloom intensity={0.6} luminanceThreshold={0.6} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.75} />
        </EffectComposer>
      </Canvas>
      <HUD />
    </>
  )
}
