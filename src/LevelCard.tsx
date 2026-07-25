import { useEffect, useState } from 'react'
import { useGame } from './store'
import { LEVELS } from './levels'
import { SPRITES } from './sprites'

const CHAPTER_WORDS = ['One', 'Two', 'Three', 'Four']
const CLARITY_BUBBLES = 5

/**
 * Chapter title/clear cards — "gentleman's salvage" pixel-art personality shared
 * with the HUD: brass-riveted dark-teal panel, ribbon heading banner, warm brass
 * accents, bubble-sprite river-clarity readout.
 *  - Level start (phase 'intro'): a non-blocking title banner that animates in,
 *    holds, then fades out on its own so the intro dialogue can play.
 *  - Level end (phase 'levelclear'): a centered "Chapter Clear" card with the
 *    "Did You Know?" env-fact panel and a Continue control that calls nextLevel().
 */
export function LevelCard() {
  const gamePhase = useGame((s) => s.gamePhase)
  const levelIndex = useGame((s) => s.levelIndex)
  const health = useGame((s) => s.riverHealth)
  const nextLevel = useGame((s) => s.nextLevel)

  const [introShown, setIntroShown] = useState(false)

  useEffect(() => {
    if (gamePhase !== 'intro') {
      setIntroShown(false)
      return
    }
    const inId = requestAnimationFrame(() => setIntroShown(true))
    const outId = setTimeout(() => setIntroShown(false), 2800)
    return () => {
      cancelAnimationFrame(inId)
      clearTimeout(outId)
    }
  }, [gamePhase, levelIndex])

  const level = LEVELS[levelIndex]
  if (!level) return null

  const chapterWord = CHAPTER_WORDS[level.index] ?? String(level.index + 1)
  const isLast = level.index >= LEVELS.length - 1

  if (gamePhase === 'levelclear') {
    const filled = Math.round((health / 100) * CLARITY_BUBBLES)
    return (
      <div style={clearOverlay}>
        <style>{keyframes}</style>
        <div style={clearCard}>
          <Corners />
          <div style={ribbonWrap}>
            <img src={SPRITES.ribbon} alt="" style={ribbonImg} />
            <span style={ribbonText}>Chapter {chapterWord}</span>
          </div>
          <h2 style={clearTitle}>{level.title}</h2>
          <div style={clearBadge}>CHAPTER CLEAR</div>

          <p style={clearNote}>River clarity restored to {health}%.</p>
          <div style={clarityRow} aria-hidden>
            {Array.from({ length: CLARITY_BUBBLES }).map((_, i) => (
              <img
                key={i}
                src={i < filled ? SPRITES.bubbleFull : SPRITES.bubbleEmpty}
                alt=""
                style={clarityBubble}
              />
            ))}
          </div>

          <div style={factPanel}>
            <p style={factEyebrow}>Did you know?</p>
            <p style={factText}>{level.envFact.text}</p>
            <p style={factSource}>— {level.envFact.source}</p>
          </div>
          <button
            style={continueBtn}
            onClick={() => nextLevel()}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
          >
            {isLast ? 'SEE THE ENDING →' : 'NEXT CHAPTER →'}
          </button>
        </div>
      </div>
    )
  }

  if (gamePhase === 'intro') {
    return (
      <div style={bannerOverlay}>
        <style>{keyframes}</style>
        <div
          style={{
            ...banner,
            opacity: introShown ? 1 : 0,
            transform: introShown ? 'translateY(0)' : 'translateY(-14px)',
          }}
        >
          <div style={bannerRibbon}>
            <img src={SPRITES.ribbon} alt="" style={ribbonImg} />
            <span style={ribbonText}>Chapter {chapterWord}</span>
          </div>
          <span style={bannerTitle}>{level.title}</span>
          <span style={bannerSub}>{level.subtitle}</span>
        </div>
      </div>
    )
  }

  return null
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
@keyframes lvlOverlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes lvlCardIn { from { opacity: 0; transform: translateY(22px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes badgePop { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
@keyframes factIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes bubblePop { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
`

// --- shared salvage ornaments ---
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
  width: 210,
  height: 36,
  margin: '0 auto 8px',
}
const bannerRibbon: React.CSSProperties = { ...ribbonWrap, width: 230, height: 40 }
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

// --- level-start banner (non-blocking) ---
const bannerOverlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  paddingTop: '14vh',
  zIndex: 12,
}
const banner: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  color: '#dff3ff',
  textShadow: '0 2px 6px rgba(0,0,0,0.7)',
  transition: 'opacity 0.5s ease, transform 0.5s ease',
}
const bannerTitle: React.CSSProperties = {
  fontSize: 48,
  fontWeight: 900,
  letterSpacing: 0.5,
  margin: '4px 0 6px',
  color: '#dff3ff',
  textShadow: '0 2px 0 #06283d, 0 4px 14px rgba(63,169,245,0.6)',
}
const bannerSub: React.CSSProperties = {
  fontSize: 15,
  fontStyle: 'italic',
  opacity: 0.85,
}

// --- level-clear card (interactive) ---
const clearOverlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at center, rgba(6,40,61,0.74) 0%, rgba(4,20,32,0.96) 100%)',
  color: '#dff3ff',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  animation: 'lvlOverlayIn 0.5s ease both',
  zIndex: 12,
}
const clearCard: React.CSSProperties = {
  position: 'relative',
  animation: 'lvlCardIn 0.7s cubic-bezier(0.2,0.8,0.2,1) both',
  maxWidth: 430,
  width: '86vw',
  textAlign: 'center',
  padding: '28px 30px 30px',
  background: 'linear-gradient(180deg, rgba(10,49,73,0.94), rgba(4,28,42,0.97))',
  border: '2px solid #b98f3d',
  borderRadius: 6,
  boxShadow:
    'inset 0 0 0 2px rgba(6,40,61,0.9), inset 0 0 34px rgba(0,0,0,0.55), 0 16px 54px rgba(0,0,0,0.6)',
}
const clearTitle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  letterSpacing: 0.5,
  margin: '2px 0 16px',
  color: '#dff3ff',
}
const clearBadge: React.CSSProperties = {
  display: 'inline-block',
  animation: 'badgePop 0.6s 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
  fontSize: 15,
  fontWeight: 900,
  letterSpacing: 3,
  color: '#2a1a06',
  background: 'linear-gradient(180deg,#f4dc95,#c9a24a 52%,#a67c33)',
  border: '2px solid #6e4e1e',
  borderRadius: 5,
  padding: '7px 18px',
  boxShadow: '0 4px 0 #5c3f18, inset 0 1px 0 rgba(255,255,255,0.4)',
  textShadow: '0 1px 0 rgba(255,255,255,0.3)',
}
const clearNote: React.CSSProperties = {
  fontSize: 14,
  opacity: 0.85,
  margin: '18px 0 8px',
}
const clarityRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 8,
  margin: '0 0 20px',
}
const clarityBubble: React.CSSProperties = {
  width: 26,
  height: 26,
  imageRendering: 'pixelated',
  animation: 'bubblePop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
}

// --- "Did you know?" real environmental fact panel ---
const factPanel: React.CSSProperties = {
  animation: 'factIn 0.6s 0.5s cubic-bezier(0.2,0.8,0.2,1) both',
  textAlign: 'left',
  background: 'rgba(3,20,31,0.6)',
  border: '1px solid rgba(185,143,61,0.4)',
  borderLeft: '3px solid #c9a24a',
  borderRadius: 6,
  padding: '12px 14px',
  margin: '0 0 22px',
}
const factEyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#f4dc95',
  margin: '0 0 6px',
}
const factText: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  opacity: 0.92,
  margin: 0,
}
const factSource: React.CSSProperties = {
  fontSize: 10.5,
  fontStyle: 'italic',
  opacity: 0.6,
  margin: '8px 0 0',
}
const continueBtn: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: 17,
  fontWeight: 900,
  letterSpacing: 1.5,
  color: '#2a1a06',
  background: 'linear-gradient(180deg,#f4dc95,#c9a24a 52%,#a67c33)',
  border: '2px solid #6e4e1e',
  borderRadius: 5,
  padding: '11px 34px',
  boxShadow: '0 5px 0 #5c3f18, 0 8px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.4)',
  textShadow: '0 1px 0 rgba(255,255,255,0.3)',
  transition: 'transform 0.12s ease',
  fontFamily: 'inherit',
}
