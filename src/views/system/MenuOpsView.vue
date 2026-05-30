<script setup lang="ts">
/**
 * 运维菜单管理：左树右表单；新建仅目录；类型只读；不含按钮/API 绑定区。
 */
import { computed } from 'vue'
import { Plus, QuestionFilled } from '@element-plus/icons-vue'
import { useMenuOpsController } from '../../controllers/system/useMenuOpsController'
import { useMenuPanelResize } from '../../composables/useMenuPanelResize'
import MenuIconSelect from '../../components/MenuIconSelect.vue'
import { BTN_UI, CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
import { useButtonPermission } from '../../composables/useButtonPermission'
import type { MenuOpsTreeNode } from '../../models/menuOps'

const {
  loading,
  treeData,
  parentMenuLabel,
  selectedId,
  panelMode,
  formModel,
  showEditor,
  menuTypeLabel,
  menuTypeTagType,
  isCatalogNode,
  canDeleteCatalog,
  onTreeNodeClick,
  allowTreeDrag,
  allowTreeDrop,
  onTreeNodeDrop,
  openCreateMenu,
  cancelPanel,
  submitForm,
  onDelete,
} = useMenuOpsController()

const { hasButton } = useButtonPermission()
const { treePanelWidthPx, onTreeResizePointerDown } = useMenuPanelResize()

const canDragMenuTree = computed(() => hasButton(CMN_BUTTON.EDIT))

function menuTreeLabelClass(data: MenuOpsTreeNode): string {
  const v = data.valid
  const visible = v === undefined || v === null || Number(v) === 1
  return visible ? 'tree-node-label tree-node-label--visible' : 'tree-node-label tree-node-label--hidden'
}

</script>

<template>
  <div class="menu-page menu-ops" v-loading="loading">
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
                :draggable="canDragMenuTree"
                :allow-drag="allowTreeDrag"
                :allow-drop="allowTreeDrop"
                @node-click="onTreeNodeClick"
                @node-drop="onTreeNodeDrop"
              >
                <template #default="{ data }">
                  <div class="menu-tree-node">
                    <span :class="menuTreeLabelClass(data)">{{ data.menuName }}</span>
                    <el-tag
                      v-if="data.menuType"
                      size="small"
                      :type="menuTypeTagType(data.menuType)"
                      class="type-tag"
                    >
                      {{ menuTypeLabel(data.menuType) }}
                    </el-tag>
                    <el-tooltip
                      v-if="hasButton(CMN_BUTTON.ADD) && isCatalogNode(data)"
                      :content="`在此目录下${CMN_BUTTON_LABEL[CMN_BUTTON.ADD]}子目录`"
                      placement="right"
                    >
                      <button
                        type="button"
                        class="menu-tree-add-btn"
                        :aria-label="`${CMN_BUTTON_LABEL[CMN_BUTTON.ADD]}子目录`"
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
                    <p class="empty-desc">点击下方「+」新增一级目录；树中有数据时，悬停目录节点可在此下新增子项。</p>
                  </div>
                </template>
              </el-empty>
            </div>
            <el-tooltip
              v-if="hasButton(CMN_BUTTON.ADD)"
              :content="`新增一级目录`"
              placement="top"
              class="menu-tree-root-add-tip"
            >
              <button type="button" class="menu-tree-root-add" aria-label="新增一级目录" @click="openCreateMenu(0)">
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
            <div class="form-scroll-area">
              <el-form
                :model="formModel"
                label-width="108px"
                size="default"
                class="menu-edit-form menu-edit-form--balanced menu-edit-form--flat"
              >
                <div class="form-fields">
                  <el-row :gutter="16">
                    <el-col v-if="panelMode === 'edit'" :xs="24" :sm="12">
                      <el-form-item :for="''" label="菜单编码">
                        <el-input :model-value="formModel.menuCode" disabled />
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="panelMode === 'edit' ? 12 : 24">
                      <el-form-item :for="''" label="菜单名称" required>
                        <el-input v-model="formModel.menuName" maxlength="64" show-word-limit placeholder="显示名称" />
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" label="类型">
                        <el-tag v-if="panelMode === 'create'" type="primary">目录</el-tag>
                        <el-tag v-else :type="menuTypeTagType(formModel.menuType)">
                          {{ menuTypeLabel(formModel.menuType) }}
                        </el-tag>
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" label="排序号">
                        <el-input-number v-model="formModel.orderNo" :min="0" controls-position="right" class="w-full" />
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" class="form-item--switch form-item--label-tip">
                        <template #label>
                          <span class="label-with-tip">
                            菜单显示
                            <el-tooltip content="关闭后为逻辑停用，不会在有效菜单树中展示。" placement="top">
                              <span class="tip-trigger" tabindex="0" role="button" aria-label="菜单显示说明">
                                <el-icon><QuestionFilled /></el-icon>
                              </span>
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
                      <el-form-item :for="''" required class="form-item--label-tip">
                        <template #label>
                          <span class="label-with-tip">
                            上级菜单
                            <el-tooltip
                              content="一级无上级；调整层级请拖动左侧树节点。子级「菜单」须挂在「目录」下。"
                              placement="top"
                            >
                              <span class="tip-trigger" tabindex="0" role="button" aria-label="上级菜单说明">
                                <el-icon><QuestionFilled /></el-icon>
                              </span>
                            </el-tooltip>
                          </span>
                        </template>
                        <el-input :model-value="parentMenuLabel" disabled placeholder="—" />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="16">
                    <el-col :xs="24" :sm="12">
                      <el-form-item :for="''" label="图标">
                        <MenuIconSelect v-model="formModel.icon" />
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
            </div>

            <div class="form-footer-bar">
              <div class="footer-actions">
                <el-button
                  v-if="canDeleteCatalog && hasButton(CMN_BUTTON.DELETE)"
                  type="danger"
                  plain
                  @click="onDelete"
                >
                  {{ CMN_BUTTON_LABEL[CMN_BUTTON.DELETE] }}
                </el-button>
                <el-button v-if="hasButton(CMN_BUTTON.CANCEL)" @click="cancelPanel">
                  {{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}
                </el-button>
                <el-button
                  v-if="hasButton(CMN_BUTTON.ADD) || hasButton(CMN_BUTTON.EDIT)"
                  type="primary"
                  @click="submitForm"
                >
                  {{ panelMode === 'create' ? CMN_BUTTON_LABEL[CMN_BUTTON.ADD] : BTN_UI.SAVE }}
                </el-button>
              </div>
            </div>
          </div>

          <div v-else class="detail-placeholder">
            <el-empty class="detail-empty" :image-size="64">
              <template #description>
                <div class="empty-block">
                  <p class="empty-title">未选择菜单或未进入编辑</p>
                  <ol class="empty-steps">
                    <li>在左侧树中<strong>点击</strong>目录或菜单节点，右侧加载详情并可编辑</li>
                    <li>有编辑权限时，可在左侧树<strong>拖拽</strong>节点调整上级菜单</li>
                    <li>类型创建后不可修改；仅目录可删除</li>
                    <li>树底「+」：新增<strong>一级目录</strong>；悬停目录行「+」：在该目录下新增<strong>子目录</strong></li>
                    <li>仅<strong>目录</strong>可删除；有下级时须先处理子节点</li>
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

.menu-ops {
  margin: 0;
}

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

.menu-ops :deep(.el-card__header) {
  flex-shrink: 0;
  padding: 10px 14px;
  background: var(--el-fill-color-blank);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.menu-ops :deep(.el-card__body) {
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

.tree-panel-body {
  min-height: 0;
}

.menu-tree-node {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 4px;
}

.type-tag {
  flex-shrink: 0;
  margin-left: 2px;
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

.menu-tree-root-add-tip {
  display: block;
  width: 100%;
  flex-shrink: 0;
}

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

/** 带问号提示的 label：恢复 hover（全局 .el-form-item__label 为 pointer-events: none） */
.menu-edit-form :deep(.form-item--label-tip .el-form-item__label) {
  overflow: visible;
  pointer-events: auto;
}

.tip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  cursor: help;
  color: var(--el-text-color-secondary);
  outline: none;
  pointer-events: auto;
}

.tip-trigger .el-icon {
  font-size: 14px;
}

.tip-trigger:hover,
.tip-trigger:focus-visible {
  color: var(--el-color-primary);
}

.menu-edit-form--balanced :deep(.el-form-item) {
  margin-bottom: 14px;
}

.form-item--switch :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  min-height: 32px;
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

.menu-tree :deep(.el-tree-node.is-dragging > .el-tree-node__content) {
  cursor: grabbing;
}

.menu-tree :deep(.el-tree-node.is-drop-inner > .el-tree-node__content) {
  background-color: var(--el-color-primary-light-9);
}

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

.w-full {
  width: 100%;
}

.menu-edit-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.menu-edit-form--flat :deep(.el-form-item) {
  margin-bottom: 12px;
}
</style>
