<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, clamp, useAutoDemo, seg, lerp, smooth, edgeTrigger } from './useDemo'

const props = defineProps<{ demoId: string; title: string; hint?: string; points?: string[]; nodeId?: string }>()
const touch = useDemoTouch()

const mode = computed<'launch' | 'mission' | 'mars'>(() =>
  props.nodeId === 'apollo' ? 'mission' : props.nodeId === 'mars' ? 'mars' : 'launch')

/* ══════ 发射模式 ══════ */
const thrust = ref(7500)      // kN
const fuelRatio = ref(0.88)   // 燃料占总质量比例
const stages = ref(2)
const isp = ref(300)          // s

const m0 = 500000
const ve = computed(() => isp.value * 9.81)
const stageDry = computed(() => m0 * (1 - fuelRatio.value) / stages.value)
const stageFuel = computed(() => m0 * fuelRatio.value / stages.value)
/** 齐奥尔科夫斯基：总 Δv */
const dvTotal = computed(() => {
  let dv = 0, m = m0
  for (let i = 0; i < stages.value; i++) {
    const mEnd = m - stageFuel.value
    dv += ve.value * Math.log(m / Math.max(1, mEnd))
    m = mEnd - stageDry.value
  }
  return dv
})
const twr = computed(() => (thrust.value * 1000) / (m0 * 9.81))

const phase = ref<'idle' | 'fly' | 'orbit' | 'crash'>('idle')
const alt = ref(0), vel = ref(0), mass = ref(m0), stageIdx = ref(0), tt = ref(0)
const dropped = ref<number[]>([])
const flame = ref(0)
const shake = ref(0)
const trail = ref<{ a: number; o: number }[]>([])
const maxAlt = ref(0), maxV = ref(0)

useRaf((dt) => {
  if (phase.value !== 'fly') { shake.value = Math.max(0, shake.value - dt * 2); return }
  tt.value += dt
  const R = 6371000
  const g = 9.81 * (R / (R + alt.value)) ** 2
  const rho = 1.225 * Math.exp(-alt.value / 8500)
  const drag = 0.5 * rho * vel.value ** 2 * 1.6 * 12
  const T = thrust.value * 1000
  mass.value = Math.max(stageDry.value, mass.value - (T / ve.value) * dt)
  const a = (T - drag) / mass.value - g
  vel.value += a * dt
  alt.value += vel.value * dt
  flame.value = clamp(0.5 + Math.random() * 0.5, 0, 1)
  shake.value = clamp(T / 9000, 0, 1)
  maxAlt.value = Math.max(maxAlt.value, alt.value)
  maxV.value = Math.max(maxV.value, vel.value)
  if (Math.random() < dt * 26) trail.value.push({ a: alt.value, o: 0.85 })
  for (const p of trail.value) p.o -= dt * 0.35
  trail.value = trail.value.filter(p => p.o > 0)
  if (trail.value.length > 90) trail.value.splice(0, trail.value.length - 90)

  if (mass.value <= stageDry.value + 1 && stageIdx.value < stages.value - 1) {
    dropped.value.push(stageIdx.value)
    mass.value -= stageDry.value
    stageIdx.value++
    touch('unlock')
  } else if (mass.value <= stageDry.value + 1) {
    if (vel.value >= 7900) { phase.value = 'orbit'; touch('chime') }
    else if (alt.value > 100000 && vel.value > 3000) { phase.value = 'orbit'; touch('chime') }
    else { phase.value = 'crash'; touch('alarm') }
  }
  if (phase.value === 'fly' && alt.value < 0 && tt.value > 1) { phase.value = 'crash'; touch('alarm') }
  if (vel.value < -40 && alt.value < 200 && tt.value > 2) { phase.value = 'crash'; touch('alarm') }
})

