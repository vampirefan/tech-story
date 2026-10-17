import { defineStore } from 'pinia'
import { NODE_MAP } from '@/data/techTree'
import { MEDIA_LIBRARY } from '@/data/media'
import { ERA_MAP } from '@/data/eras'
import type { Era, MediaItem, TechNode } from '@/types'

const KEY = 'ts-content-v1'

/** 维护页可编辑的节点字段（其余字段涉及图结构，改动会破坏因果链校验） */
export type NodePatch = Partial<Pick<TechNode,
  'name' | 'nameEn' | 'yearLabel' | 'summary' | 'story' | 'principle' | 'impactNote' | 'chinaNote' | 'flag' | 'art' | 'funFacts' | 'mediaIds' | 'impact'>>

export type MediaPatch = Partial<Pick<MediaItem, 'title' | 'author' | 'intro' | 'reason' | 'glyph' | 'cover'>> & { palette?: [string, string] }
export type EraPatch = Partial<Pick<Era, 'tagline' | 'desc' | 'color' | 'accent'>>

interface ContentState {
  nodes: Record<string, NodePatch>
  media: Record<string, MediaPatch>
  /** 维护页新增的媒体条目（完整对象） */
  mediaNew: Record<string, MediaItem>
  eras: Record<string, EraPatch>
}

function load(): ContentState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { nodes: {}, media: {}, mediaNew: {}, eras: {}, ...JSON.parse(raw) }
  } catch { /* 损坏的本地数据直接忽略 */ }
  return { nodes: {}, media: {}, mediaNew: {}, eras: {} }
}

/** 把覆盖层写进运行时的数据对象：所有场景读的就是这些对象 */
function applyAll(s: ContentState) {
  for (const [id, patch] of Object.entries(s.nodes)) {
    const n = NODE_MAP[id]
    if (n) Object.assign(n, patch)
  }
  for (const [id, patch] of Object.entries(s.media)) {
    const m = MEDIA_LIBRARY[id]
    if (m) Object.assign(m, patch)
  }
  for (const [id, item] of Object.entries(s.mediaNew)) {
    if (!MEDIA_LIBRARY[id]) MEDIA_LIBRARY[id] = item
  }
  for (const [id, patch] of Object.entries(s.eras)) {
    const e = ERA_MAP[id as keyof typeof ERA_MAP]
    if (e) Object.assign(e, patch)
  }
}

/** 模块加载时（应用覆盖前）拍下原始值，供单条重置恢复 */
const NODE_ORIG: Record<string, NodePatch> = {}
for (const [id, n] of Object.entries(NODE_MAP)) {
  NODE_ORIG[id] = {
    name: n.name, nameEn: n.nameEn, yearLabel: n.yearLabel, summary: n.summary, story: n.story,
    principle: n.principle, impactNote: n.impactNote, chinaNote: n.chinaNote, flag: n.flag,
    funFacts: [...n.funFacts], mediaIds: [...n.mediaIds], impact: n.impact
  }
}
const MEDIA_ORIG: Record<string, MediaPatch> = {}
for (const [id, m] of Object.entries(MEDIA_LIBRARY)) {
  MEDIA_ORIG[id] = { title: m.title, author: m.author, intro: m.intro, reason: m.reason, glyph: m.glyph, cover: m.cover, palette: m.palette ? [...m.palette] as [string, string] : undefined }
}
const ERA_ORIG: Record<string, EraPatch> = {}
for (const [id, e] of Object.entries(ERA_MAP)) {
  ERA_ORIG[id] = { tagline: e.tagline, desc: e.desc, color: e.color, accent: e.accent }
}

