/**
 * 码表配置 API（经网关访问 peach-common-service）。
 * 控制器基础路径：/dict
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { DictMgmtVO, DictPageQuery } from '../models/dictMgmt'

const BASE = '/dict'

export interface PageInfoDict {
  list: DictMgmtVO[]
  total: number
  pageNum: number
  pageSize: number
  pages?: number
}

/** 分页查询码表；关键字对字典类型、标签、存储值 OR 模糊匹配 */
export async function fetchDictPage(query: DictPageQuery): Promise<PageInfoDict> {
  const { data: body } = await httpCommon.get<ApiEnvelope<PageInfoDict>>(`${BASE}/page`, {
    params: {
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      searchValue: query.searchValue?.trim() || undefined,
      listStatusFlag:
        query.listStatusFlag !== undefined && query.listStatusFlag !== ''
          ? query.listStatusFlag
          : undefined,
      sortName: query.sortName,
      sortType: query.sortType,
    },
  })
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '分页查询码表失败')
  }
  return body.data
}

/** 已存在的字典类型编码列表（去重），来自 GET /dict/types */
export async function fetchDictTypes(): Promise<string[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<string[]>>(`${BASE}/types`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载字典类型列表失败')
  }
  return body.data
}

export async function fetchDictById(id: string | number): Promise<DictMgmtVO> {
  const { data: body } = await httpCommon.get<ApiEnvelope<DictMgmtVO>>(`${BASE}/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '查询码表详情失败')
  }
  if (body.data == null) {
    throw new Error('未查询到该码表项')
  }
  return body.data
}

/** 保存：成功时 data 为主键 id */
export async function saveDict(payload: DictMgmtVO): Promise<string | number | undefined> {
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

export async function toggleDictStatus(id: string | number): Promise<number> {
  const { data: body } = await httpCommon.post<ApiEnvelope<number>>(`${BASE}/${id}/toggle-status`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '切换状态失败')
  }
  return Number(body.data)
}

export async function hardDeleteDict(id: string | number): Promise<void> {
  const res = await httpCommon.delete<ApiEnvelope<unknown>>(`${BASE}/${id}/hard`)
  if (res.status !== 200) {
    const msg = res.data?.msg
    throw new Error(msg && typeof msg === 'string' && msg.trim() ? msg.trim() : `物理删除失败（HTTP ${res.status}）`)
  }
  const body = res.data
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '物理删除失败')
  }
}
