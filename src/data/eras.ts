import type { Era, EraId } from '@/types'

/**
 * 十二个时代。年份为整数，负数 = 公元前。
 * powers.strength 0-1 表示该区域在这个时代的科技/组织活跃度，用于地球染色与横向对比。
 */
export const ERAS: Era[] = [
  {
    id: 'stone',
    name: '石器时代',
    short: '石器',
    from: -2500000,
    to: -3500,
    tagline: '用石头和火，人类第一次改造了自然',
    color: '#8a6a4f',
    accent: '#e0a370',
    music: 'synth:stone',
    desc: '两百五十万年里，人类做的最重要的两件事是：把石头敲出锋利的边，把火留在身边。工具让手变强，火让胃变轻、让夜晚变安全，也让人类第一次能走出非洲、走进冰天雪地。',
    powers: [
      { region: '东非大裂谷', note: '最早的石器与用火痕迹', strength: 0.95 },
      { region: '欧亚大陆', note: '智人扩散，缝制衣物、投矛器', strength: 0.7 },
      { region: '中国南方', note: '两万年前最早的陶器（江西仙人洞）', strength: 0.6 },
      { region: '西亚新月沃地', note: '末期出现定居与最早驯化', strength: 0.5 }
    ]
  },
  {
    id: 'bronze',
    name: '青铜时代',
    short: '青铜',
    from: -3500,
    to: -1200,
    tagline: '城市、文字、车轮，一起出现在大河边上',
    color: '#b08d57',
    accent: '#f0c674',
    music: 'synth:bronze',
    desc: '尼罗河、两河、印度河、黄河，四条大河边同时长出城市。青铜是第一种"配方材料"——把铜和锡按比例混起来，就得到比两者都硬的合金。人类第一次发现：配比可以创造新东西。',
    powers: [
      { region: '美索不达米亚', note: '苏美尔城邦、楔形文字、车轮', strength: 1.0 },
      { region: '古埃及', note: '金字塔、历法、纸莎草', strength: 0.9 },
      { region: '中国（夏商）', note: '二里头青铜礼器、甲骨文', strength: 0.8 },
      { region: '印度河流域', note: '哈拉帕城市下水道规划', strength: 0.7 },
      { region: '爱琴海', note: '米诺斯航海与宫殿', strength: 0.55 }
    ]
  },
  {
    id: 'iron',
    name: '铁器时代',
    short: '铁器',
    from: -1200,
    to: -500,
    tagline: '便宜的铁，把力量从少数贵族手里分了出去',
    color: '#8c96a6',
    accent: '#c9d6e8',
    music: 'synth:iron',
    desc: '青铜要铜和锡，锡很稀有，所以青铜是贵族的。铁矿到处都有，一旦学会高温冶炼，普通农民也能有铁犁、普通士兵也能有铁剑。技术一旦变便宜，社会结构就会跟着变。',
    powers: [
      { region: '安纳托利亚（赫梯）', note: '最早的规模化冶铁', strength: 0.95 },
      { region: '中国（春秋）', note: '铸铁比欧洲早一千多年、铁犁牛耕', strength: 0.9 },
      { region: '希腊', note: '城邦、字母、几何与哲学', strength: 0.85 },
      { region: '腓尼基', note: '字母表与地中海贸易网', strength: 0.8 },
      { region: '印度（恒河）', note: '铁器开林、城市复兴', strength: 0.7 }
    ]
  },
  {
    id: 'classical',
    name: '古典时代',
    short: '古典',
    from: -500,
    to: 500,
    tagline: '两大帝国在欧亚两端遥遥相望，中间是丝绸之路',
    color: '#7f8fa6',
    accent: '#dfe6f2',
    music: 'synth:classical',
    desc: '汉帝国和罗马帝国各自把大片土地连成一体。罗马靠水泥、道路、水道把工程做到极致；中国靠造纸、铁器、水利和文官制度把治理做到极致。两条路上跑的骆驼商队，第一次让欧亚大陆变成一个信息圈。',
    powers: [
      { region: '中国（秦汉）', note: '造纸术、地动仪、都江堰、统一度量衡', strength: 1.0 },
      { region: '罗马帝国', note: '混凝土、水道桥、道路网、历法', strength: 0.95 },
      { region: '印度（孔雀/笈多）', note: '零的概念、冶铁柱、佛教传播', strength: 0.75 },
      { region: '波斯（安息/萨珊）', note: '丝路中转、风车、水利暗渠', strength: 0.65 }
    ]
  },
  {
    id: 'medieval',
    name: '中世纪',
    short: '中世纪',
    from: 500,
    to: 1400,
    tagline: '欧洲在打盹，中国的四大发明和阿拉伯的代数正在改变世界',
    color: '#6b7b8f',
    accent: '#b8c8dc',
    music: 'synth:medieval',
    desc: '这一千年，世界科技中心在东方。中国的造纸、印刷、火药、指南针通过阿拉伯人传到欧洲；阿拉伯学者把希腊典籍翻译成阿拉伯语，还发明了代数和把印度数字传下去。欧洲则要等到黑死病之后，才开始重新加速。',
    powers: [
      { region: '中国（唐宋）', note: '活字印刷、火药、水运仪象台、交子纸币', strength: 1.0 },
      { region: '阿拉伯帝国', note: '代数、光学、医院、翻译运动', strength: 0.9 },
      { region: '拜占庭', note: '保存希腊典籍、希腊火', strength: 0.6 },
      { region: '西欧', note: '12 世纪后才出现大学与机械钟', strength: 0.45 },
      { region: '美洲（玛雅/印加）', note: '天文历法、结绳记事', strength: 0.4 }
    ]
  },
  {
    id: 'renaissance',
    name: '大航海与科学革命',
    short: '大航海',
    from: 1400,
    to: 1700,
    tagline: '印刷机、指南针和望远镜，把世界的边界彻底推开',
    color: '#3f7d8c',
    accent: '#6fd3e8',
    music: 'era_renaissance.mp3',
    desc: '古腾堡的印刷机把知识的价格打到百分之一；远洋船队把地球真正连成一张网；伽利略把望远镜指向天空，又用斜面实验确立了"先测量、再下结论"的科学方法。牛顿最后把这一切写成三个公式。',
    powers: [
      { region: '西欧（英荷法）', note: '科学方法、微积分、航海技术', strength: 1.0 },
      { region: '伊比利亚', note: '大航海、全球航线', strength: 0.85 },
      { region: '中国（明清）', note: '郑和之后转向内敛，仍有《天工开物》', strength: 0.7 },
      { region: '奥斯曼', note: '火器帝国、天文台', strength: 0.6 },
      { region: '印度（莫卧儿）', note: '纺织与建筑工艺', strength: 0.55 }
    ]
  },
  {
    id: 'industrial',
    name: '工业革命',
    short: '工业',
    from: 1700,
    to: 1870,
    tagline: '蒸汽把煤变成动力，人类第一次不再靠肌肉干活',
    color: '#8c5a3f',
    accent: '#ff9d5c',
    music: 'era_industrial.mp3',
    desc: '瓦特改良蒸汽机，煤成了新的阳光。纺织机、火车、轮船、电报把时间和距离同时压缩。同一时期，中国正被鸦片战争撞开国门——技术差距第一次变成生死差距。',
    powers: [
      { region: '英国', note: '蒸汽机、铁路、炼钢、全球工厂', strength: 1.0 },
      { region: '法国', note: '化学、摄影术、度量衡', strength: 0.75 },
      { region: '美国', note: '可互换零件、电报网、缝纫机', strength: 0.7 },
      { region: '德意志诸邦', note: '化学工业、大学研究型教育', strength: 0.6 },
      { region: '中国（清）', note: '洋务运动起步，整体落后', strength: 0.3 }
    ]
  },
  {
    id: 'electric',
    name: '电气时代',
    short: '电气',
    from: 1870,
    to: 1945,
    tagline: '电、电话、内燃机、飞机，还有两场世界大战',
    color: '#b8912f',
    accent: '#ffe066',
    music: 'era_information.mp3',
    desc: '发电机把电变成可以输送的商品，爱迪生让它照亮街道，特斯拉让它跑进工厂。贝尔的电话、马可尼的无线电、本茨的汽车、莱特的飞机，把世界装进了一个"实时通讯+机动"的网里。两次世界大战则残酷地证明：科技会同时放大创造和毁灭。',
    powers: [
      { region: '美国', note: '电力系统、流水线、航空工业', strength: 1.0 },
      { region: '德国', note: '化学、电气、内燃机、火箭', strength: 0.9 },
      { region: '英国', note: '雷达、青霉素、图灵破译', strength: 0.85 },
      { region: '苏联', note: '重工业与航空、后期核计划', strength: 0.7 },
      { region: '日本', note: '明治维新后的快速工业化', strength: 0.6 },
      { region: '中国', note: '战乱中艰难起步，铁路与电报引入', strength: 0.25 }
    ]
  },
  {
    id: 'atomic',
    name: '原子与太空时代',
    short: '太空',
    from: 1945,
    to: 1975,
    tagline: '人类既能登上月球，也能毁灭自己',
    color: '#4a6fa5',
    accent: '#8fc7ff',
    music: 'era_modern.mp3',
    desc: '晶体管和集成电路让计算从房间缩小到指甲盖；DNA 双螺旋让生命第一次可以被"读出来"；美苏太空竞赛把人类送上月球。中国在同一时期用"两弹一星"顶住了核讹诈，这是后来一切发展的安全底座。',
    powers: [
      { region: '美国', note: '半导体、登月、互联网前身', strength: 1.0 },
      { region: '苏联', note: '第一颗卫星、第一个宇航员', strength: 0.85 },
      { region: '西欧/日本', note: '消费电子、汽车、精密制造', strength: 0.6 },
      { region: '中国', note: '两弹一星、人工合成胰岛素、杂交水稻', strength: 0.45 }
    ]
  },
  {
    id: 'information',
    name: '信息时代',
    short: '信息',
    from: 1975,
    to: 2005,
    tagline: '个人电脑和互联网，把每个人变成信息的生产者',
    color: '#2f8f6f',
    accent: '#6ff0c0',
    music: 'era_modern2.mp3',
    desc: '万维网让全世界的文档互相链接，摩尔定律让芯片每两年便宜一半、快一倍。1978 年中国开始改革开放，用几十年时间走完了别人两百年的工业化路程，成为世界工厂。',
    powers: [
      { region: '美国', note: 'PC、互联网、操作系统、芯片设计', strength: 1.0 },
      { region: '东亚（日韩台）', note: '存储芯片、显示面板、精密制造', strength: 0.75 },
      { region: '欧盟', note: 'GSM 移动通信标准、大型科研装置', strength: 0.6 },
      { region: '中国', note: '世界工厂、基础设施建设、北斗起步', strength: 0.5 }
    ]
  },
  {
    id: 'intelligence',
    name: '智能时代',
    short: '智能',
    from: 2005,
    to: 2026,
    tagline: '数据、算力和算法汇合，机器开始"学会"学习',
    color: '#7a4fb0',
    accent: '#c79bff',
    music: 'synth:intelligence',
    desc: '智能手机把传感器和网络塞进口袋，云计算提供近乎无限的算力，深度学习让机器第一次真正识别图像和语言。中国在这一轮里从跟跑变成并跑：5G、高铁、光伏、电动车、移动支付、大模型都进入世界第一梯队。',
    powers: [
      { region: '美国', note: 'AI 基础研究、GPU、大模型、商业航天', strength: 1.0 },
      { region: '中国', note: '5G、高铁、光伏、电动车、AI 应用', strength: 0.9 },
      { region: '欧盟', note: 'ASML 光刻机、规则与标准制定', strength: 0.6 },
      { region: '东亚（日韩台）', note: '先进制程代工、材料与设备', strength: 0.65 }
    ]
  },
  {
    id: 'future',
    name: '未来',
    short: '未来',
    from: 2026,
    to: 2100,
    tagline: '下一步：可控核聚变、量子计算、脑机接口、星际航行',
    color: '#00d4ff',
    accent: '#ffffff',
    music: 'synth:future',
    desc: '这些还没有发生，但原理已经在实验室里跑通了。未来的科学家、工程师和决策者，就坐在今天这间教室里。',
    powers: [
      { region: '中国', note: '可控核聚变装置、量子通信、深空探测', strength: 0.9 },
      { region: '美国', note: '聚变创业、通用人工智能、火星计划', strength: 0.9 },
      { region: '欧盟', note: 'ITER 主机、量子旗舰计划', strength: 0.6 },
      { region: '全球协作', note: '气候与能源问题只能一起解', strength: 0.8 }
    ]
  }
]

