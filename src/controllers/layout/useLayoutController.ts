/**
 * 主布局控制器（Controller）：侧栏菜单（当前为写死配置）、页签、登出等交互。
 * 作者：leiyangjun
 */

import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormRules } from 'element-plus'
import { Expand, Fold } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { useAppStore } from '../../stores/app'
import { usePermissionStore } from '../../stores/permission'
import { STATIC_SIDEBAR_MENU_TREE } from '../../config/staticSidebarMenus'
import type { PasswordFormModel, ProfileFormModel } from '../../models/auth'
import { openExternalPage, openInternalRouteInNewWindow } from '../../utils/navigation'
import { parseMenuRoutePath } from '../../utils/menuRoutePath'
import { findMenuTitleByRoutePath } from '../../utils/menuTreeWalk'
import { resetFullUserSession } from '../../utils/userSessionReset'
import {
  loadPersistedOpenTabs,
  persistedToTabItems,
  savePersistedOpenTabs,
} from '../../utils/adminOpenTabsPersistence'

const FRAME_EMBED_PATH = '/frame/embed'

export function useLayoutController() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const appStore = useAppStore()
  const permissionStore = usePermissionStore()
  /** 侧栏：优先使用登录后权限菜单，未加载时回退写死树 */
  const menuTree = computed(() =>
    permissionStore.loaded && permissionStore.menuTree.length > 0
      ? permissionStore.menuTree
      : STATIC_SIDEBAR_MENU_TREE,
  )

  /** 刷新后恢复页签：动态路由已在 router.beforeEach 中注册完毕后再进入布局 */
  const persistedTabs = loadPersistedOpenTabs()
  if (persistedTabs.length) {
    appStore.setTabs(persistedToTabItems(router, persistedTabs))
  }

  const activeMenu = computed(() => {
    if (route.path === '/frame/embed') {
      const rk = route.query.rk
      if (typeof rk === 'string' && rk.trim()) {
        try {
          return decodeURIComponent(rk.trim())
        } catch {
          return rk.trim()
        }
      }
    }
    return route.path
  })

  const activeTab = computed(() => route.fullPath)

  const breadcrumbs = computed(() => {
    const curPath = route.path
    let curTitle = String(route.meta.title || '页面')
    if (curPath === '/frame/embed') {
      const t = route.query.t
      if (typeof t === 'string' && t.trim()) {
        try {
          curTitle = decodeURIComponent(t.trim())
        } catch {
          curTitle = t.trim()
        }
      }
    }
    if (curPath === '/dashboard') {
      return [{ path: '/dashboard', title: '首页', current: true as const }]
    }
    return [
      { path: '/dashboard', title: '首页', current: false as const },
      { path: curPath, title: curTitle, current: true as const },
    ]
  })

  const collapseIcon = computed(() => (appStore.sidebarCollapsed ? Expand : Fold))
  const profileDialogVisible = ref(false)
  const passwordDialogVisible = ref(false)

  const profileForm = reactive<ProfileFormModel>({
    username: authStore.user?.username || '',
    nickname: authStore.user?.nickname || '',
    phone: '13800000000',
    email: 'admin@peach.com',
  })
  const passwordForm = reactive<PasswordFormModel>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const profileRules: FormRules = {
    nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
    phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
    email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
  }
  const passwordRules: FormRules = {
    oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
    newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }],
    confirmPassword: [{ required: true, message: '请再次输入新密码', trigger: 'blur' }],
  }

  watch(
    () => route.fullPath,
    () => {
      if (route.path === '/login') {
        return
      }
      let title = String(route.meta.title || '页面')
      if (route.path === '/frame/embed') {
        const t = route.query.t
        if (typeof t === 'string' && t.trim()) {
          try {
            title = decodeURIComponent(t.trim())
          } catch {
            title = t.trim()
          }
        }
      }
      const routeName = typeof route.name === 'string' && route.name ? route.name : null
      appStore.addTab(route.fullPath, title, routeName)
    },
    { immediate: true },
  )

  watch(
    () => appStore.tabs,
    (tabs) => {
      savePersistedOpenTabs(tabs)
    },
    { deep: true },
  )

  const handleLogout = () => {
    resetFullUserSession(router)
    authStore.logout()
    ElMessage.success('已退出登录')
    router.replace('/login')
  }

  const handleUserAction = (action: string | number) => {
    const value = String(action)
    if (value === 'profile') {
      profileForm.username = authStore.user?.username || ''
      profileForm.nickname = authStore.user?.nickname || ''
      profileDialogVisible.value = true
      return
    }
    if (value === 'password') {
      Object.assign(passwordForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
      passwordDialogVisible.value = true
      return
    }
    if (value === 'logout') {
      handleLogout()
    }
  }

  const submitProfile = () => {
    authStore.updateNickname(profileForm.nickname)
    profileDialogVisible.value = false
    ElMessage.success('个人信息已保存（演示）')
  }

  const submitPassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      ElMessage.error('两次新密码不一致')
      return
    }
    passwordDialogVisible.value = false
    ElMessage.success('密码已修改（演示）')
  }

  const handleTabChange = (name: string | number) => {
    void router.push(String(name))
  }

  /** 侧栏 index 为菜单表 route_path 原文（含 frame://、openwindow:// 协议） */
  const handleMenuSelect = (index: string) => {
    const parsed = parseMenuRoutePath(index)
    if (!parsed) {
      return
    }
    const title = findMenuTitleByRoutePath(menuTree.value, index) ?? '页面'
    if (parsed.kind === 'internal') {
      void router.push(parsed.path)
      return
    }
    if (parsed.kind === 'iframe') {
      void router.push({
        path: FRAME_EMBED_PATH,
        query: {
          u: encodeURIComponent(parsed.url),
          rk: encodeURIComponent(index),
          t: encodeURIComponent(title),
        },
      })
      return
    }
    if (parsed.kind === 'openExternal') {
      openExternalPage(parsed.url)
      return
    }
    if (parsed.kind === 'openInternal') {
      openInternalRouteInNewWindow(router, parsed.path)
    }
  }

  const handleTabRemove = (targetName: string | number) => {
    const targetPath = String(targetName)
    if (targetPath === '/dashboard' || targetPath.startsWith('/dashboard?')) {
      return
    }
    const currentFull = route.fullPath
    appStore.removeTab(targetPath)
    if (currentFull === targetPath) {
      const fallback = appStore.tabs[appStore.tabs.length - 1]?.path || '/dashboard'
      void router.push(fallback)
    }
  }

  return {
    authStore,
    appStore,
    menuTree,
    activeMenu,
    activeTab,
    breadcrumbs,
    collapseIcon,
    profileDialogVisible,
    passwordDialogVisible,
    profileForm,
    passwordForm,
    profileRules,
    passwordRules,
    handleLogout,
    handleUserAction,
    submitProfile,
    submitPassword,
    handleTabChange,
    handleTabRemove,
    handleMenuSelect,
  }
}
