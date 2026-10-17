import * as THREE from 'three'
import { latLngToV3 } from './geo'

export interface ArcEnd { lat: number; lng: number }

export interface ArcSpec {
  from: ArcEnd
  to: ArcEnd
  /** 线条颜色（十六进制） */
  color: number
  /** true = 战争/冲突因果，用红色虚线 */
  war?: boolean
  /** 亮度倍率 */
  gain?: number
}

const DOT_VERT = /* glsl */`
attribute float aSize;
uniform float uPixelRatio;
varying vec3 vCol;
void main() {
  vCol = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (150.0 / max(-mv.z, 0.3));
}
`

const DOT_FRAG = /* glsl */`
varying vec3 vCol;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  float a = pow(1.0 - r, 2.4) + smoothstep(0.35, 0.0, r) * 0.9;
  gl_FragColor = vec4(vCol, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/**
 * 因果弧线层：科技依赖用实线，战争推动用红色虚线；
 * 每条弧线上有一个沿路径行走的光点，直观表达"A 传给了 B"。
 */
export class ArcLayer {
  readonly group = new THREE.Group()

  private solid: THREE.LineSegments | null = null
  private dashed: THREE.LineSegments | null = null
  private dots: THREE.Points | null = null
  private paths: THREE.Vector3[][] = []
  private dotMat: THREE.ShaderMaterial | null = null
  private speed = 0.16

  setArcs(specs: ArcSpec[], radius: number) {
    this.clear()
    if (!specs.length) return

    const solidPts: number[] = [], solidCol: number[] = []
    const warPts: number[] = [], warCol: number[] = []
    const dotPos: number[] = [], dotCol: number[] = [], dotSize: number[] = []
    const paths: THREE.Vector3[][] = []
    const c = new THREE.Color()

    for (const s of specs) {
      const pts = sampleArc(s.from, s.to, radius)
      if (pts.length < 2) continue
      const target = s.war ? warPts : solidPts
      const targetCol = s.war ? warCol : solidCol
      c.setHex(s.color)
      const gain = s.gain ?? 1
      for (let i = 0; i < pts.length - 1; i++) {
        const t0 = i / (pts.length - 1)
        const t1 = (i + 1) / (pts.length - 1)
        const w0 = endFade(t0) * gain
        const w1 = endFade(t1) * gain
        target.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z)
        targetCol.push(c.r * w0, c.g * w0, c.b * w0, c.r * w1, c.g * w1, c.b * w1)
      }
      if (!s.war) {
        paths.push(pts)
        dotPos.push(pts[0].x, pts[0].y, pts[0].z)
        dotCol.push(c.r * 1.6, c.g * 1.6, c.b * 1.6)
        dotSize.push(2.6 + gain * 1.2)
      }
    }

    if (solidPts.length) {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(solidPts, 3))
      g.setAttribute('color', new THREE.Float32BufferAttribute(solidCol, 3))
      this.solid = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true
      }))
      this.solid.renderOrder = 9
      this.group.add(this.solid)
    }

    if (warPts.length) {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(warPts, 3))
      g.setAttribute('color', new THREE.Float32BufferAttribute(warCol, 3))
      const m = new THREE.LineDashedMaterial({
        vertexColors: true, transparent: true, opacity: 0.92, dashSize: 0.022, gapSize: 0.016,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
      this.dashed = new THREE.LineSegments(g, m)
      this.dashed.computeLineDistances()
      this.dashed.renderOrder = 9
      this.group.add(this.dashed)
    }

    if (dotPos.length) {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(dotPos, 3))
      g.setAttribute('color', new THREE.Float32BufferAttribute(dotCol, 3))
      g.setAttribute('aSize', new THREE.Float32BufferAttribute(dotSize, 1))
      this.dotMat = new THREE.ShaderMaterial({
        uniforms: { uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) } },
        vertexShader: DOT_VERT,
        fragmentShader: DOT_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      })
      this.dots = new THREE.Points(g, this.dotMat)
      this.dots.frustumCulled = false
      this.dots.renderOrder = 13
      this.group.add(this.dots)
      this.paths = paths
    }
  }

  update(time: number) {
    if (!this.dots || !this.paths.length) return
    const pos = this.dots.geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < this.paths.length; i++) {
      const p = this.paths[i]
      const t = ((time * this.speed + i * 0.137) % 1 + 1) % 1
      const f = t * (p.length - 1)
      const i0 = Math.floor(f)
      const i1 = Math.min(p.length - 1, i0 + 1)
      const k = f - i0
      arr[i * 3] = p[i0].x + (p[i1].x - p[i0].x) * k
      arr[i * 3 + 1] = p[i0].y + (p[i1].y - p[i0].y) * k
      arr[i * 3 + 2] = p[i0].z + (p[i1].z - p[i0].z) * k
    }
    pos.needsUpdate = true
  }

  private clear() {
    for (const o of [this.solid, this.dashed, this.dots]) {
      if (!o) continue
      this.group.remove(o)
      o.geometry.dispose()
      ;(o.material as THREE.Material).dispose()
    }
    this.solid = null; this.dashed = null; this.dots = null; this.dotMat = null
    this.paths = []
  }

  dispose() { this.clear() }
}

function endFade(t: number): number {
  const a = smooth(t / 0.16)
  const b = smooth((1 - t) / 0.16)
  return 0.18 + 0.82 * Math.min(1, Math.min(a, b))
}

function smooth(x: number) { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }

/** 大圆插值 + 抛物抬升，返回球面上的采样点 */
export function sampleArc(from: ArcEnd, to: ArcEnd, radius: number): THREE.Vector3[] {
  const v0 = latLngToV3(from.lat, from.lng, 1)
  const v1 = latLngToV3(to.lat, to.lng, 1)
  let angle = v0.angleTo(v1)
  if (!isFinite(angle) || angle < 1e-4) return []
  if (angle > Math.PI - 1e-4) angle = Math.PI - 1e-4
  const lift = 0.03 + Math.min(0.30, angle * 0.15)
  const segs = Math.max(14, Math.min(96, Math.ceil(angle / 0.04)))
  const s0 = Math.sin(angle)
  const out: THREE.Vector3[] = []
  const tmp = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const a = Math.sin((1 - t) * angle) / s0
    const b = Math.sin(t * angle) / s0
    tmp.set(v0.x * a + v1.x * b, v0.y * a + v1.y * b, v0.z * a + v1.z * b)
    const r = radius * (1 + lift * Math.sin(Math.PI * t))
    out.push(tmp.normalize().multiplyScalar(r).clone())
  }
  return out
}
