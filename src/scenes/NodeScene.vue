<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ERA_MAP, yearLabel } from '@/data/eras'
import { NODES, NODE_MAP, NODES_BY_ERA, WAR_EDGES, prereqOf, unlocksOf, eraStats } from '@/data/techTree'
import { CATEGORY_MAP, catColor, catName } from '@/data/categories'
import { MEDIA_LIBRARY } from '@/data/media'
import { ISO_TO_REGIONS, REGION_MAP, topRegions } from '@/data/regions'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { useUI } from '@/stores/ui'
import { demoComponent } from '@/components/demos'
import NodeChip from '@/components/ui/NodeChip.vue'
import QuizBlock from '@/components/ui/QuizBlock.vue'
import MediaCard from '@/components/ui/MediaCard.vue'
import MiniMap from '@/components/ui/MiniMap.vue'
import UiButton from '@/components/ui/UiButton.vue'
import type { CausalLink, MediaItem, TechNode } from '@/types'

const route = useRoute()
const router = useRouter()
const progress = useProgress()
const settings = useSettings()
const ui = useUI()

const scrollEl = ref<HTMLElement | null>(null)

const node = computed<TechNode | null>(() => NODE_MAP[String(route.params.id ?? '')] ?? null)
const era = computed(() => (node.value ? ERA_MAP[node.value.era] : null))
const cat = computed(() => (node.value ? CATEGORY_MAP[node.value.category] : null))

/* ── 因果链 ── */
const prereqs = computed(() => (node.value ? prereqOf(node.value.id) : []))
const unlocks = computed(() => (node.value ? unlocksOf(node.value.id) : []))

const LINK_LABEL: Record<CausalLink['kind'], string> = {
  enabled: '使之成为可能',
  accelerated: '被迫加速',
  triggered: '直接触发',
  constrained: '反过来制约'
}

interface WarRow { n: TechNode; kind: CausalLink['kind']; note: string; out: boolean }

const warRows = computed<WarRow[]>(() => {
  const cur = node.value
  if (!cur) return []
  const rows: WarRow[] = []
  for (const l of cur.warLinks ?? []) {
    const n = NODE_MAP[l.id]
    if (n) rows.push({ n, kind: l.kind, note: l.note, out: true })
  }
  for (const e of WAR_EDGES) {
    if (e.to !== cur.id) continue
    const src = NODE_MAP[e.from]
    const l = src?.warLinks?.find(x => x.id === cur.id)
    if (src && l) rows.push({ n: src, kind: l.kind, note: l.note, out: false })
  }
  return rows
})

/* ── 演示 ── */
const demoComp = computed(() => (node.value?.demo ? demoComponent(node.value.demo.id) : null))
const demoProps = computed<Record<string, unknown>>(() => {
  const d = node.value?.demo
  if (!d || !node.value) return {}
  const p: Record<string, unknown> = { demoId: d.id, title: d.title, hint: d.hint, points: d.points }
  // 这两个演示会按节点切换默认模式（登月方案 / 逻辑门 vs 加法器 …）
  if (d.id === 'rocket' || d.id === 'logic') p.nodeId = node.value.id
  return p
})
const demoDone = computed(() => !!node.value?.demo && progress.demosPlayed.includes(node.value.demo.id))

/* ── 故事分段 ── */
const storyParas = computed(() => (node.value?.story ?? '').split(/\n+/).map(s => s.trim()).filter(Boolean))
const artUrl = computed(() => (node.value?.art ? `${import.meta.env.BASE_URL}assets/illustrations/${node.value.art}` : ''))

/* ── 地理 ── */
const geoRegions = computed(() => {
  const iso = node.value?.geo.iso
  if (!iso) return []
  return (ISO_TO_REGIONS[iso] ?? []).map(id => REGION_MAP[id]).filter(Boolean)
})
/** 同时期其他活跃地区，用于地图上的对照高亮 */
const peerIsos = computed(() => {
  const e = node.value?.era
  if (!e) return []
  return topRegions(e, 3).flatMap(r => (r.region.iso ?? []).slice(0, 4))
})

/* ── 时代对照 ── */
const stats = computed(() => (node.value ? eraStats(node.value.era) : null))
const leaders = computed(() => (node.value ? topRegions(node.value.era, 5) : []))

