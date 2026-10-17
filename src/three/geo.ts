import * as THREE from 'three'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import { COUNTRY_ZH, COUNTRY_NOTE } from '@/data/countries'
import { ISO_TO_REGIONS } from '@/data/regions'

export type GeoDetail = '110m' | '50m'

export interface Country {
  /** ISO numeric；少数争议地区为空串 */
  iso: string
  name: string
  zh: string
  note: string
  /** 多边形集合：polygon -> ring -> point -> [lng, lat]（经度已按环连续解绕） */
  polys: number[][][][]
  bbox: [number, number, number, number]
  /** 归属的文明区域 id */
  regions: string[]
  index: number
}

export interface GeoData {
  detail: GeoDetail
  countries: Country[]
  byIso: Record<string, Country>
}

const BASE = import.meta.env.BASE_URL
const geoUrl = (d: GeoDetail) => `${BASE}assets/geo/countries-${d}.json`.replace(/\/{2,}/g, '/')

/** 经纬度 -> 球面坐标（Three 的 SphereGeometry 约定：uv.x=0 在 -180°） */
export function latLngToV3(lat: number, lng: number, r: number, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lng + 180)
  return out.setFromSphericalCoords(r, phi, theta)
}

/** 球面坐标 -> 经纬度 */
export function v3ToLatLng(v: THREE.Vector3): { lat: number; lng: number } {
  const n = v.clone().normalize()
  const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(n.y, -1, 1)))
  let lng = THREE.MathUtils.radToDeg(Math.atan2(n.z, -n.x)) - 180
  lng = ((lng + 540) % 360) - 180
  return { lat, lng }
}

/** uv -> 经纬度（与 latLngToV3 互逆，用于纹理采样点定位） */
export function uvToLatLng(u: number, v: number): { lat: number; lng: number } {
  return { lat: 90 - v * 180, lng: u * 360 - 180 }
}

function unwrapRing(ring: number[][]): number[][] {
  const out: number[][] = [[ring[0][0], ring[0][1]]]
  let prev = ring[0][0]
  for (let i = 1; i < ring.length; i++) {
    let lng = ring[i][0]
    while (lng - prev > 180) lng -= 360
    while (lng - prev < -180) lng += 360
    out.push([lng, ring[i][1]])
    prev = lng
  }
  return out
}

function normalizePoly(rings: number[][][]): number[][][] {
  const ext = rings[0]
  let sum = 0
  for (const p of ext) sum += p[0]
  const shift = -360 * Math.round(sum / ext.length / 360)
  return rings.map(r => r.map(p => [p[0] + shift, p[1]]))
}

const cache = new Map<GeoDetail, Promise<GeoData>>()

export function loadGeo(detail: GeoDetail): Promise<GeoData> {
  let p = cache.get(detail)
  if (!p) {
    p = fetch(geoUrl(detail))
      .then(r => {
        if (!r.ok) throw new Error(`国界数据加载失败 ${detail}: ${r.status}`)
        return r.json() as Promise<Topology>
      })
      .then(topo => parseGeo(topo, detail))
    cache.set(detail, p)
  }
  return p
}

function parseGeo(topo: Topology, detail: GeoDetail): GeoData {
  const obj = topo.objects.countries as GeometryCollection<{ name?: string }>
  const fc = feature(topo, obj) as unknown as {
    features: { id?: string | number; properties?: { name?: string }; geometry: { type: string; coordinates: number[][][][] | number[][][] } }[]
  }
  const countries: Country[] = []
  const byIso: Record<string, Country> = {}

  for (const f of fc.features) {
    const rawId = f.id === undefined || f.id === null ? '' : String(f.id)
    const name = f.properties?.name ?? rawId
    const g = f.geometry
    const rawPolys: number[][][][] = g.type === 'Polygon'
      ? [g.coordinates as number[][][]]
      : g.type === 'MultiPolygon'
        ? g.coordinates as number[][][][]
        : []
    const polys: number[][][][] = []
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
    for (const rp of rawPolys) {
      if (!rp.length || rp[0].length < 4) continue
      const np = normalizePoly(rp.map(unwrapRing))
      polys.push(np)
      for (const ring of np) {
        for (const pt of ring) {
          if (pt[0] < minLng) minLng = pt[0]
          if (pt[0] > maxLng) maxLng = pt[0]
          if (pt[1] < minLat) minLat = pt[1]
          if (pt[1] > maxLat) maxLat = pt[1]
        }
      }
    }
    if (!polys.length) continue
    const iso = /^\d+$/.test(rawId) ? rawId : ''
    const country: Country = {
      iso,
      name,
      zh: COUNTRY_ZH[iso] ?? COUNTRY_ZH[name] ?? name,
      note: COUNTRY_NOTE[iso] ?? '',
      polys,
      bbox: [minLng, minLat, maxLng, maxLat],
      regions: iso ? (ISO_TO_REGIONS[iso] ?? []) : [],
      index: countries.length
    }
    countries.push(country)
    if (iso) byIso[iso] = country
  }
  return { detail, countries, byIso }
}

