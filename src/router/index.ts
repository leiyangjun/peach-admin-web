import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

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
          path: 'system/user',
          name: 'SystemUser',
          component: () => import('../views/system/UserView.vue'),
          meta: { title: '用户管理', icon: 'User' },
        },
        {
          path: 'system/role',
          name: 'SystemRole',
          component: () => import('../views/system/RoleView.vue'),
          meta: { title: '角色管理', icon: 'Lock' },
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  if (to.path === '/login') {
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
  next()
})

export default router