/* ── 同代 / 同线节点 ── */
const siblings = computed(() => {
  const cur = node.value
  if (!cur) return []
  return NODES_BY_ERA[cur.era].filter(n => n.id !== cur.id).slice(0, 8)
})
const sameCat = computed(() => {
  const cur = node.value
  if (!cur) return []
  return NODES.filter(n => n.category === cur.category && n.id !== cur.id)
    .sort((a, b) => Math.abs(a.year - cur.year) - Math.abs(b.year - cur.year))
    .slice(0, 6)
})

/* ── 上下一项（按时间） ── */
const idx = computed(() => (node.value ? NODES.findIndex(n => n.id === node.value!.id) : -1))
const prev = computed(() => (idx.value > 0 ? NODES[idx.value - 1] : null))
const next = computed(() => (idx.value >= 0 && idx.value < NODES.length - 1 ? NODES[idx.value + 1] : null))

/* ── 解锁状态 ── */
const researched = computed(() => !!node.value && progress.researchedSet.has(node.value.id))
const available = computed(() => !!node.value && progress.isAvailable(node.value.id))
const lockReason = computed(() => (node.value ? progress.lockReason(node.value.id) : ''))
const teaser = computed(() => (node.value ? progress.wouldUnlock(node.value.id).map(id => NODE_MAP[id]).filter(Boolean) : []))
const quizDone = computed(() => !!node.value && progress.quizPassed.includes(node.value.id))

/* ── 拓展资源分组 ── */
const KIND_META = [
  { kind: 'book', label: '书籍', icon: '📖' },
  { kind: 'movie', label: '影视', icon: '🎬' },
  { kind: 'game', label: '游戏', icon: '🎮' },
  { kind: 'music', label: '音乐', icon: '🎵' }
] as const

const mediaGroups = computed(() => {
  const items: (MediaItem & { id: string })[] = []
  for (const id of node.value?.mediaIds ?? []) {
    const m = MEDIA_LIBRARY[id]
    if (m) items.push({ ...m, id })
  }
  return KIND_META
    .map(k => ({ kind: k.kind, label: k.label, icon: k.icon, items: items.filter(i => i.kind === k.kind) }))
    .filter(g => g.items.length)
})

/* ── 行为 ── */
function research() {
  const cur = node.value
  if (!cur || researched.value) return
  if (!available.value) {
    settings.sfx('cancel')
    ui.toast(lockReason.value || '还不能研究这一项', 'warn', '🔒')
    return
  }
  const unlocked = progress.research(cur.id)
  settings.sfx('unlock')
  ui.toast(
    unlocked.length
      ? `研究完成 · 新解锁 ${unlocked.length} 项：${unlocked.map(id => NODE_MAP[id]?.name ?? id).join('、')}`
      : `研究完成 · ${cur.name} 已点亮`,
    'unlock', '✦'
  )
}

function goGlobe() {
  const cur = node.value
  if (!cur) return
  settings.sfx('whoosh')
  ui.select(cur.id)
  ui.setYear(cur.year)
  void router.push('/globe')
}

function go(id: string) {
  settings.sfx('page')
  void router.push(`/node/${id}`)
}

function goBack() {
  settings.sfx('cancel')
  if (window.history.length > 1) router.back()
  else void router.push('/timeline')
}

function sync(cur: TechNode | null) {
  if (!cur) return
  progress.visit(cur.id)
  ui.select(cur.id, { fly: false })
  ui.setYear(cur.year)
  scrollEl.value?.scrollTo({ top: 0 })
}

watch(node, sync)
onMounted(() => { settings.sfx('page', 0.5); sync(node.value) })
</script>

