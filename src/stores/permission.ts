/**
 * 当前登录用户菜单与按钮权限状态。
 */
import { defineStore } from 'pinia'
import { fetchCurrentUserPermission } from '../api/permission'
import type { CmnButtonCode } from '../constants/cmnButton'
import type { CurrentUserMenuButtonItem } from '../models/currentUserPermission'
import type { MenuMgmtVO } from '../models/menuMgmt'
import { isSessionExpiredError } from '../utils/sessionExpired'

function normalizeRoutePath(raw: string | null | undefined): string {
  const t = (raw ?? '').trim()
  if (!t) {
    return ''
  }
  return t.startsWith('/') ? t : `/${t}`
}

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    loaded: false,
    loading: false,
    menuTree: [] as MenuMgmtVO[],
    menuButtons: [] as CurrentUserMenuButtonItem[],
    /** routePath -> buttonCode 集合 */
    buttonsByRoute: new Map<string, Set<string>>(),
    /** menuCode -> buttonCode 集合 */
    buttonsByMenuCode: new Map<string, Set<string>>(),
  }),
  actions: {
    reset() {
      this.loaded = false
      this.loading = false
      this.menuTree = []
      this.menuButtons = []
      this.buttonsByRoute = new Map()
      this.buttonsByMenuCode = new Map()
    },
    buildButtonIndex(items: CurrentUserMenuButtonItem[]) {
      const byRoute = new Map<string, Set<string>>()
      const byMenuCode = new Map<string, Set<string>>()
      for (const row of items) {
        const code = (row.buttonCode ?? '').trim()
        if (!code) {
          continue
        }
        const routeKey = normalizeRoutePath(row.routePath)
        if (routeKey) {
          let set = byRoute.get(routeKey)
          if (!set) {
            set = new Set()
            byRoute.set(routeKey, set)
          }
          set.add(code)
        }
        const menuCode = (row.menuCode ?? '').trim()
        if (menuCode) {
          let set = byMenuCode.get(menuCode)
          if (!set) {
            set = new Set()
            byMenuCode.set(menuCode, set)
          }
          set.add(code)
        }
      }
      this.buttonsByRoute = byRoute
      this.buttonsByMenuCode = byMenuCode
    },
    async loadCurrentUserPermission() {
      if (this.loading) {
        return
      }
      this.loading = true
      try {
        const data = await fetchCurrentUserPermission()
        this.menuTree = data.menuTree ?? []
        this.menuButtons = data.menuButtons ?? []
        this.buildButtonIndex(this.menuButtons)
        this.loaded = true
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
