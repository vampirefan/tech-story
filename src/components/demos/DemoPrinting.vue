<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, clamp } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const mode = ref<'block' | 'type' | 'cost'>('block')
const t = ref(0)
useRaf((dt) => { t.value += dt })

/* ── 雕版 ── */
const SENT = ['活', '字', '印', '刷', '术', '改', '变', '世', '界']
const carved = ref(0)
const blockTime = ref(0)      // 已投入工时（小时）
const waste = ref(0)          // 报废版数
const fixing = ref(false)
const HOURS_PER_CHAR = 1.2

function carve() {
  if (carved.value >= SENT.length) return
  carved.value++
  blockTime.value += HOURS_PER_CHAR
  touch(carved.value >= SENT.length ? 'confirm' : 'tick', 0.5)
}
function breakIt() { fixing.value = true; touch('wrong') }
/** 雕版：一字错 → 整版重来 */
function recarveBlock() {
  waste.value++
  carved.value = 0
  fixing.value = false
  touch('cancel')
}

/* ── 活字 ── */
const CASE = ['天', '地', '人', '和', '活', '字', '印', '刷', '术', '改', '变', '世', '界', '文', '明', '书']
const stick = ref<string[]>([])
const typeHours = ref(0)
const prints = ref(0)
const reused = ref(0)
const pressed = ref(false)
const pressY = ref(0)

function pick(ch: string) {
  if (stick.value.length >= 9) return
  stick.value.push(ch)
  typeHours.value += 0.05
  touch('tick', 0.45)
}
function unstick(i: number) {
  if (!stick.value[i]) return
  stick.value.splice(i, 1)
  reused.value++
  touch('tick', 0.3)
}
function press() {
  if (!stick.value.length) return
  pressed.value = true
  pressY.value = 0
  prints.value += 300
  typeHours.value += 0.4
  touch('power')
  window.setTimeout(() => { pressed.value = false }, 900)
}
function recycle() { reused.value += stick.value.length; stick.value = []; touch('confirm') }

/* ── 成本曲线 ── */
const logCopies = ref(2.3)
const copies = computed(() => Math.round(Math.pow(10, logCopies.value)))
const X0 = 44, XW = 372, Y0 = 176, YH = 128
const lx = (n: number) => X0 + (Math.log10(Math.max(1, n)) / 4) * XW
const ly = (v: number) => Y0 - clamp(v / 120, 0, 1) * YH
const handCurve = computed(() => {
  let d = ''
  for (let i = 0; i <= 40; i++) {
    const n = Math.pow(10, i / 40 * 4)
    d += (i ? 'L' : 'M') + lx(n).toFixed(1) + ',' + ly(100).toFixed(1)
  }
  return d
})
const printCurve = computed(() => {
  let d = ''
  for (let i = 0; i <= 60; i++) {
    const n = Math.pow(10, i / 60 * 4)
    const avg = (2600 + 0.8 * n) / n
    d += (i ? 'L' : 'M') + lx(n).toFixed(1) + ',' + ly(avg).toFixed(1)
  }
  return d
})
const literacyCurve = computed(() => {
  let d = ''
  for (let i = 0; i <= 60; i++) {
    const n = Math.pow(10, i / 60 * 4)
    d += (i ? 'L' : 'M') + lx(n).toFixed(1) + ',' + (Y0 - clamp(Math.log10(n) / 4, 0, 1) * YH * 0.86).toFixed(1)
  }
  return d
})
const handCost = computed(() => 100)
const printCost = computed(() => (2600 + 0.8 * copies.value) / copies.value)
const cross = computed(() => 2600 / (100 - 0.8))

/* 汇总对比 */
const cmp = computed(() => ({
  block: { time: blockTime.value + waste.value * SENT.length * HOURS_PER_CHAR, waste: waste.value },
  type: { time: typeHours.value, prints: prints.value, reused: reused.value }
}))

