<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, approach, clamp, useAutoDemo, seg, lerp, smooth, edgeTrigger } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const alpha = ref(6)       // 迎角 °
const speed = ref(60)      // 空速 m/s
const t = ref(0)
const flow = ref(0)
const roll = ref(0)
const pitch = ref(0)
const yaw = ref(0)

const STALL = 15
/** 升力系数：线性段 → 临界迎角后骤然掉落 */
const cl = computed(() => {
  const a = alpha.value
  if (a <= STALL) return 0.11 * a + 0.15
  return (0.11 * STALL + 0.15) * clamp(1 - (a - STALL) / 13, 0.12, 1)
})
const cd = computed(() => 0.022 + 0.0016 * alpha.value ** 1.7 + (alpha.value > STALL ? (alpha.value - STALL) * 0.012 : 0))
const lift = computed(() => 0.5 * 1.225 * speed.value ** 2 * 3.2 * cl.value / 1000)   // kN（示意）
const drag = computed(() => 0.5 * 1.225 * speed.value ** 2 * 3.2 * cd.value / 1000)
const weight = 4.2
const stalled = computed(() => alpha.value > STALL || lift.value < weight * 0.82)
const net = computed(() => lift.value - weight)
const ld = computed(() => lift.value / Math.max(0.01, drag.value))

useRaf((dt) => {
  t.value += dt
  flow.value = (flow.value + dt * (40 + speed.value * 3.4)) % 40
  roll.value = approach(roll.value, 0, dt, 1.5)
  pitch.value = approach(pitch.value, 0, dt, 1.5)
  yaw.value = approach(yaw.value, 0, dt, 1.5)
})

function axis(which: 'roll' | 'pitch' | 'yaw', dir: number) {
  if (which === 'roll') roll.value = clamp(roll.value + dir * 26, -60, 60)
  if (which === 'pitch') pitch.value = clamp(pitch.value + dir * 16, -34, 34)
  if (which === 'yaw') yaw.value = clamp(yaw.value + dir * 20, -45, 45)
  touch('tick', 0.35)
}

/* 自动演示：抬机头 → 超过临界迎角失速 → 推杆增速改出 → 三轴舵面 */
const hit = edgeTrigger()
useAutoDemo((t) => {
  const s = seg(t, 7, 6, 7, 5, 5)
  if (s.i === 0) { alpha.value = lerp(2, 12, smooth(s.p)); speed.value = 60 }
  else if (s.i === 1) { alpha.value = lerp(12, 21, smooth(s.p)) }
  else if (s.i === 2) { alpha.value = lerp(21, 6, smooth(s.p)); speed.value = lerp(55, 95, smooth(s.p)) }
  else if (s.i === 3) { alpha.value = 8; speed.value = lerp(30, 120, smooth(s.p)) }
  else {
    alpha.value = 6; speed.value = 70
    if (hit(t, 25.3)) axis('roll', 1)
    if (hit(t, 26.3)) axis('roll', -1)
    if (hit(t, 27.3)) axis('pitch', 1)
    if (hit(t, 28.3)) axis('yaw', 1)
    if (hit(t, 29.3)) axis('yaw', -1)
  }
}, 30)

/** 翼型轮廓（NACA 简化） */
const foil = computed(() => {
  const a = alpha.value * Math.PI / 180
  const pts: string[] = []
  for (let i = 0; i <= 22; i++) {
    const s = i / 22
    const x = 150 + s * 130
    const c = 130
    const th = 0.14 * c * (0.2969 * Math.sqrt(s) - 0.126 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1015 * s ** 4)
    const cam = 0.06 * c * (2 * s - s * s)
    const yu = 130 - (cam + th)
    pts.push(`${(220 + (x - 220) * Math.cos(a) - (yu - 130) * Math.sin(a)).toFixed(1)},${(130 + (x - 220) * Math.sin(a) + (yu - 130) * Math.cos(a)).toFixed(1)}`)
  }
  for (let i = 22; i >= 0; i--) {
    const s = i / 22
    const x = 150 + s * 130
    const c = 130
    const th = 0.14 * c * (0.2969 * Math.sqrt(s) - 0.126 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1015 * s ** 4)
    const cam = 0.06 * c * (2 * s - s * s)
    const yl = 130 - (cam - th)
    pts.push(`${(220 + (x - 220) * Math.cos(a) - (yl - 130) * Math.sin(a)).toFixed(1)},${(130 + (x - 220) * Math.sin(a) + (yl - 130) * Math.cos(a)).toFixed(1)}`)
  }
  return 'M' + pts.join('L') + 'Z'
})

