<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, clamp, useAutoDemo, seg, lerp, smooth } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const STEPS = [
  { n: '煮料', d: '把树皮、麻头、破渔网放进石灰水里蒸煮，去掉木质素和果胶，只留下纤维素。', t: 96 },
  { n: '打浆', d: '用木槌反复捶打，把成束的纤维打散成一根根"细毛"，越细越容易交织。', t: 92 },
  { n: '抄纸', d: '用竹帘从稀纸浆里稳稳抬起一层，水从帘缝漏走，纤维在帘上随机交织成湿纸膜。', t: 88 },
  { n: '压榨', d: '把一叠湿纸压上重石，挤出水分，让纤维彼此贴紧。', t: 90 },
  { n: '晾晒', d: '揭下来刷到墙上晒干。干燥时纤维之间形成氢键，纸就此"定型"。', t: 94 }
]

const step = ref(-1)
const beat = ref(0.6)      // 打浆充分度
const mesh = ref(0.6)      // 帘的密度
const water = ref(0.5)     // 纸浆浓度
const t = ref(0)
const done = computed(() => step.value >= STEPS.length - 1)

useRaf((dt) => { t.value += dt })

function go(i: number) {
  if (i === step.value + 1) {
    step.value = i
    touch(i === STEPS.length - 1 ? 'chime' : 'confirm')
  } else if (i <= step.value) {
    step.value = i
    touch('tick', 0.4)
  } else {
    touch('wrong')
  }
}
function reset() { step.value = -1; touch('cancel') }

/* 自动演示：五步依次走完，打浆 / 帘密 / 浓度同步调到能出好纸的区间 */
useAutoDemo((t) => {
  const s = seg(t, 2, 5, 5, 5, 5, 5, 3)
  step.value = Math.min(s.i - 1, STEPS.length - 1)
  const g = smooth(clamp((t - 2) / 22, 0, 1))
  beat.value = lerp(0.42, 0.96, g)
  mesh.value = lerp(0.42, 0.72, g)
  water.value = lerp(0.72, 0.45, g)
}, 30)

