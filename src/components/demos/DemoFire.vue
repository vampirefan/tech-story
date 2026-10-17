<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, approach, clamp, fillStyle, useAutoDemo, seg, lerp, smooth } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const rpm = ref(0)
const targetRpm = ref(60)
const pressure = ref(0.55)
const finesse = ref(0.5)
const oxygen = ref(0.6)
const blowing = ref(false)
const temp = ref(22)
const angle = ref(0)
const lit = ref(false)
const flame = ref(0)
const sparks = reactive<{ x: number; y: number; vx: number; vy: number; life: number }[]>([])

const IGNITE = 300

const heat = computed(() => {
  const base = (rpm.value / 220) * (0.35 + pressure.value) * (0.45 + finesse.value * 0.9)
  const o2 = 0.35 + oxygen.value * 0.85 + (blowing.value ? 0.7 : 0)
  return base * o2
})

useRaf((dt) => {
  rpm.value = approach(rpm.value, dragging.value ? 0 : targetRpm.value, dt, 3.2)
  angle.value = (angle.value + rpm.value * dt * 6) % 360
  const h = heat.value
  const cool = (temp.value - 22) * (lit.value ? 0.16 : 0.55)
  temp.value = clamp(temp.value + (h * 190 - cool) * dt, 22, 1100)
  if (!lit.value && temp.value >= IGNITE && oxygen.value > 0.12) {
    lit.value = true
    touch('spark')
  }
  if (lit.value && oxygen.value <= 0.06) { lit.value = false; temp.value = Math.min(temp.value, 180) }
  flame.value = approach(flame.value, lit.value ? clamp((temp.value - IGNITE) / 420, 0.25, 1) : 0, dt, lit.value ? 2.4 : 5)
  if (rpm.value > 40 && Math.random() < dt * (rpm.value / 26) * (0.4 + finesse.value)) {
    sparks.push({ x: 230 + (Math.random() - 0.5) * 12, y: 190, vx: (Math.random() - 0.5) * 46, vy: -28 - Math.random() * 46, life: 1 })
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]
    s.life -= dt * 1.5
    s.x += s.vx * dt
    s.y += s.vy * dt
    s.vy += 52 * dt
    if (s.life <= 0) sparks.splice(i, 1)
  }
  if (sparks.length > 60) sparks.splice(0, sparks.length - 60)
})

/* 拖动摩擦：左右拖动直接给转速冲量 */
const dragging = ref(false)
let lastX = 0
function onDown(e: PointerEvent) {
  dragging.value = true
  lastX = e.clientX
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = Math.abs(e.clientX - lastX)
  lastX = e.clientX
  if (dx > 0.5) {
    rpm.value = clamp(rpm.value + dx * 1.9, 0, 320)
    targetRpm.value = clamp(rpm.value * 0.86, 0, 320)
    if (Math.random() < 0.14) touch('tick', 0.25)
  }
}
function onUp() { dragging.value = false }

/* 自动演示：搓热升温 → 加压力与火候 → 鼓风 → 闷熄 → 重新点着 */
useAutoDemo((t) => {
  const s = seg(t, 8, 6, 5, 5, 6)
  blowing.value = false
  if (s.i === 0) {
    targetRpm.value = lerp(30, 190, smooth(s.p)); pressure.value = lerp(0.3, 0.8, s.p)
    finesse.value = 0.5; oxygen.value = 0.55
  } else if (s.i === 1) { targetRpm.value = 210; pressure.value = 0.9; finesse.value = lerp(0.3, 1, smooth(s.p)) }
  else if (s.i === 2) { targetRpm.value = 170; blowing.value = Math.sin(t * 2.4) > 0.2 }
  else if (s.i === 3) { oxygen.value = lerp(0.6, 0.03, smooth(s.p)) }
  else { oxygen.value = lerp(0.03, 0.8, smooth(s.p)); targetRpm.value = 220; pressure.value = 0.95; finesse.value = 0.95 }
}, 30)

const tempPct = computed(() => clamp((temp.value - 22) / (900 - 22), 0, 1) * 100)
const tempColor = computed(() => {
  const t = clamp((temp.value - 22) / 700, 0, 1)
  if (t < 0.25) return '#5cc8ff'
  if (t < 0.45) return '#ffb347'
  if (t < 0.7) return '#ff8a3d'
  return '#ff5f56'
})
const status = computed(() => {
  if (lit.value) return { text: `燃烧中！火焰温度约 ${Math.round(temp.value)}℃ —— 木头里的纤维素热解出可燃气体，与氧气剧烈反应持续放热。`, kind: 'good' as const }
  if (oxygen.value <= 0.12) return { text: '氧气太少，即使到了着火点也点不着。鼓风（增加氧气）是取火的关键一步。', kind: 'warn' as const }
  if (temp.value > 230) return { text: `已经 ${Math.round(temp.value)}℃，木屑开始冒烟热解 —— 再加把劲，着火点约 300℃。` }
  if (rpm.value < 25) return { text: '转速太慢，摩擦产生的热还赶不上散失的热。加快旋转或增大压力。' }
  return { text: `当前 ${Math.round(temp.value)}℃。摩擦把机械能变成热能，木屑越细、压力越大，升温越快。` }
})
</script>

