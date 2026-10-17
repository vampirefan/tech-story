<script setup lang="ts">
import { computed, provide } from 'vue'
import { DEMO_TOUCH, useDemoReporter } from './useDemo'

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

provide(DEMO_TOUCH, useDemoReporter(props.demoId))

const statusKind = computed(() => props.status?.kind ?? 'info')
</script>

<template>
  <section class="demo-frame" :style="{ '--dc': color }">
    <header class="demo-frame__head">
      <span class="demo-frame__icon">{{ icon }}</span>
      <div class="demo-frame__titles">
        <div class="demo-frame__title">
          {{ title }}
          <span class="demo-frame__tag">互动演示</span>
        </div>
        <div v-if="hint" class="demo-frame__hint">{{ hint }}</div>
      </div>
      <slot name="head-right" />
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
