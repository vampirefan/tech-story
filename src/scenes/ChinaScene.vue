<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CHINA_ACTS, CHINA_NUMBERS, CHINA_VS_WORLD, TRANSMISSIONS, CHINA_GAPS, CHINA_CONCLUSION, CHINA_NODES_BY_ERA
} from '@/data/china'
import { ERA_MAP, ERA_ORDER } from '@/data/eras'
import { NODE_MAP } from '@/data/techTree'
import { useSettings } from '@/stores/settings'
import NodeChip from '@/components/ui/NodeChip.vue'
import UiButton from '@/components/ui/UiButton.vue'
import type { EraId } from '@/types'

const router = useRouter()
const settings = useSettings()

/* ── 地位曲线 ── */
const selEra = ref<EraId | null>('medieval')
const selRow = computed(() => CHINA_VS_WORLD.find(r => r.era === selEra.value) ?? null)
const CW = 980
const SLOT = CW / CHINA_VS_WORLD.length
function barY(v: number) { return 190 - v * 150 }

/* ── 西传路线 ── */
const txIdx = ref(0)
const tx = computed(() => TRANSMISSIONS[txIdx.value])

/* ── 节点速览 ── */
const eraTab = ref<EraId>('medieval')
const tabNodes = computed(() => CHINA_NODES_BY_ERA[eraTab.value] ?? [])
const eraWithNodes = computed(() => ERA_ORDER.filter(e => (CHINA_NODES_BY_ERA[e] ?? []).length))

const KIND_DOT: Record<string, string> = { up: 'rail__dot--amber', down: 'rail__dot--rose', turn: '' }
const KIND_LABEL: Record<string, string> = { up: '成就', down: '挫折', turn: '转折' }

function go(id: string) { void router.push(`/node/${id}`) }
function goTree() { void router.push('/tree') }
function goTimeline() { void router.push('/timeline') }
function goGlobe() { void router.push('/globe') }
</script>

