/**
 * 角色「绑定菜单」勾选规则：与同模块菜单配置（useMenuPermission）一致。
 * - 同一菜单下勾选任意非「查看」按钮时，自动勾选该菜单的「查看」实例。
 * - 勾选任意后代菜单下的任意按钮时，祖先目录（CATALOG）仅自动具备「查看」权限（目录无业务按钮行）。
 */

import type { MenuMgmtVO } from '../models/menuMgmt'
import type { MenuButtonPickerRow } from '../models/permission'

/** 与菜单配置、字典一致：查看按钮编码 */
export const ROLE_BIND_VIEW_BUTTON_CODE = 'BTN_VIEW'

export interface MenuBindTreeRow {
  id: string
  menuName: string
  menuType: string
  /** 该菜单行可勾选的 cmn_menu_button 实例（目录通常仅含「查看」） */
  buttons: MenuButtonPickerRow[]
  /** 无子节点时省略，避免树表出现无意义展开图标 */
  children?: MenuBindTreeRow[]
}

/** 按菜单 id 聚合可选按钮行 */
export function groupPickerRowsByMenuId(rows: MenuButtonPickerRow[]): Map<string, MenuButtonPickerRow[]> {
  const map = new Map<string, MenuButtonPickerRow[]>()
  for (const r of rows) {
    const mid = r.menuId != null ? String(r.menuId) : ''
    if (!mid) {
      continue
    }
    const arr = map.get(mid) ?? []
    arr.push(r)
    map.set(mid, arr)
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => {
      const an = (a.buttonName ?? a.buttonCode ?? '').localeCompare(b.buttonName ?? b.buttonCode ?? '', 'zh-CN')
      return an
    })
  }
  return map
}

function filterTreeNodes(
  nodes: MenuMgmtVO[] | null | undefined,
  byMenuId: Map<string, MenuButtonPickerRow[]>,
): MenuBindTreeRow[] {
  if (!nodes?.length) {
    return []
  }
  const out: MenuBindTreeRow[] = []
  for (const m of nodes) {
    if (m.valid != null && Number(m.valid) !== 1) {
      continue
    }
    const mt = (m.menuType ?? '').trim()
    if (mt === 'BUTTON') {
      continue
    }
    if (mt !== 'CATALOG' && mt !== 'MENU') {
      continue
    }
    const idStr = m.id != null ? String(m.id) : ''
    if (!idStr) {
      continue
    }
    const children = filterTreeNodes(m.children ?? null, byMenuId)
    const row: MenuBindTreeRow = {
      id: idStr,
      menuName: m.menuName ?? '',
      menuType: mt,
      buttons: byMenuId.get(idStr) ?? [],
    }
    if (children.length) {
      row.children = children
    }
    out.push(row)
  }
  return out
}

/** 由有效菜单树 + 角色选择器行构造树表数据 */
export function buildRoleMenuBindTree(menuRoots: MenuMgmtVO[], pickerRows: MenuButtonPickerRow[]): MenuBindTreeRow[] {
  const byMenuId = groupPickerRowsByMenuId(pickerRows)
  return filterTreeNodes(menuRoots, byMenuId)
}

function collectDescendantMenuIds(node: MenuBindTreeRow): string[] {
  const ids: string[] = []
  if (node.menuType === 'MENU') {
    ids.push(node.id)
  }
  for (const c of node.children ?? []) {
    ids.push(...collectDescendantMenuIds(c))
  }
  return ids
}

function findViewMenuButtonId(buttons: MenuButtonPickerRow[]): string | null {
  const hit = buttons.find((b) => (b.buttonCode ?? '').trim() === ROLE_BIND_VIEW_BUTTON_CODE)
  const mb = hit?.menuButtonId
  return mb != null && String(mb) !== '' ? String(mb) : null
}

/**
 * 根据当前勾选集合推导应存在的隐式勾选（同菜单查看、祖先目录查看）。
 * 同时做收敛：无后代勾选时移除目录查看。
 */
export function applyRoleMenuBindImplicitSelections(
  selected: Set<string>,
  treeRows: MenuBindTreeRow[],
): Set<string> {
  const next = new Set(selected)

  /** 菜单 id -> 可选按钮行 */
  const menuIdToButtons = new Map<string, MenuButtonPickerRow[]>()
  function walk(nodes: MenuBindTreeRow[]) {
    for (const n of nodes) {
      menuIdToButtons.set(n.id, n.buttons)
      if (n.children?.length) {
        walk(n.children)
      }
    }
  }
  walk(treeRows)

  /** 同一 MENU：有任意按钮勾选则强制含「查看」 */
  for (const [, buttons] of menuIdToButtons) {
    if (!buttons.length) {
      continue
    }
    const mid = String(buttons[0]!.menuId ?? '')
    if (!mid) {
      continue
    }
    const anyOn = buttons.some((b) => b.menuButtonId != null && next.has(String(b.menuButtonId)))
    if (anyOn) {
      const vid = findViewMenuButtonId(buttons)
      if (vid) {
        next.add(vid)
      }
    }
  }

  /** 目录：后代 MENU 存在任意勾选时，仅自动勾选该目录的「查看」实例 */
  function walkCatalog(nodes: MenuBindTreeRow[]) {
    for (const n of nodes) {
      if (n.children?.length) {
        walkCatalog(n.children)
      }
      if (n.menuType !== 'CATALOG') {
        continue
      }
      const descMenuIds = collectDescendantMenuIds(n)
      let anyDesc = false
      for (const mid of descMenuIds) {
        const bs = menuIdToButtons.get(mid) ?? []
        if (bs.some((b) => b.menuButtonId != null && next.has(String(b.menuButtonId)))) {
          anyDesc = true
          break
        }
      }
      const viewId = findViewMenuButtonId(n.buttons)
      if (anyDesc && viewId) {
        next.add(viewId)
      } else if (!anyDesc && viewId) {
        next.delete(viewId)
      }
    }
  }
  walkCatalog(treeRows)

  return next
}