function launch() {
  if (phase.value === 'fly') return
  mass.value = m0
  alt.value = 0; vel.value = 0; tt.value = 0
  stageIdx.value = 0; dropped.value = []; trail.value = []
  maxAlt.value = 0; maxV.value = 0
  phase.value = twr.value < 1 ? 'crash' : 'fly'
  touch(twr.value < 1 ? 'wrong' : 'power')
}
function reset() { phase.value = 'idle'; alt.value = 0; vel.value = 0; trail.value = []; dropped.value = []; touch('cancel') }

/* 自动演示：按当前模式各演一遍（发射调参 / 登月方案 / 火星窗口与着陆） */
const hit = edgeTrigger()
useAutoDemo((t) => {
  if (mode.value === 'mission') {
    const s = seg(t, 12, 11, 11)
    plan.value = s.i === 0 ? 'direct' : s.i === 1 ? 'eor' : 'lor'
    return
  }
  if (mode.value === 'mars') {
    const s = seg(t, 9, 5, 5, 5, 5, 5)
    if (s.i === 0) { phaseAngle.value = Math.round(lerp(140, 44, smooth(s.p))); edl.value = -1 }
    else edl.value = Math.min(s.i - 1, EDL.length - 1)
    return
  }
  const s = seg(t, 8, 6, 6, 6, 8)
  const fire = (at: number) => { if (!hit(t, at)) return; if (phase.value === 'fly') reset(); launch() }
  if (s.i === 0) {
    thrust.value = Math.round(lerp(3000, 8000, smooth(s.p)) / 100) * 100
    fuelRatio.value = 0.88; stages.value = 1; isp.value = 300
    fire(3)
  } else if (s.i === 1) {
    thrust.value = 8000; stages.value = s.p < 0.5 ? 1 : 3
    fire(11)
  } else if (s.i === 2) {
    stages.value = 2; isp.value = Math.round(lerp(240, 450, smooth(s.p)) / 5) * 5
    fire(17)
  } else if (s.i === 3) {
    isp.value = 350; fuelRatio.value = lerp(0.7, 0.93, smooth(s.p))
    fire(23)
  } else {
    thrust.value = 12000; fuelRatio.value = 0.9; stages.value = 3; isp.value = 420
    fire(28.5)
  }
}, 34)

/* ══════ 登月方案 ══════ */
const PLANS = [
  { k: 'direct', n: '直接登月', en: 'Direct Ascent', mass: 8000, dv: 15.2, risk: '极高', note: '一枚巨型火箭整艘飞船直冲月球再返回。需要造出比土星五号还大一倍的火箭（ Nova ），当时根本造不出来。', ok: false },
  { k: 'eor', n: '地球轨道交会', en: 'Earth Orbit Rendezvous', mass: 4400, dv: 14.1, risk: '高', note: '多次发射把部件送到地球轨道组装，再飞向月球。要在轨道上给巨型飞船加註燃料，1961 年连对接都不会。', ok: false },
  { k: 'lor', n: '月球轨道交会', en: 'Lunar Orbit Rendezvous', mass: 1330, dv: 12.9, risk: '中', note: '只把小小的登月舱送下去，指令舱留在月球轨道等。冯·布劳恩一开始反对，但霍博尔特算清了：这是唯一能在 1969 年前做到的方案。', ok: true }
] as const
const plan = ref<'direct' | 'eor' | 'lor'>('lor')
const curPlan = computed(() => PLANS.find(p => p.k === plan.value)!)

