<script setup lang="ts">
/**
 * 用户管理视图（View）：仅负责渲染，业务逻辑由 Controller 管理。
 * 作者：leiyangjun
 */

import { useUserController } from '../../controllers/system/useUserController'

const {
  keyword,
  page,
  pageSize,
  pagedUsers,
  total,
  dialogVisible,
  activeTab,
  userForm,
  rules,
  onSearch,
  onReset,
  onDelete,
  onToggleStatus,
  openCreate,
  onSubmit,
} = useUserController()
</script>

<template>
  <div class="user-page">
    <el-card shadow="never" class="toolbar-card">
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="关键字">
          <el-input
            v-model="keyword"
            clearable
            placeholder="输入账号/昵称/手机号"
            style="width: 260px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
        <el-form-item class="right-btn">
          <el-button type="success" @click="openCreate">新增用户</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-table :data="pagedUsers" stripe>
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="username" label="账号" min-width="120" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="phone" label="手机号" min-width="130" />
        <el-table-column prop="role" label="角色" min-width="110" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-switch v-model="row.status" @change="onToggleStatus(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" text @click="onDelete(row)">删除</el-button>
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
          :page-sizes="[5, 8, 10, 20]"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新增用户" width="640px">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基础信息" name="base">
          <el-form :model="userForm" :rules="rules" label-width="90px">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="登录账号" prop="username">
                  <el-input v-model="userForm.username" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="用户昵称" prop="nickname">
                  <el-input v-model="userForm.nickname" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="手机号" prop="phone">
                  <el-input v-model="userForm.phone" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="邮箱">
                  <el-input v-model="userForm.email" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="角色" prop="role">
                  <el-select v-model="userForm.role" style="width: 100%">
                    <el-option label="超级管理员" value="超级管理员" />
                    <el-option label="运维" value="运维" />
                    <el-option label="开发" value="开发" />
                    <el-option label="访客" value="访客" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="状态">
                  <el-switch v-model="userForm.status" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="安全设置" name="security">
          <el-form :model="userForm" label-width="90px">
            <el-form-item label="初始密码" prop="password">
              <el-input v-model="userForm.password" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码">
              <el-input v-model="userForm.confirmPassword" type="password" show-password />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="备注信息" name="remark">
          <el-input v-model="userForm.remark" type="textarea" :rows="4" placeholder="请输入备注信息" />
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">确定新增</el-button>
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
