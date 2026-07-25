import { useGame } from './store'

export function HUD() {
  const crimes = useGame((s) => s.crimes)
  const health = useGame((s) => s.riverHealth)

  return (
    <div style={overlay}>
      <div style={panel}>
        <h1 style={title}>Catfish Chaos: HONK!</h1>
        <p style={subtitle}>Sir Reginald’s to-do list</p>
        <ul style={{ listStyle: 'none' }}>
          {crimes.map((c) => (
            <li
              key={c.id}
              style={{ ...crimeRow, opacity: c.done ? 0.45 : 1, textDecoration: c.done ? 'line-through' : 'none' }}
            >
              {c.done ? '☑' : '☐'} {c.label}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, marginBottom: 4 }}>River clarity: {health}%</div>
          <div style={barTrack}>
            <div style={{ ...barFill, width: `${health}%` }} />
          </div>
        </div>
        <p style={hint}>WASD swim · SPACE / E grab & drop · H honk</p>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  padding: 20,
  color: '#dff3ff',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
}
const panel: React.CSSProperties = {
  pointerEvents: 'auto',
  maxWidth: 320,
  background: 'rgba(6,40,61,0.55)',
  border: '1px solid rgba(191,230,255,0.25)',
  borderRadius: 12,
  padding: 16,
  backdropFilter: 'blur(4px)',
}
const title: React.CSSProperties = { fontSize: 22, fontWeight: 800, letterSpacing: 0.5 }
const subtitle: React.CSSProperties = { fontSize: 13, opacity: 0.8, marginBottom: 10 }
const crimeRow: React.CSSProperties = { padding: '6px 0', fontSize: 14 }
const barTrack: React.CSSProperties = {
  height: 10,
  background: 'rgba(255,255,255,0.15)',
  borderRadius: 6,
  overflow: 'hidden',
}
const barFill: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg,#3fa9f5,#7ff0d0)',
  transition: 'width 0.4s ease',
}
const hint: React.CSSProperties = { fontSize: 11, opacity: 0.5, marginTop: 10, fontStyle: 'italic' }
