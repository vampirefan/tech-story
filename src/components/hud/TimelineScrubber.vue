<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ERAS, yearToT, yearLabel } from '@/data/eras'
import { NODES } from '@/data/techTree'
import { catColor } from '@/data/categories'
import { GUIDED_PATH, useUI } from '@/stores/ui'
import { useSettings } from '@/stores/settings'
import UiButton from '@/components/ui/UiButton.vue'
import type { EraId } from '@/types'

const ui = useUI()
const settings = useSettings()

const trackEl = ref<HTMLElement | null>(null)
const dragging = ref(false)
let lastTick = 0

/** 每个时代在归一化时间轴上的宽度占比（时间轴是非线性的，不能用年份直接算） */
const eraSegs = computed(() => {
  const span = yearToT(ERAS[ERAS.length - 1].to) - yearToT(ERAS[0].from) || 1
  return ERAS.map(e => ({
    id: e.id,
    short: e.short,
    accent: e.accent,
    grow: (yearToT(e.to) - yearToT(e.from)) / span,
    now: e.id === ui.eraId
  }))
})

/** 全部节点在时间轴上的位置（小圆点，颜色 = 分类） */
const nodeDots = computed(() =>
  NODES.map(n => ({
    id: n.id,
    left: yearToT(n.year) * 100,
    cat: catColor(n.category),
    hit: n.year <= ui.year && ui.year - n.year < (n.year < 0 ? 4000 : 12)
  }))
)

const boundaries = computed(() =>
  ERAS.slice(1).map((e, i) => ({ key: e.id, left: yearToT(e.from) * 100, major: i % 3 === 0 }))
)

const headPct = computed(() => ui.t * 100)
const speeds = [0.5, 1, 2, 4, 8]

function tFromEvent(e: PointerEvent): number {
  const el = trackEl.value
  if (!el) return ui.t
  const r = el.getBoundingClientRect()
  if (r.width <= 0) return ui.t
  return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
}

function onDown(e: PointerEvent) {
  if (ui.playing) ui.pause()
  dragging.value = true
  trackEl.value?.setPointerCapture(e.pointerId)
  ui.setT(tFromEvent(e))
  settings.sfx('tick')
  lastTick = performance.now()
}

function onMove(e: PointerEvent) {
  if (!dragging.value) return
  ui.setT(tFromEvent(e))
  const now = performance.now()
  if (now - lastTick > 60) { lastTick = now; settings.sfx('tick', 0.32) }
}

function onUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  trackEl.value?.releasePointerCapture?.(e.pointerId)
  settings.sfx('click')
}

function jumpEra(id: EraId) {
  if (ui.playing) ui.pause()
  ui.setEra(id)
  settings.sfx('whoosh')
}

function togglePlay() {
  if (!ui.playing && ui.pathIndex >= GUIDED_PATH.length - 1) ui.gotoPath(0)
  ui.togglePlay()
  settings.sfx(ui.playing ? 'confirm' : 'cancel')
}

function jumpToday() {
  if (ui.playing) ui.pause()
  ui.setYear(2026)
  settings.sfx('whoosh')
}

function setSpeed(v: number) { ui.setSpeed(v); settings.sfx('tick') }

onBeforeUnmount(() => { dragging.value = false })
</script>

<template>
  <section class="hud-panel scrubber">
    <span class="corner corner--tl" />
    <span class="corner corner--tr" />
    <span class="corner corner--bl" />
    <span class="corner corner--br" />

    <div class="scrubber__row">
      <button class="play-btn" :title="ui.playing ? '暂停引导播放' : '按推荐路径自动播放'" @click="togglePlay">
        <svg v-if="ui.playing" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        <svg v-else viewBox="0 0 24 24"><path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.2-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2Z" /></svg>
      </button>

      <div class="scrubber__year">{{ yearLabel(ui.year) }}</div>

      <div
        ref="trackEl"
        class="scrubber__track"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <div class="scrubber__eras">
          <div
            v-for="s in eraSegs"
            :key="s.id"
            class="scrubber__era"
            :class="{ 'is-now': s.now }"
            :style="{ '--ec': s.accent, flex: `${s.grow} 1 0` }"
            :title="`${s.short} · 点击跳到这个时代`"
            @click.stop="jumpEra(s.id)"
          >
            <span v-if="s.grow > 0.045">{{ s.short }}</span>
          </div>
        </div>

        <div class="scrubber__ticks">
          <i
            v-for="b in boundaries"
            :key="b.key"
            class="scrubber__tick"
            :class="{ 'is-major': b.major }"
            :style="{ left: b.left + '%' }"
          />
        </div>

        <div class="scrubber__line" />
        <div class="scrubber__fill" :style="{ width: headPct + '%' }" />
        <div class="scrubber__head" :style="{ left: headPct + '%' }" />

        <div class="scrubber__nodes">
          <i
            v-for="d in nodeDots"
            :key="d.id"
            class="scrubber__node"
            :class="{ 'is-hit': d.hit }"
            :style="{ left: d.left + '%', '--cat': d.cat }"
          />
        </div>
      </div>

      <div class="scrubber__ctl">
        <UiButton size="sm" title="上一个关键突破" :disabled="ui.pathIndex <= 0" @click="ui.prevPath()">‹</UiButton>
        <UiButton size="sm" title="下一个关键突破" :disabled="ui.pathIndex >= GUIDED_PATH.length - 1" @click="ui.nextPath()">›</UiButton>
        <UiButton size="sm" title="直接跳到 2026 年" sfx="whoosh" @click="jumpToday">今天</UiButton>
        <div class="speed-seg" title="播放速度">
          <button
            v-for="sp in speeds"
            :key="sp"
            :class="{ 'is-on': ui.speed === sp }"
            @click="setSpeed(sp)"
          >{{ sp }}×</button>
        </div>
      </div>
    </div>
  </section>
</template>
