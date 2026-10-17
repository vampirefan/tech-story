<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NODES, NODE_MAP, EDGES, WAR_EDGES, DEMO_IDS, validateGraph } from '@/data/techTree'
import { MEDIA_LIBRARY } from '@/data/media'
import { ERAS, ERA_MAP } from '@/data/eras'
import { REGIONS } from '@/data/regions'
import { TRACKS } from '@/data/tracks'
import { validateChina } from '@/data/china'
import { useContent, type NodePatch, type MediaPatch, type EraPatch } from '@/stores/content'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { useUI } from '@/stores/ui'
import UiButton from '@/components/ui/UiButton.vue'
import type { MediaItem, MediaKind } from '@/types'

const content = useContent()
const progress = useProgress()
const settings = useSettings()
const ui = useUI()

const tab = ref<'node' | 'media' | 'era'>('node')

/* ── 概览 ── */
const graph = validateGraph()
const chinaProblems = validateChina()
const overview = [
  { k: '技术节点', v: NODES.length }, { k: '演进边', v: EDGES.length }, { k: '战争因果边', v: WAR_EDGES.length },
  { k: '互动演示', v: DEMO_IDS.length }, { k: '资源卡片', v: Object.keys(MEDIA_LIBRARY).length },
  { k: '音乐曲目', v: TRACKS.length }, { k: '文明区域', v: REGIONS.length }, { k: '时代', v: ERAS.length }
]

/* ── 节点编辑 ── */
const nodeQuery = ref('')
const nodeId = ref(NODES[0].id)
const nodeHits = computed(() => {
  const q = nodeQuery.value.trim().toLowerCase()
  if (!q) return NODES.slice(0, 8)
  return NODES.filter(n => `${n.id} ${n.name} ${n.nameEn}`.toLowerCase().includes(q)).slice(0, 8)
})
const node = computed(() => NODE_MAP[nodeId.value])
const nf = ref<{ name: string; nameEn: string; yearLabel: string; summary: string; story: string; principle: string; impactNote: string; chinaNote: string; flag: string; art: string; impact: number }>({ name: '', nameEn: '', yearLabel: '', summary: '', story: '', principle: '', impactNote: '', chinaNote: '', flag: '', art: '', impact: 3 })
const factsText = ref('')
const mediaText = ref('')
function loadNodeForm(id: string) {
  const n = NODE_MAP[id]
  nf.value = {
    name: n.name, nameEn: n.nameEn, yearLabel: n.yearLabel, summary: n.summary, story: n.story,
    principle: n.principle ?? '', impactNote: n.impactNote, chinaNote: n.chinaNote ?? '', flag: n.flag ?? '', art: n.art ?? '', impact: n.impact
  }
  factsText.value = n.funFacts.join('\n')
  mediaText.value = n.mediaIds.join(' ')
}
watch(nodeId, loadNodeForm, { immediate: true })
const nodeDirty = computed(() => {
  const n = node.value
  return nf.value.name !== n.name || nf.value.nameEn !== n.nameEn || nf.value.yearLabel !== n.yearLabel ||
    nf.value.summary !== n.summary || nf.value.story !== n.story || (nf.value.principle || '') !== (n.principle ?? '') ||
    nf.value.impactNote !== n.impactNote || nf.value.chinaNote !== (n.chinaNote ?? '') || nf.value.flag !== (n.flag ?? '') ||
    nf.value.art !== (n.art ?? '') ||
    nf.value.impact !== n.impact || factsText.value !== n.funFacts.join('\n') || mediaText.value !== n.mediaIds.join(' ')
})
function saveNode() {
  const patch: NodePatch = {
    name: nf.value.name.trim() || node.value.name,
    nameEn: nf.value.nameEn.trim() || node.value.nameEn,
    yearLabel: nf.value.yearLabel.trim() || node.value.yearLabel,
    summary: nf.value.summary.trim(),
    story: nf.value.story,
    principle: nf.value.principle,
    impactNote: nf.value.impactNote,
    chinaNote: nf.value.chinaNote,
    flag: nf.value.flag,
    art: nf.value.art.trim(),
    impact: Math.max(1, Math.min(5, Number(nf.value.impact) || node.value.impact)),
    funFacts: factsText.value.split('\n').map(s => s.trim()).filter(Boolean),
    mediaIds: mediaText.value.split(/[\s,，]+/).filter(id => MEDIA_LIBRARY[id])
  }
  content.patchNode(nodeId.value, patch)
  loadNodeForm(nodeId.value)
  ui.toast(`已保存「${patch.name}」的修改`, 'success', '💾')
}
function resetNode() {
  content.resetNode(nodeId.value)
  loadNodeForm(nodeId.value)
  ui.toast('该节点已恢复原始内容', 'info', '↺')
}

