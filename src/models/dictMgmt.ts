/**
 * 码表管理：行数据 / 保存体与后端 DictVO 对齐；分页条件单独见 DictPageQuery。
 */

export interface DictMgmtVO {
  id?: string | number
  dictType?: string
  dictLabel?: string
  dictValue?: string
  sortNo?: number
  /** 状态：1 启用 0 停用（停用即业务上的“逻辑隐藏”，无 deleted 列） */
  status?: number
  remark?: string
  parentId?: string | number
  cssClass?: string
  listClass?: string
  isDefault?: number
  creator?: string | number
  editor?: string | number
  createTime?: string
  editTime?: string
}

/** GET /dict/page 查询参数（与后端 DictPageQuery 对齐） */
export interface DictPageQuery {
  pageNum: number
  pageSize: number
  searchValue?: string
  /** null/undefined=全部；0=仅停用；1=仅启用 */
  listStatusFlag?: number | string
  sortName?: string
  sortType?: string
}

/** Element Plus el-tag 的 type 与码表 list_class 常用取值 */
export const DICT_LIST_CLASS_TAG_OPTIONS = [
  { value: '', label: '默认（无 type）' },
  { value: 'primary', label: 'primary' },
  { value: 'success', label: 'success' },
  { value: 'warning', label: 'warning' },
  { value: 'danger', label: 'danger' },
  { value: 'info', label: 'info' },
] as const

const EL_TAG_TYPES = new Set(['primary', 'success', 'warning', 'danger', 'info'])

/** 将 list_class 转为安全的 el-tag type，非法或空时回退 info */
export function listClassToElTagType(
  listClass?: string | null,
): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const s = (listClass ?? '').trim().toLowerCase()
  if (!s || !EL_TAG_TYPES.has(s)) {
    return 'info'
  }
  return s as 'primary' | 'success' | 'warning' | 'danger' | 'info'
}
