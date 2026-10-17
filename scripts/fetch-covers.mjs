/**
 * 为拓展资源库抓取"可嵌入"的官方封面缩略图（课堂离线使用）：
 *  - 书籍：Open Library Covers API（官方嵌入服务）/ Apple Books 搜索 artwork
 *  - 游戏：Steam 商店 API 定位 appid 后取 Steam CDN 库封面 / App Store artwork
 *  - 音乐：Apple iTunes Search API 的专辑 artwork（官方提供给开发者展示用）
 * 抓不到的条目保留程序生成封面（CoverArt 自动回退）。
 * 用法：node scripts/fetch-covers.mjs
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'assets', 'covers')
mkdirSync(OUT, { recursive: true })

const PROXY = 'http://127.0.0.1:7897'
const ENV = { ...process.env, HTTP_PROXY: PROXY, HTTPS_PROXY: PROXY, http_proxy: PROXY, https_proxy: PROXY }

function curl(url, { binary = false, timeout = 45 } = {}) {
  const args = ['-sSL', '--compressed', '--max-time', String(timeout), '-x', PROXY, url]
  return execFileSync('curl', args, { encoding: binary ? 'buffer' : 'utf8', env: ENV, maxBuffer: 64 * 1024 * 1024, timeout: (timeout + 10) * 1000 })
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')

/** @type {Record<string, Array<{ src: 'ol' | 'itunes' | 'steam', q: string, need?: string, entity?: string, country?: string }>>} */
const QUERIES = {
  // ── 书籍 ──
  b_sapiens: [{ src: 'itunes', entity: 'ebook', country: 'cn', q: '人类简史 赫拉利', need: '人类简史' }, { src: 'ol', q: 'Sapiens A Brief History of Humankind Harari' }],
  b_guns: [{ src: 'itunes', entity: 'ebook', country: 'cn', q: '枪炮、病菌与钢铁', need: '枪炮' }, { src: 'ol', q: 'Guns Germs and Steel Diamond' }],
  b_bryson: [{ src: 'itunes', entity: 'ebook', country: 'cn', q: '万物简史 布莱森', need: '万物简史' }, { src: 'ol', q: 'A Short History of Nearly Everything Bryson' }],
  b_needham: [{ src: 'ol', q: 'Science and Civilisation in China Needham' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '中国科学技术史', need: '中国科学技术史' }],
  b_david: [{ src: 'ol', q: 'The Way Things Work Macaulay' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '万物运转的秘密', need: '万物运转' }],
  b_gamow: [{ src: 'ol', q: 'One Two Three Infinity Gamow' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '从一到无穷大', need: '从一到无穷大' }],
  b_hawking: [{ src: 'itunes', entity: 'ebook', country: 'cn', q: '时间简史 霍金', need: '时间简史' }, { src: 'ol', q: 'A Brief History of Time Hawking' }],
  b_feynman: [{ src: 'ol', q: "Surely You're Joking, Mr. Feynman!", need: 'Feynman' }, { src: 'ol', q: 'Surely You Are Joking Mr Feynman!', need: 'Feynman' }],
  b_liang: [{ src: 'itunes', entity: 'ebook', country: 'cn', q: '数理化通俗演义', need: '数理化通俗演义' }],
  b_hillyer: [{ src: 'ol', q: 'A Child History of the World Hillyer' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '希利尔讲世界史', need: '希利尔' }],
  b_snz: [{ src: 'itunes', entity: 'ebook', country: 'cn', q: '红星照耀中国', need: '红星照耀中国' }, { src: 'ol', q: 'Red Star Over China Snow' }],
  b_tiangong: [{ src: 'itunes', entity: 'ebook', country: 'cn', q: '天工开物 宋应星', need: '天工开物' }, { src: 'ol', q: '天工开物', need: '天工开物' }],
  b_mengxi: [{ src: 'ol', q: '梦溪笔谈', need: '梦溪笔谈' }, { src: 'ol', q: 'Dream Pool Essays', need: 'DreamPool' }],
  b_shiji: [{ src: 'ol', q: '史记', need: '史记' }, { src: 'ol', q: 'Records of the Grand Historian', need: 'RecordsOfTheGrand' }],
  b_qimin: [{ src: 'ol', q: '齐民要术', need: '齐民要术' }, { src: 'ol', q: 'Qimin Yaoshu', need: 'Qimin' }],
  b_guobao: [{ src: 'itunes', entity: 'ebook', country: 'cn', q: '如果国宝会说话', need: '国宝会说话' }],
  b_chipwar: [{ src: 'itunes', entity: 'ebook', country: 'cn', q: '芯片战争', need: '芯片战争' }, { src: 'ol', q: 'Chip War Miller' }],
  b_info: [{ src: 'ol', q: 'The Information Gleick' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '信息简史 格雷克', need: '信息简史' }],
  b_innovators: [{ src: 'ol', q: 'The Innovators Isaacson' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '创新者 艾萨克森', need: '创新者' }],
  b_jobs: [{ src: 'ol', q: 'Steve Jobs Isaacson' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '史蒂夫 乔布斯传', need: '乔布斯' }],
  b_turing: [{ src: 'ol', q: 'Alan Turing The Enigma Hodges' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '艾伦 图灵传', need: '图灵' }],
  b_gene: [{ src: 'ol', q: 'The Gene Mukherjee' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '基因传 穆克吉', need: '基因传' }],
  b_dblhelix: [{ src: 'ol', q: 'The Double Helix Watson' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '双螺旋 沃森', need: '双螺旋' }],
  b_mars: [{ src: 'ol', q: 'The Martian Weir' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '火星救援 安迪 威尔', need: '火星救援' }],
  b_santi: [{ src: 'ol', q: 'The Three-Body Problem', need: '三体' }, { src: 'ol', q: 'The Three-Body Problem', need: 'ThreeBody' }],
  b_liulang: [{ src: 'ol', q: '流浪地球', need: '流浪地球' }, { src: 'ol', q: 'The Wandering Earth', need: 'WanderingEarth' }],
  b_verne_moon: [{ src: 'ol', q: 'From the Earth to the Moon Verne' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '从地球到月球', need: '从地球到月球' }],
  b_verne_sub: [{ src: 'ol', q: 'Twenty Thousand Leagues Under the Sea Verne' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '海底两万里', need: '海底两万里' }],
  b_asimov: [{ src: 'ol', q: 'Foundation Asimov' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '基地 阿西莫夫', need: '基地' }],
  b_robots: [{ src: 'ol', q: 'I Robot Asimov' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '我 机器人 阿西莫夫', need: '机器人' }],
  b_silent: [{ src: 'ol', q: 'Silent Spring Carson' }, { src: 'itunes', entity: 'ebook', country: 'cn', q: '寂静的春天', need: '寂静的春天' }],
  b_qxs: [{ src: 'itunes', entity: 'ebook', country: 'cn', q: '钱学森传', need: '钱学森' }],
  // ── 游戏 ──
  g_civ6: [{ src: 'steam', q: 'Civilization VI' }],
  g_humankind: [{ src: 'steam', q: 'Humankind' }],
  g_aoe: [{ src: 'steam', q: 'Age of Empires II Definitive Edition' }],
  g_totalwar: [{ src: 'steam', q: 'Total War THREE KINGDOMS' }],
  g_discovery: [{ src: 'steam', q: 'Discovery Tour Ancient Egypt' }],
  g_minecraft: [{ src: 'itunes', entity: 'software', country: 'us', q: 'Minecraft', need: 'Minecraft' }],
  g_ksp: [{ src: 'steam', q: 'Kerbal Space Program' }],
  g_sfs: [{ src: 'steam', q: 'Spaceflight Simulator' }, { src: 'itunes', entity: 'software', country: 'us', q: 'Spaceflight Simulator', need: 'Spaceflight' }],
  g_factorio: [{ src: 'steam', q: 'Factorio' }],
  g_dyson: [{ src: 'steam', q: 'Dyson Sphere Program' }],
  g_oxygen: [{ src: 'steam', q: 'Oxygen Not Included' }],
  g_cities: [{ src: 'steam', q: 'Cities Skylines' }],
  g_frostpunk: [{ src: 'steam', q: 'Frostpunk' }],
  g_hrm: [{ src: 'steam', q: 'Human Resource Machine' }],
  g_wtl: [{ src: 'steam', q: 'while True learn' }],
  g_opus: [{ src: 'steam', q: 'OPUS MAGNUM' }],
  g_besiege: [{ src: 'steam', q: 'Besiege' }],
  g_polybridge: [{ src: 'steam', q: 'Poly Bridge' }],
  g_universe: [{ src: 'steam', q: 'Universe Sandbox' }],
  g_outerwilds: [{ src: 'steam', q: 'Outer Wilds' }],
  g_terra: [{ src: 'steam', q: 'Terra Nil' }],
  g_portal2: [{ src: 'steam', q: 'Portal 2' }],
  g_msedu: [{ src: 'itunes', entity: 'software', country: 'us', q: 'Minecraft Education', need: 'Education' }],
  g_msfs: [{ src: 'steam', q: 'Microsoft Flight Simulator 2020' }, { src: 'steam', q: 'Microsoft Flight Simulator' }],
  // ── 音乐 ──
  mu_mozart: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Mozart Eine kleine Nachtmusik K 525', need: 'Mozart' }],
  mu_beethoven5: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Beethoven Symphony No 5', need: 'Beethoven' }],
  mu_beethoven9: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Beethoven Symphony No 9', need: 'Beethoven' }],
  mu_vivaldi: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Vivaldi Four Seasons', need: 'Vivaldi' }],
  mu_bach: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Bach Air on the G String', need: 'Bach' }],
  mu_holst_mars: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Holst The Planets Mars', need: 'Holst' }],
  mu_holst_jupiter: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Holst The Planets Jupiter', need: 'Holst' }],
  mu_debussy: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Debussy Clair de Lune', need: 'Debussy' }],
  mu_grieg: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Grieg Peer Gynt', need: 'Grieg' }],
  mu_strauss: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Johann Strauss Blue Danube', need: 'Strauss' }],
  mu_tchaikovsky: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Tchaikovsky 1812 Overture', need: 'Tchaikovsky' }],
  mu_sousa: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Sousa Stars and Stripes Forever', need: 'Sousa' }],
  mu_chopin: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Chopin Nocturne Op 9 No 2', need: 'Chopin' }],
  mu_dvorak: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Dvorak Symphony No 9 New World', need: 'Dvor' }],
  mu_jasmine: [{ src: 'itunes', entity: 'music', country: 'cn', q: '茉莉花', need: '茉莉花' }],
  mu_gaoshan: [{ src: 'itunes', entity: 'music', country: 'cn', q: '高山流水 古琴', need: '高山流水' }],
  mu_chunjiang: [{ src: 'itunes', entity: 'music', country: 'cn', q: '春江花月夜', need: '春江花月夜' }],
  mu_shimian: [{ src: 'itunes', entity: 'music', country: 'cn', q: '十面埋伏 琵琶', need: '十面埋伏' }],
  mu_erquanying: [{ src: 'itunes', entity: 'music', country: 'cn', q: '二泉映月', need: '二泉映月' }],
  mu_satie: [{ src: 'itunes', entity: 'music', country: 'us', q: 'Satie Gymnopedie No 1', need: 'Satie' }],
  mu_huanghe: [{ src: 'itunes', entity: 'music', country: 'cn', q: '黄河大合唱', need: '黄河大合唱' }],
  mu_guoge: [{ src: 'itunes', entity: 'music', country: 'cn', q: '歌唱祖国', need: '歌唱祖国' }]
}

