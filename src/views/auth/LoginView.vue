<script setup lang="ts">
/**
 * 登录视图（View）：只负责界面展示，业务逻辑放在 Controller。
 * 作者：leiyangjun
 */

import { Lock, User } from '@element-plus/icons-vue'
import { useLoginController } from '../../controllers/auth/useLoginController'

const { loading, form, rules, handleLogin } = useLoginController()
</script>

<template>
  <div class="login-page">
    <div class="bg-shape" />
    <el-card class="login-card" shadow="never">
      <div class="head">
        <h2>Peach 管理后台</h2>
        <p>欢迎登录，请输入账号信息</p>
      </div>

      <el-form :model="form" :rules="rules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码">
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>

        <div class="action-row">
          <el-checkbox v-model="form.remember">记住我</el-checkbox>
          <el-link type="primary" :underline="false">忘记密码？</el-link>
        </div>

        <el-button class="submit" type="primary" :loading="loading" @click="handleLogin">登录系统</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 10% 20%, #e2ecff, transparent 45%),
    radial-gradient(circle at 85% 80%, #d3e5ff, transparent 50%), #eef4ff;
}

.bg-shape {
  position: absolute;
  width: 430px;
  height: 430px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgb(90 140 255 / 38%), rgb(171 214 255 / 22%));
  filter: blur(3px);
  transform: translate(-180px, 120px);
}

.login-card {
  width: min(430px, calc(100vw - 32px));
  border-radius: 18px;
  border: 1px solid #e0ebff;
  box-shadow: 0 20px 44px rgb(71 96 143 / 20%);
  position: relative;
  z-index: 1;
}

.head h2 {
  margin: 0;
  color: #243f7b;
}

.head p {
  margin: 8px 0 24px;
  color: #7a8db4;
  font-size: 13px;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.submit {
  width: 100%;
  height: 42px;
  border-radius: 10px;
}
</style>