/* ══════ 火星：霍曼转移 + 恐怖七分钟 ══════ */
const phaseAngle = ref(44)
const edl = ref(-1)
const EDL = [
  { n: '气动减速', d: '以 5.9 km/s 冲进大气，隔热罩承受 1600℃，靠空气阻力丢掉 90% 的能量。', v: 450 },
  { n: '超音速降落伞', d: '在稀薄大气中张开，把速度压到 400 km/h 左右 —— 但火星大气太薄，伞的效率只有地球的三分之一。', v: 100 },
  { n: '抛隔热罩 + 雷达测高', d: '扔掉死重，打开雷达寻找地面，此时离地只有 8 公里，只剩 30 秒。', v: 90 },
  { n: '反推发动机', d: '点火减速，同时横向机动避开石头。信号单程要 4–24 分钟，地面完全插不上手。', v: 8 },
  { n: '空中吊车 / 触地关机', d: '悬停放下探测器，或者最后 2 米自由落体 —— 着陆瞬间才切断发动机，防止吹起沙尘。', v: 0 }
]
function edlGo(i: number) {
  if (i === edl.value + 1) { edl.value = i; touch(i === EDL.length - 1 ? 'chime' : 'confirm') }
  else if (i <= edl.value) { edl.value = i; touch('tick', 0.4) }
  else touch('wrong')
}
const transferOk = computed(() => Math.abs(phaseAngle.value - 44) < 6)
const marsAngle = ref(0)
useRaf((dt) => { if (mode.value === 'mars') marsAngle.value += dt * 12 })

const status = computed(() => {
  if (mode.value === 'mission') {
    if (plan.value === 'lor') return { text: `月球轨道交会：起飞质量 ${curPlan.value.mass} 吨，比直接登月省了 84%。1962 年 NASA 正式采纳 —— 这是阿波罗能赶在 1969 年前成功的关键决定。`, kind: 'good' as const }
    return { text: `${curPlan.value.n}：需要 ${curPlan.value.mass} 吨起飞质量、Δv 约 ${curPlan.value.dv} km/s。${curPlan.value.note}`, kind: 'warn' as const }
  }
  if (mode.value === 'mars') {
    if (edl.value >= EDL.length - 1) return { text: '软着陆成功！整个"恐怖七分钟"全程自主完成，地面只能等结果 —— 这就是深空探测最难的部分。', kind: 'good' as const }
    if (!transferOk.value) return { text: `发射窗口不对。地火相位角要接近 44°（每 26 个月一次），否则要么燃料不够，要么要飞好几年。当前 ${phaseAngle.value.toFixed(0)}°。`, kind: 'warn' as const }
    if (edl.value < 0) return { text: '先调好相位角进入霍曼转移轨道（飞行约 7–9 个月），再按顺序点选着陆减速的五步。' }
    return { text: EDL[edl.value].d }
  }
  if (phase.value === 'crash') return { text: twr.value < 1 ? `推重比只有 ${twr.value.toFixed(2)} —— 推力小于自身重量，火箭根本抬不起来。把推力加大到推重比 > 1.2。` : `没能入轨。总 Δv 约 ${(dvTotal.value / 1000).toFixed(2)} km/s，需要 9.4 km/s（含 1.5 km/s 的重力与阻力损失）。加燃料、加级数、或换更高比冲的发动机。`, kind: 'warn' as const }
  if (phase.value === 'orbit') return { text: `入轨成功！速度 ${(maxV.value / 1000).toFixed(2)} km/s，最高 ${(maxAlt.value / 1000).toFixed(0)} km。多级火箭把烧空的壳子扔掉，才有足够的 Δv。`, kind: 'good' as const }
  if (phase.value === 'fly') return { text: `飞行中：高度 ${(alt.value / 1000).toFixed(1)} km，速度 ${(vel.value / 1000).toFixed(2)} km/s，第 ${stageIdx.value + 1} 级工作。`, kind: 'good' as const }
  return { text: `推重比 ${twr.value.toFixed(2)}，总 Δv ${(dvTotal.value / 1000).toFixed(2)} km/s（第一宇宙速度 7.9 km/s，实际需要约 9.4 km/s）。点"发射"。` }
})

