<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { TechNode } from '@/types'
import { ERA_MAP } from '@/data/eras'
import { useProgress } from '@/stores/progress'
import { useUI } from '@/stores/ui'
import { useSettings } from '@/stores/settings'

const props = withDefaults(defineProps<{
  node: TechNode
  size?: 'sm' | 'md'
  showYear?: boolean
  clickable?: boolean
  dim?: boolean
}>(), { size: 'md', showYear: true, clickable: true })

const emit = defineEmits<{ select: [string] }>()
const router = useRouter()
const progress = useProgress()
const ui = useUI()
const settings = useSettings()

const cat = computed(() => `var(--cat-${props.node.category})`)
const locked = computed(() => !progress.isAvailable(props.node.id))
const researched = computed(() => progress.researchedSet.has(props.node.id))

function go(e: MouseEvent) {
  if (!props.clickable) return
  if (e.shiftKey || e.ctrlKey || e.metaKey) {
    ui.select(props.node.id)
  } else {
    settings.sfx('page')
    router.push({ name: 'node', params: { id: props.node.id } })
  }
  emit('select', props.node.id)
}
</script>

<template>
  <button
    class="chip"
    :class="[`cat-${node.category}`, { 'chip--sm': size === 'sm', 'is-locked': locked, 'is-done': researched, 'is-dim': dim }]"
    :style="{ '--cat': cat }"
    :title="locked ? progress.lockReason(node.id) : node.summary"
    @click="go"
    @mouseenter="settings.sfx('hover', 0.35)"
  >
    <span class="chip__dot" />
    <span class="chip__name">{{ node.name }}</span>
    <span v-if="node.flag" class="chip__flag">{{ node.flag }}</span>
    <span v-if="showYear" class="chip__year">{{ ERA_MAP[node.era].short }} · {{ node.yearLabel }}</span>
    <span v-if="locked" class="chip__lock">🔒</span>
    <span v-else-if="researched" class="chip__check">✓</span>
  </button>
</template>

<style scoped>
.chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 11px; border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--cat) 38%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--cat) 13%, transparent), rgba(6, 12, 30, 0.72));
  color: var(--t-hi);
  font-size: 12.5px; font-weight: 600;
  transition: all var(--dur-fast) var(--ease-out);
  text-align: left;
  max-width: 100%;
}
.chip:hover {
  border-color: color-mix(in srgb, var(--cat) 85%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--cat) 30%, transparent), 0 0 16px color-mix(in srgb, var(--cat) 30%, transparent);
  transform: translateY(-1px);
}
.chip--sm { padding: 3.5px 9px; font-size: 11.5px; gap: 5px; }
.chip__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cat); box-shadow: 0 0 7px var(--cat); flex: none; }
.chip__name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chip__flag { font-size: 12px; line-height: 1; }
.chip__year { font-family: var(--f-mono); font-size: 10px; color: var(--t-lo); white-space: nowrap; }
.chip__lock { font-size: 10px; opacity: 0.75; }
.chip__check { font-size: 11px; color: var(--c-emerald); font-weight: 800; }
.chip.is-locked { opacity: 0.42; filter: saturate(0.35); }
.chip.is-locked:hover { transform: none; box-shadow: none; }
.chip.is-done .chip__dot { background: var(--c-emerald); box-shadow: 0 0 8px var(--c-emerald); }
.chip.is-dim { opacity: 0.35; }
</style>
