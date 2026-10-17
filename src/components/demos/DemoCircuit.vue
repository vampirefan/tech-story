<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, approach, clamp, useAutoDemo, seg, lerp, smooth } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const mode = ref<'induction' | 'circuit'>('induction')
const t = ref(0)

/* ══ 电磁感应 ══ */
const turns = ref(30)
const magX = ref(96)          // 磁铁位置
const dragging = ref(false)
const emf = ref(0)
const needle = ref(0)
let lastX = 96

const flux = (x: number) => Math.exp(-((x - 240) ** 2) / 2600)

useRaf((dt) => {
  t.value += dt
  if (mode.value === 'induction') {
    const v = (magX.value - lastX) / Math.max(dt, 1e-3)
    lastX = magX.value
    const dFlux = (flux(magX.value) - flux(magX.value - v * dt)) / Math.max(dt, 1e-3)
    emf.value = approach(emf.value, clamp(-dFlux * turns.value * 2.4, -6, 6), dt, 9)
    needle.value = approach(needle.value, emf.value, dt, 7)
  } else {
    dash.value = (dash.value - current.value * dt * 130) % 24
  }
})

function onDown(e: PointerEvent) {
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!dragging.value) return
  const svg = (e.currentTarget as SVGSVGElement)
  const r = svg.getBoundingClientRect()
  magX.value = clamp(((e.clientX - r.left) / r.width) * 460, 60, 400)
  touch('tick', 0.12)
}
function sweep() {
  // 自动来回穿一次线圈
  const start = magX.value
  const seq = [400, 96, 400]
  let i = 0
  const step = () => {
    if (i >= seq.length) return
    magX.value = approach(magX.value, seq[i], 0.06, 4)
    if (Math.abs(magX.value - seq[i]) < 3) i++
    requestAnimationFrame(step)
  }
  magX.value = start
  requestAnimationFrame(step)
  touch('whoosh')
}

/* ══ 电路 ══ */
const wiring = ref<'series' | 'parallel'>('series')
const volt = ref(9)
const loose = ref(false)      // 拧松 2 号灯泡
const dash = ref(0)
const closed = ref(true)

const RB = 6
const r1 = 1
const r2 = computed(() => (loose.value ? Infinity : 1))
const totalR = computed(() => {
  if (!closed.value) return Infinity
  if (wiring.value === 'series') return RB * (r1 + (r2.value === Infinity ? Infinity : r2.value))
  const a = 1 / RB * r1
  const b = r2.value === Infinity ? 0 : 1 / RB
  return 1 / (a + b)
})
const current = computed(() => totalR.value === Infinity ? 0 : volt.value / totalR.value)
const i1 = computed(() => !closed.value || !r1 ? 0 : wiring.value === 'series' ? current.value : (volt.value / RB) * r1)
const i2 = computed(() => (!closed.value || !r2.value) ? 0 : wiring.value === 'series' ? current.value : volt.value / RB)
const p1 = computed(() => i1.value * i1.value * RB)
const p2 = computed(() => i2.value * i2.value * RB)
const bright = (p: number) => clamp(p / 14, 0, 1)

const seriesPath = 'M120,96 H188 M292,96 H340 M340,96 V168 M120,96 V168 M120,168 H188 M292,168 H340'
const parallelPath = 'M120,132 H188 M292,132 H340 M340,132 V72 M340,132 V192 M120,132 V72 H188 M120,132 V192 H188 M292,72 H340 M292,192 H340'

/* 自动演示：磁铁来回穿线圈 → 加匝数 → 串联 / 并联与开关通断 */
useAutoDemo((t) => {
  const s = seg(t, 15, 17)
  if (s.i === 0) {
    mode.value = 'induction'
    magX.value = 248 + Math.sin(t * 1.05) * 150
    turns.value = Math.round(lerp(12, 110, smooth(s.p)))
  } else {
    mode.value = 'circuit'
    wiring.value = s.p < 0.42 ? 'series' : 'parallel'
    volt.value = Math.round(lerp(3, 24, smooth(clamp(s.p / 0.9, 0, 1))) * 2) / 2
    loose.value = s.p > 0.52 && s.p < 0.74
    closed.value = !(s.p > 0.84 && s.p < 0.94)
  }
}, 32)

