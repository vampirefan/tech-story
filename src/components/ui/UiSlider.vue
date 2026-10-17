<script setup lang="ts">
import { computed } from 'vue'
import { useSettings } from '@/stores/settings'

const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
  amber?: boolean
  format?: (v: number) => string
}>(), { min: 0, max: 1, step: 0.01 })

const emit = defineEmits<{ 'update:modelValue': [number] }>()
const settings = useSettings()

const fill = computed(() => {
  const span = props.max - props.min || 1
  return `${Math.round(((props.modelValue - props.min) / span) * 100)}%`
})
const shown = computed(() => props.format ? props.format(props.modelValue) : Math.round(props.modelValue * 100) + '%')

function onInput(e: Event) {
  emit('update:modelValue', Number((e.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="slider" :class="{ 'slider--amber': amber }">
    <span v-if="label" class="slider__label">{{ label }}</span>
    <input
      type="range"
      :min="min" :max="max" :step="step"
      :value="modelValue"
      :style="{ '--fill': fill }"
      @input="onInput"
      @pointerup="settings.sfx('tick', 0.5)"
    />
    <span class="slider__val">{{ shown }}</span>
  </div>
</template>

<style scoped>
.slider__label { font-size: 12px; color: var(--t-mid); min-width: 62px; flex: none; }
</style>
