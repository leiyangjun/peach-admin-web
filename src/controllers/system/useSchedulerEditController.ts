/**
 * 定时任务新建/编辑：表单、校验、保存与暂停/恢复。
 */
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { fetchJobTaskById, pauseJobTask, resumeJobTask, saveJobTask } from '../../api/jobTask'
import { fetchRegistryServices } from '../../api/permission'
import { CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
import { useButtonPermission } from '../../composables/useButtonPermission'
import type { ApiMetaDTO, RegistryServiceItem } from '../../models/permission'
import type { JobTaskFormModel, JobTaskSaveDTO } from '../../models/jobTask'
import { formTypeToJobType, jobTypeToFormType } from '../../models/jobTask'
import { useAppStore } from '../../stores/app'
import { normalizeQuartzCron } from '../../utils/quartzCron'

/** 定时任务列表页路径（与菜单 routePath、动态路由一致） */
const SCHEDULER_LIST_PATH = '/system/scheduler'

/** 重试次数：0～10 整数 */
const RETRY_MAX = 10
/** 需要重试（次数 ≥1）时：超时空则默认 5000，上限 15000 */
const RETRY_TIMEOUT_DEFAULT_MS = 5000
const RETRY_TIMEOUT_MAX_MS = 15000

function clampRetryMaxValue(value: number): number {
  return Math.min(RETRY_MAX, Math.max(0, Math.round(value)))
}

export function useSchedulerEditController() {
  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()

  const { hasButton } = useButtonPermission(SCHEDULER_LIST_PATH)

  const loading = ref(false)
  const submitLoading = ref(false)
  const toggleLoading = ref(false)
  const formRef = ref<FormInstance>()
  const registryServices = ref<RegistryServiceItem[]>([])
  const apiPickerVisible = ref(false)
  const shuttleModel = ref<ApiMetaDTO[]>([])

  const isEdit = computed(() => {
    const raw = route.params.id
    const s = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
    return !!(s && s !== 'new')
  })

  const form = reactive<JobTaskFormModel>({
    id: undefined,
    taskType: 'INTERNAL',
    name: '',
    description: '',
    cronExpression: '',
    enabled: true,
    retryMax: 0,
    retryIntervalMs: undefined,
    timeoutMs: undefined,
    headersJson: '',
    externalBaseUrl: '',
    urlPathExternal: '',
    serviceName: '',
    urlPathInternal: '',
    apiSummary: '',
    selectedApi: null,
  })

  const rules: FormRules = {
    name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
    retryIntervalMs: [
      {
        validator: (_rule, value, callback) => {
          if (form.retryMax >= 1) {
            if (value == null || Number(value) <= 0) {
              callback(new Error('请填写重试间隔'))
              return
            }
          }
          callback()
        },
        trigger: 'change',
      },
    ],
  }

  const cronFieldError = ref('')

  function clearCronFieldError() {
    cronFieldError.value = ''
  }

  function clearFormValidate() {
    clearCronFieldError()
    void nextTick(() => {
      formRef.value?.clearValidate()
    })
  }

  function validateCronOnSubmit(): boolean {
    const cron = normalizeQuartzCron(form.cronExpression.trim())
    if (!cron) {
      cronFieldError.value = '请配置 Cron 表达式'
      return false
    }
    clearCronFieldError()
    return true
  }

  const internalSchedulingApi = computed(() => {
    const path = form.urlPathInternal.trim()
    const svc = form.serviceName.trim()
    if (svc && path) {
      return `${svc} ${path}`
    }
    return path || svc
  })

  const externalSchedulingApi = computed({
    get() {
      const base = form.externalBaseUrl.trim()
      const path = form.urlPathExternal.trim()
      if (!base && !path) {
        return ''
      }
      if (!base) {
        return path
      }
      if (!path) {
        return base
      }
      const normalizedPath = path.startsWith('/') ? path : `/${path}`
      return `${base.replace(/\/+$/, '')}${normalizedPath}`
    },
    set(raw: string) {
      const value = raw.trim()
      if (!value) {
        form.externalBaseUrl = ''
        form.urlPathExternal = ''
        return
      }
      try {
        const url = new URL(value)
        form.externalBaseUrl = `${url.protocol}//${url.host}`
        const path = `${url.pathname}${url.search}${url.hash}`
        form.urlPathExternal = path || '/'
      } catch {
        if (value.startsWith('/')) {
          form.externalBaseUrl = ''
          form.urlPathExternal = value
        } else {
          form.externalBaseUrl = value.replace(/\/+$/, '')
          form.urlPathExternal = '/'
        }
      }
    },
  })

  function parseHeadersJson(): Record<string, string> | undefined {
    const raw = form.headersJson.trim()
    if (!raw) {
      return undefined
    }
    try {
      const o = JSON.parse(raw) as unknown
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        return o as Record<string, string>
      }
      throw new Error('须为 JSON 对象')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`请求头 JSON 无效: ${msg}`)
    }
  }

  function buildPayload(): JobTaskSaveDTO {
    const jobName = form.name.trim()
    const base = {
      jobName,
      jobGroup: 'DEFAULT',
      jobDescription: form.description.trim() || undefined,
      jobCronExpression: normalizeQuartzCron(form.cronExpression) ?? '',
      valid: form.enabled ? 1 : 0,
      httpMethod: 'GET',
      retryMax: clampRetryMaxValue(form.retryMax),
      retryIntervalMs: form.retryMax >= 1 ? form.retryIntervalMs : undefined,
      timeoutMs: form.retryMax >= 1 ? resolveRetryTimeoutMs() : undefined,
      jobType: formTypeToJobType(form.taskType),
      ...(form.id ? { id: form.id } : {}),
    }
    if (form.taskType === 'EXTERNAL') {
      const b = form.externalBaseUrl.trim()
      const p = form.urlPathExternal.trim()
      if (!b) {
        throw new Error('请填写调度 API 地址')
      }
      if (!p) {
        throw new Error('请填写调度 API 路径')
      }
      const headers = parseHeadersJson()
      return {
        ...base,
        externalBaseUrl: b.replace(/\/+$/, ''),
        urlPath: p.startsWith('/') ? p : `/${p}`,
        headers: headers ? JSON.stringify(headers) : undefined,
      }
    }
    if (!form.serviceName.trim()) {
      throw new Error('请选择平台 API（服务名称不能为空）')
    }
    if (!form.urlPathInternal.trim()) {
      throw new Error('请通过调度 API 选择器绑定一条管理端 GET 接口')
    }
    return {
      ...base,
      urlPath: form.urlPathInternal.trim(),
      serviceName: form.serviceName.trim(),
      jobDescription: form.apiSummary || form.description.trim() || undefined,
    }
  }

  function buildShuttleSeedFromForm(): ApiMetaDTO[] {
    const path = form.urlPathInternal.trim()
    const service = form.serviceName.trim()
    if (!path && !service) {
      return []
    }
    return [
      {
        method: (form.selectedApi?.method ?? 'GET').toUpperCase(),
        urlPath: path,
        summary: form.apiSummary || form.selectedApi?.summary,
        apiDesc: form.apiSummary || form.selectedApi?.apiDesc,
        serviceName: service || form.selectedApi?.serviceName,
        apiType: 'admin',
      },
    ]
  }

  const apiPickerInitialServiceId = computed(() => {
    const fromForm = form.serviceName.trim()
    if (fromForm) {
      return fromForm
    }
    return (form.selectedApi?.serviceName ?? '').trim()
  })

  function applyApiSelection(api: ApiMetaDTO | null) {
    if (!api) {
      form.selectedApi = null
      form.serviceName = ''
      form.urlPathInternal = ''
      form.apiSummary = ''
      shuttleModel.value = []
      return
    }
    form.selectedApi = { ...api }
    form.serviceName = (api.serviceName ?? '').trim()
    form.urlPathInternal = (api.urlPath ?? '').trim()
    form.apiSummary = api.summary ?? api.apiDesc ?? ''
    shuttleModel.value = [{ ...api }]
  }

  function closeCurrentTab() {
    const currentPath = route.fullPath
    appStore.removeTab(currentPath)
    void router.push(SCHEDULER_LIST_PATH)
  }

  async function loadRegistry() {
    try {
      registryServices.value = await fetchRegistryServices()
    } catch {
      registryServices.value = []
    }
  }

  async function loadEdit() {
    const raw = route.params.id
    const sid = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
    if (!sid || sid === 'new') {
      return
    }
    loading.value = true
    try {
      const row = await fetchJobTaskById(sid)
      form.id = String(row.id)
      form.taskType = jobTypeToFormType(row.jobType)
      form.name = row.jobName
      form.description = row.jobDescription ?? ''
      form.cronExpression =
        normalizeQuartzCron(row.jobCronExpression ?? '') || row.jobCronExpression || ''
      form.enabled = row.valid === 1
      form.retryMax = clampRetryMaxValue(row.retryMax ?? 0)
      form.retryIntervalMs = row.retryIntervalMs ?? undefined
      form.timeoutMs = row.timeoutMs ?? undefined
      normalizeRetryFieldsForMax(form.retryMax)
      form.headersJson = row.headers?.trim() ? row.headers : ''
      if (form.taskType === 'EXTERNAL') {
        form.externalBaseUrl = row.externalBaseUrl ?? ''
        form.urlPathExternal = row.urlPath ?? ''
        applyApiSelection(null)
      } else {
        form.externalBaseUrl = ''
        form.urlPathExternal = ''
        const sel: ApiMetaDTO = {
          method: (row.httpMethod ?? 'GET').toUpperCase(),
          urlPath: row.urlPath ?? '',
          summary: row.jobDescription ?? '',
          apiDesc: row.jobDescription ?? '',
          serviceName: row.serviceName == null ? undefined : String(row.serviceName).trim(),
          apiType: 'admin',
        }
        applyApiSelection(sel.urlPath || sel.serviceName ? sel : null)
      }
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '加载失败')
      closeCurrentTab()
    } finally {
      loading.value = false
      clearFormValidate()
    }
  }

  function openApiPicker() {
    if (loading.value) {
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
  }

  function resetForCreate() {
    form.id = undefined
    form.taskType = 'INTERNAL'
    form.name = ''
    form.description = ''
    form.cronExpression = ''
    form.enabled = true
    form.retryMax = 0
    form.retryIntervalMs = undefined
    form.timeoutMs = undefined
    form.headersJson = ''
    form.externalBaseUrl = ''
    form.urlPathExternal = ''
    applyApiSelection(null)
    clearFormValidate()
  }

  async function onSubmit() {
    const inst = formRef.value
    if (!inst) {
      return
    }
    try {
      await inst.validate()
    } catch {
      return
    }
    if (!validateCronOnSubmit()) {
      return
    }
    if (!validateRetryOnSubmit()) {
      return
    }
    let payload: JobTaskSaveDTO
    try {
      payload = buildPayload()
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '表单无效')
      return
    }
    submitLoading.value = true
    try {
      await saveJobTask(payload)
      ElMessage.success(isEdit.value ? '已保存' : '已创建')
      closeCurrentTab()
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      submitLoading.value = false
    }
  }

  async function onToggleEnabled() {
    if (!form.id) {
      return
    }
    toggleLoading.value = true
    try {
      if (form.enabled) {
        await pauseJobTask(form.id)
        form.enabled = false
        ElMessage.success('已暂停调度')
      } else {
        await resumeJobTask(form.id)
        form.enabled = true
        ElMessage.success('已恢复调度')
      }
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      toggleLoading.value = false
    }
  }

  function ensureRetryTimeoutDefault() {
    if (form.retryMax >= 1 && (form.timeoutMs == null || form.timeoutMs <= 0)) {
      form.timeoutMs = RETRY_TIMEOUT_DEFAULT_MS
    }
  }

  function clampRetryTimeout() {
    if (form.retryMax >= 1 && form.timeoutMs != null && form.timeoutMs > RETRY_TIMEOUT_MAX_MS) {
      form.timeoutMs = RETRY_TIMEOUT_MAX_MS
    }
  }

  function resolveRetryTimeoutMs(): number {
    let ms = form.timeoutMs
    if (ms == null || ms <= 0) {
      ms = RETRY_TIMEOUT_DEFAULT_MS
    }
    return Math.min(ms, RETRY_TIMEOUT_MAX_MS)
  }

  function normalizeRetryFieldsForMax(retryMax: number) {
    if (retryMax === 0) {
      form.retryIntervalMs = undefined
      form.timeoutMs = undefined
      return
    }
    ensureRetryTimeoutDefault()
    clampRetryTimeout()
  }

  function formatRetryMaxTooltip(val: number) {
    return `${val} 次`
  }

  function stepRetryMax(delta: number) {
    onRetryMaxChange(clampRetryMaxValue(form.retryMax + delta))
  }

  function onRetryMaxChange(val: number | undefined) {
    const next = clampRetryMaxValue(val ?? form.retryMax)
    form.retryMax = next
    if (next === 0) {
      form.retryIntervalMs = undefined
      form.timeoutMs = undefined
      void nextTick(() => {
        formRef.value?.clearValidate(['retryIntervalMs'])
      })
      return
    }
    ensureRetryTimeoutDefault()
    clampRetryTimeout()
  }

  function validateRetryOnSubmit(): boolean {
    if (form.retryMax >= 1) {
      if (form.retryIntervalMs == null || form.retryIntervalMs <= 0) {
        void nextTick(() => {
          formRef.value?.validateField('retryIntervalMs')
        })
        return false
      }
      ensureRetryTimeoutDefault()
      clampRetryTimeout()
    }
    return true
  }

  watch(
    () => form.taskType,
    (t, prev) => {
      if (t === 'EXTERNAL') {
        applyApiSelection(null)
      } else if (prev === 'EXTERNAL') {
        form.externalBaseUrl = ''
        form.urlPathExternal = ''
        form.headersJson = ''
      }
    },
  )

  watch(
    () => form.cronExpression,
    () => {
      if (cronFieldError.value) {
        clearCronFieldError()
      }
    },
  )

  onMounted(async () => {
    await loadRegistry()
    if (isEdit.value) {
      await loadEdit()
    } else {
      resetForCreate()
      clearFormValidate()
    }
  })

  return {
    CMN_BUTTON,
    CMN_BUTTON_LABEL,
    hasButton,
    RETRY_MAX,
    RETRY_TIMEOUT_MAX_MS,
    loading,
    submitLoading,
    toggleLoading,
    formRef,
    registryServices,
    apiPickerVisible,
    shuttleModel,
    isEdit,
    form,
    rules,
    cronFieldError,
    internalSchedulingApi,
    externalSchedulingApi,
    apiPickerInitialServiceId,
    closeCurrentTab,
    openApiPicker,
    onApiShuttleConfirm,
    onSubmit,
    onToggleEnabled,
    formatRetryMaxTooltip,
    stepRetryMax,
    onRetryMaxChange,
    clampRetryTimeout,
  }
}
