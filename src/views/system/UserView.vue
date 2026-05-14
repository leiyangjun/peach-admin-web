<script setup lang="ts">
/**
 * 用户管理：详情 / 新增 / 编辑共用一个对话框；无创建/更新时间等审计展示。
 * 作者：leiyangjun
 */

import { Delete, Edit, Key, Plus, View } from '@element-plus/icons-vue'
import { useUserController } from '../../controllers/system/useUserController'

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
  formReadonly,
  submitLoading,
  userForm,
  rules,
  resetPwdVisible,
  resetPwdForm,
  resetPwdLoading,
  onSearch,
  onReset,
  openDetail,
  openCreate,
  openEdit,
  enterEditFromView,
  onSubmit,
  onToggleValid,
  isSystemUser,
  openResetPassword,
  confirmHardDelete,
  submitResetPassword,
} = useUserController()

function userTypeLabel(t: string | undefined) {
  if (t === 'system') {
    return '系统用户'
  }
  if (t === 'app') {
    return '应用用户'
  }
  return t ?? '-'
}
</script>

<template>
  <div class="user-page">
    <el-card shadow="never" class="page-list-card">
      <div class="page-list-toolbar">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="keyword"
              clearable
              placeholder="用户名 / 昵称 / 手机号"
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
        <el-table-column prop="username" label="用户名" min-width="120" show-overflow-tooltip />
        <el-table-column prop="nickname" label="昵称" min-width="110" show-overflow-tooltip />
        <el-table-column prop="mobile" label="手机号" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="140" show-overflow-tooltip />
        <el-table-column label="用户类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.userType === 'system' ? 'primary' : 'info'" size="small">
              {{ userTypeLabel(row.userType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-switch
              :model-value="row.valid === 1"
              @change="(v: boolean) => onToggleValid(row, v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <span class="user-table-ops">
              <el-tooltip content="详情" placement="top">
                <el-button type="primary" link :icon="View" @click="openDetail(row)" />
              </el-tooltip>
              <template v-if="isSystemUser(row)">
                <el-tooltip content="编辑" placement="top">
                  <el-button type="primary" link :icon="Edit" @click="openEdit(row)" />
                </el-tooltip>
                <el-tooltip content="重置密码" placement="top">
                  <el-button type="warning" link :icon="Key" @click="openResetPassword(row)" />
                </el-tooltip>
                <el-tooltip content="物理删除" placement="top">
                  <el-button type="danger" link :icon="Delete" @click="confirmHardDelete(row)" />
                </el-tooltip>
              </template>
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

    <!-- 详情 / 新增 / 编辑：同一对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="720px" destroy-on-close>
      <el-skeleton v-if="submitLoading && dialogMode !== 'create'" :rows="6" animated />
      <el-form v-else :model="userForm" :rules="formReadonly ? {} : rules" label-width="100px" :disabled="formReadonly">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="userForm.username" placeholder="唯一用户名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="userForm.nickname" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="mobile">
              <el-input v-model="userForm.mobile" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="userForm.email" />
            </el-form-item>
          </el-col>
          <el-col :span="dialogMode === 'create' && !formReadonly ? 12 : 24">
            <el-form-item label="真实姓名">
              <el-input v-model="userForm.realName" />
            </el-form-item>
          </el-col>
          <el-col v-if="dialogMode === 'create' && !formReadonly" :span="12">
            <el-form-item label="密码" prop="plainPassword">
              <el-input v-model="userForm.plainPassword" type="password" show-password autocomplete="new-password" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="状态">
              <!-- 与列表列一致：valid 1/0 映射开/关；状态仅能通过列表开关修改，此处只读 -->
              <el-switch :model-value="userForm.valid === 1" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item v-if="dialogMode === 'create'" label="用户类型">
              <el-input model-value="系统用户" disabled />
            </el-form-item>
            <el-form-item v-else label="用户类型">
              <el-input :model-value="userTypeLabel(userForm.userType)" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="userForm.remark" type="textarea" :rows="3" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <template v-if="formReadonly">
          <el-button @click="dialogVisible = false">关闭</el-button>
          <el-button v-if="isSystemUser(userForm)" type="primary" @click="enterEditFromView">编辑</el-button>
        </template>
        <template v-else>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="onSubmit">确定</el-button>
        </template>
      </template>
    </el-dialog>

    <el-dialog v-model="resetPwdVisible" title="重置系统用户密码" width="440px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="新密码">
          <el-input v-model="resetPwdForm.newPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="resetPwdForm.confirmPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetPwdLoading" @click="submitResetPassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 列表区单卡片：工具条与表头视觉同一色带，减少双层卡片与竖向空隙 */
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

/* 与工具条顶对齐：去掉整表圆角带来的「分层」感，仅保留下圆角 */
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

.user-table-ops {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}
</style>