/* ── 媒体编辑 ── */
const mediaIds = computed(() => Object.keys(MEDIA_LIBRARY))
const mediaId = ref(mediaIds.value[0])
const media = computed(() => MEDIA_LIBRARY[mediaId.value])
const mf = ref<{ title: string; author: string; intro: string; reason: string; glyph: string; cover: string }>({ title: '', author: '', intro: '', reason: '', glyph: '', cover: '' })
const palA = ref('')
const palB = ref('')
function loadMediaForm(id: string) {
  const m = MEDIA_LIBRARY[id]
  mf.value = { title: m.title, author: m.author ?? '', intro: m.intro, reason: m.reason, glyph: m.glyph ?? '', cover: m.cover ?? '' }
  palA.value = m.palette?.[0] ?? ''
  palB.value = m.palette?.[1] ?? ''
}
watch(mediaId, loadMediaForm, { immediate: true })
function saveMedia() {
  const patch: MediaPatch = {
    title: mf.value.title.trim() || media.value.title,
    author: mf.value.author,
    intro: mf.value.intro,
    reason: mf.value.reason,
    glyph: mf.value.glyph,
    cover: mf.value.cover
  }
  if (palA.value.trim() && palB.value.trim()) patch.palette = [palA.value.trim(), palB.value.trim()]
  content.patchMedia(mediaId.value, patch)
  loadMediaForm(mediaId.value)
  ui.toast(`已保存资源「${patch.title}」`, 'success', '💾')
}
const newId = ref('')
const newTitle = ref('')
const newKind = ref<MediaKind>('book')
function addMedia() {
  const id = newId.value.trim()
  const title = newTitle.value.trim()
  if (!id || !title) { ui.toast('需要 id 和标题', 'warn', '⚠'); return }
  if (MEDIA_LIBRARY[id]) { ui.toast(`id 已存在：${id}`, 'warn', '⚠'); return }
  const item: MediaItem = { kind: newKind.value, title, intro: '', reason: '' }
  content.addMedia(id, item)
  mediaId.value = id
  newId.value = ''; newTitle.value = ''
  ui.toast(`已新增资源 ${id}`, 'success', '➕')
}
function removeMedia() {
  if (!content.mediaNew[mediaId.value]) { ui.toast('内置资源不能删除，只能修改', 'warn', '⚠'); return }
  const id = mediaId.value
  content.removeMedia(id)
  mediaId.value = Object.keys(MEDIA_LIBRARY)[0]
  ui.toast(`已删除 ${id}`, 'info', '🗑')
}

/* ── 时代编辑 ── */
const eraId = ref(ERAS[0].id)
const era = computed(() => ERA_MAP[eraId.value])
const ef = ref<EraPatch>({})
watch(eraId, (id) => {
  const e = ERA_MAP[id]
  ef.value = { tagline: e.tagline, desc: e.desc, color: e.color, accent: e.accent }
}, { immediate: true })
function saveEra() {
  content.patchEra(eraId.value, {
    tagline: String(ef.value.tagline ?? '').trim() || era.value.tagline,
    desc: String(ef.value.desc ?? ''),
    color: String(ef.value.color ?? '').trim() || era.value.color,
    accent: String(ef.value.accent ?? '').trim() || era.value.accent
  })
  ui.toast(`已保存时代「${era.value.name}」`, 'success', '💾')
}

