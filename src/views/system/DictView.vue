<script setup lang="ts">
/**
 * 码表配置：关键字与状态筛选；抽屉新增/编辑；启用开关；物理删除。
 */
import { computed, ref } from 'vue'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import { CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
import { useButtonPermission } from '../../composables/useButtonPermission'
import type { ElSelect, FormInstance, TableColumnCtx } from 'element-plus'
import { useDictController } from '../../controllers/system/useDictController'
import { DICT_LIST_CLASS_TAG_OPTIONS, listClassToElTagType } from '../../models/dictMgmt'
import type { DictMgmtVO } from '../../models/dictMgmt'

const dictFormRef = ref<FormInstance>()
/** 字典类型 el-select（allow-create）：失焦时把筛选框内未确认的文本写回表单，与按 Enter 创建一致 */
const dictTypeSelectRef = ref<InstanceType<typeof ElSelect>>()

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

const { hasButton } = useButtonPermission()

/** 当前页内：按类型再按排序号稳定排序，便于相邻同类型合并；与接口顺序不一致时以展示顺序为准 */
function sortRowsForDisplay(rows: DictMgmtVO[]): DictMgmtVO[] {
  return [...rows].sort((a, b) => {
    const ta = String(a.dictType ?? '').trim()
    const tb = String(b.dictType ?? '').trim()
    const byType = ta.localeCompare(tb, undefined, { sensitivity: 'base' })
    if (byType !== 0) {
      return byType
    }
    const sa = Number(a.sortNo ?? 0)
    const sb = Number(b.sortNo ?? 0)
    if (sa !== sb) {
      return sa - sb
    }
    return String(a.id ?? '').localeCompare(String(b.id ?? ''))
  })
}

const displayTableRows = computed(() => sortRowsForDisplay(tableRows.value))

/** 类型列（el-table 列下标 1）每行的 rowspan；0 表示被上行合并隐藏 */
const dictTypeColumnRowspans = computed(() => {
  const rows = displayTableRows.value
  const n = rows.length
  const spans = new Array<number>(n).fill(1)
  let i = 0
  while (i < n) {
    const t = String(rows[i].dictType ?? '').trim()
    let j = i + 1
    while (j < n && String(rows[j].dictType ?? '').trim() === t) {
      j++
    }
    const len = j - i
    spans[i] = len
    for (let k = i + 1; k < j; k++) {
      spans[k] = 0
    }
    i = j
  }
  return spans
})

/** 当前页内：与合并块一致，每行所属「连续 dictType 块」的序号（从 0 递增），用于类型列交替底色 */
const dictTypeRowGroupIndex = computed(() => {
  const rows = displayTableRows.value
  const n = rows.length
  const idx = new Array<number>(n).fill(0)
  let i = 0
  let group = 0
  while (i < n) {
    const t = String(rows[i].dictType ?? '').trim()
    let j = i + 1
    while (j < n && String(rows[j].dictType ?? '').trim() === t) {
      j++
    }
    for (let k = i; k < j; k++) {
      idx[k] = group
    }
    group++
    i = j
  }
  return idx
})

/** 类型列合并组底色轮换数量（与 dictTypeRowGroupIndex 取模一致） */
const DICT_TYPE_MERGE_PALETTE_LEN = 4

/** 仅首格渲染：被合并行 rowspan 为 0 时不加组色，避免无效类名 */
const dictTypeColumnCellClassName = ({
  rowIndex,
}: {
  row: DictMgmtVO
  column: TableColumnCtx<DictMgmtVO>
  rowIndex: number
  columnIndex: number
}): string => {
  if (typeof rowIndex !== 'number' || rowIndex < 0) {
    return ''
  }
  const rowspan = dictTypeColumnRowspans.value[rowIndex] ?? 1
  if (rowspan === 0) {
    return ''
  }
  const g = dictTypeRowGroupIndex.value[rowIndex] ?? 0
  return `dict-type-merge-g${g % DICT_TYPE_MERGE_PALETTE_LEN}`
}

const DICT_TABLE_TYPE_COLUMN_INDEX = 1

const dictTableSpanMethod = ({
  columnIndex,
  rowIndex,
}: {
  row: DictMgmtVO
  column: TableColumnCtx<DictMgmtVO>
  rowIndex: number
  columnIndex: number
}) => {
  if (columnIndex === DICT_TABLE_TYPE_COLUMN_INDEX) {
    const rowspan = dictTypeColumnRowspans.value[rowIndex] ?? 1
    if (rowspan === 0) {
      return { rowspan: 0, colspan: 0 }
    }
    return { rowspan, colspan: 1 }
  }
  return { rowspan: 1, colspan: 1 }
}

/** 表单内字典类型下拉：合并已加载类型与当前输入值 */
const dictTypeFormOptions = computed(() => {
  const opts = [...dictTypes.value]
  const cur = (dictForm.value.dictType ?? '').trim()
  if (cur && !opts.includes(cur)) {
    opts.unshift(cur)
  }
  return opts
})

/**
 * Element Plus 筛选态下，输入内容在失焦时会被丢弃；从内部 states 取出当前输入并提交（trim）。
 * 若与已有选项在 trim 后完全一致，则采用选项原值（与点选/Enter 一致）。
 */
function commitDictTypeInputOnBlur() {
  const sel = dictTypeSelectRef.value as unknown as { states?: { inputValue?: string } } | null
  const raw = sel?.states?.inputValue
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed) {
    return
  }
  const opts = dictTypeFormOptions.value
  const hit = opts.find((t) => String(t).trim() === trimmed)
  dictForm.value.dictType = hit !== undefined ? hit : trimmed
}

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
            <el-button v-if="hasButton(CMN_BUTTON.QUERY)" type="primary" @click="onSearch">{{ CMN_BUTTON_LABEL[CMN_BUTTON.QUERY] }}</el-button>
            <el-button v-if="hasButton(CMN_BUTTON.RESET)" @click="onReset">{{ CMN_BUTTON_LABEL[CMN_BUTTON.RESET] }}</el-button>
          </el-form-item>
          <el-form-item v-if="hasButton(CMN_BUTTON.ADD)" class="right-btn">
            <el-button type="success" :icon="Plus" @click="openCreate">{{ CMN_BUTTON_LABEL[CMN_BUTTON.ADD] }}</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
        v-loading="loading"
        class="page-list-table dict-main-table"
        size="small"
        :data="displayTableRows"
        :span-method="dictTableSpanMethod"
        stripe
      >
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
        <el-table-column
          prop="dictType"
          label="类型"
          min-width="130"
          show-overflow-tooltip
          align="center"
          class-name="dict-type-merge-col"
          :cell-class-name="dictTypeColumnCellClassName"
        >
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
            <el-switch
              v-if="hasButton(CMN_BUTTON.ENABLE) || hasButton(CMN_BUTTON.DISABLE)"
              :model-value="row.status === 1"
              @change="(v: boolean) => onToggleStatus(row, v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <span class="dict-table-ops">
              <el-tooltip v-if="hasButton(CMN_BUTTON.EDIT)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.EDIT]" placement="top">
                <el-button type="primary" link :icon="Edit" @click="openEdit(row)" />
              </el-tooltip>
              <el-tooltip v-if="hasButton(CMN_BUTTON.DELETE)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.DELETE]" placement="top">
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
                    ref="dictTypeSelectRef"
                    v-model="dictForm.dictType"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="选择已有类型或输入新类型"
                    class="dict-drawer-field"
                    :teleported="false"
                    @blur="commitDictTypeInputOnBlur"
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
        <el-button v-if="hasButton(CMN_BUTTON.CANCEL)" @click="drawerVisible = false">{{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}</el-button>
        <el-button v-if="hasButton(CMN_BUTTON.SAVE)" type="primary" :loading="submitLoading" @click="onSaveDict">
          {{ CMN_BUTTON_LABEL[CMN_BUTTON.SAVE] }}
        </el-button>
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

/* 类型列纵向合并后单元格垂直居中 */
.page-list-table :deep(.dict-type-merge-col) {
  vertical-align: middle;
}

/* 按当前页连续 dictType 分组交替浅色底，合并 rowspan 时仅首格着色即可铺满视觉块 */
.page-list-table :deep(.dict-type-merge-col.dict-type-merge-g0) {
  background-color: #e8f1fb;
}
.page-list-table :deep(.dict-type-merge-col.dict-type-merge-g1) {
  background-color: #eef0f3;
}
.page-list-table :deep(.dict-type-merge-col.dict-type-merge-g2) {
  background-color: #e8f5ea;
}
.page-list-table :deep(.dict-type-merge-col.dict-type-merge-g3) {
  background-color: #f3eef8;
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

/* 主列表略收紧行高与字号，同屏可见更多行 */
.dict-main-table :deep(.el-table__cell) {
  padding-top: 4px;
  padding-bottom: 4px;
}

.dict-main-table :deep(.el-table .cell) {
  padding-left: 8px;
  padding-right: 8px;
  font-size: 13px;
  line-height: 1.35;
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
