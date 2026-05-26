/**
 * 应用管理：行数据 / 保存体与后端 ApplicationVO 对齐；分页条件见 ApplicationPageQuery。
 */

import { listClassToElTagType } from './dictMgmt'
import type { DictMgmtVO } from './dictMgmt'

export interface ApplicationMgmtVO {
  id?: string | number
  /** 存储值与码表 APP_TYPE 的 dict_value 一致 */
  appType?: string
  appName?: string
  appCode?: string
  appDesc?: string
  creator?: string | number
  editor?: string | number
  createTime?: string
  editTime?: string
}

/** GET /application/page 查询参数 */
export interface ApplicationPageQuery {
  pageNum: number
  pageSize: number
  searchValue?: string
  /** 等值筛选 app_type */
  appType?: string
  sortName?: string
  sortType?: string
}

/** 应用类型码表 dict_type（与后端 sys_dict 一致） */
export const APP_TYPE_DICT_TYPE = 'APP_TYPE'

/** 应用类型下拉 / 表格展示用选项 */
export interface AppTypeOption {
  value: string
  label: string
  listClass?: string
}

/** 有效码表项 → 下拉选项（dictValue / dictLabel / listClass） */
export function dictItemsToAppTypeOptions(items: DictMgmtVO[]): AppTypeOption[] {
  return items
    .filter((d) => d.dictValue != null && String(d.dictValue).trim() !== '')
    .map((d) => ({
      value: String(d.dictValue).trim(),
      label: d.dictLabel?.trim() || String(d.dictValue).trim(),
      listClass: d.listClass?.trim() || undefined,
    }))
}

/** 新增表单默认类型：优先 is_default=1，否则取第一项 */
export function defaultAppTypeFromDict(items: DictMgmtVO[], options: AppTypeOption[]): string {
  const def = items.find((d) => d.isDefault === 1 && d.dictValue != null && String(d.dictValue).trim() !== '')
  if (def?.dictValue != null) {
    return String(def.dictValue).trim()
  }
  return options[0]?.value ?? ''
}

export function resolveAppTypeLabel(appType: string | null | undefined, options: AppTypeOption[]): string {
  const key = (appType ?? '').trim()
  if (!key) {
    return '-'
  }
  const hit = options.find((o) => o.value.toUpperCase() === key.toUpperCase())
  return hit?.label ?? key
}

export function resolveAppTypeTagType(
  appType: string | null | undefined,
  options: AppTypeOption[],
): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  const key = (appType ?? '').trim().toUpperCase()
  const hit = options.find((o) => o.value.toUpperCase() === key)
  if (hit?.listClass) {
    return listClassToElTagType(hit.listClass)
  }
  return 'info'
}
