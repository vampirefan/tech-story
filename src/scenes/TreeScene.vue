<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ERA_ORDER, ERA_MAP } from '@/data/eras'
import { NODES, NODE_MAP, NODES_BY_ERA, NODES_BY_CATEGORY, EDGES, WAR_EDGES, prereqOf, unlocksOf, ancestorsOf, descendantsOf } from '@/data/techTree'
import { CATEGORIES, catColor } from '@/data/categories'
import { useUI } from '@/stores/ui'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import UiButton from '@/components/ui/UiButton.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import NodeChip from '@/components/ui/NodeChip.vue'
import type { TechNode } from '@/types'

const router = useRouter()
const ui = useUI()
const progress = useProgress()
const settings = useSettings()

const NW = 158
const NH = 34
const scale = ref(1)
const showCats = ref(false)
const localSel = ref<string | null>(null)
const hoverId = ref<string | null>(null)

interface Placed { n: TechNode; x: number; y: number }

const layout = computed(() => {
  const pos = new Map<string, Placed>()
  let w = 0, h = 0
  if (ui.treeLayout === 'era') {
    ERA_ORDER.forEach((era, ci) => {
      const list = NODES_BY_ERA[era].slice().sort((a, b) => {
        const ca = CATEGORIES.findIndex(c => c.id === a.category)
        const cb = CATEGORIES.findIndex(c => c.id === b.category)
        return ca - cb || a.year - b.year
      })
      list.forEach((n, ri) => {
        const x = 48 + ci * (NW + 62)
        const y = 96 + ri * (NH + 12)
        pos.set(n.id, { n, x, y })
        w = Math.max(w, x + NW + 48)
        h = Math.max(h, y + NH + 60)
      })
    })
  } else {
    CATEGORIES.forEach((c, ri) => {
      const list = NODES_BY_CATEGORY[c.id].slice().sort((a, b) => a.year - b.year)
      list.forEach((n, ci) => {
        const x = 48 + ci * (NW + 26)
        const y = 96 + ri * (NH + 34)
        pos.set(n.id, { n, x, y })
        w = Math.max(w, x + NW + 48)
        h = Math.max(h, y + NH + 60)
      })
    })
  }
  return { pos, w, h }
})

const edges = computed(() => {
  const out: { d: string; war: boolean; key: string; from: string; to: string }[] = []
  const all = ui.treeShowWar ? [...EDGES, ...WAR_EDGES] : EDGES
  for (const e of all) {
    const a = layout.value.pos.get(e.from)
    const b = layout.value.pos.get(e.to)
    if (!a || !b) continue
    const sx = a.x + NW, sy = a.y + NH / 2
    const ex = b.x, ey = b.y + NH / 2
    const dx = Math.max(28, Math.min(96, Math.abs(ex - sx) * 0.45))
    const bow = e.kind === 'war' ? 26 : 0
    out.push({
      d: `M${sx},${sy} C${sx + dx},${sy + bow} ${ex - dx},${ey + bow} ${ex},${ey}`,
      war: e.kind === 'war',
      key: `${e.from}>${e.to}`,
      from: e.from,
      to: e.to
    })
  }
  return out
})

/** 选中节点的因果家族（祖先 + 后代），用于高亮整条链 */
const chain = computed(() => {
  const id = localSel.value ?? ui.selectedId
  if (!id) return null
  const set = new Set<string>([id])
  for (const x of ancestorsOf(id)) set.add(x)
  for (const x of descendantsOf(id)) set.add(x)
  return set
})

const selNode = computed(() => (localSel.value ? NODE_MAP[localSel.value] ?? null : null))

function stateOf(id: string): 'done' | 'avail' | 'locked' {
  if (progress.researchedSet.has(id)) return 'done'
  return progress.isAvailable(id) ? 'avail' : 'locked'
}

function dimmed(n: TechNode): boolean {
  if (ui.category !== 'all' && n.category !== ui.category) return true
  if (ui.chinaOnly && n.chinaLink < 2) return true
  return false
}

function clickNode(n: TechNode) {
  localSel.value = n.id
  const st = stateOf(n.id)
  if (st === 'locked') {
    settings.sfx('wrong')
    ui.toast(progress.lockReason(n.id), 'warn', '🔒')
    return
  }
  if (st === 'avail') {
    progress.research(n.id)
    settings.sfx('unlock')
    const un = progress.wouldUnlock(n.id)
    if (un.length) ui.toast(`研究完成 · 新解锁 ${un.length} 项技术`, 'unlock', '✦')
  } else {
    settings.sfx('tick')
  }
}

