/**
 * Quartz 常用 Cron 预设（6 域：秒 分 时 日 月 周）。
 */
export interface CronPresetItem {
  /** 展示名称 */
  label: string
  /** Quartz Cron 表达式 */
  value: string
  /** 分组（下拉分组展示） */
  group: string
  /** 搜索关键词（可选，用于 filter 匹配） */
  keywords?: string
}

export interface CronPresetGroup {
  name: string
  items: CronPresetItem[]
}

const RAW: CronPresetItem[] = [
  // —— 按分钟 / 高频 ——
  { group: '按分钟', label: '每分钟（第 0 秒）', value: '0 */1 * * * ?', keywords: '1分钟 每分' },
  { group: '按分钟', label: '每 2 分钟', value: '0 */2 * * * ?', keywords: '2分钟' },
  { group: '按分钟', label: '每 3 分钟', value: '0 */3 * * * ?', keywords: '3分钟' },
  { group: '按分钟', label: '每 5 分钟', value: '0 */5 * * * ?', keywords: '5分钟' },
  { group: '按分钟', label: '每 10 分钟', value: '0 */10 * * * ?', keywords: '10分钟' },
  { group: '按分钟', label: '每 15 分钟', value: '0 */15 * * * ?', keywords: '15分钟 一刻钟' },
  { group: '按分钟', label: '每 20 分钟', value: '0 */20 * * * ?', keywords: '20分钟' },
  { group: '按分钟', label: '每 30 分钟', value: '0 */30 * * * ?', keywords: '30分钟 半小时' },
  { group: '按分钟', label: '每 30 分钟（整分起）', value: '0 0/30 * * * ?', keywords: '30分钟 整分' },
  { group: '按分钟', label: '每小时第 5、10、15、20、25、30 分', value: '0 5,10,15,20,25,30 * * * ?', keywords: '刻钟' },
  { group: '按分钟', label: '每小时第 15、30、45 分钟', value: '0 15,30,45 * * * ?', keywords: '15 30 45' },

  // —— 按小时 ——
  { group: '按小时', label: '每小时整点', value: '0 0 * * * ?', keywords: '整点 每小时' },
  { group: '按小时', label: '每 2 小时', value: '0 0 */2 * * ?', keywords: '2小时' },
  { group: '按小时', label: '每 3 小时', value: '0 0 */3 * * ?', keywords: '3小时' },
  { group: '按小时', label: '每 4 小时', value: '0 0 */4 * * ?', keywords: '4小时' },
  { group: '按小时', label: '每 6 小时', value: '0 0 */6 * * ?', keywords: '6小时' },
  { group: '按小时', label: '每 8 小时', value: '0 0 */8 * * ?', keywords: '8小时' },
  { group: '按小时', label: '每 12 小时', value: '0 0 */12 * * ?', keywords: '12小时 半天' },
  { group: '按小时', label: '每个偶数小时整点', value: '0 0 0/2 * * ?', keywords: '偶数' },
  { group: '按小时', label: '每个奇数小时整点', value: '0 0 1/2 * * ?', keywords: '奇数' },

  // —— 每天固定时刻 ——
  { group: '每天', label: '每天凌晨 0 点', value: '0 0 0 * * ?', keywords: '午夜 0点 凌晨' },
  { group: '每天', label: '每天凌晨 1 点', value: '0 0 1 * * ?', keywords: '1点 凌晨' },
  { group: '每天', label: '每天凌晨 2 点', value: '0 0 2 * * ?', keywords: '2点 凌晨' },
  { group: '每天', label: '每天凌晨 3 点', value: '0 0 3 * * ?', keywords: '3点' },
  { group: '每天', label: '每天凌晨 4 点', value: '0 0 4 * * ?', keywords: '4点' },
  { group: '每天', label: '每天凌晨 5 点', value: '0 0 5 * * ?', keywords: '5点' },
  { group: '每天', label: '每天上午 6 点', value: '0 0 6 * * ?', keywords: '6点 早晨' },
  { group: '每天', label: '每天上午 7 点', value: '0 0 7 * * ?', keywords: '7点 早晨' },
  { group: '每天', label: '每天上午 8 点', value: '0 0 8 * * ?', keywords: '8点 上班' },
  { group: '每天', label: '每天上午 9 点', value: '0 0 9 * * ?', keywords: '9点' },
  { group: '每天', label: '每天上午 10 点', value: '0 0 10 * * ?', keywords: '10点' },
  { group: '每天', label: '每天中午 11 点', value: '0 0 11 * * ?', keywords: '11点' },
  { group: '每天', label: '每天中午 12 点', value: '0 0 12 * * ?', keywords: '12点 中午' },
  { group: '每天', label: '每天下午 1 点', value: '0 0 13 * * ?', keywords: '13点 下午' },
  { group: '每天', label: '每天下午 2 点', value: '0 0 14 * * ?', keywords: '14点' },
  { group: '每天', label: '每天下午 3 点', value: '0 0 15 * * ?', keywords: '15点' },
  { group: '每天', label: '每天下午 4 点', value: '0 0 16 * * ?', keywords: '16点' },
  { group: '每天', label: '每天下午 5 点', value: '0 0 17 * * ?', keywords: '17点' },
  { group: '每天', label: '每天下午 6 点', value: '0 0 18 * * ?', keywords: '18点 下班' },
  { group: '每天', label: '每天晚上 8 点', value: '0 0 20 * * ?', keywords: '20点' },
  { group: '每天', label: '每天晚上 9 点', value: '0 0 21 * * ?', keywords: '21点' },
  { group: '每天', label: '每天晚上 10 点', value: '0 0 22 * * ?', keywords: '22点' },
  { group: '每天', label: '每天晚上 11 点', value: '0 0 23 * * ?', keywords: '23点' },

  // —— 工作日 / 周末 ——
  { group: '工作日与周末', label: '工作日每天 8 点', value: '0 0 8 ? * MON-FRI', keywords: '上班 周一到周五' },
  { group: '工作日与周末', label: '工作日每天 9 点', value: '0 0 9 ? * MON-FRI', keywords: '上班' },
  { group: '工作日与周末', label: '工作日每天 12 点', value: '0 0 12 ? * MON-FRI', keywords: '午休' },
  { group: '工作日与周末', label: '工作日每天 18 点', value: '0 0 18 ? * MON-FRI', keywords: '下班' },
  { group: '工作日与周末', label: '每周一至周五 12 点', value: '0 0 12 ? * MON-FRI', keywords: '工作日' },
  { group: '工作日与周末', label: '每周六 0 点', value: '0 0 0 ? * SAT', keywords: '周六 周末' },
  { group: '工作日与周末', label: '每周日 0 点', value: '0 0 0 ? * SUN', keywords: '周日 周末' },
  { group: '工作日与周末', label: '周末每天 10 点', value: '0 0 10 ? * SAT,SUN', keywords: '周六 周日' },

  // —— 每周 ——
  { group: '每周', label: '每周一 0 点', value: '0 0 0 ? * MON', keywords: '周一' },
  { group: '每周', label: '每周一 9 点', value: '0 0 9 ? * MON', keywords: '周一' },
  { group: '每周', label: '每周一 12 点', value: '0 0 12 ? * MON', keywords: '周一' },
  { group: '每周', label: '每周五 18 点', value: '0 0 18 ? * FRI', keywords: '周五' },
  { group: '每周', label: '每周第一个周五 12 点', value: '0 0 12 ? * 6#1', keywords: '周五 第一周' },
  { group: '每周', label: '每周最后一个周日 12 点', value: '0 0 12 ? * 1L', keywords: '周日 最后' },

  // —— 每月 ——
  { group: '每月', label: '每月 1 日 0 点', value: '0 0 0 1 * ?', keywords: '月初' },
  { group: '每月', label: '每月 1 日 9 点', value: '0 0 9 1 * ?', keywords: '月初' },
  { group: '每月', label: '每月 15 日 0 点', value: '0 0 0 15 * ?', keywords: '月中 15号' },
  { group: '每月', label: '每月 15 日 12 点', value: '0 0 12 15 * ?', keywords: '月中' },
  { group: '每月', label: '每月最后一天 0 点', value: '0 0 0 L * ?', keywords: '月末 最后一天' },
  { group: '每月', label: '每月最后一天 12 点', value: '0 0 12 L * ?', keywords: '月末' },
  { group: '每月', label: '每月倒数第 3 天 12 点', value: '0 0 12 L-2 * ?', keywords: '月末' },
  { group: '每月', label: '每月最后一个工作日 12 点', value: '0 0 12 LW * ?', keywords: '工作日 月末' },
  { group: '每月', label: '每月最接近 1 号的工作日 12 点', value: '0 0 12 1W * ?', keywords: '月初 工作日' },
  { group: '每月', label: '每月 1 日起每隔 4 天 12 点', value: '0 0 12 1/4 * ?', keywords: '间隔' },

  // —— 按季 / 年 ——
  { group: '按季与年', label: '每季度首月 1 日 0 点', value: '0 0 0 1 1,4,7,10 ?', keywords: '季度 Q1 Q2' },
  { group: '按季与年', label: '每年 1 月 1 日 0 点', value: '0 0 0 1 1 ?', keywords: '元旦 新年' },
  { group: '按季与年', label: '每年 1 月、6 月每天 12 点', value: '0 0 12 * JAN,JUN ?', keywords: '半年' },
]