/** 流线：越靠近翼面偏折越多；失速后上表面气流分离成乱流 */
function streamline(y0: number, i: number): string {
  const above = y0 < 130
  const deflect = cl.value * (above ? 30 : -13) * clamp(1 - Math.abs(y0 - 130) / 92, 0.15, 1)
  let d = ''
  for (let x = 24; x <= 336; x += 12) {
    const w = Math.exp(-((x - 215) ** 2) / (2 * 82 * 82))
    let y = y0 - deflect * w
    if (alpha.value > STALL && above && x > 215) {
      const sep = clamp((x - 215) / 90, 0, 1) * (alpha.value - STALL) / 10
      y += Math.sin(x * 0.11 + t.value * 9 + i * 1.7) * 11 * sep
      y += sep * 12
    }
    d += (x === 24 ? 'M' : 'L') + x + ',' + y.toFixed(1)
  }
  return d
}

const status = computed(() => {
  if (alpha.value > STALL) return { text: `失速！迎角 ${alpha.value.toFixed(0)}° 超过临界角 ${STALL}°，上表面气流"剥离"，升力骤降 —— 这跟速度无关，只跟迎角有关。`, kind: 'warn' as const }
  if (lift.value < weight) return { text: `升力 ${lift.value.toFixed(1)}kN 小于重力 ${weight}kN，飞机会掉高度。加快空速或增大迎角（升力 ∝ 速度²）。`, kind: 'warn' as const }
  return { text: `稳定飞行：升力 ${lift.value.toFixed(1)}kN ≥ 重力 ${weight}kN，升阻比 ${ld.value.toFixed(1)}。上表面气流快、压强小，下表面压强大 —— 压强差就是升力。`, kind: 'good' as const }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="✈" color="var(--cat-space)" :status="status" note="1903 年 12 月 17 日：人类第一次可控动力飞行，留空 12 秒，飞出 36 米">
    <svg viewBox="0 0 460 232">
      <defs>
        <linearGradient id="flWing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#cfe0f5" /><stop offset="0.55" stop-color="#7b8798" /><stop offset="1" stop-color="#39414f" />
        </linearGradient>
      </defs>
      <rect width="460" height="232" class="stage-bg" />

      <!-- 失速警报 -->
      <g v-if="stalled">
        <rect x="112" y="6" width="136" height="20" rx="4" fill="rgba(255,95,86,0.18)" stroke="#ff5f56" stroke-width="1.2" class="demo-flicker" />
        <text x="180" y="20" text-anchor="middle" font-size="11" font-weight="700" fill="#ff8f88" class="demo-flicker">{{ alpha > STALL ? '⚠ STALL 失速' : '⚠ 升力不足' }}</text>
      </g>

      <!-- 流线 -->
      <g>
        <path v-for="(y0, i) in [52, 74, 96, 112, 148, 170, 192]" :key="i" :d="streamline(y0, i)"
          fill="none" :stroke="alpha > STALL && y0 < 130 ? '#fb7185' : (y0 < 130 ? '#5cc8ff' : '#3d7fa6')"
          :stroke-width="y0 < 130 ? 1.8 : 1.3" :opacity="y0 < 130 ? 0.95 : 0.6"
          stroke-dasharray="14 26" :stroke-dashoffset="-flow" />
      </g>
      <text x="26" y="44" class="lbl" font-size="9">气流 {{ speed.toFixed(0) }} m/s →</text>

      <!-- 机翼 -->
      <path :d="foil" fill="url(#flWing)" stroke="#1b212b" stroke-width="1.2" />
      <!-- 迎角参考线 -->
      <line x1="120" y1="130" x2="330" y2="130" stroke="rgba(var(--tint),0.28)" stroke-width="1" stroke-dasharray="4 4" />
      <line x1="150" y1="130" x2="286" y2="130" stroke="#ffb347" stroke-width="1.4"
        :transform="`rotate(${-alpha} 150 130)`" />
      <path :d="`M230,130 A80,80 0 0 0 ${230 - 80 * Math.cos(alpha * Math.PI / 180) + 80},${130 - 80 * Math.sin(alpha * Math.PI / 180)}`"
        fill="none" stroke="#ffb347" stroke-width="1.2" opacity="0.8" />
      <text x="252" y="122" class="lbl" font-size="10" fill="#ffb347">迎角 α = {{ alpha.toFixed(0) }}°</text>

      <!-- 力矢量 -->
      <g transform="translate(215,130)">
        <line x1="0" y1="0" x2="0" :y2="-clamp(lift * 12, 6, 96)" stroke="#34d399" stroke-width="3.4" />
        <path :d="`M0,${-clamp(lift * 12, 6, 96)} l-6,10 h12 z`" fill="#34d399" />
        <text x="8" :y="-clamp(lift * 12, 6, 96) + 8" class="val" font-size="10" fill="#34d399">升力 {{ lift.toFixed(1) }}</text>

        <line x1="0" y1="0" x2="0" :y2="clamp(weight * 12, 6, 80)" stroke="#fb7185" stroke-width="3.4" />
        <path :d="`M0,${clamp(weight * 12, 6, 80)} l-6,-10 h12 z`" fill="#fb7185" />
        <text x="8" :y="clamp(weight * 12, 6, 80) - 2" class="val" font-size="10" fill="#fb7185">重力 {{ weight.toFixed(1) }}</text>

        <line x1="0" y1="0" :x2="-clamp(drag * 46, 4, 62)" y2="0" stroke="#ffb347" stroke-width="3" />
        <path :d="`M${-clamp(drag * 46, 4, 62)},0 l10,-5 v10 z`" fill="#ffb347" />
        <text :x="-clamp(drag * 46, 4, 62) - 4" y="-6" text-anchor="end" class="val" font-size="10" fill="#ffb347">阻力</text>
      </g>

      <!-- 升力曲线小图 -->
      <g transform="translate(30,150)">
        <rect x="0" y="0" width="96" height="66" rx="5" fill="rgba(var(--veil),0.8)" stroke="rgba(var(--tint),0.16)" />
        <text x="8" y="13" class="lbl" font-size="8.5">升力系数 CL</text>
        <line x1="10" y1="56" x2="88" y2="56" stroke="rgba(var(--tint),0.25)" />
        <line x1="10" y1="20" x2="10" y2="56" stroke="rgba(var(--tint),0.25)" />
        <path d="M10,56 L52,24 Q60,20 66,34 L86,52" fill="none" stroke="#34d399" stroke-width="1.8" />
        <line :x1="10 + alpha / 26 * 76" y1="20" :x2="10 + alpha / 26 * 76" y2="56" stroke="#ffb347" stroke-width="1.2" stroke-dasharray="2 2" />
        <circle :cx="10 + alpha / 26 * 76" :cy="56 - clamp(cl / 1.9, 0, 1) * 36" r="3" fill="#ffd166" />
        <text x="52" y="64" text-anchor="middle" class="lbl" font-size="7.5">迎角 →（临界角后掉落）</text>
      </g>

      <!-- 三轴控制 -->
      <g transform="translate(374,120)">
        <rect x="-72" y="-84" width="146" height="106" rx="6" fill="rgba(var(--veil),0.7)" stroke="rgba(var(--tint),0.16)" />
        <text x="-64" y="-70" class="lbl" font-size="9">三轴姿态</text>
        <circle cx="0" cy="-30" r="34" fill="rgba(20,32,58,0.6)" stroke="rgba(var(--tint),0.2)" />
        <line x1="-34" y1="-30" x2="34" y2="-30" stroke="rgba(var(--tint),0.18)" />
        <line x1="0" y1="-64" x2="0" y2="4" stroke="rgba(var(--tint),0.18)" />
        <g :transform="`rotate(${roll} 0 -30)`">
          <path d="M-30,-30 h60 l-6,-5 h-48 z" fill="#8a94a5" stroke="#2b3444" />
          <rect x="-4" y="-33" width="8" height="20" rx="2" fill="#c9d6e8" />
          <!-- 副翼 -->
          <rect x="-30" y="-33" width="12" height="4" :fill="Math.abs(roll) > 3 ? '#ffd166' : '#5d6b83'"
            :transform="`rotate(${clamp(roll * 0.5, -14, 14)} -24 -31)`" />
          <rect x="18" y="-33" width="12" height="4" :fill="Math.abs(roll) > 3 ? '#ffd166' : '#5d6b83'"
            :transform="`rotate(${-clamp(roll * 0.5, -14, 14)} 24 -31)`" />
        </g>
        <!-- 俯仰 / 偏航读数 -->
        <text x="-64" y="12" class="lbl" font-size="8.5">滚转 {{ roll.toFixed(0) }}° · 俯仰 {{ pitch.toFixed(0) }}° · 偏航 {{ yaw.toFixed(0) }}°</text>
        <!-- 方向舵指示 -->
        <g transform="translate(0,-30)">
          <path v-if="Math.abs(yaw) > 2" :d="yaw > 0 ? 'M40,0 l-9,-5 v10 z' : 'M-40,0 l9,-5 v10 z'" fill="#5cc8ff" opacity="0.85" />
        </g>
        <path v-if="Math.abs(pitch) > 2" :d="pitch > 0 ? 'M0,-70 l-5,9 h10 z' : 'M0,10 l-5,-9 h10 z'" fill="#34d399" opacity="0.85" />
      </g>
    </svg>

    <template #ctrl>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">迎角 α <b :style="{ color: alpha > STALL ? 'var(--c-rose)' : undefined }">{{ alpha.toFixed(0) }}°</b></span>
        <input class="demo-slider" type="range" min="-4" max="26" step="0.5" v-model.number="alpha" @input="touch('tick', 0.22)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">空速 <b>{{ speed.toFixed(0) }} m/s</b></span>
        <input class="demo-slider" style="width:150px" type="range" min="10" max="160" step="1" v-model.number="speed" @input="touch('tick', 0.22)">
      </div>
      <div class="demo-ctrl__spacer" />
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">副翼（滚转）</span>
        <button class="demo-btn" @click="axis('roll', -1)">◀</button>
        <button class="demo-btn" @click="axis('roll', 1)">▶</button>
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">升降舵（俯仰）</span>
        <button class="demo-btn" @click="axis('pitch', 1)">▲</button>
        <button class="demo-btn" @click="axis('pitch', -1)">▼</button>
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">方向舵（偏航）</span>
        <button class="demo-btn" @click="axis('yaw', -1)">↰</button>
        <button class="demo-btn" @click="axis('yaw', 1)">↱</button>
      </div>
      <div class="demo-meter"><span class="demo-meter__k">升阻比</span><span class="demo-meter__v">{{ ld.toFixed(1) }}</span></div>
      <div class="demo-meter">
        <span class="demo-meter__k">净升力</span>
        <span class="demo-meter__v" :style="{ color: net >= 0 ? 'var(--c-emerald)' : 'var(--c-rose)' }">{{ net >= 0 ? '+' : '' }}{{ net.toFixed(1) }} kN</span>
      </div>
    </template>
  </DemoFrame>
</template>
