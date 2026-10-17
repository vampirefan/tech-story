import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'

const out = 'node_modules/.cache/validate-tree.mjs'
const outChina = 'node_modules/.cache/validate-china.mjs'
await build({
  entryPoints: ['src/data/techTree.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  alias: { '@': new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') },
  logLevel: 'error'
})
await build({
  entryPoints: ['src/data/china.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outChina,
  alias: { '@': new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') },
  logLevel: 'error'
})

const m = await import(pathToFileURL(out).href + '?t=' + Date.now())
const c = await import(pathToFileURL(outChina).href + '?t=' + Date.now())
const { errors, warnings } = m.validateGraph()

console.log('节点总数:', m.NODES.length)
console.log('演进边:', m.EDGES.length, ' 战争因果边:', m.WAR_EDGES.length)
console.log('演示数:', m.DEMO_IDS.length, m.DEMO_IDS.join(', '))
console.log('根节点:', m.ROOT_NODES.length, m.ROOT_NODES.map(n => n.id).join(', '))
console.log('叶子:', m.LEAF_NODES.length, m.LEAF_NODES.map(n => n.id).join(', '))
console.log('中国相关节点(chinaLink>=2):', m.CHINA_NODES.length)
const byEra = {}
for (const n of m.NODES) byEra[n.era] = (byEra[n.era] ?? 0) + 1
console.log('按时代:', JSON.stringify(byEra, null, 0))
const byCat = {}
for (const n of m.NODES) byCat[n.category] = (byCat[n.category] ?? 0) + 1
console.log('按分类:', JSON.stringify(byCat, null, 0))

console.log('\n中国专题: 三幕里程碑 %d / %d / %d，硬数据 %d 条，西传路线 %d 条，短板 %d 条，时代对比 %d 行',
  c.CHINA_ACTS[0].milestones.length, c.CHINA_ACTS[1].milestones.length, c.CHINA_ACTS[2].milestones.length,
  c.CHINA_NUMBERS.length, c.TRANSMISSIONS.length, c.CHINA_GAPS.length, c.CHINA_VS_WORLD.length)
console.log('中国相关节点按时代:', JSON.stringify(c.CHINA_VS_WORLD.map(r => `${r.era}:${c.CHINA_NODES_BY_ERA[r.era]?.length ?? 0}`).reduce((a, s) => { const [k, v] = s.split(':'); a[k] = +v; return a }, {})))
errors.push(...c.validateChina())

if (errors.length) {
  console.log('\n=== 错误 (' + errors.length + ') ===')
  for (const p of errors) console.log(' ✗', p)
} else {
  console.log('\n✓ 无错误：无悬空引用、无环、无缺失字段、年份与时代一致')
}
if (warnings.length) {
  console.log('\n=== 待打磨 (' + warnings.length + ') ===')
  for (const p of warnings) console.log(' ·', p)
}
process.exitCode = errors.length ? 1 : 0
