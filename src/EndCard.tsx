import { useGame } from './store'
import { SPRITES } from './sprites'

const ENDING_LINE = 'The water is clean. Do not mistake that for mercy.'

/** Things a player can actually do — kept short, concrete, attributed. */
const ACTIONS = [
  'Fix a dripping tap — one drip a second wastes ~7,900 litres a year.',
  'Cut one minute off your shower — about 280 litres saved a month.',
  'Run the dishwasher and washing machine only on full loads.',
  'Turn the tap off while you brush.',
]

/**
 * Ending — "gentleman's salvage" pixel-art card matching the HUD/LevelCard.
 * After the story stat, two earned beats: the water cost of the AI/data centres
 * (on-theme — this game was AI-built), then what the player can actually do.
 * Tall content scrolls within the card so it always fits.
 */
export function EndCard() {
  const reset = useGame((s) => s.reset)

  return (
    <div style={overlay}>
      <style>{keyframes}</style>
      <div style={card}>
        <Corners />
        <img src={SPRITES.reginaldFront} alt="Sir Reginald" style={hero} />

        <div style={ribbonWrap}>
          <img src={SPRITES.ribbon} alt="" style={ribbonImg} />
          <span style={ribbonText}>The River Runs Clear</span>
        </div>
        <p style={line}>&ldquo;{ENDING_LINE}&rdquo;</p>

        <div style={factPanel}>
          <p style={factEyebrow}>The river remembers</p>
          <p style={factText}>
            Monitored freshwater species populations have fallen{' '}
            <span style={num}>84%</span> since 1970.
          </p>
          <p style={factSource}>— WWF Living Planet Report 2020</p>
        </div>

        <div style={factPanel}>
          <p style={factEyebrow}>The bill comes due</p>
          <p style={factText}>
            Training a single large AI model can swallow{' '}
            <span style={num}>~700,000 litres</span> of freshwater — just for cooling. US data
            centres drank an estimated <span style={num}>66 billion litres</span> in 2023.
          </p>
          <p style={factSource}>— EESI · Environmental Law Institute (2024)</p>
          <p style={kicker}>This game was built with AI. The river keeps that receipt too.</p>
        </div>

        <div style={factPanel}>
          <p style={factEyebrow}>What you can do</p>
          <ul style={actionList}>
            {ACTIONS.map((a) => (
              <li key={a} style={actionItem}>
                <img src={SPRITES.bubbleFull} alt="" style={actionBullet} />
                <span>{a}</span>
              </li>
            ))}
          </ul>
          <p style={factSource}>— US EPA WaterSense · Alliance for Water Efficiency</p>
        </div>

        <button
          style={playBtn}
          onClick={() => reset()}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  )
}

/** Four brass rivet/rope corner ornaments framing a salvage panel. */
function Corners() {
  return (
    <>
      <img src={SPRITES.panelCorner} alt="" style={{ ...corner, top: -3, left: -3 }} />
      <img src={SPRITES.panelCorner} alt="" style={{ ...corner, top: -3, right: -3, transform: 'rotate(90deg)' }} />
      <img src={SPRITES.panelCorner} alt="" style={{ ...corner, bottom: -3, right: -3, transform: 'rotate(180deg)' }} />
      <img src={SPRITES.panelCorner} alt="" style={{ ...corner, bottom: -3, left: -3, transform: 'rotate(270deg)' }} />
    </>
  )
}

const keyframes = `
@keyframes endOverlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes endCardIn { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: none; } }
`

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  background: 'radial-gradient(ellipse at center, rgba(6,40,61,0.76) 0%, rgba(4,20,32,0.97) 100%)',
  color: '#dff3ff',
  fontFamily: 'inherit',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  animation: 'endOverlayIn 0.5s ease both',
  zIndex: 12,
}
const card: React.CSSProperties = {
  position: 'relative',
  animation: 'endCardIn 0.7s cubic-bezier(0.2,0.8,0.2,1) both',
  maxWidth: 460,
  width: '88vw',
  maxHeight: '92vh',
  overflowY: 'auto',
  textAlign: 'center',
  padding: '30px 28px 28px',
  background: 'linear-gradient(180deg, rgba(10,49,73,0.95), rgba(4,28,42,0.98))',
  border: '2px solid #b98f3d',
  borderRadius: 6,
  boxShadow: 'inset 0 0 0 2px rgba(6,40,61,0.9), inset 0 0 34px rgba(0,0,0,0.55), 0 16px 54px rgba(0,0,0,0.6)',
}
const hero: React.CSSProperties = {
  width: 96,
  height: 96,
  objectFit: 'contain',
  imageRendering: 'pixelated',
  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
}
const corner: React.CSSProperties = {
  position: 'absolute',
  width: 24,
  height: 24,
  imageRendering: 'pixelated',
  pointerEvents: 'none',
  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
}
const ribbonWrap: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 236,
  height: 38,
  margin: '4px auto 12px',
}
const ribbonImg: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  imageRendering: 'pixelated',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
}
const ribbonText: React.CSSProperties = {
  position: 'relative',
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#ffe6b0',
  textShadow: '0 1px 2px rgba(0,0,0,0.85)',
}
const line: React.CSSProperties = {
  fontSize: 19,
  fontWeight: 700,
  fontStyle: 'italic',
  lineHeight: 1.35,
  margin: '0 0 20px',
}
const factPanel: React.CSSProperties = {
  textAlign: 'left',
  background: 'rgba(3,20,31,0.6)',
  border: '1px solid rgba(185,143,61,0.4)',
  borderLeft: '3px solid #c9a24a',
  borderRadius: 6,
  padding: '12px 14px',
  margin: '0 0 14px',
}
const factEyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#f4dc95',
  margin: '0 0 6px',
}
const factText: React.CSSProperties = { fontSize: 13, lineHeight: 1.5, opacity: 0.92, margin: 0 }
const num: React.CSSProperties = { fontWeight: 900, color: '#7ff0d0' }
const factSource: React.CSSProperties = {
  fontSize: 10.5,
  fontStyle: 'italic',
  opacity: 0.6,
  margin: '8px 0 0',
}
const kicker: React.CSSProperties = {
  fontSize: 12,
  fontStyle: 'italic',
  color: '#ffd9a6',
  opacity: 0.9,
  margin: '10px 0 0',
}
const actionList: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0 }
const actionItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  fontSize: 13,
  lineHeight: 1.45,
  padding: '4px 0',
}
const actionBullet: React.CSSProperties = {
  width: 14,
  height: 14,
  marginTop: 2,
  flexShrink: 0,
  imageRendering: 'pixelated',
}
const playBtn: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: 17,
  fontWeight: 900,
  letterSpacing: 1.5,
  color: '#2a1a06',
  background: 'linear-gradient(180deg,#f4dc95,#c9a24a 52%,#a67c33)',
  border: '2px solid #6e4e1e',
  borderRadius: 5,
  padding: '11px 38px',
  marginTop: 6,
  boxShadow: '0 5px 0 #5c3f18, 0 8px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.4)',
  textShadow: '0 1px 0 rgba(255,255,255,0.3)',
  transition: 'transform 0.12s ease',
  fontFamily: 'inherit',
}
