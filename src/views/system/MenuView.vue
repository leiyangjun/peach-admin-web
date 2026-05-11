<script setup lang="ts">
/**
 * 菜单管理：左侧树 + 右侧主从表单（无弹窗）；对接 peach-common-service。
 */
import { computed, ref, watch } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { useMenuController } from '../../controllers/system/useMenuController'
import { MENU_ICON_OPTIONS, type MenuIconOption } from '../../constants/menuIconOptions'
import type { MenuMgmtVO } from '../../models/menuMgmt'

/** 左侧树：有效(显示)与无效(隐藏)使用不同文字颜色 */
function menuTreeLabelClass(data: MenuMgmtVO): string {
  const v = data.valid
  const visible = v === undefined || v === null || Number(v) === 1
  return visible ? 'tree-node-label tree-node-label--visible' : 'tree-node-label tree-node-label--hidden'
}

const {
  loading,
  treeData,
  selectedId,
  panelMode,
  formModel,
  showEditor,
  parentMenuLabel,
  onTreeNodeClick,
  openCreateMenu,
  cancelPanel,
  submitForm,
  onDelete,
} = useMenuController()

const menuTypeOptions = [
  { label: '目录', value: 'CATALOG' },
  { label: '菜单', value: 'MENU' },
  { label: '按钮', value: 'BUTTON' },
]

/** 下拉项：若当前值为历史手写且不在预置列表，临时插入一项以免编辑时空白 */
const iconSelectOptions = computed((): MenuIconOption[] => {
  const v = (formModel.value.icon ?? '').trim()
  if (v && !MENU_ICON_OPTIONS.some((o) => o.value === v)) {
    return [{ label: `未在列表: ${v}`, value: v, component: null }, ...MENU_ICON_OPTIONS]
  }
  return MENU_ICON_OPTIONS
})

/** 预留区块默认折叠，减少右侧纵向占位 */
const collapseActive = ref<string[]>([])

/** 目录类型不需要路由/组件，输入禁用并由 watch 清空 */
const isCatalogMenu = computed(() => formModel.value.menuType === 'CATALOG')

watch(
  () => formModel.value.menuType,
  (t) => {
    if (t === 'CATALOG') {
      formModel.value.routePath = ''
      formModel.value.componentPath = ''
    }
  },
  { flush: 'sync' },
)
</script>

<template>
  <div class="menu-page menu-mgmt" v-loading="loading">
    <el-row class="menu-split-row" :gutter="10">
      <el-col class="menu-split-col" :xs="24" :sm="24" :md="9" :lg="8">
        <el-card shadow="never" class="panel-card menu-panel">
          <template #header>
            <div class="panel-header">
              <span class="card-title">菜单树</span>
              <div class="header-actions">
                <el-button size="small" type="primary" @click="openCreateMenu">新增菜单</el-button>
              </div>
            </div>
          </template>
          <div class="panel-body-fill tree-panel-body">
            <div class="tree-scroll">
              <el-tree
                v-if="treeData.length"
                class="menu-tree"
                :data="treeData"
                node-key="id"
                :current-node-key="selectedId ?? undefined"
                :props="{ label: 'menuName', children: 'children' }"
                highlight-current
                default-expand-all
                @node-click="onTreeNodeClick"
              >
                <template #default="{ data }">
                  <span :class="menuTreeLabelClass(data)">{{ data.menuName }}</span>
                </template>
              </el-tree>
              <el-empty v-else class="tree-empty" :image-size="56">
                <template #description>
                  <div class="empty-block">
                    <p class="empty-title">暂无菜单数据</p>
                    <p class="empty-desc">可先新增一级菜单；或先在左侧选中节点再新增，将作为其子菜单。</p>
                  </div>
                </template>
                <el-button type="primary" size="small" @click="openCreateMenu">新增菜单</el-button>
              </el-empty>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col class="menu-split-col" :xs="24" :sm="24" :md="15" :lg="16">
        <el-card shadow="never" class="detail-card menu-panel">
          <div v-if="showEditor" class="editor-layout">
            <!-- 仅此区域纵向滚动，底部按钮固定可见 -->
            <div class="form-scroll-area">
              <!-- 各 el-form-item 设置 :for="''"：标签区渲染为 div，不生成原生 label 的 for 关联，避免点击左侧文案误触控件 -->
              <el-form
                :model="formModel"
                label-width="108px"
                size="default"
                class="menu-edit-form menu-edit-form--balanced menu-edit-form--flat"
              >
                <div class="form-fields">
                  <el-row :gutter="16">
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" label="菜单编码" required>
                        <el-input
                          v-model="formModel.menuCode"
                          maxlength="64"
                          show-word-limit
                          placeholder="唯一编码，如 SYS_USER"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" label="菜单名称" required>
                        <el-input v-model="formModel.menuName" maxlength="64" show-word-limit placeholder="显示名称" />
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" label="类型" required>
                        <el-select v-model="formModel.menuType" class="w-full" placeholder="目录 / 菜单 / 按钮">
                          <el-option v-for="o in menuTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" label="排序号">
                        <el-input-number v-model="formModel.orderNo" :min="0" controls-position="right" class="w-full" />
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" class="form-item--switch">
                        <template #label>
                          <span class="label-with-tip">
                            菜单显示
                            <el-tooltip content="关闭后为逻辑停用，不会在「有效菜单树」中展示。" placement="top">
                              <el-icon class="label-tip-icon"><QuestionFilled /></el-icon>
                            </el-tooltip>
                          </span>
                        </template>
                        <el-switch
                          v-model="formModel.valid"
                          inline-prompt
                          :active-value="1"
                          :inactive-value="0"
                          active-text="显示"
                          inactive-text="隐藏"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" label="上级菜单">
                        <el-input :model-value="parentMenuLabel" disabled class="w-full" />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="16">
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" label="图标">
                        <el-select
                          v-model="formModel.icon"
                          clearable
                          filterable
                          placeholder="侧边栏图标"
                          class="w-full"
                        >
                          <el-option
                            v-for="opt in iconSelectOptions"
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
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" label="路由路径">
                        <el-input
                          v-model="formModel.routePath"
                          placeholder="如 /system/user"
                          clearable
                          :disabled="isCatalogMenu"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="16">
                    <el-col :span="24">
                      <el-form-item :for="''" label="组件路径" class="form-item--component">
                        <el-input
                          v-model="formModel.componentPath"
                          placeholder="相对 src 的视图路径，如 views/system/UserView.vue"
                          clearable
                          :disabled="isCatalogMenu"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="16">
                    <el-col :span="24">
                      <el-form-item :for="''" label="备注">
                        <el-input
                          v-model="formModel.remark"
                          type="textarea"
                          :rows="2"
                          maxlength="200"
                          show-word-limit
                          placeholder="选填"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>
              </el-form>

              <el-collapse v-model="collapseActive" class="menu-extra-collapse">
                <el-collapse-item title="菜单按钮（预留）" name="placeholder">
                  <el-alert
                    type="info"
                    show-icon
                    :closable="false"
                    class="detail-alert-compact"
                    title="后续将在此维护当前菜单下的操作按钮（数据表 cmn_menu_button），并与角色授权联动。"
                  />
                  <div class="placeholder-actions">
                    <el-button disabled size="small">绑定按钮（敬请期待）</el-button>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>

            <div class="form-footer-bar">
              <div class="footer-actions">
                <el-button v-if="panelMode === 'edit' && formModel.id" type="danger" plain @click="onDelete">
                  删除
                </el-button>
                <el-button @click="cancelPanel">取消</el-button>
                <el-button type="primary" @click="submitForm">提交</el-button>
              </div>
            </div>
          </div>

          <div v-else class="detail-placeholder">
            <el-empty class="detail-empty" :image-size="64">
              <template #description>
                <div class="empty-block">
                  <p class="empty-title">未选择菜单或未进入编辑</p>
                  <ol class="empty-steps">
                    <li>在左侧树中<strong>点击</strong>节点，右侧加载详情并可编辑（布局与新增一致）</li>
                    <li>点「新增菜单」：左侧<strong>未选中</strong>时为一级菜单；<strong>已选中</strong>节点时为该节点下的子菜单</li>
                  </ol>
                </div>
              </template>
            </el-empty>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.menu-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0;
  height: 100%;
}

