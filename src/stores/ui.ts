import { defineStore } from 'pinia'
import { ERA_MAP, ERA_ORDER, eraOfYear, yearToT, tToYear } from '@/data/eras'
import { NODES, NODE_MAP, headlineNodes } from '@/data/techTree'
import { topRegions } from '@/data/regions'
import type { EraId, TechCategory } from '@/types'

export type Scene3DMode = 'free' | 'follow'

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'success' | 'warn' | 'unlock'
  icon?: string
  ttl: number
}

export interface GeoFocus {
  lat: number
  lng: number
  /** 相机距离（地球半径倍数） */
  dist: number
  label?: string
}

let toastSeq = 0

/** 引导模式的推荐路径：每个时代取影响力最高的 5 个节点 */
export const GUIDED_PATH: string[] = ERA_ORDER.flatMap(era => headlineNodes(era, 5).map(n => n.id))

export const useUI = defineStore('ui', {
  state: () => ({
    /** 时间游标（年份，非线性映射见 eras.ts）。起点定在新石器晚期，首屏就有故事可看 */
    year: -10000 as number,
    eraId: 'stone' as EraId,

    /** 选中 / 悬停的节点 */
    selectedId: null as string | null,
    hoveredId: null as string | null,

    /** 引导播放 */
    playing: false,
    speed: 1,
    pathIndex: 0,
    /** free = 用户随便拖；follow = 相机跟着当前节点飞 */
    camMode: 'follow' as Scene3DMode,

    /** 相机焦点（点节点时飞过去） */
    focus: null as GeoFocus | null,

    /** 过滤器 */
    query: '',
    category: 'all' as TechCategory | 'all',
    eraFilter: 'all' as EraId | 'all',
    chinaOnly: false,
    warOnly: false,

    /** 面板开关 */
    showSettings: false,
    showHelp: false,
    showMediaLib: false,
    showLegend: true,
    showSearch: false,

    /** 资源加载 */
    loadingText: '正在生成地球…',
    loadProgress: 0,

    /** 提示条 */
    toasts: [] as Toast[],

    /** 科技树布局 */
    treeLayout: 'era' as 'era' | 'category',
    treeShowWar: true,
    treeExpanded: [] as string[]
  }),

  getters: {
    era: (s) => ERA_MAP[s.eraId],
    /** 时间游标归一化位置 0-1 */
    t: (s) => yearToT(s.year),
    /** 当前时刻已经"发生"的节点 */
    nodesUpTo(): (typeof NODES) {
      return NODES.filter(n => n.year <= this.year)
    },
    /** 当前时代的节点 */
    eraNodes: (s) => NODES.filter(n => n.era === s.eraId),
    /** 当前时刻活跃的地域排行 */
    leaders: (s) => topRegions(s.eraId, 5),
    /** 过滤后的节点（搜索 + 分类 + 时代 + 中国 + 战争） */
    filteredNodes(): (typeof NODES) {
      const q = this.query.trim().toLowerCase()
      return NODES.filter(n => {
        if (this.category !== 'all' && n.category !== this.category) return false
        if (this.eraFilter !== 'all' && n.era !== this.eraFilter) return false
        if (this.chinaOnly && n.chinaLink < 2) return false
        if (this.warOnly && n.category !== 'conflict' && !(n.warLinks && n.warLinks.length)) return false
        if (!q) return true
        const hay = [n.name, n.nameEn, n.summary, n.geo.country, n.geo.place, n.id, ...n.characters.map(c => c.name)].join(' ').toLowerCase()
        return hay.includes(q)
      })
    },
    selected: (s) => (s.selectedId ? NODE_MAP[s.selectedId] ?? null : null),
    hovered: (s) => (s.hoveredId ? NODE_MAP[s.hoveredId] ?? null : null),
    currentPathNode: (s) => NODE_MAP[GUIDED_PATH[s.pathIndex]] ?? null,
    pathProgress(): number { return GUIDED_PATH.length ? this.pathIndex / (GUIDED_PATH.length - 1) : 0 },
    hasFilters: (s) => !!s.query || s.category !== 'all' || s.eraFilter !== 'all' || s.chinaOnly || s.warOnly
  },

  actions: {
    /** 设置时间游标，并同步时代 id */
    setYear(year: number, syncEra = true) {
      const y = Math.max(ERA_MAP[ERA_ORDER[0]].from, Math.min(ERA_MAP[ERA_ORDER[ERA_ORDER.length - 1]].to, year))
      this.year = y
      if (syncEra) {
        const e = eraOfYear(y)
        if (e.id !== this.eraId) this.eraId = e.id
      }
    },

    setT(t: number) { this.setYear(tToYear(t)) },

    setEra(era: EraId) {
      this.eraId = era
      // 跳到该时代中点偏后的位置，让该时代的节点都已"发生"
      const e = ERA_MAP[era]
      const idx = ERA_ORDER.indexOf(era)
      const next = ERA_ORDER[idx + 1]
      const to = next ? ERA_MAP[next].from - 1 : e.to
      this.year = Math.round(e.from + (to - e.from) * 0.85)
    },

    select(id: string | null, opts: { fly?: boolean } = {}) {
      this.selectedId = id
      if (id && opts.fly !== false) {
        const n = NODE_MAP[id]
        if (n) this.flyTo(n.geo.lat, n.geo.lng, n.name)
        if (n && n.era !== this.eraId) this.eraId = n.era
      }
    },

    hover(id: string | null) { this.hoveredId = id },

    flyTo(lat: number, lng: number, label?: string, dist = 2.4) {
      this.focus = { lat, lng, dist, label }
    },

    clearFocus() { this.focus = null },

    /* ── 引导播放 ── */
    play() {
      this.playing = true
      this.camMode = 'follow'
    },
    pause() { this.playing = false },
    togglePlay() { this.playing ? this.pause() : this.play() },

    setSpeed(v: number) { this.speed = v },

    /** 走到路径上的某个位置（自动把时间游标推过去） */
    gotoPath(i: number) {
      const idx = Math.max(0, Math.min(GUIDED_PATH.length - 1, i))
      this.pathIndex = idx
      const n = NODE_MAP[GUIDED_PATH[idx]]
      if (n) {
        this.setYear(n.year)
        this.eraId = n.era
        this.selectedId = n.id
        this.flyTo(n.geo.lat, n.geo.lng, n.name)
      }
    },
    nextPath() { this.gotoPath(this.pathIndex + 1) },
    prevPath() { this.gotoPath(this.pathIndex - 1) },

    /** 找到最接近某年份的路径位置 */
    pathIndexOfYear(year: number): number {
      let best = 0, bd = Infinity
      for (let i = 0; i < GUIDED_PATH.length; i++) {
        const n = NODE_MAP[GUIDED_PATH[i]]
        if (!n) continue
        const d = Math.abs(n.year - year)
        if (d < bd) { bd = d; best = i }
      }
      return best
    },

    /* ── 过滤器 ── */
    setQuery(q: string) { this.query = q },
    setCategory(c: TechCategory | 'all') { this.category = c },
    setEraFilter(e: EraId | 'all') { this.eraFilter = e },
    toggleChinaOnly() { this.chinaOnly = !this.chinaOnly },
    toggleWarOnly() { this.warOnly = !this.warOnly },
    clearFilters() {
      this.query = ''; this.category = 'all'; this.eraFilter = 'all'
      this.chinaOnly = false; this.warOnly = false
    },

    /* ── 面板 ── */
    toggleSettings(v?: boolean) { this.showSettings = v ?? !this.showSettings },
    toggleHelp(v?: boolean) { this.showHelp = v ?? !this.showHelp },
    toggleMediaLib(v?: boolean) { this.showMediaLib = v ?? !this.showMediaLib },
    toggleLegend() { this.showLegend = !this.showLegend },
    toggleSearch(v?: boolean) { this.showSearch = v ?? !this.showSearch },

    setLoadProgress(p: number, text?: string) {
      this.loadProgress = p
      if (text) this.loadingText = text
    },

    /* ── 提示条 ── */
    toast(text: string, kind: Toast['kind'] = 'info', icon?: string, ttl = 3200) {
      const id = ++toastSeq
      this.toasts.push({ id, text, kind, icon, ttl })
      window.setTimeout(() => this.dismissToast(id), ttl)
      return id
    },
    dismissToast(id: number) {
      const i = this.toasts.findIndex(t => t.id === id)
      if (i >= 0) this.toasts.splice(i, 1)
    },

    /* ── 科技树 ── */
    setTreeLayout(l: 'era' | 'category') { this.treeLayout = l },
    toggleTreeWar() { this.treeShowWar = !this.treeShowWar },
    toggleTreeExpand(id: string) {
      const i = this.treeExpanded.indexOf(id)
      if (i >= 0) this.treeExpanded.splice(i, 1)
      else this.treeExpanded.push(id)
    }
  }
})
