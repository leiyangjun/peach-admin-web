/**
 * 当前用户对某菜单的按钮权限 CODE（GET /admin/role/user/{menuId}/buttons 返回项）。
 */
export type UserMenuButtonCode = string

/**
 * @deprecated 后端已改为返回 `string[]`（按钮 CODE）；请使用 {@link UserMenuButtonCode}。
 */
export interface UserMenuButtonVO {
  id?: string | number
  buttonType?: string
  buttonName?: string
  buttonCode?: string
  sortNo?: number
  remark?: string
}
