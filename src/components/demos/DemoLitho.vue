<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, clamp, useAutoDemo, seg, lerp, smooth } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const STEPS = [
  { n: '涂胶', d: '在硅片上旋涂一层光刻胶（一种见光就会变性的树脂），厚度只有几百纳米。' },
  { n: '曝光', d: '紫外光穿过掩膜版（画着电路图案的"底片"），缩小题 4 倍投影到硅片上。被照到的胶发生化学变化。' },
  { n: '显影', d: '用显影液冲洗：正性胶被照到的部分溶解掉，图案就"复制"到了胶上。' },
  { n: '蚀刻', d: '用等离子体轰击没有胶保护的地方，把图案转移到下层的二氧化硅或金属上。' },
  { n: '掺杂', d: '把硼或磷离子打进裸露的硅里，改变它的导电类型 —— N 型和 P 区就是这样做出来的，晶体管的心脏。' },
  { n: '去胶', d: '洗掉剩下的光刻胶，一层电路就完成了。这样的过程要重复几十次，层层叠起来才是芯片。' }
]
const step = ref(-1)
const t = ref(0)
useRaf((dt) => { t.value += dt })

/** 掩膜版投影到硅片上的三个窗口 [x, 宽]，光束与蚀刻窗口共用 */
const WINDOWS: [number, number][] = [[146, 36], [242, 60], [318, 40]]

const WAVES = [
  { n: 'g 线', λ: 436, year: '1970s' },
  { n: 'i 线', λ: 365, year: '1980s' },
  { n: 'KrF', λ: 248, year: '1990s' },
  { n: 'ArF', λ: 193, year: '2000s' },
  { n: 'EUV', λ: 13.5, year: '2019+' }
]
const wi = ref(3)
const NA = ref(0.93)
const wave = computed(() => WAVES[wi.value])
/** 瑞利判据：最小线宽 = k₁·λ / NA */
const k1 = 0.32
const cd = computed(() => k1 * wave.value.λ / NA.value)
const density = computed(() => Math.round(1e6 / Math.max(cd.value * 2.4, 1) ** 2))
const layers = computed(() => cd.value < 20 ? 15 : cd.value < 60 ? 10 : 6)

function go(i: number) {
  if (i === step.value + 1) { step.value = i; touch(i === STEPS.length - 1 ? 'chime' : 'confirm') }
  else if (i <= step.value) { step.value = i; touch('tick', 0.4) }
  else touch('wrong')
}
const done = computed(() => step.value >= STEPS.length - 1)

/* 自动演示：六步做完一层电路，再把波长从 g 线一路推到 EUV */
useAutoDemo((t) => {
  const s = seg(t, 2, 4, 4, 4, 4, 4, 4, 8)
  step.value = Math.min(s.i - 1, STEPS.length - 1)
  if (s.i > STEPS.length) {
    wi.value = Math.min(WAVES.length - 1, Math.floor(s.p * WAVES.length))
    NA.value = lerp(0.55, 1.35, smooth(s.p))
  } else { wi.value = 1; NA.value = 0.75 }
}, 34)