export const useContent = defineStore('content', {
  state: (): ContentState & { rev: number } => ({ ...load(), rev: 0 }),

  actions: {
    persist() {
      const { nodes, media, mediaNew, eras } = this
      localStorage.setItem(KEY, JSON.stringify({ nodes, media, mediaNew, eras }))
      this.rev++
    },
    patchNode(id: string, patch: NodePatch) {
      const n = NODE_MAP[id]
      if (!n) return
      Object.assign(n, patch)
      this.nodes[id] = { ...this.nodes[id], ...patch }
      this.persist()
    },
    resetNode(id: string) {
      delete this.nodes[id]
      const n = NODE_MAP[id]
      if (n && NODE_ORIG[id]) Object.assign(n, NODE_ORIG[id])
      this.persist()
    },
    patchMedia(id: string, patch: MediaPatch) {
      const m = MEDIA_LIBRARY[id]
      if (!m) return
      Object.assign(m, patch)
      this.media[id] = { ...this.media[id], ...patch }
      this.persist()
    },
    addMedia(id: string, item: MediaItem) {
      MEDIA_LIBRARY[id] = item
      this.mediaNew[id] = { ...item }
      this.persist()
    },
    removeMedia(id: string) {
      if (!this.mediaNew[id]) return
      delete this.mediaNew[id]
      delete MEDIA_LIBRARY[id]
      this.persist()
    },
    patchEra(id: string, patch: EraPatch) {
      const e = ERA_MAP[id as keyof typeof ERA_MAP]
      if (!e) return
      Object.assign(e, patch)
      this.eras[id] = { ...this.eras[id], ...patch }
      this.persist()
    },
    resetEra(id: string) {
      delete this.eras[id]
      const e = ERA_MAP[id as keyof typeof ERA_MAP]
      if (e && ERA_ORIG[id]) Object.assign(e, ERA_ORIG[id])
      this.persist()
    },
    exportJson(): string {
      const { nodes, media, mediaNew, eras } = this
      return JSON.stringify({ version: 1, nodes, media, mediaNew, eras }, null, 2)
    },
    importJson(raw: string): { ok: boolean; message: string } {
      try {
        const data = JSON.parse(raw) as Partial<ContentState> & { version?: number }
        const next: ContentState = {
          nodes: data.nodes ?? {},
          media: data.media ?? {},
          mediaNew: data.mediaNew ?? {},
          eras: data.eras ?? {}
        }
        for (const id of Object.keys(next.nodes)) if (!NODE_MAP[id]) return { ok: false, message: `节点不存在：${id}` }
        for (const id of Object.keys(next.eras)) if (!ERA_MAP[id as keyof typeof ERA_MAP]) return { ok: false, message: `时代不存在：${id}` }
        this.restoreOriginals()
        this.nodes = next.nodes
        this.media = next.media
        this.mediaNew = next.mediaNew
        this.eras = next.eras
        applyAll(next)
        this.persist()
        const n = Object.keys(next.nodes).length + Object.keys(next.media).length + Object.keys(next.mediaNew).length + Object.keys(next.eras).length
        return { ok: true, message: `已导入 ${n} 条覆盖记录` }
      } catch (e) {
        return { ok: false, message: `JSON 解析失败：${(e as Error).message}` }
      }
    },
    resetAll() {
      this.restoreOriginals()
      this.nodes = {}
      this.media = {}
      this.mediaNew = {}
      this.eras = {}
      localStorage.removeItem(KEY)
      this.persist()
    },
    restoreOriginals() {
      for (const [id, patch] of Object.entries(NODE_ORIG)) Object.assign(NODE_MAP[id], patch)
      for (const [id, patch] of Object.entries(MEDIA_ORIG)) Object.assign(MEDIA_LIBRARY[id], patch)
      for (const [id, e] of Object.entries(ERA_ORIG)) Object.assign(ERA_MAP[id as keyof typeof ERA_MAP], e)
      for (const id of Object.keys(this.mediaNew)) delete MEDIA_LIBRARY[id]
    }
  }
})

/** 应用启动时调用一次 */
export function hydrateContent() {
  applyAll(load())
}
