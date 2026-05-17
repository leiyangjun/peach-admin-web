<script setup lang="ts">
/**
 * Cron 双模式：常用表达式（可搜索下拉）/ 自定义（no-vue3-cron 弹窗配置）。
 * 回显：能匹配常用预设则显示下拉；否则走自定义并在输入框/配置器中回显表达式。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { MoreFilled } from '@element-plus/icons-vue'
import { noVue3Cron } from 'no-vue3-cron'
import { CRON_PRESETS, filterCronPresets, groupCronPresets } from '../constants/cronPresets'
import {
  fromNoVue3CronExpression,
  normalizeQuartzCron,
  toNoVue3CronExpression,
} from '../utils/quartzCron'

type CronMode = 'preset' | 'custom'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [v: string]
}>()

const mode = ref<CronMode>('preset')
const selectedPreset = ref('')
const customExpr = ref('')
const pickerExpr = ref('')
const cronDialogVisible = ref(false)
/** 同步 modelValue 时抑制 watch 回写，避免覆盖编辑回显 */
const isInternalSync = ref(false)
/** 常用下拉搜索关键字（配合 filter-method） */
const presetSearchQuery = ref('')

const filteredPresets = computed(() => filterCronPresets(presetSearchQuery.value))
const presetGroups = computed(() => groupCronPresets(filteredPresets.value))

/** 在常用列表中查找与表达式等价的预设 value */
function findPresetValue(expr: string): string | undefined {
  const raw = expr.trim()
  if (!raw) {
    return undefined
  }
  const normalized = normalizeQuartzCron(raw)
  const candidates = [...new Set([raw, normalized].filter(Boolean))]
  for (const candidate of candidates) {
    const hit = CRON_PRESETS.find((p) => {
      const presetNorm = normalizeQuartzCron(p.value)
      return p.value.trim() === candidate || presetNorm === candidate
    })
    if (hit) {
      return hit.value
    }
  }
  return undefined
}

function syncFromModelValue(expr: string | undefined) {
  isInternalSync.value = true
  const raw = (expr ?? '').trim()
  if (!raw) {
    mode.value = 'preset'
    selectedPreset.value = ''
    customExpr.value = ''
    pickerExpr.value = ''
    void nextTick(() => {
      isInternalSync.value = false
    })
    return
  }

  const normalized = normalizeQuartzCron(raw) || raw
  const presetValue = findPresetValue(raw)

  customExpr.value = normalized
  pickerExpr.value = toNoVue3CronExpression(normalized)

  if (presetValue) {
    mode.value = 'preset'
    selectedPreset.value = presetValue
  } else {
    mode.value = 'custom'
    selectedPreset.value = ''
  }

  void nextTick(() => {
    isInternalSync.value = false
  })
}

function emitCron(expr: string) {
  const normalized = normalizeQuartzCron(expr.trim())
  if (normalized) {
    emit('update:modelValue', normalized)
  }
}

function onPresetFilter(query: string) {
  presetSearchQuery.value = query
}

function onPresetVisibleChange(visible: boolean) {
  if (!visible) {
    presetSearchQuery.value = ''
  }
}

watch(
  () => props.modelValue,
  (v) => syncFromModelValue(v),
  { immediate: true },
)

watch(selectedPreset, (v) => {
  if (isInternalSync.value) {
    return
  }
  if (mode.value === 'preset' && v) {
    emitCron(v)
  }
})

watch(mode, (m) => {
  if (isInternalSync.value) {
    return
  }
  if (m === 'preset') {
    cronDialogVisible.value = false
    if (!selectedPreset.value) {
      const fromModel = findPresetValue(props.modelValue)
      if (fromModel) {
        selectedPreset.value = fromModel
      }
    }
    if (selectedPreset.value) {
      emitCron(selectedPreset.value)
    }
  } else {
    const echoed = normalizeQuartzCron(customExpr.value || props.modelValue)
    if (echoed) {
      customExpr.value = echoed
      pickerExpr.value = toNoVue3CronExpression(echoed)
      emitCron(echoed)
    }
  }
})

function syncPickerExpr() {
  const echoed = normalizeQuartzCron(customExpr.value || props.modelValue)
  pickerExpr.value = toNoVue3CronExpression(echoed || '0 0 * * * ?')
}

/** 仅「自定义」模式下打开 Cron 配置弹窗 */
async function openCronDialog() {
  if (mode.value !== 'custom') {
    return
  }
  syncPickerExpr()
  cronDialogVisible.value = true
  await nextTick()
}

function onNoVue3CronChange(val: string) {
  if (typeof val !== 'string') {
    return
  }
  const normalized = fromNoVue3CronExpression(val)
  customExpr.value = normalized
  pickerExpr.value = toNoVue3CronExpression(normalized)
  emitCron(normalized)
  cronDialogVisible.value = false
}

