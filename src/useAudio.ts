import { useEffect } from 'react'
import { useGame } from './store'
import { LEVELS } from './levels'

// Procedural Web Audio engine — no asset downloads. Everything is synthesized
// from oscillators + filtered noise, pushed through low-pass filters to sell the
// muffled "underwater" feel. Respects autoplay: the AudioContext is only created
// + resumed after the first user gesture (init()).

// Per-level tonal profiles: murkier/darker early, ominous at the source, darkest
// + tense for the boss. Ambience brightens as riverHealth climbs (clearer water).
interface LevelProfile {
  base: number // lowpass cutoff floor (Hz) at 0 health
  sub: number // sub-rumble frequency (Hz)
  lfo: number // filter-sweep LFO rate (Hz)
}
const LEVEL_PROFILES: LevelProfile[] = [
  { base: 360, sub: 52, lfo: 0.08 }, // L1 murky green
  { base: 320, sub: 46, lfo: 0.07 }, // L2 bad water
  { base: 300, sub: 42, lfo: 0.06 }, // L3 the source
  { base: 240, sub: 36, lfo: 0.05 }, // L4 boss — dark + tense
]

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null

  private ambNodes: AudioNode[] = []
  private ambFilter: BiquadFilterNode | null = null
  private ambBase = 360
  private ambOn = false

  /** Create/resume the context. Safe to call repeatedly; only acts on a gesture. */
  init() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
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

  private cutoffFor(health: number): number {
    // Clearer water (higher health) reads as brighter ambience.
    return this.ambBase + Math.max(0, Math.min(100, health)) * 6
  }

  /**
   * Start per-level ambience: filtered-noise current + sub rumble, tuned by the
   * level profile. Boss levels add a slow dissonant minor-second pad for menace.
   */
  startAmbience(level: number, isBoss: boolean, health: number) {
    if (!this.ready()) return
    if (this.ambOn) this.stopAmbience()
    const ctx = this.ctx!
    const now = ctx.currentTime
    const p = LEVEL_PROFILES[level] ?? LEVEL_PROFILES[0]
    this.ambBase = p.base

    // Looping filtered white-noise current.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = this.cutoffFor(health)
    lp.Q.value = 6
    this.ambFilter = lp

    const lfo = ctx.createOscillator()
    lfo.frequency.value = p.lfo
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 150
    lfo.connect(lfoGain).connect(lp.frequency)

    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0
    noiseGain.gain.linearRampToValueAtTime(0.13, now + 2)

    // Sub rumble.
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = p.sub
    const subGain = ctx.createGain()
    subGain.gain.value = 0
    subGain.gain.linearRampToValueAtTime(isBoss ? 0.09 : 0.06, now + 2)

    noise.connect(lp).connect(noiseGain).connect(this.master!)
    sub.connect(subGain).connect(this.master!)
    noise.start()
    sub.start()
    lfo.start()
    this.ambNodes = [noise, sub, lfo, noiseGain, subGain, lp, lfoGain]

    if (isBoss) {
      // Tense pad: two detuned voices a minor-second apart, slowly pulsing.
      const padGain = ctx.createGain()
      padGain.gain.value = 0
      padGain.gain.linearRampToValueAtTime(0.05, now + 3)
      const padFilter = ctx.createBiquadFilter()
      padFilter.type = 'lowpass'
      padFilter.frequency.value = 700
      padFilter.connect(padGain).connect(this.master!)

      const pulse = ctx.createOscillator()
      pulse.frequency.value = 0.5
      const pulseGain = ctx.createGain()
      pulseGain.gain.value = 0.03
      pulse.connect(pulseGain).connect(padGain.gain)

      const voiceFreqs = [98, 104] // ~G2 vs a sour semitone above
      const voices = voiceFreqs.map((f) => {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = f
        o.connect(padFilter)
        o.start()
        return o
      })
      pulse.start()
      this.ambNodes.push(padGain, padFilter, pulse, pulseGain, ...voices)
    }

    this.ambOn = true
  }

  /** Shift the ambience brightness toward the new river health. */
  setHealth(health: number) {
    if (!this.ambOn || !this.ambFilter || !this.ctx) return
    const now = this.ctx.currentTime
    this.ambFilter.frequency.cancelScheduledValues(now)
    this.ambFilter.frequency.linearRampToValueAtTime(this.cutoffFor(health), now + 1.2)
  }

  stopAmbience() {
    if (!this.ctx || !this.ambOn) return
    const now = this.ctx.currentTime
    for (const node of this.ambNodes) {
      if (node instanceof GainNode) {
        node.gain.cancelScheduledValues(now)
        node.gain.linearRampToValueAtTime(0, now + 0.5)
      }
    }
    for (const node of this.ambNodes) {
      if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
        try {
          ;(node as OscillatorNode).stop(now + 0.6)
        } catch {
          /* already stopped */
        }
      }
    }
    this.ambNodes = []
    this.ambFilter = null
    this.ambOn = false
  }

  /** Very short soft tick — one typewriter character in a dialogue bubble. */
  blip() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1180 + Math.random() * 120, now)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2200
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
    osc.connect(lp).connect(g).connect(this.master!)
    osc.start(now)
    osc.stop(now + 0.06)
  }

  /** Soft "blorp" — objective complete on a normal level. */
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

  /** Watery splash + thud — a barrel connecting with the boss. */
  splash() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const now = ctx.currentTime

    // Noise burst = the splash.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(1600, now)
    bp.frequency.exponentialRampToValueAtTime(500, now + 0.3)
    bp.Q.value = 0.8
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.35, now)
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    noise.connect(bp).connect(ng).connect(this.master!)
    noise.start(now)
    noise.stop(now + 0.4)

    // Low thud = the impact.
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(160, now)
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.2)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.4, now + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
    osc.connect(g).connect(this.master!)
    osc.start(now)
    osc.stop(now + 0.3)
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

  /** Dramatic minor swell — one-shot sting when a boss level begins. */
  bossSting() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const now = ctx.currentTime + 0.05
    const chord = [110, 130.81, 155.56] // A2 C3 Eb3 — minor + tritone tension
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now)
      osc.frequency.linearRampToValueAtTime(freq * 0.97, now + 1.4)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(500, now)
      lp.frequency.linearRampToValueAtTime(1200, now + 0.6)
      lp.frequency.linearRampToValueAtTime(400, now + 1.4)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, now)
      g.gain.exponentialRampToValueAtTime(0.16, now + 0.25)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5)
      osc.connect(lp).connect(g).connect(this.master!)
      osc.start(now)
      osc.stop(now + 1.55)
    })
  }

  /** Short bright cadence — one level solved (not the whole game). */
  levelClear() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const start = ctx.currentTime + 0.05
    const notes = [659.25, 783.99, 1046.5] // E5 G5 C6
    const step = 0.12
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
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
      osc.connect(lp).connect(g).connect(this.master!)
      osc.start(t)
      osc.stop(t + 0.34)
    })
  }

  /** Rising major arpeggio — full-game win jingle. */
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
 * Soft typewriter tick for the dialogue system. Import + call once per revealed
 * character: `import { playBlip } from './useAudio'`. No-op until audio is init'd.
 */
