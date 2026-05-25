/**

 * 当前登录用户菜单与按钮权限状态。

 */

import { defineStore } from 'pinia'

import { fetchCurrentUserMenuButtons, fetchCurrentUserMenuTree } from '../api/role'

import type { CmnButtonCode } from '../constants/cmnButton'

import type { UserMenuVO } from '../models/menuMgmt'

import { findMenuNodeByRoutePath } from '../utils/menuTreeWalk'

import { isSessionExpiredError } from '../utils/sessionExpired'

/**
 * 临时 bypass：为 true 时忽略角色按钮权限，前端显示全部按钮；
 * 恢复角色控制时改为 false 即可。
 */
export const BYPASS_BUTTON_PERMISSION = true

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



export const usePermissionStore = defineStore('permission', {

  state: () => ({

    loaded: false,

    loading: false,

    menuTree: [] as UserMenuVO[],

    /** routePath -> buttonCode 集合（按菜单懒加载合并） */

    buttonsByRoute: new Map<string, Set<string>>(),

    /** menuCode -> buttonCode 集合 */

    buttonsByMenuCode: new Map<string, Set<string>>(),

    /** menuId -> 已拉取过的按钮 CODE 列表缓存 */

    buttonsByMenuId: new Map<string, string[]>(),

    /** 正在拉取按钮的 menuId，避免重复请求 */

    buttonsLoadingMenuIds: new Set<string>(),

  }),

  actions: {

    reset() {

      this.loaded = false

      this.loading = false

      this.menuTree = []

      this.buttonsByRoute = new Map()

      this.buttonsByMenuCode = new Map()

      this.buttonsByMenuId = new Map()

      this.buttonsLoadingMenuIds = new Set()

    },

    applyButtonsForMenu(menu: UserMenuVO, buttonCodes: string[]) {

      const codes = buttonCodesToSet(buttonCodes)

      const routeKey = normalizeRoutePath(menu.routePath)

      if (routeKey) {

        this.buttonsByRoute.set(routeKey, codes)

      }

      const menuCode = (menu.menuCode ?? '').trim()

      if (menuCode) {

        this.buttonsByMenuCode.set(menuCode, codes)

      }

    },

    async loadCurrentUserPermission() {

      if (this.loading) {

        return

      }

      this.loading = true

      try {

        this.menuTree = await fetchCurrentUserMenuTree()

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

    /**

     * 按菜单 ID 拉取按钮 CODE 并写入 route/menuCode 索引；已缓存则直接返回。

     */

    async loadButtonsForMenuId(menuId: string | number, menu?: UserMenuVO | null) {
      // 临时 bypass：不请求当前用户菜单按钮，避免无效 API
      if (BYPASS_BUTTON_PERMISSION) {
        return []
      }

      const idKey = String(menuId)

      if (this.buttonsByMenuId.has(idKey)) {

        const cached = this.buttonsByMenuId.get(idKey)!

        if (menu) {

          this.applyButtonsForMenu(menu, cached)

        }

        return cached

      }

      if (this.buttonsLoadingMenuIds.has(idKey)) {

        return []

      }

      this.buttonsLoadingMenuIds.add(idKey)

      try {

        const buttonCodes = await fetchCurrentUserMenuButtons(menuId)

        this.buttonsByMenuId.set(idKey, buttonCodes)

        if (menu) {

          this.applyButtonsForMenu(menu, buttonCodes)

        }

        return buttonCodes

      } finally {

        this.buttonsLoadingMenuIds.delete(idKey)

      }

    },

    /**

     * 根据 route_path 在已加载菜单树中定位 MENU 并拉取按钮权限。

     */

    async loadButtonsForRoutePath(routePathRaw: string) {

      const routeKey = normalizeRoutePath(routePathRaw)

      if (!routeKey || !this.menuTree.length) {

        return

      }

      const menu = findMenuNodeByRoutePath(this.menuTree, routePathRaw.trim())

      if (!menu?.id) {

        return

      }

      await this.loadButtonsForMenuId(menu.id, menu)

    },

    hasButton(buttonCode: CmnButtonCode | string, routePath?: string, menuCode?: string): boolean {
      // 临时 bypass：不按角色过滤，有合法 buttonCode 即视为可见
      if (BYPASS_BUTTON_PERMISSION) {
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