.menu-mgmt {
  margin: 0;
}

/** 仅用 flex 占满 `.content` 分配高度，勿再用 100vh 最小高度（否则会高于内容区触发外层滚动条） */
.menu-split-row {
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.menu-split-col {
  display: flex;
  min-height: 0;
}

.menu-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.menu-mgmt :deep(.el-card__header) {
  flex-shrink: 0;
  padding: 10px 14px;
  background: var(--el-fill-color-blank);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.menu-mgmt :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 14px;
}

.panel-body-fill {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tree-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.detail-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.editor-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/** 表单区单独滚动，底部操作栏固定，避免整页出现第二条滚动条 */
.form-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

.form-footer-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 10px;
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.label-tip-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  cursor: help;
  outline: none;
}

.menu-edit-form--balanced :deep(.el-form-item) {
  margin-bottom: 14px;
}

.form-item--switch :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.menu-extra-collapse {
  margin-top: 4px;
  border: none;
}

.menu-extra-collapse :deep(.el-collapse-item__header) {
  height: 36px;
  padding: 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  background: transparent;
}

.menu-extra-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.menu-extra-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 8px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.menu-tree :deep(.el-tree-node__content) {
  height: 32px;
  border-radius: 4px;
}

/** valid=1 或未设置：正常强调色；逻辑停用(valid=0)：弱化灰 */
.tree-node-label--visible {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.tree-node-label--hidden {
  color: var(--el-text-color-placeholder);
  font-weight: 400;
}

.tree-empty,
.detail-empty {
  padding: 12px 0 8px;
}

.empty-block {
  text-align: left;
  max-width: 340px;
  margin: 0 auto;
}

.empty-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.empty-desc {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.empty-steps {
  margin: 0;
  padding-left: 1.1em;
  text-align: left;
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.65;
}

.empty-steps li {
  margin-bottom: 4px;
}

.placeholder-actions {
  margin-top: 8px;
}

.detail-divider {
  margin: 12px 0 10px;
}

.detail-alert-compact {
  padding: 6px 10px;
}

.detail-alert-compact :deep(.el-alert__title) {
  font-size: 12px;
  line-height: 1.45;
}

.w-full {
  width: 100%;
}

.menu-edit-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.menu-edit-form--flat :deep(.el-form-item) {
  margin-bottom: 12px;
}

.form-item--component :deep(.el-form-item__label) {
  align-self: flex-start;
  padding-top: 6px;
}

.icon-option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
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
}

.icon-option-value {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
