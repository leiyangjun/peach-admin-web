<script setup lang="ts">
/**
 * 绑定 API 资源：服务下拉 + 方法/关键字拉取全量 Admin API，左右穿梭，前端分页。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CMN_BUTTON, CMN_BUTTON_LABEL } from '../constants/cmnButton'
import { fetchGatewayAdminApis } from '../api/permission'
import type { ApiMetaDTO, RegistryServiceItem } from '../models/permission'
import { isSessionExpiredError } from '../utils/sessionExpired'

function apiRowKeyFn(row: ApiMetaDTO) {
  return `${(row.method ?? '').toUpperCase()}::${row.urlPath ?? ''}`
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    registryServices: RegistryServiceItem[]
    /** 打开时右侧已选（回显） */
    modelValue?: ApiMetaDTO[]
    /** 弹窗标题中的按钮展示名，与 titleSuffix 二选一优先用本字段 */
    buttonLabel?: string
    /** 标题后缀别名，效果同 buttonLabel */
    titleSuffix?: string
    /** 自定义拉取 API 列表（如经 job-service 直连微服务）；不传则走网关 */
    listApis?: (serviceId: string, method?: string, keyword?: string) => Promise<ApiMetaDTO[]>
    /** 右侧最多条数；定时任务等场景传 1 实现单选 */
    maxRight?: number
    /** 固定 HTTP 方法（如 GET），隐藏方法下拉并不再传其它 method */
    forceHttpMethod?: string
    /** 打开时优先选中的注册 serviceId（高于列表首项） */
    initialServiceId?: string
  }>(),
  {
    modelValue: () => [],
    buttonLabel: '',
    titleSuffix: '',
    maxRight: undefined,
    forceHttpMethod: '',
    initialServiceId: '',
  },
)

const emit = defineEmits<{
  'update:visible': [v: boolean]
  'update:modelValue': [apis: ApiMetaDTO[]]
  confirm: [apis: ApiMetaDTO[]]
}>()

const innerVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

/** 标题：有按钮名时为「绑定（名称）API」，否则「绑定API资源」 */
const dialogTitle = computed(() => {
  const tag = (props.buttonLabel || props.titleSuffix || '').trim()
  return tag ? `绑定（${tag}）API` : '绑定API资源'
})

const serviceId = ref('')
const method = ref('')
const keyword = ref('')
const listLoading = ref(false)
/** 当前服务拉取结果（请求携带 method/keyword，与 Swagger 一致），左侧分页基于此 */
const rawList = ref<ApiMetaDTO[]>([])

const rightList = ref<ApiMetaDTO[]>([])

const leftPage = ref(1)
const leftPageSize = ref(10)

const httpMethodOptions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const

const forceMethodLock = computed(() => (props.forceHttpMethod ?? '').trim())

const methodSelectOptions = computed(() => {
  const f = (props.forceHttpMethod ?? '').trim().toUpperCase()
  if (f) {
    return [f] as readonly string[]
  }
  return httpMethodOptions
})

const rightKeySet = computed(() => new Set(rightList.value.map(apiRowKeyFn)))

const leftTotal = computed(() => rawList.value.length)

const leftPaged = computed(() => {
  const start = (leftPage.value - 1) * leftPageSize.value
  return rawList.value.slice(start, start + leftPageSize.value)
})

/** 左侧行高亮：已在右侧的 API */
function leftApiRowClassName({ row }: { row: ApiMetaDTO }) {
  return rightKeySet.value.has(apiRowKeyFn(row)) ? 'shuttle-row--picked' : ''
}

async function loadApis() {
  const sid = (serviceId.value ?? '').trim()
  if (!sid) {
    rawList.value = []
    return
  }
  listLoading.value = true
  try {
    const forced = (props.forceHttpMethod ?? '').trim()
    const m = forced || (method.value ?? '').trim()
    const kw = (keyword.value ?? '').trim()
    let list: ApiMetaDTO[]
    if (props.listApis) {
      list = await props.listApis(sid, m || undefined, kw || undefined)
    } else {
      list = await fetchGatewayAdminApis(sid, m || undefined, kw || undefined)
    }
    const only = (props.forceHttpMethod ?? '').trim().toUpperCase()
    rawList.value =
      only === 'GET' ? list.filter((a) => (a.method ?? 'GET').toUpperCase() === 'GET') : list
    leftPage.value = 1
  } catch (e) {
    if (!isSessionExpiredError(e)) {
      ElMessage.error(e instanceof Error ? e.message : '拉取 Admin API 失败')
    }
    rawList.value = []
  } finally {
    listLoading.value = false
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      const svcs = props.registryServices
      const fromModel = (props.modelValue ?? []).find((x) => (x.serviceName ?? '').trim())?.serviceName?.trim()
      const initSid =
        (props.initialServiceId ?? '').trim() || fromModel || (svcs.length ? svcs[0]!.serviceId : '')
      serviceId.value = initSid
      method.value = (props.forceHttpMethod ?? '').trim() || ''
      keyword.value = ''
      rightList.value = (props.modelValue ?? []).map((x) => ({ ...x }))
      rawList.value = []
      leftPage.value = 1
    }
  },
)