function saveImage(id, buf, meta) {
  if (!buf || buf.length < 3000) return null
  let ext = null
  if (buf[0] === 0xff && buf[1] === 0xd8) ext = 'jpg'
  else if (buf[0] === 0x89 && buf[1] === 0x50) ext = 'png'
  else if (buf[0] === 0x52 && buf[8] === 0x57) ext = 'webp'
  if (!ext) return null
  const file = `${id}.${ext}`
  writeFileSync(join(OUT, file), buf)
  return { file, ...meta }
}

function tryOl(q, need) {
  const data = JSON.parse(curl(`https://openlibrary.org/search.json?limit=8&fields=title,author_name,cover_i&q=${encodeURIComponent(q)}`))
  const doc = (data.docs || []).find(d => d.cover_i && (!need || norm(d.title || '').includes(norm(need))))
  if (!doc) return null
  const buf = curl(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`, { binary: true })
  return { buf, matched: `${doc.title}${doc.author_name ? ' · ' + doc.author_name[0] : ''}`, sourceUrl: `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}` }
}

function tryItunes(q, entity, country, need) {
  const ent = entity === 'music' ? 'album' : entity
  const data = JSON.parse(curl(`https://itunes.apple.com/search?limit=8&entity=${ent}&country=${country || 'us'}&term=${encodeURIComponent(q)}`))
  for (const r of data.results || []) {
    const hay = `${r.trackName || ''} ${r.collectionName || ''} ${r.artistName || ''}`
    if (need && !norm(hay).includes(norm(need))) continue
    const art = r.artworkUrl100 || r.artworkUrl60 || r.artworkUrl512
    if (!art) continue
    const big = art.replace(/\d+x\d+bb?\.jpg$/, '600x600bb.jpg')
    const buf = curl(big, { binary: true })
    return { buf, matched: `${r.trackName || r.collectionName || ''} · ${r.artistName || ''}`.trim(), sourceUrl: r.trackViewUrl || r.collectionViewUrl || big }
  }
  return null
}

