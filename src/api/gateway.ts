/**
 * 经 peach-gateway 访问各微服务：URL 形如 `/{serviceId}{ADMIN}/...`。
 * 禁止对 common-service 直连 8082 且携带 serviceId 前缀（下游只认 `{ADMIN}/...`）。
 */
import httpGatewayDynamic from './httpGatewayDynamic'
import { ADMIN_API_PATH_PREFIX } from '../config/adminApiPrefix'
import {
  DEFAULT_GATEWAY_ORIGIN,
  resolveGatewayDynamicBaseUrl,
  resolveGatewayOrigin,
} from '../config/gatewayOrigin'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { ApiMetaDTO } from '../models/permission'

export { DEFAULT_GATEWAY_ORIGIN, resolveGatewayDynamicBaseUrl, resolveGatewayOrigin }

/**
 * 构建经网关转发的服务路径（不含 origin），例如
 * `/peach-common-service/admin/apis/type/admin`。
 */
export function buildGatewayServicePath(serviceId: string, suffix: string): string {
  const sid = serviceId.trim()
  if (!sid) {
    throw new Error('serviceId 不能为空')
  }
  const tail = suffix.startsWith('/') ? suffix : `/${suffix}`
  return `/${encodeURIComponent(sid)}${ADMIN_API_PATH_PREFIX}${tail}`
}

/**
 * 拉取指定服务管理端 API 目录（GET …/apis/type/admin）。
 */
export async function fetchGatewayAdminApis(
  serviceId: string,
  method?: string,
  keyword?: string,
): Promise<ApiMetaDTO[]> {
  const path = buildGatewayServicePath(serviceId, '/apis/type/admin')
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
