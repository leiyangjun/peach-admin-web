/**
 * 权限相关 API：菜单按钮字典、菜单/角色绑定、注册服务列表、菜单按钮已绑 API、网关直连拉取 admin API。
 * 业务路径前缀与 {@link ./httpCommon} 一致：/api-common + 管理上下文 + /permission。
 */

import httpCommon from './httpCommon'
import httpGatewayDynamic from './httpGatewayDynamic'
import { ADMIN_API_PATH_PREFIX } from '../config/adminApiPrefix'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { ApiMetaDTO, ButtonDictVO, MenuButtonPickerRow, RegistryServiceItem } from '../models/permission'

const BASE = '/permission'

export async function fetchButtonDict(): Promise<ButtonDictVO[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<ButtonDictVO[]>>(`${BASE}/button-dict`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载按钮字典失败')
  }
  return body.data
}

export async function fetchMenuButtonBindRows(menuId: string | number): Promise<MenuButtonPickerRow[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuButtonPickerRow[]>>(
    `${BASE}/menu/${menuId}/buttons`,
  )
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载菜单按钮失败')
  }
  return body.data
}

/** @deprecated 请使用 POST /menu 并在请求体中携带 `buttonBindings`，与菜单同事务保存。 */
export async function replaceMenuButtons(menuId: string | number, dictButtonIds: string[]): Promise<void> {
  const { data: body } = await httpCommon.put<ApiEnvelope<unknown>>(`${BASE}/menu/${menuId}/buttons`, {
    dictButtonIds,
  })
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存菜单按钮失败')
  }
}

export async function fetchRegistryServices(): Promise<RegistryServiceItem[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<RegistryServiceItem[]>>(`${BASE}/registry/services`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载服务列表失败')
  }
  return body.data
}

/** 某菜单按钮已绑定 API（与后端 ApiMeta 对齐），不依赖菜单主表提交。 */
export async function fetchMenuButtonApis(menuButtonId: string | number): Promise<ApiMetaDTO[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<ApiMetaDTO[]>>(
    `${BASE}/menu-button/${menuButtonId}/apis`,
  )
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载按钮已绑 API 失败')
  }
  return body.data
}

/**
 * 经开发代理直连网关拉取指定服务的管理端 API 目录（GET …/apis/type/admin）。
 */
export async function fetchGatewayAdminApis(
  serviceId: string,
  method?: string,
  keyword?: string,
): Promise<ApiMetaDTO[]> {
  const sid = serviceId.trim()
  const path = `/${encodeURIComponent(sid)}${ADMIN_API_PATH_PREFIX}/apis/type/admin`
  const mt = method?.trim()
  const kw = keyword?.trim()
  const params: Record<string, string> = {}
  if (mt) {
    params.method = mt
  }
  if (kw) {
    params.keyword = kw
  }
  const { data: body } = await httpGatewayDynamic.get<ApiEnvelope<ApiMetaDTO[]>>(path, {
    params,
  })
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '拉取 Admin API 失败')
  }
  return body.data
}

/** @deprecated 请使用 POST /menu 并在请求体中携带 `buttonBindings`，与菜单同事务保存。 */
export async function replaceMenuButtonApis(menuButtonId: string | number, apis: ApiMetaDTO[]): Promise<void> {
  const { data: body } = await httpCommon.put<ApiEnvelope<unknown>>(
    `${BASE}/menu-button/${menuButtonId}/apis`,
    { apis },
  )
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存按钮 API 失败')
  }
}

export async function fetchRoleMenuButtonIds(roleId: string | number): Promise<string[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<string[]>>(`${BASE}/role/${roleId}/menu-button-ids`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载角色按钮绑定失败')
  }
  return body.data.map((x) => String(x))
}

export async function replaceRoleMenuButtons(roleId: string | number, menuButtonIds: string[]): Promise<void> {
  const { data: body } = await httpCommon.put<ApiEnvelope<unknown>>(`${BASE}/role/${roleId}/menu-buttons`, {
    menuButtonIds,
  })
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存角色按钮失败')
  }
}

export async function fetchMenuButtonsRolePicker(): Promise<MenuButtonPickerRow[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<MenuButtonPickerRow[]>>(
    `${BASE}/menu-buttons/role-picker`,
  )
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载可选菜单按钮失败')
  }
  return body.data
}
