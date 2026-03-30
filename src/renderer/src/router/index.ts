import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/login',
    meta: { public: true }
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
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', icon: 'Login', public: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫：拦截未登录用户的访问
router.beforeEach(async (to, from, next) => {
  // 调用后端 API 检查登录状态
  let isLoggedIn = false
  try {
    const res = await window.api.verify.checkLogin()
    isLoggedIn = res && res.success
  } catch (error) {
    console.error('检查登录状态失败:', error)
    isLoggedIn = false
  }
  
  // 如果目标路由不是公开的，且用户未登录，则重定向到登录页
  if (!to.meta.public && !isLoggedIn) {
    next({ name: 'Login' })
  } 
  // 如果用户已登录，且目标路由是登录页，则重定向到首页
  else if (to.name === 'Login' && isLoggedIn) {
    next({ name: 'Home' })
  }
  else {
    next()
  }
})

export default router