<template>
  <DemoFrame
    :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="🔥" color="var(--cat-energy)" :status="status"
    note="提示：也可以直接在舞台上按住左右拖动来搓木棍"
  >
    <svg viewBox="0 0 460 250" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp" style="touch-action:none;cursor:ew-resize">
      <defs>
        <linearGradient id="fireWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8a5a2b" /><stop offset="0.5" stop-color="#5e3a19" /><stop offset="1" stop-color="#33200e" />
        </linearGradient>
        <radialGradient id="fireGlow">
          <stop offset="0" stop-color="#ffd9a0" stop-opacity="0.95" />
          <stop offset="0.4" stop-color="#ff8a3d" stop-opacity="0.55" />
          <stop offset="1" stop-color="#ff5f56" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="fireSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a1430" /><stop offset="1" stop-color="#050a1e" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="460" height="250" fill="url(#fireSky)" />
      <!-- 地面 -->
      <path d="M0,214 Q120,206 230,213 T460,210 L460,250 L0,250 Z" fill="#161022" />
      <path d="M0,214 Q120,206 230,213 T460,210" fill="none" stroke="#3a2b46" stroke-width="1.4" />
      <!-- 远处石头 -->
      <ellipse cx="66" cy="216" rx="26" ry="9" fill="#1d1830" />
      <ellipse cx="392" cy="218" rx="34" ry="10" fill="#1d1830" />

      <!-- 光晕 -->
      <circle v-if="flame > 0.02" cx="230" cy="192" :r="52 + flame * 66" fill="url(#fireGlow)" :opacity="0.25 + flame * 0.6" />

      <!-- 火床（横木） -->
      <rect x="152" y="192" width="156" height="19" rx="8" fill="url(#fireWood)" stroke="#241505" />
      <path d="M160,197 h140 M160,204 h140" stroke="#3d2712" stroke-width="1" opacity="0.7" />
      <!-- V 形槽口 -->
      <path d="M222,192 l8,10 l8,-10 z" fill="#1c0f04" />
      <!-- 木屑堆 -->
      <path d="M206,211 q14,-9 28,-1 q14,8 26,1 z" fill="#7a5a30" opacity="0.9" />
      <path d="M212,209 q10,-6 20,0 M226,210 q9,-5 17,1" stroke="#a8813f" stroke-width="1.4" fill="none" opacity="0.8" />

      <!-- 火星 -->
      <circle v-for="(s, i) in sparks" :key="i" :cx="s.x" :cy="s.y" :r="1.1 + s.life * 1.5"
        :fill="s.life > 0.55 ? '#ffe6b0' : '#ff8a3d'" :opacity="s.life" />

      <!-- 火焰 -->
      <g v-if="flame > 0.03" :class="lit ? 'demo-flicker' : ''">
        <path :d="`M230,${196 - flame * 8}
          C ${230 - 20 * flame},${186 - flame * 40} ${230 - 13 * flame},${168 - flame * 52} 230,${150 - flame * 62}
          C ${230 + 13 * flame},${168 - flame * 52} ${230 + 20 * flame},${186 - flame * 40} 230,${196 - flame * 8} Z`"
          fill="#ff8a3d" opacity="0.92" />
        <path :d="`M230,${194 - flame * 6}
          C ${230 - 11 * flame},${186 - flame * 30} ${230 - 7 * flame},${174 - flame * 38} 230,${162 - flame * 46}
          C ${230 + 7 * flame},${174 - flame * 38} ${230 + 11 * flame},${186 - flame * 30} 230,${194 - flame * 6} Z`"
          fill="#ffd166" opacity="0.95" />
        <path :d="`M230,${192 - flame * 4} C ${230 - 5 * flame},${186 - flame * 20} 230,${180 - flame * 26} 230,${176 - flame * 30}
          C 230,${180 - flame * 26} ${230 + 5 * flame},${186 - flame * 20} 230,${192 - flame * 4} Z`" fill="#fff4d6" />
      </g>

      <!-- 钻杆（旋转） -->
      <g :transform="`rotate(0 230 150)`">
        <rect x="226" y="66" width="8" height="130" rx="3" fill="#6b4423" stroke="#2a1a0b" />
        <path :d="`M230,72 L230,190`" stroke="#a8763f" stroke-width="1.6" opacity="0.75"
          :transform="`rotate(${angle * 0.6} 230 130)`" stroke-dasharray="14 8" />
        <!-- 横压板 -->
        <rect x="196" y="60" width="68" height="11" rx="5" fill="#4a3320" stroke="#241708" />
        <!-- 手 -->
        <circle cx="200" cy="52" r="9" fill="#c98f5f" stroke="#5b3a1e" />
        <circle cx="260" cy="52" r="9" fill="#c98f5f" stroke="#5b3a1e" />
        <path d="M194,48 q6,-6 12,0 M254,48 q6,-6 12,0" stroke="#7d4f2a" stroke-width="1.2" fill="none" />
      </g>
      <!-- 旋转指示 -->
      <g :opacity="rpm > 8 ? 0.85 : 0.2">
        <path d="M206,120 a24,24 0 0 1 48,0" fill="none" stroke="#5cc8ff" stroke-width="1.6" stroke-dasharray="4 4"
          :transform="`rotate(${angle} 230 120)`" />
        <circle cx="230" cy="120" r="1.8" fill="#5cc8ff" />
      </g>

      <!-- 温度计 -->
      <g>
        <text x="392" y="34" text-anchor="middle" class="lbl">温度</text>
        <rect x="384" y="42" width="16" height="150" rx="8" fill="#060c1c" stroke="rgba(var(--tint),0.28)" />
        <rect x="387" :y="189 - tempPct * 1.44" width="10" :height="Math.max(2, tempPct * 1.44)" rx="5" :fill="tempColor" />
        <line x1="378" :y1="189 - ((IGNITE - 22) / 878) * 144" x2="406" :y2="189 - ((IGNITE - 22) / 878) * 144"
          stroke="#ff5f56" stroke-width="1.4" stroke-dasharray="3 3" />
        <text x="374" :y="187 - ((IGNITE - 22) / 878) * 144" text-anchor="end" font-size="9" fill="#fb7185">着火点 300℃</text>
        <text x="392" y="206" text-anchor="middle" class="val">{{ Math.round(temp) }}℃</text>
      </g>

      <!-- 转速 / 压力读数 -->
      <g>
        <text x="34" y="42" class="lbl">转速</text>
        <text x="34" y="58" class="val" font-size="14">{{ Math.round(rpm) }} rpm</text>
        <text x="34" y="82" class="lbl">摩擦功率</text>
        <rect x="34" y="88" width="86" height="6" rx="3" fill="rgba(var(--tint),0.14)" />
        <rect x="34" y="88" :width="clamp(heat * 60, 0, 86)" height="6" rx="3" fill="#ffb347" />
        <text x="34" y="118" class="lbl">氧气供给</text>
        <g v-for="i in 5" :key="i">
          <rect :x="34 + (i - 1) * 18" y="124" width="13" height="9" rx="2"
            :fill="oxygen * 5 >= i - 0.4 ? (blowing ? '#34d399' : '#5cc8ff') : 'rgba(var(--tint),0.12)'" />
        </g>
      </g>
    </svg>

    <template #ctrl>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">转速 <b>{{ Math.round(targetRpm) }}</b></span>
        <input class="demo-slider" type="range" min="0" max="300" step="1" v-model.number="targetRpm"
          :style="fillStyle(targetRpm, 0, 300)" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">下压力 <b>{{ Math.round(pressure * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0" max="1" step="0.01" v-model.number="pressure"
          :style="fillStyle(pressure, 0, 1)" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">木屑细度 <b>{{ Math.round(finesse * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0" max="1" step="0.01" v-model.number="finesse"
          :style="fillStyle(finesse, 0, 1)" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">氧气 <b>{{ Math.round(oxygen * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0" max="1" step="0.01" v-model.number="oxygen"
          :style="fillStyle(oxygen, 0, 1)" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__spacer" />
      <button class="demo-btn" :class="{ 'demo-btn--on': blowing }"
        @pointerdown="blowing = true; touch('whoosh')" @pointerup="blowing = false" @pointerleave="blowing = false">
        💨 按住鼓风
      </button>
      <button class="demo-btn demo-btn--ghost" @click="temp = 22; lit = false; flame = 0; sparks.splice(0); touch('cancel')">↺ 重来</button>
    </template>
  </DemoFrame>
</template>
