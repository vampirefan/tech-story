import { execSync } from 'node:child_process'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'

const UA = 'TechStoryClassroom/1.0 (educational classroom app; contact: local)'
const API = 'https://commons.wikimedia.org/w/api.php'
const sleep = ms => new Promise(r => setTimeout(r, ms))

function curlJson(url) {
  const out = execSync(`curl -sL --max-time 90 -A "${UA}" "${url}"`, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 60 })
  return JSON.parse(out)
}

/** id, 搜索词, 必须命中的正则(检查 标题/ObjectName/ImageDescription/Artist), 必须排除的正则 */
const QUERIES = [
  { id: 'mu_vivaldi', q: 'Vivaldi Four Seasons', label: '维瓦尔第《四季·春》', must: /(four seasons|quattro stagioni|le printemps|spring)/i, not: /(sound library|yellowstone|river|waterfall)/i },
  { id: 'mu_mozart', q: 'Mozart Serenade No. 13', label: '莫扎特《G大调小夜曲》K.525', must: /(nachtmusik|serenade)/i, not: /(sound library)/i },
  { id: 'mu_beethoven5', q: 'Beethoven Symphony No. 5', label: '贝多芬《第五交响曲》', must: /(symphon|symphony|schicksals)/i, not: /(sound library)/i },
  { id: 'mu_holst_mars', q: 'Holst Planets Mars Bringer of War', label: '霍尔斯特《行星组曲·火星》', must: /(mars|planets|bringer of war)/i, not: /(sound library|mars rover|planet earth)/i },
  { id: 'mu_chopin', q: 'Chopin Nocturne', label: '肖邦《降E大调夜曲》', must: /(nocturne|nachtstück)/i, not: /(sound library)/i },
  { id: 'mu_grieg', q: 'Grieg Peer Gynt Morning', label: '格里格《晨景》', must: /(morning|morgenstimmung|peer gynt|morgenstemning)/i, not: /(sound library)/i },
  { id: 'mu_tchaikovsky', q: 'Tchaikovsky 1812 Overture', label: '柴可夫斯基《1812序曲》', must: /(1812|overture)/i, not: /(sound library)/i },
  { id: 'mu_jasmine', q: 'Jasmine Flower Chinese folk song', label: '中国民歌《茉莉花》', must: /(jasmine|mo li hua|molihua|茉莉)/i, not: /(sound library|tea)/i },
  { id: 'mu_guzheng', q: 'guzheng', label: '古筝曲', must: /(guzheng|zheng|chinese zither)/i, not: /(sound library)/i },
  { id: 'mu_gaoshan', q: 'guqin Chinese zither', label: '古琴曲', must: /(guqin|qin|chinese)/i, not: /(sound library|piano)/i },
  { id: 'mu_erquan', q: 'erhu Chinese', label: '二胡曲', must: /(erhu|er-hu|chinese fiddle)/i, not: /(sound library|tea roots)/i },
  { id: 'mu_chunjiang', q: 'Chinese traditional music ensemble', label: '中国民族管弦乐', must: /(chinese|zhongguo|silk|pentatonic)/i, not: /(sound library)/i },
  { id: 'mu_taiko', q: 'taiko Japanese drum', label: '日本太鼓', must: /(taiko|japanese drum|wadaiko)/i, not: /(sound library|inleiding)/i },
  { id: 'mu_lute', q: 'renaissance lute dance', label: '文艺复兴鲁特琴', must: /(lute|renaissance|dowland|susato|pavan|galliard)/i, not: /(sound library|inleiding)/i },
  { id: 'mu_handel', q: 'Handel Water Music suite', label: '亨德尔《水上音乐》', must: /(water music|handel|händel)/i, not: /(sound library|inleiding)/i },
  { id: 'mu_hymn', q: 'national anthem instrumental band', label: '管乐队进行曲', must: /(march|anthem|band)/i, not: /(sound library|inleiding)/i }
]

function meta(ii, k) { return (ii.extmetadata?.[k]?.value || '').replace(/<[^>]+>/g, ' ').trim() }

const manifestPath = 'public/assets/music/manifest.json'
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : []
const have = new Set(manifest.map(m => m.id))

for (const item of QUERIES) {
  if (have.has(item.id)) { console.log('skip', item.id); continue }
  try {
    const url = `${API}?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(item.q + ' filetype:audio')}&gsrlimit=25&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime|extmetadata`
    const data = curlJson(url)
    const pages = Object.values(data.query?.pages || {})
    const cand = pages
      .filter(p => p.imageinfo?.[0])
      .map(p => ({ title: p.title, ...p.imageinfo[0] }))
      .filter(ii => (ii.mime === 'audio/mpeg' || ii.mime === 'audio/ogg') && ii.size > 800_000 && ii.size < 40_000_000)
      .map(ii => {
        const hay = [ii.title, meta(ii, 'ObjectName'), meta(ii, 'ImageDescription'), meta(ii, 'Artist'), meta(ii, 'TrackTitle')].join(' | ')
        return { ...ii, hay, obj: meta(ii, 'ObjectName') || meta(ii, 'TrackTitle') }
      })
      .filter(ii => item.must.test(ii.hay) && !item.not.test(ii.hay))
      .sort((a, b) => (a.mime === b.mime ? b.size - a.size : a.mime === 'audio/mpeg' ? -1 : 1))
    if (!cand.length) { console.log('NO MATCH', item.id); await sleep(4000); continue }
    const pick = cand.find(c => c.size < 15_000_000) || cand[0]
    const ext = pick.mime === 'audio/mpeg' ? 'mp3' : 'ogg'
    const file = `${item.id}.${ext}`
    execSync(`curl -sL --max-time 300 -A "${UA}" -o "public/assets/music/${file}" "${pick.url}"`, { stdio: 'pipe' })
    manifest.push({ id: item.id, label: item.label, title: pick.title.replace(/^File:/, ''), objectName: pick.obj, file, url: pick.url, size: pick.size, mime: pick.mime, license: meta(pick, 'LicenseShortName') })
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    console.log(`OK ${item.id} <- "${pick.title}" | obj="${pick.obj}" | ${(pick.size / 1e6).toFixed(1)}MB | ${meta(pick, 'LicenseShortName')}`)
  } catch (e) {
    console.log('FAIL', item.id, String(e.message).slice(0, 140))
  }
  await sleep(4500)
}
console.log('DONE manifest:', manifest.length)
