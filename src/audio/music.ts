import { Howl } from 'howler'
import { audio } from './engine'
import { ERA_TRACKS, TRACK_MAP, trackUrl, type Track } from '@/data/tracks'
import type { EraId } from '@/types'

type Scene = EraId | 'china' | 'none'

/** 远程录音加载超时：超时回退合成氛围，避免Pending卡死 */
const LOAD_TIMEOUT = 15000

class MusicPlayer {
  private current: Howl | null = null
  private currentId: string | null = null
  private pending: Howl | null = null
  private loadTimer = 0
  private scene: Scene = 'none'
  private enabled = true
  private synthScene: Scene | null = null

  private vol() { return audio.volumes.muted ? 0 : audio.volumes.music }

  /** 当前场景：时代氛围（真实曲目或合成）会自动跟随 */
  setScene(scene: Scene) {
    if (this.scene === scene) return
    this.scene = scene
    if (!this.enabled || scene === 'none') { this.stopAll(); return }
    this.apply()
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (!on) this.stopAll()
    else if (this.scene !== 'none') this.apply()
  }

  get isEnabled() { return this.enabled }
  get currentScene() { return this.scene }
  get nowPlaying(): Track | null { return this.currentId ? TRACK_MAP[this.currentId] ?? null : null }
  get isSynth(): boolean { return this.synthScene !== null }

  /** 手动点一首曲子（覆盖时代自动配乐） */
  play(trackId: string) {
    if (!TRACK_MAP[trackId]) return
    try {
      this.startTrack(trackId, true)
    } catch (e) {
      console.warn('[music] play failed, fallback to synth', e)
      try { this.setSynth(this.scene) } catch { /* noop */ }
    }
  }

  /** 恢复"跟随时代自动配乐" */
  resumeAuto() {
    this.apply()
  }

  private apply() {
    const s = this.scene
    if (s === 'none') { this.stopAll(); return }
    const trackId = ERA_TRACKS[s]
    if (trackId && trackUrl(trackId)) {
      this.setSynth(null)
      if (this.currentId !== trackId) this.startTrack(trackId, false)
    } else {
      this.stopTrack()
      this.setSynth(s)
    }
  }

  private setSynth(s: Scene | null) {
    if (this.synthScene === s) return
    this.synthScene = s
    if (s && s !== 'none') audio.startAmbience(s)
    else audio.stopAmbience(1.2)
  }

  /**
   * 远程公版录音用 HTML5 流式播放：不走 WebAudio 的 arraybuffer 解码链路，
   * 避免加载/切换曲目时音频服务与渲染进程互相拖死（黑屏的根因之一）。
   */
  private startTrack(id: string, manual: boolean) {
    const url = trackUrl(id)
    if (!url || !audio.ensure()) { this.setSynth(this.scene); return }
    const old = this.current
    const oldId = this.currentId
    if (old && oldId === id) { if (!old.playing()) old.play(); return }

    const howl = new Howl({
      src: [url],
      volume: 0,
      loop: true,
      html5: true,
      preload: true,
      onloaderror: (_i, e) => {
        console.warn('[music] load fail', id, e)
        if (this.pending === howl) { this.pending = null; window.clearTimeout(this.loadTimer) }
        howl.unload()
        if (old === this.current) this.setSynth(this.scene)
      },
      onplayerror: (_i, e) => { console.warn('[music] play fail', id, e) }
    })
    this.pending = howl
    window.clearTimeout(this.loadTimer)
    this.loadTimer = window.setTimeout(() => {
      if (this.pending !== howl) return
      console.warn('[music] load timeout', id)
      this.pending = null
      try { howl.unload() } catch { /* noop */ }
      if (old === this.current) this.setSynth(this.scene)
    }, LOAD_TIMEOUT)
    howl.once('load', () => {
      try {
        if (this.pending !== howl) { howl.unload(); return }
        this.pending = null
        window.clearTimeout(this.loadTimer)
        this.current = howl
        this.currentId = id
        howl.play()
        // fade 必须等 play 的 promise 落地（_playLock 释放）后再调：
        // 锁定期内调用会被 howler 排进内部队列且永不消费，音量会停在 0
        howl.once('play', () => {
          if (this.current !== howl) return
          try { howl.fade(0, this.vol(), 2200) } catch { howl.volume(this.vol()) }
        })
        if (old) {
          old.fade(old.volume(), 0, 1600)
          const oid = old
          window.setTimeout(() => { try { oid.stop(); oid.unload() } catch { /* noop */ } }, 1800)
        }
        this.setSynth(null)
        if (manual) window.dispatchEvent(new CustomEvent('music:changed', { detail: { id } }))
      } catch (e) {
        console.warn('[music] start failed', id, e)
        try { howl.unload() } catch { /* noop */ }
        if (this.current === howl) { this.current = null; this.currentId = null }
      }
    })
  }

  private stopTrack() {
    const old = this.current
    this.current = null
    this.currentId = null
    if (this.pending) {
      window.clearTimeout(this.loadTimer)
      this.pending.unload()
      this.pending = null
    }
    if (old) {
      old.fade(old.volume(), 0, 1200)
      window.setTimeout(() => { try { old.stop(); old.unload() } catch { /* noop */ } }, 1400)
    }
  }

  private stopAll() {
    this.stopTrack()
    this.setSynth(null)
  }

  /** 音乐音量/静音变化时同步到正在播放的录音 */
  syncVolume() {
    if (this.current) this.current.volume(this.vol())
  }

  pause() { if (this.current?.playing()) this.current.pause(); audio.suspend() }
  resume() { audio.resume(); if (this.current && !this.current.playing()) this.current.play() }

  seek(v?: number) { return this.current ? (v === undefined ? this.current.seek() as number : (this.current.seek(v), v)) : 0 }
  duration() { return this.current?.duration() ?? 0 }
}

export const music = new MusicPlayer()

if (import.meta.env.DEV) (window as unknown as { __music?: MusicPlayer }).__music = music
