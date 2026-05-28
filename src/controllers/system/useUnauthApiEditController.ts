/**
 * 免鉴权 API 抽屉新建/编辑：内部服务从穿梭框选择并带出 METHOD；外部接口手填 finalPath。
 */

import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { fetchUnauthApiById, saveUnauthApi } from '../../api/unauthApi'
import { fetchDiscoveryServices } from '../../api/discovery'
import { BTN_UI, CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
import { useButtonPermission } from '../../composables/useButtonPermission'
import type { ApiMetaDTO } from '../../models/permission'
import type { ServiceVO } from '../../models/discovery'
import type { UnauthApiType, UnauthApiVO } from '../../models/unauthApi'
import { UNAUTH_API_LIST_PATH } from '../../models/unauthApi'

const HTTP_METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export type UnauthApiDrawerMode = 'create' | 'edit'

function buildInternalFinalPathPreview(serviceName: string, urlPath: string): string {
  const sid = serviceName.trim()
  let path = urlPath.trim()
  if (!sid || !path) {
    return ''
  }
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  return `/${sid.replace(/^\/+/, '')}${path}`
}

function normalizeHttpMethod(raw: string | undefined | null): string {
  return (raw ?? '').trim().toUpperCase()
}

function isAllowedHttpMethod(method: string): boolean {
  return HTTP_METHOD_OPTIONS.includes(method as (typeof HTTP_METHOD_OPTIONS)[number])
}

function isExternalRow(row: Pick<UnauthApiVO, 'isExternal'>): boolean {
  return Number(row.isExternal) === 1
}

/** @param onSaved 保存成功后回调（通常刷新列表） */
export function useUnauthApiEditDrawer(onSaved?: () => void) {
  const { hasButton } = useButtonPermission(UNAUTH_API_LIST_PATH)

  const drawerVisible = ref(false)
  const drawerMode = ref<UnauthApiDrawerMode>('create')
  const detailLoading = ref(false)
  const submitLoading = ref(false)
  const formRef = ref<FormInstance>()
  const discoveryServices = ref<ServiceVO[]>([])
  const discoveryLoaded = ref(false)
  const apiPickerVisible = ref(false)
  const shuttleModel = ref<ApiMetaDTO[]>([])
  /** 回显/加载详情期间禁止 apiType watch 清空 finalPath */
  const suppressApiTypeWatch = ref(false)

  const drawerTitle = computed(() =>
    drawerMode.value === 'create' ? '新增免鉴权 API' : '编辑免鉴权 API',
  )

  const form = reactive({
    id: undefined as string | undefined,
    apiType: 'INTERNAL' as UnauthApiType,
    method: '',
    summary: '',
    enabled: true,
    serviceName: '',
    urlPath: '',
    finalPath: '',
    selectedApi: null as ApiMetaDTO | null,
  })

  const isInternal = computed(() => form.apiType === 'INTERNAL')

  function syncInternalHiddenFields() {
    form.finalPath = buildInternalFinalPathPreview(form.serviceName, form.urlPath)
  }

  /** 仅清理内部服务绑定字段，不触碰 finalPath / method（外部路径回显依赖 finalPath） */
  function clearInternalBindingOnly() {
    form.serviceName = ''
    form.urlPath = ''
    form.selectedApi = null
    shuttleModel.value = []
  }

  function clearInternalHiddenFields() {
    clearInternalBindingOnly()
    form.finalPath = ''
    form.method = ''
  }

  function resetForm() {
    form.id = undefined
    form.apiType = 'INTERNAL'
    form.method = ''
    form.summary = ''
    form.enabled = true
    clearInternalHiddenFields()
  }

  const apiPickerInitialServiceId = computed(() => {
    const fromForm = form.serviceName.trim()
    if (fromForm) {
      return fromForm
    }
    return (form.selectedApi?.serviceName ?? '').trim()
  })

  /** 仅提交时校验（不设 blur/change，避免打开抽屉即出现英文 required 提示） */
  const rules: FormRules = {
    finalPath: [
      {
        validator: (_rule, _value, callback) => {
          if (!form.finalPath.trim()) {
            callback(new Error('API路径没有填写'))
            return
          }
          const m = normalizeHttpMethod(form.method)
          if (!isAllowedHttpMethod(m)) {
            callback(
              new Error(
                form.apiType === 'INTERNAL' ? '请从 API 列表选择并带出 HTTP 方法' : '请选择 HTTP 方法',
              ),
            )
            return
          }
          callback()
        },
        trigger: [],
      },
    ],
  }

  async function ensureDiscoveryServices() {
    if (discoveryLoaded.value) {
      return
    }
    try {
      discoveryServices.value = await fetchDiscoveryServices()
    } catch {
      discoveryServices.value = []
    } finally {
      discoveryLoaded.value = true
    }
  }

  function closeDrawer() {
    drawerVisible.value = false
  }

  function openCreate() {
    drawerMode.value = 'create'
    resetForm()
    drawerVisible.value = true
    void ensureDiscoveryServices()
    void nextTick(() => formRef.value?.clearValidate())
  }

  function applyRowToForm(row: UnauthApiVO) {
    if (row.id != null) {
      form.id = String(row.id)
    }
    const loadedMethod = normalizeHttpMethod(row.method)
    form.method = isAllowedHttpMethod(loadedMethod) ? loadedMethod : ''
    form.summary = row.summary ?? ''
    form.enabled = row.valid === 1
    if (isExternalRow(row)) {
      clearInternalBindingOnly()
      form.finalPath = (row.finalPath ?? '').trim()
      if (!form.method) {
        form.method = 'GET'
      }
      form.apiType = 'EXTERNAL'
      return
    }
    form.apiType = 'INTERNAL'
    form.serviceName = (row.serviceName ?? '').trim()
    form.urlPath = (row.urlPath ?? '').trim()
    form.finalPath =
      (row.finalPath ?? '').trim() ||
      buildInternalFinalPathPreview(form.serviceName, form.urlPath)
    form.selectedApi = {
      method: row.method ?? '',
      urlPath: form.urlPath,
      summary: row.summary ?? '',
      serviceName: form.serviceName,
      apiType: 'admin',
    }
    shuttleModel.value = [{ ...form.selectedApi }]
  }

  async function loadDetail(id: string | number) {
    suppressApiTypeWatch.value = true
    detailLoading.value = true
    try {
      const row = await fetchUnauthApiById(id)
      applyRowToForm(row)
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '加载失败')
      closeDrawer()
    } finally {
      detailLoading.value = false
      await nextTick()
      suppressApiTypeWatch.value = false
      formRef.value?.clearValidate()
    }
  }

  function openEdit(row: UnauthApiVO) {
    if (row.id == null) {
      return
    }
    drawerMode.value = 'edit'
    resetForm()
    suppressApiTypeWatch.value = true
    applyRowToForm(row)
    drawerVisible.value = true
    void ensureDiscoveryServices()
    void loadDetail(row.id)
  }

  function applyApiSelection(api: ApiMetaDTO | null) {
    if (!api) {
      clearInternalHiddenFields()
      return
    }
    form.selectedApi = { ...api }
    form.serviceName = (api.serviceName ?? '').trim()
    form.urlPath = (api.urlPath ?? '').trim()
    const m = normalizeHttpMethod(api.method)
    if (isAllowedHttpMethod(m)) {
      form.method = m
    } else {
      form.method = ''
      if (m === 'ALL' || m) {
        ElMessage.warning('该 API 未指定具体 HTTP 方法，请换选其他接口')
      }
    }
    syncInternalHiddenFields()
    if (api.summary?.trim()) {
      form.summary = api.summary.trim()
    } else if (api.apiDesc?.trim()) {
      form.summary = api.apiDesc.trim()
    }
    shuttleModel.value = [{ ...api }]
  }

  function buildShuttleSeedFromForm(): ApiMetaDTO[] {
    const path = form.urlPath.trim()
    const service = form.serviceName.trim()
    if (!path && !service) {
      return []
    }
    const seedMethod = isAllowedHttpMethod(normalizeHttpMethod(form.method))
      ? normalizeHttpMethod(form.method)
      : normalizeHttpMethod(form.selectedApi?.method)
    return [
      {
        method: seedMethod || undefined,
        urlPath: path,
        summary: form.summary || form.selectedApi?.summary,
        apiDesc: form.selectedApi?.apiDesc,
        serviceName: service || form.selectedApi?.serviceName,
        apiType: 'admin',
      },
    ]
  }

  function openApiPicker() {
    if (detailLoading.value) {
      return
    }
    shuttleModel.value = buildShuttleSeedFromForm()
    apiPickerVisible.value = true
  }

  function onApiShuttleConfirm(apis: ApiMetaDTO[]) {
    const first = apis[0]
    if (!first) {
      applyApiSelection(null)
      return
    }
    const api = { ...first }
    if (!(api.serviceName ?? '').trim()) {
      api.serviceName = apiPickerInitialServiceId.value || undefined
    }
    applyApiSelection(api)
    void nextTick(() => formRef.value?.clearValidate('finalPath'))
  }

  function buildSavePayload(): UnauthApiVO {
    const method = normalizeHttpMethod(form.method)
    const base: UnauthApiVO = {
      id: form.id,
      method,
      summary: form.summary.trim() || undefined,
      valid: form.enabled ? 1 : 0,
      isExternal: form.apiType === 'EXTERNAL' ? 1 : 0,
    }
    if (form.apiType === 'EXTERNAL') {
      return {
        ...base,
        finalPath: form.finalPath.trim(),
        serviceName: undefined,
        urlPath: undefined,
      }
    }
    return {
      ...base,
      serviceName: form.serviceName.trim(),
      urlPath: form.urlPath.trim(),
      finalPath: form.finalPath.trim(),
    }
  }

  async function onSubmit() {
    const f = formRef.value
    if (!f) {
      return
    }
    try {
      await f.validate()
    } catch {
      return
    }
    submitLoading.value = true
    try {
      await saveUnauthApi(buildSavePayload())
      ElMessage.success('保存成功')
      closeDrawer()
      onSaved?.()
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      submitLoading.value = false
    }
  }

  watch(
    () => form.apiType,
    (type) => {
      if (!drawerVisible.value || detailLoading.value || suppressApiTypeWatch.value) {
        return
      }
      if (type === 'EXTERNAL') {
        clearInternalBindingOnly()
        form.finalPath = ''
        if (!isAllowedHttpMethod(normalizeHttpMethod(form.method))) {
          form.method = 'GET'
        }
      } else {
        clearInternalBindingOnly()
        form.finalPath = ''
        if (!form.serviceName.trim() && !form.urlPath.trim()) {
          form.method = ''
        }
      }
      void nextTick(() => formRef.value?.clearValidate())
    },
  )

  return {
    BTN_UI,
    CMN_BUTTON,
    CMN_BUTTON_LABEL,
    hasButton,
    drawerVisible,
    drawerMode,
    drawerTitle,
    detailLoading,
    submitLoading,
    formRef,
    discoveryServices,
    apiPickerVisible,
    shuttleModel,
    isInternal,
    form,
    rules,
    httpMethodOptions: HTTP_METHOD_OPTIONS,
    apiPickerInitialServiceId,
    openCreate,
    openEdit,
    closeDrawer,
    openApiPicker,
    onApiShuttleConfirm,
    onSubmit,
  }
}
