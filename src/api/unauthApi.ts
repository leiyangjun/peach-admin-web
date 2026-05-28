/**
 * 免鉴权 API 管理（经网关访问 peach-common-service /unauth-api）
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { UnauthApiPageQuery, UnauthApiVO } from '../models/unauthApi'

const BASE = '/unauth-api'

export interface PageInfoUnauthApi {
  list: UnauthApiVO[]
  total: number
  pageNum: number
  pageSize: number
  pages?: number
}

export async function fetchUnauthApiPage(query: UnauthApiPageQuery): Promise<PageInfoUnauthApi> {
  const { data: body } = await httpCommon.get<ApiEnvelope<PageInfoUnauthApi>>(`${BASE}/page`, {
    params: {
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      searchValue: query.searchValue?.trim() || undefined,
      valid: query.valid,
      sortName: query.sortName,
      sortType: query.sortType,
    },
  })
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '分页查询免鉴权 API 失败')
  }
  return body.data
}

export async function fetchUnauthApiById(id: string | number): Promise<UnauthApiVO> {
  const { data: body } = await httpCommon.get<ApiEnvelope<UnauthApiVO>>(`${BASE}/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '查询详情失败')
  }
  if (body.data == null) {
    throw new Error('未查询到该记录')
  }
  return body.data
}

export async function saveUnauthApi(payload: UnauthApiVO): Promise<string | number | undefined> {
  const res = await httpCommon.post<ApiEnvelope<string | number>>(BASE, payload)
  if (res.status !== 200) {
    const msg = res.data?.msg
    throw new Error(msg && msg.trim() ? msg.trim() : `保存失败（HTTP ${res.status}）`)
  }
  const body = res.data
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存失败')
  }
  return body.data ?? undefined
}

export async function deleteUnauthApi(id: string | number): Promise<void> {
  const res = await httpCommon.delete<ApiEnvelope<unknown>>(`${BASE}/${id}`)
  if (res.status !== 200) {
    const msg = res.data?.msg
    throw new Error(msg && typeof msg === 'string' && msg.trim() ? msg.trim() : `删除失败（HTTP ${res.status}）`)
  }
  const body = res.data
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '删除失败')
  }
}

export async function toggleUnauthApiValid(id: string | number): Promise<number> {
  const { data: body } = await httpCommon.post<ApiEnvelope<number>>(`${BASE}/${id}/toggle-valid`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '切换状态失败')
  }
  return body.data ?? 0
}
