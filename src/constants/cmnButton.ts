/**
 * 与 common-service cmn_button 种子数据对齐（button_code / button_name）
 * 供页面按钮文案与后续按钮权限指令共用。
 */
export const CMN_BUTTON = {
  QUERY: 'BTN_QUERY',
  RESET: 'BTN_RESET',
  REFRESH: 'BTN_REFRESH',
  DEFAULT: 'BTN_DEFAULT',
  COLUMN_SETTING: 'BTN_COLUMN_SETTING',
  ADD: 'BTN_ADD',
  IMPORT: 'BTN_IMPORT',
  EDIT: 'BTN_EDIT',
  ENABLE: 'BTN_ENABLE',
  DISABLE: 'BTN_DISABLE',
  SAVE: 'BTN_SAVE',
  AUDIT_PASS: 'BTN_AUDIT_PASS',
  AUDIT_REJECT: 'BTN_AUDIT_REJECT',
  ASSIGN: 'BTN_ASSIGN',
  RESET_PASSWORD: 'BTN_RESET_PASSWORD',
  UNLOCK: 'BTN_UNLOCK',
  DELETE: 'BTN_DELETE',
  BATCH_DELETE: 'BTN_BATCH_DELETE',
  EXPORT: 'BTN_EXPORT',
  DOWNLOAD_TEMPLATE: 'BTN_DOWNLOAD_TEMPLATE',
  COPY: 'BTN_COPY',
  SUBMIT: 'BTN_SUBMIT',
  REVOKE: 'BTN_REVOKE',
  DOWNLOAD: 'BTN_DOWNLOAD',
  PRINT: 'BTN_PRINT',
  CANCEL: 'BTN_CANCEL',
  AUTH_ROLE: 'BTN_AUTH_ROLE',
  BIND_MENU: 'BTN_BIND_MENU',
  BIND_BUTTON: 'BTN_BIND_BUTTON',
  LOG: 'BTN_LOG',
  PAUSE: 'BTN_PAUSE',
  RESUME: 'BTN_RESUME',
  TRIGGER: 'BTN_TRIGGER',
} as const

export type CmnButtonCode = (typeof CMN_BUTTON)[keyof typeof CMN_BUTTON]

/** button_name，与 init_data.sql cmn_button 一致 */
export const CMN_BUTTON_LABEL: Record<CmnButtonCode, string> = {
  BTN_QUERY: '查询',
  BTN_RESET: '重置',
  BTN_REFRESH: '刷新',
  BTN_DEFAULT: '查看(默认)',
  BTN_COLUMN_SETTING: '列设置',
  BTN_ADD: '新增',
  BTN_IMPORT: '导入',
  BTN_EDIT: '编辑',
  BTN_ENABLE: '启用',
  BTN_DISABLE: '禁用',
  BTN_SAVE: '保存',
  BTN_AUDIT_PASS: '审核通过',
  BTN_AUDIT_REJECT: '审核驳回',
  BTN_ASSIGN: '分配',
  BTN_RESET_PASSWORD: '重置密码',
  BTN_UNLOCK: '解锁账号',
  BTN_DELETE: '删除',
  BTN_BATCH_DELETE: '批量删除',
  BTN_EXPORT: '导出',
  BTN_DOWNLOAD_TEMPLATE: '下载模板',
  BTN_COPY: '复制',
  BTN_SUBMIT: '提交',
  BTN_REVOKE: '撤回',
  BTN_DOWNLOAD: '下载',
  BTN_PRINT: '打印',
  BTN_CANCEL: '取消',
  BTN_AUTH_ROLE: '授权角色',
  BTN_BIND_MENU: '分配菜单',
  BTN_BIND_BUTTON: '分配按钮',
  BTN_LOG: '日志',
  BTN_PAUSE: '暂停',
  BTN_RESUME: '恢复',
  BTN_TRIGGER: '触发',
}

export function cmnButtonLabel(code: CmnButtonCode): string {
  return CMN_BUTTON_LABEL[code]
}
