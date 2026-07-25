import { useEffect, useState } from 'react'
import { useGame } from './store'
import { SPRITES } from './sprites'

/**
 * GAME OVER flash. The store restarts straight back to the title on a second
 * (final) death, so there is no lasting 'gameover' phase to gate on — instead we
 * transiently watch the store for that exact transition: a boss fight that was in
 * progress with the last stand already burned (lastChanceUsed) snapping back to
 * 'title'. When we catch it we show a brief "GAME OVER" beat over the fresh title
 * screen, then fade out. Self-gating: mount once at the overlay layer.
 *
 * Styled to the "gentleman's salvage" personality: the Don's pixel top hat drifts
 * down through the dark and his cigar-ember bubble winks out.
 */
export function GameOverCard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const unsub = useGame.subscribe((state, prev) => {
      const finalDeath =
        prev.gamePhase === 'playing' && prev.lastChanceUsed && state.gamePhase === 'title'
      if (finalDeath) setVisible(true)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setVisible(false), 2800)
    return () => clearTimeout(t)
  }, [visible])

  if (!visible) return null

  return (
    <div style={overlay}>
      <style>{keyframes}</style>
      <img src={SPRITES.topHat} alt="" style={driftingHat} />
      <div style={card}>
        <img src={SPRITES.bubbleCigar} alt="" style={ember} />
        <p style={eyebrow}>He sleeps with the fishes</p>
        <h1 style={title}>GAME OVER</h1>
        <p style={note}>The Don’s hat drifts down through the dark. Back to the beginning.</p>
      </div>
    </div>
  )
}

const keyframes = `
@keyframes goOverlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes goCardIn { 0% { opacity: 0; transform: scale(1.3); letter-spacing: 12px; } 100% { opacity: 1; transform: scale(1); } }
@keyframes hatSink { 0% { transform: translate(-50%, -60vh) rotate(-18deg); opacity: 0; } 25% { opacity: 0.9; } 100% { transform: translate(-50%, 60vh) rotate(14deg); opacity: 0; } }
@keyframes emberFade { 0% { opacity: 0; transform: scale(0.6); } 30% { opacity: 1; transform: scale(1); } 100% { opacity: 0.25; transform: scale(0.9); } }
`

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at center, rgba(20,4,8,0.84) 0%, rgba(2,4,8,0.98) 100%)',
  color: '#ffd9c2',
  textShadow: '0 2px 6px rgba(0,0,0,0.8)',
  animation: 'goOverlayIn 0.4s ease both',
  overflow: 'hidden',
  zIndex: 40,
}
const driftingHat: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: 120,
  imageRendering: 'pixelated',
  pointerEvents: 'none',
  animation: 'hatSink 2.8s cubic-bezier(0.4,0,0.6,1) both',
  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))',
}
const card: React.CSSProperties = {
  position: 'relative',
  textAlign: 'center',
  maxWidth: 460,
  padding: '0 24px',
}
const ember: React.CSSProperties = {
  width: 34,
  height: 34,
  imageRendering: 'pixelated',
  margin: '0 auto 10px',
  display: 'block',
  animation: 'emberFade 2.8s ease-out both',
  filter: 'drop-shadow(0 0 10px rgba(255,140,40,0.8))',
}
const eyebrow: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 3,
  textTransform: 'uppercase',
  color: '#ff9d5c',
  margin: '0 0 6px',
}
const title: React.CSSProperties = {
  animation: 'goCardIn 0.7s cubic-bezier(0.2,0.8,0.2,1) both',
  fontSize: 64,
  fontWeight: 900,
  letterSpacing: 2,
  margin: 0,
  color: '#ff5a4e',
  textShadow: '0 3px 0 #2a0606, 0 6px 22px rgba(255,60,50,0.55)',
}
const note: React.CSSProperties = {
  fontSize: 14,
  fontStyle: 'italic',
  opacity: 0.8,
  margin: '16px 0 0',
}
