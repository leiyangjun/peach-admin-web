/**
 * 菜单管理：树加载、右侧主从表单编辑；新增无弹窗；逻辑停用通过表单「显示」开关提交。
 */

import { computed, onMounted, ref } from 'vue'

import { ElMessage, ElMessageBox } from 'element-plus'

import type { MenuMgmtButtonBindingItem, MenuMgmtVO } from '../../models/menuMgmt'

import { deleteMenuPhysically, fetchMenuById, fetchMenuTreeAll, saveMenu } from '../../api/menu'

import { isSessionExpiredError } from '../../utils/sessionExpired'

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

function cloneFormFromDetail(d: MenuMgmtVO): MenuMgmtVO {
  return {
    ...d,
    children: undefined,
  }
}

/** 在菜单树中按 id 查找节点名称（用于上级菜单展示） */
function findMenuNameInTree(nodes: MenuMgmtVO[], id: string | number | null | undefined): string | null {
  if (id === undefined || id === null) {
    return null
  }

  const key = String(id)

  for (const n of nodes) {
    if (String(n.id ?? '') === key) {
      return n.menuName ?? null
    }

    if (n.children?.length) {
      const hit = findMenuNameInTree(n.children, id)
      if (hit) {
        return hit
      }
    }
  }

  return null
}

export type UseMenuControllerOptions = {
  /**
   * 提交菜单时并入 `buttonBindings`；与 useMenuPermission.buildButtonBindingsForMenuSave 配合。
   * 返回 `undefined` 表示本次不提交绑定字段。
   */
  getButtonBindingsForSave?: () => MenuMgmtButtonBindingItem[] | undefined
}

export function useMenuController(options?: UseMenuControllerOptions) {
  const loading = ref(false)

  /** 与 useMenuPermission 联动：详情从服务端刷新后递增，触发按钮区从库重载 */
  const permissionBootstrapNonce = ref(0)

  function bumpPermissionBootstrapNonce() {
    permissionBootstrapNonce.value += 1
  }

  const treeData = ref<MenuMgmtVO[]>([])

  const selectedId = ref<string | null>(null)

  const detail = ref<MenuMgmtVO | null>(null)

  const panelMode = ref<MenuPanelMode>('idle')

  const formModel = ref<MenuMgmtVO>(emptyForm(0))

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
      detail.value = null
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
      detail.value = await fetchMenuById(idStr)
      syncFormFromDetail()
    } catch (e) {
      if (isSessionExpiredError(e)) {
        detail.value = null
        return
      }
      ElMessage.error(e instanceof Error ? e.message : '加载详情失败')
      detail.value = null
    } finally {
      loading.value = false
    }
  }

  const syncFormFromDetail = () => {
    if (detail.value) {
      formModel.value = cloneFormFromDetail(detail.value)
      bumpPermissionBootstrapNonce()
    }
  }

  const reloadDetailAndForm = async () => {
    if (selectedId.value == null) {
      detail.value = null
      return
    }

    loading.value = true
    try {
      detail.value = await fetchMenuById(selectedId.value)
      syncFormFromDetail()
    } catch (e) {
      if (isSessionExpiredError(e)) {
        detail.value = null
        return
      }
      ElMessage.error(e instanceof Error ? e.message : '加载详情失败')
      detail.value = null
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
      detail.value = await fetchMenuById(idStr)
      syncFormFromDetail()
    } catch (e) {
      if (isSessionExpiredError(e)) {
        detail.value = null
        return
      }
      ElMessage.error(e instanceof Error ? e.message : '加载详情失败')
      detail.value = null
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
    detail.value = null

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

  const submitForm = async () => {
    const m = formModel.value

    if (!m.menuCode?.trim() || !m.menuName?.trim()) {
      ElMessage.warning('请填写菜单编码与名称')
      return
    }

    if (!m.menuType || (m.menuType !== 'CATALOG' && m.menuType !== 'MENU')) {
      ElMessage.warning('请选择类型：目录或菜单')
      return
    }

    loading.value = true
    try {
      // 组件路径改由前端按 route_path 解析，保存时不提交该字段
      const payload = { ...m } as MenuMgmtVO & { componentPath?: unknown }
      delete payload.componentPath
      const bb = options?.getButtonBindingsForSave?.()
      if (bb !== undefined) {
        payload.buttonBindings = bb
      }
      const saved = await saveMenu(payload)

      ElMessage.success('保存成功')

      await loadTree()

      const newId = saved.id

      if (newId != null) {
        const nid = String(newId)

        selectedId.value = nid

        panelMode.value = 'edit'

        detail.value = await fetchMenuById(nid)

        syncFormFromDetail()
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
      panelMode.value === 'create' || (panelMode.value === 'edit' && detail.value != null),
  )

  /** 表单区展示的上级菜单名称 */
  const parentMenuLabel = computed(() => {
    const pid = formModel.value.parentId

    if (pid == null || pid === 0 || pid === '0') {
      return '（一级菜单）'
    }

    const name = findMenuNameInTree(treeData.value, pid)

    return name ?? `（上级 id=${pid}）`
  })

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
    detail,
    panelMode,
    formModel,
    showEditor,
    parentMenuLabel,
    permissionBootstrapNonce,
    onTreeNodeClick,
    openCreateMenu,
    cancelPanel,
    submitForm,
    onDelete,
  }
}
