import { defineStore } from 'pinia'

/**
 * 应用 UI 状态仓库（Store）：侧边栏收缩与多页签状态。
 * 作者：leiyangjun
 */

export interface TabItem {
  path: string
  title: string
  closable: boolean
}

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: false,
    tabs: [{ path: '/dashboard', title: '首页', closable: false }] as TabItem[],
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    addTab(path: string, title: string) {
      if (!path || path === '/login') {
        return
      }
      const exists = this.tabs.some((tab) => tab.path === path)
      if (!exists) {
        this.tabs.push({ path, title: title || '未命名页面', closable: path !== '/dashboard' })
      }
    },
    removeTab(path: string) {
      this.tabs = this.tabs.filter((tab) => tab.path !== path || !tab.closable)
    },
  },
})
