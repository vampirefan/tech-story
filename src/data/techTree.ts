import type { EraId, TechCategory, TechNode, CausalLink } from '@/types'
import { ERA_ORDER, ERA_MAP } from './eras'
import { NODES_ANCIENT } from './nodes-ancient'
import { NODES_MIDDLE } from './nodes-middle'
import { NODES_MODERN } from './nodes-modern'
import { NODES_NOW } from './nodes-now'
import { MEDIA_LIBRARY, resolveMedia } from './media'

/** 全部节点，按时间（非线性时间轴坐标 → 年份）排序 */
export const NODES: TechNode[] = [...NODES_ANCIENT, ...NODES_MIDDLE, ...NODES_MODERN, ...NODES_NOW]
  .slice()
  .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name, 'zh'))

export const NODE_MAP: Record<string, TechNode> = Object.fromEntries(NODES.map(n => [n.id, n]))

export const NODE_IDS: string[] = NODES.map(n => n.id)

/** 按时代分组（保持时间顺序） */
export const NODES_BY_ERA: Record<EraId, TechNode[]> = (() => {
  const m = {} as Record<EraId, TechNode[]>
  for (const id of ERA_ORDER) m[id] = []
  for (const n of NODES) m[n.era].push(n)
  return m
})()

/** 按分类分组 */
export const NODES_BY_CATEGORY: Record<TechCategory, TechNode[]> = (() => {
  const m = {} as Record<TechCategory, TechNode[]>
  const cats: TechCategory[] = [
    'energy', 'material', 'transport', 'communication', 'computation',
    'life', 'space', 'society', 'science', 'conflict'
  ]
  for (const c of cats) m[c] = []
  for (const n of NODES) m[n.category].push(n)
  return m
})()

export interface TechEdge {
  from: string
  to: string
  /** normal = 技术演进；war = 战争/冲突推动 */
  kind: 'normal' | 'war'
  note?: string
}

const NODE_IDS_SET = new Set(NODE_IDS)

/**
 * 技术演进边。prereq 是权威方向（前置 → 当前），unlocks 只在不破坏 DAG 的前提下并入。
 * 被拒绝的边记录在 DROPPED_EDGES 里，便于内容自检。
 */
export const DROPPED_EDGES: { from: string; to: string; reason: string }[] = []

export const EDGES: TechEdge[] = (() => {
  const out: TechEdge[] = []
  const key = new Set<string>()
  const reachableFrom = (start: string, target: string, edges: TechEdge[]): boolean => {
    const stack = [start]
    const seen = new Set<string>()
    while (stack.length) {
      const cur = stack.pop()!
      if (cur === target) return true
      if (seen.has(cur)) continue
      seen.add(cur)
      for (const e of edges) if (e.from === cur) stack.push(e.to)
    }
    return false
  }
  const add = (from: string, to: string) => {
    if (!NODE_IDS_SET.has(from) || !NODE_IDS_SET.has(to)) return
    if (from === to) return
    const k = `${from}>${to}`
    if (key.has(k)) return
    if (reachableFrom(to, from, out)) {
      DROPPED_EDGES.push({ from, to, reason: '会形成环' })
      return
    }
    key.add(k)
    out.push({ from, to, kind: 'normal' })
  }
  for (const n of NODES) for (const p of n.prereq) add(p, n.id)
  for (const n of NODES) for (const u of n.unlocks) add(n.id, u)
  return out
})()

/** 邻接表（正向 / 反向），供路径与解锁计算使用 */
export const ADJ: Record<string, string[]> = {}
export const RADJ: Record<string, string[]> = {}
for (const id of NODE_IDS) { ADJ[id] = []; RADJ[id] = [] }
for (const e of EDGES) { ADJ[e.from].push(e.to); RADJ[e.to].push(e.from) }

