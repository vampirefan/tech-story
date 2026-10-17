import { REGION_MAP, REGIONS } from '@/data/regions'
import { ERA_MAP, ERA_ORDER } from '@/data/eras'
import { NODE_MAP, NODES } from '@/data/techTree'
import type { EraId } from '@/types'

/**
 * 中国专题页数据
 * ─────────────────────────────────────────────
 * 三幕结构：领先 → 落后 → 复兴。
 * 目的不是"我们最棒"，而是让孩子看清一件事：
 * 技术领先从来不是天生的，落后也不是命定的，
 * 关键在于一个文明愿不愿意开放、愿不愿意投入、愿不愿意让年轻人去学新东西。
 */

export interface ChinaMilestone {
  year: number
  title: string
  note: string
  /** 关联到科技树节点（可跳转） */
  nodeId?: string
  /** up=成就 down=挫折 turn=转折 */
  kind: 'up' | 'down' | 'turn'
}

export interface ChinaAct {
  id: 'golden' | 'fall' | 'rise'
  title: string
  subtitle: string
  period: string
  color: string
  accent: string
  desc: string
  milestones: ChinaMilestone[]
  /** 这一幕想让孩子记住的话 */
  lessons: string[]
}

export const CHINA_ACTS: ChinaAct[] = [
  {
    id: 'golden',
    title: '第一幕 · 领先世界两千年',
    subtitle: 'GOLDEN AGE',
    period: '约公元前 8000 年 — 公元 1500 年',
    color: '#c9a227',
    accent: '#ffd166',
    desc:
      '从黄河、长江边的稻作和粟作农业开始，中国很早就把"人多"变成了"力量大"。' +
      '冶铁比欧洲早一千多年，铸铁技术让铁犁真正下地；都江堰把水害变成水利，用了两千三百年还在用；' +
      '造纸、印刷、火药、指南针四大发明沿着丝绸之路和阿拉伯商人一路向西，' +
      '在几百年后成为欧洲文艺复兴和大航海的技术前提。唐宋两代，长安和开封是当时世界上最大的城市之一。',
    milestones: [
      { year: -8000, title: '稻作与粟作农业', note: '江西万年仙人洞、湖南玉蟾岩发现约一万年前后的稻作遗存；北方黄河流域驯化粟和黍。农业定居是一切文明的前提。', nodeId: 'rice_china', kind: 'up' },
      { year: -5000, title: '最早的陶器', note: '仙人洞遗址陶器碎片距今约两万年，是目前世界最早的陶器之一。', nodeId: 'pottery', kind: 'up' },
      { year: -1600, title: '商代青铜礼器', note: '司母戊鼎重 832 公斤，是当时世界最大的青铜器。分铸法、陶范法工艺极其成熟。', nodeId: 'bronze_china', kind: 'up' },
      { year: -600, title: '铸铁比欧洲早一千多年', note: '中国春秋时期已能铸造生铁；欧洲要到 14 世纪才有高炉铸铁。铁犁牛耕让亩产大幅提高。', nodeId: 'iron_china', kind: 'up' },
      { year: -433, title: '曾侯乙编钟', note: '65 件青铜编钟，一件钟能敲出两个相差三度的音，音域跨五个八度，十二半音齐全。这是声学、冶金、乐律三方面的顶峰。', nodeId: 'bell_china', kind: 'up' },
      { year: -256, title: '都江堰', note: '李冰父子用"鱼嘴分水、飞沙堰泄洪、宝瓶口引水"三个结构，不建大坝就治理了岷江。至今仍在灌溉成都平原一千万亩土地。', nodeId: 'dujiangyan', kind: 'up' },
      { year: -221, title: '秦统一度量衡与文字', note: '标准化本身就是一种技术。车同轨、书同文、统一度量衡，让一个庞大帝国第一次可以协同运转。', nodeId: 'great_wall', kind: 'turn' },
      { year: 105, title: '蔡伦改进造纸术', note: '用树皮、麻头、破布、渔网做原料，把书写材料的价格降到竹简的百分之一。知识从此可以大规模复制。', nodeId: 'paper', kind: 'up' },
      { year: 132, title: '张衡地动仪', note: '世界上第一台测定地震方向的仪器，比欧洲同类装置早约一千七百年。', nodeId: 'seismograph', kind: 'up' },
      { year: 868, title: '《金刚经》雕版印刷', note: '现存最早有明确纪年的印刷品（唐咸通九年）。印刷术让知识传播成本再次暴跌。', nodeId: 'printing', kind: 'up' },
      { year: 1040, title: '毕昇活字印刷', note: '胶泥活字，可拆可复用。比古腾堡金属活字早约四百年——但汉字数量太多，活字在中国没占到便宜，这是技术要匹配语言环境的经典例子。', nodeId: 'printing', kind: 'up' },
      { year: 1088, title: '水运仪象台', note: '苏颂主持建造，高约 12 米，用漏刻水力驱动，有擒纵机构——机械钟的核心零件。英国学者李约瑟称它是"现代钟表的祖先"。', nodeId: 'mechanical_clock', kind: 'up' },
      { year: 1024, title: '官办交子', note: '北宋在四川发行世界最早的官方纸币。信用货币是金融史上的一次抽象飞跃。', nodeId: 'paper_money', kind: 'up' },
      { year: 1132, title: '火药武器化', note: '从炼丹术的副产品变成突火枪、震天雷、火炮。13 世纪经蒙古西征传入阿拉伯和欧洲，彻底终结了骑士与城堡时代。', nodeId: 'gunpowder', kind: 'up' },
      { year: 1405, title: '郑和下西洋', note: '宝船队最远到达东非，规模远超半个世纪后的哥伦布船队。但这是朝贡贸易而非商业扩张，1433 年后被一纸诏令叫停。', nodeId: 'zheng_he', kind: 'turn' },
      { year: 1637, title: '《天工开物》', note: '宋应星系统记录农业、冶金、陶瓷、火药、纺织等 130 多项工艺，被后世称为"中国 17 世纪的工艺百科全书"。', nodeId: 'tiangong', kind: 'up' }
    ],
    lessons: [
      '中国的领先靠的是两样东西：足够大的农业人口，和足够强的组织动员能力。',
      '技术要能扩散才有意义——四大发明向西传了两三百年，最后在欧洲开花结果。',
      '郑和的船队不是被技术打败的，是被"不再需要"打败的。'
    ]
  },
  {
    id: 'fall',
    title: '第二幕 · 三百年错失与一百年的痛',
    subtitle: 'THE GREAT DIVERGENCE',
    period: '公元 1500 年 — 1949 年',
    color: '#8c3f3f',
    accent: '#fb7185',
    desc:
      '就在郑和的船队停在港口的同时，欧洲的印刷机、远洋船、复式记账和大学正在悄悄积累。' +
      '17 世纪牛顿写下《自然哲学的数学原理》，18 世纪瓦特改良蒸汽机，' +
      '而同一时期的清朝正在搞文字狱、闭关锁国、把火器当成骑射的辅助。' +
      '1840 年，几千名英国远征军乘坐蒸汽轮船、装备线膛炮，击溃了四万万人口的帝国。' +
      '这一击打碎的不只是军队，是"天朝上国"的世界观。此后一百年，中国用洋务运动、戊戌变法、辛亥革命、新文化运动、' +
      '西南联大的烽火课堂，一步一步在战火里补课。',
    milestones: [
      { year: 1644, title: '清朝建立与骑射本位', note: '清初火器一度领先（红衣大炮、戴梓的连珠铳），但统治者担心火器普及动摇骑射根本，逐渐转向限制。', kind: 'down' },
      { year: 1793, title: '马戛尔尼使团被拒', note: '英国带来蒸汽机模型、天体运行仪、榴弹炮和军舰模型，乾隆帝的答复是"天朝物产丰盈，无所不有"。这是最贵的一次"没看一眼"。', kind: 'down' },
      { year: 1840, title: '鸦片战争', note: '英国的蒸汽动力军舰、爆破弹和工业化后勤，对上木帆船、抬枪和弓箭。技术代差第一次变成生死差距。', nodeId: 'opium_war', kind: 'down' },
      { year: 1861, title: '洋务运动', note: '"师夷长技以制夷"。建江南制造总局、福州船政局、汉阳铁厂、北洋水师、电报线、铁路。方向对了，但只想学技术、不改制度。', nodeId: 'yangwu', kind: 'turn' },
      { year: 1894, title: '甲午战争惨败', note: '北洋水师全军覆没。事实证明：只买设备、不改体制，装备再好也打不赢。', kind: 'down' },
      { year: 1898, title: '戊戌变法 103 天', note: '康有为、梁启超推动制度层面的改革，百日即败。谭嗣同拒绝逃亡："各国变法，无不从流血而成。"', nodeId: 'reform_1898', kind: 'turn' },
      { year: 1909, title: '京张铁路通车', note: '詹天佑用"人"字形线路解决青龙桥陡坡，这是第一条完全由中国工程师设计和施工的干线铁路。', nodeId: 'railway', kind: 'up' },
      { year: 1911, title: '辛亥革命', note: '两千年帝制终结。但推翻皇帝不等于建起工业，接下来的三十年中国仍在军阀混战与外敌入侵中。', kind: 'turn' },
      { year: 1937, title: '全面抗战', note: '中国的工业基础在战争中被摧毁或内迁。沿海工厂拆成零件，用船、用肩、用牛车搬到重庆、昆明、桂林——史称"中国工业的敦刻尔克"。', nodeId: 'war_of_resistance', kind: 'down' },
      { year: 1938, title: '西南联大', note: '北大、清华、南开在昆明合组，八年培养约 3600 名学生，走出 2 位诺贝尔奖得主、8 位"两弹一星"元勋、170 多位院士。在最穷的年代，中国守住了人才这条命脉。', nodeId: 'war_of_resistance', kind: 'up' },
      { year: 1945, title: '抗战胜利', note: '中国是二战中抵抗时间最长的国家之一，牵制了大量日军。胜利换来的是联合国安理会常任理事国席位，但国内工业已残破不堪。', kind: 'turn' }
    ],
    lessons: [
      '落后不是从造不出东西开始的，是从"不想看世界"开始的。',
      '技术、制度、教育三样必须一起改。洋务运动只改了第一样，所以失败。',
      '西南联大说明：哪怕在最艰难的时候，只要人还在、书还在，就有翻盘的机会。'
    ]
  },
  {
    id: 'rise',
    title: '第三幕 · 用七十年追完两百年',
    subtitle: 'THE COMEBACK',
    period: '公元 1949 年 — 今天',
    color: '#c0392b',
    accent: '#ffb347',
    desc:
      '1949 年的中国，钢产量只有 15.8 万吨，人均预期寿命 35 岁，文盲率超过 80%。' +
      '第一幕靠农业人口领先，第二幕因封闭落后，第三幕的关键词是"体系"：' +
      '先建立起完整的工业门类和教育体系，再用"两弹一星"顶住核讹诈，' +
      '1978 年改革开放把这套体系接入全球市场，用几十年走完了别人两百年的工业化。' +
      '今天的中国拥有联合国产业分类中全部 41 个工业大类、207 个中类、666 个小类，' +
      '在高铁、光伏、动力电池、5G、造船、量子通信、深空探测上进入世界第一梯队。' +
      '但也要诚实：高端光刻机、航空发动机、部分工业软件、高端芯片和生物试剂仍然依赖进口。' +
      '这一棒，正交到今天的四年级学生手里。',
    milestones: [
      { year: 1964, title: '第一颗原子弹', note: '从决定研制到爆炸成功用了不到十年。当时全国用算盘和手摇计算机做理论计算，于敏构型解决了氢弹的关键难题。', nodeId: 'nuclear', kind: 'up' },
      { year: 1967, title: '第一颗氢弹', note: '从原子弹到氢弹只用 2 年 8 个月，是五个核大国中最快的。', kind: 'up' },
      { year: 1965, title: '人工合成结晶牛胰岛素', note: '世界上第一次人工合成具有生物活性的蛋白质，由中科院上海生化所等单位完成。', kind: 'up' },
      { year: 1970, title: '东方红一号', note: '中国第一颗人造卫星，重量超过美苏日法四国首颗卫星之和。《东方红》乐曲从太空传回地面。', nodeId: 'two_bombs', kind: 'up' },
      { year: 1973, title: '杂交水稻三系配套', note: '袁隆平团队实现籼型杂交水稻三系配套，此后累计推广数十亿亩，多养活了几亿人。', nodeId: 'green_revolution', kind: 'up' },
      { year: 1978, title: '改革开放', note: '全国科学大会提出"科学技术是生产力"，高考恢复第二年，经济特区开始设立。中国重新把自己接入世界。', nodeId: 'reform_opening', kind: 'turn' },
      { year: 2003, title: '神舟五号载人飞行', note: '杨利伟绕地球 14 圈，中国成为第三个独立掌握载人航天技术的国家。', nodeId: 'shenzhou', kind: 'up' },
      { year: 2008, title: '京津城际高铁开通', note: '时速 350 公里。今天中国高铁运营里程约 4.6 万公里，超过世界其他国家总和。', nodeId: 'hsr', kind: 'up' },
      { year: 2016, title: 'FAST 天眼与墨子号', note: '500 米口径球面射电望远镜建成，是世界最大单口径射电望远镜；同年"墨子号"量子科学实验卫星发射，实现千公里级量子密钥分发。', nodeId: 'quantum', kind: 'up' },
      { year: 2019, title: '嫦娥四号月背软着陆', note: '人类首次在月球背面软着陆，靠"鹊桥"中继星解决通信问题——这是独一无二的轨道设计。', kind: 'up' },
      { year: 2020, title: '北斗三号全球组网', note: '55 颗卫星，全球定位精度优于 10 米，亚太区域优于 5 米，并独有短报文通信功能。', nodeId: 'beidou', kind: 'up' },
      { year: 2021, title: '祝融号火星车与天宫空间站', note: '天问一号一次任务完成"绕、着、巡"三件事，是世界首次；天和核心舱发射，中国空间站开始建造。', nodeId: 'mars', kind: 'up' },
      { year: 2022, title: '空间站全面建成', note: 'T 字构型三舱在轨，中国成为独立掌握长期载人驻留能力的国家。', nodeId: 'space_station_china', kind: 'up' },
      { year: 2023, title: 'C919 商业首航', note: '国产大飞机投入航线运营。同时"奋斗者"号已完成万米深潜，全海深载人潜水器进入常态化科考。', nodeId: 'c919', kind: 'up' },
      { year: 2026, title: '仍在攻关的领域', note: '极紫外光刻机、先进制程芯片、大涵道比航空发动机、高端工业软件与科研仪器，是这一代人接手的题目。', nodeId: 'chip_lithography', kind: 'turn' }
    ],
    lessons: [
      '从 15.8 万吨钢到全球唯一拥有全部工业门类的国家，用的不是运气，是一代代人接力。',
      '"两弹一星"的意义不只是武器，是让中国在最需要底气的时候有了底气。',
      '今天卡脖子的清单，就是你们这一代人的科研选题清单。'
    ]
  }
]

