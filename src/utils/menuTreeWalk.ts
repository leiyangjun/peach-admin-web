import type { MenuMgmtVO } from '../models/menuMgmt'

/** 在菜单树中按 route_path 原文查找菜单名称（用于嵌入页签标题等） */
export function findMenuTitleByRoutePath(nodes: MenuMgmtVO[] | undefined, routePathRaw: string): string | null {
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
