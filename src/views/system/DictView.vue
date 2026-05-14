<script setup lang="ts">
/**
 * 码表配置：关键字与状态筛选；抽屉新增/编辑；启用开关；物理删除。
 */
import { computed, ref } from 'vue'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import { useDictController } from '../../controllers/system/useDictController'
import { DICT_LIST_CLASS_TAG_OPTIONS, listClassToElTagType } from '../../models/dictMgmt'

const dictFormRef = ref<FormInstance>()

const {
  keyword,
  statusFilter,
  dictTypes,
  page,
  pageSize,
  total,
  loading,
  tableRows,
  drawerVisible,
  drawerMode,
  drawerTitle,
  submitLoading,
  dictForm,
  rules,
  onSearch,
  onReset,
  openCreate,
  openEdit,
  onSubmit,
  onToggleStatus,
  confirmHardDelete,
} = useDictController()

/** 表单内字典类型下拉：合并已加载类型与当前输入值 */
const dictTypeFormOptions = computed(() => {
  const opts = [...dictTypes.value]
  const cur = (dictForm.value.dictType ?? '').trim()
  if (cur && !opts.includes(cur)) {
    opts.unshift(cur)
  }
  return opts
})

const onSaveDict = async () => {
  const f = dictFormRef.value
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
  <div class="dict-page">
    <el-card shadow="never" class="page-list-card">
      <div class="page-list-toolbar">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="keyword"
              clearable
              placeholder="字典类型 / 标签 / 存储值"
              style="width: 280px"
              @keyup.enter="onSearch"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="statusFilter" clearable placeholder="全部" style="width: 100px">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="onSearch">查询</el-button>
            <el-button @click="onReset">重置</el-button>
          </el-form-item>
          <el-form-item class="right-btn">
            <el-button type="success" :icon="Plus" @click="openCreate">新增</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" class="page-list-table" :data="tableRows" stripe>
        <template #empty>
          <el-empty
            :description="
              keyword.trim() || (statusFilter !== undefined && statusFilter !== '')
                ? '当前筛选条件下暂无数据'
                : '暂无码表数据，可调整关键字/状态筛选或点击新增'
            "
          />
        </template>
        <el-table-column type="index" label="#" width="56" :index="(i: number) => (page - 1) * pageSize + i + 1" />
        <el-table-column prop="dictType" label="类型" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="dict-type-cell">{{ row.dictType }}</span>
          </template>
        </el-table-column>
        <el-table-column label="列表样式" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="listClassToElTagType(row.listClass)" size="small" effect="plain">
              {{ row.listClass?.trim() ? row.listClass : '默认' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dictLabel" label="标签" min-width="120" show-overflow-tooltip />
        <el-table-column prop="dictValue" label="存储值" min-width="110" show-overflow-tooltip />
        <el-table-column prop="sortNo" label="排序" width="72" />
        <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch :model-value="row.status === 1" @change="(v: boolean) => onToggleStatus(row, v)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <span class="dict-table-ops">
              <el-tooltip content="编辑" placement="top">
                <el-button type="primary" link :icon="Edit" @click="openEdit(row)" />
              </el-tooltip>
              <el-tooltip content="物理删除" placement="top">
                <el-button type="danger" link :icon="Delete" @click="confirmHardDelete(row)" />
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
      </el-table>

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
      class="dict-mgmt-drawer"
      :title="drawerTitle"
      size="520px"
      destroy-on-close
      append-to-body
    >
      <div class="dict-drawer-body">
        <div class="dict-drawer-scroll">
          <el-skeleton v-if="submitLoading && drawerMode !== 'create'" :rows="6" animated />
          <el-form v-else ref="dictFormRef" :model="dictForm" :rules="rules" label-width="100px" class="dict-drawer-form">
            <!-- 抽屉宽度固定约 520px，双列 + gutter 易触发横向滚动，主表单改为单列 -->
            <el-row :gutter="12">
              <el-col :span="24">
                <el-form-item label="字典类型" prop="dictType">
                  <el-select
                    v-model="dictForm.dictType"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="选择已有类型或输入新类型"
                    class="dict-drawer-field"
                    :teleported="false"
                  >
                    <el-option v-for="t in dictTypeFormOptions" :key="t" :label="t" :value="t" />
                  </el-select>
                </el-form-item>
              </el-col>
            <el-col :span="24">
              <el-form-item label="展示标签" prop="dictLabel">
                <el-input v-model="dictForm.dictLabel" class="dict-drawer-field" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="存储值" prop="dictValue">
                <el-input v-model="dictForm.dictValue" placeholder="与类型组合唯一" class="dict-drawer-field" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="排序号">
                <el-input-number
                  v-model="dictForm.sortNo"
                  :min="0"
                  :max="999999"
                  controls-position="right"
                  class="dict-drawer-field dict-drawer-num"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="列表样式">
                <div class="list-class-with-preview">
                  <el-select
                    v-model="dictForm.listClass"
                    clearable
                    placeholder="对应 el-tag type"
                    class="list-class-select"
                    :teleported="false"
                  >
                    <el-option
                      v-for="opt in DICT_LIST_CLASS_TAG_OPTIONS"
                      :key="opt.value === '' ? '_empty' : opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                  <span class="preview-label">预览</span>
                  <el-tag :type="listClassToElTagType(dictForm.listClass)" size="small">示例</el-tag>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-collapse class="dict-advanced-collapse">
            <el-collapse-item title="高级选项" name="adv">
              <el-row :gutter="12">
                <el-col :span="24">
                  <el-form-item label="CSS 类">
                    <el-input v-model="dictForm.cssClass" placeholder="可选" class="dict-drawer-field" />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="备注">
                    <el-input v-model="dictForm.remark" type="textarea" :rows="2" class="dict-drawer-field" />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="父级 ID">
                    <el-input v-model="dictForm.parentId" placeholder="0 表示根节点" clearable class="dict-drawer-field" />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="默认项">
                    <el-switch
                      :model-value="(dictForm.isDefault ?? 0) === 1"
                      @change="(v: boolean) => (dictForm.isDefault = v ? 1 : 0)"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-collapse-item>
          </el-collapse>
        </el-form>
        </div>
      </div>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSaveDict">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
/* 列表区：flex 链 + min-height:0，避免空表 / el-empty 触发的最小内容高度把 .content 顶出纵向滚动条；仅必要时由表格内部滚动 */
.dict-page {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.page-list-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dict-type-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 13px;
}

/* 列表区单卡片：工具条与表头视觉同一色带，减少双层卡片与竖向空隙 */
.page-list-card :deep(.el-card__body) {
  padding: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-list-toolbar {
  flex-shrink: 0;
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

/* 与工具条顶对齐：去掉整表圆角带来的「分层」感，仅保留下圆角 */
.page-list-table {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}

.page-list-table :deep(.el-table) {
  border-radius: 0 0 8px 8px;
}

.pager {
  display: flex;
  justify-content: flex-end;
}

.page-list-pager {
  flex-shrink: 0;
  padding: 14px 16px 16px;
}

.dict-table-ops {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

/* 抽屉：body 占满剩余高度且不整体纵向滚动，仅中间表单区可滚 */
.dict-mgmt-drawer :deep(.el-drawer__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.dict-drawer-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.dict-drawer-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
}

.dict-drawer-form {
  padding-right: 4px;
  min-width: 0;
}

.dict-drawer-form :deep(.el-col) {
  min-width: 0;
}

.dict-drawer-field {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.dict-drawer-num {
  width: 100%;
}

.dict-drawer-num :deep(.el-input__wrapper) {
  width: 100%;
}

.list-class-with-preview {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.list-class-select {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
}

/* el-select 根节点默认非块级，在 flex 内需拉满以免撑开测量异常 */
.list-class-select :deep(.el-select__wrapper) {
  width: 100%;
}

.preview-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.dict-advanced-collapse {
  margin-top: 4px;
  border: none;
}

.dict-advanced-collapse :deep(.el-collapse-item__header) {
  font-size: 13px;
  padding-left: 0;
  border-bottom: none;
}

.dict-advanced-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.dict-advanced-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 0;
}
</style>
