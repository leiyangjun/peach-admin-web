<script setup lang="ts">
/**
 * 定时任务新建/编辑：与菜单编辑类似的卡片表单布局；平台类型通过网关 API 选择器绑定 GET 接口。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MoreFilled, QuestionFilled } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import ApiResourceShuttleDialog from '../../components/ApiResourceShuttleDialog.vue'
import VcrontabCronField from '../../components/VcrontabCronField.vue'
import type { ApiMetaDTO, RegistryServiceItem } from '../../models/permission'
import type { JobTaskFormModel } from '../../models/jobTask'
import { formTypeToJobType, jobTypeToFormType } from '../../models/jobTask'
import { fetchJobTaskById, pauseJobTask, resumeJobTask, saveJobTask } from '../../api/jobTask'
import { fetchRegistryServices } from '../../api/permission'
import { useAppStore } from '../../stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

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
  timeoutMs: 30000,
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
  cronExpression: [{ required: true, message: '请配置 Cron', trigger: 'change' }],
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

function normalizeQuartzCron(expr: string): string {
  const t = expr.trim()
  if (!t) {
    return t
  }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 5) {
    return `0 ${t}`
  }
  return t
}

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
    retryMax: form.retryMax,
    retryIntervalMs: form.retryIntervalMs != null && form.retryIntervalMs > 0 ? form.retryIntervalMs : undefined,
    timeoutMs: form.timeoutMs,
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

/** 关闭当前页签并回到相邻页签（与 AdminLayout handleTabRemove 一致） */
function closeCurrentTab() {
  const currentPath = route.fullPath
  appStore.removeTab(currentPath)
  const fallback = appStore.tabs[appStore.tabs.length - 1]?.path || '/system/scheduler'
  void router.push(fallback)
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
    form.cronExpression = row.jobCronExpression
    form.enabled = row.valid === 1
    form.retryMax = row.retryMax
    form.retryIntervalMs = row.retryIntervalMs ?? undefined
    form.timeoutMs = row.timeoutMs
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
  form.timeoutMs = 30000
  form.headersJson = ''
  form.externalBaseUrl = ''
  form.urlPathExternal = ''
  applyApiSelection(null)
}

async function onSubmit() {
  const inst = formRef.value
  if (!inst) {
    return
  }
  await inst.validate().catch(() => Promise.reject())
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

onMounted(async () => {
  await loadRegistry()
  if (isEdit.value) {
    await loadEdit()
  } else {
    resetForCreate()
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

              <el-form-item label="cron表达式" prop="cronExpression" class="form-grid__full form-item--cron">
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

              <el-form-item label="重试次数" class="form-grid__half">
                <el-input-number v-model="form.retryMax" :min="0" :max="20" controls-position="right" class="w-full" />
              </el-form-item>
              <el-form-item label="重试间隔" class="form-grid__half">
                <el-input-number
                  v-model="form.retryIntervalMs"
                  :min="0"
                  :max="600000"
                  :step="500"
                  controls-position="right"
                  class="w-full"
                  placeholder="毫秒"
                />
              </el-form-item>

              <el-form-item class="form-grid__full">
                <template #label>
                  <span class="label-with-tip">
                    请求超时
                    <el-tooltip
                      content="HTTP 请求超时后按重试策略重试；用尽重试次数后记录为失败"
                      placement="top"
                    >
                      <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                    </el-tooltip>
                  </span>
                </template>
                <el-input-number v-model="form.timeoutMs" :min="1000" :max="600000" :step="1000" controls-position="right" class="w-full" />
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
.scheduler-edit-form--compact .form-item--api {
  margin-bottom: 10px;
}
.w-full {
  width: 100%;
}
.label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.tip-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  cursor: help;
}
</style>
