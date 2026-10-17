<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DemoFrame from './DemoFrame.vue'
import { useDemoTouch, useRaf } from './useDemo'

defineProps<{ demoId: string; title: string; hint?: string; points?: string[] }>()
const touch = useDemoTouch()

/* ── 拓扑：一台主机、一台服务器、五台路由器 ── */
interface NetNode { id: string; x: number; y: number; kind: 'src' | 'dst' | 'r'; label: string }
const NODES: NetNode[] = [
  { id: 'S', x: 42, y: 112, kind: 'src', label: '你的电脑' },
  { id: 'A', x: 132, y: 46, kind: 'r', label: 'R1' },
  { id: 'B', x: 132, y: 178, kind: 'r', label: 'R2' },
  { id: 'C', x: 230, y: 112, kind: 'r', label: 'R3' },
  { id: 'D', x: 328, y: 46, kind: 'r', label: 'R4' },
  { id: 'E', x: 328, y: 178, kind: 'r', label: 'R5' },
  { id: 'T', x: 418, y: 112, kind: 'dst', label: '服务器' }
]
const POS: Record<string, NetNode> = Object.fromEntries(NODES.map(n => [n.id, n]))
const EDGES: [string, string][] = [
  ['S', 'A'], ['S', 'B'], ['A', 'C'], ['B', 'C'], ['A', 'D'],
  ['C', 'D'], ['C', 'E'], ['B', 'E'], ['D', 'E'], ['D', 'T'], ['E', 'T']
]
const CUT_EDGE: [string, string] = ['C', 'D']
const ekey = (a: string, b: string) => (a < b ? a + b : b + a)

const msg = ref('你好，世界')
const speed = ref(1)
const lossRate = ref(0)      // 0-40 %
const cut = ref(false)
const PKT_COLORS = ['#5cc8ff', '#ffd166', '#34d399', '#fb7185']

/* ── 路由：带拥塞权重的最短路（Dijkstra），让包自然分流 ── */
const usage = ref<Record<string, number>>({})
function liveEdges(): [string, string][] {
  return EDGES.filter(([a, b]) => !(cut.value && ekey(a, b) === ekey(...CUT_EDGE)))
}
function route(from: string, avoidFirst?: string): string[] {
  const adj: Record<string, string[]> = {}
  for (const [a, b] of liveEdges()) { (adj[a] ||= []).push(b); (adj[b] ||= []).push(a) }
  const dist: Record<string, number> = { [from]: 0 }
  const prev: Record<string, string> = {}
  const done = new Set<string>()
  for (;;) {
    let cur = ''
    let best = Infinity
    for (const id of Object.keys(dist)) if (!done.has(id) && dist[id] < best) { best = dist[id]; cur = id }
    if (!cur) break
    done.add(cur)
    if (cur === 'T') break
    for (const nb of adj[cur] || []) {
      let w = 1 + 0.45 * (usage.value[ekey(cur, nb)] || 0)
      if (avoidFirst && cur === from && nb === avoidFirst) w += 2.5
      const nd = best + w
      if (nd < (dist[nb] ?? Infinity)) { dist[nb] = nd; prev[nb] = cur }
    }
  }
  if (!('T' in dist)) return []
  const path = ['T']
  while (path[0] !== from) path.unshift(prev[path[0]])
  return path
}

/* ── 包 ── */
interface Pkt {
  seq: number; color: string
  path: string[]; seg: number; t: number
  state: 'flight' | 'dropped' | 'done'
  timer: number; fade: number
}
const pkts = ref<Pkt[]>([])
const arrived = ref<boolean[]>([false, false, false, false])
const retransmits = ref(0)
const sending = ref(false)

function send() {
  usage.value = {}
  pkts.value = []
  arrived.value = [false, false, false, false]
  retransmits.value = 0
  sending.value = true
  let firstHop = ''
  for (let i = 0; i < 4; i++) {
    const path = route('S', i === 1 ? firstHop : '')
    if (!path.length) { sending.value = false; return }
    if (i === 0) firstHop = path[1]
    usage.value[ekey(path[0], path[1])] = (usage.value[ekey(path[0], path[1])] || 0) + 1
    pkts.value.push({ seq: i, color: PKT_COLORS[i], path, seg: 0, t: 0, state: 'flight', timer: 0, fade: 1 })
  }
  touch('whoosh')
}

function posOf(p: Pkt): { x: number; y: number } {
  const a = POS[p.path[p.seg]]
  const b = POS[p.path[Math.min(p.seg + 1, p.path.length - 1)]]
  return { x: a.x + (b.x - a.x) * p.t, y: a.y + (b.y - a.y) * p.t }
}