<template>
  <section class="scene-root nd" :style="node ? { '--cat': catColor(node.category), '--ec': era?.color, '--ea': era?.accent } : {}">
    <div v-if="!node" class="blank">
      <div class="nd__missing">
        <p>没有找到这个技术节点。</p>
        <UiButton variant="primary" @click="router.push('/timeline')">← 回到时间线</UiButton>
      </div>
    </div>

    <div v-else class="split">
      <!-- ══════════ 主文档 ══════════ -->
      <div class="split__main">
        <div ref="scrollEl" class="nd__scroll">
          <!-- 面包屑 + 翻页（吸附在滚动容器顶部，横跨整个宽度） -->
          <div class="nd__crumb">
            <button class="nd__back" @click="goBack">← 返回</button>
            <span class="nd__path">
              <b>{{ era?.name }}</b><i>/</i>{{ catName(node.category) }}<i>/</i>{{ node.name }}
            </span>
            <span class="grow" />
            <UiButton size="sm" variant="ghost" :disabled="!prev" :title="prev?.name" @click="prev && go(prev.id)">← 上一项</UiButton>
            <UiButton size="sm" variant="ghost" :disabled="!next" :title="next?.name" @click="next && go(next.id)">下一项 →</UiButton>
          </div>

          <div class="nd__doc">

            <!-- 头部 -->
            <header class="nd__hero anim-fade-up">
              <div class="chips">
                <span class="pill pill--cyan">{{ era?.short }} · {{ era?.name }}</span>
                <span class="pill pill--cat"><span class="pill__dot" />{{ cat?.glyph }} {{ catName(node.category) }}</span>
                <span class="pill pill--amber mono">{{ node.yearLabel }}</span>
                <span class="pill">{{ node.flag }} {{ node.geo.country }} · {{ node.geo.place }}</span>
                <span v-if="researched" class="pill nd__ok">✓ 已研究</span>
                <span v-if="quizDone" class="pill nd__ok">✓ 已通过测验</span>
              </div>

              <h1 class="nd__name selectable">{{ node.name }}</h1>
              <div class="nd__en">{{ node.nameEn }}</div>
              <p class="nd__summary selectable">{{ node.summary }}</p>

              <div class="nd__impact">
                <span class="label-xs">历史影响</span>
                <span class="nd__stars" :title="`${node.impact} / 5`">
                  <i v-for="k in 5" :key="k" :class="{ on: k <= node.impact }" />
                </span>
                <span class="nd__impact-note">{{ node.impactNote }}</span>
              </div>
            </header>

            <!-- 原理 + 演示 -->
            <section v-if="node.principle || demoComp" class="sec">
              <div class="sec__h">
                <h3>它是怎么工作的</h3>
                <span class="label-xs">Principle</span>
              </div>
              <p v-if="node.principle" class="prose selectable nd__principle">{{ node.principle }}</p>

              <component
                :is="demoComp" v-if="demoComp" v-bind="demoProps"
                class="nd__demo" :class="{ 'is-done': demoDone }"
              />
              <p v-if="node.demo && !demoDone" class="nd__demo-tip">
                ▶ 动手玩一玩上面的演示 —— 拖动滑块、点一点零件，玩过一次就会记进你的研究进度。
              </p>
              <p v-else-if="node.demo" class="nd__demo-tip nd__demo-tip--ok">✓ 这个演示你已经玩过了。</p>
            </section>

            <!-- 历史现场 -->
            <section class="sec">
              <div class="sec__h">
                <h3>历史现场</h3>
                <span class="label-xs">{{ node.yearLabel }}</span>
              </div>
              <figure v-if="node.art" class="nd__art anim-fade-up">
                <img :src="artUrl" :alt="`${node.name} · 历史场景插画`" loading="lazy" draggable="false" />
                <figcaption class="label-xs">插画 · {{ node.name }} · {{ node.yearLabel }}</figcaption>
              </figure>
              <div class="prose selectable">
                <p v-for="(p, i) in storyParas" :key="i">{{ p }}</p>
              </div>

              <div v-if="node.characters.length" class="nd__chars stagger">
                <div class="label-xs">关键人物</div>
                <article v-for="c in node.characters" :key="c.name" class="nd__char card">
                  <span class="nd__char-av">{{ c.name.slice(0, 1) }}</span>
                  <div class="nd__char-body">
                    <h4>{{ c.name }}<em>{{ c.role }}</em></h4>
                    <p class="selectable">{{ c.note }}</p>
                  </div>
                </article>
              </div>
            </section>

            <!-- 因果链 -->
            <section class="sec">
              <div class="sec__h">
                <h3>因果链</h3>
                <span class="label-xs">因为它，所以……</span>
              </div>

              <div class="nd__causal">
                <div class="nd__cause">
                  <div class="label-xs">↑ 先有了这些</div>
                  <div v-if="prereqs.length" class="chips">
                    <NodeChip v-for="p in prereqs" :key="p.id" :node="p" size="sm" />
                  </div>
                  <p v-else class="nd__none">这是这条线的起点 —— 之前没有任何技术铺垫。</p>
                </div>

                <div class="nd__self">
                  <span class="nd__self-dot" />
                  <b>{{ node.name }}</b>
                  <span class="mono">{{ node.yearLabel }}</span>
                </div>

                <div class="nd__cause">
                  <div class="label-xs">↓ 于是有了这些</div>
                  <div v-if="unlocks.length" class="chips">
                    <NodeChip v-for="u in unlocks" :key="u.id" :node="u" size="sm" />
                  </div>
                  <p v-else class="nd__none">这项目前是这条线的终点 —— 未来由你们接着画。</p>
                </div>
              </div>

              <div v-if="warRows.length" class="nd__war">
                <div class="label-xs">✕ 与战争 / 冲突的因果</div>
                <div v-for="(w, i) in warRows" :key="i" class="nd__war-row">
                  <span class="nd__war-kind">{{ LINK_LABEL[w.kind] }}</span>
                  <span class="nd__war-flow">
                    <b v-if="w.out">{{ node.name }}</b><i v-else>{{ w.n.name }}</i>
                    <svg viewBox="0 0 40 12" aria-hidden="true"><path d="M0 6h32m-6-4l6 4-6 4" /></svg>
                    <i v-if="w.out">{{ w.n.name }}</i><b v-else>{{ node.name }}</b>
                  </span>
                  <NodeChip :node="w.n" size="sm" :show-year="false" />
                  <p class="nd__war-note selectable">{{ w.note }}</p>
                </div>
              </div>
            </section>

            <!-- 冷知识 -->
            <section v-if="node.funFacts.length" class="sec">
              <div class="sec__h">
                <h3>冷知识</h3>
                <span class="label-xs">{{ node.funFacts.length }} 条</span>
              </div>
              <ol class="nd__facts stagger">
                <li v-for="(f, i) in node.funFacts" :key="i" class="selectable">
                  <span class="nd__facts-n mono">{{ String(i + 1).padStart(2, '0') }}</span>{{ f }}
                </li>
              </ol>
            </section>

            <!-- 中国关联 -->
            <section v-if="node.chinaNote" class="sec">
              <div class="nd__china" :class="{ 'nd__china--strong': node.chinaLink >= 2 }">
                <span class="nd__china-flag">🇨🇳</span>
                <div>
                  <div class="label-xs">
                    中国关联 ·
                    <template v-if="node.chinaLink >= 3">就发生在中国 / 中国主导</template>
                    <template v-else-if="node.chinaLink === 2">中国有重要贡献</template>
                    <template v-else>中国也有相关记录</template>
                  </div>
                  <p class="selectable">{{ node.chinaNote }}</p>
                  <UiButton v-if="node.chinaLink >= 2" size="sm" variant="amber" @click="router.push('/china')">
                    打开中国专题 →
                  </UiButton>
                </div>
              </div>
            </section>

            <!-- 小测验 -->
            <section class="sec">
              <div class="sec__h">
                <h3>课堂小测</h3>
                <span class="label-xs">答对计入进度</span>
              </div>
              <QuizBlock :quiz="node.quiz" :node-id="node.id" />
            </section>

            <!-- 拓展资源 -->
            <section v-if="mediaGroups.length" class="sec">
              <div class="sec__h">
                <h3>想再深入一点</h3>
                <span class="label-xs">书 · 影视 · 游戏 · 音乐</span>
              </div>
              <div v-for="g in mediaGroups" :key="g.kind" class="nd__media">
                <div class="nd__media-h">{{ g.icon }} {{ g.label }}<span>{{ g.items.length }}</span></div>
                <div class="grid grid--cards stagger">
                  <MediaCard v-for="m in g.items" :key="m.id" :item="m" />
                </div>
              </div>
            </section>

            <!-- 底部翻页 -->
            <footer class="nd__foot">
              <button v-if="prev" class="nd__foot-btn nd__foot-btn--prev" @click="go(prev.id)">
                <span class="label-xs">← 上一项 · {{ prev.yearLabel }}</span>
                <b>{{ prev.name }}</b>
              </button>
              <span v-else />
              <button v-if="next" class="nd__foot-btn nd__foot-btn--next" @click="go(next.id)">
                <span class="label-xs">下一项 · {{ next.yearLabel }} →</span>
                <b>{{ next.name }}</b>
              </button>
            </footer>
          </div>
        </div>
      </div>

      <!-- ══════════ 侧栏 ══════════ -->
      <aside class="split__side">
        <div class="nd__side">

          <!-- 研究 -->
          <div class="card nd__research">
            <div class="label-xs">研究这项技术</div>
            <p v-if="researched" class="nd__research-done">✓ 已经点亮：<b>{{ node.name }}</b></p>
            <UiButton
              v-else variant="primary" size="lg"
              :disabled="!available"
              @click="research"
            >{{ available ? '✦ 完成研究' : '🔒 暂不可研究' }}</UiButton>
            <p v-if="!researched && lockReason" class="nd__lock">🔒 {{ lockReason }}</p>
            <div v-if="!researched && teaser.length" class="nd__teaser">
              <span class="label-xs">研究后会解锁</span>
              <div class="chips">
                <NodeChip v-for="t in teaser" :key="t.id" :node="t" size="sm" :show-year="false" />
              </div>
            </div>
            <div class="nd__checks">
              <span :class="{ on: progress.visitedSet.has(node.id) }">👁 看过</span>
              <span :class="{ on: demoDone }">▶ 玩过演示</span>
              <span :class="{ on: quizDone }">? 答对测验</span>
              <span :class="{ on: researched }">✦ 已研究</span>
            </div>
            <p class="nd__free" v-if="settings.freeExplore">
              当前是<b>自由探索</b>模式，全部节点解锁。按 <span class="kbd">F</span> 可切回逐步解锁。
            </p>
          </div>

          <!-- 地图 -->
          <div class="nd__geo">
            <div class="label-xs">发生地 · {{ node.yearLabel }}</div>
            <MiniMap
              :lat="node.geo.lat" :lng="node.geo.lng" :iso="node.geo.iso"
              :label="node.geo.place" :highlight="peerIsos" @click="goGlobe"
            />
            <div class="nd__geo-rows">
              <div><span class="label-xs">地点</span><b>{{ node.geo.place }}</b></div>
              <div><span class="label-xs">今天属于</span><b>{{ node.flag }} {{ node.geo.country }}</b></div>
              <div v-if="geoRegions.length"><span class="label-xs">文明区域</span><b>{{ geoRegions.map(r => r.name).join('、') }}</b></div>
              <div><span class="label-xs">坐标</span><b class="mono">{{ node.geo.lat.toFixed(2) }}°, {{ node.geo.lng.toFixed(2) }}°</b></div>
            </div>
            <UiButton variant="ghost" size="sm" @click="goGlobe">🌍 在 3D 地球上定位</UiButton>
          </div>

          <!-- 时代对照 -->
          <div v-if="stats && era" class="card nd__era">
            <div class="label-xs">同一时代的世界 · {{ era.name }}</div>
            <p class="nd__era-range mono">{{ yearLabel(era.from) }} — {{ yearLabel(era.to) }}</p>
            <div class="nd__era-stats">
              <div class="stat"><span class="stat__k">技术节点</span><span class="stat__v stat__v--cyan">{{ stats.total }}</span></div>
              <div class="stat"><span class="stat__k">中国相关</span><span class="stat__v stat__v--amber">{{ stats.china }}</span></div>
              <div class="stat"><span class="stat__k">冲突</span><span class="stat__v">{{ stats.wars }}</span></div>
            </div>
            <div class="nd__lead">
              <div v-for="l in leaders" :key="l.region.id" class="nd__lead-row">
                <span class="nd__lead-name">{{ l.region.name }}</span>
                <span class="nd__lead-bar"><i :style="{ width: Math.round(l.v * 100) + '%' }" /></span>
                <span class="nd__lead-pct mono">{{ Math.round(l.v * 100) }}</span>
              </div>
            </div>
            <p class="nd__era-note">{{ era.tagline }}</p>
            <div class="row gap-2">
              <UiButton size="sm" variant="ghost" @click="ui.setEra(era.id); router.push('/timeline')">⏳ 看这个时代</UiButton>
              <UiButton size="sm" variant="ghost" @click="router.push('/tree')">🕸️ 科技树</UiButton>
            </div>
          </div>

          <!-- 同代节点 -->
          <div v-if="siblings.length" class="nd__list">
            <div class="label-xs">同一时代还发生了</div>
            <div class="chips">
              <NodeChip v-for="s in siblings" :key="s.id" :node="s" size="sm" />
            </div>
          </div>

          <!-- 同一条技术线 -->
          <div v-if="sameCat.length" class="nd__list">
            <div class="label-xs">{{ catName(node.category) }}这条线上的其他节点</div>
            <div class="chips">
              <NodeChip v-for="s in sameCat" :key="s.id" :node="s" size="sm" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.nd { background: radial-gradient(ellipse 80% 55% at 22% -12%, color-mix(in srgb, var(--ec, #00d4ff) 16%, transparent), transparent 62%), var(--c-deep); }
.nd__scroll { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; }
.nd__doc {
  width: min(900px, 100%);
  margin: 0 auto;
  padding: var(--s-4) var(--s-6) var(--s-8);
  display: flex; flex-direction: column; gap: var(--s-6);
}

/* 面包屑 */
.nd__crumb {
  position: sticky; top: 0; z-index: 12;
  display: flex; align-items: center; gap: 10px;
  padding: 9px calc(max(var(--s-6), (100% - 900px) / 2));
  background: linear-gradient(180deg, rgba(3, 6, 15, 0.97), rgba(3, 6, 15, 0.92));
  border-bottom: 1px solid var(--line);
}
.nd__back { font-size: 12px; color: var(--t-mid); transition: color var(--dur-fast); }
.nd__back:hover { color: var(--c-cyan); }
.nd__path { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--t-lo); min-width: 0; }
.nd__path b { color: var(--ec, var(--c-cyan)); font-weight: 700; }
.nd__path i { font-style: normal; opacity: 0.45; }

/* 头部 */
.nd__hero { display: flex; flex-direction: column; gap: 10px; }
.nd__name {
  font-size: clamp(30px, 4.4vw, 50px); line-height: 1.12; font-weight: 800;
  color: var(--t-hi);
  text-shadow: 0 0 34px color-mix(in srgb, var(--cat) 42%, transparent);
}
.nd__en {
  font-family: var(--f-display); font-size: 11.5px; letter-spacing: 0.3em;
  text-transform: uppercase; color: var(--cat);
}
.nd__summary { font-size: 16px; line-height: 1.85; color: var(--t-mid); max-width: 66ch; }
.nd__impact { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; margin-top: 3px; }
.nd__stars { display: inline-flex; gap: 4px; }
.nd__stars i {
  width: 9px; height: 9px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.13);
  transition: all var(--dur) var(--ease-out);
}
.nd__stars i.on { background: var(--c-amber); box-shadow: 0 0 9px var(--c-amber-glow); }
.nd__impact-note { font-size: 12.5px; color: var(--t-lo); max-width: 60ch; }
.nd__ok { color: var(--c-emerald); border-color: color-mix(in srgb, var(--c-emerald) 45%, transparent); background: color-mix(in srgb, var(--c-emerald) 11%, transparent); }

/* 原理 */
.nd__principle {
  padding: var(--s-4) var(--s-5);
  border-left: 2px solid var(--cat);
  border-radius: 0 var(--r-md) var(--r-md) 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--cat) 9%, transparent), transparent 72%);
  color: var(--t-hi);
}
.nd__demo { margin-top: var(--s-4); animation: fadeUp var(--dur-slow) var(--ease-out) both; }
.nd__demo.is-done { box-shadow: 0 0 0 1px color-mix(in srgb, var(--c-emerald) 30%, transparent); }
.nd__demo-tip { font-size: 12px; color: var(--c-cyan); margin-top: 8px; }
.nd__demo-tip--ok { color: var(--c-emerald); }

