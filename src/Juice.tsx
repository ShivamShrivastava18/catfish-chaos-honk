import { useEffect, useState } from 'react'
import { useGame } from './store'

const SHAKE_STYLE_ID = 'juice-shake-style'
const SHAKE_CLASS = 'juice-shaking'
const SHAKE_MS = 360

const SHAKE_CSS = `
@keyframes ${SHAKE_CLASS} {
  0%   { transform: translate(0, 0) rotate(0deg); }
  15%  { transform: translate(-7px, 4px) rotate(-0.6deg); }
  30%  { transform: translate(6px, -5px) rotate(0.5deg); }
  45%  { transform: translate(-5px, -3px) rotate(-0.4deg); }
  60%  { transform: translate(4px, 5px) rotate(0.3deg); }
  75%  { transform: translate(-3px, 2px) rotate(-0.2deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
.${SHAKE_CLASS} { animation: ${SHAKE_CLASS} ${SHAKE_MS}ms ease-in-out; }
`

function ensureShakeStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById(SHAKE_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = SHAKE_STYLE_ID
  el.textContent = SHAKE_CSS
  document.head.appendChild(el)
}

/**
 * Binds the 'h'/'H' key to store.honk() while the game is playing.
 * Reads phase imperatively so the handler never goes stale.
 */
export function useHonkListener() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key !== 'h' && e.key !== 'H') return
      if (useGame.getState().gamePhase !== 'playing') return
      useGame.getState().honk()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/**
 * Screen-juice layer. Drop into the HTML overlay (a sibling of the Canvas):
 *   <Juice />
 * - listens for the HONK key (when playing) and calls store.honk()
 * - shakes #root and flashes a quick vignette on every honkPulse change
 * Renders a non-interactive flash overlay.
 */
export function Juice() {
  const honkPulse = useGame((s) => s.honkPulse)
  const [flash, setFlash] = useState(false)

  useHonkListener()

  useEffect(() => {
    ensureShakeStyle()
  }, [])

  useEffect(() => {
    if (honkPulse === 0) return
    const root = document.getElementById('root')
    if (root) {
      root.classList.remove(SHAKE_CLASS)
      // reflow so re-adding the class restarts the animation
      void root.offsetWidth
      root.classList.add(SHAKE_CLASS)
    }
    setFlash(true)
    const clearShake = setTimeout(() => root?.classList.remove(SHAKE_CLASS), SHAKE_MS)
    const clearFlash = setTimeout(() => setFlash(false), 180)
    return () => {
      clearTimeout(clearShake)
      clearTimeout(clearFlash)
    }
  }, [honkPulse])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 15,
        boxShadow: 'inset 0 0 220px 60px rgba(255,225,77,0.55)',
        opacity: flash ? 1 : 0,
        transition: flash ? 'none' : 'opacity 220ms ease-out',
      }}
    />
  )
}
