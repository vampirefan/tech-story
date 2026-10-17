/**
 * 程序化音频引擎
 * ─────────────────────────────────────────────
 * 1) SFX：全部用 WebAudio 实时合成，零资源依赖、零延迟
 * 2) 时代氛围音乐：按时代选择音阶/音色/密度，生成式作曲 + 持续低音铺底
 * 3) 真实公版录音：music.ts 用 Howler HTML5 流式播放，音量与本引擎音乐总线同步
 */

export type SfxName =
  | 'hover' | 'click' | 'confirm' | 'cancel' | 'whoosh'
  | 'unlock' | 'correct' | 'wrong' | 'tick' | 'pin'
  | 'power' | 'page' | 'spark' | 'alarm' | 'chime'

type EraId = string

interface EraScore {
  root: number          // 根音频率 Hz
  scale: number[]       // 相对根音的半音数（自然音阶）
  tempo: number         // 每拍秒数
  barsPerChord: number  // 每个和弦持续的小节数
  progression: number[] // 和弦根音的音级循环（协和进行）
  timbre: Timbre        // 主旋律音色
  melody: number        // 每小节出现旋律动机的概率
  drone: boolean
  droneGain: number
  /** warm=低锯齿铺底；air=风噪床（石器时代用，避免低沉轰鸣） */
  droneKind?: 'warm' | 'air'
  perc: number          // 打击密度 0-1（整体克制）
  reverb: number        // 混响湿声 0-1
  lowpass: number
}

type Timbre = 'flute' | 'bell' | 'pluck' | 'string' | 'choir' | 'soft'

const SEMI = Math.pow(2, 1 / 12)
const hz = (root: number, semi: number, oct = 0) => root * Math.pow(SEMI, semi + oct * 12)

const PENT_MIN = [0, 3, 5, 7, 10]
const CHINA_PENT = [0, 2, 4, 7, 9]   // 宫商角徵羽
const DORIAN = [0, 2, 3, 5, 7, 9, 10]
const MIXO = [0, 2, 4, 5, 7, 9, 10]
const NAT_MIN = [0, 2, 3, 5, 7, 8, 10]
const DIAT_MAJ = [0, 2, 4, 5, 7, 9, 11]

/**
 * 每个时代的生成式配乐参数：协和和弦循环 + 稀疏旋律动机 + 低音铺底，
 * 走文明 / P 社原声那种"慢、暖、可哼唱"的路子，避免随机音阶与不协和音色
 */