/* 人物 */
.nd__art {
  margin: 2px 0 var(--s-4); border-radius: var(--r-md); overflow: hidden;
  border: 1px solid var(--line-hot); background: #060c1e;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}
.nd__art img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.nd__art figcaption {
  padding: 7px 12px; color: var(--t-faint); letter-spacing: 0.14em;
  background: linear-gradient(180deg, rgba(6, 12, 30, 0.4), rgba(6, 12, 30, 0.9));
  border-top: 1px solid var(--line);
}
.nd__chars { display: flex; flex-direction: column; gap: 9px; margin-top: var(--s-4); }
.nd__char { display: flex; gap: 13px; align-items: flex-start; padding: var(--s-3) var(--s-4); }
.nd__char-av {
  flex: none; width: 38px; height: 38px; border-radius: 50%;
  display: grid; place-items: center;
  font-size: 17px; font-weight: 800; color: #04121f;
  background: linear-gradient(150deg, var(--c-amber), #ff8f47);
  box-shadow: 0 0 16px var(--c-amber-glow);
}
.nd__char-body h4 { font-size: 14px; color: var(--t-hi); display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.nd__char-body h4 em { font-style: normal; font-size: 11px; color: var(--cat); letter-spacing: 0.04em; }
.nd__char-body p { font-size: 12.5px; line-height: 1.75; color: var(--t-mid); margin-top: 3px; }

/* 因果链 */
.nd__causal {
  display: flex; flex-direction: column; gap: 10px;
  padding: var(--s-4);
  border: 1px solid var(--line); border-radius: var(--r-md);
  background: linear-gradient(180deg, rgba(8, 15, 34, 0.6), rgba(5, 10, 24, 0.78));
}
.nd__cause { display: flex; flex-direction: column; gap: 7px; }
.nd__none { font-size: 12.5px; color: var(--t-lo); font-style: italic; }
.nd__self {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 13px; border-radius: var(--r-sm);
  border: 1px solid color-mix(in srgb, var(--cat) 55%, transparent);
  background: color-mix(in srgb, var(--cat) 13%, rgba(6, 12, 30, 0.7));
  box-shadow: 0 0 22px color-mix(in srgb, var(--cat) 18%, transparent);
}
.nd__self-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--cat); box-shadow: 0 0 10px var(--cat); flex: none; }
.nd__self b { font-size: 14px; color: var(--t-hi); }
.nd__self .mono { margin-left: auto; font-size: 11px; color: var(--t-lo); }

/* 战争因果 */
.nd__war { display: flex; flex-direction: column; gap: 9px; margin-top: var(--s-3); }
.nd__war-row {
  display: grid; grid-template-columns: auto 1fr; gap: 6px 10px; align-items: center;
  padding: 10px 13px;
  border: 1px solid color-mix(in srgb, var(--c-rose) 26%, var(--line));
  border-left: 3px solid var(--c-rose);
  border-radius: var(--r-sm);
  background: linear-gradient(90deg, color-mix(in srgb, var(--c-rose) 8%, transparent), transparent 70%);
}
.nd__war-kind {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--c-rose); white-space: nowrap;
}
.nd__war-flow { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--t-mid); min-width: 0; }
.nd__war-flow b { color: var(--t-hi); font-weight: 700; }
.nd__war-flow svg { width: 34px; height: 11px; flex: none; }
.nd__war-flow svg path { fill: none; stroke: var(--c-rose); stroke-width: 1.5; stroke-dasharray: 4 3; opacity: 0.85; }
.nd__war-row :deep(.chip) { grid-column: 1 / -1; justify-self: start; }
.nd__war-note { grid-column: 1 / -1; font-size: 12px; line-height: 1.7; color: var(--t-lo); }

