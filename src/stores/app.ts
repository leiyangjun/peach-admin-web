import { defineStore } from 'pinia'

/**
 * 应用 UI 状态仓库（Store）：侧边栏收缩与多页签状态。
 * 作者：leiyangjun
 */

/** 侧边栏折叠状态 localStorage 键（刷新后保持） */
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'peach-admin-sidebar-collapsed'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function persistSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed))
  } catch {
    // 忽略存储不可用（隐私模式等）
  }
}

export interface TabItem {
  path: string
  title: string
  closable: boolean
  /** 路由 name，持久化与校验用（可选） */
  name?: string | null
}

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: readSidebarCollapsed(),
    tabs: [{ path: '/dashboard', title: '首页', closable: false, name: 'Dashboard' }] as TabItem[],
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
      persistSidebarCollapsed(this.sidebarCollapsed)
    },
    addTab(path: string, title: string, name?: string | null) {
      if (!path || path === '/login') {
        return
      }
      const isDash = path === '/dashboard' || path.startsWith('/dashboard?')
      const exists = this.tabs.some((tab) => tab.path === path)
      if (!exists) {
        this.tabs.push({
          path,
          title: title || '未命名页面',
          closable: !isDash,
          name: name ?? null,
        })
      }
    },
    removeTab(path: string) {
      this.tabs = this.tabs.filter((tab) => tab.path !== path || !tab.closable)
    },
    /** 用完整列表替换页签（用于从 sessionStorage 恢复） */
    setTabs(tabs: TabItem[]) {
      const fallback: TabItem = { path: '/dashboard', title: '首页', closable: false, name: 'Dashboard' }
      this.tabs = tabs.length ? tabs : [fallback]
    },
    /** 登出或切换账号时恢复为仅首页 */
    resetTabs() {
      this.tabs = [{ path: '/dashboard', title: '首页', closable: false, name: 'Dashboard' }]
    },
  },
})
