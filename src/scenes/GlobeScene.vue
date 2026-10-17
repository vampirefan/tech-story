<script setup lang="ts">
import '@/styles/globe.css'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { GlobeEngine } from '@/three/GlobeEngine'
import type { Country } from '@/three/geo'
import { NODE_MAP, prereqOf, unlocksOf, WAR_EDGES } from '@/data/techTree'
import { ERA_MAP } from '@/data/eras'
import { useUI } from '@/stores/ui'
import { useSettings } from '@/stores/settings'
import { useProgress } from '@/stores/progress'
import { usePlayback } from '@/composables/usePlayback'
import EraPanel from '@/components/hud/EraPanel.vue'
import EventList from '@/components/hud/EventList.vue'
import TimelineScrubber from '@/components/hud/TimelineScrubber.vue'
import ViewControls from '@/components/hud/ViewControls.vue'
import GlobeTooltip from '@/components/hud/GlobeTooltip.vue'
import type { TechNode } from '@/types'

const ui = useUI()
const settings = useSettings()
const progress = useProgress()
const router = useRouter()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const labelEl = ref<HTMLElement | null>(null)
const engine = shallowRef<GlobeEngine | null>(null)
/** 本次挂载的地球是否就绪：重入时重建引擎的几百毫秒也要有遮罩，不能露黑画布 */
const sceneReady = ref(false)

/* ── 悬停提示 ── */
const tipNode = ref<TechNode | null>(null)
const tipCountry = ref<Country | null>(null)
const tipX = ref(0)
const tipY = ref(0)
const tipActivity = ref(0)
const hintOn = ref(true)
let hintTimer = 0

const tipLock = computed(() => (tipNode.value ? progress.lockReason(tipNode.value.id) : ''))

const modalOpen = computed(() => ui.showSettings || ui.showHelp || ui.showMediaLib)
watch(modalOpen, v => engine.value?.setPaused(v))

/* ── 应该画在地球上的节点：时间游标 + 过滤器 ── */
const visibleNodes = computed<TechNode[]>(() => {
  const keep = new Set(ui.filteredNodes.map(n => n.id))
  return ui.nodesUpTo.filter(n => keep.has(n.id))
})
const visibleSig = computed(() => visibleNodes.value.map(n => n.id).join('|'))

/** 与选中节点有战争因果关系的节点 */
function warOf(id: string): TechNode[] {
  const out: TechNode[] = []
  for (const e of WAR_EDGES) {
    const other = e.from === id ? e.to : e.to === id ? e.from : null
    if (other && other !== id && NODE_MAP[other]) out.push(NODE_MAP[other])
  }
  return out
}

function pushNodes() {
  engine.value?.setNodes(visibleNodes.value, { isAvailable: (id: string) => progress.isAvailable(id) })
}

function applyArcs() {
  const n = ui.selected
  if (!n) engine.value?.showArcsFor(null, [], [], [])
  else engine.value?.showArcsFor(n, prereqOf(n.id), unlocksOf(n.id), warOf(n.id))
}

/* ── 距离节流：拉近时切到高精度边界 ── */
let lastDist = 0
function onDistance(d: number) {
  if (Math.abs(d - lastDist) < 0.08) return
  lastDist = d
  if (settings.borderDensity === 'full') return
  engine.value?.setDetail(d < 1.75 ? '50m' : '110m')
}

function onClickNode(id: string | null) {
  hintOn.value = false
  if (!id) { ui.select(null); return }

  if (ui.selectedId === id) {
    // 已经选中的再点一次 = 进详情页
    if (!progress.isAvailable(id)) {
      settings.sfx('wrong')
      ui.toast(progress.lockReason(id), 'warn', '🔒')
      return
    }
    settings.sfx('confirm')
    void router.push(`/node/${id}`)
    return
  }

  ui.select(id)
  if (!progress.isAvailable(id)) {
    settings.sfx('wrong')
    ui.toast(progress.lockReason(id), 'warn', '🔒')
    return
  }
  progress.research(id)
  settings.sfx('unlock')
  const unlocked = progress.wouldUnlock(id)
  if (unlocked.length) {
    ui.toast(`研究完成 · 新解锁 ${unlocked.length} 项技术`, 'unlock', '✦')
    settings.sfx('spark', 0.7)
  }
}

