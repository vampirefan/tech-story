<script setup lang="ts">
import { computed } from 'vue'
import { useSettings } from '@/stores/settings'
import { useProgress } from '@/stores/progress'
import { useUI } from '@/stores/ui'
import { TRACKS } from '@/data/tracks'
import UiModal from './UiModal.vue'
import UiSlider from './UiSlider.vue'
import UiSwitch from './UiSwitch.vue'
import UiSegmented from './UiSegmented.vue'
import UiButton from './UiButton.vue'

const settings = useSettings()
const progress = useProgress()
const ui = useUI()

const open = computed({
  get: () => ui.showSettings,
  set: (v: boolean) => ui.toggleSettings(v)
})

const SPEEDS = [0.5, 1, 2, 4, 8].map(v => ({ value: v, label: `${v}×` }))
const QUALITY = [
  { value: 'low', label: '流畅' },
  { value: 'medium', label: '均衡' },
  { value: 'high', label: '精致' }
]

function pick(id: string) {
  settings.playTrack(id)
  ui.toast('已切换背景音乐', 'success', '🎵')
}
</script>

<template>
  <UiModal v-model:open="open" title="设置 / SETTINGS" width="min(94vw, 860px)">
    <div class="sets">
      <!-- 音频 -->
      <section class="sets__sec">
        <h4 class="sets__h"><span class="sets__dot" />音频</h4>
        <div class="sets__rows">
          <UiSlider
            :model-value="settings.musicVolume" label="背景音乐"
            @update:model-value="settings.setMusicVolume"
          />
          <UiSlider
            :model-value="settings.sfxVolume" label="交互音效" amber
            @update:model-value="settings.setSfxVolume"
          />
          <div class="row gap-3">
            <UiSwitch :model-value="!settings.muted" label="声音开启" @change="() => { if (settings.muted) settings.toggleMute() }" />
            <UiButton size="sm" variant="ghost" @click="settings.resumeAutoMusic(); ui.toast('已恢复跟随时代自动配乐', 'info', '🎼')">
              自动配乐
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="settings.stopMusic(); ui.toast('已停止背景音乐', 'info', '🔇')">
              停止音乐
            </UiButton>
          </div>
        </div>

        <p class="label-xs sets__sub">曲目库（全部为公有领域或 CC 授权录音）</p>
        <div class="tracks">
          <button
            v-for="t in TRACKS" :key="t.id"
            class="track" :class="{ 'is-on': settings.playingTrack === t.id }"
            :title="`${t.title} · ${t.performer} · ${t.license}`"
            @click="pick(t.id)"
            @mouseenter="settings.sfx('hover', 0.3)"
          >
            <span class="track__icon">{{ settings.playingTrack === t.id ? '❚❚' : '▶' }}</span>
            <span class="col grow">
              <span class="track__label">{{ t.label }}</span>
              <span class="track__meta">{{ t.performer }} · {{ t.license }}</span>
            </span>
            <span v-if="t.approx" class="track__dur mono">{{ Math.round(t.approx / 60) }}'</span>
          </button>
        </div>
      </section>

      <!-- 画面 -->
      <section class="sets__sec">
        <h4 class="sets__h"><span class="sets__dot" />画面</h4>
        <div class="sets__rows">
          <div class="row gap-3">
            <span class="sets__k">画质</span>
            <UiSegmented :model-value="settings.quality" :options="QUALITY" @update:model-value="v => settings.setQuality(v as never)" />
          </div>
          <UiSwitch :model-value="settings.bloom" label="泛光特效" hint="关掉可以明显提高低端机帧率" @change="settings.setBloom" />
          <UiSwitch :model-value="settings.showLabels" label="显示国家 / 地点标签" @change="settings.setShowLabels" />
          <div class="row gap-3">
            <span class="sets__k">国界密度</span>
            <UiSegmented
              :model-value="settings.borderDensity"
              :options="[{ value: 'era', label: '按时代（推荐）' }, { value: 'full', label: '全部国家' }]"
              @update:model-value="v => settings.setBorderDensity(v as never)"
            />
          </div>
        </div>
      </section>

      <!-- 玩法 -->
      <section class="sets__sec">
        <h4 class="sets__h"><span class="sets__dot" />课堂玩法</h4>
        <div class="sets__rows">
          <UiSwitch
            :model-value="settings.freeExplore" amber
            label="自由探索模式"
            hint="关闭后必须先研究前置科技才能解锁后续节点（像文明游戏那样一步步点）"
            @change="settings.setFreeExplore"
          />
          <UiSwitch :model-value="settings.autoplay" label="自动播放推荐路线" hint="开启后地球会自动沿推荐路径前进" @change="settings.setAutoplay" />
          <div class="row gap-3">
            <span class="sets__k">播放速度</span>
            <UiSegmented :model-value="settings.playSpeed" :options="SPEEDS" @update:model-value="v => settings.setPlaySpeed(Number(v))" />
          </div>
        </div>
      </section>

      <!-- 进度 -->
      <section class="sets__sec">
        <h4 class="sets__h"><span class="sets__dot" />进度</h4>
        <div class="sets__rows">
          <div class="row gap-3">
            <span class="stat"><span class="stat__k">已研究</span><span class="stat__v stat__v--cyan">{{ progress.researched.length }}</span></span>
            <span class="stat"><span class="stat__k">已浏览</span><span class="stat__v">{{ progress.visited.length }}</span></span>
            <span class="stat"><span class="stat__k">答题通过</span><span class="stat__v stat__v--amber">{{ progress.quizPassed.length }}</span></span>
            <span class="stat"><span class="stat__k">演示玩过</span><span class="stat__v">{{ progress.demosPlayed.length }}</span></span>
          </div>
          <div class="row gap-2">
            <UiButton size="sm" variant="ghost" @click="progress.researchThroughEra(ui.eraId); ui.toast('已点亮到当前时代的全部科技', 'unlock', '⚡')">
              点亮到当前时代
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="ui.showSettings = false; $router.push('/admin')">内容维护页</UiButton>
            <UiButton
              size="sm" variant="amber"
              @click="progress.reset(); ui.toast('进度已清空，从头开始', 'warn', '🧹')"
            >清空进度</UiButton>
          </div>
        </div>
      </section>
    </div>
  </UiModal>
