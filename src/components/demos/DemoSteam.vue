<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, clamp } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const fire = ref(0.6)
const load = ref(0.45)
const condenser = ref(true)
const governor = ref(true)

const pressure = ref(0.4)   // bar (相对)
const omega = ref(0)        // rad/s
const theta = ref(0)
const steamPuffs = ref<{ x: number; y: number; r: number; a: number }[]>([])
const t = ref(0)

const CX = 330, CY = 132, R = 26, L = 100

const valve = computed(() => governor.value ? clamp(1 - (omega.value / 9) ** 2 * 0.85, 0.06, 1) : 1)
const torque = computed(() => pressure.value > 0.35 ? pressure.value * valve.value * 2.5 : 0)
const eff = computed(() => (condenser.value ? 0.86 : 0.38) * (governor.value ? 1.04 : 0.94))
const power = computed(() => omega.value * torque.value * 3.4)
const pistonX = computed(() => CX - (R * Math.cos(theta.value) + Math.sqrt(L * L - (R * Math.sin(theta.value)) ** 2)))
const pinX = computed(() => CX + R * Math.cos(theta.value))
const pinY = computed(() => CY + R * Math.sin(theta.value))
const govR = computed(() => 8 + clamp(omega.value / 9, 0, 1) * 20)
const govY = computed(() => 46 + clamp(omega.value / 9, 0, 1) * 13)

useRaf((dt) => {
  t.value += dt
  const use = pressure.value > 0.35 ? 0.42 * valve.value * (condenser.value ? 1.25 : 0.7) : 0
  const leak = condenser.value ? 0.16 : 0.30
  pressure.value = clamp(pressure.value + (fire.value * 1.5 - use - leak - pressure.value * 0.12) * dt, 0.05, 8)
  const I = 3.2
  const dragTorque = load.value * 2.1 + omega.value * 0.16
  omega.value = Math.max(0, omega.value + ((torque.value * 2.2 - dragTorque) / I) * dt)
  theta.value = (theta.value + omega.value * dt) % (Math.PI * 2)

  if (fire.value > 0.15 && Math.random() < dt * 22 * fire.value) {
    steamPuffs.value.push({ x: 150 + Math.random() * 10, y: 96, r: 3 + Math.random() * 4, a: 0.6 })
  }
  if (condenser.value && pressure.value > 1 && Math.random() < dt * 14) {
    steamPuffs.value.push({ x: 236 + Math.random() * 20, y: 188, r: 2 + Math.random() * 3, a: 0.4 })
  }
  for (const p of steamPuffs.value) { p.y -= 20 * dt; p.x += 8 * dt; p.r += 9 * dt; p.a -= dt * 0.55 }
  steamPuffs.value = steamPuffs.value.filter(p => p.a > 0)
  if (steamPuffs.value.length > 40) steamPuffs.value.splice(0, steamPuffs.value.length - 40)
})

