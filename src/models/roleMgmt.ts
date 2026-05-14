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

/** 与后端 BindRoleUsersDTO 对齐 */
export interface BindRoleUsersDTO {
  userIds: (string | number)[]
}
