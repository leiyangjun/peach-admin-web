/**
 * 角色管理 API（经网关访问 peach-common-service）。
 * 控制器基础路径：/role
 */

import httpCommon from './httpCommon'
import { normalizeMenuTreeRoleRoots } from '../utils/roleMenuBindRules'
import { isPeachSuccess } from '../utils/apiResult'
import { normalizePageNum, normalizePageSize } from '../utils/pagination'
import type { ApiEnvelope } from '../models/auth'
import type { MenuTreeUserVO } from '../models/menuMgmt'
import type { MenuButtonRoleVO, MenuTreeRoleVO, RoleMgmtVO, RolePageQuery, RoleUserVO } from '../models/roleMgmt'
import type { UserMgmtVO } from '../models/userMgmt'

const BASE = '/role'

/**
 * 登录后一次性拉取菜单树与按钮权限（GET /admin/role/user/menus → MenuTreeUserVO[]）。
 * 经 {@link ./httpCommon} 访问 peach-common-service 管理端 /role。
 */
export async function fetchUserMenus(): Promise<MenuTreeUserVO[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuTreeUserVO[]>>(`${BASE}/user/menus`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '加载当前用户菜单权限失败')
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
  const pageNum = normalizePageNum(query.pageNum)
  const pageSize = normalizePageSize(query.pageSize)
  const { data: body } = await httpCommon.get<ApiEnvelope<PageInfoRole>>(`${BASE}/page`, {
    params: {
      pageNum,
      pageSize,
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

/** 角色绑定菜单：树形菜单 + 各菜单按钮及 permission 勾选态（GET /role/menus/{roleId}） */
export async function fetchRoleMenus(roleId: string | number): Promise<MenuTreeRoleVO[]> {
  const id = encodeURIComponent(String(roleId))
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuTreeRoleVO[]>>(`${BASE}/menus/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '加载角色菜单绑定数据失败')
  }
  return normalizeMenuTreeRoleRoots(body.data)
}

/**
 * 保存角色绑定菜单（POST /role/menus/{roleId}）。
 * 请求体为扁平 MenuButtonRoleVO[]：仅含 permission=true 的勾选行；
 * 空数组表示清空该角色全部菜单按钮权限（后端先删后插）。
 */
export async function saveRoleMenus(
  roleId: string | number,
  payload: MenuButtonRoleVO[],
): Promise<void> {
  const id = encodeURIComponent(String(roleId))
  const { data: body } = await httpCommon.post<ApiEnvelope<unknown>>(`${BASE}/menus/${id}`, payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存角色菜单绑定失败')
  }
}
