import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Scene } from './Scene'
import { HUD } from './HUD'
import { SpeechBubble } from './SpeechBubble'
import { Juice } from './Juice'
import { TitleScreen } from './TitleScreen'
import { EndCard } from './EndCard'
import { AudioController } from './AudioController'
import { useGame } from './store'

export function App() {
  const gamePhase = useGame((s) => s.gamePhase)

  return (
    <>
      <Canvas camera={{ position: [0, 4, 14], fov: 55 }} dpr={[1, 2]}>
        <Scene />
        <EffectComposer>
          <Bloom intensity={0.6} luminanceThreshold={0.6} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.75} />
        </EffectComposer>
      </Canvas>

      {gamePhase === 'playing' && <HUD />}
      <SpeechBubble />
      <Juice />
      {gamePhase === 'title' && <TitleScreen />}
      {gamePhase === 'won' && <EndCard />}
      <AudioController />
    </>
  )
}
