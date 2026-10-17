import type { EraId } from '@/types'

export interface Track {
  id: string
  file: string
  label: string
  title: string
  performer: string
  license: string
  /** 建议搭配的时代 */
  era?: EraId | 'china'
  /** 秒（估算，用于 UI 显示） */
  approx?: number
}

/**
 * 全部为公有领域或 CC 授权的真实录音（Wikimedia Commons / 美军军乐队 / Musopen）。
 * 硬编码而非运行时 fetch，是为了在 Electron 的 file:// 协议下也能工作。
 */
export const TRACKS: Track[] = [
  { id: 'mu_bach',         file: 'mu_bach.mp3',         label: '巴赫《G弦上的咏叹调》',       title: 'Air on the G String (Orchestral Suite No. 3)', performer: 'Air Force Strings · 美国空军军乐队', license: 'Public Domain', era: 'classical', approx: 300 },
  { id: 'mu_chant',        file: 'mu_chant.mp3',        label: '格里高利圣咏',                 title: 'Gregorian Chant',                              performer: 'Anonymous',                              license: 'Public Domain', era: 'medieval',  approx: 250 },
  { id: 'mu_vivaldi',      file: 'mu_vivaldi.mp3',      label: '维瓦尔第《四季·秋》',          title: 'The Four Seasons Op.8: Autumn (RV 293)',        performer: 'The Modena Chamber Orchestra',           license: 'PDM-owner',     era: 'renaissance', approx: 340 },
  { id: 'era_renaissance', file: 'era_renaissance.mp3', label: '莫扎特《如此微风》(合唱)',      title: 'Soave sia il vento (Così fan tutte)',           performer: '美国空军歌唱军士合唱团',                  license: 'Public Domain', era: 'renaissance', approx: 192 },
  { id: 'era_industrial',  file: 'era_industrial.mp3',  label: '贝多芬《第九交响曲·欢乐颂》',   title: 'Symphony No. 9 "Ode to Joy"',                   performer: 'Band of the Rockies · 美国空军军乐队',    license: 'Public Domain', era: 'industrial', approx: 220 },
  { id: 'mu_dvorak',       file: 'mu_dvorak.mp3',       label: '德沃夏克《自新大陆·念故乡》',   title: 'Symphony No. 9 "From the New World": Largo',     performer: '美国空军军乐队管乐团',                    license: 'Public Domain', era: 'industrial', approx: 310 },
  { id: 'mu_satie',        file: 'mu_satie.mp3',        label: '萨蒂《裸体歌舞第一号》',        title: 'Gymnopédie No. 1',                              performer: 'Anonymous',                              license: 'Public Domain', era: 'electric',   approx: 300 },
  { id: 'era_modern2',     file: 'era_modern2.mp3',     label: '德彪西《月光》',                title: 'Clair de Lune',                                 performer: 'Wright Brass · 美国空军军乐队',           license: 'Public Domain', era: 'electric',   approx: 280 },
  { id: 'era_modern',      file: 'era_modern.mp3',      label: '霍尔斯特《行星组曲·水星》',     title: 'The Planets: Mercury, the Winged Messenger',    performer: '美国空军军乐队',                          license: 'Public Domain', era: 'atomic',     approx: 280 },
  { id: 'mu_strauss',      file: 'mu_strauss.mp3',      label: '施特劳斯《蓝色多瑙河》',        title: 'An der schönen blauen Donau',                   performer: 'United States Marine Band',              license: 'Public Domain', era: 'atomic',     approx: 520 },
  { id: 'era_information', file: 'era_information.mp3', label: '苏萨《星条旗永不落》',          title: 'Stars and Stripes Forever',                     performer: 'United States Marine Band',              license: 'Public Domain', era: 'information', approx: 224 },
  { id: 'mu_march',        file: 'mu_march.mp3',        label: '苏萨《皇家小号进行曲》',        title: 'March of the Royal Trumpets',                   performer: 'United States Marine Band (2017)',       license: 'Public Domain', era: 'information', approx: 240 },
  { id: 'mu_erquan',       file: 'mu_erquan.mp3',       label: '二胡曲《Erhu on 3》',           title: 'Erhu on 3',                                     performer: 'Antti Luode',                            license: 'CC BY 3.0',     era: 'china',      approx: 180 }
]

export const TRACK_MAP: Record<string, Track> = TRACKS.reduce((m, t) => { m[t.id] = t; return m }, {} as Record<string, Track>)

/** 每个时代默认播放的真实曲目；没有的走程序合成氛围 */
export const ERA_TRACKS: Partial<Record<EraId | 'china', string>> = {
  classical: 'mu_bach',
  medieval: 'mu_chant',
  renaissance: 'mu_vivaldi',
  industrial: 'era_industrial',
  electric: 'mu_satie',
  atomic: 'era_modern',
  information: 'mu_march',
  china: 'mu_erquan'
}

/** 纯程序合成的时代（Commons 上没有可靠的公有领域录音） */
export const SYNTH_ERAS: (EraId | 'china')[] = ['stone', 'bronze', 'iron', 'intelligence', 'future']

export function trackUrl(id: string): string | null {
  const t = TRACK_MAP[id]
  return t ? `${import.meta.env.BASE_URL}assets/music/${t.file}` : null
}
