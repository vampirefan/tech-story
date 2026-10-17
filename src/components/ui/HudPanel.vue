<script setup lang="ts">
import { useSettings } from '@/stores/settings'

defineProps<{
  title?: string
  subtitle?: string
  hi?: boolean
  corners?: boolean
  scroll?: boolean
}>()

const settings = useSettings()
/** 所有按钮都带音效，统一在这里注入 */
function click(name: Parameters<typeof settings.sfx>[0] = 'click') { settings.sfx(name) }
defineExpose({ click })
</script>

<template>
  <section class="hud-panel" :class="{ 'hud-panel--hi': hi }">
    <span v-if="corners !== false" class="corner corner--tl" />
    <span v-if="corners !== false" class="corner corner--tr" />
    <span v-if="corners !== false" class="corner corner--bl" />
    <span v-if="corners !== false" class="corner corner--br" />

    <header v-if="title || $slots.head" class="hud-panel__head">
      <slot name="head">
        <div class="col grow">
          <h3 class="hud-panel__title">{{ title }}</h3>
          <p v-if="subtitle" class="hud-panel__sub">{{ subtitle }}</p>
        </div>
      </slot>
      <slot name="actions" />
    </header>

    <div class="hud-panel__body" :class="{ 'hud-panel__body--scroll': scroll }">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.hud-panel { display: flex; flex-direction: column; min-height: 0; }
.hud-panel__sub { font-size: 11.5px; color: var(--t-lo); letter-spacing: 0.04em; }
.hud-panel__body { position: relative; z-index: 1; min-height: 0; }
.hud-panel__body--scroll { overflow-y: auto; overflow-x: hidden; flex: 1 1 auto; }
</style>
