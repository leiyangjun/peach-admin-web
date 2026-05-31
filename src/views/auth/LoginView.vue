<script setup lang="ts">
/**
 * 登录视图（View）：3D 科技风浅蓝布局 + 密码登录 + 滑块验证；业务逻辑在 Controller。
 * 作者：leiyangjun
 */

import { useLoginController } from '../../controllers/auth/useLoginController'
import Login3dTechBackground from '../../components/auth/Login3dTechBackground.vue'
import SliderCaptchaPuzzle from '../../components/auth/SliderCaptchaPuzzle.vue'

const {
  loading,
  challengeLoading,
  challenge,
  sliderOffset,
  form,
  handleLogin,
  loadChallenge,
} = useLoginController()
</script>

<template>
  <div class="login-page">
    <Login3dTechBackground />

    <main class="login-shell">
      <div class="login-card">
        <header class="login-card__header">
          <h1 class="login-card__title">Peach 电子管理平台</h1>
          <div class="login-card__accent" />
        </header>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="field">
            <div class="field__wrap">
              <input
                v-model="form.username"
                class="field__input"
                type="text"
                name="username"
                placeholder="请输入用户名"
                autocomplete="username"
                required
              />
              <svg class="field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>

          <div class="field">
            <div class="field__wrap">
              <input
                v-model="form.password"
                class="field__input"
                type="password"
                name="password"
                placeholder="请输入密码"
                autocomplete="current-password"
                required
                @keyup.enter="handleLogin"
              />
              <svg class="field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>

          <SliderCaptchaPuzzle
            v-model="sliderOffset"
            :challenge="challenge"
            :loading="challengeLoading"
            @refresh="loadChallenge"
          />

          <div class="action-row">
            <label class="remember">
              <input v-model="form.remember" type="checkbox" />
              <span>记住我</span>
            </label>
            <a class="forgot-link" href="javascript:void(0)">忘记密码？</a>
          </div>

          <button
            type="submit"
            class="btn-submit"
            :disabled="challengeLoading || !challenge || sliderOffset === 0 || loading"
          >
            <span v-if="loading" class="btn-submit__spinner" aria-hidden="true" />
            {{ loading ? '登录中…' : '登录' }}
          </button>
        </form>
      </div>
    </main>
  </div>
</template>

<style scoped>
:global(html:has(.login-page)),
:global(body:has(.login-page)),
:global(#app:has(.login-page)) {
  overflow: hidden;
  height: 100%;
  max-height: 100dvh;
}

.login-page {
  --text: #1e293b;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  --btn-blue: #1890ff;
  --btn-hover: #096dd9;
  --neon-blue: #4d7cfe;
  --card-w: 380px;
  --page-margin: clamp(20px, 5vw, 64px);

  height: 100dvh;
  max-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16px var(--page-margin) 16px 24px;
  position: relative;
  color: var(--text);
  overflow: hidden;
  background: linear-gradient(145deg, #e8f4ff 0%, #c7e0ff 35%, #a8d0ff 65%, #dbeafe 100%);
}

.login-shell {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: var(--card-w);
  flex-shrink: 0;
}

.login-card {
  width: 100%;
  background: #fff;
  border-radius: 16px;
  padding: 32px 28px 28px;
  box-shadow:
    0 4px 6px rgba(26, 86, 219, 0.04),
    0 24px 48px rgba(26, 86, 219, 0.14),
    0 0 0 1px rgba(255, 255, 255, 0.9);
  animation: card-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.login-card__header {
  margin-bottom: 22px;
}

.login-card__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}

.login-card__accent {
  width: 40px;
  height: 3px;
  margin-top: 8px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--btn-blue), var(--neon-blue));
}

.field {
  margin-bottom: 14px;
}

.field__wrap {
  position: relative;
}

.field__icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  pointer-events: none;
  transition: color 0.2s;
}

.field__input {
  width: 100%;
  height: 44px;
  padding: 0 12px 0 40px;
  font-size: 14px;
  color: var(--text);
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field__input::placeholder {
  color: var(--text-tertiary);
}

.field__input:hover {
  border-color: #cbd5e1;
}

.field__input:focus {
  border-color: var(--btn-blue);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.12);
}

.field__wrap:focus-within .field__icon {
  color: var(--btn-blue);
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 13px;
}

.remember {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.remember input {
  width: 14px;
  height: 14px;
  accent-color: var(--btn-blue);
}

.forgot-link {
  color: var(--btn-blue);
  text-decoration: none;
}

.forgot-link:hover {
  color: var(--btn-hover);
}

.btn-submit {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--btn-blue);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-submit:hover:not(:disabled) {
  background: var(--btn-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(24, 144, 255, 0.4);
}

.btn-submit:active:not(:disabled) {
  transform: translateY(0);
}

.btn-submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-submit__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .login-page {
    justify-content: center;
    padding: 16px;
    max-height: none;
    overflow-y: auto;
  }
}

@media (max-height: 720px) {
  .login-card {
    padding: 24px 24px 20px;
  }

  .login-card__header {
    margin-bottom: 16px;
  }

  .field {
    margin-bottom: 12px;
  }

  .action-row {
    margin-bottom: 12px;
  }
}
</style>
