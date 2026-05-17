/**
 * 登出、401、切换账号时清理与用户会话绑定的前端状态。
 */
import type { Router } from 'vue-router'
import { clearRegisteredMenuRoutes } from '../router/dynamicMenuRoutes'
import { useAppStore } from '../stores/app'
import { usePermissionStore } from '../stores/permission'
import { clearPersistedOpenTabs } from './adminOpenTabsPersistence'

/** 清理页签、页签持久化与动态路由（不清理 token 与权限缓存） */
export function resetUserUiSession(router: Router): void {
  clearRegisteredMenuRoutes(router)
  clearPersistedOpenTabs()
  useAppStore().resetTabs()
}

/** 清理 UI 会话并复位权限（登出、401 时调用） */
export function resetFullUserSession(router: Router): void {
  resetUserUiSession(router)
  usePermissionStore().reset()
}
