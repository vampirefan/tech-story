<script setup lang="ts">
import { computed, ref } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf, clamp, wavePath } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
  K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
  U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.'
}
const REV: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]))

const msg = ref('SOS')
const speed = ref(1)
const distance = ref(600)   // km
const relays = ref(2)

/* ── 编码 ── */
interface El { ch: string; sym: '.' | '-' | 'ig' | 'cg' | 'wg'; dur: number }
const elements = computed<El[]>(() => {
  const out: El[] = []
  const up = msg.value.toUpperCase().slice(0, 24)
  for (let i = 0; i < up.length; i++) {
    const ch = up[i]
    if (ch === ' ') { out.push({ ch, sym: 'wg', dur: 7 }); continue }
    const code = MORSE[ch]
    if (!code) continue
    if (out.length) out.push({ ch, sym: 'cg', dur: 3 })
    for (let j = 0; j < code.length; j++) {
      if (j) out.push({ ch, sym: 'ig', dur: 1 })
      out.push({ ch, sym: code[j] as '.' | '-', dur: code[j] === '.' ? 1 : 3 })
    }
  }
  return out
})
const totalUnits = computed(() => elements.value.reduce((s, e) => s + e.dur, 0))
/** 每个元素的起始单位时间（前缀和），播放与纸带都靠它定位 */
const starts = computed(() => {
  const out: number[] = []
  let acc = 0
  for (const e of elements.value) { out.push(acc); acc += e.dur }
  return out
})
const seconds = computed(() => totalUnits.value * 0.09 / speed.value)

/* ── 播放 ── */
const playing = ref(false)
const cursor = ref(0)      // 单位时间游标
const keyDown = ref(false)
const tapeX = ref(0)

useRaf((dt) => {
  if (playing.value) {
    const before = cursor.value
    cursor.value += dt / (0.09 / speed.value)
    const st = starts.value
    let idx = -1
    for (let i = 0; i < st.length; i++) { if (cursor.value >= st[i]) idx = i; else break }
    const el = idx >= 0 ? elements.value[idx] : undefined
    const down = !!el && (el.sym === '.' || el.sym === '-')
    if (down !== keyDown.value) {
      keyDown.value = down
      if (down) touch(el!.sym === '.' ? 'tick' : 'power', el!.sym === '.' ? 0.3 : 0.55)
    }
    tapeX.value = clamp(cursor.value / Math.max(1, totalUnits.value), 0, 1) * 300
    if (cursor.value >= totalUnits.value || before >= totalUnits.value) stop()
  }
  if (manualDown.value) manualDur.value += dt
  else if (manualBuf.value.length && idleT.value < 99) {
    idleT.value += dt / (0.09 / speed.value)
    if (idleT.value > 3) { commitChar(); idleT.value = 99 }
  }
})

function play() {
  if (!elements.value.length) return
  playing.value = true
  cursor.value = 0
  tapeX.value = 0
  touch('whoosh')
}
function stop() { playing.value = false; keyDown.value = false }

/* ── 手键练习 ── */
const manualDown = ref(false)
const manualDur = ref(0)
const manualBuf = ref('')
const decoded = ref('')
const idleT = ref(99)

function keyPress() { manualDown.value = true; manualDur.value = 0; idleT.value = 0; touch('tick', 0.25) }
function keyRelease() {
  manualDown.value = false
  const d = manualDur.value
  if (d < 0.02) return
  const unit = 0.09 / speed.value
  manualBuf.value += d / unit < 2 ? '.' : '-'
  idleT.value = 0
  manualDur.value = 0
}
function commitChar() {
  if (!manualBuf.value) return
  decoded.value += REV[manualBuf.value] ?? '▯'
  manualBuf.value = ''
  touch(REV[manualBuf.value] ? 'correct' : 'wrong')
}
function clearManual() { decoded.value = ''; manualBuf.value = ''; idleT.value = 99; touch('cancel') }

/* ── 线路衰减 ── */
const hop = computed(() => distance.value / (relays.value + 1))
const amp = computed(() => clamp(Math.exp(-hop.value / 520), 0.04, 1))
const errRate = computed(() => clamp((1 - amp.value) * 0.9 - relays.value * 0.02, 0, 0.95))

