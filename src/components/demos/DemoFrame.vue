<script setup lang="ts">
import { computed, inject, provide } from 'vue'
import { DEMO_AUTO, DEMO_TOUCH, useDemoReporter } from './useDemo'

const props = withDefaults(defineProps<{
  demoId: string
  title: string
  hint?: string
  points?: string[]
  icon?: string
  /** 主题色，缺省用电光青 */
  color?: string
  status?: { text: string; kind?: 'info' | 'good' | 'warn' }
  /** 舞台底部的小字注释 */
  note?: string
}>(), { icon: '⚙', color: 'var(--c-cyan)', points: () => [] })

const report = useDemoReporter(props.demoId)
provide(DEMO_TOUCH, report)

/** demo 组件调了 useAutoDemo 才有自动演示按钮 */
const auto = inject(DEMO_AUTO, null)
const autoOn = computed(() => auto?.running.value ?? false)

/** 用户自己动手就把控制权还给他，别让脚本跟人抢滑块 */
function onManual(e: Event) {
  if (!auto?.running.value) return
  if ((e.target as HTMLElement)?.closest?.('.demo-auto')) return
  auto.stop()
  report('cancel', 0.2)
}

function toggleAuto() {
  if (!auto) return
  auto.toggle()
  report(auto.running.value ? 'confirm' : 'cancel', 0.3)
}

const statusKind = computed(() => props.status?.kind ?? 'info')
</script>

<template>
  <section class="demo-frame" :style="{ '--dc': color }" @pointerdown.capture="onManual" @input.capture="onManual">
    <header class="demo-frame__head">
      <span class="demo-frame__icon">{{ icon }}</span>
      <div class="demo-frame__titles">
        <div class="demo-frame__title">
          {{ title }}
          <span class="demo-frame__tag">互动演示</span>
        </div>
        <div v-if="hint" class="demo-frame__hint">{{ hint }}</div>
      </div>
      <div class="demo-frame__aside">
        <button v-if="auto" class="demo-btn demo-auto" :class="{ 'demo-btn--on': autoOn }" @click="toggleAuto">
          <span class="demo-auto__ico" />{{ autoOn ? '停止演示' : '自动演示' }}
        </button>
        <slot name="head-right" />
      </div>
    </header>

    <div class="demo-stage">
      <slot />
      <div v-if="note" class="demo-stage__note">{{ note }}</div>
    </div>

    <div v-if="$slots.ctrl" class="demo-ctrl">
      <slot name="ctrl" />
    </div>

    <div v-if="status" class="demo-status" :class="`demo-status--${statusKind}`">
      <span class="demo-status__dot" />
      <span>{{ status.text }}</span>
    </div>

    <div v-if="points.length" class="demo-points">
      <div class="demo-points__h">原理要点 · Principle</div>
      <ul>
        <li v-for="(p, i) in points" :key="i">{{ p }}</li>
      </ul>
    </div>
  </section>
</template>