/**
 * 国界线（LineSegments）。
 * 每段沿球面细分，跨 ±180° 的环因为已经解绕所以不会横穿地球。
 */
export function buildBorders(geo: GeoData, radius: number, only?: (c: Country) => boolean): THREE.BufferGeometry {
  const pts: number[] = []
  const a = new THREE.Vector3(), b = new THREE.Vector3()
  const push = (v: THREE.Vector3) => { pts.push(v.x, v.y, v.z) }

  for (const c of geo.countries) {
    if (only && !only(c)) continue
    for (const poly of c.polys) {
      for (const ring of poly) {
        for (let i = 0; i < ring.length - 1; i++) {
          const [x0, y0] = ring[i]
          const [x1, y1] = ring[i + 1]
          const d = Math.hypot(x1 - x0, y1 - y0)
          if (d < 1e-9) continue
          const steps = Math.max(1, Math.min(28, Math.ceil(d / 1.2)))
          latLngToV3(y0, x0, radius, a)
          push(a)
          for (let s = 1; s <= steps; s++) {
            const t = s / steps
            latLngToV3(y0 + (y1 - y0) * t, x0 + (x1 - x0) * t, radius, b)
            push(b)
            if (s < steps) push(b)
          }
        }
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  g.computeBoundingSphere()
  return g
}

export type CountryPaint = (c: Country) => [number, number, number, number] | null

/**
 * 国家染色图集：一次扫描线栅格化（owner + coverage），
 * 之后每个时代只需按国家重上色，代价是 O(W*H) 的像素遍历，约 10ms。
 */
export class TintAtlas {
  readonly W: number
  readonly H: number
  readonly texture: THREE.CanvasTexture
  private owner: Uint16Array
  private cov: Uint8Array
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private img: ImageData
  private geo: GeoData
  private pal: Float32Array
  private valid: Uint8Array

  constructor(geo: GeoData, W = 2048, H = 1024) {
    this.geo = geo
    this.W = W
    this.H = H
    this.owner = new Uint16Array(W * H)
    this.cov = new Uint8Array(W * H)
    this.pal = new Float32Array(geo.countries.length * 4)
    this.valid = new Uint8Array(geo.countries.length)
    this.canvas = document.createElement('canvas')
    this.canvas.width = W
    this.canvas.height = H
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!
    this.img = this.ctx.createImageData(W, H)
    this.rasterize()
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.wrapS = THREE.RepeatWrapping
    this.texture.wrapT = THREE.ClampToEdgeWrapping
    this.texture.colorSpace = THREE.NoColorSpace
    this.texture.minFilter = THREE.LinearFilter
    this.texture.magFilter = THREE.LinearFilter
    this.texture.generateMipmaps = false
  }

  private rasterize() {
    const { W, H, owner, cov } = this
    const SUB = 2
    const rows = H * SUB
    // 用世代戳代替逐行 fill(0)：只清理真正写过的列
    const rowBuf = new Float32Array(W)
    const stamp = new Int32Array(W)
    const range = new Int32Array(2)
    const spans: number[] = []
    let gen = 0

    for (const c of this.geo.countries) {
      const [, bMinLat, , bMaxLat] = c.bbox
      const rowHi = Math.max(0, Math.floor((90 - bMaxLat) / 180 * rows))
      const rowLo = Math.min(rows - 1, Math.ceil((90 - bMinLat) / 180 * rows))
      if (rowLo < rowHi) continue

      // 按行分桶，避免每行都遍历全部边
      const buckets: number[][] = []
      for (let r = rowHi; r <= rowLo; r++) buckets.push([])
      const edges: number[][] = []
      for (const poly of c.polys) {
        for (const ring of poly) {
          for (let i = 0; i < ring.length - 1; i++) {
            const y0 = ring[i][1], y1 = ring[i + 1][1]
            const r0 = Math.max(rowHi, Math.floor((90 - Math.max(y0, y1)) / 180 * rows))
            const r1 = Math.min(rowLo, Math.ceil((90 - Math.min(y0, y1)) / 180 * rows))
            if (r1 < r0) continue
            const ei = edges.length
            edges.push([ring[i][0], y0, ring[i + 1][0], y1])
            for (let r = r0; r <= r1; r++) buckets[r - rowHi].push(ei)
          }
        }
      }

      for (let r = rowHi; r <= rowLo; r++) {
        const bucket = buckets[r - rowHi]
        if (!bucket.length) continue
        const lat = 90 - (r + 0.5) / rows * 180
        spans.length = 0
        for (let q = 0; q < bucket.length; q++) {
          const e = edges[bucket[q]]
          if ((e[1] > lat) === (e[3] > lat)) continue
          const t = (lat - e[1]) / (e[3] - e[1])
          spans.push(e[0] + t * (e[2] - e[0]))
        }
        if (spans.length < 2) continue
        spans.sort((p, q2) => p - q2)
        gen++
        range[0] = W; range[1] = -1
        for (let k = 0; k + 1 < spans.length; k += 2) {
          addSpan(rowBuf, stamp, gen, spans[k], spans[k + 1], W, range)
        }
        if (range[1] < range[0]) continue
        const py = Math.floor(r / SUB)
        if (py >= H) continue
        const base = py * W
        for (let x = range[0]; x <= range[1]; x++) {
          if (stamp[x] !== gen) continue
          const cur = Math.min(255, Math.round(rowBuf[x] / SUB * 255))
          if (cur <= 0) continue
          const p = base + x
          if (cur > cov[p]) { cov[p] = cur; owner[p] = c.index + 1 }
        }
      }
    }
  }

  /** 按时代重新上色（rgba 0-1），并刷新纹理 */
  compose(paint: CountryPaint) {
    const { W, H, owner, cov, img, pal, valid } = this
    const d = img.data
    valid.fill(0)
    for (const c of this.geo.countries) {
      const p = paint(c)
      if (!p) continue
      valid[c.index] = 1
      const o = c.index * 4
      pal[o] = p[0]; pal[o + 1] = p[1]; pal[o + 2] = p[2]; pal[o + 3] = p[3]
    }
    for (let i = 0, n = W * H; i < n; i++) {
      const o = owner[i]
      const j = i * 4
      if (o === 0 || !valid[o - 1]) { d[j + 3] = 0; continue }
      const k = (o - 1) * 4
      d[j] = Math.round(pal[k] * 255)
      d[j + 1] = Math.round(pal[k + 1] * 255)
      d[j + 2] = Math.round(pal[k + 2] * 255)
      const a = pal[k + 3] * (cov[i] / 255)
      d[j + 3] = a <= 0 ? 0 : a >= 1 ? 255 : Math.round(a * 255)
    }
    this.ctx.putImageData(img, 0, 0)
    this.texture.needsUpdate = true
  }

  countryAt(lat: number, lng: number): Country | null {
    if (lat > 90 || lat < -90) return null
    const x = Math.floor(((lng + 180) / 360) * this.W) % this.W
    const y = Math.floor((90 - lat) / 180 * this.H)
    if (y < 0 || y >= this.H || x < 0) return null
    const o = this.owner[y * this.W + x]
    return o === 0 ? null : this.geo.countries[o - 1] ?? null
  }

  /** 该像素的覆盖率（0-1），用于判断是否真的落在陆地上 */
  coverageAt(lat: number, lng: number): number {
    const x = Math.floor(((lng + 180) / 360) * this.W) % this.W
    const y = Math.floor((90 - lat) / 180 * this.H)
    if (y < 0 || y >= this.H || x < 0) return 0
    return this.cov[y * this.W + x] / 255
  }

  dispose() {
    this.texture.dispose()
  }
}

/** 把一段解绕后的经度跨度按 ±180 切开，累加到行缓冲（含端点半格权重） */
function addSpan(buf: Float32Array, stamp: Int32Array, gen: number, x0: number, x1: number, W: number, range: Int32Array) {
  if (!(x1 > x0)) return
  let k = Math.floor((x0 + 180) / 360)
  for (let guard = 0; guard < 4; guard++) {
    const lo = -180 + k * 360
    const hi = lo + 360
    const a = Math.max(x0, lo)
    const b = Math.min(x1, hi)
    if (b > a) {
      const ca = (a - lo) / 360 * W
      const cb = (b - lo) / 360 * W
      const i0 = Math.max(0, Math.floor(ca))
      const i1 = Math.min(W - 1, Math.ceil(cb))
      if (i1 >= i0) {
        if (i0 < range[0]) range[0] = i0
        if (i1 > range[1]) range[1] = i1
        for (let i = i0; i <= i1; i++) {
          if (stamp[i] !== gen) { stamp[i] = gen; buf[i] = 0 }
          const w = Math.min(i + 1, cb) - Math.max(i, ca)
          if (w > 0) buf[i] += w
        }
      }
    }
    if (hi >= x1) break
    k++
  }
}