const ERA_SCORES: Record<string, EraScore> = {
  stone:        { root: 65.4, scale: PENT_MIN,   tempo: 3.0, barsPerChord: 2, progression: [0, 3, 2, 1], timbre: 'flute',  melody: 0.55, drone: true, droneGain: 0.10, droneKind: 'air', perc: 0.10, reverb: 0.80, lowpass: 1000 },
  bronze:       { root: 58.3, scale: CHINA_PENT, tempo: 2.4, barsPerChord: 2, progression: [0, 3, 4, 2], timbre: 'bell',   melody: 0.62, drone: true, droneGain: 0.11, perc: 0.12, reverb: 0.70, lowpass: 2600 },
  iron:         { root: 65.4, scale: DORIAN,     tempo: 2.2, barsPerChord: 2, progression: [0, 5, 3, 4], timbre: 'string', melody: 0.60, drone: true, droneGain: 0.12, perc: 0.16, reverb: 0.62, lowpass: 2200 },
  classical:    { root: 73.4, scale: DIAT_MAJ,   tempo: 2.6, barsPerChord: 2, progression: [0, 5, 3, 4], timbre: 'string', melody: 0.70, drone: true, droneGain: 0.12, perc: 0.00, reverb: 0.72, lowpass: 2400 },
  medieval:     { root: 65.4, scale: DORIAN,     tempo: 3.0, barsPerChord: 2, progression: [0, 6, 3, 4], timbre: 'choir',  melody: 0.45, drone: true, droneGain: 0.16, perc: 0.00, reverb: 0.85, lowpass: 1500 },
  renaissance:  { root: 87.3, scale: MIXO,       tempo: 1.8, barsPerChord: 1, progression: [0, 5, 3, 4], timbre: 'pluck',  melody: 0.72, drone: true, droneGain: 0.09, perc: 0.08, reverb: 0.55, lowpass: 3200 },
  industrial:   { root: 55,   scale: NAT_MIN,    tempo: 1.4, barsPerChord: 1, progression: [0, 5, 6, 4], timbre: 'string', melody: 0.55, drone: true, droneGain: 0.13, perc: 0.22, reverb: 0.40, lowpass: 1800 },
  electric:     { root: 73.4, scale: CHINA_PENT, tempo: 1.6, barsPerChord: 1, progression: [0, 3, 4, 2], timbre: 'soft',   melody: 0.66, drone: true, droneGain: 0.11, perc: 0.12, reverb: 0.50, lowpass: 2800 },
  atomic:       { root: 61.7, scale: NAT_MIN,    tempo: 2.4, barsPerChord: 2, progression: [0, 3, 5, 4], timbre: 'string', melody: 0.50, drone: true, droneGain: 0.13, perc: 0.00, reverb: 0.80, lowpass: 2000 },
  information:  { root: 87.3, scale: DIAT_MAJ,   tempo: 1.1, barsPerChord: 1, progression: [0, 4, 5, 3], timbre: 'soft',   melody: 0.68, drone: true, droneGain: 0.09, perc: 0.16, reverb: 0.50, lowpass: 4200 },
  intelligence: { root: 98,   scale: CHINA_PENT, tempo: 1.2, barsPerChord: 1, progression: [0, 3, 4, 2], timbre: 'bell',   melody: 0.64, drone: true, droneGain: 0.10, perc: 0.12, reverb: 0.65, lowpass: 4600 },
  future:       { root: 55,   scale: DIAT_MAJ,   tempo: 2.8, barsPerChord: 2, progression: [0, 4, 5, 3], timbre: 'choir',  melody: 0.50, drone: true, droneGain: 0.15, perc: 0.00, reverb: 0.90, lowpass: 3600 },
  china:        { root: 78,   scale: CHINA_PENT, tempo: 2.2, barsPerChord: 2, progression: [0, 3, 4, 2], timbre: 'pluck',  melody: 0.70, drone: true, droneGain: 0.10, perc: 0.06, reverb: 0.70, lowpass: 3400 }
}

class AudioEngine {
  ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private sfxBus!: GainNode
  private ambBus!: GainNode
  private verb!: ConvolverNode
  private verbWet!: GainNode
  private verbDry!: GainNode
  private noiseBuf!: AudioBuffer
  private compressor!: DynamicsCompressorNode

  private musicVol = 0.55
  private sfxVol = 0.7
  private muted = false

  // 氛围乐调度
  private ambEra: EraId | null = null
  private ambTimer: number | null = null
  private ambNodes: { stop: () => void }[] = []
  private ambGain!: GainNode
  private nextBeatTime = 0
  private beatIndex = 0
  private motif: number[] | null = null
  private motifAge = 0

  /** 必须在用户手势后调用（浏览器自动播放策略） */
  ensure(): boolean {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return true
    }
    try {
      const AC: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return false
      this.ctx = new AC({ latencyHint: 'interactive' })
      this.build()
      return true
    } catch { return false }
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running' }

  private build() {
    const ctx = this.ctx!
    this.compressor = ctx.createDynamicsCompressor()
    this.compressor.threshold.value = -14
    this.compressor.knee.value = 22
    this.compressor.ratio.value = 8
    this.compressor.attack.value = 0.004
    this.compressor.release.value = 0.22

    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    this.compressor.connect(this.master)
    this.master.connect(ctx.destination)

    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicVol; this.musicBus.connect(this.compressor)
    this.sfxBus = ctx.createGain();   this.sfxBus.gain.value = this.sfxVol;     this.sfxBus.connect(this.compressor)
    this.ambBus = ctx.createGain();   this.ambBus.gain.value = 0;               this.ambBus.connect(this.musicBus)

    // 程序化混响（2.6s 指数衰减脉冲响应）
    this.verb = ctx.createConvolver()
    this.verb.buffer = this.makeImpulse(2.6, 2.6)
    this.verbWet = ctx.createGain(); this.verbWet.gain.value = 0.5
    this.verbDry = ctx.createGain(); this.verbDry.gain.value = 1
    this.verb.connect(this.verbWet); this.verbWet.connect(this.compressor)
    this.verbDry.connect(this.compressor)

    // 白噪声缓冲（打击、气声、扫频用）
    const len = Math.floor(ctx.sampleRate * 2)
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }

