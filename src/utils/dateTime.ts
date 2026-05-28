/**
 * 日期时间展示格式化（管理端表格/日志等）。
 */

/** 格式化为本地日期时间：YYYY-MM-DD HH:mm:ss；无效或空值返回「—」 */
export function formatDateTime(
  value: string | number | Date | null | undefined | unknown,
): string {
  if (value == null || value === '') {
    return '—'
  }
  if (Array.isArray(value)) {
    const [y, mo, d, h = 0, mi = 0, s = 0] = value.map((v) => Number(v))
    if (!y || Number.isNaN(y)) {
      return '—'
    }
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(s)}`
  }
  const d = value instanceof Date ? value : new Date(typeof value === 'number' ? value : String(value))
  if (Number.isNaN(d.getTime())) {
    return String(value)
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
