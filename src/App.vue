<script setup lang="ts">
import { onMounted, onBeforeUnmount, onErrorCaptured, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettings } from '@/stores/settings'
import { useProgress } from '@/stores/progress'
import { useUI } from '@/stores/ui'
import { ERA_MAP, ERA_ORDER } from '@/data/eras'
import TopNav from '@/components/ui/TopNav.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import SettingsPanel from '@/components/ui/SettingsPanel.vue'
import HelpOverlay from '@/components/ui/HelpOverlay.vue'

const route = useRoute()
const router = useRouter()
const settings = useSettings()
const progress = useProgress()
const ui = useUI()

/**
 * 场景级错误边界：任何子组件在 setup/render/事件里抛错，
 * 都只显示一块可重试的故障面板，而不是把整棵应用卸载成黑屏。
 */
const sceneErr = ref('')
const sceneKey = ref(0)
onErrorCaptured((err, _inst, info) => {
  console.error('[scene-error]', info, err)
  sceneErr.value = `${(err as Error)?.message ?? String(err)} · ${info}`
  return false
})
function retryScene() {
  sceneErr.value = ''
  sceneKey.value++
}

/** 第一次交互时解锁 WebAudio（浏览器自动播放策略），并开启氛围音乐 */
function firstGesture() {
  settings.unlock()
  settings.watchMusic()
  window.removeEventListener('pointerdown', firstGesture)
  window.removeEventListener('keydown', firstGesture)
}

/** 音乐场景跟着路由 / 时代走 */
watch(
  () => [route.name, ui.eraId] as const,
  ([name, era]) => {
    if (!settings.unlocked) return
    settings.setMusicScene(name === 'china' ? 'china' : name === 'opening' ? 'none' : era)
  }
)

const SPEED_KEYS: Record<string, number> = { 0: 0.5, 1: 1, 2: 2, 3: 4, 4: 8 }

function shiftEra(delta: number) {
  const i = Math.max(0, Math.min(ERA_ORDER.length - 1, ERA_ORDER.indexOf(ui.eraId) + delta))
  ui.setEra(ERA_ORDER[i])
  settings.sfx('whoosh')
}

function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  const tag = el?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return
  if (e.metaKey || e.ctrlKey || e.altKey) return

  switch (e.key) {
    case 'Escape':
      if (ui.showSettings) ui.toggleSettings(false)
      else if (ui.showHelp) ui.toggleHelp(false)
      else if (ui.showMediaLib) ui.toggleMediaLib(false)
      else if (ui.selectedId) ui.select(null)
      break
    case ' ':
      e.preventDefault()
      ui.togglePlay()
      settings.sfx(ui.playing ? 'power' : 'cancel')
      break
    case 'ArrowRight': ui.nextPath(); settings.sfx('tick'); break
    case 'ArrowLeft': ui.prevPath(); settings.sfx('tick'); break
    case 'ArrowUp': e.preventDefault(); shiftEra(1); break
    case 'ArrowDown': e.preventDefault(); shiftEra(-1); break
    case 'f': case 'F':
      settings.setFreeExplore(!settings.freeExplore)
      ui.toast(
        settings.freeExplore ? '自由探索：全部节点已解锁' : '逐步解锁：需要先研究前置科技',
        'unlock', settings.freeExplore ? '🔓' : '🔒'
      )
      break
    case 'c': case 'C': ui.toggleChinaOnly(); settings.sfx('tick'); break
    case 'l': case 'L': settings.setShowLabels(!settings.showLabels); settings.sfx('tick'); break
    case 'b': case 'B': settings.setBloom(!settings.bloom); settings.sfx('tick'); break
    case 'm': case 'M': settings.toggleMute(); break
    case 's': case 'S': ui.toggleSettings(); break
    case 'h': case 'H': case '?': ui.toggleHelp(); break
    case 'g': case 'G': if (route.name !== 'globe') router.push('/globe'); break
    case '/': e.preventDefault(); ui.toggleSearch(true); break
    default:
      if (e.key in SPEED_KEYS) {
        settings.setPlaySpeed(SPEED_KEYS[e.key])
        ui.toast(`播放速度 ${SPEED_KEYS[e.key]}×`, 'info', '⏩')
      }
  }
}

function onVisibility() {
  if (document.hidden) settings.pauseMusic()
  else settings.resumeMusic()
}

onMounted(() => {
  window.addEventListener('pointerdown', firstGesture)
  window.addEventListener('keydown', firstGesture)
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', firstGesture)
  window.removeEventListener('keydown', firstGesture)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisibility)
})

/** 时代推进时给一条轻量提示，学生能看见时间走到哪了 */
watch(() => ui.eraId, (era, prev) => {
  if (!prev || era === prev) return
  const e = ERA_MAP[era]
  ui.toast(`${e.name} · ${e.tagline}`, 'info', '⏳', 2600)
}, { flush: 'post' })

/** 打开详情页时顺手标记已浏览 */
watch(() => route.params.id, (id) => {
  if (typeof id === 'string' && id) progress.visit(id)
})
</script>

<template>
  <div class="app">
    <TopNav />
    <main class="app__main">
      <div v-if="sceneErr" class="scene-fail">
        <section class="hud-panel scene-fail__panel">
          <span class="corner corner--tl" /><span class="corner corner--tr" />
          <span class="corner corner--bl" /><span class="corner corner--br" />
          <h3 class="hud-panel__title">这一页遇到了小故障</h3>
          <p class="label-xs scene-fail__msg">{{ sceneErr }}</p>
          <div class="row gap-2">
            <button class="btn btn--primary btn--sm" @click="retryScene">重试本页</button>
            <button class="btn btn--ghost btn--sm" @click="sceneErr = ''; router.push('/')">回到开场</button>
          </div>
        </section>
      </div>
      <router-view v-else v-slot="{ Component }">
        <Transition name="route" mode="out-in">
          <component :is="Component" :key="sceneKey" />
        </Transition>
      </router-view>
    </main>

    <SettingsPanel />
    <HelpOverlay />
    <ToastHost />
  </div>
</template>

<style scoped>
.app { position: relative; width: 100%; height: 100%; }
.app__main { position: absolute; top: 52px; left: 0; right: 0; bottom: 0; }
.scene-fail { display: grid; place-items: center; width: 100%; height: 100%; padding: var(--s-5); }
.scene-fail__panel { display: flex; flex-direction: column; gap: var(--s-3); max-width: 560px; padding: var(--s-5); }
.scene-fail__msg { color: var(--t-lo); word-break: break-all; }
</style>
