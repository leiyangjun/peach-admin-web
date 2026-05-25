/**
 * 角色管理（与 peach-common-service RoleVO 对齐）。
 */

export interface RoleMgmtVO {
  id?: string | number
  roleCode?: string
  roleName?: string
  remark?: string
  valid?: number
  createTime?: string
  editTime?: string
}

export interface RolePageQuery {
  pageNum: number
  pageSize: number
  searchValue?: string
  sortName?: string
  sortType?: string
}

/** 与后端 RoleUserVO（cmn_role_user）对齐；提交绑定时仅需 roleId + userId */
export interface RoleUserVO {
  id?: string | number
  roleId?: string | number
  userId?: string | number
  createTime?: string
}

/** 角色绑定菜单：单菜单下按钮及勾选态（GET /role/menus/{roleId}） */
export interface MenuButtonRoleVO {
  roleId?: string | number
  menuId?: string | number
  /** 字典按钮主键（cmn_button.id）；与 menuId 组合为前端勾选键，与 cmn_role_button 授权维度一致 */
  buttonId?: string | number
  buttonCode?: string
  buttonName?: string
  /** true=已勾选，false=未勾选 */
  permission?: boolean
}

/** 角色绑定菜单树节点（MenuTreeRoleVO） */
export interface MenuTreeRoleVO {
  id?: string | number
  parentId?: string | number
  menuCode?: string
  menuName?: string
  menuType?: string
  routePath?: string
  componentPath?: string
  icon?: string
  orderNo?: number
  remark?: string
  valid?: number
  children?: MenuTreeRoleVO[]
  buttonRoleVOs?: MenuButtonRoleVO[]
}