watch(serviceId, () => {
  if (props.visible) {
    void loadApis()
  }
})

let keywordSearchTimer: ReturnType<typeof setTimeout> | null = null

watch(keyword, () => {
  if (!props.visible) {
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

function onSearch() {
  if (keywordSearchTimer != null) {
    clearTimeout(keywordSearchTimer)
    keywordSearchTimer = null
  }
  void loadApis()
}

function addLeft(row: ApiMetaDTO) {
  const k = apiRowKeyFn(row)
  if (props.maxRight === 1) {
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

watch(method, () => {
  if (props.visible) {
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

function onConfirm() {
  const sid = (serviceId.value ?? '').trim()
  const stamped = rightList.value.map((r) => ({
    ...r,
    serviceName: (r.serviceName ?? '').trim() || sid || undefined,
  }))
  emit('update:modelValue', [...stamped])
  emit('confirm', [...stamped])
  innerVisible.value = false
}

function onCancel() {
  innerVisible.value = false
}
</script>

<template>
  <el-dialog
    v-model="innerVisible"
    :title="dialogTitle"
    width="880px"
    class="api-shuttle-dialog"
    append-to-body
    destroy-on-close
  >
    <div v-if="!registryServices.length" class="api-shuttle-empty">
      <el-alert type="warning" show-icon :closable="false" title="暂无可选微服务，无法拉取 Admin API 目录。" />
    </div>
    <template v-else>
      <div class="api-shuttle-toolbar">
        <el-select v-model="serviceId" filterable placeholder="微服务" class="api-svc">
          <el-option
            v-for="s in registryServices"
            :key="s.serviceId"
            :label="s.displayName"
            :value="s.serviceId"
          />
        </el-select>
        <el-select
          v-if="!forceMethodLock"
          v-model="method"
          clearable
          placeholder="HTTP 方法"
          class="api-method"
        >
          <el-option label="全部" value="" />
          <el-option v-for="m in methodSelectOptions" :key="m" :label="m" :value="m" />
        </el-select>
        <el-input
          v-model="keyword"
          clearable
          placeholder="路径/摘要关键字"
          class="api-kw"
          @keyup.enter="onSearch"
        />
        <el-button type="primary" :loading="listLoading" @click="onSearch">{{ CMN_BUTTON_LABEL[CMN_BUTTON.QUERY] }}</el-button>
      </div>
      <div class="shuttle-body">
        <div class="shuttle-col">
          <div class="shuttle-col-title">可选 API</div>
          <div class="shuttle-table-wrap">
            <el-table
              v-loading="listLoading"
              :data="leftPaged"
              :row-class-name="leftApiRowClassName"
              size="small"
              border
              stripe
              height="220"
              class="shuttle-table"
              :row-key="apiRowKeyFn"
              @row-click="(row: ApiMetaDTO) => addLeft(row)"
            >
              <template #empty>
                <el-empty description="暂无数据，请切换服务或点「搜索」拉取列表" :image-size="48" />
              </template>
              <el-table-column prop="method" label="方法" width="72" />
              <el-table-column prop="urlPath" label="路径" min-width="160" show-overflow-tooltip />
              <el-table-column prop="summary" label="摘要" min-width="100" show-overflow-tooltip />
            </el-table>
          </div>
          <el-pagination
            v-model:current-page="leftPage"
            layout="prev, pager, next, total"
            :total="leftTotal"
            :page-size="leftPageSize"
            small
            class="shuttle-pager"
            background
          />
        </div>
        <div class="shuttle-col">
          <div class="shuttle-col-title">已选 API</div>
          <div class="shuttle-table-wrap">
            <el-table
              :data="rightList"
              size="small"
              border
              stripe
              height="220"
              class="shuttle-table"
              :row-key="apiRowKeyFn"
              @row-click="(row: ApiMetaDTO) => removeRight(row)"
            >
              <template #empty>
                <el-empty description="从左侧添加" :image-size="48" />
              </template>
              <el-table-column prop="method" label="方法" width="72" />
              <el-table-column prop="urlPath" label="路径" min-width="160" show-overflow-tooltip />
              <el-table-column prop="summary" label="摘要" min-width="100" show-overflow-tooltip />
            </el-table>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <el-button @click="onCancel">{{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}</el-button>
      <el-button type="primary" :disabled="!registryServices.length" @click="onConfirm">
        {{ CMN_BUTTON_LABEL[CMN_BUTTON.SAVE] }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.api-shuttle-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
  max-height: 460px;
  overflow: hidden;
}

.api-shuttle-empty {
  min-height: 80px;
}

.api-shuttle-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.api-svc {
  width: 240px;
}

.api-method {
  width: 120px;
}

.api-kw {
  width: 200px;
  max-width: 100%;
}

.shuttle-body {
  display: flex;
  gap: 12px;
  align-items: stretch;
  min-height: 0;
  max-height: 320px;
}

.shuttle-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.shuttle-col-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
}

.shuttle-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.shuttle-table :deep(.el-table__body tr) {
  cursor: pointer;
}

.shuttle-table :deep(tr.shuttle-row--picked > td) {
  background-color: var(--el-fill-color-light);
}

.shuttle-pager {
  margin-top: 8px;
  justify-content: center;
}
</style>