/* ── 导入导出 ── */
const ioText = ref('')
function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); ui.toast('已复制到剪贴板', 'success', '📋') }
  catch { ui.toast('复制失败，请手动选择文本', 'warn', '⚠') }
}
function exportContent() {
  const json = content.exportJson()
  ioText.value = json
  download('tech-story-content.json', json)
  ui.toast('内容覆盖已导出', 'success', '📤')
}
function importContent() {
  const r = content.importJson(ioText.value)
  ui.toast(r.message, r.ok ? 'success' : 'warn', r.ok ? '📥' : '⚠')
}
function onFile(ev: Event) {
  const f = (ev.target as HTMLInputElement).files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => { ioText.value = String(reader.result ?? '') }
  reader.readAsText(f)
}
function exportProgress() {
  download('tech-story-progress.json', progress.exportState())
  ui.toast('学习进度已导出', 'success', '📤')
}
function importProgress() {
  const r = progress.importState(ioText.value)
  ui.toast(r.message, r.ok ? 'success' : 'warn', r.ok ? '📥' : '⚠')
}
const confirmReset = ref(false)
function resetProgress() {
  if (!confirmReset.value) { confirmReset.value = true; window.setTimeout(() => { confirmReset.value = false }, 4000); return }
  progress.reset()
  confirmReset.value = false
  ui.toast('学习进度已清空', 'info', '🗑')
}
const confirmContent = ref(false)
function resetContent() {
  if (!confirmContent.value) { confirmContent.value = true; window.setTimeout(() => { confirmContent.value = false }, 4000); return }
  content.resetAll()
  confirmContent.value = false
  ioText.value = ''
  ui.toast('所有内容修改已恢复原始值', 'info', '↺')
}

const overrideCount = computed(() => Object.keys(content.nodes).length + Object.keys(content.media).length + Object.keys(content.mediaNew).length + Object.keys(content.eras).length)
</script>

