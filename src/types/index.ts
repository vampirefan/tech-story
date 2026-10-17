/** 科技节点分类 —— 决定节点配色与图例分组 */
export type TechCategory =
  | 'energy'        // 能源
  | 'material'      // 材料
  | 'transport'     // 交通
  | 'communication' // 通信
  | 'computation'   // 计算
  | 'life'          // 生命
  | 'space'         // 航天
  | 'society'       // 社会制度
  | 'science'       // 科学认知
  | 'conflict'      // 冲突与战争

export type EraId =
  | 'stone' | 'bronze' | 'iron' | 'classical' | 'medieval'
  | 'renaissance' | 'industrial' | 'electric' | 'atomic'
  | 'information' | 'intelligence' | 'future'

export interface Era {
  id: EraId
  name: string
  short: string
  from: number // 负数 = 公元前
  to: number
  tagline: string
  /** 这个时代地球上的主要活跃文明区域 */
  powers: { region: string; note: string; strength: number }[]
  /** 时代氛围色（地球染色 / HUD 主色） */
  color: string
  accent: string
  /** 背景音乐轨道 id；synth: 表示用程序合成 */
  music: string
  desc: string
}

export interface GeoPoint {
  lat: number
  lng: number
  place: string
  country: string
  /** TopoJSON / ISO numeric 国家码，用于地图国家高亮与染色 */
  iso?: string
}

export interface Character {
  name: string
  role: string
  /** 一句话人物小传，口语化 */
  note: string
}

export interface Quiz {
  q: string
  options: string[]
  answer: number
  explain: string
}

export type MediaKind = 'book' | 'movie' | 'game' | 'music'

export interface MediaItem {
  kind: MediaKind
  title: string
  author?: string
  year?: number | string
  intro: string
  reason: string
  /** 封面：外链 URL（可选）；缺省时用 title+palette 程序化生成 SVG 封面 */
  cover?: string
  /** 程序化封面主色 */
  palette?: [string, string]
  glyph?: string
  /** music 专用：可播放资源路径或外链 */
  src?: string
  duration?: number
}

export interface DemoRef {
  id: string
  title: string
  hint: string
  /** 演示中要讲清楚的原理要点 */
  points: string[]
}

/** 因果链：谁推动了我 / 我推动了谁 */
export interface CausalLink {
  id: string
  kind: 'enabled' | 'accelerated' | 'triggered' | 'constrained'
  note: string
}

export interface TechNode {
  id: string
  name: string
  nameEn: string
  era: EraId
  /** 负数表示公元前 */
  year: number
  yearLabel: string
  category: TechCategory
  geo: GeoPoint
  summary: string
  story: string
  /** 原理讲解（有 demo 的节点必填，无 demo 的节点写核心机理） */
  principle?: string
  characters: Character[]
  funFacts: string[]
  /** 故事配图画板（assets/illustrations 下的文件名） */
  art?: string
  quiz: Quiz
  prereq: string[]
  unlocks: string[]
  /** 与战争/冲突相关的因果叙述 */
  warLinks?: CausalLink[]
  /** 历史影响评分 1-5 */
  impact: number
  impactNote: string
  demo?: DemoRef
  /** 指向 media.ts 中的 MEDIA_LIBRARY key */
  mediaIds: string[]
  /** 中国相关度 0-3，用于中国专题页与国旗标记 */
  chinaLink: 0 | 1 | 2 | 3
  chinaNote?: string
  /** 该节点所属文明区域的国旗 emoji（课堂趣味） */
  flag?: string
}

export interface RegionInfo {
  id: string
  name: string
  lat: number
  lng: number
  /** 该区域在每个时代的"科技活跃度" 0-1，用于地球染色与对比 */
  timeline: Partial<Record<EraId, number>>
  note: string
  iso?: string[]
}

export interface Settings {
  musicVolume: number
  sfxVolume: number
  muted: boolean
  freeExplore: boolean
  autoplay: boolean
  playSpeed: number
  showLabels: boolean
  quality: 'low' | 'medium' | 'high'
  bloom: boolean
  borderDensity: 'era' | 'full'
  theme: 'dark' | 'light'
}