function openDetail(n: TechNode) {
  settings.sfx('page')
  void router.push(`/node/${n.id}`)
}

function zoom(d: number) {
  scale.value = Math.max(0.45, Math.min(2, +(scale.value + d).toFixed(2)))
  settings.sfx('tick', 0.3)
}

const doneCount = computed(() => progress.researched.length)
</script>

<template>
  <section class="scene-root tree">
    <!-- ══ 顶栏 ══ -->
    <header class="tree__bar">
      <div class="scene-head tree__head">
        <span class="scene-head__eyebrow">Tech Tree · 文明科技树</span>
        <h1 class="tree__title">科技因果网络</h1>
      </div>
      <div class="tree__ctrl">
        <UiSegmented
          :model-value="ui.treeLayout"
          :options="[{ value: 'era', label: '按时代' }, { value: 'category', label: '按领域' }]"
          @update:model-value="ui.setTreeLayout($event as 'era' | 'category')"
        />
        <UiButton size="sm" :active="ui.treeShowWar" @click="ui.toggleTreeWar()">✕ 战争边</UiButton>
        <UiButton size="sm" :active="showCats" @click="showCats = !showCats">
          ▦ 领域筛选
        </UiButton>
        <UiButton size="sm" :active="ui.chinaOnly" @click="ui.toggleChinaOnly()">🇨🇳 中国</UiButton>
        <UiSwitch :model-value="settings.freeExplore" label="自由探索" hint="关闭后需按前置顺序研究" @update:model-value="settings.setFreeExplore($event)" />
        <span class="tree__prog label-xs">已研究 {{ doneCount }} / {{ NODES.length }}</span>
      </div>
    </header>

    <!-- ══ 领域筛选条 ══ -->
    <div v-if="showCats" class="tree__cats">
      <button class="tree__cat" @click="ui.setCategory('all')">全部</button>
      <button
        v-for="c in CATEGORIES" :key="c.id"
        class="tree__cat" :class="{ 'is-active': ui.category === c.id }"
        :style="{ '--cat': c.color }"
        @click="ui.setCategory(ui.category === c.id ? 'all' : c.id)"
      >{{ c.glyph }} {{ c.name }}</button>
    </div>

    <!-- ══ 画布 ══ -->
    <div class="tree__viewport">
      <div class="tree__canvas" :style="{ width: `${layout.w * scale}px`, height: `${layout.h * scale}px` }">
        <svg :width="layout.w" :height="layout.h" :style="{ transform: `scale(${scale})` }" class="tree__svg">
          <!-- 时代列头 -->
          <template v-if="ui.treeLayout === 'era'">
            <g v-for="(era, i) in ERA_ORDER" :key="era" class="tree__colhead">
              <rect :x="48 + i * (NW + 62)" y="30" :width="NW" height="26" rx="6" :fill="ERA_MAP[era].color" opacity="0.14" />
              <text :x="48 + i * (NW + 62) + NW / 2" y="47" text-anchor="middle" :fill="ERA_MAP[era].color">{{ ERA_MAP[era].name }}</text>
            </g>
          </template>
          <template v-else>
            <g v-for="(c, i) in CATEGORIES" :key="c.id" class="tree__colhead">
              <text x="16" :y="96 + i * (NH + 34) + NH / 2 + 4" :fill="c.color">{{ c.glyph }} {{ c.name }}</text>
            </g>
          </template>

          <!-- 边 -->
          <g class="tree__edges">
            <path
              v-for="e in edges" :key="e.key"
              :d="e.d"
              class="tree__edge"
              :class="{ 'tree__edge--war': e.war, 'is-hot': chain && (chain.has(e.from) && chain.has(e.to)) }"
            />
          </g>

          <!-- 节点 -->
          <g
            v-for="p in layout.pos.values()" :key="p.n.id"
            class="tree__node"
            :class="[`is-${stateOf(p.n.id)}`, { 'is-dim': dimmed(p.n), 'is-chain': chain?.has(p.n.id), 'is-sel': localSel === p.n.id }]"
            :style="{ '--cat': catColor(p.n.category) }"
            :transform="`translate(${p.x}, ${p.y})`"
            @click="clickNode(p.n)"
            @mouseenter="hoverId = p.n.id; settings.sfx('hover', 0.18)"
            @mouseleave="hoverId = null"
          >
            <title>{{ p.n.name }} · {{ p.n.yearLabel }} · {{ p.n.geo.country }}</title>
            <rect :width="NW" :height="NH" rx="8" />
            <text x="10" :y="NH / 2 + 4" class="tree__nflag">{{ p.n.flag ?? '' }}</text>
            <text x="30" :y="NH / 2 + 4" class="tree__nname">{{ p.n.name.length > 9 ? p.n.name.slice(0, 9) + '…' : p.n.name }}</text>
            <text :x="NW - 10" :y="NH / 2 + 4" text-anchor="end" class="tree__nstate">
              {{ stateOf(p.n.id) === 'done' ? '✓' : stateOf(p.n.id) === 'locked' ? '🔒' : '' }}
            </text>
          </g>
        </svg>
      </div>

      <!-- 缩放 -->
      <div class="tree__zoom">
        <UiButton size="icon" @click="zoom(0.15)">＋</UiButton>
        <UiButton size="icon" @click="zoom(-0.15)">－</UiButton>
        <UiButton size="sm" @click="scale = 1">1:1</UiButton>
      </div>

      <!-- 图例 -->
      <div class="tree__legend">
        <span><i class="lg lg--done" /> 已研究</span>
        <span><i class="lg lg--avail" /> 可研究</span>
        <span><i class="lg lg--locked" /> 未解锁</span>
        <span><i class="lg lg--edge" /> 技术演进</span>
        <span><i class="lg lg--war" /> 战争推动</span>
      </div>
    </div>

    <!-- ══ 详情侧栏 ══ -->
    <aside v-if="selNode" class="tree__side">
      <button class="tree__side-close" @click="localSel = null">✕</button>
      <div class="tree__side-head" :style="{ '--cat': catColor(selNode.category) }">
        <span class="tree__side-flag">{{ selNode.flag ?? '' }}</span>
        <div>
          <h2>{{ selNode.name }}</h2>
          <div class="label-xs">{{ ERA_MAP[selNode.era].name }} · {{ selNode.yearLabel }} · {{ selNode.geo.country }}</div>
        </div>
      </div>
      <p class="prose">{{ selNode.summary }}</p>
      <div v-if="selNode.warLinks?.length" class="tree__wars">
        <div class="label-xs">战争因果</div>
        <p v-for="l in selNode.warLinks" :key="l.id + l.kind" class="tree__war">
          ✕ {{ l.kind }} → {{ NODE_MAP[l.id]?.name ?? l.id }}：{{ l.note }}
        </p>
      </div>
      <div class="tree__rel">
        <div class="label-xs">前置（{{ prereqOf(selNode.id).length }}）</div>
        <div class="chips">
          <NodeChip v-for="n in prereqOf(selNode.id)" :key="n.id" :node="n" size="sm" />
          <span v-if="!prereqOf(selNode.id).length" class="label-xs">无 · 文明起点</span>
        </div>
        <div class="label-xs">解锁（{{ unlocksOf(selNode.id).length }}）</div>
        <div class="chips">
          <NodeChip v-for="n in unlocksOf(selNode.id)" :key="n.id" :node="n" size="sm" />
          <span v-if="!unlocksOf(selNode.id).length" class="label-xs">无 · 当前终点</span>
        </div>
      </div>
      <div class="tree__side-btns">
        <UiButton v-if="stateOf(selNode.id) === 'avail'" variant="primary" @click="clickNode(selNode)">研究此项</UiButton>
        <UiButton variant="amber" @click="openDetail(selNode)">打开详情</UiButton>
        <UiButton @click="ui.select(selNode.id); router.push('/globe')">地球定位</UiButton>
      </div>
    </aside>
  </section>
