/**
 * Peach 统一响应体 {@code code} 解析：前四位为模块码，随后三位为 HTTP 语义族（200 成功、401 等）。
 */

/**
 * 判断是否为业务成功（语义族 200）。
 * 兼容：完整码如 COMM2002001（索引 4–6 为「200」）；仅返回末段 2001（与后端 Message200.OK.code 一致）的收口/历史格式。
 */
export function isPeachSuccess(code: string | number | undefined | null): boolean {
  const s = code === undefined || code === null ? '' : String(code).trim()
  if (s.length === 0) {
    return false
  }
  if (s === '2001') {
    return true
  }
  if (s.length < 7) {
    return false
  }
  return s.slice(4, 7) === '200'
}