function resetView() {
  engine.value?.flyTo(22, 105, 3.4, 1.5)
  ui.select(null)
}

/* ── 状态 → 引擎 ── */
watch(visibleSig, pushNodes)
watch(() => [progress.researched.length, settings.freeExplore], pushNodes)
watch(() => ui.year, (y) => engine.value?.setYear(y))
watch(() => ui.eraId, (e) => engine.value?.setEra(e))
watch(() => ui.hoveredId, (id) => engine.value?.setHovered(id))
watch(() => ui.selectedId, (id) => {
  engine.value?.setSelected(id)
  applyArcs()
  const n = id ? NODE_MAP[id] : null
  if (n && ui.camMode === 'follow') engine.value?.flyTo(n.geo.lat, n.geo.lng, 2.25)
})
watch(() => ui.focus, (f) => {
  if (!f) return
  engine.value?.flyTo(f.lat, f.lng, f.dist)
  ui.clearFocus()
})
watch(() => ui.camMode, (m) => { if (m === 'free') ui.clearFocus() })
watch(() => settings.$state, (s) => engine.value?.setSettings({ ...s }), { deep: true })

usePlayback()

onMounted(async () => {
  if (!canvasEl.value) return
  const eng = new GlobeEngine(canvasEl.value, { ...settings.$state }, {
    onProgress: (p, label) => ui.setLoadProgress(p, label),
    onHoverNode: (id, x, y) => {
      tipNode.value = id ? NODE_MAP[id] ?? null : null
      if (!id) tipCountry.value = null
      tipX.value = x; tipY.value = y
    },
    onHoverCountry: (c, x, y) => {
      tipCountry.value = c
      if (!c) tipNode.value = null
      tipX.value = x; tipY.value = y
      tipActivity.value = c ? eng.activityOf(c) : 0
    },
    onDistance,
    onClickNode,
    onReady: () => {
      sceneReady.value = true
      hintTimer = window.setTimeout(() => { hintOn.value = false }, 11000)
    }
  })
  engine.value = eng
  eng.setLabelLayer(labelEl.value)
  eng.setPaused(modalOpen.value)
  if (import.meta.env.DEV) (window as unknown as { __globe?: GlobeEngine }).__globe = eng
  await eng.init()
  eng.ensureLoop()

  eng.setYear(ui.year)
  eng.setEra(ui.eraId)
  pushNodes()
  if (ui.selectedId) { eng.setSelected(ui.selectedId); applyArcs() }
})

onBeforeUnmount(() => {
  if (hintTimer) clearTimeout(hintTimer)
  engine.value?.setLabelLayer(null)
  engine.value?.dispose()
  engine.value = null
})
</script>

<template>
  <div class="globe-scene">
    <canvas ref="canvasEl" class="globe-canvas" />
    <div class="globe-vignette" />
    <div class="globe-scan" />
    <div ref="labelEl" class="globe-labels" />

    <div class="globe-hud">
      <div class="hud-left">
        <EraPanel />
      </div>
      <div class="hud-right">
        <EventList />
      </div>
      <div class="hud-bottom">
        <ViewControls @reset="resetView" />
        <TimelineScrubber />
      </div>
    </div>

    <GlobeTooltip
      :node="tipNode"
      :country="tipCountry"
      :activity="tipActivity"
      :lock-reason="tipLock"
      :x="tipX"
      :y="tipY"
    />

    <Transition name="gfade">
      <div v-if="hintOn && sceneReady" class="globe-hint">
        <span>🖱️ 拖动旋转地球 · 滚轮缩放 · <b>点击光柱</b>研究这项技术 · 再点一次进入详情</span>
      </div>
    </Transition>

    <div class="globe-loading" :class="{ 'is-done': sceneReady }">
      <div class="globe-loading__inner">
        <div class="globe-loading__ring" />
        <div class="globe-loading__t">TERRA · {{ ERA_MAP[ui.eraId].short }}</div>
        <div class="globe-loading__s">{{ ui.loadingText }}</div>
        <div class="globe-loading__bar">
          <div class="globe-loading__fill" :style="{ width: Math.round(ui.loadProgress * 100) + '%' }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gfade-enter-active, .gfade-leave-active { transition: opacity 480ms var(--ease-out); }
.gfade-enter-from, .gfade-leave-to { opacity: 0; }
</style>
