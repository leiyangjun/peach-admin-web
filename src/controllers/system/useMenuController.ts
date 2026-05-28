/**
 * 菜单管理：树加载、右侧主从表单编辑；新增无弹窗；逻辑停用通过表单「显示」开关提交。
 */

import { computed, onMounted, ref } from 'vue'

import { ElMessage, ElMessageBox } from 'element-plus'

import type { MenuButtonInfoItem, MenuInfoVO, MenuMgmtVO } from '../../models/menuMgmt'

import {
  deleteMenuPhysically,
  fetchMenuById,
  fetchMenuTreeAll,
  saveMenu,
  updateMenuParent,
} from '../../api/menu'

import { isSessionExpiredError } from '../../utils/sessionExpired'

import {
  computeTreeDropParentId,
  findMenuNameById,
  findMenuNodeById,
  type TreeDropNodeLike,
  type TreeDropType,
} from '../../utils/menuTreeWalk'

const MENU_TYPE_CATALOG = 'CATALOG'
const MENU_TYPE_MENU = 'MENU'

/** 右侧面板模式 */
export type MenuPanelMode = 'idle' | 'create' | 'edit'

function emptyForm(parentId: string | number | null | undefined): MenuMgmtVO {
  return {
    menuCode: '',
    menuName: '',
    menuType: 'MENU',
    parentId: parentId === undefined || parentId === null ? 0 : parentId,
    routePath: '',
    icon: '',
    orderNo: 10,
    remark: '',
    valid: 1,
  }
}

function cloneFormFromMenu(d: MenuMgmtVO): MenuMgmtVO {
  return {
    ...d,
    children: undefined,
  }
}

