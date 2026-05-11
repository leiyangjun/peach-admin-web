/**
 * 菜单管理领域模型（与后端 MenuVO 对齐）。
 */

export interface MenuMgmtVO {
  /** 雪花主键；JSON 中超过安全整数时由 httpCommon 解析为 string，禁止依赖 number 精度 */
  id?: string | number
  parentId?: string | number | null
  menuCode: string
  menuName: string
  /** CATALOG | MENU | BUTTON */
  menuType: string
  routePath?: string | null
  componentPath?: string | null
  icon?: string | null
  orderNo?: number | null
  remark?: string | null
  valid?: number | null
  creator?: string | number | null
  editor?: string | number | null
  createTime?: string | null
  editTime?: string | null
  children?: MenuMgmtVO[] | null
}
