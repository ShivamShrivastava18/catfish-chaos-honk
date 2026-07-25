import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Scene } from './Scene'
import { Level } from './Level'
import { HUD } from './HUD'
import { LevelCard } from './LevelCard'
import { TutorialHints } from './TutorialHints'
import { Cutscene } from './Cutscene'
import { SpeechBubble } from './SpeechBubble'
import { Juice } from './Juice'
import { TitleScreen } from './TitleScreen'
import { EndCard } from './EndCard'
import { AudioController } from './AudioController'
import { IntroActors } from './IntroActors'
import { GameOverCard } from './GameOverCard'
import { useGame } from './store'

export function App() {
  const gamePhase = useGame((s) => s.gamePhase)
  const inLevel = gamePhase !== 'title' && gamePhase !== 'won'

  return (
    <>
      <Canvas camera={{ position: [0, 4, 14], fov: 55 }} dpr={[1, 2]}>
        <Scene />
        {inLevel && <Level />}
        <IntroActors />
        <EffectComposer>
          <Bloom intensity={0.6} luminanceThreshold={0.6} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.75} />
        </EffectComposer>
      </Canvas>

      {/* HTML overlays (outside the Canvas). Each self-gates on gamePhase. */}
      {gamePhase === 'playing' && <HUD />}
      {gamePhase === 'playing' && <TutorialHints />}
      <Cutscene />
      <LevelCard />
      <SpeechBubble />
      <Juice />
      {gamePhase === 'title' && <TitleScreen />}
      {gamePhase === 'won' && <EndCard />}
      <GameOverCard />
      <AudioController />
    </>
  )
}
