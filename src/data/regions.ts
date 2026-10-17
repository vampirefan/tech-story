import type { EraId, RegionInfo } from '@/types'

/**
 * 地域对比数据：每个区域在 12 个时代的活跃度 0-1。
 * 用于地球国家染色、地域对比雷达图、"谁在领先"的横向比较。
 */
export const REGIONS: RegionInfo[] = [
  {
    id: 'china',
    name: '中国',
    lat: 35,
    lng: 105,
    iso: ['156'],
    note: '农业与青铜起步极早，唐宋达到世界顶峰，四大发明输出全球；明清转向内敛而落后，被鸦片战争撞开国门；1949 年后重建工业体系，1978 年改革开放后高速追赶，今天在 5G、高铁、光伏、电动车、AI 应用上进入世界第一梯队。',
    timeline: {
      stone: 0.55, bronze: 0.80, iron: 0.90, classical: 1.00, medieval: 1.00,
      renaissance: 0.70, industrial: 0.30, electric: 0.25, atomic: 0.45,
      information: 0.50, intelligence: 0.90, future: 0.90
    }
  },
  {
    id: 'mesopotamia',
    name: '两河流域（今伊拉克/叙利亚）',
    lat: 32,
    lng: 44,
    iso: ['368', '760'],
    note: '人类最早的城市、文字、车轮、法典和六十进制都出在这里。因为处在几条大河的冲积平原上，必须组织大规模灌溉，于是"国家"这种协作形式被发明出来。',
    timeline: {
      stone: 0.35, bronze: 1.00, iron: 0.75, classical: 0.45, medieval: 0.55,
      renaissance: 0.20, industrial: 0.10, electric: 0.10, atomic: 0.10,
      information: 0.12, intelligence: 0.10, future: 0.10
    }
  },
  {
    id: 'egypt',
    name: '尼罗河流域（埃及）',
    lat: 26,
    lng: 30,
    iso: ['818'],
    note: '尼罗河每年定期泛滥，让埃及人学会历法、测量和大规模工程。金字塔是组织能力的纪念碑，纸莎草是最早的轻便书写材料之一。',
    timeline: {
      stone: 0.30, bronze: 0.90, iron: 0.50, classical: 0.45, medieval: 0.35,
      renaissance: 0.15, industrial: 0.10, electric: 0.10, atomic: 0.10,
      information: 0.10, intelligence: 0.10, future: 0.10
    }
  },
  {
    id: 'india',
    name: '南亚（印度）',
    lat: 22,
    lng: 78,
    iso: ['356'],
    note: '印度河流域的城市规划领先世界两千年；"0"和十进制位值记数法从这里经阿拉伯传向欧洲，是现代计算的地基；今天它是全球最大的软件服务与仿制药产地之一。',
    timeline: {
      stone: 0.30, bronze: 0.70, iron: 0.70, classical: 0.75, medieval: 0.65,
      renaissance: 0.40, industrial: 0.25, electric: 0.25, atomic: 0.35,
      information: 0.55, intelligence: 0.60, future: 0.55
    }
  },
  {
    id: 'greece',
    name: '地中海东岸（希腊/小亚细亚）',
    lat: 39,
    lng: 23,
    iso: ['300', '792'],
    note: '希腊人把"为什么"变成一门学问：几何证明、逻辑推理、原子论猜想。它不是靠工程领先，而是靠思维方式影响了后面两千年。',
    timeline: {
      stone: 0.20, bronze: 0.45, iron: 0.85, classical: 0.85, medieval: 0.25,
      renaissance: 0.30, industrial: 0.10, electric: 0.10, atomic: 0.10,
      information: 0.12, intelligence: 0.10, future: 0.10
    }
  },
  {
    id: 'rome',
    name: '意大利/西地中海（罗马）',
    lat: 42,
    lng: 12.5,
    iso: ['380'],
    note: '罗马人不太爱做理论研究，但极其擅长工程与制度：混凝土、水道桥、5 万公里道路、成文法、标准化军团。它证明了"组织和标准"本身就是技术。',
    timeline: {
      stone: 0.20, bronze: 0.35, iron: 0.55, classical: 0.95, medieval: 0.35,
      renaissance: 0.55, industrial: 0.35, electric: 0.30, atomic: 0.25,
      information: 0.30, intelligence: 0.30, future: 0.25
    }
  },
  {
    id: 'arab',
    name: '阿拉伯/中东',
    lat: 27,
    lng: 45,
    iso: ['682', '364', '784'],
    note: '公元 8-13 世纪的"翻译运动"把希腊、印度、波斯的知识汇成阿拉伯语，代数(algebra)、算法(algorithm)这些词都来自阿拉伯学者花拉子米。它是连接东西方的知识中转站。',
    timeline: {
      stone: 0.15, bronze: 0.35, iron: 0.45, classical: 0.40, medieval: 0.90,
      renaissance: 0.50, industrial: 0.15, electric: 0.15, atomic: 0.15,
      information: 0.20, intelligence: 0.20, future: 0.25
    }
  },
  {
    id: 'westeurope',
    name: '西欧（英法德荷）',
    lat: 50,
    lng: 5,
    iso: ['826', '250', '276', '528', '056', '724'],
    note: '中世纪时相对落后，但 12 世纪起的大学、机械钟、复式记账、专利制度慢慢积累了"做研究的方法"。科学革命+工业革命让它一下子领先全球两百年。',
    timeline: {
      stone: 0.35, bronze: 0.40, iron: 0.50, classical: 0.55, medieval: 0.45,
      renaissance: 0.95, industrial: 1.00, electric: 0.85, atomic: 0.70,
      information: 0.60, intelligence: 0.55, future: 0.50
    }
  },
  {
    id: 'usa',
    name: '北美（美国）',
    lat: 39,
    lng: -98,
    iso: ['840'],
    note: '一个只有两百多年历史的国家，靠移民、大规模市场、大学与企业实验室的结合，在电力、航空、半导体、互联网、AI 上接连领跑。它的强项是把科学变成产品。',
    timeline: {
      renaissance: 0.10, industrial: 0.55, electric: 0.95, atomic: 1.00,
      information: 1.00, intelligence: 1.00, future: 0.85
    }
  },
  {
    id: 'russia',
    name: '东欧/北亚（俄罗斯/苏联）',
    lat: 58,
    lng: 60,
    iso: ['643'],
    note: '1957 年第一颗人造卫星、1961 年第一个宇航员，证明集中力量办大事在航天领域极其有效；但民用科技与信息产业长期偏弱。这个"偏科"至今影响着它的国力结构。',
    timeline: {
      medieval: 0.25, renaissance: 0.20, industrial: 0.35, electric: 0.55,
      atomic: 0.85, information: 0.35, intelligence: 0.30, future: 0.30
    }
  },
  {
    id: 'japan_korea',
    name: '东亚（日本/韩国）',
    lat: 36,
    lng: 135,
    iso: ['392', '410'],
    note: '日本明治维新用 40 年完成工业化，战后靠精益制造与电子技术崛起；韩国用半导体和造船完成追赶。两国都是"技术引进→消化吸收→反向输出"的教科书案例。',
    timeline: {
      medieval: 0.30, renaissance: 0.25, industrial: 0.20, electric: 0.50,
      atomic: 0.60, information: 0.80, intelligence: 0.65, future: 0.50
    }
  },
  {
    id: 'africa',
    name: '撒哈拉以南非洲',
    lat: 0,
    lng: 22,
    iso: ['566', '404', '710', '180'],
    note: '人类的起点。最早的石器、最早的用火、最早的农业之一都在这里。今天的挑战是把人口红利转成科技能力，移动支付（如 M-Pesa）是本地创新的典型。',
    timeline: {
      stone: 0.95, bronze: 0.45, iron: 0.45, classical: 0.35, medieval: 0.40,
      renaissance: 0.20, industrial: 0.10, electric: 0.12, atomic: 0.15,
      information: 0.25, intelligence: 0.30, future: 0.35
    }
  },
  {
    id: 'americas',
    name: '美洲原住民（玛雅/印加/阿兹特克）',
    lat: 5,
    lng: -80,
    iso: ['484', '604', '068'],
    note: '独立发展出精确的历法、零的概念、梯田与巨型石构建筑，但没有铁器、没有轮式车辆、没有大型驮畜。1532 年几百个西班牙人推翻印加帝国，说明"技术体系"差距比"个人勇气"重要得多。',
    timeline: {
      stone: 0.40, bronze: 0.35, iron: 0.25, classical: 0.40, medieval: 0.45,
      renaissance: 0.30
    }
  },
  {
    id: 'oceania',
    name: '大洋洲（澳大利亚/新西兰）',
    lat: -27,
    lng: 135,
    iso: ['036', '554'],
    note: '原住民在此连续生活六万年，是最古老的持续文化之一；近代则成为南半球的科研与资源型经济体。',
    timeline: {
      stone: 0.45, information: 0.35, intelligence: 0.30, future: 0.25
    }
  }
]

export const REGION_MAP: Record<string, RegionInfo> = REGIONS.reduce((m, r) => {
  m[r.id] = r
  return m
}, {} as Record<string, RegionInfo>)

/** 某时代活跃度最高的前 N 个区域 */
export function topRegions(era: EraId, n = 4): { region: RegionInfo; v: number }[] {
  return REGIONS
    .map(r => ({ region: r, v: r.timeline[era] ?? 0 }))
    .filter(x => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
}

/** ISO numeric -> 区域列表 */
export const ISO_TO_REGIONS: Record<string, string[]> = {}
for (const r of REGIONS) {
  for (const iso of r.iso ?? []) {
    ;(ISO_TO_REGIONS[iso] ||= []).push(r.id)
  }
}
