import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import gsap from 'gsap'
import { loadEarthTextures, type EarthTextures } from './textures'
import { createEarthUniforms, createEarthMaterial, createCloudMaterial, type EarthUniforms } from './earthShader'
import { createAtmosphere, createStarfield, createSkyDome, type AtmosphereHandle } from './atmosphere'
import { loadGeo, buildBorders, TintAtlas, latLngToV3, v3ToLatLng, type Country, type GeoData, type GeoDetail } from './geo'
import { PinLayer, type PinSpec } from './pins'
import { ArcLayer, type ArcSpec } from './arcs'
import { CATEGORY_HEX } from '@/data/categories'
import { ERA_MAP, yearToT } from '@/data/eras'
import { REGION_MAP, topRegions } from '@/data/regions'
import type { EraId, Settings, TechNode } from '@/types'

/** 地球半径（世界单位） */
export const R = 1

export interface GlobeCallbacks {
  onProgress?: (p: number, label: string) => void
  onHoverNode?: (id: string | null, x: number, y: number) => void
  onClickNode?: (id: string | null) => void
  onHoverCountry?: (c: Country | null, x: number, y: number) => void
  onDistance?: (d: number) => void
  onReady?: () => void
}

/**
 * 等一帧。某些环境（无头 Chrome、隐藏窗口）不派发 BeginFrame，
 * rAF 会永远挂起，因此用定时器兜底，保证初始化流程一定能走完。
 */
const frame = () => new Promise<void>((res) => {
  let done = false
  const fin = () => { if (!done) { done = true; res() } }
  window.requestAnimationFrame(fin)
  window.setTimeout(fin, 120)
})

