/**
 * peach-job-service 定时任务管理 API。
 */
import httpJob from './httpJob'
import { isPeachSuccess } from '../utils/apiResult'
import type { ApiEnvelope } from '../models/auth'
import type { JobLogVO, JobPageQuery, JobTaskVO } from '../models/jobTask'

const TASK_BASE = '/job/task'
const LOG_BASE = '/job/log'

export interface PageInfoJobTask {
  list: JobTaskVO[]
  total: number
  pageNum?: number
  pageSize?: number
}

/** 分页查询定时任务 */
export async function fetchJobTaskPage(query: JobPageQuery): Promise<PageInfoJobTask> {
  const { data: body } = await httpJob.get<ApiEnvelope<PageInfoJobTask>>(`${TASK_BASE}/page`, {
    params: {
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      jobName: query.jobName?.trim() || undefined,
      jobDescription: query.jobDescription?.trim() || undefined,
      searchValue: query.searchValue?.trim() || undefined,
      sortName: query.sortName ?? 'editTime',
      sortType: query.sortType ?? 'desc',
    },
  })
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '分页查询任务失败')
  }
  return body.data
}

export async function fetchJobTaskById(id: string): Promise<JobTaskVO> {
  const { data: body } = await httpJob.get<ApiEnvelope<JobTaskVO>>(`${TASK_BASE}/${encodeURIComponent(id)}`)
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载任务详情失败')
  }
  return body.data
}

/** 新增或更新 */
export async function saveJobTask(payload: Record<string, unknown>): Promise<void> {
  const id = payload.id
  if (id != null && String(id).length > 0) {
    const { data: body } = await httpJob.put<ApiEnvelope<unknown>>(TASK_BASE, payload)
    if (!isPeachSuccess(body.code)) {
      throw new Error(body.msg || '更新任务失败')
    }
    return
  }
  const { data: body } = await httpJob.post<ApiEnvelope<unknown>>(TASK_BASE, payload)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '保存任务失败')
  }
}

export async function deleteJobTask(id: string): Promise<void> {
  const { data: body } = await httpJob.delete<ApiEnvelope<unknown>>(`${TASK_BASE}/${encodeURIComponent(id)}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '删除任务失败')
  }
}

export async function pauseJobTask(id: string): Promise<void> {
  const { data: body } = await httpJob.put<ApiEnvelope<unknown>>(`${TASK_BASE}/pause/${encodeURIComponent(id)}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '暂停失败')
  }
}

export async function resumeJobTask(id: string): Promise<void> {
  const { data: body } = await httpJob.put<ApiEnvelope<unknown>>(`${TASK_BASE}/resume/${encodeURIComponent(id)}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '恢复失败')
  }
}

export async function triggerJobTask(id: string): Promise<void> {
  const { data: body } = await httpJob.put<ApiEnvelope<unknown>>(`${TASK_BASE}/trigger/${encodeURIComponent(id)}`)
  if (!isPeachSuccess(body.code)) {
    throw new Error(body.msg || '手动触发失败')
  }
}

export async function fetchJobLogsByTaskId(taskId: string): Promise<JobLogVO[]> {
  const { data: body } = await httpJob.get<ApiEnvelope<JobLogVO[]>>(LOG_BASE, {
    params: { taskId },
  })
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '加载执行日志失败')
  }
  return body.data
}