<template>
  <section class="scene-root cn">
    <div class="doc-scene">
      <div class="doc-wrap">

        <!-- ══ 头部 ══ -->
        <header class="scene-head anim-fade-up cn__hero">
          <div class="scene-head__eyebrow">SPECIAL TOPIC · 中国</div>
          <h2 class="scene-head__title cn__title">领先 · 错失 · 复兴</h2>
          <p class="scene-head__sub">
            这一页不讲"我们最棒"，只讲三幕真实发生的事：一个文明如何靠开放与组织领先世界两千年，
            如何因为关上国门而错过三百年，又如何用七十年把两百年的课补完。<br>
            <b class="cn__motto">{{ CHINA_CONCLUSION.title }}</b>
          </p>
          <div class="chips">
            <span class="pill pill--amber">🏮 独立专题</span>
            <span class="pill mono">{{ CHINA_ACTS.reduce((n, a) => n + a.milestones.length, 0) }} 个关键事件</span>
            <span class="pill mono">{{ TRANSMISSIONS.length }} 条西传路线</span>
            <span class="pill mono">{{ CHINA_GAPS.length }} 项待攻关</span>
          </div>
        </header>

        <!-- ══ 地位曲线 ══ -->
        <section class="sec">
          <div class="sec__h">
            <h3>十二个时代里，中国排在第几</h3>
            <span class="label-xs">点击柱状图看点评</span>
          </div>
          <div class="cn__chart card">
            <svg viewBox="0 0 980 236">
              <g v-for="(r, i) in CHINA_VS_WORLD" :key="r.era" style="cursor:pointer" @click="selEra = r.era; settings.sfx('tick', 0.3)">
                <rect :x="i * SLOT" y="6" :width="SLOT" height="204" fill="transparent" />
                <rect v-if="selEra === r.era" :x="i * SLOT + 2" y="6" :width="SLOT - 4" height="204" rx="6" fill="rgba(255,179,71,0.08)" stroke="rgba(255,179,71,0.35)" />
                <!-- 世界最强 -->
                <rect :x="i * SLOT + SLOT / 2 - 24" :y="barY(r.leaderV)" width="18" :height="190 - barY(r.leaderV)" rx="3" fill="rgba(var(--tint),0.32)" />
                <!-- 中国 -->
                <rect :x="i * SLOT + SLOT / 2 + 4" :y="barY(r.china)" width="18" :height="190 - barY(r.china)" rx="3"
                  :fill="r.china >= r.leaderV ? '#ffd166' : '#c9a227'" :opacity="selEra === r.era ? 1 : 0.85" />
                <text :x="i * SLOT + SLOT / 2" y="206" text-anchor="middle" font-size="11" :fill="selEra === r.era ? '#ffd166' : '#64809f'">{{ r.name }}</text>
                <text :x="i * SLOT + SLOT / 2" y="222" text-anchor="middle" font-size="9.5" fill="#3d5875">第 {{ r.rank }} 名</text>
              </g>
              <line x1="0" y1="190" x2="980" y2="190" stroke="rgba(var(--tint),0.2)" />
              <g font-size="10" fill="#64809f">
                <rect x="12" y="16" width="12" height="12" rx="2" fill="rgba(var(--tint),0.32)" /><text x="30" y="26">同时代世界最强</text>
                <rect x="128" y="16" width="12" height="12" rx="2" fill="#c9a227" /><text x="146" y="26">中国</text>
              </g>
            </svg>
          </div>
          <div v-if="selRow" class="cn__chart-note card">
            <b :style="{ color: ERA_MAP[selRow.era].accent }">{{ ERA_MAP[selRow.era].name }}</b>
            <span>中国活跃度 {{ selRow.china.toFixed(2) }} · 世界最强：{{ selRow.leader }}（{{ selRow.leaderV.toFixed(2) }}）· 排名第 {{ selRow.rank }}</span>
            <p>{{ selRow.note }}</p>
          </div>
        </section>

        <!-- ══ 三幕 ══ -->
        <section v-for="(act, ai) in CHINA_ACTS" :key="act.id" class="sec cn__act" :style="{ '--ac': act.color, '--aa': act.accent }">
          <div class="sec__h cn__act-h">
            <h3>{{ act.title }}</h3>
            <span class="label-xs mono">{{ act.subtitle }} · {{ act.period }}</span>
          </div>
          <p class="prose cn__act-desc">{{ act.desc }}</p>

          <div class="rail cn__rail">
            <div v-for="m in act.milestones" :key="m.title" class="rail__item cn__ms">
              <span class="rail__dot" :class="KIND_DOT[m.kind]" />
              <div class="cn__ms-head">
                <b class="mono cn__ms-year">{{ m.year < 0 ? `公元前 ${-m.year}` : m.year }}</b>
                <h4>{{ m.title }}</h4>
                <span class="pill cn__kind" :class="{ 'pill--amber': m.kind === 'up', 'pill--rose': m.kind === 'down', 'pill--cyan': m.kind === 'turn' }">{{ KIND_LABEL[m.kind] }}</span>
                <button v-if="m.nodeId && NODE_MAP[m.nodeId]" class="cn__open" @click="go(m.nodeId!)">打开节点 ↗</button>
              </div>
              <p>{{ m.note }}</p>
            </div>
          </div>

          <div class="cn__lessons">
            <div v-for="(l, li) in act.lessons" :key="l" class="quote cn__lesson">
              {{ l }}
              <span class="quote__by mono">第{{ ['一', '二', '三'][ai] }}幕 · 要记住的第 {{ li + 1 }} 句话</span>
            </div>
          </div>
        </section>

        <!-- ══ 四大发明西传 ══ -->
        <section class="sec">
          <div class="sec__h">
            <h3>四大发明是怎么走到欧洲的</h3>
            <span class="label-xs">技术扩散需要几百年</span>
          </div>
          <div class="chips">
            <button v-for="(t, i) in TRANSMISSIONS" :key="t.what" class="pill" :class="{ 'pill--amber': txIdx === i }"
              @click="txIdx = i; settings.sfx('click')">{{ t.what }}</button>
          </div>
          <div class="cn__tx card">
            <div class="cn__tx-path">
              <template v-for="(p, i) in tx.path" :key="p.year">
                <div class="cn__tx-stop">
                  <b class="mono">{{ p.year < 0 ? `前 ${-p.year}` : p.year }}</b>
                  <h5>{{ p.place }}</h5>
                  <p>{{ p.note }}</p>
                </div>
                <span v-if="i < tx.path.length - 1" class="cn__tx-arrow">→</span>
              </template>
            </div>
            <div class="quote cn__tx-effect">
              {{ tx.effect }}
              <span class="quote__by">
                后果 ·
                <button v-if="NODE_MAP[tx.nodeId]" class="cn__open" @click="go(tx.nodeId)">打开「{{ NODE_MAP[tx.nodeId].name }}」 ↗</button>
              </span>
            </div>
          </div>
        </section>

        <!-- ══ 硬数据 ══ -->
        <section class="sec">
          <div class="sec__h">
            <h3>今天的中国 · 一组硬数据</h3>
            <span class="label-xs">公开统计口径 · 约数</span>
          </div>
          <div class="grid grid--auto stagger">
            <div v-for="n in CHINA_NUMBERS" :key="n.k" class="card cn__num">
              <span class="label-xs">{{ n.k }}</span>
              <div class="bignum bignum--amber">{{ n.v }}<span class="bignum__unit">{{ n.unit }}</span></div>
              <p>{{ n.note }}</p>
              <span class="cn__src mono">{{ n.source }}</span>
            </div>
          </div>
        </section>

        <!-- ══ 诚实清单 ══ -->
        <section class="sec">
          <div class="sec__h">
            <h3>还没拿到的牌 · 诚实清单</h3>
            <span class="label-xs">这一代人的科研选题</span>
          </div>
          <div class="grid grid--2 stagger">
            <div v-for="g in CHINA_GAPS" :key="g.field" class="card cn__gap">
              <div class="cn__gap-h">
                <h4>{{ g.field }}</h4>
                <span class="pill pill--rose">{{ g.status }}</span>
              </div>
              <p>{{ g.detail }}</p>
              <NodeChip v-if="g.nodeId && NODE_MAP[g.nodeId]" :node="NODE_MAP[g.nodeId]" size="sm" />
            </div>
          </div>
        </section>

        <!-- ══ 节点速览 ══ -->
        <section class="sec">
          <div class="sec__h">
            <h3>科技树里的中国节点</h3>
            <span class="label-xs mono">共 {{ eraWithNodes.reduce((n, e) => n + (CHINA_NODES_BY_ERA[e] ?? []).length, 0) }} 个</span>
          </div>
          <div class="chips">
            <button v-for="e in eraWithNodes" :key="e" class="pill" :class="{ 'pill--cyan': eraTab === e }"
              @click="eraTab = e; settings.sfx('tick', 0.3)">{{ ERA_MAP[e].short }} · {{ (CHINA_NODES_BY_ERA[e] ?? []).length }}</button>
          </div>
          <div class="chips cn__node-chips">
            <NodeChip v-for="n in tabNodes" :key="n.id" :node="n" size="sm" />
          </div>
        </section>

        <!-- ══ 结尾 ══ -->
        <section class="sec cn__end">
          <div class="sec__h"><h3>写在最后</h3></div>
          <div v-for="l in CHINA_CONCLUSION.lines" :key="l" class="quote cn__end-line">{{ l }}</div>
          <div class="cn__ask card">
            <span class="label-xs">留给课堂的三个问题</span>
            <ol>
              <li v-for="a in CHINA_CONCLUSION.ask" :key="a">{{ a }}</li>
            </ol>
          </div>
          <div class="chips cn__end-cta">
            <UiButton variant="amber" size="lg" sfx="confirm" @click="goTree">🕸️ 去科技树看完整因果链</UiButton>
            <UiButton size="lg" sfx="click" @click="goTimeline">⏳ 回到时间线</UiButton>
            <UiButton variant="ghost" size="lg" sfx="click" @click="goGlobe">🌍 在地球上看中国</UiButton>
          </div>
        </section>

      </div>
    </div>
  </section>
