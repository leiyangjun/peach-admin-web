/**
 * 当前登录用户菜单与按钮权限（对接 GET /permission/current-user）。
 */
import type { MenuMgmtVO } from './menuMgmt'

export interface CurrentUserMenuButtonItem {
  menuButtonId?: string | number
  menuId?: string | number
  menuCode?: string
  routePath?: string
  buttonCode?: string
  buttonName?: string
}

export interface CurrentUserPermissionVO {
  menuTree: MenuMgmtVO[]
  menuButtons: CurrentUserMenuButtonItem[]
}
