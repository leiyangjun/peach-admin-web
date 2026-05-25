<script setup lang="ts">
/**
 * 绑定 API 资源：服务下拉 + 方法/关键字拉取全量 Admin API，左右穿梭，前端分页。
 */
import { computed } from 'vue'
import { BTN_UI, CMN_BUTTON, CMN_BUTTON_LABEL } from '../constants/cmnButton'
import type { ApiMetaDTO } from '../models/permission'
import type { ServiceVO } from '../models/discovery'
import { useApiResourceShuttle } from '../composables/useApiResourceShuttle'

const props = withDefaults(
  defineProps<{
    visible: boolean
    discoveryServices: ServiceVO[]
    modelValue?: ApiMetaDTO[]
    buttonLabel?: string
    titleSuffix?: string
    listApis?: (serviceId: string, method?: string, keyword?: string) => Promise<ApiMetaDTO[]>
    maxRight?: number
    forceHttpMethod?: string
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

const dialogTitle = computed(() => {
  const tag = (props.buttonLabel || props.titleSuffix || '').trim()
  return tag ? `绑定（${tag}）API` : '绑定API资源'
})

const {
  serviceId,
  method,
  keyword,
  listLoading,
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
} = useApiResourceShuttle({
  visible: () => props.visible,
  discoveryServices: () => props.discoveryServices,
  modelValue: () => props.modelValue ?? [],
  initialServiceId: () => props.initialServiceId ?? '',
  forceHttpMethod: () => props.forceHttpMethod ?? '',
  maxRight: () => props.maxRight,
  listApis: props.listApis,
  onUpdateModelValue: (apis) => emit('update:modelValue', apis),
  onConfirm: (apis) => emit('confirm', apis),
  onClose: () => {
    innerVisible.value = false
  },
})
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
    <div v-if="!discoveryServices.length" class="api-shuttle-empty">
      <el-alert type="warning" show-icon :closable="false" title="暂无可选微服务，无法拉取 Admin API 目录。" />
    </div>
    <template v-else>
      <div class="api-shuttle-toolbar">
        <el-select v-model="serviceId" filterable placeholder="微服务" class="api-svc">
          <el-option
            v-for="s in discoveryServices"
            :key="s.serviceId"
            :label="s.serviceName"
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
      <el-button type="primary" :disabled="!discoveryServices.length" @click="onConfirm">
        {{ BTN_UI.SAVE }}
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
