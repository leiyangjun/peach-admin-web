/**
 * 免鉴权 API 列表：分页、关键字模糊、启停切换、物理删除；抽屉新建/编辑。
 */

import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteUnauthApi,
  fetchUnauthApiPage,
  toggleUnauthApiValid,
} from '../../api/unauthApi'
import { isSessionExpiredError } from '../../utils/sessionExpired'
import type { UnauthApiPageQuery, UnauthApiVO } from '../../models/unauthApi'
import { isUnauthDeletable, isUnauthEnabled, UNAUTH_API_LIST_PATH } from '../../models/unauthApi'
import { useUnauthApiEditDrawer } from './useUnauthApiEditController'

export { UNAUTH_API_LIST_PATH }

export function useUnauthApiController() {
  const keyword = ref('')
  const validFilter = ref<number | undefined>(undefined)
  const page = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const loading = ref(false)
  const tableRows = ref<UnauthApiVO[]>([])

  const buildPageQuery = (): UnauthApiPageQuery => {
    const base: UnauthApiPageQuery = {
      pageNum: page.value,
      pageSize: pageSize.value,
      sortName: 'editTime',
      sortType: 'desc',
    }
    const kw = keyword.value.trim()
    if (kw) {
      base.searchValue = kw
    }
    if (validFilter.value !== undefined && validFilter.value !== null) {
      base.valid = validFilter.value
    }
    return base
  }

  const loadList = async () => {
    loading.value = true
    try {
      const data = await fetchUnauthApiPage(buildPageQuery())
      tableRows.value = data.list ?? []
      total.value = data.total ?? 0
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载列表失败')
      }
    } finally {
      loading.value = false
    }
  }

  const editDrawer = useUnauthApiEditDrawer(() => {
    void loadList()
  })

  watch([page, pageSize, validFilter], () => {
    void loadList()
  }, { immediate: true })

  const onSearch = () => {
    page.value = 1
    void loadList()
  }

  const onReset = () => {
    keyword.value = ''
    validFilter.value = undefined
    page.value = 1
    void loadList()
  }

  const onToggleValid = async (row: UnauthApiVO) => {
    if (row.id == null) {
      return
    }
    try {
      const next = await toggleUnauthApiValid(row.id)
      row.valid = next
      ElMessage.success(next === 1 ? '已启用' : '已停用')
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '切换状态失败')
      }
    }
  }

  const confirmDelete = async (row: UnauthApiVO) => {
    if (!isUnauthDeletable(row)) {
      ElMessage.warning('该记录不允许删除')
      return
    }
    const label = row.summary || row.finalPath || row.id
    try {
      await ElMessageBox.confirm(`确定物理删除「${label}」？`, '确认', { type: 'warning' })
    } catch {
      return
    }
    try {
      await deleteUnauthApi(row.id!)
      ElMessage.success('删除成功')
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '删除失败')
      }
    }
  }

  return {
    keyword,
    validFilter,
    page,
    pageSize,
    total,
    loading,
    tableRows,
    onSearch,
    onReset,
    goCreate: editDrawer.openCreate,
    goEdit: editDrawer.openEdit,
    onToggleValid,
    confirmDelete,
    isUnauthEnabled,
    isUnauthDeletable,
    ...editDrawer,
  }
}
