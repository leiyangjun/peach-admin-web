<script setup lang="ts">
/**
 * 用户管理：详情 / 新增 / 编辑共用一个对话框；无创建/更新时间等审计展示。
 * 作者：leiyangjun
 */

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
    <el-card shadow="never" class="toolbar-card">
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="关键字">
          <el-input
            v-model="keyword"
            clearable
            placeholder="登录名 / 昵称 / 手机号"
            style="width: 260px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
        <el-form-item class="right-btn">
          <el-button type="success" @click="openCreate">新增系统用户</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableRows" stripe>
        <el-table-column type="index" label="#" width="56" :index="(i: number) => (page - 1) * pageSize + i + 1" />
        <el-table-column prop="username" label="登录名" min-width="120" show-overflow-tooltip />
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
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">详情</el-button>
            <el-button v-if="isSystemUser(row)" type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button v-if="isSystemUser(row)" type="warning" link @click="openResetPassword(row)">重置密码</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
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
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-skeleton v-if="submitLoading && dialogMode !== 'create'" :rows="6" animated />
      <el-form v-else :model="userForm" :rules="formReadonly ? {} : rules" label-width="100px" :disabled="formReadonly">
        <el-form-item v-if="dialogMode === 'create'" label="用户类型">
          <el-input model-value="系统用户" disabled />
        </el-form-item>
        <el-form-item v-else label="用户类型">
          <el-input :model-value="userTypeLabel(userForm.userType)" disabled />
        </el-form-item>
        <el-form-item label="登录账号" prop="username">
          <el-input v-model="userForm.username" placeholder="唯一登录名" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="userForm.nickname" />
        </el-form-item>
        <el-form-item label="手机号" prop="mobile">
          <el-input v-model="userForm.mobile" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="userForm.realName" />
        </el-form-item>
        <el-form-item v-if="!formReadonly && dialogMode === 'create'" label="初始口令" prop="plainPassword">
          <el-input v-model="userForm.plainPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item v-if="!formReadonly && dialogMode === 'edit'" label="新口令">
          <el-input
            v-model="userForm.plainPassword"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="不修改请留空"
          />
        </el-form-item>
        <el-form-item v-if="dialogMode !== 'create'" label="状态">
          <span>{{ userForm.valid === 1 ? '有效' : '无效' }}（请在列表中使用开关切换）</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="userForm.remark" type="textarea" :rows="3" />
        </el-form-item>
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
        <el-form-item label="新口令">
          <el-input v-model="resetPwdForm.newPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="确认口令">
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
  gap: 14px;
}

.toolbar-card :deep(.el-form) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.right-btn {
  margin-left: auto;
}

.table-card :deep(.el-table) {
  border-radius: 10px;
}

.pager {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}
</style>
