<script setup lang="ts">
/**
 * 菜单管理：左侧树 + 右侧主从表单（无弹窗）；对接 peach-common-service。
 */
import { computed, ref, watch } from 'vue'
import { Plus, QuestionFilled } from '@element-plus/icons-vue'
import type { ElTable } from 'element-plus'
import { useMenuController } from '../../controllers/system/useMenuController'
import { useMenuPermission } from '../../controllers/system/useMenuPermission'
import DictButtonShuttleDialog from '../../components/DictButtonShuttleDialog.vue'
import ApiResourceShuttleDialog from '../../components/ApiResourceShuttleDialog.vue'
import { CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
import { useButtonPermission } from '../../composables/useButtonPermission'
import { MENU_ICON_OPTIONS, type MenuIconOption } from '../../constants/menuIconOptions'
import type { MenuMgmtButtonBindingItem, MenuMgmtVO } from '../../models/menuMgmt'
import type { MenuButtonPickerRow } from '../../models/permission'

/** 提交时并入 buttonBindings；在 useMenuPermission 初始化后赋值 */
const getButtonBindingsForSaveRef = ref<(() => MenuMgmtButtonBindingItem[]) | null>(null)

function leftButtonRowKey(row: MenuButtonPickerRow) {
  return String(row.menuButtonId ?? row.dictButtonId ?? row.buttonCode ?? '')
}

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
  submitForm,
  onDelete,
  openCreateMenu: openCreateMenuBase,
  onTreeNodeClick: onTreeNodeClickBase,
  cancelPanel: cancelPanelBase,
  permissionBootstrapNonce,
} = useMenuController({
  getButtonBindingsForSave: () => getButtonBindingsForSaveRef.value?.(),
})

const perm = useMenuPermission(formModel, panelMode, showEditor, permissionBootstrapNonce)
getButtonBindingsForSaveRef.value = () => perm.buildButtonBindingsForMenuSave()

const {
  permLoading,
  buttonDict,
  menuButtonTableRows,
  leftButtonTableRef,
  onLeftButtonCurrentChange,
  rightApis,
  rightApisLoading,
  dictShuttleVisible,
  dictShuttleSeedIds,
  viewDictId,
  openDictPicker,
  onDictShuttleConfirm,
  removeMenuButtonRow,
  isMenuType,
  registryServices,
  apiShuttleVisible,
  apiShuttleSeedApis,
  apiShuttleButtonLabel,
  apiPickerLoading,
  openApiPickerDialog,
  onApiShuttleConfirm,
  apiRowKeyFn,
  abortCreateDraft,
} = perm

const { hasButton } = useButtonPermission()

/** 新建中途再点「新增」：先丢弃按钮草稿再打开空表单 */
function openCreateMenu(parentIdOverride?: string | number | null) {
  if (panelMode.value === 'create') {
    abortCreateDraft()
  }
  openCreateMenuBase(parentIdOverride)
}

/** 新建中途点树节点：先丢草稿再加载所选菜单 */
async function onTreeNodeClick(data: MenuMgmtVO) {
  if (panelMode.value === 'create') {
    abortCreateDraft()
  }
  await onTreeNodeClickBase(data)
}

/** 取消新建：先丢草稿再恢复原逻辑 */
async function cancelPanel() {
  if (panelMode.value === 'create') {
    abortCreateDraft()
  }
  await cancelPanelBase()
}

