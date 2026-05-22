/**
 * 为各 Axios 实例挂载 access 续期与 401 单次重试（refresh 失败走全局登出）。
 * 作者：leiyangjun
 */
import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { rejectAxiosResponse } from './axiosResponseHandler'
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  isRefreshRequestUrl,
  proactiveRefreshIfNeeded,
  refreshAccessToken,
} from '../utils/tokenRefresh'
import { normalizeAxiosParamsEncoding } from '../utils/queryParamEncoding'

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
    if (typeof code === 'string' && code.length >= 7 && code.slice(4, 7) === '401') {
      return true
    }
  }
  return false
}

function canRetryWithRefresh(config: InternalAxiosRequestConfig | undefined, error: AxiosError): boolean {
  if (!config || config._retry) {
    return false
  }
  if (!isUnauthorizedAxiosError(error)) {
    return false
  }
  const url = config.url ?? ''
  if (isRefreshRequestUrl(url)) {
    return false
  }
  return Boolean(getStoredRefreshToken())
}

/** 挂载令牌续期拦截器（须在业务 response 拦截器之前注册） */
export function setupAuthInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use(async (config) => {
    normalizeAxiosParamsEncoding(config.params)
    if (!config._skipTokenRefresh && !isRefreshRequestUrl(config.url)) {
      await proactiveRefreshIfNeeded()
    }
    const token = getStoredAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        return rejectAxiosResponse(error)
      }
      const config = error.config as InternalAxiosRequestConfig | undefined
      if (canRetryWithRefresh(config, error)) {
        try {
          const tokens = await refreshAccessToken()
          const { useAuthStore } = await import('../stores/auth')
          useAuthStore().applyTokens(tokens)
          if (config) {
            config._retry = true
            config.headers.Authorization = `Bearer ${getStoredAccessToken()}`
            return instance.request(config)
          }
        }
        catch {
          /* 刷新失败，走统一 401 登出 */
        }
      }
      return rejectAxiosResponse(error)
    },
  )
}

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
    _skipTokenRefresh?: boolean
  }
}
