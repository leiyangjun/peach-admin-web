/**
 * 根据菜单管理数据注册 Vue Router 子路由（仅站内 component 类菜单）。
 */
import type { Router, RouteRecordRaw } from 'vue-router'
import type { MenuMgmtVO } from '../models/menuMgmt'
import { parseMenuRoutePath } from '../utils/menuRoutePath'

const VIEW_GLOB = import.meta.glob('../views/**/*.vue')

/** 已注册的动态路由 name，供登出时 removeRoute */
const registeredRouteNames: string[] = []

/** 写死侧栏菜单是否已整包注册过（登出或清理由 {@link clearRegisteredMenuRoutes} 复位） */
let staticSidebarBundleRegistered = false

/**
 * 将写死菜单树注册为 AdminShell 子路由，全会话仅执行一次（避免重复 addRoute）。
 * @returns 本次是否新完成注册；为 true 时调用方应在导航守卫里 `next({ ...to, replace: true })`，
 * 否则首屏直达深链（如新窗口 `/system/menu`）在 addRoute 之后不会重新匹配，会出现白屏。
 */
export function registerStaticSidebarMenuBundleOnce(router: Router, tree: MenuMgmtVO[]): boolean {
  if (staticSidebarBundleRegistered) {
    return false
  }
  registerRoutesFromMenuTree(router, tree, 'AdminShell')
  staticSidebarBundleRegistered = true
  return true
}

/** 卸载动态子路由并允许下次再次注册写死侧栏包 */
export function clearRegisteredMenuRoutes(router: Router): void {
  unregisterDynamicMenuRoutes(router)
  staticSidebarBundleRegistered = false
}

/** 将菜单表 component_path 解析为 import.meta.glob 的 loader */
function resolveViewLoader(componentPath: string): (() => Promise<unknown>) | null {
  const p = componentPath.trim().replace(/\\/g, '/')
  if (!p) {
    return null
  }
  const candidates = [
    p.startsWith('views/') ? `../${p}` : `../views/${p.replace(/^\/+/, '')}`,
    `../views/${p.replace(/^views\//, '').replace(/^\/+/, '')}`,
  ]
  for (const k of candidates) {
    const mod = VIEW_GLOB[k]
    if (mod) {
      return mod as () => Promise<unknown>
    }
  }
  const tail = p.replace(/^views\//, '')
  const hit = Object.keys(VIEW_GLOB).find((key) => key.endsWith(`/${tail}`) || key.endsWith(`/${tail}.vue`))
  return hit ? (VIEW_GLOB[hit] as () => Promise<unknown>) : null
}

/** 已在 AdminShell 静态注册的子 path 前缀，避免 addRoute 冲突 */
function isReservedStaticPath(fullPath: string): boolean {
  const p = fullPath.replace(/^\/+/, '')
  return p === 'dashboard' || p.startsWith('frame/')
}

function collectMenuRoutes(nodes: MenuMgmtVO[] | null | undefined, out: MenuMgmtVO[]): void {
  if (!nodes?.length) {
    return
  }
  for (const n of nodes) {
    if (n.menuType === 'MENU' && (n.valid === undefined || n.valid === null || Number(n.valid) === 1)) {
      const rp = (n.routePath ?? '').trim()
      if (rp) {
        const parsed = parseMenuRoutePath(rp)
        if (parsed?.kind === 'internal' && (n.componentPath ?? '').trim() && !isReservedStaticPath(parsed.path)) {
          out.push(n)
        }
      }
    }
    if (n.children?.length) {
      collectMenuRoutes(n.children, out)
    }
  }
}

/** 子路径：/system/user → system/user */
function childPathFromFull(fullPath: string): string {
  return fullPath.replace(/^\/+/, '')
}

/**
 * 向主布局（name === parentName）注册动态子路由；同名 name 已存在则跳过。
 */
export function registerRoutesFromMenuTree(router: Router, tree: MenuMgmtVO[], parentName: string): void {
  const menus: MenuMgmtVO[] = []
  collectMenuRoutes(tree, menus)
  for (const m of menus) {
    const parsed = parseMenuRoutePath(m.routePath)
    if (!parsed || parsed.kind !== 'internal') {
      continue
    }
    const loader = resolveViewLoader(String(m.componentPath ?? ''))
    if (!loader) {
      continue
    }
    const routeName = `menu_${m.menuCode}`.replace(/[^\w]/g, '_')
    if (router.hasRoute(routeName)) {
      continue
    }
    const childPath = childPathFromFull(parsed.path)
    const record: RouteRecordRaw = {
      path: childPath,
      name: routeName,
      component: loader,
      meta: { title: m.menuName ?? '页面' },
    }
    router.addRoute(parentName, record)
    registeredRouteNames.push(routeName)
  }
}

/**
 * 仅按 name 列表 removeRoute（不碰 staticSidebarBundleRegistered）。
 * 一般请用 {@link clearRegisteredMenuRoutes}，以便写死侧栏可再次注册。
 */
export function unregisterDynamicMenuRoutes(router: Router): void {
  for (const n of registeredRouteNames) {
    if (router.hasRoute(n)) {
      router.removeRoute(n)
    }
  }
  registeredRouteNames.length = 0
}
