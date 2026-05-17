<script setup lang="ts">
/**
 * 角色管理：列表分页、关键字查询；新增/编辑共用同一表单结构；绑定用户为左右穿梭；绑定菜单为树表多选。
 */
import { nextTick, ref, watch } from 'vue'
import { Edit, Plus, UserFilled, Delete, Menu as MenuIcon } from '@element-plus/icons-vue'
import { CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
import { useButtonPermission } from '../../composables/useButtonPermission'
import type { FormInstance, TableInstance } from 'element-plus'
import type { UserMgmtVO } from '../../models/userMgmt'
import { useRoleController } from '../../controllers/system/useRoleController'

const roleFormRef = ref<FormInstance>()

const {
  keyword,
  page,
  pageSize,
  total,
  loading,
  tableRows,
  dialogVisible,
  dialogMode,
  dialogTitle,
  submitLoading,
  roleForm,
  rules,
  onSearch,
  onReset,
  openCreate,
  openEdit,
  onSubmit,
  confirmHardDelete,
  bindDialogVisible,
  bindRoleLabel,
  bindSubmitLoading,
  bindPickerLoading,
  bindPickerRows,
  bindPickerPage,
  bindPickerPageSize,
  bindPickerTotal,
  bindPickerKeyword,
  bindUserIds,
  bindRightUsers,
  openBindUsers,
  onBindSearch,
  onBindReset,
  leftBindUserRowClassName,
  addBindUserFromLeft,
  removeBindRightUser,
  clearBindSelection,
  submitBindUsers,
  bindMbDialogVisible,
  bindMbRoleLabel,
  bindMbSubmitLoading,
  bindMbPickerLoading,
  bindMbTreeRows,
  bindMbSelectedSet,
  openBindMenuButtons,
  toggleBindMbMenuButton,
  submitBindMenuButtons,
} = useRoleController()

const { hasButton } = useButtonPermission()

/** 树表内按钮勾选（Element Plus checkbox 变更值兼容） */
function onMbCheckboxChange(menuButtonId: string | undefined, val: unknown) {
  if (menuButtonId == null || menuButtonId === '') {
    return
  }
  toggleBindMbMenuButton(menuButtonId, val === true)
}

const onSaveRole = async () => {
  const f = roleFormRef.value
  if (!f) {
    return
  }
  try {
    await f.validate()
  } catch {
    return
  }
  await onSubmit()
}

/** 绑定菜单树表：数据就绪后仅展开根节点（不 default-expand-all，避免深层一次展开） */
const bindMbTableRef = ref<TableInstance>()

watch(
  () =>
    [bindMbDialogVisible.value, bindMbPickerLoading.value, bindMbTreeRows.value] as const,
  async ([open, loading, rows]) => {
    if (!open || loading || rows.length === 0) {
      return
    }
    await nextTick()
    const tb = bindMbTableRef.value
    if (!tb) {
      return
    }
    for (const r of rows) {
      tb.toggleRowExpansion(r, true)
    }
  },
)

/**
 * 姓名列展示：与 UserMgmtVO 对齐优先 realName；兼容部分接口可能返回的 name / fullName。
 * 若仍无姓名字段，则回退昵称（与「昵称」列同源，便于占位）；再回退 username（列已隐藏，仅作兜底）。
 */
function userDisplayRealName(row: UserMgmtVO): string {
  const pick = (k: string) => {
    const v = (row as Record<string, unknown>)[k]
    return typeof v === 'string' ? v.trim() : ''
  }
  const fromName =
    row.realName?.trim() ||
    pick('name') ||
    pick('fullName')
  if (fromName) {
    return fromName
  }
  const nick = row.nickname?.trim()
  if (nick) {
    return nick
  }
  return row.username?.trim() || '—'
}
</script>

<template>
  <div class="role-page">
    <el-card shadow="never" class="page-list-card">
      <div class="page-list-toolbar">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="keyword"
              clearable
              placeholder="角色编码 / 名称"
              style="width: 260px"
              @keyup.enter="onSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button v-if="hasButton(CMN_BUTTON.QUERY)" type="primary" @click="onSearch">{{ CMN_BUTTON_LABEL[CMN_BUTTON.QUERY] }}</el-button>
            <el-button v-if="hasButton(CMN_BUTTON.RESET)" @click="onReset">{{ CMN_BUTTON_LABEL[CMN_BUTTON.RESET] }}</el-button>
          </el-form-item>
          <el-form-item v-if="hasButton(CMN_BUTTON.ADD)" class="right-btn">
            <el-button type="success" :icon="Plus" @click="openCreate">{{ CMN_BUTTON_LABEL[CMN_BUTTON.ADD] }}</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" class="page-list-table" :data="tableRows" stripe>
        <el-table-column type="index" label="#" width="56" :index="(i: number) => (page - 1) * pageSize + i + 1" />
        <el-table-column prop="roleCode" label="角色编码" min-width="140" show-overflow-tooltip />
        <el-table-column prop="roleName" label="角色名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="288" fixed="right">
          <template #default="{ row }">
            <span class="role-table-ops">
              <el-tooltip v-if="hasButton(CMN_BUTTON.EDIT)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.EDIT]" placement="top">
                <el-button type="primary" link :icon="Edit" @click="openEdit(row)" />
              </el-tooltip>
              <el-tooltip v-if="hasButton(CMN_BUTTON.ASSIGN)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.ASSIGN]" placement="top">
                <el-button type="primary" link :icon="UserFilled" @click="openBindUsers(row)" />
              </el-tooltip>
              <el-tooltip v-if="hasButton(CMN_BUTTON.BIND_MENU)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.BIND_MENU]" placement="top">
                <el-button type="primary" link :icon="MenuIcon" @click="openBindMenuButtons(row)" />
              </el-tooltip>
              <el-tooltip v-if="hasButton(CMN_BUTTON.DELETE)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.DELETE]" placement="top">
                <el-button type="danger" link :icon="Delete" @click="confirmHardDelete(row)" />
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager page-list-pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="640px" destroy-on-close>
      <el-skeleton v-if="submitLoading && dialogMode !== 'create'" :rows="5" animated />
      <el-form
        v-else
        ref="roleFormRef"
        :model="roleForm"
        :rules="rules"
        label-width="100px"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="角色编码" prop="roleCode">
              <el-input v-model="roleForm.roleCode" placeholder="唯一编码，如 ROLE_OPERATOR" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色名称" prop="roleName">
              <el-input v-model="roleForm.roleName" placeholder="展示名称" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="roleForm.remark" type="textarea" :rows="3" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button v-if="hasButton(CMN_BUTTON.CANCEL)" @click="dialogVisible = false">{{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}</el-button>
        <el-button v-if="hasButton(CMN_BUTTON.SAVE)" type="primary" :loading="submitLoading" @click="onSaveRole">
          {{ CMN_BUTTON_LABEL[CMN_BUTTON.SAVE] }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="bindDialogVisible"
      :title="`绑定用户 — ${bindRoleLabel}`"
      width="760px"
      class="role-bind-user-dialog"
      append-to-body
      destroy-on-close
      align-center
    >
      <div class="bind-user-topbar">
        <div class="bind-user-topbar__left">
          <el-tag type="info" size="small">已选 {{ bindUserIds.length }} 人</el-tag>
          <el-button link type="warning" size="small" @click="clearBindSelection">清空已选</el-button>
        </div>
        <el-form :inline="true" class="bind-user-topbar__search" @submit.prevent>
          <el-form-item label="用户关键字">
            <el-input
              v-model="bindPickerKeyword"
              clearable
              placeholder="昵称 / 姓名"
              class="bind-user-keyword-input"
              @keyup.enter="onBindSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button v-if="hasButton(CMN_BUTTON.QUERY)" type="primary" size="small" @click="onBindSearch">{{ CMN_BUTTON_LABEL[CMN_BUTTON.QUERY] }}</el-button>
            <el-button v-if="hasButton(CMN_BUTTON.RESET)" size="small" @click="onBindReset">{{ CMN_BUTTON_LABEL[CMN_BUTTON.RESET] }}</el-button>
          </el-form-item>
        </el-form>
      </div>
      <div class="shuttle-body">
        <div class="shuttle-col">
          <div class="shuttle-col-title">可选用户</div>
          <div class="shuttle-table-wrap">
            <el-table
              v-loading="bindPickerLoading"
              :data="bindPickerRows"
              :row-class-name="leftBindUserRowClassName"
              row-key="id"
              size="small"
              border
              stripe
              height="200"
              class="shuttle-table"
              @row-click="(row: UserMgmtVO) => addBindUserFromLeft(row)"
            >
              <template #empty>
                <el-empty description="无数据，请查询" :image-size="48" />
              </template>
              <el-table-column prop="nickname" label="昵称" min-width="100" show-overflow-tooltip />
              <el-table-column label="姓名" min-width="100" show-overflow-tooltip>
                <template #default="{ row }: { row: UserMgmtVO }">
                  {{ userDisplayRealName(row) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
          <el-pagination
            v-model:current-page="bindPickerPage"
            v-model:page-size="bindPickerPageSize"
            layout="total, sizes, prev, pager, next"
            :total="bindPickerTotal"
            :page-sizes="[10, 20, 50]"
            small
            class="shuttle-pager"
            background
          />
        </div>
        <div class="shuttle-col">
          <div class="shuttle-col-title">已选用户</div>
          <div class="shuttle-table-wrap">
            <el-table
              :data="bindRightUsers"
              row-key="id"
              size="small"
              border
              stripe
              height="200"
              class="shuttle-table"
              @row-click="(row: UserMgmtVO) => removeBindRightUser(row)"
            >
              <template #empty>
                <el-empty description="从左侧点击行添加" :image-size="48" />
              </template>
              <el-table-column prop="nickname" label="昵称" min-width="100" show-overflow-tooltip />
              <el-table-column label="姓名" min-width="100" show-overflow-tooltip>
                <template #default="{ row }: { row: UserMgmtVO }">
                  {{ userDisplayRealName(row) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button v-if="hasButton(CMN_BUTTON.CANCEL)" @click="bindDialogVisible = false">{{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}</el-button>
        <el-button v-if="hasButton(CMN_BUTTON.SAVE)" type="primary" :loading="bindSubmitLoading" @click="submitBindUsers">
          {{ CMN_BUTTON_LABEL[CMN_BUTTON.SAVE] }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="bindMbDialogVisible"
      :title="`绑定菜单 — ${bindMbRoleLabel}`"
      width="800px"
      class="role-bind-menu-dialog"
      append-to-body
      destroy-on-close
      align-center
    >
      <el-table
        ref="bindMbTableRef"
        v-loading="bindMbPickerLoading"
        :data="bindMbTreeRows"
        row-key="id"
        border
        stripe
        size="small"
        :tree-props="{ children: 'children' }"
        max-height="260"
        class="role-menu-bind-table"
      >
        <template #empty>
          <el-empty v-if="!bindMbPickerLoading" description="暂无可绑定菜单或按钮" :image-size="56" />
        </template>
        <el-table-column prop="menuName" label="菜单" min-width="220" show-overflow-tooltip tree />
        <el-table-column label="类型" width="88">
          <template #default="{ row }">
            <el-tag v-if="row.menuType === 'CATALOG'" type="info" size="small">目录</el-tag>
            <el-tag v-else-if="row.menuType === 'MENU'" type="success" size="small">菜单</el-tag>
            <span v-else>{{ row.menuType }}</span>
          </template>
        </el-table-column>
        <el-table-column label="按钮权限" min-width="360">
          <template #default="{ row }">
            <div v-if="!row.buttons?.length" class="mb-cell-empty">—</div>
            <div v-else class="mb-button-cell">
              <el-checkbox
                v-for="b in row.buttons"
                :key="String(b.menuButtonId)"
                :model-value="b.menuButtonId != null && bindMbSelectedSet.has(String(b.menuButtonId))"
                size="small"
                class="mb-btn-checkbox"
                @change="(v: unknown) => onMbCheckboxChange(b.menuButtonId != null ? String(b.menuButtonId) : undefined, v)"
              >
                {{ b.buttonName || '未命名' }}
              </el-checkbox>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button v-if="hasButton(CMN_BUTTON.CANCEL)" @click="bindMbDialogVisible = false">{{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}</el-button>
        <el-button v-if="hasButton(CMN_BUTTON.SAVE)" type="primary" :loading="bindMbSubmitLoading" @click="submitBindMenuButtons">
          {{ CMN_BUTTON_LABEL[CMN_BUTTON.SAVE] }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.role-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.page-list-card :deep(.el-card__body) {
  padding: 0;
}

.page-list-toolbar {
  padding: 10px 16px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-table-header-bg-color);
}

.page-list-toolbar :deep(.el-form) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 10px;
  column-gap: 12px;
  width: 100%;
}

.page-list-toolbar :deep(.el-form-item) {
  margin-bottom: 0;
}

.right-btn {
  margin-left: auto;
}

.page-list-table :deep(.el-table) {
  border-radius: 0 0 8px 8px;
}

.pager {
  display: flex;
  justify-content: flex-end;
}

.page-list-pager {
  padding: 14px 16px 16px;
}

.role-table-ops {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.bind-user-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  margin-bottom: 8px;
}

.bind-user-topbar__left {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.bind-user-topbar__search {
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  column-gap: 8px;
}

.bind-user-topbar__search :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 0;
}

.bind-user-keyword-input {
  width: 168px;
}

.role-bind-user-dialog :deep(.el-dialog) {
  max-height: min(92vh, 620px);
  margin-top: 4vh;
  display: flex;
  flex-direction: column;
}

.role-bind-user-dialog :deep(.el-dialog__body) {
  padding: 10px 14px 12px;
  max-height: min(62vh, 420px);
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.shuttle-body {
  display: flex;
  gap: 12px;
  align-items: stretch;
  min-height: 0;
  flex: 1;
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

.shuttle-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
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
  display: flex;
  flex-wrap: wrap;
}

.mb-button-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
}

.mb-btn-checkbox {
  margin-right: 0;
}

.mb-cell-empty {
  color: var(--el-text-color-placeholder);
}

.role-bind-menu-dialog :deep(.el-dialog) {
  max-height: min(88vh, 520px);
  margin-top: 5vh;
  display: flex;
  flex-direction: column;
}

.role-bind-menu-dialog :deep(.el-dialog__body) {
  padding: 8px 14px 10px;
  max-height: min(52vh, 320px);
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
}

.role-bind-menu-dialog :deep(.el-dialog__header) {
  padding-bottom: 6px;
}

.role-menu-bind-table {
  width: 100%;
}
</style>
