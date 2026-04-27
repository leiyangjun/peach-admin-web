/**
 * 主布局控制器（Controller）：菜单、页签、登出等交互。
 * 作者：leiyangjun
 */

import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormRules } from 'element-plus'
import { House, User, Lock, Expand, Fold } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { useAppStore } from '../../stores/app'
import type { MenuItem } from '../../models/menu'
import type { PasswordFormModel, ProfileFormModel } from '../../models/auth'

export function useLayoutController() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const appStore = useAppStore()

  const menuList: MenuItem[] = [
    { index: '/dashboard', title: '首页', icon: House },
    { index: '/system/user', title: '用户管理', icon: User },
    { index: '/system/role', title: '角色管理', icon: Lock },
  ]

  const activeMenu = computed(() => route.path)
  const activeTab = computed(() => route.path)
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
      if (route.path !== '/login') {
        appStore.addTab(route.path, String(route.meta.title || '页面'))
      }
    },
    { immediate: true },
  )

  const handleLogout = () => {
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
    router.push(String(name))
  }

  const handleTabRemove = (targetName: string | number) => {
    const targetPath = String(targetName)
    if (targetPath === '/dashboard') {
      return
    }
    const currentPath = route.path
    appStore.removeTab(targetPath)
    if (currentPath === targetPath) {
      const fallback = appStore.tabs[appStore.tabs.length - 1]?.path || '/dashboard'
      router.push(fallback)
    }
  }

  return {
    authStore,
    appStore,
    menuList,
    activeMenu,
    activeTab,
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
  }
}
