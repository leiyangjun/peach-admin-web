/**
 * 菜单管理 API（经网关访问 peach-common-service，浏览器前缀 /api-common + 管理上下文，默认 /admin）。
 * 相对路径基础段：/menu（树：/menu/tree 有效，/menu/tree/all 全部）；勿再拼一层 /admin，避免与 httpCommon.baseURL 重复。
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { MenuMgmtVO } from '../models/menuMgmt'

const BASE = '/menu'

/** 菜单管理左侧树：查询全部记录（含逻辑停用），用于区分显示/隐藏样式 */
export async function fetchMenuTreeAll(): Promise<MenuMgmtVO[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuMgmtVO[]>>(`${BASE}/tree/all`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载菜单树失败')
  }
  return body.data
}

/** 仅有效菜单树（如侧边栏动态路由等场景可选使用） */
export async function fetchMenuTreeValid(): Promise<MenuMgmtVO[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuMgmtVO[]>>(`${BASE}/tree`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载菜单树失败')
  }
  return body.data
}

export async function fetchMenuById(id: number | string): Promise<MenuMgmtVO> {
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuMgmtVO>>(`${BASE}/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '查询菜单详情失败')
  }
  if (body.data == null) {
    throw new Error('未查询到该菜单数据，请刷新菜单树后重试')
  }
  return body.data
}

export async function saveMenu(payload: MenuMgmtVO): Promise<MenuMgmtVO> {
  const { data: body } = await httpCommon.post<ApiEnvelope<MenuMgmtVO>>(BASE, payload)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '保存菜单失败')
  }
  return body.data
}

/** 物理删除菜单（无子节点时才允许删除） */
export async function deleteMenuPhysically(id: number | string): Promise<void> {
  const { data: body } = await httpCommon.delete<ApiEnvelope<unknown>>(`${BASE}/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '删除菜单失败')
  }
}
