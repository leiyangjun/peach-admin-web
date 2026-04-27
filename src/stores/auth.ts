import { defineStore } from 'pinia'
import type { LoginPayload, UserInfo } from '../models/auth'

/**
 * 认证状态仓库（Store）：持久化 token 与当前登录用户。
 * 作者：leiyangjun
 */

const TOKEN_KEY = 'peach_admin_token'
const USER_KEY = 'peach_admin_user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) ?? '',
    user: JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as UserInfo | null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    async login(payload: LoginPayload) {
      if (!payload.username || !payload.password) {
        throw new Error('用户名和密码不能为空')
      }
      await new Promise((resolve) => setTimeout(resolve, 300))
      this.token = `mock-token-${Date.now()}`
      this.user = {
        username: payload.username,
        nickname: payload.username === 'admin' ? '超级管理员' : '演示用户',
      }
      localStorage.setItem(TOKEN_KEY, this.token)
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
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
