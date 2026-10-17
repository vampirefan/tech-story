import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { hydrateContent } from './stores/content'

import './styles/tokens.css'
import './styles/base.css'
import './styles/hud.css'
import './styles/scenes.css'
import './styles/demo.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
hydrateContent()

// 兜底：任何漏到顶层的异常只记录，不让默认行为把界面弄成黑屏
app.config.errorHandler = (err, _inst, info) => {
  console.error('[app-error]', info, err)
}

// 数据自检：开发时把内容问题打到控制台，不影响运行
if (import.meta.env.DEV) {
  import('./data/techTree').then(m => {
    const { errors, warnings } = m.validateGraph()
    if (errors.length) console.error('[techTree] 数据错误：', errors)
    if (warnings.length) console.warn('[techTree] 待打磨：', warnings)
    if (!errors.length && !warnings.length) console.info(`[techTree] ✓ ${m.NODES.length} 节点 / ${m.EDGES.length} 演进边 / ${m.WAR_EDGES.length} 战争边 / ${m.DEMO_IDS.length} 演示`)
  })
  import('./data/china').then(m => {
    const p = m.validateChina()
    if (p.length) console.error('[china] 数据错误：', p)
  })
}

app.mount('#app')
