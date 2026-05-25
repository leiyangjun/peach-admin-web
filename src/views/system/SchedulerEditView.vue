<script setup lang="ts">
/**
 * 定时任务新建/编辑：与菜单编辑类似的卡片表单布局；平台类型通过网关 API 选择器绑定 GET 接口。
 */
import { Minus, MoreFilled, Plus, QuestionFilled } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import ApiResourceShuttleDialog from '../../components/ApiResourceShuttleDialog.vue'
import VcrontabCronField from '../../components/VcrontabCronField.vue'
import { useSchedulerEditController } from '../../controllers/system/useSchedulerEditController'

const {
  BTN_UI,
  CMN_BUTTON,
  CMN_BUTTON_LABEL,
  hasButton,
  RETRY_MAX,
  RETRY_TIMEOUT_MAX_MS,
  loading,
  submitLoading,
  toggleLoading,
  formRef: schedulerFormRef,
  discoveryServices,
  apiPickerVisible,
  shuttleModel,
  isEdit,
  form,
  rules,
  cronFieldError,
  internalSchedulingApi,
  externalSchedulingApi,
  apiPickerInitialServiceId,
  closeCurrentTab,
  openApiPicker,
  onApiShuttleConfirm,
  onSubmit,
  onToggleEnabled,
  formatRetryMaxTooltip,
  stepRetryMax,
  onRetryMaxChange,
  clampRetryTimeout,
} = useSchedulerEditController()

function bindSchedulerForm(el: unknown) {
  schedulerFormRef.value = (el ?? null) as FormInstance | null
}
</script>