/** 战争/冲突因果边（warLinks） */
export const WAR_EDGES: TechEdge[] = (() => {
  const out: TechEdge[] = []
  const seen = new Set<string>()
  for (const n of NODES) {
    for (const l of (n.warLinks ?? []) as CausalLink[]) {
      const k = `${n.id}>${l.id}:${l.kind}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ from: n.id, to: l.id, kind: 'war', note: `${l.kind} · ${l.note}` })
    }
  }
  return out
})()

export const ALL_EDGES: TechEdge[] = [...EDGES, ...WAR_EDGES]

/** 直接前置 / 直接后继 */
export function prereqOf(id: string): TechNode[] {
  return (RADJ[id] ?? []).filter(x => NODE_MAP[x]).map(x => NODE_MAP[x]).sort((a, b) => a.year - b.year)
}

export function unlocksOf(id: string): TechNode[] {
  return (ADJ[id] ?? []).filter(x => NODE_MAP[x]).map(x => NODE_MAP[x]).sort((a, b) => a.year - b.year)
}

/** 递归祖先 / 后代（不含自身） */
export function ancestorsOf(id: string): Set<string> {
  const out = new Set<string>()
  const stack = [...(RADJ[id] ?? [])]
  while (stack.length) {
    const cur = stack.pop()!
    if (out.has(cur)) continue
    out.add(cur)
    for (const p of RADJ[cur] ?? []) if (!out.has(p)) stack.push(p)
  }
  return out
}

export function descendantsOf(id: string): Set<string> {
  const out = new Set<string>()
  const stack = [...(ADJ[id] ?? [])]
  while (stack.length) {
    const cur = stack.pop()!
    if (out.has(cur)) continue
    out.add(cur)
    for (const c of ADJ[cur] ?? []) if (!out.has(c)) stack.push(c)
  }
  return out
}

/** 拓扑层级：没有前置的节点为 0 层 */
export const DEPTH: Record<string, number> = (() => {
  const d: Record<string, number> = {}
  const visit = (id: string, seen: Set<string>): number => {
    if (id in d) return d[id]
    if (seen.has(id)) return 0
    seen.add(id)
    let best = -1
    for (const p of RADJ[id] ?? []) best = Math.max(best, visit(p, seen))
    d[id] = best + 1
    return d[id]
  }
  for (const n of NODES) visit(n.id, new Set())
  return d
})()

/** 根节点（无前置） */
export const ROOT_NODES: TechNode[] = NODES.filter(n => !RADJ[n.id].length)

/** 叶子节点（无后继） */
export const LEAF_NODES: TechNode[] = NODES.filter(n => !ADJ[n.id].length)

/** 中国相关节点（chinaLink >= 2），按时间排序 */
export const CHINA_NODES: TechNode[] = NODES.filter(n => n.chinaLink >= 2)

/** 12 个交互动画演示 */
export const DEMOS: { id: string; nodeId: string; title: string; hint: string; points: string[] }[] =
  NODES.filter(n => n.demo).map(n => ({ id: n.demo!.id, nodeId: n.id, title: n.demo!.title, hint: n.demo!.hint, points: n.demo!.points }))

export const DEMO_IDS = [...new Set(DEMOS.map(d => d.id))]

/** 某时代的代表节点（按影响力排序取前 n 个） */
export function headlineNodes(era: EraId, n = 6): TechNode[] {
  return NODES_BY_ERA[era].slice().sort((a, b) => b.impact - a.impact || a.year - b.year).slice(0, n)
}

/** 某时代影响力最高的中国相关节点 */
export function chinaNodesOfEra(era: EraId): TechNode[] {
  return NODES_BY_ERA[era].filter(n => n.chinaLink >= 2)
}

/** 每个时代"谁领先"的对比数据：区域活跃度 + 该时代节点数占比 */
export function eraStats(era: EraId) {
  const list = NODES_BY_ERA[era]
  const countries: Record<string, number> = {}
  for (const n of list) countries[n.geo.country] = (countries[n.geo.country] ?? 0) + 1
  return {
    era,
    meta: ERA_MAP[era],
    total: list.length,
    countries: Object.entries(countries).sort((a, b) => b[1] - a[1]),
    china: list.filter(n => n.chinaLink >= 2).length,
    wars: list.filter(n => n.category === 'conflict').length,
    avgImpact: list.length ? list.reduce((s, n) => s + n.impact, 0) / list.length : 0
  }
}

/** 节点的媒体卡片（解析 mediaIds） */
export function mediaOf(id: string) {
  return resolveMedia(NODE_MAP[id]?.mediaIds ?? [])
}

/** 内容自检：errors 必须清零，warnings 供内容打磨参考 */
export function validateGraph(): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const ids = new Set(NODE_IDS)
  if (ids.size !== NODE_IDS.length) errors.push('存在重复节点 id')

  for (const n of NODES) {
    for (const p of n.prereq) if (!ids.has(p)) errors.push(`${n.id}.prereq 引用了不存在的节点 ${p}`)
    for (const u of n.unlocks) if (!ids.has(u)) errors.push(`${n.id}.unlocks 引用了不存在的节点 ${u}`)
    for (const m of n.mediaIds) if (!MEDIA_LIBRARY[m]) errors.push(`${n.id}.mediaIds 引用了不存在的媒体 ${m}`)
    for (const l of n.warLinks ?? []) {
      if (!ids.has(l.id)) errors.push(`${n.id}.warLinks 引用了不存在的节点 ${l.id}`)
      if (l.id === n.id) errors.push(`${n.id}.warLinks 指向了自己`)
    }
    const era = ERA_MAP[n.era]
    if (!era) errors.push(`${n.id} 的 era 不存在: ${n.era}`)
    else if (n.year < era.from || n.year > era.to) errors.push(`${n.id} 年份 ${n.year} 不在 ${era.id}(${era.from}~${era.to}) 区间内`)
    if (!n.summary || !n.story || !n.quiz) errors.push(`${n.id} 缺少 summary/story/quiz`)
    if (!n.quiz || n.quiz.options.length < 2 || n.quiz.answer >= n.quiz.options.length) errors.push(`${n.id} 的 quiz 不合法`)
    if (!n.geo?.iso) errors.push(`${n.id} 缺少 geo.iso 国家码`)
    if (!n.impactNote) errors.push(`${n.id} 缺少 impactNote`)
    if (n.category === 'conflict' && !(n.warLinks && n.warLinks.length)) errors.push(`${n.id} 是冲突节点但没有 warLinks`)
    if (n.story.length < 80) warnings.push(`${n.id} 的 story 偏短（${n.story.length} 字）`)
    if (!n.principle) warnings.push(`${n.id} 没有 principle 讲解`)
    if (!n.characters.length) warnings.push(`${n.id} 没有人物`)
    if (n.funFacts.length < 3) warnings.push(`${n.id} 冷知识少于 3 条`)
    if (!n.mediaIds.length) warnings.push(`${n.id} 没有推荐媒体`)
    if (n.demo && !n.principle) errors.push(`${n.id} 有 demo 却没有 principle`)
  }

  // 每个时代都要有节点
  for (const eraId of ERA_ORDER) {
    if (!NODES_BY_ERA[eraId].length) errors.push(`时代 ${eraId} 没有任何节点`)
    if (!chinaNodesOfEra(eraId).length) warnings.push(`时代 ${eraId} 没有中国相关节点`)
  }

  // 环检测：技术演进图必须是 DAG
  const color: Record<string, number> = {}
  const path: string[] = []
  const dfs = (id: string) => {
    if (color[id] === 2) return
    if (color[id] === 1) {
      const i = path.indexOf(id)
      errors.push(`技术演进图存在环: ${[...path.slice(i < 0 ? 0 : i), id].join(' → ')}`)
      return
    }
    color[id] = 1
    path.push(id)
    for (const t of ADJ[id] ?? []) dfs(t)
    path.pop()
    color[id] = 2
  }
  for (const n of NODES) dfs(n.id)

  // 被自动丢弃的边（内容层面的方向矛盾）
  for (const d of DROPPED_EDGES) warnings.push(`unlocks 边被丢弃（${d.reason}）: ${d.from} → ${d.to}`)

  // 时间倒挂：前置节点晚于当前节点
  for (const e of EDGES) {
    const a = NODE_MAP[e.from]
    const b = NODE_MAP[e.to]
    if (a && b && a.year > b.year) warnings.push(`时间倒挂: ${a.id}(${a.year}) → ${b.id}(${b.year})`)
  }

  return { errors, warnings }
}
