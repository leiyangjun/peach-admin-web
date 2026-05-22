/**
 * API 资源穿梭框：服务下拉、左右列表、分页与确认。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ApiMetaDTO, RegistryServiceItem } from '../models/permission'
import { apiRowKeyFn } from './useAdminApiPicker'
import { useGatewayAdminApiFetch } from './useGatewayAdminApiFetch'

export interface UseApiResourceShuttleOptions {
  visible: () => boolean
  registryServices: () => RegistryServiceItem[]
  modelValue: () => ApiMetaDTO[]
  initialServiceId: () => string
  forceHttpMethod: () => string
  maxRight?: () => number | undefined
  listApis?: (serviceId: string, method?: string, keyword?: string) => Promise<ApiMetaDTO[]>
  onUpdateModelValue: (apis: ApiMetaDTO[]) => void
  onConfirm: (apis: ApiMetaDTO[]) => void
  onClose: () => void
}

export function useApiResourceShuttle(options: UseApiResourceShuttleOptions) {
  const fetch = useGatewayAdminApiFetch({
    listApis: options.listApis,
    filterMethod: options.forceHttpMethod()?.trim().toUpperCase() === 'GET' ? 'GET' : undefined,
  })

  const rightList = ref<ApiMetaDTO[]>([])
  const leftPage = ref(1)
  const leftPageSize = ref(10)

  let keywordSearchTimer: ReturnType<typeof setTimeout> | null = null

  const forceMethodLock = computed(() => (options.forceHttpMethod() ?? '').trim())

  const methodSelectOptions = computed(() => {
    const f = (options.forceHttpMethod() ?? '').trim().toUpperCase()
    if (f) {
      return [f] as readonly string[]
    }
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const
  })

  const rightKeySet = computed(() => new Set(rightList.value.map(apiRowKeyFn)))

  const leftTotal = computed(() => fetch.rawList.value.length)

  const leftPaged = computed(() => {
    const start = (leftPage.value - 1) * leftPageSize.value
    return fetch.rawList.value.slice(start, start + leftPageSize.value)
  })

  function leftApiRowClassName({ row }: { row: ApiMetaDTO }) {
    return rightKeySet.value.has(apiRowKeyFn(row)) ? 'shuttle-row--picked' : ''
  }

  async function loadApis() {
    const completed = await fetch.loadList('search')
    if (completed) {
      leftPage.value = 1
    }
  }

  watch(
    () => options.visible(),
    (v) => {
      if (v) {
        const svcs = options.registryServices()
        const fromModel = (options.modelValue() ?? [])
          .find((x) => (x.serviceName ?? '').trim())
          ?.serviceName?.trim()
        const initSid =
          (options.initialServiceId() ?? '').trim() ||
          fromModel ||
          (svcs.length ? svcs[0]!.serviceId : '')
        fetch.serviceId.value = initSid
        fetch.method.value = (options.forceHttpMethod() ?? '').trim() || ''
        fetch.keyword.value = ''
        rightList.value = (options.modelValue() ?? []).map((x) => ({ ...x }))
        fetch.rawList.value = []
        leftPage.value = 1
      }
    },
  )

  watch(fetch.serviceId, () => {
    if (options.visible()) {
      void loadApis()
    }
  })

  watch(fetch.keyword, () => {
    if (!options.visible()) {
      return
    }
    leftPage.value = 1
    if (keywordSearchTimer != null) {
      clearTimeout(keywordSearchTimer)
    }
    keywordSearchTimer = setTimeout(() => {
      keywordSearchTimer = null
      void loadApis()
    }, 400)
  })

  watch(fetch.method, () => {
    if (options.visible()) {
      leftPage.value = 1
      void loadApis()
    }
  })

  onBeforeUnmount(() => {
    if (keywordSearchTimer != null) {
      clearTimeout(keywordSearchTimer)
      keywordSearchTimer = null
    }
  })

  function onSearch() {
    if (keywordSearchTimer != null) {
      clearTimeout(keywordSearchTimer)
      keywordSearchTimer = null
    }
    void loadApis()
  }

  function addLeft(row: ApiMetaDTO) {
    const k = apiRowKeyFn(row)
    const maxRight = options.maxRight?.()
    if (maxRight === 1) {
      if (rightList.value.length === 1 && rightList.value.some((r) => apiRowKeyFn(r) === k)) {
        return
      }
      rightList.value = [{ ...row }]
      return
    }
    if (rightList.value.some((r) => apiRowKeyFn(r) === k)) {
      return
    }
    rightList.value = [...rightList.value, { ...row }]
  }

  function removeRight(row: ApiMetaDTO) {
    const k = apiRowKeyFn(row)
    rightList.value = rightList.value.filter((r) => apiRowKeyFn(r) !== k)
  }

  function onConfirm() {
    const sid = (fetch.serviceId.value ?? '').trim()
    const stamped = rightList.value.map((r) => ({
      ...r,
      serviceName: (r.serviceName ?? '').trim() || sid || undefined,
    }))
    options.onUpdateModelValue([...stamped])
    options.onConfirm([...stamped])
    options.onClose()
  }

  function onCancel() {
    options.onClose()
  }

  return {
    serviceId: fetch.serviceId,
    method: fetch.method,
    keyword: fetch.keyword,
    listLoading: fetch.listLoading,
    rawList: fetch.rawList,
    rightList,
    leftPage,
    leftPageSize,
    forceMethodLock,
    methodSelectOptions,
    leftTotal,
    leftPaged,
    leftApiRowClassName,
    apiRowKeyFn,
    onSearch,
    addLeft,
    removeRight,
    onConfirm,
    onCancel,
  }
}
