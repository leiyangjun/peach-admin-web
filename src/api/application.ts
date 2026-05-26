/**
 * 应用管理 API（经网关访问 peach-common-service）。
 * 控制器基础路径：/application
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { ApplicationMgmtVO, ApplicationPageQuery } from '../models/applicationMgmt'

const BASE = '/application'

export interface PageInfoApplication {
  list: ApplicationMgmtVO[]
  total: number
  pageNum: number
  pageSize: number
  pages?: number
}

/** 分页查询；关键字对 app_name、app_code、app_desc OR 模糊匹配 */
export async function fetchApplicationPage(query: ApplicationPageQuery): Promise<PageInfoApplication> {
  const { data: body } = await httpCommon.get<ApiEnvelope<PageInfoApplication>>(`${BASE}/page`, {
    params: {
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      searchValue: query.searchValue?.trim() || undefined,
      appType: query.appType?.trim() || undefined,
      sortName: query.sortName,
      sortType: query.sortType,
    },
  })
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '分页查询应用失败')
  }
  return body.data
}

export async function fetchApplicationById(id: string | number): Promise<ApplicationMgmtVO> {
  const { data: body } = await httpCommon.get<ApiEnvelope<ApplicationMgmtVO>>(`${BASE}/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '查询应用详情失败')
  }
  if (body.data == null) {
    throw new Error('未查询到该应用')
  }
  return body.data
}

/** 保存：成功时 data 为主键 id */
export async function saveApplication(payload: ApplicationMgmtVO): Promise<string | number | undefined> {
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

/** 物理删除：DELETE /application/{id} */
export async function deleteApplication(id: string | number): Promise<void> {
  const res = await httpCommon.delete<ApiEnvelope<unknown>>(`${BASE}/${id}`)
  if (res.status !== 200) {
    const msg = res.data?.msg
    throw new Error(msg && typeof msg === 'string' && msg.trim() ? msg.trim() : `物理删除失败（HTTP ${res.status}）`)
  }
  const body = res.data
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '物理删除失败')
  }
}
