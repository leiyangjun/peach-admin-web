<script setup lang="ts">
/**
 * 绑定按钮：左右穿梭（左字典可选 + 服务端模糊/分页，右已选）；必选 BTN_QUERY（查看/查询）。
 */
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { buildPageParams, sliceRowsForPage } from '../utils/pagination'
import { BTN_UI, CMN_BUTTON, CMN_BUTTON_LABEL } from '../constants/cmnButton'
import type { ButtonPageQuery, PageInfoButton } from '../api/button'
import type { ButtonDictVO } from '../models/permission'

const props = withDefaults(
  defineProps<{
    /** 服务端分页查询 */
    fetchPage: (query: ButtonPageQuery) => Promise<PageInfoButton>
    /** 打开弹窗时右侧已选行的 code/name 回显（来自本地槽） */
    seedRows?: ButtonDictVO[]
    /** 「查看」字典主键 id 字符串，不可从右侧移除 */
    viewDictId: string | null
    /** 右侧已选字典 id 顺序（打开时回显） */
    modelValue?: string[]
    /** 弹窗显隐 */
    visible: boolean
  }>(),
  {
    modelValue: () => [],
    seedRows: () => [],
  },
)

const emit = defineEmits<{
  'update:visible': [v: boolean]
  'update:modelValue': [ids: string[]]
  confirm: [orderedRows: ButtonDictVO[]]
}>()

const VIEW_CODE = 'BTN_QUERY'

const innerVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

/** 左侧模糊关键字 */
const leftKeyword = ref('')
/** 左侧分页 */
const leftPage = ref(1)
const leftPageSize = ref(8)
const leftRows = ref<ButtonDictVO[]>([])
const leftTotal = ref(0)
const leftLoading = ref(false)

/** 右侧已选 id 顺序（弹窗内编辑副本） */
const rightIds = ref<string[]>([])
/** 已选行缓存（含分页未加载项），用于右侧展示 */
const pickedById = ref<Map<string, ButtonDictVO>>(new Map())

const rightIdSet = computed(() => new Set(rightIds.value))

/** 左侧行高亮：已在右侧的 id */
function leftRowClassName({ row }: { row: ButtonDictVO }) {
  const id = row.id != null ? String(row.id) : ''
  return id && rightIdSet.value.has(id) ? 'shuttle-row--picked' : ''
}

const rightRows = computed(() =>
  rightIds.value
    .map((id) => pickedById.value.get(id))
    .filter((x): x is ButtonDictVO => x != null),
)

function seedPickedMap() {
  const m = new Map<string, ButtonDictVO>()
  for (const row of props.seedRows ?? []) {
    if (row.id != null) {
      m.set(String(row.id), row)
    }
  }
  pickedById.value = m
}

async function loadLeftPage() {
  leftLoading.value = true
  try {
    const query = buildPageParams(leftPage.value, leftPageSize.value)
    const res = await props.fetchPage({
      ...query,
      searchValue: leftKeyword.value.trim() || undefined,
    })
    leftRows.value = sliceRowsForPage(res.list ?? [], query.pageNum, query.pageSize)
    leftTotal.value = res.total
  } catch (e) {
    leftRows.value = []
    leftTotal.value = 0
    ElMessage.error(e instanceof Error ? e.message : '加载可选按钮失败')
  } finally {
    leftLoading.value = false
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      leftKeyword.value = ''
      leftPage.value = 1
      seedPickedMap()
      const ids = [...(props.modelValue ?? [])]
      const vid = props.viewDictId
      if (vid && !ids.includes(vid)) {
        ids.unshift(vid)
      }
      rightIds.value = ids
      void loadLeftPage()
    }
  },
)

watch(leftKeyword, () => {
  leftPage.value = 1
  if (props.visible) {
    void loadLeftPage()
  }
})

watch(leftPage, () => {
  if (props.visible) {
    void loadLeftPage()
  }
})

function addLeftRow(row: ButtonDictVO) {
  const id = row.id != null ? String(row.id) : ''
  if (!id) {
    return
  }
  if (rightIds.value.includes(id)) {
    return
  }
  pickedById.value.set(id, row)
  rightIds.value = [...rightIds.value, id]
}

function removeRightRow(row: ButtonDictVO) {
  const id = row.id != null ? String(row.id) : ''
  if (!id) {
    return
  }
  const vid = props.viewDictId
  if (vid && id === vid) {
    ElMessage.warning('「查询（BTN_QUERY）」为必选，不可移除。')
    return
  }
  const isViewCode = (row.buttonCode ?? '') === VIEW_CODE
  if (isViewCode) {
    ElMessage.warning('「查看」为必选按钮，不可移除。')
    return
  }
  rightIds.value = rightIds.value.filter((x) => x !== id)
}

function onConfirm() {
  const vid = props.viewDictId
  const outIds = [...rightIds.value]
  if (vid && !outIds.includes(vid)) {
    outIds.unshift(vid)
  }
  const outRows = outIds
    .map((id) => pickedById.value.get(id))
    .filter((x): x is ButtonDictVO => x != null)
  emit('update:modelValue', outIds)
  emit('confirm', outRows)
  innerVisible.value = false
}

function onCancel() {
  innerVisible.value = false
}
</script>

<template>
  <el-dialog
    v-model="innerVisible"
    title="绑定按钮"
    width="720px"
    class="dict-shuttle-dialog"
    append-to-body
    destroy-on-close
    @closed="leftKeyword = ''"
  >
    <div class="shuttle-body">
      <div class="shuttle-col">
        <div class="shuttle-col-title">可选按钮</div>
        <el-input v-model="leftKeyword" clearable size="small" placeholder="名称/编码模糊过滤" class="shuttle-search" />
        <div v-loading="leftLoading" class="shuttle-table-wrap">
          <el-table
            :data="leftRows"
            :row-class-name="leftRowClassName"
            size="small"
            border
            stripe
            height="240"
            class="shuttle-table"
            @row-click="(row: ButtonDictVO) => addLeftRow(row)"
          >
            <template #empty>
              <el-empty description="无匹配项" :image-size="48" />
            </template>
            <el-table-column prop="buttonName" label="名称" min-width="88" show-overflow-tooltip />
            <el-table-column prop="buttonCode" label="编码" width="100" show-overflow-tooltip />
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
        <div class="shuttle-col-title">已绑定</div>
        <div class="shuttle-search-placeholder" />
        <div class="shuttle-table-wrap">
          <el-table
            :data="rightRows"
            size="small"
            border
            stripe
            height="240"
            class="shuttle-table"
            @row-click="(row: ButtonDictVO) => removeRightRow(row)"
          >
            <template #empty>
              <el-empty description="请从左侧添加" :image-size="48" />
            </template>
            <el-table-column prop="buttonName" label="名称" min-width="88" show-overflow-tooltip />
            <el-table-column prop="buttonCode" label="编码" width="100" show-overflow-tooltip />
          </el-table>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="onCancel">{{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}</el-button>
      <el-button type="primary" @click="onConfirm">{{ BTN_UI.SAVE }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dict-shuttle-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
  max-height: 400px;
  overflow: hidden;
}

.shuttle-body {
  display: flex;
  gap: 12px;
  align-items: stretch;
  max-height: 360px;
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

.shuttle-search {
  margin-bottom: 8px;
}

.shuttle-search-placeholder {
  height: 32px;
  margin-bottom: 8px;
}

.shuttle-table-wrap {
  flex: 1;
  min-height: 0;
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
