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

/** 分页查询全部用户（system + app），关键字匹配登录名/昵称/手机号 */
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

/** 保存用户：响应 data 为主键 id（大整数可能为字符串） */
export async function saveUser(payload: UserMgmtVO): Promise<string | number> {
  const { data: body } = await httpCommon.post<ApiEnvelope<string | number>>(BASE, payload)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '保存用户失败')
  }
  return body.data
}

/** 切换用户有效状态：返回切换后的 valid（0 或 1） */
export async function toggleUserValid(id: string | number): Promise<number> {
  const { data: body } = await httpCommon.post<ApiEnvelope<number>>(`${BASE}/${id}/toggle-valid`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '切换用户状态失败')
  }
  return Number(body.data)
}

/** 仅系统用户可重置登录口令 */
export async function resetUserPassword(payload: ResetPwdDTO): Promise<void> {
  const { data: body } = await httpCommon.post<ApiEnvelope<unknown>>(`${BASE}/reset-password`, payload)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '重置密码失败')
  }
}
