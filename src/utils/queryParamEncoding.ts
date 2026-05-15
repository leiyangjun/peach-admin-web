/**
 * 查询参数编码归一化。
 *
 * 若将「已含合法 %XX 百分号编码片段」的字符串直接放入 axios `params`，
 * axios 会对其再做一次 encodeURIComponent（% → %25），网关/服务端通常只解码一次，
 * 业务层收到的仍是字面量 `%e6...`，中文模糊查询与 Swagger 直填中文行为不一致。
 *
 * 在序列化前对 params 中的字符串值做多轮 decodeURIComponent（与后端
 * `ApiMappingUtil.decodeKeywordIfPercentEncodedLiteral` 思路一致），
 * 直到不再含可解码的三元组或解码不再变化，避免对纯中文/ASCII 误伤。
 */

function isHexCharCode(c: number): boolean {
  return (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66)
}

/** 是否存在形如 %XX 且 X 为十六进制的片段（与 Java 侧判定类似） */
function containsPercentEncodedTriplet(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) === 0x25 && i + 2 < s.length && isHexCharCode(s.charCodeAt(i + 1)) && isHexCharCode(s.charCodeAt(i + 2))) {
      return true
    }
  }
  return false
}

/** 将可能被误作「字面百分号编码」的查询值还原为语义字符串，供 axios 再编码一次 */
export function unwrapPercentEncodedLiteralQueryValue(raw: unknown): unknown {
  if (typeof raw !== 'string') {
    return raw
  }
  let s = raw
  for (let round = 0; round < 5 && containsPercentEncodedTriplet(s); round++) {
    try {
      const decoded = decodeURIComponent(s)
      if (decoded === s) {
        break
      }
      s = decoded
    } catch {
      break
    }
  }
  return s
}

/** 就地处理 axios `params` 对象中的字符串叶子（本工程均为单层键值） */
export function normalizeAxiosParamsEncoding(params: unknown): void {
  if (params == null || typeof params !== 'object') {
    return
  }
  const o = params as Record<string, unknown>
  for (const key of Object.keys(o)) {
    const v = o[key]
    if (typeof v === 'string') {
      o[key] = unwrapPercentEncodedLiteralQueryValue(v) as string
    }
  }
}
