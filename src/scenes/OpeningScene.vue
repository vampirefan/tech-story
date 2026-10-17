<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NODES, DEMO_IDS } from '@/data/techTree'
import { ERAS, ERA_ORDER } from '@/data/eras'
import { REGIONS } from '@/data/regions'
import { TRACKS } from '@/data/tracks'
import { MEDIA_LIBRARY } from '@/data/media'
import { useUI } from '@/stores/ui'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import UiButton from '@/components/ui/UiButton.vue'

const router = useRouter()
const ui = useUI()
const progress = useProgress()
const settings = useSettings()

const stats = [
  { v: NODES.length, u: '个技术节点', k: '从打制石器到量子计算' },
  { v: DEMO_IDS.length, u: '个互动原理演示', k: '每一个都能动手玩' },
  { v: ERAS.length, u: '个时代', k: `${REGIONS.length} 大文明区域横向对比` },
  { v: TRACKS.length, u: '首时代配乐', k: '另有程序合成氛围音' }
]

const TICKER = ['火', '轮子', '文字', '造纸', '印刷', '火药', '指南针', '蒸汽机', '电', '飞机', '计算机', '芯片', '互联网', '载人航天', '人工智能']

/** 开场环上的时代标记 */
const ringEras = computed(() => ERA_ORDER.map((id, i) => {
  const a = (i / ERA_ORDER.length) * Math.PI * 2 - Math.PI / 2
  return { id, name: ERAS.find(e => e.id === id)!.short, color: ERAS.find(e => e.id === id)!.color, x: 200 + Math.cos(a) * 168, y: 200 + Math.sin(a) * 168 }
}))

const visited = computed(() => progress.visitedSet.size)
const mediaCount = computed(() => Object.keys(MEDIA_LIBRARY).length)

function startGuided() {
  ui.gotoPath(0)
  ui.play()
  void router.push('/timeline')
}
function go(p: string) { void router.push(p) }
function goEra(id: string) {
  ui.setEra(id as typeof ERA_ORDER[number])
  void router.push('/timeline')
}

onMounted(() => { settings.sfx('whoosh', 0.35) })
</script>

<template>
  <section class="scene-root op">
    <!-- 星空 + 地平线 -->
    <div class="op__stars op__stars--a" />
    <div class="op__stars op__stars--b" />
    <div class="op__limb" />

    <!-- 背景轨道环 -->
    <svg class="op__ring" viewBox="0 0 400 400" aria-hidden="true">
      <circle cx="200" cy="200" r="168" fill="none" stroke="rgba(0,212,255,0.14)" stroke-width="1" stroke-dasharray="2 6" />
      <circle cx="200" cy="200" r="120" fill="none" stroke="rgba(255,179,71,0.10)" stroke-width="1" />
      <g class="op__ring-spin">
        <g v-for="e in ringEras" :key="e.id">
          <circle :cx="e.x" :cy="e.y" r="3.4" :fill="e.color" opacity="0.9" />
          <circle :cx="e.x" :cy="e.y" r="7" :fill="e.color" opacity="0.16" />
        </g>
      </g>
    </svg>

    <div class="op__core stagger">
      <div class="op__kicker mono">爸爸进课堂 · 四年级科学 · 互动科技史</div>
      <h1 class="op__title">人类科技文明演进</h1>
      <div class="op__en mono">TECH STORY · FROM FIRE TO INTELLIGENCE</div>
      <p class="op__tag">地理造就历史，选择决定未来。<br>用一节课的时间，走完两百五十万年。</p>

      <div class="op__stats">
        <div v-for="s in stats" :key="s.u" class="op__stat">
          <b class="mono">{{ s.v }}</b><span>{{ s.u }}</span>
          <i>{{ s.k }}</i>
        </div>
      </div>

      <div class="op__cta">
        <UiButton variant="primary" size="lg" sfx="confirm" @click="startGuided">▶ 开始引导之旅（自动播放）</UiButton>
        <UiButton variant="amber" size="lg" sfx="click" @click="go('/globe')">🌍 自由探索地球</UiButton>
        <UiButton size="lg" sfx="click" @click="go('/china')">🏮 中国专题</UiButton>
        <UiButton variant="ghost" size="lg" sfx="click" @click="go('/media')">📚 拓展资源 {{ mediaCount }}</UiButton>
      </div>

      <div v-if="visited > 0" class="op__resume mono">
        已看过 {{ visited }} 个节点 ·
        <button @click="go('/tree')">打开科技树继续</button>
      </div>

      <div class="op__keys mono">
        <span class="kbd">空格</span> 播放/暂停
        <span class="kbd">←</span><span class="kbd">→</span> 切换节点
        <span class="kbd">F</span> 自由探索开关
        <span class="kbd">M</span> 静音
      </div>
    </div>

    <!-- 时代直达 -->
    <div class="op__eras">
      <span class="label-xs">直达时代</span>
      <button v-for="e in ERAS" :key="e.id" class="op__era mono" :style="{ '--ec': e.color, '--ea': e.accent }" @click="goEra(e.id)">
        {{ e.short }}
      </button>
    </div>

    <!-- 里程碑跑马灯 -->
    <div class="op__ticker" aria-hidden="true">
      <div class="op__ticker-track">
        <span v-for="(t, i) in [...TICKER, ...TICKER]" :key="i">{{ t }}<i>◆</i></span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.op { overflow: hidden; background: radial-gradient(ellipse 90% 60% at 50% 118%, rgba(0, 90, 160, 0.4), transparent 60%), radial-gradient(ellipse 60% 40% at 78% -10%, rgba(167, 139, 250, 0.12), transparent 60%), var(--c-void); }

