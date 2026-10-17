import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

/**
 * 用 hash history：Electron 打包后是 file:// 协议，history 模式刷新会 404。
 */
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'opening', component: () => import('@/scenes/OpeningScene.vue'), meta: { title: '开场', nav: false } },
  { path: '/globe', name: 'globe', component: () => import('@/scenes/GlobeScene.vue'), meta: { title: '文明地球', icon: '🌍', nav: true } },
  { path: '/timeline', name: 'timeline', component: () => import('@/scenes/TimelineScene.vue'), meta: { title: '时间线', icon: '⏳', nav: true } },
  { path: '/tree', name: 'tree', component: () => import('@/scenes/TreeScene.vue'), meta: { title: '科技树', icon: '🕸️', nav: true } },
  { path: '/node/:id', name: 'node', component: () => import('@/scenes/NodeScene.vue'), meta: { title: '详情', nav: false } },
  { path: '/china', name: 'china', component: () => import('@/scenes/ChinaScene.vue'), meta: { title: '中国专题', icon: '🏮', nav: true } },
  { path: '/media', name: 'media', component: () => import('@/scenes/MediaScene.vue'), meta: { title: '拓展资源', icon: '📚', nav: true } },
  { path: '/admin', name: 'admin', component: () => import('@/scenes/AdminScene.vue'), meta: { title: '维护', icon: '🛠️', nav: false } },
  { path: '/:pathMatch(.*)*', redirect: '/globe' }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

export const NAV_ROUTES = routes.filter(r => r.meta?.nav)

router.afterEach((to) => {
  const t = (to.meta?.title as string) ?? ''
  document.title = t ? `${t} · 人类科技文明演进` : '人类科技文明演进'
})
