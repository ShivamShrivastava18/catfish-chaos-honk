import { useCallback, useEffect, useState } from 'react'
import { SPRITES } from './sprites'
import type { DialogueLine, Speaker } from './story'

/**
 * DialogueBox — a single visual-novel speech line with a typewriter reveal and a
 * per-character blip. PROPS API (chosen over store-reading so the parent Cutscene
 * fully owns sequencing):
 *   line      — the DialogueLine to type out (portrait is a SpriteKey/null).
 *   onAdvance — called on click / SPACE / ENTER once the line is fully revealed.
 * While the line is still typing, the same interaction instantly reveals the full
 * text instead of advancing. Portrait uses an <img> (this is an HTML overlay, not
 * the 3D BillboardSprite) with pixelated rendering.
 */
export interface DialogueBoxProps {
  line: DialogueLine
  onAdvance: () => void
}

const CHAR_MS = 26 // typewriter cadence per character

export function DialogueBox({ line, onAdvance }: DialogueBoxProps) {
  const [shown, setShown] = useState(0)
  const doneTyping = shown >= line.text.length

  // Restart the typewriter whenever the line changes.
  useEffect(() => {
    setShown(0)
  }, [line])

  useEffect(() => {
    if (doneTyping) return
    const id = window.setInterval(() => {
      setShown((n) => {
        const next = Math.min(n + 1, line.text.length)
        const ch = line.text[n]
        if (ch && ch !== ' ' && n % 2 === 0) playBlip(line.speaker)
        return next
      })
    }, CHAR_MS)
    return () => window.clearInterval(id)
  }, [line, doneTyping])

  const interact = useCallback(() => {
    if (!doneTyping) setShown(line.text.length)
    else onAdvance()
  }, [doneTyping, line.text.length, onAdvance])

  // SPACE / ENTER mirror the click behaviour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.key === 'Enter') {
        e.preventDefault()
        interact()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [interact])

  const accent = SPEAKER_ACCENT[line.speaker]
  const isNarrator = line.speaker === 'narrator'
  const portraitUrl = line.portrait ? SPRITES[line.portrait] : null

  if (isNarrator) {
    return (
      <div style={anchor} onClick={interact}>
        <style>{keyframes}</style>
        <div style={narratorBox}>
          <span style={narratorText}>
            {line.text.slice(0, shown)}
            <Caret hidden={doneTyping} />
          </span>
          <span style={{ ...hint, ...(doneTyping ? null : hintDim) }}>
            {doneTyping ? 'click / space' : ''}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={anchor} onClick={interact}>
      <style>{keyframes}</style>
      <div style={{ ...panel, borderColor: accent.edge }}>
        {portraitUrl && (
          <div style={{ ...portraitFrame, borderColor: accent.edge, background: accent.wash }}>
            <img src={portraitUrl} alt={line.name} style={portrait} />
          </div>
        )}
        <div style={body}>
          <div style={{ ...nameTag, color: accent.name, borderColor: accent.edge }}>{line.name}</div>
          <p style={text}>
            {line.text.slice(0, shown)}
            <Caret hidden={doneTyping} />
          </p>
          <span style={{ ...hint, opacity: doneTyping ? 0.75 : 0 }}>
            {doneTyping ? '▸ click / space' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

function Caret({ hidden }: { hidden: boolean }) {
  if (hidden) return null
  return <span style={caret}>▌</span>
}

// --- per-character blip (guarded; self-contained fallback) --------------------
// Contract asks to call the audio system's playBlip() and guard if unavailable.
// useAudio.ts exposes no such export, so we synthesize a tiny muffled blip on a
// lazily-created AudioContext. Speaker tunes the pitch so voices feel distinct.
let blipCtx: AudioContext | null = null
const SPEAKER_HZ: Record<Speaker, number> = {
  reginald: 300,
  hench: 260,
  citizen: 440,
  boss: 190,
  narrator: 360,
}

function playBlip(speaker: Speaker) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!blipCtx) blipCtx = new Ctx()
    if (blipCtx.state === 'suspended') void blipCtx.resume()
    const ctx = blipCtx
    const now = ctx.currentTime
    const base = SPEAKER_HZ[speaker] ?? 320
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(base + (Math.random() * 40 - 20), now)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1200
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.055)
    osc.connect(lp).connect(g).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.06)
  } catch {
    /* audio unavailable — silent */
  }
}

// --- styling -----------------------------------------------------------------
const SPEAKER_ACCENT: Record<Speaker, { edge: string; name: string; wash: string }> = {
  reginald: { edge: '#1b2b3a', name: '#0b3350', wash: '#dff3ff' },
  hench: { edge: '#5a3a12', name: '#6b3d00', wash: '#ffe9c7' },
  citizen: { edge: '#155e52', name: '#0d6b57', wash: '#d6fff2' },
  boss: { edge: '#3a1414', name: '#7a1414', wash: '#ffd9d9' },
  narrator: { edge: '#1b2b3a', name: '#dff3ff', wash: '#0b1a25' },
}

const keyframes = `
@keyframes dlgIn { from { opacity: 0; transform: translate(-50%, 14px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes dlgCaret { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
`

const anchor: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 34,
  transform: 'translateX(-50%)',
  width: 'min(720px, 92vw)',
  zIndex: 30,
  cursor: 'pointer',
  fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
}

const panel: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  alignItems: 'stretch',
  padding: 16,
  background: '#fffef2',
  border: '4px solid #1b2b3a',
  borderRadius: 18,
  boxShadow: '6px 6px 0 rgba(11,26,37,0.55)',
  animation: 'dlgIn 200ms cubic-bezier(0.34,1.56,0.64,1) both',
}

const portraitFrame: React.CSSProperties = {
  flex: '0 0 auto',
  width: 92,
  height: 92,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '3px solid #1b2b3a',
  borderRadius: 12,
  overflow: 'hidden',
}

const portrait: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  imageRendering: 'pixelated',
}

const body: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  paddingBottom: 4,
}

const nameTag: React.CSSProperties = {
  alignSelf: 'flex-start',
  fontWeight: 900,
  fontSize: 15,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  padding: '2px 10px',
  marginBottom: 6,
  background: '#fffef2',
  border: '2px solid #1b2b3a',
  borderRadius: 8,
}

const text: React.CSSProperties = {
  margin: 0,
  color: '#161616',
  fontWeight: 700,
  fontSize: 19,
  lineHeight: 1.35,
  minHeight: '2.7em',
}

const caret: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: 1,
  animation: 'dlgCaret 700ms step-end infinite',
  color: '#3a5a72',
}

const hint: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  bottom: -6,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.5,
  color: '#3a5a72',
  transition: 'opacity 180ms ease',
}

const hintDim: React.CSSProperties = { opacity: 0 }

const narratorBox: React.CSSProperties = {
  position: 'relative',
  textAlign: 'center',
  padding: '20px 28px',
  background: 'rgba(6,26,37,0.92)',
  color: '#dff3ff',
  border: '2px solid rgba(127,240,208,0.4)',
  borderRadius: 14,
  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  animation: 'dlgIn 200ms ease both',
}

const narratorText: React.CSSProperties = {
  fontSize: 20,
  fontStyle: 'italic',
  fontWeight: 600,
  lineHeight: 1.5,
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
}
