import { useEffect, useState } from 'react'
import { useGame } from './store'
import { LEVELS } from './levels'

const CHAPTER_WORDS = ['One', 'Two', 'Three', 'Four']

/**
 * Chapter title/clear cards.
 *  - Level start (phase 'intro'): a non-blocking title banner that animates in,
 *    holds, then fades out on its own so the intro dialogue can play.
 *  - Level end (phase 'levelclear'): a centered "Chapter Clear" card with a
 *    Continue control that calls nextLevel().
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
    return (
      <div style={clearOverlay}>
        <style>{keyframes}</style>
        <div style={clearCard}>
          <p style={clearEyebrow}>Chapter {chapterWord}</p>
          <h2 style={clearTitle}>{level.title}</h2>
          <div style={clearBadge}>CHAPTER CLEAR</div>
          <p style={clearNote}>River clarity restored to {health}%.</p>
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
          <span style={bannerEyebrow}>Chapter {chapterWord}</span>
          <span style={bannerTitle}>{level.title}</span>
          <span style={bannerSub}>{level.subtitle}</span>
        </div>
      </div>
    )
  }

  return null
}

const keyframes = `
@keyframes lvlOverlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes lvlCardIn { from { opacity: 0; transform: translateY(22px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes badgePop { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
`

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
const bannerEyebrow: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: 4,
  textTransform: 'uppercase',
  color: '#7ff0d0',
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
  background: 'radial-gradient(ellipse at center, rgba(6,40,61,0.72) 0%, rgba(6,40,61,0.95) 100%)',
  color: '#dff3ff',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  animation: 'lvlOverlayIn 0.5s ease both',
  zIndex: 12,
}
const clearCard: React.CSSProperties = {
  animation: 'lvlCardIn 0.7s cubic-bezier(0.2,0.8,0.2,1) both',
  maxWidth: 420,
  textAlign: 'center',
  padding: '30px 28px',
  background: 'rgba(6,40,61,0.6)',
  border: '1px solid rgba(127,240,208,0.35)',
  borderRadius: 18,
  backdropFilter: 'blur(6px)',
  boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
}
const clearEyebrow: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 3,
  textTransform: 'uppercase',
  color: '#3fa9f5',
  margin: '0 0 4px',
}
const clearTitle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  letterSpacing: 0.5,
  margin: '0 0 16px',
  color: '#dff3ff',
}
const clearBadge: React.CSSProperties = {
  display: 'inline-block',
  animation: 'badgePop 0.6s 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
  fontSize: 15,
  fontWeight: 900,
  letterSpacing: 3,
  color: '#06283d',
  background: 'linear-gradient(180deg,#7ff0d0,#3fa9f5)',
  borderRadius: 8,
  padding: '8px 18px',
  boxShadow: '0 4px 0 #1d6fa5',
}
const clearNote: React.CSSProperties = {
  fontSize: 14,
  opacity: 0.85,
  margin: '18px 0 22px',
}
const continueBtn: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: 17,
  fontWeight: 800,
  letterSpacing: 1.5,
  color: '#06283d',
  background: 'linear-gradient(180deg,#7ff0d0,#3fa9f5)',
  border: 'none',
  borderRadius: 12,
  padding: '11px 34px',
  boxShadow: '0 6px 0 #1d6fa5, 0 8px 20px rgba(0,0,0,0.4)',
  transition: 'transform 0.12s ease',
  fontFamily: 'inherit',
}
