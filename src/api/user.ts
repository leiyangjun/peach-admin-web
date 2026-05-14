/**
 * 用户管理 API（经网关访问 peach-common-service）。
 * 控制器基础路径：/user
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { ResetPwdDTO, UserMgmtVO, UserPageQuery } from '../models/userMgmt'

const BASE = '/user'

export interface PageInfoUser {
  list: UserMgmtVO[]
  total: number
  pageNum: number
  pageSize: number
  pages?: number
}

/** 分页查询全部用户（system + app），关键字匹配用户名/昵称/手机号 */
export async function fetchUserPage(query: UserPageQuery): Promise<PageInfoUser> {
  const { data: body } = await httpCommon.get<ApiEnvelope<PageInfoUser>>(`${BASE}/page`, {
    params: {
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      searchValue: query.searchValue?.trim() || undefined,
      userType: query.userType || undefined,
      valid: query.valid !== undefined && query.valid !== '' ? query.valid : undefined,
      sortName: query.sortName,
      sortType: query.sortType,
    },
  })
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '分页查询用户失败')
  }
  return body.data
}

export async function fetchUserById(id: string | number): Promise<UserMgmtVO> {
  const { data: body } = await httpCommon.get<ApiEnvelope<UserMgmtVO>>(`${BASE}/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '查询用户详情失败')
  }
  if (body.data == null) {
    throw new Error('未查询到该用户')
  }
  return body.data
}

/**
 * 保存用户：成功时响应 data 为主键 id（大整数可能为字符串）。
 * 成功码下若 data 缺失（如全局 Jackson non_null 省略 null），仍视为成功，由列表刷新兜底。
 */
export async function saveUser(payload: UserMgmtVO): Promise<string | number | undefined> {
  const res = await httpCommon.post<ApiEnvelope<string | number>>(BASE, payload)
  /** 非 2xx 已由 Axios 拦截器 reject；此处显式要求 HTTP 200，避免网关以 200 以外成功态收口时误关弹窗 */
  if (res.status !== 200) {
    const msg = res.data?.msg
    throw new Error(msg && msg.trim() ? msg.trim() : `保存用户失败（HTTP ${res.status}）`)
  }
  const body = res.data
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存用户失败')
  }
  return body.data ?? undefined
}

/** 切换用户有效状态：返回切换后的 valid（0 或 1） */
export async function toggleUserValid(id: string | number): Promise<number> {
  const { data: body } = await httpCommon.post<ApiEnvelope<number>>(`${BASE}/${id}/toggle-valid`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '切换用户状态失败')
  }
  return Number(body.data)
}

/** 仅系统用户可重置登录密码 */
export async function resetUserPassword(payload: ResetPwdDTO): Promise<void> {
  const { data: body } = await httpCommon.post<ApiEnvelope<unknown>>(`${BASE}/reset-password`, payload)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '重置密码失败')
  }
}

/** 仅系统用户（userType=system）可物理删除；应用用户由后端拒绝 */
export async function hardDeleteUser(id: string | number): Promise<void> {
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