function trySteam(q) {
  const data = JSON.parse(curl(`https://store.steampowered.com/api/storesearch/?l=english&cc=us&term=${encodeURIComponent(q)}`))
  const nq = norm(q)
  const score = (name) => {
    const n = norm(name)
    if (n === nq) return 0
    if (n.startsWith(nq)) return 1
    if (n.includes(nq)) return 2
    return 9
  }
  const items = (data.items || []).map(i => ({ i, s: score(i.name) })).filter(x => x.s < 9).sort((a, b) => a.s - b.s)
  const item = items[0]?.i
  if (!item) return null
  const appid = item.id
  let buf = null
  let sourceUrl = `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/library_600x900.jpg`
  try { buf = curl(sourceUrl, { binary: true }) } catch { buf = null }
  if (!buf || buf.length < 3000) {
    const det = JSON.parse(curl(`https://store.steampowered.com/api/appdetails?appids=${appid}`))
    const d = det?.[String(appid)]?.data
    if (!d?.header_image) return null
    sourceUrl = d.header_image
    buf = curl(sourceUrl, { binary: true })
  }
  return { buf, matched: item.name, sourceUrl }
}

const manifest = existsSync(join(OUT, 'manifest.json')) ? JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')) : {}
const only = process.argv[2] ? process.argv[2].split(',') : null

for (const [id, chain] of Object.entries(QUERIES)) {
  if (only && !only.includes(id)) continue
  if (manifest[id]) { console.log(`SKIP ${id} (已有)`); continue }
  let hit = null
  for (const step of chain) {
    try {
      if (step.src === 'ol') hit = tryOl(step.q, step.need)
      else if (step.src === 'itunes') hit = tryItunes(step.q, step.entity, step.country, step.need)
      else hit = trySteam(step.q)
    } catch (e) { hit = null }
    if (hit?.buf) break
    await sleep(250)
  }
  if (!hit?.buf) { console.log(`MISS ${id}`); await sleep(200); continue }
  const saved = saveImage(id, hit.buf, { sourceUrl: hit.sourceUrl, matched: hit.matched })
  if (!saved) { console.log(`BAD  ${id} (${hit.matched})`); continue }
  manifest[id] = { file: saved.file, matched: saved.matched, sourceUrl: saved.sourceUrl }
  console.log(`OK   ${id} <- ${saved.matched}`)
  await sleep(300)
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\nmanifest: ${Object.keys(manifest).length} 条封面`)
