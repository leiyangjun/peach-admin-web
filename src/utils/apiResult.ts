/**
 * Peach 统一响应体 {@code code} 解析：前四位为模块码，随后三位为 HTTP 语义族（200 成功、401 等）。
 */

/** 判断是否为业务成功（语义族 200）；兼容后端将 code 序列化为字符串或数字的情况 */
export function isPeachSuccess(code: string | number | undefined | null): boolean {
  const s = code === undefined || code === null ? '' : String(code).trim()
  if (s.length < 7) {
    return false
  }
  return s.slice(4, 7) === '200'
}