/* 冷知识 */
.nd__facts { display: flex; flex-direction: column; gap: 8px; counter-reset: f; }
.nd__facts li {
  position: relative;
  display: flex; gap: 11px; align-items: baseline;
  padding: 10px 13px;
  border: 1px solid var(--line); border-radius: var(--r-sm);
  background: rgba(8, 18, 42, 0.5);
  font-size: 13px; line-height: 1.75; color: var(--t-mid);
  transition: all var(--dur-fast) var(--ease-out);
}
.nd__facts li:hover { border-color: var(--line-hot); color: var(--t-hi); transform: translateX(3px); }
.nd__facts-n { flex: none; font-size: 11px; font-weight: 700; color: var(--c-amber); }

/* 中国 */
.nd__china {
  display: flex; gap: 14px; align-items: flex-start;
  padding: var(--s-4) var(--s-5);
  border: 1px solid color-mix(in srgb, var(--c-amber) 32%, transparent);
  border-radius: var(--r-md);
  background: linear-gradient(100deg, color-mix(in srgb, var(--c-amber) 11%, transparent), transparent 68%);
}
.nd__china--strong {
  border-color: color-mix(in srgb, var(--c-amber) 62%, transparent);
  background: linear-gradient(100deg, color-mix(in srgb, var(--c-amber) 17%, transparent), transparent 72%);
  box-shadow: 0 0 30px color-mix(in srgb, var(--c-amber) 12%, transparent);
}
.nd__china-flag { font-size: 30px; line-height: 1; }
.nd__china p { font-size: 13.5px; line-height: 1.85; color: var(--t-hi); margin: 5px 0 9px; }
.nd__china .label-xs { color: var(--c-amber); }