<template>
  <section class="scene-root ad">
    <div class="doc-scene">
      <div class="doc-wrap">

        <header class="scene-head anim-fade-up">
          <div class="scene-head__eyebrow">MAINTENANCE</div>
          <h2 class="scene-head__title">内容维护</h2>
          <p class="scene-head__sub">
            老师和管理员可以在这里修改节点文案、推荐资源和时代描述，改动保存在本机并可导出 JSON 分发给其他机器。
            课堂现场不需要打开这一页。
          </p>
        </header>

        <!-- 概览 -->
        <section class="sec">
          <div class="sec__h"><h3>数据概览</h3><span class="label-xs mono">当前覆盖 {{ overrideCount }} 条</span></div>
          <div class="grid grid--auto">
            <div v-for="o in overview" :key="o.k" class="stat card">
              <span class="label-xs">{{ o.k }}</span>
              <b class="mono">{{ o.v }}</b>
            </div>
          </div>
          <div class="card ad__check" :class="graph.errors.length || chinaProblems.length ? 'ad__check--bad' : 'ad__check--ok'">
            <b>{{ graph.errors.length || chinaProblems.length ? '⚠ 数据自检发现问题' : '✓ 数据自检通过' }}</b>
            <span class="mono">{{ graph.errors.length }} 错误 · {{ graph.warnings.length }} 警告 · 中国专题 {{ chinaProblems.length }} 问题</span>
            <ul v-if="graph.errors.length || graph.warnings.length || chinaProblems.length">
              <li v-for="(e, i) in [...graph.errors, ...graph.warnings, ...chinaProblems]" :key="i">{{ e }}</li>
            </ul>
          </div>
        </section>

        <!-- 进度 -->
        <section class="sec">
          <div class="sec__h"><h3>学习进度</h3><span class="label-xs">研究 / 访问 / 测验 / 演示</span></div>
          <div class="grid grid--auto">
            <div class="stat card"><span class="label-xs">已研究</span><b class="mono">{{ progress.researchedSet.size }} / {{ NODES.length }}</b></div>
            <div class="stat card"><span class="label-xs">已看过</span><b class="mono">{{ progress.visitedSet.size }}</b></div>
            <div class="stat card"><span class="label-xs">测验通过</span><b class="mono">{{ progress.quizPassed.length }}</b></div>
            <div class="stat card"><span class="label-xs">演示玩过</span><b class="mono">{{ progress.demosPlayed.length }} / {{ DEMO_IDS.length }}</b></div>
          </div>
          <div class="chips">
            <UiButton size="sm" sfx="click" @click="exportProgress">📤 导出进度</UiButton>
            <UiButton size="sm" sfx="click" @click="importProgress">📥 从文本框导入进度</UiButton>
            <UiButton size="sm" variant="ghost" :class="{ 'ad--danger': confirmReset }" sfx="cancel" @click="resetProgress">
              {{ confirmReset ? '再点一次确认清空！' : '🗑 清空进度' }}
            </UiButton>
            <label class="ad__switch">
              <input type="checkbox" :checked="settings.freeExplore" @change="settings.setFreeExplore(($event.target as HTMLInputElement).checked)">
              <span>自由探索模式（全部解锁）</span>
            </label>
          </div>
        </section>

        <!-- 编辑器 -->
        <section class="sec">
          <div class="sec__h"><h3>内容编辑器</h3><span class="label-xs">改动即时生效并持久化</span></div>
          <div class="chips">
            <button class="pill" :class="{ 'pill--cyan': tab === 'node' }" @click="tab = 'node'; settings.sfx('click')">🧩 科技节点</button>
            <button class="pill" :class="{ 'pill--cyan': tab === 'media' }" @click="tab = 'media'; settings.sfx('click')">📚 推荐资源</button>
            <button class="pill" :class="{ 'pill--cyan': tab === 'era' }" @click="tab = 'era'; settings.sfx('click')">⏳ 时代</button>
          </div>

          <!-- 节点 -->
          <div v-if="tab === 'node'" class="card ad__editor">
            <div class="ad__row">
              <input v-model="nodeQuery" class="ad__input" placeholder="搜索节点 id / 名称…" @input="settings.sfx('tick', 0.15)">
              <div class="chips ad__hits">
                <button v-for="h in nodeHits" :key="h.id" class="pill" :class="{ 'pill--amber': nodeId === h.id }" @click="nodeId = h.id">
                  {{ h.name }}
                </button>
              </div>
            </div>
            <div v-if="node" class="ad__form">
              <div class="ad__grid">
                <label>名称<input v-model="nf.name" class="ad__input"></label>
                <label>英文名<input v-model="nf.nameEn" class="ad__input"></label>
                <label>年份标签<input v-model="nf.yearLabel" class="ad__input"></label>
                <label>国旗 / 标记<input v-model="nf.flag" class="ad__input"></label>
                <label>故事配图（illustrations 文件名）<input v-model="nf.art" class="ad__input" placeholder="如 fire.png，留空则不显示"></label>
                <label>影响 1-5<input v-model.number="nf.impact" type="number" min="1" max="5" class="ad__input"></label>
                <label>影响说明<input v-model="nf.impactNote" class="ad__input"></label>
              </div>
              <label>一句话摘要<textarea v-model="nf.summary" rows="2" class="ad__input" /></label>
              <label>历史现场（故事）<textarea v-model="nf.story" rows="5" class="ad__input" /></label>
              <label>原理讲解<textarea v-model="nf.principle" rows="4" class="ad__input" /></label>
              <label>中国关联说明<textarea v-model="nf.chinaNote" rows="2" class="ad__input" /></label>
              <label>冷知识（每行一条）<textarea v-model="factsText" rows="3" class="ad__input" /></label>
              <label>推荐资源 id（空格分隔）<textarea v-model="mediaText" rows="2" class="ad__input" /></label>
              <div class="chips">
                <UiButton variant="primary" size="sm" :disabled="!nodeDirty" sfx="confirm" @click="saveNode">💾 保存修改</UiButton>
                <UiButton size="sm" variant="ghost" sfx="cancel" @click="resetNode">↺ 恢复原始</UiButton>
                <span v-if="content.nodes[nodeId]" class="label-xs ad__flag">已有覆盖</span>
              </div>
            </div>
          </div>

          <!-- 媒体 -->
          <div v-else-if="tab === 'media'" class="card ad__editor">
            <div class="ad__row">
              <select v-model="mediaId" class="ad__input ad__select" @change="settings.sfx('tick', 0.3)">
                <option v-for="id in mediaIds" :key="id" :value="id">{{ id }} · {{ MEDIA_LIBRARY[id].title }}</option>
              </select>
              <span v-if="content.mediaNew[mediaId]" class="pill pill--amber">自定义</span>
            </div>
            <div v-if="media" class="ad__form">
              <div class="ad__grid">
                <label>标题<input v-model="mf.title" class="ad__input"></label>
                <label>作者 / 年份<input v-model="mf.author" class="ad__input"></label>
                <label>类型<span class="pill ad__kind">{{ { book: '书籍', movie: '影视', game: '游戏', music: '音乐' }[media.kind] }}</span></label>
                <label>封面符号<input v-model="mf.glyph" class="ad__input"></label>
                <label>封面图 URL（留空=程序生成）<input v-model="mf.cover" class="ad__input"></label>
                <label>主色 1<input v-model="palA" class="ad__input" placeholder="#1d4e6b"></label>
                <label>主色 2<input v-model="palB" class="ad__input" placeholder="#0a1c2b"></label>
              </div>
              <label>介绍<textarea v-model="mf.intro" rows="3" class="ad__input" /></label>
              <label>推荐理由<textarea v-model="mf.reason" rows="2" class="ad__input" /></label>
              <div class="chips">
                <UiButton variant="primary" size="sm" sfx="confirm" @click="saveMedia">💾 保存修改</UiButton>
                <UiButton size="sm" variant="ghost" sfx="cancel" @click="removeMedia">🗑 删除（仅自定义）</UiButton>
              </div>
            </div>
            <div class="ad__add">
              <span class="label-xs">新增资源</span>
              <input v-model="newId" class="ad__input" placeholder="id（如 b_mybook）">
              <input v-model="newTitle" class="ad__input" placeholder="标题">
              <select v-model="newKind" class="ad__input ad__select">
                <option value="book">书籍</option><option value="movie">影视</option><option value="game">游戏</option><option value="music">音乐</option>
              </select>
              <UiButton size="sm" sfx="confirm" @click="addMedia">➕ 添加</UiButton>
            </div>
          </div>

          <!-- 时代 -->
          <div v-else class="card ad__editor">
            <div class="ad__row">
              <select v-model="eraId" class="ad__input ad__select" @change="settings.sfx('tick', 0.3)">
                <option v-for="e in ERAS" :key="e.id" :value="e.id">{{ e.name }}</option>
              </select>
              <span v-if="content.eras[eraId]" class="pill pill--amber">已有覆盖</span>
            </div>
            <div class="ad__form">
              <div class="ad__grid">
                <label>主题色<input v-model="ef.color" class="ad__input"></label>
                <label>强调色<input v-model="ef.accent" class="ad__input"></label>
              </div>
              <label>一句话标语<input v-model="ef.tagline" class="ad__input"></label>
              <label>时代描述<textarea v-model="ef.desc" rows="4" class="ad__input" /></label>
              <div class="chips">
                <UiButton variant="primary" size="sm" sfx="confirm" @click="saveEra">💾 保存修改</UiButton>
                <UiButton size="sm" variant="ghost" sfx="cancel" @click="content.resetEra(eraId)">↺ 恢复原始</UiButton>
              </div>
            </div>
          </div>
        </section>

        <!-- 导入导出 -->
        <section class="sec">
          <div class="sec__h"><h3>内容覆盖 · 导入 / 导出</h3><span class="label-xs">JSON 可在机器间分发</span></div>
          <textarea v-model="ioText" rows="8" class="ad__input ad__io" placeholder="粘贴覆盖 JSON，或点导出查看当前内容…" />
          <div class="chips">
            <UiButton size="sm" sfx="click" @click="exportContent">📤 导出内容覆盖</UiButton>
            <UiButton size="sm" sfx="click" @click="copy(ioText)">📋 复制文本框</UiButton>
            <label class="ad__file btn btn--sm">📂 选择 JSON 文件<input type="file" accept=".json,application/json" hidden @change="onFile"></label>
            <UiButton size="sm" variant="primary" sfx="confirm" @click="importContent">📥 导入内容覆盖</UiButton>
            <UiButton size="sm" variant="ghost" :class="{ 'ad--danger': confirmContent }" sfx="cancel" @click="resetContent">
              {{ confirmContent ? '再点一次确认恢复！' : '↺ 恢复全部原始内容' }}
            </UiButton>
          </div>
          <p class="label-xs ad__note">进度与内容覆盖是两份独立数据：进度记录"学到哪了"，覆盖记录"改过哪些文案"。</p>
        </section>

      </div>
    </div>
  </section>
