/**
 * 当前登录用户菜单与按钮权限状态（一次性 GET /role/user/menus + localStorage 缓存）。
 */
import { defineStore } from 'pinia'
import { fetchUserMenus } from '../api/role'
import type { CmnButtonCode } from '../constants/cmnButton'
import type { MenuTreeUserVO, UserMenuVO } from '../models/menuMgmt'
import { isSessionExpiredError } from '../utils/sessionExpired'
import {
  clearUserPermissionCache,
  persistUserPermissionCache,
  readUserPermissionCache,
} from '../utils/userPermissionStorage'

function normalizeRoutePath(raw: string | null | undefined): string {
  const t = (raw ?? '').trim()
  if (!t) {
    return ''
  }
  return t.startsWith('/') ? t : `/${t}`
}

function buttonCodesToSet(codes: string[]): Set<string> {
  const set = new Set<string>()
  for (const raw of codes) {
    const code = (raw ?? '').trim()
    if (code) {
      set.add(code)
    }
  }
  return set
}

function resolveIsAdmin(tree: MenuTreeUserVO[]): boolean {
  return tree.some((node) => node.admin === true)
}

function indexButtonsFromMenuTree(tree: MenuTreeUserVO[], isAdmin: boolean) {
  const buttonsByRoute = new Map<string, Set<string>>()
  const buttonsByMenuCode = new Map<string, Set<string>>()

  if (isAdmin) {
    return { buttonsByRoute, buttonsByMenuCode }
  }

  const walk = (nodes: MenuTreeUserVO[]) => {
    for (const node of nodes) {
      const codes = (node.buttons ?? [])
        .map((b) => (b.buttonCode ?? '').trim())
        .filter(Boolean)
      if (codes.length) {
        const set = buttonCodesToSet(codes)
        const routeKey = normalizeRoutePath(node.routePath)
        if (routeKey) {
          buttonsByRoute.set(routeKey, set)
        }
        const menuCode = (node.menuCode ?? '').trim()
        if (menuCode) {
          buttonsByMenuCode.set(menuCode, set)
        }
      }
      if (node.children?.length) {
        walk(node.children)
      }
    }
  }
  walk(tree)
  return { buttonsByRoute, buttonsByMenuCode }
}

function buildStateFromCache() {
  const cached = readUserPermissionCache()
  if (!cached) {
    return {
      loaded: false,
      loading: false,
      isAdmin: false,
      menuTree: [] as UserMenuVO[],
      buttonsByRoute: new Map<string, Set<string>>(),
      buttonsByMenuCode: new Map<string, Set<string>>(),
    }
  }
  const { buttonsByRoute, buttonsByMenuCode } = indexButtonsFromMenuTree(cached.menuTree, cached.isAdmin)
  return {
    loaded: true,
    loading: false,
    isAdmin: cached.isAdmin,
    menuTree: cached.menuTree,
    buttonsByRoute,
    buttonsByMenuCode,
  }
}

export const usePermissionStore = defineStore('permission', {
  state: () => buildStateFromCache(),
  actions: {
    reset() {
      clearUserPermissionCache()
      this.loaded = false
      this.loading = false
      this.isAdmin = false
      this.menuTree = []
      this.buttonsByRoute = new Map()
      this.buttonsByMenuCode = new Map()
    },

    applyPermissionPayload(menuTree: MenuTreeUserVO[]) {
      const isAdmin = resolveIsAdmin(menuTree)
      const { buttonsByRoute, buttonsByMenuCode } = indexButtonsFromMenuTree(menuTree, isAdmin)
      this.isAdmin = isAdmin
      this.menuTree = menuTree
      this.buttonsByRoute = buttonsByRoute
      this.buttonsByMenuCode = buttonsByMenuCode
      this.loaded = true
      persistUserPermissionCache({ isAdmin, menuTree })
    },

    /**
     * 加载当前用户菜单与按钮权限。
     * @param force 为 true 时忽略缓存并重新请求（登录成功等场景）
     */
    async loadCurrentUserPermission(options?: { force?: boolean }) {
      if (this.loading) {
        return
      }
      if (!options?.force && this.loaded) {
        return
      }
      this.loading = true
      try {
        const menuTree = await fetchUserMenus()
        this.applyPermissionPayload(menuTree)
      } catch (e) {
        if (!isSessionExpiredError(e)) {
          throw e
        }
        this.reset()
      } finally {
        this.loading = false
      }
    },

    hasButton(buttonCode: CmnButtonCode | string, routePath?: string, menuCode?: string): boolean {
      if (this.isAdmin) {
        return Boolean(String(buttonCode).trim())
      }
      if (!this.loaded) {
        return true
      }
      const code = String(buttonCode).trim()
      if (!code) {
        return false
      }
      const routeKey = normalizeRoutePath(routePath)
      if (routeKey) {
        const set = this.buttonsByRoute.get(routeKey)
        if (set?.has(code)) {
          return true
        }
      }
      const mc = (menuCode ?? '').trim()
      if (mc) {
        const set = this.buttonsByMenuCode.get(mc)
        if (set?.has(code)) {
          return true
        }
      }
      return false
    },
  },
})
