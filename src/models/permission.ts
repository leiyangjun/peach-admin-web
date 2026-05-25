/**
 * 菜单按钮绑定、API 元数据等前端模型（与 peach-common-service MenuInfoVO / ApiMeta 对齐）。
 */

/** 全局按钮字典 cmn_button */
export interface ButtonDictVO {
  id?: string
  buttonType?: string
  buttonName?: string
  buttonCode?: string
  sortNo?: number
  remark?: string
}

/** 菜单按钮联合行 */
export interface MenuButtonPickerRow {
  menuButtonId?: string
  dictButtonId?: string
  menuId?: string
  menuName?: string
  buttonCode?: string
  buttonName?: string
}

/** 新建菜单未保存时，前端草稿按钮槽（结构与落库后绑定一致） */
export interface DraftMenuButtonSlot {
  tempKey: string
  /** cmn_button 字典主键 */
  dictButtonId: string
  /** 已落库的 cmn_menu_button.id（编辑回显时有值） */
  menuButtonId?: string
  buttonCode: string
  buttonName: string
  apis: ApiMetaDTO[]
}

/** 与后端 ApiMeta 对齐 */
export interface ApiMetaDTO {
  method?: string
  summary?: string
  description?: string
  apiDesc?: string
  urlPath?: string
  pathPattern?: string
  serviceName?: string
  apiType?: string
}
