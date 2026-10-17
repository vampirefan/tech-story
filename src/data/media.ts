import type { MediaItem } from '@/types'

/**
 * 拓展知识卡片库：书籍 / 影视 / 游戏 / 音乐。
 * 节点通过 mediaIds 引用，避免同一条目重复出现在几十个节点里。
 * 全部为真实存在的作品，年份与作者已核对。
 */
export const MEDIA_LIBRARY: Record<string, MediaItem> = {
  // ───────────── 书籍 · 通识 ─────────────
  b_sapiens: { cover: 'assets/covers/b_sapiens.jpg', kind: 'book', title: '人类简史', author: '尤瓦尔·赫拉利 · 2011', intro: '从认知革命、农业革命到科学革命，讲人类如何靠"讲故事的能力"统治地球。', reason: '和我们这门课的时间线几乎完全对应，是最好的课后延伸阅读。', palette: ['#1d4e6b', '#0a1c2b'], glyph: '\u{1F30D}' },
  b_guns: { cover: 'assets/covers/b_guns.jpg', kind: 'book', title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德 · 1997', intro: '为什么是欧亚文明征服了美洲和非洲？答案是地理、气候和可驯化动植物，而不是人种。', reason: '这正是我们"地理造就历史"这条主线的学术出处。', palette: ['#5c4a1f', '#1a1408'], glyph: '\u{1F5FA}' },
  b_bryson: { cover: 'assets/covers/b_bryson.jpg', kind: 'book', title: '万物简史', author: '比尔·布莱森 · 2003', intro: '用极其好笑的口吻讲宇宙、地球、原子和生命是怎么被一点点搞明白的。', reason: '四年级就能读懂，而且会笑出声，是最适合的科学入门书。', palette: ['#2c5f4a', '#0b1f18'], glyph: '\u{1F52D}' },
  b_needham: { cover: 'assets/covers/b_needham.jpg', kind: 'book', title: '中国科学技术史', author: '李约瑟 · 1954 起', intro: '英国科学家花了一辈子，把中国古代科技成就系统介绍给全世界。', reason: '"李约瑟难题"——为什么近代科学没在中国诞生——值得每个中国学生想一想。', palette: ['#7a2f2f', '#241010'], glyph: '\u{1F4DC}' },
  b_david: { cover: 'assets/covers/b_david.jpg', kind: 'book', title: '万物运转的秘密', author: '大卫·麦考利 · 1988', intro: '猛犸象带你把杠杆、滑轮、齿轮、发动机一路拆开看清楚。', reason: '手绘剖面图和我们课上的原理动画是一个思路，配合看效果最好。', palette: ['#3a5a7a', '#101c28'], glyph: '\u2699\uFE0F' },
  b_gamow: { cover: 'assets/covers/b_gamow.jpg', kind: 'book', title: '从一到无穷大', author: '乔治·伽莫夫 · 1947', intro: '讲数、无穷、四维空间和遗传密码，一本影响了中国几代科学家的老书。', reason: '很多院士说他们是看了这本书才决定学科学的。', palette: ['#4a3a7a', '#150f28'], glyph: '\u221E' },
  b_hawking: { cover: 'assets/covers/b_hawking.jpg', kind: 'book', title: '时间简史', author: '史蒂芬·霍金 · 1988', intro: '一个几乎不能动、只能用三根手指打字的人，写出的宇宙史。', reason: '读它一半是读宇宙，一半是读一种不肯认输的态度。', palette: ['#0f3f5f', '#04121c'], glyph: '\u{1F573}' },
  b_feynman: { cover: 'assets/covers/b_feynman.jpg', kind: 'book', title: '别闹了，费曼先生', author: '理查德·费曼 · 1985', intro: '诺奖物理学家撬保险柜、画裸体画、玩桑巴鼓的段子合集。', reason: '它会让你明白：科学家不是书呆子，而是最好奇的一群人。', palette: ['#7a4f1f', '#26160a'], glyph: '\u{1F92A}' },
  b_liang: { kind: 'book', title: '数理化通俗演义', author: '梁衡 · 1987', intro: '用章回小说的写法讲阿基米德、牛顿、居里夫人、爱因斯坦的故事。', reason: '我们把科学家写成"人物"，这本书是同样的做法，非常对味。', palette: ['#2f5f7a', '#0d1e28'], glyph: '\u{1F4DA}' },
  b_hillyer: { cover: 'assets/covers/b_hillyer.jpg', kind: 'book', title: '希利尔讲世界史', author: 'V.M. 希利尔 · 1924', intro: '一位美国小学校长写给孩子的世界史，从远古讲到飞机。', reason: '语言和我们课堂讲稿一样口语化，可以当时间线的补充读物。', palette: ['#5a3a6a', '#1b0f24'], glyph: '\u{1F3DB}' },
  b_snz: { cover: 'assets/covers/b_snz.jpg', kind: 'book', title: '红星照耀中国', author: '埃德加·斯诺 · 1937', intro: '美国记者冒险进入陕北，第一次向世界报道了真实的中国共产党和红军。', reason: '了解"新中国为什么能站起来"，从这本一手采访开始最可靠。', palette: ['#8c2f2f', '#2a0e0e'], glyph: '\u2B50' },

  // ───────────── 书籍 · 中国古代 ─────────────
  b_tiangong: { kind: 'book', title: '天工开物', author: '宋应星 · 1637', intro: '世界上第一部关于农业和手工业生产的百科全书，图文并茂，被誉为"中国17世纪的工艺百科全书"。', reason: '想知道明朝人怎么炼铁、造纸、织布、烧砖，这本书全画出来了。', palette: ['#6b4a2a', '#221508'], glyph: '\u{1F3ED}' },
  b_mengxi: { kind: 'book', title: '梦溪笔谈', author: '沈括 · 1088', intro: '记录了活字印刷、指南针用法、石油命名等大量第一手科技资料。', reason: '"石油"这个词就是沈括起的，他还预言"此物后必大行于世"。', palette: ['#2f6b5a', '#0c2019'], glyph: '\u{1F4D4}' },
  b_shiji: { kind: 'book', title: '史记', author: '司马迁 · 约公元前91年', intro: '中国第一部纪传体通史，从黄帝写到汉武帝。', reason: '里面的《河渠书》《平准书》就是最早的水利和经济科技档案。', palette: ['#7a5f2f', '#241c0c'], glyph: '\u{1F3EE}' },
  b_qimin: { kind: 'book', title: '齐民要术', author: '贾思勰 · 约544年', intro: '现存最早最完整的农书，讲种地、养殖、酿造、食品加工。', reason: '一千年前就把"轮作""选种"写清楚了，是农业科学的活化石。', palette: ['#4a6b2a', '#151f0c'], glyph: '\u{1F33E}' },
  b_guobao: { kind: 'book', title: '如果国宝会说话（图书版）', author: '央视纪录频道 · 2018', intro: '把 100 件国宝每件讲 5 分钟，文字极美。', reason: '青铜器、简牍、浑天仪背后都是硬核技术，看国宝学科技史。', palette: ['#7a3f2f', '#26100c'], glyph: '\u{1F3FA}' },

  // ───────────── 书籍 · 现代科技 ─────────────
  b_chipwar: { cover: 'assets/covers/b_chipwar.jpg', kind: 'book', title: '芯片战争', author: '克里斯·米勒 · 2022', intro: '从二战雷达到台积电，讲芯片如何成为决定大国命运的产业。', reason: '今天所有大国博弈的核心其实就是这条几纳米的线。', palette: ['#2a5f8c', '#0a1a2a'], glyph: '\u{1F9EE}' },
  b_info: { cover: 'assets/covers/b_info.jpg', kind: 'book', title: '信息简史', author: '詹姆斯·格雷克 · 2011', intro: '从非洲鼓语、电报到香农信息论和比特，把"信息"这条线讲透。', reason: '我们的通信科技线（结绳→文字→电报→互联网）就是这本书的骨架。', palette: ['#3f6b2f', '#111f0c'], glyph: '\u{1F4E1}' },
  b_innovators: { cover: 'assets/covers/b_innovators.jpg', kind: 'book', title: '创新者', author: '沃尔特·艾萨克森 · 2014', intro: '从阿达·洛芙莱斯到佩奇和布林，一群数字时代先驱的群像。', reason: '重点：几乎所有突破都是"合作"出来的，不是孤胆天才。', palette: ['#5f2f6b', '#1a0c20'], glyph: '\u{1F4BB}' },
  b_jobs: { cover: 'assets/covers/b_jobs.jpg', kind: 'book', title: '史蒂夫·乔布斯传', author: '沃尔特·艾萨克森 · 2011', intro: '唯一授权传记，写透了产品偏执与现实扭曲力场。', reason: '把技术和人文交叉在一起，正是 iPhone 出现的原因。', palette: ['#4a4a4a', '#141414'], glyph: '\u{1F34F}' },
  b_turing: { cover: 'assets/covers/b_turing.jpg', kind: 'book', title: '艾伦·图灵传', author: '安德鲁·霍奇斯 · 1983', intro: '破解德军密码、奠定计算机理论、最后被时代辜负的天才。', reason: '今天所有 AI 的极限问题都还叫"图灵测试"。', palette: ['#2f4a6b', '#0c1520'], glyph: '\u{1F510}' },
  b_gene: { cover: 'assets/covers/b_gene.jpg', kind: 'book', title: '基因传', author: '悉达多·穆克吉 · 2016', intro: '从孟德尔的豌豆到 CRISPR 基因编辑，一部完整的遗传学史诗。', reason: '生命科学线（DNA→基因编辑）最好的补充读物。', palette: ['#2f6b4a', '#0c2018'], glyph: '\u{1F9EC}' },
  b_dblhelix: { cover: 'assets/covers/b_dblhelix.jpg', kind: 'book', title: '双螺旋', author: '詹姆斯·沃森 · 1968', intro: 'DNA 结构发现者本人写的"内幕"，坦率到有点难堪。', reason: '让你看到真实科研里的竞争、抢跑和运气。', palette: ['#6b2f4a', '#200c15'], glyph: '\u{1F9EC}' },
  b_mars: { cover: 'assets/covers/b_mars.jpg', kind: 'book', title: '火星救援', author: '安迪·威尔 · 2011', intro: '宇航员被落在火星，靠种土豆和拆探测器活着回来。', reason: '每一步都用真科学算过，是"用知识活命"的最佳示范。', palette: ['#8c3f2a', '#280f0a'], glyph: '\u{1F534}' },
  b_santi: { cover: 'assets/covers/b_santi.jpg', kind: 'book', title: '三体', author: '刘慈欣 · 2006', intro: '中国第一部拿下雨果奖的长篇科幻，格局大到整个宇宙。', reason: '刘慈欣本职是电厂工程师——好的科幻需要扎实的技术底子。', palette: ['#1f3f6b', '#08121f'], glyph: '\u2604\uFE0F' },
  b_liulang: { cover: 'assets/covers/b_liulang.jpg', kind: 'book', title: '流浪地球', author: '刘慈欣 · 2000', intro: '太阳要爆炸，人类给地球装上一万台发动机带着它逃。', reason: '中国人面对灾难的第一反应是"带着家一起走"，很打动人。', palette: ['#2a4a8c', '#0a1428'], glyph: '\u{1F30F}' },
  b_verne_moon: { cover: 'assets/covers/b_verne_moon.jpg', kind: 'book', title: '从地球到月球', author: '儒勒·凡尔纳 · 1865', intro: '1865 年写的登月小说，发射地点、乘员人数都和后来阿波罗惊人接近。', reason: '科幻在前、工程在后：先敢想，才可能做到。', palette: ['#3f5f7a', '#111c26'], glyph: '\u{1F319}' },
  b_verne_sub: { cover: 'assets/covers/b_verne_sub.jpg', kind: 'book', title: '海底两万里', author: '儒勒·凡尔纳 · 1870', intro: '鹦鹉螺号潜水艇在当时还是纯粹的想象。', reason: '几十年后核潜艇真的下潜到了这个深度。', palette: ['#1f5f6b', '#081c20'], glyph: '\u{1F420}' },
  b_asimov: { cover: 'assets/covers/b_asimov.jpg', kind: 'book', title: '基地', author: '艾萨克·阿西莫夫 · 1951', intro: '用"心理史学"预测帝国崩溃，一群科学家试图缩短黑暗时期。', reason: '它把"文明为什么会兴衰"变成了小说主题，和我们的课最像。', palette: ['#4a2f6b', '#140c20'], glyph: '\u{1F30C}' },
  b_robots: { cover: 'assets/covers/b_robots.jpg', kind: 'book', title: '我，机器人', author: '艾萨克·阿西莫夫 · 1950', intro: '提出"机器人三定律"，是今天 AI 伦理讨论的起点。', reason: '当机器越来越聪明，规则由谁来定？', palette: ['#5f5f2f', '#1c1c0c'], glyph: '\u{1F916}' },
  b_silent: { cover: 'assets/covers/b_silent.jpg', kind: 'book', title: '寂静的春天', author: '蕾切尔·卡森 · 1962', intro: '一本让全世界开始重视农药污染的书，直接催生了环保运动。', reason: '技术是双刃剑，这是最清楚的例子之一。', palette: ['#3f6b3f', '#102010'], glyph: '\u{1F426}' },
  b_qxs: { kind: 'book', title: '钱学森传', author: '叶永烈 · 2010', intro: '从加州理工到回国受阻五年，再到主持中国导弹航天事业。', reason: '"一个人抵得上五个师"这句话是怎么来的，看完就懂了。', palette: ['#6b2f2f', '#200c0c'], glyph: '\u{1F680}' },

  // ───────────── 影视 ─────────────
  m_interstellar: { kind: 'movie', title: '星际穿越', author: '克里斯托弗·诺兰 · 2014', intro: '物理学家基普·索恩当顾问，黑洞画面是用真方程渲染出来的。', reason: '看完会记住"相对论时间膨胀"这个词一辈子。', palette: ['#1f4a6b', '#060f1a'], glyph: '\u{1F573}' },
  m_martian: { kind: 'movie', title: '火星救援', author: '雷德利·斯科特 · 2015', intro: '被落在火星的植物学家靠科学自救，节奏轻快不悲情。', reason: '最好的"知识就是力量"演示片。', palette: ['#8c4a2a', '#28130a'], glyph: '\u{1F331}' },
  m_apollo13: { kind: 'movie', title: '阿波罗13号', author: '朗·霍华德 · 1995', intro: '真实事件：登月途中氧气罐爆炸，地面和太空一起想办法回家。', reason: '"休斯顿，我们有麻烦了"——工程就是不断解决意外。', palette: ['#2a3f6b', '#0a1020'], glyph: '\u{1F311}' },
  m_hidden: { kind: 'movie', title: '隐藏人物', author: '泰德·梅尔菲 · 2016', intro: '三位黑人女数学家在 NASA 用手算和早期计算机把宇航员送上轨道。', reason: '人类最早的"计算机"其实是人；她们在没有草稿纸的年代算出了轨道。', palette: ['#3f6b5a', '#101f1a'], glyph: '\u{1F9EE}' },
  m_imitation: { kind: 'movie', title: '模仿游戏', author: '莫腾·泰杜姆 · 2014', intro: '图灵造出"炸弹机"破解德军 Enigma 密码，缩短了二战。', reason: '计算机的诞生，起点是一次保密了三十年的破译行动。', palette: ['#4a4a5f', '#14141c'], glyph: '\u{1F510}' },
  m_oppenheimer: { kind: 'movie', title: '奥本海默', author: '克里斯托弗·诺兰 · 2023', intro: '曼哈顿计划的科学总监，在造出原子弹之后用余生面对它的后果。', reason: '一部关于"科学家能不能只管科学"的电影，看完会对责任两个字有新的理解。', palette: ['#8c5f2f', '#201408'], glyph: '\u{1F525}' },
  m_juexing: { kind: 'movie', title: '觉醒年代', author: '张永新 · 2021（电视剧）', intro: '从新文化运动到建党，一群读书人在国家最黑暗的年代寻找出路。', reason: '了解戊戌变法为什么失败、辛亥革命为什么不够、中国的出路到底在哪里，这是最好的影像教材。', palette: ['#8c3f3f', '#20100c'], glyph: '\u{1F3EE}' },
  m_hugo: { kind: 'movie', title: '雨果', author: '马丁·斯科塞斯 · 2011', intro: '巴黎火车站里一个修机械自动人偶的男孩，牵出了电影的诞生。', reason: '齿轮、发条和电影放映机，机械时代的浪漫全在这里。', palette: ['#5f4a2a', '#1c150a'], glyph: '\u{1F39E}' },
  m_beautiful: { kind: 'movie', title: '美丽心灵', author: '朗·霍华德 · 2001', intro: '数学家纳什与精神分裂症共处一生，博弈论改变了经济学。', reason: '"纳什均衡"是理解竞争与合作的钥匙。', palette: ['#2f4a5f', '#0c1520'], glyph: '\u{1F9E0}' },
  m_theory: { kind: 'movie', title: '万物理论', author: '詹姆斯·马什 · 2014', intro: '霍金的青年时代、爱情和逐渐失去的身体。', reason: '身体被限制到只剩一根手指，思想却走到了宇宙边界。', palette: ['#3f4a6b', '#101420'], glyph: '\u{1F30C}' },
  m_radioactive: { kind: 'movie', title: '放射性物质', author: '玛嘉·莎塔琵 · 2019', intro: '居里夫人两获诺奖，也在无人知晓放射危害的年代付出了生命。', reason: '科学的代价，往往由最先探路的人承担。', palette: ['#4a6b3f', '#141f10'], glyph: '\u2622\uFE0F' },
  m_current: { kind: 'movie', title: '电流大战', author: '阿方索·戈麦斯-瑞洪 · 2019', intro: '爱迪生的直流电和特斯拉的交流电之争。', reason: '技术标准之争背后是资本、专利和舆论战，古今如此。', palette: ['#6b5f2a', '#201c0a'], glyph: '\u26A1' },
  m_wall_e: { kind: 'movie', title: '机器人总动员', author: '安德鲁·斯坦顿 · 2008', intro: '地球被垃圾淹没，一个清洁机器人在废墟里学会了爱。', reason: '关于消费主义和环境最温柔也最锋利的一部动画。', palette: ['#5f4a3f', '#1c1512'], glyph: '\u{1F916}' },
  m_bighero: { kind: 'movie', title: '超能陆战队', author: '迪士尼 · 2014', intro: '少年天才和大白，把医疗机器人变成了超级英雄。', reason: '发明的初衷可以是照顾人，这一点很重要。', palette: ['#6b2f3f', '#200c12'], glyph: '\u{1F388}' },
  m_laputa: { kind: 'movie', title: '天空之城', author: '宫崎骏 · 1986', intro: '飞行石、蒸汽机械和一座漂浮的古城。', reason: '蒸汽朋克美学的巅峰，也是"科技不该脱离土地"的寓言。', palette: ['#3f5f6b', '#101c20'], glyph: '\u{1F3D4}' },
  m_nausicaa: { kind: 'movie', title: '风之谷', author: '宫崎骏 · 1984', intro: '人类用"火之七日"毁灭世界后，少女试图与生态共存。', reason: '"火之七日"就是对核战争最直接的隐喻。', palette: ['#4a6b4a', '#141f14'], glyph: '\u{1F343}' },
  m_insideout: { kind: 'movie', title: '头脑特工队', author: '皮克斯 · 2015', intro: '把大脑里的情绪画成五个小人，神经科学顾问参与设计。', reason: '理解 AI 之前，先理解我们自己的"神经网络"。', palette: ['#6b3f5f', '#20101c'], glyph: '\u{1F9E0}' },
  m_avatar: { kind: 'movie', title: '阿凡达', author: '詹姆斯·卡梅隆 · 2009', intro: '为了拍这部电影，卡梅隆自己推动开发了新的 3D 摄影和动作捕捉技术。', reason: '有时候是先有想讲的故事，才发明出新技术。', palette: ['#1f6b5f', '#061f1c'], glyph: '\u{1F33F}' },
  m_gravity: { kind: 'movie', title: '地心引力', author: '阿方索·卡隆 · 2013', intro: '太空碎片连锁撞击，两名宇航员设法返回地球。', reason: '这就是真实的"凯斯勒效应"——太空垃圾是航天的头号威胁。', palette: ['#1a2f4a', '#060c14'], glyph: '\u{1F6F0}' },
  m_2001: { kind: 'movie', title: '2001太空漫游', author: '斯坦利·库布里克 · 1968', intro: '1968 年就预言了平板电脑、视频通话和会反抗的 AI。', reason: '人类第一次登上月球的前一年上映，预言准得可怕。', palette: ['#2a2f4a', '#0a0c14'], glyph: '\u{1F534}' },
  m_wandering: { kind: 'movie', title: '流浪地球', author: '郭帆 · 2019', intro: '中国第一部真正的重工业科幻大片，行星发动机和地下城都是硬设定。', reason: '它证明中国团队已经能做出世界级视效，而且讲的是"带着地球一起走"。', palette: ['#2f4a8c', '#0a1428'], glyph: '\u{1F30F}' },
  m_wandering2: { kind: 'movie', title: '流浪地球2', author: '郭帆 · 2023', intro: '太空电梯、数字生命、无人机蜂群，技术设定比第一部更硬。', reason: '里面的"太空电梯"是真实在研究的方案，可以对着我们的未来节点看。', palette: ['#2a4a7a', '#0a1424'], glyph: '\u{1F6D7}' },
  m_hengchu: { kind: 'movie', title: '横空出世', author: '陈国星 · 1999', intro: '中国第一颗原子弹从立项到罗布泊爆炸的全过程。', reason: '在算盘和手摇计算机上算出核爆数据，这段历史必须知道。', palette: ['#7a4a2a', '#24150a'], glyph: '\u2622\uFE0F' },
  m_qianxuesen: { kind: 'movie', title: '钱学森', author: '张建亚 · 2012', intro: '归国受阻五年，回来后用有限条件建起导弹航天体系。', reason: '"手里没有剑和有剑不用是两回事"，这句话值得记一辈子。', palette: ['#6b2f2f', '#200c0c'], glyph: '\u{1F680}' },
  m_changjinhu: { kind: 'movie', title: '长津湖', author: '陈凯歌/徐克/林超贤 · 2021', intro: '抗美援朝长津湖战役，志愿军在零下四十度与最强装备的对手作战。', reason: '为什么中国后来一定要有自己的飞机大炮？答案就在这场仗里。', palette: ['#3f4a5f', '#10141c'], glyph: '\u2744\uFE0F' },
  m_cosmos: { kind: 'movie', title: '宇宙时空之旅', author: '尼尔·德格拉斯·泰森 · 2014', intro: '13 集纪录片，把 138 亿年装进一艘"想象力飞船"。', reason: '它的"宇宙日历"和我们的时间线是同一种思路，强烈推荐配套看。', palette: ['#1f2f6b', '#060a1f'], glyph: '\u{1F52D}' },
  m_planets: { kind: 'movie', title: '行星', author: 'BBC · 布莱恩·考克斯 · 2019', intro: '把太阳系八大行星当作八个"人物"来讲它们的一生。', reason: '地球为什么恰好适合生命，看完会更珍惜。', palette: ['#2f3f6b', '#0a1020'], glyph: '\u{1FA90}' },
  m_civilization: { kind: 'movie', title: '文明', author: 'BBC · 2018', intro: '九集讲人类艺术与技术如何互相推动。', reason: '艺术不是科技的装饰品，它们一直在互相喂养。', palette: ['#5f4a3f', '#1c1512'], glyph: '\u{1F3DB}' },
  m_guobao: { kind: 'movie', title: '如果国宝会说话', author: '央视纪录频道 · 2018', intro: '每集 5 分钟，一件国宝，文案像诗。', reason: '适合课间播放，孩子接受度极高。', palette: ['#7a3f2f', '#26100c'], glyph: '\u{1F3FA}' },
  m_hexi: { kind: 'movie', title: '河西走廊', author: '央视 · 2015', intro: '一条走廊如何决定中原与西域的命运，配乐雅尼操刀。', reason: '理解丝绸之路，就理解了中国古代的地缘格局。', palette: ['#8c6b3f', '#281e10'], glyph: '\u{1F42A}' },
  m_daguo: { kind: 'movie', title: '大国重器（第二季）', author: '央视财经 · 2018', intro: '港珠澳大桥、C919、盾构机、天眼，一个个讲透制造细节。', reason: '想知道中国现在到底能造什么，看这个最直接。', palette: ['#2f5f7a', '#0c1c26'], glyph: '\u{1F3D7}' },
  m_chuangxin: { kind: 'movie', title: '创新中国', author: '央视纪录频道 · 2018', intro: '全片用 AI 配音，讲中国的无人机、光伏、量子通信。', reason: '形式本身就是内容：一部用 AI 配音的纪录片。', palette: ['#3f6b6b', '#102020'], glyph: '\u{1F4A1}' },
  m_super: { kind: 'movie', title: '超级工程', author: '央视 · 2012 起', intro: '每集聚焦一个中国大型工程的建设难点。', reason: '工程之美在于把不可能拆成一千个可解决的问题。', palette: ['#4a5f6b', '#141c20'], glyph: '\u{1F309}' },
  m_jurassic: { kind: 'movie', title: '侏罗纪公园', author: '史蒂文·斯皮尔伯格 · 1993', intro: '用琥珀里的蚊子血提取 DNA 复活恐龙。', reason: '小说作者克莱顿是医学博士，设定基于当时真实的基因技术。', palette: ['#3f5f3f', '#101c10'], glyph: '\u{1F996}' },
  m_backfuture: { kind: 'movie', title: '回到未来', author: '罗伯特·泽米吉斯 · 1985', intro: '一辆改装跑车加一台"通量电容器"就能穿越时间。', reason: '它 1985 年预言的指纹识别、视频通话、无人机摄影全都成真了。', palette: ['#5f3f2f', '#1c120c'], glyph: '\u23F1' },
  m_starwars: { kind: 'movie', title: '星球大战（原初三部曲）', author: '乔治·卢卡斯 · 1977', intro: '为了拍它，卢卡斯创立了工业光魔，直接推动了电脑特效产业。', reason: '一部电影催生了一个行业，这就是需求的威力。', palette: ['#2f3f5f', '#0c101c'], glyph: '\u2728' },

  // ───────────── 游戏 ─────────────
  g_civ6: { cover: 'assets/covers/g_civ6.jpg', kind: 'game', title: '文明 VI', author: 'Firaxis · 2016', intro: '从一个定居者开始，带一个文明走过六千年，科技树和文化树双线推进。', reason: '我们这个网站的核心灵感就来自它，玩一局胜过读十页历史。', palette: ['#3f5f7a', '#101c26'], glyph: '\u{1F3DB}' },
  g_humankind: { cover: 'assets/covers/g_humankind.jpg', kind: 'game', title: '人类 (Humankind)', author: 'Amplitude · 2021', intro: '每个时代可以选择不同文明组合，强调"文明是叠加出来的"。', reason: '比《文明》更强调地域和时代切换，正好对上我们的地图。', palette: ['#5f4a3f', '#1c1512'], glyph: '\u{1F30D}' },
  g_aoe: { cover: 'assets/covers/g_aoe.jpg', kind: 'game', title: '帝国时代 II/IV', author: '微软 · 1999/2021', intro: '实时战略，从黑暗时代一路升级到帝王时代。', reason: '能直观看到"资源+技术升级"如何决定一场战争的胜负。', palette: ['#6b5f2f', '#201c0c'], glyph: '\u{1F3F0}' },
  g_totalwar: { cover: 'assets/covers/g_totalwar.jpg', kind: 'game', title: '全面战争：三国', author: 'Creative Assembly · 2019', intro: '把《三国演义》的人物放进严谨的战略模拟里。', reason: '玩中国自己的历史，理解地理、粮道和兵力调度的关系。', palette: ['#7a2f2f', '#240c0c'], glyph: '\u{1F409}' },
  g_discovery: { cover: 'assets/covers/g_discovery.jpg', kind: 'game', title: '刺客信条：发现之旅', author: '育碧 · 2018', intro: '官方出的免费教育模式，可以在古埃及、古希腊的城市里自由参观，有讲解点。', reason: '这是游戏史上最认真的历史课堂，可以直接在课堂上演示。', palette: ['#3f6b6b', '#102020'], glyph: '\u{1F3DC}' },
  g_minecraft: { cover: 'assets/covers/g_minecraft.jpg', kind: 'game', title: '我的世界', author: 'Mojang · 2011', intro: '用方块搭建一切；红石电路可以做真实的逻辑门和计算机。', reason: '有玩家用红石在游戏里造出了能运行的 CPU，是最好的动手教具。', palette: ['#3f6b3f', '#102010'], glyph: '\u26CF\uFE0F' },
  g_ksp: { cover: 'assets/covers/g_ksp.jpg', kind: 'game', title: '坎巴拉太空计划', author: 'Squad · 2015', intro: '真实的轨道力学模拟，NASA 都公开表示认可。', reason: '玩过之后你就会明白"入轨"和"飞出地球"差别有多大。', palette: ['#2f5f3f', '#0c1c10'], glyph: '\u{1F680}' },
  g_sfs: { cover: 'assets/covers/g_sfs.jpg', kind: 'game', title: '航天模拟器', author: 'Spaceflight Simulator · 2017', intro: '手机/平板就能玩的简化版轨道力学，操作门槛很低。', reason: '适合课堂上让每个孩子自己动手试一次入轨。', palette: ['#2f3f5f', '#0c101c'], glyph: '\u{1F6F0}' },
  g_factorio: { cover: 'assets/covers/g_factorio.jpg', kind: 'game', title: '异星工厂', author: 'Wube Software · 2020', intro: '从零开始搭一条自动化流水线，最后铺满整个星球。', reason: '它会让你亲身体会"工业革命"为什么会停不下来。', palette: ['#6b5f3f', '#201c10'], glyph: '\u{1F3ED}' },
  g_dyson: { cover: 'assets/covers/g_dyson.jpg', kind: 'game', title: '戴森球计划', author: '柚子猫游戏（中国） · 2021', intro: '五个中国年轻人做的游戏，把整个星系改造成能量网络，全球畅销。', reason: '中国独立游戏工业能力的最好证明，值得骄傲。', palette: ['#4a2f6b', '#140c20'], glyph: '\u2600\uFE0F' },
  g_oxygen: { cover: 'assets/covers/g_oxygen.jpg', kind: 'game', title: '缺氧', author: 'Klei · 2017', intro: '管理一个地下殖民地的气体、温度、水和食物循环。', reason: '热力学和生态循环的沙盘，失败了才知道系统有多脆弱。', palette: ['#5f3f4a', '#1c1015'], glyph: '\u{1F4A8}' },
  g_cities: { cover: 'assets/covers/g_cities.jpg', kind: 'game', title: '城市：天际线', author: 'Colossal Order · 2015', intro: '规划道路、水电、公交、税收，看一座城市如何长大或堵死。', reason: '理解"基础设施决定城市上限"，这就是都江堰和罗马水道的意义。', palette: ['#3f5f4a', '#101c15'], glyph: '\u{1F3D9}' },
  g_frostpunk: { cover: 'assets/covers/g_frostpunk.jpg', kind: 'game', title: '冰汽时代', author: '11 bit studios · 2018', intro: '永冬末世里管理一座靠蒸汽锅炉存活的城市，每个决定都有道德代价。', reason: '能源、技术和社会选择的关系，从来没有游戏讲得这么直接。', palette: ['#4a5f6b', '#141c20'], glyph: '\u2744\uFE0F' },
  g_hrm: { cover: 'assets/covers/g_hrm.jpg', kind: 'game', title: '人力资源机器', author: 'Tomorrow Corporation · 2015', intro: '用小工人搬箱子来教汇编语言和算法优化。', reason: '不写一行代码就理解了 CPU 到底在干什么。', palette: ['#5f5f3f', '#1c1c10'], glyph: '\u{1F4E6}' },
  g_wtl: { cover: 'assets/covers/g_wtl.jpg', kind: 'game', title: 'while True: learn()', author: 'Luden.io · 2019', intro: '通过搭可视化流程图来教机器学习原理，还能赚猫粮钱。', reason: '神经网络怎么"学"，玩两关就懂了。', palette: ['#3f4a6b', '#101420'], glyph: '\u{1F431}' },
  g_opus: { cover: 'assets/covers/g_opus.jpg', kind: 'game', title: 'Opus Magnum', author: 'Zachtronics · 2017', intro: '设计炼金机械臂的传动流程，追求最小成本最高效率。', reason: '这就是"工程设计"的日常：能跑不够，要跑得省。', palette: ['#6b4a2f', '#20150c'], glyph: '\u2697\uFE0F' },
  g_besiege: { cover: 'assets/covers/g_besiege.jpg', kind: 'game', title: '攻城工程 (Besiege)', author: 'Spiderling · 2015', intro: '用齿轮、杠杆、绳索造中世纪攻城器械，物理引擎很真实。', reason: '投石车和连杆机构的原理，摔几次就学会了。', palette: ['#5f4a3f', '#1c1512'], glyph: '\u{1F3F9}' },
  g_polybridge: { cover: 'assets/covers/g_polybridge.jpg', kind: 'game', title: '造桥工程师 (Poly Bridge)', author: 'Dry Cactus · 2015', intro: '用桁架、钢索和液压造桥，桥塌了会给你看应力分布。', reason: '结构和受力最好的入门玩具。', palette: ['#3f6b5f', '#101f1c'], glyph: '\u{1F309}' },
  g_universe: { cover: 'assets/covers/g_universe.jpg', kind: 'game', title: '宇宙沙盘 (Universe Sandbox)', author: 'Giant Army · 2015', intro: '把两个星系扔到一起，或者给地球加一颗卫星，看会发生什么。', reason: '天体力学可以随便做实验，这是别的学科做不到的。', palette: ['#2f2f6b', '#0c0c20'], glyph: '\u{1F30C}' },
  g_outerwilds: { cover: 'assets/covers/g_outerwilds.jpg', kind: 'game', title: '星际拓荒 (Outer Wilds)', author: 'Mobius Digital · 2019', intro: '在一个每 22 分钟毁灭一次的太阳系里靠观察和推理破解谜题。', reason: '它教会你科学方法本身：观察→假设→验证。', palette: ['#3f3f6b', '#10101f'], glyph: '\u{1F3D5}' },
  g_terra: { cover: 'assets/covers/g_terra.jpg', kind: 'game', title: '生态位：乌托邦 (Terra Nil)', author: 'Free Lives · 2023', intro: '把一片废墟恢复成生态乐园，然后收拾工具悄悄离开。', reason: '反向的建造游戏，讲的是修复而不是征服。', palette: ['#2f6b4a', '#0c2018'], glyph: '\u{1F331}' },
  g_zelda: { kind: 'game', title: '塞尔达传说：王国之泪', author: '任天堂 · 2023', intro: '余料建造系统让你把木板、轮子、火箭拼成任意机器。', reason: '物理和机械组合的绝佳沙盒，孩子会自发做工程实验。', palette: ['#4a6b2f', '#141f0c'], glyph: '\u{1F5E1}' },
  g_portal2: { cover: 'assets/covers/g_portal2.jpg', kind: 'game', title: '传送门 2', author: 'Valve · 2011', intro: '用传送门解决空间谜题，动量守恒是核心机制。', reason: '玩完你会本能地理解"进多快出多快"。', palette: ['#5f5f6b', '#1c1c20'], glyph: '\u{1F573}' },
  g_scratch: { kind: 'game', title: 'Scratch', author: 'MIT 媒体实验室 · 2007', intro: '拖积木块就能写程序，全球上亿孩子在用。', reason: '从玩游戏到做游戏，这是最平滑的第一步。', palette: ['#6b4a2f', '#20150c'], glyph: '\u{1F9E9}' },
  g_msedu: { cover: 'assets/covers/g_msedu.jpg', kind: 'game', title: '我的世界教育版', author: '微软 · 2016', intro: '带化学模式、代码连接器和课堂协作功能。', reason: '学校真的可以直接用它上编程和化学课。', palette: ['#3f5f3f', '#101c10'], glyph: '\u{1F393}' },
  g_msfs: { cover: 'assets/covers/g_msfs.jpg', kind: 'game', title: '微软模拟飞行', author: 'Asobo Studio · 2020', intro: '用真实卫星数据和气象数据重建了整个地球，每一架飞机的气动特性都按真机建模。', reason: '在家里就能体验升力、配平、失速和侧风着陆——这是最接近真实的飞行原理课。', palette: ['#2f5f8c', '#0c1820'], glyph: '\u{1F6EB}' },

  // ───────────── 音乐（含可播放的公有领域录音） ─────────────
  mu_mozart: { cover: 'assets/covers/mu_mozart.jpg', kind: 'music', title: 'G大调小夜曲 K.525', author: '莫扎特 · 1787', intro: '四个乐章，第一乐章几乎所有人都听过。', reason: '古典时期"清晰、对称、有秩序"的美，和牛顿力学是同一种气质。', palette: ['#6b5f8c', '#1c1828'], glyph: '\u{1F3BB}' },
  mu_beethoven5: { cover: 'assets/covers/mu_beethoven5.jpg', kind: 'music', title: '第五交响曲"命运"', author: '贝多芬 · 1808', intro: '"当当当当——"史上最著名的四个音。', reason: '工业革命前夜的紧张与力量，和贝多芬失聪仍在创作的精神。', palette: ['#8c3f3f', '#280f0f'], glyph: '\u{1F3BC}' },
  mu_beethoven9: { cover: 'assets/covers/mu_beethoven9.jpg', kind: 'music', title: '第九交响曲"欢乐颂"', author: '贝多芬 · 1824', intro: '首演时贝多芬已完全听不见，是被演员转过来才看到全场鼓掌。', reason: '今天它是欧盟盟歌，也是旅行者金唱片里带向太空的人类名片。', palette: ['#8c6b3f', '#281e10'], glyph: '\u{1F3B6}' },
  mu_vivaldi: { cover: 'assets/covers/mu_vivaldi.jpg', kind: 'music', title: '四季·秋', author: '维瓦尔第 · 1725 · 摩德纳室内乐团', intro: '用乐器模仿收割、狩猎和秋夜，是最早的"标题音乐"之一。', reason: '音乐也能"描述世界"，这和科学家观察自然是同一件事。', palette: ['#3f8c5f', '#0f281a'], glyph: '\u{1F342}' },
  mu_bach: { cover: 'assets/covers/mu_bach.jpg', kind: 'music', title: 'G弦上的咏叹调', author: '巴赫 · 约1730', intro: '巴洛克复调音乐的典范，多条旋律线像齿轮一样咬合。', reason: '巴赫的音乐结构和计算机程序惊人地相似：分层、递归、严密。', palette: ['#4a4a8c', '#141428'], glyph: '\u{1F3B9}' },
  mu_holst_mars: { cover: 'assets/covers/mu_holst_mars.jpg', kind: 'music', title: '行星组曲·火星', author: '霍尔斯特 · 1918', intro: '5/4 拍的战争节奏，写于第一次世界大战期间。', reason: '所有太空电影配乐的祖师爷，听着它就想到火箭发射。', palette: ['#8c4a3f', '#281410'], glyph: '\u{1F534}' },
  mu_holst_jupiter: { cover: 'assets/covers/mu_holst_jupiter.jpg', kind: 'music', title: '行星组曲·木星', author: '霍尔斯特 · 1918', intro: '中段旋律后来被填词成为英国爱国歌曲《我宣誓效忠你》。', reason: '同一段音乐可以承载完全不同的意义，这就是文化的力量。', palette: ['#8c7a3f', '#28220f'], glyph: '\u{1FA90}' },
  mu_debussy: { cover: 'assets/covers/mu_debussy.jpg', kind: 'music', title: '月光', author: '德彪西 · 1905', intro: '印象派钢琴曲，追求音色和气氛而不是清晰的结构。', reason: '正好和登月那一章配对：人类真的走到了"月光"里去。', palette: ['#3f5f8c', '#0f1a28'], glyph: '\u{1F319}' },
  mu_grieg: { cover: 'assets/covers/mu_grieg.jpg', kind: 'music', title: '培尔·金特·晨景', author: '格里格 · 1875', intro: '长笛和双簧管交替，描摹北欧清晨太阳升起。', reason: '适合做时间线"新一天开始"的背景音乐。', palette: ['#5f8c7a', '#182822'], glyph: '\u{1F305}' },
  mu_strauss: { cover: 'assets/covers/mu_strauss.jpg', kind: 'music', title: '蓝色多瑙河', author: '小约翰·施特劳斯 · 1867', intro: '世界上最著名的圆舞曲，也是《2001太空漫游》里太空站的配乐。', reason: '古典乐和太空画面拼在一起，产生了一种奇妙的优雅感。', palette: ['#3f6b8c', '#0f1e28'], glyph: '\u{1F30A}' },
  mu_tchaikovsky: { cover: 'assets/covers/mu_tchaikovsky.jpg', kind: 'music', title: '1812序曲', author: '柴可夫斯基 · 1880', intro: '结尾真的用加农炮，纪念俄国击退拿破仑。', reason: '音乐直接书写战争，这是"技术与冲突"最响亮的注脚。', palette: ['#8c3f5f', '#280f1c'], glyph: '\u{1F4A5}' },
  mu_sousa: { cover: 'assets/covers/mu_sousa.jpg', kind: 'music', title: '星条旗永不落', author: '约翰·菲利普·苏萨 · 1897', intro: '美国最著名的进行曲，苏萨被称为"进行曲之王"。', reason: '19 世纪末美国工业崛起的声音，铜管乐队本身就是工业制造的产物。', palette: ['#3f4a8c', '#0f1428'], glyph: '\u{1F3BA}' },
  mu_chopin: { cover: 'assets/covers/mu_chopin.jpg', kind: 'music', title: '降E大调夜曲 Op.9 No.2', author: '肖邦 · 1832', intro: '钢琴诗人最广为流传的一首夜曲。', reason: '肖邦流亡巴黎仍心系波兰，是"科技与家国"之外另一种爱国方式。', palette: ['#4a3f6b', '#140f20'], glyph: '\u{1F3B9}' },
  mu_dvorak: { cover: 'assets/covers/mu_dvorak.jpg', kind: 'music', title: '第九交响曲"自新大陆"', author: '德沃夏克 · 1893', intro: '捷克作曲家在美国写下的思乡与新奇。', reason: '第二乐章的英国管旋律，几乎就是"移民与开拓"的配乐。', palette: ['#6b4a3f', '#201512'], glyph: '\u{1F6A2}' },
  mu_jasmine: { kind: 'music', title: '茉莉花', author: '中国民歌 · 清代已流传', intro: '江苏民歌，18 世纪就传到了欧洲，普契尼把它写进歌剧《图兰朵》。', reason: '一首民歌比很多技术更早完成了"文化出海"。', palette: ['#6b8c3f', '#1e2810'], glyph: '\u{1F338}' },
  mu_gaoshan: { kind: 'music', title: '高山流水', author: '古琴曲 · 传为伯牙所作', intro: '"高山流水遇知音"的典故来源，2003 年入选人类非遗。', reason: '中国音乐讲"意"，和西方讲"结构"是两条完全不同的美学路线。', palette: ['#3f6b6b', '#102020'], glyph: '\u{1F3B8}' },
  mu_chunjiang: { kind: 'music', title: '春江花月夜', author: '琵琶曲《夕阳箫鼓》改编 · 1925', intro: '中国古典民乐合奏的代表作，旋律层层展开如江水。', reason: '适合做中国古代章节的背景，安静而有画面感。', palette: ['#3f5f6b', '#101c20'], glyph: '\u{1F30A}' },
  mu_shimian: { kind: 'music', title: '十面埋伏', author: '琵琶武曲 · 明代已流传', intro: '用琵琶描绘垓下之战，从列营到突围一气呵成。', reason: '这是中国音乐里最"硬核"的一首，纯靠乐器打出战争场面。', palette: ['#8c3f3f', '#280f0f'], glyph: '\u{1F3AF}' },
  mu_erquan: { kind: 'music', title: '二胡曲《Erhu on 3》', author: 'Antti Luode · CC BY 3.0', intro: '一首现代二胡独奏，音色苍凉婉转，是二胡这件乐器最典型的表情。', reason: '二胡只有两根弦，却能把人的心事全拉出来，这就是中国乐器的厉害之处。', palette: ['#4a4a5f', '#14141c'], glyph: '\u{1F3B6}' },
  mu_erquanying: { kind: 'music', title: '二泉映月', author: '阿炳（华彦钧） · 1950 年录音', intro: '盲人街头艺人阿炳的二胡曲，1950 年被抢救性录制，同年他去世。', reason: '小泽征尔说"这样的音乐应该跪着听"。它是中国民间艺术的尊严。', palette: ['#4a4a5f', '#14141c'], glyph: '\u{1F333}' },
  mu_satie: { cover: 'assets/covers/mu_satie.jpg', kind: 'music', title: '裸体歌舞第一号', author: '埃里克·萨蒂 · 1888', intro: '极简的钢琴曲，缓慢、透明、几乎不动。', reason: '它比"极简主义音乐"早了七十年，是安静型背景音乐的祖师爷。', palette: ['#5f6b8c', '#181c28'], glyph: '\u{1F3B9}' },
  mu_huanghe: { kind: 'music', title: '黄河大合唱', author: '冼星海 · 1939', intro: '在延安窑洞里六天写成，《保卫黄河》传唱至今。', reason: '抗战最难的时候，音乐就是武器。这段历史必须让孩子知道。', palette: ['#8c5f3f', '#281a10'], glyph: '\u{1F30A}' },
  mu_guoge: { kind: 'music', title: '歌唱祖国', author: '王莘 · 1950', intro: '"五星红旗迎风飘扬"，被称为第二国歌。', reason: '2008 北京奥运、2022 冬奥开幕式上都响起了它。', palette: ['#8c3f3f', '#280f0f'], glyph: '\u{1F1E8}\u{1F1F3}' },
  mu_amb_stone: { kind: 'music', title: '原始氛围（程序合成）', author: '本应用实时生成', intro: '低频打击与呼吸声，模拟石器时代的洞穴氛围。', reason: '没有录音能保存两万年前，我们用合成器还原"可能的样子"。', palette: ['#5f4a3f', '#1c1512'], glyph: '\u{1F525}' },
  mu_amb_china: { kind: 'music', title: '东方氛围（程序合成）', author: '本应用实时生成', intro: '五声音阶古筝拨奏与笛声，实时合成。', reason: '用宫商角徵羽五声构建，是中国音乐最基本的骨架。', palette: ['#6b4a4a', '#201414'], glyph: '\u{1F3B6}' },
  mu_amb_medieval: { kind: 'music', title: '中世纪氛围（程序合成）', author: '本应用实时生成', intro: '类格里高利圣咏的多声部持续音。', reason: '用多里安调式和长混响，还原教堂石壁的声学感。', palette: ['#4a4a6b', '#14141f'], glyph: '\u26EA' },
  mu_amb_future: { kind: 'music', title: '未来氛围（程序合成）', author: '本应用实时生成', intro: '缓慢演化的合成器铺底与随机琶音。', reason: '未来没有乐谱，我们用算法生成——这本身就是答案。', palette: ['#2f5f8c', '#0a1c28'], glyph: '\u{1F6F8}' }
}

export function resolveMedia(ids: string[]): MediaItem[] {
  return ids.map(id => MEDIA_LIBRARY[id]).filter(Boolean)
}

/**
 * 媒体库条目 id -> 实际音频文件 id 的别名。
 * manifest.json 里的文件是权威来源，只有映射成功的条目才能播放。
 */
export const MEDIA_AUDIO_ALIAS: Record<string, string> = {
  mu_sousa: 'era_information',
  mu_holst_mars: 'era_modern',
  mu_debussy: 'era_modern2',
  mu_mozart: 'era_renaissance'
}
