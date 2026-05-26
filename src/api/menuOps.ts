/**
 * 运维菜单 API（经 httpCommon → /admin/menu/ops）。
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { MenuOpsDetailVO, MenuOpsPatchVO, MenuOpsSaveVO, MenuOpsTreeNode } from '../models/menuOps'

const BASE = '/menu'

export async function fetchMenuTreeAllForOps(): Promise<MenuOpsTreeNode[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuOpsTreeNode[]>>(`${BASE}/tree/all`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载菜单树失败')
  }
  return body.data
}

export async function fetchMenuOpsDetail(id: number | string): Promise<MenuOpsDetailVO> {
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuOpsDetailVO>>(`${BASE}/ops/${id}`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载菜单详情失败')
  }
  return body.data
}

export async function createMenuOpsCatalog(payload: MenuOpsSaveVO): Promise<MenuOpsDetailVO> {
  const { data: body } = await httpCommon.post<ApiEnvelope<MenuOpsDetailVO>>(`${BASE}/ops`, payload)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '新建菜单失败')
  }
  return body.data
}

export async function patchMenuOps(id: number | string, payload: MenuOpsPatchVO): Promise<MenuOpsDetailVO> {
  const { data: body } = await httpCommon.patch<ApiEnvelope<MenuOpsDetailVO>>(`${BASE}/ops/${id}`, payload)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '保存菜单失败')
  }
  return body.data
}

/** 物理删除运维目录（仅 CATALOG、无子节点） */
export async function deleteMenuOps(id: number | string): Promise<void> {
  const { data: body } = await httpCommon.delete<ApiEnvelope<unknown>>(`${BASE}/ops/${id}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '删除目录失败')
  }
}