/** 现代中国的一组硬数据（课堂展示用，均为公开统计口径，标注了约数） */
export interface ChinaNumber {
  k: string
  v: string
  unit: string
  note: string
  source: string
}

export const CHINA_NUMBERS: ChinaNumber[] = [
  { k: '高铁运营里程', v: '约 4.6', unit: '万公里', note: '超过世界其他国家总和，占全球高铁里程七成以上', source: '国铁集团 · 2024 年底' },
  { k: '光伏组件产量', v: '约 80', unit: '%（全球占比）', note: '从硅料到组件，中国在全球光伏产业链各环节占比均超过八成', source: '中国光伏行业协会 · 2023' },
  { k: '新能源汽车产销', v: '约 60', unit: '%（全球占比）', note: '连续多年全球第一，动力电池装机量同样世界第一', source: '中汽协 / SNE Research · 2023' },
  { k: '5G 基站总数', v: '超 400', unit: '万个', note: '全球规模最大、技术领先的移动宽带网络', source: '工信部 · 2024' },
  { k: '全社会研发经费', v: '超 3.3', unit: '万亿元', note: '总量居世界第二，研发投入强度约 2.6%', source: '国家统计局 · 2023' },
  { k: '国际专利申请量', v: '连续多年', unit: '世界第一', note: 'PCT 国际专利申请量自 2019 年起位居全球首位', source: '世界知识产权组织 WIPO' },
  { k: '工业门类', v: '41 大类', unit: '全世界唯一齐全', note: '联合国产业分类中 41 个工业大类、207 个中类、666 个小类全部具备', source: '联合国产业分类 / 工信部' },
  { k: '人均预期寿命', v: '约 78.6', unit: '岁', note: '1949 年约 35 岁，七十多年提高了一倍多', source: '国家卫健委 · 2023' }
]

