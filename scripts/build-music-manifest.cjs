const fs = require('fs')
const path = 'public/assets/music'

const META = {
  era_industrial:   { label: '贝多芬《第九交响曲·欢乐颂》', title: 'Ludwig van Beethoven - Symphony No. 9 "Ode to Joy"', performer: 'Band of the Rockies, United States Air Force', license: 'Public Domain (U.S. Gov)', era: 'industrial' },
  era_information:  { label: '苏萨《星条旗永不落》', title: 'Stars and Stripes Forever', performer: 'United States Marine Band', license: 'Public Domain', era: 'information' },
  era_modern:       { label: '霍尔斯特《行星组曲·水星》', title: 'Gustav Holst - The Planets: Mercury, the Winged Messenger', performer: 'United States Air Force Band', license: 'Public Domain (U.S. Gov)', era: 'atomic' },
  era_modern2:      { label: '德彪西《月光》', title: 'Claude Debussy - Clair de Lune', performer: 'Wright Brass, United States Air Force', license: 'Public Domain (U.S. Gov)', era: 'electric' },
  era_renaissance:  { label: '莫扎特《如此微风》(合唱)', title: 'W.A. Mozart - Soave sia il vento (Così fan tutte)', performer: 'The United States Air Force Singing Sergeants', license: 'Public Domain (U.S. Gov)', era: 'renaissance' },
  mu_bach:          { label: '巴赫《G弦上的咏叹调》', title: 'J.S. Bach - Air on the G String (Orchestral Suite No. 3)', performer: 'Air Force Strings, United States Air Force Band', license: 'Public Domain (U.S. Gov)', era: 'classical' },
  mu_chant:         { label: '格里高利圣咏', title: 'Gregorian Chant', performer: 'Anonymous', license: 'Public Domain', era: 'medieval' },
  mu_vivaldi:       { label: '维瓦尔第《四季·秋》', title: 'A. Vivaldi - The Four Seasons Op.8: Autumn (RV 293)', performer: 'The Modena Chamber Orchestra', license: 'PDM-owner', era: 'renaissance' },
  mu_dvorak:        { label: '德沃夏克《自新大陆·念故乡》', title: 'A. Dvořák - Symphony No. 9 "From the New World": Largo (Goin\' Home)', performer: 'United States Air Force Band Concert Band', license: 'Public Domain (U.S. Gov)', era: 'industrial' },
  mu_satie:         { label: '萨蒂《裸体歌舞第一号》', title: 'Erik Satie - Gymnopédie No. 1', performer: 'Anonymous', license: 'Public Domain', era: 'electric' },
  mu_strauss:       { label: '施特劳斯《蓝色多瑙河》', title: 'Johann Strauss II - An der schönen blauen Donau', performer: 'United States Marine Band', license: 'Public Domain (U.S. Gov)', era: 'atomic' },
  mu_march:         { label: '苏萨《皇家小号进行曲》', title: 'John Philip Sousa - March of the Royal Trumpets', performer: 'United States Marine Band (2017)', license: 'Public Domain (U.S. Gov)', era: 'information' },
  mu_erquan:        { label: '二胡曲《Erhu on 3》', title: 'Erhu on 3', performer: 'Antti Luode', license: 'CC BY 3.0', era: 'china' }
}

const out = []
for (const f of fs.readdirSync(path).filter(x => /\.(mp3|ogg)$/.test(x))) {
  const id = f.replace(/\.(mp3|ogg)$/, '')
  const meta = META[id]
  if (!meta) { console.log('no meta for', id); continue }
  out.push({ id, file: f, ...meta, size: fs.statSync(`${path}/${f}`).size })
}
fs.writeFileSync(`${path}/manifest.json`, JSON.stringify(out, null, 2))
console.log(`manifest: ${out.length} tracks`)
out.forEach(x => console.log(` ${x.id.padEnd(18)} ${(x.size / 1e6).toFixed(1).padStart(5)}MB  ${x.label}`))