const status = computed(() => {
  if (step.value < 0) return { text: '按顺序点六步，看一层电路怎么"印"到硅片上。下面可以换光的波长，看能做多细的线。' }
  if (done.value) return { text: `一层做完！用 ${wave.value.n}（λ=${wave.value.λ}nm）光，最小线宽约 ${cd.value.toFixed(1)}nm。重复 ${layers.value} 层以上，每平方毫米能挤下约 ${density.value} 万个晶体管。`, kind: 'good' as const }
  return { text: STEPS[step.value].d }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="🔬" color="var(--cat-material)" :status="status"
    note="瑞利判据：最小线宽 CD = k₁ · λ / NA（k₁≈0.32）">
    <div class="demo-steps">
      <button v-for="(s, i) in STEPS" :key="s.n" class="demo-step"
        :class="{ 'is-active': step === i, 'is-done': step > i }" @click="go(i)">
        <span class="demo-step__i">STEP {{ String(i + 1).padStart(2, '0') }}</span>
        <span class="demo-step__n">{{ step > i ? '✓ ' : '' }}{{ s.n }}</span>
      </button>
    </div>

    <svg viewBox="0 0 460 216">
      <defs>
        <linearGradient id="liSi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#4a5a72" /><stop offset="1" stop-color="#232c3a" />
        </linearGradient>
        <linearGradient id="liResist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7fb2ff" /><stop offset="1" stop-color="#2f5aa8" />
        </linearGradient>
        <linearGradient id="liOx" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#c9a227" /><stop offset="1" stop-color="#7a6115" />
        </linearGradient>
        <linearGradient id="liBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#cfe6ff" stop-opacity="0.85" /><stop offset="1" stop-color="#5cc8ff" stop-opacity="0.15" />
        </linearGradient>
      </defs>
      <rect width="460" height="216" class="stage-bg" />

      <!-- 掩膜版 -->
      <g v-if="step >= 0" opacity="0.95">
        <rect x="60" y="24" width="340" height="14" rx="2" fill="#1b212b" stroke="#4a5568" />
        <rect x="60" y="38" width="340" height="6" fill="#0a1220" opacity="0.9" />
        <g fill="#c9d6e8">
          <rect x="60" y="38" width="86" height="6" /><rect x="182" y="38" width="60" height="6" />
          <rect x="302" y="38" width="16" height="6" /><rect x="358" y="38" width="42" height="6" />
        </g>
        <text x="60" y="20" class="lbl" font-size="9">掩膜版（图案缩小 4 倍投影）</text>
      </g>

      <!-- 曝光光线 -->
      <g v-if="step === 1" :opacity="0.55 + Math.sin(t * 9) * 0.25">
        <path v-for="w in WINDOWS" :key="w[0]"
          :d="`M${w[0]},44 L${w[0] - 6},150 H${w[0] + w[1] + 6} L${w[0] + w[1]},44 Z`" fill="url(#liBeam)" />
      </g>

      <!-- 晶圆截面 -->
      <g>
        <!-- 硅衬底 -->
        <rect x="60" y="150" width="340" height="34" rx="2" fill="url(#liSi)" stroke="#171b23" />
        <text x="66" y="172" class="lbl" font-size="8.5" fill="#8a94a5">硅衬底 Si</text>
        <!-- 二氧化硅层（蚀刻后被开出窗口） -->
        <g v-if="step >= 0">
          <rect x="60" y="132" width="340" height="18" fill="url(#liOx)" opacity="0.9" />
          <g v-if="step >= 3">
            <rect v-for="w in WINDOWS" :key="w[0]" :x="w[0]" y="132" :width="w[1]" height="18" fill="#060c1c" />
          </g>
          <text x="396" y="146" text-anchor="end" class="lbl" font-size="8.5" fill="#3d3216">SiO₂ / 金属层</text>
        </g>
        <!-- 掺杂区 -->
        <g v-if="step >= 4">
          <rect x="146" y="150" width="36" height="12" fill="#ff7eb6" opacity="0.55" />
          <rect x="242" y="150" width="60" height="12" fill="#7ee787" opacity="0.5" />
          <g v-for="i in 26" :key="i">
            <circle :cx="150 + ((i * 23) % 148)" :cy="152 + ((i * 7) % 9)" r="1.3"
              :fill="i % 2 ? '#ff7eb6' : '#7ee787'" :opacity="clamp(1 - Math.abs(1 - (t * 1.6 + i * 0.2) % 2), 0.2, 1)" />
          </g>
          <text x="66" y="160" class="lbl" font-size="8" fill="#ff9ecb">N 型（掺磷）</text>
          <text x="256" y="160" class="lbl" font-size="8" fill="#9ef0a4">P 型（掺硼）</text>
        </g>
        <!-- 光刻胶 -->
        <g v-if="step >= 0 && step <= 4">
          <rect x="60" y="116" width="340" height="16" fill="url(#liResist)" :opacity="step === 0 ? 0.55 : 0.9" />
          <g v-if="step >= 2">
            <rect v-for="r in WINDOWS" :key="r[0]"
              :x="r[0]" y="116" :width="r[1]" height="16" fill="#060c1c" />
          </g>
          <g v-if="step === 1">
            <rect v-for="r in [[146, 36], [242, 60], [318, 40]]" :key="'e' + r[0]"
              :x="r[0]" y="116" :width="r[1]" height="16" fill="#ffd166" opacity="0.35" />
          </g>
          <text x="66" y="128" class="lbl" font-size="8" fill="#dceaff">光刻胶</text>
        </g>
        <g v-if="step === 2">
          <path v-for="i in 10" :key="i" :d="`M${140 + i * 24},${110 - ((t * 30 + i * 9) % 26)} q3,5 0,10`"
            stroke="#8fd0ff" stroke-width="1.3" fill="none" :opacity="clamp(1 - ((t * 30 + i * 9) % 26) / 26, 0, 1) * 0.8" />
        </g>
        <!-- 蚀刻等离子 -->
        <g v-if="step === 3">
          <g v-for="i in 16" :key="i">
            <line :x1="150 + ((i * 41) % 200)" :y1="118" :x2="150 + ((i * 41) % 200)" :y2="118 + ((t * 90 + i * 13) % 30)"
              stroke="#fb7185" stroke-width="1.4" :opacity="clamp(1 - ((t * 90 + i * 13) % 30) / 30, 0, 1) * 0.85" />
          </g>
        </g>
      </g>

      <!-- 尺度对比 -->
      <g transform="translate(60,196)">
        <text class="lbl" font-size="8.5">头发丝 80,000nm</text>
        <rect x="96" y="-8" width="150" height="7" rx="3" fill="#8a6a3a" opacity="0.75" />
        <rect x="96" y="2" :width="clamp(150 * cd / 80000 * 900, 1.5, 150)" height="7" rx="2" fill="#5cc8ff" />
        <text class="lbl" font-size="8.5" y="18">当前线宽 {{ cd.toFixed(1) }}nm（放大 900 倍显示）</text>
      </g>
      <g transform="translate(316,190)">
        <rect x="-6" y="-8" width="144" height="30" rx="5" fill="rgba(var(--veil),0.85)" stroke="rgba(var(--tint),0.18)" />
        <text class="lbl" font-size="8.5" x="2" y="4">{{ wave.n }} · λ={{ wave.λ }}nm · {{ wave.year }}</text>
        <text class="val" font-size="12" x="2" y="18">CD ≈ {{ cd.toFixed(1) }} nm</text>
      </g>
    </svg>

    <template #ctrl>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">光源</span>
        <button v-for="(w, i) in WAVES" :key="w.n" class="demo-btn" :class="{ 'demo-btn--on': wi === i }"
          style="padding:5px 9px;font-size:11px" @click="wi = i; touch('click')">
          {{ w.n }} <b style="margin-left:3px">{{ w.λ }}</b>nm
        </button>
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">数值孔径 NA <b>{{ NA.toFixed(2) }}</b></span>
        <input class="demo-slider" type="range" min="0.25" max="1.35" step="0.01" v-model.number="NA" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__spacer" />
      <div class="demo-meter"><span class="demo-meter__k">线宽</span><span class="demo-meter__v">{{ cd.toFixed(1) }}nm</span></div>
      <div class="demo-meter"><span class="demo-meter__k">层数</span><span class="demo-meter__v">{{ layers }}</span></div>
      <button v-if="!done && step >= 0" class="demo-btn" @click="step = STEPS.length - 1; touch('confirm')">▶ 直接完成</button>
      <button class="demo-btn demo-btn--ghost" @click="step = -1; touch('cancel')">↺ 重来</button>
    </template>
  </DemoFrame>
</template>
