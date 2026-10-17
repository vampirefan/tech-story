import { defineStore } from 'pinia'
import { NODES, NODE_MAP, RADJ, ADJ, ROOT_NODES, NODES_BY_ERA } from '@/data/techTree'
import { ERA_ORDER } from '@/data/eras'
import { useSettings } from '@/stores/settings'
import type { EraId, TechNode } from '@/types'

const KEY = 'techstory.progress.v2'

export interface ProgressState {
  /** 已经"研究"过的节点（点亮的科技） */
  researched: string[]
  /** 打开过详情页的节点 */
  visited: string[]
  /** 通过测验的节点 */
  quizPassed: string[]
  /** 玩过的原理演示 */
  demosPlayed: string[]
  /** 是否看过开场 */
  seenIntro: boolean
  /** 是否看过中国专题 */
  chinaVisited: boolean
}

function load(): ProgressState {
  const empty: ProgressState = {
    researched: [], visited: [], quizPassed: [], demosPlayed: [],
    seenIntro: false, chinaVisited: false
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const p = JSON.parse(raw)
    // 过滤掉数据更新后已不存在的 id
    const keepStr = (a: unknown): string[] =>
      Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []
    const keep = (a: unknown): string[] => keepStr(a).filter(x => !!NODE_MAP[x])
    return {
      researched: keep(p.researched),
      visited: keep(p.visited),
      quizPassed: keep(p.quizPassed),
      demosPlayed: keepStr(p.demosPlayed),
      seenIntro: !!p.seenIntro,
      chinaVisited: !!p.chinaVisited
    }
  } catch { return empty }
}