/* 拓展资源 */
.nd__media { display: flex; flex-direction: column; gap: 10px; }
.nd__media + .nd__media { margin-top: var(--s-4); }
.nd__media-h {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 700; color: var(--t-hi);
}
.nd__media-h span {
  font-family: var(--f-mono); font-size: 10px; color: var(--t-lo);
  padding: 1px 7px; border-radius: 9px; border: 1px solid var(--line);
}

/* 底部翻页 */
.nd__foot { display: flex; gap: var(--s-3); justify-content: space-between; padding-top: var(--s-3); border-top: 1px solid var(--line); }
.nd__foot-btn {
  display: flex; flex-direction: column; gap: 3px;
  padding: 11px 16px; max-width: 46%;
  border: 1px solid var(--line); border-radius: var(--r-md);
  background: rgba(8, 18, 42, 0.55);
  text-align: left;
  transition: all var(--dur-fast) var(--ease-out);
}
.nd__foot-btn b { font-size: 14px; color: var(--t-hi); }
.nd__foot-btn:hover { border-color: var(--line-hot); box-shadow: var(--glow-cyan); transform: translateY(-2px); }
.nd__foot-btn--next { margin-left: auto; text-align: right; align-items: flex-end; }

/* 缺失 */
.nd__missing { display: flex; flex-direction: column; gap: var(--s-4); align-items: center; color: var(--t-lo); }

