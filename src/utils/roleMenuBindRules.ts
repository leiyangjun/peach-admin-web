/**
 * 角色「绑定菜单」勾选规则：与同模块菜单配置（useMenuPermission）一致。
 * - 勾选键为 menuId + 字典按钮 id（与 GET /role/menus 的 buttonRoleVOs 对齐），禁止仅用 buttonCode/字典 id 全局联动。
 * - 同一菜单下勾选任意按钮时，自动勾选该菜单的「查询（BTN_QUERY）」；用户可单独取消查询（无其它按钮勾选时）。
 * - 后代菜单/目录存在任意勾选时，向上递归自动勾选各祖先的「查询」；无后代勾选时移除祖先上仅由规则带入的查询。
 */

import type { MenuButtonPickerRow } from '../models/permission'
import type { MenuButtonRoleVO, MenuTreeRoleVO } from '../models/roleMgmt'

/** 与菜单配置、字典一致：查看按钮编码 */
export const ROLE_BIND_VIEW_BUTTON_CODE = 'BTN_QUERY'

/**
 * 角色绑定菜单弹窗内唯一勾选键（与后端 RoleServiceImpl 中 menuId:buttonId 一致）。
 * buttonId 为 cmn_button.id（字典），非 cmn_menu_button.id。
 */
export function roleMenuBindSelectionKey(
  menuId: string | number | null | undefined,
  buttonId: string | number | null | undefined,
): string | null {
  if (menuId == null || buttonId == null) {
    return null
  }
  const mid = String(menuId).trim()
  const bid = String(buttonId).trim()
  if (!mid || !bid) {
    return null
  }
  return `${mid}:${bid}`
}

export interface MenuBindTreeRow {
  id: string
  menuName: string
  menuType: string
  /** 该菜单行可勾选的 cmn_menu_button 实例（目录通常仅含「查看」） */
  buttons: MenuButtonPickerRow[]
  /** 无子节点时省略，避免树表出现无意义展开图标 */
  children?: MenuBindTreeRow[]
}

/** MenuButtonRoleVO → 树表按钮行（menuButtonId 为 roleMenuBindSelectionKey，供勾选态使用） */
export function roleButtonVoToPickerRow(br: MenuButtonRoleVO): MenuButtonPickerRow {
  const menuId = br.menuId != null ? String(br.menuId) : undefined
  const dictButtonId = br.buttonId != null ? String(br.buttonId) : undefined
  return {
    menuButtonId: roleMenuBindSelectionKey(menuId, dictButtonId) ?? undefined,
    dictButtonId,
    menuId,
    buttonCode: br.buttonCode,
    buttonName: br.buttonName,
  }
}

function filterRoleMenuTreeNodes(nodes: MenuTreeRoleVO[] | null | undefined): MenuBindTreeRow[] {
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
    const buttons = (m.buttonRoleVOs ?? []).map(roleButtonVoToPickerRow)
    const children = filterRoleMenuTreeNodes(m.children ?? null)
    const row: MenuBindTreeRow = {
      id: idStr,
      menuName: m.menuName ?? '',
      menuType: mt,
      buttons,
    }
    if (children.length) {
      row.children = children
    }
    out.push(row)
  }
  return out
}

/** 由 GET /role/menus/{roleId} 返回的树构造绑定菜单树表 */
export function buildRoleMenuBindTreeFromRoleMenus(roots: MenuTreeRoleVO[]): MenuBindTreeRow[] {
  return filterRoleMenuTreeNodes(normalizeMenuTreeRoleRoots(roots))
}

/** 规范为根节点数组，与后端 List<MenuTreeRoleVO> / GET data 一致 */
export function normalizeMenuTreeRoleRoots(
  roots: MenuTreeRoleVO[] | MenuTreeRoleVO | null | undefined,
): MenuTreeRoleVO[] {
  if (roots == null) {
    return []
  }
  return Array.isArray(roots) ? roots : [roots]
}

/**
 * 由弹窗勾选态组装 POST /role/menus/{roleId} 扁平请求体。
 * 与后端 saveRoleMenuButton 对齐：仅提交 permission=true 的按钮行；未勾选不提交。
 * 空勾选时提交 []，后端会清空该角色全部菜单按钮权限。
 */
export function buildRoleMenuTreeSavePayload(
  roots: MenuTreeRoleVO[],
  selectedButtonIds: Set<string>,
  roleId: string | number,
): MenuButtonRoleVO[] {
  const flat: MenuButtonRoleVO[] = []
  function walk(nodes: MenuTreeRoleVO[]) {
    for (const n of nodes) {
      for (const br of n.buttonRoleVOs ?? []) {
        const key = roleMenuBindSelectionKey(br.menuId, br.buttonId)
        if (key == null || !selectedButtonIds.has(key)) {
          continue
        }
        flat.push({
          roleId,
          menuId: br.menuId,
          buttonId: br.buttonId,
          buttonCode: br.buttonCode,
          permission: true,
        })
      }
      if (n.children?.length) {
        walk(n.children)
      }
    }
  }
  walk(normalizeMenuTreeRoleRoots(roots))
  return flat
}

/** 从接口树中收集 permission=true 的菜单按钮实例 id */
export function collectGrantedMenuButtonIdsFromRoleMenuTree(roots: MenuTreeRoleVO[]): string[] {
  const ids: string[] = []
  function walk(nodes: MenuTreeRoleVO[]) {
    for (const n of nodes) {
      for (const br of n.buttonRoleVOs ?? []) {
        if (!br.permission) {
          continue
        }
        const key = roleMenuBindSelectionKey(br.menuId, br.buttonId)
        if (key) {
          ids.push(key)
        }
      }
      if (n.children?.length) {
        walk(n.children)
      }
    }
  }
  walk(roots)
  return ids
}

function findViewMenuButtonId(buttons: MenuButtonPickerRow[]): string | null {
  const hit = buttons.find((b) => (b.buttonCode ?? '').trim() === ROLE_BIND_VIEW_BUTTON_CODE)
  const mb = hit?.menuButtonId
  return mb != null && String(mb) !== '' ? String(mb) : null
}

/** 当前节点子树内是否存在任意已勾选按钮（含本节点） */
function hasAnySelectionInSubtree(
  node: MenuBindTreeRow,
  selected: Set<string>,
  menuIdToButtons: Map<string, MenuButtonPickerRow[]>,
): boolean {
  const buttons = menuIdToButtons.get(node.id) ?? []
  if (buttons.some((b) => b.menuButtonId != null && selected.has(String(b.menuButtonId)))) {
    return true
  }
  for (const c of node.children ?? []) {
    if (hasAnySelectionInSubtree(c, selected, menuIdToButtons)) {
      return true
    }
  }
  return false
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

  /** 目录/菜单：子树存在勾选则自动带上本节点「查询」；子树全空则取消（与菜单配置「有子才需父查询」一致） */
  function applySubtreeViewRules(nodes: MenuBindTreeRow[]) {
    for (const n of nodes) {
      if (n.children?.length) {
        applySubtreeViewRules(n.children)
      }
      if (n.menuType !== 'CATALOG' && n.menuType !== 'MENU') {
        continue
      }
      const anyInTree = hasAnySelectionInSubtree(n, next, menuIdToButtons)
      const viewId = findViewMenuButtonId(n.buttons)
      if (anyInTree && viewId) {
        next.add(viewId)
      } else if (!anyInTree && viewId) {
        next.delete(viewId)
      }
    }
  }
  applySubtreeViewRules(treeRows)

  return next
}
