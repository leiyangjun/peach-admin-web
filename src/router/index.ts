import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePermissionStore } from '../stores/permission'
import { STATIC_SIDEBAR_MENU_TREE } from '../config/staticSidebarMenus'
import {
  clearRegisteredMenuRoutes,
  registerPermissionMenuBundleOnce,
  registerStaticSidebarMenuBundleOnce,
} from './dynamicMenuRoutes'

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

router.beforeEach(async (to, _from, next) => {
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

  const permissionStore = usePermissionStore()
  if (!permissionStore.loaded && !permissionStore.loading) {
    try {
      await permissionStore.loadCurrentUserPermission()
    } catch {
      // 权限加载失败时回退写死侧栏，避免白屏
    }
  }

  const menuTree =
    permissionStore.loaded && permissionStore.menuTree.length > 0
      ? permissionStore.menuTree
      : STATIC_SIDEBAR_MENU_TREE

  const justRegistered =
    permissionStore.loaded && permissionStore.menuTree.length > 0
      ? registerPermissionMenuBundleOnce(router, menuTree)
      : registerStaticSidebarMenuBundleOnce(router, menuTree)

  if (justRegistered) {
    next({ ...to, replace: true })
    return
  }
  next()
})

export default router
