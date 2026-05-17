<script setup lang="ts">
/**
 * Quartz Cron 弹窗选择器（vue3-cron-plus-picker），五段式自动补秒前缀。
 */
import { ref, watch } from 'vue'
import 'vue3-cron-plus-picker/style.css'
import { Vue3CronPlusPicker } from 'vue3-cron-plus-picker'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [v: string]
}>()

const inner = ref(props.modelValue || '')
const dialogVisible = ref(false)
const pickerExpr = ref('')

/** 隐藏「年」与「最近运行」区块，减轻弹窗纵向占用（见 vue3-cron-plus-picker hideComponent 文档） */
const cronHiddenParts: string[] = ['year', 'result']

watch(
  () => props.modelValue,
  (v) => {
    inner.value = v || ''
  },
)

function normalizeQuartzCron(expr: string): string {
  const t = expr.trim()
  if (!t) {
    return t
  }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 5) {
    return `0 ${t}`
  }
  return t
}

function emitValue(v: string) {
  const n = normalizeQuartzCron(v)
  inner.value = n
  emit('update:modelValue', n)
}

function openDialog() {
  pickerExpr.value = normalizeQuartzCron(inner.value)
  dialogVisible.value = true
}

function onFill(v: string) {
  emitValue(v)
  dialogVisible.value = false
}
</script>

<template>
  <div class="vcrontab-field">
    <el-input :model-value="inner" class="cron-input" placeholder="点击右侧按钮配置 Cron" readonly>
      <template #append>
        <el-button type="primary" @click="openDialog">配置 Cron</el-button>
      </template>
    </el-input>

    <el-dialog
      v-model="dialogVisible"
      title="Cron 表达式"
      width="min(760px, 92vw)"
      class="cron-picker-dialog"
      align-center
      destroy-on-close
      append-to-body
      :lock-scroll="true"
      @close="dialogVisible = false"
    >
      <Vue3CronPlusPicker
        :expression="pickerExpr"
        :hide-component="cronHiddenParts"
        @fill="onFill"
        @hide="dialogVisible = false"
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.vcrontab-field {
  width: 100%;
}
.cron-input {
  width: 100%;
}
</style>

<style>
/**
 * append-to-body 弹窗：偏横向（宽、矮），正文可滚动；内部 cron 选择器压缩行高。
 * 与 AdminLayout 顶栏无关，独立 max-height 避免竖条过高。
 */
.cron-picker-dialog.el-dialog {
  width: min(760px, 92vw) !important;
  max-width: 92vw;
  margin: 4vh auto !important;
  max-height: min(460px, 88vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cron-picker-dialog .el-dialog__header {
  padding: 8px 12px 6px;
  margin-right: 0;
  flex-shrink: 0;
}
.cron-picker-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  max-height: min(380px, calc(88vh - 120px));
  overflow-x: hidden;
  overflow-y: auto;
  padding: 4px 10px 8px;
}
.cron-picker-dialog .el-dialog__footer {
  padding: 8px 10px 10px;
}
.cron-picker-dialog .vue3-cron-plus-picker,
.cron-picker-dialog .cron-plus-picker {
  width: 100%;
  max-width: none;
  margin: 0;
  font-size: 12px;
}
/* 时间表达式 + 最近运行 共用 .popup-result 类名：隐藏紧随其后的「最近运行」块 */
.cron-picker-dialog .popup-main > .popup-result + .popup-result {
  display: none !important;
}
.cron-picker-dialog .popup-main {
  margin: 6px auto 4px;
}
.cron-picker-dialog .pop_btn {
  margin-top: 8px !important;
}
.cron-picker-dialog .el-tabs--border-card > .el-tabs__header {
  margin: 0;
}
.cron-picker-dialog .el-tabs--border-card > .el-tabs__header .el-tabs__item {
  padding: 0 10px;
  height: 30px;
  line-height: 30px;
  font-size: 12px;
}
.cron-picker-dialog .el-tabs--border-card > .el-tabs__content {
  padding: 4px 8px 6px;
}
.cron-picker-dialog .el-tabs__nav-wrap {
  margin-bottom: 0;
}
.cron-picker-dialog .el-tab-pane {
  padding: 0;
}
.cron-picker-dialog .el-form-item {
  margin-bottom: 6px;
}
.cron-picker-dialog .el-radio {
  margin-right: 10px;
  height: 26px;
  line-height: 26px;
}
.cron-picker-dialog .el-checkbox {
  margin-right: 8px;
}
</style>