.op__stars { position: absolute; inset: -10%; background-repeat: repeat; }
.op__stars--a {
  background-image:
    radial-gradient(1.2px 1.2px at 22px 34px, rgba(234, 244, 255, 0.9) 50%, transparent 51%),
    radial-gradient(1px 1px at 120px 90px, rgba(160, 210, 255, 0.7) 50%, transparent 51%),
    radial-gradient(1.6px 1.6px at 200px 40px, rgba(255, 214, 160, 0.8) 50%, transparent 51%),
    radial-gradient(1px 1px at 300px 150px, rgba(234, 244, 255, 0.55) 50%, transparent 51%),
    radial-gradient(1.2px 1.2px at 380px 80px, rgba(140, 220, 255, 0.7) 50%, transparent 51%);
  background-size: 420px 220px;
  animation: opDrift 140s linear infinite;
}
.op__stars--b {
  background-image:
    radial-gradient(1px 1px at 60px 120px, rgba(234, 244, 255, 0.5) 50%, transparent 51%),
    radial-gradient(1.4px 1.4px at 160px 30px, rgba(180, 220, 255, 0.6) 50%, transparent 51%),
    radial-gradient(1px 1px at 260px 180px, rgba(255, 255, 255, 0.4) 50%, transparent 51%),
    radial-gradient(1px 1px at 340px 60px, rgba(160, 210, 255, 0.5) 50%, transparent 51%);
  background-size: 400px 240px;
  animation: opDrift 220s linear infinite reverse, opTwinkle 5.5s ease-in-out infinite;
}
@keyframes opDrift { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-420px, 120px, 0); } }
@keyframes opTwinkle { 0%, 100% { opacity: 0.85; } 50% { opacity: 0.45; } }

.op__limb {
  position: absolute; left: 50%; bottom: -46vh; width: 150vw; height: 78vh; transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 0%, rgba(20, 90, 150, 0.55), rgba(var(--veil), 0.9) 42%, #040a18 70%);
  box-shadow: 0 -14px 60px rgba(0, 212, 255, 0.28), 0 -2px 0 rgba(120, 230, 255, 0.55), inset 0 6px 30px rgba(140, 240, 255, 0.35);
}

.op__ring { position: absolute; left: 50%; top: 46%; width: min(78vh, 760px); transform: translate(-50%, -50%); opacity: 0.75; }
.op__ring-spin { transform-origin: 200px 200px; animation: opSpin 160s linear infinite; }
@keyframes opSpin { to { transform: rotate(360deg); } }

