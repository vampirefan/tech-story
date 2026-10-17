<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, clamp, fillStyle } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const mass = ref(600)          // kg
const hasWheel = ref(true)
const radius = ref(0.35)       // m
const rough = ref(0.6)         // 地面粗糙度 0-1
const lube = ref(0.5)          // 轴套润滑 0-1
const pull = ref(1200)         // N 施加的拉力
const x = ref(40)
const v = ref(0)
const wheelAng = ref(0)
const G = 9.8

const muSlide = computed(() => 0.42 * (0.45 + rough.value))
const muRoll = computed(() => 0.030 * (0.45 + rough.value) * (0.09 / radius.value) * (1.35 - lube.value * 0.7))
const fSlide = computed(() => mass.value * G * muSlide.value)
const fRoll = computed(() => mass.value * G * muRoll.value)
const resist = computed(() => (hasWheel.value ? fRoll.value : fSlide.value))
const moving = computed(() => pull.value > resist.value)
const people = computed(() => Math.max(1, Math.ceil(resist.value / 400)))
const saved = computed(() => (1 - resist.value / fSlide.value) * 100)

useRaf((dt) => {
  const net = pull.value - resist.value
  const a = net / mass.value
  v.value = clamp(v.value + a * dt * 26, -6, 26)
  if (!moving.value) v.value = Math.max(0, v.value - 40 * dt)
  x.value += v.value * dt * 9
  if (x.value > 470) x.value = -90
  wheelAng.value = (wheelAng.value + (v.value * dt * 9) / radius.value * 57.3) % 360
})

