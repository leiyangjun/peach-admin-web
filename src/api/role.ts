/**
 * 角色管理 API（经网关访问 peach-common-service）。
 * 控制器基础路径：/role
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { UserMenuVO } from '../models/menuMgmt'
import type { RoleMgmtVO, RolePageQuery, RoleUserVO } from '../models/roleMgmt'
import type { UserMgmtVO } from '../models/userMgmt'

const BASE = '/role'

/** 当前登录用户可见菜单树（GET /admin/role/user/menus） */
export async function fetchCurrentUserMenuTree(): Promise<UserMenuVO[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<UserMenuVO[]>>(`${BASE}/user/menus`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '加载当前用户菜单失败')
  }
  return body.data ?? []
}

/** 当前用户对指定菜单已授权按钮 CODE 列表（GET /admin/role/user/{menuId}/buttons） */
export async function fetchCurrentUserMenuButtons(menuId: string | number): Promise<string[]> {
  const id = encodeURIComponent(String(menuId))
  const { data: body } = await httpCommon.get<ApiEnvelope<string[]>>(`${BASE}/user/${id}/buttons`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '加载菜单按钮权限失败')
  }
  return body.data ?? []
}

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

/** 物理删除：DELETE /role/{id} */
export async function deleteRole(id: string | number): Promise<void> {
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

/** 当前角色已绑定用户列表（含姓名等展示字段） */
export async function fetchRoleUsers(roleId: string | number): Promise<UserMgmtVO[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<UserMgmtVO[]>>(`${BASE}/${roleId}/user`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '查询已绑定用户失败')
  }
  return body.data ?? []
}

/** 全量替换角色用户绑定；空数组表示清空 */
export async function replaceRoleUsers(roleId: string | number, users: RoleUserVO[]): Promise<void> {
  const { data: body } = await httpCommon.put<ApiEnvelope<unknown>>(`${BASE}/${roleId}/users`, users)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存用户绑定失败')
  }
}
