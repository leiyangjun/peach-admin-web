/**
 * 统一解析网关 / 业务服务返回的错误信息（Peach ApiEnvelope：code、msg、data）。
 * 用于 Axios 响应拦截与手动兜底，避免用户看到英文状态码句或空白提示。
 */

import axios, { type AxiosError } from 'axios'

/**
 * 从任意异常中取出面向用户的文案；优先使用后端 msg / message。
 */
export function getRequestErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return messageFromAxiosError(error)
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '请求失败，请稍后重试'
}

function messageFromAxiosError(error: AxiosError<unknown>): string {
  const data = error.response?.data
  if (data && typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>
    if (typeof d.msg === 'string' && d.msg.trim()) {
      return d.msg.trim()
    }
    /** 部分网关 / Spring 使用 message 字段 */
    if (typeof d.message === 'string' && d.message.trim()) {
      return d.message.trim()
    }
  }
  const status = error.response?.status
  if (status === 401) {
    return '登录已过期，请重新登录'
  }
  if (status === 403) {
    return '没有权限执行该操作'
  }
  if (status === 404) {
    return '请求的资源不存在'
  }
  if (status !== undefined && status >= 500) {
    return '服务暂时不可用，请稍后重试'
  }
  if (error.message === 'Network Error') {
    return '网络连接失败，请检查网络后重试'
  }
  if (error.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试'
  }
  if (error.message) {
    return error.message
  }
  return '请求失败，请稍后重试'
}
