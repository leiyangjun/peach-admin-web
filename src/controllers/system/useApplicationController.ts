/**
 * 应用管理：分页（关键字、应用类型）、抽屉新增/编辑、物理删除确认。
 * 应用类型选项来自码表 APP_TYPE（GET /dict/valid/APP_TYPE）。
 */

import { computed, onMounted, ref, watch, type ComputedRef } from 'vue'
import { ElMessage, ElMessageBox, type FormRules } from 'element-plus'
import {
  deleteApplication,
  fetchApplicationById,
  fetchApplicationPage,
  saveApplication,
} from '../../api/application'
import { fetchValidDictByType } from '../../api/dict'
import { isSessionExpiredError } from '../../utils/sessionExpired'
import {
  DEFAULT_PAGE_SIZE,
  buildPageParams,
  sliceRowsForPage,
} from '../../utils/pagination'
import type { DictMgmtVO } from '../../models/dictMgmt'
import {
  APP_TYPE_DICT_TYPE,
  defaultAppTypeFromDict,
  dictItemsToAppTypeOptions,
  resolveAppTypeLabel,
  resolveAppTypeTagType,
  type ApplicationMgmtVO,
} from '../../models/applicationMgmt'

export type ApplicationDrawerMode = 'create' | 'edit'

export function useApplicationController() {
  const keyword = ref('')
  /** undefined=全部；否则等值筛选 app_type */
  const appTypeFilter = ref<string | undefined>(undefined)
  /** 码表 APP_TYPE 原始项（挂载时加载） */
  const appTypeDictItems = ref<DictMgmtVO[]>([])
  const appTypeOptions = computed(() => dictItemsToAppTypeOptions(appTypeDictItems.value))
  /** 筛选下拉：码表项 + 当前已选但不在码表中的历史值 */
  const appTypeFilterOptions = computed(() => {
    const opts = [...appTypeOptions.value]
    const cur = appTypeFilter.value?.trim()
    if (cur && !opts.some((o) => o.value.toUpperCase() === cur.toUpperCase())) {
      opts.push({ value: cur, label: cur })
    }
    return opts
  })

  const page = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const total = ref(0)
  const loading = ref(false)
  const tableRows = ref<ApplicationMgmtVO[]>([])

  const drawerVisible = ref(false)
  const drawerMode = ref<ApplicationDrawerMode>('create')
  const submitLoading = ref(false)
  const appForm = ref<ApplicationMgmtVO>({})

  const drawerTitle = computed(() => (drawerMode.value === 'create' ? '新增应用' : '编辑应用'))

  const rules: ComputedRef<FormRules> = computed(() => ({
    appType: [{ required: true, message: '请选择应用类型', trigger: 'change' }],
    appName: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
    appCode: [{ required: true, message: '请输入应用编码', trigger: 'blur' }],
  }))

  const loadAppTypeDict = async () => {
    try {
      appTypeDictItems.value = await fetchValidDictByType(APP_TYPE_DICT_TYPE)
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载应用类型码表失败')
        appTypeDictItems.value = []
      }
    }
  }

  onMounted(() => {
    void loadAppTypeDict()
  })

  const appTypeLabel = (appType?: string | null) => resolveAppTypeLabel(appType, appTypeOptions.value)
  const appTypeToElTagType = (appType?: string | null) => resolveAppTypeTagType(appType, appTypeOptions.value)

  const loadList = async () => {
    loading.value = true
    try {
      const query = buildPageParams(page.value, pageSize.value)
      const data = await fetchApplicationPage({
        ...query,
        searchValue: keyword.value.trim() || undefined,
        appType: appTypeFilter.value?.trim() || undefined,
      })
      tableRows.value = sliceRowsForPage(data.list ?? [], query.pageNum, query.pageSize)
      total.value = data.total ?? 0
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载应用列表失败')
      }
    } finally {
      loading.value = false
    }
  }

  watch([page, pageSize, appTypeFilter], () => {
    void loadList()
  }, { immediate: true })

  const onSearch = () => {
    page.value = 1
    void loadList()
  }

  const onReset = () => {
    keyword.value = ''
    appTypeFilter.value = undefined
    page.value = 1
    void loadList()
  }

  const emptyForm = (): ApplicationMgmtVO => ({
    appType: defaultAppTypeFromDict(appTypeDictItems.value, appTypeOptions.value),
    appName: '',
    appCode: '',
    appDesc: '',
  })

  const openCreate = () => {
    drawerMode.value = 'create'
    appForm.value = emptyForm()
    drawerVisible.value = true
  }

  const loadAppIntoDrawer = async (id: string | number) => {
    submitLoading.value = true
    try {
      appForm.value = { ...(await fetchApplicationById(id)) }
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载详情失败')
      }
      drawerVisible.value = false
    } finally {
      submitLoading.value = false
    }
  }

  const openEdit = (row: ApplicationMgmtVO) => {
    if (row.id == null) {
      return
    }
    drawerMode.value = 'edit'
    drawerVisible.value = true
    void loadAppIntoDrawer(row.id)
  }

  const onSubmit = async () => {
    const f = appForm.value
    submitLoading.value = true
    try {
      const base = {
        appType: f.appType?.trim(),
        appName: f.appName?.trim(),
        appCode: f.appCode?.trim(),
        appDesc: f.appDesc?.trim() || undefined,
      }
      if (drawerMode.value === 'create') {
        await saveApplication(base)
      } else {
        await saveApplication({
          id: f.id,
          ...base,
        })
      }
      ElMessage.success(drawerMode.value === 'create' ? '新增成功' : '保存成功')
      drawerVisible.value = false
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '保存失败')
      }
    } finally {
      submitLoading.value = false
    }
  }

  const confirmDelete = async (row: ApplicationMgmtVO) => {
    if (row.id == null) {
      return
    }
    const label = row.appName ?? row.appCode ?? String(row.id)
    try {
      await ElMessageBox.confirm(`确定物理删除「${label}」？`, '物理删除', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
    try {
      await deleteApplication(row.id)
      ElMessage.success('已物理删除')
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '物理删除失败')
      }
    }
  }

  return {
    keyword,
    appTypeFilter,
    appTypeOptions,
    appTypeFilterOptions,
    appTypeLabel,
    appTypeToElTagType,
    page,
    pageSize,
    total,
    loading,
    tableRows,
    drawerVisible,
    drawerMode,
    drawerTitle,
    submitLoading,
    appForm,
    rules,
    onSearch,
    onReset,
    openCreate,
    openEdit,
    onSubmit,
    confirmDelete,
  }
}
