<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUI } from '@/stores/ui'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { ERA_MAP } from '@/data/eras'
import { CATEGORY_MAP } from '@/data/categories'
import { NODES } from '@/data/techTree'
import HudPanel from '@/components/ui/HudPanel.vue'
import type { TechNode } from '@/types'

const ui = useUI()
const progress = useProgress()
const settings = useSettings()
const router = useRouter()

/** 当前时代的节点；若设了分类过滤则只显示该分类 */
const rows = computed<TechNode[]>(() => {
  const eraId = ui.eraId
  let list = NODES.filter(n => n.era === eraId)
  if (ui.category !== 'all') list = list.filter(n => n.category === ui.category)
  if (ui.chinaOnly) list = list.filter(n => n.chinaLink >= 2)
  if (ui.warOnly) list = list.filter(n => n.category === 'conflict' || (n.warLinks?.length ?? 0) > 0)
  return list
})

const recommended = computed(() => progress.nextRecommended)

/** 已经"发生"的（年份 <= 时间游标）排在前面并高亮 */
const happened = computed(() => new Set(ui.nodesUpTo.map(n => n.id)))

function pick(n: TechNode) {
  settings.sfx('pin')
  ui.select(n.id, { fly: true })
  ui.flyTo(n.geo.lat, n.geo.lng, n.name, 2.05)
}

function open(n: TechNode) {
  settings.sfx('confirm')
  void router.push(`/node/${n.id}`)
}

const era = computed(() => ERA_MAP[ui.eraId])

/** 时间游标附近、但属于其它时代的突破——用来讲"同一时期世界在做什么" */
const nearby = computed<TechNode[]>(() =>
  NODES
    .filter(n => n.era !== ui.eraId && n.year <= ui.year && ui.year - n.year < 150)
    .sort((a, b) => b.year - a.year)
    .slice(0, 3)
)
</script>

<template>
  <HudPanel
    class="event-panel"
    :title="`${era.short} · 关键突破`"
    :subtitle="`${rows.length} 项 · 按时间顺序`"
    scroll
  >
    <template #actions>
      <button
        class="btn btn--sm btn--ghost" :class="{ 'is-active': ui.chinaOnly }"
        title="只看与中国相关的突破"
        @click="settings.sfx('tick'); ui.toggleChinaOnly()"
      >🇨🇳 中国</button>
      <button
        class="btn btn--sm btn--ghost" :class="{ 'is-active': ui.warOnly }"
        title="只看与战争冲突相关的突破"
        style="margin-left: 5px"
        @click="settings.sfx('tick'); ui.toggleWarOnly()"
      >⚔ 战争</button>
    </template>

    <div class="event-list">
      <div
        v-for="n in rows" :key="n.id"
        class="event-row"
        :class="{ 'is-active': ui.selectedId === n.id, 'is-locked': !progress.isAvailable(n.id), 'is-past': happened.has(n.id) }"
        :style="{ '--cat': CATEGORY_MAP[n.category]?.color }"
        @click="pick(n)"
        @mouseenter="ui.hover(n.id); settings.sfx('hover', 0.3)"
        @mouseleave="ui.hover(null)"
      >
        <span class="event-row__mark">{{ CATEGORY_MAP[n.category]?.glyph }}</span>
        <span class="col grow" style="min-width: 0">
          <span class="event-row__t">{{ n.name }}</span>
          <span class="event-row__m">
            <b class="flag">{{ n.flag }}</b>{{ n.yearLabel }} · {{ n.geo.country }} {{ n.geo.place }}
          </span>
        </span>
        <span v-if="recommended === n.id" class="event-row__rec">推荐</span>
        <span v-else-if="!progress.isAvailable(n.id)" class="event-row__rec" style="color: var(--t-lo); border-color: var(--line)">🔒</span>
        <button class="event-row__open" title="查看详情页" @click.stop="open(n)">详情 →</button>
      </div>

      <p v-if="!rows.length" class="empty">这个时代没有匹配的突破，换个筛选条件试试</p>
    </div>

    <template v-if="nearby.length">
      <div class="hr" style="margin: 10px 0 8px" />
      <div class="label-xs" style="margin-bottom: 6px">同一时间，别处也在发生</div>
      <div class="chips">
        <button
          v-for="n in nearby" :key="n.id" class="pill pill--cyan" style="cursor: pointer"
          @click="pick(n)"
        >{{ n.yearLabel }} {{ n.name }}</button>
      </div>
    </template>
  </HudPanel>
</template>

<style scoped>
.event-panel :deep(.hud-panel__body) { display: flex; flex-direction: column; min-height: 0; }
.event-row__open {
  position: absolute; right: 7px; bottom: 6px; opacity: 0;
  font-size: 11px; letter-spacing: 0.06em; padding: 1px 6px; cursor: pointer;
  color: var(--c-cyan); background: rgba(0, 212, 255, 0.12);
  border: 1px solid rgba(0, 212, 255, 0.34); border-radius: 3px;
  transition: opacity var(--dur-fast) var(--ease-out);
}
.event-row:hover .event-row__open { opacity: 1; }
.event-row__open:hover { background: var(--c-cyan); color: #04121f; }
.event-row:not(.is-past) .event-row__t { color: var(--t-mid); }
.event-row:not(.is-past) .event-row__mark { opacity: 0.5; }
.flag { margin-right: 3px; }
</style>