useRaf((dt) => {
  let active = false
  for (const p of pkts.value) {
    if (p.state === 'done') continue
    active = true
    if (p.state === 'dropped') {
      p.fade = Math.max(0, p.fade - dt * 1.4)
      p.timer -= dt
      if (p.timer <= 0) {
        const path = route('S')
        if (!path.length) continue
        p.path = path; p.seg = 0; p.t = 0; p.fade = 1; p.state = 'flight'
        retransmits.value++
        usage.value[ekey(path[0], path[1])] = (usage.value[ekey(path[0], path[1])] || 0) + 1
        touch('tick', 0.3)
      }
      continue
    }
    p.t += dt * 1.15 * speed.value
    while (p.t >= 1) {
      p.t -= 1
      p.seg++
      if (p.seg >= p.path.length - 1) {           // 到达服务器
        p.state = 'done'
        arrived.value[p.seq] = true
        touch('tick', 0.45)
        if (arrived.value.every(Boolean)) { sending.value = false; touch('correct') }
        break
      }
      // 逐跳丢包判定
      if (lossRate.value > 0 && Math.random() < lossRate.value / 100) {
        p.state = 'dropped'; p.timer = 1.1; p.t = 0
        touch('wrong', 0.5)
        break
      }
    }
  }
  if (!active && sending.value && pkts.value.length) sending.value = false
})

/* 线路被切断时，在途且还要走这条线的包立刻改道 */
watch(cut, () => {
  for (const p of pkts.value) {
    if (p.state !== 'flight') continue
    const cur = p.path[p.seg]
    const rest = p.path.slice(p.seg)
    if (rest.some((id, i) => i && ekey(rest[i - 1], id) === ekey(...CUT_EDGE))) {
      const np = route(cur)
      if (np.length) { p.path = np; p.seg = 0; p.t = 0 }
    }
  }
  touch(cut.value ? 'wrong' : 'click', 0.5)
})

/* ── 读数 ── */
const doneCount = computed(() => arrived.value.filter(Boolean).length)
const edgeLoad = computed(() => {
  const m: Record<string, number> = {}
  for (const p of pkts.value) if (p.state === 'flight') m[ekey(p.path[p.seg], p.path[p.seg + 1])] = 1
  return m
})
const hopsOf = computed(() => {
  const p = pkts.value.find(x => x.state === 'flight')
  return p ? p.path.length - 1 : 0
})
const status = computed(() => {
  if (cut.value && doneCount.value === 4) return { text: '线路被切断也没关系：在途的包从当前路由器重新查表绕路，消息照样到齐 —— 这就是"无中心"网络的韧性。', kind: 'good' as const }
  if (doneCount.value === 4 && pkts.value.length) return { text: `4 个包全部到齐，按序号拼回「${msg.value || '…'}」。共重传 ${retransmits.value} 次。分组交换：线路空闲时别人也能用，效率远高于独占一条线。`, kind: 'good' as const }
  if (pkts.value.some(p => p.state === 'dropped')) return { text: '有包在半路丢了！发送端等不到确认，1 秒后自动重传 —— TCP 的"丢包就重传、乱序就重排"。', kind: 'warn' as const }
  if (cut.value) return { text: 'R3–R4 线路已切断。点"发送"看包怎么绕开它；在途的包也会从当前节点重新选路。', kind: 'warn' as const }
  if (sending.value) return { text: `4 个包正在各自找路（当前这条 ${hopsOf.value} 跳）。注意它们走的不一定是同一条路 —— 路由器只认路由表，不认"顺序"。` }
  return { text: '点"发送"把消息切成 4 个带序号的包。再试试切断线路、调高丢包率，看网络如何自愈。' }
})
</script>

