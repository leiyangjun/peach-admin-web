<script setup lang="ts">
/**
 * 定时任务新建/编辑：与菜单编辑类似的卡片表单布局；平台类型通过网关 API 选择器绑定 GET 接口。
 */
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Minus, MoreFilled, Plus, QuestionFilled } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import ApiResourceShuttleDialog from '../../components/ApiResourceShuttleDialog.vue'
import VcrontabCronField from '../../components/VcrontabCronField.vue'
import type { ApiMetaDTO, RegistryServiceItem } from '../../models/permission'
import type { JobTaskFormModel } from '../../models/jobTask'
import { formTypeToJobType, jobTypeToFormType } from '../../models/jobTask'
import { fetchJobTaskById, pauseJobTask, resumeJobTask, saveJobTask } from '../../api/jobTask'
import { fetchRegistryServices } from '../../api/permission'
import { useAppStore } from '../../stores/app'
import { normalizeQuartzCron } from '../../utils/quartzCron'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

/** 定时任务列表页路径（与菜单 routePath、动态路由一致） */
const SCHEDULER_LIST_PATH = '/system/scheduler'

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

/** 重试次数：0～10 整数 */
const RETRY_MAX = 10
/** 需要重试（次数 ≥1）时：超时空则默认 5000，上限 15000 */
const RETRY_TIMEOUT_DEFAULT_MS = 5000
const RETRY_TIMEOUT_MAX_MS = 15000

function clampRetryMaxValue(value: number): number {
  return Math.min(RETRY_MAX, Math.max(0, Math.round(value)))
}

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

/** Cron 不走 el-form rules，避免新建/切换模式时自动标红；仅保存时手动校验 */
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

/** 平台类型：调度 API 展示（微服务 + 路径） */
const internalSchedulingApi = computed(() => {
  const path = form.urlPathInternal.trim()
  const svc = form.serviceName.trim()
  if (svc && path) {
    return `${svc} ${path}`
  }
  return path || svc
})

/** 外部类型：完整调度 URL（基址 + 路径） */
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

function parseHeadersJson(): Record<string, unknown> | undefined {
  const raw = form.headersJson.trim()
  if (!raw) {
    return undefined
  }
  try {
    const o = JSON.parse(raw) as unknown
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      return o as Record<string, unknown>
    }
    throw new Error('须为 JSON 对象')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`请求头 JSON 无效: ${msg}`)
  }
}

