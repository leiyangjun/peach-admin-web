/**
 * 网关免鉴权 API（与 peach-common-service UnauthApiVO 对齐）
 */

/** 列表菜单路由，供按钮权限与页面路径对齐 */
export const UNAUTH_API_LIST_PATH = '/system/unauth-api'

export type UnauthApiType = 'INTERNAL' | 'EXTERNAL'

/** 1=免登录白名单 2=需登录免权限校验 */
export type UnauthAccessType = 1 | 2

export const UNAUTH_ACCESS_TYPE_OPTIONS: { value: UnauthAccessType; label: string }[] = [
  { value: 1, label: '免登录（白名单）' },
  { value: 2, label: '需登录（免权限）' },
]

export function unauthAccessTypeLabel(accessType?: number | null): string {
  const opt = UNAUTH_ACCESS_TYPE_OPTIONS.find((o) => o.value === Number(accessType))
  return opt?.label ?? '免登录（白名单）'
}

export interface UnauthApiVO {
  id?: string | number
  method?: string
  summary?: string | null
  urlPath?: string | null
  serviceName?: string | null
  isExternal?: number
  accessType?: UnauthAccessType
  finalPath?: string | null
  deletable?: number
  valid?: number
  creator?: string | number | null
  editor?: string | number | null
  createTime?: string | null
  editTime?: string | null
}

export interface UnauthApiPageQuery {
  pageNum: number
  pageSize: number
  searchValue?: string
  accessType?: UnauthAccessType
  valid?: number
  sortName?: string
  sortType?: string
}

export function isUnauthExternal(row: UnauthApiVO): boolean {
  return Number(row.isExternal) === 1
}

export function isUnauthDeletable(row: UnauthApiVO): boolean {
  return row.deletable !== 0
}

export function isUnauthEnabled(row: UnauthApiVO): boolean {
  return row.valid === 1
}

export function formTypeFromRow(row: UnauthApiVO): UnauthApiType {
  return isUnauthExternal(row) ? 'EXTERNAL' : 'INTERNAL'
}