<template>
  <DemoFrame :demo-id="demoId" :title="title" :hint="hint" :points="points"
    icon="⇄" color="var(--cat-communication)" :status="status"
    note="1969 年 ARPANET 的第一条消息只传出了「LO」—— 本想发 LOGIN，第 3 个字符时系统就崩了">
    <svg viewBox="0 0 460 224">
      <rect width="460" height="224" fill="#060c1c" />

      <!-- 链路 -->
      <g v-for="[a, b] in EDGES" :key="ekey(a, b)">
        <line v-if="cut && ekey(a, b) === ekey(...CUT_EDGE)"
          :x1="POS[a].x" :y1="POS[a].y" :x2="POS[b].x" :y2="POS[b].y"
          stroke="#fb7185" stroke-width="1.6" stroke-dasharray="5 5" opacity="0.75" />
        <line v-else :x1="POS[a].x" :y1="POS[a].y" :x2="POS[b].x" :y2="POS[b].y"
          :stroke="edgeLoad[ekey(a, b)] ? '#5cc8ff' : '#2b3a55'"
          :stroke-width="edgeLoad[ekey(a, b)] ? 2.4 : 1.4"
          :opacity="edgeLoad[ekey(a, b)] ? 0.95 : 0.8" />
      </g>
      <g v-if="cut" :transform="`translate(${(POS[CUT_EDGE[0]].x + POS[CUT_EDGE[1]].x) / 2},${(POS[CUT_EDGE[0]].y + POS[CUT_EDGE[1]].y) / 2})`">
        <text text-anchor="middle" dy="-4" font-size="13" fill="#fb7185">✂</text>
      </g>

      <!-- 节点 -->
      <g v-for="n in NODES" :key="n.id" :transform="`translate(${n.x},${n.y})`">
        <g v-if="n.kind === 'r'">
          <rect x="-13" y="-10" width="26" height="20" rx="4" fill="#12233c" stroke="#3d5a80" stroke-width="1.2" />
          <circle cx="-6" cy="0" r="1.8" fill="#5cc8ff" opacity="0.9" />
          <circle cx="0" cy="0" r="1.8" fill="#5cc8ff" opacity="0.6" />
          <circle cx="6" cy="0" r="1.8" fill="#5cc8ff" opacity="0.35" />
          <text y="22" text-anchor="middle" class="lbl" font-size="8.5">{{ n.label }}</text>
        </g>
        <g v-else>
          <rect x="-17" y="-13" width="34" height="26" rx="4"
            :fill="n.kind === 'src' ? '#123047' : '#1d2a17'"
            :stroke="n.kind === 'src' ? '#5cc8ff' : '#34d399'" stroke-width="1.4" />
          <rect v-if="n.kind === 'src'" x="-11" y="-8" width="22" height="13" rx="2" fill="#0a1626" stroke="#5cc8ff" stroke-width="0.8" />
          <g v-else>
            <line x1="-11" y1="-5" x2="11" y2="-5" stroke="#34d399" stroke-width="1" />
            <line x1="-11" y1="1" x2="11" y2="1" stroke="#34d399" stroke-width="1" />
            <circle cx="8" cy="-5" r="1.4" fill="#ffd166" />
            <circle cx="8" cy="1" r="1.4" fill="#ffd166" />
          </g>
          <text y="26" text-anchor="middle" class="lbl" font-size="9">{{ n.label }}</text>
        </g>
      </g>

      <!-- 在途 / 丢失的包 -->
      <g v-for="p in pkts" :key="p.seq"
        v-show="p.state !== 'done'"
        :transform="`translate(${posOf(p).x},${posOf(p).y})`"
        :opacity="p.state === 'dropped' ? p.fade : 1">
        <rect x="-7" y="-6" width="14" height="12" rx="2.5" :fill="p.color" :stroke="p.state === 'dropped' ? '#fb7185' : '#0a1626'" stroke-width="1.2" />
        <text y="3.4" text-anchor="middle" font-size="8" font-weight="700" fill="#08101e">{{ p.seq + 1 }}</text>
        <text v-if="p.state === 'dropped'" y="-10" text-anchor="middle" font-size="9" fill="#fb7185">✕ 丢包</text>
      </g>

      <!-- 接收端拼装条 -->
      <g transform="translate(150,16)">
        <text x="-6" y="4" text-anchor="end" class="lbl" font-size="9">按序号拼装</text>
        <g v-for="i in 4" :key="i" :transform="`translate(${i * 30 - 24},0)`">
          <rect x="-11" y="-8" width="22" height="16" rx="3"
            :fill="arrived[i - 1] ? PKT_COLORS[i - 1] : '#0d1a2e'"
            :stroke="arrived[i - 1] ? PKT_COLORS[i - 1] : '#2b3a55'" stroke-width="1.1" />
          <text y="4" text-anchor="middle" font-size="8.5" font-weight="700"
            :fill="arrived[i - 1] ? '#08101e' : '#41546f'">{{ i }}</text>
        </g>
        <text x="118" y="4" class="lbl" font-size="9" :fill="doneCount === 4 ? '#34d399' : '#64809f'">
          {{ doneCount === 4 ? '✓ ' + (msg || '…') : `${doneCount}/4 到齐` }}
        </text>
      </g>
    </svg>

    <template #ctrl>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">消息</span>
        <input class="demo-btn" style="width:110px;text-align:left"
          :value="msg" maxlength="10" @input="msg = ($event.target as HTMLInputElement).value; touch('tick', 0.12)">
      </div>
      <button class="demo-btn demo-btn--big" @click="send">▶ 发送（切成 4 包）</button>
      <button class="demo-btn" :class="{ 'demo-btn--on': cut }" @click="cut = !cut">
        ✂ {{ cut ? '恢复 R3–R4 线路' : '切断 R3–R4 线路' }}
      </button>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">丢包率 <b>{{ lossRate }}%</b></span>
        <input class="demo-slider" type="range" min="0" max="40" step="5" v-model.number="lossRate" @input="touch('tick', 0.16)">
      </div>
      <div class="demo-ctrl__group">
        <span class="demo-ctrl__label">速度 <b>{{ speed.toFixed(1) }}×</b></span>
        <input class="demo-slider" type="range" min="0.5" max="3" step="0.5" style="width:80px" v-model.number="speed" @input="touch('tick', 0.16)">
      </div>
      <div class="demo-ctrl__spacer" />
      <div class="demo-meter">
        <span class="demo-meter__k">重传</span>
        <span class="demo-meter__v">{{ retransmits }} 次</span>
      </div>
    </template>
  </DemoFrame>
</template>