/** 左侧按钮表 ref：由 composable 持有，供保存字典后 setCurrentRow */
function bindLeftButtonTable(el: unknown) {
  leftButtonTableRef.value = (el ?? null) as InstanceType<typeof ElTable> | null
}

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
                    <el-tooltip v-if="hasButton(CMN_BUTTON.ADD)" :content="`在此节点下${CMN_BUTTON_LABEL[CMN_BUTTON.ADD]}子菜单`" placement="right">
                      <button
                        type="button"
                        class="menu-tree-add-btn"
                        :aria-label="`${CMN_BUTTON_LABEL[CMN_BUTTON.ADD]}子菜单`"
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
            <el-tooltip v-if="hasButton(CMN_BUTTON.ADD)" :content="`在此${CMN_BUTTON_LABEL[CMN_BUTTON.ADD]}一级菜单`" placement="top" class="menu-tree-root-add-tip">
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
                      <el-form-item :for="''" required>
                        <template #label>
                          <span class="label-with-tip">
                            类型
                            <el-tooltip
                              content="修改时切换「目录」会暂存当前按钮与 API 绑定，切回「菜单」后恢复；最终以「提交」写入数据库。"
                              placement="top"
                            >
                              <el-icon class="label-tip-icon"><QuestionFilled /></el-icon>
                            </el-tooltip>
                          </span>
                        </template>
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

              <div class="menu-perm-section">
                  <div v-if="isMenuType" v-loading="permLoading" class="menu-perm-block">
                    <el-row :gutter="12" class="menu-perm-split">
                      <el-col :xs="24" :sm="9" :md="9">
                        <div class="perm-left-col-stack">
                          <el-tooltip v-if="hasButton(CMN_BUTTON.BIND_BUTTON)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.BIND_BUTTON]" placement="top" class="perm-button-add-tip">
                            <button
                              type="button"
                              class="perm-button-table-add"
                              aria-label="绑定按钮"
                              :disabled="permLoading"
                              @click="openDictPicker"
                            >
                              <el-icon><Plus /></el-icon>
                            </button>
                          </el-tooltip>
                          <el-table
                            :ref="bindLeftButtonTable"
                            :data="menuButtonTableRows"
                            :row-key="leftButtonRowKey"
                            size="small"
                            border
                            stripe
                            class="perm-left-table"
                            height="280"
                            highlight-current
                            @current-change="onLeftButtonCurrentChange"
                          >
                            <template #empty>
                              <div class="perm-empty-add" role="button" tabindex="0" @click="openDictPicker">
                                暂无按钮，点击此处绑定
                              </div>
                            </template>
                            <el-table-column prop="buttonName" label="名称" min-width="72" show-overflow-tooltip />
                            <el-table-column prop="buttonCode" label="编码" width="92" show-overflow-tooltip />
                            <el-table-column label="操作" width="56" fixed="right">
                              <template #default="{ row }">
                                <el-button
                                  v-if="hasButton(CMN_BUTTON.DELETE)"
                                  type="danger"
                                  link
                                  size="small"
                                  :disabled="permLoading"
                                  @click.stop="removeMenuButtonRow(row)"
                                >
                                  {{ CMN_BUTTON_LABEL[CMN_BUTTON.DELETE] }}
                                </el-button>
                              </template>
                            </el-table-column>
                          </el-table>
                        </div>
                      </el-col>
                      <el-col :xs="24" :sm="15" :md="15">
                        <div class="perm-right-col-stack">
                          <el-tooltip content="绑定API资源" placement="top" class="perm-button-add-tip">
                            <button
                              type="button"
                              class="perm-button-table-add"
                              aria-label="绑定API资源"
                              :disabled="permLoading || apiPickerLoading"
                              @click="openApiPickerDialog"
                            >
                              <el-icon><Plus /></el-icon>
                            </button>
                          </el-tooltip>
                          <el-table
                            v-loading="rightApisLoading"
                            :data="rightApis"
                            size="small"
                            border
                            stripe
                            class="perm-right-table"
                            height="280"
                            :row-key="apiRowKeyFn"
                          >
                            <template #empty>
                              <el-empty description="请在左侧选择一行按钮" :image-size="40" />
                            </template>
                            <el-table-column prop="method" label="方法" width="72" />
                            <el-table-column prop="urlPath" label="路径" min-width="140" show-overflow-tooltip />
                            <el-table-column prop="summary" label="摘要" min-width="100" show-overflow-tooltip />
                          </el-table>
                        </div>
                      </el-col>
                    </el-row>
                  </div>
              </div>
            </div>

            <DictButtonShuttleDialog
              v-model:visible="dictShuttleVisible"
              :model-value="dictShuttleSeedIds"
              :button-dict="buttonDict"
              :view-dict-id="viewDictId"
              @confirm="onDictShuttleConfirm"
            />

            <ApiResourceShuttleDialog
              v-model:visible="apiShuttleVisible"
              :model-value="apiShuttleSeedApis"
              :registry-services="registryServices"
              :button-label="apiShuttleButtonLabel"
              @confirm="onApiShuttleConfirm"
            />

            <div class="form-footer-bar">
              <div class="footer-actions">
                <el-button v-if="panelMode === 'edit' && formModel.id && hasButton(CMN_BUTTON.DELETE)" type="danger" plain @click="onDelete">
                  {{ CMN_BUTTON_LABEL[CMN_BUTTON.DELETE] }}
                </el-button>
                <el-button v-if="hasButton(CMN_BUTTON.CANCEL)" @click="cancelPanel">{{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}</el-button>
                <el-button v-if="hasButton(CMN_BUTTON.SUBMIT)" type="primary" @click="submitForm">{{ CMN_BUTTON_LABEL[CMN_BUTTON.SUBMIT] }}</el-button>
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

/** 菜单按钮与 API 区域（无折叠标题栏） */
.menu-perm-section {
  margin-top: 4px;
  padding-bottom: 8px;
}

.menu-perm-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu-perm-split {
  margin-top: 4px;
}

/** 左右列：表顶全宽虚线「+」+ 表格（与菜单树底「+」视觉一致） */
.perm-left-col-stack,
.perm-right-col-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.perm-button-add-tip {
  display: block;
  width: 100%;
  flex-shrink: 0;
}

.perm-button-table-add {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 36px;
  margin-top: 0;
  margin-bottom: 6px;
  padding: 0;
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

.perm-button-table-add:hover:not(:disabled) {
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.perm-button-table-add:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

.perm-button-table-add:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.perm-left-table,
.perm-right-table {
  width: 100%;
}

.perm-empty-add {
  padding: 16px 8px;
  text-align: center;
  font-size: 13px;
  color: var(--el-color-primary);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.perm-empty-add:hover {
  background: var(--el-fill-color-light);
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
