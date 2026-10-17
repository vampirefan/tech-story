<script setup lang="ts">
import { computed } from 'vue'
import { useUI } from '@/stores/ui'
import { useSettings } from '@/stores/settings'
import { ERA_MAP, ERA_ORDER, yearLabel } from '@/data/eras'
import { REGIONS, REGION_MAP } from '@/data/regions'
import { CATEGORIES } from '@/data/categories'
import { NODES_BY_ERA } from '@/data/techTree'
import type { EraId } from '@/types'
import HudPanel from '@/components/ui/HudPanel.vue'
import UiButton from '@/components/ui/UiButton.vue'

const ui = useUI()
const settings = useSettings()

const era = computed(() => ERA_MAP[ui.eraId])
const eraIndex = computed(() => ERA_ORDER.indexOf(ui.eraId))
const hasPrev = computed(() => eraIndex.value > 0)
const hasNext = computed(() => eraIndex.value < ERA_ORDER.length - 1)

interface Row { id: string; name: string; v: number; lead: boolean; china: boolean }

/** 当前时代的地域排行：前 5 名 + 中国（若未上榜也强制显示，方便横向对比） */
const rows = computed<Row[]>(() => {
  const eraId = ui.eraId
  const scored = REGIONS
    .map(r => ({ id: r.id, name: r.name, v: r.timeline[eraId] ?? 0 }))
    .sort((a, b) => b.v - a.v)
  const top = scored.filter(r => r.v > 0).slice(0, 5)
  const china = scored.find(r => r.id === 'china')
  if (china && !top.some(t => t.id === 'china')) top.push(china)
  const max = Math.max(0.001, ...top.map(t => t.v))
  return top.map((r, i) => ({
    id: r.id,
    name: r.name,
    v: r.v,
    lead: i === 0 && r.v >= max - 1e-9,
    china: r.id === 'china'
  }))
})

function colorOf(id: string, v: number) {
  const e = era.value
  return v >= 0.9 ? e.accent : id === 'china' ? '#ffd166' : e.color
}

const catCounts = computed(() => {
  const list = NODES_BY_ERA[ui.eraId] ?? []
  return CATEGORIES.map(c => ({ ...c, n: list.filter(n => n.category === c.id).length })).filter(c => c.n > 0)
})

const total = computed(() => (NODES_BY_ERA[ui.eraId] ?? []).length)

function goto(dir: -1 | 1) {
  const i = eraIndex.value + dir
  if (i < 0 || i >= ERA_ORDER.length) return
  settings.sfx(dir > 0 ? 'whoosh' : 'page')
  ui.setEra(ERA_ORDER[i] as EraId)
}

function focusRegion(id: string) {
  const r = REGION_MAP[id]
  if (!r) return
  settings.sfx('pin')
  ui.flyTo(r.lat, r.lng, r.name, 2.2)
}

const rangeText = computed(() => `${yearLabel(era.value.from)} — ${yearLabel(era.value.to)}`)
</script>

<template>
  <HudPanel class="era-panel" :style="{ '--era-color': era.color, '--era-accent': era.accent, '--era-glow': era.color + '88' }">
    <div class="era-panel__glow" />
    <template #head>
      <div class="col grow">
        <div class="era-panel__top">
          <span class="era-panel__name">{{ era.name }}</span>
          <span class="era-panel__range">{{ rangeText }}</span>
        </div>
        <p class="era-panel__tag">{{ era.tagline }}</p>
      </div>
    </template>

    <p class="era-panel__desc">{{ era.desc }}</p>

    <div class="hr hr--glow" style="margin: 10px 0 9px" />

    <div class="label-xs" style="margin-bottom: 7px">
      这一时期，谁在领先
      <span style="margin-left: auto; color: var(--t-faint)">点击可飞到该地</span>
    </div>
    <div class="region-list">
      <div
        v-for="r in rows" :key="r.id"
        class="region-row"
        :class="{ 'is-lead': r.lead, 'is-china': r.china }"
        :style="{ '--rc': colorOf(r.id, r.v) + '55', '--rc2': colorOf(r.id, r.v) }"
        :title="REGION_MAP[r.id]?.note"
        @click="focusRegion(r.id)"
        @mouseenter="settings.sfx('hover', 0.35)"
      >
        <span class="region-row__name"><b>{{ r.name }}</b></span>
        <span class="region-row__v">{{ r.lead ? '领先' : Math.round(r.v * 100) + '%' }}</span>
        <span class="region-row__bar"><i class="region-row__fill" :style="{ width: (r.v * 100).toFixed(1) + '%' }" /></span>
      </div>
      <p v-if="!rows.length" class="empty" style="padding: 10px 0; font-size: 11.5px">
        这个时代还没有成规模的文明中心
      </p>
    </div>

    <div class="era-nav">
      <UiButton size="sm" variant="ghost" :disabled="!hasPrev" sfx="page" @click="goto(-1)">← 上一时代</UiButton>
      <UiButton size="sm" variant="ghost" :disabled="!hasNext" sfx="whoosh" @click="goto(1)">下一时代 →</UiButton>
    </div>

    <template v-if="ui.showLegend && catCounts.length">
      <div class="hr" style="margin: 10px 0 8px" />
      <div class="label-xs" style="margin-bottom: 6px">本时代 {{ total }} 项突破</div>
      <div class="legend">
        <span
          v-for="c in catCounts" :key="c.id" class="legend__item"
          :style="{ '--cat': c.color }" :title="c.blurb"
          @click="ui.setCategory(ui.category === c.id ? 'all' : c.id)"
        >
          <i class="legend__swatch" />{{ c.name }} {{ c.n }}
        </span>
      </div>
    </template>
  </HudPanel>
</template>
