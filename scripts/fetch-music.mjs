import { execSync } from 'node:child_process'
import { writeFileSync, existsSync, readdirSync } from 'node:fs'

const QUERIES = [
  { id: 'era_industrial', q: 'Ode to Joy Concert Band United States Air Force Band of the Rockies', label: '贝多芬《欢乐颂》（军乐改编）' },
  { id: 'era_modern', q: 'Mercury the Winged Messenger Concert Band United States Air Force Band', label: '霍尔斯特《行星组曲·水星》' },
  { id: 'era_renaissance', q: 'United States Air Force Band Mozart', label: '莫扎特（军乐改编）' },
  { id: 'era_iron', q: 'United States Air Force Band classical overture', label: '古典序曲（军乐改编）' },
  { id: 'era_medieval', q: 'Gregorian chant Salve Regina', label: '格里高利圣咏' },
  { id: 'china_ancient', q: 'Mo Li Hua jasmine flower', label: '中国民歌《茉莉花》' },
  { id: 'china_guzheng', q: 'guzheng solo chinese', label: '古筝独奏' },
  { id: 'era_information', q: 'United States Air Force Band stars stripes forever', label: '苏萨《星条旗永不落》' }
]

const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'TechStoryClassroom/1.0 (educational project; local use)'
const sleep = ms => new Promise(r => setTimeout(r, ms))

function curlJson(url) {
  const out = execSync(`curl -sL --max-time 60 -A "${UA}" "${url}"`, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 })
  return JSON.parse(out)
}

const have = new Set(readdirSync('public/assets/music').filter(f => f !== 'manifest.json').map(f => f.replace(/\.(mp3|ogg)$/, '')))
const manifest = []

for (const item of QUERIES) {
  if (have.has(item.id)) {
    manifest.push({ id: item.id, label: item.label, file: readdirSync('public/assets/music').find(f => f.startsWith(item.id + '.')) })
    console.log(`skip ${item.id}`)
    continue
  }
  await sleep(3000)
  try {
    const searchUrl = `${API}?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(item.q + ' filetype:audio')}&gsrlimit=10&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime|duration`
    const data = curlJson(searchUrl)
    const pages = Object.values(data.query?.pages || {})
    const audio = pages
      .filter(p => p.imageinfo?.[0])
      .map(p => ({ title: p.title, ...p.imageinfo[0] }))
      .filter(ii => (ii.mime === 'audio/mpeg' || ii.mime === 'audio/ogg') && ii.size > 300_000 && ii.size < 15_000_000 && (ii.duration || 0) > 60)
      .sort((a, b) => (a.mime === b.mime ? b.duration - a.duration : a.mime === 'audio/mpeg' ? -1 : 1))
    if (!audio.length) {
      console.log(`NO RESULT: ${item.id}`)
      continue
    }
    const pick = audio[0]
    const ext = pick.mime === 'audio/mpeg' ? 'mp3' : 'ogg'
    await sleep(1500)
    execSync(`curl -sL --max-time 240 -A "${UA}" -o "public/assets/music/${item.id}.${ext}" "${pick.url}"`, { stdio: 'pipe' })
    manifest.push({ id: item.id, label: item.label, title: pick.title.replace(/^File:/, ''), file: `${item.id}.${ext}`, url: pick.url, size: pick.size, duration: pick.duration })
    console.log(`OK ${item.id} <- ${pick.title} (${(pick.size / 1e6).toFixed(1)}MB, ${pick.duration?.toFixed(0)}s)`)
  } catch (e) {
    console.log(`FAIL ${item.id}: ${String(e.message).slice(0, 100)}`)
  }
}

writeFileSync('public/assets/music/manifest.json', JSON.stringify(manifest, null, 2))
console.log('manifest written:', manifest.length, 'tracks')
