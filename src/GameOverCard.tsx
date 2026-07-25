import { useEffect, useState } from 'react'
import { useGame } from './store'

/**
 * GAME OVER flash. The store restarts straight back to the title on a second
 * (final) death, so there is no lasting 'gameover' phase to gate on — instead we
 * transiently watch the store for that exact transition: a boss fight that was in
 * progress with the last stand already burned (lastChanceUsed) snapping back to
 * 'title'. When we catch it we show a brief "GAME OVER" beat over the fresh title
 * screen, then fade out. Self-gating: mount once at the overlay layer.
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
      <div style={card}>
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
`

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at center, rgba(20,4,8,0.82) 0%, rgba(2,4,8,0.97) 100%)',
  color: '#ffd9c2',
  textShadow: '0 2px 6px rgba(0,0,0,0.8)',
  animation: 'goOverlayIn 0.4s ease both',
  zIndex: 40,
}
const card: React.CSSProperties = {
  textAlign: 'center',
  maxWidth: 460,
  padding: '0 24px',
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
