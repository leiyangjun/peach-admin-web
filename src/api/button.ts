/**
 * 按钮字典 API（经网关访问 peach-common-service）。
 * 控制器基础路径：/button
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import { normalizePageNum, normalizePageSize } from '../utils/pagination'
import type { ApiEnvelope } from '../models/auth'
import type { ButtonDictVO } from '../models/permission'

const BASE = '/button'

export interface ButtonPageQuery {
  pageNum: number
  pageSize: number
  searchValue?: string
  sortName?: string
  sortType?: string
}

export interface PageInfoButton {
  list: ButtonDictVO[]
  total: number
  pageNum: number
  pageSize: number
  pages?: number
}

/** 后端 id 可能为 number，统一转为 string 便于前端 Map/比较 */
function normalizeButtonRow(row: ButtonDictVO): ButtonDictVO {
  return {
    ...row,
    id: row.id != null ? String(row.id) : undefined,
  }
}

/** 条件分页查询按钮字典；关键字对名称、编码模糊匹配 */
export async function fetchButtonPage(query: ButtonPageQuery): Promise<PageInfoButton> {
  const pageNum = normalizePageNum(query.pageNum)
  const pageSize = normalizePageSize(query.pageSize)
  const { data: body } = await httpCommon.get<ApiEnvelope<PageInfoButton>>(`${BASE}/page`, {
    params: {
      pageNum,
      pageSize,
      searchValue: query.searchValue?.trim() || undefined,
      sortName: query.sortName,
      sortType: query.sortType,
    },
  })
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '分页查询按钮失败')
  }
  const data = body.data
  return {
    ...data,
    list: (data.list ?? []).map(normalizeButtonRow),
  }
}

/** 全量按钮字典（新建菜单默认 BTN_QUERY、目录保存等场景） */
export async function fetchButtonAll(): Promise<ButtonDictVO[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<ButtonDictVO[]>>(`${BASE}/all`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载按钮字典失败')
  }
  return body.data.map(normalizeButtonRow)
}
