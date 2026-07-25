import { useGame } from './store'
import { SPRITES } from './sprites'

/**
 * Title screen — "gentleman's salvage" pixel-art personality: a dark-teal brass
 * -riveted panel (panelCorner ornaments), a ribbon heading banner, pixel-crisp
 * Reginald hero, warm brass START. Content/behavior unchanged: title, subtitle,
 * premise, START (startGame), controls line.
 */
export function TitleScreen() {
  const startGame = useGame((s) => s.startGame)

  return (
    <div style={overlay}>
      <style>{keyframes}</style>
      {/* ambient drifting salvage bubbles */}
      <img src={SPRITES.bubbleFull} alt="" style={{ ...ambient, left: '18%', top: '22%', width: 42, animationDelay: '0s' }} />
      <img src={SPRITES.bubbleFull} alt="" style={{ ...ambient, left: '78%', top: '30%', width: 30, animationDelay: '1.3s' }} />
      <img src={SPRITES.bubbleFull} alt="" style={{ ...ambient, left: '68%', top: '70%', width: 54, animationDelay: '2.1s' }} />
      <img src={SPRITES.bubbleFull} alt="" style={{ ...ambient, left: '24%', top: '76%', width: 24, animationDelay: '0.7s' }} />

      <div style={card}>
        <Corners />
        <img src={SPRITES.reginaldFront} alt="Sir Reginald" style={hero} />
        <h1 style={title}>Catfish Chaos: HONK!</h1>

        <div style={ribbonWrap}>
          <img src={SPRITES.ribbon} alt="" style={ribbonImg} />
          <span style={ribbonText}>The Don of the River</span>
        </div>

        <p style={premise}>
          Sir Reginald runs this stretch of river — feared, loved, and not to be
          crossed. His fish bring him their troubles, and he makes them disappear.
          But every problem traces back to the same rot upstream: the Land Mafia.
        </p>
        <button
          style={startBtn}
          onClick={() => startGame()}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
        >
          START
        </button>
        <p style={controls}>WASD swim · SPACE grab / drop · H honk · SPACE advance dialogue</p>
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
@keyframes titleFadeIn { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes heroBob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
@keyframes bubbleDrift { 0% { transform: translateY(10px); opacity: 0; } 20% { opacity: 0.5; } 80% { opacity: 0.5; } 100% { transform: translateY(-38px); opacity: 0; } }
`

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at center, rgba(6,40,61,0.72) 0%, rgba(4,20,32,0.96) 100%)',
  color: '#dff3ff',
  fontFamily: 'inherit',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  overflow: 'hidden',
  zIndex: 10,
}
const ambient: React.CSSProperties = {
  position: 'absolute',
  imageRendering: 'pixelated',
  pointerEvents: 'none',
  opacity: 0.5,
  animation: 'bubbleDrift 5s ease-in-out infinite',
}
const card: React.CSSProperties = {
  position: 'relative',
  animation: 'titleFadeIn 0.6s ease both',
  maxWidth: 480,
  width: '86vw',
  textAlign: 'center',
  padding: '34px 30px 30px',
  background: 'linear-gradient(180deg, rgba(10,49,73,0.94), rgba(4,28,42,0.97))',
  border: '2px solid #b98f3d',
  borderRadius: 6,
  boxShadow:
    'inset 0 0 0 2px rgba(6,40,61,0.9), inset 0 0 34px rgba(0,0,0,0.55), 0 16px 54px rgba(0,0,0,0.6)',
}
const corner: React.CSSProperties = {
  position: 'absolute',
  width: 26,
  height: 26,
  imageRendering: 'pixelated',
  pointerEvents: 'none',
  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
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
  margin: '2px 0 12px',
  color: '#7ff0d0',
  textShadow: '0 2px 0 #06283d, 0 3px 10px rgba(63,169,245,0.6)',
}
const ribbonWrap: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 236,
  height: 40,
  margin: '0 auto 16px',
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
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#ffe6b0',
  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
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
  fontWeight: 900,
  letterSpacing: 3,
  color: '#2a1a06',
  background: 'linear-gradient(180deg,#f4dc95,#c9a24a 52%,#a67c33)',
  border: '2px solid #6e4e1e',
  borderRadius: 5,
  padding: '12px 46px',
  boxShadow: '0 5px 0 #5c3f18, 0 9px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.45)',
  textShadow: '0 1px 0 rgba(255,255,255,0.3)',
  transition: 'transform 0.12s ease',
  fontFamily: 'inherit',
}
const controls: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.6,
  marginTop: 18,
  letterSpacing: 0.5,
}
