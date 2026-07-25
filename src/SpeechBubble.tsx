import { useEffect, useState } from 'react'
import { useGame } from './store'

/**
 * HTML-overlay speech bubble bound to store.currentLine.
 * Pops in with a scale+fade, follows a fixed top-center anchor, and animates
 * out when the line clears. Non-interactive (pointerEvents: none).
 */
export function SpeechBubble() {
  const currentLine = useGame((s) => s.currentLine)
  const [displayLine, setDisplayLine] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (currentLine) {
      setDisplayLine(currentLine.text)
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = setTimeout(() => setDisplayLine(null), 220)
    return () => clearTimeout(t)
  }, [currentLine])

  if (!displayLine) return null

  const isHonk = displayLine.trim().toUpperCase() === 'HONK.'

  return (
    <div style={anchor}>
      <div
        style={{
          ...bubble,
          ...(isHonk ? honkBubble : null),
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.6)',
        }}
      >
        <span style={{ ...text, ...(isHonk ? honkText : null) }}>{displayLine}</span>
        <span style={{ ...tail, ...(isHonk ? honkTail : null) }} />
      </div>
    </div>
  )
}

const anchor: React.CSSProperties = {
  position: 'fixed',
  top: 28,
  left: '50%',
  transform: 'translateX(-50%)',
  pointerEvents: 'none',
  zIndex: 20,
}

const bubble: React.CSSProperties = {
  position: 'relative',
  maxWidth: '70vw',
  padding: '12px 18px',
  background: '#fffef2',
  color: '#1b1b1b',
  border: '3px solid #1b2b3a',
  borderRadius: 16,
  boxShadow: '4px 4px 0 rgba(11,26,37,0.55)',
  transformOrigin: 'center top',
  transition: 'transform 180ms cubic-bezier(0.34,1.56,0.64,1), opacity 160ms ease',
  whiteSpace: 'nowrap',
}

const honkBubble: React.CSSProperties = {
  background: '#ffe14d',
  border: '3px solid #7a4b00',
  boxShadow: '4px 4px 0 rgba(122,75,0,0.6)',
}

const text: React.CSSProperties = {
  fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  fontWeight: 800,
  fontSize: 18,
  letterSpacing: 0.3,
  lineHeight: 1.15,
}

const honkText: React.CSSProperties = {
  fontSize: 26,
  letterSpacing: 2,
  color: '#7a4b00',
  textTransform: 'uppercase',
}

const tail: React.CSSProperties = {
  position: 'absolute',
  bottom: -9,
  left: '50%',
  width: 16,
  height: 16,
  background: '#fffef2',
  borderRight: '3px solid #1b2b3a',
  borderBottom: '3px solid #1b2b3a',
  transform: 'translateX(-50%) rotate(45deg)',
}

const honkTail: React.CSSProperties = {
  background: '#ffe14d',
  borderRight: '3px solid #7a4b00',
  borderBottom: '3px solid #7a4b00',
}
