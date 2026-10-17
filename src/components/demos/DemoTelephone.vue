<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, clamp, useAutoDemo, seg, lerp, smooth } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const amp = ref(0.6)
const freq = ref(2.4)        // 波形上的周期数
const speaking = ref(true)
const digital = ref(false)
const sampleRate = ref(12)   // 每周期采样点数
const phase = ref(0)
const noise = ref(0)

/** 真实语音由多个谐波叠加，这里用 3 次谐波近似"人声"的毛糙感 */
const voice = (t: number) => {
  const a = speaking.value ? amp.value : 0
  return a * (Math.sin(t * Math.PI * 2 * freq.value) * 0.72
    + Math.sin(t * Math.PI * 2 * freq.value * 2.02 + 0.7) * 0.2
    + Math.sin(t * Math.PI * 2 * freq.value * 3.13 + 1.9) * 0.08)
}

useRaf((dt) => {
  phase.value += dt * 0.42
  // 线路噪声：模拟信号随距离衰减并混入杂音，数字信号只受采样精度影响
  noise.value = digital.value ? clamp(1 / sampleRate.value * 3.2, 0, 0.5) : 0.06 + (1 - amp.value) * 0.12
})

/* 自动演示：说话 → 换音调 → 数字采样由稀到密 → 回到模拟看噪声 */
useAutoDemo((t) => {
  const s = seg(t, 6, 6, 10, 6)
  speaking.value = true
  if (s.i === 0) { digital.value = false; sampleRate.value = 12; amp.value = lerp(0.25, 0.9, smooth(s.p)); freq.value = 2.4 }
  else if (s.i === 1) { amp.value = 0.7; freq.value = lerp(1.2, 4.2, smooth(s.p)) }
  else if (s.i === 2) { digital.value = true; freq.value = 2.4; sampleRate.value = Math.round(lerp(3, 32, smooth(s.p))) }
  else { digital.value = false; sampleRate.value = 12; amp.value = lerp(0.7, 0.2, smooth(s.p)); speaking.value = s.p < 0.72 }
}, 28)

const traceLen = 372
const path = (fn: (t: number) => number, y: number, a: number) => {
  let d = ''
  for (let i = 0; i <= 120; i++) {
    const t = i / 120
    const x = 44 + t * traceLen
    const yy = y - fn(t + phase.value) * a
    d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + yy.toFixed(1)
  }
  return d
}

const sndPath = computed(() => path(voice, 0, 26))
const curPath = computed(() => path((t) => voice(t) * 0.86, 0, 26))
const outPath = computed(() => {
  if (!digital.value) return path((t) => voice(t) * 0.9 + Math.sin(t * 90) * noise.value * 0.5, 0, 26)
  // PCM：先采样，再阶梯还原
  const spc = 1 / (sampleRate.value * freq.value)
  return path((t) => {
    const q = Math.floor(t / spc) * spc
    return voice(q + phase.value) * 0.9
  }, 0, 26)
})
const samples = computed(() => {
  const spc = 1 / (sampleRate.value * freq.value)
  const out: { x: number; y: number }[] = []
  for (let t = 0; t < 1; t += spc) out.push({ x: 44 + t * traceLen, y: voice(t + phase.value) * 26 })
  return out
})

const diaphragm = computed(() => voice(phase.value % 1) * 6)
const fidelity = computed(() => digital.value
  ? clamp(1 - 1.6 / sampleRate.value, 0.2, 0.99)
  : clamp(0.9 - noise.value * 1.4, 0.3, 0.94))

