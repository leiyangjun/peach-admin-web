import { ADMIN_API_PATH_PREFIX } from './adminApiPrefix'

/**
 * 网关 HTTP 根地址（与 peach-gateway server.port、vite GATEWAY_TARGET 一致）。
 */
/** 本地网关默认端口 */
export const DEFAULT_GATEWAY_ORIGIN = 'http://127.0.0.1:8090'

/** 经网关统一入口前缀（与 peach-gateway GatewayPublicPathConstants 一致） */
export const GATEWAY_PATH_PREFIX = '/peach-gateway'

/** Nacos 注册名 / 网关路由前缀（与 vite.config、网关 RewritePath 一致） */
export const PEACH_AUTH_SERVICE = 'peach-auth-service'
export const PEACH_COMMON_SERVICE = 'peach-common-service'
export const PEACH_JOB_SERVICE = 'peach-job-service'

/**
 * 解析网关 HTTP 根地址（不含尾斜杠）。
 * - 优先环境变量 `VITE_GATEWAY_ORIGIN`
 * - 开发未配置时默认 {@link DEFAULT_GATEWAY_ORIGIN}
 * - 生产未配置时返回空串，由 {@link buildGatewayServiceBaseUrl} 生成同源路径前缀（禁止误打 8082/8084）
 */
export function resolveGatewayOrigin(): string {
  const raw = (import.meta.env.VITE_GATEWAY_ORIGIN as string | undefined)?.trim()
  if (raw) {
    return raw.replace(/\/+$/, '')
  }
  if (import.meta.env.DEV) {
    return DEFAULT_GATEWAY_ORIGIN
  }
  return ''
}

/**
 * 动态 `/{serviceId}/admin/...` 请求的 Axios baseURL。
 * 开发为完整网关 origin；生产未配置时为 `/`（相对当前页 origin，由 Nginx 转发 `/peach-*`）。
 */
export function resolveGatewayDynamicBaseUrl(): string {
  const origin = resolveGatewayOrigin()
  return origin || '/'
}

/**
 * 构建经网关访问指定微服务的 Axios baseURL。
 * 例如 `http://127.0.0.1:8090/peach-common-service/admin`。
 */
export function buildGatewayServiceBaseUrl(serviceId: string): string {
  const sid = serviceId.trim()
  if (!sid) {
    throw new Error('serviceId 不能为空')
  }
  const servicePath = `${GATEWAY_PATH_PREFIX}/${sid}${ADMIN_API_PATH_PREFIX}`
  const origin = resolveGatewayOrigin()
  return origin ? `${origin}${servicePath}` : servicePath
}
