/**
 * 网关 Admin API 列表拉取：防抖、请求代际取消、可选自定义 listApis。
 */
import { onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchGatewayAdminApis } from '../api/permission'
import type { ApiMetaDTO } from '../models/permission'
import { isSessionExpiredError } from '../utils/sessionExpired'

export type GatewayAdminApiLoadReason = 'service' | 'search'

export interface UseGatewayAdminApiFetchOptions {
  /** 自定义拉取；不传则走网关 fetchGatewayAdminApis */
  listApis?: (serviceId: string, method?: string, keyword?: string) => Promise<ApiMetaDTO[]>
  /** 服务切换后自动拉取的防抖毫秒数 */
  serviceChangeDebounceMs?: number
  /** 关键字输入防抖毫秒数 */
  keywordDebounceMs?: number
  /** 拉取后按 HTTP 方法过滤（如定时任务仅 GET） */
  filterMethod?: string
}

export function useGatewayAdminApiFetch(options: UseGatewayAdminApiFetchOptions = {}) {
  const serviceId = ref('')
  const method = ref('')
  const keyword = ref('')
  const listLoading = ref(false)
  const rawList = ref<ApiMetaDTO[]>([])

  let fetchGeneration = 0
  let serviceDebounceTimer: ReturnType<typeof setTimeout> | null = null
  let keywordDebounceTimer: ReturnType<typeof setTimeout> | null = null

  function clearServiceDebounceTimer() {
    if (serviceDebounceTimer != null) {
      clearTimeout(serviceDebounceTimer)
      serviceDebounceTimer = null
    }
  }

  function clearKeywordDebounceTimer() {
    if (keywordDebounceTimer != null) {
      clearTimeout(keywordDebounceTimer)
      keywordDebounceTimer = null
    }
  }

  onBeforeUnmount(() => {
    clearServiceDebounceTimer()
    clearKeywordDebounceTimer()
  })

  function applyMethodFilter(list: ApiMetaDTO[]): ApiMetaDTO[] {
    const only = (options.filterMethod ?? '').trim().toUpperCase()
    if (!only) {
      return list
    }
    return list.filter((a) => (a.method ?? 'GET').toUpperCase() === only)
  }

  /**
   * 拉取当前服务下的 Admin API 列表。
   * @returns 是否完成本次请求（未被新请求取代）
   */
  async function loadList(_reason: GatewayAdminApiLoadReason): Promise<boolean> {
    const sid = (serviceId.value ?? '').trim()
    if (!sid) {
      fetchGeneration += 1
      rawList.value = []
      return true
    }

    const gen = ++fetchGeneration
    listLoading.value = true
    try {
      const m = (method.value ?? '').trim()
      const kw = (keyword.value ?? '').trim()
      let list: ApiMetaDTO[]
      if (options.listApis) {
        list = await options.listApis(sid, m || undefined, kw || undefined)
      } else {
        list = await fetchGatewayAdminApis(sid, m || undefined, kw || undefined)
      }
      if (gen !== fetchGeneration) {
        return false
      }
      rawList.value = applyMethodFilter(list)
      return true
    } catch (e) {
      if (gen !== fetchGeneration) {
        return false
      }
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '拉取 Admin API 失败')
      }
      rawList.value = []
      return true
    } finally {
      if (gen === fetchGeneration) {
        listLoading.value = false
      }
    }
  }

  /** 服务切换防抖后执行 onFire（由调用方包装 loadList 等） */
  function scheduleServiceLoad(autoLoad: boolean, onFire: () => void) {
    clearServiceDebounceTimer()
    if (!autoLoad) {
      return
    }
    const ms = options.serviceChangeDebounceMs ?? 0
    if (ms <= 0) {
      onFire()
      return
    }
    serviceDebounceTimer = setTimeout(() => {
      serviceDebounceTimer = null
      onFire()
    }, ms)
  }

  function onSearchClick() {
    clearServiceDebounceTimer()
    clearKeywordDebounceTimer()
    void loadList('search')
  }

  return {
    serviceId,
    method,
    keyword,
    listLoading,
    rawList,
    loadList,
    scheduleServiceLoad,
    onSearchClick,
    clearServiceDebounceTimer,
    clearKeywordDebounceTimer,
  }
}