/** 中国在各时代的活跃度与世界最强者的差距（直接取自地域数据，保证口径一致） */
export interface ChinaVsWorld {
  era: EraId
  name: string
  china: number
  leader: string
  leaderV: number
  /** 中国排名（含并列） */
  rank: number
  note: string
}

export const CHINA_VS_WORLD: ChinaVsWorld[] = ERA_ORDER.map(era => {
  const scored = REGIONS
    .map(r => ({ r, v: r.timeline[era] ?? 0 }))
    .filter(x => x.v > 0)
    .sort((a, b) => b.v - a.v)
  const china = REGION_MAP.china.timeline[era] ?? 0
  const idx = scored.findIndex(x => x.r.id === 'china')
  const leader = scored[0]
  return {
    era,
    name: ERA_MAP[era].short,
    china,
    leader: leader ? leader.r.name : '—',
    leaderV: leader ? leader.v : 0,
    rank: idx < 0 ? scored.length + 1 : idx + 1,
    note: ''
  }
})

/** 每句话对应一个时代的"一句话点评"（课堂讲解口径） */
const ERA_NOTES: Partial<Record<EraId, string>> = {
  stone: '世界最早陶器的出土地之一，稻作农业独立起源。',
  bronze: '商周青铜礼器的规模与工艺，同时代无出其右。',
  iron: '铸铁技术比欧洲早一千多年，铁犁牛耕带来农业革命。',
  classical: '与罗马并立的世界两极，造纸术正在改变知识传播的成本。',
  medieval: '这一千年世界科技中心在东方：活字印刷、火药、水运仪象台、纸币。',
  renaissance: '郑和之后转向内敛，欧洲则用印刷术和航海把世界连成一张网。',
  industrial: '蒸汽机、铁路、炼钢在英国爆发，中国正被鸦片战争撞开国门。',
  electric: '两次世界大战中的工业化能力大比拼，中国在战乱中艰难起步。',
  atomic: '"两弹一星"顶住核讹诈，这是后来一切发展的安全底座。',
  information: '改革开放接入全球市场，中国成为世界工厂。',
  intelligence: '从跟跑到并跑：5G、高铁、光伏、电动车、AI 应用进入第一梯队。',
  future: '可控核聚变、量子计算、深空探测——题目已经出好了。'
}
for (const row of CHINA_VS_WORLD) row.note = ERA_NOTES[row.era] ?? ''