</template>

<style scoped>
.cn { background: radial-gradient(ellipse 75% 45% at 50% -12%, rgba(201, 162, 39, 0.16), transparent 62%), var(--c-deep); }
.cn .doc-scene { position: absolute; inset: 0; }

.cn__title { background: linear-gradient(120deg, #fff6dd 12%, #ffd166 48%, #c0392b 100%); -webkit-background-clip: text; background-clip: text; }
[data-theme='light'] .cn__title { background-image: linear-gradient(120deg, #8a5a00 12%, #b45309 48%, #c0392b 100%); }
.cn__motto { color: var(--c-gold); }

/* 地位曲线 */
.cn__chart { padding: 10px 12px 6px; }
.cn__chart svg { width: 100%; height: auto; display: block; }
.cn__chart-note { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; border-color: rgba(255, 179, 71, 0.3); }
.cn__chart-note b { font-size: 15px; }
.cn__chart-note span { font-size: 12px; color: var(--t-mid); }
.cn__chart-note p { font-size: 13px; color: var(--t-mid); line-height: 1.8; }

/* 三幕 */
.cn__act { border-left: 3px solid var(--ac); padding-left: var(--s-4); }
.cn__act-h h3 { color: var(--aa); }
.cn__act-desc { border-left: 0; }
.cn__rail { margin-top: var(--s-2); }
.cn__ms-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cn__ms-year { font-size: 12px; color: var(--aa); letter-spacing: 0.08em; }
.cn__ms-head h4 { font-size: 15px; color: var(--t-hi); }
.cn__kind { font-size: 11px; padding: 2px 8px; }
.cn__open { font-size: 11.5px; color: var(--c-cyan); opacity: 0.85; transition: opacity var(--dur-fast); }
.cn__open:hover { opacity: 1; text-decoration: underline; }
.cn__ms > p { margin-top: 5px; font-size: 13px; line-height: 1.85; color: var(--t-mid); max-width: 92ch; }
.cn__lessons { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--s-3); margin-top: var(--s-2); }
.cn__lesson { border-left-color: var(--aa); font-size: 13.5px; }

/* 西传 */
.cn__tx { padding: var(--s-4); display: flex; flex-direction: column; gap: var(--s-4); }
.cn__tx-path { display: flex; align-items: stretch; gap: 8px; overflow-x: auto; padding-bottom: 6px; }
.cn__tx-stop {
  flex: 1 0 168px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-md);
  background: linear-gradient(180deg, rgba(201, 162, 39, 0.09), rgba(var(--veil), 0.4));
}
.cn__tx-stop b { font-size: 12px; color: var(--c-amber); }
.cn__tx-stop h5 { margin: 3px 0 5px; font-size: 13.5px; color: var(--t-hi); }
.cn__tx-stop p { font-size: 11.5px; line-height: 1.7; color: var(--t-mid); }
.cn__tx-arrow { align-self: center; color: var(--c-amber-dim); font-size: 16px; }
.cn__tx-effect { font-size: 13.5px; }

/* 硬数据 / 短板 */
.cn__num { display: flex; flex-direction: column; gap: 6px; }
.cn__num p { font-size: 12px; line-height: 1.7; color: var(--t-mid); }
.cn__src { font-size: 11px; color: var(--t-faint); margin-top: auto; }
.cn__gap { display: flex; flex-direction: column; gap: 8px; }
.cn__gap-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.cn__gap-h h4 { font-size: 15px; color: var(--t-hi); }
.cn__gap p { font-size: 12.5px; line-height: 1.8; color: var(--t-mid); }

.cn__node-chips { margin-top: var(--s-2); }

/* 结尾 */
.cn__end-line { font-size: 15px; line-height: 2; border-left-color: var(--c-gold); }
.cn__ask { padding: var(--s-4); display: flex; flex-direction: column; gap: 10px; }
.cn__ask ol { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
.cn__ask li { font-size: 14px; line-height: 1.8; color: var(--t-hi); }
.cn__end-cta { margin-top: var(--s-2); }
</style>
