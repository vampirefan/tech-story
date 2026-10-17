import * as THREE from 'three'
import { latLngToV3 } from './geo'

export interface PinSpec {
  id: string
  lat: number
  lng: number
  /** 分类色 */
  color: number
  /** 世界单位大小 */
  size: number
  /** 0=普通 1=悬停 2=选中 3=锁定 */
  state: number
  phase: number
}

const MARKER_VERT = /* glsl */`
attribute float aSize;
attribute float aPhase;
attribute float aState;
uniform float uTime;
varying vec2 vP;
varying vec3 vCol;
varying float vState;
varying float vFade;
varying float vSpin;
void main() {
  vP = position.xy;
  vState = aState;
  vSpin = uTime * 0.55 + aPhase * 6.2831;
  #ifdef USE_INSTANCING_COLOR
    vCol = instanceColor;
  #else
    vCol = vec3(1.0);
  #endif
  vec4 anchor = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec3 nrm = normalize(mat3(modelMatrix) * (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz);
  vec3 toCam = normalize(cameraPosition - anchor.xyz);
  vFade = smoothstep(-0.10, 0.34, dot(nrm, toCam));
  vec4 mv = viewMatrix * anchor;
  float pulse = 1.0 + 0.11 * sin(uTime * 2.1 + aPhase * 6.2831);
  float boost = aState > 1.5 ? 1.55 : (aState > 0.5 ? 1.26 : 1.0);
  float s = aSize * pulse * boost * pow(max(-mv.z, 0.25) / 3.0, 0.55);
  mv.xy += position.xy * s;
  gl_Position = projectionMatrix * mv;
}
`

const MARKER_FRAG = /* glsl */`
uniform float uTime;
varying vec2 vP;
varying vec3 vCol;
varying float vState;
varying float vFade;
varying float vSpin;
void main() {
  float r = length(vP) * 2.0;
  if (r > 1.0) discard;
  float glow = exp(-r * r * 7.0);
  float ring = smoothstep(0.075, 0.0, abs(r - 0.42));
  float core = smoothstep(0.30, 0.0, r);
  // 重要节点：旋转的四段刻度环，像游戏里的目标标记
  float ang = atan(vP.y, vP.x) + vSpin;
  float tick = smoothstep(0.55, 1.0, abs(sin(ang * 2.0))) * smoothstep(0.10, 0.0, abs(r - 0.74));
  float bracket = vState > 0.5 ? tick : tick * 0.25;

  // 暗底 + 亮环：加色混合在明亮地表上会消失，改用正常混合保证任何背景都有对比度
  float back = smoothstep(1.0, 0.35, r) * 0.55;
  float bright = clamp(ring * 1.15 + core * 1.3 + bracket * 0.9 + glow * 0.35, 0.0, 1.6);
  vec3 c = mix(vec3(0.015, 0.035, 0.075), vCol, clamp(bright, 0.0, 1.0));
  c += vCol * glow * 0.45 + vec3(1.0) * core * 0.55;
  if (vState > 2.5) {
    c = mix(c, vec3(0.45, 0.52, 0.62), 0.72);
    bright *= 0.5; back *= 0.6;
  } else if (vState > 1.5) {
    c = mix(c, vec3(1.0), 0.35);
    bright *= 1.35;
  } else if (vState > 0.5) {
    c = mix(c, vec3(1.0), 0.15);
    bright *= 1.15;
  }
  float a = clamp(max(back, bright), 0.0, 1.0) * vFade;
  if (a < 0.004) discard;
  gl_FragColor = vec4(c, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const BEAM_VERT = /* glsl */`
