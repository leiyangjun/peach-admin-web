<script setup lang="ts">
/**
 * 绑定按钮：左右穿梭（左字典可选 + 模糊/分页，右已选）；必选 BTN_DEFAULT。
 */
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CMN_BUTTON, CMN_BUTTON_LABEL } from '../constants/cmnButton'
import type { ButtonDictVO } from '../models/permission'

const props = withDefaults(
  defineProps<{
    /** 全量字典（父级已拉取或弹窗内拉取） */
    buttonDict: ButtonDictVO[]
    /** 「查看」字典主键 id 字符串，不可从右侧移除 */
    viewDictId: string | null
    /** 右侧已选字典 id 顺序（打开时回显） */
    modelValue?: string[]
    /** 弹窗显隐 */
    visible: boolean
  }>(),
  {
    modelValue: () => [],
  },
)

const emit = defineEmits<{
  'update:visible': [v: boolean]
  'update:modelValue': [ids: string[]]
  confirm: [orderedDictIds: string[]]
}>()

const VIEW_CODE = 'BTN_DEFAULT'

const innerVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

/** 左侧模糊关键字 */
const leftKeyword = ref('')
/** 左侧分页 */
const leftPage = ref(1)
const leftPageSize = ref(8)

/** 右侧已选 id 顺序（弹窗内编辑副本） */
const rightIds = ref<string[]>([])

const dictById = computed(() => {
  const m = new Map<string, ButtonDictVO>()
  for (const d of props.buttonDict) {
    if (d.id != null) {
      m.set(String(d.id), d)
    }
  }
  return m
})

/** 左侧展示行：仅字典 + 关键字过滤 + 分页，不减去右侧已选 */
const leftFiltered = computed(() => {
  const q = leftKeyword.value.trim().toLowerCase()
  let list = props.buttonDict.filter((d) => d.id != null)
  if (q) {
    list = list.filter((d) => {
      const name = (d.buttonName ?? '').toLowerCase()
      const code = (d.buttonCode ?? '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }
  return list
})

const rightIdSet = computed(() => new Set(rightIds.value))

/** 左侧行高亮：已在右侧的 id */
function leftRowClassName({ row }: { row: ButtonDictVO }) {
  const id = row.id != null ? String(row.id) : ''
  return id && rightIdSet.value.has(id) ? 'shuttle-row--picked' : ''
}

const leftTotal = computed(() => leftFiltered.value.length)

const leftPaged = computed(() => {
  const start = (leftPage.value - 1) * leftPageSize.value
  return leftFiltered.value.slice(start, start + leftPageSize.value)
})

const rightRows = computed(() =>
  rightIds.value
    .map((id) => dictById.value.get(id))
    .filter((x): x is ButtonDictVO => x != null),
)

watch(
  () => props.visible,
  (v) => {
    if (v) {
      leftKeyword.value = ''
      leftPage.value = 1
      const ids = [...(props.modelValue ?? [])]
      const vid = props.viewDictId
      if (vid && !ids.includes(vid)) {
        ids.unshift(vid)
      }
      rightIds.value = ids
    }
  },
)

watch(leftKeyword, () => {
  leftPage.value = 1
})

function addLeftRow(row: ButtonDictVO) {
  const id = row.id != null ? String(row.id) : ''
  if (!id) {
    return
  }
  if (rightIds.value.includes(id)) {
    return
  }
  rightIds.value = [...rightIds.value, id]
}

function removeRightRow(row: ButtonDictVO) {
  const id = row.id != null ? String(row.id) : ''
  if (!id) {
    return
  }
  const vid = props.viewDictId
  if (vid && id === vid) {
    ElMessage.warning('「查看(默认)（BTN_DEFAULT）」为必选，不可移除。')
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
  const out = [...rightIds.value]
  if (vid && !out.includes(vid)) {
    out.unshift(vid)
  }
  emit('update:modelValue', out)
  emit('confirm', out)
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
        <div class="shuttle-table-wrap">
          <el-table
            :data="leftPaged"
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
      <el-button type="primary" @click="onConfirm">{{ CMN_BUTTON_LABEL[CMN_BUTTON.SAVE] }}</el-button>
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
