<script setup lang="ts">
/**
 * 菜单图标下拉：预置 Element Plus 图标，下拉为 3 列网格；支持历史手写值回显。
 */
import { computed } from 'vue'
import { MENU_ICON_OPTIONS, type MenuIconOption } from '../constants/menuIconOptions'

const model = defineModel<string | null | undefined>({ default: '' })

/** el-select 绑定值（空串表示无图标） */
const selectValue = computed({
  get: () => model.value ?? '',
  set: (v: string) => {
    model.value = v === '' ? null : v
  },
})

/** 若当前值为历史手写且不在预置列表，临时插入一项以免编辑时空白 */
const options = computed((): MenuIconOption[] => {
  const v = (model.value ?? '').trim()
  if (v && !MENU_ICON_OPTIONS.some((o) => o.value === v)) {
    return [{ label: `未在列表: ${v}`, value: v, component: null }, ...MENU_ICON_OPTIONS]
  }
  return MENU_ICON_OPTIONS
})
</script>

<template>
  <el-select
    v-model="selectValue"
    clearable
    filterable
    placeholder="侧边栏图标"
    class="menu-icon-select w-full"
    popper-class="menu-icon-select-popper"
  >
    <el-option
      v-for="opt in options"
      :key="opt.value === '' ? '__none' : opt.value"
      :label="opt.label"
      :value="opt.value"
    >
      <span class="icon-option-row">
        <el-icon v-if="opt.component" class="icon-option-ic"><component :is="opt.component" /></el-icon>
        <span v-else class="icon-option-ic icon-option-empty" />
        <span class="icon-option-label">{{ opt.label }}</span>
        <span class="icon-option-value">{{ opt.value || '空' }}</span>
      </span>
    </el-option>
  </el-select>
</template>

<style scoped>
.w-full {
  width: 100%;
}

.icon-option-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.icon-option-ic {
  flex-shrink: 0;
  font-size: 16px;
}

.icon-option-empty {
  display: inline-block;
  width: 16px;
}

.icon-option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-option-value {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>

<!-- popper 挂载到 body，须用全局类名 -->
<style>
.menu-icon-select-popper.el-popper {
  min-width: 420px !important;
}

.menu-icon-select-popper .el-select-dropdown__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2px;
  padding: 6px;
  max-height: 360px;
}

.menu-icon-select-popper .el-select-dropdown__item {
  height: auto;
  line-height: 1.35;
  padding: 6px 8px;
  border-radius: var(--el-border-radius-small);
  margin: 0;
}

/* 「无图标」占满一行 */
.menu-icon-select-popper .el-select-dropdown__item:first-child {
  grid-column: 1 / -1;
}

.menu-icon-select-popper .el-select-dropdown__item.hover,
.menu-icon-select-popper .el-select-dropdown__item:hover {
  background-color: var(--el-fill-color-light);
}
</style>
