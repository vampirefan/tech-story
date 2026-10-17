<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ERAS, ERA_MAP, yearLabel } from '@/data/eras'
import { NODES, NODES_BY_ERA, ALL_EDGES, EDGES, WAR_EDGES, NODE_MAP, eraStats, chinaNodesOfEra, type TechEdge } from '@/data/techTree'
import { CATEGORY_MAP, catColor, catName } from '@/data/categories'
import { REGION_MAP } from '@/data/regions'
import { useUI } from '@/stores/ui'
import { useSettings } from '@/stores/settings'
import UiButton from '@/components/ui/UiButton.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import type { Era, TechNode } from '@/types'

const router = useRouter()
const ui = useUI()
const settings = useSettings()

const scrollEl = ref<HTMLElement | null>(null)
const activeEra = ref(ui.eraId)
const progress = ref(0)
const playing = ref(false)
const speed = ref(1)
let scrollTimer = 0
let spyTimer = 0
let io: IntersectionObserver | null = null

interface ChainItem {
  n: TechNode
  link: TechEdge | null
  entry: { node: TechNode; edge: TechEdge } | null
}

function nodesOf(era: Era): TechNode[] {
  return NODES_BY_ERA[era.id].slice().sort((a, b) => a.year - b.year)
}

/** 相邻两张卡片之间的因果连接：直接边 / 战争边，没有则只表示时间流动 */
function connector(a: TechNode, b: TechNode): TechEdge | null {
  return ALL_EDGES.find(e => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id)) ?? null
}

/** 时代链的第一张卡片：从上一时代接过来的因果 */
function entryLink(era: Era, first: TechNode): { node: TechNode; edge: TechEdge } | null {
  const idx = ERAS.indexOf(era)
  if (idx <= 0) return null
  const e = ALL_EDGES.find(e => e.to === first.id && NODE_MAP[e.from] && NODE_MAP[e.from].era === ERAS[idx - 1].id)
  return e ? { node: NODE_MAP[e.from], edge: e } : null
}

const chains = computed(() => ERAS.map(era => {
  const ns = nodesOf(era)
  const items: ChainItem[] = ns.map((n, i) => ({
    n,
    link: i < ns.length - 1 ? connector(n, ns[i + 1]) : null,
    entry: i === 0 ? entryLink(era, n) : null
  }))
  return { era, items, stats: eraStats(era.id), china: chinaNodesOfEra(era.id) }
}))

/* ── 自动滚屏（引导模式） ── */
function togglePlay() {
  playing.value = !playing.value
  if (playing.value) {
    settings.sfx('confirm')
    scrollTimer = window.setInterval(() => {
      const el = scrollEl.value
      if (!el) return
      el.scrollTop += 2.2 * speed.value
      if (el.scrollTop >= el.scrollHeight - el.clientHeight - 4) {
        playing.value = false
        window.clearInterval(scrollTimer)
        settings.sfx('chime', 0.6)
        ui.toast('时间线走完了一遍 · 去科技树看看因果全貌吧', 'unlock', '✦')
      }
    }, 16)
  } else {
    settings.sfx('cancel')
    window.clearInterval(scrollTimer)
  }
}

