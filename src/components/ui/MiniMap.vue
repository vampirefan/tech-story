<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { loadGeo } from '@/three/geo'
import { useSettings } from '@/stores/settings'

const props = withDefaults(defineProps<{
  lat: number
  lng: number
  iso?: string
  label?: string
  /** 额外高亮的国家（ISO numeric），用于"同一时期的其他地方" */
  highlight?: string[]
  /** 是否显示经纬网 */
  graticule?: boolean
  compact?: boolean
}>(), { graticule: true, compact: false, highlight: () => [] })

const emit = defineEmits<{ click: [] }>()
const settings = useSettings()

const ready = ref(false)
/** 背景所有国家合并成一条路径，绘制成本极低 */
const baseD = shallowRef('')
const hotD = shallowRef('')

let baseCache: { d: string; byIso: Map<string, string> } | null = null

function decimate(ring: number[][], maxPts: number): number[][] {
  const k = Math.max(1, Math.floor(ring.length / maxPts))
  const out: number[][] = []
  for (let i = 0; i < ring.length; i += k) out.push(ring[i])
  const last = ring[ring.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

function ringPath(ring: number[][]): string {
  const pts = decimate(ring, 46)
  if (pts.length < 3) return ''
  let d = ''
  for (let i = 0; i < pts.length; i++) {
    d += (i ? 'L' : 'M') + pts[i][0].toFixed(2) + ',' + (-pts[i][1]).toFixed(2)
  }
  return d + 'Z'
}

async function build() {
  if (baseCache) {
    apply(baseCache)
    return
  }
  const geo = await loadGeo('110m')
  let d = ''
  const byIso = new Map<string, string>()
  for (const c of geo.countries) {
    const [minLng, minLat, maxLng, maxLat] = c.bbox
    if (maxLng - minLng < 0.7 && maxLat - minLat < 0.7) continue
    let cd = ''
    for (const poly of c.polys) cd += ringPath(poly[0])
    if (!cd) continue
    d += cd
    if (c.iso) byIso.set(c.iso, cd)
  }
  baseCache = { d, byIso }
  apply(baseCache)
}

function apply(c: { d: string; byIso: Map<string, string> }) {
  baseD.value = c.d
  const isos = new Set([props.iso, ...props.highlight].filter(Boolean) as string[])
  let hd = ''
  for (const iso of isos) {
    const p = c.byIso.get(iso)
    if (p) hd += p
  }
  hotD.value = hd
  ready.value = true
}

onMounted(build)
</script>

<template>
  <div class="minimap" :class="{ 'minimap--compact': compact }" @click="emit('click'); settings.sfx('pin')">
    <svg viewBox="-180 -90 360 180" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="mmOcean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0a1c34" /><stop offset="0.5" stop-color="#0d2a4a" /><stop offset="1" stop-color="#08172c" />
        </linearGradient>
        <radialGradient id="mmPin">
          <stop offset="0" stop-color="#fff6d8" stop-opacity="0.95" />
          <stop offset="0.4" stop-color="#ffb347" stop-opacity="0.5" />
          <stop offset="1" stop-color="#ffb347" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect x="-180" y="-90" width="360" height="180" fill="url(#mmOcean)" />
      <g v-if="graticule" stroke="rgba(120,190,255,0.13)" stroke-width="0.4" fill="none">
        <path v-for="lng in [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150]" :key="lng" :d="`M${lng},-90 V90`" />
        <path v-for="lat in [-60, -30, 0, 30, 60]" :key="lat" :d="`M-180,${-lat} H180`" />
        <path d="M-180,0 H180" stroke="rgba(255,179,71,0.28)" stroke-width="0.6" stroke-dasharray="3 3" />
      </g>
      <path :d="baseD" fill="rgba(126,164,206,0.2)" stroke="rgba(150,200,255,0.42)" stroke-width="0.45" vector-effect="non-scaling-stroke" />
      <path v-if="hotD" :d="hotD" fill="rgba(255,179,71,0.34)" stroke="#ffb347" stroke-width="0.9" vector-effect="non-scaling-stroke" />
      <!-- 定位标记 -->
      <g :transform="`translate(${lng},${-lat})`">
        <circle r="14" fill="url(#mmPin)" opacity="0.7">
          <animate attributeName="r" values="7;16;7" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.75;0.1;0.75" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <circle r="2.6" fill="#fff6d8" stroke="#ffb347" stroke-width="0.9" />
        <path d="M0,-4.5 L0,-11" stroke="#ffb347" stroke-width="0.9" />
      </g>
      <text v-if="label" :x="lng + 5" :y="-lat - 8" font-size="7.5" fill="#ffe6b8"
        style="paint-order:stroke" stroke="#050a1e" stroke-width="1.6">{{ label }}</text>
    </svg>
    <div v-if="!ready" class="minimap__load"><span class="spinner" /></div>
    <div v-if="!compact" class="minimap__foot">
      <span class="minimap__coord">{{ lat.toFixed(1) }}°{{ lat >= 0 ? 'N' : 'S' }} · {{ lng.toFixed(1) }}°{{ lng >= 0 ? 'E' : 'W' }}</span>
      <span class="minimap__hint">在 3D 地球上查看 ↗</span>
    </div>
  </div>
</template>

<style scoped>
.minimap {
  position: relative;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow: hidden;
  background: #050a1e;
  cursor: pointer;
  transition: border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
}
.minimap:hover { border-color: var(--line-hot); box-shadow: var(--glow-cyan); }
.minimap svg { display: block; width: 100%; height: auto; }
.minimap__load {
  position: absolute; inset: 0; z-index: 2;
  display: grid; place-items: center;
  background: rgba(5, 10, 30, 0.5);
}
.minimap__load .spinner { width: 22px; height: 22px; }
.minimap__foot {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 9px;
  border-top: 1px solid var(--line);
  background: rgba(4, 9, 24, 0.72);
}
.minimap__coord { font-family: var(--f-mono); font-size: 10px; color: var(--t-lo); letter-spacing: 0.03em; }
.minimap__hint { font-size: 10.5px; color: var(--c-cyan); opacity: 0.8; }
.minimap--compact .minimap__hint { display: none; }
</style>
