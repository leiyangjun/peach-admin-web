/**
 * 权限相关 API：菜单按钮字典、菜单/角色绑定、菜单按钮已绑 API、网关直连拉取 admin API。
 * 服务发现列表见 {@link ./discovery.ts}（GET /discovery）。
 * 业务路径经 {@link ./httpCommon}（网关 `/peach-common-service/admin`）+ `/permission`。
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { ApiMetaDTO, ButtonDictVO, MenuButtonPickerRow } from '../models/permission'

export { fetchGatewayAdminApis } from './gateway'
import type { CurrentUserPermissionVO } from '../models/currentUserPermission'

const BASE = '/permission'

/** @deprecated 请使用 {@link ./button.ts fetchButtonAll} 或 {@link ./button.ts fetchButtonPage} */
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

/** @deprecated 请使用 POST /menu 并在请求体中携带 `menuButtons`（MenuInfoVO），与菜单同事务保存。 */
export async function replaceMenuButtons(menuId: string | number, dictButtonIds: string[]): Promise<void> {
  const { data: body } = await httpCommon.put<ApiEnvelope<unknown>>(`${BASE}/menu/${menuId}/buttons`, {
    dictButtonIds,
  })
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存菜单按钮失败')
  }
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

/** @deprecated 请使用 POST /menu 并在请求体中携带 `menuButtons`（MenuInfoVO），与菜单同事务保存。 */
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

/** @deprecated 请使用 {@link ../api/role.ts fetchCurrentUserMenuTree} 与 {@link ../api/role.ts fetchCurrentUserMenuButtons} */
export async function fetchCurrentUserPermission(): Promise<CurrentUserPermissionVO> {
  const { data: body } = await httpCommon.get<ApiEnvelope<CurrentUserPermissionVO>>(`${BASE}/current-user`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载当前用户权限失败')
  }
  return body.data
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
