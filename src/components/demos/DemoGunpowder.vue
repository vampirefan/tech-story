<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, clamp } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const OPT = { k: 75, s: 10, c: 15 }
const kRaw = ref(70)
const sRaw = ref(12)
const cRaw = ref(18)
const confined = ref(true)
const barrel = ref(0.9)   // m
const charge = ref(0.6)   // 装药量

const total = computed(() => Math.max(1, kRaw.value + sRaw.value + cRaw.value))
const k = computed(() => kRaw.value / total.value * 100)
const s = computed(() => sRaw.value / total.value * 100)
const c = computed(() => cRaw.value / total.value * 100)

/** 与最佳配比的偏离 → 燃烧效率 */
const score = computed(() => {
  const dev = (Math.abs(k.value - OPT.k) * 1.1 + Math.abs(s.value - OPT.s) * 1.6 + Math.abs(c.value - OPT.c) * 1.4) / 100
  return clamp(1 - dev * 1.35, 0.04, 1)
})
const burnRate = computed(() => score.value * (confined.value ? 1.9 : 1) * (0.5 + charge.value))
/** 枪管越长做功越久，但过长后摩擦与压降反而拖累 */
const muzzle = computed(() => {
  const L = barrel.value
  const gain = Math.sqrt(L) * (1 - 0.22 * Math.max(0, L - 1.1))
  return confined.value ? score.value * charge.value * gain * 620 : 0
})

/* 点火时序 */
const phase = ref<'idle' | 'flash' | 'run'>('idle')
const pt = ref(0)
const ballX = ref(0)
const ballV = ref(0)
const shake = ref(0)
const smoke = ref<{ x: number; y: number; r: number; a: number; vx: number; vy: number }[]>([])

useRaf((dt) => {
  if (phase.value === 'idle') { shake.value = Math.max(0, shake.value - dt * 3); return }
  pt.value += dt
  if (phase.value === 'flash' && pt.value > 0.1) {
    phase.value = 'run'
    pt.value = 0
    ballV.value = muzzle.value / 60
    smoke.value = Array.from({ length: 12 }, (_, i) => ({
      x: 168, y: 128, r: 5 + Math.random() * 9, a: 0.75,
      vx: -26 - Math.random() * 40 - i, vy: -14 + Math.random() * 26
    }))
  }
  if (phase.value === 'run') {
    ballX.value += ballV.value * dt * 60
    ballV.value *= 1 - dt * 0.22
    shake.value = Math.max(0, 1 - pt.value * 2.4)
    for (const p of smoke.value) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += 16 * dt; p.a -= dt * 0.5 }
    smoke.value = smoke.value.filter(p => p.a > 0)
    if (pt.value > 2.6) phase.value = 'idle'
  }
})

function ignite() {
  if (phase.value !== 'idle') return
  phase.value = 'flash'
  pt.value = 0
  ballX.value = 0
  touch(confined.value ? 'alarm' : 'spark')
}
function reset() { phase.value = 'idle'; ballX.value = 0; smoke.value = []; touch('cancel') }

const status = computed(() => {
  if (phase.value !== 'idle') {
    if (!confined.value) return { text: `开放燃烧：气体向四面八方膨胀，几乎不做功 —— 这就是"烟花"而不是"枪炮"。`, kind: 'warn' as const }
    return { text: `密闭膨胀！燃气把弹丸推到 ${Math.round(muzzle.value)} m/s（约 ${Math.round(muzzle.value / 340 * 10) / 10} 倍音速），同时炮身向后坐 —— 作用力与反作用力。`, kind: 'good' as const }
  }
  if (score.value > 0.9) return { text: `配比 ${k.value.toFixed(0)}:${s.value.toFixed(0)}:${c.value.toFixed(0)}，非常接近最佳 75:10:15。点上火试试。`, kind: 'good' as const }
  if (k.value < 55) return { text: '硝石（氧化剂）太少了 —— 没有它，燃烧拿不到足够的氧，只会闷烧。' , kind: 'warn' as const }
  if (c.value > 34) return { text: '木炭太多，烧得慢、烟大、威力小。木炭是燃料，硝石才是"自带氧气"的关键。', kind: 'warn' as const }
  if (s.value < 5) return { text: '硫磺的作用是降低着火点、加快反应。少了它，火药不容易点着。' }
  return { text: `当前配比 ${k.value.toFixed(0)}:${s.value.toFixed(0)}:${c.value.toFixed(0)}，燃烧效率 ${(score.value * 100).toFixed(0)}%。目标是 75:10:15。` }
})