function jumpEra(id: string) {
  const el = scrollEl.value?.querySelector<HTMLElement>(`[data-era="${id}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  settings.sfx('whoosh', 0.4)
}

function onScroll() {
  if (spyTimer) return
  spyTimer = window.setTimeout(() => {
    spyTimer = 0
    const el = scrollEl.value
    if (!el) return
    progress.value = el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0
    const mid = el.scrollTop + el.clientHeight * 0.35
    let cur = ERAS[0].id
    for (const era of ERAS) {
      const sec = el.querySelector<HTMLElement>(`[data-era="${era.id}"]`)
      if (sec && sec.offsetTop <= mid) cur = era.id
    }
    if (cur !== activeEra.value) activeEra.value = cur
  }, 90)
}

function open(n: TechNode) {
  settings.sfx('page')
  void router.push(`/node/${n.id}`)
}

function onGlobe(n: TechNode) {
  ui.select(n.id)
  ui.setYear(n.year)
  void router.push('/globe')
}

onMounted(() => {
  scrollEl.value?.addEventListener('scroll', onScroll, { passive: true })
  io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) e.target.classList.add('in')
  }, { root: scrollEl.value, threshold: 0.12 })
  scrollEl.value?.querySelectorAll('.rv').forEach(el => io!.observe(el))
  onScroll()
})

onBeforeUnmount(() => {
  window.clearInterval(scrollTimer)
  if (spyTimer) window.clearTimeout(spyTimer)
  io?.disconnect()
  io = null
})
</script>

<template>
  <section class="scene-root tl">
    <div ref="scrollEl" class="doc-scene tl__scroll">
      <!-- ══ 卷首 ══ -->
      <header class="tl__hero rv">
        <div class="scene-head">
          <span class="scene-head__eyebrow">Timeline · 因果长卷</span>
          <h1 class="scene-head__title">人类科技文明时间线</h1>
          <p class="scene-head__sub">
            从第一块打制石器到人工智能，{{ NODES.length }} 项技术突破串成一条因果长链。
            每一张卡片是一步，每一条箭头都是一句"因为……所以……"。滚动阅读，或交给它自己讲。
          </p>
        </div>
        <div class="tl__stats">
          <div class="tl__stat"><span class="bignum">{{ NODES.length }}</span><span class="bignum__unit">技术节点</span></div>
          <div class="tl__stat"><span class="bignum">{{ EDGES.length }}</span><span class="bignum__unit">因果边</span></div>
          <div class="tl__stat"><span class="bignum bignum--amber">{{ WAR_EDGES.length }}</span><span class="bignum__unit">战争推动</span></div>
          <div class="tl__stat"><span class="bignum">{{ ERAS.length }}</span><span class="bignum__unit">时代</span></div>
        </div>
        <div class="tl__ctrl">
          <UiButton :variant="playing ? 'amber' : 'primary'" @click="togglePlay">
            {{ playing ? '❚❚ 暂停讲述' : '▶ 自动讲述' }}
          </UiButton>
          <UiSegmented v-model="speed" :options="[{ value: 0.5, label: '0.5×' }, { value: 1, label: '1×' }, { value: 2, label: '2×' }, { value: 4, label: '4×' }]" />
          <UiButton variant="ghost" @click="ui.play(); router.push('/globe')">🌍 在地球上播放</UiButton>
        </div>
      </header>

      <!-- ══ 时代导航 ══ -->
      <nav class="tl__nav">
        <button
          v-for="(e, i) in ERAS" :key="e.id"
          class="tl__nav-pill"
          :class="{ 'is-active': activeEra === e.id }"
          :style="{ '--ec': e.color }"
          @click="jumpEra(e.id)"
        ><i>{{ String(i + 1).padStart(2, '0') }}</i>{{ e.name }}</button>
      </nav>

      <!-- ══ 每个时代 ══ -->
      <section v-for="c in chains" :key="c.era.id" :data-era="c.era.id" class="tl__era" :style="{ '--ec': c.era.color, '--ea': c.era.accent }">
        <div class="tl__era-head rv">
          <span class="tl__era-idx">{{ String(ERAS.indexOf(c.era) + 1).padStart(2, '0') }}</span>
          <div class="tl__era-titles">
            <h2>{{ c.era.name }}<span class="tl__era-en">{{ c.era.short }}</span></h2>
            <div class="tl__era-years">{{ yearLabel(c.era.from) }} — {{ yearLabel(c.era.to) }}</div>
          </div>
          <p class="tl__era-tag">{{ c.era.tagline }}</p>
        </div>
        <p class="prose tl__desc rv">{{ c.era.desc }}</p>

        <!-- 谁在领先 -->
        <div class="tl__powers rv">
          <div class="label-xs">这一时期 · 谁在领先（地理造就历史）</div>
          <div v-for="p in c.era.powers" :key="p.region" class="pw">
            <span class="pw__name">{{ REGION_MAP[p.region]?.name ?? p.region }}</span>
            <span class="pw__bar"><i :style="{ width: `${Math.round(p.strength * 100)}%` }" /></span>
            <span class="pw__pct">{{ Math.round(p.strength * 100) }}</span>
            <span class="pw__note">{{ p.note }}</span>
          </div>
        </div>

        <!-- 因果链 -->
        <div class="tl__chain">
          <template v-for="(it, i) in c.items" :key="it.n.id">
            <div v-if="it.entry" class="tl__link tl__link--entry rv">
              <svg viewBox="0 0 24 44" aria-hidden="true"><path d="M12 0v34m-6-9l6 9 6-9" fill="none" /></svg>
              <span>承接{{ ERA_MAP[it.entry.node.era].name }}・{{ it.entry.node.name }} →</span>
            </div>
            <article class="tlcard rv" :style="{ '--cat': catColor(it.n.category) }" @mouseenter="settings.sfx('hover', 0.22)">
              <div class="tlcard__top">
                <span class="tlcard__year">{{ it.n.yearLabel }}</span>
                <span class="tlcard__cat">{{ CATEGORY_MAP[it.n.category].glyph }} {{ catName(it.n.category) }}</span>
                <span class="tlcard__geo">{{ it.n.flag ?? '' }} {{ it.n.geo.country }} · {{ it.n.geo.place }}</span>
              </div>
              <h3 class="tlcard__name">{{ it.n.name }}</h3>
              <p class="tlcard__sum">{{ it.n.summary }}</p>
              <div class="tlcard__foot">
                <span class="tlcard__impact" :title="`历史影响 ${it.n.impact}/5`">
                  <i v-for="k in 5" :key="k" :class="{ on: k <= it.n.impact }" />
                </span>
                <span v-if="it.n.warLinks?.length" class="tlcard__badge tlcard__badge--war">✕ {{ it.n.warLinks.length }} 条战争因果</span>
                <span v-if="it.n.chinaLink >= 2" class="tlcard__badge tlcard__badge--cn">🇨🇳 中国</span>
                <span v-if="it.n.demo" class="tlcard__badge tlcard__badge--demo">▶ 原理动画</span>
                <span class="tlcard__sp" />
                <UiButton size="sm" variant="ghost" @click="onGlobe(it.n)">地球</UiButton>
                <UiButton size="sm" variant="primary" @click="open(it.n)">打开</UiButton>
              </div>
            </article>
            <div v-if="i < c.items.length - 1" class="tl__link rv" :class="{ 'tl__link--war': it.link?.kind === 'war' }">
              <svg viewBox="0 0 24 44" aria-hidden="true"><path d="M12 0v34m-6-9l6 9 6-9" fill="none" /></svg>
              <span v-if="it.link">
                {{ it.link.kind === 'war' ? '✕ 战争推动 · ' : '→ 直接催生 · ' }}
                {{ it.link.note ?? `${it.n.name} 为 ${c.items[i + 1].n.name} 铺路` }}
              </span>
              <span v-else class="tl__link-time">…与此同时…</span>
            </div>
          </template>
        </div>

        <!-- 中国在这一时代 -->
        <div v-if="c.china.length" class="tl__china rv">
          <span class="tl__china-flag">🇨🇳</span>
          <div>
            <b>中国在这一时代 · {{ c.stats.china }} 项</b>
            <p>{{ c.china.slice(0, 4).map(n => n.name).join('、') }}{{ c.china.length > 4 ? ' 等' : '' }}</p>
          </div>
        </div>
      </section>

      <footer class="tl__end rv">
        <h2>已经走到今天</h2>
        <p>接下来的箭头，将由你们这一代人画上去。</p>
        <div class="tl__end-btns">
          <UiButton variant="primary" @click="router.push('/tree')"> 打开科技树</UiButton>
          <UiButton variant="amber" @click="router.push('/china')">🇨🇳 中国专题</UiButton>
          <UiButton @click="router.push('/globe')">🌍 回到地球</UiButton>
        </div>
      </footer>
    </div>

    <div class="tl__progress"><i :style="{ height: `${progress * 100}%` }" /></div>
  </section>
</template>

<style scoped>
.tl { background: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(20, 60, 120, 0.25), transparent 65%), var(--c-deep); }
.tl__scroll { scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent; }
.tl__scroll > * { width: min(1180px, 100%); margin: 0 auto; }

/* 卷首 */
.tl__hero { padding: var(--s-7) var(--s-6) var(--s-5); display: flex; flex-direction: column; gap: var(--s-5); }
.tl__stats { display: flex; gap: var(--s-6); flex-wrap: wrap; }
.tl__stat { display: flex; align-items: baseline; gap: 6px; }
.tl__ctrl { display: flex; align-items: center; gap: var(--s-3); flex-wrap: wrap; }

/* 时代导航 */
.tl__nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; gap: 6px; overflow-x: auto;
  padding: 10px var(--s-6);
  background: linear-gradient(180deg, rgba(3, 6, 15, 0.97), rgba(3, 6, 15, 0.92));
  border-block: 1px solid var(--line);
  width: 100% !important; margin: 0 !important;
}
.tl__nav-pill {
  flex: none; display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 16px;
  border: 1px solid var(--line); background: rgba(8, 15, 34, 0.7);
  color: var(--t-mid); font-size: 12px; font-weight: 600;
  transition: all var(--dur-fast) var(--ease-out);
}
.tl__nav-pill i { font-family: var(--f-mono); font-style: normal; font-size: 10px; color: var(--t-faint); }
.tl__nav-pill:hover { color: var(--t-hi); border-color: var(--ec); }
.tl__nav-pill.is-active {
  color: var(--t-hi); border-color: var(--ec);
  background: color-mix(in srgb, var(--ec) 16%, rgba(8, 15, 34, 0.8));
  box-shadow: 0 0 14px color-mix(in srgb, var(--ec) 35%, transparent);
}
.tl__nav-pill.is-active i { color: var(--ec); }

/* 时代区块 */
.tl__era { padding: var(--s-7) var(--s-6) var(--s-4); display: flex; flex-direction: column; gap: var(--s-4); }
.tl__era-head { display: flex; align-items: center; gap: var(--s-4); flex-wrap: wrap; }
.tl__era-idx {
  font-family: var(--f-mono); font-size: 44px; font-weight: 800; line-height: 1;
  color: transparent; -webkit-text-stroke: 1px var(--ec); opacity: 0.85;
}
.tl__era-titles h2 { display: flex; align-items: baseline; gap: 10px; font-size: 26px; color: var(--t-hi); letter-spacing: 0.02em; }
.tl__era-en { font-family: var(--f-display); font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--ec); }
.tl__era-years { font-family: var(--f-mono); font-size: 12px; color: var(--t-lo); margin-top: 3px; }
.tl__era-tag {
  margin-left: auto; max-width: 46ch; text-align: right;
  font-size: 14px; font-weight: 600; color: var(--ea);
}
.tl__desc { max-width: 88ch; }

/* 谁在领先 */
.tl__powers {
  display: flex; flex-direction: column; gap: 8px;
  padding: var(--s-4);
  border: 1px solid var(--line); border-radius: var(--r-md);
  background: linear-gradient(180deg, rgba(8, 15, 34, 0.66), rgba(5, 10, 24, 0.8));
}
.pw { display: grid; grid-template-columns: 190px 1fr 34px; gap: 10px; align-items: center; }
.pw__name { font-size: 12.5px; font-weight: 700; color: var(--t-hi); }
.pw__bar { height: 7px; border-radius: 4px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
.pw__bar i {
  display: block; height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ec) 55%, transparent), var(--ec));
  box-shadow: 0 0 10px color-mix(in srgb, var(--ec) 55%, transparent);
}
.pw__pct { font-family: var(--f-mono); font-size: 11px; color: var(--ec); text-align: right; }
.pw__note { grid-column: 2 / 4; font-size: 11.5px; color: var(--t-lo); margin-top: -3px; }

/* 因果链 */
.tl__chain { display: flex; flex-direction: column; align-items: stretch; padding-left: var(--s-5); }
.tlcard {
  position: relative;
  padding: var(--s-4) var(--s-5);
  border: 1px solid color-mix(in srgb, var(--cat) 30%, var(--line));
  border-left: 3px solid var(--cat);
  border-radius: var(--r-md);
  background: linear-gradient(135deg, color-mix(in srgb, var(--cat) 8%, rgba(8, 15, 34, 0.82)), rgba(5, 10, 24, 0.9));
  display: flex; flex-direction: column; gap: 8px;
  transition: box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.tlcard:hover {
  transform: translateX(4px);
  box-shadow: 0 6px 26px rgba(0, 0, 0, 0.45), 0 0 18px color-mix(in srgb, var(--cat) 22%, transparent);
}
.tlcard__top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.tlcard__year { font-family: var(--f-mono); font-size: 12px; font-weight: 700; color: var(--cat); }
.tlcard__cat { font-size: 11px; color: var(--t-mid); }
.tlcard__geo { font-size: 11px; color: var(--t-lo); margin-left: auto; }
.tlcard__name { font-size: 17px; font-weight: 800; color: var(--t-hi); letter-spacing: 0.01em; }
.tlcard__sum { font-size: 13px; line-height: 1.8; color: var(--t-mid); }
.tlcard__foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tlcard__impact { display: inline-flex; gap: 3px; }
.tlcard__impact i { width: 6px; height: 6px; border-radius: 50%; background: rgba(255, 255, 255, 0.14); }
.tlcard__impact i.on { background: var(--c-amber); box-shadow: 0 0 6px var(--c-amber-glow); }
.tlcard__badge { font-size: 10.5px; padding: 2px 8px; border-radius: 10px; border: 1px solid; }
.tlcard__badge--war { color: var(--c-rose); border-color: color-mix(in srgb, var(--c-rose) 45%, transparent); background: color-mix(in srgb, var(--c-rose) 10%, transparent); }
.tlcard__badge--cn { color: var(--c-amber); border-color: color-mix(in srgb, var(--c-amber) 45%, transparent); background: color-mix(in srgb, var(--c-amber) 10%, transparent); }
.tlcard__badge--demo { color: var(--c-cyan); border-color: color-mix(in srgb, var(--c-cyan) 45%, transparent); background: color-mix(in srgb, var(--c-cyan) 10%, transparent); }
.tlcard__sp { flex: 1; }

/* 连接线 */
.tl__link {
  display: flex; align-items: center; gap: 8px;
  padding: 2px 0 2px 26px; min-height: 46px;
  color: var(--t-lo); font-size: 11.5px;
}
.tl__link svg { width: 20px; height: 40px; flex: none; }
.tl__link svg path { stroke: var(--line-strong); stroke-width: 1.6; }
.tl__link--war svg path { stroke: var(--c-rose); stroke-dasharray: 4 3; }
.tl__link--war { color: var(--c-rose); }
.tl__link--entry { color: var(--c-cyan); }
.tl__link--entry svg path { stroke: var(--c-cyan); }
.tl__link-time { opacity: 0.55; font-style: italic; }

/* 中国条 */
.tl__china {
  display: flex; gap: 12px; align-items: center;
  padding: var(--s-3) var(--s-4);
  border: 1px solid color-mix(in srgb, var(--c-amber) 35%, transparent);
  border-radius: var(--r-md);
  background: linear-gradient(90deg, color-mix(in srgb, var(--c-amber) 12%, transparent), transparent 70%);
}
.tl__china-flag { font-size: 26px; }
.tl__china b { color: var(--c-amber); font-size: 13px; }
.tl__china p { font-size: 12px; color: var(--t-mid); margin-top: 2px; }

/* 卷尾 */
.tl__end { padding: var(--s-8) var(--s-6) var(--s-8); text-align: center; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.tl__end h2 { font-size: 30px; color: var(--t-hi); }
.tl__end p { color: var(--t-mid); font-size: 14px; }
.tl__end-btns { display: flex; gap: var(--s-3); margin-top: var(--s-3); flex-wrap: wrap; justify-content: center; }

/* 右侧阅读进度 */
.tl__progress {
  position: absolute; right: 6px; top: 8%; bottom: 8%; width: 3px;
  border-radius: 2px; background: rgba(255, 255, 255, 0.07); z-index: 30;
}
.tl__progress i {
  display: block; width: 100%; border-radius: 2px;
  background: linear-gradient(180deg, var(--c-cyan), var(--c-amber));
  box-shadow: 0 0 10px var(--c-cyan-glow);
}

/* 滚动显现 */
.rv { opacity: 0; transform: translateY(16px); transition: opacity 0.55s var(--ease-out), transform 0.55s var(--ease-out); }
.rv.in { opacity: 1; transform: none; }
</style>