.op__core {
  position: relative; z-index: 2; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-4);
  padding: var(--s-6) var(--s-5) 118px; text-align: center;
}
.op__kicker { font-size: 12px; letter-spacing: 0.42em; color: var(--c-amber); text-shadow: 0 0 18px var(--c-amber-glow); }
.op__title {
  font-size: clamp(44px, 8.2vw, 108px); font-weight: 900; letter-spacing: 0.06em; line-height: 1.06;
  background: linear-gradient(180deg, #ffffff 8%, #bfe9ff 46%, #4fb8e8 78%, #1a6fa8 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 26px rgba(0, 212, 255, 0.35));
}
.op__en { font-size: 12px; letter-spacing: 0.5em; color: var(--t-lo); }
.op__tag { font-size: 15.5px; line-height: 2; color: var(--t-mid); }

/* 亮色主题：星空开场换成"纸面天空"，避免白字白星消失 */
[data-theme='light'] .op {
  background:
    radial-gradient(ellipse 90% 60% at 50% 118%, rgba(2, 126, 164, 0.14), transparent 60%),
    radial-gradient(ellipse 60% 40% at 78% -10%, rgba(109, 79, 196, 0.08), transparent 60%),
    var(--c-void);
}
[data-theme='light'] .op__stars { opacity: 0; }
[data-theme='light'] .op__limb {
  background: radial-gradient(ellipse at 50% 0%, rgba(2, 126, 164, 0.22), rgba(255, 255, 255, 0.85) 42%, #dbe6f2 70%);
  box-shadow: 0 -14px 50px rgba(2, 126, 164, 0.16), 0 -2px 0 rgba(2, 126, 164, 0.3), inset 0 6px 30px rgba(255, 255, 255, 0.6);
}
[data-theme='light'] .op__title {
  background-image: linear-gradient(180deg, #0d3a5f 8%, #027ea4 46%, #0e7490 78%, #12365c 100%);
  filter: none;
}

.op__stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: var(--s-2); }
.op__stat {
  display: flex; flex-direction: column; gap: 2px; min-width: 148px;
  padding: 10px 16px; border: 1px solid var(--line); border-radius: var(--r-md);
  background: linear-gradient(180deg, rgba(var(--veil), 0.86), rgba(var(--veil), 0.78));
}
.op__stat b { font-size: 26px; color: var(--c-cyan); text-shadow: 0 0 16px var(--c-cyan-glow); }
.op__stat span { font-size: 12px; color: var(--t-hi); letter-spacing: 0.08em; }
.op__stat i { font-style: normal; font-size: 11.5px; color: var(--t-lo); }

.op__cta { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: var(--s-2); }
.op__resume { font-size: 12px; color: var(--t-lo); }
.op__resume button { color: var(--c-amber); border-bottom: 1px dashed var(--c-amber-dim); }
.op__keys { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--t-faint); }

.op__eras {
  position: absolute; z-index: 3; left: 0; right: 0; bottom: 44px;
  display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px;
  padding: 0 var(--s-5);
}
.op__eras .label-xs { margin-right: 6px; }
.op__era {
  padding: 5px 11px; font-size: 11.5px; letter-spacing: 0.1em; color: var(--t-mid);
  border: 1px solid var(--line); border-radius: 999px; background: rgba(var(--veil), 0.6);
  transition: all var(--dur-fast) var(--ease-out);
}
.op__era:hover { color: var(--ea); border-color: var(--ec); box-shadow: 0 0 14px color-mix(in srgb, var(--ec) 45%, transparent); transform: translateY(-2px); }

.op__ticker {
  position: absolute; z-index: 3; left: 0; right: 0; bottom: 0; height: 34px; overflow: hidden;
  border-top: 1px solid var(--line); background: rgba(var(--veil), 0.88);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}
.op__ticker-track { display: flex; gap: 0; width: max-content; animation: opTick 46s linear infinite; }
.op__ticker-track span { display: flex; align-items: center; gap: 18px; padding: 0 9px; font-size: 12px; letter-spacing: 0.28em; color: var(--t-lo); line-height: 34px; white-space: nowrap; }
.op__ticker-track i { font-style: normal; font-size: 10px; color: var(--c-amber-dim); }
@keyframes opTick { to { transform: translateX(-50%); } }

@media (max-width: 860px) {
  .op__core { padding-bottom: 150px; gap: var(--s-3); }
  .op__stats { gap: 7px; }
  .op__stat { min-width: 128px; padding: 8px 12px; }
  .op__keys { display: none; }
}
</style>
