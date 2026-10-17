<script setup lang="ts">
import { computed, ref } from 'vue'
import { MEDIA_LIBRARY, MEDIA_AUDIO_ALIAS } from '@/data/media'
import { TRACKS, TRACK_MAP } from '@/data/tracks'
import { useSettings } from '@/stores/settings'
import { useUI } from '@/stores/ui'
import MediaCard from '@/components/ui/MediaCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import type { MediaKind } from '@/types'

const settings = useSettings()
const ui = useUI()

const KINDS: { id: MediaKind | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: '全部', icon: '✦' },
  { id: 'book', label: '书籍', icon: '📖' },
  { id: 'movie', label: '影视', icon: '🎬' },
  { id: 'game', label: '游戏', icon: '🎮' },
  { id: 'music', label: '音乐', icon: '🎵' }
]

const kind = ref<MediaKind | 'all'>('all')
const q = ref('')

const all = computed(() => Object.entries(MEDIA_LIBRARY).map(([id, m]) => ({ ...m, id })))
const counts = computed(() => {
  const c: Record<string, number> = { all: all.value.length }
  for (const m of all.value) c[m.kind] = (c[m.kind] ?? 0) + 1
  return c
})
const list = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return all.value
    .filter(m => kind.value === 'all' || m.kind === kind.value)
    .filter(m => !kw || `${m.title} ${m.author ?? ''} ${m.intro} ${m.reason}`.toLowerCase().includes(kw))
})
const grouped = computed(() => KINDS.filter(k => k.id !== 'all').map(k => ({
  ...k,
  items: list.value.filter(m => m.kind === k.id)
})).filter(g => g.items.length))

const nowTrack = computed(() => settings.playingTrack ? TRACK_MAP[settings.playingTrack] ?? null : null)
const playableCount = computed(() => all.value.filter(m => m.kind === 'music' && (TRACK_MAP[m.id] || TRACK_MAP[MEDIA_AUDIO_ALIAS[m.id] ?? ''])).length)

function stop() { settings.stopMusic(); ui.toast('音乐已停止', 'info', '🔇') }
</script>

<template>
  <section class="scene-root ms">
    <div class="doc-scene">
      <div class="doc-wrap">
        <header class="scene-head anim-fade-up">
          <div class="scene-head__eyebrow">EXTENDED LIBRARY</div>
          <h2 class="scene-head__title">拓展资源库</h2>
          <p class="scene-head__sub">书、影视、游戏、音乐 —— 每一张卡片都写着"为什么推荐它"。音乐可以直接播放，也会融入课堂背景。</p>
        </header>

        <!-- 过滤器 -->
        <div class="ms__bar">
          <div class="chips">
            <button v-for="k in KINDS" :key="k.id" class="pill" :class="{ 'pill--cyan': kind === k.id }"
              @click="kind = k.id; settings.sfx('tick', 0.3)">
              {{ k.icon }} {{ k.label }} <b class="mono">{{ counts[k.id] ?? 0 }}</b>
            </button>
          </div>
          <input v-model="q" class="ms__search" type="search" placeholder="搜索书名 / 作者 / 关键词…" @input="settings.sfx('tick', 0.15)">
        </div>
        <div class="ms__head-stats mono">
          <span><b>{{ counts.all }}</b> 条资源</span>
          <span><b>{{ TRACKS.length }}</b> 首曲目文件</span>
          <span><b>{{ playableCount }}</b> 张音乐卡可直接播放</span>
        </div>

        <!-- 正在播放 -->
        <div v-if="nowTrack" class="ms__now card">
          <span class="ms__eq"><i /><i /><i /><i /></span>
          <div class="grow">
            <b>{{ nowTrack.label }}</b>
            <span class="mono">{{ nowTrack.performer }} · {{ nowTrack.license }} · 约 {{ Math.round((nowTrack.approx ?? 0) / 60) }} 分钟</span>
          </div>
          <UiButton size="sm" variant="ghost" sfx="cancel" @click="stop">■ 停止</UiButton>
        </div>

        <!-- 分组卡片 -->
        <div v-if="!grouped.length" class="blank">没有匹配的资源，换个关键词试试</div>
        <section v-for="g in grouped" :key="g.id" class="sec">
          <div class="sec__h">
            <h3>{{ g.icon }} {{ g.label }}</h3>
            <span class="label-xs mono">{{ g.items.length }} 条</span>
          </div>
          <div class="grid grid--cards stagger">
            <MediaCard v-for="m in g.items" :key="m.id" :item="m" />
          </div>
        </section>

        <p class="ms__license label-xs">
          音乐录音全部来自公有领域或 CC 授权（Wikimedia Commons / 美国军乐队 / Musopen），封面为程序化生成，仅用于课堂教学。
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ms { background: radial-gradient(ellipse 70% 45% at 80% -10%, rgba(167, 139, 250, 0.14), transparent 60%), var(--c-deep); }
.ms .doc-scene { position: absolute; inset: 0; }

.ms__head-stats { display: flex; gap: 16px; font-size: 11.5px; color: var(--t-lo); }
.ms__head-stats b { color: var(--c-cyan); font-size: 15px; }

.ms__bar { display: flex; align-items: center; gap: var(--s-4); flex-wrap: wrap; }
.ms__bar .pill b { margin-left: 4px; opacity: 0.7; }
.ms__search {
  margin-left: auto; width: min(320px, 100%);
  padding: 8px 14px; font-size: 13px; color: var(--t-hi);
  background: rgba(5, 10, 30, 0.7); border: 1px solid var(--line); border-radius: 999px; outline: none;
  transition: border-color var(--dur-fast);
}
.ms__search:focus { border-color: var(--line-hot); }

.ms__now { display: flex; align-items: center; gap: var(--s-4); padding: 12px 16px; border-color: var(--line-hot); }
.ms__now > div { display: flex; flex-direction: column; gap: 2px; }
.ms__now b { font-size: 14px; color: var(--t-hi); }
.ms__now span { font-size: 11px; color: var(--t-lo); }
.ms__eq { display: flex; align-items: flex-end; gap: 3px; height: 22px; }
.ms__eq i { width: 3px; background: var(--c-cyan); border-radius: 2px; animation: msEq 0.9s ease-in-out infinite; }
.ms__eq i:nth-child(1) { height: 40%; animation-delay: 0s; }
.ms__eq i:nth-child(2) { height: 90%; animation-delay: 0.15s; }
.ms__eq i:nth-child(3) { height: 60%; animation-delay: 0.3s; }
.ms__eq i:nth-child(4) { height: 75%; animation-delay: 0.45s; }
@keyframes msEq { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(1); } }

.ms__license { margin-top: var(--s-6); color: var(--t-faint); }
</style>
