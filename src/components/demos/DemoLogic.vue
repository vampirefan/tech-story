<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, clamp } from './useDemo'

const props = defineProps<{ demoId: string; title: string; hint?: string; points?: string[]; nodeId?: string }>()
const touch = useDemoTouch()

type Mode = 'gates' | 'adder' | 'code' | 'neuron' | 'pipeline'
const MODES: { k: Mode; n: string; for?: string }[] = [
  { k: 'gates', n: '逻辑门', for: 'turing_machine' },
  { k: 'adder', n: '加法器', for: 'eniac' },
  { k: 'code', n: '一行代码', for: 'software' },
  { k: 'neuron', n: '会学习的网络', for: 'ai_neural' },
  { k: 'pipeline', n: '一条指令', for: 'microprocessor' }
]
const mode = ref<Mode>((MODES.find(m => m.for === props.nodeId)?.k ?? 'gates'))
const t = ref(0)
useRaf((dt) => { t.value += dt })

/* ══ 逻辑门 ══ */
const A = ref(true), B = ref(false)
const gate = ref<'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND'>('AND')
const gOut = (a: boolean, b: boolean) => {
  switch (gate.value) {
    case 'AND': return a && b
    case 'OR': return a || b
    case 'NOT': return !a
    case 'XOR': return a !== b
    case 'NAND': return !(a && b)
  }
}
const out = computed(() => gOut(A.value, B.value))
const rows = computed(() => [false, true].flatMap(a => [false, true].map(b => ({ a, b, o: gOut(a, b) }))))

/* ══ 加法器 ══ */
const bitsA = ref([false, true, false, true])   // 低位在后：显示时反转
const bitsB = ref([false, false, true, true])
const toNum = (b: boolean[]) => b.reduce((s, v, i) => s + (v ? 2 ** i : 0), 0)
const nA = computed(() => toNum(bitsA.value))
const nB = computed(() => toNum(bitsB.value))
const sum = computed(() => nA.value + nB.value)
const sumBits = computed(() => Array.from({ length: 5 }, (_, i) => ((sum.value >> i) & 1) === 1))
/** 逐位全加器：本位 = A^B^Cin，进位 = AB + (A^B)Cin */
const adderSteps = computed(() => {
  let cin = false
  return bitsA.value.map((a, i) => {
    const b = bitsB.value[i] ?? false
    const s = a !== b !== cin
    const cout = (a && b) || ((a !== b) && cin)
    const row = { i, a, b, cin, s, cout }
    cin = cout
    return row
  })
})

/* ══ 一行代码 ══ */
const codeStep = ref(0)
const CODE = [
  { n: '高级语言', s: 'if (a > b) c = a + b;', d: '人写的、给人看的。编译器一行行读它。' },
  { n: '语法树', s: 'If( Gt(a,b), Assign(c, Add(a,b)) )', d: '把句子拆成"结构"：条件、判断、赋值、运算。' },
  { n: '汇编语言', s: 'CMP a, b\nJLE .skip\nMOV r1, a\nADD r1, b\nMOV c, r1\n.skip:', d: '一条条 CPU 能懂的指令，还是文字。' },
  { n: '机器码', s: '3B 05 00 00 7E 07 8B 0D 03 C1 89 0D', d: '最终变成 0 和 1 —— 也就是几十亿个逻辑门的开与关。' }
]