export function playBlip() {
  engine.blip()
}

function isBossLevel(index: number): boolean {
  return LEVELS[index]?.isBoss === true
}

/**
 * Wires procedural audio to the game store. Mount once at app root (via
 * <AudioController/>). Auto-inits the AudioContext on the first user gesture,
 * then drives: per-level ambience (shifting with level + riverHealth), a boss
 * music sting, a level-clear jingle, a full-game win jingle, comedic honks, and
 * blorp/splash on objective completion (splash on boss hits).
 */
export function useAudio() {
  useEffect(() => {
    const onGesture = () => engine.init()
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)

    const s0 = useGame.getState()
    let prevPhase = s0.gamePhase
    let prevHonk = s0.honkPulse
    let prevLevel = s0.levelIndex
    let prevObjIndex = s0.objectiveIndex
    let prevHealth = s0.riverHealth

    const unsub = useGame.subscribe((s) => {
      // A new level was loaded — reset objective tracking to avoid false hits.
      if (s.levelIndex !== prevLevel) {
        prevLevel = s.levelIndex
        prevObjIndex = 0
      }

      if (s.gamePhase !== prevPhase) {
        switch (s.gamePhase) {
          case 'intro': {
            const boss = isBossLevel(s.levelIndex)
            engine.startAmbience(s.levelIndex, boss, s.riverHealth)
            if (boss) engine.bossSting()
            break
          }
          case 'levelclear':
            engine.stopAmbience()
            engine.levelClear()
            break
          case 'won':
            engine.stopAmbience()
            engine.win()
            break
          case 'title':
            engine.stopAmbience()
            break
        }
        prevPhase = s.gamePhase
      }

      // Objective completed (index advances during 'playing', and once more on
      // the final objective as the phase flips to 'outro').
      if (s.objectiveIndex > prevObjIndex && (s.gamePhase === 'playing' || s.gamePhase === 'outro')) {
        if (isBossLevel(s.levelIndex)) engine.splash()
        else engine.blorp()
        prevObjIndex = s.objectiveIndex
      }

      if (s.riverHealth !== prevHealth) {
        engine.setHealth(s.riverHealth)
        prevHealth = s.riverHealth
      }

      if (s.honkPulse !== prevHonk) {
        engine.honk()
        prevHonk = s.honkPulse
      }
    })

    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
      unsub()
    }
  }, [])

  return { init: () => engine.init() }
}