const barH = (v: number, opt: number) => ({ h: clamp(v / 90 * 96, 3, 96), optY: 132 - clamp(opt / 90 * 96, 3, 96) })
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="💥" color="var(--cat-conflict)" :status="status" note="最佳配比：硝石 75% · 硫磺 10% · 木炭 15%">
    <svg viewBox="0 0 460 220" :class="shake > 0.05 ? 'demo-shake' : ''">
      <defs>
        <radialGradient id="gpFlash">
          <stop offset="0" stop-color="#fff6d8" stop-opacity="1" />
          <stop offset="0.35" stop-color="#ffb347" stop-opacity="0.85" />
          <stop offset="1" stop-color="#ff5f56" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="gpBarrel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7b6a4a" /><stop offset="0.4" stop-color="#4a3d28" /><stop offset="1" stop-color="#241d12" />
        </linearGradient>
      </defs>
      <rect width="460" height="220" fill="#060c1c" />
      <rect x="0" y="168" width="460" height="52" fill="#141021" />
      <line x1="0" y1="168" x2="460" y2="168" stroke="#3a2b46" stroke-width="1.4" />

      <!-- 配比柱状图 -->
      <g transform="translate(16,26)">
        <text class="lbl" x="0" y="-8">配比（自动归一化到 100%）</text>
        <g v-for="(b, i) in [{ v: k, n: '硝石', c: '#8fd0ff', o: 75 }, { v: s, n: '硫磺', c: '#ffd166', o: 10 }, { v: c, n: '木炭', c: '#a8946a', o: 15 }]" :key="b.n">
          <rect :x="i * 34" y="0" width="24" height="96" rx="3" fill="rgba(120,190,255,0.07)" />
          <rect :x="i * 34 + 2" :y="96 - barH(b.v, b.o).h" width="20" :height="barH(b.v, b.o).h" rx="2" :fill="b.c" :opacity="0.85" />
          <line :x1="i * 34 - 2" :y1="barH(b.v, b.o).optY" :x2="i * 34 + 26" :y2="barH(b.v, b.o).optY" stroke="#fb7185" stroke-width="1.4" stroke-dasharray="3 2" />
          <text :x="i * 34 + 12" y="110" text-anchor="middle" class="lbl" font-size="9.5">{{ b.n }}</text>
          <text :x="i * 34 + 12" y="122" text-anchor="middle" class="val" font-size="9.5">{{ b.v.toFixed(0) }}%</text>
        </g>
      </g>

      <!-- 场景 -->
      <g v-if="!confined">
        <!-- 开放燃烧：一堆火药 -->
        <path d="M196,166 q34,-22 68,0 z" fill="#4a4234" stroke="#2b2620" />
        <g v-for="i in 26" :key="i">
          <circle :cx="200 + ((i * 29) % 62)" :cy="158 + ((i * 17) % 8)" r="1.5" :fill="i % 3 === 0 ? '#ffd166' : (i % 3 === 1 ? '#8fd0ff' : '#6b5f4a')" />
        </g>
        <g v-if="phase !== 'idle'">
          <circle cx="230" cy="152" :r="18 + pt * 130 * score" fill="url(#gpFlash)" :opacity="clamp(1 - pt * 0.7, 0, 1)" />
          <g v-for="i in 16" :key="'s' + i">
            <line x1="230" y1="152"
              :x2="230 + Math.cos(i * 0.393 + pt) * (24 + pt * 190 * score)"
              :y2="152 + Math.sin(i * 0.393 + pt) * (24 + pt * 150 * score) - pt * 26"
              :stroke="i % 2 ? '#ffd166' : '#ff8a3d'" :stroke-width="2.2 - pt * 0.7" :opacity="clamp(1 - pt * 0.8, 0, 1)" stroke-linecap="round" />
          </g>
        </g>
        <text x="230" y="60" text-anchor="middle" class="lbl-hi">开放空间：只会"呼"地烧掉</text>
        <text x="230" y="80" text-anchor="middle" class="lbl">气体自由膨胀 → 不做功 → 烟花 / 信号</text>
      </g>

      <g v-else transform="translate(48,0)">
        <!-- 密闭：炮管 + 弹丸 -->
        <g :transform="`translate(${-shake * 12},0)`">
          <rect x="96" y="118" :width="72 + barrel * 130" height="26" rx="6" fill="url(#gpBarrel)" stroke="#171108" stroke-width="1.4" />
          <rect x="96" y="122" :width="72 + barrel * 130" height="5" rx="2" fill="#8a7a55" opacity="0.45" />
          <circle cx="104" cy="131" r="7" fill="#2b2116" stroke="#171108" />
          <rect :x="150 + barrel * 130" y="144" width="30" height="24" rx="3" fill="#3a2d19" />
          <circle :cx="165 + barrel * 130" cy="170" r="9" fill="#2b2116" stroke="#4a3d28" />
          <circle cx="126" cy="170" r="9" fill="#2b2116" stroke="#4a3d28" />
        </g>
        <!-- 药室 -->
        <rect x="100" y="122" width="26" height="18" rx="2" :fill="`rgba(255,179,71,${0.35 + score * 0.5})`" />
        <!-- 弹丸 -->
        <g v-if="phase === 'run'">
          <circle :cx="172 + barrel * 130 + ballX" cy="131" r="8" fill="#8b93a5" stroke="#39404f" stroke-width="1.2" />
          <circle :cx="172 + barrel * 130 + ballX" cy="131" r="8" fill="url(#gpFlash)" opacity="0.35" />
        </g>
        <circle v-else :cx="172 + barrel * 130" cy="131" r="8" fill="#8b93a5" stroke="#39404f" stroke-width="1.2" />
        <!-- 枪口焰 -->
        <g v-if="phase === 'run' && pt < 0.6">
          <circle :cx="176 + barrel * 130" cy="131" :r="14 + (0.6 - pt) * 46" fill="url(#gpFlash)" :opacity="clamp(1 - pt * 1.8, 0, 1)" />
        </g>
        <!-- 烟 -->
        <circle v-for="(p, i) in smoke" :key="i" :cx="p.x + barrel * 130" :cy="p.y" :r="p.r" fill="#9fb2cc" :opacity="p.a * 0.4" />
        <!-- 速度标尺 -->
        <g>
          <text x="180" y="46" class="lbl">初速</text>
          <rect x="180" y="52" width="200" height="9" rx="4" fill="rgba(120,190,255,0.1)" />
          <rect x="180" y="52" :width="clamp(muzzle / 900 * 200, 0, 200)" height="9" rx="4" fill="#ffb347" />
          <text x="180" y="78" class="val" font-size="13">{{ Math.round(muzzle) }} m/s</text>
          <text x="266" y="78" class="lbl">音速 340 m/s</text>
          <line x1="255" y1="52" x2="255" y2="61" stroke="#fb7185" stroke-width="1.4" />
        </g>
      </g>
    </svg>

    <template #ctrl>
      <button class="demo-btn demo-btn--big" :class="{ 'demo-btn--on': confined }"
        @click="confined = !confined; reset(); touch(confined ? 'power' : 'whoosh')">
        {{ confined ? '🔒 密闭（炮管）' : '🔓 开放（药堆）' }}
      </button>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">硝石 <b>{{ kRaw }}</b></span>
        <input class="demo-slider" type="range" min="0" max="100" step="1" v-model.number="kRaw" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">硫磺 <b>{{ sRaw }}</b></span>
        <input class="demo-slider" type="range" min="0" max="100" step="1" v-model.number="sRaw" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">木炭 <b>{{ cRaw }}</b></span>
        <input class="demo-slider" type="range" min="0" max="100" step="1" v-model.number="cRaw" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">装药量 <b>{{ Math.round(charge * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0.1" max="1" step="0.01" v-model.number="charge" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">管长 <b>{{ barrel.toFixed(2) }}m</b></span>
        <input class="demo-slider" type="range" min="0.2" max="1.8" step="0.01" v-model.number="barrel" @input="touch('tick', 0.2)" :disabled="!confined">
      </div>
      <div class="demo-ctrl__spacer" />
      <div class="demo-meter">
        <span class="demo-meter__k">燃烧效率</span>
        <span class="demo-meter__v">{{ Math.round(score * 100) }}%</span>
        <span class="demo-meter__bar"><span class="demo-meter__fill" :style="{ width: score * 100 + '%' }" /></span>
      </div>
      <div class="demo-meter">
        <span class="demo-meter__k">{{ confined ? '膛压' : '燃气外泄' }}</span>
        <span class="demo-meter__v">{{ confined ? (burnRate * 46).toFixed(0) + ' MPa' : '≈0' }}</span>
        <span class="demo-meter__bar"><span class="demo-meter__fill" :style="{ width: clamp(burnRate / 2.85 * 100, 0, 100) + '%' }" /></span>
      </div>
      <button class="demo-btn" @click="ignite" :disabled="phase !== 'idle'">🔥 点火</button>
      <button class="demo-btn demo-btn--ghost" @click="reset">↺ 复位</button>
    </template>
  </DemoFrame>
</template>