/** 四大发明西传路线（时间 + 路径 + 后果） */
export interface Transmission {
  what: string
  nodeId: string
  path: { year: number; place: string; note: string }[]
  effect: string
}

export const TRANSMISSIONS: Transmission[] = [
  {
    what: '造纸术',
    nodeId: 'paper',
    path: [
      { year: 105, place: '中国（东汉）', note: '蔡伦改进工艺，用树皮麻头破布渔网做原料' },
      { year: 400, place: '朝鲜半岛', note: '随佛教典籍东传' },
      { year: 610, place: '日本', note: '僧人昙征带去造纸与墨的工艺' },
      { year: 751, place: '撒马尔罕', note: '怛罗斯之战后，被俘的唐朝造纸工匠在此建起阿拉伯第一座纸坊' },
      { year: 900, place: '巴格达 / 大马士革', note: '阿拉伯"翻译运动"把希腊印度典籍抄在纸上' },
      { year: 1150, place: '西班牙萨蒂瓦', note: '欧洲第一座纸坊' },
      { year: 1276, place: '意大利法布里亚诺', note: '欧洲造纸中心，改用水力打浆' }
    ],
    effect: '书写成本降到羊皮纸的几十分之一。没有便宜的纸，就没有便宜的印刷品，也就没有宗教改革和科学革命。'
  },
  {
    what: '印刷术',
    nodeId: 'printing',
    path: [
      { year: 868, place: '中国（唐）', note: '《金刚经》雕版印刷，现存最早有明确纪年的印刷品' },
      { year: 1040, place: '中国（北宋）', note: '毕昇发明胶泥活字' },
      { year: 1234, place: '高丽', note: '金属活字印刷《详定礼文》' },
      { year: 1450, place: '德国美因茨', note: '古腾堡把活字、油墨、螺旋压酒机组合成印刷机' }
    ],
    effect: '一本书的价格降到手抄本的百分之一。知识第一次从修道院和宫廷走出来，欧洲识字率在百年内翻了几倍。'
  },
  {
    what: '火药',
    nodeId: 'gunpowder',
    path: [
      { year: 850, place: '中国（唐）', note: '炼丹家的副产品，《真元妙道要略》已记载硫磺硝石混合会爆燃' },
      { year: 1044, place: '中国（北宋）', note: '《武经总要》记录三种火药配方和火箭、火球、蒺藜火球' },
      { year: 1241, place: '中欧（列格尼卡）', note: '蒙古西征把火器带到欧洲战场' },
      { year: 1267, place: '英国牛津', note: '罗吉尔·培根在著作中记下火药配方' },
      { year: 1326, place: '佛罗伦萨 / 梅斯', note: '欧洲最早的城市火炮记录' }
    ],
    effect: '火炮终结了城堡和骑士阶层——欧洲封建制度是被炸药炸塌的。它同时也开启了此后五百年"技术即国力"的残酷竞争。'
  },
  {
    what: '指南针',
    nodeId: 'compass',
    path: [
      { year: -300, place: '中国（战国）', note: '司南：天然磁石磨成的勺形指向器' },
      { year: 1044, place: '中国（北宋）', note: '《武经总要》记载指南鱼（人工磁化）' },
      { year: 1119, place: '中国（北宋）', note: '朱彧《萍洲可谈》记录广州海船"夜观星、昼观日、阴晦观指南针"' },
      { year: 1190, place: '英国', note: '内克姆记载欧洲船只使用磁针' },
      { year: 1400, place: '地中海', note: '旱罗盘与方位卡成熟，远洋航行成为可能' }
    ],
    effect: '有了它，船才敢离开海岸线。大航海、哥伦布、麦哲伦、全球贸易网，都从一根磁针开始。'
  }
]