  private makeImpulse(dur: number, decay: number): AudioBuffer {
    const ctx = this.ctx!
    const rate = ctx.sampleRate
    const len = Math.max(1, Math.floor(rate * dur))
    const buf = ctx.createBuffer(2, len, rate)
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c)
      for (let i = 0; i < len; i++) {
        const t = i / len
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (1 - t * 0.35)
      }
    }
    return buf
  }

  private now() { return this.ctx!.currentTime }

  private route(node: AudioNode, reverb = 0.3, gainTarget?: GainNode) {
    const out = gainTarget ?? this.sfxBus
    node.connect(this.verbDry)
    // verbDry 已连到 compressor；这里为 wet 单独控制
    if (reverb > 0) {
      const g = this.ctx!.createGain(); g.gain.value = reverb
      node.connect(g); g.connect(this.verb)
    }
    void out
  }

  /* ─────────── 音量 ─────────── */
  setMusicVolume(v: number) { this.musicVol = clamp01(v); if (this.ctx) ramp(this.musicBus.gain, this.musicVol, 0.12) }
  setSfxVolume(v: number)   { this.sfxVol = clamp01(v);   if (this.ctx) ramp(this.sfxBus.gain, this.sfxVol, 0.08) }
  setMuted(m: boolean) {
    this.muted = m
    if (this.ctx) ramp(this.master.gain, m ? 0 : 1, 0.15)
  }
  get volumes() { return { music: this.musicVol, sfx: this.sfxVol, muted: this.muted } }

  /* ─────────── 音效 ─────────── */
  sfx(name: SfxName, opts: { gain?: number; detune?: number } = {}) {
    if (!this.ensure() || this.muted) return
    const g = opts.gain ?? 1
    const t = this.now() + 0.001
    switch (name) {
      case 'hover': this.blip(t, 1750, 0.045, 0.05 * g, 'sine', 0); break
      case 'click': this.blip(t, 880, 0.05, 0.16 * g, 'triangle', 0); this.blip(t + 0.012, 1320, 0.05, 0.10 * g, 'sine', 0); break
      case 'confirm': this.arp(t, [523.25, 659.25, 783.99, 1046.5], 0.055, 0.16 * g, 'sine'); break
      case 'cancel': this.sweep(t, 460, 190, 0.16, 0.13 * g, 'sawtooth', 900); break
      case 'whoosh': this.noiseSweep(t, 0.42, 0.16 * g, 300, 3600); break
      case 'page': this.noiseSweep(t, 0.3, 0.11 * g, 700, 5200); break
      case 'unlock': this.bell(t, 784, 0.9, 0.20 * g); this.bell(t + 0.09, 1046.5, 1.1, 0.16 * g); this.bell(t + 0.18, 1568, 1.4, 0.12 * g); this.shimmer(t + 0.05, 0.7, 0.05 * g); break
      case 'correct': this.arp(t, [659.25, 830.6, 987.77, 1318.5], 0.05, 0.15 * g, 'sine'); this.bell(t + 0.2, 1568, 0.7, 0.08 * g); break
      case 'wrong': this.buzz(t, 150, 0.3, 0.16 * g); this.buzz(t + 0.06, 112, 0.3, 0.12 * g); break
      case 'tick': this.blip(t, 2400, 0.018, 0.045 * g, 'square', 0); break
      case 'pin': this.sweep(t, 320, 900, 0.13, 0.14 * g, 'sine', 2400); this.blip(t + 0.09, 1200, 0.06, 0.07 * g, 'sine', 0); break
      case 'power': this.sweep(t, 90, 1400, 0.7, 0.15 * g, 'sawtooth', 2600); this.noiseSweep(t, 0.7, 0.06 * g, 200, 5000); break
      case 'spark': this.spark(t, 0.10 * g); break
      case 'alarm': this.blip(t, 880, 0.12, 0.13 * g, 'square', 0); this.blip(t + 0.18, 660, 0.16, 0.13 * g, 'square', 0); break
      case 'chime': this.bell(t, 1046.5, 1.6, 0.14 * g); this.bell(t + 0.02, 1567.98, 1.6, 0.09 * g); break
    }
  }

  private blip(t: number, freq: number, dur: number, vol: number, type: OscillatorType, reverb: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.25))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); this.route(g, reverb); o.start(t); o.stop(t + dur + 0.05)
  }

  private sweep(t: number, f0: number, f1: number, dur: number, vol: number, type: OscillatorType, lp: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(lp, t); f.Q.value = 3
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.2)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(f); f.connect(g); this.route(g, 0.22)
    o.start(t); o.stop(t + dur + 0.05)
  }

  private bell(t: number, freq: number, dur: number, vol: number) {
    const ctx = this.ctx!
    const parts = [
      { r: 1, a: 1, d: dur }, { r: 2.01, a: 0.42, d: dur * 0.7 },
      { r: 2.98, a: 0.24, d: dur * 0.45 }, { r: 4.11, a: 0.12, d: dur * 0.3 }, { r: 5.43, a: 0.06, d: dur * 0.2 }
    ]
    const sum = ctx.createGain(); sum.gain.value = vol
    for (const p of parts) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * p.r, t)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(p.a, t + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, t + p.d)
      o.connect(g); g.connect(sum); o.start(t); o.stop(t + p.d + 0.05)
    }
    this.route(sum, 0.55)
  }

  private arp(t: number, freqs: number[], step: number, vol: number, type: OscillatorType) {
    freqs.forEach((f, i) => this.blip(t + i * step, f, 0.42, vol, type, 0.35))
  }

  private buzz(t: number, freq: number, dur: number, vol: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(freq, t)
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.setValueAtTime(freq * 1.005, t)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(520, t); f.Q.value = 6
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.02)
    g.gain.setValueAtTime(vol, t + dur * 0.6)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(f); o2.connect(f); f.connect(g); this.route(g, 0.12)
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05)
  }

  private noiseSweep(t: number, dur: number, vol: number, f0: number, f1: number) {
    const ctx = this.ctx!
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1
    f.frequency.setValueAtTime(f0, t)
    f.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f); f.connect(g); this.route(g, 0.3)
    s.start(t); s.stop(t + dur + 0.05)
  }

  private spark(t: number, vol: number) {
    for (let i = 0; i < 7; i++) {
      const at = t + Math.random() * 0.22
      this.blip(at, 1800 + Math.random() * 3200, 0.05, vol * (0.4 + Math.random() * 0.6), 'sine', 0.3)
    }
  }

  private shimmer(t: number, dur: number, vol: number) {
    const ctx = this.ctx!
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.setValueAtTime(4200, t)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.2)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f); f.connect(g); this.route(g, 0.7)
    s.start(t); s.stop(t + dur + 0.05)
  }

  /* ─────────── 时代氛围生成音乐 ─────────── */
  startAmbience(era: EraId) {
    if (!this.ensure()) return
    if (this.ambEra === era) return
    this.stopAmbience(0.8)
    this.ambEra = era
    this.motif = null
    this.motifAge = 0
    const score = ERA_SCORES[era] ?? ERA_SCORES.future
    const ctx = this.ctx!

    if (!this.ambGain) { this.ambGain = ctx.createGain(); this.ambGain.connect(this.ambBus) }
    ramp(this.ambBus.gain, 1, 1.6)

    if (score.drone) this.startDrone(score)

    this.nextBeatTime = this.now() + 0.25
    this.beatIndex = 0
    const tick = () => {
      if (this.ambEra !== era) return
      const sc = ERA_SCORES[this.ambEra] ?? score
      while (this.nextBeatTime < this.now() + 0.35) {
        this.scheduleBeat(sc, this.nextBeatTime, this.beatIndex)
        this.nextBeatTime += sc.tempo
        this.beatIndex++
      }
      this.ambTimer = window.setTimeout(tick, 120)
    }
    tick()
  }

  private startDrone(score: EraScore) {
    const ctx = this.ctx!
    const t = this.now()
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(score.droneGain, t + 3.5)
    const oscs: OscillatorNode[] = []
    const extraStops: (() => void)[] = []

    if ((score.droneKind ?? 'warm') === 'air') {
      // 风床：循环噪声过两带缓摆带通 + 高八度协和正弦，取代低锯齿轰鸣
      const len = ctx.sampleRate * 2
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      const wind = (freq: number, q: number, amp: number, lfoF: number) => {
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q
        const ng = ctx.createGain(); ng.gain.value = amp
        const lfo = ctx.createOscillator(); lfo.frequency.value = lfoF
        const lg = ctx.createGain(); lg.gain.value = amp * 0.45
        lfo.connect(lg); lg.connect(ng.gain); lfo.start(t)
        const wl = ctx.createOscillator(); wl.frequency.value = lfoF * 0.63
        const wg = ctx.createGain(); wg.gain.value = freq * 0.22
        wl.connect(wg); wg.connect(bp.frequency); wl.start(t)
        src.connect(bp); bp.connect(ng); ng.connect(g)
        src.start(t)
        oscs.push(lfo as unknown as OscillatorNode, wl as unknown as OscillatorNode)
        extraStops.push(() => { try { src.stop(this.now() + 1.1) } catch { /* noop */ } })
      }
      wind(420, 0.8, 0.5, 0.045)
      wind(1150, 1.2, 0.22, 0.061)
      ;[2, 3].forEach((mult, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = score.root * mult
        const og = ctx.createGain(); og.gain.value = i ? 0.10 : 0.16
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.02
        const lg = ctx.createGain(); lg.gain.value = (i ? 0.10 : 0.16) * 0.4
        lfo.connect(lg); lg.connect(og.gain); lfo.start(t)
        o.connect(og); og.connect(g)
        o.start(t); oscs.push(o, lfo as unknown as OscillatorNode)
      })
      this.route(g, score.reverb, this.ambGain)
      g.connect(this.ambGain)
      this.ambNodes.push({
        stop: () => {
          ramp(g.gain, 0, 0.9)
          oscs.forEach(o => { try { o.stop(this.now() + 1.1) } catch { /* noop */ } })
          extraStops.forEach(fn => fn())
        }
      })
      return
    }

    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(1400, score.lowpass); f.Q.value = 0.7

    const freqs = [score.root, score.root * 1.5, score.root * 2, score.root * 3.01]
    const amps = [1, 0.5, 0.32, 0.12]
    freqs.forEach((fr, i) => {
      const o = ctx.createOscillator()
      o.type = i < 2 ? 'sawtooth' : 'sine'
      o.frequency.value = fr
      o.detune.value = (i % 2 ? 5 : -5)
      const og = ctx.createGain(); og.gain.value = amps[i] * 0.5
      // 缓慢的音量起伏，让铺底"呼吸"
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.03 + i * 0.017
      const lg = ctx.createGain(); lg.gain.value = amps[i] * 0.18
      lfo.connect(lg); lg.connect(og.gain); lfo.start(t)
      o.connect(og); og.connect(f)
      o.start(t); oscs.push(o, lfo as unknown as OscillatorNode)
    })
    f.connect(g); this.route(g, score.reverb, this.ambGain)
    g.connect(this.ambGain)
    this.ambNodes.push({ stop: () => { ramp(g.gain, 0, 0.9); oscs.forEach(o => { try { o.stop(this.now() + 1.1) } catch { /* noop */ } }) } })
  }

  private scheduleBeat(sc: EraScore, t: number, idx: number) {
    if (idx % 4 !== 0) return
    this.scheduleBar(sc, t, Math.floor(idx / 4))
  }

  /** 一小节：和弦铺底 + 低音 + 稀疏旋律动机，打击极克制 */
  private scheduleBar(sc: EraScore, t: number, bar: number) {
    const chordIdx = Math.floor(bar / sc.barsPerChord) % sc.progression.length
    const cdeg = sc.progression[chordIdx]
    const barDur = sc.tempo * 4
    if (bar % sc.barsPerChord === 0) {
      const chordDur = barDur * sc.barsPerChord
      const tones = [0, 2, 4].map(k => hz(sc.root, this.degSemi(sc, cdeg + k), 1))
      this.padChord(t, tones, chordDur * 1.1, 0.05, sc)
      this.bassNote(t, hz(sc.root, this.degSemi(sc, cdeg), 0), chordDur, 0.09, sc)
    }
    if (sc.perc > 0) {
      if (Math.random() < sc.perc) this.percHit(t, true, sc)
      else if (Math.random() < sc.perc * 0.6) this.percHit(t + sc.tempo * 2, false, sc)
    }
    if (Math.random() < sc.melody) this.schedulePhrase(sc, t, barDur, cdeg)
  }

  private degSemi(sc: EraScore, d: number) {
    const n = sc.scale.length
    return sc.scale[((d % n) + n) % n] + 12 * Math.floor(d / n)
  }

  /** 动机重复+微变奏：游戏原声"听得久也不烦、还能哼出来"的关键 */
  private schedulePhrase(sc: EraScore, t: number, barDur: number, cdeg: number) {
    if (!this.motif || this.motifAge > 3 || Math.random() < 0.35) {
      const chordTones = [0, 2, 4]
      const len = 3 + Math.floor(Math.random() * 3)
      const m: number[] = []
      let cur = chordTones[Math.floor(Math.random() * 3)]
      for (let i = 0; i < len; i++) {
        m.push(cur)
        const roll = Math.random()
        cur = roll < 0.6 ? chordTones[Math.floor(Math.random() * 3)] : cur + (roll < 0.82 ? 1 : -1)
      }
      this.motif = m
      this.motifAge = 0
    } else this.motifAge++
    const m = this.motif
    const slot = barDur / m.length
    m.forEach((step, i) => {
      if (i > 0 && Math.random() < 0.18) return
      const freq = hz(sc.root, this.degSemi(sc, cdeg + step), 2)
      const vol = 0.07 + (i === 0 ? 0.02 : 0) + Math.random() * 0.02
      this.voiceNote(t + i * slot, freq, Math.min(slot * 1.9, sc.tempo * 2.6), vol, sc)
    })
  }

  private voiceNote(t: number, freq: number, dur: number, vol: number, sc: EraScore) {
    switch (sc.timbre) {
      case 'flute': this.fluteAt(t, freq, dur, vol, sc); break
      case 'bell': this.bellAt(t, freq, dur * 1.7, vol * 0.9, sc.reverb); break
      case 'pluck': this.pluckAt(t, freq, vol * 1.1, sc); break
      case 'string': this.stringAt(t, freq, dur, vol, sc); break
      case 'choir': this.choirAt(t, freq, dur, vol * 0.85, sc); break
      case 'soft': this.softAt(t, freq, dur, vol, sc); break
    }
  }

  private percHit(t: number, strong: boolean, sc: EraScore) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); o.type = 'sine'
    const f0 = strong ? 110 : 165
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(strong ? 42 : 62, t + (strong ? 0.24 : 0.13))
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(strong ? 0.20 : 0.10, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + (strong ? 0.34 : 0.17))
    o.connect(g); this.route(g, sc.reverb * 0.35, this.ambGain); g.connect(this.ambGain)
    o.start(t); o.stop(t + 0.4)

    if (!strong && Math.random() < 0.5) {
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3600 + Math.random() * 3000; bp.Q.value = 2
      const ng = ctx.createGain()
      ng.gain.setValueAtTime(0.035, t)
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
      s.connect(bp); bp.connect(ng); this.route(ng, sc.reverb * 0.4, this.ambGain); ng.connect(this.ambGain)
      s.start(t); s.stop(t + 0.14)
    }
  }

  private out(g: GainNode, sc: EraScore) {
    this.route(g, sc.reverb, this.ambGain)
    g.connect(this.ambGain)
  }

  /** 慢起慢落的暖垫和弦：弦乐群的底子 */
  private padChord(t: number, freqs: number[], dur: number, vol: number, sc: EraScore) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3)
    g.gain.setValueAtTime(vol, t + dur * 0.62)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(sc.lowpass, 1800); f.Q.value = 0.6
    freqs.forEach(fr => {
      ;[-4, 4].forEach((det, i) => {
        const o = ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sawtooth'
        o.frequency.setValueAtTime(fr, t); o.detune.setValueAtTime(det, t)
        const og = ctx.createGain(); og.gain.value = i === 0 ? 0.6 : 0.2
        o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.1)
      })
    })
    f.connect(g); this.out(g, sc)
  }

  private bassNote(t: number, freq: number, dur: number, vol: number, sc: EraScore) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.12)
    g.gain.setValueAtTime(vol, t + dur * 0.55)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq, t)
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(freq, t)
    const g2 = ctx.createGain(); g2.gain.value = 0.3
    o.connect(g); o2.connect(g2); g2.connect(g)
    this.out(g, sc)
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1)
  }

  /** 4.6Hz 左右的浅颤音：合成音色"活过来"的关键 */
  private vibrato(o: OscillatorNode, t: number, dur: number) {
    const ctx = this.ctx!
    const lfo = ctx.createOscillator(); lfo.frequency.value = 4.6 + Math.random() * 0.6
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t)
    lg.gain.linearRampToValueAtTime(6, t + Math.min(0.4, dur * 0.4))
    lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(t + dur + 0.2)
  }

  private fluteAt(t: number, freq: number, dur: number, vol: number, sc: EraScore) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq, t)
    this.vibrato(o, t, dur)
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = freq * 3; nf.Q.value = 2.2
    const ng = ctx.createGain(); ng.gain.value = 0.05
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.12, dur * 0.2))
    g.gain.setValueAtTime(vol, t + dur * 0.6)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); n.connect(nf); nf.connect(ng); ng.connect(g)
    this.out(g, sc)
    o.start(t); n.start(t); o.stop(t + dur + 0.1); n.stop(t + dur + 0.1)
  }

  private stringAt(t: number, freq: number, dur: number, vol: number, sc: EraScore) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.22)
    g.gain.setValueAtTime(vol, t + dur * 0.6)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(sc.lowpass, freq * 5); f.Q.value = 0.8
    ;[-5, 5].forEach((det, i) => {
      const o = ctx.createOscillator(); o.type = i === 0 ? 'sawtooth' : 'triangle'
      o.frequency.setValueAtTime(freq, t); o.detune.setValueAtTime(det, t)
      this.vibrato(o, t, dur)
      const og = ctx.createGain(); og.gain.value = i === 0 ? 0.4 : 0.5
      o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.1)
    })
    f.connect(g); this.out(g, sc)
  }

  private choirAt(t: number, freq: number, dur: number, vol: number, sc: EraScore) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.38)
    g.gain.setValueAtTime(vol, t + dur * 0.62)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(sc.lowpass, 1600); f.Q.value = 0.7
    ;[-7, 0, 7].forEach(det => {
      const o = ctx.createOscillator(); o.type = 'triangle'
      o.frequency.setValueAtTime(freq, t); o.detune.setValueAtTime(det, t)
      this.vibrato(o, t, dur)
      const og = ctx.createGain(); og.gain.value = 0.34
      o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.1)
    })
    f.connect(g); this.out(g, sc)
  }

  private softAt(t: number, freq: number, dur: number, vol: number, sc: EraScore) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq, t)
    this.vibrato(o, t, dur)
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(freq * 2, t)
    const g2 = ctx.createGain(); g2.gain.value = 0.14
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.1, dur * 0.25))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); o2.connect(g2); g2.connect(g)
    this.out(g, sc)
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1)
  }

  private bellAt(t: number, freq: number, dur: number, vol: number, reverb: number) {
    const ctx = this.ctx!
    const sum = ctx.createGain(); sum.gain.value = vol
    ;[[1, 1, dur], [2.0, 0.3, dur * 0.6], [2.99, 0.11, dur * 0.36], [4.1, 0.05, dur * 0.22]].forEach(([r, a, d]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * r, t)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      o.connect(g); g.connect(sum); o.start(t); o.stop(t + d + 0.05)
    })
    this.route(sum, reverb, this.ambGain); sum.connect(this.ambGain)
  }

  private pluckAt(t: number, freq: number, vol: number, sc: EraScore) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(freq, t)
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.setValueAtTime(freq * 2, t)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'
    f.frequency.setValueAtTime(Math.min(sc.lowpass, freq * 9), t)
    f.frequency.exponentialRampToValueAtTime(Math.max(220, freq * 1.6), t + 0.7)
    f.Q.value = 1.4
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5)
    const g2 = ctx.createGain(); g2.gain.value = 0.28
    o.connect(f); o2.connect(g2); g2.connect(f)
    f.connect(g); this.out(g, sc)
    o.start(t); o2.start(t); o.stop(t + 1.6); o2.stop(t + 1.6)
  }

  stopAmbience(fade = 0.7) {
    if (!this.ctx) { this.ambEra = null; return }
    this.ambEra = null
    if (this.ambTimer !== null) { clearTimeout(this.ambTimer); this.ambTimer = null }
    ramp(this.ambBus.gain, 0, fade)
    const nodes = this.ambNodes
    this.ambNodes = []
    window.setTimeout(() => nodes.forEach(n => n.stop()), fade * 1000)
  }

  get ambienceEra() { return this.ambEra }

  suspend() { if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend() }
  resume() { if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume() }
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function ramp(p: AudioParam, v: number, dur: number) {
  const ctxNow = (p as any).context?.currentTime ?? 0
  try {
    p.cancelScheduledValues(ctxNow)
    p.setValueAtTime(p.value, ctxNow)
    p.linearRampToValueAtTime(v, ctxNow + dur)
  } catch { p.value = v }
}

export const audio = new AudioEngine()
export { ERA_SCORES }
