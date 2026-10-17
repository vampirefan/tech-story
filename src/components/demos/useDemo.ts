import { inject, onScopeDispose, type Ref } from 'vue'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import type { SfxName } from '@/audio/engine'

/** DemoFrame 向内部控件注入的"我动过了"回调 */
export const DEMO_TOUCH = Symbol('demoTouch')

export type DemoTouch = (sfx?: SfxName, gain?: number) => void

export function useDemoTouch(): DemoTouch {
  return inject(DEMO_TOUCH, () => {})
}

/** 首次交互记入进度（解锁"看过演示"），并播放音效 */
export function useDemoReporter(demoId: string): DemoTouch {
  const progress = useProgress()
  const settings = useSettings()
  let reported = false
  return (sfx: SfxName = 'click', gain?: number) => {
    settings.sfx(sfx, gain)
    if (reported) return
    reported = true
    progress.playDemo(demoId)
  }
}

/**
 * requestAnimationFrame 循环。
 * 组件卸载 / 页面切到后台时自动停，避免详情页里十几个 demo 空转。
 */
export function useRaf(cb: (dt: number, t: number) => void, active: Ref<boolean> | boolean = true): void {
  const isRef = typeof active !== 'boolean'
  let raf = 0
  let last = 0
  let total = 0
  let running = false

  const step = (now: number) => {
    if (!running) return
    raf = requestAnimationFrame(step)
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
    last = now
    total += dt
    if (isRef ? (active as Ref<boolean>).value : active) cb(dt, total)
  }

  const start = () => {
    if (running) return
    running = true
    last = 0
    raf = requestAnimationFrame(step)
  }
  const stop = () => {
    running = false
    cancelAnimationFrame(raf)
  }

  const onVis = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVis)
  start()
  onScopeDispose(() => { stop(); document.removeEventListener('visibilitychange', onVis) })
}

/** 数值限幅 */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** 线性插值 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** 生成 0..n-1 的数组 */
export function range(n: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(i)
  return out
}

/** 正弦波采样点串（用于示波器/声波路径） */
export function wavePath(
  x0: number, y0: number, w: number,
  amp: number, freq: number, phase: number, harmonics = 1
): string {
  const N = 96
  let d = ''
  for (let i = 0; i <= N; i++) {
    const t = i / N
    let v = 0
    for (let h = 1; h <= harmonics; h++) v += Math.sin((t * freq + phase) * Math.PI * 2 * h) / h
    v /= harmonics
    const x = x0 + t * w
    const y = y0 - v * amp
    d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1)
  }
  return d
}

/** 简单的进度条百分比样式 */
export function fillStyle(v: number, min: number, max: number) {
  return { '--fill': `${clamp((v - min) / (max - min), 0, 1) * 100}%` }
}

/** 让 ref 在下一帧平滑逼近目标（用于指针/温度等惯性量） */
export function approach(cur: number, target: number, dt: number, rate = 6): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt))
}
