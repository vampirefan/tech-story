<script setup lang="ts">
import { computed } from 'vue'
import { catColor, catName } from '@/data/categories'
import { REGION_MAP } from '@/data/regions'
import type { Country } from '@/three/geo'
import type { TechNode } from '@/types'

const props = withDefaults(defineProps<{
  node?: TechNode | null
  country?: Country | null
  activity?: number
  lockReason?: string
  x?: number
  y?: number
}>(), { node: null, country: null, activity: 0, lockReason: '', x: 0, y: 0 })

/** 靠近右/下边缘时翻到光标另一侧，别让提示框被裁掉 */
const pos = computed(() => {
  const w = window.innerWidth || 1280
  const h = window.innerHeight || 720
  const flipX = props.x > w - 300
  const flipY = props.y > h - 190
  return {
    left: flipX ? undefined : props.x + 18,
    right: flipX ? w - props.x + 18 : undefined,
    top: flipY ? undefined : props.y + 16,
    bottom: flipY ? h - props.y + 16 : undefined
  }
})

const regions = computed(() =>
  (props.country?.regions ?? []).map(id => REGION_MAP[id]?.name ?? id).slice(0, 3)
)

const visible = computed(() => !!props.node || !!props.country)
const cat = computed(() => (props.node ? catColor(props.node.category) : 'var(--c-cyan)'))
const impactPct = computed(() => ((props.node?.impact ?? 0) / 5) * 100)
</script>

<template>
  <div v-if="visible" class="gtip" :style="{ ...pos, '--cat': cat }">
    <!-- 科技节点 -->
    <template v-if="node">
      <div class="gtip__h">
        <span class="gtip__t">{{ node.flag ? node.flag + ' ' : '' }}{{ node.name }}</span>
        <span class="gtip__y">{{ node.yearLabel }}</span>
      </div>
      <div class="gtip__p">{{ catName(node.category) }} · {{ node.geo.country }} {{ node.geo.place }}</div>
      <div class="gtip__b">{{ node.summary }}</div>
      <div class="gtip__bar"><div class="gtip__barfill" :style="{ width: impactPct + '%' }" /></div>
      <div v-if="lockReason" class="gtip__f">🔒 {{ lockReason }}</div>
      <div v-else class="gtip__f">点击查看原理动画与故事 →</div>
    </template>

    <!-- 国家 -->
    <template v-else-if="country">
      <div class="gtip__h">
        <span class="gtip__t">{{ country.zh }}</span>
        <span class="gtip__y">{{ country.name }}</span>
      </div>
      <div v-if="regions.length" class="gtip__p">所属文明区：{{ regions.join(' / ') }}</div>
      <div v-if="country.note" class="gtip__b">{{ country.note }}</div>
      <div class="gtip__bar"><div class="gtip__barfill" :style="{ width: activity * 100 + '%' }" /></div>
      <div class="gtip__f">当前时代活跃度 {{ Math.round(activity * 100) }}%</div>
    </template>
  </div>
</template>
