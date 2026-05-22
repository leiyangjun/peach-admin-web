/**
 * 令牌 localStorage 读写（避免 store ↔ http 循环依赖）。
 * 作者：leiyangjun
 */
import type { TokenDTO } from '../models/auth'

export const TOKEN_KEY = 'peach_admin_token'
export const REFRESH_KEY = 'peach_admin_refresh'

export function getStoredAccessToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function getStoredRefreshToken(): string {
  return localStorage.getItem(REFRESH_KEY) ?? ''
}

export function persistTokens(tokens: Pick<TokenDTO, 'accessToken' | 'refreshToken'>): void {
  localStorage.setItem(TOKEN_KEY, tokens.accessToken)
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
  }
  else {
    localStorage.removeItem(REFRESH_KEY)
  }
}

export function clearStoredTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
