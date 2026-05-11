/**
 * 登录失效（401）：由 main.ts 注册跳转逻辑，axios 拦截器仅触发回调，
 * 避免 api 层直接引用 router / pinia 形成循环依赖。
 */

/** 已由全局拦截器处理跳转时抛出，业务 catch 中勿再弹错误提示 */
export class SessionExpiredError extends Error {
  constructor() {
    super('登录已过期')
    this.name = 'SessionExpiredError'
  }
}

export function isSessionExpiredError(e: unknown): e is SessionExpiredError {
  return e instanceof SessionExpiredError
}

export type SessionExpiredHandler = (message: string) => void

let handler: SessionExpiredHandler | null = null

/** 须在 createApp 且 app.use(pinia)、app.use(router) 之后调用 */
export function registerSessionExpiredHandler(fn: SessionExpiredHandler) {
  handler = fn
}

/** 通知执行登出并跳转登录页（仅 axios 401 分支调用） */
export function triggerSessionExpired(message: string) {
  handler?.(message)
}
