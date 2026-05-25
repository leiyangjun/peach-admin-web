/**
 * 角色管理：新增/编辑共用对话框；分页、物理删除；绑定用户（左右穿梭）；绑定菜单（树表 + 按钮多选）。
 */

import { computed, ref, watch, type ComputedRef } from 'vue'
import { ElMessage, ElMessageBox, type FormRules } from 'element-plus'
import {
  fetchRoleById,
  fetchRoleMenus,
  fetchRolePage,
  fetchRoleUsers,
  deleteRole,
  replaceRoleUsers,
  saveRole,
  saveRoleMenus,
} from '../../api/role'
import { fetchUserPage } from '../../api/user'
import { isSessionExpiredError } from '../../utils/sessionExpired'
import {
  applyRoleMenuBindImplicitSelections,
  buildRoleMenuBindTreeFromRoleMenus,
  buildRoleMenuTreeSavePayload,
  collectGrantedMenuButtonIdsFromRoleMenuTree,
  type MenuBindTreeRow,
} from '../../utils/roleMenuBindRules'
import type { MenuTreeRoleVO, RoleMgmtVO } from '../../models/roleMgmt'
import type { UserMgmtVO } from '../../models/userMgmt'

export type RoleDialogMode = 'create' | 'edit'

export function useRoleController() {
  const keyword = ref('')
  const page = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const loading = ref(false)
  const tableRows = ref<RoleMgmtVO[]>([])

  const dialogVisible = ref(false)
  const dialogMode = ref<RoleDialogMode>('create')
  const submitLoading = ref(false)
  const roleForm = ref<RoleMgmtVO>({})

  const bindDialogVisible = ref(false)
  const bindRoleId = ref<string | number | undefined>(undefined)
  const bindRoleLabel = ref('')
  const bindSubmitLoading = ref(false)
  const bindPickerLoading = ref(false)
  const bindPickerRows = ref<UserMgmtVO[]>([])
  const bindPickerPage = ref(1)
  const bindPickerPageSize = ref(10)
  const bindPickerTotal = ref(0)
  const bindPickerKeyword = ref('')
  /** 右侧已选用户（全量对象，提交时取 id） */
  const bindRightUsers = ref<UserMgmtVO[]>([])
  const bindUserIds = computed(() =>
    bindRightUsers.value.map((u) => (u.id != null ? String(u.id) : '')).filter((x) => !!x),
  )

  const bindMbDialogVisible = ref(false)
  const bindMbRoleId = ref<string | number | undefined>(undefined)
  const bindMbRoleLabel = ref('')
  const bindMbSubmitLoading = ref(false)
  const bindMbPickerLoading = ref(false)
  /** 树表数据：目录 / 菜单层级 + 每行挂载可选按钮实例 */
  const bindMbTreeRows = ref<MenuBindTreeRow[]>([])
  /** GET /role/menus/{roleId} 原始树，提交时据此写回 permission */
  const bindMbSourceTree = ref<MenuTreeRoleVO[]>([])
  /** 已选勾选键 menuId:buttonId（含规则推导的隐式「查询」） */
  const bindMbMenuButtonIds = ref<string[]>([])
  const bindMbSelectedSet = computed(() => new Set(bindMbMenuButtonIds.value))

  const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新增角色' : '编辑角色'))

  const rules: ComputedRef<FormRules> = computed(() => ({
    roleCode: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
    roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  }))

  const loadList = async () => {
    loading.value = true
    try {
      const data = await fetchRolePage({
        pageNum: page.value,
        pageSize: pageSize.value,
        searchValue: keyword.value.trim() || undefined,
      })
      tableRows.value = data.list ?? []
      total.value = data.total ?? 0
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载角色列表失败')
      }
    } finally {
      loading.value = false
    }
  }

  watch(
    [page, pageSize],
    () => {
      void loadList()
    },
    { immediate: true },
  )

  const onSearch = () => {
    page.value = 1
    void loadList()
  }

  const onReset = () => {
    keyword.value = ''
    page.value = 1
    void loadList()
  }

  const emptyForm = (): RoleMgmtVO => ({
    roleCode: '',
    roleName: '',
    remark: '',
  })

  const openCreate = () => {
    dialogMode.value = 'create'
    roleForm.value = emptyForm()
    dialogVisible.value = true
  }

  const loadRoleIntoDialog = async (id: string | number) => {
    submitLoading.value = true
    try {
      roleForm.value = { ...(await fetchRoleById(id)) }
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载角色失败')
      }
      dialogVisible.value = false
    } finally {
      submitLoading.value = false
    }
  }

  const openEdit = (row: RoleMgmtVO) => {
    if (row.id == null) {
      return
    }
    dialogMode.value = 'edit'
    dialogVisible.value = true
    void loadRoleIntoDialog(row.id)
  }

  const onSubmit = async () => {
    const f = roleForm.value
    submitLoading.value = true
    try {
      if (dialogMode.value === 'create') {
        await saveRole({
          roleCode: f.roleCode?.trim(),
          roleName: f.roleName?.trim(),
          remark: f.remark,
        })
      } else {
        await saveRole({
          id: f.id,
          roleCode: f.roleCode?.trim(),
          roleName: f.roleName?.trim(),
          remark: f.remark,
        })
      }
      ElMessage.success(dialogMode.value === 'create' ? '新增成功' : '保存成功')
      dialogVisible.value = false
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '保存失败')
      }
    } finally {
      submitLoading.value = false
    }
  }

  const confirmDelete = async (row: RoleMgmtVO) => {
    if (row.id == null) {
      return
    }
    const name = row.roleName ?? row.roleCode ?? String(row.id)
    try {
      await ElMessageBox.confirm(`确定物理删除「${name}」？`, '物理删除', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
    try {
      await deleteRole(row.id)
      ElMessage.success('已物理删除')
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '物理删除失败')
      }
    }
  }

  const bindRightUserKeySet = computed(() => new Set(bindUserIds.value))

  function userRowKey(row: UserMgmtVO) {
    return row.id != null ? String(row.id) : ''
  }

  function leftBindUserRowClassName({ row }: { row: UserMgmtVO }) {
    const k = userRowKey(row)
    return k && bindRightUserKeySet.value.has(k) ? 'shuttle-row--picked' : ''
  }

  function addBindUserFromLeft(row: UserMgmtVO) {
    const k = userRowKey(row)
    if (!k) {
      return
    }
    if (bindRightUserKeySet.value.has(k)) {
      return
    }
    bindRightUsers.value = [...bindRightUsers.value, { ...row }]
  }

  function removeBindRightUser(row: UserMgmtVO) {
    const k = userRowKey(row)
    bindRightUsers.value = bindRightUsers.value.filter((u) => userRowKey(u) !== k)
  }

  const loadBindPicker = async () => {
    if (bindRoleId.value == null) {
      return
    }
    bindPickerLoading.value = true
    try {
      const data = await fetchUserPage({
        pageNum: bindPickerPage.value,
        pageSize: bindPickerPageSize.value,
        searchValue: bindPickerKeyword.value.trim() || undefined,
        userType: 'system',
      })
      bindPickerRows.value = data.list ?? []
      bindPickerTotal.value = data.total ?? 0
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载用户列表失败')
      }
    } finally {
      bindPickerLoading.value = false
    }
  }

  watch([bindPickerPage, bindPickerPageSize], () => {
    if (bindDialogVisible.value) {
      void loadBindPicker()
    }
  })

  const openBindUsers = async (row: RoleMgmtVO) => {
    if (row.id == null) {
      return
    }
    bindRoleId.value = row.id
    bindRoleLabel.value = row.roleName ?? row.roleCode ?? String(row.id)
    bindDialogVisible.value = true
    bindPickerKeyword.value = ''
    bindPickerPage.value = 1
    try {
      bindRightUsers.value = await fetchRoleUsers(row.id)
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载已绑定用户失败')
      }
      bindDialogVisible.value = false
      return
    }
    void loadBindPicker()
  }

  const onBindSearch = () => {
    bindPickerPage.value = 1
    void loadBindPicker()
  }

  const onBindReset = () => {
    bindPickerKeyword.value = ''
    bindPickerPage.value = 1
    void loadBindPicker()
  }

  const clearBindSelection = () => {
    bindRightUsers.value = []
  }

  const submitBindUsers = async () => {
    if (bindRoleId.value == null) {
      return
    }
    bindSubmitLoading.value = true
    try {
      await replaceRoleUsers(
        bindRoleId.value,
        bindUserIds.value.map((userId) => ({
          roleId: bindRoleId.value,
          userId,
        })),
      )
      ElMessage.success('用户绑定已保存')
      bindDialogVisible.value = false
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '保存失败')
      }
    } finally {
      bindSubmitLoading.value = false
    }
  }

  /** 打开绑定菜单弹窗时一次拉取树 + 按钮勾选态 */
  const loadBindMbData = async (roleId: string | number): Promise<boolean> => {
    bindMbPickerLoading.value = true
    try {
      const tree = await fetchRoleMenus(roleId)
      bindMbSourceTree.value = tree
      bindMbTreeRows.value = buildRoleMenuBindTreeFromRoleMenus(tree)
      const granted = collectGrantedMenuButtonIdsFromRoleMenuTree(tree)
      mergeMbSelectionWithRules(new Set(granted))
      return true
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载角色菜单绑定数据失败')
      }
      bindMbTreeRows.value = []
      bindMbSourceTree.value = []
      bindMbMenuButtonIds.value = []
      return false
    } finally {
      bindMbPickerLoading.value = false
    }
  }

  /** 合并勾选规则后写回 bindMbMenuButtonIds */
  function mergeMbSelectionWithRules(base: Set<string>) {
    bindMbMenuButtonIds.value = [...applyRoleMenuBindImplicitSelections(base, bindMbTreeRows.value)]
  }

  function toggleBindMbMenuButton(menuButtonId: string, checked: boolean) {
    const s = new Set(bindMbMenuButtonIds.value)
    if (checked) {
      s.add(menuButtonId)
    } else {
      s.delete(menuButtonId)
    }
    mergeMbSelectionWithRules(s)
  }

  const openBindMenuButtons = async (row: RoleMgmtVO) => {
    if (row.id == null) {
      return
    }
    bindMbRoleId.value = row.id
    bindMbRoleLabel.value = row.roleName ?? row.roleCode ?? String(row.id)
    bindMbDialogVisible.value = true
    bindMbMenuButtonIds.value = []
    bindMbTreeRows.value = []
    bindMbSourceTree.value = []
    const ok = await loadBindMbData(row.id)
    if (!ok) {
      bindMbDialogVisible.value = false
    }
  }

  const submitBindMenuButtons = async () => {
    if (bindMbRoleId.value == null) {
      return
    }
    bindMbSubmitLoading.value = true
    try {
      const payload = buildRoleMenuTreeSavePayload(
        bindMbSourceTree.value,
        bindMbSelectedSet.value,
        bindMbRoleId.value,
      )
      await saveRoleMenus(bindMbRoleId.value, payload)
      ElMessage.success('菜单绑定已保存')
      bindMbDialogVisible.value = false
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '保存失败')
      }
    } finally {
      bindMbSubmitLoading.value = false
    }
  }

  return {
    keyword,
    page,
    pageSize,
    total,
    loading,
    tableRows,
    dialogVisible,
    dialogMode,
    dialogTitle,
    submitLoading,
    roleForm,
    rules,
    onSearch,
    onReset,
    openCreate,
    openEdit,
    onSubmit,
    confirmDelete,
    bindDialogVisible,
    bindRoleLabel,
    bindSubmitLoading,
    bindPickerLoading,
    bindPickerRows,
    bindPickerPage,
    bindPickerPageSize,
    bindPickerTotal,
    bindPickerKeyword,
    bindUserIds,
    bindRightUsers,
    openBindUsers,
    onBindSearch,
    onBindReset,
    leftBindUserRowClassName,
    addBindUserFromLeft,
    removeBindRightUser,
    clearBindSelection,
    submitBindUsers,
    bindMbDialogVisible,
    bindMbRoleLabel,
    bindMbSubmitLoading,
    bindMbPickerLoading,
    bindMbTreeRows,
    bindMbMenuButtonIds,
    bindMbSelectedSet,
    openBindMenuButtons,
    toggleBindMbMenuButton,
    submitBindMenuButtons,
  }
}