function dedupePresets(items: CronPresetItem[]): CronPresetItem[] {
  const seen = new Set<string>()
  const out: CronPresetItem[] = []
  for (const item of items) {
    const key = item.value.trim().replace(/\s+/g, ' ')
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    out.push({ ...item, value: key })
  }
  return out
}

/** 全部常用预设（扁平列表） */
export const CRON_PRESETS: CronPresetItem[] = dedupePresets(RAW)

/** 按分组顺序（用于下拉分组展示） */
const GROUP_ORDER = ['按分钟', '按小时', '每天', '工作日与周末', '每周', '每月', '按季与年']

export function groupCronPresets(items: CronPresetItem[]): CronPresetGroup[] {
  const map = new Map<string, CronPresetItem[]>()
  for (const item of items) {
    const list = map.get(item.group) ?? []
    list.push(item)
    map.set(item.group, list)
  }
  const ordered: CronPresetGroup[] = []
  for (const name of GROUP_ORDER) {
    const list = map.get(name)
    if (list?.length) {
      ordered.push({ name, items: list })
    }
  }
  for (const [name, list] of map) {
    if (!GROUP_ORDER.includes(name)) {
      ordered.push({ name, items: list })
    }
  }
  return ordered
}

/** 匹配常用预设（名称 / 分组 / 关键词 / Cron 表达式） */
export function matchCronPreset(item: CronPresetItem, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) {
    return true
  }
  const haystack = [item.label, item.group, item.value, item.keywords ?? ''].join(' ').toLowerCase()
  const tokens = q.split(/\s+/).filter(Boolean)
  return tokens.every((t) => haystack.includes(t))
}

export function filterCronPresets(query: string): CronPresetItem[] {
  const q = query.trim()
  if (!q) {
    return CRON_PRESETS
  }
  return CRON_PRESETS.filter((item) => matchCronPreset(item, q))
}
