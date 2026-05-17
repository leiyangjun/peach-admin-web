/**
 * 菜单管理领域模型（与后端 MenuVO 对齐）。
 */

import type { ApiMetaDTO } from './permission'

/** 与后端 MenuButtonBindingItemDTO 对齐：单条按钮字典 + 该按钮下 API 全量列表 */
export interface MenuMgmtButtonBindingItem {
  dictButtonId: number
  apis: ApiMetaDTO[]
}

export interface MenuMgmtVO {
  /** 雪花主键；JSON 中超过安全整数时由 httpCommon 解析为 string，禁止依赖 number 精度 */
  id?: string | number
  parentId?: string | number | null
  menuCode: string
  menuName: string
  /** CATALOG | MENU | BUTTON（后台枚举；前端表单仅维护目录/菜单） */
  menuType: string
  routePath?: string | null
  /** 库表字段保留；前端不再维护，保存时不提交，由路由 path 约定解析视图 */
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
  /**
   * 非 undefined 时与 POST /menu 一并提交，服务端与菜单同事务写入按钮+API。
   * 目录 CATALOG 传空数组即可（服务端仅保留隐式 BTN_DEFAULT）；不传该字段表示不修改绑定（兼容旧客户端）。
   */
  buttonBindings?: MenuMgmtButtonBindingItem[] | null
}
