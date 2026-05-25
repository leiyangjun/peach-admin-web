/**

 * @deprecated 旧版聚合权限（GET /permission/current-user）；运行时已改用

 * {@link ../api/role.ts fetchUserMenus}（GET /admin/role/user/menus）。

 */

import type { UserMenuVO } from './menuMgmt'

import type { UserMenuButtonCode } from './userMenuButton'



/** @deprecated 请使用 {@link UserMenuButtonCode}（按钮 CODE 字符串） */

export type CurrentUserMenuButtonItem = UserMenuButtonCode



/** @deprecated 请使用分接口拉取菜单树与按钮 */

export interface CurrentUserPermissionVO {

  menuTree: UserMenuVO[]

  menuButtons: CurrentUserMenuButtonItem[]

}