function onNoVue3CronClose() {
  cronDialogVisible.value = false
}
</script>

<template>
  <div class="vcrontab-field">
    <div class="vcrontab-field__row">
      <el-radio-group v-model="mode" class="vcrontab-field__mode" size="small">
        <el-radio-button label="preset">常用</el-radio-button>
        <el-radio-button label="custom">自定义</el-radio-button>
      </el-radio-group>

      <el-select
        v-if="mode === 'preset'"
        v-model="selectedPreset"
        filterable
        clearable
        :filter-method="onPresetFilter"
        class="vcrontab-field__control"
        placeholder="搜索并选择常用表达式"
        no-match-text="无匹配项，可改用「自定义」"
        :teleported="true"
        @visible-change="onPresetVisibleChange"
      >
        <template v-if="filteredPresets.length === 0" #empty>
          <span class="select-empty-tip">无匹配项，请换个关键词或改用「自定义」</span>
        </template>
        <el-option-group v-for="grp in presetGroups" :key="grp.name" :label="grp.name">
          <el-option
            v-for="item in grp.items"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
            <div class="preset-option">
              <span class="preset-option__label">{{ item.label }}</span>
              <span class="preset-option__value">{{ item.value }}</span>
            </div>
          </el-option>
        </el-option-group>
      </el-select>

      <el-input
        v-else
        :model-value="customExpr"
        class="vcrontab-field__control"
        readonly
        placeholder="点击右侧按钮配置 Cron 表达式"
      >
        <template #append>
          <el-button :icon="MoreFilled" title="配置 Cron 表达式" @click="openCronDialog" />
        </template>
      </el-input>
    </div>

    <el-dialog
      v-model="cronDialogVisible"
      title="配置 Cron 表达式"
      width="640px"
      class="cron-no-vue3-dialog"
      align-center
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div v-if="cronDialogVisible" class="cron-no-vue3-dialog__inner">
        <component
          :is="noVue3Cron"
          :key="pickerExpr"
          :cron-value="pickerExpr"
          i18n="cn"
          max-height="280px"
          @change="onNoVue3CronChange"
          @close="onNoVue3CronClose"
        />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.vcrontab-field {
  width: 100%;
  min-width: 0;
}

.vcrontab-field__row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.vcrontab-field__mode {
  flex-shrink: 0;
}

.vcrontab-field__control {
  flex: 1;
  min-width: 0;
}

.select-empty-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.preset-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.preset-option__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-option__value {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, monospace;
}
</style>

<style>
/* 弹窗固定尺寸，内容在内部滚动，不随 Tab 内容撑高 */
.cron-no-vue3-dialog.el-dialog {
  width: 640px !important;
  max-width: 640px !important;
  height: 460px;
  max-height: 460px;
  margin: 8vh auto !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.cron-no-vue3-dialog .el-dialog__header {
  flex-shrink: 0;
  padding-bottom: 8px;
}
.cron-no-vue3-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  height: 0;
  padding: 8px 12px 12px;
  overflow: hidden;
  box-sizing: border-box;
}
.cron-no-vue3-dialog__inner {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.cron-no-vue3-dialog .no-vue3-cron-div {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 13px;
}
.cron-no-vue3-dialog .no-vue3-cron-div .el-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}
.cron-no-vue3-dialog .no-vue3-cron-div .el-tabs__header {
  flex-shrink: 0;
  margin-bottom: 0;
}
.cron-no-vue3-dialog .no-vue3-cron-div .el-tabs__content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.cron-no-vue3-dialog .no-vue3-cron-div .el-tab-pane {
  height: 100%;
  overflow: hidden;
}
.cron-no-vue3-dialog .no-vue3-cron-div .el-tabs__item {
  height: 32px;
  line-height: 32px;
  font-size: 13px;
  padding: 0 14px;
}
.cron-no-vue3-dialog .no-vue3-cron-div .tabBody {
  height: 100%;
  max-height: 280px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 4px 2px;
  box-sizing: border-box;
}
.cron-no-vue3-dialog .no-vue3-cron-div .tabBody .el-row {
  margin: 10px 0;
}
.cron-no-vue3-dialog .no-vue3-cron-div .tabBody .el-row .el-input-number {
  width: 110px;
}
.cron-no-vue3-dialog .no-vue3-cron-div .bottom {
  flex-shrink: 0;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  justify-content: center;
  gap: 8px;
}
.cron-no-vue3-dialog .no-vue3-cron-div .bottom .el-button {
  min-width: 72px;
}
.cron-no-vue3-dialog .no-vue3-cron-div .bottom .value {
  display: none;
}
.cron-no-vue3-dialog .no-vue3-cron-div .language {
  display: none;
}
</style>
