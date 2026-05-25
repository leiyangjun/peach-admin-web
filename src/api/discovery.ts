/**
 * 服务发现 API：Nacos 注册中心可发现的服务列表。
 * 业务路径经 {@link ./httpCommon}（网关 `/peach-common-service/admin`）+ `/discovery`。
 */

import httpCommon from './httpCommon'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { ServiceVO } from '../models/discovery'

/** 拉取 Nacos 可发现服务列表（排除网关），供下拉选择微服务。 */
export async function fetchDiscoveryServices(): Promise<ServiceVO[]> {
  const { data: body } = await httpCommon.get<ApiEnvelope<ServiceVO[]>>('/discovery')
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载服务列表失败')
  }
  return body.data
}
