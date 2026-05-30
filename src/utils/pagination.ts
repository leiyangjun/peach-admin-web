/**
 * 分页查询与表格展示：与 el-pagination 默认一致，避免缺参时后端回落 pageSize=20。
 */

export const DEFAULT_PAGE_NUM = 1
export const DEFAULT_PAGE_SIZE = 10

export function normalizePageNum(pageNum: number | undefined | null): number {
  return pageNum != null && pageNum > 0 ? pageNum : DEFAULT_PAGE_NUM
}

export function normalizePageSize(pageSize: number | undefined | null): number {
  return pageSize != null && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE
}

/** 控制器 / 弹窗构建分页请求参数 */
export function buildPageParams(
  pageNum: number,
  pageSize: number,
): { pageNum: number; pageSize: number } {
  return {
    pageNum: normalizePageNum(pageNum),
    pageSize: normalizePageSize(pageSize),
  }
}

/**
 * 后端 PageVO 默认 pageSize=20，偶发返回超出 UI 每页条数的列表；按当前页裁剪。
 */
export function sliceRowsForPage<T>(
  rows: T[],
  pageNum: number,
  pageSize: number,
): T[] {
  const size = normalizePageSize(pageSize)
  if (rows.length <= size) {
    return rows
  }
  const start = (normalizePageNum(pageNum) - 1) * size
  return rows.slice(start, start + size)
}
