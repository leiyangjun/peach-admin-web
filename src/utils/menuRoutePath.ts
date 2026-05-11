/**
 * 菜单管理「路由路径」字段约定：与数据库 cmn_menu.route_path 一致，由侧栏点击解析。
 * <ul>
 *   <li>普通站内：/system/menu</li>
 *   <li>右侧嵌入外页：frame://http://host/... 或 frame://host:port/...（无协议时补 http://）</li>
 *   <li>新窗口外站：openwindow://https://...</li>
 *   <li>新窗口站内：openwindow://system/menu 或 openwindow:///system/menu</li>
 * </ul>
 */

export type ParsedMenuRoutePath =
  | { kind: 'internal'; path: string }
  | { kind: 'iframe'; url: string; raw: string }
  | { kind: 'openExternal'; url: string; raw: string }
  | { kind: 'openInternal'; path: string; raw: string }

const PREFIX_FRAME = 'frame://'
const PREFIX_OPEN = 'openwindow://'

/** 将 host:port/path 补为 http://，已是 http(s):// 或 // 则原样使用 */
export function normalizeEmbedUrl(rest: string): string {
  const t = rest.trim()
  if (!t) {
    return ''
  }
  if (/^https?:\/\//i.test(t)) {
    return t
  }
  if (t.startsWith('//')) {
    return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${t}`
  }
  return `http://${t}`
}

/**
 * 解析菜单表 route_path 字符串；空串返回 null。
 */
export function parseMenuRoutePath(raw: string | null | undefined): ParsedMenuRoutePath | null {
  const s = (raw ?? '').trim()
  if (!s) {
    return null
  }
  const lower = s.toLowerCase()
  if (lower.startsWith(PREFIX_FRAME)) {
    const rest = s.slice(PREFIX_FRAME.length)
    const url = normalizeEmbedUrl(rest)
    return url ? { kind: 'iframe', url, raw: s } : null
  }
  if (lower.startsWith(PREFIX_OPEN)) {
    const rest = s.slice(PREFIX_OPEN.length).trim()
    if (/^https?:\/\//i.test(rest)) {
      return { kind: 'openExternal', url: rest, raw: s }
    }
    const path = rest.startsWith('/') ? rest : `/${rest.replace(/^\/+/, '')}`
    return path.length > 1 ? { kind: 'openInternal', path, raw: s } : null
  }
  const path = s.startsWith('/') ? s : `/${s.replace(/^\/+/, '')}`
  return { kind: 'internal', path }
}
