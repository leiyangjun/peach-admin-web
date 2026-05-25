/**
 * 当前用户菜单与按钮权限 localStorage 缓存（与 token、用户信息同级，登出时清除）。
 */
import type { MenuTreeUserVO } from '../models/menuMgmt'

export const USER_PERMISSION_KEY = 'peach_admin_user_permission'

export interface UserPermissionCachePayload {
  isAdmin: boolean
  menuTree: MenuTreeUserVO[]
}

export function readUserPermissionCache(): UserPermissionCachePayload | null {
  try {
    const raw = localStorage.getItem(USER_PERMISSION_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as UserPermissionCachePayload
    if (!parsed || !Array.isArray(parsed.menuTree)) {
      return null
    }
    return {
      isAdmin: Boolean(parsed.isAdmin),
      menuTree: parsed.menuTree,
    }
  } catch {
    return null
  }
}

export function persistUserPermissionCache(payload: UserPermissionCachePayload): void {
  localStorage.setItem(USER_PERMISSION_KEY, JSON.stringify(payload))
}

export function clearUserPermissionCache(): void {
  localStorage.removeItem(USER_PERMISSION_KEY)
}