/* ══ 神经元 ══ */
const w1 = ref(0.9), w2 = ref(-0.7), bias = ref(-0.1)
const training = ref(false)
const loss = ref(0)
const epoch = ref(0)
const lr = ref(0.6)
/** 两类点：右上 = 1，左下 = 0（线性可分） */
const DATA = Array.from({ length: 22 }, (_, i) => {
  const r1 = ((i * 37) % 17) / 17, r2 = ((i * 61) % 13) / 13
  const cls = i % 2
  return {
    x: cls ? 0.55 + r1 * 0.4 : 0.05 + r1 * 0.38,
    y: cls ? 0.55 + r2 * 0.4 : 0.06 + r2 * 0.36,
    c: cls
  }
})
const sig = (z: number) => 1 / (1 + Math.exp(-z))
function predict(x: number, y: number) { return sig(x * w1.value + y * w2.value + bias.value) }
function computeLoss() {
  let L = 0
  for (const p of DATA) {
    const y = predict(p.x, p.y)
    L += -(p.c * Math.log(y + 1e-6) + (1 - p.c) * Math.log(1 - y + 1e-6))
  }
  return L / DATA.length
}
useRaf((dt) => {
  loss.value = computeLoss()
  if (!training.value) return
  const steps = Math.max(1, Math.round(dt * 90))
  for (let s = 0; s < steps; s++) {
    let g1 = 0, g2 = 0, gb = 0
    for (const p of DATA) {
      const y = predict(p.x, p.y)
      const e = y - p.c
      g1 += e * p.x; g2 += e * p.y; gb += e
    }
    w1.value -= lr.value * g1 / DATA.length
    w2.value -= lr.value * g2 / DATA.length
    bias.value -= lr.value * gb / DATA.length
    epoch.value++
  }
  if (loss.value < 0.02) { training.value = false; touch('chime') }
})
const accuracy = computed(() => {
  let ok = 0
  for (const p of DATA) if ((predict(p.x, p.y) > 0.5 ? 1 : 0) === p.c) ok++
  return ok / DATA.length
})
/** 决策边界：w1·x + w2·y + b = 0 */
const boundary = computed(() => {
  if (Math.abs(w2.value) < 1e-4) return 'M150,20 V150'
  const y = (x: number) => (-bias.value - w1.value * x) / w2.value
  return `M150,${150 - y(0) * 130} L280,${150 - y(1) * 130}`
})

/* ══ 流水线 ══ */
const INSTR = [
  { a: 'MOV r1, 5', f: ['取 r1←5', '', '', '', ''] },
  { a: 'MOV r2, 3', f: ['', '取 r2←3', '', '', ''] },
  { a: 'ADD r1, r2', f: ['', '', '取 r1+r2', '', ''] },
  { a: 'ST r1, [c]', f: ['', '', '', '取 存 c', ''] }
]
const pipeOn = ref(true)
const pipeT = ref(0)
const STAGES = ['取指', '译码', '执行', '访存', '写回']
useRaf((dt) => { if (mode.value === 'pipeline' && pipeOn.value) pipeT.value += dt })
const pipeCycle = computed(() => Math.floor(pipeT.value * 1.4))
const cellOn = (i: number, s: number) => {
  const c = pipeCycle.value % 9
  return pipeOn.value ? c === i + s : s === 0 && i === 0
}

