/**
 * 无头 Chrome 截图工具（R3-R7 视觉自检用）。
 * 用法：node tools/shot.mjs <url> <out.png> [width] [height] [waitMs]
 *
 * 注意：不能用 --virtual-time-budget——它停掉主线程 BeginFrame，
 * rAF 永不触发，WebGL 场景会卡在加载页。--timeout 会在等待后强制产帧截图。
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const [url, out, W = '1600', H = '900', waitMs = '16000'] = process.argv.slice(2)
if (!url || !out) {
  console.error('usage: node tools/shot.mjs <url> <out.png> [w] [h] [waitMs]')
  process.exit(1)
}
const profile = mkdtempSync(join(tmpdir(), 'shot-'))
try {
  const r = spawnSync(CHROME, [
    '--headless=new',
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    `--window-size=${W},${H}`,
    `--timeout=${waitMs}`,
    `--screenshot=${out}`,
    url
  ], { encoding: 'utf8', timeout: (+waitMs) + 60000 })
  if (r.status !== 0) console.error('[shot] chrome exit', r.status, (r.stderr || '').slice(-400))
  else console.log(`[shot] ${out} ${W}x${H}`)
} finally {
  rmSync(profile, { recursive: true, force: true })
}
