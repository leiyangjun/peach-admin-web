/**
 * 管理后台顶栏页签的 sessionStorage 持久化（刷新后恢复打开顺序）。
 */
import type { Router } from 'vue-router'
import type { TabItem } from '../stores/app'

/** 与需求约定一致：仅本会话内保留，关闭标签页即随 session 清理 */
export const ADMIN_OPEN_TABS_STORAGE_KEY = 'admin-open-tabs'

/** 写入存储的最小字段（含 name 便于后续与路由对齐） */
export interface PersistedOpenTab {
  path: string
  title: string
  name?: string | null
}

const DASHBOARD_TAB: TabItem = { path: '/dashboard', title: '首页', closable: false, name: 'Dashboard' }

function isDashboardPath(p: string): boolean {
  return p === '/dashboard' || p.startsWith('/dashboard?')
}

function isPersistedTab(v: unknown): v is PersistedOpenTab {
  if (!v || typeof v !== 'object') {
    return false
  }
  const o = v as Record<string, unknown>
  return typeof o.path === 'string' && o.path.length > 0 && typeof o.title === 'string'
}

/** 路由是否可匹配（菜单变更后无效 deep link 会被剔除） */
export function isTabPathResolvable(router: Router, path: string): boolean {
  if (!path || path === '/login') {
    return false
  }
  try {
    const r = router.resolve(path)
    return r.matched.length > 0
  } catch {
    return false
  }
}

export function loadPersistedOpenTabs(): PersistedOpenTab[] {
  try {
    const raw = sessionStorage.getItem(ADMIN_OPEN_TABS_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) {
      return []
    }
    return data.filter(isPersistedTab)
  } catch {
    return []
  }
}

export function savePersistedOpenTabs(tabs: TabItem[]): void {
  try {
    const payload: PersistedOpenTab[] = tabs.map((t) => ({
      path: t.path,
      title: t.title,
      name: t.name ?? null,
    }))
    sessionStorage.setItem(ADMIN_OPEN_TABS_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 存储失败时静默忽略，不影响正常使用
  }
}

export function clearPersistedOpenTabs(): void {
  try {
    sessionStorage.removeItem(ADMIN_OPEN_TABS_STORAGE_KEY)
  } catch {
    /* noop */
  }
}

/**
 * 将持久化记录还原为 TabItem：去重、校验路由、首页固定首位。
 */
export function persistedToTabItems(router: Router, items: PersistedOpenTab[]): TabItem[] {
  const seen = new Set<string>()
  const rest: TabItem[] = []

  for (const it of items) {
    const path = it.path.trim()
    if (!path || seen.has(path)) {
      continue
    }
    if (isDashboardPath(path)) {
      seen.add(path)
      continue
    }
    if (!isTabPathResolvable(router, path)) {
      continue
    }
    seen.add(path)
    rest.push({
      path,
      title: it.title || '未命名页面',
      closable: true,
      name: typeof it.name === 'string' && it.name ? it.name : null,
    })
  }

  return [{ ...DASHBOARD_TAB }, ...rest]
}
