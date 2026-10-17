<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useSettings } from '@/stores/settings'

withDefaults(defineProps<{
  open: boolean
  title?: string
  width?: string
  dismissable?: boolean
}>(), { width: 'min(92vw, 780px)', dismissable: true })

const emit = defineEmits<{ close: []; 'update:open': [value: boolean] }>()
const settings = useSettings()

/** 关闭请求：v-model:open 与 @close 两种用法都要生效 */
function requestClose() {
  emit('update:open', false)
  emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { requestClose(); settings.sfx('cancel') }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="overlay" @click.self="dismissable && requestClose()">
        <div class="hud-panel hud-panel--hi modal" :style="{ maxWidth: width }">
          <span class="corner corner--tl" /><span class="corner corner--tr" />
          <span class="corner corner--bl" /><span class="corner corner--br" />
          <header v-if="title || $slots.head" class="hud-panel__head">
            <slot name="head">
              <h3 class="hud-panel__title grow">{{ title }}</h3>
            </slot>
            <button v-if="dismissable" class="btn btn--ghost btn--icon btn--sm" title="关闭 (Esc)" @click="requestClose(); settings.sfx('cancel')">✕</button>
          </header>
          <div class="modal__body">
            <slot />
          </div>
          <footer v-if="$slots.foot" class="modal__foot">
            <slot name="foot" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal { display: flex; flex-direction: column; width: 100%; }
.modal__body { padding: var(--s-4) var(--s-5); overflow-y: auto; min-height: 0; }
.modal__foot {
  display: flex; gap: var(--s-2); justify-content: flex-end;
  padding: var(--s-3) var(--s-5); border-top: 1px solid var(--line);
}
.modal-enter-active, .modal-leave-active { transition: opacity 200ms ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
