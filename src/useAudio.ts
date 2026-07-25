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

// Boss battle music: a driving low ostinato + a pulsing minor-arpeggio, sequenced
// step by step with a small lookahead scheduler. Aligned 8-step loops.
const BOSS_STEP_DUR = 0.12 // seconds per eighth-note step (~125 BPM feel)
const BOSS_BASS = [55, 55, 65.41, 55, 73.42, 55, 61.74, 58.27] // A1 ostinato, minor tension
const BOSS_ARP: (number | null)[] = [329.63, null, 261.63, null, 220, null, 261.63, null] // E4/C4/A3

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null

  private ambBus: GainNode | null = null // ambience routes here so boss music can duck it
  private ambNodes: AudioNode[] = []
  private ambFilter: BiquadFilterNode | null = null
  private ambBase = 360
  private ambOn = false

  // Boss battle music state.
  private bossBus: GainNode | null = null
  private bossTimer: ReturnType<typeof setInterval> | null = null
  private bossStep = 0
  private bossNextTime = 0
  private bossOn = false

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
      // Dedicated ambience bus — lets boss music duck the ambience cleanly.
      this.ambBus = this.ctx.createGain()
      this.ambBus.gain.value = 1
      this.ambBus.connect(this.master)
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
    if (!this.ready() || !this.ambBus) return
    if (this.ambOn) this.stopAmbience()
    const ctx = this.ctx!
    const now = ctx.currentTime
    const p = LEVEL_PROFILES[level] ?? LEVEL_PROFILES[0]
    this.ambBase = p.base
    const bus = this.ambBus

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

    noise.connect(lp).connect(noiseGain).connect(bus)
    sub.connect(subGain).connect(bus)
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
      padFilter.connect(padGain).connect(bus)

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

  // --- boss battle music -----------------------------------------------------

  /** Duck the ambience bus down/back over `secs` (1 = full, 0.4 = ducked). */
  private setAmbDuck(target: number, secs: number) {
    if (!this.ambBus || !this.ctx) return
    const now = this.ctx.currentTime
    this.ambBus.gain.cancelScheduledValues(now)
    this.ambBus.gain.linearRampToValueAtTime(target, now + secs)
  }

  /** Schedule one step of the boss ostinato + arpeggio at absolute `time`. */
  private scheduleBossStep(step: number, time: number) {
    const ctx = this.ctx!
    const bus = this.bossBus!

    // Driving low bass note.
    const bass = BOSS_BASS[step % BOSS_BASS.length]
    const bo = ctx.createOscillator()
    bo.type = 'sawtooth'
    bo.frequency.setValueAtTime(bass, time)
    const blp = ctx.createBiquadFilter()
    blp.type = 'lowpass'
    blp.frequency.setValueAtTime(520, time)
    blp.frequency.exponentialRampToValueAtTime(180, time + 0.11)
    const bg = ctx.createGain()
    bg.gain.setValueAtTime(0.0001, time)
    bg.gain.exponentialRampToValueAtTime(0.24, time + 0.008)
    bg.gain.exponentialRampToValueAtTime(0.0001, time + 0.11)
    bo.connect(blp).connect(bg).connect(bus)
    bo.start(time)
    bo.stop(time + 0.13)

    // Pulsing minor-arpeggio accent.
    const arp = BOSS_ARP[step % BOSS_ARP.length]
    if (arp) {
      const ao = ctx.createOscillator()
      ao.type = 'triangle'
      ao.frequency.setValueAtTime(arp, time)
      const alp = ctx.createBiquadFilter()
      alp.type = 'lowpass'
      alp.frequency.value = 1600
      const ag = ctx.createGain()
      ag.gain.setValueAtTime(0.0001, time)
      ag.gain.exponentialRampToValueAtTime(0.07, time + 0.01)
      ag.gain.exponentialRampToValueAtTime(0.0001, time + 0.16)
      ao.connect(alp).connect(ag).connect(bus)
      ao.start(time)
      ao.stop(time + 0.18)
    }
  }

  private bossTick = () => {
    if (!this.ctx || !this.bossOn) return
    const ahead = this.ctx.currentTime + 0.14
    while (this.bossNextTime < ahead) {
      this.scheduleBossStep(this.bossStep, this.bossNextTime)
      this.bossNextTime += BOSS_STEP_DUR
      this.bossStep++
    }
  }

  /** Kick off the looping boss battle music and duck the ambience under it. */
  startBossMusic() {
    if (!this.ready() || this.bossOn) return
    const ctx = this.ctx!
    const now = ctx.currentTime
    this.bossBus = ctx.createGain()
    this.bossBus.gain.setValueAtTime(0.0001, now)
    this.bossBus.gain.linearRampToValueAtTime(0.85, now + 1)
    this.bossBus.connect(this.master!)
    this.setAmbDuck(0.4, 0.8)
    this.bossOn = true
    this.bossStep = 0
    this.bossNextTime = now + 0.08
    this.bossTick()
    this.bossTimer = setInterval(this.bossTick, 25)
  }

  /** Stop the boss music (win/leave) and restore ambience. */
  stopBossMusic() {
    if (!this.bossOn) return
    this.bossOn = false
    if (this.bossTimer) {
      clearInterval(this.bossTimer)
      this.bossTimer = null
    }
    this.setAmbDuck(1, 0.8)
    if (this.bossBus && this.ctx) {
      const now = this.ctx.currentTime
      const bus = this.bossBus
      bus.gain.cancelScheduledValues(now)
      bus.gain.linearRampToValueAtTime(0.0001, now + 0.5)
      setTimeout(() => {
        try {
          bus.disconnect()
        } catch {
          /* already gone */
        }
      }, 700)
    }
    this.bossBus = null
  }

  // --- one-shot SFX ----------------------------------------------------------

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

  /** Whooshing barrel throw — a rising airy sweep as Reginald hurls it up. */
  throwWhoosh() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const now = ctx.currentTime
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.4
    bp.frequency.setValueAtTime(300, now)
    bp.frequency.exponentialRampToValueAtTime(1900, now + 0.4)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.22, now + 0.08)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)
    noise.connect(bp).connect(g).connect(this.master!)
    noise.start(now)
    noise.stop(now + 0.5)
  }

  /**
   * Last-chance revive: the top hat floats away (upward whoosh) then a
   * lighter-flick click + cigar sizzle as Reginald makes his defiant stand.
   */
  revive() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const now = ctx.currentTime

    // Hat float-off — a soft upward filtered-noise whoosh.
    const hatBuf = ctx.createBuffer(1, ctx.sampleRate * 0.7, ctx.sampleRate)
    const hatData = hatBuf.getChannelData(0)
    for (let i = 0; i < hatData.length; i++) hatData[i] = Math.random() * 2 - 1
    const hatNoise = ctx.createBufferSource()
    hatNoise.buffer = hatBuf
    const hatBp = ctx.createBiquadFilter()
    hatBp.type = 'bandpass'
    hatBp.Q.value = 2
    hatBp.frequency.setValueAtTime(400, now)
    hatBp.frequency.exponentialRampToValueAtTime(1500, now + 0.6)
    const hatG = ctx.createGain()
    hatG.gain.setValueAtTime(0.0001, now)
    hatG.gain.exponentialRampToValueAtTime(0.16, now + 0.12)
    hatG.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)
    hatNoise.connect(hatBp).connect(hatG).connect(this.master!)
    hatNoise.start(now)
    hatNoise.stop(now + 0.7)

    // Lighter flick — a tiny sharp click.
    const flickT = now + 0.55
    const flick = ctx.createOscillator()
    flick.type = 'square'
    flick.frequency.setValueAtTime(2400, flickT)
    const flickG = ctx.createGain()
    flickG.gain.setValueAtTime(0.0001, flickT)
    flickG.gain.exponentialRampToValueAtTime(0.12, flickT + 0.003)
    flickG.gain.exponentialRampToValueAtTime(0.0001, flickT + 0.03)
    flick.connect(flickG).connect(this.master!)
    flick.start(flickT)
    flick.stop(flickT + 0.04)

    // Cigar sizzle — brief high crackle right after the flick.
    const sizT = flickT + 0.05
    const sizBuf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate)
    const sizData = sizBuf.getChannelData(0)
    for (let i = 0; i < sizData.length; i++) {
      sizData[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.3)
    }
    const siz = ctx.createBufferSource()
    siz.buffer = sizBuf
    const sizHp = ctx.createBiquadFilter()
    sizHp.type = 'highpass'
    sizHp.frequency.value = 3800
    const sizG = ctx.createGain()
    sizG.gain.setValueAtTime(0.0001, sizT)
    sizG.gain.exponentialRampToValueAtTime(0.08, sizT + 0.02)
    sizG.gain.exponentialRampToValueAtTime(0.0001, sizT + 0.32)
    siz.connect(sizHp).connect(sizG).connect(this.master!)
    siz.start(sizT)
    siz.stop(sizT + 0.35)
  }

  /** Soft bright bell chime — the nursery is revealed beneath the silt. */
  chime() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const start = ctx.currentTime + 0.02
    const notes = [1318.51, 1567.98, 2093.0] // E6 G6 C7
    notes.forEach((freq, i) => {
      const t = start + i * 0.09
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      osc.connect(g).connect(this.master!)
      osc.start(t)
      osc.stop(t + 0.95)
    })
  }

  /** Bubbly flurry — the freed fry swim out of the cut net. */
  bubbles() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const start = ctx.currentTime
    const count = 7
    for (let i = 0; i < count; i++) {
      const t = start + i * 0.06 + Math.random() * 0.03
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      const f0 = 500 + Math.random() * 500
      osc.frequency.setValueAtTime(f0, t)
      osc.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + 0.06) // rising "bloop"
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 2600
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
      osc.connect(lp).connect(g).connect(this.master!)
      osc.start(t)
      osc.stop(t + 0.12)
    }
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

  /** Dark descending sting + low boom — GAME OVER (second death). */
  gameOver() {
    if (!this.ready()) return
    const ctx = this.ctx!
    const now = ctx.currentTime + 0.02
    const chord = [146.83, 174.61, 220] // D3 F3 A3 — minor, bent downward
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 1.6)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(900, now)
      lp.frequency.exponentialRampToValueAtTime(240, now + 1.6)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, now)
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)
      osc.connect(lp).connect(g).connect(this.master!)
      osc.start(now)
      osc.stop(now + 1.85)
    })
    // Low boom underneath.
    const boom = ctx.createOscillator()
    boom.type = 'sine'
    boom.frequency.setValueAtTime(90, now)
    boom.frequency.exponentialRampToValueAtTime(38, now + 1)
    const bg = ctx.createGain()
    bg.gain.setValueAtTime(0.0001, now)
    bg.gain.exponentialRampToValueAtTime(0.32, now + 0.03)
    bg.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)
    boom.connect(bg).connect(this.master!)
    boom.start(now)
    boom.stop(now + 1.25)
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
 * sting + looping boss battle music (ducking ambience), a level-clear jingle, a
 * full-game win jingle, comedic honks, objective/boss-hit SFX, a nursery-reveal
 * chime, a fry-release bubble flurry, the last-chance revive cues, and a
 * game-over sting.
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
    let prevPlayerHealth = s0.playerHealth
    let prevReviving = s0.reviving

    const unsub = useGame.subscribe((s) => {
      // A new level was loaded — reset objective tracking to avoid false hits.
      if (s.levelIndex !== prevLevel) {
        prevLevel = s.levelIndex
        prevObjIndex = 0
      }

      if (s.gamePhase !== prevPhase) {
        const from = prevPhase
        // Leaving the fight always kills the boss battle music.
        if (from === 'playing') engine.stopBossMusic()

        switch (s.gamePhase) {
          case 'intro': {
            const boss = isBossLevel(s.levelIndex)
            engine.startAmbience(s.levelIndex, boss, s.riverHealth)
            if (boss) engine.bossSting()
            break
          }
          case 'playing':
            if (isBossLevel(s.levelIndex)) engine.startBossMusic()
            break
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
            // playing -> title only happens on the second death (GAME OVER reset).
            if (from === 'playing') engine.gameOver()
            break
        }
        prevPhase = s.gamePhase
      }

      // Objective completed (index advances during 'playing', and once more on
      // the final objective as the phase flips to 'outro').
      if (s.objectiveIndex > prevObjIndex && (s.gamePhase === 'playing' || s.gamePhase === 'outro')) {
        const completed = prevObjIndex
        if (isBossLevel(s.levelIndex)) {
          engine.splash()
        } else if (s.levelIndex === 0 && completed === 0) {
          engine.chime() // L1: nursery revealed beneath the dug-out silt
        } else if (s.levelIndex === 1 && completed === 0) {
          engine.bubbles() // L2: fry swim out of the cut net
        } else {
          engine.blorp()
        }
        prevObjIndex = s.objectiveIndex
      }

      // Reginald took a hit during the boss fight (health dropped without a revive).
      if (
        s.playerHealth < prevPlayerHealth &&
        s.gamePhase === 'playing' &&
        isBossLevel(s.levelIndex)
      ) {
        engine.throwWhoosh()
      }
      prevPlayerHealth = s.playerHealth

      // Last-chance revive: hat floats off, lighter flicks, cigar sizzles.
      if (s.reviving && !prevReviving) engine.revive()
      prevReviving = s.reviving

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
      engine.stopBossMusic()
      unsub()
    }
  }, [])

  return { init: () => engine.init() }
}
