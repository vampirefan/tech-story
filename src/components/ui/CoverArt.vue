<script setup lang="ts">
import { computed, ref } from 'vue'
import { makeCover } from '@/utils/cover'
import type { MediaKind } from '@/types'

const props = withDefaults(defineProps<{
  title: string
  author?: string
  glyph?: string
  palette?: [string, string]
  kind?: MediaKind
  src?: string
  w?: number
  h?: number
}>(), { w: 240, h: 340 })

/** 外链封面加载失败时回退到程序生成的 SVG —— 课堂离线也不能出现裂图 */
const broken = ref(false)
const generated = computed(() => makeCover({
  title: props.title, author: props.author, glyph: props.glyph,
  palette: props.palette, kind: props.kind, w: props.w, h: props.h
}))
const url = computed(() => (props.src && !broken.value ? props.src : generated.value))
</script>

<template>
  <img
    class="cover" :src="url" :alt="title"
    :style="{ aspectRatio: `${w} / ${h}` }"
    draggable="false"
    @error="broken = true"
  />
</template>

<style scoped>
.cover {
  width: 100%; height: 100%; object-fit: cover;
  border-radius: var(--r-sm);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.5);
  background: #0a1430;
}
</style>
