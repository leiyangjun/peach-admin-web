/**
 * 码表配置 API（经网关访问 peach-common-service）。
 * 控制器基础路径：/dict
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import { normalizePageNum, normalizePageSize } from '../utils/pagination'
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
  const pageNum = normalizePageNum(query.pageNum)
  const pageSize = normalizePageSize(query.pageSize)
  const { data: body } = await httpCommon.get<ApiEnvelope<PageInfoDict>>(`${BASE}/page`, {
    params: {
      pageNum,
      pageSize,
      searchValue: query.searchValue?.trim() || undefined,
      status:
        query.status !== undefined && query.status !== ''
          ? query.status
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

/**
 * 按字典类型获取有效（启用）码表项，供下拉与 label 展示。
 * GET /dict/valid/{dictType}
 */
export async function fetchValidDictByType(dictType: string): Promise<DictMgmtVO[]> {
  const type = dictType?.trim()
  if (!type) {
    throw new Error('字典类型不能为空')
  }
  const { data: body } = await httpCommon.get<ApiEnvelope<DictMgmtVO[]>>(
    `${BASE}/valid/${encodeURIComponent(type)}`,
  )
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载有效码表项失败')
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

/** 切换启用状态；后端返回 ApiResult<Void>（data 恒为 null），仅校验 code */
export async function toggleDictStatus(id: string | number): Promise<void> {
  const { data: body } = await httpCommon.post<ApiEnvelope<unknown>>(`${BASE}/${id}/toggle-status`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '切换状态失败')
  }
}

/** 物理删除：DELETE /dict/{id} */
export async function deleteDict(id: string | number): Promise<void> {
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