const status = computed(() => {
  if (mode.value === 'induction') {
    if (Math.abs(emf.value) < 0.12) return { text: '磁铁不动 → 磁通量不变 → 没有感应电流。电流计指针停在 0。必须是"变化"才有电！' }
    return { text: `磁铁在动！感应电动势 ${emf.value.toFixed(2)} V，方向由"阻碍磁通变化"决定（楞次定律），所以推进和拉出时指针偏向相反。`, kind: 'good' as const }
  }
  if (!closed.value) return { text: '开关断开 → 回路不闭合 → 电流为 0，两只灯泡都不亮。', kind: 'warn' as const }
  if (wiring.value === 'series') {
    if (loose.value) return { text: '串联电路一处断开，整条路都没了电流 —— 两只灯全灭。老式圣诞彩灯就是这样，坏一颗全串不亮。', kind: 'warn' as const }
    return { text: `串联：总电阻 ${totalR.value.toFixed(0)}Ω，电流只有 ${current.value.toFixed(2)}A，两只灯分摊电压，各 ${(volt.value / 2).toFixed(1)}V，都很暗。` }
  }
  if (loose.value) return { text: `并联：2 号灯拧松了，1 号灯照样 ${volt.value.toFixed(0)}V 满亮度工作 —— 各支路互不影响。家里的插座就是这个道理。`, kind: 'good' as const }
  const seriesP = (volt.value / 2) ** 2 / RB
  return { text: `并联：每只灯都拿到全部 ${volt.value.toFixed(0)}V，各 ${(volt.value / RB).toFixed(2)}A，总电流 ${current.value.toFixed(2)}A。单只灯功率是串联时的 ${(p1.value / Math.max(0.01, seriesP)).toFixed(1)} 倍 —— 亮得多。`, kind: 'good' as const }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="⚡" color="var(--cat-computation)" :status="status">
    <template #head-right>
      <div class="demo-ctrl__group" style="gap:4px">
        <button class="demo-btn" :class="{ 'demo-btn--on': mode === 'induction' }" style="padding:4px 10px;font-size:11.5px"
          @click="mode = 'induction'; touch('page')">🧲 电磁感应</button>
        <button class="demo-btn" :class="{ 'demo-btn--on': mode === 'circuit' }" style="padding:4px 10px;font-size:11.5px"
          @click="mode = 'circuit'; touch('page')">💡 串联 / 并联</button>
      </div>
    </template>

    <!-- ══ 感应 ══ -->
    <svg v-if="mode === 'induction'" viewBox="0 0 460 224" style="touch-action:none;cursor:ew-resize"
      @pointerdown="onDown" @pointermove="onMove" @pointerup="dragging = false" @pointercancel="dragging = false">
      <defs>
        <linearGradient id="ciMag" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ff5f56" /><stop offset="0.5" stop-color="#ff5f56" />
          <stop offset="0.5" stop-color="#5cc8ff" /><stop offset="1" stop-color="#5cc8ff" />
        </linearGradient>
      </defs>
      <rect width="460" height="224" class="stage-bg" />

      <!-- 磁力线 -->
      <g :opacity="0.55">
        <path v-for="i in 7" :key="i"
          :d="`M${magX + 30},${112} C ${magX + 30 + i * 16},${112 - i * 15} ${magX - 30 - i * 16},${112 - i * 15} ${magX - 30},112`"
          fill="none" stroke="#8fd0ff" stroke-width="1" stroke-dasharray="4 4" :opacity="1 - i * 0.11" />
        <path v-for="i in 7" :key="'b' + i"
          :d="`M${magX + 30},${112} C ${magX + 30 + i * 16},${112 + i * 15} ${magX - 30 - i * 16},${112 + i * 15} ${magX - 30},112`"
          fill="none" stroke="#8fd0ff" stroke-width="1" stroke-dasharray="4 4" :opacity="1 - i * 0.11" />
      </g>

      <!-- 线圈 -->
      <g>
        <rect x="216" y="66" width="48" height="92" rx="6" fill="rgba(20,32,58,0.65)" stroke="rgba(var(--tint),0.3)" />
        <g v-for="i in Math.min(turns, 26)" :key="i">
          <ellipse cx="240" cy="112" :rx="16 + (i % 5) * 2.2" :ry="42 - (i % 3) * 1.5" fill="none"
            stroke="#d8a44a" stroke-width="1.5" :opacity="0.28 + (i % 4) * 0.12" />
        </g>
        <text x="240" y="58" text-anchor="middle" class="lbl">线圈 · {{ turns }} 匝</text>
      </g>

      <!-- 磁铁 -->
      <g :transform="`translate(${magX},112)`">
        <rect x="-30" y="-13" width="60" height="26" rx="3" fill="url(#ciMag)" stroke="#1a2233" stroke-width="1.2" />
        <text x="-15" y="5" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">N</text>
        <text x="15" y="5" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">S</text>
        <path v-if="Math.abs(emf) > 0.2" :d="emf > 0 ? 'M36,0 l14,-6 v12 z' : 'M-36,0 l-14,-6 v12 z'" fill="#ffd166" opacity="0.8" />
      </g>

      <!-- 引线到电流计 -->
      <path d="M216,150 v22 h-40 M264,150 v22 h40" fill="none" stroke="#d8a44a" stroke-width="2" />
      <path d="M176,172 h-40 v14 M304,172 h40 v14" fill="none" stroke="#d8a44a" stroke-width="2" />

      <!-- 电流计 -->
      <g transform="translate(230,196)">
        <rect x="-58" y="-14" width="116" height="26" rx="6" fill="#0a1220" stroke="#a9822f" stroke-width="1.6" />
        <path d="M-44,-2 A44,44 0 0 1 44,-2" fill="none" stroke="rgba(var(--tint),0.25)" stroke-width="1.4" />
        <g v-for="i in 9" :key="i">
          <line :x1="Math.cos(Math.PI + (i - 1) / 8 * Math.PI) * 40" :y1="-2 + Math.sin(Math.PI + (i - 1) / 8 * Math.PI) * 40"
            :x2="Math.cos(Math.PI + (i - 1) / 8 * Math.PI) * 44" :y2="-2 + Math.sin(Math.PI + (i - 1) / 8 * Math.PI) * 44"
            stroke="rgba(var(--tint),0.45)" stroke-width="1" />
        </g>
        <line x1="0" y1="-2" :x2="Math.sin(needle / 6 * 1.2) * 40" :y2="-2 - Math.cos(needle / 6 * 1.2) * 40"
          :stroke="Math.abs(needle) > 0.2 ? '#ffd166' : '#8fd0ff'" stroke-width="2.2" stroke-linecap="round" />
        <circle cx="0" cy="-2" r="3" fill="#a9822f" />
        <text y="24" text-anchor="middle" class="val" font-size="10">{{ emf.toFixed(2) }} V</text>
        <text x="-96" y="4" class="lbl" font-size="9">电流计</text>
      </g>

      <!-- 提示 -->
      <text x="20" y="30" class="lbl" font-size="10">← 拖动磁铁穿过线圈 →</text>
      <text x="440" y="30" text-anchor="end" class="val" font-size="11">磁通量 Φ = {{ flux(magX).toFixed(2) }}</text>
    </svg>

    <!-- ══ 电路 ══ -->
    <svg v-else viewBox="0 0 460 224">
      <defs>
        <radialGradient id="ciGlow">
          <stop offset="0" stop-color="#fff6d8" stop-opacity="0.95" />
          <stop offset="0.5" stop-color="#ffd166" stop-opacity="0.5" />
          <stop offset="1" stop-color="#ffb347" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="460" height="224" class="stage-bg" />

      <!-- 导线 -->
      <g>
        <path :d="wiring === 'series' ? seriesPath : parallelPath" fill="none" stroke="#39414f" stroke-width="6" stroke-linecap="round" />
        <path v-if="current > 0" :d="wiring === 'series' ? seriesPath : parallelPath" fill="none"
          stroke="#5cc8ff" stroke-width="3" stroke-linecap="round" stroke-dasharray="7 17" :stroke-dashoffset="dash" opacity="0.95" />
      </g>

      <!-- 电源 -->
      <g transform="translate(108,132)">
        <rect x="-16" y="-26" width="32" height="52" rx="4" fill="#1b212b" stroke="#4a5568" stroke-width="1.4" />
        <line x1="-10" y1="-12" x2="10" y2="-12" stroke="#ffd166" stroke-width="3" />
        <line x1="-5" y1="-4" x2="5" y2="-4" stroke="#8fd0ff" stroke-width="1.6" />
        <line x1="-10" y1="4" x2="10" y2="4" stroke="#ffd166" stroke-width="3" />
        <line x1="-5" y1="12" x2="5" y2="12" stroke="#8fd0ff" stroke-width="1.6" />
        <text y="-34" text-anchor="middle" class="lbl" font-size="9">{{ volt.toFixed(0) }}V</text>
      </g>

      <!-- 开关 -->
      <g transform="translate(154,96)" v-if="wiring === 'series'">
        <circle cx="0" cy="0" r="3.4" fill="#a9822f" /><circle cx="34" cy="0" r="3.4" fill="#a9822f" />
        <line x1="0" y1="0" :x2="closed ? 34 : 26" :y2="closed ? 0 : -18" stroke="#d8a44a" stroke-width="3"
          style="transition:all .25s cubic-bezier(.34,1.56,.64,1)" />
        <text x="17" y="-24" text-anchor="middle" class="lbl" font-size="9">开关</text>
      </g>

      <!-- 灯泡 -->
      <g v-for="(b, i) in [{ x: 240, y: wiring === 'series' ? 96 : 72, p: p1, on: i1 > 0.01 },
        { x: 240, y: wiring === 'series' ? 168 : 192, p: p2, on: i2 > 0.01 && !loose }]" :key="i">
        <circle v-if="b.on" :cx="b.x" :cy="b.y" :r="16 + bright(b.p) * 26" fill="url(#ciGlow)" :opacity="0.3 + bright(b.p) * 0.7" />
        <circle :cx="b.x" :cy="b.y" r="15" :fill="b.on ? `rgba(255,209,102,${0.25 + bright(b.p) * 0.7})` : 'rgba(30,40,58,0.9)'"
          stroke="#8a94a5" stroke-width="1.6" />
        <path :d="`M${b.x - 7},${b.y + 8} q3,-8 7,-4 q4,4 7,-4`" :stroke="b.on ? '#fff6d8' : '#5d6b83'" stroke-width="1.6" fill="none" />
        <rect :x="b.x - 6" :y="b.y + 12" width="12" height="7" rx="1.5" fill="#a9822f" />
        <text :x="b.x" :y="b.y - 22" text-anchor="middle" class="lbl" font-size="9">灯 {{ i + 1 }}</text>
        <text :x="b.x + 26" :y="b.y + 4" class="val" font-size="9.5">{{ b.on ? b.p.toFixed(1) + 'W' : '0W' }}</text>
        <g v-if="i === 1 && loose">
          <line :x1="b.x - 18" :y1="b.y - 18" x2="b.x + 18" :y2="b.y + 18" stroke="#fb7185" stroke-width="2" />
          <text :x="b.x" :y="b.y + 34" text-anchor="middle" font-size="9" fill="#fb7185">已拧松（断路）</text>
        </g>
      </g>

      <!-- 读数 -->
      <g transform="translate(356,60)">
        <rect x="-8" y="-20" width="106" height="106" rx="6" fill="rgba(var(--veil),0.85)" stroke="rgba(var(--tint),0.18)" />
        <text class="lbl" font-size="9" x="0" y="-6">回路读数</text>
        <text class="lbl" font-size="10" x="0" y="14">电压</text><text class="val" x="90" y="14" text-anchor="end">{{ volt.toFixed(1) }} V</text>
        <text class="lbl" font-size="10" x="0" y="34">总电阻</text><text class="val" x="90" y="34" text-anchor="end">{{ totalR === Infinity ? '∞' : totalR.toFixed(1) + ' Ω' }}</text>
        <text class="lbl" font-size="10" x="0" y="54">总电流</text><text class="val" x="90" y="54" text-anchor="end">{{ current.toFixed(2) }} A</text>
        <text class="lbl" font-size="10" x="0" y="74">总功率</text><text class="val" x="90" y="74" text-anchor="end">{{ (p1 + p2).toFixed(1) }} W</text>
      </g>
      <text x="20" y="212" class="lbl" font-size="9.5">蓝色虚线 = 电子流动方向（约定电流方向与之相反）· 流动快慢表示电流大小</text>
    </svg>

    <template #ctrl>
      <template v-if="mode === 'induction'">
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">线圈匝数 <b>{{ turns }}</b></span>
          <input class="demo-slider" type="range" min="4" max="120" step="1" v-model.number="turns" @input="touch('tick', 0.2)">
        </div>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">磁铁位置 <b>{{ Math.round(magX) }}</b></span>
          <input class="demo-slider" style="width:170px" type="range" min="60" max="400" step="1" v-model.number="magX" @input="touch('tick', 0.14)">
        </div>
        <button class="demo-btn" @click="sweep">↔ 自动穿一次</button>
        <div class="demo-ctrl__spacer" />
        <div class="demo-meter"><span class="demo-meter__k">感应电动势</span><span class="demo-meter__v">{{ emf.toFixed(2) }}V</span></div>
      </template>

      <template v-else>
        <div class="demo-ctrl__group">
          <button class="demo-btn" :class="{ 'demo-btn--on': wiring === 'series' }" @click="wiring = 'series'; touch('click')">串联</button>
          <button class="demo-btn" :class="{ 'demo-btn--on': wiring === 'parallel' }" @click="wiring = 'parallel'; touch('click')">并联</button>
        </div>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">开关闭合</span>
          <button class="demo-toggle" :class="{ 'is-on': closed }" @click="closed = !closed; touch(closed ? 'power' : 'cancel')" />
        </div>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">拧松 2 号灯</span>
          <button class="demo-toggle" :class="{ 'is-on': loose }" @click="loose = !loose; touch(loose ? 'wrong' : 'confirm')" />
        </div>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">电源电压 <b>{{ volt.toFixed(1) }}V</b></span>
          <input class="demo-slider" type="range" min="1.5" max="24" step="0.5" v-model.number="volt" @input="touch('tick', 0.2)">
        </div>
        <div class="demo-ctrl__spacer" />
        <div class="demo-meter"><span class="demo-meter__k">灯1</span><span class="demo-meter__v">{{ p1.toFixed(1) }}W</span></div>
        <div class="demo-meter"><span class="demo-meter__k">灯2</span><span class="demo-meter__v">{{ p2.toFixed(1) }}W</span></div>
      </template>
    </template>
  </DemoFrame>
</template>