const status = computed(() => {
  if (pressure.value < 0.4) return { text: '锅炉压力不足，蒸汽还推不动活塞。把火力调大一些。' }
  if (omega.value < 0.4) return { text: `压力 ${pressure.value.toFixed(1)} bar 已足够，但负载太重（${Math.round(load.value * 100)}%），转速上不来。` , kind: 'warn' as const }
  const gov = governor.value ? '离心调速器正在自动收小汽阀，转速稳定住了 —— 这就是最早的"反馈控制"。' : '没有调速器，转速会随压力忽快忽慢，很容易飞车。'
  return { text: `${Math.round(omega.value * 9.55)} 转/分 · ${power.value.toFixed(1)} 马力。${gov}`, kind: 'good' as const }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="⚙" color="var(--cat-energy)" :status="status"
    :note="condenser ? '分离冷凝器：开（瓦特 1769 年专利的核心）' : '分离冷凝器：关（纽科门机，汽缸每冲一次都要重新加热）'">
    <svg viewBox="0 0 460 230">
      <defs>
        <linearGradient id="stBoiler" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7d8798" /><stop offset="0.45" stop-color="#454e5e" /><stop offset="1" stop-color="#20252f" />
        </linearGradient>
        <linearGradient id="stBrass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e2c07a" /><stop offset="0.5" stop-color="#a9822f" /><stop offset="1" stop-color="#5c4415" />
        </linearGradient>
        <radialGradient id="stFire">
          <stop offset="0" stop-color="#fff1c9" stop-opacity="0.95" />
          <stop offset="0.45" stop-color="#ff8a3d" stop-opacity="0.6" />
          <stop offset="1" stop-color="#ff5f56" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="460" height="230" fill="#060c1c" />
      <rect x="0" y="204" width="460" height="26" fill="#12101f" />
      <line x1="0" y1="204" x2="460" y2="204" stroke="#3a2b46" stroke-width="1.4" />

      <!-- 炉火 -->
      <ellipse cx="82" cy="200" :rx="52" :ry="18" fill="url(#stFire)" :opacity="0.2 + fire * 0.7" />
      <g v-for="i in 7" :key="i" :opacity="fire">
        <path :d="`M${50 + i * 9},202 q${4 + i % 3},-${10 + fire * 16 + Math.sin(t * 7 + i) * 5} ${2 + i % 2},-${16 + fire * 22}`"
          :stroke="i % 2 ? '#ffd166' : '#ff8a3d'" :stroke-width="2.6 - i * 0.16" fill="none" stroke-linecap="round" class="demo-flicker" />
      </g>
      <rect x="36" y="188" width="94" height="14" rx="3" fill="#2b2118" stroke="#171108" />

      <!-- 锅炉 -->
      <rect x="34" y="88" width="98" height="100" rx="14" fill="url(#stBoiler)" stroke="#171b23" stroke-width="1.6" />
      <rect x="44" y="98" width="78" height="80" rx="9" fill="#2b3a4d" opacity="0.5" />
      <path :d="`M44,${178 - clamp(pressure / 8, 0, 1) * 60} h78`" stroke="#8fd0ff" stroke-width="1" opacity="0.5" />
      <rect x="44" :y="178 - clamp(pressure / 8, 0, 1) * 60" width="78" :height="clamp(pressure / 8, 0, 1) * 60" rx="4"
        :fill="pressure > 6 ? '#ff8a3d' : '#3d6f8f'" opacity="0.55" />
      <text x="83" y="82" text-anchor="middle" class="lbl">锅炉</text>
      <!-- 压力表 -->
      <g transform="translate(83,60)">
        <circle r="17" fill="#0a1220" stroke="url(#stBrass)" stroke-width="2.4" />
        <path d="M-12,6 A13,13 0 0 1 12,6" fill="none" stroke="rgba(120,190,255,0.22)" stroke-width="2.6" />
        <path d="M-12,6 A13,13 0 0 1 12,6" fill="none" :stroke="pressure > 6 ? '#ff5f56' : '#34d399'" stroke-width="2.6"
          :stroke-dasharray="`${clamp(pressure / 8, 0, 1) * 34} 40`" />
        <line x1="0" y1="0" :x2="Math.cos(Math.PI * 0.8 + clamp(pressure / 8, 0, 1) * Math.PI * 1.4) * 12"
          :y2="Math.sin(Math.PI * 0.8 + clamp(pressure / 8, 0, 1) * Math.PI * 1.4) * 12" stroke="#ffd166" stroke-width="1.8" />
        <circle r="2" fill="#ffd166" />
        <text y="28" text-anchor="middle" class="val" font-size="10">{{ pressure.toFixed(1) }} bar</text>
      </g>

      <!-- 蒸汽管 + 汽阀 -->
      <path d="M132,104 h44 v14 h18" fill="none" stroke="url(#stBrass)" stroke-width="8" stroke-linejoin="round" />
      <rect x="150" y="96" width="14" height="16" rx="2" fill="#5c4415" stroke="#2b2108" />
      <rect x="152" y="99" width="10" :height="clamp(valve * 10, 1, 10)" rx="1" :fill="valve > 0.5 ? '#34d399' : '#ffb347'" />
      <text x="157" y="90" text-anchor="middle" class="lbl" font-size="9">汽阀 {{ Math.round(valve * 100) }}%</text>
      <!-- 蒸汽粒子 -->
      <circle v-for="(p, i) in steamPuffs" :key="i" :cx="p.x" :cy="p.y" :r="p.r" fill="#cfe6ff" :opacity="p.a * 0.5" />

      <!-- 汽缸 + 活塞 -->
      <rect x="192" y="112" width="86" height="40" rx="5" fill="#39414f" stroke="#171b23" stroke-width="1.6" />
      <rect x="196" y="116" width="78" height="32" rx="3" fill="#1b212b" />
      <rect x="196" y="116" :width="clamp(pistonX - 196, 0, 78)" height="32" rx="3"
        :fill="pressure > 0.4 ? `rgba(255,179,71,${0.18 + clamp(pressure / 8, 0, 1) * 0.4})` : 'rgba(120,190,255,0.08)'" />
      <rect :x="pistonX - 4" y="114" width="9" height="36" rx="2" fill="url(#stBrass)" stroke="#2b2108" />
      <rect :x="pistonX + 4" y="128" width="26" height="7" rx="2" fill="#8a94a5" />
      <text x="235" y="108" text-anchor="middle" class="lbl">汽缸 · 活塞</text>

      <!-- 连杆 + 曲柄 + 飞轮 -->
      <line :x1="pistonX + 28" y1="132" :x2="pinX" :y2="pinY" stroke="#9aa7bd" stroke-width="6" stroke-linecap="round" />
      <line :x1="pistonX + 28" y1="132" :x2="pinX" :y2="pinY" stroke="#d7e2f2" stroke-width="2" stroke-linecap="round" opacity="0.6" />
      <g>
        <circle :cx="CX" :cy="CY" r="42" fill="none" stroke="#4a5568" stroke-width="9" />
        <circle :cx="CX" :cy="CY" r="42" fill="none" stroke="#7b8798" stroke-width="3" opacity="0.7" />
        <g :transform="`rotate(${theta * 57.3} ${CX} ${CY})`">
          <line v-for="i in 6" :key="i" :x1="CX" :y1="CY"
            :x2="CX + Math.cos(i * 1.047) * 38" :y2="CY + Math.sin(i * 1.047) * 38" stroke="#39414f" stroke-width="4" />
          <circle :cx="CX + R" :cy="CY" r="5" fill="#ffd166" stroke="#5c4415" />
        </g>
        <circle :cx="CX" :cy="CY" r="8" fill="url(#stBrass)" stroke="#2b2108" />
      </g>
      <text :x="CX" y="192" text-anchor="middle" class="lbl">飞轮（储存动能，让转动平稳）</text>
      <text :x="CX" y="86" text-anchor="middle" class="val" font-size="13">{{ Math.round(omega * 9.55) }} rpm</text>

      <!-- 离心调速器 -->
      <g v-if="governor" transform="translate(398,20)">
        <line x1="0" y1="0" x2="0" y2="66" stroke="#7b8798" stroke-width="3" />
        <g :transform="`rotate(${theta * 57.3 * 1.6} 0 ${govY})`">
          <line v-for="sgn in [-1, 1]" :key="sgn" x1="0" :y1="govY" :x2="sgn * govR" :y2="govY + 22" stroke="#a9822f" stroke-width="2.2" />
          <circle v-for="sgn in [-1, 1]" :key="'b' + sgn" :cx="sgn * govR" :cy="govY + 24" r="6" fill="url(#stBrass)" stroke="#2b2108" />
        </g>
        <rect x="-9" :y="govY + 40" width="18" height="7" rx="2" fill="#5c4415" />
        <line x1="0" :y1="govY + 44" x2="-34" y2="104" stroke="#a9822f" stroke-width="1.4" stroke-dasharray="4 3" />
        <text y="76" text-anchor="middle" class="lbl" font-size="9">调速器</text>
      </g>

      <!-- 冷凝器 -->
      <g v-if="condenser">
        <path d="M236,152 v18 h-14 v16" fill="none" stroke="#7b8798" stroke-width="5" />
        <rect x="188" y="168" width="60" height="30" rx="4" fill="#1f3a4a" stroke="#2c5568" stroke-width="1.4" />
        <path d="M194,190 q8,-8 16,0 t16,0 t16,0" stroke="#5cc8ff" stroke-width="1.4" fill="none" opacity="0.75" class="demo-flow" />
        <text x="218" y="164" text-anchor="middle" class="lbl" font-size="9">冷凝器（造真空）</text>
      </g>
      <g v-else>
        <path d="M236,152 v22" stroke="#7b8798" stroke-width="5" fill="none" />
        <text x="236" y="188" text-anchor="middle" class="lbl" font-size="9" fill="#fb7185">废气直排（浪费 60% 热）</text>
      </g>

      <!-- 效率条 -->
      <g transform="translate(286,200)">
        <text class="lbl" font-size="9" x="0" y="-4">热效率</text>
        <rect x="52" y="-12" width="104" height="8" rx="4" fill="rgba(120,190,255,0.12)" />
        <rect x="52" y="-12" :width="eff * 104" height="8" rx="4" :fill="condenser ? '#34d399' : '#fb7185'" />
        <text class="val" font-size="10" x="160" y="-4">{{ (eff * 100).toFixed(0) }}%</text>
      </g>
    </svg>

    <template #ctrl>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">🔥 火力 <b>{{ Math.round(fire * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0" max="1" step="0.01" v-model.number="fire" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">🏋 负载 <b>{{ Math.round(load * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0" max="1" step="0.01" v-model.number="load" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">分离冷凝器</span>
        <button class="demo-toggle" :class="{ 'is-on': condenser }" @click="condenser = !condenser; touch(condenser ? 'unlock' : 'cancel')" />
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">离心调速器</span>
        <button class="demo-toggle" :class="{ 'is-on': governor }" @click="governor = !governor; touch(governor ? 'unlock' : 'cancel')" />
      </div>
      <div class="demo-ctrl__spacer" />
      <div class="demo-meter"><span class="demo-meter__k">功率</span><span class="demo-meter__v">{{ power.toFixed(1) }}</span><span class="demo-meter__k">马力</span></div>
      <button class="demo-btn demo-btn--ghost" @click="pressure = 0.4; omega = 0; touch('cancel')">↺ 停机</button>
    </template>
  </DemoFrame>
</template>
