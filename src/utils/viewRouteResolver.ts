/**
 * 根据站内路由 path（如 /system/user）解析 Vue 页面懒加载函数。
 * 使用 import.meta.glob 预扫描，避免 Vite 无法分析纯动态 import 路径。
 *
 * 匹配顺序（相对 src/views 的小写路径键）：
 * 1. 按 URL 段小写拼接：system/user、system/user/index
 * 2. 末段 Pascal + View：system/userview（兼容 UserView.vue 等现有命名）
 * 3. 末段 Pascal：system/user（兼容 User.vue）
 * 4. 整段路径 + view：system/userview（单层如 report → reportview）
 */

const VIEW_GLOB = import.meta.glob('../views/**/*.vue')

/** 小写「views 下相对路径（无 .vue）」→ 懒加载 */
const viewLoaderByNormPath = new Map<string, () => Promise<unknown>>()

for (const [key, loader] of Object.entries(VIEW_GLOB)) {
  const norm = globKeyToNormPath(key)
  if (norm) {
    viewLoaderByNormPath.set(norm, loader as () => Promise<unknown>)
  }
}

function globKeyToNormPath(globKey: string): string | null {
  const k = globKey.replace(/\\/g, '/')
  const m = k.match(/^\.\.\/views\/(.+)\.vue$/i)
  return m ? m[1].toLowerCase() : null
}

/** 将 URL 中的一段转为 PascalCase（user、USER → User） */
function segmentToPascal(seg: string): string {
  const t = seg.trim()
  if (!t) {
    return ''
  }
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

/**
 * @param internalPath 站内路径，须以 / 开头，如 /system/user
 */
export function resolveViewLoaderFromInternalPath(internalPath: string): (() => Promise<unknown>) | null {
  const trimmed = internalPath.trim()
  const noLead = trimmed.replace(/^\/+/, '')
  if (!noLead) {
    return null
  }
  const segments = noLead.split('/').filter(Boolean)
  if (!segments.length) {
    return null
  }
  const lowerSegs = segments.map((s) => s.toLowerCase())
  const joined = lowerSegs.join('/')
  const parentJoined = lowerSegs.length > 1 ? lowerSegs.slice(0, -1).join('/') : ''
  const lastRaw = segments[segments.length - 1]
  const pascalLast = segmentToPascal(lastRaw)
  const pl = pascalLast.toLowerCase()

  const candidates: string[] = [
    joined,
    `${joined}/index`,
  ]
  if (parentJoined) {
    candidates.push(`${parentJoined}/${pl}view`, `${parentJoined}/${pl}`)
  } else {
    candidates.push(`${pl}view`, pl)
  }
  candidates.push(`${joined}view`)

  for (const c of candidates) {
    const hit = viewLoaderByNormPath.get(c)
    if (hit) {
      return hit
    }
  }
  return null
}
