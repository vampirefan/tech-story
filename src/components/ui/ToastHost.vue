<script setup lang="ts">
import { useUI } from '@/stores/ui'

const ui = useUI()
const ICONS: Record<string, string> = {
  info: 'ℹ️', success: '✅', warn: '⚠️', unlock: '🔓'
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-wrap">
      <TransitionGroup name="toast">
        <div
          v-for="t in ui.toasts" :key="t.id"
          class="toast" :class="{ 'toast--amber': t.kind === 'unlock' || t.kind === 'warn' }"
          @click="ui.dismissToast(t.id)"
        >
          <span class="toast__icon">{{ t.icon ?? ICONS[t.kind] ?? 'ℹ️' }}</span>
          <span>{{ t.text }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast__icon { font-size: 15px; }
.toast { cursor: pointer; }
.toast-enter-active { transition: all 300ms var(--ease-spring); }
.toast-leave-active { transition: all 220ms var(--ease-io); }
.toast-enter-from { opacity: 0; transform: translateY(-16px) scale(0.94); }
.toast-leave-to { opacity: 0; transform: translateY(-10px) scale(0.96); }
.toast-move { transition: transform 260ms var(--ease-out); }
</style>
