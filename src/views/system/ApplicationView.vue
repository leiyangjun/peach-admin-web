<script setup lang="ts">
/**
 * 应用管理：关键字与应用类型筛选；抽屉新增/编辑；物理删除。
 */
import { ref } from 'vue'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import { BTN_UI, CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
import { useButtonPermission } from '../../composables/useButtonPermission'
import type { FormInstance } from 'element-plus'
import { useApplicationController } from '../../controllers/system/useApplicationController'

const appFormRef = ref<FormInstance>()

const {
  keyword,
  appTypeFilter,
  appTypeOptions,
  appTypeFilterOptions,
  appTypeLabel,
  appTypeToElTagType,
  page,
  pageSize,
  total,
  loading,
  tableRows,
  drawerVisible,
  drawerMode,
  drawerTitle,
  submitLoading,
  appForm,
  rules,
  onSearch,
  onReset,
  openCreate,
  openEdit,
  onSubmit,
  confirmDelete,
} = useApplicationController()

const { hasButton } = useButtonPermission()

const onSaveApp = async () => {
  const f = appFormRef.value
  if (!f) {
    return
  }
  try {
    await f.validate()
  } catch {
    return
  }
  await onSubmit()
}
</script>

<template>
  <div class="app-page page-list-page">
    <el-card shadow="never" class="page-list-card">
      <div class="page-list-toolbar">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="keyword"
              clearable
              placeholder="应用名称 / 编码 / 描述"
              style="width: 280px"
              @keyup.enter="onSearch"
            />
          </el-form-item>
          <el-form-item label="应用类型">
            <el-select v-model="appTypeFilter" clearable placeholder="全部" style="width: 160px">
              <el-option
                v-for="opt in appTypeFilterOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button v-if="hasButton(CMN_BUTTON.QUERY)" type="primary" @click="onSearch">
              {{ CMN_BUTTON_LABEL[CMN_BUTTON.QUERY] }}
            </el-button>
            <el-button v-if="hasButton(CMN_BUTTON.QUERY)" @click="onReset">{{ BTN_UI.RESET }}</el-button>
          </el-form-item>
          <el-form-item v-if="hasButton(CMN_BUTTON.ADD)" class="right-btn">
            <el-button type="success" :icon="Plus" @click="openCreate">
              {{ CMN_BUTTON_LABEL[CMN_BUTTON.ADD] }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="page-list-table-wrap">
        <el-table
          v-loading="loading"
          class="page-list-table app-main-table"
          size="small"
          :data="tableRows"
          stripe
          height="100%"
        >
        <template #empty>
          <el-empty
            :description="
              keyword.trim() || appTypeFilter
                ? '当前筛选条件下暂无数据'
                : '暂无应用数据，可调整筛选条件或点击新增'
            "
          />
        </template>
        <el-table-column type="index" label="#" width="56" :index="(i: number) => (page - 1) * pageSize + i + 1" />
        <el-table-column label="类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="appTypeToElTagType(row.appType)" size="small" effect="plain">
              {{ appTypeLabel(row.appType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="appName" label="应用名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="appCode" label="应用编码" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="app-code-cell">{{ row.appCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="appDesc" label="描述" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <span class="app-table-ops">
              <el-tooltip v-if="hasButton(CMN_BUTTON.EDIT)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.EDIT]" placement="top">
                <el-button type="primary" link :icon="Edit" @click="openEdit(row)" />
              </el-tooltip>
              <el-tooltip v-if="hasButton(CMN_BUTTON.DELETE)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.DELETE]" placement="top">
                <el-button type="danger" link :icon="Delete" @click="confirmDelete(row)" />
              </el-tooltip>
            </span>
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
        />
      </div>
    </el-card>

    <el-drawer
      v-model="drawerVisible"
      class="app-mgmt-drawer"
      :title="drawerTitle"
      size="520px"
      destroy-on-close
      append-to-body
    >
      <div class="app-drawer-body">
        <div class="app-drawer-scroll">
          <el-skeleton v-if="submitLoading && drawerMode !== 'create'" :rows="5" animated />
          <el-form
            v-else
            ref="appFormRef"
            :model="appForm"
            :rules="rules"
            label-width="100px"
            class="app-drawer-form"
          >
            <el-form-item label="应用类型" prop="appType">
              <el-select v-model="appForm.appType" placeholder="请选择" class="app-drawer-field" :teleported="false">
                <el-option
                  v-for="opt in appTypeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="应用名称" prop="appName">
              <el-input v-model="appForm.appName" class="app-drawer-field" />
            </el-form-item>
            <el-form-item label="应用编码" prop="appCode">
              <el-input
                v-model="appForm.appCode"
                placeholder="全局唯一，如 ADMIN_WEB"
                class="app-drawer-field app-code-input"
              />
            </el-form-item>
            <el-form-item label="应用描述">
              <el-input v-model="appForm.appDesc" type="textarea" :rows="3" class="app-drawer-field" />
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <el-button v-if="hasButton(CMN_BUTTON.CANCEL)" @click="drawerVisible = false">
          {{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}
        </el-button>
        <el-button v-if="hasButton(CMN_BUTTON.EDIT)" type="primary" :loading="submitLoading" @click="onSaveApp">
          {{ BTN_UI.SAVE }}
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.app-code-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 13px;
}

.page-list-toolbar {
  padding: 10px 16px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-table-header-bg-color);
}

.page-list-toolbar :deep(.el-form) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 10px;
  column-gap: 12px;
  width: 100%;
}

.page-list-toolbar :deep(.el-form-item) {
  margin-bottom: 0;
}

.right-btn {
  margin-left: auto;
}

.app-main-table :deep(.el-table__cell) {
  padding-top: 4px;
  padding-bottom: 4px;
}

.app-main-table :deep(.el-table .cell) {
  padding-left: 8px;
  padding-right: 8px;
  font-size: 13px;
  line-height: 1.35;
}

.app-table-ops {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.app-mgmt-drawer :deep(.el-drawer__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.app-drawer-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.app-drawer-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
}

.app-drawer-form {
  padding-right: 4px;
  min-width: 0;
}

.app-drawer-field {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.app-code-input :deep(.el-input__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
</style>
