<script setup lang="ts">
import { computed } from 'vue'
import { useUI } from '@/stores/ui'
import { useSettings } from '@/stores/settings'
import { NODES, DEMO_IDS, WAR_EDGES, EDGES } from '@/data/techTree'
import { ERAS } from '@/data/eras'
import UiModal from './UiModal.vue'

const ui = useUI()
const settings = useSettings()
const open = computed({ get: () => ui.showHelp, set: (v: boolean) => ui.toggleHelp(v) })

const KEYS: { k: string; d: string }[] = [
  { k: 'Space', d: '播放 / 暂停推荐路线' },
  { k: '← →', d: '上一个 / 下一个科技节点' },
  { k: '↑ ↓', d: '时间快进 / 快退一个时代' },
  { k: '1 – 9', d: '播放速度 1× – 8×（0 = 0.5×）' },
  { k: 'F', d: '切换自由探索 / 逐步解锁' },
  { k: 'C', d: '只看中国相关节点' },
  { k: 'L', d: '显示 / 隐藏标签' },
  { k: 'B', d: '显示 / 隐藏泛光特效' },
  { k: '/', d: '搜索科技节点' },
  { k: 'G', d: '回到地球' },
  { k: 'S', d: '设置' },
  { k: 'H', d: '本帮助' },
  { k: 'Esc', d: '关闭弹窗 / 取消选中' }
]

const STEPS = [
  { n: '1', t: '转动地球，拖动时间轴', d: '地球会随时间改变国界与地域亮度。拖动底部时间轴，或点击某个时代直接跳过去。' },
  { n: '2', t: '点击发光的科技节点', d: '每个节点都对应地球上真实发生的地点。点它会飞到那里，并打开详情页。' },
  { n: '3', t: '玩原理演示', d: `${DEMO_IDS.length} 个可交互的原理动画：取火、车轮、造纸、火药、印刷、蒸汽机、电报、电路、电话、飞行、火箭、逻辑门、光刻。都能自己动手调参数。` },
  { n: '4', t: '看因果与战争', d: `${EDGES.length} 条技术演进关系 + ${WAR_EDGES.length} 条战争因果边。科技树页面用实线表示"谁催生了谁"，虚线表示"战争如何逼出技术"。` },
  { n: '5', t: '做小测验、看拓展', d: '每个节点都配了测验题和书籍 / 影视 / 游戏 / 音乐推荐，音乐可以直接设为背景。' }
]
</script>

<template>
  <UiModal v-model:open="open" title="怎么玩 / HOW TO PLAY" width="min(94vw, 820px)">
    <div class="help">
      <p class="help__lead">
        这是一部可以玩的科技史：{{ NODES.length }} 个节点，{{ ERAS.length }} 个时代，从两百五十万年前的第一块石器，
        一直讲到可控核聚变和火星殖民。所有内容都对应真实的时间、地点和人物。
      </p>

      <section class="help__sec">
        <h4 class="help__h">五个步骤</h4>
        <ol class="help__steps">
          <li v-for="s in STEPS" :key="s.n">
            <span class="help__n">{{ s.n }}</span>
            <span class="col">
              <b>{{ s.t }}</b>
              <span class="help__d">{{ s.d }}</span>
            </span>
          </li>
        </ol>
      </section>

      <section class="help__sec">
        <h4 class="help__h">键盘快捷键</h4>
        <div class="help__keys">
          <div v-for="k in KEYS" :key="k.k" class="help__key">
            <span class="kbd">{{ k.k }}</span><span>{{ k.d }}</span>
          </div>
        </div>
      </section>

      <section class="help__sec">
        <h4 class="help__h">课堂建议</h4>
        <ul class="help__tips">
          <li>先在 <b>设置</b> 里关掉「自由探索」，让学生看着科技一个个被点亮，成就感更强。</li>
          <li>时间很紧时，用 <b>地球页</b> 的自动播放 + 4× 速度，20 分钟能走完整条主线。</li>
          <li>想深讲某个主题，直接去 <b>科技树页</b> 按分类筛选（能源 / 材料 / 通信 / 计算 / 生命 / 航天 / 冲突…）。</li>
          <li>爱国教育部分放在 <b>中国专题页</b>：三幕结构讲清"领先 → 落后 → 复兴"，并且诚实列出了今天仍然卡脖子的地方。</li>
          <li>背景音乐全部是公有领域录音，音量可以单独调；讲重点时可以把音乐音量拉到 0。</li>
        </ul>
      </section>

      <div class="row gap-2 help__foot">
        <span class="pill pill--cyan">当前模式：{{ settings.freeExplore ? '自由探索' : '逐步解锁' }}</span>
        <span class="pill">已研究 {{ ui.selectedId ? '节点已选中' : '尚未选中节点' }}</span>
      </div>
    </div>
  </UiModal>
</template>

<style scoped>
.help { display: grid; gap: var(--s-5); }
.help__lead { font-size: 13.5px; color: var(--t-mid); line-height: 1.8; border-left: 2px solid var(--c-cyan); padding-left: 12px; }
.help__sec { display: flex; flex-direction: column; gap: var(--s-3); }
.help__h { font-family: var(--f-display); font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--c-cyan); }
.help__steps { display: grid; gap: 10px; counter-reset: s; }
.help__steps li { display: flex; gap: 11px; align-items: flex-start; }
.help__n {
  flex: none; width: 23px; height: 23px; border-radius: 50%;
  display: grid; place-items: center;
  font-family: var(--f-mono); font-size: 11px; font-weight: 700;
  background: linear-gradient(180deg, rgba(0, 180, 240, 0.4), rgba(0, 90, 150, 0.5));
  border: 1px solid var(--line-hot); color: #eafaff;
}
.help__steps b { font-size: 13.5px; color: var(--t-hi); }
.help__d { font-size: 12.5px; color: var(--t-mid); line-height: 1.65; }
.help__keys { display: grid; grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)); gap: 7px 14px; }
.help__key { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--t-mid); }
.help__tips { display: grid; gap: 7px; }
.help__tips li { position: relative; padding-left: 16px; font-size: 12.5px; color: var(--t-mid); line-height: 1.65; }
.help__tips li::before { content: '▸'; position: absolute; left: 0; color: var(--c-amber); }
.help__tips b { color: var(--t-hi); }
.help__foot { justify-content: flex-end; }
</style>
