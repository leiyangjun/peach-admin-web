/** 判断 Cron 域是否为步进表达式（如 0/1、星号/5） */
function isStepField(value: string): boolean {
  return /^\*\/\d+$/.test(value) || /^\d+\/\d+$/.test(value)
}

/**
 * 规范化为 Quartz 6 域 Cron（秒 分 时 日 月 周）。
 * 兜底规范化：避免 Cron 组件误产出秒/分双步进（如 0/1 0/1 * * * ?）导致每秒触发。
 */
export function normalizeQuartzCron(expr: string): string {
  const t = expr.trim()
  if (!t) {
    return t
  }

  let parts = t.split(/\s+/).filter(Boolean)

  if (parts.length === 5) {
    parts = ['0', ...parts]
  } else if (parts.length === 7) {
    parts = parts.slice(0, 6)
  }

  if (parts.length !== 6) {
    return t
  }

  const [sec, min, hour, day, month] = parts

  // 分域已限定步进/具体值时，秒域不应步进（应固定在 0 秒触发）
  if (isStepField(sec) && min !== '*') {
    parts[0] = '0'
  } else if (
    isStepField(sec) &&
    isStepField(min) &&
    hour === '*' &&
    day === '*' &&
    month === '*'
  ) {
    // 秒/分同时为步进且更高域为 * → 按「分」级调度理解
    parts[0] = '0'
  }

  return parts.join(' ')
}

/**
 * 转为 no-vue3-cron 可解析的 7 域表达式（秒 分 时 日 月 周 年）。
 * 该组件解析时会访问 crons[6]，仅传 6 域会触发 trim 报错。
 */
export function toNoVue3CronExpression(expr: string): string {
  const normalized = normalizeQuartzCron(expr.trim())
  if (!normalized) {
    return '0 0 * * * ? *'
  }
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length === 6) {
    return `${normalized} *`
  }
  if (parts.length >= 7) {
    return parts.slice(0, 7).join(' ')
  }
  return '0 0 * * * ? *'
}

/** 将 no-vue3-cron 回写的 7 域表达式规范为 Quartz 6 域 */
export function fromNoVue3CronExpression(expr: string): string {
  const t = expr.trim()
  if (!t) {
    return t
  }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 7) {
    const year = parts[6]
    const six = parts.slice(0, 6).join(' ')
    if (year === '*' || year === '') {
      return normalizeQuartzCron(six)
    }
    return normalizeQuartzCron(`${six} ${year}`)
  }
  return normalizeQuartzCron(t)
}
