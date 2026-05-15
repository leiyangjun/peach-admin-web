/**
 * 权限配置相关前端模型（对接 peach-common-service /permission）。
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
  dictButtonId: string
  buttonCode: string
  buttonName: string
  apis: ApiMetaDTO[]
}

export interface RegistryServiceItem {
  serviceId: string
  displayName: string
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
