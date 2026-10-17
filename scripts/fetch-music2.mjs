import { execSync } from 'node:child_process'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'

const UA = 'TechStoryClassroom/1.0 (educational classroom app; contact: local)'
const API = 'https://commons.wikimedia.org/w/api.php'

const QUERIES = [
  { id: 'music_mozart', q: 'Mozart Eine kleine Nachtmusik', label: '莫扎特《G大调小夜曲》K.525' },
  { id: 'music_beethoven5', q: 'Beethoven Symphony No. 5', label: '贝多芬《第五交响曲"命运"》' },
  { id: 'music_vivaldi', q: 'Vivaldi Four Seasons Spring', label: '维瓦尔第《四季·春》' },
  { id: 'music_bach', q: 'Bach Air on the G String orchestral', label: '巴赫《G弦上的咏叹调》' },
  { id: 'music_holst_mars', q: 'Holst The Planets Mars', label: '霍尔斯特《行星组曲·火星》' },
  { id: 'music_grieg', q: 'Grieg Peer Gynt Morning Mood', label: '格里格《晨景》' },
  { id: 'music_strauss', q: 'Strauss Blue Danube waltz', label: '施特劳斯《蓝色多瑙河》' },
  { id: 'music_tchaikovsky', q: 'Tchaikovsky 1812 Overture', label: '柴可夫斯基《1812序曲》' },
  { id: 'music_jasmine', q: 'Mo Li Hua Jasmine Flower', label: '中国民歌《茉莉花》' },
  { id: 'music_guzheng', q: 'guzheng traditional', label: '古筝传统曲' },
  { id: 'music_erquan', q: 'erhu chinese folk', label: '二胡曲' },
  { id: 'music_chant', q: 'Gregorian chant', label: '格里高利圣咏' },
  { id: 'music_lute', q: 'lute renaissance dance', label: '文艺复兴鲁特琴舞曲' },
  { id: 'music_drum', q: 'taiko drum ensemble', label: '太鼓' },
  { id: 'music_march', q: 'Sousa march band', label: '苏萨进行曲' },
  { id: 'music_chopin', q: 'Chopin nocturne piano', label: '肖邦《夜曲》' },
  { id: 'music_dvorak', q: 'Dvorak New World Symphony', label: '德沃夏克《自新大陆》' },
  { id: 'music_satie', q: 'Satie Gymnopedie', label: '萨蒂《裸体歌舞》' },
  { id: 'music_haydn', q: 'Haydn trumpet concerto', label: '海顿《小号协奏曲》' },
  { id: 'music_handel', q: 'Handel Water Music', label: '亨德尔《水上音乐》' }
]

function curlJson(url) {
  const out = execSync(`curl -sL --max-time 90 -A "${UA}" "${url}"`, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 60 })
  return JSON.parse(out)
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

const manifestPath = 'public/assets/music/manifest.json'
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : []
const have = new Set(manifest.map(m => m.id))

for (const item of QUERIES) {
  if (have.has(item.id) || existsSync(`public/assets/music/${item.id}.mp3`)) { console.log('skip', item.id); continue }
  try {
    const url = `${API}?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(item.q + ' filetype:audio')}&gsrlimit=30&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime|mediatype&iiurlwidth=0`
    const data = curlJson(url)
    const pages = Object.values(data.query?.pages || {})
    const cand = pages
      .filter(p => p.imageinfo?.[0])
      .map(p => ({ title: p.title, ...p.imageinfo[0] }))
      .filter(ii => (ii.mime === 'audio/mpeg' || ii.mime === 'audio/ogg') && ii.size > 400_000 && ii.size < 30_000_000)
      .sort((a, b) => (a.mime === b.mime ? b.size - a.size : a.mime === 'audio/mpeg' ? -1 : 1))
    if (!cand.length) { console.log('NO RESULT', item.id, '(', pages.length, 'pages )'); await sleep(3500); continue }
    const pick = cand.find(c => c.size < 12_000_000) || cand[0]
    const ext = pick.mime === 'audio/mpeg' ? 'mp3' : 'ogg'
    const target = `public/assets/music/${item.id}.${ext}`
    execSync(`curl -sL --max-time 300 -A "${UA}" -o "${target}" "${pick.url}"`, { stdio: 'pipe' })
    manifest.push({ id: item.id, label: item.label, title: pick.title.replace(/^File:/, ''), file: `${item.id}.${ext}`, url: pick.url, size: pick.size, mime: pick.mime })
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    console.log(`OK ${item.id} <- ${pick.title} (${(pick.size / 1e6).toFixed(1)}MB)`)
  } catch (e) {
    console.log('FAIL', item.id, String(e.message).slice(0, 140))
  }
  await sleep(4000)
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
console.log('DONE manifest:', manifest.length, 'tracks')
