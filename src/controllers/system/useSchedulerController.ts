/**
 * 定时任务管理：分页列表、名称/描述筛选、调度操作与执行日志抽屉。
 */

import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteJobTask,
  fetchJobLogsByTaskId,
  fetchJobTaskPage,
  pauseJobTask,
  resumeJobTask,
  triggerJobTask,
} from '../../api/jobTask'
import { isSessionExpiredError } from '../../utils/sessionExpired'
import type { JobLogVO, JobPageQuery, JobTaskVO } from '../../models/jobTask'

/** 是否处于暂停态（与 pauseJob 逻辑删除 / valid 对齐） */
export function isJobTaskPaused(row: JobTaskVO): boolean {
  return row.valid !== 1
}

export function useSchedulerController() {
  const router = useRouter()

  const jobNameQuery = ref('')
  const jobDescriptionQuery = ref('')
  const page = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const loading = ref(false)
  const tableRows = ref<JobTaskVO[]>([])

  const logDrawerVisible = ref(false)
  const logLoading = ref(false)
  const logRows = ref<JobLogVO[]>([])
  const logForTaskId = ref('')
  const logTitle = ref('执行日志')

  const buildPageQuery = (): JobPageQuery => {
    const name = jobNameQuery.value.trim()
    const desc = jobDescriptionQuery.value.trim()
    const base: JobPageQuery = {
      pageNum: page.value,
      pageSize: pageSize.value,
      sortName: 'editTime',
      sortType: 'desc',
    }
    if (name && desc) {
      return { ...base, jobName: name, jobDescription: desc }
    }
    if (name) {
      return { ...base, searchValue: name }
    }
    if (desc) {
      return { ...base, searchValue: desc }
    }
    return base
  }

  const loadList = async () => {
    loading.value = true
    try {
      const data = await fetchJobTaskPage(buildPageQuery())
      tableRows.value = data.list ?? []
      total.value = data.total ?? 0
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载任务列表失败')
      }
    } finally {
      loading.value = false
    }
  }

  watch(
    [page, pageSize],
    () => {
      void loadList()
    },
    { immediate: true },
  )

  const onSearch = () => {
    page.value = 1
    void loadList()
  }

  const onReset = () => {
    jobNameQuery.value = ''
    jobDescriptionQuery.value = ''
    page.value = 1
    void loadList()
  }

  const goCreate = () => {
    void router.push('/system/scheduler/edit')
  }

  const goEdit = (row: JobTaskVO) => {
    void router.push(`/system/scheduler/edit/${encodeURIComponent(row.id)}`)
  }

  const confirmDelete = async (row: JobTaskVO) => {
    try {
      await ElMessageBox.confirm(`确定删除任务「${row.jobName}」？`, '确认', { type: 'warning' })
    } catch {
      return
    }
    try {
      await deleteJobTask(row.id)
      ElMessage.success('已删除')
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '删除失败')
      }
    }
  }

  const onPause = async (row: JobTaskVO) => {
    try {
      await pauseJobTask(row.id)
      ElMessage.success('已暂停调度')
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '暂停失败')
      }
    }
  }

  const onResume = async (row: JobTaskVO) => {
    try {
      await resumeJobTask(row.id)
      ElMessage.success('已恢复调度')
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '恢复失败')
      }
    }
  }

  const onTrigger = async (row: JobTaskVO) => {
    try {
      await triggerJobTask(row.id)
      ElMessage.success('已触发执行')
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '触发失败')
      }
    }
  }

  const openLogs = async (row: JobTaskVO) => {
    logForTaskId.value = row.id
    logTitle.value = `执行日志 — ${row.jobName}`
    logDrawerVisible.value = true
    await refreshLogs()
  }

  const refreshLogs = async () => {
    if (!logForTaskId.value) {
      return
    }
    logLoading.value = true
    try {
      logRows.value = await fetchJobLogsByTaskId(logForTaskId.value)
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载日志失败')
      }
      logRows.value = []
    } finally {
      logLoading.value = false
    }
  }

  return {
    jobNameQuery,
    jobDescriptionQuery,
    page,
    pageSize,
    total,
    loading,
    tableRows,
    logDrawerVisible,
    logLoading,
    logRows,
    logTitle,
    onSearch,
    onReset,
    goCreate,
    goEdit,
    confirmDelete,
    onPause,
    onResume,
    onTrigger,
    openLogs,
    refreshLogs,
    isJobTaskPaused,
  }
}
