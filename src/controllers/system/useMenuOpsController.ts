/**
 * 运维菜单管理：新建仅 CATALOG；编辑可维护 CATALOG / MENU；新建目录由后端绑定 BTN_QUERY。
 */

import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { updateMenuParent } from '../../api/menu'
import {
  createMenuOpsCatalog,
  deleteMenuOps,
  fetchMenuOpsDetail,
  fetchMenuTreeAllForOps,
  patchMenuOps,
} from '../../api/menuOps'
import type { MenuMgmtVO } from '../../models/menuMgmt'
import type { MenuOpsDetailVO, MenuOpsPatchVO, MenuOpsSaveVO, MenuOpsTreeNode } from '../../models/menuOps'
import { isSessionExpiredError } from '../../utils/sessionExpired'
import {
  computeTreeDropParentId,
  findMenuNameById,
  findMenuNodeById,
  type TreeDropNodeLike,
  type TreeDropType,
} from '../../utils/menuTreeWalk'

export type MenuOpsPanelMode = 'idle' | 'create' | 'edit'

export type MenuOpsFormModel = {
  id?: string | number
  parentId: string | number
  menuCode?: string
  menuName: string
  menuType: string
  routePath?: string | null
  icon?: string | null
  orderNo?: number | null
  remark?: string | null
  valid?: number | null
}

const MENU_TYPE_CATALOG = 'CATALOG'
const MENU_TYPE_MENU = 'MENU'

function emptyForm(parentId: string | number = 0, menuType: string = MENU_TYPE_CATALOG): MenuOpsFormModel {
  return {
    parentId: parentId === '' ? 0 : parentId,
    menuName: '',
    menuType,
    icon: '',
    orderNo: 10,
    remark: '',
    valid: 1,
  }
}

function detailToForm(d: MenuOpsDetailVO): MenuOpsFormModel {
  return {
    id: d.id,
    parentId: d.parentId ?? 0,
    menuCode: d.menuCode,
    menuName: d.menuName ?? '',
    menuType: d.menuType ?? MENU_TYPE_CATALOG,
    routePath: d.routePath,
    icon: d.icon ?? '',
    orderNo: d.orderNo ?? 10,
    remark: d.remark ?? '',
    valid: d.valid ?? 1,
  }
}

function asMenuMgmtTree(nodes: MenuOpsTreeNode[]): MenuMgmtVO[] {
  return nodes as unknown as MenuMgmtVO[]
}

/** 收集节点自身及全部子孙 id（拖拽时禁止挂到子孙下） */
function collectSelfAndDescendantIds(nodes: MenuOpsTreeNode[], targetId: string): Set<string> {
  const blocked = new Set<string>()

  function collectSubtree(n: MenuOpsTreeNode) {
    if (n.id != null) {
      blocked.add(String(n.id))
    }
    n.children?.forEach(collectSubtree)
  }

  function walk(list: MenuOpsTreeNode[]): boolean {
    for (const n of list) {
      if (String(n.id ?? '') === targetId) {
        collectSubtree(n)
        return true
      }
      if (n.children?.length && walk(n.children)) {
        return true
      }
    }
    return false
  }

  walk(nodes)
  return blocked
}

function menuTypeLabel(type: string | undefined): string {
  if (type === MENU_TYPE_MENU) return '菜单'
  if (type === MENU_TYPE_CATALOG) return '目录'
  return type ?? ''
}

/** 树/表单标签主题色：目录与菜单区分 */
function menuTypeTagType(type: string | undefined): 'primary' | 'success' | 'info' {
  if (type === MENU_TYPE_MENU) return 'success'
  if (type === MENU_TYPE_CATALOG) return 'primary'
  return 'info'
}

function findMenuOpsNodeById(nodes: MenuOpsTreeNode[], id: string | number): MenuOpsTreeNode | null {
  const target = String(id)
  for (const n of nodes) {
    if (n.id != null && String(n.id) === target) {
      return n
    }
    if (n.children?.length) {
      const hit = findMenuOpsNodeById(n.children, id)
      if (hit) {
        return hit
      }
    }
  }
  return null
}

