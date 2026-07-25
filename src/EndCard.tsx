import { useGame } from './store'
import { SPRITES } from './sprites'

const ENDING_LINE = 'The water is clean. Do not mistake that for mercy.'

export function EndCard() {
  const reset = useGame((s) => s.reset)

  return (
    <div style={overlay}>
      <style>{keyframes}</style>
      <div style={card}>
        <img src={SPRITES.reginaldFront} alt="Sir Reginald" style={hero} />
        <p style={eyebrow}>The river runs clear</p>
        <p style={line}>&ldquo;{ENDING_LINE}&rdquo;</p>

        <div style={statBox}>
          <p style={stat}>
            Monitored freshwater species populations have fallen{' '}
            <span style={statNum}>84%</span> since 1970.
          </p>
          <p style={source}>— WWF Living Planet Report 2020</p>
        </div>

        <button
          style={playBtn}
          onClick={() => reset()}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
        >
          Play again
        </button>
      </div>
    </div>
  )
}

const keyframes = `
@keyframes endOverlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes endCardIn { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes statReveal { 0%,55% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: none; } }
`

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at center, rgba(6,40,61,0.75) 0%, rgba(6,40,61,0.96) 100%)',
  color: '#dff3ff',
  fontFamily: 'inherit',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  animation: 'endOverlayIn 0.5s ease both',
  zIndex: 10,
}
const card: React.CSSProperties = {
  animation: 'endCardIn 0.7s cubic-bezier(0.2,0.8,0.2,1) both',
  maxWidth: 460,
  textAlign: 'center',
  padding: '32px 28px',
  background: 'rgba(6,40,61,0.6)',
  border: '1px solid rgba(127,240,208,0.35)',
  borderRadius: 18,
  backdropFilter: 'blur(6px)',
  boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
}
const hero: React.CSSProperties = {
  width: 104,
  height: 104,
  objectFit: 'contain',
  imageRendering: 'pixelated',
  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
}
const eyebrow: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#7ff0d0',
  margin: '4px 0 12px',
}
const line: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  fontStyle: 'italic',
  lineHeight: 1.35,
  color: '#dff3ff',
  margin: '0 0 24px',
}
const statBox: React.CSSProperties = {
  animation: 'statReveal 1.8s ease both',
  background: 'rgba(0,0,0,0.28)',
  border: '1px solid rgba(63,169,245,0.3)',
  borderRadius: 12,
  padding: '16px 18px',
  margin: '0 0 24px',
}
const stat: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.5,
  margin: 0,
  opacity: 0.92,
}
const statNum: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 20,
  color: '#3fa9f5',
}
const source: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.55,
  marginTop: 8,
  fontStyle: 'italic',
}
const playBtn: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: 17,
  fontWeight: 800,
  letterSpacing: 1,
  color: '#06283d',
  background: 'linear-gradient(180deg,#7ff0d0,#3fa9f5)',
  border: 'none',
  borderRadius: 12,
  padding: '11px 38px',
  boxShadow: '0 6px 0 #1d6fa5, 0 8px 20px rgba(0,0,0,0.4)',
  transition: 'transform 0.12s ease',
  fontFamily: 'inherit',
}