const status = computed(() => {
  if (mode.value === 'block') {
    if (fixing.value) return { text: '刻错了一个字！雕版没有"撤销"——整块版只能作废重刻，前面几十个小时白费。切到"活字"看看差别。', kind: 'warn' as const }
    if (carved.value >= SENT.length) return { text: '一版刻完，可以反复刷印。但只要有一处错字，就得从头再来 —— 这就是雕版最大的软肋。', kind: 'good' as const }
    return { text: `正在刻第 ${carved.value + 1} / ${SENT.length} 个字。整页 300 字大约要刻 3 个月。` }
  }
  if (mode.value === 'type') {
    if (prints.value > 0 && stick.value.length === 0) return { text: `字模已归位，下次还能再用。累计印了 ${prints.value} 页，字模复用 ${reused.value} 次 —— 标准化的威力。`, kind: 'good' as const }
    if (!stick.value.length) return { text: '从下面的字盘里点字，排进上面的版框，然后"上墨压印"。' }
    return { text: `版框里 ${stick.value.length} 个字（点一下可以取出来重排）。压印一次可出 300 页；印完把字模拆下来归位，就能排下一页。` }
  }
  return { text: `印 ${copies.value} 册时：手抄每册 ${handCost.value.toFixed(0)} 单位成本，印刷只要 ${printCost.value.toFixed(1)}。约 ${Math.round(cross.value)} 册以上，印刷就全面胜出。` }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="🖨" color="var(--cat-communication)" :status="status">
    <template #head-right>
      <div class="demo-ctrl__group" style="gap:4px">
        <button v-for="m in ([{ k: 'block', n: '雕版' }, { k: 'type', n: '活字' }, { k: 'cost', n: '成本曲线' }] as const)" :key="m.k"
          class="demo-btn" :class="{ 'demo-btn--on': mode === m.k }" style="padding:4px 10px;font-size:11.5px"
          @click="mode = m.k; touch('page')">{{ m.n }}</button>
      </div>
    </template>

    <svg viewBox="0 0 460 210">
      <defs>
        <linearGradient id="prWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9a7442" /><stop offset="1" stop-color="#4a3320" />
        </linearGradient>
        <linearGradient id="prPaper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f7efdb" /><stop offset="1" stop-color="#d3c39d" />
        </linearGradient>
      </defs>
      <rect width="460" height="210" fill="#060c1c" />

      <!-- ══ 雕版 ══ -->
      <g v-if="mode === 'block'">
        <rect x="86" y="26" width="288" height="132" rx="6" fill="url(#prWood)" stroke="#241708" stroke-width="2" />
        <rect x="98" y="38" width="264" height="108" rx="3" fill="#33220f" opacity="0.55" />
        <g v-for="(ch, i) in SENT" :key="i">
          <g :transform="`translate(${112 + (i % 3) * 84},${66 + Math.floor(i / 3) * 34})`">
            <rect x="-16" y="-16" width="32" height="32" rx="2"
              :fill="i < carved ? '#e8dcc0' : 'rgba(232,220,192,0.09)'"
              :stroke="i === carved && !fixing ? '#ffb347' : 'rgba(232,220,192,0.22)'" stroke-width="1.2" />
            <text v-if="i < carved" x="0" y="7" text-anchor="middle" font-size="19" fill="#2a1c0a"
              :transform="`scale(-1,1)`">{{ ch }}</text>
            <text v-else x="0" y="6" text-anchor="middle" font-size="15" fill="rgba(232,220,192,0.28)">{{ ch }}</text>
          </g>
        </g>
        <!-- 刻刀 -->
        <g v-if="carved < SENT.length" :transform="`translate(${112 + (carved % 3) * 84 + 22},${50 + Math.floor(carved / 3) * 34 + Math.sin(t * 9) * 5}) rotate(28)`">
          <rect x="-3" y="-26" width="6" height="22" rx="2" fill="#8a6a3a" />
          <path d="M-3,-4 h6 l-3,10 z" fill="#c9d6e8" />
        </g>
        <!-- 错字警示 -->
        <g v-if="fixing">
          <rect x="86" y="26" width="288" height="132" rx="6" fill="#ff5f56" opacity="0.16" />
          <text x="230" y="100" text-anchor="middle" font-size="26" fill="#fb7185" class="demo-flicker">✕ 刻错一字</text>
          <text x="230" y="124" text-anchor="middle" font-size="11" fill="#ffd7dd">整版报废 · 已浪费 {{ (blockTime).toFixed(1) }} 小时</text>
        </g>
        <text x="86" y="180" class="lbl">已投入 {{ blockTime.toFixed(1) }} 小时 · 报废 {{ waste }} 版</text>
        <text x="374" y="180" text-anchor="end" class="lbl">注意：版上的字是反的（镜像），印出来才是正的</text>
      </g>

      <!-- ══ 活字 ══ -->
      <g v-if="mode === 'type'">
        <!-- 版框 -->
        <rect x="60" y="20" width="240" height="46" rx="4" fill="#241708" stroke="#8a6a3a" stroke-width="1.6" />
        <g v-for="i in 9" :key="i" style="cursor:pointer" @click="unstick(i - 1)">
          <rect :x="66 + (i - 1) * 26" y="26" width="22" height="34" rx="2"
            :fill="stick[i - 1] ? 'url(#prWood)' : 'rgba(138,106,58,0.12)'" stroke="rgba(138,106,58,0.45)" stroke-width="0.8" />
          <text v-if="stick[i - 1]" :x="77 + (i - 1) * 26" y="50" text-anchor="middle" font-size="17" fill="#f3e6c8"
            :transform="`scale(-1,1) translate(${-2 * (77 + (i - 1) * 26)},0)`">{{ stick[i - 1] }}</text>
          <rect v-if="stick[i - 1]" :x="66 + (i - 1) * 26" y="26" width="22" height="34" rx="2" fill="#ffb347" opacity="0">
            <set attributeName="opacity" to="0.22" begin="mouseover" end="mouseout" />
          </rect>
        </g>
        <!-- 压印机 -->
        <g transform="translate(330,20)">
          <rect x="0" y="0" width="86" height="8" rx="2" fill="#5d6b83" />
          <rect x="38" y="8" width="10" height="34" fill="#414d61" />
          <g :transform="`translate(0,${pressed ? 16 : 0})`" style="transition:transform .35s cubic-bezier(.34,1.56,.64,1)">
            <rect x="14" y="42" width="58" height="16" rx="3" fill="#8a6a3a" stroke="#3a2712" />
            <text x="43" y="54" text-anchor="middle" font-size="9" fill="#f3e6c8">压</text>
          </g>
          <rect x="6" y="66" width="74" height="7" rx="2" fill="#3a2d19" />
          <rect x="16" y="58" width="54" height="8" rx="1" fill="url(#prPaper)" :opacity="prints > 0 ? 1 : 0.35" />
        </g>
        <!-- 印出的纸 -->
        <g v-if="prints > 0">
          <rect x="60" y="76" width="240" height="34" rx="2" fill="url(#prPaper)" opacity="0.95" />
          <text x="180" y="99" text-anchor="middle" font-size="17" fill="#2a1c0a" letter-spacing="6">{{ stick.join('') || '活字印刷术改变世界' }}</text>
        </g>
        <!-- 字盘 -->
        <g transform="translate(60,122)">
          <rect x="-6" y="-6" width="352" height="70" rx="5" fill="#160f06" stroke="#4a3320" />
          <g v-for="(ch, i) in CASE" :key="ch" :transform="`translate(${(i % 8) * 43},${Math.floor(i / 8) * 30})`"
            style="cursor:pointer" @click="pick(ch)">
            <rect width="34" height="25" rx="3" fill="url(#prWood)" stroke="#241708" />
            <text x="17" y="18" text-anchor="middle" font-size="15" fill="#f3e6c8">{{ ch }}</text>
            <rect width="34" height="25" rx="3" fill="#ffb347" opacity="0">
              <set attributeName="opacity" to="0.18" begin="mouseover" end="mouseout" />
            </rect>
          </g>
        </g>
        <text x="60" y="204" class="lbl">排版 {{ typeHours.toFixed(2) }} 小时 · 已印 {{ prints }} 页 · 字模复用 {{ reused }} 次</text>
      </g>

      <!-- ══ 成本曲线 ══ -->
      <g v-if="mode === 'cost'">
        <line :x1="X0" y1="16" :x2="X0" :y2="Y0" stroke="rgba(120,190,255,0.28)" />
        <line :x1="X0" :y1="Y0" :x2="X0 + XW" :y2="Y0" stroke="rgba(120,190,255,0.28)" />
        <g v-for="i in 5" :key="i">
          <line :x1="X0" :y1="Y0 - (i - 1) * (YH / 4)" :x2="X0 + XW" :y2="Y0 - (i - 1) * (YH / 4)" stroke="rgba(120,190,255,0.08)" />
          <text :x="X0 - 6" :y="Y0 - (i - 1) * (YH / 4) + 4" text-anchor="end" class="lbl" font-size="9">{{ (i - 1) * 30 }}</text>
        </g>
        <g v-for="e in 5" :key="'x' + e">
          <line :x1="lx(Math.pow(10, e - 1))" y1="16" :x2="lx(Math.pow(10, e - 1))" :y2="Y0" stroke="rgba(120,190,255,0.08)" />
          <text :x="lx(Math.pow(10, e - 1))" :y="Y0 + 14" text-anchor="middle" class="lbl" font-size="9">
            {{ e - 1 === 0 ? '1' : e - 1 === 1 ? '10' : e - 1 === 2 ? '100' : e - 1 === 3 ? '1千' : '1万' }}
          </text>
        </g>
        <path :d="handCurve" fill="none" stroke="#fb7185" stroke-width="2.2" />
        <path :d="printCurve" fill="none" stroke="#34d399" stroke-width="2.2" />
        <path :d="literacyCurve" fill="none" stroke="#8fd0ff" stroke-width="1.6" stroke-dasharray="5 4" opacity="0.8" />
        <!-- 交点 -->
        <circle :cx="lx(cross)" :cy="ly(100)" r="4.5" fill="#ffd166" />
        <text :x="lx(cross) + 8" :y="ly(100) - 6" class="lbl" font-size="9.5" fill="#ffd166">盈亏平衡 ≈ {{ Math.round(cross) }} 册</text>
        <!-- 游标 -->
        <line :x1="lx(copies)" y1="16" :x2="lx(copies)" :y2="Y0" stroke="#ffb347" stroke-width="1.2" stroke-dasharray="3 3" />
        <circle :cx="lx(copies)" :cy="ly(printCost)" r="4" fill="#34d399" />
        <circle :cx="lx(copies)" :cy="ly(handCost)" r="4" fill="#fb7185" />
        <!-- 图例 -->
        <g transform="translate(300,26)">
          <rect x="-8" y="-12" width="150" height="58" rx="5" fill="rgba(6,12,28,0.8)" stroke="rgba(120,190,255,0.18)" />
          <line x1="0" y1="0" x2="18" y2="0" stroke="#fb7185" stroke-width="2.2" /><text x="24" y="4" class="lbl">手抄本（每册 5 个月）</text>
          <line x1="0" y1="16" x2="18" y2="16" stroke="#34d399" stroke-width="2.2" /><text x="24" y="20" class="lbl">印刷本（制版贵，复印几乎免费）</text>
          <line x1="0" y1="32" x2="18" y2="32" stroke="#8fd0ff" stroke-width="1.6" stroke-dasharray="5 4" /><text x="24" y="36" class="lbl">识字率</text>
        </g>
        <text :x="X0" y="200" class="val">印 {{ copies }} 册 → 手抄 {{ handCost }} · 印刷 {{ printCost.toFixed(1) }}</text>
      </g>
    </svg>

    <template #ctrl>
      <template v-if="mode === 'block'">
        <button class="demo-btn demo-btn--big" @click="carve" :disabled="carved >= SENT.length || fixing">🔪 刻一刀（{{ carved }}/{{ SENT.length }}）</button>
        <button class="demo-btn" @click="breakIt" :disabled="carved < 1 || fixing">✎ 哎呀，刻错一个字</button>
        <button v-if="fixing" class="demo-btn demo-btn--on" @click="recarveBlock">↺ 整版重刻（+{{ (SENT.length * HOURS_PER_CHAR).toFixed(1) }} 小时）</button>
        <div class="demo-ctrl__spacer" />
        <div class="demo-meter"><span class="demo-meter__k">累计工时</span><span class="demo-meter__v">{{ (cmp.block.time).toFixed(1) }}h</span></div>
        <div class="demo-meter"><span class="demo-meter__k">报废版</span><span class="demo-meter__v">{{ cmp.block.waste }}</span></div>
      </template>

      <template v-else-if="mode === 'type'">
        <button class="demo-btn demo-btn--big" @click="press" :disabled="!stick.length">🖨 上墨压印（+300 页）</button>
        <button class="demo-btn" @click="recycle" :disabled="!stick.length">♻ 拆版归位（字模可再用）</button>
        <div class="demo-ctrl__spacer" />
        <div class="demo-meter"><span class="demo-meter__k">排版工时</span><span class="demo-meter__v">{{ typeHours.toFixed(2) }}h</span></div>
        <div class="demo-meter"><span class="demo-meter__k">已印</span><span class="demo-meter__v">{{ prints }}</span></div>
        <div class="demo-meter"><span class="demo-meter__k">复用</span><span class="demo-meter__v">{{ reused }}</span></div>
      </template>

      <template v-else>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">印数（对数） <b>{{ copies }}</b></span>
          <input class="demo-slider" type="range" min="0" max="4" step="0.01" style="width:190px"
            v-model.number="logCopies" @input="touch('tick', 0.16)">
        </div>
        <div class="demo-ctrl__spacer" />
        <div class="demo-meter"><span class="demo-meter__k">手抄/册</span><span class="demo-meter__v">{{ handCost }}</span></div>
        <div class="demo-meter"><span class="demo-meter__k">印刷/册</span><span class="demo-meter__v">{{ printCost.toFixed(1) }}</span></div>
      </template>
    </template>
  </DemoFrame>
</template>
