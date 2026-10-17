/**
 * 程序化封面生成器：把书名/片名渲染成一张有质感的 SVG 封面。
 * 之所以不抓网络封面：课堂要离线运行，外链图片会全部裂掉。
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 中文按 2 字宽换行，英文按空格 */
function wrap(text: string, perLine: number): string[] {
  const out: string[] = []
  let line = ''
  let w = 0
  for (const ch of text) {
    const cw = /[\u4e00-\u9fa5]/.test(ch) ? 2 : 1
    if (w + cw > perLine) { out.push(line); line = ch; w = cw } else { line += ch; w += cw }
  }
  if (line) out.push(line)
  return out.slice(0, 4)
}

export function makeCover(opts: {
  title: string
  author?: string
  glyph?: string
  palette?: [string, string]
  kind?: string
  w?: number
  h?: number
}): string {
  const W = opts.w ?? 240
  const H = opts.h ?? 340
  const [c1, c2] = opts.palette ?? ['#123a6b', '#0b1a33']
  const uid = Math.abs(hash(opts.title + (opts.author ?? ''))).toString(36)
  const lines = wrap(opts.title, 12)
  const emW = (l: string) => [...l].reduce((a, c) => a + (/[\u4e00-\u9fa5]/.test(c) ? 1 : 0.55), 0)
  const maxEm = Math.max(...lines.map(emW), 1)
  const size = Math.max(16, Math.min(lines.length > 2 ? 26 : 34, Math.floor((W - 40) / maxEm)))
  const lineH = size + 6
  const totalH = lines.length * lineH
  const startY = H * 0.5 - totalH / 2 + size

  const glyph = opts.glyph ?? kindGlyph(opts.kind)
  const text = lines
    .map((l, i) => `<tspan x="${W / 2}" y="${startY + i * lineH}">${esc(l)}</tspan>`)
    .join('')
  const y = startY + (lines.length - 1) * lineH + size * 0.4

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
</linearGradient>
<radialGradient id="r${uid}" cx="0.5" cy="0.28" r="0.7">
<stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
<pattern id="p${uid}" width="18" height="18" patternUnits="userSpaceOnUse">
<path d="M18 0H0v18" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
</pattern>
<filter id="f${uid}" x="-40%" y="-40%" width="180%" height="180%">
<feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#g${uid})"/>
<rect width="${W}" height="${H}" fill="url(#p${uid})"/>
<rect width="${W}" height="${H}" fill="url(#r${uid})"/>
<text x="${W / 2}" y="${H * 0.24}" text-anchor="middle" font-size="${Math.round(H * 0.19)}" fill="#ffffff" fill-opacity="0.30" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif">${glyph}</text>
<text text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',system-ui,sans-serif" font-weight="700" font-size="${size}" fill="#ffffff" letter-spacing="1">${text}</text>
${opts.author ? `<text x="${W / 2}" y="${Math.min(y + 26, H - 44)}" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',system-ui,sans-serif" font-size="15" fill="#ffffff" fill-opacity="0.62">${esc(opts.author)}</text>` : ''}
<rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1"/>
<rect x="0" y="${H - 5}" width="${W}" height="5" fill="#ffffff" fill-opacity="0.25"/>
</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

function kindGlyph(kind?: string): string {
  switch (kind) {
    case 'book': return '\u{1F4D6}'
    case 'movie': return '\u{1F3AC}'
    case 'game': return '\u{1F3AE}'
    case 'music': return '\u{1F3B5}'
    default: return '\u2728'
  }
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h
}