/* ── 侧栏 ── */
.nd__side { padding: var(--s-5) var(--s-4) var(--s-7); display: flex; flex-direction: column; gap: var(--s-4); }

.nd__research { display: flex; flex-direction: column; gap: 10px; align-items: stretch; }
.nd__research :deep(.btn) { width: 100%; justify-content: center; }
.nd__research-done { font-size: 13.5px; color: var(--c-emerald); }
.nd__research-done b { color: var(--t-hi); }
.nd__lock { font-size: 12px; color: var(--c-rose); line-height: 1.6; }
.nd__teaser { display: flex; flex-direction: column; gap: 6px; }
.nd__checks {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5px;
  padding-top: 9px; border-top: 1px solid var(--line);
}
.nd__checks span { font-size: 11px; color: var(--t-faint); transition: color var(--dur); }
.nd__checks span.on { color: var(--c-emerald); }
.nd__free { font-size: 11px; color: var(--t-lo); line-height: 1.6; }
.nd__free b { color: var(--c-cyan); }

.nd__geo { display: flex; flex-direction: column; gap: 9px; }
.nd__geo-rows { display: flex; flex-direction: column; gap: 5px; }
.nd__geo-rows > div { display: flex; align-items: baseline; gap: 9px; font-size: 12.5px; }
.nd__geo-rows .label-xs { flex: none; width: 62px; }
.nd__geo-rows b { color: var(--t-hi); font-weight: 600; }
.nd__geo :deep(.btn) { align-self: flex-start; }

