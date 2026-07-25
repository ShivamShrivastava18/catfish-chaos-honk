import { useGame } from './store'
import { LEVELS } from './levels'

/**
 * In-game HUD (rendered only during phase 'playing'). Shows the current chapter,
 * an ordered objectives breadcrumb with the ACTIVE step highlighted, a
 * river-clarity bar, and a one-line story-progress note. No stale prompts.
 */
export function HUD() {
  const levelIndex = useGame((s) => s.levelIndex)
  const objectiveIndex = useGame((s) => s.objectiveIndex)
  const health = useGame((s) => s.riverHealth)
  const playerHealth = useGame((s) => s.playerHealth)
  const maxPlayerHealth = useGame((s) => s.maxPlayerHealth)
  const lastChanceUsed = useGame((s) => s.lastChanceUsed)

  const level = LEVELS[levelIndex]
  if (!level) return null

  const active = level.objectives[objectiveIndex]

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={chapterRow}>
          <span style={chapterTag}>Chapter {level.index + 1}</span>
          <span style={chapterCount}>
            {Math.min(objectiveIndex + 1, level.objectives.length)}/{level.objectives.length}
          </span>
        </div>
        <h1 style={title}>{level.title}</h1>
        <p style={subtitle}>{level.subtitle}</p>

        <ul style={list}>
          {level.objectives.map((obj, i) => {
            const done = i < objectiveIndex
            const isActive = i === objectiveIndex
            return (
              <li
                key={obj.id}
                style={{
                  ...row,
                  ...(isActive ? activeRow : null),
                  opacity: done ? 0.45 : isActive ? 1 : 0.6,
                }}
              >
                <span style={mark}>{done ? '☑' : isActive ? '▸' : '☐'}</span>
                <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{obj.label}</span>
              </li>
            )
          })}
        </ul>

        <div style={{ marginTop: 12 }}>
          <div style={barLabel}>River clarity · {health}%</div>
          <div style={barTrack}>
            <div style={{ ...barFill, width: `${health}%` }} />
          </div>
        </div>

        {level.isBoss ? (
          <div style={{ marginTop: 12 }}>
            <style>{healthKeyframes}</style>
            <div style={{ ...barLabel, color: lastChanceUsed ? '#ff9d5c' : '#dff3ff' }}>
              {lastChanceUsed ? 'Last stand · no hat, all nerve' : `Sir Reginald · vigour`}
            </div>
            <div style={heartsRow}>
              {Array.from({ length: maxPlayerHealth }).map((_, i) => {
                const alive = i < playerHealth
                return (
                  <span
                    key={i}
                    style={{
                      ...heart,
                      ...(lastChanceUsed ? heartEmber : null),
                      opacity: alive ? 1 : 0.22,
                    }}
                  >
                    {lastChanceUsed ? (
                      <span style={cigarWrap} aria-hidden>
                        <span style={cigarStick} />
                        <span style={cigarEmber} />
                      </span>
                    ) : (
                      '♥'
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        ) : null}

        {active ? <p style={objectiveHint}>Now: {active.label}</p> : null}
        <p style={controls}>WASD swim · SPACE grab / drop · H honk</p>
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
  zIndex: 5,
}
const panel: React.CSSProperties = {
  pointerEvents: 'auto',
  width: 300,
  maxWidth: '80vw',
  background: 'rgba(6,40,61,0.55)',
  border: '1px solid rgba(127,240,208,0.3)',
  borderRadius: 12,
  padding: 16,
  backdropFilter: 'blur(4px)',
  boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
}
const chapterRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}
const chapterTag: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#7ff0d0',
}
const chapterCount: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  color: '#3fa9f5',
}
const title: React.CSSProperties = { fontSize: 22, fontWeight: 800, letterSpacing: 0.5, margin: '2px 0 0' }
const subtitle: React.CSSProperties = { fontSize: 12, opacity: 0.75, margin: '4px 0 12px', fontStyle: 'italic' }
const list: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0 }
const row: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'baseline',
  padding: '5px 6px',
  fontSize: 14,
  borderRadius: 6,
  transition: 'opacity 0.3s ease',
}
const activeRow: React.CSSProperties = {
  background: 'rgba(127,240,208,0.14)',
  boxShadow: 'inset 0 0 0 1px rgba(127,240,208,0.35)',
  fontWeight: 700,
}
const mark: React.CSSProperties = { color: '#7ff0d0', flexShrink: 0 }
const barLabel: React.CSSProperties = { fontSize: 12, marginBottom: 4, letterSpacing: 0.5 }
const barTrack: React.CSSProperties = {
  height: 10,
  background: 'rgba(255,255,255,0.15)',
  borderRadius: 6,
  overflow: 'hidden',
}
const barFill: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg,#3fa9f5,#7ff0d0)',
  transition: 'width 0.5s cubic-bezier(0.2,0.8,0.2,1)',
}
const objectiveHint: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#7ff0d0',
  margin: '12px 0 0',
}
const controls: React.CSSProperties = { fontSize: 11, opacity: 0.5, marginTop: 6, fontStyle: 'italic' }

// --- boss: Reginald's health (hearts, with a "last stand" cigar variant) ---
const healthKeyframes = `
@keyframes emberGlow { 0%,100% { box-shadow: 0 0 3px 1px rgba(255,120,40,0.8); } 50% { box-shadow: 0 0 6px 2px rgba(255,180,80,1); } }
`
const heartsRow: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }
const heart: React.CSSProperties = {
  fontSize: 22,
  lineHeight: 1,
  color: '#ff5a6e',
  textShadow: '0 0 6px rgba(255,90,110,0.7), 0 1px 2px rgba(0,0,0,0.6)',
  transition: 'opacity 0.3s ease',
  display: 'inline-flex',
  width: 22,
  height: 22,
  alignItems: 'center',
  justifyContent: 'center',
}
const heartEmber: React.CSSProperties = { color: '#ff9d5c' }
// A tiny CSS cigar (tan stick + glowing ember) — the desperate last-stand marker.
const cigarWrap: React.CSSProperties = { position: 'relative', display: 'inline-flex', alignItems: 'center' }
const cigarStick: React.CSSProperties = {
  width: 16,
  height: 5,
  background: 'linear-gradient(180deg,#e9d3a3,#b9905a)',
  borderRadius: 1,
  display: 'inline-block',
}
const cigarEmber: React.CSSProperties = {
  position: 'absolute',
  right: -2,
  width: 5,
  height: 5,
  borderRadius: '50%',
  background: 'radial-gradient(circle,#fff2c4 0%,#ff8a2a 55%,#c23a10 100%)',
  animation: 'emberGlow 1.1s ease-in-out infinite',
}
