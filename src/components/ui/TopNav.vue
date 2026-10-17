<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NAV_ROUTES } from '@/router'
import { useSettings } from '@/stores/settings'
import { useProgress } from '@/stores/progress'
import { useUI } from '@/stores/ui'
import { NODES } from '@/data/techTree'
import { TRACK_MAP } from '@/data/tracks'

const route = useRoute()
const settings = useSettings()
const progress = useProgress()
const ui = useUI()

const pct = computed(() => Math.round(progress.progress * 100))
const nowTrack = computed(() => (settings.playingTrack ? TRACK_MAP[settings.playingTrack]?.label : null))
const isRoot = computed(() => route.name === 'opening')
</script>

<template>
  <nav class="topnav" :class="{ 'topnav--hidden': isRoot }">
    <router-link to="/" class="topnav__brand" @click="settings.sfx('whoosh')">
      <span class="topnav__logo">◈</span>
      <span class="col">
        <span class="topnav__title">人类科技文明演进</span>
        <span class="topnav__sub">TECH STORY · 爸爸进课堂</span>
      </span>
    </router-link>

    <div class="topnav__links">
      <router-link
        v-for="r in NAV_ROUTES" :key="r.path" :to="r.path"
        class="topnav__link" :class="{ 'is-active': route.path.startsWith(r.path) }"
        @mouseenter="settings.sfx('hover', 0.35)"
      >
        <span class="topnav__icon">{{ r.meta?.icon }}</span>
        <span>{{ r.meta?.title }}</span>
      </router-link>
    </div>

    <div class="topnav__right">
      <div class="topnav__prog" :title="`已研究 ${progress.researched.length} / ${NODES.length} 个科技节点`">
        <div class="bar topnav__bar"><div class="bar__fill" :style="{ width: pct + '%' }" /></div>
        <span class="topnav__pct mono">{{ pct }}%</span>
      </div>

      <button
        v-if="nowTrack" class="topnav__track" :title="nowTrack"
        @click="ui.toggleMediaLib(true)"
      >
        <span class="topnav__eq"><i /><i /><i /></span>
        <span class="topnav__trackname">{{ nowTrack }}</span>
      </button>

      <button
        class="btn btn--icon btn--sm" :class="{ 'is-active': !settings.muted }"
        :title="settings.muted ? '取消静音' : '静音'"
        @click="settings.toggleMute(); settings.sfx('tick')"
      >{{ settings.muted ? '🔇' : '🔊' }}</button>

      <button class="btn btn--icon btn--sm" title="设置 (S)" @click="ui.toggleSettings(true)">⚙</button>
      <button class="btn btn--icon btn--sm" title="操作说明 (H)" @click="ui.toggleHelp(true)">?</button>
    </div>
  </nav>
</template>

<style scoped>
.topnav {
  position: fixed; top: 0; left: 0; right: 0; z-index: var(--z-panel);
  height: 52px; padding: 0 var(--s-4);
  display: flex; align-items: center; gap: var(--s-4);
  background: linear-gradient(180deg, rgba(var(--veil), 0.96), rgba(var(--veil), 0.86));
  border-bottom: 1px solid var(--line);
  box-shadow: 0 6px 26px rgba(0, 0, 0, 0.45);
}
.topnav--hidden { opacity: 0; pointer-events: none; }
.topnav__brand { display: flex; align-items: center; gap: 10px; flex: none; }
.topnav__logo {
  font-size: 22px; color: var(--c-cyan);
  text-shadow: 0 0 16px var(--c-cyan-glow);
  animation: pulseGlow 3.4s ease-in-out infinite;
}
.topnav__title { font-family: var(--f-display); font-size: 14px; font-weight: 700; letter-spacing: 0.09em; color: var(--t-hi); white-space: nowrap; }
.topnav__sub { font-size: 11px; letter-spacing: 0.2em; color: var(--t-faint); text-transform: uppercase; }

.topnav__links { display: flex; align-items: center; gap: 3px; flex: 1 1 auto; justify-content: center; }
.topnav__link {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 13px; border-radius: var(--r-sm);
  font-size: 13px; font-weight: 600; color: var(--t-lo);
  border: 1px solid transparent;
  transition: all var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}
.topnav__link:hover { color: var(--t-hi); background: rgba(0, 212, 255, 0.09); border-color: var(--line); }
.topnav__link.is-active {
  color: #eafaff; border-color: var(--line-hot);
  background: linear-gradient(180deg, rgba(0, 170, 230, 0.34), rgba(0, 95, 160, 0.4));
  box-shadow: inset 0 0 12px rgba(0, 212, 255, 0.2), 0 0 12px rgba(0, 212, 255, 0.18);
}
.topnav__icon { font-size: 14px; }

.topnav__right { display: flex; align-items: center; gap: var(--s-2); flex: none; }
.topnav__prog { display: flex; align-items: center; gap: 7px; min-width: 108px; }
.topnav__bar { flex: 1 1 auto; }
.topnav__pct { font-size: 11.5px; color: var(--c-cyan); min-width: 30px; text-align: right; }
.topnav__track {
  display: flex; align-items: center; gap: 7px;
  padding: 4px 10px; border-radius: 20px;
  border: 1px solid rgba(255, 179, 71, 0.35);
  background: rgba(255, 179, 71, 0.09);
  max-width: 210px; overflow: hidden;
  transition: all var(--dur-fast) var(--ease-out);
}
.topnav__track:hover { border-color: rgba(255, 179, 71, 0.7); box-shadow: var(--glow-amber); }
.topnav__trackname {
  font-size: 11px; color: var(--c-amber);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.topnav__eq { display: flex; align-items: flex-end; gap: 2px; height: 12px; flex: none; }
.topnav__eq i {
  width: 2.5px; background: var(--c-amber); border-radius: 1px;
  animation: eq 900ms ease-in-out infinite;
}
.topnav__eq i:nth-child(1) { height: 40%; animation-delay: 0ms; }
.topnav__eq i:nth-child(2) { height: 100%; animation-delay: 180ms; }
.topnav__eq i:nth-child(3) { height: 65%; animation-delay: 360ms; }
@keyframes eq { 0%, 100% { transform: scaleY(0.45); } 50% { transform: scaleY(1); } }

@media (max-width: 1180px) {
  .topnav__track { display: none; }
  .topnav__prog { min-width: 78px; }
}
@media (max-width: 900px) {
  .topnav__sub { display: none; }
  .topnav__link span:last-child { display: none; }
}
</style>