<template>
  <div v-loading="loading" class="scheduler-edit-page">
    <el-card shadow="never" class="edit-card">
      <div class="editor-layout">
        <div class="form-scroll-area">
          <el-form
            :ref="bindSchedulerForm"
            class="scheduler-edit-form scheduler-edit-form--compact"
            :model="form"
            :rules="rules"
            label-width="100px"
            size="default"
          >
            <div class="form-grid">
              <el-form-item label="任务名称" prop="name" class="form-grid__half">
                <el-input v-model="form.name" maxlength="200" show-word-limit placeholder="展示用名称" />
              </el-form-item>
              <el-form-item label="API类型" class="form-grid__half">
                <el-select v-model="form.taskType" class="w-full" :disabled="loading">
                  <el-option label="平台" value="INTERNAL" />
                  <el-option label="外部" value="EXTERNAL" />
                </el-select>
              </el-form-item>

              <el-form-item
                required
                class="form-grid__full form-item--cron form-item--label-tip"
                :error="cronFieldError"
                :show-message="Boolean(cronFieldError)"
              >
                <template #label>
                  <span class="label-with-tip">
                    <span class="label-with-tip__text">Cron 表达式</span>
                    <el-popover
                      placement="top"
                      :width="320"
                      :trigger="['hover', 'click']"
                      popper-class="cron-expr-popover"
                      :teleported="true"
                    >
                      <div class="cron-expr-tip">
                        <p><strong>常用：</strong>从下拉列表选择预设调度频率（如每分钟、每天 9 点），支持按名称、关键词或表达式片段搜索，选中即可生效。</p>
                        <p><strong>自定义：</strong>点击「配置 Cron」在弹窗中按秒、分、时、日等维度组合规则，适用于预设未覆盖的复杂场景。</p>
                      </div>
                      <template #reference>
                        <span class="tip-trigger" tabindex="0" role="button" aria-label="Cron 表达式说明">
                          <el-icon><QuestionFilled /></el-icon>
                        </span>
                      </template>
                    </el-popover>
                  </span>
                </template>
                <VcrontabCronField v-model="form.cronExpression" />
              </el-form-item>

              <template v-if="form.taskType === 'INTERNAL'">
                <el-form-item label="调度API" required class="form-grid__full form-item--api">
                  <el-input
                    :model-value="internalSchedulingApi"
                    readonly
                    placeholder="点击右侧按钮选择平台 API"
                  >
                    <template #append>
                      <el-button :icon="MoreFilled" :disabled="loading" title="选择 API" @click="openApiPicker" />
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item label="API描述" class="form-grid__full">
                  <el-input :model-value="form.apiSummary" type="textarea" :rows="2" readonly placeholder="选择 API 后自动填充" />
                </el-form-item>
              </template>

              <template v-else>
                <el-form-item label="调度API" required class="form-grid__full form-item--api">
                  <el-input
                    v-model="externalSchedulingApi"
                    placeholder="如 https://api.example.com/health"
                  />
                </el-form-item>

                <el-form-item label="API描述" class="form-grid__full">
                  <el-input
                    v-model="form.description"
                    type="textarea"
                    :rows="2"
                    maxlength="1000"
                    show-word-limit
                    placeholder="可选，用于说明此外部 API"
                  />
                </el-form-item>
              </template>

              <el-form-item label="重试次数" class="form-grid__half form-item--retry-max">
                <div class="retry-max-field">
                  <el-button
                    class="retry-max-field__btn"
                    :disabled="form.retryMax <= 0"
                    aria-label="减少重试次数"
                    @click="stepRetryMax(-1)"
                  >
                    <el-icon><Minus /></el-icon>
                  </el-button>
                  <el-slider
                    v-model="form.retryMax"
                    class="retry-max-field__slider"
                    :min="0"
                    :max="RETRY_MAX"
                    :step="1"
                    :show-tooltip="true"
                    :format-tooltip="formatRetryMaxTooltip"
                    @input="onRetryMaxChange"
                    @change="onRetryMaxChange"
                  />
                  <el-button
                    class="retry-max-field__btn"
                    :disabled="form.retryMax >= RETRY_MAX"
                    aria-label="增加重试次数"
                    @click="stepRetryMax(1)"
                  >
                    <el-icon><Plus /></el-icon>
                  </el-button>
                  <span class="retry-max-field__value" aria-live="polite">{{ form.retryMax }}</span>
                </div>
              </el-form-item>
              <el-form-item
                label="重试间隔"
                prop="retryIntervalMs"
                class="form-grid__half"
                :required="form.retryMax >= 1"
              >
                <el-input-number
                  v-model="form.retryIntervalMs"
                  :min="form.retryMax >= 1 ? 1 : 0"
                  :max="600000"
                  :step="500"
                  :disabled="form.retryMax === 0"
                  controls-position="right"
                  class="w-full"
                  placeholder="毫秒"
                />
              </el-form-item>

              <el-form-item class="form-grid__full form-item--label-tip">
                <template #label>
                  <span class="label-with-tip">
                    <span class="label-with-tip__text">请求超时</span>
                    <el-tooltip
                      content="启用重试时：单次请求超时，空则默认 5000ms，最大 15000ms；用尽重试后记录失败"
                      placement="top"
                    >
                      <span class="tip-trigger" tabindex="0" role="button" aria-label="请求超时说明">
                        <el-icon><QuestionFilled /></el-icon>
                      </span>
                    </el-tooltip>
                  </span>
                </template>
                <el-input-number
                  v-model="form.timeoutMs"
                  :min="1000"
                  :max="RETRY_TIMEOUT_MAX_MS"
                  :step="500"
                  :disabled="form.retryMax === 0"
                  controls-position="right"
                  class="w-full"
                  placeholder="默认 5000，最大 15000"
                  @change="clampRetryTimeout"
                />
              </el-form-item>

              <el-form-item v-if="form.taskType === 'EXTERNAL'" label="请求头" class="form-grid__full">
                <el-input
                  v-model="form.headersJson"
                  clearable
                  placeholder='JSON 对象，如 {"X-Debug":"1"}'
                />
              </el-form-item>
            </div>
          </el-form>
        </div>

        <div class="scheduler-edit-footer form-footer-bar">
          <div class="footer-actions">
            <el-button v-if="hasButton(CMN_BUTTON.CANCEL)" @click="closeCurrentTab">{{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}</el-button>
            <el-button v-if="hasButton(CMN_BUTTON.EDIT)" type="primary" :loading="submitLoading" @click="onSubmit">
              {{ BTN_UI.SAVE }}
            </el-button>
            <el-button
              v-if="isEdit && form.id && hasButton(CMN_BUTTON.EDIT)"
              :type="form.enabled ? 'warning' : 'success'"
              :loading="toggleLoading"
              plain
              @click="onToggleEnabled"
            >
              {{ form.enabled ? BTN_UI.PAUSE : BTN_UI.RESUME }}
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <ApiResourceShuttleDialog
      v-model:visible="apiPickerVisible"
      v-model:model-value="shuttleModel"
      :discovery-services="discoveryServices"
      :initial-service-id="apiPickerInitialServiceId"
      title-suffix="定时任务"
      :max-right="1"
      force-http-method="GET"
      @confirm="onApiShuttleConfirm"
    />
  </div>
</template>

<style scoped>
/**
 * 与 AdminLayout 内容区配合：.content 为 flex:1，子节点 flex:1 + 本页 height:100% 铺满可视区，
 * 避免卡片未拉高时底部露出 #f0f2f5 灰底。顶栏高度见 layout-header：工具条 52px + 页签行约 40px。
 */
.scheduler-edit-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  /* 与 AdminLayout 顶栏对齐：工具条 52px + 页签约 40px + .content 上下 padding 8+10 */
  min-height: calc(100vh - 52px - 40px - 18px);
  overflow: hidden;
  padding: 0;
  box-sizing: border-box;
}
.edit-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
}
.edit-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px 14px;
  overflow: hidden;
}
.editor-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
/** 表单区单独滚动，底部操作栏固定；overflow-x 隐藏避免 el-row gutter 负边距等引发横向滚动条 */
.form-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  padding-right: 2px;
}
.scheduler-edit-form {
  width: 100%;
  max-width: 660px;
  margin: 0 auto;
  box-sizing: border-box;
}
/** 双列网格替代 el-row gutter，避免负 margin 在窄容器内溢出 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
  align-items: start;
}
.form-grid__full {
  grid-column: 1 / -1;
}
.form-grid__half {
  min-width: 0;
}
@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
.form-footer-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 10px;
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}
.scheduler-edit-footer {
  padding-bottom: 2px;
}
.footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
}
.scheduler-edit-form--compact :deep(.el-form-item) {
  margin-bottom: 12px;
  min-width: 0;
}
.scheduler-edit-form--compact :deep(.el-form-item__content) {
  min-width: 0;
}
.scheduler-edit-form--compact :deep(.el-input),
.scheduler-edit-form--compact :deep(.el-textarea),
.scheduler-edit-form--compact :deep(.el-select),
.scheduler-edit-form--compact :deep(.el-input-number) {
  width: 100%;
}
.scheduler-edit-form--compact :deep(.el-input__wrapper),
.scheduler-edit-form--compact :deep(.el-textarea__inner) {
  box-sizing: border-box;
}
.scheduler-edit-form--compact .form-item--cron {
  margin-bottom: 10px;
}
/* 带问号的 label：文字右对齐，问号固定在最右侧同一列 */
.scheduler-edit-form--compact :deep(.form-item--label-tip .el-form-item__label) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  line-height: 32px;
  overflow: visible;
  pointer-events: auto;
}
.scheduler-edit-form--compact .form-item--cron :deep(.el-form-item__content) {
  align-items: stretch;
}
.scheduler-edit-form--compact .form-item--cron :deep(.vcrontab-field) {
  width: 100%;
}
.scheduler-edit-form--compact .form-item--cron :deep(.vcrontab-field__control) {
  width: 100%;
}
.scheduler-edit-form--compact .form-item--api {
  margin-bottom: 10px;
}
.scheduler-edit-form--compact .form-item--retry-max :deep(.el-form-item__content) {
  align-items: center;
}
.retry-max-field {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.retry-max-field__btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
}
.retry-max-field__slider {
  flex: 1;
  min-width: 0;
}
.retry-max-field__slider :deep(.el-slider__runway) {
  margin: 0 6px;
}
.retry-max-field__value {
  flex-shrink: 0;
  min-width: 22px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--el-text-color-regular);
  line-height: 1;
}
.w-full {
  width: 100%;
}
.label-with-tip {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  width: 100%;
  white-space: nowrap;
}
.label-with-tip__text {
  flex: 0 1 auto;
  text-align: right;
}
/* Cron 文案较长，略缩小字号以便与「请求超时」问号纵向对齐 */
.form-item--cron .label-with-tip__text {
  font-size: 12px;
  letter-spacing: -0.2px;
}
.tip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  cursor: pointer;
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
</style>

<style>
.cron-expr-popover.el-popover {
  max-width: 320px;
}
.cron-expr-tip p {
  margin: 0 0 8px;
  line-height: 1.55;
  font-size: 13px;
}
.cron-expr-tip p:last-child {
  margin-bottom: 0;
}
.cron-expr-tip strong {
  font-weight: 600;
}
</style>
