import { defineStore } from 'pinia'
import { loginWithPassword } from '../api/auth'
import type { LoginPayload, UserInfo } from '../models/auth'
import { decodeJwtPayload } from '../utils/jwt'
import { usePermissionStore } from './permission'

/**
 * 认证状态仓库（Store）：持久化 token 与当前登录用户。
 * 作者：leiyangjun
 */

import { clearStoredTokens, persistTokens, REFRESH_KEY, TOKEN_KEY } from '../utils/tokenStorage'

const USER_KEY = 'peach_admin_user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) ?? '',
    refreshToken: localStorage.getItem(REFRESH_KEY) ?? '',
    user: JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as UserInfo | null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    /**
     * 密码 + 滑块登录：经网关访问认证服务（RSA 密文在 api 层完成），持久化 access + refresh。
     */
    async login(payload: LoginPayload & { remember: boolean }) {
      const { remember: _remember, ...loginPayload } = payload
      if (!loginPayload.username || !loginPayload.password) {
        throw new Error('用户名和密码不能为空')
      }
      if (!loginPayload.captchaId) {
        throw new Error('请先完成滑块验证')
      }
      const tokens = await loginWithPassword(loginPayload)
      this.applyTokens(tokens)

      const claims = decodeJwtPayload<{ preferred_username?: string }>(tokens.accessToken)
      const displayName = claims?.preferred_username ?? payload.username
      this.user = {
        username: displayName,
        nickname: displayName,
      }
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
      await usePermissionStore().loadCurrentUserPermission({ force: true })
    },
    /** 登录或 refresh 成功后写入本地与内存 */
    applyTokens(tokens: { accessToken: string; refreshToken?: string }) {
      persistTokens(tokens)
      this.token = tokens.accessToken
      this.refreshToken = tokens.refreshToken ?? ''
    },
    logout() {
      this.token = ''
      this.refreshToken = ''
      this.user = null
      clearStoredTokens()
      localStorage.removeItem(USER_KEY)
    },
    updateNickname(nickname: string) {
      if (!this.user) {
        return
      }
      this.user.nickname = nickname
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
    },
  },
})
