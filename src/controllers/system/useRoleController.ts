/**
 * 角色管理：新增/编辑共用对话框；分页、物理删除、绑定用户（分页多选合并）。
 */

import { computed, nextTick, ref, useTemplateRef, watch, type ComputedRef } from 'vue'
import { ElMessage, ElMessageBox, type FormRules } from 'element-plus'
import {
  fetchRoleById,
  fetchRolePage,
  fetchRoleUserIds,
  hardDeleteRole,
  replaceRoleUsers,
  saveRole,
} from '../../api/role'
import { fetchUserPage } from '../../api/user'
import { isSessionExpiredError } from '../../utils/sessionExpired'
import type { RoleMgmtVO } from '../../models/roleMgmt'
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
  /** 跨页累积的已选用户 id（字符串，兼容雪花） */
  const bindUserIds = ref<string[]>([])
  /** 与模板中 {@code ref="bindPickerTable"} 对应 */
  const bindPickerTableRef = useTemplateRef<{
    clearSelection: () => void
    toggleRowSelection: (row: UserMgmtVO, selected?: boolean) => void
  }>('bindPickerTable')
  const bindSyncingSelection = ref(false)

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

  const confirmHardDelete = async (row: RoleMgmtVO) => {
    if (row.id == null) {
      return
    }
    const name = row.roleName ?? row.roleCode ?? String(row.id)
    try {
      await ElMessageBox.confirm(`确定物理删除角色「${name}」？将同时移除菜单/按钮/用户关联，且不可恢复。`, '物理删除', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
    try {
      await hardDeleteRole(row.id)
      ElMessage.success('已物理删除')
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '物理删除失败')
      }
    }
  }

  const syncPickerSelection = async () => {
    bindSyncingSelection.value = true
    try {
      await nextTick()
      const tb = bindPickerTableRef.value
      if (!tb) {
        return
      }
      tb.clearSelection()
      for (const row of bindPickerRows.value) {
        if (row.id != null && bindUserIds.value.includes(String(row.id))) {
          tb.toggleRowSelection(row, true)
        }
      }
    } finally {
      bindSyncingSelection.value = false
    }
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
      await syncPickerSelection()
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
      const ids = await fetchRoleUserIds(row.id)
      bindUserIds.value = ids.map((x) => String(x))
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

  const onBindSelectionChange = (selection: UserMgmtVO[]) => {
    if (bindSyncingSelection.value) {
      return
    }
    const pageIds = bindPickerRows.value.map((r) => String(r.id))
    const set = new Set(bindUserIds.value)
    for (const pid of pageIds) {
      set.delete(pid)
    }
    for (const r of selection) {
      if (r.id != null) {
        set.add(String(r.id))
      }
    }
    bindUserIds.value = [...set]
  }

  const clearBindSelection = () => {
    bindUserIds.value = []
    void syncPickerSelection()
  }

  const submitBindUsers = async () => {
    if (bindRoleId.value == null) {
      return
    }
    bindSubmitLoading.value = true
    try {
      await replaceRoleUsers(bindRoleId.value, { userIds: bindUserIds.value })
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
    confirmHardDelete,
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
    openBindUsers,
    onBindSearch,
    onBindReset,
    onBindSelectionChange,
    clearBindSelection,
    submitBindUsers,
  }
}
