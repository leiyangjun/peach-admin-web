/**

 * 菜单领域模型（与后端 MenuVO / MenuInfoVO 对齐）。

 * - {@link UserMenuVO}：当前用户菜单树（GET /role/user/menus）

 * - {@link MenuMgmtVO}：菜单主体字段（树节点与表单）

 * - {@link MenuInfoVO}：GET/POST /admin/menu 详情与保存（含 menuButtons）

 */



import type { ApiMetaDTO } from './permission'



/** 与后端 MenuButtonVO 对齐 */

export interface MenuButtonVO {

  id?: string | number

  menuId?: string | number

  /** cmn_button 字典主键 */

  buttonId?: string | number

  buttonCode?: string

  buttonName?: string

  orderNo?: number | null

  remark?: string | null

  valid?: number | null

  creator?: string | number | null

  editor?: string | number | null

  createTime?: string | null

  editTime?: string | null

}



/** 与后端 ButtonApiVO 对齐（含 ApiMeta 展示字段） */

export interface ButtonApiVO extends ApiMetaDTO {

  id?: string | number

  menuId?: string | number

  buttonId?: string | number

  menuButtonId?: string | number

  apiCode?: string

  valid?: number | null

  creator?: string | number | null

  editor?: string | number | null

  createTime?: string | null

  editTime?: string | null

}



/** 单条菜单-按钮绑定及其 API 列表 */

export interface MenuButtonInfoItem {

  menuButton?: MenuButtonVO | null

  buttonApis?: ButtonApiVO[] | null

}



/** GET /admin/menu/{id}、POST /admin/menu 请求/响应体 */

export interface MenuInfoVO {

  menu?: MenuMgmtVO | null

  menuButtons?: MenuButtonInfoItem[] | null

}



/** 当前用户可见菜单树（GET /role/user/menus）；与后端 MenuVO 对齐 */

export interface UserMenuVO {

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

  children?: UserMenuVO[] | null

}



/** 菜单管理：树与表单主体（不含 buttonBindings） */

export interface MenuMgmtVO extends UserMenuVO {

  children?: MenuMgmtVO[] | null

}



/** ButtonApiVO → 穿梭框使用的 ApiMetaDTO */

export function buttonApiToApiMeta(vo: ButtonApiVO): ApiMetaDTO {

  return {

    method: vo.method,

    summary: vo.summary,

    description: vo.description,

    apiDesc: vo.apiDesc,

    urlPath: vo.urlPath,

    pathPattern: vo.pathPattern,

    serviceName: vo.serviceName,

    apiType: vo.apiType,

  }

}



/** ApiMetaDTO → POST MenuInfoVO 中的 buttonApis 项 */

export function apiMetaToButtonApi(meta: ApiMetaDTO): ButtonApiVO {

  return { ...meta }

}


