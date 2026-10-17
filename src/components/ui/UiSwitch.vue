<script setup lang="ts">
import { useSettings } from '@/stores/settings'

const props = defineProps<{ modelValue: boolean; label?: string; hint?: string; amber?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; change: [boolean] }>()
const settings = useSettings()

function toggle() {
  const v = !props.modelValue
  settings.sfx(v ? 'confirm' : 'cancel')
  emit('update:modelValue', v)
  emit('change', v)
}
</script>

<template>
  <label class="switch" :class="{ 'is-on': modelValue }" @click.prevent="toggle">
    <span class="switch__track" :class="{ 'switch__track--amber': amber }">
      <span class="switch__thumb" />
    </span>
    <span v-if="label" class="col">
      <span class="switch__label">{{ label }}</span>
      <span v-if="hint" class="switch__hint">{{ hint }}</span>
    </span>
  </label>
</template>

<style scoped>
.switch__track--amber { --c-cyan: var(--c-amber); --c-cyan-glow: var(--c-amber-glow); }
.switch__hint { font-size: 11.5px; color: var(--t-faint); line-height: 1.4; }
</style>
