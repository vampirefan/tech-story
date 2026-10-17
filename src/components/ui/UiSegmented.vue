<script setup lang="ts">
import { useSettings } from '@/stores/settings'

const props = defineProps<{
  modelValue: string | number
  options: { value: string | number; label: string; title?: string }[]
}>()
const emit = defineEmits<{ 'update:modelValue': [string | number] }>()
const settings = useSettings()

function pick(v: string | number) {
  if (v === props.modelValue) return
  settings.sfx('tick')
  emit('update:modelValue', v)
}
</script>

<template>
  <div class="segmented">
    <button
      v-for="o in options" :key="o.value"
      class="segmented__opt"
      :class="{ 'is-active': o.value === modelValue }"
      :title="o.title ?? o.label"
      @click="pick(o.value)"
    >{{ o.label }}</button>
  </div>
</template>
