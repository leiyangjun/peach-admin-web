<script setup lang="ts">
/**
 * 登录视图（View）：密码登录 + 滑块验证；业务逻辑在 Controller。
 * 作者：leiyangjun
 */

import { Lock, User } from '@element-plus/icons-vue'
import { useLoginController } from '../../controllers/auth/useLoginController'
import SliderCaptchaPuzzle from '../../components/auth/SliderCaptchaPuzzle.vue'

const {
  loading,
  challengeLoading,
  challenge,
  sliderOffset,
  form,
  rules,
  handleLogin,
  loadChallenge,
} = useLoginController()
</script>

<template>
  <div class="login-page">
    <div class="bg-shape" />
    <el-card class="login-card" shadow="never">
      <div class="head">
        <h2>Peach 管理后台</h2>
        <p>欢迎登录，请完成安全验证后进入系统</p>
      </div>

      <el-form :model="form" :rules="rules" label-position="top" @submit.prevent>
        <el-form-item :for="''" label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" autocomplete="username">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item :for="''" label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            autocomplete="current-password"
            @keyup.enter="handleLogin"
          >
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>

        <div class="captcha-wrap">
          <SliderCaptchaPuzzle
            v-model="sliderOffset"
            :challenge="challenge"
            :loading="challengeLoading"
            @refresh="loadChallenge"
          />
        </div>

        <div class="action-row">
          <el-checkbox v-model="form.remember">记住我</el-checkbox>
          <el-link type="primary" :underline="false">忘记密码？</el-link>
        </div>

        <el-button
          class="submit"
          type="primary"
          :loading="loading"
          :disabled="challengeLoading || !challenge || sliderOffset === 0"
          @click="handleLogin"
        >
          登录系统
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  /* 占满一屏且不把内容撑出视口，避免出现整页右侧纵向滚动条 */
  height: 100dvh;
  max-height: 100dvh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  position: relative;
  overflow-x: hidden;
  overflow-y: hidden;
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
  width: min(400px, calc(100vw - 32px));
  border-radius: 16px;
  border: 1px solid #e0ebff;
  box-shadow: 0 16px 40px rgb(71 96 143 / 16%);
  position: relative;
  z-index: 1;
}

.login-card :deep(.el-card__body) {
  padding: 16px 18px 14px;
}

.login-card :deep(.el-form-item) {
  margin-bottom: 12px;
}

.head h2 {
  margin: 0;
  font-size: 20px;
  color: #243f7b;
}

.head p {
  margin: 4px 0 12px;
  color: #7a8db4;
  font-size: 13px;
  line-height: 1.45;
}

.captcha-wrap {
  margin-bottom: 2px;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.submit {
  width: 100%;
  height: 40px;
  border-radius: 10px;
}

/* 矮屏下再压一层间距，避免卡片超出视口 */
@media (max-height: 720px) {
  .login-card :deep(.el-card__body) {
    padding: 12px 14px 12px;
  }

  .head p {
    margin: 2px 0 8px;
    font-size: 12px;
  }

  .login-card :deep(.el-form-item) {
    margin-bottom: 10px;
  }
}
</style>
