<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Quiz } from '@/types'
import { useSettings } from '@/stores/settings'
import { useProgress } from '@/stores/progress'
import { useUI } from '@/stores/ui'

const props = defineProps<{ quiz: Quiz; nodeId?: string; title?: string }>()
const emit = defineEmits<{ passed: [boolean] }>()

const settings = useSettings()
const progress = useProgress()
const ui = useUI()

const picked = ref<number | null>(null)
const done = ref(false)
const tries = ref(0)

watch(() => props.quiz, () => { picked.value = null; done.value = false; tries.value = 0 })

function choose(i: number) {
  if (done.value) return
  picked.value = i
  tries.value++
  const ok = i === props.quiz.answer
  if (ok) {
    done.value = true
    settings.sfx('correct')
    if (props.nodeId) progress.passQuiz(props.nodeId)
    ui.toast('答对了！', 'success', '🎉')
    emit('passed', true)
  } else {
    settings.sfx('wrong')
  }
}

function retry() {
  picked.value = null
  done.value = false
  settings.sfx('tick')
}
</script>

<template>
  <div class="quiz">
    <div class="quiz__head">
      <span class="quiz__badge">?</span>
      <h4 class="quiz__q">{{ title ?? quiz.q }}</h4>
    </div>

    <div class="quiz__opts">
      <button
        v-for="(o, i) in quiz.options" :key="i"
        class="quiz__opt"
        :class="{
          'is-picked': picked === i,
          'is-right': done && i === quiz.answer,
          'is-wrong': picked === i && !done
        }"
        :disabled="done"
        @click="choose(i)"
        @mouseenter="!done && settings.sfx('hover', 0.35)"
      >
        <span class="quiz__letter">{{ 'ABCD'[i] }}</span>
        <span class="quiz__text">{{ o }}</span>
        <span v-if="done && i === quiz.answer" class="quiz__mark">✓</span>
        <span v-else-if="picked === i && !done" class="quiz__mark quiz__mark--x">✕</span>
      </button>
    </div>

    <Transition name="explain">
      <div v-if="done" class="quiz__explain">
        <span class="label-xs">解析</span>
        <p>{{ quiz.explain }}</p>
      </div>
      <div v-else-if="picked !== null" class="quiz__again">
        <span>再想想 —— </span>
        <button class="quiz__retry" @click="retry">重选一次</button>
        <span class="quiz__tries mono">已尝试 {{ tries }} 次</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.quiz {
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: linear-gradient(155deg, rgba(var(--veil), 0.6), rgba(var(--veil), 0.75));
  padding: var(--s-4);
  display: flex; flex-direction: column; gap: var(--s-3);
}
.quiz__head { display: flex; align-items: flex-start; gap: 10px; }
.quiz__badge {
  flex: none; width: 26px; height: 26px; border-radius: 50%;
  display: grid; place-items: center;
  background: linear-gradient(180deg, rgba(0, 180, 240, 0.4), rgba(0, 90, 150, 0.5));
  border: 1px solid var(--line-hot);
  color: #eafaff; font-weight: 800; font-size: 14px;
  box-shadow: var(--glow-cyan);
}
.quiz__q { font-size: 15px; line-height: 1.5; color: var(--t-hi); }
.quiz__opts { display: grid; gap: 8px; }
.quiz__opt {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 13px; text-align: left;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: rgba(var(--veil), 0.6);
  color: var(--t-mid); font-size: 13.5px;
  transition: all var(--dur-fast) var(--ease-out);
}
.quiz__opt:hover:not(:disabled) {
  border-color: var(--line-hot); color: var(--t-hi);
  background: rgba(0, 212, 255, 0.09);
  transform: translateX(3px);
}
.quiz__letter {
  flex: none; width: 21px; height: 21px; border-radius: 5px;
  display: grid; place-items: center;
  background: rgba(0, 212, 255, 0.12);
  border: 1px solid var(--line);
  font-family: var(--f-mono); font-size: 11px; font-weight: 700; color: var(--c-cyan);
}
.quiz__text { flex: 1 1 auto; }
.quiz__mark { flex: none; font-weight: 800; color: var(--c-emerald); }
.quiz__mark--x { color: var(--c-rose); }
.quiz__opt.is-right {
  border-color: rgba(52, 211, 153, 0.7);
  background: rgba(52, 211, 153, 0.13);
  color: #dcfce7;
  box-shadow: 0 0 16px rgba(52, 211, 153, 0.22);
}
.quiz__opt.is-wrong { border-color: rgba(251, 113, 133, 0.6); background: rgba(251, 113, 133, 0.1); color: #ffe4e6; animation: shake 320ms var(--ease-io); }
.quiz__explain {
  border-left: 2px solid var(--c-emerald);
  padding: 2px 0 2px 12px;
  font-size: 13px; color: var(--t-mid); line-height: 1.7;
}
.quiz__explain .label-xs { display: block; color: var(--c-emerald); margin-bottom: 3px; }
.quiz__again { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--t-lo); }
.quiz__retry { color: var(--c-cyan); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
.quiz__tries { font-size: 11.5px; color: var(--t-faint); margin-left: auto; }
.explain-enter-active { transition: all 320ms var(--ease-out); }
.explain-enter-from { opacity: 0; transform: translateY(-6px); }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>