.nd__era { display: flex; flex-direction: column; gap: 9px; }
.nd__era-range { font-size: 11px; color: var(--t-lo); }
.nd__era-stats { display: flex; gap: var(--s-5); }
.nd__lead { display: flex; flex-direction: column; gap: 5px; }
.nd__lead-row { display: grid; grid-template-columns: 92px 1fr 26px; gap: 8px; align-items: center; }
.nd__lead-name { font-size: 11.5px; color: var(--t-mid); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nd__lead-bar { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
.nd__lead-bar i {
  display: block; height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ec, var(--c-cyan)) 50%, transparent), var(--ec, var(--c-cyan)));
  box-shadow: 0 0 9px color-mix(in srgb, var(--ec, var(--c-cyan)) 55%, transparent);
}
.nd__lead-pct { font-size: 10.5px; color: var(--ec, var(--c-cyan)); text-align: right; }
.nd__era-note { font-size: 12px; color: var(--ea, var(--c-amber)); line-height: 1.65; }
.nd__era :deep(.btn) { flex: 1; justify-content: center; }

.nd__list { display: flex; flex-direction: column; gap: 8px; }

@media (max-width: 1024px) {
  .nd__doc { padding: var(--s-4) var(--s-4) var(--s-7); }
  .nd__crumb { padding: 8px var(--s-4); }
  .nd__path { display: none; }
}
</style>