attribute float aPhase;
attribute float aState;
uniform float uTime;
varying float vY;
varying vec3 vCol;
varying float vFade;
varying float vA;
void main() {
  vY = uv.y;
  #ifdef USE_INSTANCING_COLOR
    vCol = instanceColor;
  #else
    vCol = vec3(1.0);
  #endif
  vec4 origin = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec3 nrm = normalize(mat3(modelMatrix) * origin.xyz);
  vec4 anchor = modelMatrix * instanceMatrix * vec4(0.0, -0.5, 0.0, 1.0);
  vFade = smoothstep(-0.05, 0.40, dot(nrm, normalize(cameraPosition - anchor.xyz)));
  vA = aState > 2.5 ? 0.22 : (aState > 0.5 ? 1.0 : 0.85);
  vec4 wp = modelMatrix * instanceMatrix * vec4(position.x, position.y + sin(uTime * 1.4 + aPhase * 6.2831) * 0.004, position.z, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const BEAM_FRAG = /* glsl */`
varying float vY;
varying vec3 vCol;
varying float vFade;
varying float vA;
uniform float uTime;
void main() {
  float f = pow(1.0 - clamp(vY, 0.0, 1.0), 1.7);
  float band = 0.62 + 0.38 * sin(vY * 26.0 - uTime * 3.2);
  float a = clamp(f * band * vA * vFade, 0.0, 1.0);
  if (a < 0.004) discard;
  vec3 c = vCol * (0.85 + 0.6 * band) + vec3(1.0) * f * f * 0.22;
  gl_FragColor = vec4(c, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const PING_VERT = /* glsl */`
attribute float aPhase2;
uniform float uTime;
varying vec2 vP;
varying vec3 vCol;
varying float vFade;
varying float vK;
void main() {
  vP = position.xy;
  #ifdef USE_INSTANCING_COLOR
    vCol = instanceColor;
  #else
    vCol = vec3(1.0);
  #endif
  vec3 base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 nrm = normalize(base);
  vFade = smoothstep(-0.05, 0.35, dot(normalize(mat3(modelMatrix) * nrm), normalize(cameraPosition - (modelMatrix * vec4(base, 1.0)).xyz)));
  float k = fract(uTime * 0.30 + aPhase2);
  vK = k;
  float s = 0.55 + k * 2.6;
  vec3 t1 = normalize(cross(abs(nrm.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), nrm));
  vec3 t2 = cross(nrm, t1);
  vec3 p = base + (t1 * position.x + t2 * position.y) * s * 0.06;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const PING_FRAG = /* glsl */`
varying vec2 vP;
varying vec3 vCol;
varying float vFade;
varying float vK;
void main() {
  float r = length(vP) * 2.0;
  float ring = smoothstep(0.18, 0.0, abs(r - 0.86));
  float a = ring * (1.0 - vK) * (0.25 + 0.55 * vK) * vFade;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const dummy = new THREE.Object3D()
const UP = new THREE.Vector3(0, 1, 0)
const pickV1 = new THREE.Vector3()
const pickV2 = new THREE.Vector3()

/**
 * 科技节点标记层：全息广告牌 + 光柱 + 地面雷达脉冲，全部用 InstancedMesh，
 * 146 个节点也只有 3 次 draw call。
 */
export class PinLayer {
  readonly group = new THREE.Group()
  readonly radius: number

  private specs: PinSpec[] = []
  private marks: THREE.InstancedMesh
  private beams: THREE.InstancedMesh
  private pings: THREE.InstancedMesh
  private markU: Record<string, THREE.IUniform>
  private beamU: Record<string, THREE.IUniform>
  private pingU: Record<string, THREE.IUniform>

  /** 每帧投影结果：x, y（CSS 像素）, 可见性 */
  screen: Float32Array = new Float32Array(0)
  private local: THREE.Vector3[] = []
  private world = new THREE.Vector3()

  constructor(radius = 1, capacity = 220) {
    this.radius = radius
    const plane = new THREE.PlaneGeometry(1, 1)
    this.markU = { uTime: { value: 0 } }
    this.marks = new THREE.InstancedMesh(plane, new THREE.ShaderMaterial({
      uniforms: this.markU,
      vertexShader: MARKER_VERT,
      fragmentShader: MARKER_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending
    }), capacity)
    this.marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.marks.frustumCulled = false
    this.marks.renderOrder = 12

    const cyl = new THREE.CylinderGeometry(0.008, 0.016, 1, 8, 1, true)
    this.beamU = { uTime: { value: 0 } }
    this.beams = new THREE.InstancedMesh(cyl, new THREE.ShaderMaterial({
      uniforms: this.beamU,
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    }), capacity)
    this.beams.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.beams.frustumCulled = false
    this.beams.renderOrder = 11

    const ring = new THREE.CircleGeometry(0.5, 40)
    this.pingU = { uTime: { value: 0 } }
    this.pings = new THREE.InstancedMesh(ring, new THREE.ShaderMaterial({
      uniforms: this.pingU,
      vertexShader: PING_VERT,
      fragmentShader: PING_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }), capacity)
    this.pings.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.pings.frustumCulled = false
    this.pings.renderOrder = 10

    this.group.add(this.pings, this.beams, this.marks)
    for (const m of [this.marks, this.beams, this.pings]) {
      m.count = 0
      // 预先挂上 instanceColor，避免运行时切换导致着色器程序重编译
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3)
      m.instanceColor.setUsage(THREE.DynamicDrawUsage)
    }
  }

  private attr(mesh: THREE.InstancedMesh, name: string, data: Float32Array) {
    mesh.geometry.setAttribute(name, new THREE.InstancedBufferAttribute(data, 1))
  }

  setPins(specs: PinSpec[]) {
    this.specs = specs
    const n = specs.length
    this.local = specs.map(s => latLngToV3(s.lat, s.lng, this.radius * 1.004))
    this.screen = new Float32Array(n * 3)
    if (n === 0) { this.marks.count = 0; this.beams.count = 0; this.pings.count = 0; return }

    const aSize = new Float32Array(n), aPhase = new Float32Array(n), aState = new Float32Array(n)
    const colM = new Float32Array(n * 3), colB = new Float32Array(n * 3), colP = new Float32Array(n * 3)
    const c = new THREE.Color()

    for (let i = 0; i < n; i++) {
      const s = specs[i]
      const p = this.local[i]
      aSize[i] = s.size
      aPhase[i] = s.phase
      aState[i] = s.state
      c.setHex(s.color)
      colM[i * 3] = c.r; colM[i * 3 + 1] = c.g; colM[i * 3 + 2] = c.b
      colB[i * 3] = c.r * 0.85; colB[i * 3 + 1] = c.g * 0.85; colB[i * 3 + 2] = c.b * 0.85
      colP[i * 3] = c.r; colP[i * 3 + 1] = c.g; colP[i * 3 + 2] = c.b

      // 广告牌：位置即锚点，朝向由着色器在视空间展开
      dummy.position.copy(p)
      dummy.scale.setScalar(1)
      dummy.quaternion.identity()
      dummy.updateMatrix()
      this.marks.setMatrixAt(i, dummy.matrix)

      // 光柱：沿法线向外
      dummy.position.copy(p).addScaledVector(p.clone().normalize(), 0.058)
      dummy.quaternion.setFromUnitVectors(UP, p.clone().normalize())
      dummy.scale.set(1, 0.13, 1)
      dummy.updateMatrix()
      this.beams.setMatrixAt(i, dummy.matrix)

      // 地面脉冲环：贴在球面
      dummy.position.copy(p)
      dummy.quaternion.identity()
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      this.pings.setMatrixAt(i, dummy.matrix)
    }

    for (const [mesh, col] of [[this.marks, colM], [this.beams, colB], [this.pings, colP]] as const) {
      const ic = mesh.instanceColor!
      ;(ic.array as Float32Array).set(col)
      ic.needsUpdate = true
      this.attr(mesh, 'aPhase', aPhase)
      this.attr(mesh, 'aState', aState)
      mesh.instanceMatrix.needsUpdate = true
    }
    this.attr(this.marks, 'aSize', aSize)
    this.attr(this.pings, 'aPhase2', aPhase)
    this.marks.count = n
    this.beams.count = n
    this.pings.count = n
  }

  /** 只更新状态（0=普通 1=悬停 2=选中 3=锁定），不重建实例 */
  updateStatesFor(ids: { id: string; state: number }[]) {
    const idx = new Map(this.specs.map((s, i) => [s.id, i]))
    const aM = this.marks.geometry.getAttribute('aState') as THREE.InstancedBufferAttribute | undefined
    const aB = this.beams.geometry.getAttribute('aState') as THREE.InstancedBufferAttribute | undefined
    if (!aM || !aB) return
    const arrM = aM.array as Float32Array
    const arrB = aB.array as Float32Array
    for (const { id, state } of ids) {
      const i = idx.get(id)
      if (i === undefined) continue
      arrM[i] = state
      arrB[i] = state
    }
    aM.needsUpdate = true
    aB.needsUpdate = true
  }

  setColor(id: string, hex: number) {
    const i = this.specs.findIndex(s => s.id === id)
    if (i < 0 || !this.marks.instanceColor) return
    const c = new THREE.Color(hex)
    this.marks.instanceColor.setXYZ(i, c.r, c.g, c.b)
    this.marks.instanceColor.needsUpdate = true
  }

  /** 每帧：推进时间 + 把所有标记投影到屏幕坐标 */
  update(time: number, camera: THREE.Camera, vw: number, vh: number) {
    this.markU.uTime.value = time
    this.beamU.uTime.value = time
    this.pingU.uTime.value = time
    this.group.updateMatrixWorld()
    const m = this.group.matrixWorld
    for (let i = 0; i < this.local.length; i++) {
      this.world.copy(this.local[i]).applyMatrix4(m).project(camera)
      const vis = this.world.z < 1 ? 1 : 0
      this.screen[i * 3] = (this.world.x * 0.5 + 0.5) * vw
      this.screen[i * 3 + 1] = (-this.world.y * 0.5 + 0.5) * vh
      this.screen[i * 3 + 2] = vis
    }
  }

  /** 屏幕拾取：返回最近且在可见半球内的标记 */
  pick(px: number, py: number, camera: THREE.PerspectiveCamera, maxDist = 30): { index: number; spec: PinSpec } | null {
    let best = -1, bd = maxDist * maxDist
    for (let i = 0; i < this.local.length; i++) {
      if (this.screen[i * 3 + 2] < 0.5) continue
      if (this.facing(i, camera) < 0.06) continue
      const dx = this.screen[i * 3] - px
      const dy = this.screen[i * 3 + 1] - py
      const d = dx * dx + dy * dy
      if (d < bd) { bd = d; best = i }
    }
    return best < 0 ? null : { index: best, spec: this.specs[best] }
  }

  get count() { return this.specs.length }
  get all() { return this.specs }
  /** 每个标记在 group 局部空间中的位置（与 all 同序） */
  get positions(): readonly THREE.Vector3[] { return this.local }

  /** 标记的世界坐标（写入 out） */
  worldAt(i: number, out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.local[i]).applyMatrix4(this.group.matrixWorld)
  }

  /** 标记法线与指向相机方向的点积，<0 表示在地球背面 */
  facing(i: number, camera: THREE.PerspectiveCamera): number {
    this.worldAt(i, pickV1)
    pickV2.copy(camera.position).sub(pickV1).normalize()
    return pickV1.normalize().dot(pickV2)
  }

  dispose() {
    this.marks.geometry.dispose(); (this.marks.material as THREE.Material).dispose()
    this.beams.geometry.dispose(); (this.beams.material as THREE.Material).dispose()
    this.pings.geometry.dispose(); (this.pings.material as THREE.Material).dispose()
  }
}
