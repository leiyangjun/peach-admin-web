/**
 * 码表配置：分页（关键字模糊、状态）、抽屉新增/编辑、状态切换与物理删除确认；字典类型列表仅用于抽屉表单下拉。
 */

import { computed, onMounted, ref, watch, type ComputedRef } from 'vue'
import { ElMessage, ElMessageBox, type FormRules } from 'element-plus'
import { fetchDictById, fetchDictPage, fetchDictTypes, hardDeleteDict, saveDict, toggleDictStatus } from '../../api/dict'
import { isSessionExpiredError } from '../../utils/sessionExpired'
import type { DictMgmtVO } from '../../models/dictMgmt'

export type DictDrawerMode = 'create' | 'edit'

function toParentId(v: unknown): number {
  if (v === '' || v === undefined || v === null) {
    return 0
  }
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : 0
  }
  const n = Number(String(v).trim())
  return Number.isFinite(n) ? n : 0
}

export function useDictController() {
  const keyword = ref('')
  /** undefined=全部；1=仅启用；0=仅停用 */
  const statusFilter = ref<string | number | undefined>(undefined)
  /** 抽屉表单「字典类型」下拉数据源（GET /dict/types） */
  const dictTypes = ref<string[]>([])

  const page = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const loading = ref(false)
  const tableRows = ref<DictMgmtVO[]>([])

  const drawerVisible = ref(false)
  const drawerMode = ref<DictDrawerMode>('create')
  const submitLoading = ref(false)
  const dictForm = ref<DictMgmtVO>({})

  const drawerTitle = computed(() => (drawerMode.value === 'create' ? '新增码表项' : '编辑码表项'))

  const rules: ComputedRef<FormRules> = computed(() => ({
    dictType: [{ required: true, message: '请输入或选择字典类型', trigger: 'blur' }],
    dictLabel: [{ required: true, message: '请输入展示标签', trigger: 'blur' }],
    dictValue: [{ required: true, message: '请输入存储值', trigger: 'blur' }],
  }))

  const loadDictTypes = async () => {
    try {
      dictTypes.value = await fetchDictTypes()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载字典类型失败')
        dictTypes.value = []
      }
    }
  }

  const loadList = async () => {
    loading.value = true
    try {
      const listStatusFlag =
        statusFilter.value === '' || statusFilter.value === undefined ? undefined : Number(statusFilter.value)
      const data = await fetchDictPage({
        pageNum: page.value,
        pageSize: pageSize.value,
        searchValue: keyword.value.trim() || undefined,
        listStatusFlag,
      })
      tableRows.value = data.list ?? []
      total.value = data.total ?? 0
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载码表列表失败')
      }
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void loadDictTypes()
  })

  watch([page, pageSize, statusFilter], () => {
    void loadList()
  }, { immediate: true })

  const onSearch = () => {
    page.value = 1
    void loadList()
  }

  const onReset = () => {
    keyword.value = ''
    statusFilter.value = undefined
    page.value = 1
    void loadList()
  }

  const emptyForm = (): DictMgmtVO => ({
    dictType: '',
    dictLabel: '',
    dictValue: '',
    sortNo: 0,
    remark: '',
    parentId: 0,
    cssClass: '',
    listClass: '',
    isDefault: 0,
  })

  const openCreate = () => {
    drawerMode.value = 'create'
    dictForm.value = emptyForm()
    drawerVisible.value = true
  }

  const loadDictIntoDrawer = async (id: string | number) => {
    submitLoading.value = true
    try {
      dictForm.value = { ...(await fetchDictById(id)) }
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载详情失败')
      }
      drawerVisible.value = false
    } finally {
      submitLoading.value = false
    }
  }

  const openEdit = (row: DictMgmtVO) => {
    if (row.id == null) {
      return
    }
    drawerMode.value = 'edit'
    drawerVisible.value = true
    void loadDictIntoDrawer(row.id)
  }

  const onSubmit = async () => {
    const f = dictForm.value
    submitLoading.value = true
    try {
      const base = {
        dictType: f.dictType?.trim(),
        dictLabel: f.dictLabel?.trim(),
        dictValue: f.dictValue?.trim(),
        sortNo: f.sortNo ?? 0,
        remark: f.remark,
        parentId: toParentId(f.parentId),
        cssClass: f.cssClass?.trim() || undefined,
        listClass: f.listClass?.trim() || undefined,
        isDefault: f.isDefault ?? 0,
      }
      if (drawerMode.value === 'create') {
        await saveDict(base)
      } else {
        await saveDict({
          id: f.id,
          ...base,
        })
      }
      ElMessage.success(drawerMode.value === 'create' ? '新增成功' : '保存成功')
      drawerVisible.value = false
      void loadDictTypes()
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '保存失败')
      }
    } finally {
      submitLoading.value = false
    }
  }

  const onToggleStatus = async (row: DictMgmtVO, wantOn: boolean) => {
    if (row.id == null) {
      return
    }
    const cur = row.status === 1
    if (cur === wantOn) {
      return
    }
    try {
      await toggleDictStatus(row.id)
      ElMessage.success('状态已更新')
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '切换失败')
      }
      void loadList()
    }
  }

  const confirmHardDelete = async (row: DictMgmtVO) => {
    if (row.id == null) {
      return
    }
    const label = row.dictLabel ?? row.dictValue ?? String(row.id)
    try {
      await ElMessageBox.confirm(`确定物理删除「${label}」？数据库行将永久删除，不可恢复。`, '物理删除', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
    try {
      await hardDeleteDict(row.id)
      ElMessage.success('已物理删除')
      void loadDictTypes()
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '物理删除失败')
      }
    }
  }

  return {
    keyword,
    statusFilter,
    dictTypes,
    page,
    pageSize,
    total,
    loading,
    tableRows,
    drawerVisible,
    drawerMode,
    drawerTitle,
    submitLoading,
    dictForm,
    rules,
    onSearch,
    onReset,
    openCreate,
    openEdit,
    onSubmit,
    onToggleStatus,
    confirmHardDelete,
  }
}
