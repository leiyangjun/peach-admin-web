/**
 * 管理端 API 上下文路径，与 peach-common-start / peach.api.context 默认一致。
 * 浏览器经 Vite/Nginx 访问：`/api{prefix}/...`、`/api-common{prefix}/...`，
 * 代理改写后为 `/{serviceId}{prefix}/...`，网关 Strip 后下游收到 `{prefix}/...`。
 *
 * 构建或开发前可通过环境变量 VITE_ADMIN_API_PREFIX 覆盖（须与后端、网关、反向代理一致）。
 */
function normalizeAdminPathPrefix(raw: string | undefined): string {
  const s = (raw ?? '/admin').trim()
  const noTrail = s.replace(/\/+$/, '')
  const withLead = noTrail.startsWith('/') ? noTrail : `/${noTrail}`
  return withLead || '/admin'
}

export const ADMIN_API_PATH_PREFIX = normalizeAdminPathPrefix(
  import.meta.env.VITE_ADMIN_API_PREFIX as string | undefined,
)