</template>

<style scoped>
.tree { display: grid; grid-template-rows: auto auto minmax(0, 1fr); }
.tree__bar {
  display: flex; align-items: center; gap: var(--s-4); flex-wrap: wrap;
  padding: var(--s-3) var(--s-5);
  border-bottom: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(8, 15, 34, 0.85), rgba(4, 9, 22, 0.7));
}
.tree__head { gap: 2px; }
.tree__title {
  font-size: 20px; font-weight: 800;
  background: linear-gradient(120deg, #eaf4ff 30%, var(--c-cyan));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.tree__ctrl { display: flex; align-items: center; gap: var(--s-3); flex-wrap: wrap; margin-left: auto; }
.tree__prog { color: var(--c-emerald); }

.tree__cats { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px var(--s-5); border-bottom: 1px solid var(--line); }
.tree__cat {
  padding: 4px 11px; border-radius: 14px; font-size: 11.5px; font-weight: 600;
  border: 1px solid var(--line); color: var(--t-mid); background: rgba(8, 15, 34, 0.6);
}
.tree__cat.is-active { color: var(--cat); border-color: var(--cat); background: color-mix(in srgb, var(--cat) 14%, transparent); }

.tree__viewport {
  position: relative; overflow: auto; scrollbar-width: thin;
  background-image: radial-gradient(rgba(120, 170, 255, 0.055) 1px, transparent 1px);
  background-size: 26px 26px;
}
.tree__canvas { position: relative; }
.tree__svg { position: absolute; inset: 0; transform-origin: 0 0; display: block; }

.tree__colhead text { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; }

.tree__edge { fill: none; stroke: rgba(140, 190, 255, 0.34); stroke-width: 1.4; }
.tree__edge--war { stroke: rgba(255, 95, 86, 0.5); stroke-dasharray: 5 4; }
.tree__edge.is-hot { stroke: var(--c-cyan); stroke-width: 1.8; filter: drop-shadow(0 0 4px var(--c-cyan-glow)); }
.tree__edge--war.is-hot { stroke: var(--c-rose); }

.tree__node { cursor: pointer; }
.tree__node rect {
  fill: rgba(8, 15, 34, 0.92);
  stroke: color-mix(in srgb, var(--cat) 55%, transparent);
  stroke-width: 1.2;
  transition: filter var(--dur-fast) var(--ease-out);
}
.tree__node:hover rect { filter: drop-shadow(0 0 7px color-mix(in srgb, var(--cat) 60%, transparent)); }
.tree__node.is-done rect { stroke: var(--c-emerald); fill: color-mix(in srgb, var(--c-emerald) 12%, rgba(8, 15, 34, 0.92)); }
.tree__node.is-avail rect { stroke-dasharray: none; }
.tree__node.is-locked rect { stroke: rgba(255, 255, 255, 0.14); fill: rgba(6, 10, 22, 0.8); }
.tree__node.is-locked .tree__nname { fill: var(--t-faint); }
.tree__node.is-dim { opacity: 0.22; }
.tree__node.is-chain rect { stroke-width: 1.8; }
.tree__node.is-sel rect { stroke: var(--c-amber); stroke-width: 2; filter: drop-shadow(0 0 9px var(--c-amber-glow)); }
.tree__nflag { font-size: 12px; }
.tree__nname { font-size: 11.5px; font-weight: 600; fill: var(--t-hi); }
.tree__nstate { font-size: 10px; fill: var(--c-emerald); }

.tree__zoom { position: absolute; right: 14px; top: 14px; display: flex; gap: 6px; z-index: 5; }
.tree__legend {
  position: absolute; left: 14px; bottom: 14px; z-index: 5;
  display: flex; gap: 14px; align-items: center;
  padding: 7px 12px; border-radius: 10px;
  border: 1px solid var(--line); background: rgba(4, 9, 22, 0.92);
  font-size: 11px; color: var(--t-mid);
}
.tree__legend .lg { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.lg--done { background: var(--c-emerald); }
.lg--avail { background: transparent; border: 1.5px solid var(--c-cyan); }
.lg--locked { background: transparent; border: 1.5px solid rgba(255, 255, 255, 0.25); }
.lg--edge { width: 16px; height: 0; border-radius: 0; border-top: 1.5px solid rgba(140, 190, 255, 0.5); vertical-align: 2px; }
.lg--war { width: 16px; height: 0; border-radius: 0; border-top: 1.5px dashed var(--c-rose); vertical-align: 2px; }

.tree__side {
  position: absolute; right: 0; top: 0; bottom: 0; width: min(400px, 92vw); z-index: 10;
  overflow-y: auto; padding: var(--s-5);
  display: flex; flex-direction: column; gap: var(--s-4);
  border-left: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(6, 12, 30, 0.96), rgba(4, 9, 22, 0.98));
  animation: slideL var(--dur-mid) var(--ease-out);
}
@keyframes slideL { from { transform: translateX(24px); opacity: 0; } }
.tree__side-close { position: absolute; right: 12px; top: 12px; color: var(--t-lo); font-size: 13px; }
.tree__side-close:hover { color: var(--t-hi); }
.tree__side-head { display: flex; gap: 12px; align-items: center; }
.tree__side-flag { font-size: 30px; }
.tree__side-head h2 { font-size: 19px; color: var(--cat); }
.tree__side-head .label-xs { margin-top: 3px; }
.tree__wars { display: flex; flex-direction: column; gap: 6px; }
.tree__war { font-size: 12px; line-height: 1.7; color: var(--c-rose); }
.tree__rel { display: flex; flex-direction: column; gap: 8px; }
.tree__rel .label-xs { margin-top: 6px; }
.tree__side-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; }
</style>
