<script setup lang="ts">
import { computed } from 'vue'
import { useSettings } from '@/stores/settings'
import type { SfxName } from '@/audio/engine'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'primary' | 'amber' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  active?: boolean
  disabled?: boolean
  sfx?: SfxName
  title?: string
}>(), { variant: 'default', size: 'md', sfx: 'click' })

const emit = defineEmits<{ click: [MouseEvent] }>()
const settings = useSettings()

const cls = computed(() => {
  const c: string[] = ['btn']
  if (props.variant !== 'default') c.push(`btn--${props.variant}`)
  c.push(`btn--${props.size}`)
  if (props.active) c.push('is-active')
  return c.join(' ')
})

function onClick(e: MouseEvent) {
  if (props.disabled) return
  settings.sfx(props.sfx)
  emit('click', e)
}
</script>

<template>
  <button
    :class="cls"
    :disabled="disabled"
    :title="title"
    @click="onClick"
    @mouseenter="settings.sfx('hover', 0.4)"
  >
    <slot />
  </button>
</template>
