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
import {
  DEFAULT_PAGE_SIZE,
  buildPageParams,
  sliceRowsForPage,
} from '../../utils/pagination'
import type { UnauthApiPageQuery, UnauthApiVO } from '../../models/unauthApi'
import { isUnauthDeletable, isUnauthEnabled, UNAUTH_API_LIST_PATH } from '../../models/unauthApi'
import { useUnauthApiEditDrawer } from './useUnauthApiEditController'

export { UNAUTH_API_LIST_PATH }

export function useUnauthApiController() {
  const keyword = ref('')
  const accessTypeFilter = ref<number | undefined>(undefined)
  const validFilter = ref<number | undefined>(undefined)
  const page = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const total = ref(0)
  const loading = ref(false)
  const tableRows = ref<UnauthApiVO[]>([])
  /** 忽略过期的分页响应，避免并发请求乱序覆盖列表 */
  let listRequestSeq = 0

  const buildPageQuery = (): UnauthApiPageQuery => {
    const base: UnauthApiPageQuery = {
      ...buildPageParams(page.value, pageSize.value),
      sortName: 'editTime',
      sortType: 'desc',
    }
    const kw = keyword.value.trim()
    if (kw) {
      base.searchValue = kw
    }
    if (accessTypeFilter.value !== undefined && accessTypeFilter.value !== null) {
      base.accessType = accessTypeFilter.value as UnauthApiPageQuery['accessType']
    }
    if (validFilter.value !== undefined && validFilter.value !== null) {
      base.valid = validFilter.value
    }
    return base
  }

  const loadList = async () => {
    const query = buildPageQuery()
    const seq = ++listRequestSeq
    loading.value = true
    try {
      const data = await fetchUnauthApiPage(query)
      if (seq !== listRequestSeq) {
        return
      }
      tableRows.value = sliceRowsForPage(data.list ?? [], query.pageNum, query.pageSize)
      total.value = data.total ?? 0
    } catch (e) {
      if (seq !== listRequestSeq) {
        return
      }
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载列表失败')
      }
    } finally {
      if (seq === listRequestSeq) {
        loading.value = false
      }
    }
  }

  const editDrawer = useUnauthApiEditDrawer(() => {
    void loadList()
  })

  watch([page, pageSize, accessTypeFilter, validFilter], () => {
    void loadList()
  }, { immediate: true })

  const onSearch = () => {
    page.value = 1
    void loadList()
  }

  const onReset = () => {
    keyword.value = ''
    accessTypeFilter.value = undefined
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
    accessTypeFilter,
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
