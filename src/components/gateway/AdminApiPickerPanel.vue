<script setup lang="ts">
/**
 * 网关 Admin API 选择面板：服务切换自动拉取（可防抖）、HTTP 方法/关键字筛选与手动搜索、表格多选。
 */
import { toRef } from 'vue'
import { CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
import type { ApiMetaDTO, RegistryServiceItem } from '../../models/permission'
import { useAdminApiPicker } from '../../composables/useAdminApiPicker'

const props = withDefaults(
  defineProps<{
    registryServices: RegistryServiceItem[]
    boundApis: ApiMetaDTO[]
    autoLoad?: boolean
    serviceChangeDebounceMs?: number
  }>(),
  {
    autoLoad: true,
    serviceChangeDebounceMs: 300,
  },
)

const emit = defineEmits<{
  selectionChange: [rows: ApiMetaDTO[]]
  serviceChange: [serviceId: string]
}>()

const picker = useAdminApiPicker({
  boundApis: toRef(props, 'boundApis'),
  autoLoad: props.autoLoad,
  serviceChangeDebounceMs: props.serviceChangeDebounceMs,
  onSelectionChange: (rows) => emit('selectionChange', rows),
  onServiceChange: (sid) => emit('serviceChange', sid),
})

function bindPickerTable(el: unknown) {
  picker.tableRef.value = (el ?? null) as InstanceType<typeof import('element-plus').ElTable> | null
}

const {
  serviceId,
  method,
  keyword,
  listLoading,
  tableData,
  apiRowKeyFn,
  onSearchClick,
  onKeywordEnter,
  onTableSelectionChange,
} = picker

defineExpose({
  reload: () => onSearchClick(),
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
        <el-option v-for="m in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']" :key="m" :label="m" :value="m" />
      </el-select>
      <el-input
        v-model="keyword"
        clearable
        placeholder="路径/摘要关键字"
        class="admin-api-picker-keyword"
        @keyup.enter="onKeywordEnter"
      />
      <el-button type="primary" :loading="listLoading" @click="onSearchClick">{{ CMN_BUTTON_LABEL[CMN_BUTTON.QUERY] }}</el-button>
    </div>
    <el-table
      :ref="bindPickerTable"
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
