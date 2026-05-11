import { defineStore } from 'pinia'
import { loginWithPassword } from '../api/auth'
import type { LoginPayload, UserInfo } from '../models/auth'
import { decodeJwtPayload } from '../utils/jwt'

/**
 * 认证状态仓库（Store）：持久化 token 与当前登录用户。
 * 作者：leiyangjun
 */

const TOKEN_KEY = 'peach_admin_token'
const USER_KEY = 'peach_admin_user'
/** 历史兼容：当前 TokenDTO 无 refreshToken，保留键清理逻辑 */
const REFRESH_KEY = 'peach_admin_refresh'

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
     * 密码 + 滑块登录：经网关访问认证服务（RSA 密文在 api 层完成），仅持久化 access token。
     */
    /** remember：后端暂无 refreshToken，记住我仅保留表单语义，与令牌持久化策略无关 */
    async login(payload: LoginPayload & { remember: boolean }) {
      const { remember: _remember, ...loginPayload } = payload
      if (!loginPayload.username || !loginPayload.password) {
        throw new Error('用户名和密码不能为空')
      }
      if (!loginPayload.captchaId) {
        throw new Error('请先完成滑块验证')
      }
      const tokens = await loginWithPassword(loginPayload)
      this.token = tokens.accessToken
      localStorage.setItem(TOKEN_KEY, this.token)

      this.refreshToken = ''
      localStorage.removeItem(REFRESH_KEY)

      const claims = decodeJwtPayload<{ preferred_username?: string }>(tokens.accessToken)
      const displayName = claims?.preferred_username ?? payload.username
      this.user = {
        username: displayName,
        nickname: displayName,
      }
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
    },
    logout() {
      this.token = ''
      this.refreshToken = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(REFRESH_KEY)
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
