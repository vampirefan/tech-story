import { onBeforeUnmount, watch } from 'vue'
import { GUIDED_PATH, useUI } from '@/stores/ui'
import { useSettings } from '@/stores/settings'
import { NODE_MAP } from '@/data/techTree'
import { yearToT } from '@/data/eras'

/** 1× 速度下，走完相邻两个关键突破所需的时间 */
const SEG_MS = 6200

/**
 * 引导播放：在推荐路径上自动前进，并把时间游标平滑推过去。
 * 只在 ui.playing 为真时跑，其余时间零开销。
 */
export function usePlayback() {
  const ui = useUI()
  const settings = useSettings()

  let raf = 0
  let last = 0
  let elapsed = 0
  let fromT = 0
  let toT = 1
  let fromIdx = 0
  let toIdx = 0

  function beginHop() {
    fromIdx = ui.pathIndex
    toIdx = Math.min(GUIDED_PATH.length - 1, fromIdx + 1)
    const a = NODE_MAP[GUIDED_PATH[fromIdx]]
    const b = NODE_MAP[GUIDED_PATH[toIdx]]
    if (!a || !b || toIdx === fromIdx) { finish(); return }
    fromT = yearToT(a.year)
    toT = yearToT(b.year)
    elapsed = 0
  }

  function finish() {
    ui.pause()
    ui.toast('已经走到今天 · 从这里开始自由探索吧', 'success', '✦', 4200)
    settings.sfx('chime')
  }

  function step(now: number) {
    if (!ui.playing) return
    const dt = Math.min(120, now - last)
    last = now
    const dur = SEG_MS / Math.max(0.25, ui.speed)
    elapsed += dt
    const k = Math.min(1, elapsed / dur)
    // easeInOutSine，让镜头和游标都不突兀
    const e = 0.5 - 0.5 * Math.cos(Math.PI * k)
    ui.setT(fromT + (toT - fromT) * e)
    if (k >= 1) {
      if (toIdx >= GUIDED_PATH.length - 1) { ui.gotoPath(toIdx); finish(); return }
      ui.gotoPath(toIdx)
      settings.sfx('whoosh', 0.5)
      beginHop()
    }
    raf = requestAnimationFrame(step)
  }

  function start() {
    stop()
    if (ui.pathIndex >= GUIDED_PATH.length - 1) ui.gotoPath(0)
    beginHop()
    last = performance.now()
    raf = requestAnimationFrame(step)
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  watch(() => ui.playing, (on) => { if (on) start(); else stop() }, { immediate: true })
  watch(() => ui.speed, () => { if (ui.playing) elapsed = 0 })

  onBeforeUnmount(stop)

  return { start, stop }
}
