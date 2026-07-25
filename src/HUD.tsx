import { useGame } from './store'
import { LEVELS } from './levels'
import { SPRITES } from './sprites'

/**
 * In-game HUD (rendered only during phase 'playing'). A "gentleman's salvage"
 * panel — dark-teal glass with a brass-rivet/rope corner frame, a warm ribbon
 * heading, an ordered objectives breadcrumb (active highlighted), river-clarity,
 * and — during the boss — Reginald's health as a row of BUBBLE SPRITES.
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
      <style>{keyframes}</style>
      <div style={panel}>
        {/* brass-rivet / rope corner ornaments */}
        <img src={SPRITES.panelCorner} alt="" style={{ ...corner, top: -6, left: -6 }} />
        <img src={SPRITES.panelCorner} alt="" style={{ ...corner, top: -6, right: -6, transform: 'scaleX(-1)' }} />
        <img src={SPRITES.panelCorner} alt="" style={{ ...corner, bottom: -6, left: -6, transform: 'scaleY(-1)' }} />
        <img src={SPRITES.panelCorner} alt="" style={{ ...corner, bottom: -6, right: -6, transform: 'scale(-1,-1)' }} />

        {/* ribbon heading with chapter + progress */}
        <div style={ribbonWrap}>
          <img src={SPRITES.ribbon} alt="" style={ribbonImg} />
          <span style={ribbonText}>Chapter {level.index + 1}</span>
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
                  opacity: done ? 0.42 : isActive ? 1 : 0.62,
                }}
              >
                <span style={mark}>{done ? '✦' : isActive ? '➤' : '·'}</span>
                <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{obj.label}</span>
              </li>
            )
          })}
        </ul>

        <div style={{ marginTop: 12 }}>
          <div style={barLabel}>
            <span>River clarity</span>
            <span style={barPct}>{health}%</span>
          </div>
          <div style={barTrack}>
            <div style={{ ...barFill, width: `${health}%` }} />
            <div style={barShine} />
          </div>
        </div>

        {level.isBoss ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ ...barLabel, color: lastChanceUsed ? '#ffb27a' : '#dff3ff' }}>
              <span>{lastChanceUsed ? 'Last stand · no hat, all nerve' : 'Sir Reginald · vigour'}</span>
            </div>
            <div style={bubbleRow}>
              {Array.from({ length: maxPlayerHealth }).map((_, i) => {
                const alive = i < playerHealth
                const src = lastChanceUsed
                  ? SPRITES.bubbleCigar
                  : alive
                    ? SPRITES.bubbleFull
                    : SPRITES.bubbleEmpty
                return (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    style={{
                      ...bubbleImg,
                      opacity: alive ? 1 : 0.28,
                      filter: alive ? undefined : 'grayscale(0.5)',
                      animationDelay: `${i * 0.35}s`,
                      ...(lastChanceUsed && alive ? bubbleEmber : null),
                    }}
                  />
                )
              })}
            </div>
          </div>
        ) : null}

        {active ? (
          <p style={objectiveHint}>
            <span style={hintDot} />
            Now: {active.label}
          </p>
        ) : null}
        <p style={controls}>WASD swim · SPACE grab / drop · H honk</p>
      </div>
    </div>
  )
}

const PX = 'pixelated' as const

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  padding: 20,
  color: '#dff3ff',
  textShadow: '0 1px 2px rgba(0,0,0,0.65)',
  zIndex: 5,
  fontFamily: 'inherit',
}
const panel: React.CSSProperties = {
  position: 'relative',
  pointerEvents: 'auto',
  width: 312,
  maxWidth: '82vw',
  background: 'linear-gradient(160deg, rgba(9,52,74,0.82), rgba(5,30,46,0.78))',
  border: '2px solid rgba(198,150,74,0.55)',
  borderRadius: 10,
  padding: '20px 18px 16px',
  backdropFilter: 'blur(5px)',
  boxShadow: '0 10px 34px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(127,240,208,0.14), inset 0 0 24px rgba(6,40,61,0.6)',
}
const corner: React.CSSProperties = {
  position: 'absolute',
  width: 22,
  height: 22,
  imageRendering: PX,
  pointerEvents: 'none',
  opacity: 0.95,
  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
}
const ribbonWrap: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 26,
  marginBottom: 2,
}
const ribbonImg: React.CSSProperties = {
  position: 'absolute',
  left: -4,
  top: '50%',
  transform: 'translateY(-50%)',
  height: 26,
  width: 'auto',
  imageRendering: PX,
  opacity: 0.9,
  pointerEvents: 'none',
}
const ribbonText: React.CSSProperties = {
  position: 'relative',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#ffe6b8',
  paddingLeft: 8,
  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
}
const chapterCount: React.CSSProperties = {
  position: 'relative',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  color: '#7ff0d0',
}
const title: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: 0.5,
  margin: '6px 0 0',
  color: '#eafcff',
}
const subtitle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.72,
  margin: '4px 0 12px',
  fontStyle: 'italic',
  color: '#a9e6d6',
}
const list: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0 }
const row: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'baseline',
  padding: '5px 7px',
  fontSize: 14,
  borderRadius: 5,
  transition: 'opacity 0.3s ease',
}
const activeRow: React.CSSProperties = {
  background: 'rgba(127,240,208,0.13)',
  boxShadow: 'inset 0 0 0 1px rgba(198,150,74,0.4)',
  fontWeight: 700,
}
const mark: React.CSSProperties = { color: '#ffcf85', flexShrink: 0, fontSize: 12 }
const barLabel: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 12,
  marginBottom: 5,
  letterSpacing: 0.5,
  fontWeight: 700,
}
const barPct: React.CSSProperties = { color: '#7ff0d0' }
const barTrack: React.CSSProperties = {
  position: 'relative',
  height: 11,
  background: 'rgba(3,20,31,0.7)',
  borderRadius: 6,
  overflow: 'hidden',
  boxShadow: 'inset 0 0 0 1px rgba(198,150,74,0.35), inset 0 1px 3px rgba(0,0,0,0.6)',
}
const barFill: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg,#3fa9f5,#7ff0d0)',
  transition: 'width 0.5s cubic-bezier(0.2,0.8,0.2,1)',
}
const barShine: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 55%)',
  pointerEvents: 'none',
}
const bubbleRow: React.CSSProperties = { display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }
const bubbleImg: React.CSSProperties = {
  width: 28,
  height: 28,
  imageRendering: PX,
  transition: 'opacity 0.3s ease',
  animation: 'bubbleBob 2.6s ease-in-out infinite',
}
const bubbleEmber: React.CSSProperties = {
  filter: 'drop-shadow(0 0 5px rgba(255,140,50,0.85))',
}
const objectiveHint: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 12,
  fontWeight: 700,
  color: '#7ff0d0',
  margin: '13px 0 0',
}
const hintDot: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: 'radial-gradient(circle,#eafcff 0%,#7ff0d0 60%,#3fa9f5 100%)',
  boxShadow: '0 0 6px rgba(127,240,208,0.9)',
  flexShrink: 0,
  animation: 'hintPulse 1.4s ease-in-out infinite',
}
const controls: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.5,
  marginTop: 8,
  fontStyle: 'italic',
  color: '#bfe9ff',
}

const keyframes = `
@keyframes bubbleBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes hintPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.7; } }
`
