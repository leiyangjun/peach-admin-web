import type { ApiMetaDTO } from './permission'

/** 与 peach-job-service JobTaskVO 对齐 */
export interface JobTaskVO {
  id: string
  jobName: string
  jobGroup?: string
  jobDescription?: string
  jobCronExpression: string
  /** 0=平台内，1=外部 */
  jobType: number
  httpMethod?: string
  urlPath: string
  serviceName?: string | null
  externalBaseUrl?: string | null
  headers?: string | null
  timeoutMs: number
  retryMax: number
  retryIntervalMs?: number | null
  /** 1=有效，0=停用 */
  valid: number
  createTime?: string
  editTime?: string
}

/** 与 peach-job-service JobLogVO 对齐 */
export interface JobLogVO {
  id: string
  jobId: string
  jobDescription?: string
  jobApi: string
  jobName: string
  jobGroup: string
  exeTime: number
  httpstatus: number
  responseMsg?: string
  createTime?: string
}

/** 编辑页表单模型 */
export interface JobTaskFormModel {
  id?: string
  taskType: 'INTERNAL' | 'EXTERNAL'
  name: string
  description: string
  cronExpression: string
  enabled: boolean
  retryMax: number
  retryIntervalMs: number | undefined
  timeoutMs: number
  headersJson: string
  /** EXTERNAL */
  externalBaseUrl: string
  urlPathExternal: string
  /** INTERNAL */
  serviceName: string
  urlPathInternal: string
  apiSummary: string
  selectedApi: ApiMetaDTO | null
}

export function isInternalJobType(jobType: number | undefined): boolean {
  return jobType === 0
}

export function jobTypeToFormType(jobType: number | undefined): JobTaskFormModel['taskType'] {
  return jobType === 1 ? 'EXTERNAL' : 'INTERNAL'
}

export function formTypeToJobType(taskType: JobTaskFormModel['taskType']): number {
  return taskType === 'EXTERNAL' ? 1 : 0
}

/** 定时任务分页查询（与 BaseController GET /page 对齐） */
export interface JobPageQuery {
  pageNum: number
  pageSize: number
  /** 任务名称（与 jobDescription 同时填写时为等值 AND） */
  jobName?: string
  /** 任务描述（与 jobName 同时填写时为等值 AND） */
  jobDescription?: string
  /** 单字段模糊：匹配 jobName、jobDescription（OR） */
  searchValue?: string
  sortName?: string
  sortType?: string
}
