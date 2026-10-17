import * as THREE from 'three'

export interface EarthTextures {
  day: THREE.Texture
  night: THREE.Texture
  water: THREE.Texture
  topo: THREE.Texture
  clouds: THREE.Texture
  sky: THREE.Texture
}

const BASE = import.meta.env.BASE_URL
const url = (p: string) => `${BASE}${p}`.replace(/\/{2,}/g, '/')

export const TEX_URLS = {
  day: url('assets/textures/earth-blue-marble.jpg'),
  night: url('assets/textures/earth-night.jpg'),
  water: url('assets/textures/earth-water.png'),
  topo: url('assets/textures/earth-topology.png'),
  sky: url('assets/textures/night-sky.png')
}

/**
 * 程序化云层：fbm 值噪声 + 纬度云带调制。
 * 真实卫星云图受版权与体积限制，用噪声生成既离线可用又足够像。
 */
export function makeCloudTexture(width = 1024): THREE.CanvasTexture {
  const height = Math.max(2, width >> 1)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(width, height)
  const data = img.data

  const SEED = 20260214
  const hash = (x: number, y: number, s: number) => {
    let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0
    h = (h ^ (h >> 13)) * 1274126177 | 0
    return ((h ^ (h >> 16)) >>> 0) / 4294967295
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  // x 方向按 period 取模，保证经度接缝无缝
  const vnoise = (x: number, y: number, period: number, s: number) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = smooth(x - xi), yf = smooth(y - yi)
    const x0 = ((xi % period) + period) % period
    const x1 = (x0 + 1) % period
    const a = hash(x0, yi, s), b = hash(x1, yi, s)
    const c = hash(x0, yi + 1, s), d = hash(x1, yi + 1, s)
    return (a + (b - a) * xf) + ((c + (d - c) * xf) - (a + (b - a) * xf)) * yf
  }

  const fbm = (u: number, v: number) => {
    let sum = 0, amp = 0.5, f = 1
    for (let o = 0; o < 5; o++) {
      const period = 8 * f
      let n = vnoise(u * 8 * f, v * 4 * f, period, SEED + o * 101)
      n = 1 - Math.abs(n * 2 - 1)          // ridged：更像卷云的丝缕
      sum += n * amp
      amp *= 0.52
      f *= 2.07                             // 非整数倍频，避免重复图案
    }
    return sum
  }

  for (let y = 0; y < height; y++) {
    const v = y / height
    const lat = (0.5 - v) * Math.PI          // ±π/2
    const a = Math.abs(lat)
    // 云带：赤道辐合带 + 中高纬风暴带多云，副热带与极地少云
    const belt = 0.66 + 0.46 * Math.cos(a * 6.0) - 0.16 * Math.pow(a / (Math.PI / 2), 6)
    for (let x = 0; x < width; x++) {
      const u = x / width
      const n = fbm(u, v)
      let cov = (n - 0.46) * 2.1 * Math.max(0.12, belt)
      cov = cov < 0 ? 0 : cov > 1 ? 1 : cov
      const alpha = Math.pow(cov, 1.25) * 235
      const i = (y * width + x) * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = alpha
    }
  }
  ctx.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.NoColorSpace
  tex.needsUpdate = true
  return tex
}

function loadOne(loader: THREE.TextureLoader, src: string, srgb: boolean, aniso: number): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(src, (tex) => {
      tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
      tex.anisotropy = aniso
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      tex.generateMipmaps = true
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.needsUpdate = true
      resolve(tex)
    }, undefined, (err) => reject(new Error(`纹理加载失败 ${src}: ${String(err)}`)))
  })
}

/**
 * 并行加载全部地球纹理，onProgress 收到 0-1。
 * 任何一张失败都抛错——上层需要显式的失败态而不是静默的黑球。
 * 结果做模块级缓存：场景反复进出时地球秒回，不必重新解码贴图（重入期间的黑屏空窗）。
 * 缓存的纹理是共享资产，使用方不得 dispose（见 GlobeEngine.dispose）。
 */
let texCache: Promise<EarthTextures> | null = null

export function loadEarthTextures(
  aniso = 8,
  onProgress?: (p: number, label: string) => void
): Promise<EarthTextures> {
  if (texCache) {
    onProgress?.(1, '纹理就绪')
    return texCache
  }
  texCache = doLoad(aniso, onProgress).catch((e) => { texCache = null; throw e })
  return texCache
}

async function doLoad(
  aniso: number,
  onProgress?: (p: number, label: string) => void
): Promise<EarthTextures> {
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  const jobs: { key: keyof Omit<EarthTextures, 'clouds'>; label: string; srgb: boolean }[] = [
    { key: 'day', label: '地表反照率', srgb: true },
    { key: 'night', label: '夜间灯光', srgb: true },
    { key: 'water', label: '海陆掩膜', srgb: false },
    { key: 'topo', label: '地形起伏', srgb: false },
    { key: 'sky', label: '深空星野', srgb: true }
  ]
  let done = 0
  onProgress?.(0, '生成云层…')
  const out = {} as EarthTextures
  const clouds = makeCloudTexture()
  clouds.anisotropy = aniso
  out.clouds = clouds
  done += 0.5
  onProgress?.(done / (jobs.length + 0.5), '生成云层…')

  await Promise.all(jobs.map(async (j) => {
    const tex = await loadOne(loader, TEX_URLS[j.key], j.srgb, aniso)
    out[j.key] = tex
    done++
    onProgress?.(done / (jobs.length + 0.5), `加载${j.label}…`)
  }))
  onProgress?.(1, '纹理就绪')
  return out
}
