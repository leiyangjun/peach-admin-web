/**
 * 运维菜单管理模型（与后端 MenuOps*VO 对齐）。
 */

/** GET /admin/menu/ops/{id}、POST/PATCH 响应 */
export interface MenuOpsDetailVO {
  id?: string | number
  parentId?: string | number | null
  menuCode?: string
  menuName?: string
  menuType?: string
  routePath?: string | null
  icon?: string | null
  orderNo?: number | null
  remark?: string | null
  valid?: number | null
  createTime?: string | null
  editTime?: string | null
}

/** POST /admin/menu/ops（仅 CATALOG） */
export interface MenuOpsSaveVO {
  parentId: string | number
  menuName: string
  menuType?: string
  orderNo?: number | null
  icon?: string | null
  valid?: number | null
  remark?: string | null
}

/** PATCH /admin/menu/ops/{id}（不可改 menuType） */
export interface MenuOpsPatchVO {
  parentId?: string | number | null
  menuName?: string
  orderNo?: number | null
  icon?: string | null
  valid?: number | null
  remark?: string | null
}

/** 树节点（复用菜单管理树结构） */
export interface MenuOpsTreeNode {
  id?: string | number
  parentId?: string | number | null
  menuCode?: string
  menuName?: string
  menuType?: string
  routePath?: string | null
  icon?: string | null
  orderNo?: number | null
  valid?: number | null
  children?: MenuOpsTreeNode[] | null
}
