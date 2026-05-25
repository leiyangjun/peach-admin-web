/**
 * 按钮权限五大类，与 common-service cmn_button / cmn_menu_button 种子数据对齐。
 * 语义：QUERY=查看/查询/重置/刷新/日志；ADD=新增；EDIT=修改/保存/提交/状态切换等；DELETE=删除；CANCEL=取消关闭。
 */
export const CMN_BUTTON = {
  QUERY: 'BTN_QUERY',
  ADD: 'BTN_ADD',
  EDIT: 'BTN_EDIT',
  DELETE: 'BTN_DELETE',
  CANCEL: 'BTN_CANCEL',
} as const

export type CmnButtonCode = (typeof CMN_BUTTON)[keyof typeof CMN_BUTTON]

/** 五大类默认展示名（与 cmn_button.button_name 一致） */
export const CMN_BUTTON_LABEL: Record<CmnButtonCode, string> = {
  BTN_QUERY: '查询',
  BTN_ADD: '新增',
  BTN_EDIT: '编辑',
  BTN_DELETE: '删除',
  BTN_CANCEL: '取消',
}

/** 页面控件展示文案（与权限 CODE 解耦，模板中按需引用） */
export const BTN_UI = {
  QUERY: '查询',
  RESET: '重置',
  REFRESH: '刷新',
  VIEW: '查看',
  LOG: '日志',
  SAVE: '保存',
  SUBMIT: '提交',
  PAUSE: '暂停',
  RESUME: '恢复',
  TRIGGER: '触发',
  ASSIGN: '分配',
  BIND_MENU: '分配菜单',
  BIND_BUTTON: '分配按钮',
  RESET_PASSWORD: '重置密码',
  ENABLE: '启用',
  DISABLE: '禁用',
} as const

export function cmnButtonLabel(code: CmnButtonCode): string {
  return CMN_BUTTON_LABEL[code]
}