/** 仍然存在的短板（诚实清单，避免只讲好话） */
export interface GapItem {
  field: string
  status: string
  detail: string
  nodeId?: string
}

export const CHINA_GAPS: GapItem[] = [
  { field: '极紫外光刻机', status: '尚无国产量产设备', detail: '全球仅荷兰 ASML 能造 EUV 光刻机，一台约 10 万个零件、需要全球供应链。中国在 DUV 与配套光源、光学系统上正加速攻关。', nodeId: 'chip_lithography' },
  { field: '先进制程芯片', status: '设计领先，制造受限', detail: '芯片设计能力已进入世界前列，但最先进制程的量产仍受设备与材料限制。', nodeId: 'ic' },
  { field: '大涵道比航空发动机', status: '正在追赶', detail: 'CJ-1000A 等型号在研。航空发动机被称为"工业皇冠上的明珠"，涉及单晶叶片、粉末盘、热障涂层等上百项工艺。', nodeId: 'c919' },
  { field: '高端工业软件', status: '依赖进口为主', detail: 'EDA、CAD/CAE、工业操作系统等仍由少数外国公司主导，国产替代刚刚起步。', nodeId: 'software' },
  { field: '高端科研仪器与试剂', status: '部分卡脖子', detail: '高端质谱、电镜、基因测序仪、部分生物试剂进口比例较高。这直接影响基础研究的自主性。', nodeId: 'biotech' },
  { field: '基础研究与原创理论', status: '投入结构待优化', detail: '中国基础研究占研发经费比例约 6%+，而发达国家通常在 15% 以上。追赶靠工程，领跑要靠基础科学。', nodeId: 'scientific_method' }
]

