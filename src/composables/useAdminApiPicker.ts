/**
 * 网关 Admin API 选择面板：服务切换拉取、筛选、表格多选同步。
 */
import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { ElTable } from 'element-plus'
import type { ApiMetaDTO } from '../models/permission'
import { useGatewayAdminApiFetch } from './useGatewayAdminApiFetch'

/** 与菜单权限弹窗一致的行主键 */
export function apiRowKeyFn(row: ApiMetaDTO) {
  return `${(row.method ?? '').toUpperCase()}::${row.urlPath ?? ''}`
}

export interface UseAdminApiPickerOptions {
  boundApis: Ref<ApiMetaDTO[]>
  autoLoad?: boolean
  serviceChangeDebounceMs?: number
  onSelectionChange: (rows: ApiMetaDTO[]) => void
  onServiceChange?: (serviceId: string) => void
}

export function useAdminApiPicker(options: UseAdminApiPickerOptions) {
  const tableRef = ref<InstanceType<typeof ElTable> | null>(null)

  const fetch = useGatewayAdminApiFetch({
    serviceChangeDebounceMs: options.serviceChangeDebounceMs ?? 300,
  })

  let keywordDebounceTimer: ReturnType<typeof setTimeout> | null = null

  function clearKeywordDebounceTimer() {
    if (keywordDebounceTimer != null) {
      clearTimeout(keywordDebounceTimer)
      keywordDebounceTimer = null
    }
  }

  onBeforeUnmount(() => {
    clearKeywordDebounceTimer()
  })

  /** 根据已绑快照恢复表格勾选 */
  async function syncSelectionFromBound() {
    await nextTick()
    const table = tableRef.value
    if (!table) {
      return
    }
    table.clearSelection()
    for (const row of fetch.rawList.value) {
      const hit = options.boundApis.value.some((b) => apiRowKeyFn(b) === apiRowKeyFn(row))
      if (hit) {
        table.toggleRowSelection(row, true)
      }
    }
  }

  async function loadList(reason: 'service' | 'search') {
    const sid = (fetch.serviceId.value ?? '').trim()
    if (!sid) {
      await fetch.loadList(reason)
      await nextTick()
      tableRef.value?.clearSelection()
      options.onSelectionChange([])
      return
    }
    const completed = await fetch.loadList(reason)
    if (!completed) {
      return
    }
    await syncSelectionFromBound()
    if (reason === 'service') {
      options.onServiceChange?.(sid)
    }
  }

  watch(
    () => fetch.serviceId.value ?? '',
    () => {
      fetch.scheduleServiceLoad(options.autoLoad !== false, () => {
        void loadList('service')
      })
    },
  )

  watch(
    () => fetch.method.value ?? '',
    () => {
      if ((fetch.serviceId.value ?? '').trim()) {
        fetch.clearServiceDebounceTimer()
        void loadList('search')
      }
    },
  )

  watch(fetch.keyword, () => {
    if (!(fetch.serviceId.value ?? '').trim()) {
      return
    }
    clearKeywordDebounceTimer()
    keywordDebounceTimer = setTimeout(() => {
      keywordDebounceTimer = null
      void loadList('search')
    }, 400)
  })

  function onSearchClick() {
    fetch.clearServiceDebounceTimer()
    clearKeywordDebounceTimer()
    void loadList('search')
  }

  function onKeywordEnter() {
    onSearchClick()
  }

  function onTableSelectionChange(rows: ApiMetaDTO[]) {
    options.onSelectionChange(rows)
  }

  return {
    tableRef,
    serviceId: fetch.serviceId,
    method: fetch.method,
    keyword: fetch.keyword,
    listLoading: fetch.listLoading,
    tableData: fetch.rawList,
    apiRowKeyFn,
    onSearchClick,
    onKeywordEnter,
    onTableSelectionChange,
    reload: () => loadList('search'),
  }
}
