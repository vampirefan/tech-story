import { defineStore } from 'pinia'
import { audio, type SfxName } from '@/audio/engine'
import { music } from '@/audio/music'
import type { Settings } from '@/types'

const KEY = 'techstory.settings.v2'

const DEFAULTS: Settings = {
  musicVolume: 0.55,
  sfxVolume: 0.7,
  muted: false,
  freeExplore: true,
  autoplay: true,
  playSpeed: 1,
  showLabels: true,
  quality: 'high',
  bloom: true,
  borderDensity: 'era',
  theme: 'dark'
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { return { ...DEFAULTS } }
}

export const useSettings = defineStore('settings', {
  state: (): Settings & { unlocked: boolean; playingTrack: string | null; watching: boolean } => ({
    ...load(), unlocked: false, playingTrack: music.nowPlaying?.id ?? null, watching: false
  }),

  actions: {
    /** 订阅播放器，让 UI 上的"正在播放"始终跟着实际状态走 */
    watchMusic() {
      if (this.watching) return
      this.watching = true
      window.addEventListener('music:changed', (e) => {
        this.playingTrack = (e as CustomEvent<{ id: string }>).detail?.id ?? null
      })
      window.setInterval(() => {
        const id = music.nowPlaying?.id ?? null
        if (id !== this.playingTrack) this.playingTrack = id
      }, 800)
    },
    persist() {
      const { musicVolume, sfxVolume, muted, freeExplore, autoplay, playSpeed, showLabels, quality, bloom, borderDensity, theme } = this
      try {
        localStorage.setItem(KEY, JSON.stringify({ musicVolume, sfxVolume, muted, freeExplore, autoplay, playSpeed, showLabels, quality, bloom, borderDensity, theme }))
      } catch { /* 隐私模式下 localStorage 不可用，忽略 */ }
    },

    /** 把当前主题写到 <html data-theme>，index.html 的首屏脚本也读同一份设置 */
    applyTheme() {
      document.documentElement.dataset.theme = this.theme
    },
    setTheme(v: Settings['theme']) {
      this.theme = v
      this.applyTheme()
      this.persist()
    },

    /** 首次用户手势后解锁音频（浏览器自动播放策略） */
    unlock() {
      if (this.unlocked) return
      const ok = audio.ensure()
      if (!ok) return
      this.unlocked = true
      this.applyAudio()
      music.setEnabled(true)
    },

    applyAudio() {
      audio.setMusicVolume(this.musicVolume)
      audio.setSfxVolume(this.sfxVolume)
      audio.setMuted(this.muted)
      music.syncVolume()
    },

    setMusicVolume(v: number) { this.musicVolume = Math.max(0, Math.min(1, v)); audio.setMusicVolume(this.musicVolume); music.syncVolume(); this.persist() },
    setSfxVolume(v: number) { this.sfxVolume = Math.max(0, Math.min(1, v)); audio.setSfxVolume(this.sfxVolume); this.persist() },
    toggleMute() { this.muted = !this.muted; audio.setMuted(this.muted); this.persist() },
    setFreeExplore(v: boolean) { this.freeExplore = v; this.persist() },
    setAutoplay(v: boolean) { this.autoplay = v; this.persist() },
    setPlaySpeed(v: number) { this.playSpeed = v; this.persist() },
    setShowLabels(v: boolean) { this.showLabels = v; this.persist() },
    setQuality(v: Settings['quality']) { this.quality = v; this.persist() },
    setBloom(v: boolean) { this.bloom = v; this.persist() },
    setBorderDensity(v: Settings['borderDensity']) { this.borderDensity = v; this.persist() },

    sfx(name: SfxName, gain?: number) {
      if (!this.unlocked || this.muted) return
      audio.sfx(name, gain === undefined ? {} : { gain })
    },

    setMusicScene(scene: Parameters<typeof music.setScene>[0]) {
      music.setScene(scene)
      this.playingTrack = music.nowPlaying?.id ?? null
    },
    playTrack(id: string) {
      this.unlock()
      music.play(id)
      this.playingTrack = id
    },
    resumeAutoMusic() {
      music.resumeAuto()
      this.playingTrack = music.nowPlaying?.id ?? null
    },
    stopMusic() {
      music.setScene('none')
      this.playingTrack = null
    },
    pauseMusic() { music.pause() },
    resumeMusic() { music.resume() }
  }
})
