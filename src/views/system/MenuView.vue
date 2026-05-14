<script setup lang="ts">
/**
 * 菜单管理：左侧树 + 右侧主从表单（无弹窗）；对接 peach-common-service。
 */
import { computed, ref, watch } from 'vue'
import { Plus, QuestionFilled } from '@element-plus/icons-vue'
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

/** 左侧菜单树默认宽度（px），较原栅格约 33% 更窄 */
const TREE_PANEL_DEFAULT_PX = 240
/** 拖拽调整时的最小/最大宽度（px） */
const TREE_PANEL_MIN_PX = 200
const TREE_PANEL_MAX_PX = 560

const treePanelWidthPx = ref(TREE_PANEL_DEFAULT_PX)

function clampTreeWidth(w: number): number {
  return Math.min(TREE_PANEL_MAX_PX, Math.max(TREE_PANEL_MIN_PX, w))
}

/** 左右分栏拖拽：mousedown 起在 window 上跟踪移动与释放 */
function onTreeResizePointerDown(e: MouseEvent) {
  if (e.button !== 0) {
    return
  }
  e.preventDefault()
  const startX = e.clientX
  const startW = treePanelWidthPx.value
  const prevUserSelect = document.body.style.userSelect
  document.body.style.userSelect = 'none'

  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - startX
    treePanelWidthPx.value = clampTreeWidth(startW + dx)
  }
  const onUp = () => {
    document.body.style.userSelect = prevUserSelect
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

/** 目录类型不需要路由/组件，输入禁用并由 watch 清空 */
const isCatalogMenu = computed(() => formModel.value.menuType === 'CATALOG')

watch(
  () => formModel.value.menuType,
  (t) => {
    if (t === 'CATALOG') {
      formModel.value.routePath = ''
    }
  },
  { flush: 'sync' },
)
</script>

<template>
  <div class="menu-page menu-mgmt" v-loading="loading">
    <div class="menu-split">
      <div class="menu-split__tree" :style="{ width: `${treePanelWidthPx}px` }">
        <el-card shadow="never" class="panel-card menu-panel">
          <template #header>
            <div class="panel-header">
              <span class="card-title">菜单树</span>
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
                @node-click="onTreeNodeClick"
              >
                <template #default="{ data }">
                  <div class="menu-tree-node">
                    <span :class="menuTreeLabelClass(data)">{{ data.menuName }}</span>
                    <el-tooltip content="在此节点下新增子菜单" placement="right">
                      <button
                        type="button"
                        class="menu-tree-add-btn"
                        aria-label="新增子菜单"
                        @click.stop="openCreateMenu(data.id)"
                      >
                        <el-icon><Plus /></el-icon>
                      </button>
                    </el-tooltip>
                  </div>
                </template>
              </el-tree>
              <el-empty v-else class="tree-empty" :image-size="56">
                <template #description>
                  <div class="empty-block">
                    <p class="empty-title">暂无菜单数据</p>
                    <p class="empty-desc">点击下方「+」新增一级菜单；树中有数据时，悬停节点行可在此节点下新增子菜单。</p>
                  </div>
                </template>
              </el-empty>
            </div>
            <el-tooltip content="在此新增一级菜单" placement="top" class="menu-tree-root-add-tip">
              <button type="button" class="menu-tree-root-add" aria-label="新增一级菜单" @click="openCreateMenu(0)">
                <el-icon><Plus /></el-icon>
              </button>
            </el-tooltip>
          </div>
        </el-card>
      </div>

      <div
        class="menu-split__resizer"
        role="separator"
        aria-orientation="vertical"
        title="拖动调整左侧宽度"
        @mousedown="onTreeResizePointerDown"
      />

      <div class="menu-split__detail">
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
                        <el-select v-model="formModel.menuType" class="w-full" placeholder="目录 / 菜单">
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
                          placeholder="站内页如 /system/user，与 src/views 下路径约定对应"
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
                    <li>树底「+」行：始终新增<strong>一级菜单</strong>；悬停树节点行右侧「+」：在该节点下新增<strong>子菜单</strong></li>
                  </ol>
                </div>
              </template>
            </el-empty>
          </div>
        </el-card>
      </div>
    </div>
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

/** 左右分栏：左侧固定像素宽（可拖拽），右侧 flex 占满 */
.menu-split {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: stretch;
  gap: 0;
}

.menu-split__tree {
  flex-shrink: 0;
  min-width: 0;
  display: flex;
  min-height: 0;
}

.menu-split__detail {
  flex: 1;
  min-width: 0;
  display: flex;
  min-height: 0;
}

/** 竖向分隔条：易拖、无额外依赖 */
.menu-split__resizer {
  flex-shrink: 0;
  width: 6px;
  margin: 0 2px;
  cursor: col-resize;
  position: relative;
  align-self: stretch;
  border-radius: 4px;
  background: transparent;
}

.menu-split__resizer:hover,
.menu-split__resizer:focus-visible {
  background: var(--el-fill-color-light);
}

.menu-split__resizer::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 8px;
  bottom: 8px;
  width: 2px;
  transform: translateX(-50%);
  border-radius: 1px;
  background: var(--el-border-color);
}

@media (max-width: 768px) {
  .menu-split {
    flex-direction: column;
  }

  .menu-split__tree {
    width: 100% !important;
    flex: 0 0 auto;
    max-height: 46vh;
  }

  .menu-split__resizer {
    display: none;
  }

  .menu-split__detail {
    flex: 1;
    min-height: 0;
  }
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

/** 左栏：树区域可滚动，底部固定「一级菜单」入口 */
.tree-panel-body {
  min-height: 0;
}

/** 节点行：标签 + 悬停/聚焦时显示的子级「+」 */
.menu-tree-node {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 4px;
}

.menu-tree-add-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-left: auto;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.menu-tree-add-btn:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.menu-tree :deep(.el-tree-node__content:hover) .menu-tree-add-btn,
.menu-tree-node:hover .menu-tree-add-btn,
.menu-tree-add-btn:focus-visible {
  opacity: 1;
}

/** 根级「+」tooltip 容器：占满行宽，与 .menu-tree-root-add 一致 */
.menu-tree-root-add-tip {
  display: block;
  width: 100%;
  flex-shrink: 0;
}

/** 树底全宽：新增一级菜单（等价于原顶部按钮，parentId=0） */
.menu-tree-root-add {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 36px;
  margin-top: 6px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background-color 0.15s ease;
}

.menu-tree-root-add:hover {
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.menu-tree-root-add:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
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

.menu-tree :deep(.el-tree-node__content) {
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  min-width: 0;
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
