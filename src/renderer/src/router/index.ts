import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '首页', icon: 'HomeFilled' }
  },
  {
    path: '/publish',
    name: 'Publish',
    component: () => import('../views/Publish.vue'),
    meta: { title: '发布', icon: 'UploadFilled' }
  },
  {
    path: '/accounts',
    name: 'Accounts',
    component: () => import('../views/Accounts.vue'),
    meta: { title: '账号', icon: 'UserFilled' }
  },
  {
    path: '/features',
    name: 'Features',
    component: () => import('../views/Features.vue'),
    meta: { title: '功能', icon: 'Menu' }
  },
  {
    path: '/auto-reply',
    name: 'AutoReply',
    component: () => import('../views/AutoReply.vue'),
    meta: { title: '私信自动回复', icon: 'Promotion' }
  },
  {
    path: '/create-auto-reply',
    name: 'CreateAutoReply',
    component: () => import('../views/CreateAutoReply.vue'),
    meta: { title: '创建策略', icon: 'Plus' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