</template>

<style scoped>
.ad { background: radial-gradient(ellipse 70% 40% at 20% -10%, rgba(0, 212, 255, 0.1), transparent 60%), var(--c-deep); }
.ad .doc-scene { position: absolute; inset: 0; }

.ad__check { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; }
.ad__check b { font-size: 14px; }
.ad__check span { font-size: 11.5px; color: var(--t-lo); }
.ad__check ul { margin: 6px 0 0; padding-left: 18px; font-size: 12px; color: var(--t-mid); display: flex; flex-direction: column; gap: 3px; }
.ad__check--ok { border-color: rgba(52, 211, 153, 0.4); }
.ad__check--ok b { color: var(--c-emerald); }
.ad__check--bad { border-color: rgba(251, 113, 133, 0.45); }
.ad__check--bad b { color: var(--c-rose); }

.ad__editor { padding: var(--s-4); display: flex; flex-direction: column; gap: var(--s-4); }
.ad__row { display: flex; align-items: center; gap: var(--s-3); flex-wrap: wrap; }
.ad__hits { max-width: 100%; }
.ad__form { display: flex; flex-direction: column; gap: 10px; }
.ad__form > label, .ad__grid > label { display: flex; flex-direction: column; gap: 5px; font-size: 11.5px; color: var(--t-lo); letter-spacing: 0.06em; }
.ad__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.ad__input {
  width: 100%; padding: 8px 11px; font-size: 13px; color: var(--t-hi); font-family: inherit;
  background: rgba(var(--veil), 0.65); border: 1px solid var(--line); border-radius: var(--r-sm); outline: none;
  transition: border-color var(--dur-fast);
}
.ad__input:focus { border-color: var(--line-hot); }
textarea.ad__input { resize: vertical; line-height: 1.7; }
.ad__select { appearance: auto; }
.ad__kind { align-self: flex-start; }
.ad__io { font-family: var(--f-mono, ui-monospace, monospace); font-size: 11.5px; }
.ad__add { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding-top: var(--s-3); border-top: 1px dashed var(--line); }
.ad__add .ad__input { width: auto; flex: 1 1 160px; }
.ad__flag { color: var(--c-amber); }
.ad__note { color: var(--t-faint); }
.ad--danger { color: var(--c-rose) !important; border-color: rgba(251, 113, 133, 0.6) !important; }
.ad__file { cursor: pointer; }
.ad__switch { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--t-mid); cursor: pointer; }
.ad__switch input { accent-color: var(--c-cyan); width: 15px; height: 15px; }
</style>
