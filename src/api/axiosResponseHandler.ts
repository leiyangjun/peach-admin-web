/**
 * 统一 Axios 响应错误：401 登出并跳转；其余转为 Error 抛出便于展示 msg。
 */
import axios, { type AxiosError } from 'axios'
import { getRequestErrorMessage } from '../utils/httpError'
import { SessionExpiredError, triggerSessionExpired } from '../utils/sessionExpired'

function isUnauthorizedAxiosError(error: AxiosError): boolean {
  if (error.response?.status === 401) {
    return true
  }
  const data = error.response?.data
  if (data && typeof data === 'object' && data !== null && 'code' in data) {
    const code = (data as { code?: unknown }).code
    if (code === 401 || code === '401') {
      return true
    }
  }
  return false
}

/** 当前是否为登录页（避免账号密码错误返回 401 时误触发整站登出） */
function isLoginPath(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const p = window.location.pathname.replace(/\/+$/, '') || '/'
  return p === '/login'
}

export function rejectAxiosResponse(error: unknown): Promise<never> {
  if (!axios.isAxiosError(error)) {
    return Promise.reject(error instanceof Error ? error : new Error(getRequestErrorMessage(error)))
  }
  if (isUnauthorizedAxiosError(error)) {
    const msg = getRequestErrorMessage(error)
    if (!isLoginPath()) {
      triggerSessionExpired(msg)
      return Promise.reject(new SessionExpiredError())
    }
  }
  return Promise.reject(new Error(getRequestErrorMessage(error)))
}
