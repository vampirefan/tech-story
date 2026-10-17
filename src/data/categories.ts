import type { TechCategory } from '@/types'

export interface CategoryMeta {
  id: TechCategory
  name: string
  /** 与 tokens.css 的 --cat-* 对齐 */
  color: string
  hex: number
  /** 图例/筛选用的简写符号 */
  glyph: string
  blurb: string
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'energy', name: '能源', color: '#ff9d5c', hex: 0xff9d5c, glyph: '⚡', blurb: '从取火到核聚变，人类可用能量密度的每一次跃升' },
  { id: 'material', name: '材料', color: '#c9a227', hex: 0xc9a227, glyph: '◆', blurb: '石器、青铜、铁、钢、硅——时代往往以材料命名' },
  { id: 'transport', name: '交通', color: '#5cc8ff', hex: 0x5cc8ff, glyph: '➤', blurb: '车轮、帆船、铁路、飞机、高铁：距离被不断压缩' },
  { id: 'communication', name: '通信', color: '#7ee787', hex: 0x7ee787, glyph: '≋', blurb: '文字、印刷、电报、互联网，信息传播速度的革命' },
  { id: 'computation', name: '计算', color: '#b48cff', hex: 0xb48cff, glyph: '▦', blurb: '算盘、齿轮、电子管、晶体管到大模型' },
  { id: 'life', name: '生命', color: '#ff7eb6', hex: 0xff7eb6, glyph: '✚', blurb: '农业、医学、疫苗、基因：与疾病和饥荒的长期拉锯' },
  { id: 'space', name: '航天', color: '#6fd3e8', hex: 0x6fd3e8, glyph: '✦', blurb: '火箭、卫星、登月、空间站——文明走出摇篮' },
  { id: 'society', name: '社会', color: '#d4c09a', hex: 0xd4c09a, glyph: '⚖', blurb: '城市、法典、货币、教育、制度：技术需要的协作底座' },
  { id: 'science', name: '科学', color: '#8fd0ff', hex: 0x8fd0ff, glyph: '⌬', blurb: '观测、实验、理论与方法本身也是一种技术' },
  { id: 'conflict', name: '冲突', color: '#ff5f56', hex: 0xff5f56, glyph: '✕', blurb: '战争既是破坏，也常常是技术被迫加速的转折点' }
]

export const CATEGORY_MAP: Record<TechCategory, CategoryMeta> = CATEGORIES.reduce((m, c) => {
  m[c.id] = c
  return m
}, {} as Record<TechCategory, CategoryMeta>)

export const CATEGORY_HEX: Record<TechCategory, number> = CATEGORIES.reduce((m, c) => {
  m[c.id] = c.hex
  return m
}, {} as Record<TechCategory, number>)

export function catColor(id: TechCategory): string { return CATEGORY_MAP[id]?.color ?? '#8fd0ff' }
export function catName(id: TechCategory): string { return CATEGORY_MAP[id]?.name ?? id }