/** 成品质量：打浆充分 + 帘密 + 浆浓度适中 */
const quality = computed(() => {
  const evenness = clamp(1 - Math.abs(mesh.value - 0.72) * 1.5, 0, 1)
  const strength = clamp(beat.value * 0.85 + 0.15, 0, 1)
  const thick = clamp(1 - Math.abs(water.value - 0.45) * 2.0, 0, 1)
  return Math.round((evenness * 0.4 + strength * 0.35 + thick * 0.25) * 100)
})
const verdict = computed(() => {
  if (quality.value >= 85) return '匀薄柔韧，能写字能印刷 —— 这就是"蔡侯纸"的水平。'
  if (quality.value >= 65) return '还算能用，但厚薄有点不匀，写字会洇墨。'
  return '纤维没打散 / 帘太疏 / 浆太稀，纸会有洞或者厚得像纸板。'
})
const status = computed(() => {
  if (step.value < 0) return { text: '按顺序点击下面五步，看一堆树皮怎么变成一张纸。' }
  if (done.value) return { text: `造纸完成，成品评分 ${quality.value} 分。${verdict.value}`, kind: quality.value >= 65 ? 'good' as const : 'warn' as const }
  return { text: STEPS[step.value].d }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="📜" color="var(--cat-material)" :status="status">
    <div class="demo-steps">
      <button v-for="(s, i) in STEPS" :key="s.n" class="demo-step"
        :class="{ 'is-active': step === i, 'is-done': step > i }" @click="go(i)">
        <span class="demo-step__i">STEP {{ String(i + 1).padStart(2, '0') }}</span>
        <span class="demo-step__n">{{ step > i ? '✓ ' : '' }}{{ s.n }}</span>
      </button>
    </div>

    <svg viewBox="0 0 460 210">
      <defs>
        <linearGradient id="paperPot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#6b5636" /><stop offset="1" stop-color="#2e2415" />
        </linearGradient>
        <linearGradient id="paperSheet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f6ecd4" /><stop offset="1" stop-color="#cdbb95" />
        </linearGradient>
        <radialGradient id="paperFire">
          <stop offset="0" stop-color="#ffd166" stop-opacity="0.9" />
          <stop offset="1" stop-color="#ff5f56" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="460" height="210" class="stage-bg" />
      <rect x="0" y="176" width="460" height="34" class="stage-ground" />
      <line x1="0" y1="176" x2="460" y2="176" stroke="#3a2b46" stroke-width="1.4" />

      <!-- 起始：原料 -->
      <g v-if="step < 0">
        <g transform="translate(150,120)">
          <path d="M0,56 q14,-40 44,-46 q-8,26 -6,46 z" fill="#7a6a44" stroke="#3d3520" />
          <path d="M40,56 q6,-46 40,-52 q-2,30 4,52 z" fill="#8d7a4e" stroke="#3d3520" />
          <path d="M78,56 q18,-34 46,-32 q-14,20 -12,32 z" fill="#6d5f3d" stroke="#3d3520" />
          <path d="M-14,56 h160" stroke="#4a3d5e" stroke-width="2" />
        </g>
        <text x="230" y="60" text-anchor="middle" class="lbl-hi" font-size="14">原料：树皮 · 麻头 · 破渔网 · 竹</text>
        <text x="230" y="82" text-anchor="middle" class="lbl">这些东西的共同点：都含有丰富的植物纤维素</text>
      </g>

      <!-- 1 煮料 -->
      <g v-if="step === 0">
        <ellipse cx="230" cy="176" rx="86" ry="12" fill="url(#paperFire)" :opacity="0.5 + Math.sin(t * 6) * 0.16" />
        <path d="M160,96 h140 l-14,74 h-112 z" fill="url(#paperPot)" stroke="#1d1608" stroke-width="1.6" />
        <ellipse cx="230" cy="96" rx="70" ry="13" fill="#3a2d19" stroke="#1d1608" />
        <ellipse cx="230" cy="97" rx="62" ry="10" fill="#6d7a4a" opacity="0.85" />
        <g v-for="i in 9" :key="i">
          <circle :cx="186 + ((i * 37) % 90)" :cy="96 - ((t * 26 + i * 17) % 42)" :r="2 + (i % 3)"
            fill="#cfe0a0" :opacity="clamp(1 - ((t * 26 + i * 17) % 42) / 42, 0, 1) * 0.75" />
        </g>
        <path d="M196,120 q10,-8 20,0 M232,132 q12,-8 24,2" stroke="#9aa86a" stroke-width="2" fill="none" opacity="0.6" />
        <text x="230" y="46" text-anchor="middle" class="lbl-hi">石灰水蒸煮 · 约 100℃ · 数小时</text>
        <text x="230" y="66" text-anchor="middle" class="lbl">碱液溶解木质素与果胶，把纤维"解放"出来</text>
        <g transform="translate(330,120)">
          <path d="M0,50 q4,-24 12,-30 q-2,16 2,30 z" fill="#ff8a3d" class="demo-flicker" />
          <path d="M-10,50 q6,-16 10,-20 q-2,12 0,20 z" fill="#ffd166" class="demo-flicker" />
        </g>
      </g>

      <!-- 2 打浆 -->
      <g v-if="step === 1">
        <rect x="150" y="140" width="160" height="30" rx="6" fill="#3a2d19" stroke="#1d1608" />
        <g :transform="`translate(230,${112 - Math.abs(Math.sin(t * 5.2)) * 26})`">
          <rect x="-13" y="-46" width="26" height="46" rx="5" fill="#8a6a3a" stroke="#3a2712" />
          <rect x="-19" y="-8" width="38" height="16" rx="4" fill="#6b5636" stroke="#3a2712" />
        </g>
        <!-- 纤维：从成束到散开 -->
        <g :opacity="0.9">
          <path v-for="i in 14" :key="i"
            :d="`M${168 + i * 9},${152 + (i % 3) * 5} q${4 + beat * 8},${-6 - beat * 8} ${8 + beat * 16},${(i % 2 ? 1 : -1) * (2 + beat * 5)}`"
            stroke="#d8c9a0" :stroke-width="1 + beat * 1.4" fill="none" :opacity="0.35 + beat * 0.5" />
        </g>
        <text x="230" y="44" text-anchor="middle" class="lbl-hi">捶打：纤维束 → 单根纤维</text>
        <text x="230" y="64" text-anchor="middle" class="lbl">打浆充分度 {{ Math.round(beat * 100) }}% —— 越散开，成纸越匀越韧</text>
        <text x="230" y="196" text-anchor="middle" class="val">纤维分叉数 ≈ {{ Math.round(beat * 42) }} 处/根</text>
      </g>

      <!-- 3 抄纸 -->
      <g v-if="step === 2">
        <rect x="120" y="120" width="220" height="56" rx="6" fill="#26324a" stroke="#131c2e" />
        <rect x="126" y="126" width="208" height="44" rx="4" fill="#4a5a3a" opacity="0.55" />
        <g v-for="i in 8" :key="i">
          <circle :cx="140 + ((i * 53) % 186)" :cy="132 + ((t * 12 + i * 11) % 34)" r="1.6" fill="#d8c9a0" opacity="0.5" />
        </g>
        <!-- 纸帘 -->
        <g :transform="`translate(230,${112 - Math.min(1, t * 0.5) * 46})`">
          <rect x="-72" y="-8" width="144" height="9" rx="2" fill="#8a6a3a" stroke="#3a2712" />
          <g :opacity="0.4 + mesh * 0.5">
            <line v-for="i in 22" :key="i" :x1="-70 + i * 6.4" y1="-8" :x2="-70 + i * 6.4" y2="1" stroke="#d8c9a0" stroke-width="0.7" />
          </g>
          <rect x="-70" y="-14" width="140" height="6" rx="2" fill="url(#paperSheet)" :opacity="0.5 + water * 0.5" />
          <!-- 滴水 -->
          <g v-if="t * 0.5 < 1.6">
            <line v-for="i in 7" :key="i" :x1="-60 + i * 20" :y1="2" :x2="-60 + i * 20" :y2="2 + ((t * 60 + i * 9) % 34)"
              stroke="#8fd0ff" stroke-width="1.2" opacity="0.55" />
          </g>
        </g>
        <text x="230" y="40" text-anchor="middle" class="lbl-hi">抄纸：一捞一荡，厚薄全在手势</text>
        <text x="230" y="60" text-anchor="middle" class="lbl">帘密度 {{ Math.round(mesh * 100) }}% · 纸浆浓度 {{ Math.round(water * 100) }}%</text>
      </g>

      <!-- 4 压榨 -->
      <g v-if="step === 3">
        <g :transform="`translate(0,${Math.min(1, t * 0.6) * 22})`">
          <rect x="150" y="60" width="160" height="26" rx="4" fill="#5d6b83" stroke="#2b3444" />
          <text x="230" y="78" text-anchor="middle" font-size="11" fill="#cfe0f5">重石</text>
        </g>
        <g>
          <rect v-for="i in 7" :key="i" x="158" :y="92 + (i - 1) * 9" width="144" height="7" rx="1.5"
            fill="url(#paperSheet)" :opacity="0.55 + i * 0.05" />
        </g>
        <rect x="146" y="156" width="168" height="14" rx="3" fill="#3a2d19" stroke="#1d1608" />
        <g v-for="i in 6" :key="'w' + i">
          <path :d="`M${166 + i * 22},${170 + ((t * 30 + i * 12) % 16)} q4,4 0,8`" stroke="#8fd0ff" stroke-width="1.4" fill="none"
            :opacity="clamp(1 - ((t * 30 + i * 12) % 16) / 16, 0, 1) * 0.8" />
        </g>
        <text x="230" y="40" text-anchor="middle" class="lbl-hi">压榨脱水：纤维被挤到一起</text>
        <text x="230" y="196" text-anchor="middle" class="lbl">含水率 从 ~85% 降到 ~55%</text>
      </g>

      <!-- 5 晾晒 -->
      <g v-if="step === 4">
        <circle cx="80" cy="52" r="20" fill="#ffd166" opacity="0.28" />
        <circle cx="80" cy="52" r="11" fill="#ffd166" opacity="0.75" />
        <g v-for="i in 8" :key="i" :opacity="0.35">
          <line x1="80" y1="52" :x2="80 + Math.cos(i * 0.785 + t * 0.4) * 40" :y2="52 + Math.sin(i * 0.785 + t * 0.4) * 40" stroke="#ffd166" stroke-width="1.4" />
        </g>
        <rect x="150" y="60" width="176" height="110" rx="4" fill="#2a2136" stroke="#4a3d5e" />
        <rect x="160" y="70" width="156" height="90" rx="2" fill="url(#paperSheet)" :opacity="0.75 + Math.min(1, t * 0.3) * 0.25" />
        <g opacity="0.35">
          <path v-for="i in 10" :key="i" :d="`M${166 + i * 14},74 q${(i % 3) * 3 - 3},40 0,82`" stroke="#a8946a" stroke-width="0.8" fill="none" />
        </g>
        <text x="230" y="40" text-anchor="middle" class="lbl-hi">晒干：氢键把纤维永久粘在一起</text>
        <text x="352" y="120" class="lbl" font-size="10">含水率</text>
        <text x="352" y="138" class="val">{{ Math.round(clamp(55 - t * 12, 6, 55)) }}%</text>
      </g>

      <!-- 成品 -->
      <g v-if="done" transform="translate(0,0)">
        <rect x="356" y="24" width="86" height="60" rx="3" fill="url(#paperSheet)" stroke="#8a7a55" />
        <text x="399" y="52" text-anchor="middle" font-size="17" fill="#5a4a2a">紙</text>
        <text x="399" y="72" text-anchor="middle" font-size="9" fill="#7a6a44">成品 · {{ quality }} 分</text>
      </g>
    </svg>

    <template #ctrl>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">打浆充分度 <b>{{ Math.round(beat * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0" max="1" step="0.01" v-model.number="beat" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">竹帘密度 <b>{{ Math.round(mesh * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0" max="1" step="0.01" v-model.number="mesh" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">纸浆浓度 <b>{{ Math.round(water * 100) }}%</b></span>
        <input class="demo-slider" type="range" min="0" max="1" step="0.01" v-model.number="water" @input="touch('tick', 0.2)">
      </div>
      <div class="demo-ctrl__spacer" />
      <div class="demo-meter">
        <span class="demo-meter__k">成品评分</span>
        <span class="demo-meter__v">{{ quality }}</span>
        <span class="demo-meter__bar"><span class="demo-meter__fill" :style="{ width: quality + '%' }" /></span>
      </div>
      <button v-if="!done && step >= 0" class="demo-btn" @click="step = STEPS.length - 1; touch('confirm')">▶ 直接完成</button>
      <button class="demo-btn demo-btn--ghost" @click="reset">↺ 重来</button>
    </template>
  </DemoFrame>
</template>
