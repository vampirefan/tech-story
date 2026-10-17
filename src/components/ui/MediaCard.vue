<script setup lang="ts">
import { computed } from 'vue'
import type { MediaItem } from '@/types'
import { TRACK_MAP } from '@/data/tracks'
import { MEDIA_AUDIO_ALIAS } from '@/data/media'
import { useSettings } from '@/stores/settings'
import { useUI } from '@/stores/ui'
import CoverArt from './CoverArt.vue'

const props = defineProps<{ item: MediaItem & { id?: string }; compact?: boolean }>()

const settings = useSettings()
const ui = useUI()

const KIND: Record<string, { label: string; icon: string }> = {
  book: { label: '书籍', icon: '📖' },
  movie: { label: '影视', icon: '🎬' },
  game: { label: '游戏', icon: '🎮' },
  music: { label: '音乐', icon: '🎵' }
}
const kind = computed(() => KIND[props.item.kind] ?? KIND.book)

/** 封面存相对路径，打包后 BASE_URL 会变，这里统一解析 */
const coverSrc = computed(() => (props.item.cover ? `${import.meta.env.BASE_URL}${props.item.cover}` : undefined))

/** 只有映射到真实音频文件的条目才能播放，其余走程序合成氛围 */
const playableId = computed(() => {
  const id = props.item.id
  if (!id) return null
  if (TRACK_MAP[id]) return id
  const alias = MEDIA_AUDIO_ALIAS[id]
  return alias && TRACK_MAP[alias] ? alias : null
})
const playing = computed(() => settings.playingTrack === playableId.value && playableId.value !== null)

function play() {
  const id = playableId.value
  if (!id) {
    ui.toast('这一条是拓展推荐，暂无可播放的公版录音', 'info', '🎵')
    return
  }
  settings.playTrack(id)
  ui.toast(`正在播放：${TRACK_MAP[id].label}`, 'success', '🎵')
}
</script>

<template>
  <article class="card media-card" :class="{ 'media-card--compact': compact }">
    <div class="media-card__cover">
      <CoverArt
        :title="item.title" :author="item.author" :glyph="item.glyph"
        :palette="item.palette" :kind="item.kind" :src="coverSrc"
        :w="compact ? 160 : 240" :h="compact ? 220 : 340"
      />
      <button
        v-if="item.kind === 'music'"
        class="media-card__play" :class="{ 'is-playing': playing }"
        :title="playableId ? '播放 / 设为背景音乐' : '暂无可播放录音'"
        @click.stop="play(); settings.sfx('power')"
      >{{ playing ? '❚❚' : '▶' }}</button>
      <span class="pill media-card__kind">{{ kind.icon }} {{ kind.label }}</span>
    </div>

    <div class="media-card__body">
      <h4 class="media-card__title">{{ item.title }}</h4>
      <p v-if="item.author" class="media-card__author">{{ item.author }}<span v-if="item.year"> · {{ item.year }}</span></p>
      <p class="media-card__intro">{{ item.intro }}</p>
      <p class="media-card__reason"><span class="label-xs">为什么推荐</span>{{ item.reason }}</p>
      <p v-if="item.duration" class="media-card__dur mono">{{ Math.round(item.duration / 60) }} 分钟</p>
    </div>
  </article>
</template>

<style scoped>
.media-card { display: flex; flex-direction: column; gap: 0; padding: 0; overflow: hidden; }
.media-card__cover { position: relative; flex: none; background: #060c1e; }
.media-card__cover :deep(.cover) { border-radius: 0; border: 0; border-bottom: 1px solid var(--line); }
.media-card__kind { position: absolute; top: 8px; left: 8px; background: rgba(var(--veil), 0.9); }
.media-card__play {
  position: absolute; right: 9px; bottom: 9px;
  width: 38px; height: 38px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(var(--veil), 0.88);
  border: 1px solid var(--line-hot);
  color: var(--c-cyan); font-size: 13px;
  box-shadow: var(--glow-cyan);
  transition: all var(--dur-fast) var(--ease-out);
}
.media-card__play:hover { transform: scale(1.1); background: rgba(0, 150, 210, 0.35); }
.media-card__play.is-playing { color: var(--c-amber); border-color: rgba(255, 179, 71, 0.7); box-shadow: var(--glow-amber); animation: pulseGlow 1.8s ease-in-out infinite; }
.media-card__body { padding: var(--s-3) var(--s-4) var(--s-4); display: flex; flex-direction: column; gap: 5px; }
.media-card__title { font-size: 14.5px; line-height: 1.35; color: var(--t-hi); }
.media-card__author { font-size: 11.5px; color: var(--t-lo); }
.media-card__intro { font-size: 12.5px; color: var(--t-mid); line-height: 1.6; }
.media-card__reason {
  font-size: 12px; color: var(--c-amber); line-height: 1.55;
  border-left: 2px solid rgba(255, 179, 71, 0.45);
  padding-left: 9px; margin-top: 4px;
}
.media-card__reason .label-xs { display: block; color: var(--t-faint); margin-bottom: 2px; }
.media-card__dur { font-size: 11.5px; color: var(--t-faint); }
.media-card--compact .media-card__title { font-size: 13px; }
.media-card--compact .media-card__intro { font-size: 11.5px; }
</style>
