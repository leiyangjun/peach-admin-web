import type { UserMenuVO } from '../models/menuMgmt'

/** 在菜单树中按 route_path 原文查找 MENU 节点（用于按钮权限拉取等） */
export function findMenuNodeByRoutePath(
  nodes: UserMenuVO[] | undefined,
  routePathRaw: string,
): UserMenuVO | null {
  if (!nodes?.length) {
    return null
  }
  const target = routePathRaw.trim()
  for (const n of nodes) {
    if (n.menuType === 'MENU' && (n.routePath ?? '').trim() === target) {
      return n
    }
    const hit = findMenuNodeByRoutePath(n.children ?? undefined, routePathRaw)
    if (hit) {
      return hit
    }
  }
  return null
}

/** 在菜单树中按 route_path 原文查找菜单名称（用于嵌入页签标题等） */
export function findMenuTitleByRoutePath(nodes: UserMenuVO[] | undefined, routePathRaw: string): string | null {
  if (!nodes?.length) {
    return null
  }
  const target = routePathRaw.trim()
  for (const n of nodes) {
    if ((n.routePath ?? '').trim() === target && n.menuName) {
      return n.menuName
    }
    const hit = findMenuTitleByRoutePath(n.children ?? undefined, routePathRaw)
    if (hit) {
      return hit
    }
  }
  return null
}
