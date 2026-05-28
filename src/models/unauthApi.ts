/**
 * 网关免鉴权 API（与 peach-common-service UnauthApiVO 对齐）
 */

/** 列表菜单路由，供按钮权限与页面路径对齐 */
export const UNAUTH_API_LIST_PATH = '/system/unauth-api'

export type UnauthApiType = 'INTERNAL' | 'EXTERNAL'

export interface UnauthApiVO {
  id?: string | number
  method?: string
  summary?: string | null
  urlPath?: string | null
  serviceName?: string | null
  isExternal?: number
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