function buildPayload(): Record<string, unknown> {
  const jobName = form.name.trim()
  const base: Record<string, unknown> = {
    jobName,
    jobGroup: 'DEFAULT',
    jobDescription: form.description.trim() || undefined,
    jobCronExpression: normalizeQuartzCron(form.cronExpression),
    valid: form.enabled ? 1 : 0,
    httpMethod: 'GET',
    retryMax: clampRetryMaxValue(form.retryMax),
    retryIntervalMs: form.retryMax >= 1 ? form.retryIntervalMs : undefined,
    timeoutMs: form.retryMax >= 1 ? resolveRetryTimeoutMs() : undefined,
    jobType: formTypeToJobType(form.taskType),
  }
  if (form.id) {
    base.id = form.id
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

/** 由表单字段构造穿梭框右侧初始选中（编辑回显 / 再次打开选择器） */
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

/** 打开选择器时优先定位到已保存的微服务 serviceId */
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

/** 关闭编辑页签并回到定时任务列表（保存/取消后统一回列表选项卡） */
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
    form.cronExpression = normalizeQuartzCron(row.jobCronExpression ?? '') || row.jobCronExpression || ''
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
  let payload: Record<string, unknown>
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

/** 提交用：空则默认 5000，且不超过上限 */
function resolveRetryTimeoutMs(): number {
  let ms = form.timeoutMs
  if (ms == null || ms <= 0) {
    ms = RETRY_TIMEOUT_DEFAULT_MS
  }
  return Math.min(ms, RETRY_TIMEOUT_MAX_MS)
}

/** 重试次数为 0 时清空间隔与超时；≥1 时校正超时默认值与上限 */
function normalizeRetryFieldsForMax(retryMax: number) {
  if (retryMax === 0) {
    form.retryIntervalMs = undefined
    form.timeoutMs = undefined
    return
  }
  ensureRetryTimeoutDefault()
  clampRetryTimeout()
}

/** 用户调整重试次数时的联动（新增/编辑一致） */
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
</script>

<template>
  <div v-loading="loading" class="scheduler-edit-page">
    <el-card shadow="never" class="edit-card">
      <div class="editor-layout">
        <div class="form-scroll-area">
          <el-form
            ref="formRef"
            class="scheduler-edit-form scheduler-edit-form--compact"
            :model="form"
            :rules="rules"
            label-width="100px"
            size="default"
          >
            <div class="form-grid">
              <el-form-item label="任务名称" prop="name" class="form-grid__half">
                <el-input v-model="form.name" maxlength="200" show-word-limit placeholder="展示用名称" />
              </el-form-item>
              <el-form-item label="API类型" class="form-grid__half">
                <el-select v-model="form.taskType" class="w-full" :disabled="loading">
                  <el-option label="平台" value="INTERNAL" />
                  <el-option label="外部" value="EXTERNAL" />
                </el-select>
              </el-form-item>

              <el-form-item
                required
                class="form-grid__full form-item--cron form-item--label-tip"
                :error="cronFieldError"
                :show-message="Boolean(cronFieldError)"
              >
                <template #label>
                  <span class="label-with-tip">
                    <span class="label-with-tip__text">Cron 表达式</span>
                    <el-popover
                      placement="top"
                      :width="320"
                      :trigger="['hover', 'click']"
                      popper-class="cron-expr-popover"
                      :teleported="true"
                    >
                      <div class="cron-expr-tip">
                        <p><strong>常用：</strong>从下拉列表选择预设调度频率（如每分钟、每天 9 点），支持按名称、关键词或表达式片段搜索，选中即可生效。</p>
                        <p><strong>自定义：</strong>点击「配置 Cron」在弹窗中按秒、分、时、日等维度组合规则，适用于预设未覆盖的复杂场景。</p>
                      </div>
                      <template #reference>
                        <span class="tip-trigger" tabindex="0" role="button" aria-label="Cron 表达式说明">
                          <el-icon><QuestionFilled /></el-icon>
                        </span>
                      </template>
                    </el-popover>
                  </span>
                </template>
                <VcrontabCronField v-model="form.cronExpression" />
              </el-form-item>

              <template v-if="form.taskType === 'INTERNAL'">
                <el-form-item label="调度API" required class="form-grid__full form-item--api">
                  <el-input
                    :model-value="internalSchedulingApi"
                    readonly
                    placeholder="点击右侧按钮选择平台 API"
                  >
                    <template #append>
                      <el-button :icon="MoreFilled" :disabled="loading" title="选择 API" @click="openApiPicker" />
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item label="API描述" class="form-grid__full">
                  <el-input :model-value="form.apiSummary" type="textarea" :rows="2" readonly placeholder="选择 API 后自动填充" />
                </el-form-item>
              </template>

              <template v-else>
                <el-form-item label="调度API" required class="form-grid__full form-item--api">
                  <el-input
                    v-model="externalSchedulingApi"
                    placeholder="如 https://api.example.com/health"
                  />
                </el-form-item>

                <el-form-item label="API描述" class="form-grid__full">
                  <el-input
                    v-model="form.description"
                    type="textarea"
                    :rows="2"
                    maxlength="1000"
                    show-word-limit
                    placeholder="可选，用于说明此外部 API"
                  />
                </el-form-item>
              </template>

              <el-form-item label="重试次数" class="form-grid__half form-item--retry-max">
                <div class="retry-max-field">
                  <el-button
                    class="retry-max-field__btn"
                    :disabled="form.retryMax <= 0"
                    aria-label="减少重试次数"
                    @click="stepRetryMax(-1)"
                  >
                    <el-icon><Minus /></el-icon>
                  </el-button>
                  <el-slider
                    v-model="form.retryMax"
                    class="retry-max-field__slider"
                    :min="0"
                    :max="RETRY_MAX"
                    :step="1"
                    :show-tooltip="true"
                    :format-tooltip="formatRetryMaxTooltip"
                    @input="onRetryMaxChange"
                    @change="onRetryMaxChange"
                  />
                  <el-button
                    class="retry-max-field__btn"
                    :disabled="form.retryMax >= RETRY_MAX"
                    aria-label="增加重试次数"
                    @click="stepRetryMax(1)"
                  >
                    <el-icon><Plus /></el-icon>
                  </el-button>
                  <span class="retry-max-field__value" aria-live="polite">{{ form.retryMax }}</span>
                </div>
              </el-form-item>
              <el-form-item
                label="重试间隔"
                prop="retryIntervalMs"
                class="form-grid__half"
                :required="form.retryMax >= 1"
              >
                <el-input-number
                  v-model="form.retryIntervalMs"
                  :min="form.retryMax >= 1 ? 1 : 0"
                  :max="600000"
                  :step="500"
                  :disabled="form.retryMax === 0"
                  controls-position="right"
                  class="w-full"
                  placeholder="毫秒"
                />
              </el-form-item>

              <el-form-item class="form-grid__full form-item--label-tip">
                <template #label>
                  <span class="label-with-tip">
                    <span class="label-with-tip__text">请求超时</span>
                    <el-tooltip
                      content="启用重试时：单次请求超时，空则默认 5000ms，最大 15000ms；用尽重试后记录失败"
                      placement="top"
                    >
                      <span class="tip-trigger" tabindex="0" role="button" aria-label="请求超时说明">
                        <el-icon><QuestionFilled /></el-icon>
                      </span>
                    </el-tooltip>
                  </span>
                </template>
                <el-input-number
                  v-model="form.timeoutMs"
                  :min="1000"
                  :max="RETRY_TIMEOUT_MAX_MS"
                  :step="500"
                  :disabled="form.retryMax === 0"
                  controls-position="right"
                  class="w-full"
                  placeholder="默认 5000，最大 15000"
                  @change="clampRetryTimeout"
                />
              </el-form-item>

              <el-form-item v-if="form.taskType === 'EXTERNAL'" label="请求头" class="form-grid__full">
                <el-input
                  v-model="form.headersJson"
                  clearable
                  placeholder='JSON 对象，如 {"X-Debug":"1"}'
                />
              </el-form-item>
            </div>
          </el-form>
        </div>

        <div class="scheduler-edit-footer form-footer-bar">
          <div class="footer-actions">
            <el-button @click="closeCurrentTab">取消</el-button>
            <el-button type="primary" :loading="submitLoading" @click="onSubmit">保存</el-button>
            <el-button
              v-if="isEdit && form.id"
              :type="form.enabled ? 'warning' : 'success'"
              :loading="toggleLoading"
              plain
              @click="onToggleEnabled"
            >
              {{ form.enabled ? '暂停' : '恢复' }}
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <ApiResourceShuttleDialog
      v-model:visible="apiPickerVisible"
      v-model:model-value="shuttleModel"
      :registry-services="registryServices"
      :initial-service-id="apiPickerInitialServiceId"
      title-suffix="定时任务"
      :max-right="1"
      force-http-method="GET"
      @confirm="onApiShuttleConfirm"
    />
  </div>
</template>

<style scoped>
/**
 * 与 AdminLayout 内容区配合：.content 为 flex:1，子节点 flex:1 + 本页 height:100% 铺满可视区，
 * 避免卡片未拉高时底部露出 #f0f2f5 灰底。顶栏高度见 layout-header：工具条 52px + 页签行约 40px。
 */
.scheduler-edit-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  /* 与 AdminLayout 顶栏对齐：工具条 52px + 页签约 40px + .content 上下 padding 8+10 */
  min-height: calc(100vh - 52px - 40px - 18px);
  overflow: hidden;
  padding: 0;
  box-sizing: border-box;
}
.edit-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
}
.edit-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px 14px;
  overflow: hidden;
}
.editor-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
/** 表单区单独滚动，底部操作栏固定；overflow-x 隐藏避免 el-row gutter 负边距等引发横向滚动条 */
.form-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  padding-right: 2px;
}
.scheduler-edit-form {
  width: 100%;
  max-width: 660px;
  margin: 0 auto;
  box-sizing: border-box;
}
/** 双列网格替代 el-row gutter，避免负 margin 在窄容器内溢出 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
  align-items: start;
}
.form-grid__full {
  grid-column: 1 / -1;
}
.form-grid__half {
  min-width: 0;
}
@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
.form-footer-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 10px;
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}
.scheduler-edit-footer {
  padding-bottom: 2px;
}
.footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
}
.scheduler-edit-form--compact :deep(.el-form-item) {
  margin-bottom: 12px;
  min-width: 0;
}
.scheduler-edit-form--compact :deep(.el-form-item__content) {
  min-width: 0;
}
.scheduler-edit-form--compact :deep(.el-input),
.scheduler-edit-form--compact :deep(.el-textarea),
.scheduler-edit-form--compact :deep(.el-select),
.scheduler-edit-form--compact :deep(.el-input-number) {
  width: 100%;
}
.scheduler-edit-form--compact :deep(.el-input__wrapper),
.scheduler-edit-form--compact :deep(.el-textarea__inner) {
  box-sizing: border-box;
}
.scheduler-edit-form--compact .form-item--cron {
  margin-bottom: 10px;
}
/* 带问号的 label：文字右对齐，问号固定在最右侧同一列 */
.scheduler-edit-form--compact :deep(.form-item--label-tip .el-form-item__label) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  line-height: 32px;
  overflow: visible;
  pointer-events: auto;
}
.scheduler-edit-form--compact .form-item--cron :deep(.el-form-item__content) {
  align-items: stretch;
}
.scheduler-edit-form--compact .form-item--cron :deep(.vcrontab-field) {
  width: 100%;
}
.scheduler-edit-form--compact .form-item--cron :deep(.vcrontab-field__control) {
  width: 100%;
}
.scheduler-edit-form--compact .form-item--api {
  margin-bottom: 10px;
}
.scheduler-edit-form--compact .form-item--retry-max :deep(.el-form-item__content) {
  align-items: center;
}
.retry-max-field {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.retry-max-field__btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
}
.retry-max-field__slider {
  flex: 1;
  min-width: 0;
}
.retry-max-field__slider :deep(.el-slider__runway) {
  margin: 0 6px;
}
.retry-max-field__value {
  flex-shrink: 0;
  min-width: 22px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--el-text-color-regular);
  line-height: 1;
}
.w-full {
  width: 100%;
}
.label-with-tip {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  width: 100%;
  white-space: nowrap;
}
.label-with-tip__text {
  flex: 0 1 auto;
  text-align: right;
}
/* Cron 文案较长，略缩小字号以便与「请求超时」问号纵向对齐 */
.form-item--cron .label-with-tip__text {
  font-size: 12px;
  letter-spacing: -0.2px;
}
.tip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  outline: none;
  pointer-events: auto;
}
.tip-trigger .el-icon {
  font-size: 14px;
}
.tip-trigger:hover,
.tip-trigger:focus-visible {
  color: var(--el-color-primary);
}
</style>

<style>
.cron-expr-popover.el-popover {
  max-width: 320px;
}
.cron-expr-tip p {
  margin: 0 0 8px;
  line-height: 1.55;
  font-size: 13px;
}
.cron-expr-tip p:last-child {
  margin-bottom: 0;
}
.cron-expr-tip strong {
  font-weight: 600;
}
</style>