const status = computed(() => {
  if (!speaking.value) return { text: '没人说话 —— 振膜不动，线圈不切割磁力线，线路上就没有变化的电流。点"说话"试试。' }
  if (digital.value && sampleRate.value < 8) return { text: `采样率太低（每周期 ${sampleRate.value} 点），高频细节全丢了，还原出来是"阶梯波"。这就是奈奎斯特定理：采样率必须高于信号最高频率的 2 倍。`, kind: 'warn' as const }
  if (digital.value) return { text: `数字（PCM）：每周期采 ${sampleRate.value} 个点，量化成数字传输。抗干扰强、可压缩、可纠错 —— 今天的手机通话都是这样。`, kind: 'good' as const }
  return { text: `模拟：电流的强弱连续地"复刻"声波形状。简单直接，但线路上的每一次干扰都会永久混进声音里（保真度 ${(fidelity.value * 100).toFixed(0)}%）。` }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="☎" color="var(--cat-communication)" :status="status" note="1876 年 3 月 10 日：「华生先生，快过来，我需要你！」">
    <svg viewBox="0 0 460 246">
      <defs>
        <linearGradient id="phMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8a94a5" /><stop offset="0.5" stop-color="#4a5568" /><stop offset="1" stop-color="#232a36" />
        </linearGradient>
      </defs>
      <rect width="460" height="246" class="stage-bg" />

      <!-- ══ 发送端 ══ -->
      <g transform="translate(40,58)">
        <!-- 嘴 -->
        <path d="M-6,-14 q14,14 0,28" stroke="#c98f5f" stroke-width="3" fill="none" />
        <ellipse cx="-4" cy="0" rx="7" ry="10" fill="#8b5e34" opacity="0.6" />
        <!-- 声波 -->
        <g v-if="speaking">
          <path v-for="i in 4" :key="i"
            :d="`M${8 + i * 9},${-12 - i * 2} q${8 + amp * 8},${12 + i * 2} 0,${24 + i * 4}`"
            fill="none" :stroke="i % 2 ? '#5cc8ff' : '#8fd0ff'" stroke-width="1.6"
            :opacity="clamp(amp * 1.3 - i * 0.19 - ((phase * 2.4 + i * 0.25) % 1) * 0.4, 0, 0.9)" />
        </g>
        <text x="4" y="-30" text-anchor="middle" class="lbl" font-size="9">声波（空气疏密振动）</text>
      </g>

      <!-- 话筒 -->
      <g transform="translate(112,58)">
        <rect x="-6" y="-30" width="52" height="60" rx="6" fill="url(#phMetal)" stroke="#171b23" stroke-width="1.4" />
        <!-- 振膜 -->
        <path :d="`M-4,-24 q${diaphragm},24 -0,48`" fill="none" stroke="#ffd166" stroke-width="2.6" />
        <path :d="`M-4,-24 q${diaphragm * 0.5},24 -0,48`" fill="rgba(255,209,102,0.12)" stroke="none" />
        <!-- 线圈 + 磁铁 -->
        <rect x="12" y="-16" width="20" height="32" rx="2" fill="#2b3a4d" stroke="#5c4415" />
        <g v-for="i in 5" :key="i">
          <line x1="14" :y1="-13 + i * 5.4" x2="30" :y2="-13 + i * 5.4" stroke="#d8a44a" stroke-width="1.6" />
        </g>
        <rect x="36" y="-20" width="8" height="40" rx="1.5" fill="#ff5f56" opacity="0.75" />
        <text x="52" y="-4" class="lbl" font-size="8">N</text>
        <line x1="4" y1="0" x2="12" y2="0" stroke="#a9822f" stroke-width="2.4" />
        <text x="22" y="-38" text-anchor="middle" class="lbl" font-size="9">话筒：振膜 + 线圈</text>
        <text x="22" y="44" text-anchor="middle" class="lbl" font-size="8.5">振动 → 变化的电流</text>
      </g>

      <!-- 线路 -->
      <g>
        <path d="M166,58 H294" stroke="#39414f" stroke-width="5" fill="none" />
        <path d="M166,58 H294" stroke="#5cc8ff" :stroke-width="1.6 + Math.abs(voice(phase % 1)) * 3.4"
          fill="none" :opacity="speaking ? 0.55 + Math.abs(voice(phase % 1)) * 0.45 : 0.15" />
        <g v-if="!digital" opacity="0.7">
          <path v-for="i in 5" :key="i" :d="`M${180 + i * 22},${52 + Math.sin(phase * 8 + i) * 3} l6,${4 + Math.sin(phase * 6 + i) * 3} l-4,5`"
            stroke="#fb7185" stroke-width="1.1" fill="none" opacity="0.65" />
        </g>
        <g v-else opacity="0.85">
          <rect v-for="i in 8" :key="i" :x="172 + i * 14" :y="52" width="9" height="12" rx="1.5"
            fill="#0a1220" stroke="#34d399" stroke-width="0.9" />
          <text v-for="i in 8" :key="'b' + i" :x="176.5 + i * 14" y="61" text-anchor="middle" font-size="7"
            font-family="var(--f-mono)" fill="#34d399">{{ (i * 7 + Math.floor(phase * 3)) % 2 }}</text>
        </g>
        <text x="230" y="44" text-anchor="middle" class="lbl" font-size="9">{{ digital ? '数字信号 01001…' : '模拟信号（连续变化的电流）' }}</text>
        <text x="230" y="80" text-anchor="middle" class="lbl" font-size="8.5" :fill="digital ? '#34d399' : '#fb7185'">
          {{ digital ? '抗干扰 · 可压缩 · 可纠错' : '沿途噪声会永久混入' }}
        </text>
      </g>

      <!-- 听筒 -->
      <g transform="translate(296,58)">
        <rect x="-6" y="-30" width="52" height="60" rx="6" fill="url(#phMetal)" stroke="#171b23" stroke-width="1.4" />
        <rect x="0" y="-16" width="20" height="32" rx="2" fill="#2b3a4d" stroke="#5c4415" />
        <g v-for="i in 5" :key="i">
          <line x1="2" :y1="-13 + i * 5.4" x2="18" :y2="-13 + i * 5.4" stroke="#d8a44a" stroke-width="1.6" />
        </g>
        <rect x="-14" y="-20" width="8" height="40" rx="1.5" fill="#5cc8ff" opacity="0.7" />
        <path :d="`M44,-24 q${diaphragm * 0.9},24 0,48`" fill="none" stroke="#ffd166" stroke-width="2.6" />
        <text x="22" y="-38" text-anchor="middle" class="lbl" font-size="9">听筒：电流 → 振动</text>
        <text x="22" y="44" text-anchor="middle" class="lbl" font-size="8.5">电磁铁推拉振膜发声</text>
      </g>

      <!-- 接收端耳朵 -->
      <g transform="translate(386,58)">
        <path d="M10,-16 q14,4 12,18 q-2,12 -12,14" stroke="#c98f5f" stroke-width="3" fill="none" />
        <path d="M12,-8 q7,3 6,10 q-1,6 -6,7" stroke="#8b5e34" stroke-width="2" fill="none" />
        <g v-if="speaking">
          <path v-for="i in 3" :key="i" :d="`M${-2 - i * 7},${-8 - i} q-6,${8 + i} 0,${16 + i * 2}`"
            fill="none" stroke="#8fd0ff" stroke-width="1.4"
            :opacity="clamp(amp - i * 0.2 - ((phase * 2.4 + i * 0.3) % 1) * 0.35, 0, 0.85)" />
        </g>
        <text x="6" y="-30" text-anchor="middle" class="lbl" font-size="9">还原成声音</text>
      </g>

      <!-- ══ 示波器 ══ -->
      <g transform="translate(0,116)">
        <rect x="36" y="0" width="388" height="118" rx="6" fill="rgba(4,10,24,0.85)" stroke="rgba(var(--tint),0.16)" />
        <g v-for="i in 3" :key="i">
          <line x1="44" :y1="i * 39" x2="416" :y2="i * 39" stroke="rgba(var(--tint),0.07)" />
        </g>
        <g transform="translate(0,22)">
          <path :d="sndPath" fill="none" stroke="#5cc8ff" stroke-width="1.6" opacity="0.95" />
          <text x="44" y="-9" class="lbl" font-size="8.5" fill="#5cc8ff">① 声波（空气压强）</text>
        </g>
        <g transform="translate(0,60)">
          <path :d="curPath" fill="none" stroke="#ffb347" stroke-width="1.6" opacity="0.95" />
          <text x="44" y="-9" class="lbl" font-size="8.5" fill="#ffb347">② 线路电流（与声波同形）</text>
        </g>
        <g transform="translate(0,98)">
          <path :d="outPath" fill="none" stroke="#34d399" stroke-width="1.6" opacity="0.95" />
          <g v-if="digital">
            <circle v-for="(s, i) in samples" :key="'p' + i" :cx="s.x" :cy="98 - s.y" r="1.8" fill="#ffd166" opacity="0.9" />
          </g>
          <text x="44" y="-9" class="lbl" font-size="8.5" fill="#34d399">③ 听筒还原出的声音</text>
          <text x="416" y="-9" text-anchor="end" class="val" font-size="9">保真度 {{ (fidelity * 100).toFixed(0) }}%</text>
        </g>
      </g>
    </svg>

    <template #ctrl>
      <button class="demo-btn demo-btn--big" :class="{ 'demo-btn--on': speaking }"
        @click="speaking = !speaking; touch(speaking ? 'power' : 'cancel')">
        {{ speaking ? '🎙 正在说话' : '🔇 点我说话' }}
      </button>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">音量 <b>{{ Math.round(amp * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0.05" max="1" step="0.01" v-model.number="amp" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">音调 <b>{{ Math.round(120 * freq) }}Hz</b></span>
        <input class="demo-slider" type="range" min="0.6" max="6" step="0.1" v-model.number="freq" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">数字 PCM</span>
        <button class="demo-toggle" :class="{ 'is-on': digital }" @click="digital = !digital; touch(digital ? 'unlock' : 'page')" />
      </div>
      <div class="demo-ctrl__group" v-if="digital">
        <span class="demo-ctrl__label">采样点/周期 <b>{{ sampleRate }}</b></span>
        <input class="demo-slider" type="range" min="2" max="64" step="1" v-model.number="sampleRate" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__spacer" />
      <div class="demo-meter">
        <span class="demo-meter__k">线路噪声</span>
        <span class="demo-meter__v">{{ (noise * 100).toFixed(0) }}%</span>
        <span class="demo-meter__bar"><span class="demo-meter__fill" :style="{ width: clamp(noise * 200, 0, 100) + '%' }" /></span>
      </div>
    </template>
  </DemoFrame>
</template>
