import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'

const out = 'node_modules/.cache/fix-graph-data.mjs'
await build({
  entryPoints: ['src/data/techTree.ts'],
  bundle: true, format: 'esm', platform: 'node', outfile: out,
  alias: { '@': new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') },
  logLevel: 'error'
})
const { NODE_MAP } = await import(pathToFileURL(out).href + '?t=' + Date.now())

const files = [
  'src/data/nodes-ancient.ts',
  'src/data/nodes-middle.ts',
  'src/data/nodes-modern.ts',
  'src/data/nodes-now.ts'
]

let cur = null
const removed = []
const parse = s => [...s.matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1])

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n')
  const next = lines.map(line => {
    const idm = line.match(/^\s{4}id: '([a-z0-9_]+)'/)
    if (idm) cur = idm[1]
    const m = line.match(/^(\s*)prereq: \[([^\]]*)\], unlocks: \[([^\]]*)\],(.*)$/)
    if (!m || !cur) return line
    const me = NODE_MAP[cur]
    const keepP = parse(m[2]).filter(p => {
      const ok = NODE_MAP[p] && NODE_MAP[p].year <= me.year
      if (!ok) removed.push(`${cur}.prereq -= ${p}${NODE_MAP[p] ? ` (${NODE_MAP[p].year} > ${me.year})` : ' (不存在)'}`)
      return ok
    })
    const keepU = parse(m[3]).filter(u => {
      const ok = NODE_MAP[u] && NODE_MAP[u].year >= me.year
      if (!ok) removed.push(`${cur}.unlocks -= ${u}${NODE_MAP[u] ? ` (${NODE_MAP[u].year} < ${me.year})` : ' (不存在)'}`)
      return ok
    })
    const q = a => a.map(x => `'${x}'`).join(', ')
    return `${m[1]}prereq: [${q(keepP)}], unlocks: [${q(keepU)}],${m[4]}`
  })
  writeFileSync(f, next.join('\n'))
}

console.log(`移除了 ${removed.length} 条时间倒挂的依赖：`)
for (const r of removed) console.log(' -', r)
