import type { Router, RouteLocationRaw } from 'vue-router'

/**
 * 新窗口打开站外 URL（附带 noopener/noreferrer，降低 window.opener 风险）。
 */
export function openExternalPage(url: string): void {
  const u = url.trim()
  if (!u) {
    return
  }
  window.open(u, '_blank', 'noopener,noreferrer')
}

/**
 * 新窗口打开本站路由（尊重 Vue Router 的 base 与 resolve 结果）。
 */
export function openInternalRouteInNewWindow(router: Router, to: RouteLocationRaw): void {
  const href = router.resolve(to).href
  window.open(href, '_blank', 'noopener,noreferrer')
}
