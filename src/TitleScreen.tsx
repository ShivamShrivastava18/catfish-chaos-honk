import { useGame } from './store'
import { SPRITES } from './sprites'

export function TitleScreen() {
  const startGame = useGame((s) => s.startGame)

  return (
    <div style={overlay}>
      <style>{keyframes}</style>
      <div style={card}>
        <img src={SPRITES.reginaldFront} alt="Sir Reginald" style={hero} />
        <h1 style={title}>Catfish Chaos: HONK!</h1>
        <p style={subtitle}>A honk-able adventure</p>
        <p style={premise}>
          Sir Reginald, a top-hatted gentleman catfish, takes petty revenge on a
          polluting riverside town. Every crime cleans the river a little more.
        </p>
        <button
          style={startBtn}
          onClick={() => startGame()}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
        >
          START
        </button>
        <p style={controls}>WASD swim · SPACE grab · H honk</p>
      </div>
    </div>
  )
}

const keyframes = `
@keyframes titleFadeIn { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes heroBob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
`

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at center, rgba(6,40,61,0.7) 0%, rgba(6,40,61,0.94) 100%)',
  color: '#dff3ff',
  fontFamily: 'inherit',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  zIndex: 10,
}
const card: React.CSSProperties = {
  animation: 'titleFadeIn 0.6s ease both',
  maxWidth: 480,
  textAlign: 'center',
  padding: '32px 28px',
  background: 'rgba(6,40,61,0.55)',
  border: '1px solid rgba(127,240,208,0.3)',
  borderRadius: 18,
  backdropFilter: 'blur(6px)',
  boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
}
const hero: React.CSSProperties = {
  width: 128,
  height: 128,
  objectFit: 'contain',
  imageRendering: 'pixelated',
  animation: 'heroBob 3s ease-in-out infinite',
  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
}
const title: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 900,
  letterSpacing: 0.5,
  margin: '4px 0 0',
  color: '#7ff0d0',
  textShadow: '0 2px 0 #06283d, 0 3px 10px rgba(63,169,245,0.6)',
}
const subtitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#3fa9f5',
  margin: '6px 0 14px',
  letterSpacing: 1,
  textTransform: 'uppercase',
}
const premise: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.55,
  opacity: 0.85,
  margin: '0 auto 22px',
  maxWidth: 380,
}
const startBtn: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: 20,
  fontWeight: 800,
  letterSpacing: 2,
  color: '#06283d',
  background: 'linear-gradient(180deg,#7ff0d0,#3fa9f5)',
  border: 'none',
  borderRadius: 12,
  padding: '12px 44px',
  boxShadow: '0 6px 0 #1d6fa5, 0 8px 20px rgba(0,0,0,0.4)',
  transition: 'transform 0.12s ease',
  fontFamily: 'inherit',
}
const controls: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.6,
  marginTop: 18,
  letterSpacing: 0.5,
}
