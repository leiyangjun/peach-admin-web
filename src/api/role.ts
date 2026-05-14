/**
 * 角色管理 API（经网关访问 peach-common-service）。
 * 控制器基础路径：/role
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { BindRoleUsersDTO, RoleMgmtVO, RolePageQuery } from '../models/roleMgmt'

const BASE = '/role'

export interface PageInfoRole {
  list: RoleMgmtVO[]
  total: number
  pageNum: number
  pageSize: number
  pages?: number
}

/** 分页查询角色；关键字匹配角色编码、名称 */
export async function fetchRolePage(query: RolePageQuery): Promise<PageInfoRole> {
  const { data: body } = await httpCommon.get<ApiEnvelope<PageInfoRole>>(`${BASE}/page`, {
    params: {
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      searchValue: query.searchValue?.trim() || undefined,
      sortName: query.sortName,
      sortType: query.sortType,
    },
  })
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '分页查询角色失败')
  }
  return body.data
}

export async function fetchRoleById(id: string | number): Promise<RoleMgmtVO> {
  const { data: body } = await httpCommon.get<ApiEnvelope<RoleMgmtVO>>(`${BASE}/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '查询角色失败')
  }
  if (body.data == null) {
    throw new Error('未查询到该角色')
  }
  return body.data
}

/** 保存角色：成功时 data 为主键 id */
export async function saveRole(payload: RoleMgmtVO): Promise<string | number | undefined> {
  const res = await httpCommon.post<ApiEnvelope<string | number>>(BASE, payload)
  if (res.status !== 200) {
    const msg = res.data?.msg
    throw new Error(msg && msg.trim() ? msg.trim() : `保存角色失败（HTTP ${res.status}）`)
  }
  const body = res.data
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存角色失败')
  }
  return body.data ?? undefined
}

export async function hardDeleteRole(id: string | number): Promise<void> {
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

/** 当前角色绑定的用户主键列表 */
export async function fetchRoleUserIds(roleId: string | number): Promise<(string | number)[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<(string | number)[]>>(`${BASE}/${roleId}/user-ids`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '查询已绑定用户失败')
  }
  return body.data ?? []
}

/** 全量替换角色用户绑定 */
export async function replaceRoleUsers(roleId: string | number, payload: BindRoleUsersDTO): Promise<void> {
  const { data: body } = await httpCommon.put<ApiEnvelope<unknown>>(`${BASE}/${roleId}/users`, payload)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存用户绑定失败')
  }
}