const status = computed(() => {
  if (manualBuf.value || decoded.value) return { text: `你敲出的是「${manualBuf.value || '…'}」，已解出「${decoded.value || '（等待字符间隔）'}」。短按是点，长按（≈3 倍时长）是划。` }
  if (playing.value) return { text: '正在发报 —— 注意听：点是 1 个时间单位，划是 3 个，符号间空 1，字母间空 3，词间空 7。停顿本身也是信息。' }
  if (amp.value < 0.35) return { text: `线路 ${distance.value} km 只有 ${relays.value} 个中继站，信号衰减到 ${(amp.value * 100).toFixed(0)}%，误码率 ${(errRate.value * 100).toFixed(0)}% —— 加中继站！`, kind: 'warn' as const }
  return { text: `全程 ${seconds.value.toFixed(1)} 秒发完 ${msg.value.length} 个字符。信号强度 ${(amp.value * 100).toFixed(0)}%，几乎不会出错。`, kind: 'good' as const }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="≋" color="var(--cat-communication)" :status="status" note="1844 年：「上帝创造了何等的奇迹！」——华盛顿到巴尔的摩">
    <svg viewBox="0 0 460 224">
      <defs>
        <linearGradient id="tgBrass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e2c07a" /><stop offset="0.5" stop-color="#a9822f" /><stop offset="1" stop-color="#5c4415" />
        </linearGradient>
        <clipPath id="tgClip"><rect x="30" y="18" width="400" height="34" /></clipPath>
      </defs>
      <rect width="460" height="224" fill="#060c1c" />

      <!-- 纸带 -->
      <g>
        <rect x="30" y="18" width="400" height="34" rx="4" fill="#e8dcc0" opacity="0.92" />
        <g clip-path="url(#tgClip)">
          <g :transform="`translate(${334 - tapeX},0)`">
            <g v-for="(e, i) in elements" :key="i"
              :transform="`translate(${starts[i] * (300 / Math.max(1, totalUnits))},0)`">
              <circle v-if="e.sym === '.'" cx="0" cy="35" r="3.4" fill="#1a1408" />
              <rect v-else-if="e.sym === '-'" x="-7" y="31.6" width="14" height="6.8" rx="3.4" fill="#1a1408" />
            </g>
          </g>
        </g>
        <line x1="334" y1="18" x2="334" y2="52" stroke="#ff5f56" stroke-width="1.2" opacity="0.7" />
        <text x="30" y="14" class="lbl" font-size="9">收报纸带 · {{ msg.toUpperCase() || '（空）' }}</text>
        <text x="430" y="14" text-anchor="end" class="lbl" font-size="9">{{ totalUnits }} 单位 · {{ seconds.toFixed(1) }}s</text>
      </g>

      <!-- 线路 + 波形 -->
      <g>
        <path d="M62,120 C 140,96 320,96 398,120" fill="none" stroke="#4a5568" stroke-width="2" />
        <g v-for="i in 6" :key="i">
          <line :x1="30 + i * 70" y1="108" :x2="30 + i * 70" y2="126" stroke="#39414f" stroke-width="3" />
        </g>
        <!-- 中继站 -->
        <g v-for="r in relays" :key="'r' + r" :transform="`translate(${62 + (336 / (relays + 1)) * r},${112 - Math.sin((r / (relays + 1)) * Math.PI) * 18})`">
          <rect x="-9" y="-14" width="18" height="16" rx="2" fill="#1f3a4a" stroke="#5cc8ff" stroke-width="1" />
          <circle cx="0" cy="-6" r="2.6" :fill="playing ? '#34d399' : '#5cc8ff'" :class="playing ? 'demo-flicker' : ''" />
          <text y="12" text-anchor="middle" class="lbl" font-size="8">中继</text>
        </g>
        <!-- 信号波形 -->
        <path :d="wavePath(62, 150, 336, 16 * amp, 6, tapeX * 0.06 + (playing ? cursor * 0.4 : 0))"
          fill="none" :stroke="amp > 0.5 ? '#34d399' : '#ffb347'" stroke-width="1.8" opacity="0.9" />
        <text x="62" y="176" class="lbl" font-size="9">线路信号 · 强度 {{ (amp * 100).toFixed(0) }}%</text>
        <text x="398" y="176" text-anchor="end" class="lbl" font-size="9" :fill="errRate > 0.2 ? '#fb7185' : '#64809f'">误码率 {{ (errRate * 100).toFixed(0) }}%</text>
      </g>

      <!-- 发报键 -->
      <g transform="translate(34,186)">
        <rect x="0" y="10" width="86" height="12" rx="3" fill="#3a2d19" stroke="#1d1608" />
        <g :transform="`translate(0,${keyDown || manualDown ? 5 : 0})`" style="transition:transform 60ms linear">
          <rect x="12" y="0" width="58" height="9" rx="3" fill="url(#tgBrass)" stroke="#2b2108" />
          <circle cx="70" cy="4" r="6" fill="#5c4415" stroke="#2b2108" />
        </g>
        <circle :cx="43" cy="30" r="4" :fill="keyDown || manualDown ? '#34d399' : '#1f3a2a'">
          <animate v-if="keyDown || manualDown" attributeName="opacity" values="1;0.4;1" dur="0.3s" repeatCount="indefinite" />
        </circle>
        <text x="43" y="-6" text-anchor="middle" class="lbl" font-size="9">发报键</text>
      </g>

      <!-- 收报电磁铁 -->
      <g transform="translate(360,186)">
        <rect x="0" y="4" width="62" height="20" rx="3" fill="#39414f" stroke="#171b23" />
        <g v-for="i in 3" :key="i">
          <rect :x="6 + (i - 1) * 18" y="7" width="12" height="14" rx="2" fill="#a9822f" opacity="0.75" />
        </g>
        <path d="M10,2 l14,0 M38,2 l14,0" stroke="url(#tgBrass)" stroke-width="3" />
        <circle cx="31" cy="0" r="4" :fill="keyDown ? '#ffd166' : '#3a3320'" />
        <text x="31" y="38" text-anchor="middle" class="lbl" font-size="9">电磁铁吸合 → 打点</text>
      </g>
    </svg>

    <template #ctrl>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">报文</span>
        <input class="demo-btn" style="width:132px;text-align:left;font-family:var(--f-mono);letter-spacing:.14em"
          :value="msg" maxlength="24" @input="msg = ($event.target as HTMLInputElement).value; touch('tick', 0.12)">
      </div>
      <button class="demo-btn demo-btn--big" @click="playing ? stop() : play()">{{ playing ? '■ 停止' : '▶ 发报' }}</button>
      <button class="demo-btn" @pointerdown.prevent="keyPress" @pointerup="keyRelease" @pointerleave="manualDown && keyRelease()">
        ✊ 按住敲键（短=点 长=划）
      </button>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">速度 <b>{{ speed.toFixed(1) }}×</b></span>
        <input class="demo-slider" type="range" min="0.4" max="3" step="0.1" v-model.number="speed" @input="touch('tick', 0.16)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">线长 <b>{{ distance }}km</b></span>
        <input class="demo-slider" type="range" min="50" max="3000" step="50" v-model.number="distance" @input="touch('tick', 0.16)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">中继站 <b>{{ relays }}</b></span>
        <input class="demo-slider" type="range" min="0" max="6" step="1" style="width:80px" v-model.number="relays" @input="touch('tick', 0.16)">
      </div>
      <div class="demo-ctrl__spacer" />
      <div class="demo-meter">
        <span class="demo-meter__k">你的解码</span>
        <span class="demo-meter__v" style="min-width:88px;font-family:var(--f-mono)">{{ decoded || '—' }}<span v-if="manualBuf">{{ manualBuf }}</span></span>
      </div>
      <button class="demo-btn demo-btn--ghost" @click="clearManual">↺ 清空</button>
    </template>
  </DemoFrame>
</template>