/** 结尾：写给孩子的三句话 */
export const CHINA_CONCLUSION = {
  title: '地理造就历史，选择决定未来',
  lines: [
    '中国的领先不是天生的——是黄土地里长出来的稻子、是都江堰里算出来的水、是窑炉前试了一万次的配方。',
    '中国的落后也不是命定的——是某一天我们决定不再抬头看世界，于是世界就走到了前面。',
    '今天的中国又回到牌桌前，但桌上最难的那几张牌还没拿到。'
  ],
  ask: [
    '你愿不愿意成为拿到那几张牌的人？',
    '科学不是天才的游戏，它是"认真观察、大胆猜想、老实验证"的习惯。',
    '从今天这节课开始，看见一个现象就问一句：为什么会这样？'
  ]
}

/** 中国相关节点（chinaLink>=2），按年份排序，供专题页时间带使用 */
export const CHINA_NODES = NODES
  .filter(n => n.chinaLink >= 2)
  .sort((a, b) => a.year - b.year)

/** 按时代分组的中国节点 */
export const CHINA_NODES_BY_ERA: Partial<Record<EraId, typeof NODES>> = ERA_ORDER.reduce((m, era) => {
  m[era] = CHINA_NODES.filter(n => n.era === era)
  return m
}, {} as Partial<Record<EraId, typeof NODES>>)

/** 里程碑中引用的节点是否存在（开发期自检） */
export function validateChina(): string[] {
  const problems: string[] = []
  for (const act of CHINA_ACTS) {
    for (const m of act.milestones) {
      if (m.nodeId && !NODE_MAP[m.nodeId]) problems.push(`${act.id} 里程碑「${m.title}」引用了不存在的节点 ${m.nodeId}`)
    }
  }
  for (const t of TRANSMISSIONS) {
    if (!NODE_MAP[t.nodeId]) problems.push(`传播路线「${t.what}」引用了不存在的节点 ${t.nodeId}`)
    for (const p of t.path) if (p.year > 2100 || p.year < -3000) problems.push(`传播路线「${t.what}」年份异常 ${p.year}`)
  }
  for (const g of CHINA_GAPS) {
    if (g.nodeId && !NODE_MAP[g.nodeId]) problems.push(`短板「${g.field}」引用了不存在的节点 ${g.nodeId}`)
  }
  return problems
}