/** 收集节点自身及全部子孙 id（编辑时父级候选须排除，防成环） */
function collectSelfAndDescendantIds(nodes: MenuMgmtVO[], targetId: string): Set<string> {
  const blocked = new Set<string>()

  function collectSubtree(n: MenuMgmtVO) {
    if (n.id != null) {
      blocked.add(String(n.id))
    }
    n.children?.forEach(collectSubtree)
  }

  function walk(list: MenuMgmtVO[]): boolean {
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

export type UseMenuControllerOptions = {
  /**
   * 提交前准备 menuButtons（如目录懒加载 BTN_QUERY 字典）。
   */
  prepareMenuButtonsForSave?: () => Promise<void>
  /**
   * 提交时并入 MenuInfoVO.menuButtons；与 useMenuPermission.buildMenuButtonsForMenuSave 配合。
   * 返回 `undefined` 表示本次不提交 menuButtons 字段。
   */
  getMenuButtonsForSave?: () => MenuButtonInfoItem[] | undefined
}

export function useMenuController(options?: UseMenuControllerOptions) {
  const loading = ref(false)

  /** 与 useMenuPermission 联动：详情从服务端刷新后递增，触发按钮区从 menuInfo 重载 */
  const permissionBootstrapNonce = ref(0)

  function bumpPermissionBootstrapNonce() {
    permissionBootstrapNonce.value += 1
  }

  const treeData = ref<MenuMgmtVO[]>([])

  const selectedId = ref<string | null>(null)

  const menuInfo = ref<MenuInfoVO | null>(null)

  const panelMode = ref<MenuPanelMode>('idle')

  const formModel = ref<MenuMgmtVO>(emptyForm(0))

  /** 右侧表单只读展示：上级菜单名称 */
  const parentMenuLabel = computed(() => {
    const pid = formModel.value.parentId ?? 0
    if (Number(pid) === 0) {
      return '（一级菜单，类型可为目录或菜单）'
    }
    return findMenuNameById(treeData.value, pid) ?? `ID: ${pid}`
  })

  function formatParentTargetLabel(parentId: string | number): string {
    if (Number(parentId) === 0) {
      return '一级（根）'
    }
    return findMenuNameById(treeData.value, parentId) ?? `ID: ${parentId}`
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
    dragData: MenuMgmtVO,
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

    if (dragData.menuType === MENU_TYPE_MENU) {
      if (Number(newParentId) === 0) {
        return true
      }
      const parentNode = findMenuNodeById(treeData.value, newParentId)
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
      const parentNode = findMenuNodeById(treeData.value, newParentId)
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
    const dragData = draggingNode.data
    if (dragData.id == null) {
      return false
    }
    const newParentId = computeTreeDropParentId(dropNode, dropType)
    return validateDropParentRule(dragData, newParentId, dropNode, dropType)
  }

  const persistMenuParentChange = async (dragData: MenuMgmtVO, newParentId: string | number) => {
    const menuId = String(dragData.id)

    treeData.value = await updateMenuParent(menuId, newParentId)

    ElMessage.success('操作成功')

    if (selectedId.value === menuId) {
      menuInfo.value = await fetchMenuById(menuId)
      syncFormFromMenuInfo()
    }
  }

  const onTreeNodeDrop = async (
    draggingNode: TreeDropNodeLike,
    dropNode: TreeDropNodeLike,
    dropType: TreeDropType | string,
  ) => {
    const dragData = draggingNode.data
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
      treeData.value = await fetchMenuTreeAll()
    } catch (e) {
      if (isSessionExpiredError(e)) {
        return
      }
      ElMessage.error(e instanceof Error ? e.message : '加载菜单树失败')
    } finally {
      loading.value = false
    }
  }

  /**
   * 选中树中第一条记录（首个根节点）并加载详情；无数据时清空右侧。
   */
  const selectFirstMenuAndLoadDetail = async () => {
    const roots = treeData.value
    if (!roots.length) {
      selectedId.value = null
      menuInfo.value = null
      panelMode.value = 'idle'
      formModel.value = emptyForm(0)
      return
    }

    const first = roots[0]
    if (first.id == null) {
      return
    }

    const idStr = String(first.id)
    selectedId.value = idStr
    panelMode.value = 'edit'

    loading.value = true
    try {
      menuInfo.value = await fetchMenuById(idStr)
      syncFormFromMenuInfo()
    } catch (e) {
      if (isSessionExpiredError(e)) {
        menuInfo.value = null
        return
      }
      ElMessage.error(e instanceof Error ? e.message : '加载详情失败')
      menuInfo.value = null
    } finally {
      loading.value = false
    }
  }

  const syncFormFromMenuInfo = () => {
    const m = menuInfo.value?.menu
    if (m) {
      formModel.value = cloneFormFromMenu(m)
      bumpPermissionBootstrapNonce()
    }
  }

  const reloadDetailAndForm = async () => {
    if (selectedId.value == null) {
      menuInfo.value = null
      return
    }

    loading.value = true
    try {
      menuInfo.value = await fetchMenuById(selectedId.value)
      syncFormFromMenuInfo()
    } catch (e) {
      if (isSessionExpiredError(e)) {
        menuInfo.value = null
        return
      }
      ElMessage.error(e instanceof Error ? e.message : '加载详情失败')
      menuInfo.value = null
    } finally {
      loading.value = false
    }
  }

  const onTreeNodeClick = async (data: MenuMgmtVO) => {
    const id = data.id

    if (id == null) {
      return
    }

    const idStr = String(id)

    selectedId.value = idStr

    panelMode.value = 'edit'

    loading.value = true
    try {
      menuInfo.value = await fetchMenuById(idStr)
      syncFormFromMenuInfo()
    } catch (e) {
      if (isSessionExpiredError(e)) {
        menuInfo.value = null
        return
      }
      ElMessage.error(e instanceof Error ? e.message : '加载详情失败')
      menuInfo.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * 新增菜单：
   * - 传入 parentIdOverride 时：以该值为上级（传 null/'' 视为 0，即一级菜单）。
   * - 未传时：左侧已选中节点则作为上级（子菜单）；未选中则为一级菜单。
   */
  const openCreateMenu = (parentIdOverride?: string | number | null) => {
    panelMode.value = 'create'
    menuInfo.value = null

    if (parentIdOverride !== undefined) {
      const p =
        parentIdOverride === null || parentIdOverride === '' ? 0 : parentIdOverride
      formModel.value = emptyForm(p)
      return
    }

    const pid = selectedId.value
    if (pid != null) {
      formModel.value = emptyForm(pid)
    } else {
      formModel.value = emptyForm(0)
    }
  }

  /** 取消：新建 → 有选中则回到该节点详情，否则空闲；编辑 → 重新拉取服务端数据 */
  const cancelPanel = async () => {
    if (panelMode.value === 'create') {
      if (selectedId.value != null) {
        panelMode.value = 'edit'
        await reloadDetailAndForm()
      } else {
        panelMode.value = 'idle'
      }
      return
    }

    if (panelMode.value === 'edit') {
      await reloadDetailAndForm()
    }
  }

  const validateBeforeSubmit = (): boolean => {
    const m = formModel.value
    if (!m.menuCode?.trim() || !m.menuName?.trim()) {
      ElMessage.warning('请填写菜单编码与名称')
      return false
    }
    if (!m.menuType || (m.menuType !== MENU_TYPE_CATALOG && m.menuType !== MENU_TYPE_MENU)) {
      ElMessage.warning('请选择类型：目录或菜单')
      return false
    }
    if (m.menuType === MENU_TYPE_MENU) {
      const pidNum = Number(m.parentId ?? 0)
      if (pidNum !== 0) {
        const parentNode = findMenuNodeById(treeData.value, m.parentId!)
        if (!parentNode || parentNode.menuType !== MENU_TYPE_CATALOG) {
          ElMessage.warning('子级「菜单」须挂在「目录」下；一级菜单可直接为目录或菜单')
          return false
        }
      }
    }
    if (m.menuType === MENU_TYPE_CATALOG) {
      const pidNum = Number(m.parentId ?? 0)
      if (pidNum !== 0) {
        const parentNode = findMenuNodeById(treeData.value, m.parentId!)
        if (!parentNode || parentNode.menuType !== MENU_TYPE_CATALOG) {
          ElMessage.warning('子级「目录」须挂在「目录」下')
          return false
        }
      }
    }
    return true
  }

  const submitForm = async () => {
    const m = formModel.value

    if (!validateBeforeSubmit()) {
      return
    }

    loading.value = true
    try {
      await options?.prepareMenuButtonsForSave?.()

      const menuPayload = { ...m } as MenuMgmtVO & { componentPath?: unknown }
      delete menuPayload.componentPath
      delete menuPayload.children

      const infoPayload: MenuInfoVO = { menu: menuPayload }
      const mb = options?.getMenuButtonsForSave?.()
      if (mb !== undefined) {
        infoPayload.menuButtons = mb
      }

      await saveMenu(infoPayload)

      ElMessage.success('保存成功')

      await loadTree()

      const newId = m.id ?? menuPayload.id

      if (newId != null) {
        const nid = String(newId)

        selectedId.value = nid

        panelMode.value = 'edit'

        menuInfo.value = await fetchMenuById(nid)

        syncFormFromMenuInfo()
      }
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '保存失败')
      }
    } finally {
      loading.value = false
    }
  }

  /** 删除当前表单对应记录（无子菜单时后端允许删除） */
  const onDelete = async () => {
    const id = formModel.value.id

    if (id == null) {
      return
    }

    try {
      await ElMessageBox.confirm('确认需要删除该记录？', '删除', {
        type: 'warning',
      })
    } catch {
      return
    }

    loading.value = true
    try {
      await deleteMenuPhysically(id)

      ElMessage.success('删除成功')

      await loadTree()

      await selectFirstMenuAndLoadDetail()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '删除失败')
      }
    } finally {
      loading.value = false
    }
  }

  const showEditor = computed(
    () =>
      panelMode.value === 'create' || (panelMode.value === 'edit' && menuInfo.value?.menu != null),
  )

  onMounted(() => {
    void (async () => {
      await loadTree()
      await selectFirstMenuAndLoadDetail()
    })()
  })

  return {
    loading,
    treeData,
    selectedId,
    menuInfo,
    panelMode,
    formModel,
    showEditor,
    parentMenuLabel,
    permissionBootstrapNonce,
    allowTreeDrag,
    allowTreeDrop,
    onTreeNodeDrop,
    onTreeNodeClick,
    openCreateMenu,
    cancelPanel,
    submitForm,
    onDelete,
  }
}