export const useProgress = defineStore('progress', {
  state: (): ProgressState => load(),

  getters: {
    researchedSet(): Set<string> { return new Set(this.researched) },
    visitedSet(): Set<string> { return new Set(this.visited) },

    /** 自由探索模式下所有节点都视为已解锁 */
    freeExplore(): boolean { return useSettings().freeExplore },

    /** 已解锁 = 已研究，或自由探索开启 */
    isUnlocked(): (id: string) => boolean {
      return (id: string) => this.freeExplore || this.researchedSet.has(id)
    },

    /** 可研究 = 已研究过，或者所有直接前置都已研究（根节点始终可研究） */
    isAvailable(): (id: string) => boolean {
      return (id: string) => {
        if (this.isUnlocked(id)) return true
        if (this.freeExplore) return true
        const prereqs = RADJ[id] ?? []
        return prereqs.every(p => this.researchedSet.has(p))
      }
    },

    /** 锁住的原因（用于 tooltip） */
    lockReason(): (id: string) => string {
      return (id: string) => {
        if (this.isAvailable(id)) return ''
        const missing = (RADJ[id] ?? []).filter(p => !this.researchedSet.has(p)).map(p => NODE_MAP[p]?.name ?? p)
        return `需要先研究：${missing.join('、')}`
      }
    },

    /** 当前可以研究但还没研究的节点（按时间排序） */
    availableList(): string[] {
      return NODES.filter(n => this.isAvailable(n.id) && !this.researchedSet.has(n.id)).map(n => n.id)
    },

    /** 下一个推荐研究的节点：时间最早的可研究节点中影响力最高者 */
    nextRecommended(): string | null {
      const list = this.availableList
      if (!list.length) return null
      return list.slice().sort((a, b) => {
        const na = NODE_MAP[a], nb = NODE_MAP[b]
        return nb.impact - na.impact || na.year - nb.year
      })[0]
    },

    /** 研究某个节点会立刻解锁哪些新节点 */
    wouldUnlock(): (id: string) => string[] {
      return (id: string) => {
        const after = new Set(this.researched)
        after.add(id)
        return (ADJ[id] ?? []).filter(c =>
          !after.has(c) && (RADJ[c] ?? []).every(p => after.has(p))
        )
      }
    },

    progress(): number { return NODES.length ? this.researched.length / NODES.length : 0 },

    /** 每个时代的解锁进度 */
    eraProgress(): Record<EraId, { done: number; total: number; ratio: number }> {
      const out = {} as Record<EraId, { done: number; total: number; ratio: number }>
      for (const era of ERA_ORDER) {
        const list = NODES_BY_ERA[era]
        const done = list.filter(n => this.researchedSet.has(n.id)).length
        out[era] = { done, total: list.length, ratio: list.length ? done / list.length : 0 }
      }
      return out
    },

    /** 已经研究过的节点（TechNode 形式，按时间排序） */
    researchedNodes(): TechNode[] {
      const done = new Set(this.researched)
      return NODES.filter(n => done.has(n.id))
    },

    hasAnyProgress(): boolean { return this.researched.length > 0 || this.seenIntro }
  },

  actions: {
    persist() {
      try { localStorage.setItem(KEY, JSON.stringify(this.$state)) } catch { /* 隐私模式 */ }
    },

    /** 研究一个节点；返回因此新解锁的节点 id 列表 */
    research(id: string): string[] {
      if (!NODE_MAP[id] || this.researchedSet.has(id)) { this.persist(); return [] }
      this.researched.push(id)
      const unlocked = this.wouldUnlock(id)
      this.persist()
      return unlocked
    },

    visit(id: string) {
      if (!NODE_MAP[id]) return
      if (!this.visitedSet.has(id)) { this.visited.push(id); this.persist() }
    },

    passQuiz(id: string) {
      if (!this.quizPassed.includes(id)) { this.quizPassed.push(id); this.persist() }
    },

    playDemo(demoId: string) {
      if (!this.demosPlayed.includes(demoId)) { this.demosPlayed.push(demoId); this.persist() }
    },

    markIntro() { if (!this.seenIntro) { this.seenIntro = true; this.persist() } },
    markChina() { if (!this.chinaVisited) { this.chinaVisited = true; this.persist() } },

    /** 一次性点亮到某个时代（课堂快进用） */
    researchThroughEra(era: EraId) {
      const idx = ERA_ORDER.indexOf(era)
      if (idx < 0) return
      for (const e of ERA_ORDER.slice(0, idx + 1)) {
        for (const n of NODES_BY_ERA[e]) if (!this.researchedSet.has(n.id)) this.researched.push(n.id)
      }
      this.persist()
    },

    reset() {
      this.researched = []
      this.visited = []
      this.quizPassed = []
      this.demosPlayed = []
      this.seenIntro = false
      this.chinaVisited = false
      this.persist()
    },

    /** 从 JSON 导入（Admin 页维护用） */
    importState(raw: string): { ok: boolean; message: string } {
      try {
        const p = JSON.parse(raw)
        if (!p || !Array.isArray(p.researched)) return { ok: false, message: '格式不对：缺少 researched 数组' }
        const valid = p.researched.filter((x: string) => NODE_MAP[x])
        this.researched = valid
        this.visited = Array.isArray(p.visited) ? p.visited.filter((x: string) => NODE_MAP[x]) : []
        this.quizPassed = Array.isArray(p.quizPassed) ? p.quizPassed.filter((x: string) => NODE_MAP[x]) : []
        this.demosPlayed = Array.isArray(p.demosPlayed) ? p.demosPlayed : []
        this.seenIntro = !!p.seenIntro
        this.chinaVisited = !!p.chinaVisited
        this.persist()
        return { ok: true, message: `导入成功，已研究 ${valid.length} 个节点` }
      } catch (e) {
        return { ok: false, message: '解析失败：' + (e as Error).message }
      }
    },

    exportState(): string { return JSON.stringify(this.$state, null, 2) }
  }
})

/** 开场时自动点亮文明的起点，让孩子看到"从零开始" */
export const SEED_NODES = ROOT_NODES.map(n => n.id)