export const ERA_ORDER: EraId[] = ERAS.map(e => e.id)

export const ERA_MAP: Record<EraId, Era> = ERAS.reduce((m, e) => {
  m[e.id] = e
  return m
}, {} as Record<EraId, Era>)

/** 把年份转成中文可读标签 */
export function yearLabel(year: number): string {
  if (year < 0) {
    const y = -year
    if (y >= 10000) return `公元前 ${(y / 10000).toFixed(y % 10000 === 0 ? 0 : 1)} 万年`
    return `公元前 ${y} 年`
  }
  if (year >= 10000) return `公元 ${(year / 10000).toFixed(1)} 万年后`
  return `公元 ${year} 年`
}

/** 时间轴映射：把 [-2.5e6, 2100] 非线性压到 [0,1]，让近代不被压扁 */
const BREAKS: [number, number][] = [
  [-2500000, 0.00],
  [-100000, 0.16],
  [-10000, 0.30],
  [-3500, 0.40],
  [-1200, 0.46],
  [-500, 0.52],
  [0, 0.56],
  [500, 0.61],
  [1400, 0.68],
  [1700, 0.74],
  [1870, 0.80],
  [1945, 0.86],
  [1975, 0.91],
  [2005, 0.955],
  [2026, 0.985],
  [2100, 1.00]
]

export function yearToT(year: number): number {
  const ys = BREAKS
  for (let i = 0; i < ys.length - 1; i++) {
    const [a, ta] = ys[i]
    const [b, tb] = ys[i + 1]
    if (year >= a && year <= b) {
      const f = (year - a) / (b - a)
      return ta + f * (tb - ta)
    }
  }
  return year < ys[0][0] ? 0 : 1
}

export function tToYear(t: number): number {
  const ys = BREAKS
  const cl = Math.max(0, Math.min(1, t))
  for (let i = 0; i < ys.length - 1; i++) {
    const [a, ta] = ys[i]
    const [b, tb] = ys[i + 1]
    if (cl >= ta && cl <= tb) {
      const f = tb === ta ? 0 : (cl - ta) / (tb - ta)
      return Math.round(a + f * (b - a))
    }
  }
  return ys[ys.length - 1][0]
}

/** 给定年份，返回它属于哪个时代 */
export function eraOfYear(year: number): Era {
  for (const e of ERAS) {
    if (year >= e.from && year < e.to) return e
  }
  return year < ERAS[0].from ? ERAS[0] : ERAS[ERAS.length - 1]
}
