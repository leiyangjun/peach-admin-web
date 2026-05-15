<script setup lang="ts">
/**
 * 网关 Admin API 选择面板：服务切换自动拉取（可防抖）、HTTP 方法/关键字筛选与手动搜索、表格多选。
 * 可与 el-dialog 组合使用，便于多处复用。
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ElTable } from 'element-plus'
import { ElMessage } from 'element-plus'

import { fetchGatewayAdminApis } from '../../api/permission'
import type { ApiMetaDTO, RegistryServiceItem } from '../../models/permission'
import { isSessionExpiredError } from '../../utils/sessionExpired'

/** 与菜单权限弹窗一致的行主键，用于多选与已绑 API 对齐 */
function apiRowKeyFn(row: ApiMetaDTO) {
  return `${(row.method ?? '').toUpperCase()}::${row.urlPath ?? ''}`
}

const props = withDefaults(
  defineProps<{
    /** 注册中心服务列表 */
    registryServices: RegistryServiceItem[]
    /** 打开弹窗时服务端已绑定的 API，用于列表加载后默认勾选 */
    boundApis: ApiMetaDTO[]
    /** 为 false 时仅切换服务不自动请求（极少用） */
    autoLoad?: boolean
    /** 服务切换后自动拉取的防抖毫秒数 */
    serviceChangeDebounceMs?: number
  }>(),
  {
    autoLoad: true,
    serviceChangeDebounceMs: 300,
  },
)

const emit = defineEmits<{
  /** 表格勾选变化，与外层保存绑定逻辑对接 */
  selectionChange: [rows: ApiMetaDTO[]]
  /** 服务切换且完成一次拉取（含失败）后通知，便于扩展 */
  serviceChange: [serviceId: string]
}>()

const serviceId = defineModel<string>('serviceId', { default: '' })
const method = defineModel<string>('method', { default: '' })
const keyword = defineModel<string>('keyword', { default: '' })

const tableRef = ref<InstanceType<typeof ElTable> | null>(null)
/** 当前拉取结果（请求携带 method、keyword，由服务端过滤） */
const tableData = ref<ApiMetaDTO[]>([])
const listLoading = ref(false)

/** 常见 HTTP 方法；空字符串表示不传 method 查询参数（后端即全部） */
const httpMethodOptions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const

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

/** 根据已绑快照恢复表格勾选 */
async function syncSelectionFromBound() {
  await nextTick()
  const table = tableRef.value
  if (!table) {
    return
  }
  table.clearSelection()
  for (const row of tableData.value) {
    const hit = props.boundApis.some((b) => apiRowKeyFn(b) === apiRowKeyFn(row))
    if (hit) {
      table.toggleRowSelection(row, true)
    }
  }
}

/**
 * 拉取当前服务下的 Admin API 列表。
 * @param reason 用于 serviceChange 仅在服务切换链路触发（搜索按钮不触发）
 */
async function loadList(reason: 'service' | 'search') {
  const sid = (serviceId.value ?? '').trim()
  if (!sid) {
    fetchGeneration += 1
    tableData.value = []
    await nextTick()
    tableRef.value?.clearSelection()
    emit('selectionChange', [])
    return
  }

  const gen = ++fetchGeneration
  listLoading.value = true
  try {
    const m = (method.value ?? '').trim()
    const kw = (keyword.value ?? '').trim()
    const rows = await fetchGatewayAdminApis(sid, m || undefined, kw || undefined)
    if (gen !== fetchGeneration) {
      return
    }
    tableData.value = rows
    await syncSelectionFromBound()
    if (reason === 'service') {
      emit('serviceChange', sid)
    }
  } catch (e) {
    if (gen !== fetchGeneration) {
      return
    }
    if (!isSessionExpiredError(e)) {
      ElMessage.error(e instanceof Error ? e.message : '拉取 Admin API 失败')
    }
    tableData.value = []
    await nextTick()
    tableRef.value?.clearSelection()
    emit('selectionChange', [])
  } finally {
    if (gen === fetchGeneration) {
      listLoading.value = false
    }
  }
}

function scheduleServiceLoad() {
  clearServiceDebounceTimer()
  if (!props.autoLoad) {
    return
  }
  const ms = props.serviceChangeDebounceMs ?? 0
  if (ms <= 0) {
    void loadList('service')
    return
  }
  serviceDebounceTimer = setTimeout(() => {
    serviceDebounceTimer = null
    void loadList('service')
  }, ms)
}

watch(
  () => (serviceId.value ?? ''),
  () => {
    scheduleServiceLoad()
  },
)

watch(
  () => (method.value ?? ''),
  () => {
    if ((serviceId.value ?? '').trim()) {
      clearServiceDebounceTimer()
      void loadList('search')
    }
  },
)

watch(keyword, () => {
  if (!(serviceId.value ?? '').trim()) {
    return
  }
  clearKeywordDebounceTimer()
  keywordDebounceTimer = setTimeout(() => {
    keywordDebounceTimer = null
    void loadList('search')
  }, 400)
})

function onSearchClick() {
  clearServiceDebounceTimer()
  clearKeywordDebounceTimer()
  void loadList('search')
}

function onKeywordEnter() {
  onSearchClick()
}

function onTableSelectionChange(rows: ApiMetaDTO[]) {
  emit('selectionChange', rows)
}

defineExpose({
  /** 供父级在极少数场景下强制刷新列表 */
  reload: () => loadList('search'),
})
</script>

<template>
  <div class="admin-api-picker-panel">
    <div class="admin-api-picker-toolbar">
      <el-select
        v-model="serviceId"
        filterable
        clearable
        placeholder="选择微服务（Nacos 注册名）"
        class="admin-api-picker-service"
      >
        <el-option
          v-for="s in registryServices"
          :key="s.serviceId"
          :label="s.displayName"
          :value="s.serviceId"
        />
      </el-select>
      <el-select v-model="method" clearable placeholder="HTTP 方法" class="admin-api-picker-method">
        <el-option label="全部" value="" />
        <el-option v-for="m in httpMethodOptions" :key="m" :label="m" :value="m" />
      </el-select>
      <el-input
        v-model="keyword"
        clearable
        placeholder="路径/摘要关键字"
        class="admin-api-picker-keyword"
        @keyup.enter="onKeywordEnter"
      />
      <el-button type="primary" :loading="listLoading" @click="onSearchClick">搜索</el-button>
    </div>
    <el-table
      ref="tableRef"
      v-loading="listLoading"
      :data="tableData"
      border
      stripe
      max-height="420"
      :row-key="apiRowKeyFn"
      @selection-change="onTableSelectionChange"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="method" label="方法" width="88" />
      <el-table-column prop="urlPath" label="路径" min-width="220" show-overflow-tooltip />
      <el-table-column prop="summary" label="摘要" min-width="160" show-overflow-tooltip />
    </el-table>
  </div>
</template>

<style scoped>
.admin-api-picker-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.admin-api-picker-service {
  width: 280px;
}

.admin-api-picker-method {
  width: 130px;
}

.admin-api-picker-keyword {
  width: 220px;
  max-width: 100%;
}
</style>
