/**
 * 按当前路由校验菜单按钮权限。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { CmnButtonCode } from '../constants/cmnButton'
import { usePermissionStore } from '../stores/permission'

export function useButtonPermission(explicitRoutePath?: string) {
  const route = useRoute()
  const permissionStore = usePermissionStore()

  const routePath = computed(() => {
    const raw = explicitRoutePath ?? route.path
    const t = raw.trim()
    if (!t) {
      return ''
    }
    return t.startsWith('/') ? t : `/${t}`
  })

  const menuCode = computed(() => {
    const mc = route.meta.menuCode
    return typeof mc === 'string' ? mc.trim() : ''
  })

  function hasButton(code: CmnButtonCode | string): boolean {
    return permissionStore.hasButton(code, routePath.value, menuCode.value || undefined)
  }

  return {
    hasButton,
    permissionLoaded: computed(() => permissionStore.loaded),
  }
}
