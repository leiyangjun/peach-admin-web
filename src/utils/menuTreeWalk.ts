import type { MenuMgmtVO, UserMenuVO } from '../models/menuMgmt'

/** 在菜单树中按 id 查找节点 */
export function findMenuNodeById(
  nodes: MenuMgmtVO[] | undefined,
  id: string | number,
): MenuMgmtVO | null {
  if (!nodes?.length) {
    return null
  }
  const target = String(id)
  for (const n of nodes) {
    if (n.id != null && String(n.id) === target) {
      return n
    }
    const hit = findMenuNodeById(n.children ?? undefined, id)
    if (hit) {
      return hit
    }
  }
  return null
}

/** 在菜单树中按 id 查找菜单名称 */
export function findMenuNameById(nodes: MenuMgmtVO[] | undefined, id: string | number): string | null {
  return findMenuNodeById(nodes, id)?.menuName ?? null
}

/** Element Plus Tree 节点 drop 时的父级 id（prev/next 为同级父级，inner 为目标节点） */
export type TreeDropType = 'prev' | 'next' | 'inner' | 'before' | 'after'

export interface TreeDropNodeLike {
  level: number
  data: MenuMgmtVO
  parent?: TreeDropNodeLike | null
}

export function computeTreeDropParentId(dropNode: TreeDropNodeLike, dropType: TreeDropType | string): string | number {
  if (dropType === 'inner') {
    return dropNode.data.id ?? 0
  }
  const parent = dropNode.parent
  if (!parent || parent.level === 0) {
    return 0
  }
  return parent.data.id ?? 0
}

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
