/**
 * 访问令牌无感续期：单例 refresh Promise，避免并发重复刷新。
 * 作者：leiyangjun
 */
import axios from 'axios'
import { ADMIN_API_PATH_PREFIX } from '../config/adminApiPrefix'
import type { ApiEnvelope, TokenDTO } from '../models/auth'
import { isPeachSuccess } from './apiResult'
import { decodeJwtPayload } from './jwt'
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  persistTokens,
} from './tokenStorage'

/** access 剩余不足该秒数时，请求前主动 refresh */
const PROACTIVE_REFRESH_SECONDS = 60

let refreshPromise: Promise<TokenDTO> | null = null

export { getStoredAccessToken, getStoredRefreshToken } from './tokenStorage'

export function isRefreshRequestUrl(url: string | undefined): boolean {
  if (!url) {
    return false
  }
  return url.includes('/auth/refresh')
}

function accessTokenExpiresWithinSeconds(token: string, withinSeconds: number): boolean {
  const payload = decodeJwtPayload<{ exp?: number }>(token)
  if (!payload?.exp) {
    return false
  }
  const nowSec = Math.floor(Date.now() / 1000)
  return payload.exp - nowSec <= withinSeconds
}

/** 请求前：access 将过期则先 refresh */
export async function proactiveRefreshIfNeeded(): Promise<void> {
  const access = getStoredAccessToken()
  const refresh = getStoredRefreshToken()
  if (!access || !refresh) {
    return
  }
  if (!accessTokenExpiresWithinSeconds(access, PROACTIVE_REFRESH_SECONDS)) {
    return
  }
  await refreshAccessToken()
}

/**
 * 单例刷新：成功则写入 localStorage；调用方须同步 Pinia（见 setupAuthInterceptors）。
 */
export async function refreshAccessToken(): Promise<TokenDTO> {
  if (refreshPromise) {
    return refreshPromise
  }
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

async function doRefresh(): Promise<TokenDTO> {
  const refresh = getStoredRefreshToken()
  if (!refresh) {
    throw new Error('无刷新令牌')
  }
  const { data: body } = await axios.post<ApiEnvelope<TokenDTO>>(
    `/api${ADMIN_API_PATH_PREFIX}/auth/refresh`,
    null,
    {
      timeout: 10000,
      headers: { Authorization: `Bearer ${refresh}` },
    },
  )
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '刷新令牌失败')
  }
  persistTokens(body.data)
  return body.data
}