function radialTexture(): THREE.CanvasTexture {
  const S = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.28, 'rgba(255,255,255,0.40)')
  g.addColorStop(0.62, 'rgba(255,255,255,0.09)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const sV1 = new THREE.Vector3()
const sM1 = new THREE.Matrix4()
const sNdc = new THREE.Vector2()

export class GlobeEngine {
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly renderer: THREE.WebGLRenderer
  readonly controls: OrbitControls
  readonly pins = new PinLayer(R * 1.002, 240)
  readonly arcs = new ArcLayer()

  private canvas: HTMLCanvasElement
  private cb: GlobeCallbacks
  private earthGroup = new THREE.Group()
  private clouds: THREE.Mesh | null = null
  private uniforms: EarthUniforms | null = null
  private atmo: AtmosphereHandle | null = null
  private stars: THREE.Points | null = null
  private regionGlows: THREE.Sprite[] = []
  private glowTex: THREE.Texture | null = null

  private bordersDim: THREE.LineSegments | null = null
  private bordersHot: THREE.LineSegments | null = null
  private geo110: GeoData | null = null
  private geo50: GeoData | null = null
  private atlas: TintAtlas | null = null
  private tex: EarthTextures | null = null

  private composer: EffectComposer | null = null
  private bloom: UnrealBloomPass | null = null
  private raf = 0
  private frameTimer = 0
  private clock = new THREE.Clock()
  private ro: ResizeObserver | null = null
  private disposed = false
  private rebuildTimer = 0

  private settings: Settings
  private eraId: EraId | null = null
  private year = -2500000
  private nodes: TechNode[] = []
  private nodeById = new Map<string, TechNode>()
  private hoveredId: string | null = null
  private selectedId: string | null = null
  private detail: GeoDetail = '110m'
  private userActive = false
  private flying = false
  private flyTween: gsap.core.Tween | null = null

  private spin = 0
  private autoSpin = 0.010
  private sunTheta = Math.PI * 0.34

  private pointerNdc = new THREE.Vector2(-10, -10)
  private pointerPx = { x: 0, y: 0 }
  private lastSentPx = { x: -1, y: -1 }
  private pointerInside = false
  private raycaster = new THREE.Raycaster()
  private pickSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), R * 1.03)
  private hitPoint = new THREE.Vector3()
  private lastHoverSent: string | null = null
  private lastCountry: Country | null = null

  private labelLayer: HTMLElement | null = null
  private labels: HTMLElement[] = []
  private labelKey: (string | null)[] = []
  private vw = 1
  private vh = 1

  constructor(canvas: HTMLCanvasElement, settings: Settings, cb: GlobeCallbacks = {}) {
    this.canvas = canvas
    this.cb = cb
    this.settings = { ...settings }

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false
    })
    this.renderer.setClearColor(0x02040c, 1)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setPixelRatio(this.pixelRatioFor(settings.quality))

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.02, 1400)
    this.camera.position.setFromSphericalCoords(3.1, THREE.MathUtils.degToRad(70), 0.45)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.065
    this.controls.rotateSpeed = 0.42
    this.controls.zoomSpeed = 0.75
    this.controls.enablePan = false
    this.controls.minDistance = R * 1.22
    this.controls.maxDistance = R * 7.5
    this.controls.target.set(0, 0, 0)
    this.controls.addEventListener('start', () => { this.userActive = true })
    this.controls.addEventListener('end', () => { window.setTimeout(() => { this.userActive = false }, 1500) })
    canvas.addEventListener('webglcontextlost', this.onCtxLost, false)
    canvas.addEventListener('webglcontextrestored', this.onCtxRestored, false)

    this.scene.add(this.earthGroup)
    this.earthGroup.add(this.pins.group, this.arcs.group)
  }

  /* ══════════════ 初始化 ══════════════ */

  async init(): Promise<void> {
    const P = (p: number, label: string) => this.cb.onProgress?.(p, label)

    P(0.04, '读取国界数据…')
    await frame()
    this.geo110 = await loadGeo('110m')

    P(0.12, '生成地表纹理…')
    await frame()
    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
    this.tex = await loadEarthTextures(aniso, (p, label) => P(0.12 + p * 0.40, label))
    if (this.disposed) return

    P(0.56, '绘制国家版图…')
    await frame()
    const res = this.settings.quality === 'low' ? 1024 : 2048
    this.atlas = new TintAtlas(this.geo110, res, res / 2)
    if (this.disposed) return

    P(0.76, '编织国界与经纬…')
    await frame()
    this.buildEarth()

    P(0.86, '点亮大气与星空…')
    await frame()
    this.buildSky()
    this.resize()
    this.buildComposer()

    P(0.94, '布置科技节点…')
    await frame()
    this.glowTex = radialTexture()
    this.applyEra(this.eraId ?? 'stone', true)
    this.setNodes(this.nodes)
    // 首帧面向旧大陆：非洲-阿拉伯-亚洲同框，石器时代突破点尽量都在正面
    this.place(24, 60, 3.3)

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(this.canvas.parentElement ?? this.canvas)
    this.bindPointer()

    P(1, '地球就绪')
    this.cb.onReady?.()
    this.clock.start()
    this.loop()
    window.setTimeout(() => { void this.preload50m() }, 1400)
  }

  private async preload50m() {
    if (this.disposed || this.geo50) return
    try {
      const g = await loadGeo('50m')
      if (this.disposed) return
      this.geo50 = g
      if (this.detail === '50m') this.rebuildBorders()
    } catch { /* 高精度国界是可选增强，失败不影响主流程 */ }
  }

  private buildEarth() {
    const u = createEarthUniforms(this.tex!, this.atlas!.texture)
    this.uniforms = u

    // phiStart=π/2：把贴图 u=0（经度 -180）对齐到矢量层的 -180° 方位，否则海陆掩膜会偏 90°
    const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 168, 112, Math.PI / 2, Math.PI * 2, 0, Math.PI), createEarthMaterial(u))
    earth.renderOrder = 0
    this.earthGroup.add(earth)

    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.010, 128, 84), createCloudMaterial(u, this.tex!.clouds))
    this.clouds.renderOrder = 2
    this.earthGroup.add(this.clouds)

    this.bordersDim = new THREE.LineSegments(buildBorders(this.geo110!, R * 1.0025), new THREE.LineBasicMaterial({
      color: new THREE.Color('#7fd8ff'), transparent: true,
      opacity: this.settings.borderDensity === 'full' ? 0.34 : 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false
    }))
    this.bordersDim.renderOrder = 3
    this.earthGroup.add(this.bordersDim)
  }

  private buildSky() {
    this.scene.add(createSkyDome(this.tex!.sky, 480))
    this.stars = createStarfield(this.settings.quality === 'low' ? 1600 : 5200, 400)
    this.scene.add(this.stars)
    this.atmo = createAtmosphere(R, this.uniforms!.uSunDir)
    this.scene.add(this.atmo.mesh)
  }

  private buildComposer() {
    const dpr = this.renderer.getPixelRatio()
    // 后处理链路里靠 MSAA 采样数抗锯齿（renderer.antialias 对 RenderTarget 无效）
    const samples = this.settings.quality === 'high' ? 4 : this.settings.quality === 'medium' ? 2 : 0
    const rt = new THREE.WebGLRenderTarget(
      Math.max(1, Math.floor(this.vw * dpr)),
      Math.max(1, Math.floor(this.vh * dpr)),
      { type: THREE.HalfFloatType, samples }
    )
    const composer = new EffectComposer(this.renderer, rt)
    composer.addPass(new RenderPass(this.scene, this.camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(this.vw, this.vh), 0.42, 0.55, 1.0)
    bloom.enabled = this.settings.bloom
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    this.composer = composer
    this.bloom = bloom
  }

  /* ══════════════ 交互绑定 ══════════════ */

  private onMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect()
    this.pointerPx.x = e.clientX - r.left
    this.pointerPx.y = e.clientY - r.top
    this.pointerNdc.set((this.pointerPx.x / Math.max(1, r.width)) * 2 - 1, -(this.pointerPx.y / Math.max(1, r.height)) * 2 + 1)
    this.pointerInside = true
  }
  private onLeave = () => {
    this.pointerInside = false
    this.lastHoverSent = null
    this.lastCountry = null
    this.cb.onHoverNode?.(null, 0, 0)
    this.cb.onHoverCountry?.(null, 0, 0)
    this.canvas.style.cursor = ''
  }
  private onClick = () => {
    const hit = this.pins.pick(this.pointerPx.x, this.pointerPx.y, this.camera, 36)
    this.cb.onClickNode?.(hit ? hit.spec.id : null)
  }

  private bindPointer() {
    this.canvas.addEventListener('pointermove', this.onMove)
    this.canvas.addEventListener('pointerleave', this.onLeave)
    this.canvas.addEventListener('click', this.onClick)
  }

  setLabelLayer(el: HTMLElement | null) {
    this.labelLayer = el
    if (!el) {
      for (const n of this.labels) n.remove()
      this.labels = []
      this.labelKey = []
      return
    }
    el.textContent = ''
    this.labels = []
    this.labelKey = []
  }

  /* ══════════════ 设置项 ══════════════ */

  setSettings(s: Settings) {
    const qChanged = s.quality !== this.settings.quality
    const dpr = this.pixelRatioFor(s.quality)
    const dprChanged = dpr !== this.renderer.getPixelRatio()
    const densityChanged = s.borderDensity !== this.settings.borderDensity
    this.settings = { ...s }
    if (this.bloom) this.bloom.enabled = s.bloom
    if (this.bordersDim) (this.bordersDim.material as THREE.LineBasicMaterial).opacity = s.borderDensity === 'full' ? 0.34 : 0.16
    if (densityChanged && s.borderDensity === 'full') this.setDetail('50m')
    if (densityChanged && s.borderDensity === 'era') this.setDetail('110m')
    if (qChanged || dprChanged) {
      this.renderer.setPixelRatio(dpr)
      if (qChanged) {
        this.composer?.dispose()
        this.composer = null
        this.bloom = null
        if (this.stars) (this.stars.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = dpr
      }
      this.resize()
      if (qChanged) this.buildComposer()
    }
  }

  private pixelRatioFor(q: Settings['quality']) {
    const dpr = window.devicePixelRatio || 1
    return q === 'low' ? 1 : q === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 2)
  }

  setDetail(d: GeoDetail) {
    if (d === this.detail) return
    this.detail = d
    if (d === '50m' && !this.geo50) { void this.preload50m(); return }
    this.rebuildBorders()
  }

  /* ══════════════ 数据驱动更新 ══════════════ */

  /** 时间游标：驱动夜色灯光强度与云的浓度 */
  setYear(year: number) {
    this.year = year
    const t = yearToT(year)
    if (this.uniforms) {
      this.uniforms.uNightBoost.value = 0.55 + t * 3.4
      this.uniforms.uSaturation.value = 1.06 + t * 0.12
    }
    if (this.clouds) (this.clouds.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.36 - t * 0.06
  }

  /** 时代切换：重画国家染色、高亮国界、区域光晕 */
  setEra(era: EraId) {
    if (era === this.eraId) return
    this.applyEra(era, false)
  }

  private applyEra(era: EraId, force: boolean) {
    if (!force && era === this.eraId) return
    this.eraId = era
    if (!this.atlas) return
    this.paintEra(era)
    window.clearTimeout(this.rebuildTimer)
    this.rebuildTimer = window.setTimeout(() => {
      if (this.disposed) return
      this.rebuildBorders()
      this.setRegionGlows(era)
    }, 80)
  }

  private paintEra(era: EraId) {
    const e = ERA_MAP[era]
    const base = new THREE.Color(e.color)
    const hot = new THREE.Color(e.accent)
    const dim = new THREE.Color('#2b4a7a')
    const mix = new THREE.Color()
    this.atlas!.compose((c) => {
      let act = 0
      for (const rid of c.regions) {
        const v = REGION_MAP[rid]?.timeline[era] ?? 0
        if (v > act) act = v
      }
      if (act <= 0.001) return [dim.r, dim.g, dim.b, 0.055]
      mix.copy(base).lerp(hot, Math.pow(act, 1.25))
      return [mix.r, mix.g, mix.b, 0.14 + 0.56 * act]
    })
    if (this.uniforms) this.uniforms.uAtmoColor.value.set(e.accent).lerp(new THREE.Color('#4aa8ff'), 0.6)
  }

  private activeSet(era: EraId): Set<string> {
    const s = new Set<string>()
    for (const c of this.currentGeo()?.countries ?? []) {
      for (const rid of c.regions) {
        if ((REGION_MAP[rid]?.timeline[era] ?? 0) > 0.001) { s.add(c.iso || c.name); break }
      }
    }
    return s
  }

  private currentGeo(): GeoData | null {
    return this.detail === '50m' ? (this.geo50 ?? this.geo110) : this.geo110
  }

  private rebuildBorders() {
    const geo = this.currentGeo()
    if (!geo) return
    const active = this.activeSet(this.eraId ?? 'stone')

    if (this.bordersHot) {
      this.earthGroup.remove(this.bordersHot)
      this.bordersHot.geometry.dispose()
      ;(this.bordersHot.material as THREE.Material).dispose()
      this.bordersHot = null
    }
    const e = ERA_MAP[this.eraId ?? 'stone']
    this.bordersHot = new THREE.LineSegments(
      buildBorders(geo, R * 1.0042, (c) => active.has(c.iso || c.name)),
      new THREE.LineBasicMaterial({
        color: new THREE.Color(e.accent), transparent: true, opacity: 0.68,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    )
    this.bordersHot.renderOrder = 4
    this.earthGroup.add(this.bordersHot)

    if (this.bordersDim) {
      this.bordersDim.geometry.dispose()
      this.bordersDim.geometry = buildBorders(geo, R * 1.0025)
    }
  }

  /** 当前时代领先区域的地表光晕 */
  private setRegionGlows(era: EraId) {
    for (const s of this.regionGlows) { this.earthGroup.remove(s); s.material.dispose() }
    this.regionGlows = []
    if (!this.glowTex) return
    const e = ERA_MAP[era]
    for (const { region, v } of topRegions(era, 6)) {
      const mat = new THREE.SpriteMaterial({
        map: this.glowTex,
        color: new THREE.Color(v >= 0.9 ? e.accent : e.color),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.18 + v * 0.46
      })
      const sp = new THREE.Sprite(mat)
      sp.position.copy(latLngToV3(region.lat, region.lng, R * 1.014))
      const s = 0.26 + v * 0.56
      sp.scale.set(s, s, 1)
      sp.renderOrder = 6
      this.earthGroup.add(sp)
      this.regionGlows.push(sp)
    }
  }

  /** 当前时刻应显示的科技节点 */
  setNodes(nodes: TechNode[], available?: { isAvailable(id: string): boolean }) {
    this.nodes = nodes
    this.nodeById = new Map(nodes.map(n => [n.id, n]))
    const specs: PinSpec[] = nodes.map((n, i) => ({
      id: n.id,
      lat: n.geo.lat,
      lng: n.geo.lng,
      color: CATEGORY_HEX[n.category] ?? 0x8fd0ff,
      size: 0.056 + n.impact * 0.013 + (n.chinaLink >= 2 ? 0.009 : 0),
      state: available && !available.isAvailable(n.id) ? 3 : (n.id === this.selectedId ? 2 : n.id === this.hoveredId ? 1 : 0),
      phase: (i * 0.6180339887) % 1
    }))
    this.pins.setPins(specs)
  }

  /** 高亮一个节点的因果弧线 */
  showArcsFor(node: TechNode | null, prereq: TechNode[], unlocks: TechNode[], war: TechNode[]) {
    const specs: ArcSpec[] = []
    if (node) {
      for (const p of prereq) {
        specs.push({ from: { lat: p.geo.lat, lng: p.geo.lng }, to: { lat: node.geo.lat, lng: node.geo.lng }, color: 0x63d8ff, gain: 1.3 })
      }
      for (const u of unlocks) {
        specs.push({ from: { lat: node.geo.lat, lng: node.geo.lng }, to: { lat: u.geo.lat, lng: u.geo.lng }, color: 0xffc46b, gain: 0.95 })
      }
      for (const w of war) {
        specs.push({ from: { lat: w.geo.lat, lng: w.geo.lng }, to: { lat: node.geo.lat, lng: node.geo.lng }, color: 0xff5f56, war: true, gain: 1.15 })
      }
    }
    this.arcs.setArcs(specs, R * 1.005)
  }

  setHovered(id: string | null) {
    if (id === this.hoveredId) return
    const prev = this.hoveredId
    this.hoveredId = id
    const u: { id: string; state: number }[] = []
    if (prev) u.push({ id: prev, state: prev === this.selectedId ? 2 : 0 })
    if (id) u.push({ id, state: 1 })
    this.pins.updateStatesFor(u)
  }

  setSelected(id: string | null) {
    if (id === this.selectedId) return
    const prev = this.selectedId
    this.selectedId = id
    const u: { id: string; state: number }[] = []
    if (prev) u.push({ id: prev, state: prev === this.hoveredId ? 1 : 0 })
    if (id) u.push({ id, state: 2 })
    this.pins.updateStatesFor(u)
  }

  /** 相机飞行：地球自转把目标转到正面，同时俯仰到目标纬度 */
  flyTo(lat: number, lng: number, dist = 2.3, duration = 1.45) {
    const theta = this.controls.getAzimuthalAngle()
    const d0 = latLngToV3(lat, lng, 1)
    const cur = this.earthGroup.rotation.y
    let dr = (theta - Math.atan2(d0.x, d0.z) - cur) % (Math.PI * 2)
    if (dr > Math.PI) dr -= Math.PI * 2
    if (dr < -Math.PI) dr += Math.PI * 2
    const proxy = {
      rotY: cur,
      phi: this.controls.getPolarAngle(),
      radius: this.camera.position.length()
    }
    const phiT = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(90 - lat), 0.24, Math.PI - 0.24)
    this.flying = true
    this.controls.enabled = false
    this.flyTween?.kill()
    this.flyTween = gsap.to(proxy, {
      rotY: cur + dr,
      phi: phiT,
      radius: THREE.MathUtils.clamp(dist, this.controls.minDistance, this.controls.maxDistance),
      duration,
      ease: 'power3.inOut',
      onUpdate: () => {
        this.earthGroup.rotation.y = proxy.rotY
        this.camera.position.setFromSphericalCoords(proxy.radius, proxy.phi, theta)
        this.camera.lookAt(0, 0, 0)
      },
      onComplete: () => {
        this.flying = false
        this.flyTween = null
        this.controls.enabled = true
        this.controls.update()
      }
    })
  }

  /** 无动画定位（首帧用） */
  place(lat: number, lng: number, dist = 3.1) {
    const theta = this.controls.getAzimuthalAngle()
    const d0 = latLngToV3(lat, lng, 1)
    this.earthGroup.rotation.y = theta - Math.atan2(d0.x, d0.z)
    const phi = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(90 - lat), 0.24, Math.PI - 0.24)
    this.camera.position.setFromSphericalCoords(dist, phi, theta)
    this.camera.lookAt(0, 0, 0)
    this.controls.update()
  }

  resize() {
    const parent = this.canvas.parentElement
    const w = Math.max(1, parent?.clientWidth ?? window.innerWidth)
    const h = Math.max(1, parent?.clientHeight ?? window.innerHeight)
    this.vw = w
    this.vh = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.composer?.setSize(w, h)
    this.bloom?.setSize(w, h)
  }

  /* ══════════════ 主循环 ══════════════ */

  /** rAF 为主；页面可见但合成器不产帧的环境（无头/嵌入）用定时器兜底 */
  private scheduleNext() {
    this.looping = true
    let fired = false
    const go = () => { if (!fired) { fired = true; this.loop() } }
    this.raf = window.requestAnimationFrame(go)
    this.frameTimer = document.hidden ? 0 : window.setTimeout(go, 90)
  }

  private loop = () => {
    if (this.disposed || this.ctxLost || this.paused) { this.looping = false; return }
    this.scheduleNext()
    const dt = Math.min(0.05, this.clock.getDelta())
    const time = this.clock.elapsedTime

    const wantSpin = !this.flying && !this.userActive && !this.selectedId
    this.spin = THREE.MathUtils.damp(this.spin, wantSpin ? this.autoSpin : 0, 2.0, dt)
    if (Math.abs(this.spin) > 1e-5) this.earthGroup.rotation.y += this.spin * dt

    this.updateSun(dt)
    this.earthGroup.updateMatrixWorld()
    if (this.clouds) this.clouds.rotation.y += dt * 0.0042
    if (this.stars) (this.stars.material as THREE.ShaderMaterial).uniforms.uTime.value = time

    this.pins.update(time, this.camera, this.vw, this.vh)
    this.arcs.update(time)
    this.hoverPass()
    this.updateLabels()

    if (this.composer) this.composer.render(dt)
    else this.renderer.render(this.scene, this.camera)
    this.cb.onDistance?.(this.camera.position.length())
  }

  /* ── WebGL 上下文丢失自愈：GPU 被系统回收时停loop等恢复，而不是留一屏黑 ── */
  private ctxLost = false
  private onCtxLost = (e: Event) => {
    e.preventDefault()
    this.ctxLost = true
    window.cancelAnimationFrame(this.raf)
    console.warn('[globe] WebGL 上下文丢失，等待恢复…')
  }
  private onCtxRestored = () => {
    if (this.disposed || this.paused) return
    this.ctxLost = false
    this.ensureLoop()
  }

  /** 主循环是否在调度中：任何"以为在跑其实停了"的路径都靠 ensureLoop 兜底重启 */
  private looping = false

  /** 幂等地确保主循环在跑（暂停/销毁/上下文丢失时不动作） */
  ensureLoop() {
    if (this.looping || this.disposed || this.ctxLost || this.paused) return
    this.clock.getDelta()
    this.loop()
  }

  /** 弹窗展开时暂停渲染：全屏遮罩与动画中的 WebGL 画布争抢合成器会拖垮 GPU 进程 */
  private paused = false
  setPaused(p: boolean) {
    if (this.paused === p) return
    this.paused = p
    if (p) {
      window.cancelAnimationFrame(this.raf)
      window.clearTimeout(this.frameTimer)
      this.looping = false
    } else {
      this.ensureLoop()
    }
  }

  /** 太阳缓慢跟随相机方位：正面永远有光，侧缘留出可见的城市夜色 */
  private updateSun(dt: number) {
    if (!this.uniforms) return
    const target = this.controls.getAzimuthalAngle() + THREE.MathUtils.degToRad(28)
    let diff = (target - this.sunTheta) % (Math.PI * 2)
    if (diff > Math.PI) diff -= Math.PI * 2
    if (diff < -Math.PI) diff += Math.PI * 2
    this.sunTheta += diff * (1 - Math.exp(-dt * 1.05))
    const elev = THREE.MathUtils.degToRad(20 + 8 * yearToT(this.year))
    const ce = Math.cos(elev)
    this.uniforms.uSunDir.value.set(ce * Math.sin(this.sunTheta), Math.sin(elev), ce * Math.cos(this.sunTheta)).normalize()
  }

  private hoverPass() {
    if (!this.pointerInside) return
    // 指针不动但地球在转/相机在飞时，脚下的国家也会变，所以一并算作"移动"
    const moved = this.pointerPx.x !== this.lastSentPx.x
      || this.pointerPx.y !== this.lastSentPx.y
      || Math.abs(this.spin) > 1e-5 || this.flying || this.userActive
    this.lastSentPx.x = this.pointerPx.x
    this.lastSentPx.y = this.pointerPx.y

    const hit = this.pins.pick(this.pointerPx.x, this.pointerPx.y, this.camera, 36)
    const id = hit ? hit.spec.id : null
    if (id !== this.lastHoverSent || (id && moved)) {
      this.lastHoverSent = id
      this.cb.onHoverNode?.(id, this.pointerPx.x, this.pointerPx.y)
      this.canvas.style.cursor = id ? 'pointer' : ''
    }
    if (id) { this.cb.onHoverCountry?.(null, 0, 0); this.lastCountry = null; return }

    const c = moved ? this.countryUnderPointer() : this.lastCountry
    if (c !== this.lastCountry) {
      this.lastCountry = c
      this.cb.onHoverCountry?.(c, this.pointerPx.x, this.pointerPx.y)
      this.canvas.style.cursor = c ? 'help' : ''
    }
  }

  /** 指针 -> 球面 -> 经纬度 -> 国家（已折算地球自转） */
  countryUnderPointer(): Country | null {
    if (!this.atlas) return null
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)
    if (!this.raycaster.ray.intersectSphere(this.pickSphere, this.hitPoint)) return null
    sM1.copy(this.earthGroup.matrixWorld).invert()
    sV1.copy(this.hitPoint).applyMatrix4(sM1)
    const { lat, lng } = v3ToLatLng(sV1)
    return this.atlas.countryAt(lat, lng)
  }

  /** 该经纬度在当前时代的活跃度（悬停国家时显示） */
  activityOf(c: Country): number {
    let act = 0
    for (const rid of c.regions) {
      const v = REGION_MAP[rid]?.timeline[this.eraId ?? 'stone'] ?? 0
      if (v > act) act = v
    }
    return act
  }

  /* ── HTML 标签层 ── */

  private updateLabels() {
    if (!this.labelLayer) return
    if (!this.settings.showLabels) { this.hideAllLabels(); return }
    const budget = this.settings.quality === 'low' ? 5 : this.settings.quality === 'medium' ? 9 : 13
    const scored: { i: number; s: number }[] = []
    for (let i = 0; i < this.pins.count; i++) {
      if (this.pins.screen[i * 3 + 2] < 0.5) continue
      if (this.pins.facing(i, this.camera) < 0.26) continue
      const spec = this.pins.all[i]
      let s = spec.size * 46
      if (spec.id === this.selectedId) s += 1000
      else if (spec.id === this.hoveredId) s += 500
      scored.push({ i, s })
    }
    scored.sort((a, b) => b.s - a.s)
    const shown = scored.slice(0, budget)
    this.hideAllLabels()
    for (let k = 0; k < shown.length; k++) {
      const { i } = shown[k]
      const spec = this.pins.all[i]
      const node = this.nodeById.get(spec.id)
      const el = this.ensureLabel(k)
      const hot = spec.id === this.selectedId || spec.id === this.hoveredId
      const px = this.pins.screen[i * 3]
      const py = this.pins.screen[i * 3 + 1]
      // 靠近右缘时把标签翻到标记左侧，避免压住右侧事件面板
      el.style.transform = px > this.vw - 380
        ? `translate3d(${(px - 12).toFixed(1)}px, ${(py - 13).toFixed(1)}px, 0) translateX(-100%)`
        : `translate3d(${(px + 12).toFixed(1)}px, ${(py - 13).toFixed(1)}px, 0)`
      el.style.opacity = hot ? '1' : '0.8'
      el.classList.toggle('is-hot', hot)
      const key = `${spec.id}|${node?.yearLabel ?? ''}`
      if (this.labelKey[k] !== key) {
        this.labelKey[k] = key
        el.style.setProperty('--cat', `#${(CATEGORY_HEX[node?.category ?? 'science'] ?? 0x8fd0ff).toString(16).padStart(6, '0')}`)
        el.children[1].textContent = node?.flag ?? ''
        el.children[2].textContent = node?.name ?? spec.id
        el.children[3].textContent = node?.yearLabel ?? ''
      }
      el.style.display = ''
    }
  }

  private ensureLabel(k: number): HTMLElement {
    const exist = this.labels[k]
    if (exist) return exist
    const el = document.createElement('div')
    el.className = 'globe-label'
    el.innerHTML = '<i class="gl__dot"></i><b class="gl__flag"></b><span class="gl__name"></span><span class="gl__year"></span>'
    this.labelLayer!.appendChild(el)
    this.labels[k] = el
    return el
  }

  private hideAllLabels() {
    for (const el of this.labels) el.style.display = 'none'
  }

  /* ══════════════ 只读访问 ══════════════ */

  get distance() { return this.camera.position.length() }
  get detailLevel() { return this.detail }
  get atlasRef() { return this.atlas }
  get geo() { return this.currentGeo() }
  get isFlying() { return this.flying }
  get sunDirection(): THREE.Vector3 | null { return this.uniforms?.uSunDir.value ?? null }
  get currentEra(): EraId | null { return this.eraId }

  /** 屏幕坐标 -> 地球表面经纬度（供小地图/截图标注使用） */
  latLngAt(px: number, py: number): { lat: number; lng: number } | null {
    const r = this.canvas.getBoundingClientRect()
    sNdc.set((px / Math.max(1, r.width)) * 2 - 1, -(py / Math.max(1, r.height)) * 2 + 1)
    this.raycaster.setFromCamera(sNdc, this.camera)
    if (!this.raycaster.ray.intersectSphere(this.pickSphere, this.hitPoint)) return null
    sM1.copy(this.earthGroup.matrixWorld).invert()
    sV1.copy(this.hitPoint).applyMatrix4(sM1)
    return v3ToLatLng(sV1)
  }

  /* ══════════════ 清理 ══════════════ */

  dispose() {
    this.disposed = true
    window.cancelAnimationFrame(this.raf)
    window.clearTimeout(this.frameTimer)
    window.clearTimeout(this.rebuildTimer)
    this.ro?.disconnect()
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerleave', this.onLeave)
    this.canvas.removeEventListener('click', this.onClick)
    this.canvas.removeEventListener('webglcontextlost', this.onCtxLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onCtxRestored)
    this.flyTween?.kill()
    this.flyTween = null
    this.controls.dispose()
    this.pins.dispose()
    this.arcs.dispose()
    this.atlas?.dispose()
    this.glowTex?.dispose()
    for (const s of this.regionGlows) s.material.dispose()
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      mesh.geometry?.dispose?.()
      const mat = mesh.material
      if (Array.isArray(mat)) mat.forEach(m => m.dispose())
      else mat?.dispose?.()
    })
    // 地球纹理是 textures.ts 的模块级共享缓存，随实例 dispose 会把下一次进入的地球一起毁掉
    this.composer?.dispose()
    this.renderer.dispose()
    // 立即归还 GPU 上下文：场景反复切换时不堆积上下文，避免被浏览器批量回收导致黑屏
    this.renderer.forceContextLoss()
  }
}