/** 树中第一个可点击节点（用于进入页默认选中） */
function findFirstMenuOpsNodeWithId(nodes: MenuOpsTreeNode[]): MenuOpsTreeNode | null {
  for (const n of nodes) {
    if (n.id != null) {
      return n
    }
    if (n.children?.length) {
      const hit = findFirstMenuOpsNodeWithId(n.children)
      if (hit) {
        return hit
      }
    }
  }
  return null
}

/** 新建成功后按上级与名称在树中定位节点（后端 Void 响应无 id） */
function findMenuOpsNodeByParentAndName(
  nodes: MenuOpsTreeNode[],
  parentId: string | number,
  menuName: string,
): MenuOpsTreeNode | null {
  const parentKey = String(parentId ?? 0)
  const nameKey = menuName.trim()
  for (const n of nodes) {
    if (
      n.id != null &&
      String(n.parentId ?? 0) === parentKey &&
      (n.menuName ?? '').trim() === nameKey
    ) {
      return n
    }
    if (n.children?.length) {
      const hit = findMenuOpsNodeByParentAndName(n.children, parentId, menuName)
      if (hit) {
        return hit
      }
    }
  }
  return null
}

export function useMenuOpsController() {
  const loading = ref(false)
  const treeData = ref<MenuOpsTreeNode[]>([])
  const selectedId = ref<string | null>(null)
  const panelMode = ref<MenuOpsPanelMode>('idle')
  const formModel = ref<MenuOpsFormModel>(emptyForm(0))
  const detail = ref<MenuOpsDetailVO | null>(null)

  /** 表单只读：上级菜单名称（层级由树拖拽调整） */
  const parentMenuLabel = computed(() => {
    const pid = formModel.value.parentId ?? 0
    if (Number(pid) === 0) {
      if (panelMode.value === 'create') {
        return '（一级目录）'
      }
      return formModel.value.menuType === MENU_TYPE_MENU ? '（一级菜单）' : '（一级目录）'
    }
    return findMenuNameById(asMenuMgmtTree(treeData.value), pid) ?? `ID: ${pid}`
  })

  function formatParentTargetLabel(parentId: string | number): string {
    if (Number(parentId) === 0) {
      return '一级（根）'
    }
    return findMenuNameById(asMenuMgmtTree(treeData.value), parentId) ?? `ID: ${parentId}`
  }

  function isBlockedDropParent(dragId: string, newParentId: string | number): boolean {
    if (String(newParentId) === dragId) {
      return true
    }
    if (Number(newParentId) === 0) {
      return false
    }
    const blocked = collectSelfAndDescendantIds(treeData.value, dragId)
    return blocked.has(String(newParentId))
  }

  function validateDropParentRule(
    dragData: MenuOpsTreeNode,
    newParentId: string | number,
    dropNode: TreeDropNodeLike,
    dropType: TreeDropType | string,
  ): boolean {
    const dragId = String(dragData.id ?? '')
    if (!dragId) {
      return false
    }
    if (isBlockedDropParent(dragId, newParentId)) {
      return false
    }

    const oldParentId = dragData.parentId ?? 0
    if (String(newParentId) === String(oldParentId)) {
      return false
    }

    const mgmtTree = asMenuMgmtTree(treeData.value)

    if (dragData.menuType === MENU_TYPE_MENU) {
      if (Number(newParentId) === 0) {
        return true
      }
      const parentNode = findMenuNodeById(mgmtTree, newParentId)
      if (!parentNode || parentNode.menuType !== MENU_TYPE_CATALOG) {
        return false
      }
      if (dropType === 'inner' && dropNode.data.menuType !== MENU_TYPE_CATALOG) {
        return false
      }
      return true
    }

    if (dragData.menuType === MENU_TYPE_CATALOG) {
      if (Number(newParentId) === 0) {
        return true
      }
      const parentNode = findMenuNodeById(mgmtTree, newParentId)
      return parentNode?.menuType === MENU_TYPE_CATALOG
    }

    return false
  }

  const allowTreeDrag = (node: TreeDropNodeLike): boolean => node.data.id != null

  const allowTreeDrop = (
    draggingNode: TreeDropNodeLike,
    dropNode: TreeDropNodeLike,
    dropType: TreeDropType | string,
  ): boolean => {
    const dragData = draggingNode.data as MenuOpsTreeNode
    if (dragData.id == null) {
      return false
    }
    const newParentId = computeTreeDropParentId(dropNode, dropType)
    return validateDropParentRule(dragData, newParentId, dropNode, dropType)
  }

  const persistMenuParentChange = async (dragData: MenuOpsTreeNode, newParentId: string | number) => {
    const menuId = String(dragData.id)
    treeData.value = (await updateMenuParent(menuId, newParentId)) as unknown as MenuOpsTreeNode[]
    ElMessage.success('操作成功')
    if (selectedId.value === menuId) {
      await loadDetail(menuId)
    }
  }

  const onTreeNodeDrop = async (
    draggingNode: TreeDropNodeLike,
    dropNode: TreeDropNodeLike,
    dropType: TreeDropType | string,
  ) => {
    const dragData = draggingNode.data as MenuOpsTreeNode
    if (dragData.id == null) {
      await loadTree()
      return
    }

    const newParentId = computeTreeDropParentId(dropNode, dropType)
    const oldParentId = dragData.parentId ?? 0
    if (String(newParentId) === String(oldParentId)) {
      await loadTree()
      return
    }

    if (!validateDropParentRule(dragData, newParentId, dropNode, dropType)) {
      await loadTree()
      return
    }

    const dragLabel = dragData.menuName?.trim() || '该菜单'
    const targetLabel = formatParentTargetLabel(newParentId)

    try {
      await ElMessageBox.confirm(`将「${dragLabel}」移动到「${targetLabel}」下？`, '调整上级', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      })
    } catch {
      await loadTree()
      return
    }

    loading.value = true
    try {
      await persistMenuParentChange(dragData, newParentId)
    } catch (e) {
      await loadTree()
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '调整上级失败')
      }
    } finally {
      loading.value = false
    }
  }

  const loadTree = async () => {
    loading.value = true
    try {
      treeData.value = await fetchMenuTreeAllForOps()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载菜单树失败')
      }
    } finally {
      loading.value = false
    }
  }

  /** 进入页且无选中项时，默认选中树中第一个节点 */
  const selectFirstMenuIfNeeded = async () => {
    if (selectedId.value != null || panelMode.value !== 'idle' || !treeData.value.length) {
      return
    }
    const first = findFirstMenuOpsNodeWithId(treeData.value)
    if (first?.id == null) {
      return
    }
    selectedId.value = String(first.id)
    await loadDetail(String(first.id))
  }

  const loadDetail = async (id: string) => {
    loading.value = true
    try {
      detail.value = await fetchMenuOpsDetail(id)
      formModel.value = detailToForm(detail.value)
      panelMode.value = 'edit'
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载详情失败')
      }
      detail.value = null
    } finally {
      loading.value = false
    }
  }

  const onTreeNodeClick = async (data: MenuOpsTreeNode) => {
    if (data.id == null) {
      selectedId.value = null
      panelMode.value = 'idle'
      detail.value = null
      return
    }
    selectedId.value = String(data.id)
    await loadDetail(String(data.id))
  }

  const openCreateMenu = (parentId?: string | number | null) => {
    panelMode.value = 'create'
    detail.value = null
    const p = parentId === undefined || parentId === null || parentId === '' ? 0 : parentId
    formModel.value = emptyForm(p, MENU_TYPE_CATALOG)
  }

  const cancelPanel = async () => {
    if (panelMode.value === 'create' && selectedId.value) {
      await loadDetail(selectedId.value)
      return
    }
    if (panelMode.value === 'edit' && selectedId.value) {
      await loadDetail(selectedId.value)
      return
    }
    panelMode.value = 'idle'
    detail.value = null
    formModel.value = emptyForm(0)
  }

  const validateBeforeSubmit = (): boolean => {
    const m = formModel.value
    if (!m.menuName?.trim()) {
      ElMessage.warning('请填写菜单名称')
      return false
    }
    return true
  }

  const submitForm = async () => {
    if (!validateBeforeSubmit()) {
      return
    }
    const m = formModel.value
    loading.value = true
    try {
      if (panelMode.value === 'create') {
        const payload: MenuOpsSaveVO = {
          parentId: m.parentId ?? 0,
          menuName: m.menuName.trim(),
          menuType: MENU_TYPE_CATALOG,
          orderNo: m.orderNo,
          icon: m.icon || null,
          valid: m.valid,
          remark: m.remark || null,
        }
        const created = await createMenuOpsCatalog(payload)
        ElMessage.success('新建成功')
        await loadTree()
        const newId =
          created?.id ??
          findMenuOpsNodeByParentAndName(treeData.value, payload.parentId, payload.menuName)?.id
        if (newId != null) {
          selectedId.value = String(newId)
          await loadDetail(String(newId))
        } else {
          panelMode.value = 'idle'
          detail.value = null
          formModel.value = emptyForm(0)
        }
      } else if (panelMode.value === 'edit' && m.id != null) {
        const patch: MenuOpsPatchVO = {
          menuName: m.menuName.trim(),
          orderNo: m.orderNo,
          icon: m.icon || null,
          valid: m.valid,
          remark: m.remark ?? null,
        }
        const updated = await patchMenuOps(m.id, patch)
        ElMessage.success('保存成功')
        detail.value = updated
        formModel.value = detailToForm(updated)
        await loadTree()
      }
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '保存失败')
      }
    } finally {
      loading.value = false
    }
  }

  const showEditor = computed(
    () => panelMode.value === 'create' || (panelMode.value === 'edit' && detail.value != null),
  )

  const isCatalogNode = (data: MenuOpsTreeNode) => data.menuType === MENU_TYPE_CATALOG

  const isCatalogForm = computed(() => formModel.value.menuType === MENU_TYPE_CATALOG)

  /** 当前选中目录在树中是否存在子节点 */
  const selectedCatalogHasChildren = computed(() => {
    const id = formModel.value.id
    if (id == null) {
      return false
    }
    const node = findMenuOpsNodeById(treeData.value, id)
    return Boolean(node?.children?.length)
  })

  /** 是否展示删除：仅目录、无子节点 */
  const canDeleteCatalog = computed(
    () =>
      panelMode.value === 'edit' &&
      formModel.value.id != null &&
      isCatalogForm.value &&
      !selectedCatalogHasChildren.value,
  )

  /** 删除当前目录（仅 CATALOG、无子节点；MENU 不可删） */
  const onDelete = async () => {
    const id = formModel.value.id
    if (id == null || formModel.value.menuType !== MENU_TYPE_CATALOG) {
      return
    }
    try {
      await ElMessageBox.confirm('确认删除该目录？须先删除或移走其下子项。', '删除', {
        type: 'warning',
      })
    } catch {
      return
    }
    loading.value = true
    try {
      await deleteMenuOps(id)
      ElMessage.success('删除成功')
      selectedId.value = null
      panelMode.value = 'idle'
      detail.value = null
      formModel.value = emptyForm(0)
      await loadTree()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '删除失败')
      }
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void (async () => {
      await loadTree()
      await selectFirstMenuIfNeeded()
    })()
  })

  return {
    loading,
    treeData,
    parentMenuLabel,
    selectedId,
    panelMode,
    formModel,
    detail,
    showEditor,
    menuTypeLabel,
    menuTypeTagType,
    isCatalogNode,
    isCatalogForm,
    canDeleteCatalog,
    onTreeNodeClick,
    allowTreeDrag,
    allowTreeDrop,
    onTreeNodeDrop,
    openCreateMenu,
    cancelPanel,
    submitForm,
    onDelete,
    loadTree,
  }
}
