/**
 * 菜单管理 API（经网关访问 peach-common-service，baseURL 见 {@link ./httpCommon}）。
 * 相对路径基础段：/menu
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { MenuInfoVO, MenuMgmtVO } from '../models/menuMgmt'

const BASE = '/menu'

/** 菜单管理左侧树：全部记录（含逻辑停用） */
export async function fetchMenuTreeAll(): Promise<MenuMgmtVO[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuMgmtVO[]>>(`${BASE}/tree/all`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载菜单树失败')
  }
  return body.data
}

/** 菜单详情（含 menuButtons + buttonApis） */
export async function fetchMenuById(id: number | string): Promise<MenuInfoVO> {
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuInfoVO>>(`${BASE}/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '查询菜单详情失败')
  }
  if (body.data?.menu == null) {
    throw new Error('未查询到该菜单数据，请刷新菜单树后重试')
  }
  return body.data
}

/** 保存或更新菜单（MenuInfoVO；menuButtons 非 null 时全量覆盖按钮与 API） */
export async function saveMenu(payload: MenuInfoVO): Promise<MenuInfoVO> {
  const { data: body } = await httpCommon.post<ApiEnvelope<unknown>>(BASE, payload)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存菜单失败')
  }
  return payload
}

/** 物理删除菜单（无子节点时才允许删除） */
export async function deleteMenuPhysically(id: number | string): Promise<void> {
  const { data: body } = await httpCommon.delete<ApiEnvelope<unknown>>(`${BASE}/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '删除菜单失败')
  }
}
