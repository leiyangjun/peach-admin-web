/**
 * 前端解析 JWT payload（仅展示用，不校验签名）。
 */

export function decodeJwtPayload<T extends Record<string, unknown> = Record<string, unknown>>(token: string): T | null {
  try {
    const part = token.split('.')[1]
    if (!part) {
      return null
    }
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      [...atob(b64)].map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join(''),
    )
    return JSON.parse(json) as T
  }
  catch {
    return null
  }
}
