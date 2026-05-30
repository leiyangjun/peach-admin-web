<script setup lang="ts">
/**
 * 网关免鉴权 API 列表 + 右侧抽屉新建/编辑
 */
import { computed, ref, watch } from 'vue'
import type { TableInstance } from 'element-plus'
import { Delete, Edit, MoreFilled, Plus } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import ApiResourceShuttleDialog from '../../components/ApiResourceShuttleDialog.vue'
import { BTN_UI, CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
import { useButtonPermission } from '../../composables/useButtonPermission'
import { useUnauthApiController } from '../../controllers/system/useUnauthApiController'
import { UNAUTH_ACCESS_TYPE_OPTIONS, unauthAccessTypeLabel } from '../../models/unauthApi'
import { formatDateTime } from '../../utils/dateTime'

const { hasButton } = useButtonPermission()

const {
  keyword,
  accessTypeFilter,
  validFilter,
  page,
  pageSize,
  total,
  loading,
  tableRows,
  onSearch,
  onReset,
  goCreate,
  goEdit,
  onToggleValid,
  confirmDelete,
  isUnauthEnabled,
  isUnauthDeletable,
  drawerVisible,
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
  httpMethodOptions,
  apiPickerInitialServiceId,
  closeDrawer,
  openApiPicker,
  onApiShuttleConfirm,
  onSubmit,
} = useUnauthApiController()

function bindFormRef(el: unknown) {
  formRef.value = el ? (el as FormInstance) : undefined
}

const apiPathPlaceholder = computed(() =>
  isInternal.value ? '点击右侧选择管理端 API' : '如 /legacy-app/callback/**',
)

const tableRef = ref<TableInstance>()

/** 跨页连续序号；使用 script 中 ref.value，避免模板闭包与分页状态不同步 */
function tableRowIndex(rowIndex: number): number {
  return (page.value - 1) * pageSize.value + rowIndex + 1
}

watch([page, pageSize], () => {
  tableRef.value?.setScrollTop(0)
})
</script>

<template>
  <div class="unauth-api-page page-list-page">
    <el-card shadow="never" class="page-list-card">
      <div class="page-list-toolbar">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="keyword"
              clearable
              placeholder="备注 / 路径"
              style="width: 260px"
              @keyup.enter="onSearch"
            />
          </el-form-item>
          <el-form-item label="访问类型">
            <el-select v-model="accessTypeFilter" clearable placeholder="全部" style="width: 160px">
              <el-option
                v-for="opt in UNAUTH_ACCESS_TYPE_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="validFilter" clearable placeholder="全部" style="width: 110px">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item class="toolbar-actions">
            <el-button v-if="hasButton(CMN_BUTTON.QUERY)" type="primary" @click="onSearch">
              {{ CMN_BUTTON_LABEL[CMN_BUTTON.QUERY] }}
            </el-button>
            <el-button v-if="hasButton(CMN_BUTTON.QUERY)" @click="onReset">{{ BTN_UI.RESET }}</el-button>
          </el-form-item>
          <el-form-item v-if="hasButton(CMN_BUTTON.ADD)" class="right-btn">
            <el-button type="success" :icon="Plus" @click="goCreate">
              {{ CMN_BUTTON_LABEL[CMN_BUTTON.ADD] }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="page-list-table-wrap">
        <el-table
          ref="tableRef"
          v-loading="loading"
          class="page-list-table unauth-api-main-table"
          size="small"
          :data="tableRows"
          row-key="id"
          stripe
          height="100%"
        >
          <template #empty>
            <el-empty description="暂无免鉴权 API，可点击新增进行配置" />
          </template>
          <el-table-column label="#" width="56" align="center">
            <template #default="{ $index }">
              {{ tableRowIndex($index) }}
            </template>
          </el-table-column>
          <el-table-column prop="method" label="METHOD" width="72" align="center" />
          <el-table-column label="访问类型" width="140" align="center">
            <template #default="{ row }">
              {{ unauthAccessTypeLabel(row.accessType) }}
            </template>
          </el-table-column>
          <el-table-column prop="finalPath" label="PATH" min-width="200" show-overflow-tooltip />
          <el-table-column prop="summary" label="备注" width="160" show-overflow-tooltip />
          <el-table-column label="更新时间" width="168" align="center">
            <template #default="{ row }">
              {{ formatDateTime(row.editTime) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-switch
                v-if="hasButton(CMN_BUTTON.EDIT)"
                :model-value="isUnauthEnabled(row)"
                @change="() => onToggleValid(row)"
              />
              <el-tag v-else size="small" :type="isUnauthEnabled(row) ? 'success' : 'info'">
                {{ isUnauthEnabled(row) ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="96" fixed="right" align="center">
            <template #default="{ row }">
              <el-button
                v-if="hasButton(CMN_BUTTON.EDIT)"
                type="primary"
                link
                :icon="Edit"
                @click="goEdit(row)"
              />
              <el-button
                v-if="hasButton(CMN_BUTTON.DELETE) && isUnauthDeletable(row)"
                type="danger"
                link
                :icon="Delete"
                @click="confirmDelete(row)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pager page-list-pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="[10, 20, 50]"
          :default-page-size="10"
        />
      </div>
    </el-card>

    <el-drawer
      v-model="drawerVisible"
      class="unauth-api-drawer"
      :title="drawerTitle"
      size="520px"
      destroy-on-close
      append-to-body
    >
      <div class="unauth-drawer-body">
        <div class="unauth-drawer-scroll">
          <el-skeleton v-if="detailLoading" :rows="7" animated />
          <el-form
            v-else
            :ref="bindFormRef"
            :model="form"
            :rules="rules"
            label-width="100px"
            class="unauth-drawer-form"
            size="default"
          >
            <el-form-item label="API 类型">
              <el-radio-group v-model="form.apiType" class="api-type-toggle">
                <el-radio-button value="INTERNAL">内部服务</el-radio-button>
                <el-radio-button value="EXTERNAL">外部接口</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="API路径" prop="finalPath" class="form-item--api-endpoint">
              <el-input
                v-model="form.finalPath"
                :readonly="isInternal"
                class="unauth-drawer-field api-endpoint-input"
                :placeholder="apiPathPlaceholder"
                maxlength="256"
              >
                <template #prepend>
                  <el-select
                    v-model="form.method"
                    :disabled="isInternal"
                    placeholder="---"
                    :class="['api-endpoint-method', isInternal ? 'is-method-auto' : 'is-method-editable']"
                    :teleported="false"
                  >
                    <el-option v-for="m in httpMethodOptions" :key="m" :label="m" :value="m" />
                  </el-select>
                </template>
                <template v-if="isInternal" #append>
                  <el-button
                    class="api-endpoint-pick-btn"
                    :icon="MoreFilled"
                    title="选择 API"
                    @click="openApiPicker"
                  />
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="访问类型">
              <el-radio-group v-model="form.accessType">
                <el-radio
                  v-for="opt in UNAUTH_ACCESS_TYPE_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="启用">
              <el-switch v-model="form.enabled" />
            </el-form-item>

            <el-form-item label="备注">
              <el-input
                v-model="form.summary"
                class="unauth-drawer-field"
                maxlength="100"
                show-word-limit
                placeholder="可选"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <el-button v-if="hasButton(CMN_BUTTON.CANCEL)" @click="closeDrawer">
          {{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}
        </el-button>
        <el-button
          v-if="hasButton(CMN_BUTTON.EDIT) || hasButton(CMN_BUTTON.ADD)"
          type="primary"
          :loading="submitLoading"
          @click="onSubmit"
        >
          {{ BTN_UI.SAVE }}
        </el-button>
      </template>
    </el-drawer>

    <ApiResourceShuttleDialog
      v-model:visible="apiPickerVisible"
      v-model:model-value="shuttleModel"
      :discovery-services="discoveryServices"
      :initial-service-id="apiPickerInitialServiceId"
      title-suffix="免鉴权 API"
      :max-right="1"
      @confirm="onApiShuttleConfirm"
    />
  </div>
</template>

<style scoped>
.page-list-toolbar {
  padding: 10px 16px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-table-header-bg-color);
}

.page-list-toolbar :deep(.el-form) {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  column-gap: 12px;
  width: 100%;
}

.page-list-toolbar :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 0;
  flex-shrink: 0;
}

.toolbar-actions {
  flex-shrink: 0;
}

.right-btn {
  margin-left: auto;
}

.unauth-api-main-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.unauth-api-main-table :deep(.el-table__empty-block) {
  min-height: 200px;
}

.unauth-api-drawer :deep(.el-drawer__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.unauth-drawer-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.unauth-drawer-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
}

.unauth-drawer-form {
  padding-right: 4px;
  min-width: 0;
}

.unauth-drawer-field {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.form-item--api-endpoint :deep(.el-input-group) {
  width: 100%;
}

.api-endpoint-input :deep(.el-input-group__prepend) {
  padding: 0;
  box-shadow: none;
  flex: 0 0 88px;
  width: 88px;
}

.api-endpoint-method {
  width: 88px;
  min-width: 88px;
  max-width: 88px;
  margin: 0;
}

.api-endpoint-method :deep(.el-select__wrapper) {
  box-shadow: none !important;
  border-radius: 0;
  min-height: 32px;
  width: 88px;
}

.api-endpoint-method :deep(.el-select__selected-item),
.api-endpoint-method :deep(.el-select__placeholder) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  letter-spacing: 0.02em;
}

/* 内部：自动带出方法，用主题浅色区分，避免误认灰色禁用 */
.api-endpoint-method.is-method-auto :deep(.el-select__wrapper) {
  background-color: var(--el-color-primary-light-9);
  box-shadow: none !important;
  cursor: default;
}

.api-endpoint-method.is-method-auto :deep(.el-select__selected-item) {
  color: var(--el-color-primary);
  font-weight: 600;
}

.api-endpoint-method.is-method-auto :deep(.el-select__placeholder) {
  color: var(--el-color-primary-light-3);
}

.api-endpoint-method.is-method-auto :deep(.el-select__caret) {
  color: var(--el-color-primary-light-5);
}

/* 外部：可编辑，同样浅色底突出 METHOD 区域 */
.api-endpoint-method.is-method-editable :deep(.el-select__wrapper) {
  background-color: var(--el-color-primary-light-9);
  box-shadow: none !important;
}

.api-endpoint-method.is-method-editable :deep(.el-select__selected-item) {
  color: var(--el-color-primary);
  font-weight: 600;
}

.api-endpoint-method.is-method-editable :deep(.el-select__caret) {
  color: var(--el-color-primary);
}

.api-endpoint-input :deep(.el-input-group__append) {
  flex: 0 0 40px;
  width: 40px;
  min-width: 40px;
  padding: 0;
}

.api-endpoint-input :deep(.el-input-group__append .el-button) {
  margin: 0;
  border-radius: 0;
  width: 40px;
  min-width: 40px;
  height: 100%;
}
</style>
