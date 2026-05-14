<script setup lang="ts">
/**
 * 角色管理：列表分页、关键字查询；新增/编辑共用同一表单结构；绑定用户为分页表格多选跨页合并。
 */
import { ref } from 'vue'
import { Edit, Plus, UserFilled, Delete } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
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
  openBindUsers,
  onBindSearch,
  onBindReset,
  onBindSelectionChange,
  clearBindSelection,
  submitBindUsers,
} = useRoleController()

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
            <el-button type="primary" @click="onSearch">查询</el-button>
            <el-button @click="onReset">重置</el-button>
          </el-form-item>
          <el-form-item class="right-btn">
            <el-button type="success" :icon="Plus" @click="openCreate">新增</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" class="page-list-table" :data="tableRows" stripe>
        <el-table-column type="index" label="#" width="56" :index="(i: number) => (page - 1) * pageSize + i + 1" />
        <el-table-column prop="roleCode" label="角色编码" min-width="140" show-overflow-tooltip />
        <el-table-column prop="roleName" label="角色名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <span class="role-table-ops">
              <el-tooltip content="编辑" placement="top">
                <el-button type="primary" link :icon="Edit" @click="openEdit(row)" />
              </el-tooltip>
              <el-tooltip content="绑定用户" placement="top">
                <el-button type="primary" link :icon="UserFilled" @click="openBindUsers(row)" />
              </el-tooltip>
              <el-tooltip content="物理删除" placement="top">
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSaveRole">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="bindDialogVisible" :title="`绑定用户 — ${bindRoleLabel}`" width="920px" destroy-on-close>
      <div class="bind-toolbar">
        <span class="bind-hint">在下方列表中勾选系统用户，支持跨页累积选择；保存时将全量覆盖该角色的用户绑定。</span>
        <div class="bind-meta">
          <el-tag type="info">已选 {{ bindUserIds.length }} 人</el-tag>
          <el-button link type="warning" @click="clearBindSelection">清空已选</el-button>
        </div>
      </div>
      <el-form :inline="true" class="bind-search" @submit.prevent>
        <el-form-item label="用户关键字">
          <el-input
            v-model="bindPickerKeyword"
            clearable
            placeholder="用户名 / 昵称 / 手机号"
            style="width: 260px"
            @keyup.enter="onBindSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onBindSearch">查询</el-button>
          <el-button @click="onBindReset">重置</el-button>
        </el-form-item>
      </el-form>
      <el-table
        ref="bindPickerTable"
        v-loading="bindPickerLoading"
        :data="bindPickerRows"
        row-key="id"
        stripe
        border
        max-height="420"
        @selection-change="onBindSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="username" label="用户名" min-width="120" show-overflow-tooltip />
        <el-table-column prop="nickname" label="昵称" min-width="110" show-overflow-tooltip />
        <el-table-column prop="mobile" label="手机号" min-width="120" />
      </el-table>
      <div class="pager bind-pager">
        <el-pagination
          v-model:current-page="bindPickerPage"
          v-model:page-size="bindPickerPageSize"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="bindPickerTotal"
          :page-sizes="[10, 20, 50]"
        />
      </div>
      <template #footer>
        <el-button @click="bindDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="bindSubmitLoading" @click="submitBindUsers">保存绑定</el-button>
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

.bind-pager {
  margin-top: 10px;
}

.role-table-ops {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.bind-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.bind-hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
  max-width: 620px;
}

.bind-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bind-search {
  margin-bottom: 8px;
}
</style>
