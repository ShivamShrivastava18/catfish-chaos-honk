import { useEffect, useState } from 'react'
import { useGame } from './store'
import { LEVELS } from './levels'

const TUTORIAL_LEVEL = 0
const ACTION_KEYS = new Set(['w', 'a', 's', 'd', ' ', 'e', 'h', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])
const FADE_AFTER_ACT = 1400

/**
 * Contextual control hints — only during Level 1 (the tutorial). Shows the
 * ACTIVE objective's hint text; re-appears for each new objective and fades a
 * beat after the player uses a control (keydown), so it teaches without nagging.
 */
export function TutorialHints() {
  const gamePhase = useGame((s) => s.gamePhase)
  const levelIndex = useGame((s) => s.levelIndex)
  const objectiveIndex = useGame((s) => s.objectiveIndex)

  const [visible, setVisible] = useState(false)

  const isTutorial = gamePhase === 'playing' && levelIndex === TUTORIAL_LEVEL
  const active = isTutorial ? LEVELS[TUTORIAL_LEVEL]?.objectives[objectiveIndex] : undefined
  const hint = active?.hint

  // Fresh hint for each new active objective.
  useEffect(() => {
    if (!isTutorial || !hint) {
      setVisible(false)
      return
    }
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [isTutorial, hint, objectiveIndex])

  // Fade the hint once the player demonstrates a control.
  useEffect(() => {
    if (!isTutorial || !hint) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const onKey = (e: KeyboardEvent) => {
      if (!ACTION_KEYS.has(e.key.toLowerCase())) return
      if (timer) return
      timer = setTimeout(() => setVisible(false), FADE_AFTER_ACT)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (timer) clearTimeout(timer)
    }
  }, [isTutorial, hint, objectiveIndex])

  if (!isTutorial || !hint) return null

  return (
    <div style={overlay}>
      <div style={{ ...card, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)' }}>
        <span style={badge}>TUTORIAL</span>
        <span style={text}>{hint}</span>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
  paddingBottom: 36,
  zIndex: 15,
}
const card: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  maxWidth: '80vw',
  padding: '10px 18px',
  background: 'rgba(6,40,61,0.78)',
  border: '1px solid rgba(127,240,208,0.4)',
  borderRadius: 12,
  color: '#dff3ff',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
  transition: 'opacity 0.45s ease, transform 0.45s ease',
}
const badge: React.CSSProperties = {
  flexShrink: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 2,
  color: '#06283d',
  background: 'linear-gradient(180deg,#7ff0d0,#3fa9f5)',
  borderRadius: 6,
  padding: '4px 8px',
}
const text: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: 0.3,
  lineHeight: 1.25,
}