const rocketY = computed(() => clamp(186 - (alt.value / 120000) * 150, 26, 186))
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="🚀" color="var(--cat-space)" :status="status"
    :note="mode === 'launch' ? '齐奥尔科夫斯基公式：Δv = ve · ln(m₀/m₁)' : mode === 'mission' ? '阿波罗计划的成败，取决于选对了登月方案' : '霍曼转移窗口每 26 个月才有一次'">
    <!-- ══ 发射 ══ -->
    <svg v-if="mode === 'launch'" viewBox="0 0 460 224" :class="shake > 0.05 && phase === 'fly' ? 'demo-shake' : ''">
      <defs>
        <linearGradient id="rkSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#02040c" /><stop offset="0.6" stop-color="#060c1c" /><stop offset="1" stop-color="#12203a" />
        </linearGradient>
        <radialGradient id="rkFlame">
          <stop offset="0" stop-color="#fff6d8" /><stop offset="0.35" stop-color="#ffb347" stop-opacity="0.9" />
          <stop offset="1" stop-color="#ff5f56" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="rkBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#8a94a5" /><stop offset="0.4" stop-color="#f0f5fb" /><stop offset="1" stop-color="#5d6b83" />
        </linearGradient>
      </defs>
      <rect width="460" height="224" fill="url(#rkSky)" />
      <g v-for="i in 40" :key="i" opacity="0.7">
        <circle :cx="(i * 97) % 460" :cy="(i * 53) % 120" :r="i % 3 === 0 ? 1.3 : 0.8" fill="#cfe6ff" :opacity="0.3 + (i % 5) * 0.12" />
      </g>

      <!-- 高度标尺 -->
      <g>
        <line x1="414" y1="20" x2="414" y2="200" stroke="rgba(var(--tint),0.28)" />
        <g v-for="h in [0, 30, 60, 90, 120]" :key="h">
          <line x1="408" :y1="200 - h / 120 * 180" x2="420" :y2="200 - h / 120 * 180" stroke="rgba(var(--tint),0.3)" />
          <text x="404" :y="203 - h / 120 * 180" text-anchor="end" class="lbl" font-size="8.5">{{ h }}km</text>
        </g>
        <line x1="402" y1="50" x2="426" y2="50" stroke="#34d399" stroke-width="1.4" stroke-dasharray="3 2" />
        <text x="404" y="44" text-anchor="end" class="lbl" font-size="8" fill="#34d399">卡门线 100km</text>
      </g>

      <!-- 地面 -->
      <g v-if="alt < 8000">
        <rect x="0" y="200" width="460" height="24" fill="#1a1426" />
        <path d="M0,200 q60,-8 120,-2 t120,-4 t120,4 t100,-2 v28 h-460 z" fill="#161022" />
        <rect x="150" y="176" width="12" height="26" rx="2" fill="#39414f" />
        <rect x="196" y="176" width="12" height="26" rx="2" fill="#39414f" />
      </g>
      <g v-else>
        <path d="M0,214 Q230,182 460,214 L460,224 L0,224 Z" :fill="alt > 60000 ? '#1b3d5c' : '#22527a'" opacity="0.85" />
        <path d="M0,214 Q230,182 460,214" fill="none" stroke="#5cc8ff" stroke-width="1.2" opacity="0.55" />
      </g>

      <!-- 尾迹 -->
      <g v-if="phase === 'fly' || phase === 'orbit'">
        <rect v-for="(p, i) in trail" :key="i" :x="228 + (i % 3) * 1.5" :y="clamp(200 - (p.a / 120000) * 180, 20, 200)"
          width="4" height="3" rx="1.5" fill="#cfe6ff" :opacity="p.o * 0.4" />
      </g>

      <!-- 火箭 -->
      <g :transform="`translate(230,${rocketY})`">
        <ellipse v-if="phase === 'fly'" cx="0" :cy="30 + flame * 8" :rx="12 + flame * 9" :ry="22 + flame * 26" fill="url(#rkFlame)" :opacity="0.55 + flame * 0.45" />
        <path v-if="phase === 'fly'" :d="`M-5,26 q5,${18 + flame * 22} 5,${26 + flame * 30} q0,-${8 + flame * 22} 5,-${26 + flame * 30} z`" fill="#ffd166" opacity="0.9" />
        <!-- 箭体 -->
        <path d="M-8,26 L-8,-14 Q-8,-30 0,-38 Q8,-30 8,-14 L8,26 Z" fill="url(#rkBody)" stroke="#2b3444" stroke-width="1" />
        <rect x="-8" y="-6" width="16" height="5" fill="#ff5f56" opacity="0.8" />
        <path d="M-8,18 l-7,10 v-14 z M8,18 l7,10 v-14 z" fill="#5d6b83" stroke="#2b3444" stroke-width="0.8" />
        <!-- 级标记 -->
        <g v-for="s in stages" :key="s">
          <line x1="-8" :y1="26 - (s - 1) * (34 / stages)" x2="8" :y2="26 - (s - 1) * (34 / stages)"
            :stroke="dropped.includes(s - 1) ? '#fb7185' : '#4a5568'" stroke-width="1.2" stroke-dasharray="2 2" />
        </g>
        <text x="16" y="-24" class="lbl" font-size="8.5">第 {{ stageIdx + 1 }}/{{ stages }} 级</text>
      </g>
      <!-- 已抛掉的级 -->
      <g v-for="(d, i) in dropped" :key="'d' + d">
        <rect :x="196 - i * 22" :y="clamp(rocketY + 40 + i * 26, 40, 200)" width="14" height="20" rx="2"
          fill="#5d6b83" opacity="0.6" :transform="`rotate(${20 + i * 30} ${203 - i * 22} ${clamp(rocketY + 50 + i * 26, 50, 210)})`" />
      </g>

      <!-- 读数 -->
      <g transform="translate(20,20)">
        <rect x="-8" y="-14" width="150" height="86" rx="6" fill="rgba(var(--veil),0.82)" stroke="rgba(var(--tint),0.18)" />
        <text class="lbl" font-size="9">高度</text><text class="val" x="134" text-anchor="end" font-size="11">{{ (alt / 1000).toFixed(1) }} km</text>
        <text class="lbl" font-size="9" y="20">速度</text><text class="val" x="134" y="20" text-anchor="end" font-size="11" :fill="vel >= 7900 ? '#34d399' : undefined">{{ (vel / 1000).toFixed(2) }} km/s</text>
        <text class="lbl" font-size="9" y="40">质量</text><text class="val" x="134" y="40" text-anchor="end" font-size="11">{{ (mass / 1000).toFixed(0) }} t</text>
        <text class="lbl" font-size="9" y="60">Δv 预算</text><text class="val" x="134" y="60" text-anchor="end" font-size="11">{{ (dvTotal / 1000).toFixed(2) }} km/s</text>
        <rect x="0" y="66" width="134" height="5" rx="2.5" fill="rgba(var(--tint),0.12)" />
        <rect x="0" y="66" :width="clamp(mass / m0, 0, 1) * 134" height="5" rx="2.5" fill="#ffb347" />
      </g>
      <g v-if="phase === 'orbit'" transform="translate(230,120)">
        <text text-anchor="middle" font-size="16" font-weight="700" fill="#34d399" class="demo-flicker">✓ 进入轨道</text>
      </g>
      <g v-if="phase === 'crash'" transform="translate(230,120)">
        <text text-anchor="middle" font-size="16" font-weight="700" fill="#fb7185" class="demo-flicker">✕ 任务失败</text>
      </g>
    </svg>

    <!-- ══ 登月方案 ══ -->
    <svg v-else-if="mode === 'mission'" viewBox="0 0 460 224">
      <rect width="460" height="224" class="stage-bg" />
      <g v-for="i in 40" :key="i">
        <circle :cx="(i * 89) % 460" :cy="(i * 61) % 224" :r="i % 4 === 0 ? 1.3 : 0.8" fill="#cfe6ff" :opacity="0.25 + (i % 5) * 0.1" />
      </g>
      <!-- 地月示意 -->
      <circle cx="52" cy="84" r="24" fill="#2f6ea8" />
      <path d="M32,74 q12,-5 22,2 t20,-2" stroke="#7fc4a0" stroke-width="3.5" fill="none" opacity="0.6" />
      <text x="52" y="122" text-anchor="middle" class="lbl" font-size="9">地球</text>
      <circle cx="400" cy="42" r="13" fill="#9aa7bd" />
      <circle cx="396" cy="39" r="2.6" fill="#6f7f9c" opacity="0.7" />
      <circle cx="404" cy="46" r="1.7" fill="#6f7f9c" opacity="0.7" />
      <text x="400" y="20" text-anchor="middle" class="lbl" font-size="9">月球 · 38 万 km</text>

      <!-- 三种方案的轨道 -->
      <g v-if="plan === 'direct'">
        <path d="M52,84 Q230,-8 400,42" fill="none" stroke="#fb7185" stroke-width="2" stroke-dasharray="6 4" class="demo-flow" />
        <path d="M400,42 Q230,-8 52,84" fill="none" stroke="#fb7185" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.5" />
        <text x="230" y="16" text-anchor="middle" font-size="10" fill="#fb7185">整艘飞船直接往返</text>
      </g>
      <g v-if="plan === 'eor'">
        <ellipse cx="52" cy="84" rx="46" ry="27" fill="none" stroke="#ffb347" stroke-width="1.6" stroke-dasharray="5 4" />
        <path d="M98,76 Q250,0 400,42" fill="none" stroke="#ffb347" stroke-width="2" stroke-dasharray="6 4" class="demo-flow" />
        <g v-for="i in 3" :key="i">
          <rect :x="20 + i * 24" :y="58 - i * 5" width="12" height="7" rx="2" fill="#8a94a5" />
        </g>
        <text x="230" y="16" text-anchor="middle" font-size="10" fill="#ffb347">先在近地轨道组装、加注，再出发</text>
      </g>
      <g v-if="plan === 'lor'">
        <path d="M52,84 Q230,-4 388,38" fill="none" stroke="#34d399" stroke-width="2" stroke-dasharray="6 4" class="demo-flow" />
        <ellipse cx="400" cy="42" rx="26" ry="15" fill="none" stroke="#34d399" stroke-width="1.4" stroke-dasharray="4 3" />
        <path d="M386,54 q-7,18 5,26" fill="none" stroke="#8fd0ff" stroke-width="1.6" />
        <path d="M391,80 q9,7 4,-16" fill="none" stroke="#8fd0ff" stroke-width="1.6" stroke-dasharray="3 2" />
        <g transform="translate(384,82)"><rect x="-6" y="-4" width="12" height="8" rx="2" fill="#c9d6e8" /><path d="M-8,4 h16" stroke="#8a94a5" stroke-width="2" /></g>
        <g transform="translate(424,32)"><rect x="-4" y="-3.5" width="8" height="7" rx="2" fill="#ffd166" /></g>
        <text x="228" y="16" text-anchor="middle" font-size="10" fill="#34d399">指令舱留轨等待，只有小登月舱下去</text>
      </g>

      <!-- 对比条 -->
      <g transform="translate(84,126)">
        <text class="lbl" font-size="9">起飞质量（吨）· 三方案对比</text>
        <g v-for="(p, i) in PLANS" :key="p.k" style="cursor:pointer" @click="plan = p.k">
          <text :class="p.k === plan ? 'lbl-hi' : 'lbl'" font-size="9" :y="18 + i * 17">{{ p.n }}</text>
          <rect x="64" :y="10 + i * 17" width="140" height="8" rx="3" fill="rgba(var(--tint),0.1)" />
          <rect x="64" :y="10 + i * 17" :width="p.mass / 8000 * 140" height="8" rx="3"
            :fill="p.k === plan ? (p.ok ? '#34d399' : '#ffb347') : 'rgba(var(--tint),0.28)'" />
          <text class="val" font-size="9.5" x="210" :y="18 + i * 17">{{ p.mass }}t · Δv {{ p.dv }} · 风险{{ p.risk }}</text>
        </g>
        <text class="lbl" font-size="8.5" y="76">点任意一行或下方按钮切换方案；绿色为 1962 年最终采纳的方案</text>
      </g>
    </svg>

    <!-- ══ 火星 ══ -->
    <svg v-else viewBox="0 0 460 224">
      <rect width="460" height="224" class="stage-bg" />
      <g v-for="i in 46" :key="i">
        <circle :cx="(i * 83) % 460" :cy="(i * 47) % 224" :r="i % 4 === 0 ? 1.3 : 0.7" fill="#cfe6ff" :opacity="0.25 + (i % 5) * 0.1" />
      </g>
      <!-- 太阳 -->
      <circle cx="60" cy="120" r="16" fill="#ffd166" opacity="0.85" />
      <circle cx="60" cy="120" r="26" fill="#ffd166" opacity="0.16" />
      <!-- 轨道 -->
      <ellipse cx="60" cy="120" rx="86" ry="82" fill="none" stroke="rgba(92,200,255,0.35)" stroke-width="1.2" />
      <ellipse cx="60" cy="120" rx="164" ry="150" fill="none" stroke="rgba(255,138,61,0.3)" stroke-width="1.2" />
      <!-- 地球 -->
      <g :transform="`translate(${60 + Math.cos(marsAngle * 0.02) * 86},${120 + Math.sin(marsAngle * 0.02) * 82})`">
        <circle r="7" fill="#2f6ea8" /><circle r="7" fill="#7fc4a0" opacity="0.35" />
      </g>
      <!-- 火星（按相位角摆放） -->
      <g :transform="`translate(${60 + Math.cos((marsAngle * 0.0107 + phaseAngle) * Math.PI / 180 * 4) * 164},${120 + Math.sin((marsAngle * 0.0107 + phaseAngle) * Math.PI / 180 * 4) * 150})`">
        <circle r="6" fill="#c1552f" /><circle cx="-2" cy="-2" r="1.6" fill="#8a3a1e" opacity="0.7" />
      </g>
      <!-- 霍曼转移椭圆 -->
      <path v-if="transferOk" d="M146,120 A125,116 0 0 1 214,42" fill="none" stroke="#34d399" stroke-width="2" stroke-dasharray="7 5" class="demo-flow" />
      <path v-else d="M146,120 A150,140 0 0 1 250,60" fill="none" stroke="#fb7185" stroke-width="1.8" stroke-dasharray="4 6" opacity="0.7" />
      <text x="212" y="26" class="lbl" font-size="9.5" :fill="transferOk ? '#34d399' : '#fb7185'">
        {{ transferOk ? '✓ 霍曼转移轨道 · 约 8 个月' : '✕ 相位角不对，燃料不够' }}
      </text>
      <text x="286" y="120" class="lbl" font-size="9">相位角 {{ phaseAngle.toFixed(0) }}°（最佳 ≈ 44°）</text>
      <text x="286" y="136" class="lbl" font-size="9">发射窗口每 26 个月一次</text>

      <!-- 恐怖七分钟 -->
      <g transform="translate(20,150)">
        <text class="lbl" font-size="9">恐怖七分钟：按顺序点选减速步骤</text>
        <g v-for="(s, i) in EDL" :key="s.n" :transform="`translate(${i * 84},14)`" style="cursor:pointer" @click="edlGo(i)">
          <rect width="76" height="46" rx="5"
            :fill="edl >= i ? 'rgba(52,211,153,0.14)' : 'rgba(var(--tint),0.05)'"
            :stroke="edl === i ? '#34d399' : 'rgba(var(--tint),0.18)'" stroke-width="1.2" />
          <text x="8" y="15" class="lbl" font-size="8" :fill="edl >= i ? '#34d399' : '#64809f'">STEP {{ i + 1 }}</text>
          <text x="8" y="29" class="lbl-hi" font-size="9.5">{{ s.n }}</text>
          <text x="8" y="41" class="val" font-size="8.5">→ {{ s.v }} m/s</text>
        </g>
      </g>
    </svg>

    <template #ctrl>
      <template v-if="mode === 'launch'">
        <button class="demo-btn demo-btn--big" @click="launch" :disabled="phase === 'fly'">🚀 {{ phase === 'idle' ? '发射' : '重新发射' }}</button>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">推力 <b>{{ thrust }}kN</b></span>
          <input class="demo-slider" type="range" min="1000" max="16000" step="100" v-model.number="thrust" @input="touch('tick', 0.2)">
        </div>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">燃料占比 <b>{{ Math.round(fuelRatio * 100) }}%</b></span>
          <input class="demo-slider" type="range" min="0.6" max="0.95" step="0.01" v-model.number="fuelRatio" @input="touch('tick', 0.2)">
        </div>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">级数 <b>{{ stages }}</b></span>
          <input class="demo-slider" style="width:70px" type="range" min="1" max="4" step="1" v-model.number="stages" @input="touch('unlock', 0.4)">
        </div>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">比冲 <b>{{ isp }}s</b></span>
          <input class="demo-slider" style="width:80px" type="range" min="220" max="460" step="5" v-model.number="isp" @input="touch('tick', 0.2)">
        </div>
        <div class="demo-ctrl__spacer" />
        <div class="demo-meter"><span class="demo-meter__k">推重比</span><span class="demo-meter__v" :style="{ color: twr < 1 ? 'var(--c-rose)' : undefined }">{{ twr.toFixed(2) }}</span></div>
        <div class="demo-meter"><span class="demo-meter__k">Δv</span><span class="demo-meter__v">{{ (dvTotal / 1000).toFixed(2) }}</span><span class="demo-meter__k">km/s</span></div>
        <button class="demo-btn demo-btn--ghost" @click="reset">↺ 复位</button>
      </template>

      <template v-else-if="mode === 'mission'">
        <button v-for="p in PLANS" :key="p.k" class="demo-btn" :class="{ 'demo-btn--on': plan === p.k }"
          @click="plan = p.k; touch(p.ok ? 'correct' : 'page')">{{ p.n }}</button>
        <div class="demo-ctrl__spacer" />
        <div class="demo-meter"><span class="demo-meter__k">起飞质量</span><span class="demo-meter__v">{{ curPlan.mass }}t</span></div>
        <div class="demo-meter"><span class="demo-meter__k">Δv</span><span class="demo-meter__v">{{ curPlan.dv }}</span><span class="demo-meter__k">km/s</span></div>
        <div class="demo-meter"><span class="demo-meter__k">风险</span><span class="demo-meter__v">{{ curPlan.risk }}</span></div>
      </template>

      <template v-else>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">发射相位角 <b>{{ phaseAngle.toFixed(0) }}°</b></span>
          <input class="demo-slider" style="width:170px" type="range" min="0" max="180" step="1" v-model.number="phaseAngle" @input="touch('tick', 0.2)">
        </div>
        <button class="demo-btn" :disabled="!transferOk" @click="edlGo(0); touch('whoosh')">🛰 进入转移轨道</button>
        <div class="demo-ctrl__spacer" />
        <div class="demo-meter">
          <span class="demo-meter__k">着陆进度</span>
          <span class="demo-meter__v">{{ edl + 1 }}/5</span>
          <span class="demo-meter__bar"><span class="demo-meter__fill" :style="{ width: ((edl + 1) / 5 * 100) + '%' }" /></span>
        </div>
        <button class="demo-btn demo-btn--ghost" @click="edl = -1; touch('cancel')">↺ 重来</button>
      </template>
    </template>
  </DemoFrame>
</template>
