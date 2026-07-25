import { useEffect } from 'react'
import { useGame } from './store'

// Procedural Web Audio engine — no asset downloads. Everything is synthesized
// from oscillators + filtered noise and pushed through low-pass filters to sell
// the "underwater / muffled" feel. Respects autoplay rules: the AudioContext is
// only created + resumed after the first user gesture (init()).

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private droneNodes: AudioNode[] = []
  private droneOn = false

  /** Create/resume the context. Safe to call repeatedly; only acts on a gesture. */
  init() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.7
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  private ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running' && this.master !== null
  }

  /** Low, slow filtered-noise drone + sub rumble. */
  startDrone() {
    if (!this.ready() || this.droneOn) return
    const ctx = this.ctx!
    const now = ctx.currentTime

    // Looping white-noise buffer.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 380
    lp.Q.value = 6

    // Slow LFO sweeping the filter for a breathing current.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 160
    lfo.connect(lfoGain).connect(lp.frequency)

    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0
    noiseGain.gain.linearRampToValueAtTime(0.14, now + 2)

    // Sub rumble.
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 52
    const subGain = ctx.createGain()
    subGain.gain.value = 0
    subGain.gain.linearRampToValueAtTime(0.06, now + 2)

    noise.connect(lp).connect(noiseGain).connect(this.master!)
    sub.connect(subGain).connect(this.master!)

    noise.start()
    sub.start()
    lfo.start()

    this.droneNodes = [noise, sub, lfo, noiseGain, subGain, lp, lfoGain]
    this.droneOn = true
  }

  stopDrone() {
    if (!this.ctx || !this.droneOn) return
    const now = this.ctx.currentTime
    for (const node of this.droneNodes) {
      if (node instanceof GainNode) node.gain.cancelScheduledValues(now), node.gain.linearRampToValueAtTime(0, now + 0.5)
    }
    for (const node of this.droneNodes) {
      if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
        try {
          ;(node as OscillatorNode).stop(now + 0.6)
        } catch {
          /* already stopped */
        }
      }
    }
    this.droneNodes = []
    this.droneOn = false
  }

  /** Soft "blorp" — grab / crime complete. */
  blorp() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(620, now)
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.16)

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1400

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.3, now + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)

    osc.connect(lp).connect(g).connect(this.master!)
    osc.start(now)
    osc.stop(now + 0.24)
  }

  /** Comedic square-wave honk. */
  honk() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.linearRampToValueAtTime(215, now + 0.05)
    osc.frequency.linearRampToValueAtTime(175, now + 0.28)

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1600

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.26, now + 0.02)
    g.gain.setValueAtTime(0.26, now + 0.2)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.33)

    osc.connect(lp).connect(g).connect(this.master!)
    osc.start(now)
    osc.stop(now + 0.35)
  }

  /** Rising major arpeggio — win jingle. */
  win() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const start = ctx.currentTime + 0.05
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    const step = 0.14
    notes.forEach((freq, i) => {
      const t = start + i * step
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 2600
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.24, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
      osc.connect(lp).connect(g).connect(this.master!)
      osc.start(t)
      osc.stop(t + 0.42)
    })
  }
}

// Module singleton so React StrictMode double-mounts share one context.
const engine = new AudioEngine()

/**
 * Wires procedural audio to the game store. Mount once at app root (e.g. via
 * <AudioController/>). Auto-inits the AudioContext on the first user gesture,
 * then plays: drone on 'playing', blorp per crime, honk on honkPulse, win
 * jingle on 'won'.
 */
export function useAudio() {
  useEffect(() => {
    const onGesture = () => engine.init()
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)

    const s0 = useGame.getState()
    let prevPhase = s0.gamePhase
    let prevHonk = s0.honkPulse
    let prevDone = s0.crimes.filter((c) => c.done).length

    const unsub = useGame.subscribe((s) => {
      if (s.gamePhase !== prevPhase) {
        if (s.gamePhase === 'playing') engine.startDrone()
        else if (s.gamePhase === 'won') engine.win()
        else if (s.gamePhase === 'title') engine.stopDrone()
        prevPhase = s.gamePhase
      }

      if (s.honkPulse !== prevHonk) {
        engine.honk()
        prevHonk = s.honkPulse
      }

      const done = s.crimes.filter((c) => c.done).length
      if (done > prevDone) engine.blorp()
      prevDone = done
    })

    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
      unsub()
    }
  }, [])

  return { init: () => engine.init() }
}
