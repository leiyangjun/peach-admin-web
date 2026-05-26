/**
 * 运维菜单管理：新建仅 CATALOG；编辑可维护 CATALOG / MENU；新建目录由后端绑定 BTN_QUERY。
 */

import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createMenuOpsCatalog,
  deleteMenuOps,
  fetchMenuOpsDetail,
  fetchMenuTreeAllForOps,
  patchMenuOps,
} from '../../api/menuOps'
import type { MenuOpsDetailVO, MenuOpsPatchVO, MenuOpsSaveVO, MenuOpsTreeNode } from '../../models/menuOps'
import { isSessionExpiredError } from '../../utils/sessionExpired'

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

/** 父级树选：仅目录节点（MENU 上级须为 CATALOG） */
export function filterCatalogTree(nodes: MenuOpsTreeNode[]): MenuOpsTreeNode[] {
  const out: MenuOpsTreeNode[] = []
  for (const n of nodes) {
    const kids = n.children?.length ? filterCatalogTree(n.children) : []
    if (n.menuType === MENU_TYPE_CATALOG) {
      out.push({ ...n, children: kids.length ? kids : undefined })
    } else if (kids.length) {
      out.push(...kids)
    }
  }
  return out
}

function menuTypeLabel(type: string | undefined): string {
  if (type === MENU_TYPE_MENU) return '菜单'
  if (type === MENU_TYPE_CATALOG) return '目录'
  return type ?? ''
}

export function useMenuOpsController() {
  const loading = ref(false)
  const treeData = ref<MenuOpsTreeNode[]>([])
  const selectedId = ref<string | null>(null)
  const panelMode = ref<MenuOpsPanelMode>('idle')
  const formModel = ref<MenuOpsFormModel>(emptyForm(0))
  const detail = ref<MenuOpsDetailVO | null>(null)

  const parentTreeOptions = computed(() => filterCatalogTree(treeData.value))

  const parentPickerRootLabel = computed(() =>
    formModel.value.menuType === MENU_TYPE_MENU ? '（请选择目录）' : '（一级目录）',
  )

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
    if (m.menuType === MENU_TYPE_MENU) {
      const pid = m.parentId
      if (pid === undefined || pid === null || pid === '' || Number(pid) === 0) {
        ElMessage.warning('菜单类型须选择目录作为上级')
        return false
      }
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
        if (created.id != null) {
          selectedId.value = String(created.id)
          detail.value = created
          formModel.value = detailToForm(created)
          panelMode.value = 'edit'
        }
      } else if (panelMode.value === 'edit' && m.id != null) {
        const patch: MenuOpsPatchVO = {
          parentId: m.parentId,
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
    void loadTree()
  })

  return {
    loading,
    treeData,
    parentTreeOptions,
    parentPickerRootLabel,
    selectedId,
    panelMode,
    formModel,
    detail,
    showEditor,
    menuTypeLabel,
    isCatalogNode,
    isCatalogForm,
    onTreeNodeClick,
    openCreateMenu,
    cancelPanel,
    submitForm,
    onDelete,
    loadTree,
  }
}
