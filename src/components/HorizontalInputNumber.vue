<script setup lang="ts">
/**
 * 横向数字输入：左侧减号、中间输入框、右侧加号；可选单位前缀（如 ms）。
 */
import { computed } from 'vue'
import { Minus, Plus } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    placeholder?: string
    /** 输入框内左侧单位标签，如「毫秒」「ms」 */
    prefix?: string
  }>(),
  {
    step: 1,
    disabled: false,
  },
)

const model = defineModel<number | null | undefined>()

const numericValue = computed(() => {
  const v = model.value
  if (v === null || v === undefined || Number.isNaN(Number(v))) {
    return undefined
  }
  return Number(v)
})

const atMin = computed(() => props.min !== undefined && numericValue.value !== undefined && numericValue.value <= props.min)

const atMax = computed(() => props.max !== undefined && numericValue.value !== undefined && numericValue.value >= props.max)

function clamp(value: number): number {
  let next = value
  if (props.min !== undefined && next < props.min) {
    next = props.min
  }
  if (props.max !== undefined && next > props.max) {
    next = props.max
  }
  return next
}

function stepBy(delta: number) {
  if (props.disabled) {
    return
  }
  const step = props.step ?? 1
  const base = numericValue.value ?? (props.min ?? 0)
  model.value = clamp(base + delta * step)
}
</script>

<template>
  <div
    class="horizontal-input-number"
    :class="{ 'is-disabled': disabled, 'has-prefix': !!prefix }"
  >
    <button
      type="button"
      class="hin-btn hin-btn--minus"
      :disabled="disabled || atMin"
      aria-label="减少"
      @click="stepBy(-1)"
    >
      <el-icon><Minus /></el-icon>
    </button>
    <div class="hin-input-wrap">
      <span v-if="prefix" class="hin-prefix">{{ prefix }}</span>
      <el-input-number
        v-model="model"
        class="hin-input"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        :placeholder="placeholder"
        :controls="false"
      />
    </div>
    <button
      type="button"
      class="hin-btn hin-btn--plus"
      :disabled="disabled || atMax"
      aria-label="增加"
      @click="stepBy(1)"
    >
      <el-icon><Plus /></el-icon>
    </button>
  </div>
</template>

<style scoped>
.horizontal-input-number {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.hin-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background-color 0.15s ease;
}

.hin-btn--minus {
  border-radius: var(--el-border-radius-base) 0 0 var(--el-border-radius-base);
  border-right: none;
}

.hin-btn--plus {
  border-radius: 0 var(--el-border-radius-base) var(--el-border-radius-base) 0;
  border-left: none;
}

.hin-btn:hover:not(:disabled) {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
  background: var(--el-fill-color-light);
  z-index: 1;
}

.hin-btn:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
  z-index: 2;
}

.hin-btn:disabled {
  cursor: not-allowed;
  color: var(--el-text-color-placeholder);
  background: var(--el-fill-color-light);
}

.hin-input-wrap {
  flex: 1;
  min-width: 0;
  position: relative;
  display: flex;
  align-items: center;
}

.hin-prefix {
  position: absolute;
  left: 10px;
  z-index: 1;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  pointer-events: none;
  white-space: nowrap;
}

.has-prefix :deep(.hin-input .el-input__wrapper) {
  padding-left: 42px;
}

.hin-input {
  width: 100%;
}

.hin-input :deep(.el-input__wrapper) {
  border-radius: 0;
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

.hin-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-border-color-hover) inset;
}

.hin-input :deep(.el-input.is-focus .el-input__wrapper),
.hin-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.horizontal-input-number:not(.is-disabled):hover .hin-btn:not(:disabled) {
  border-color: var(--el-border-color-hover);
}

.horizontal-input-number:not(.is-disabled):hover .hin-input :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-border-color-hover) inset;
}

.is-disabled .hin-btn {
  cursor: not-allowed;
}

.is-disabled .hin-input :deep(.el-input__wrapper) {
  background-color: var(--el-fill-color-light);
}
</style>