const barMax = computed(() => Math.max(fSlide.value, 1))
const status = computed(() => {
  if (!hasWheel.value) return { text: `滑动摩擦需要约 ${Math.round(fSlide.value)} 牛（≈${people.value} 个成年人一起拉）。地面越粗糙、东西越重，越拉不动。` }
  if (!moving.value) return { text: `拉力 ${Math.round(pull.value)} N 还不够克服滚动阻力 ${Math.round(resist.value)} N —— 加大拉力、把轮子做大、或给轴上油。`, kind: 'warn' as const }
  return { text: `换成轮子后只需 ${Math.round(resist.value)} 牛（≈${people.value} 人），省了 ${saved.value.toFixed(0)}% 的力气。轮子把"滑动摩擦"换成了小得多的"滚动阻力"。`, kind: 'good' as const }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="⊙" color="var(--cat-transport)" :status="status" note="一个人持续拉力约 400 牛">
    <svg viewBox="0 0 460 250">
      <defs>
        <linearGradient id="wheelStone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9aa7bd" /><stop offset="0.55" stop-color="#5d6b83" /><stop offset="1" stop-color="#333d4e" />
        </linearGradient>
        <linearGradient id="wheelWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#a9763c" /><stop offset="1" stop-color="#5c3a19" />
        </linearGradient>
        <pattern id="wheelGround" width="18" height="10" patternUnits="userSpaceOnUse">
          <rect width="18" height="10" fill="#1a1426" />
          <path d="M0,8 q4,-4 9,0 t9,0" stroke="#3b2f4a" stroke-width="1.2" fill="none" :opacity="0.4 + rough * 0.6" />
        </pattern>
      </defs>

      <rect width="460" height="250" fill="#060c1c" />
      <!-- 远景 -->
      <path d="M0,150 L60,110 L120,148 L190,96 L260,150 L330,116 L400,150 L460,124 L460,200 L0,200 Z" fill="#0c1428" opacity="0.9" />
      <circle cx="392" cy="52" r="17" fill="#ffd166" opacity="0.22" />
      <circle cx="392" cy="52" r="9" fill="#ffd166" opacity="0.5" />

      <!-- 地面 -->
      <rect x="0" y="200" width="460" height="50" fill="url(#wheelGround)" />
      <line x1="0" y1="200" x2="460" y2="200" stroke="#4a3d5e" stroke-width="1.6" />
      <!-- 里程碑 -->
      <g v-for="i in 5" :key="i" :opacity="0.5">
        <line :x1="i * 92" y1="200" :x2="i * 92" y2="207" stroke="#6f7f9c" stroke-width="1" />
      </g>

      <!-- 载具 -->
      <g :transform="`translate(${x},0)`">
        <!-- 石块 -->
        <path d="M-34,150 l14,-26 h56 l16,26 l-6,26 h-76 z" fill="url(#wheelStone)" stroke="#232b39" stroke-width="1.2" />
        <path d="M-18,150 l10,-18 M14,132 l8,20 M-24,168 l22,-6" stroke="#7f8ca3" stroke-width="1" opacity="0.55" fill="none" />
        <!-- 绳索 -->
        <path d="M52,168 q22,-4 40,4" stroke="#c8a86a" stroke-width="2" fill="none" />
        <!-- 拉的人 -->
        <g transform="translate(96,150)">
          <circle cx="6" cy="4" r="6" fill="#c98f5f" stroke="#5b3a1e" />
          <path d="M6,10 l-4,20 M6,10 l7,19 M2,16 l-12,6 M6,14 l10,-6" stroke="#8b5e34" stroke-width="2.6" fill="none" stroke-linecap="round" />
        </g>

        <!-- 滑板 or 轮子 -->
        <g v-if="!hasWheel">
          <rect x="-46" y="176" width="102" height="9" rx="3" fill="url(#wheelWood)" stroke="#2a1a0b" />
          <rect x="-46" y="185" width="102" height="15" rx="2" fill="#3a2716" opacity="0.85" />
          <!-- 摩擦热/划痕 -->
          <path v-if="moving" d="M-52,199 q-14,-5 -26,-2 M-50,194 q-18,-4 -30,0" stroke="#ff8a3d" stroke-width="1.6" fill="none" opacity="0.75" class="demo-flicker" />
        </g>
        <g v-else>
          <rect x="-46" y="170" width="102" height="8" rx="3" fill="url(#wheelWood)" stroke="#2a1a0b" />
          <!-- 轴 -->
          <rect x="-40" y="178" width="90" height="5" rx="2.5" fill="#6b5636" />
          <g v-for="wx in [-34, 34]" :key="wx" :transform="`translate(${wx},186)`">
            <circle r="14" fill="#4a3320" stroke="#241708" stroke-width="1.4" />
            <circle r="14" fill="none" stroke="#8a6a3a" stroke-width="2.4" stroke-dasharray="4 18" :transform="`rotate(${wheelAng})`" />
            <g :transform="`rotate(${wheelAng})`">
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#a8763f" stroke-width="2" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#a8763f" stroke-width="2" />
              <line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5" stroke="#8a5f31" stroke-width="1.4" />
              <line x1="8.5" y1="-8.5" x2="-8.5" y2="8.5" stroke="#8a5f31" stroke-width="1.4" />
            </g>
            <circle r="3.4" :fill="lube > 0.5 ? '#5cc8ff' : '#7d6a4a'" />
          </g>
        </g>

        <!-- 力的箭头 -->
        <g v-if="pull > 0">
          <line x1="60" y1="164" :x2="60 + clamp(pull / 40, 8, 78)" y2="164" stroke="#34d399" stroke-width="3" />
          <path :d="`M${60 + clamp(pull / 40, 8, 78)},158 l10,6 l-10,6 z`" fill="#34d399" />
          <text :x="66 + clamp(pull / 40, 8, 78)" y="158" font-size="9.5" fill="#34d399">拉力 {{ Math.round(pull) }}N</text>
        </g>
        <g>
          <line x1="-40" y1="164" :x2="-40 - clamp(resist / 40, 4, 70)" y2="164" stroke="#fb7185" stroke-width="3" />
          <path :d="`M${-40 - clamp(resist / 40, 4, 70)},158 l-10,6 l10,6 z`" fill="#fb7185" />
          <text :x="-46 - clamp(resist / 40, 4, 70)" y="158" text-anchor="end" font-size="9.5" fill="#fb7185">阻力 {{ Math.round(resist) }}N</text>
        </g>
      </g>

      <!-- 对比条 -->
      <g transform="translate(14,26)">
        <text class="lbl" x="0" y="0">需要的拉力对比</text>
        <text class="lbl" x="0" y="20">滑动</text>
        <rect x="34" y="11" width="150" height="11" rx="3" fill="rgba(120,190,255,0.1)" />
        <rect x="34" y="11" :width="clamp(fSlide / barMax * 150, 2, 150)" height="11" rx="3" fill="#fb7185" opacity="0.85" />
        <text class="val" x="190" y="20" fill="#fb7185">{{ Math.round(fSlide) }}N</text>
        <text class="lbl" x="0" y="42">滚动</text>
        <rect x="34" y="33" width="150" height="11" rx="3" fill="rgba(120,190,255,0.1)" />
        <rect x="34" y="33" :width="clamp(fRoll / barMax * 150, 2, 150)" height="11" rx="3" fill="#34d399" opacity="0.9" />
        <text class="val" x="190" y="42" fill="#34d399">{{ Math.round(fRoll) }}N</text>
        <text class="lbl" x="0" y="62" fill="#ffb347">当前方式需要 {{ people }} 个人一起拉（每人约 400N）</text>
      </g>
    </svg>

    <template #ctrl>
      <button class="demo-btn demo-btn--big" :class="{ 'demo-btn--on': hasWheel }"
        @click="hasWheel = !hasWheel; touch(hasWheel ? 'unlock' : 'cancel')">
        {{ hasWheel ? '⊙ 有轮子' : '▬ 无轮（滑板）' }}
      </button>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">重物 <b>{{ mass }}kg</b></span>
        <input class="demo-slider" type="range" min="80" max="3000" step="20" v-model.number="mass" :style="fillStyle(mass, 80, 3000)" @input="touch('tick', 0.18)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">拉力 <b>{{ pull }}N</b></span>
        <input class="demo-slider" type="range" min="0" max="6000" step="50" v-model.number="pull" :style="fillStyle(pull, 0, 6000)" @input="touch('tick', 0.18)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">轮半径 <b>{{ radius.toFixed(2) }}m</b></span>
        <input class="demo-slider" type="range" min="0.1" max="0.9" step="0.01" v-model.number="radius" :style="fillStyle(radius, 0.1, 0.9)" @input="touch('tick', 0.18)" :disabled="!hasWheel">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">地面粗糙 <b>{{ Math.round(rough * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0.1" max="1" step="0.01" v-model.number="rough" :style="fillStyle(rough, 0.1, 1)" @input="touch('tick', 0.18)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">轴套润滑 <b>{{ Math.round(lube * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0" max="1" step="0.01" v-model.number="lube" :style="fillStyle(lube, 0, 1)" @input="touch('tick', 0.18)" :disabled="!hasWheel">
      </div>
    </template>
  </DemoFrame>
</template>