const status = computed(() => {
  switch (mode.value) {
    case 'gates': return { text: `${gate.value} 门：A=${A.value ? 1 : 0}，B=${B.value ? 1 : 0} → 输出 ${out.value ? 1 : 0}。真值表里高亮的那一行，就是现在的输入组合。`, kind: out.value ? 'good' as const : 'info' as const }
    case 'adder': return { text: `${nA.value} + ${nB.value} = ${sum.value}（二进制 ${sumBits.value.slice().reverse().map(b => b ? 1 : 0).join('')}）。每一位都是一个全加器：本位 = A⊕B⊕进位，进位 = AB + (A⊕B)·进位。`, kind: 'good' as const }
    case 'code': return { text: CODE[codeStep.value].d }
    case 'neuron': return { text: training.value ? `正在训练…第 ${epoch.value} 轮，损失 ${loss.value.toFixed(4)}。梯度下降就是"哪里错得多，就往反方向挪一点点"。` : `准确率 ${(accuracy.value * 100).toFixed(0)}%，损失 ${loss.value.toFixed(4)}。拖动权重滑块看决策边界怎么转；点"自动训练"让它自己找。`, kind: accuracy.value > 0.9 ? 'good' as const : 'warn' as const }
    case 'pipeline': return { text: pipeOn.value ? `流水线：4 条指令重叠执行，5 个阶段同时都在忙。没有流水线要 20 拍，有了只要 8 拍 —— 这就是 CPU 主频之外的第二重加速。` : '关闭流水线后，一条指令走完 5 个阶段，下一条才能开始。' }
  }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="▦" color="var(--cat-computation)" :status="status">
    <template #head-right>
      <div class="demo-ctrl__group" style="gap:4px;flex-wrap:wrap">
        <button v-for="m in MODES" :key="m.k" class="demo-btn" :class="{ 'demo-btn--on': mode === m.k }"
          style="padding:4px 9px;font-size:11px" @click="mode = m.k; touch('page')">{{ m.n }}</button>
      </div>
    </template>

    <!-- ══ 逻辑门 ══ -->
    <svg v-if="mode === 'gates'" viewBox="0 0 460 200">
      <rect width="460" height="200" fill="#060c1c" />
      <!-- 输入 -->
      <g v-for="(v, i) in [{ on: A, y: 62, n: 'A' }, { on: B, y: 122, n: 'B' }]" :key="v.n">
        <line x1="60" :y1="v.y" x2="150" :y2="v.y" :stroke="v.on ? '#34d399' : '#39414f'" stroke-width="3" />
        <circle cx="60" :cy="v.y" r="9" :fill="v.on ? '#34d399' : '#1b212b'" :stroke="v.on ? '#34d399' : '#4a5568'" stroke-width="2" style="cursor:pointer"
          @click="i === 0 ? (A = !A, touch('click')) : (B = !B, touch('click'))" />
        <text x="60" :y="v.y + 4" text-anchor="middle" font-size="10" font-weight="700" :fill="v.on ? '#04140d' : '#8a94a5'">{{ v.on ? 1 : 0 }}</text>
        <text x="42" :y="v.y + 4" text-anchor="end" class="lbl-hi" font-size="11">{{ v.n }}</text>
        <g v-if="v.on">
          <circle v-for="k in 4" :key="k" :cx="90 + ((t * 60 + k * 20) % 55)" :cy="v.y" r="2.6" fill="#8fffc9" opacity="0.85" />
        </g>
      </g>
      <!-- 门符号 -->
      <g transform="translate(150,92)">
        <path v-if="gate === 'AND' || gate === 'NAND'" d="M0,-32 H26 A32,32 0 0 1 26,32 H0 Z"
          fill="rgba(180,140,255,0.14)" stroke="#b48cff" stroke-width="2.4" />
        <path v-else-if="gate === 'OR' || gate === 'XOR'" d="M0,-32 Q26,-32 58,0 Q26,32 0,32 Q16,0 0,-32 Z"
          fill="rgba(180,140,255,0.14)" stroke="#b48cff" stroke-width="2.4" />
        <path v-else d="M0,-30 L54,0 L0,30 Z" fill="rgba(180,140,255,0.14)" stroke="#b48cff" stroke-width="2.4" />
        <path v-if="gate === 'XOR'" d="M-10,-32 Q6,0 -10,32" fill="none" stroke="#b48cff" stroke-width="2.4" />
        <circle v-if="gate === 'NOT' || gate === 'NAND'" :cx="gate === 'NOT' ? 60 : 64" cy="0" r="6"
          fill="#060c1c" stroke="#b48cff" stroke-width="2.4" />
        <text x="24" y="5" text-anchor="middle" class="lbl-hi" font-size="12" fill="#d9c8ff">{{ gate }}</text>
      </g>
      <!-- 输出 -->
      <line :x1="gate === 'NOT' ? 210 : 214" y1="92" x2="288" y2="92" :stroke="out ? '#34d399' : '#39414f'" stroke-width="3" />
      <circle cx="304" cy="92" r="16" :fill="out ? '#34d399' : '#1b212b'" :stroke="out ? '#8fffc9' : '#4a5568'" stroke-width="2.4" />
      <circle v-if="out" cx="304" cy="92" r="26" fill="#34d399" opacity="0.18" />
      <text x="304" y="97" text-anchor="middle" font-size="15" font-weight="700" :fill="out ? '#04140d' : '#8a94a5'">{{ out ? 1 : 0 }}</text>
      <text x="304" y="126" text-anchor="middle" class="lbl" font-size="9.5">输出（灯泡）</text>
      <!-- 真值表 -->
      <g transform="translate(352,30)">
        <rect x="-8" y="-16" width="112" height="118" rx="6" fill="rgba(6,12,28,0.85)" stroke="rgba(120,190,255,0.18)" />
        <text x="14" y="0" class="lbl" font-size="9">A</text><text x="42" y="0" class="lbl" font-size="9">B</text><text x="72" y="0" class="lbl" font-size="9">出</text>
        <g v-for="(r, i) in rows" :key="i">
          <rect v-if="r.a === A && (gate === 'NOT' || r.b === B)" x="-6" :y="6 + i * 24" width="108" height="20" rx="3"
            fill="rgba(180,140,255,0.2)" stroke="#b48cff" stroke-width="0.8" />
          <text x="14" :y="20 + i * 24" text-anchor="middle" font-size="11" font-family="var(--f-mono)" :fill="r.a ? '#34d399' : '#4a5568'">{{ r.a ? 1 : 0 }}</text>
          <text x="42" :y="20 + i * 24" text-anchor="middle" font-size="11" font-family="var(--f-mono)" :fill="r.b ? '#34d399' : '#4a5568'">{{ r.b ? 1 : 0 }}</text>
          <text x="72" :y="20 + i * 24" text-anchor="middle" font-size="11" font-weight="700" font-family="var(--f-mono)" :fill="r.o ? '#ffd166' : '#4a5568'">{{ r.o ? 1 : 0 }}</text>
        </g>
      </g>
      <text x="20" y="186" class="lbl" font-size="9.5">点圆圈切换 0/1 · 晶体管就是这些开关，一块芯片里有上百亿个</text>
    </svg>

    <!-- ══ 加法器 ══ -->
    <svg v-else-if="mode === 'adder'" viewBox="0 0 460 200">
      <rect width="460" height="200" fill="#060c1c" />
      <g v-for="i in 4" :key="i">
        <g :transform="`translate(${60 + (4 - i) * 76},0)`">
          <!-- A 位 -->
          <circle cx="0" cy="34" r="11" :fill="bitsA[i - 1] ? '#34d399' : '#1b212b'" :stroke="bitsA[i - 1] ? '#34d399' : '#4a5568'" stroke-width="1.8"
            style="cursor:pointer" @click="bitsA[i - 1] = !bitsA[i - 1]; touch('tick', 0.35)" />
          <text x="0" y="38" text-anchor="middle" font-size="11" font-weight="700" :fill="bitsA[i - 1] ? '#04140d' : '#8a94a5'">{{ bitsA[i - 1] ? 1 : 0 }}</text>
          <circle cx="0" cy="66" r="11" :fill="bitsB[i - 1] ? '#5cc8ff' : '#1b212b'" :stroke="bitsB[i - 1] ? '#5cc8ff' : '#4a5568'" stroke-width="1.8"
            style="cursor:pointer" @click="bitsB[i - 1] = !bitsB[i - 1]; touch('tick', 0.35)" />
          <text x="0" y="70" text-anchor="middle" font-size="11" font-weight="700" :fill="bitsB[i - 1] ? '#04140d' : '#8a94a5'">{{ bitsB[i - 1] ? 1 : 0 }}</text>
          <!-- 全加器盒 -->
          <rect x="-26" y="88" width="52" height="34" rx="5" fill="rgba(180,140,255,0.12)" stroke="#b48cff" stroke-width="1.4" />
          <text x="0" y="103" text-anchor="middle" class="lbl" font-size="8.5" fill="#d9c8ff">全加器</text>
          <text x="0" y="116" text-anchor="middle" class="val" font-size="9">FA{{ i }}</text>
          <line x1="0" y1="45" x2="0" y2="88" :stroke="bitsA[i - 1] ? '#34d399' : '#39414f'" stroke-width="2" />
          <line x1="0" y1="77" x2="0" y2="88" :stroke="bitsB[i - 1] ? '#5cc8ff' : '#39414f'" stroke-width="2" />
          <!-- 进位线 -->
          <path :d="`M26,105 h24 v-16 h26`" fill="none" :stroke="adderSteps[i - 1].cout ? '#ffb347' : '#39414f'" stroke-width="2" />
          <text x="38" y="86" class="lbl" font-size="8" :fill="adderSteps[i - 1].cout ? '#ffb347' : '#4a5568'">进位</text>
          <!-- 本位输出 -->
          <line x1="0" y1="122" x2="0" y2="150" :stroke="adderSteps[i - 1].s ? '#ffd166' : '#39414f'" stroke-width="2.4" />
          <rect x="-16" y="150" width="32" height="26" rx="4" :fill="adderSteps[i - 1].s ? 'rgba(255,209,102,0.22)' : 'rgba(120,190,255,0.06)'"
            :stroke="adderSteps[i - 1].s ? '#ffd166' : '#39414f'" stroke-width="1.4" />
          <text x="0" y="168" text-anchor="middle" font-size="13" font-weight="700" :fill="adderSteps[i - 1].s ? '#ffd166' : '#4a5568'">{{ adderSteps[i - 1].s ? 1 : 0 }}</text>
          <text x="0" y="24" text-anchor="middle" class="lbl" font-size="9">2^{{ i - 1 }} = {{ 2 ** (i - 1) }}</text>
        </g>
      </g>
      <!-- 最高位进位 -->
      <rect x="14" y="150" width="32" height="26" rx="4" :fill="sumBits[4] ? 'rgba(255,209,102,0.22)' : 'rgba(120,190,255,0.06)'"
        :stroke="sumBits[4] ? '#ffd166' : '#39414f'" stroke-width="1.4" />
      <text x="30" y="168" text-anchor="middle" font-size="13" font-weight="700" :fill="sumBits[4] ? '#ffd166' : '#4a5568'">{{ sumBits[4] ? 1 : 0 }}</text>
      <text x="30" y="144" text-anchor="middle" class="lbl" font-size="8.5">溢出</text>
      <!-- 算式 -->
      <g transform="translate(330,40)">
        <rect x="-10" y="-24" width="140" height="152" rx="6" fill="rgba(6,12,28,0.85)" stroke="rgba(120,190,255,0.18)" />
        <text class="lbl" font-size="9">A = {{ bitsA.slice().reverse().map(b => b ? 1 : 0).join('') }}</text>
        <text class="val" x="120" text-anchor="end" font-size="12">{{ nA }}</text>
        <text class="lbl" font-size="9" y="20">B = {{ bitsB.slice().reverse().map(b => b ? 1 : 0).join('') }}</text>
        <text class="val" x="120" y="20" text-anchor="end" font-size="12">{{ nB }}</text>
        <line x1="0" y1="30" x2="120" y2="30" stroke="rgba(120,190,255,0.25)" />
        <text class="lbl" font-size="9" y="48">和 = {{ sumBits.slice().reverse().map(b => b ? 1 : 0).join('') }}</text>
        <text class="val" x="120" y="48" text-anchor="end" font-size="14" fill="#ffd166">{{ sum }}</text>
        <text class="lbl" font-size="8.5" y="70" fill="#a9c1de">XOR 输出本位和</text>
        <text class="lbl" font-size="8.5" y="84" fill="#a9c1de">AND 输出进位</text>
        <text class="lbl" font-size="8.5" y="98" fill="#a9c1de">4 个全加器 = 4 位加法器</text>
        <text class="lbl" font-size="8.5" y="112" fill="#a9c1de">再加寄存器与时钟 = CPU</text>
      </g>
    </svg>

    <!-- ══ 一行代码 ══ -->
    <svg v-else-if="mode === 'code'" viewBox="0 0 460 200">
      <rect width="460" height="200" fill="#060c1c" />
      <g v-for="(c, i) in CODE" :key="i" :transform="`translate(${16 + i * 112},20)`" style="cursor:pointer" @click="codeStep = i; touch('page')">
        <rect width="102" height="150" rx="6" :fill="codeStep === i ? 'rgba(180,140,255,0.14)' : 'rgba(120,190,255,0.04)'"
          :stroke="codeStep === i ? '#b48cff' : 'rgba(120,190,255,0.18)'" stroke-width="1.4" />
        <text x="10" y="20" class="lbl" font-size="8.5">STEP {{ i + 1 }}</text>
        <text x="10" y="36" class="lbl-hi" font-size="11">{{ c.n }}</text>
        <foreignObject x="8" y="44" width="86" height="98">
          <div xmlns="http://www.w3.org/1999/xhtml"
            style="font-family:var(--f-mono);font-size:8.5px;line-height:1.5;color:#a9c1de;white-space:pre-wrap;word-break:break-all">{{ c.s }}</div>
        </foreignObject>
        <path v-if="i < 3" :d="`M104,75 l8,-5 v10 z`" fill="#b48cff" :opacity="codeStep > i ? 1 : 0.4" />
      </g>
      <text x="230" y="188" text-anchor="middle" class="lbl" font-size="9.5">{{ CODE[codeStep].d }}</text>
    </svg>

    <!-- ══ 神经元 ══ -->
    <svg v-else-if="mode === 'neuron'" viewBox="0 0 460 200">
      <rect width="460" height="200" fill="#060c1c" />
      <!-- 决策区 -->
      <g>
        <rect x="150" y="20" width="130" height="130" rx="4" fill="rgba(120,190,255,0.04)" stroke="rgba(120,190,255,0.2)" />
        <g v-for="i in 4" :key="i">
          <line :x1="150 + i * 26" y1="20" :x2="150 + i * 26" y2="150" stroke="rgba(120,190,255,0.07)" />
          <line x1="150" :y1="20 + i * 26" x2="280" :y2="20 + i * 26" stroke="rgba(120,190,255,0.07)" />
        </g>
        <path :d="boundary" stroke="#ffd166" stroke-width="2" stroke-dasharray="6 4" />
        <g v-for="(p, i) in DATA" :key="i">
          <circle :cx="150 + p.x * 130" :cy="150 - p.y * 130" r="4.4"
            :fill="p.c ? '#34d399' : '#fb7185'" :opacity="0.55 + Math.abs(predict(p.x, p.y) - 0.5)" />
          <circle v-if="(predict(p.x, p.y) > 0.5 ? 1 : 0) !== p.c" :cx="150 + p.x * 130" :cy="150 - p.y * 130" r="7.6"
            fill="none" stroke="#ffd166" stroke-width="1.2" opacity="0.9" />
        </g>
        <text x="150" y="166" class="lbl" font-size="8.5">输入 x₁ →</text>
        <text x="146" y="30" text-anchor="end" class="lbl" font-size="8.5">x₂ ↑</text>
      </g>
      <!-- 网络示意 -->
      <g transform="translate(46,86)">
        <circle cx="0" cy="-30" r="9" fill="rgba(92,200,255,0.18)" stroke="#5cc8ff" stroke-width="1.6" />
        <circle cx="0" cy="30" r="9" fill="rgba(92,200,255,0.18)" stroke="#5cc8ff" stroke-width="1.6" />
        <text x="0" y="-27" text-anchor="middle" class="lbl" font-size="8">x₁</text>
        <text x="0" y="33" text-anchor="middle" class="lbl" font-size="8">x₂</text>
        <circle cx="62" cy="0" r="15" fill="rgba(180,140,255,0.16)" stroke="#b48cff" stroke-width="1.8" />
        <text x="62" y="4" text-anchor="middle" font-size="9" fill="#d9c8ff">Σ·σ</text>
        <line x1="9" y1="-30" x2="48" y2="-4" :stroke="w1 >= 0 ? '#34d399' : '#fb7185'" :stroke-width="clamp(Math.abs(w1) * 3, 0.6, 6)" />
        <line x1="9" y1="30" x2="48" y2="4" :stroke="w2 >= 0 ? '#34d399' : '#fb7185'" :stroke-width="clamp(Math.abs(w2) * 3, 0.6, 6)" />
        <text x="26" y="-24" class="val" font-size="8.5">w₁ {{ w1.toFixed(2) }}</text>
        <text x="26" y="34" class="val" font-size="8.5">w₂ {{ w2.toFixed(2) }}</text>
        <line x1="77" y1="0" x2="96" y2="0" stroke="#b48cff" stroke-width="2" />
        <text x="62" y="-24" text-anchor="middle" class="lbl" font-size="8">b {{ bias.toFixed(2) }}</text>
      </g>
      <!-- 损失曲线 -->
      <g transform="translate(300,20)">
        <rect x="0" y="0" width="144" height="130" rx="6" fill="rgba(6,12,28,0.85)" stroke="rgba(120,190,255,0.18)" />
        <text x="10" y="18" class="lbl" font-size="9">损失（越小越准）</text>
        <text x="134" y="18" text-anchor="end" class="val" font-size="11">{{ loss.toFixed(4) }}</text>
        <rect x="10" y="30" width="124" height="8" rx="4" fill="rgba(120,190,255,0.12)" />
        <rect x="10" y="30" :width="clamp(loss / 0.7, 0, 1) * 124" height="8" rx="4" :fill="loss < 0.05 ? '#34d399' : '#ffb347'" />
        <text x="10" y="58" class="lbl" font-size="9">准确率</text>
        <text x="134" y="58" text-anchor="end" class="val" font-size="11" fill="#34d399">{{ (accuracy * 100).toFixed(0) }}%</text>
        <text x="10" y="80" class="lbl" font-size="9">训练轮数</text>
        <text x="134" y="80" text-anchor="end" class="val" font-size="11">{{ epoch }}</text>
        <text x="10" y="104" class="lbl" font-size="8.5" fill="#a9c1de">黄圈 = 分错的点</text>
        <text x="10" y="118" class="lbl" font-size="8.5" fill="#a9c1de">绿线权重为正，红线为负</text>
      </g>
      <text x="150" y="188" class="lbl" font-size="9.5">单个神经元只能画一条直线；要解决"异或"就得叠很多层 —— 这就是"深度"学习。</text>
    </svg>

    <!-- ══ 流水线 ══ -->
    <svg v-else viewBox="0 0 460 200">
      <rect width="460" height="200" fill="#060c1c" />
      <g v-for="(s, si) in STAGES" :key="s">
        <text :x="146 + si * 62" y="34" text-anchor="middle" class="lbl" font-size="10" :fill="pipeCycle % 5 === si ? '#ffd166' : '#64809f'">{{ s }}</text>
        <line :x1="146 + si * 62" y1="40" :x2="146 + si * 62" y2="176" stroke="rgba(120,190,255,0.12)" />
      </g>
      <g v-for="(ins, i) in INSTR" :key="ins.a">
        <text x="20" :y="60 + i * 30" class="val" font-size="10.5">{{ ins.a }}</text>
        <g v-for="(st, si) in STAGES" :key="si">
          <rect :x="146 + si * 62 - 27" :y="48 + i * 30" width="54" height="22" rx="4"
            :fill="cellOn(i, si) ? 'rgba(180,140,255,0.42)' : 'rgba(120,190,255,0.06)'"
            :stroke="cellOn(i, si) ? '#b48cff' : 'rgba(120,190,255,0.14)'" stroke-width="1.2" />
          <text v-if="pipeOn || si === 0" :x="146 + si * 62" :y="63 + i * 30" text-anchor="middle" class="lbl" font-size="8.5"
            :fill="cellOn(i, si) ? '#f0e6ff' : '#4a5568'">{{ st }}</text>
        </g>
      </g>
      <!-- 时钟 -->
      <g transform="translate(20,150)">
        <text class="lbl" font-size="9">时钟节拍 {{ pipeCycle }}</text>
        <path :d="`M0,26 ${Array.from({ length: 12 }, (_, i) => `h6 ${i % 2 ? 'v-10 h6 v10' : 'v10 h6 v-10'}`).join(' ')}`"
          fill="none" stroke="#5cc8ff" stroke-width="1.4" :stroke-dasharray="pipeOn ? 'none' : '3 3'" opacity="0.8" />
      </g>
      <text x="20" y="192" class="lbl" font-size="9.5">{{ pipeOn ? '流水线开：4 条指令 8 拍走完' : '流水线关：4 条指令 20 拍' }}</text>
      <g transform="translate(356,150)">
        <rect x="0" y="0" width="88" height="42" rx="6" fill="rgba(6,12,28,0.85)" stroke="rgba(120,190,255,0.18)" />
        <text x="10" y="16" class="lbl" font-size="8.5">加速比</text>
        <text x="78" y="32" text-anchor="end" class="val" font-size="15" fill="#34d399">{{ pipeOn ? '2.5×' : '1.0×' }}</text>
      </g>
    </svg>

    <template #ctrl>
      <template v-if="mode === 'gates'">
        <button v-for="g in (['AND', 'OR', 'NOT', 'XOR', 'NAND'] as const)" :key="g" class="demo-btn"
          :class="{ 'demo-btn--on': gate === g }" @click="gate = g; touch('click')">{{ g }}</button>
        <div class="demo-ctrl__spacer" />
        <button class="demo-btn" :class="{ 'demo-btn--on': A }" @click="A = !A; touch('click')">A = {{ A ? 1 : 0 }}</button>
        <button class="demo-btn" :class="{ 'demo-btn--on': B }" @click="B = !B; touch('click')" :disabled="gate === 'NOT'">B = {{ B ? 1 : 0 }}</button>
        <div class="demo-meter"><span class="demo-meter__k">输出</span><span class="demo-meter__v">{{ out ? 1 : 0 }}</span></div>
      </template>

      <template v-else-if="mode === 'adder'">
        <button class="demo-btn" @click="bitsA = [true, false, true, false]; bitsB = [true, true, false, false]; touch('click')">A=5 B=3</button>
        <button class="demo-btn" @click="bitsA = [true, true, true, true]; bitsB = [true, false, false, false]; touch('click')">A=15 B=1（看溢出）</button>
        <button class="demo-btn demo-btn--ghost" @click="bitsA = [false, false, false, false]; bitsB = [false, false, false, false]; touch('cancel')">清零</button>
        <div class="demo-ctrl__spacer" />
        <div class="demo-meter"><span class="demo-meter__k">算式</span><span class="demo-meter__v" style="min-width:96px">{{ nA }} + {{ nB }} = {{ sum }}</span></div>
      </template>

      <template v-else-if="mode === 'code'">
        <button v-for="(c, i) in CODE" :key="c.n" class="demo-btn" :class="{ 'demo-btn--on': codeStep === i }"
          @click="codeStep = i; touch('page')">{{ i + 1 }}. {{ c.n }}</button>
        <div class="demo-ctrl__spacer" />
        <button class="demo-btn" @click="codeStep = (codeStep + 1) % CODE.length; touch('whoosh')">▶ 下一步</button>
      </template>

      <template v-else-if="mode === 'neuron'">
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">权重 w₁ <b>{{ w1.toFixed(2) }}</b></span>
          <input class="demo-slider" type="range" min="-3" max="3" step="0.01" v-model.number="w1" @input="training = false; touch('tick', 0.2)">
        </div>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">权重 w₂ <b>{{ w2.toFixed(2) }}</b></span>
          <input class="demo-slider" type="range" min="-3" max="3" step="0.01" v-model.number="w2" @input="training = false; touch('tick', 0.2)">
        </div>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">阈值 b <b>{{ bias.toFixed(2) }}</b></span>
          <input class="demo-slider" type="range" min="-2" max="2" step="0.01" v-model.number="bias" @input="training = false; touch('tick', 0.2)">
        </div>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">学习率 <b>{{ lr.toFixed(2) }}</b></span>
          <input class="demo-slider" style="width:80px" type="range" min="0.05" max="3" step="0.05" v-model.number="lr" @input="touch('tick', 0.2)">
        </div>
        <div class="demo-ctrl__spacer" />
        <button class="demo-btn demo-btn--big" :class="{ 'demo-btn--on': training }"
          @click="training = !training; touch(training ? 'power' : 'cancel')">{{ training ? '⏸ 暂停训练' : '▶ 自动训练' }}</button>
        <button class="demo-btn demo-btn--ghost" @click="w1 = 0.2; w2 = 0.1; bias = 0; epoch = 0; touch('cancel')">↺ 重置权重</button>
      </template>

      <template v-else>
        <div class="demo-ctrl__group">
          <span class="demo-ctrl__label">流水线</span>
          <button class="demo-toggle" :class="{ 'is-on': pipeOn }" @click="pipeOn = !pipeOn; touch(pipeOn ? 'unlock' : 'cancel')" />
        </div>
        <button class="demo-btn" @click="pipeT += 0.72; touch('tick', 0.4)">⏭ 单步一拍</button>
        <button class="demo-btn demo-btn--ghost" @click="pipeT = 0; touch('cancel')">↺ 归零</button>
        <div class="demo-ctrl__spacer" />
        <div class="demo-meter"><span class="demo-meter__k">当前拍</span><span class="demo-meter__v">{{ pipeCycle }}</span></div>
        <div class="demo-meter"><span class="demo-meter__k">总拍数</span><span class="demo-meter__v">{{ pipeOn ? 8 : 20 }}</span></div>
      </template>
    </template>
  </DemoFrame>
</template>
