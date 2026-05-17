import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { STATIC_SIDEBAR_MENU_TREE } from '../config/staticSidebarMenus'
import { clearRegisteredMenuRoutes, registerStaticSidebarMenuBundleOnce } from './dynamicMenuRoutes'

/**
 * 主布局 name 固定为 AdminShell，供 {@link ./dynamicMenuRoutes} 动态 addRoute。
 * 站内页签路由优先由菜单管理 + registerRoutesFromMenuTree 注册；本处仅保留登录、首页、嵌入承载页。
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { title: '登录' },
    },
    {
      path: '/',
      name: 'AdminShell',
      component: () => import('../layout/AdminLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/dashboard/HomeView.vue'),
          meta: { title: '首页', icon: 'House' },
        },
        {
          path: 'frame/embed',
          name: 'FrameEmbed',
          component: () => import('../views/frame/IframeShellView.vue'),
          meta: { title: '嵌入页' },
        },
        {
          path: 'system/scheduler/edit/:id?',
          name: 'SchedulerEdit',
          component: () => import('../views/system/SchedulerEditView.vue'),
          meta: { title: '任务编辑' },
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  if (to.path === '/login') {
    if (!authStore.isAuthenticated) {
      clearRegisteredMenuRoutes(router)
    }
    if (authStore.isAuthenticated) {
      next('/')
      return
    }
    next()
    return
  }
  if (!authStore.isAuthenticated) {
    next('/login')
    return
  }
  const justRegistered = registerStaticSidebarMenuBundleOnce(router, STATIC_SIDEBAR_MENU_TREE)
  // 动态 addRoute 后必须重走当前 location，否则新窗口直达 /system/xxx 等 matched 仍为空
  if (justRegistered) {
    next({ ...to, replace: true })
    return
  }
  next()
})

export default router