</template>

<style scoped>
.sets { display: grid; gap: var(--s-5); }
.sets__sec { display: flex; flex-direction: column; gap: var(--s-3); }
.sets__h {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--f-display); font-size: 12px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--c-cyan);
}
.sets__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c-cyan); box-shadow: 0 0 8px var(--c-cyan); }
.sets__rows { display: grid; gap: 11px; padding-left: 14px; }
.sets__k { font-size: 12px; color: var(--t-lo); min-width: 62px; }
.sets__sub { margin-top: 2px; }

.tracks {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(255px, 1fr));
  gap: 7px; max-height: 220px; overflow-y: auto; padding-right: 4px;
}
.track {
  display: flex; align-items: center; gap: 9px;
  padding: 7px 11px; border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: rgba(8, 18, 42, 0.55);
  text-align: left;
  transition: all var(--dur-fast) var(--ease-out);
}
.track:hover { border-color: var(--line-strong); background: rgba(0, 212, 255, 0.08); transform: translateX(2px); }
.track.is-on { border-color: rgba(255, 179, 71, 0.6); background: rgba(255, 179, 71, 0.1); box-shadow: 0 0 14px rgba(255, 179, 71, 0.18); }
.track__icon { flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 9px; background: rgba(0, 212, 255, 0.14); color: var(--c-cyan); border: 1px solid var(--line); }
.track.is-on .track__icon { background: rgba(255, 179, 71, 0.18); color: var(--c-amber); border-color: rgba(255, 179, 71, 0.4); }
.track__label { font-size: 12.5px; color: var(--t-hi); line-height: 1.3; }
.track__meta { font-size: 10px; color: var(--t-faint); }
.track__dur { font-size: 10px; color: var(--t-lo); flex: none; }
</style>
